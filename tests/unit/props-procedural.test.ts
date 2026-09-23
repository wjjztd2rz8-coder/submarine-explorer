import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type HullEnd } from '../../src/core/Config.js';
import {
  buildChimney,
  buildDebris,
  buildHullBlock,
  chimneyPalette,
  hashString,
  layoutDebris,
  makeBoxSilhouette,
  mulberry32,
} from '../../src/world/props/Procedural.js';

const cfg = DEFAULT_CONFIG.props;

function positions(o: THREE.Object3D): number[] {
  const out: number[] = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) out.push(...(m.geometry.getAttribute('position').array as Float32Array));
  });
  return out;
}

describe('seeding', () => {
  it('hashes ids stably and distinctly', () => {
    expect(hashString('bow-hull')).toBe(hashString('bow-hull'));
    expect(hashString('bow-hull')).not.toBe(hashString('stern-hull'));
  });

  it('mulberry32 is deterministic and in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('procedural:hull-block', () => {
  const dims: [number, number, number] = [140, 28, 30];

  it('matches dimensions_m: length along Z, width X, height Y, base at 0', () => {
    const { bounds } = buildHullBlock(dims, 1, cfg);
    const size = bounds.getSize(new THREE.Vector3());
    expect(bounds.min.y).toBeCloseTo(0, 3);
    // Strakes and splayed plating stick out a little; deck structures add
    // height. The prow reaches -L/2; the ragged aft break stops a little short.
    expect(size.x).toBeGreaterThanOrEqual(28);
    expect(size.x).toBeLessThan(28 * 1.1);
    expect(bounds.min.z).toBeCloseTo(-70, 3);
    expect(size.z).toBeGreaterThanOrEqual(140 * 0.97);
    expect(size.z).toBeLessThanOrEqual(140);
    expect(size.y).toBeGreaterThanOrEqual(30);
    expect(size.y).toBeLessThan(30 * 1.45);
  });

  it('is deterministic from the seed', () => {
    const a = positions(buildHullBlock(dims, hashString('x'), cfg).full);
    const b = positions(buildHullBlock(dims, hashString('x'), cfg).full);
    const c = positions(buildHullBlock(dims, hashString('y'), cfg).full);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('is one merged, vertex-coloured MeshStandardMaterial mesh with a box impostor', () => {
    const built = buildHullBlock(dims, 3, cfg);
    const mesh = built.full as THREE.Mesh;
    expect(mesh.isMesh).toBe(true);
    expect(mesh.geometry.getAttribute('color')).toBeDefined();
    expect(mesh.geometry.getAttribute('uv')).toBeDefined();
    const mat = mesh.material as THREE.MeshStandardMaterial;
    expect(mat.isMeshStandardMaterial).toBe(true);
    expect(mat.fog).toBe(true);
    expect(mat.emissive.getHex()).toBe(0);
    const imp = built.impostor as THREE.Mesh;
    expect(imp.geometry.getAttribute('position').count).toBe(24);
  });

  it('tapers toward the keel', () => {
    const mesh = buildHullBlock(dims, 5, cfg).full as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    let bottomMaxX = 0;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getY(i)) < 1e-4) bottomMaxX = Math.max(bottomMaxX, Math.abs(pos.getX(i)));
    }
    expect(bottomMaxX).toBeCloseTo((28 / 2) * cfg.hullKeelFraction, 3);
  });
});

describe('procedural:hull-block ends', () => {
  const dims: [number, number, number] = [143, 28, 16];
  const geo = (ends: [HullEnd, HullEnd], seed = 7): THREE.BufferGeometry =>
    (buildHullBlock(dims, seed, cfg, ends).full as THREE.Mesh).geometry;
  /** Max |x| of vertices whose z lies within `band` metres of zTarget, above the bilge. */
  const halfBeamNear = (g: THREE.BufferGeometry, zTarget: number, band: number): number => {
    const pos = g.getAttribute('position');
    let m = 0;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getZ(i) - zTarget) <= band && pos.getY(i) > dims[2] * 0.6) {
        m = Math.max(m, Math.abs(pos.getX(i)));
      }
    }
    return m;
  };
  const minZ = (g: THREE.BufferGeometry): number => {
    g.computeBoundingBox();
    return g.boundingBox!.min.z;
  };
  const maxZ = (g: THREE.BufferGeometry): number => {
    g.computeBoundingBox();
    return g.boundingBox!.max.z;
  };

  it('defaults to a prow forward and a cut aft', () => {
    expect(cfg.hullDefaultEnds).toEqual(['prow', 'cut']);
    expect(positions(buildHullBlock(dims, 3, cfg).full)).toEqual(
      positions(buildHullBlock(dims, 3, cfg, ['prow', 'cut']).full),
    );
  });

  it('a prow extends further along -Z than a cut end', () => {
    const prow = minZ(geo(['prow', 'cut']));
    const cut = minZ(geo(['cut', 'cut']));
    expect(prow).toBeCloseTo(-dims[0] / 2, 3);
    expect(prow).toBeLessThan(cut - 0.3);
    // Nothing from the break (slabs, peeled plates) reaches the nominal end.
    expect(cut).toBeGreaterThan(-dims[0] / 2);
  });

  it('a prow is pointed and a cut end keeps its full beam', () => {
    const L2 = dims[0] / 2;
    const prow = geo(['prow', 'cut']);
    const cut = geo(['cut', 'cut']);
    // 3 m back from the forward end: the prow is a narrow stem, the cut end is full width.
    expect(halfBeamNear(prow, -L2 + 3, 1)).toBeLessThan((dims[1] / 2) * 0.35);
    expect(halfBeamNear(cut, -L2 + 12, 1.5)).toBeGreaterThan((dims[1] / 2) * 0.95);
  });

  it('the prow is raked: the stem is set back at the keel', () => {
    const pos = geo(['prow', 'cut']).getAttribute('position');
    let keelMinZ = Infinity;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 1e-4) keelMinZ = Math.min(keelMinZ, pos.getZ(i));
    }
    expect(keelMinZ).toBeGreaterThan(-dims[0] / 2 + dims[2] * cfg.hullProwRakeFraction * 0.9);
  });

  it('a rounded end is blunter than a prow but narrower than a cut', () => {
    const L2 = dims[0] / 2;
    const rounded = geo(['cut', 'rounded']);
    const prow = geo(['cut', 'prow']);
    const cut = geo(['cut', 'cut']);
    expect(maxZ(rounded)).toBeGreaterThan(maxZ(cut));
    const r = halfBeamNear(rounded, L2 - 3, 1);
    expect(r).toBeGreaterThan(halfBeamNear(prow, L2 - 3, 1));
    expect(r).toBeLessThan((dims[1] / 2) * 0.8);
  });

  it('is deterministic per end combination and stays one draw call', () => {
    for (const ends of [
      ['prow', 'cut'],
      ['cut', 'rounded'],
      ['rounded', 'prow'],
    ] as [HullEnd, HullEnd][]) {
      const a = buildHullBlock(dims, 11, cfg, ends);
      expect(positions(a.full)).toEqual(positions(buildHullBlock(dims, 11, cfg, ends).full));
      expect((a.full as THREE.Mesh).isMesh).toBe(true);
      expect(a.bounds.min.y).toBeCloseTo(0, 3);
      const p = (a.full as THREE.Mesh).geometry.getAttribute('position').array as Float32Array;
      expect(p.every((v) => Number.isFinite(v))).toBe(true);
    }
  });

  it('vertical faces use only the rust-to-growth palette (no lime or orange)', () => {
    const rust = new THREE.Color(cfg.colors.rust);
    const growth = new THREE.Color(cfg.colors.growth);
    const g = geo(['prow', 'cut']);
    const col = g.getAttribute('color');
    const nrm = g.getAttribute('normal');
    // Each colour must be k * lerp(rust, growth, t) with t in [0, 1]: the
    // green/red and blue/red ratios then sit between rust's and growth's.
    const gr = [rust.g / rust.r, growth.g / growth.r];
    const br = [rust.b / rust.r, growth.b / growth.r];
    let checked = 0;
    for (let i = 0; i < col.count; i++) {
      if (Math.abs(nrm.getY(i)) > 0.5) continue;
      const r = col.getX(i);
      expect(r).toBeGreaterThan(0);
      expect(col.getY(i) / r).toBeGreaterThanOrEqual(gr[0]! - 1e-4);
      expect(col.getY(i) / r).toBeLessThanOrEqual(gr[1]! + 1e-4);
      expect(col.getZ(i) / r).toBeGreaterThanOrEqual(br[0]! - 1e-4);
      expect(col.getZ(i) / r).toBeLessThanOrEqual(br[1]! + 1e-4);
      // Never brighter than the brighter palette colour.
      expect(Math.max(r, col.getY(i), col.getZ(i))).toBeLessThanOrEqual(
        Math.max(rust.r, growth.g) * 1.11,
      );
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('the cut end is darker than amidships', () => {
    const g = geo(['prow', 'cut']);
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    const mean = (zLo: number, zHi: number): number => {
      let s = 0;
      let n = 0;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        if (z >= zLo && z <= zHi) {
          s += col.getX(i) + col.getY(i) + col.getZ(i);
          n++;
        }
      }
      return s / n;
    };
    const L2 = dims[0] / 2;
    expect(mean(L2 - 4, L2)).toBeLessThan(mean(-10, 10) * 0.7);
  });
});

describe('procedural:debris', () => {
  it('scatters 20-60 pieces of 1-6 m within the radius, deterministically', () => {
    for (const id of ['a', 'b', 'c', 'boilers', 'field-7']) {
      const seed = hashString(id);
      const pieces = layoutDebris(80, seed, cfg);
      expect(pieces.length).toBeGreaterThanOrEqual(20);
      expect(pieces.length).toBeLessThanOrEqual(60);
      for (const p of pieces) {
        expect(p.size).toBeGreaterThanOrEqual(1);
        expect(p.size).toBeLessThanOrEqual(6);
        expect(Math.hypot(p.position.x, p.position.z)).toBeLessThanOrEqual(80);
      }
      expect(layoutDebris(80, seed, cfg)).toEqual(pieces);
    }
  });

  it('follows the terrain through heightAt', () => {
    const flat = layoutDebris(50, 9, cfg);
    const raised = layoutDebris(50, 9, cfg, () => 10);
    raised.forEach((p, i) => expect(p.position.y).toBeCloseTo(flat[i]!.position.y + 10));
  });

  it('builds instanced meshes whose instance total equals the layout, and a smaller impostor', () => {
    const seed = hashString('debris');
    const n = layoutDebris(40, seed, cfg).length;
    const built = buildDebris(40, seed, cfg);
    let total = 0;
    built.full.traverse((o) => {
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh) total += im.count;
    });
    expect(total).toBe(n);
    let impCount = 0;
    built.impostor.traverse((o) => {
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh) impCount += im.count;
    });
    expect(impCount).toBeLessThanOrEqual(cfg.debrisImpostorPieces);
    expect(built.bounds.isEmpty()).toBe(false);
  });
});

describe('procedural:chimney', () => {
  it('is dimensions_m[2] tall and tapered, with a basalt vertex palette', () => {
    const { full, bounds } = buildChimney([6, 6, 25], hashString('c'), cfg);
    expect(bounds.min.y).toBeCloseTo(0, 3);
    expect(bounds.max.y).toBeCloseTo(25, 3);
    // Base radius 3 m with +/-20 % wobble.
    expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(6 * 1.3);
    const mesh = full as THREE.Mesh;
    expect(mesh.geometry.getAttribute('color')).toBeDefined();
  });

  it('derives a radius from the height when dimensions_m[0] is 0', () => {
    const { bounds } = buildChimney([0, 0, 20], 1, cfg);
    const r = 20 * cfg.chimneyRadiusFraction;
    expect(bounds.getSize(new THREE.Vector3()).x).toBeGreaterThan(r);
    expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(r * 2 * 1.3);
  });

  it('material_hint changes only the palette: carbonate pale, sulfide dark, basalt = default', () => {
    const colours = (o: THREE.Object3D): Float32Array =>
      (o as THREE.Mesh).geometry.getAttribute('color').array as Float32Array;
    const mean = (a: Float32Array): number => a.reduce((s, v) => s + v, 0) / a.length;
    const dflt = buildChimney([5, 5, 18], 77, cfg);
    const basalt = buildChimney([5, 5, 18], 77, cfg, 'basalt');
    const carb = buildChimney([5, 5, 18], 77, cfg, 'carbonate');
    const sulf = buildChimney([5, 5, 18], 77, cfg, 'sulfide');
    // Absence of a hint is exactly today's basalt chimney.
    expect(colours(basalt.full)).toEqual(colours(dflt.full));
    expect(positions(carb.full)).toEqual(positions(dflt.full));
    expect(positions(sulf.full)).toEqual(positions(dflt.full));
    expect(mean(colours(carb.full))).toBeGreaterThan(mean(colours(dflt.full)) * 2);
    expect(mean(colours(sulf.full))).toBeLessThan(mean(colours(dflt.full)));
    expect(chimneyPalette('basalt', cfg)).toEqual({
      rock: cfg.colors.basalt,
      stain: cfg.colors.mineral,
    });
    const impHex = (b: typeof dflt): number =>
      ((b.impostor as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex();
    expect(impHex(dflt)).toBe(cfg.colors.basalt);
    expect(impHex(carb)).toBe(cfg.chimneyMaterials.carbonate.rock);
    expect(impHex(sulf)).toBe(cfg.chimneyMaterials.sulfide.rock);
  });

  it('is deterministic', () => {
    expect(positions(buildChimney([5, 5, 18], 77, cfg).full)).toEqual(
      positions(buildChimney([5, 5, 18], 77, cfg).full),
    );
  });
});

describe('box silhouette impostor', () => {
  it('matches the bounds and is translucent', () => {
    const b = new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 3, 2));
    const m = makeBoxSilhouette(b, 0x333333, 0.5);
    expect(m.position.toArray()).toEqual([0, 1.5, 0]);
    const mat = m.material as THREE.MeshStandardMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBe(0.5);
  });
});
