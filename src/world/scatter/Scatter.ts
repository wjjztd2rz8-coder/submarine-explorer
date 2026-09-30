/**
 * Streams instanced seabed scatter (boulders, dropstones, pillow lava, coral
 * rubble, sponges, sea pens, whip corals, sediment mounds) around the camera.
 *
 * The bed is divided into square cells. Cells inside `rangeM` of the camera are
 * generated on demand (`ScatterPlacement.placeCell`, deterministic per cell) at
 * a small per-frame budget, cached, and dropped when the camera has moved on.
 * The instances of all resident cells are gathered into ONE `InstancedMesh` per
 * kind, so the layer costs at most one draw call per kind that the biome uses
 * (four to six), regardless of how many cells are live. The gather re-runs when
 * a cell finishes or the camera has moved half a cell.
 *
 * Tiers: `scatterDensity` scales every kind's density and `scatterRangeM` the
 * streaming radius; a density of 0 builds nothing at all.
 */

import * as THREE from 'three';
import type { Biome, ScatterKind } from '../TerrainBiome.js';
import {
  placeCell,
  type CellOptions,
  type CellResult,
  type ScatterGround,
} from './ScatterPlacement.js';
import { SCATTER_TYPES, type ScatterMaterialKind } from './ScatterTypes.js';

export interface ScatterOptions {
  ground: ScatterGround;
  biome: Biome;
  /** Tier multiplier on density; 0 disables the layer. */
  density: number;
  /** Stream radius around the camera, metres. */
  rangeM: number;
  /** Deterministic per-tile seed. */
  seed: number;
  rockLo: number;
  rockHi: number;
  exclude?: (x: number, z: number) => boolean;
  /** The site's hard-substrate albedo, for rock-like kinds (resolves once loaded). */
  rockTexture?: Promise<THREE.Texture | null>;
}

const CELL_M = 64;
/** Cells generated per update() call (each is ~100-400 height/normal queries). */
const CELLS_PER_FRAME = 2;
/** Hard cap on instances per kind (memory and vertex cost). */
const CAP_PER_KIND = 4096;

export interface ScatterStats {
  cells: number;
  instances: number;
  drawCalls: number;
}

export class Scatter {
  readonly group = new THREE.Group();
  readonly stats: ScatterStats = { cells: 0, instances: 0, drawCalls: 0 };

  private readonly opts: ScatterOptions;
  private readonly cellOpts: CellOptions;
  private readonly cells = new Map<string, CellResult>();
  private readonly meshes = new Map<ScatterKind, THREE.InstancedMesh>();
  private readonly geometries = new Map<ScatterKind, THREE.BufferGeometry>();
  private readonly materials = new Map<ScatterMaterialKind, THREE.MeshStandardMaterial>();
  private lastX = Number.NaN;
  private lastZ = Number.NaN;
  private dirty = true;
  private disposed = false;

  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly qYaw = new THREE.Quaternion();
  private readonly axis = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private readonly scl = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly color = new THREE.Color();

  constructor(opts: ScatterOptions) {
    this.opts = opts;
    this.group.name = 'scatter';
    this.cellOpts = {
      cellSizeM: CELL_M,
      density: opts.density,
      rockLo: opts.rockLo,
      rockHi: opts.rockHi,
      seed: opts.seed,
      exclude: opts.exclude,
    };
    if (opts.density > 0 && typeof document !== 'undefined') {
      this.materials.set(
        'rock',
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.88,
          metalness: 0,
          vertexColors: true,
        }),
      );
      this.materials.set(
        'soft',
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.85,
          metalness: 0,
          vertexColors: true,
          side: THREE.DoubleSide,
        }),
      );
      void opts.rockTexture?.then((tex) => {
        const mat = this.materials.get('rock');
        if (!tex || !mat || this.disposed) return;
        // Rock uvs are metre-scale box projections; the map is a luminance
        // pattern (mean 0.5), so brighten it back to neutral.
        mat.map = tex;
        mat.color.setScalar(4.2);
        mat.needsUpdate = true;
      });
    }
  }

  get enabled(): boolean {
    return this.opts.density > 0 && this.materials.size > 0;
  }

  /** Call once per frame with the camera. Cheap when nothing changed. */
  update(camera: THREE.Camera): void {
    if (!this.enabled || this.disposed) return;
    const cx = camera.position.x;
    const cz = camera.position.z;
    const R = this.opts.rangeM;
    const c0 = Math.floor((cx - R) / CELL_M);
    const c1 = Math.floor((cx + R) / CELL_M);
    const r0 = Math.floor((cz - R) / CELL_M);
    const r1 = Math.floor((cz + R) / CELL_M);

    // Generate the nearest missing cells first, within the frame budget.
    let budget = CELLS_PER_FRAME;
    const missing: Array<[number, number, number]> = [];
    for (let j = r0; j <= r1; j++) {
      for (let i = c0; i <= c1; i++) {
        const mx = (i + 0.5) * CELL_M - cx;
        const mz = (j + 0.5) * CELL_M - cz;
        const d = Math.hypot(mx, mz) - CELL_M * 0.7;
        if (d > R) continue;
        if (!this.cells.has(`${i},${j}`)) missing.push([i, j, d]);
      }
    }
    if (missing.length) {
      missing.sort((a, b) => a[2] - b[2]);
      for (const [i, j] of missing) {
        if (budget-- <= 0) break;
        this.cells.set(
          `${i},${j}`,
          placeCell(i, j, this.opts.ground, this.opts.biome, this.cellOpts),
        );
        this.dirty = true;
      }
    }
    // Drop cells that have fallen well outside the stream radius.
    for (const key of this.cells.keys()) {
      const [i, j] = key.split(',').map(Number) as [number, number];
      const d = Math.hypot((i + 0.5) * CELL_M - cx, (j + 0.5) * CELL_M - cz);
      if (d > R + CELL_M * 2.2) {
        this.cells.delete(key);
        this.dirty = true;
      }
    }

    const moved = Math.hypot(cx - this.lastX, cz - this.lastZ);
    if (this.dirty || !(moved < CELL_M * 0.5)) this.rebuild(cx, cz);
  }

  /** Gather resident cells into the per-kind instanced meshes. */
  private rebuild(cx: number, cz: number): void {
    this.dirty = false;
    this.lastX = cx;
    this.lastZ = cz;
    const R = this.opts.rangeM;
    const perKind = new Map<ScatterKind, number>();
    let total = 0;
    for (const spec of this.opts.biome.scatter) perKind.set(spec.kind, 0);

    for (const kind of perKind.keys()) {
      const def = SCATTER_TYPES[kind];
      const range = Math.min(R, def.drawRangeM);
      const r2 = range * range;
      const mesh = this.meshFor(kind);
      let n = 0;
      for (const cell of this.cells.values()) {
        const list = cell[kind];
        if (!list) continue;
        for (const inst of list) {
          const dx = inst.x - cx;
          const dz = inst.z - cz;
          if (dx * dx + dz * dz > r2) continue;
          if (n >= CAP_PER_KIND) break;
          this.axis.set(inst.tiltX, 0, inst.tiltZ);
          if (inst.tilt > 1e-6) this.q.setFromAxisAngle(this.axis, inst.tilt);
          else this.q.identity();
          this.qYaw.setFromAxisAngle(this.up, inst.yaw);
          this.q.multiply(this.qYaw);
          this.pos.set(inst.x, inst.y, inst.z);
          this.scl.set(inst.sx, inst.sy, inst.sz);
          this.m4.compose(this.pos, this.q, this.scl);
          mesh.setMatrixAt(n, this.m4);
          this.color.setRGB(inst.r, inst.g, inst.b);
          mesh.setColorAt(n, this.color);
          n++;
        }
      }
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      total += n;
    }
    this.stats.cells = this.cells.size;
    this.stats.instances = total;
    let draws = 0;
    for (const m of this.meshes.values()) if (m.visible) draws++;
    this.stats.drawCalls = draws;
  }

  private meshFor(kind: ScatterKind): THREE.InstancedMesh {
    let mesh = this.meshes.get(kind);
    if (mesh) return mesh;
    const def = SCATTER_TYPES[kind];
    const geo = def.geometry();
    this.geometries.set(kind, geo);
    mesh = new THREE.InstancedMesh(geo, this.materials.get(def.material), CAP_PER_KIND);
    mesh.name = `scatter:${kind}`;
    mesh.count = 0;
    mesh.frustumCulled = false; // instances span the whole stream radius
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Allocate the colour buffer up front so the first rebuild does not resize.
    mesh.setColorAt(0, this.color.setRGB(1, 1, 1));
    this.group.add(mesh);
    this.meshes.set(kind, mesh);
    return mesh;
  }

  dispose(): void {
    this.disposed = true;
    for (const m of this.meshes.values()) m.dispose();
    for (const g of this.geometries.values()) g.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.meshes.clear();
    this.geometries.clear();
    this.materials.clear();
    this.cells.clear();
    this.group.clear();
  }
}
