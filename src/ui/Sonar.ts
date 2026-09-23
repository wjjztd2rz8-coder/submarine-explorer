/**
 * 2D canvas minimap ("sonar"): the tile's heightmap, downsampled once into an
 * offscreen ImageData, with the sub's position/heading and landmark blips drawn
 * over it each frame.
 *
 * The expensive part (rasterising the bathymetry) happens exactly once in the
 * constructor; per-frame work is a single drawImage plus a few paths.
 */

import type { Terrain } from '../world/Terrain.js';
import type { PlacedLandmark } from '../world/Landmarks.js';
import type { SubmarineState } from '../sub/Submarine.js';

export interface SonarOptions {
  /** On-screen length of the map's LONG side in CSS pixels. */
  size?: number;
  parent?: HTMLElement;
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
  private readonly base: HTMLCanvasElement;
  /** Canvas size in CSS px, matching the tile's aspect. */
  private readonly w: number;
  private readonly h: number;
  private trail: Array<{ x: number; z: number }> = [];

  constructor(
    private readonly terrain: Terrain,
    private readonly landmarks: PlacedLandmark[] = [],
    options: SonarOptions = {},
  ) {
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
    this.root.appendChild(this.canvas);
    (options.parent ?? document.body).appendChild(this.root);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);

    this.base = this.renderBathymetry();
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
    for (let py = 0; py < h; py++) {
      // Canvas +y runs down the screen, and so does +Z (south): same order
      // as the heightmap rows, so no flip.
      const row = Math.round((py / Math.max(1, h - 1)) * (meta.rows - 1));
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        const col = Math.round((px / Math.max(1, w - 1)) * (meta.cols - 1));
        const color = this.terrain.colorForDepth(this.terrain.heightAtCell(col, row));
        // Push toward a green sonar palette while keeping the depth ordering.
        const lum = 0.25 + 0.75 * (color.r * 0.3 + color.g * 0.5 + color.b * 0.2);
        data[i] = Math.round(30 * lum);
        data[i + 1] = Math.round(235 * lum);
        data[i + 2] = Math.round(120 * lum);
        data[i + 3] = 235;
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
      ctx.strokeStyle = 'rgba(180, 255, 210, 0.45)';
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
    ctx.fillStyle = '#ffd24a';
    for (const lm of this.landmarks) {
      const { px, py } = this.project(lm.position.x, lm.position.z);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // The sub: a triangle pointing along its heading. Canvas y grows downward
    // and so does +Z (south), so a heading of 0 (north) must point up: -y.
    const { px, py } = this.project(s.position.x, s.position.z);
    const a = (s.headingDeg * Math.PI) / 180;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Frame.
    ctx.strokeStyle = 'rgba(120, 255, 180, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  dispose(): void {
    this.root.remove();
  }
}
