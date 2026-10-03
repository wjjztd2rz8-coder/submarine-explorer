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

const SAND = new THREE.Color(0xb4a688);
const SLATE = new THREE.Color(0x4a5560);

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
  const tmp = new THREE.Color();
  for (let v = 0; v < n * n; v++) {
    tmp.copy(SLATE).lerp(SAND, (pos[v * 3 + 1]! - lo) / span);
    col[v * 3] = tmp.r;
    col[v * 3 + 1] = tmp.g;
    col[v * 3 + 2] = tmp.b;
  }
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
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  geometry.computeVertexNormals();
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
