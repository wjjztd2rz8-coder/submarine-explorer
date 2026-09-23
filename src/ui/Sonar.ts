/**
 * 2D canvas minimap ("sonar"): the tile's heightmap, downsampled once into an
 * offscreen ImageData, with the sub's position/heading and landmark blips drawn
 * over it each frame.
 *
 * The expensive part (rasterising the bathymetry) happens once in the
 * constructor, and again only when `setPalette()` switches colour scheme (C5);
 * per-frame work is a single drawImage plus a few paths.
 *
 * Palettes live in `Config.sonarPalettes` (`default` green, `deuteranopia`
 * blue -> yellow, `highContrast` white on black). Every ramp rises in
 * luminance from deep to shallow, so depth ordering never depends on hue.
 */

import { DEFAULT_CONFIG, type SonarPalette, type SonarPaletteName } from '../core/Config.js';
import type { Terrain } from '../world/Terrain.js';
import type { PlacedLandmark } from '../world/Landmarks.js';
import type { SubmarineState } from '../sub/Submarine.js';

export interface SonarOptions {
  /** On-screen length of the map's LONG side in CSS pixels. */
  size?: number;
  parent?: HTMLElement;
  /** Initial palette (C5). Default `default`. */
  palette?: SonarPaletteName;
  /** Palette table; default `Config.sonarPalettes`. */
  palettes?: Record<SonarPaletteName, SonarPalette>;
}

/** Linear interpolation along a palette's `[at, r, g, b]` stops; `t` is clamped to 0..1. */
export function paletteColor(
  stops: ReadonlyArray<readonly [number, number, number, number]>,
  t: number,
): [number, number, number] {
  const first = stops[0];
  if (!first) return [0, 0, 0];
  const x = Math.min(1, Math.max(0, t));
  if (x <= first[0]) return [first[1], first[2], first[3]];
  for (let i = 1; i < stops.length; i++) {
    const b = stops[i] as readonly [number, number, number, number];
    if (x <= b[0]) {
      const a = stops[i - 1] as readonly [number, number, number, number];
      const f = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 1;
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  const last = stops[stops.length - 1] as readonly [number, number, number, number];
  return [last[1], last[2], last[3]];
}

/** WCAG relative luminance of an sRGB colour with 0..255 channels. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Canvas size (CSS px) for a tile: the long side is `maxPx`, the short side
 * follows the tile's aspect, so the map fills the canvas with no letterbox
 * (QA-A #1: the 25 x 33 km Titanic tile used to draw as a narrow strip
 * between transparent bars).
 */
export function sonarCanvasSize(
  widthM: number,
  depthM: number,
  maxPx: number,
): { width: number; height: number } {
  const aspect = widthM > 0 && depthM > 0 ? widthM / depthM : 1;
  return aspect >= 1
    ? { width: maxPx, height: Math.max(1, Math.round(maxPx / aspect)) }
    : { width: Math.max(1, Math.round(maxPx * aspect)), height: maxPx };
}

/** World XZ (origin at tile centre, +Z south) -> canvas pixel on a full-bleed map. */
export function sonarProject(
  x: number,
  z: number,
  widthM: number,
  depthM: number,
  canvasW: number,
  canvasH: number,
): { px: number; py: number } {
  return {
    px: ((x + widthM / 2) / widthM) * canvasW,
    py: ((z + depthM / 2) / depthM) * canvasH,
  };
}

export class Sonar {
  readonly root: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  visible = true;

  private readonly ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private readonly palettes: Record<SonarPaletteName, SonarPalette>;
  private palette: SonarPalette;
  private paletteName_: SonarPaletteName;
  /** Canvas size in CSS px, matching the tile's aspect. */
  private readonly w: number;
  private readonly h: number;
  private trail: Array<{ x: number; z: number }> = [];

  constructor(
    private readonly terrain: Terrain,
    private readonly landmarks: PlacedLandmark[] = [],
    options: SonarOptions = {},
  ) {
    this.palettes = options.palettes ?? DEFAULT_CONFIG.sonarPalettes;
    this.paletteName_ = options.palette ?? 'default';
    this.palette = this.palettes[this.paletteName_] ?? this.palettes.default;
    const size = sonarCanvasSize(terrain.widthM, terrain.depthM, options.size ?? 220);
    this.w = size.width;
    this.h = size.height;

    this.root = document.createElement('div');
    this.root.className = 'sonar';
    this.canvas = document.createElement('canvas');
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    // C5: a name for assistive tech; the map itself is decorative detail.
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Sonar map: seabed depth, your track and landmarks');
    this.root.appendChild(this.canvas);
    (options.parent ?? document.body).appendChild(this.root);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);

    this.base = this.renderBathymetry();
  }

  /** The active palette's name. */
  get paletteName(): SonarPaletteName {
    return this.paletteName_;
  }

  /**
   * Switch colour scheme (C5): re-rasterises the bathymetry bitmap and the
   * blip / sub / trail colours from `Config.sonarPalettes[name]`. Unknown
   * names are ignored. Returns the active palette name.
   */
  setPalette(name: SonarPaletteName): SonarPaletteName {
    const next = Object.hasOwn(this.palettes, name) ? this.palettes[name] : undefined;
    if (!next || name === this.paletteName_) return this.paletteName_;
    this.paletteName_ = name;
    this.palette = next;
    this.base = this.renderBathymetry();
    return name;
  }

  /** Rasterise the heightmap once into an offscreen canvas the size of the map. */
  private renderBathymetry(): HTMLCanvasElement {
    const { meta } = this.terrain;
    const w = this.w;
    const h = this.h;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return c;

    const img = ctx.createImageData(w, h);
    const data = img.data;
    const pal = this.palette;
    // Depth-driven palettes normalise over the tile's own height range.
    let lo = Infinity;
    let hi = -Infinity;
    if (pal.source === 'depth') {
      for (let row = 0; row < meta.rows; row++) {
        for (let col = 0; col < meta.cols; col++) {
          const v = this.terrain.heightAtCell(col, row);
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    const span = hi > lo ? hi - lo : 1;
    for (let py = 0; py < h; py++) {
      // Canvas +y runs down the screen, and so does +Z (south): same order
      // as the heightmap rows, so no flip.
      const row = Math.round((py / Math.max(1, h - 1)) * (meta.rows - 1));
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        const col = Math.round((px / Math.max(1, w - 1)) * (meta.cols - 1));
        const height = this.terrain.heightAtCell(col, row);
        let t: number;
        if (pal.source === 'depth') {
          t = (height - lo) / span;
        } else {
          // The original look: the terrain ramp's luminance, pushed through a
          // single-hue palette so the depth ordering survives.
          const color = this.terrain.colorForDepth(height);
          t = color.r * 0.3 + color.g * 0.5 + color.b * 0.2;
        }
        const [r, g, b] = paletteColor(pal.stops, t);
        data[i] = Math.round(r);
        data[i + 1] = Math.round(g);
        data[i + 2] = Math.round(b);
        data[i + 3] = pal.alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /** World XZ -> canvas pixel. */
  private project(x: number, z: number): { px: number; py: number } {
    return sonarProject(x, z, this.terrain.widthM, this.terrain.depthM, this.w, this.h);
  }

  toggle(): boolean {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? '' : 'none';
    return this.visible;
  }

  /** Redraw. Cheap enough to call every frame. */
  update(s: SubmarineState): void {
    if (!this.visible) return;
    const { w, h } = this;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.base, 0, 0, w, h);

    // Breadcrumb trail.
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - s.position.x, last.z - s.position.z) > 25) {
      this.trail.push({ x: s.position.x, z: s.position.z });
      if (this.trail.length > 200) this.trail.shift();
    }
    if (this.trail.length > 1) {
      ctx.strokeStyle = this.palette.trail;
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.trail.forEach((p, i) => {
        const { px, py } = this.project(p.x, p.z);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Landmark blips.
    const pal = this.palette;
    ctx.fillStyle = pal.blip;
    ctx.strokeStyle = pal.blipOutline ?? pal.blip;
    ctx.lineWidth = 1;
    for (const lm of this.landmarks) {
      const { px, py } = this.project(lm.position.x, lm.position.z);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      if (pal.blipOutline) ctx.stroke();
    }

    // The sub: a triangle pointing along its heading. Canvas y grows downward
    // and so does +Z (south), so a heading of 0 (north) must point up: -y.
    const { px, py } = this.project(s.position.x, s.position.z);
    const a = (s.headingDeg * Math.PI) / 180;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = pal.sub;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4.5, 6);
    ctx.closePath();
    ctx.fill();
    if (pal.subOutline) {
      ctx.strokeStyle = pal.subOutline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // Frame.
    ctx.strokeStyle = pal.frame;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  dispose(): void {
    this.root.remove();
  }
}
