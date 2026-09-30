/**
 * Canvas-generated textures for the wrecks (no binary assets): a neutral
 * riveted-plate detail map for steel, a neutral plank map for wood, normal maps
 * derived from their height fields, and the gilded ENDURANCE stern lettering.
 *
 * Detail maps are neutral grey (luminance only) so vertex colours carry the
 * hue; each records its mean linear value in `userData.meanLinear` so the
 * material can divide it back out. Every texture tiles seamlessly and is
 * cached per (kind, size): all wrecks on a site share them. Without a DOM
 * (unit tests) every factory returns null.
 */

import * as THREE from 'three';
import { mulberry32 } from './shared.js';

const cache = new Map<string, THREE.Texture | null>();

function cached<T extends THREE.Texture>(key: string, make: () => T | null): T | null {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T | null;
}

function canvas2d(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return ctx ? [c, ctx] : null;
}

/** Draw `fn` at all nine wrap offsets so marks crossing an edge tile seamlessly. */
function wrapped(size: number, fn: (ox: number, oy: number) => void): void {
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy);
}

const srgbToLinear = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

function meanLinear(ctx: CanvasRenderingContext2D, size: number): number {
  const d = ctx.getImageData(0, 0, size, size).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += srgbToLinear(d[i]! / 255);
  return sum / (size * size);
}

function finishColor(c: HTMLCanvasElement, mean: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.userData.meanLinear = mean;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Tangent-space normal map from a greyscale height canvas (wrapping Sobel). */
function normalFromHeight(
  hctx: CanvasRenderingContext2D,
  size: number,
  strength: number,
): THREE.CanvasTexture | null {
  const out = canvas2d(size);
  if (!out) return null;
  const src = hctx.getImageData(0, 0, size, size).data;
  const h = (x: number, y: number): number =>
    src[((((y + size) % size) * size + ((x + size) % size)) * 4) as number]! / 255;
  const img = out[1].createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        h(x + 1, y - 1) +
        2 * h(x + 1, y) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy =
        h(x - 1, y + 1) +
        2 * h(x, y + 1) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      let nx = -dx * strength;
      let ny = dy * strength;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y * size + x) * 4;
      d[i] = Math.round((nx * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  out[1].putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out[0]);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// ------------------------------------------------------------------ steel

interface SteelMaps {
  map: THREE.CanvasTexture;
  normal: THREE.CanvasTexture | null;
}

/**
 * Riveted steel plating, one repeat = four strakes high and two plates long:
 * seams with rivet rows, gravity-fed streaks, blistered patches and pits.
 */
export function steelMaps(size: number, withNormal: boolean): SteelMaps | null {
  const map = cached(`steel:${size}`, () => drawSteel(size, 'color'));
  if (!map) return null;
  const normal = withNormal
    ? cached(`steel-n:${size}`, () => {
        const h = drawSteelHeight(size);
        return h ? normalFromHeight(h, size, 2.2) : null;
      })
    : null;
  return { map: map as THREE.CanvasTexture, normal: normal as THREE.CanvasTexture | null };
}

function drawSteel(size: number, _kind: 'color'): THREE.CanvasTexture | null {
  const cc = canvas2d(size);
  if (!cc) return null;
  const [c, ctx] = cc;
  const rnd = mulberry32(0x57ee1);
  ctx.fillStyle = 'rgb(176,176,176)';
  ctx.fillRect(0, 0, size, size);
  // Broad mottling.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.03 + rnd() * 0.14);
    const v = rnd() < 0.35 ? 235 : 70;
    const a = 0.08 + rnd() * 0.2;
    wrapped(size, (ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }
  drawSeams(ctx, size, 'rgba(40,40,40,0.55)', 'rgba(215,215,215,0.5)', rnd);
  // Streaks run down from seams and rivets.
  for (let i = 0; i < 160; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = size * (0.08 + rnd() * 0.5);
    const w = 1 + rnd() * (size / 160);
    const v = rnd() < 0.7 ? 40 : 230;
    const a = 0.1 + rnd() * 0.3;
    wrapped(size, (ox, oy) => {
      const g = ctx.createLinearGradient(0, y + oy, 0, y + oy + len);
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox, y + oy, w, len);
    });
  }
  ctx.fillStyle = 'rgba(20,20,20,0.55)';
  for (let i = 0; i < size * 0.6; i++) {
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return finishColor(c, meanLinear(ctx, size));
}

function drawSeams(
  ctx: CanvasRenderingContext2D,
  size: number,
  dark: string,
  light: string,
  rnd: () => number,
): void {
  const lw = Math.max(1, size / 256);
  // Four horizontal strakes per repeat, each with two butt joints, staggered.
  for (let k = 0; k < 4; k++) {
    const y = Math.round((k / 4) * size) + 0.5;
    ctx.fillStyle = dark;
    ctx.fillRect(0, y - lw, size, lw * 1.5);
    ctx.fillStyle = light;
    ctx.fillRect(0, y + lw * 0.5, size, lw * 0.6);
    const rivet = Math.max(1.5, size / 220);
    for (let x = 2; x < size; x += Math.max(4, size / 64)) {
      ctx.fillStyle = light;
      ctx.fillRect(x, y + lw * 2.2, rivet, rivet);
      ctx.fillStyle = dark;
      ctx.fillRect(x, y + lw * 2.2 + rivet, rivet, rivet * 0.6);
    }
    const shift = (k % 2) * 0.25 + rnd() * 0.05;
    for (let b = 0; b < 2; b++) {
      const x = Math.round(((shift + b * 0.5) % 1) * size) + 0.5;
      ctx.fillStyle = dark;
      ctx.fillRect(x, y, lw * 1.5, size / 4);
    }
  }
}

function drawSteelHeight(size: number): CanvasRenderingContext2D | null {
  const cc = canvas2d(size);
  if (!cc) return null;
  const ctx = cc[1];
  const rnd = mulberry32(0x4e1647);
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, size, size);
  // Blisters and corrosion lumps.
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.004 + rnd() * 0.03);
    const v = rnd() < 0.6 ? 200 : 60;
    const a = 0.25 + rnd() * 0.3;
    wrapped(size, (ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }
  drawSeams(ctx, size, 'rgba(20,20,20,0.9)', 'rgba(250,250,250,0.9)', rnd);
  return ctx;
}

// ------------------------------------------------------------------- wood

/**
 * Planking: one repeat holds 20 planks (so ~20 cm planks at a 4 m repeat),
 * each with its own tone, grain lines and staggered butt joints; the seams are
 * dark caulking. Planks run along u.
 */
export function woodMaps(size: number, withNormal: boolean): SteelMaps | null {
  const map = cached(`wood:${size}`, () => drawWood(size, false));
  if (!map) return null;
  const normal = withNormal
    ? cached(`wood-n:${size}`, () => {
        const h = drawWoodHeight(size);
        return h ? normalFromHeight(h, size, 1.6) : null;
      })
    : null;
  return { map: map as THREE.CanvasTexture, normal: normal as THREE.CanvasTexture | null };
}

function drawWood(size: number, _h: boolean): THREE.CanvasTexture | null {
  const cc = canvas2d(size);
  if (!cc) return null;
  const [c, ctx] = cc;
  const rnd = mulberry32(0x3007d);
  const planks = 20;
  const ph = size / planks;
  for (let k = 0; k < planks; k++) {
    const y = k * ph;
    const base = 150 + rnd() * 60;
    ctx.fillStyle = `rgb(${base},${base},${base})`;
    ctx.fillRect(0, y, size, ph);
    // Grain: long thin lines of slightly different tone.
    for (let g = 0; g < 7; g++) {
      const gy = y + rnd() * ph;
      const v = rnd() < 0.5 ? base - 30 : base + 20;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.lineWidth = Math.max(0.6, size / 900);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= size; x += size / 16)
        ctx.lineTo(x, gy + Math.sin(x * 0.05 + g) * ph * 0.08);
      ctx.stroke();
    }
    // Butt joints, staggered plank to plank.
    const off = rnd();
    for (let b = 0; b < 2; b++) {
      const x = ((off + b * 0.5) % 1) * size;
      ctx.fillStyle = 'rgba(30,30,30,0.8)';
      ctx.fillRect(x, y, Math.max(1, size / 400), ph);
    }
    // Caulked seam.
    ctx.fillStyle = 'rgba(25,25,25,0.9)';
    ctx.fillRect(0, y, size, Math.max(1, size / 380));
  }
  // Worn, darker blotches.
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.03 + rnd() * 0.1);
    wrapped(size, (ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, 'rgba(60,60,60,0.25)');
      g.addColorStop(1, 'rgba(60,60,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }
  return finishColor(c, meanLinear(ctx, size));
}

function drawWoodHeight(size: number): CanvasRenderingContext2D | null {
  const cc = canvas2d(size);
  if (!cc) return null;
  const ctx = cc[1];
  const rnd = mulberry32(0x3007e);
  const planks = 20;
  const ph = size / planks;
  ctx.fillStyle = 'rgb(150,150,150)';
  ctx.fillRect(0, 0, size, size);
  for (let k = 0; k < planks; k++) {
    const y = k * ph;
    const v = 130 + rnd() * 50;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y + 1, size, ph - 1);
    ctx.fillStyle = 'rgb(20,20,20)';
    ctx.fillRect(0, y, size, Math.max(1.5, size / 300));
    const off = rnd();
    for (let b = 0; b < 2; b++) {
      ctx.fillRect(((off + b * 0.5) % 1) * size, y, Math.max(1, size / 400), ph);
    }
  }
  return ctx;
}

// ------------------------------------------------------------- lettering

/**
 * ENDURANCE arched over a five-pointed star (the pole star kept from her
 * original name, Polaris), in weathered gilt on a transparent ground. Used as
 * an alpha-tested decal on the stern counter.
 */
export function enduranceNameTexture(): THREE.CanvasTexture | null {
  return cached('endurance-name', () => {
    const cc = canvas2d(1024, 512);
    if (!cc) return null;
    const [c, ctx] = cc;
    ctx.clearRect(0, 0, 1024, 512);
    const gold = ctx.createLinearGradient(0, 0, 0, 512);
    gold.addColorStop(0, '#e6c56a');
    gold.addColorStop(0.5, '#c29a45');
    gold.addColorStop(1, '#9c7a38');
    ctx.fillStyle = gold;
    ctx.font = 'bold 118px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Arched: each letter placed on a circle below the text.
    const word = 'ENDURANCE';
    const cx = 512;
    const cy = 1180;
    const r = 1000;
    const spread = 0.74;
    for (let i = 0; i < word.length; i++) {
      const a = -spread / 2 + (spread * i) / (word.length - 1);
      ctx.save();
      ctx.translate(cx + r * Math.sin(a), cy - r * Math.cos(a));
      ctx.rotate(a);
      ctx.fillText(word[i]!, 0, 0);
      ctx.restore();
    }
    // The star.
    const sx = 512;
    const sy = 360;
    const R = 78;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 === 0 ? R : R * 0.4;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(sx + rr * Math.cos(a), sy + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    // Weathering: knock out specks so the gilt reads as old.
    const rnd = mulberry32(0xe4d);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.7})`;
      ctx.fillRect(rnd() * 1024, rnd() * 512, 1 + rnd() * 4, 1 + rnd() * 4);
    }
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  });
}
