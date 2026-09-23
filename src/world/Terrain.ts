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

import * as THREE from 'three';
import type { GraphicsTier, TerrainConfig } from '../core/Config.js';
import type { Tile, TileMeta } from '../util/types.js';
import { LOD_LEVELS, TerrainChunk } from './TerrainChunk.js';
import { createTerrainMaterial } from './TerrainMaterial.js';
import { detailAt, type DetailParams } from './TerrainNoise.js';

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

  /** Tile extent in metres. */
  readonly widthM: number;
  readonly depthM: number;

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
  private readonly lodNear: number;
  private readonly lodFar: number;
  private readonly textures: THREE.Texture[];
  private readonly material: THREE.Material;

  private readonly frustum = new THREE.Frustum();
  private readonly projScreen = new THREE.Matrix4();
  private readonly sphere = new THREE.Sphere();

  constructor(tile: Tile, config: TerrainConfig, tier: GraphicsTier = 'medium') {
    this.meta = tile.meta;
    this.heights = tile.heights;
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

    const built = createTerrainMaterial({
      config,
      tier,
      exaggeration: this.exaggeration,
      colorForDepth: (d, out) => this.colorForDepth(d, out),
      rampMinDepth: (this.ramp[0] as RampStop).depth,
      rampMaxDepth: (this.ramp[this.ramp.length - 1] as RampStop).depth,
    });
    this.material = built.material;
    this.textures = built.textures;

    this.group.name = `terrain:${tile.meta.id}`;
    const requested = Math.max(1, Math.round(tierCfg.detailSubdiv));
    const subdiv = fitSubdivToBudget(this.cols, this.rows, requested, config.maxVertices);
    this.stats = this.build(config, tier, subdiv, built.textureSize);
    this.stats.requestedSubdiv = requested;
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
    return (top + (bottom - top) * tz) * this.exaggeration;
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
    return detailAt(x, z, this.dataSlopeDeg(x, z), this.detail);
  }

  /**
   * The rendered seabed elevation at a world position, in metres (negative below
   * sea level): measured data, times the vertical exaggeration, plus the
   * procedural detail term. Identical to the mesh's vertex Y at every vertex,
   * so collision matches what the player sees. Positions outside the tile clamp
   * to the edge.
   */
  sampleHeight(x: number, z: number): number {
    return this.sampleDataHeight(x, z) + this.detailHeight(x, z);
  }

  /**
   * Upward surface normal at a world position, from central differences on the
   * sampled height field (detail included). Always a unit vector with positive Y.
   */
  getNormal(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const ex = this.dx;
    const ez = this.dz;
    const hL = this.sampleHeight(x - ex, z);
    const hR = this.sampleHeight(x + ex, z);
    const hN = this.sampleHeight(x, z - ez);
    const hS = this.sampleHeight(x, z + ez);
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
      const d = eye.distanceTo(chunk.center) - chunk.radius;
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
      `lod ${s.lodCounts.join('/')} | tex ${s.textureSize}px`
    );
  }

  dispose(): void {
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
    const chunkCells = Math.max(4, config.chunkCells);
    const stepX = this.dx / sub;
    const stepZ = this.dz / sub;
    const field = { surfaceY: (x: number, z: number): number => this.sampleHeight(x, z) };

    let vertices = 0;
    let triangles = 0;

    for (let r0 = 0; r0 < this.rows - 1; r0 += chunkCells) {
      const r1 = Math.min(r0 + chunkCells, this.rows - 1);
      for (let c0 = 0; c0 < this.cols - 1; c0 += chunkCells) {
        const c1 = Math.min(c0 + chunkCells, this.cols - 1);
        const chunk = new TerrainChunk({
          field,
          material: this.material,
          x0: this.worldXOfCol(c0),
          z0: this.worldZOfRow(r0),
          nx: (c1 - c0) * sub + 1,
          nz: (r1 - r0) * sub + 1,
          stepX,
          stepZ,
          skirtDepthM: config.skirtDepthM,
          name: `chunk_${c0}_${r0}`,
        });
        this.group.add(chunk.mesh);
        this.chunks.push(chunk);
        vertices += chunk.vertexCount;
        triangles += chunk.lodTriangles[0] as number;
      }
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
    };
  }
}
