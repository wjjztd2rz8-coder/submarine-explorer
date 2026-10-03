/**
 * Title-scene terrain: a fixed 2.4 km Monterey Canyon crop from the checked-in
 * GMRT tile, rebased so the anchor seabed is y = 0.
 *
 * Conventions follow src/util/geo.ts: +X east, +Z south, +Y up, row 0 = north.
 * Real metres both ways: no vertical exaggeration, no smoothing, no procedural
 * detail. Independent of the saved/active site and of any scene or storage.
 */

import * as THREE from 'three';
import { latLonToWorld } from '../../util/geo.js';
import type { Tile } from '../../util/types.js';
import { TileLoader } from '../../world/TileLoader.js';

export interface TitleCrop {
  mesh: THREE.Mesh;
  anchorFloorY: number;
  sampleFloor(x: number, z: number): number;
  halfSize: number;
  dispose(): void;
}

/** Upper-channel POI in public/data/landmarks/monterey-canyon/pois.json. */
export const TITLE_ANCHOR = { lat: 36.7985, lon: -121.8502 };

const HALF_SIZE = 1200;
const CELLS = 160; // 161x161 verts, ~51k tris
const TILE_ID = 'monterey-canyon';

// F-TITLE-LOOK palette: colour only, heights stay real. Deep channel water is
// teal-navy, higher canyon wall is a lighter slate-teal, and gentle ground near
// the anchor (where the lamps work) is warm sediment.
const DEEP = new THREE.Color(0x0b2f40);
const WALL = new THREE.Color(0x347b92);
const ROCK = new THREE.Color(0x1f4252);
const SEDIMENT = new THREE.Color(0x9c8f78);
/** Metres around the anchor over which warm sediment fades into the cool wall. */
const SEDIMENT_RADIUS = 70;

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Deterministic 0..1 hash noise for colour mottling only (never heights). */
function hash2(i: number, j: number): number {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Bilinear height (tile metres) at tile-local world x/z; clamps to the tile edge. */
function tileSampler(tile: Tile): (x: number, z: number) => number {
  const { cols, rows, cellsize_m_x: dx, cellsize_m_y: dz } = tile.meta;
  const halfW = ((cols - 1) * dx) / 2;
  const halfD = ((rows - 1) * dz) / 2;
  const h = tile.heights;
  const at = (c: number, r: number): number =>
    h[
      (r < 0 ? 0 : r > rows - 1 ? rows - 1 : r) * cols + (c < 0 ? 0 : c > cols - 1 ? cols - 1 : c)
    ]!;
  return (x, z) => {
    const fx = Math.min(Math.max((x + halfW) / dx, 0), cols - 1);
    const fz = Math.min(Math.max((z + halfD) / dz, 0), rows - 1);
    const c0 = Math.floor(fx);
    const r0 = Math.floor(fz);
    const tx = fx - c0;
    const tz = fz - r0;
    const top = at(c0, r0) + (at(c0 + 1, r0) - at(c0, r0)) * tx;
    const bot = at(c0, r0 + 1) + (at(c0 + 1, r0 + 1) - at(c0, r0 + 1)) * tx;
    return top + (bot - top) * tz;
  };
}

export function buildTitleCrop(tile: Tile): TitleCrop {
  // Tile centre is the geo.ts origin, so grid-centred coordinates match latLonToWorld.
  const sample = tileSampler(tile);
  const anchor = latLonToWorld(tile.meta, TITLE_ANCHOR.lat, TITLE_ANCHOR.lon);
  const anchorH = sample(anchor.x, anchor.z);

  const sampleFloor = (x: number, z: number): number => {
    const cx = Math.min(Math.max(x, -HALF_SIZE), HALF_SIZE);
    const cz = Math.min(Math.max(z, -HALF_SIZE), HALF_SIZE);
    return sample(anchor.x + cx, anchor.z + cz) - anchorH;
  };

  const n = CELLS + 1;
  const step = (2 * HALF_SIZE) / CELLS;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -HALF_SIZE + i * step;
      const z = -HALF_SIZE + j * step; // j = 0 is the north edge
      const y = sampleFloor(x, z);
      const k = (j * n + i) * 3;
      pos[k] = x;
      pos[k + 1] = y;
      pos[k + 2] = z;
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  const span = Math.max(hi - lo, 1);
  const idx = new Uint32Array(CELLS * CELLS * 6);
  let q = 0;
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) {
      const a = j * n + i;
      const b = a + n; // south
      const c = b + 1;
      const d = a + 1; // east
      idx.set([a, b, d, b, c, d], q);
      q += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal');
  const tmp = new THREE.Color();
  const cool = new THREE.Color();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const v = j * n + i;
      const rel = (pos[v * 3 + 1]! - lo) / span;
      const steep = 1 - smooth(0.93, 0.996, normal.getY(v)); // 0 flat .. 1 steep
      cool.copy(DEEP).lerp(WALL, smooth(0.05, 0.85, rel));
      tmp.copy(cool).lerp(ROCK, steep * 0.75);
      const dist = Math.hypot(pos[v * 3]!, pos[v * 3 + 2]!);
      const warm = (1 - smooth(40, SEDIMENT_RADIUS, dist)) * (1 - steep) * 0.6;
      tmp.lerp(SEDIMENT, warm);
      // Slow patchiness so flat ground never reads as one wash.
      const m = 0.88 + 0.24 * (0.6 * hash2(i >> 1, j >> 1) + 0.4 * hash2(i, j));
      col[v * 3] = tmp.r * m;
      col[v * 3 + 1] = tmp.g * m;
      col[v * 3 + 2] = tmp.b * m;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'title-terrain';

  return {
    mesh,
    anchorFloorY: 0,
    sampleFloor,
    halfSize: HALF_SIZE,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}

export async function loadTitleCrop(
  load: () => Promise<Tile> = () => new TileLoader().load(TILE_ID),
): Promise<TitleCrop> {
  return buildTitleCrop(await load());
}
