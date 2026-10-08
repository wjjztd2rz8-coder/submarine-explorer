/**
 * Builds a chunked seafloor mesh from a tile heightmap, and answers height /
 * normal queries in world metres.
 *
 * Geometry layout
 * ---------------
 * The grid is split into chunks of `chunkCells` x `chunkCells` SOURCE cells.
 * Each chunk is sampled at `detailSubdiv` vertices per cell edge, owns its own
 * BufferGeometry + Mesh (so Three can frustum-cull it) and carries three index
 * buffers for distance LOD. Adjacent chunks SHARE their boundary row/column of
 * samples, and every chunk evaluates the height function itself one step outside
 * its own edge when computing normals, so seams are watertight and shade
 * identically. See `TerrainChunk.ts` for the per-chunk detail.
 *
 * The rendered surface is *measured data plus a procedural detail term*
 * (`TerrainNoise.ts`). `sampleHeight` returns exactly the same sum, so physics
 * collides with what the player sees. Set `terrain.detailStrength` to 0 for the
 * pure-survey mesh.
 *
 * Coordinates: +X east, +Z south, +Y up, origin at the tile centre
 * (see src/util/geo.ts). Heightmap row 0 is the NORTH edge, so grid row index
 * increases with +Z and grid column index increases with +X -- no flips needed.
 */

import { terrainCarveFor, type TerrainCarve } from './terrainFeatures.js';
import * as THREE from 'three';
import type { GraphicsTier, TerrainConfig } from '../core/Config.js';
import type { Tile, TileMeta } from '../util/types.js';
import { LOD_LEVELS, TerrainChunk } from './TerrainChunk.js';
import { biomeFor, type Biome } from './TerrainBiome.js';
import { createTerrainMaterial } from './TerrainMaterial.js';
import { Scatter } from './scatter/Scatter.js';
import { detailAt, type DetailParams } from './TerrainNoise.js';
import { monotoneCubic, valueNoise2 } from './TerrainNoise.js';
import { latLonToWorld } from '../util/geo.js';
import type { TerrainFidelity } from '../core/config/terrain.js';

export interface TerrainStats {
  chunks: number;
  /** Total vertices resident on the GPU, skirts included. */
  vertices: number;
  /** Triangles at LOD 0, i.e. the worst case. */
  triangles: number;
  /** Chunks inside the camera frustum on the last `update()` -- i.e. draw calls. */
  visibleChunks: number;
  /** Triangles actually submitted on the last `update()`. */
  drawnTriangles: number;
  /** How many visible chunks sit at each LOD level. */
  lodCounts: number[];
  /** Vertex subdivisions per source cell edge actually used. */
  subdiv: number;
  /** What the tier asked for; larger than `subdiv` when the vertex budget capped it. */
  requestedSubdiv: number;
  tier: GraphicsTier;
  textureSize: number;
  /** Number of chunks built at each subdivision (local fidelity profiles only). */
  subdivisionCounts?: Record<number, number>;
}

/**
 * The largest subdivision <= `requested` whose surface vertex estimate
 * `cols * rows * subdiv^2` fits in `maxVertices`, never below 1. Big tiles
 * (blake-plateau-corals 1202x1201, endurance 1202 wide) would otherwise hold
 * 6-13M vertices at medium/high; see docs/terrain.md.
 */
export function fitSubdivToBudget(
  cols: number,
  rows: number,
  requested: number,
  maxVertices: number,
): number {
  let sub = Math.max(1, Math.round(requested));
  if (!(maxVertices > 0)) return sub;
  while (sub > 1 && cols * rows * sub * sub > maxVertices) sub--;
  return sub;
}

/** FNV-1a, so each tile gets its own scatter layout. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

interface RampStop {
  depth: number;
  r: number;
  g: number;
  b: number;
}

export class Terrain {
  /** Add this to the scene. */
  readonly group = new THREE.Group();
  readonly meta: TileMeta;
  readonly heights: Float32Array;
  readonly stats: TerrainStats;
  /** The site's seabed palette and scatter table (TerrainBiome.ts). */
  readonly biome: Biome;
  /** Seabed maps are bound and temporary textures released; boot stays nonblocking. */
  readonly texturesReady: Promise<void>;

  /** Tile extent in metres. */
  readonly widthM: number;
  readonly depthM: number;

  /** A site feature the grid cannot resolve (the Blue Hole), applied over the survey. */
  private readonly carve: TerrainCarve | null;
  private readonly cols: number;
  private readonly rows: number;
  private readonly dx: number; // metres per column
  private readonly dz: number; // metres per row
  private readonly halfW: number;
  private readonly halfD: number;
  private readonly exaggeration: number;
  private readonly ramp: RampStop[];
  private readonly chunks: TerrainChunk[] = [];
  private readonly detail: DetailParams;
  private readonly fidelity: TerrainFidelity | null;
  private readonly focus: { x: number; z: number } | null;
  private readonly normalSubdiv: number;
  private baseSubdiv = 1;
  private readonly patchSubdivs = new Map<string, number>();
  private meshChunkCells = 64;
  private readonly lodNear: number;
  private readonly lodFar: number;
  private readonly textures: THREE.Texture[];
  private readonly material: THREE.Material;
  /** Instanced boulders, corals and mounds streamed around the camera. */
  readonly scatter: Scatter;

  private readonly frustum = new THREE.Frustum();
  private readonly projScreen = new THREE.Matrix4();
  private readonly sphere = new THREE.Sphere();

  constructor(tile: Tile, config: TerrainConfig, tier: GraphicsTier = 'medium') {
    this.meta = tile.meta;
    this.heights = tile.heights;
    this.carve = terrainCarveFor(tile.meta);
    this.cols = tile.meta.cols;
    this.rows = tile.meta.rows;
    this.dx = tile.meta.cellsize_m_x;
    this.dz = tile.meta.cellsize_m_y;
    this.widthM = (this.cols - 1) * this.dx;
    this.depthM = (this.rows - 1) * this.dz;
    this.halfW = this.widthM / 2;
    this.halfD = this.depthM / 2;
    this.exaggeration = config.verticalExaggeration;
    this.ramp = config.colorRamp
      .map((s) => {
        const c = new THREE.Color(s.color);
        return { depth: s.depth, r: c.r, g: c.g, b: c.b };
      })
      .sort((a, b) => a.depth - b.depth);

    const tierCfg = config.tiers[tier];
    this.fidelity = tier === 'low' ? null : (config.fidelity?.[tile.meta.id] ?? null);
    this.focus = this.fidelity
      ? latLonToWorld(tile.meta, this.fidelity.focus.lat, this.fidelity.focus.lon)
      : null;
    this.normalSubdiv = this.fidelity?.nearSubdiv[tier] ?? tierCfg.detailSubdiv;
    const cellM = Math.min(this.dx, this.dz);
    this.detail = {
      strength: config.detailStrength,
      invWavelengthM: 1 / Math.max(1e-6, config.detailWavelengthCells * cellM),
      octaves: tierCfg.detailOctaves,
      amplitudeM: config.detailAmplitudeCells * cellM,
      sedimentFactor: config.detailSedimentFactor,
      slopeLoDeg: config.detailSlopeLoDeg,
      slopeHiDeg: config.detailSlopeHiDeg,
      seed: config.detailSeed,
    };
    this.lodNear = config.lodDistancesM[0] * tierCfg.lodDistanceScale;
    this.lodFar = config.lodDistancesM[1] * tierCfg.lodDistanceScale;

    this.biome = biomeFor(tile.meta.id);
    const built = createTerrainMaterial({
      config,
      tier,
      biome: this.biome,
      exaggeration: this.exaggeration,
      rockDetailStrength: this.fidelity?.normalStrength,
    });
    this.material = built.material;
    this.textures = built.textures;
    this.texturesReady = built.texturesReady;

    this.group.name = `terrain:${tile.meta.id}`;
    const requested = Math.max(1, Math.round(tierCfg.detailSubdiv));
    const fitted = fitSubdivToBudget(this.cols, this.rows, requested, config.maxVertices);
    // Local indices must land on integer nodes and align with the coarse lattice.
    const subdiv = this.fidelity ? 2 ** Math.floor(Math.log2(fitted)) : fitted;
    this.baseSubdiv = subdiv;
    this.stats = this.build(config, tier, subdiv, built.textureSize);
    this.stats.requestedSubdiv = requested;

    if (this.biome.vertexTint) {
      // Only Lost City opts in. Reuse every LOD's existing vertices and draw calls.
      built.material.vertexColors = true;
      (built.material.userData.uniforms.uStrata.value as THREE.Vector2).y = 0;
      for (const chunk of this.chunks) {
        const position = chunk.geometry.getAttribute('position');
        const normal = chunk.geometry.getAttribute('normal');
        const colors = new Float32Array(position.count * 3);
        for (let i = 0; i < position.count; i++) {
          const tint = this.biome.vertexTint(
            position.getX(i),
            position.getY(i) / this.exaggeration,
            position.getZ(i),
            normal.getY(i),
          );
          colors.set(tint, i * 3);
        }
        chunk.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
    }

    const normal = new THREE.Vector3();
    this.scatter = new Scatter({
      ground: {
        sampleHeight: (x, z) => this.sampleHeight(x, z),
        normalAt: (x, z, out) => {
          this.getNormal(x, z, normal);
          out[0] = normal.x;
          out[1] = normal.y;
          out[2] = normal.z;
        },
        contains: (x, z) => this.contains(x, z),
      },
      biome: this.biome,
      density: tierCfg.scatterDensity,
      rangeM: tierCfg.scatterRangeM,
      seed: config.detailSeed ^ hashString(tile.meta.id),
      rockLo: 1 - Math.cos((config.rockSlopeLoDeg * Math.PI) / 180),
      rockHi: 1 - Math.cos((config.rockSlopeHiDeg * Math.PI) / 180),
      rockTexture: built.rockTexture,
    });
    this.group.add(this.scatter.group);
  }

  // ---------------------------------------------------------------- sampling

  /** Raw grid sample, clamped to the grid edge. Metres, negative below sea level. */
  heightAtCell(col: number, row: number): number {
    const c = col < 0 ? 0 : col > this.cols - 1 ? this.cols - 1 : col;
    const r = row < 0 ? 0 : row > this.rows - 1 ? this.rows - 1 : row;
    return this.heights[r * this.cols + c] as number;
  }

  /** World X (east metres) of a grid column. */
  worldXOfCol(col: number): number {
    return col * this.dx - this.halfW;
  }

  /** World Z (south metres) of a grid row. Row 0 is the NORTH edge -> most negative Z. */
  worldZOfRow(row: number): number {
    return row * this.dz - this.halfD;
  }

  /**
   * Bilinearly interpolated *measured* elevation, exaggeration applied, with no
   * procedural detail. This is the honest survey surface.
   */
  sampleDataHeight(x: number, z: number): number {
    const fx = (x + this.halfW) / this.dx;
    const fz = (z + this.halfD) / this.dz;
    const c0 = Math.floor(fx);
    const r0 = Math.floor(fz);
    const tx = fx - c0;
    const tz = fz - r0;

    const h00 = this.heightAtCell(c0, r0);
    const h10 = this.heightAtCell(c0 + 1, r0);
    const h01 = this.heightAtCell(c0, r0 + 1);
    const h11 = this.heightAtCell(c0 + 1, r0 + 1);

    const top = h00 + (h10 - h00) * tx;
    const bottom = h01 + (h11 - h01) * tx;
    const measured = (top + (bottom - top) * tz) * this.exaggeration;
    return this.carve ? this.carve.apply(x, z, measured) : measured;
  }

  /**
   * Slope of the measured surface in degrees. Deliberately computed from the
   * data only: the detail amplitude depends on it, and feeding detail back into
   * its own amplitude would make the field non-deterministic across chunks.
   */
  dataSlopeDeg(x: number, z: number): number {
    const gx =
      (this.sampleDataHeight(x + this.dx, z) - this.sampleDataHeight(x - this.dx, z)) /
      (2 * this.dx);
    const gz =
      (this.sampleDataHeight(x, z + this.dz) - this.sampleDataHeight(x, z - this.dz)) /
      (2 * this.dz);
    return (Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI;
  }

  /** The procedural detail displacement alone, in metres. 0 in pure-data mode. */
  detailHeight(x: number, z: number): number {
    if (this.detail.strength <= 0) return 0;
    const slope = this.dataSlopeDeg(x, z);
    const broad = detailAt(x, z, slope, this.detail);
    if (!this.fidelity || !this.focus) return broad;
    const f = this.fidelity;
    const distance = Math.hypot(x - this.focus.x, z - this.focus.z);
    const fade =
      1 - THREE.MathUtils.smoothstep(distance, f.focus.radiusM, f.focus.radiusM + f.focus.fadeM);
    const rock = THREE.MathUtils.smoothstep(slope, 8, 28);
    // Rounded erosion rills and resistant beds: resolved relief, not independent shader displacement.
    const u = x / f.reliefWavelengthM;
    const v = z / f.reliefWavelengthM;
    const rill = 1 - Math.abs(2 * valueNoise2(u, v * 0.35, this.detail.seed ^ 0x51) - 1);
    const bed = Math.sin(
      (u * 0.35 + v + valueNoise2(u * 0.3, v * 0.3, this.detail.seed)) * Math.PI * 2,
    );
    return (
      broad + (bed * 0.35 - rill * rill * 0.65) * f.reliefM * rock * fade * this.detail.strength
    );
  }

  /**
   * The rendered seabed elevation at a world position, in metres (negative below
   * sea level): measured data, times the vertical exaggeration, plus the
   * procedural detail term. Identical to the mesh's vertex Y at every vertex,
   * so collision matches what the player sees. Positions outside the tile clamp
   * to the edge.
   */
  sampleHeight(x: number, z: number): number {
    if (this.detail.strength <= 0) return this.sampleDataHeight(x, z);
    if (!this.fidelity || !this.contains(x, z) || this.patchSubdivs.size === 0)
      return this.surfaceHeight(x, z);
    // Seats, POIs and physics use the triangles actually drawn at near LOD, including fine relief.
    const c = Math.min(this.cols - 2, Math.floor((x + this.halfW) / this.dx));
    const r = Math.min(this.rows - 2, Math.floor((z + this.halfD) / this.dz));
    const c0 = Math.floor(c / this.meshChunkCells) * this.meshChunkCells;
    const r0 = Math.floor(r / this.meshChunkCells) * this.meshChunkCells;
    const s = this.patchSubdivs.get(`${c0}|${r0}`) ?? 1;
    const fx = (x - this.worldXOfCol(c0)) / (this.dx / s);
    const fz = (z - this.worldZOfRow(r0)) / (this.dz / s);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const x0 = this.worldXOfCol(c0) + (i * this.dx) / s;
    const z0 = this.worldZOfRow(r0) + (j * this.dz) / s;
    const b = this.surfaceHeight(x0 + this.dx / s, z0);
    const d = this.surfaceHeight(x0, z0 + this.dz / s);
    if (tx + tz <= 1) {
      const a = this.surfaceHeight(x0, z0);
      return a + (b - a) * tx + (d - a) * tz;
    }
    const e = this.surfaceHeight(x0 + this.dx / s, z0 + this.dz / s);
    return e + (d - e) * (1 - tx) + (b - e) * (1 - tz);
  }

  /** Continuous reconstruction used by the vertex sampler and derivative normals. */
  private surfaceHeight(x: number, z: number): number {
    let base = this.sampleDataHeight(x, z);
    if (this.fidelity && this.detail.strength > 0) {
      const fx = THREE.MathUtils.clamp((x + this.halfW) / this.dx, 0, this.cols - 1);
      const fz = THREE.MathUtils.clamp((z + this.halfD) / this.dz, 0, this.rows - 1);
      const c = Math.floor(fx);
      const r = Math.floor(fz);
      base =
        monotoneCubic(
          this.cubicRow(c, r - 1, fx - c),
          this.cubicRow(c, r, fx - c),
          this.cubicRow(c, r + 1, fx - c),
          this.cubicRow(c, r + 2, fx - c),
          fz - r,
        ) * this.exaggeration;
    }
    return base + this.detailHeight(x, z);
  }

  private cubicRow(c: number, r: number, t: number): number {
    return monotoneCubic(
      this.heightAtCell(c - 1, r),
      this.heightAtCell(c, r),
      this.heightAtCell(c + 1, r),
      this.heightAtCell(c + 2, r),
      t,
    );
  }

  private normalStepScale(x: number, z: number): number {
    if (!this.fidelity || !this.focus) return 1;
    const f = this.fidelity.focus;
    const fade = THREE.MathUtils.smoothstep(
      Math.hypot(x - this.focus.x, z - this.focus.z),
      f.radiusM,
      f.radiusM + f.fadeM,
    );
    return this.baseSubdiv / THREE.MathUtils.lerp(this.normalSubdiv, this.baseSubdiv, fade);
  }

  /**
   * Upward surface normal at a world position, from central differences on the
   * sampled height field (detail included). Always a unit vector with positive Y.
   */
  getNormal(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const scale = this.normalStepScale(x, z);
    const ex = this.fidelity ? (this.dx / this.baseSubdiv) * scale : this.dx;
    const ez = this.fidelity ? (this.dz / this.baseSubdiv) * scale : this.dz;
    const hL = this.surfaceHeight(x - ex, z);
    const hR = this.surfaceHeight(x + ex, z);
    const hN = this.surfaceHeight(x, z - ez);
    const hS = this.surfaceHeight(x, z + ez);
    // Tangents: (2ex, hR-hL, 0) along +X and (0, hS-hN, 2ez) along +Z.
    // Their cross product, normalised and oriented upward.
    return out.set(-(hR - hL) * 2 * ez, 4 * ex * ez, -(hS - hN) * 2 * ex).normalize();
  }

  /** True if a world XZ position lies inside the tile footprint. */
  contains(x: number, z: number): boolean {
    return Math.abs(x) <= this.halfW && Math.abs(z) <= this.halfD;
  }

  /** Colour for a depth, from the configured ramp (linear RGB interpolation). */
  colorForDepth(depth: number, out = new THREE.Color()): THREE.Color {
    const ramp = this.ramp;
    const first = ramp[0] as RampStop;
    const last = ramp[ramp.length - 1] as RampStop;
    if (depth <= first.depth) return out.setRGB(first.r, first.g, first.b);
    if (depth >= last.depth) return out.setRGB(last.r, last.g, last.b);
    for (let i = 1; i < ramp.length; i++) {
      const b = ramp[i] as RampStop;
      if (depth <= b.depth) {
        const a = ramp[i - 1] as RampStop;
        const t = (depth - a.depth) / (b.depth - a.depth || 1);
        return out.setRGB(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
      }
    }
    return out.setRGB(last.r, last.g, last.b);
  }

  // --------------------------------------------------------------------- LOD

  /**
   * Pick a LOD level per chunk from its distance to the camera, and refresh the
   * visibility statistics. Call once per rendered frame, before `render`.
   *
   * Three does its own frustum culling at draw time using each chunk's bounding
   * sphere; we repeat the test here purely to *report* how many chunks are
   * actually submitted, which is the number that matters for the draw-call
   * budget and is otherwise invisible.
   */
  update(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    const eye = camera.position;

    let visible = 0;
    let drawn = 0;
    const counts = [0, 0, 0];
    for (const chunk of this.chunks) {
      // Large spherical bounds overstate proximity to distant survey patches. The fidelity
      // profile spends near detail by distance to the actual footprint/height extent instead.
      const d = this.fidelity
        ? chunk.bounds.distanceToPoint(eye)
        : eye.distanceTo(chunk.center) - chunk.radius;
      const level = d < this.lodNear ? 0 : d < this.lodFar ? 1 : 2;
      chunk.setLod(level);
      this.sphere.center.copy(chunk.center);
      this.sphere.radius = chunk.radius;
      if (this.frustum.intersectsSphere(this.sphere)) {
        visible++;
        drawn += chunk.activeTriangles;
        counts[chunk.currentLod] = (counts[chunk.currentLod] as number) + 1;
      }
    }
    this.scatter.update(camera);
    this.stats.visibleChunks = visible;
    this.stats.drawnTriangles = drawn;
    this.stats.lodCounts = counts;
  }

  /** One-line summary for the debug overlay / console. */
  debugString(): string {
    const s = this.stats;
    return (
      `terrain ${this.meta.id} [${s.tier}] ` +
      `${s.chunks} chunks / ${(s.vertices / 1e6).toFixed(2)}M verts (subdiv ${s.subdiv}` +
      (s.requestedSubdiv > s.subdiv ? `, capped from ${s.requestedSubdiv} by vertex budget` : '') +
      `) | ` +
      `drawn ${s.visibleChunks} chunks, ${(s.drawnTriangles / 1e3).toFixed(0)}k tris | ` +
      `lod ${s.lodCounts.join('/')} | tex ${s.textureSize}px` +
      (s.subdivisionCounts
        ? ` | subdivisions ${Object.entries(s.subdivisionCounts)
            .map(([sub, count]) => `${sub}:${count}`)
            .join('/')}`
        : '')
    );
  }

  dispose(): void {
    this.scatter.dispose();
    for (const chunk of this.chunks) chunk.dispose();
    this.chunks.length = 0;
    this.material.dispose();
    for (const t of this.textures) t.dispose();
    this.group.clear();
  }

  // ----------------------------------------------------------------- meshing

  private build(
    config: TerrainConfig,
    tier: GraphicsTier,
    subdiv: number,
    textureSize: number,
  ): TerrainStats {
    const sub = Math.max(1, Math.round(subdiv));
    const chunkCells = Math.max(4, this.fidelity?.chunkCells ?? config.chunkCells);
    this.meshChunkCells = chunkCells;
    const field = { surfaceY: (x: number, z: number): number => this.surfaceHeight(x, z) };

    const patches: Array<{
      c0: number;
      c1: number;
      r0: number;
      r1: number;
      sub: number;
      distance: number;
    }> = [];
    const cost = (p: (typeof patches)[number], s: number): number => {
      const nx = (p.c1 - p.c0) * s + 1;
      const nz = (p.r1 - p.r0) * s + 1;
      return nx * nz + 2 * nx + 2 * nz;
    };
    const addPatch = (c0: number, r0: number, cells: number): void => {
      const c1 = Math.min(c0 + cells, this.cols - 1);
      const r1 = Math.min(r0 + cells, this.rows - 1);
      const x = this.focus?.x ?? 0;
      const z = this.focus?.z ?? 0;
      // Distance to the footprint, not its centre: every chunk touching the detail envelope qualifies.
      const distance = Math.hypot(
        Math.max(this.worldXOfCol(c0) - x, 0, x - this.worldXOfCol(c1)),
        Math.max(this.worldZOfRow(r0) - z, 0, z - this.worldZOfRow(r1)),
      );
      patches.push({ c0, c1, r0, r1, sub, distance });
    };
    // Keep distant survey chunks large. Only split chunks touching the playable envelope;
    // refining the entire 40 km tile would spend hundreds of extra draws on invisible detail.
    const outerCells = this.fidelity ? Math.max(chunkCells, config.chunkCells) : chunkCells;
    for (let r0 = 0; r0 < this.rows - 1; r0 += outerCells) {
      for (let c0 = 0; c0 < this.cols - 1; c0 += outerCells) {
        addPatch(c0, r0, outerCells);
        const parent = patches[patches.length - 1]!;
        if (
          this.fidelity &&
          outerCells > chunkCells &&
          parent.distance <= this.fidelity.focus.radiusM + this.fidelity.focus.fadeM
        ) {
          patches.pop();
          for (let r = r0; r < parent.r1; r += chunkCells) {
            for (let c = c0; c < parent.c1; c += chunkCells) addPatch(c, r, chunkCells);
          }
        }
      }
    }
    if (this.fidelity) {
      // Include skirts and duplicate boundaries in the local budget. Preserve the old allocation
      // for other sites. Closest patches get first claim on the remaining resident vertices.
      let resident = patches.reduce((sum, p) => sum + cost(p, sub), 0);
      for (const p of [...patches].sort((a, b) => a.distance - b.distance)) {
        if (p.distance > this.fidelity.focus.radiusM + this.fidelity.focus.fadeM) continue;
        let wanted = Math.max(sub, this.fidelity.nearSubdiv[tier]);
        while (
          wanted > sub &&
          config.maxVertices > 0 &&
          resident + cost(p, wanted) - cost(p, sub) > config.maxVertices
        )
          wanted = Math.max(sub, wanted / 2);
        resident += cost(p, wanted) - cost(p, sub);
        p.sub = wanted;
      }
    }

    let vertices = 0;
    let triangles = 0;

    const subdivisionCounts: Record<number, number> = {};
    for (const { c0, c1, r0, r1, sub: localSub } of patches) {
      for (let r = r0; r < r1; r += chunkCells) {
        for (let c = c0; c < c1; c += chunkCells) this.patchSubdivs.set(`${c}|${r}`, localSub);
      }
      subdivisionCounts[localSub] = (subdivisionCounts[localSub] ?? 0) + 1;
      const chunk = new TerrainChunk({
        field,
        material: this.material,
        x0: this.worldXOfCol(c0),
        z0: this.worldZOfRow(r0),
        nx: (c1 - c0) * localSub + 1,
        nz: (r1 - r0) * localSub + 1,
        stepX: this.dx / localSub,
        stepZ: this.dz / localSub,
        normalStepX: this.fidelity ? this.dx / sub : undefined,
        normalStepZ: this.fidelity ? this.dz / sub : undefined,
        normalStepScaleAt: this.fidelity ? (x, z) => this.normalStepScale(x, z) : undefined,
        lodStrides:
          this.fidelity && localSub > sub ? [1, localSub / sub, (localSub * 2) / sub] : undefined,
        skirtDepthM: config.skirtDepthM,
        name: `chunk_${c0}_${r0}`,
      });
      this.group.add(chunk.mesh);
      this.chunks.push(chunk);
      vertices += chunk.vertexCount;
      triangles += chunk.lodTriangles[0] as number;
    }

    return {
      chunks: this.chunks.length,
      vertices,
      triangles,
      visibleChunks: this.chunks.length,
      drawnTriangles: triangles,
      lodCounts: new Array(LOD_LEVELS).fill(0),
      subdiv: sub,
      requestedSubdiv: sub,
      tier,
      textureSize,
      ...(this.fidelity ? { subdivisionCounts } : {}),
    };
  }
}
