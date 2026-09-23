/**
 * Procedural placeholder props (plan/PHASE-B-CONTRACTS.md §2.3):
 *
 *   procedural:hull-block  a hull section, dimensions_m = [length, width, height],
 *                          length along the prop's local -Z (its heading)
 *   procedural:debris      20-60 small plates/pipes scattered within dimensions_m[0] m
 *   procedural:chimney     a knobbly tapered basalt column, height dimensions_m[2]
 *
 * Every builder is deterministic from its seed (hash of the prop id), so a prop
 * looks the same on every load and in every test. Local frame: base at y = 0,
 * centred on x/z, -Z forward.
 *
 * Materials follow docs/art-direction.md §4: rusted steel with patchy growth and
 * a sediment-darkened foot for wrecks; basalt grey with pale mineral staining for
 * chimneys; no emissive, no glow. All are MeshStandardMaterial so scene fog and
 * the headlights act on them like the terrain. Colour variation lives in vertex
 * colours (pure maths, testable headlessly); fine streaks and plate seams come
 * from a tileable canvas texture when a DOM is available. No binary textures.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { HullEnd, PropsConfig } from '../../core/Config.js';

export interface BuiltProp {
  /** Full-detail object. */
  full: THREE.Object3D;
  /** Cheap stand-in shown between the LOD distance and the cull distance. */
  impostor: THREE.Object3D;
  /** Local-space bounds of `full` (before the prop's own scale). */
  bounds: THREE.Box3;
}

/** Signature for terrain-following debris: local (x, z) -> ground Y relative to the prop origin. */
export type LocalHeightFn = (x: number, z: number) => number;

// ------------------------------------------------------------------ seeding

/** FNV-1a 32-bit hash; stable seed from a prop id. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: tiny, fast, good-enough PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash-based 3D value noise in [0, 1], smooth, seeded. */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const h = (i: number, j: number, k: number): number => {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 2147483647) ^ seed;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const x00 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u);
  const x10 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u);
  const x01 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u);
  const x11 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

// ---------------------------------------------------------------- textures

function hexCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * Tileable rusted-plate detail texture: vertical gravity-fed streaks, faint
 * plate seams with rivet rows, a few pits. Returns null without a DOM (tests).
 */
export function makeRustTexture(
  seed: number,
  size: number,
  colors: PropsConfig['colors'],
  neutral = false,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const rnd = mulberry32(seed ^ 0x5eed);
  // Draw at all 9 wrap offsets so the texture tiles seamlessly.
  const wrapped = (fn: (ox: number, oy: number) => void): void => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy);
  };

  ctx.fillStyle = hexCss(colors.rust);
  ctx.fillRect(0, 0, size, size);

  // Mottling: broad low-contrast blotches of darker and lighter oxide.
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.04 + rnd() * 0.12);
    const light = rnd() < 0.3;
    const col = light ? 'rgba(138, 72, 42,' : 'rgba(48, 22, 12,';
    const a = 0.12 + rnd() * 0.22;
    wrapped((ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, `${col}${a})`);
      g.addColorStop(1, `${col}0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }

  // Plate seams: two horizontal courses and a few butt joints, with rivet dots.
  ctx.strokeStyle = 'rgba(30, 14, 8, 0.45)';
  ctx.lineWidth = Math.max(1, size / 256);
  const rows = [0.18 + rnd() * 0.1, 0.62 + rnd() * 0.1];
  for (const r of rows) {
    const y = Math.round(r * size) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40, 18, 10, 0.5)';
    for (let x = 2; x < size; x += Math.max(3, size / 48)) ctx.fillRect(x, y - 3, 1.5, 1.5);
  }
  for (let i = 0; i < 3; i++) {
    const x = Math.round(((i + rnd() * 0.5) / 3) * size) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Streaks: thin vertical runs of dark and orange staining, fading downward.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = size * (0.15 + rnd() * 0.6);
    const w = 1 + rnd() * 3;
    const dark = rnd() < 0.75;
    const col = dark ? 'rgba(36, 15, 8,' : 'rgba(150, 80, 44,';
    const a = 0.15 + rnd() * 0.35;
    wrapped((ox, oy) => {
      const g = ctx.createLinearGradient(0, y + oy, 0, y + oy + len);
      g.addColorStop(0, `${col}${a})`);
      g.addColorStop(1, `${col}0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox, y + oy, w, len);
    });
  }

  // Pits.
  ctx.fillStyle = 'rgba(25, 10, 5, 0.5)';
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }

  const meanLinear = neutral ? toNeutralLuminance(ctx, size, colors.rust) : 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.userData.meanLinear = meanLinear;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const srgbToLinear = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const linearToSrgb = (v: number): number =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

/**
 * Turn the drawn rust texture into a neutral grey detail map: each texel's
 * linear luminance relative to the rust base colour, scaled so the base sits at
 * 0.75. Returns the mean linear value so the material can divide it back out.
 */
function toNeutralLuminance(ctx: CanvasRenderingContext2D, size: number, rustHex: number): number {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const lum = (r: number, g: number, b: number): number =>
    0.2126 * srgbToLinear(r / 255) +
    0.7152 * srgbToLinear(g / 255) +
    0.0722 * srgbToLinear(b / 255);
  const base = lum((rustHex >> 16) & 255, (rustHex >> 8) & 255, rustHex & 255);
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.min(1, (0.75 * lum(d[i]!, d[i + 1]!, d[i + 2]!)) / base);
    const s = Math.round(linearToSrgb(v) * 255);
    d[i] = d[i + 1] = d[i + 2] = s;
    sum += srgbToLinear(s / 255);
  }
  ctx.putImageData(img, 0, 0);
  return sum / (size * size);
}

// ---------------------------------------------------------------- geometry

/**
 * World-scale box-projected UVs: side faces run u along the horizontal axis and
 * v up the height, top faces use x/z. `repeatM` metres per texture repeat.
 */
function projectUVs(geom: THREE.BufferGeometry, repeatM: number): void {
  const pos = geom.getAttribute('position');
  const nrm = geom.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / repeatM;
    uv[i * 2 + 1] = v / repeatM;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Vertex colours for a wreck piece, as ABSOLUTE linear colours drawn only from
 * the art-direction §0 wreck palette: rust `#7A3B22` blended toward marine
 * growth `#4E5A3E` in noise patches, times a scalar shade (sediment-darkened
 * foot, tonal variation, the dark torn interior of a cut end). Up-facing decks
 * get a light silt dusting (the sediment colour); vertical faces never do, so
 * no end face can drift toward lime or orange. The hull's detail texture is a
 * neutral luminance map, so it only modulates brightness.
 */
function paintWreck(
  geom: THREE.BufferGeometry,
  heightM: number,
  seed: number,
  colors: PropsConfig['colors'],
  shadeAt: (x: number, y: number, z: number) => number = () => 1,
): void {
  const pos = geom.getAttribute('position');
  const nrm = geom.getAttribute('normal');
  const rust = new THREE.Color(colors.rust);
  const growth = new THREE.Color(colors.growth);
  const sediment = new THREE.Color(colors.sediment);
  const c = new THREE.Color();
  const col = new Float32Array(pos.count * 3);
  const growthScale = 1 / Math.max(6, heightM * 0.6);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h01 = THREE.MathUtils.clamp(y / Math.max(1e-3, heightM), 0, 1);
    // Darkening toward the bottom of vertical surfaces (art-direction §4).
    const foot = 1 - THREE.MathUtils.smoothstep(h01, 0, 0.4);
    const n = valueNoise3(x * growthScale, y * growthScale, z * growthScale, seed);
    const g = THREE.MathUtils.smoothstep(n, 0.55, 0.8) * 0.75;
    const shade = (0.85 + 0.25 * n) * (1 - 0.5 * foot) * shadeAt(x, y, z);
    c.copy(rust).lerp(growth, g).multiplyScalar(shade);
    // Silt only settles on (near-)horizontal up-facing surfaces.
    const up = THREE.MathUtils.smoothstep(nrm.getY(i), 0.6, 0.9);
    if (up > 0) c.lerp(sediment, up * 0.5 * valueNoise3(x * 0.08, 7.3, z * 0.08, seed ^ 0x9e37));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/**
 * Hull material. Vertex colours carry the absolute palette; the optional map is
 * a neutral luminance detail texture whose mean is divided back out, so on
 * average the rendered colour is the palette colour.
 */
function wreckMaterial(map: THREE.Texture | null): THREE.MeshStandardMaterial {
  const mean = (map?.userData as { meanLinear?: number } | undefined)?.meanLinear ?? 1;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.2,
  });
  mat.color.setScalar(1 / Math.max(0.2, mean));
  return mat;
}

/** Strip to the attributes every piece shares so they can be merged. */
function normalise(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom;
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  g.clearGroups();
  return g;
}

// --------------------------------------------------------------- hull-block

export type { HullEnd };

interface HullEndSpec {
  kind: HullEnd;
  /** -1 for the forward (-Z) end, +1 for the aft (+Z) end. */
  sign: -1 | 1;
  /** Length (m) over which the end reshapes the hull and the z grid is dense. */
  zone: number;
  /** Cut ends: depth of the ragged break (m). 0 otherwise. */
  cutDepth: number;
}

interface HullShape {
  L: number;
  W: number;
  H: number;
  keel: number;
  ends: [HullEndSpec, HullEndSpec];
  rakeM: number;
  tipExp: number;
  sheerM: number;
  tuckM: number;
  collapseM: number;
  seed: number;
}

/** Bilge taper: beam multiplier at height y (full beam above mid-height). */
function keelFactor(s: HullShape, y: number): number {
  const t = THREE.MathUtils.clamp(y / (s.H * 0.5), 0, 1);
  return s.keel + (1 - s.keel) * Math.sqrt(t);
}

function makeEndSpec(
  kind: HullEnd,
  sign: -1 | 1,
  L: number,
  W: number,
  cfg: PropsConfig,
): HullEndSpec {
  const cutDepth = THREE.MathUtils.clamp(L * cfg.hullCutDepthFraction, 2, 12);
  switch (kind) {
    case 'prow':
      return {
        kind,
        sign,
        zone: THREE.MathUtils.clamp(
          L * cfg.hullProwLengthFraction,
          Math.min(W, L * 0.25),
          L * 0.45,
        ),
        cutDepth: 0,
      };
    case 'rounded':
      return {
        kind,
        sign,
        zone: THREE.MathUtils.clamp(W * cfg.hullRoundedLengthFraction, 1, L * 0.3),
        cutDepth: 0,
      };
    case 'cut':
      // The zone covers the sagging decks behind the break, not just the break.
      return { kind, sign, zone: Math.min(cutDepth * 2.5, L * 0.3), cutDepth };
  }
}

/**
 * Reshape one hull-following vertex (body, strakes, forecastle): bilge taper,
 * then per end a raked, sheered prow; an elliptical counter stern with an
 * undercut; or a ragged break with sagging decks and splayed plating. Pure
 * function of the input position, so coincident vertices of different faces
 * move together and the hull stays closed.
 */
function shapeHullVertex(s: HullShape, p: THREE.Vector3): void {
  const halfL = s.L / 2;
  const { x: x0, y: y0, z: z0 } = p;
  const yH = y0 / s.H;
  let x = x0 * keelFactor(s, y0);
  let y = y0;
  let z = z0;
  for (const e of s.ends) {
    const dist = halfL - e.sign * z0; // 0 at this end, growing inward
    if (e.kind === 'prow') {
      // Sheer: the deck line rises toward the stem.
      const sh = Math.max(0, 1 - dist / (e.zone * 1.6));
      y += s.sheerM * Math.max(0, yH) * sh * sh;
      if (dist < e.zone) {
        const u = dist / e.zone;
        const back = s.rakeM * Math.pow(THREE.MathUtils.clamp(1 - yH, 0, 1), 1.5);
        x *= 1 - Math.pow(1 - u, s.tipExp);
        z = e.sign * (halfL - (back + dist * (1 - back / e.zone)));
      }
    } else if (e.kind === 'rounded') {
      if (dist < e.zone) {
        const u = dist / e.zone;
        const back = s.tuckM * Math.pow(THREE.MathUtils.clamp(1 - yH / 0.8, 0, 1), 1.3);
        x *= Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
        z = e.sign * (halfL - (back + dist * (1 - back / e.zone)));
      }
    } else if (dist < e.zone) {
      const d = e.cutDepth;
      const n = valueNoise3(x0 * 0.45 + 11.3, y0 * 0.45, e.sign * 7.1, s.seed);
      const n2 = valueNoise3(x0 * 0.2, 3.1, z0 * 0.2 + 5, s.seed ^ 0x2c);
      // Upper decks sag toward the break (pancaked decks), keel untouched.
      const tc = Math.pow(1 - dist / e.zone, 1.5);
      y -= s.collapseM * yH * yH * tc * (0.6 + 0.6 * n2);
      // Side plating splays outward near the break.
      x *= 1 + 0.1 * tc * THREE.MathUtils.clamp(yH, 0, 1) * n2;
      if (dist < d) {
        // Ragged break: the end face is pushed inward by a noisy 20-100% of d.
        const jag = d * (0.2 + 0.8 * THREE.MathUtils.smoothstep(n, 0.2, 0.8));
        z = e.sign * (halfL - (dist + jag * (1 - dist / d)));
      }
    }
  }
  p.set(x, Math.max(0, y), THREE.MathUtils.clamp(z, -halfL, halfL));
}

function shapeHull(geom: THREE.BufferGeometry, s: HullShape): void {
  const pos = geom.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    shapeHullVertex(s, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
}

/** z stations along the hull: ~1.2 m apart in the two end zones, ~6 m amidships. */
function hullStations(L: number, zones: readonly [number, number]): number[] {
  const halfL = L / 2;
  const fine = (m: number): number => Math.max(1, Math.min(32, Math.ceil(m / 1.2)));
  const n0 = fine(zones[0]);
  const n1 = fine(zones[1]);
  const mid = Math.max(0, L - zones[0] - zones[1]);
  const nm = Math.max(1, Math.min(40, Math.round(mid / 6)));
  const out: number[] = [];
  for (let i = 0; i <= n0; i++) out.push(-halfL + (zones[0] * i) / n0);
  for (let i = 1; i <= nm; i++) out.push(-halfL + zones[0] + (mid * i) / nm);
  for (let i = 1; i <= n1; i++) out.push(halfL - zones[1] + (zones[1] * i) / n1);
  return out;
}

/** A box spanning the hull length whose z grid follows `stations`. */
function stationBox(
  w: number,
  h: number,
  L: number,
  wSeg: number,
  hSeg: number,
  stations: readonly number[],
): THREE.BufferGeometry {
  const n = stations.length - 1;
  const g = new THREE.BoxGeometry(w, h, L, wSeg, hSeg, n);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(((pos.getZ(i) + L / 2) / L) * n);
    pos.setZ(i, stations[THREE.MathUtils.clamp(k, 0, n)]!);
  }
  return g;
}

/** Clamp a free piece (not hull-shaped) to y >= 0 and zMin <= z <= zMax. */
function clampPiece(g: THREE.BufferGeometry, zMin: number, zMax: number): void {
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, Math.max(0, pos.getY(i)));
    pos.setZ(i, THREE.MathUtils.clamp(pos.getZ(i), zMin, zMax));
  }
}

/**
 * The torn end: exposed deck slabs sagging out of the break, side plating
 * peeled outward, and plates hanging from the deck edge. Nothing reaches the
 * nominal end of the hull, so a cut end never extends as far as a prow.
 */
function addCutEnd(
  pieces: THREE.BufferGeometry[],
  e: HullEndSpec,
  s: HullShape,
  rnd: () => number,
  cfg: PropsConfig,
): void {
  const { W, H } = s;
  const halfL = s.L / 2;
  const d = e.cutDepth;
  const reach = halfL - 0.05 * d;
  const [zMin, zMax] = e.sign < 0 ? [-reach, halfL] : [-halfL, reach];
  const at = (dist: number): number => e.sign * (halfL - dist);
  const add = (g: THREE.BufferGeometry): void => {
    clampPiece(g, zMin, zMax);
    g.computeVertexNormals();
    pieces.push(normalise(g));
  };

  // Deck slabs at each deck level, sagging outward from the break.
  const spacing = Math.max(1, cfg.hullDeckSpacingM);
  for (let y0 = H; y0 >= Math.max(spacing, H * 0.35); y0 -= spacing) {
    const yH = y0 / H;
    const beam = W * keelFactor(s, y0);
    const width = beam * (0.55 + 0.35 * rnd());
    const len = d * (0.5 + 0.6 * rnd());
    const thick = 0.3 + rnd() * 0.15;
    const slab = new THREE.BoxGeometry(width, thick, len, 2, 1, 2);
    slab.rotateX(e.sign * (0.06 + rnd() * 0.3));
    slab.rotateZ((rnd() - 0.5) * 0.2);
    const sag = s.collapseM * yH * yH * 0.8;
    slab.translate(
      (rnd() - 0.5) * (beam - width) * 0.5,
      y0 - sag - thick / 2,
      at(0.1 * d + rnd() * 0.35 * d + len / 2),
    );
    add(slab);
  }

  // Side plating peeled outward at the break.
  const plates = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < plates; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const pw = d * (0.4 + rnd() * 0.6);
    const ph = H * (0.2 + rnd() * 0.25);
    const p = new THREE.BoxGeometry(Math.max(0.2, W * 0.008), ph, pw);
    p.rotateX((rnd() - 0.5) * 0.6);
    p.rotateY(side * e.sign * (0.25 + rnd() * 0.7));
    const y = H * (0.35 + rnd() * 0.5);
    p.translate(side * (W / 2) * keelFactor(s, y) * 0.97, y, at(0.15 * d + rnd() * 0.4 * d));
    add(p);
  }

  // Plates hanging down from the deck edge.
  const hanging = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < hanging; i++) {
    const pw = W * (0.1 + rnd() * 0.15);
    const pl = H * (0.2 + rnd() * 0.2);
    const a = 0.7 + rnd() * 0.6;
    const p = new THREE.BoxGeometry(pw, 0.25, pl);
    p.rotateX(e.sign * a);
    const top = H - s.collapseM * 0.8;
    p.translate(
      (rnd() - 0.5) * W * 0.6,
      top - (pl / 2) * Math.sin(a),
      at(0.2 * d + rnd() * 0.3 * d),
    );
    add(p);
  }
}

/**
 * A hull section: [length, width, height], length along local -Z. `ends`
 * gives the shape of the forward (-Z) and aft (+Z) ends:
 *
 *   prow     pointed, raked stem with deck sheer and a raised forecastle deck
 *   cut      ragged, darker break: sagging decks, exposed deck slabs, peeled plating
 *   rounded  elliptical counter stern, undercut toward the keel
 *
 * Also a bilge taper toward the keel, a rubbing strake down each side and a few
 * deck houses and vents amidships. One merged mesh, one draw call.
 */
export function buildHullBlock(
  dims: readonly [number, number, number],
  seed: number,
  cfg: PropsConfig,
  ends: readonly [HullEnd, HullEnd] = cfg.hullDefaultEnds,
): BuiltProp {
  const [L, W, H] = dims;
  const rnd = mulberry32(seed);
  const pieces: THREE.BufferGeometry[] = [];

  const endSpecs: [HullEndSpec, HullEndSpec] = [
    makeEndSpec(ends[0], -1, L, W, cfg),
    makeEndSpec(ends[1], 1, L, W, cfg),
  ];
  // Short hulls: keep the two end zones from overlapping.
  const zoneSum = endSpecs[0].zone + endSpecs[1].zone;
  if (zoneSum > L * 0.8) {
    const k = (L * 0.8) / zoneSum;
    for (const e of endSpecs) {
      e.zone *= k;
      e.cutDepth = Math.min(e.cutDepth, e.zone);
    }
  }
  const shape: HullShape = {
    L,
    W,
    H,
    keel: THREE.MathUtils.clamp(cfg.hullKeelFraction, 0.2, 1),
    ends: endSpecs,
    rakeM: H * cfg.hullProwRakeFraction,
    tipExp: Math.max(0.5, cfg.hullProwTaperExponent),
    sheerM: H * cfg.hullProwSheerFraction,
    tuckM: H * cfg.hullCounterTuckFraction,
    collapseM: H * cfg.hullCutCollapseFraction,
    seed,
  };
  const stations = hullStations(L, [endSpecs[0].zone, endSpecs[1].zone]);
  const hullPiece = (g: THREE.BufferGeometry): void => {
    shapeHull(g, shape);
    g.computeVertexNormals();
    pieces.push(normalise(g));
  };

  // Body: ~2.5 m across the beam and ~2 m up, so the break can be ragged.
  const wSeg = THREE.MathUtils.clamp(Math.round(W / 2.5), 4, 14);
  const hSeg = THREE.MathUtils.clamp(Math.round(H / 2), 4, 10);
  const body = stationBox(W, H, L, wSeg, hSeg, stations);
  body.translate(0, H / 2, 0);
  hullPiece(body);

  // Rubbing strakes, following the hull into each end.
  const strakeH = Math.max(0.3, H * 0.02);
  for (const side of [-1, 1]) {
    const st = stationBox(Math.max(0.25, W * 0.015), strakeH, L, 1, 1, stations);
    st.translate(side * (W / 2 + W * 0.0075), H * 0.82, 0);
    hullPiece(st);
  }

  // Raised forecastle deck on each prow: a step in the deck line that tapers
  // with the bow, so the forward end reads from any side.
  let fcLen = 0;
  for (const e of endSpecs) {
    if (e.kind !== 'prow') continue;
    fcLen = Math.min(L * cfg.hullForecastleLengthFraction, L * 0.4);
    const fcH = Math.max(0.5, H * cfg.hullForecastleHeightFraction);
    const fc = new THREE.BoxGeometry(W, fcH, fcLen, wSeg, 1, Math.max(2, Math.ceil(fcLen / 1.2)));
    fc.translate(0, H + fcH / 2, e.sign * (L / 2 - fcLen / 2));
    hullPiece(fc);
  }

  // Deck houses and vents, amidships only (clear of the shaped ends).
  const endClear = (e: HullEndSpec): number =>
    e.zone + (e.kind === 'prow' ? Math.max(0, fcLen - e.zone) : 0) + 2;
  let zA = -L / 2 + endClear(endSpecs[0]);
  let zB = L / 2 - endClear(endSpecs[1]);
  if (zB - zA < L * 0.2) {
    const c = (zA + zB) / 2;
    zA = c - L * 0.1;
    zB = c + L * 0.1;
  }
  const span = zB - zA;
  const mid = (zA + zB) / 2;
  const houses = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < houses; i++) {
    const hw = W * (0.3 + rnd() * 0.3);
    const hl = Math.min(span * 0.5, L * (0.05 + rnd() * 0.1));
    const hh = H * (0.08 + rnd() * 0.16);
    const z = mid + (rnd() - 0.5) * (span - hl) * 0.85;
    const b = new THREE.BoxGeometry(hw, hh, hl);
    b.translate((rnd() - 0.5) * (W - hw) * 0.5, H + hh / 2, z);
    pieces.push(normalise(b));
  }
  const vents = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < vents; i++) {
    const r = Math.max(0.3, W * (0.015 + rnd() * 0.03));
    const h = Math.max(0.8, H * (0.04 + rnd() * 0.08));
    const c = new THREE.CylinderGeometry(r, r * 1.1, h, 10);
    c.translate((rnd() - 0.5) * W * 0.7, H + h / 2, mid + (rnd() - 0.5) * span * 0.8);
    pieces.push(normalise(c));
  }

  for (const e of endSpecs) if (e.kind === 'cut') addCutEnd(pieces, e, shape, rnd, cfg);

  const merged = mergeGeometries(pieces, false);
  if (!merged) throw new Error('hull-block: geometry merge failed');
  for (const p of pieces) p.dispose();
  projectUVs(merged, cfg.hullTextureRepeatM);
  // The torn interior of a cut end is dark: shade toward hullCutShade at the break.
  const cutShade = THREE.MathUtils.clamp(cfg.hullCutShade, 0, 1);
  const shadeAt = (_x: number, _y: number, z: number): number => {
    let f = 1;
    for (const e of endSpecs) {
      if (e.kind !== 'cut') continue;
      const dist = L / 2 - e.sign * z;
      f *= THREE.MathUtils.lerp(cutShade, 1, THREE.MathUtils.smoothstep(dist, 0, e.cutDepth * 2.2));
    }
    return f;
  };
  paintWreck(merged, H, seed, cfg.colors, shadeAt);
  merged.computeBoundingSphere();
  merged.computeBoundingBox();

  const map = makeRustTexture(seed, cfg.textureSize, cfg.colors, true);
  const full = new THREE.Mesh(merged, wreckMaterial(map));
  full.name = 'hull-block';

  // Impostor: the bare box, flat rust, one draw call and 24 vertices.
  const imp = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, L).translate(0, H / 2, 0),
    new THREE.MeshStandardMaterial({ color: cfg.colors.rust, roughness: 0.9, metalness: 0.1 }),
  );
  imp.name = 'hull-block-impostor';

  return { full, impostor: imp, bounds: merged.boundingBox!.clone() };
}

// ------------------------------------------------------------------- debris

export interface DebrisPiece {
  kind: 'box' | 'cylinder';
  /** Characteristic size (m), in [debrisMinSizeM, debrisMaxSizeM]. */
  size: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  /** Box: x/y/z extents. Cylinder: (radius, length, radius). */
  extents: THREE.Vector3;
}

/** Deterministic debris layout; exported so tests can check counts and ranges. */
export function layoutDebris(
  radius: number,
  seed: number,
  cfg: PropsConfig,
  heightAt?: LocalHeightFn,
): DebrisPiece[] {
  const rnd = mulberry32(seed);
  const span = cfg.debrisMaxPieces - cfg.debrisMinPieces;
  const count = cfg.debrisMinPieces + Math.floor(rnd() * (span + 1));
  const pieces: DebrisPiece[] = [];
  for (let i = 0; i < count; i++) {
    // Denser toward the centre, like a real debris field around a break-up.
    const a = rnd() * Math.PI * 2;
    const r = radius * Math.pow(rnd(), 0.75);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const size = cfg.debrisMinSizeM + rnd() * (cfg.debrisMaxSizeM - cfg.debrisMinSizeM);
    const kind: DebrisPiece['kind'] = rnd() < 0.72 ? 'box' : 'cylinder';
    const extents =
      kind === 'box'
        ? new THREE.Vector3(size, size * (0.08 + rnd() * 0.4), size * (0.35 + rnd() * 0.65))
        : new THREE.Vector3(size * (0.12 + rnd() * 0.18), size, 0);
    if (kind === 'cylinder') extents.z = extents.x;
    const rotation = new THREE.Euler(
      (rnd() - 0.5) * 0.5,
      rnd() * Math.PI * 2,
      kind === 'cylinder' ? Math.PI / 2 + (rnd() - 0.5) * 0.4 : (rnd() - 0.5) * 0.5,
      'YXZ',
    );
    const halfUp = kind === 'box' ? extents.y / 2 : extents.x;
    // Partially sunk into the silt.
    const ground = heightAt ? heightAt(x, z) : 0;
    const position = new THREE.Vector3(x, ground + halfUp * 0.5, z);
    pieces.push({ kind, size, position, rotation, extents });
  }
  return pieces;
}

export function buildDebris(
  radius: number,
  seed: number,
  cfg: PropsConfig,
  heightAt?: LocalHeightFn,
): BuiltProp {
  const layout = layoutDebris(radius, seed, cfg, heightAt);
  const map = makeRustTexture(seed, cfg.textureSize, cfg.colors);
  if (map) map.repeat.set(0.25, 0.25);
  const material = new THREE.MeshStandardMaterial({
    color: map ? 0xffffff : cfg.colors.rust,
    map,
    roughness: 0.9,
    metalness: 0.2,
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const rnd = mulberry32(seed ^ 0xdeb415);
  const rust = new THREE.Color(1, 1, 1);
  const growth = new THREE.Color(cfg.colors.growth).multiplyScalar(
    1 / new THREE.Color(cfg.colors.rust).g,
  );
  const tint = (c: THREE.Color): THREE.Color => {
    const t = rnd();
    // Most pieces plain rust, some darker, a few growth-tinted.
    if (t < 0.55) return c.copy(rust).multiplyScalar(0.8 + rnd() * 0.35);
    if (t < 0.85) return c.copy(rust).multiplyScalar(0.45 + rnd() * 0.2);
    return c.copy(rust).lerp(growth, 0.35 + rnd() * 0.3);
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const bounds = new THREE.Box3();
  const tmpBox = new THREE.Box3();
  const unit = new THREE.Box3(
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
  );

  const makeInstanced = (
    kind: DebrisPiece['kind'],
    list: DebrisPiece[],
  ): THREE.InstancedMesh | null => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(kind === 'box' ? boxGeo : cylGeo, material, list.length);
    list.forEach((p, i) => {
      q.setFromEuler(p.rotation);
      if (kind === 'box') s.copy(p.extents);
      else s.set(p.extents.x, p.extents.y, p.extents.x);
      m.compose(p.position, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, tint(c));
      bounds.union(tmpBox.copy(unit).applyMatrix4(m));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    mesh.name = `debris-${kind}`;
    return mesh;
  };

  // Sorted largest first so the impostor can show just the first N instances.
  const byKind = (k: DebrisPiece['kind']): DebrisPiece[] =>
    layout.filter((p) => p.kind === k).sort((a, b) => b.size - a.size);
  const full = new THREE.Group();
  full.name = 'debris';
  const boxes = makeInstanced('box', byKind('box'));
  const cyls = makeInstanced('cylinder', byKind('cylinder'));
  if (boxes) full.add(boxes);
  if (cyls) full.add(cyls);

  const impostor = new THREE.Group();
  impostor.name = 'debris-impostor';
  if (boxes) {
    const imp = new THREE.InstancedMesh(boxGeo, material, boxes.count);
    imp.instanceMatrix.copy(boxes.instanceMatrix);
    if (boxes.instanceColor) imp.instanceColor = boxes.instanceColor;
    imp.count = Math.min(cfg.debrisImpostorPieces, boxes.count);
    imp.boundingSphere = boxes.boundingSphere;
    impostor.add(imp);
  }
  return { full, impostor, bounds };
}

// ------------------------------------------------------------------ chimney

/**
 * A hydrothermal chimney: tapered, knobbly basalt column with pale mineral
 * staining toward the top and one or two side spires. dims[2] is the height;
 * dims[0], if > 0, the base diameter.
 */
export function buildChimney(
  dims: readonly [number, number, number],
  seed: number,
  cfg: PropsConfig,
): BuiltProp {
  const H = dims[2];
  const baseR = dims[0] > 0 ? dims[0] / 2 : H * cfg.chimneyRadiusFraction;
  const rnd = mulberry32(seed);
  const pieces: THREE.BufferGeometry[] = [];

  const column = (h: number, r0: number, x: number, y: number, z: number, s: number): void => {
    const g = new THREE.CylinderGeometry(
      r0 * cfg.chimneyTopFraction,
      r0,
      h,
      14,
      Math.max(4, Math.round(h / 2.5)),
    );
    g.translate(0, h / 2, 0);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i);
      const py = p.getY(i);
      const pz = p.getZ(i);
      const ang = Math.atan2(pz, px);
      // Knobbly: radius wobble from noise around the circumference and up the height.
      const n = valueNoise3(Math.cos(ang) * 1.5 + 3, py * 0.35, Math.sin(ang) * 1.5 + 3, s);
      const f = 0.8 + 0.4 * n;
      p.setXYZ(i, px * f + x, py + y, pz * f + z);
    }
    g.computeVertexNormals();
    pieces.push(normalise(g));
  };

  column(H, baseR, 0, 0, 0, seed);
  const spires = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < spires; i++) {
    const a = rnd() * Math.PI * 2;
    const h = H * (0.25 + rnd() * 0.3);
    const y = H * (0.1 + rnd() * 0.35);
    const off = baseR * (0.55 + rnd() * 0.2);
    column(h, baseR * (0.25 + rnd() * 0.15), Math.cos(a) * off, y, Math.sin(a) * off, seed + i + 1);
  }

  const merged = mergeGeometries(pieces, false);
  if (!merged) throw new Error('chimney: geometry merge failed');
  for (const p of pieces) p.dispose();

  // Absolute vertex colours: basalt, mineral staining near the top, a little growth at the foot.
  const pos = merged.getAttribute('position');
  const basalt = new THREE.Color(cfg.colors.basalt);
  const mineral = new THREE.Color(cfg.colors.mineral);
  const growth = new THREE.Color(cfg.colors.growth);
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h01 = y / H;
    const n = valueNoise3(x * 0.5, y * 0.4, z * 0.5, seed ^ 0xc41);
    const stain = THREE.MathUtils.smoothstep(h01 + (n - 0.5) * 0.35, 0.65, 0.95) * 0.7;
    const foot = (1 - THREE.MathUtils.smoothstep(h01, 0, 0.15)) * 0.35;
    c.copy(basalt)
      .multiplyScalar(0.8 + 0.4 * n)
      .lerp(mineral, stain)
      .lerp(growth, foot);
    col.set([c.r, c.g, c.b], i * 3);
  }
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();

  const full = new THREE.Mesh(
    merged,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      flatShading: false,
    }),
  );
  full.name = 'chimney';

  const imp = new THREE.Mesh(
    new THREE.CylinderGeometry(baseR * cfg.chimneyTopFraction, baseR, H, 6).translate(0, H / 2, 0),
    new THREE.MeshStandardMaterial({ color: cfg.colors.basalt, roughness: 1, metalness: 0 }),
  );
  imp.name = 'chimney-impostor';
  return { full, impostor: imp, bounds: merged.boundingBox!.clone() };
}

// ---------------------------------------------------------------- impostors

/**
 * Generic stand-in for loaded models: a low-opacity bounding-box silhouette.
 * Still fogged and lit, so it fades into the murk like the real mesh would.
 */
export function makeBoxSilhouette(bounds: THREE.Box3, color: number, opacity: number): THREE.Mesh {
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(size.x, 1e-3), Math.max(size.y, 1e-3), Math.max(size.z, 1e-3)),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    }),
  );
  mesh.position.copy(centre);
  mesh.name = 'box-silhouette';
  return mesh;
}
