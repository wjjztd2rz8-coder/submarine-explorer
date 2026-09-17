/**
 * One chunk of the seabed mesh: a subdivided height-field patch with three
 * index buffers (LOD 0/1/2) sharing a single vertex buffer, plus a skirt.
 *
 * Vertex buffer
 * -------------
 * The chunk is sampled on a regular grid of `nx * nz` vertices at a spacing of
 * `stepX/stepZ` metres, which is `detailSubdiv` times finer than the source
 * bathymetry cells. The extra vertices exist so the procedural detail layer has
 * somewhere to live; without them the detail would only be evaluated at the data
 * grid's own nodes and would change nothing.
 *
 * LOD
 * ---
 * All three levels index the SAME vertices; only the stride changes (1, 2, 4).
 * LOD 1 is therefore roughly the raw survey resolution and LOD 2 is half of it.
 * The last row/column is always included even when the stride does not divide
 * the chunk evenly, so a chunk always covers its full footprint.
 *
 * Skirts
 * ------
 * Neighbouring chunks at different LODs disagree along their shared edge by up
 * to the local detail amplitude. Rather than matching edge resolutions (which
 * would couple chunks to their neighbours' LOD state) each chunk drops a
 * vertical skirt from its perimeter. The skirt is indexed at the chunk's current
 * stride, so its top edge is exactly the surface edge at that LOD and the wall
 * plugs whatever gap the neighbour leaves.
 *
 * Normals are computed from the sampled height grid rather than from the
 * triangles (`computeVertexNormals`). Triangle normals would differ between two
 * chunks meeting at a seam and would also be polluted by the skirt walls;
 * finite differences of the height function are continuous everywhere, so the
 * shading crosses chunk boundaries invisibly.
 */

import * as THREE from 'three';

/** The height field a chunk samples. Implemented by `Terrain`. */
export interface ChunkField {
  /** Final rendered elevation in metres: measured data + exaggeration + detail. */
  surfaceY(x: number, z: number): number;
}

export interface ChunkOptions {
  field: ChunkField;
  material: THREE.Material;
  /** World position of vertex (0, 0). */
  x0: number;
  z0: number;
  /** Vertex counts along +X and +Z (>= 2). */
  nx: number;
  nz: number;
  /** Vertex spacing in metres. */
  stepX: number;
  stepZ: number;
  /** How far the perimeter skirt hangs below the surface, in metres. */
  skirtDepthM: number;
  name: string;
}

/** Index strides for LOD 0, 1, 2. */
const LOD_STRIDES = [1, 2, 4] as const;
export const LOD_LEVELS = LOD_STRIDES.length;

export class TerrainChunk {
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.BufferGeometry;
  /** Vertices in the shared buffer, skirt included. */
  readonly vertexCount: number;
  /** Triangle count of each LOD level. */
  readonly lodTriangles: number[] = [];
  /** Centre and radius of the bounding sphere, in world space. */
  readonly center = new THREE.Vector3();
  readonly radius: number;

  private readonly lodIndex: THREE.BufferAttribute[] = [];
  private lod = 0;

  constructor(opts: ChunkOptions) {
    const { field, nx, nz, x0, z0, stepX, stepZ, skirtDepthM } = opts;

    const surfaceCount = nx * nz;
    // Skirt layout: north row, south row, west column, east column. Corners are
    // duplicated between runs, which costs 4 vertices and keeps indexing trivial.
    const skirtBase = surfaceCount;
    const skirtCount = 2 * nx + 2 * nz;
    const total = surfaceCount + skirtCount;

    const positions = new Float32Array(total * 3);
    const normals = new Float32Array(total * 3);
    const ys = new Float64Array(surfaceCount);

    // --- sample the surface ------------------------------------------------
    for (let j = 0; j < nz; j++) {
      const z = z0 + j * stepZ;
      for (let i = 0; i < nx; i++) {
        const x = x0 + i * stepX;
        const k = j * nx + i;
        const y = field.surfaceY(x, z);
        ys[k] = y;
        positions[k * 3] = x;
        positions[k * 3 + 1] = y;
        positions[k * 3 + 2] = z;
      }
    }

    // --- normals from central differences on the height grid ---------------
    const invX = 1 / (2 * stepX);
    const invZ = 1 / (2 * stepZ);
    for (let j = 0; j < nz; j++) {
      const z = z0 + j * stepZ;
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const x = x0 + i * stepX;
        // Outside the chunk we evaluate the field again rather than clamping, so
        // two chunks sharing an edge produce bit-identical normals there.
        const hL = i > 0 ? (ys[k - 1] as number) : field.surfaceY(x - stepX, z);
        const hR = i < nx - 1 ? (ys[k + 1] as number) : field.surfaceY(x + stepX, z);
        const hN = j > 0 ? (ys[k - nx] as number) : field.surfaceY(x, z - stepZ);
        const hS = j < nz - 1 ? (ys[k + nx] as number) : field.surfaceY(x, z + stepZ);
        const gx = (hR - hL) * invX;
        const gz = (hS - hN) * invZ;
        const inv = 1 / Math.sqrt(gx * gx + gz * gz + 1);
        normals[k * 3] = -gx * inv;
        normals[k * 3 + 1] = inv;
        normals[k * 3 + 2] = -gz * inv;
      }
    }

    // --- skirt vertices ----------------------------------------------------
    const runNorth = skirtBase;
    const runSouth = runNorth + nx;
    const runWest = runSouth + nx;
    const runEast = runWest + nz;

    const copyDown = (dst: number, src: number): void => {
      positions[dst * 3] = positions[src * 3] as number;
      positions[dst * 3 + 1] = (positions[src * 3 + 1] as number) - skirtDepthM;
      positions[dst * 3 + 2] = positions[src * 3 + 2] as number;
      normals[dst * 3] = normals[src * 3] as number;
      normals[dst * 3 + 1] = normals[src * 3 + 1] as number;
      normals[dst * 3 + 2] = normals[src * 3 + 2] as number;
    };
    for (let i = 0; i < nx; i++) {
      copyDown(runNorth + i, i);
      copyDown(runSouth + i, (nz - 1) * nx + i);
    }
    for (let j = 0; j < nz; j++) {
      copyDown(runWest + j, j * nx);
      copyDown(runEast + j, j * nx + nx - 1);
    }

    // --- index buffers, one per LOD ----------------------------------------
    const IndexArray = total > 65535 ? Uint32Array : Uint16Array;
    for (const stride of LOD_STRIDES) {
      const cols = strideList(nx, stride);
      const rows = strideList(nz, stride);
      const quads = (cols.length - 1) * (rows.length - 1);
      const skirtQuads = 2 * (cols.length - 1) + 2 * (rows.length - 1);
      const idx = new IndexArray((quads + skirtQuads) * 6);
      let w = 0;

      for (let rj = 0; rj < rows.length - 1; rj++) {
        const j0 = (rows[rj] as number) * nx;
        const j1 = (rows[rj + 1] as number) * nx;
        for (let ci = 0; ci < cols.length - 1; ci++) {
          const i0 = cols[ci] as number;
          const i1 = cols[ci + 1] as number;
          const a = j0 + i0;
          const b = j0 + i1;
          const d = j1 + i0;
          const e = j1 + i1;
          // CCW seen from above (+Y), matching the pre-LOD mesh.
          idx[w++] = a;
          idx[w++] = d;
          idx[w++] = b;
          idx[w++] = b;
          idx[w++] = d;
          idx[w++] = e;
        }
      }

      // Skirt walls. Winding is chosen so each wall faces outward (the material
      // is FrontSide), which is the direction a crack is ever seen from.
      for (let ci = 0; ci < cols.length - 1; ci++) {
        const i0 = cols[ci] as number;
        const i1 = cols[ci + 1] as number;
        // north edge (row 0), outward normal -Z
        pushQuad(idx, w, i0, i1, runNorth + i0, runNorth + i1, false);
        w += 6;
        // south edge (row nz-1), outward normal +Z
        pushQuad(idx, w, (nz - 1) * nx + i0, (nz - 1) * nx + i1, runSouth + i0, runSouth + i1, true);
        w += 6;
      }
      for (let rj = 0; rj < rows.length - 1; rj++) {
        const j0 = rows[rj] as number;
        const j1 = rows[rj + 1] as number;
        // west edge (col 0), outward normal -X
        pushQuad(idx, w, j0 * nx, j1 * nx, runWest + j0, runWest + j1, true);
        w += 6;
        // east edge (col nx-1), outward normal +X
        pushQuad(idx, w, j0 * nx + nx - 1, j1 * nx + nx - 1, runEast + j0, runEast + j1, false);
        w += 6;
      }

      this.lodIndex.push(new THREE.BufferAttribute(idx, 1));
      this.lodTriangles.push(idx.length / 3);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geom.setIndex(this.lodIndex[0] as THREE.BufferAttribute);
    // Includes the skirt, so the sphere is conservative for frustum culling.
    geom.computeBoundingSphere();

    this.geometry = geom;
    this.vertexCount = total;
    const sphere = geom.boundingSphere as THREE.Sphere;
    this.center.copy(sphere.center);
    this.radius = sphere.radius;

    this.mesh = new THREE.Mesh(geom, opts.material);
    this.mesh.name = opts.name;
    this.mesh.frustumCulled = true;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    this.mesh.updateMatrixWorld(true);
  }

  get currentLod(): number {
    return this.lod;
  }

  /** Swap the index buffer. Returns true if the level actually changed. */
  setLod(level: number): boolean {
    const l = level < 0 ? 0 : level >= this.lodIndex.length ? this.lodIndex.length - 1 : level;
    if (l === this.lod) return false;
    this.lod = l;
    this.geometry.setIndex(this.lodIndex[l] as THREE.BufferAttribute);
    return true;
  }

  /** Triangles actually submitted at the current LOD. */
  get activeTriangles(): number {
    return this.lodTriangles[this.lod] as number;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

/** `[0, s, 2s, ..., n-1]`, with the last node forced in so coverage is exact. */
function strideList(n: number, stride: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n - 1; i += stride) out.push(i);
  out.push(n - 1);
  return out;
}

/**
 * Two triangles for a skirt wall between surface vertices a,b and the skirt
 * vertices sa,sb directly below them. `flip` reverses the winding.
 */
function pushQuad(
  idx: Uint16Array | Uint32Array,
  w: number,
  a: number,
  b: number,
  sa: number,
  sb: number,
  flip: boolean,
): void {
  if (flip) {
    idx[w] = a;
    idx[w + 1] = sa;
    idx[w + 2] = b;
    idx[w + 3] = b;
    idx[w + 4] = sa;
    idx[w + 5] = sb;
  } else {
    idx[w] = a;
    idx[w + 1] = b;
    idx[w + 2] = sa;
    idx[w + 3] = b;
    idx[w + 4] = sb;
    idx[w + 5] = sa;
  }
}
