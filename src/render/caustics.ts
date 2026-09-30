/**
 * Pre-baked caustic frames for the projector spotlight in `Atmosphere`.
 *
 * Why pre-baked: `THREE.SpotLight.map` samples the texture in the light's own
 * projective frame, so a `texture.offset` scroll does nothing -- the pattern
 * has to change in the pixels. Redrawing a canvas every frame from JS is far
 * too slow, so a short loop of frames is rasterised once at load and cycled at
 * `Config.water.causticsFps`. Sixteen 256 px frames cost about 4 MB of VRAM
 * and a couple of hundred milliseconds to generate; the medium tier uses ten
 * 128 px frames.
 *
 * F1-OCEAN: the pattern is now a two-layer animated Voronoi web. The cell
 * borders (where the gap between the nearest and second-nearest feature point
 * closes) are the bright filaments, which is what focused light on a rippled
 * surface looks like. The earlier interference formula rendered a flat texture
 * at this scale, so caustics were effectively invisible. Each feature point
 * orbits its cell on an integer number of turns per loop, so the loop is
 * seamless, and the cell grid wraps, so the web tiles.
 */

import * as THREE from 'three';

/** Frames in the loop: more on the bigger textures, where a short loop would step. */
const framesFor = (size: number): number => (size >= 256 ? 16 : 10);

/** Cells across the texture: roughly 26 texels per cell, at least 4. */
const cellsFor = (size: number): number => Math.max(4, Math.round(size / 26));

/** Deterministic per-cell hash in [0, 1). */
function hash(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Feature points of one layer at loop phase `t` (radians), flattened x,y per cell. */
function featurePoints(k: number, t: number, seed: number, out: Float32Array): void {
  for (let cy = 0; cy < k; cy++) {
    for (let cx = 0; cx < k; cx++) {
      const a = hash(cx, cy, seed) * Math.PI * 2;
      const b = hash(cx, cy, seed + 7) * Math.PI * 2;
      const turns = 1 + Math.floor(hash(cx, cy, seed + 3) * 2);
      const i = (cy * k + cx) * 2;
      out[i] = cx + 0.5 + 0.38 * Math.cos(t * turns + a);
      out[i + 1] = cy + 0.5 + 0.38 * Math.sin(t * turns + b);
    }
  }
}

/** Gap between the nearest and second-nearest feature point at (x, y) cell units. */
function borderGap(x: number, y: number, k: number, pts: Float32Array): number {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i;
      const gy = cy + j;
      const wx = ((gx % k) + k) % k;
      const wy = ((gy % k) + k) % k;
      const q = (wy * k + wx) * 2;
      // The point's position is stored for the wrapped cell; shift it back to the neighbour.
      const dx = pts[q]! + (gx - wx) - x;
      const dy = pts[q + 1]! + (gy - wy) - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return f2 - f1;
}

const EDGE_WIDTH = 0.25; // in cell units
const sharp = (gap: number): number => {
  const v = Math.max(0, 1 - gap / EDGE_WIDTH);
  return v * v;
};

/**
 * Rasterise the frame loop. Returns textures ready to hand to
 * `SpotLight.map`; the caller owns disposal.
 */
export function makeCausticFrames(size: number): THREE.Texture[] {
  const out: THREE.Texture[] = [];
  const half = size / 2;
  const frames = framesFor(size);
  const k1 = cellsFor(size);
  const k2 = Math.round(k1 * 1.6);
  const p1 = new Float32Array(k1 * k1 * 2);
  const p2 = new Float32Array(k2 * k2 * 2);
  for (let f = 0; f < frames; f++) {
    // 2*pi over the loop keeps the cycle seamless.
    const phase = (f / frames) * Math.PI * 2;
    featurePoints(k1, phase, 1, p1);
    featurePoints(k2, -phase, 5, p2);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    const img = ctx.createImageData(size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Radial falloff so the projected disc has no hard square edge.
        const rx = (x - half) / half;
        const ry = (y - half) / half;
        const fall = Math.max(0, 1 - Math.sqrt(rx * rx + ry * ry));
        let value = 0;
        if (fall > 0) {
          const u = x / size;
          const v = y / size;
          const a = sharp(borderGap(u * k1, v * k1, k1, p1));
          // The second layer is offset so its web does not line up with the first.
          const b = sharp(borderGap(((u + 0.37) % 1) * k2, ((v + 0.21) % 1) * k2, k2, p2));
          value = Math.min(1, 0.9 * a + 0.7 * b) * fall * Math.min(1, fall * 2);
        }
        const byte = Math.round(255 * Math.min(1, value));
        const i = (y * size + x) * 4;
        data[i] = byte;
        data[i + 1] = byte;
        data[i + 2] = byte;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    out.push(tex);
  }
  return out;
}
