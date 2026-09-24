/**
 * 2D canvas minimap ("sonar"): the tile's heightmap, downsampled once into an
 * offscreen ImageData for the local viewport, with heading and scan contacts
 * drawn over it. The survey is sampled without procedural terrain detail.
 *
 * The relief cache refreshes when the view changes enough to matter; each
 * frame moves that image with the sub and redraws the few live symbols.
 *
 * Palettes live in `Config.sonarPalettes` (`default` depth relief,
 * `deuteranopia` blue -> yellow, `highContrast` white on black). Every ramp rises in
 * luminance from deep to shallow, so depth ordering never depends on hue.
 */

import {
  DEFAULT_CONFIG,
  type SonarPalette,
  type SonarPaletteName,
  type SonarZoom,
  type SonarZoomConfig,
} from '../core/Config.js';
import type { Terrain } from '../world/Terrain.js';
import type { PlacedLandmark } from '../world/Landmarks.js';
import type { PlacedPoi } from '../game/Pois.js';
import type { SubmarineState } from '../sub/Submarine.js';

export interface SonarOptions {
  /** On-screen length of the map's LONG side in CSS pixels. */
  size?: number;
  parent?: HTMLElement;
  /** Initial palette (C5). Default `default`. */
  palette?: SonarPaletteName;
  /** Palette table; default `Config.sonarPalettes`. */
  palettes?: Record<SonarPaletteName, SonarPalette>;
  zoom?: SonarZoomConfig;
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

/** Project a target onto the sub-centred, north-up view. */
export function sonarProjectZoomed(
  x: number,
  z: number,
  subX: number,
  subZ: number,
  spanM: number,
  canvasW: number,
  canvasH: number,
): { px: number; py: number } {
  const scale = Math.max(canvasW, canvasH) / spanM;
  return { px: canvasW / 2 + (x - subX) * scale, py: canvasH / 2 + (z - subZ) * scale };
}

export function sonarPoiVisible(
  distanceM: number,
  sensorRangeM: number,
  px: number,
  py: number,
  w: number,
  h: number,
): boolean {
  return distanceM <= sensorRangeM && px >= 5 && px <= w - 5 && py >= 5 && py <= h - 5;
}

export function sonarPoiIcon(scannedThisDive: boolean, currentObjective: boolean): string {
  return scannedThisDive ? '✓' : currentObjective ? '◇' : '·';
}

/** Choose a readable contour step without amplifying sub-metre survey noise. */
export function sonarContourInterval(
  baseM: number,
  actualSpanM: number,
  maxContours: number,
): number {
  if (actualSpanM < 2) return Infinity;
  const target = Math.max(1, actualSpanM / maxContours, Math.min(baseM, actualSpanM / 5));
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return ([1, 2, 5, 10].find((n) => n * magnitude >= target) ?? 10) * magnitude;
}

export function sonarReliefRange(
  lo: number,
  hi: number,
  minimumSpanM: number,
): { low: number; span: number } {
  const span = Math.max(hi - lo, minimumSpanM);
  return { low: (lo + hi - span) / 2, span };
}

export interface SonarMarker {
  poiId: string;
  name: string;
  px: number;
  py: number;
  distanceM: number;
  icon: string;
  scanned: boolean;
  current: boolean;
  visible: boolean;
}

export interface SonarRelief {
  minDepthM: number;
  maxDepthM: number;
  spanM: number;
  contourIntervalM: number;
}

export class Sonar {
  readonly root: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  readonly backdrop: HTMLDivElement;
  visible = true;
  markers: SonarMarker[] = [];
  relief: SonarRelief = { minDepthM: 0, maxDepthM: 0, spanM: 0, contourIntervalM: Infinity };

  private readonly ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private reliefDirty = true;
  private reliefCenter = { x: 0, z: 0 };
  private scanState: (poi: PlacedPoi) => boolean = () => false;
  private readonly palettes: Record<SonarPaletteName, SonarPalette>;
  private readonly zoomConfig: SonarZoomConfig;
  private zoomIndex: number;
  private sensorRangeM = 2000;
  private showMarkers = true;
  private pois: readonly PlacedPoi[] = [];
  private objectivePoiId: string | null = null;
  private lastPosition = { x: 0, z: 0 };
  private readonly rangeLabel: HTMLSpanElement;
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
    this.zoomConfig = options.zoom ?? DEFAULT_CONFIG.sonarZoom;
    this.zoomIndex = Math.max(0, this.zoomConfig.levels.indexOf(this.zoomConfig.initial));
    const size = sonarCanvasSize(terrain.widthM, terrain.depthM, options.size ?? 220);
    this.w = size.width;
    this.h = size.height;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'd-sonar-backdrop';
    this.backdrop.hidden = true;

    this.root = document.createElement('div');
    this.root.className = 'sonar';
    this.root.dataset.scanPalette = this.paletteName_;
    this.root.tabIndex = 0;
    this.root.setAttribute('aria-label', 'Sonar map. Plus and minus change range; M expands map.');
    const header = document.createElement('div');
    header.className = 'd-sonar-header';
    header.innerHTML = '<span>SONAR <span class="d-sonar-north">N ↑</span></span>';
    this.rangeLabel = document.createElement('span');
    this.rangeLabel.className = 'd-sonar-range';
    const controls = document.createElement('span');
    controls.className = 'd2-sonar-controls';
    const zoomIn = document.createElement('button');
    zoomIn.type = 'button';
    zoomIn.textContent = '+';
    zoomIn.setAttribute('aria-label', 'Sonar zoom in');
    zoomIn.addEventListener('click', () => this.zoomBy(-1));
    const zoomOut = document.createElement('button');
    zoomOut.type = 'button';
    zoomOut.textContent = '−';
    zoomOut.setAttribute('aria-label', 'Sonar zoom out');
    zoomOut.addEventListener('click', () => this.zoomBy(1));
    controls.append(zoomOut, this.rangeLabel, zoomIn);
    header.append(controls);
    this.root.title = 'Sonar range: + / − keys or mouse wheel. M expands the map.';
    this.root.append(header);
    this.canvas = document.createElement('canvas');
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    // C5: a name for assistive tech; the map itself is decorative detail.
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Sonar map: seabed depth, your track and heading');
    this.root.appendChild(this.canvas);
    const legend = document.createElement('div');
    legend.className = 'd-sonar-legend';
    for (const label of ['▲ Sub', '◇ Objective', '· Contact', '✓ Scanned']) {
      const item = document.createElement('span');
      item.textContent = label;
      legend.append(item);
    }
    this.root.append(legend);
    this.root.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.zoomBy(event.deltaY < 0 ? -1 : 1);
      },
      { passive: false },
    );
    this.root.addEventListener('keydown', (event) => {
      if (event.code === 'Equal' || event.code === 'NumpadAdd') this.zoomBy(-1);
      else if (event.code === 'Minus' || event.code === 'NumpadSubtract') this.zoomBy(1);
      else return;
      event.preventDefault();
      event.stopPropagation();
    });
    (options.parent ?? document.body).append(this.backdrop, this.root);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);

    this.base = document.createElement('canvas');
    this.updateRangeLabel();
  }

  get zoom(): SonarZoom {
    return this.zoomConfig.levels[this.zoomIndex] ?? this.zoomConfig.initial;
  }
  get expanded(): boolean {
    return this.root.classList.contains('d-sonar-expanded');
  }

  zoomBy(direction: number): SonarZoom {
    const before = this.zoomIndex;
    this.zoomIndex = Math.max(
      0,
      Math.min(this.zoomConfig.levels.length - 1, this.zoomIndex + direction),
    );
    if (before !== this.zoomIndex) this.reliefDirty = true;
    this.updateRangeLabel();
    return this.zoom;
  }

  setZoom(level: SonarZoom): SonarZoom {
    const index = this.zoomConfig.levels.indexOf(level);
    if (index >= 0 && index !== this.zoomIndex) {
      this.zoomIndex = index;
      this.reliefDirty = true;
    }
    this.updateRangeLabel();
    return this.zoom;
  }

  setPois(pois: readonly PlacedPoi[]): void {
    this.pois = pois;
  }
  setScanState(isScanned: (poi: PlacedPoi) => boolean): void {
    this.scanState = isScanned;
  }
  setObjective(poiId: string | null): void {
    this.objectivePoiId = poiId;
  }
  setSensorRange(rangeM: number): void {
    this.sensorRangeM = rangeM;
  }
  setMarkersVisible(visible: boolean): void {
    this.showMarkers = visible;
    this.root.classList.toggle('d2-sonar-markers-hidden', !visible);
  }

  private updateRangeLabel(): void {
    this.rangeLabel.textContent = this.zoom === 'tile' ? 'Whole tile' : `${this.zoom} m`;
    this.root.dataset.zoom = String(this.zoom);
  }

  /** The active palette's name. */
  get paletteName(): SonarPaletteName {
    return this.paletteName_;
  }

  /**
   * Switch colour scheme (C5): refreshes relief and symbol colours from
   * `Config.sonarPalettes[name]`. Unknown
   * names are ignored. Returns the active palette name.
   */
  setPalette(name: SonarPaletteName): SonarPaletteName {
    const next = Object.hasOwn(this.palettes, name) ? this.palettes[name] : undefined;
    if (!next || name === this.paletteName_) return this.paletteName_;
    this.paletteName_ = name;
    this.palette = next;
    this.root.dataset.scanPalette = name;
    this.reliefDirty = true;
    return name;
  }

  /** Rebuild the measured-depth relief around the visible map, with cached margins for smooth tracking. */
  private renderBathymetry(centerX: number, centerZ: number): void {
    const zoom = this.zoom;
    const margin = zoom === 'tile' ? 0 : this.zoomConfig.rasterMarginPx;
    const w = this.w + margin * 2;
    const h = this.h + margin * 2;
    this.base.width = w;
    this.base.height = h;
    const ctx = this.base.getContext('2d');
    if (!ctx) return;
    const scale = zoom === 'tile' ? this.w / this.terrain.widthM : Math.max(this.w, this.h) / zoom;
    const metresPerPixel = 1 / scale;
    const heights = new Float32Array(w * h);
    let lo = Infinity;
    let hi = -Infinity;
    for (let py = 0; py < h; py++) {
      const z = centerZ + (py - margin - this.h / 2) * metresPerPixel;
      for (let px = 0; px < w; px++) {
        const x = centerX + (px - margin - this.w / 2) * metresPerPixel;
        const depth = this.terrain.sampleDataHeight(x, z);
        heights[py * w + px] = depth;
        if (px >= margin && px < w - margin && py >= margin && py < h - margin) {
          lo = Math.min(lo, depth);
          hi = Math.max(hi, depth);
        }
      }
    }
    const actualSpan = hi - lo;
    const { low, span } = sonarReliefRange(lo, hi, this.zoomConfig.minReliefSpanM[zoom]);
    const contourInterval = sonarContourInterval(
      this.zoomConfig.contourIntervalM[zoom],
      actualSpan,
      this.zoomConfig.maxContours,
    );
    this.relief = {
      minDepthM: -hi,
      maxDepthM: -lo,
      spanM: span,
      contourIntervalM: contourInterval,
    };
    const img = ctx.createImageData(w, h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const index = py * w + px;
        const height = heights[index] as number;
        const [r, g, b] = paletteColor(this.palette.stops, (height - low) / span);
        // Measured X/Z slopes in m/m, lit from the north-west. A gain makes
        // gentle local walls legible without fabricating depth variation.
        const left = heights[py * w + Math.max(0, px - 1)] as number;
        const right = heights[py * w + Math.min(w - 1, px + 1)] as number;
        const north = heights[Math.max(0, py - 1) * w + px] as number;
        const south = heights[Math.min(h - 1, py + 1) * w + px] as number;
        const gx = (right - left) / (2 * metresPerPixel);
        const gz = (south - north) / (2 * metresPerPixel);
        const shade = Math.max(
          0.72,
          Math.min(1.28, 1 - this.zoomConfig.hillshadeGain * (0.7 * gx + 0.5 * gz)),
        );
        const out = index * 4;
        img.data[out] = Math.round(Math.max(0, Math.min(255, r * shade)));
        img.data[out + 1] = Math.round(Math.max(0, Math.min(255, g * shade)));
        img.data[out + 2] = Math.round(Math.max(0, Math.min(255, b * shade)));
        img.data[out + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (Number.isFinite(contourInterval))
      this.drawContours(ctx, heights, w, h, lo, hi, contourInterval, margin);
    this.reliefCenter = { x: centerX, z: centerZ };
    this.reliefDirty = false;
  }

  private drawContours(
    ctx: CanvasRenderingContext2D,
    heights: Float32Array,
    w: number,
    h: number,
    lo: number,
    hi: number,
    interval: number,
    margin: number,
  ): void {
    const levels: number[] = [];
    for (let level = Math.ceil(lo / interval) * interval; level <= hi; level += interval)
      levels.push(level);
    const labels: Array<{ x: number; y: number; text: string }> = [];
    ctx.strokeStyle =
      this.paletteName_ === 'highContrast' ? 'rgba(255,255,255,.72)' : 'rgba(225,244,220,.58)';
    ctx.lineWidth = 0.8;
    for (const [index, level] of levels.entries()) {
      ctx.beginPath();
      let anchor: { x: number; y: number } | null = null;
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const a = heights[y * w + x] as number;
          const b = heights[y * w + x + 1] as number;
          const c = heights[(y + 1) * w + x + 1] as number;
          const d = heights[(y + 1) * w + x] as number;
          if (Math.min(a, b, c, d) > level || Math.max(a, b, c, d) < level) continue;
          const hits: Array<{ x: number; y: number }> = [];
          if (a < level !== b < level) hits.push({ x: x + (level - a) / (b - a), y });
          if (b < level !== c < level) hits.push({ x: x + 1, y: y + (level - b) / (c - b) });
          if (c < level !== d < level) hits.push({ x: x + (level - d) / (c - d), y: y + 1 });
          if (d < level !== a < level) hits.push({ x, y: y + (level - a) / (d - a) });
          for (let i = 0; i + 1 < hits.length; i += 2) {
            const p = hits[i] as { x: number; y: number };
            const q = hits[i + 1] as { x: number; y: number };
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            if (
              !anchor &&
              p.x > margin + 18 &&
              p.x < w - margin - 45 &&
              p.y > margin + 12 &&
              p.y < h - margin - 12 &&
              labels.every((label) => Math.hypot(label.x - p.x, label.y - p.y) > 32)
            )
              anchor = p;
          }
        }
      }
      ctx.stroke();
      if (anchor && index % Math.max(1, Math.ceil(levels.length / 3)) === 0 && labels.length < 3) {
        labels.push({ x: anchor.x, y: anchor.y, text: `${Math.round(Math.abs(level))} m` });
      }
    }
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    for (const label of labels) {
      const width = ctx.measureText(label.text).width + 6;
      ctx.fillStyle = 'rgba(2, 12, 17, .88)';
      ctx.fillRect(label.x - 2, label.y - 6, width, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(label.text, label.x + 1, label.y);
    }
  }

  /** World XZ -> canvas pixel. */
  private project(x: number, z: number): { px: number; py: number } {
    return this.zoom === 'tile'
      ? sonarProject(x, z, this.terrain.widthM, this.terrain.depthM, this.w, this.h)
      : sonarProjectZoomed(
          x,
          z,
          this.lastPosition.x,
          this.lastPosition.z,
          this.zoom,
          this.w,
          this.h,
        );
  }

  toggle(): boolean {
    this.root.classList.toggle('d-sonar-expanded');
    this.backdrop.hidden = !this.expanded;
    return this.expanded;
  }

  /** Redraw. Cheap enough to call every frame. */
  update(s: SubmarineState): void {
    if (!this.visible) return;
    const { w, h } = this;
    this.lastPosition = { x: s.position.x, z: s.position.z };
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    const scale = this.zoom === 'tile' ? 0 : Math.max(w, h) / this.zoom;
    const shiftX = (this.reliefCenter.x - s.position.x) * scale;
    const shiftY = (this.reliefCenter.z - s.position.z) * scale;
    if (
      this.reliefDirty ||
      (this.zoom !== 'tile' &&
        Math.max(Math.abs(shiftX), Math.abs(shiftY)) > this.zoomConfig.refreshShiftPx)
    )
      this.renderBathymetry(
        this.zoom === 'tile' ? 0 : s.position.x,
        this.zoom === 'tile' ? 0 : s.position.z,
      );
    const margin = this.zoom === 'tile' ? 0 : this.zoomConfig.rasterMarginPx;
    ctx.drawImage(
      this.base,
      -margin + (this.reliefCenter.x - s.position.x) * scale,
      -margin + (this.reliefCenter.z - s.position.z) * scale,
    );

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

    // Landmark blips are for free dive. POI symbols take their place when a
    // content pack has scan targets, avoiding two competing symbol systems.
    const pal = this.palette;
    ctx.fillStyle = pal.blip;
    ctx.strokeStyle = pal.blipOutline ?? pal.blip;
    ctx.lineWidth = 1;
    for (const lm of this.showMarkers ? (this.pois.length ? [] : this.landmarks) : []) {
      const { px, py } = this.project(lm.position.x, lm.position.z);
      if (
        !sonarPoiVisible(
          Math.hypot(lm.position.x - s.position.x, lm.position.z - s.position.z),
          this.sensorRangeM,
          px,
          py,
          w,
          h,
        )
      )
        continue;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      if (pal.blipOutline) ctx.stroke();
    }

    this.markers = this.pois.map((poi) => {
      const { px, py } = this.project(poi.position.x, poi.position.z);
      const distanceM = Math.hypot(poi.position.x - s.position.x, poi.position.z - s.position.z);
      const scanned = this.scanState(poi);
      const current = !scanned && poi.id === this.objectivePoiId;
      return {
        poiId: poi.id,
        name: poi.name,
        px,
        py,
        distanceM,
        scanned,
        current,
        icon: sonarPoiIcon(scanned, current),
        // Contacts outside the current view are hidden, including those in
        // sensor range; zoom out or move the boat to reveal them.
        visible: this.showMarkers && sonarPoiVisible(distanceM, this.sensorRangeM, px, py, w, h),
      };
    });
    for (const marker of this.markers.filter((m) => m.visible && !m.current))
      this.drawMarker(ctx, marker);
    for (const marker of this.markers.filter((m) => m.visible && m.current))
      this.drawMarker(ctx, marker);
    this.canvas.setAttribute(
      'aria-label',
      `Sonar map: ${
        this.markers
          .filter((m) => m.visible)
          .map((m) => `${m.name}, ${m.scanned ? 'scanned' : m.current ? 'objective' : 'contact'}`)
          .join('; ') || 'no contacts in view'
      }`,
    );

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
    this.backdrop.remove();
    this.root.remove();
  }

  private drawMarker(ctx: CanvasRenderingContext2D, marker: SonarMarker): void {
    const color =
      this.paletteName_ === 'highContrast'
        ? '#ffffff'
        : marker.current
          ? '#ffdf80'
          : marker.scanned
            ? '#e8f7ed'
            : this.paletteName_ === 'deuteranopia'
              ? '#88d8ff'
              : '#53e2d8';
    ctx.save();
    ctx.beginPath();
    ctx.arc(marker.px, marker.py, marker.current ? 10 : 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(2, 12, 17, .88)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = marker.current ? 1.5 : 0.8;
    ctx.stroke();
    ctx.font = `bold ${marker.current ? 20 : marker.scanned ? 15 : 24}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(marker.icon, marker.px, marker.py - (marker.icon === '·' ? 3 : 1));
    ctx.restore();
  }
}
