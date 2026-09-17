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
  /** On-screen size in CSS pixels. */
  size?: number;
  parent?: HTMLElement;
}

export class Sonar {
  readonly root: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  visible = true;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement;
  private readonly size: number;
  private readonly halfW: number;
  private readonly halfD: number;
  private trail: Array<{ x: number; z: number }> = [];

  constructor(
    private readonly terrain: Terrain,
    private readonly landmarks: PlacedLandmark[] = [],
    options: SonarOptions = {},
  ) {
    this.size = options.size ?? 220;
    this.halfW = terrain.widthM / 2;
    this.halfD = terrain.depthM / 2;

    this.root = document.createElement('div');
    this.root.className = 'sonar';
    this.canvas = document.createElement('canvas');
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.root.appendChild(this.canvas);
    (options.parent ?? document.body).appendChild(this.root);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);

    this.base = this.renderBathymetry();
  }

  /** Rasterise the heightmap once into an offscreen canvas. */
  private renderBathymetry(): HTMLCanvasElement {
    const { meta } = this.terrain;
    const n = this.size;
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    const ctx = c.getContext('2d');
    if (!ctx) return c;

    const img = ctx.createImageData(n, n);
    const data = img.data;
    // Preserve the tile's aspect ratio inside a square canvas.
    const aspect = this.terrain.widthM / this.terrain.depthM;
    const drawW = aspect >= 1 ? n : n * aspect;
    const drawH = aspect >= 1 ? n / aspect : n;
    const ox = (n - drawW) / 2;
    const oy = (n - drawH) / 2;

    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const i = (py * n + px) * 4;
        if (px < ox || px >= ox + drawW || py < oy || py >= oy + drawH) {
          data[i + 3] = 0; // transparent letterbox
          continue;
        }
        const col = Math.round(((px - ox) / drawW) * (meta.cols - 1));
        // Canvas +y runs down the screen, and so does +Z (south): same order
        // as the heightmap rows, so no flip.
        const row = Math.round(((py - oy) / drawH) * (meta.rows - 1));
        const h = this.terrain.heightAtCell(col, row);
        const color = this.terrain.colorForDepth(h);
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
    const n = this.size;
    const aspect = this.terrain.widthM / this.terrain.depthM;
    const drawW = aspect >= 1 ? n : n * aspect;
    const drawH = aspect >= 1 ? n / aspect : n;
    return {
      px: (n - drawW) / 2 + ((x + this.halfW) / this.terrain.widthM) * drawW,
      py: (n - drawH) / 2 + ((z + this.halfD) / this.terrain.depthM) * drawH,
    };
  }

  toggle(): boolean {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? '' : 'none';
    return this.visible;
  }

  /** Redraw. Cheap enough to call every frame. */
  update(s: SubmarineState): void {
    if (!this.visible) return;
    const n = this.size;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, n, n);
    ctx.drawImage(this.base, 0, 0, n, n);

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
    ctx.strokeRect(0.5, 0.5, n - 1, n - 1);
  }

  dispose(): void {
    this.root.remove();
  }
}
