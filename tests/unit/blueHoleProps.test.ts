import * as THREE from 'three';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import { headingQuaternion } from '../../src/world/Props.js';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import { buildGeo, countGeo, isGeoFeature } from '../../src/world/props/geo/index.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';
import blueHolePoses from '../../tools/blue-hole-poses.json';
import { CameraRig } from '../../src/sub/CameraRig.js';
import * as textures from '../../src/world/props/geo/textures.js';
import * as manifests from '../../src/core/SiteManifest.js';

// The measured grid shows only a flat 4 m platform; the carve digs the hole into it.
const meta = {
  id: 'great-blue-hole',
  center: { lat: 17.31519753916774, lon: -87.53411865234375 },
} as unknown as TileMeta;
const carve = terrainCarveFor(meta)!;
const ground = (x: number, z: number): number => carve.apply(x, z, -4);

function disposeGeo(built: ReturnType<typeof buildGeo>): void {
  for (const root of [built.full, built.impostor])
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        material.dispose();
    });
}

describe('Great Blue Hole props', () => {
  const cfg = DEFAULT_CONFIG.props;
  const { props } = parsePropsDoc(doc, cfg);
  const geo = props.filter((p) => p.procedural === 'geo' && isGeoFeature(p.feature ?? ''));

  it('has a seated grotto at the hole', () => {
    expect(geo.length).toBeGreaterThan(0);
  });

  // Reference geometry uses level seating. Bound the pendant
  // envelope independently of terrain refinements and the roof's reduced crest.
  const originalGallery = [
    {
      id: 'karst-grotto',
      tier: 'low',
      min: [-1.06218, 1.67745, -25.74851],
      max: [7.28213, 11.17616, -3.06162],
    },
    {
      id: 'karst-grotto',
      tier: 'high',
      min: [-17.81372, 1.06023, -31.67323],
      max: [6.26942, 10.70134, -2.80004],
    },
    {
      id: 'karst-grotto-east',
      tier: 'low',
      min: [-17.16424, 0.8634, -21.30654],
      max: [16.30138, 8.09706, -4.00215],
    },
    {
      id: 'karst-grotto-east',
      tier: 'high',
      min: [-18.58081, 1.16659, -23.38138],
      max: [17.10649, 8.3307, -2.17395],
    },
  ];
  for (const baseline of originalGallery) {
    it(`${baseline.id} ${baseline.tier}: keeps its pendants inside the original envelope beneath a low roof`, () => {
      const def = geo.find((p) => p.id === baseline.id)!;
      const built = buildGeo({
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg,
        tier: baseline.tier,
        groundHeight: () => () => 0,
      });
      const gallery = built.full.getObjectByName('stalactite-gallery') as THREE.Mesh;
      gallery.geometry.computeBoundingBox();
      const expected = new THREE.Box3(
        new THREE.Vector3().fromArray(baseline.min),
        new THREE.Vector3().fromArray(baseline.max),
      );
      // Pendant length follows a clump noise, so the longest and outermost pendants are not
      // pinned: the gallery only has to hang no lower than before, stay within the prop's
      // footprint, and keep real hang.
      const [w] = def.dimensionsM!;
      const box = gallery.geometry.boundingBox!;
      expect(box.max.y).toBeLessThan(expected.max.y + 1);
      expect(box.min.y).toBeGreaterThan(expected.min.y - 1);
      expect(Math.max(-box.min.x, box.max.x)).toBeLessThan(w! / 2);
      expect(box.getSize(new THREE.Vector3()).y).toBeGreaterThan(
        expected.getSize(new THREE.Vector3()).y * 0.4,
      );
      built.full.updateMatrixWorld(true);
      const roof = built.full.getObjectByName('grotto-overhang') as THREE.Mesh;
      const down = new THREE.Raycaster(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, -1, 0));
      const hit = down.intersectObject(roof)[0];
      expect(hit).toBeDefined();
      expect(hit.point.y).toBeLessThan(def.dimensionsM![2] * 0.75);
    });
  }

  for (const def of geo) {
    for (const tier of ['low', 'medium', 'high']) {
      it(`${def.id} ${tier}: all roof and bed buffers and collision envelopes are finite and seeded`, () => {
        const input = {
          def,
          dims: def.dimensionsM!,
          seed: hashString(def.id),
          cfg,
          tier,
          groundHeight: () => () => 0,
        };
        const built = buildGeo(input);
        const repeated = buildGeo(input);
        const buffers = (root: THREE.Object3D) => {
          const hash = createHash('sha256');
          root.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            for (const attribute of Object.values(
              object.geometry.attributes as Record<string, THREE.BufferAttribute>,
            )) {
              expect(Array.from(attribute.array).every(Number.isFinite), object.name).toBe(true);
              hash.update(attribute.array);
            }
            if (object.geometry.index) hash.update(object.geometry.index.array);
            if (object instanceof THREE.InstancedMesh) hash.update(object.instanceMatrix.array);
          });
          return hash.digest('hex');
        };
        expect(buffers(built.full)).toBe(buffers(repeated.full));
        expect(built.bounds).toEqual(repeated.bounds);
        expect(built.colliders).toEqual(repeated.colliders);
        for (const box of [built.bounds, ...built.colliders!]) {
          expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
          expect(box.isEmpty()).toBe(false);
          expect(box.intersectsBox(built.bounds)).toBe(true);
        }
        for (const name of ['grotto-overhang', 'grotto-sediment-apron']) {
          const mesh = built.full.getObjectByName(name) as THREE.Mesh;
          mesh.geometry.computeBoundingBox();
          expect(built.bounds.containsBox(mesh.geometry.boundingBox!)).toBe(true);
        }
        for (const result of [built, repeated]) disposeGeo(result);
      });

      it(`${def.id} ${tier}: roof cracks keep the indexed shell joined through its caps`, () => {
        const built = buildGeo({
          def,
          dims: def.dimensionsM!,
          seed: hashString(def.id),
          cfg,
          tier,
          groundHeight: () => () => 0,
        });
        const roof = built.full.getObjectByName('grotto-overhang') as THREE.Mesh;
        const p = roof.geometry.getAttribute('position');
        const index = roof.geometry.index!;
        // Weld duplicate cap vertices by position. Every exposed edge must have a
        // partner; only the open bottom profile is allowed below the sediment join.
        const keys = Array.from(
          { length: p.count },
          (_, i) => `${p.getX(i)}|${p.getY(i)}|${p.getZ(i)}`,
        );
        const edges = new Map<string, { count: number; high: number }>();
        for (let i = 0; i < index.count; i += 3) {
          const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
          for (let j = 0; j < 3; j++) {
            const a = tri[j],
              b = tri[(j + 1) % 3];
            const key = [keys[a], keys[b]].sort().join('/');
            const edge = edges.get(key) ?? { count: 0, high: Math.max(p.getY(a), p.getY(b)) };
            edge.count++;
            edges.set(key, edge);
          }
        }
        const boundary = [...edges.values()].filter((edge) => edge.count === 1);
        expect(boundary.length).toBeGreaterThan(0);
        expect(boundary.every((edge) => edge.high <= def.dimensionsM![2] * 0.011)).toBe(true);
        expect([...edges.values()].every((edge) => edge.count <= 2)).toBe(true);
        disposeGeo(built);
      });

      it(`${def.id} ${tier}: sediment finish preserves gallery framing and Low's budget`, () => {
        const input = {
          def,
          dims: def.dimensionsM!,
          seed: hashString(def.id),
          tier,
          groundHeight: () => () => 0,
        };
        const built = buildGeo({ ...input, cfg });
        const baseline = buildGeo({
          ...input,
          cfg: {
            ...cfg,
            blueHoleApron: {
              ...cfg.blueHoleApron,
              rowDensity: 1,
              columnDensity: 1,
              riserFraction: 0.22,
              normalSampleM: 0,
              contactShade: 0,
              roughnessVariation: 0,
            },
          },
        });
        const apron = built.full.getObjectByName('grotto-sediment-apron') as THREE.Mesh;
        const original = baseline.full.getObjectByName('grotto-sediment-apron') as THREE.Mesh;
        const scale =
          tier === 'low' ? 1 : cfg.blueHoleApron.rowDensity * cfg.blueHoleApron.columnDensity;
        // Grid sizes are rounded per axis, so the ratio holds to within a percent.
        expect(apron.geometry.index!.count / original.geometry.index!.count).toBeCloseTo(scale, 1);
        if (tier === 'low')
          expect(apron.geometry.index!.count).toBe(original.geometry.index!.count);
        expect(built.bounds.equals(baseline.bounds)).toBe(true);
        expect(built.colliders).toEqual(baseline.colliders);
        expect(built.full.children.map((o) => o.name)).toEqual(
          baseline.full.children.map((o) => o.name),
        );
        expect(countGeo(built.full).draws).toBe(countGeo(baseline.full).draws);
        if (tier === 'low') {
          expect(countGeo(built.full).triangles).toBe(countGeo(baseline.full).triangles);
          expect(built.full.getObjectByName('fallen-blocks')).toBeUndefined();
        }
        for (const name of ['grotto-overhang', 'stalactite-gallery']) {
          const mesh = built.full.getObjectByName(name) as THREE.Mesh;
          const before = baseline.full.getObjectByName(name) as THREE.Mesh;
          expect(mesh.geometry.getAttribute('position').array).toEqual(
            before.geometry.getAttribute('position').array,
          );
        }
        const roughness = apron.geometry.getAttribute('sedimentRoughness');
        const values = Array.from(roughness.array);
        expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.02);
        for (const value of values) {
          expect(Number.isFinite(value)).toBe(true);
          expect(0.92 + value).toBeGreaterThan(0.85);
          expect(0.92 + value).toBeLessThan(1);
        }
        const material = apron.material as THREE.MeshStandardMaterial;
        expect(material.flatShading).toBe(false);
        // The sediment shader must compose with both galleries' existing lighting.
        const shader = {
          uniforms: {},
          vertexShader: THREE.ShaderLib.standard.vertexShader,
          fragmentShader: THREE.ShaderLib.standard.fragmentShader,
        } as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0];
        material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
        expect(shader.fragmentShader).toContain('totalEmissiveRadiance *=');
        expect(shader.fragmentShader).toContain('roughnessFactor = clamp');
        if (def.id.endsWith('east')) expect(shader.fragmentShader).toContain('openingLight');
      });
    }
    for (const tier of ['low', 'high']) {
      it(`${def.id} ${tier}: sediment apron and wall cannot sample the contour detail map`, () => {
        // Node normally returns null for every canvas map. Supply a real texture
        // so this test catches accidentally restoring the contour map in a browser.
        const map = new THREE.Texture();
        map.userData.meanLinear = 0.58;
        const factory = vi.spyOn(textures, 'detailTexture').mockReturnValue(map);
        try {
          const built = buildGeo({
            def,
            dims: def.dimensionsM!,
            seed: hashString(def.id),
            cfg,
            tier,
            groundHeight: () => () => 0,
          });
          for (const name of ['grotto-sediment-apron', 'grotto-overhang']) {
            const mesh = built.full.getObjectByName(name) as THREE.Mesh;
            const material = mesh.material as THREE.MeshStandardMaterial;
            expect(material.map).toBeNull();
            expect(material.bumpMap).toBeNull();
            expect(material.vertexColors).toBe(true);
          }
          const pendants = built.full.getObjectByName('stalactite-gallery') as THREE.Mesh;
          expect((pendants.material as THREE.MeshStandardMaterial).map).toBe(map);
        } finally {
          factory.mockRestore();
          map.dispose();
        }
      });
    }
    for (const tier of ['low', 'medium', 'high'])
      it(`${def.id} ${tier}: stands on the ledge and its foot never floats above the sampled terrain`, () => {
        const { x, z } = latLonToWorld(meta, def.lat, def.lon);
        const originY = ground(x, z);
        // Over the ledge (about 40 m down), not out over the 125 m drop.
        expect(originY).toBeGreaterThan(-60);
        const q = headingQuaternion(def.headingDeg);
        const v = new THREE.Vector3();
        const built = buildGeo({
          def,
          dims: def.dimensionsM!,
          seed: hashString(def.id),
          cfg,
          tier,
          groundHeight: () => (lx: number, lz: number) => {
            v.set(lx, 0, lz).applyQuaternion(q);
            return ground(x + v.x, z + v.z) - originY;
          },
        });
        built.full.updateMatrixWorld(true);
        const foot: number[] = [];
        let minY = Infinity;
        const pts: THREE.Vector3[] = [];
        built.full.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;
          const pos = m.geometry.getAttribute('position');
          for (let i = 0; i < pos.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            minY = Math.min(minY, p.y);
            pts.push(p);
          }
        });
        for (const p of pts) {
          if (p.y > minY + 4) continue;
          const w = p.clone().applyQuaternion(q);
          foot.push(originY + p.y - ground(x + w.x, z + w.z));
        }
        expect(foot.length).toBeGreaterThan(3);
        // Every low vertex sits within 3 m of the terrain beneath it (none hangs in mid-water).
        expect(Math.max(...foot)).toBeLessThan(3);
        // The shelf's lip is carried by the ledge (not out over the drop (20 m)) and the ground rises behind the wall.
        const [W, D] = def.dimensionsM!;
        const at = (lx: number, lz: number): number => {
          v.set(lx, 0, lz).applyQuaternion(q);
          return ground(x + v.x, z + v.z);
        };
        for (let f = -0.3; f <= 0.3; f += 0.1) {
          expect(at(f * W, -D)).toBeGreaterThan(originY - 20);
          expect(at(f * W, 12)).toBeGreaterThanOrEqual(originY - 0.5);
        }
      });
  }

  for (const tier of ['low', 'medium', 'high']) {
    it(`hood ${tier}: the flag darkens the interior and follows a renamed prop`, () => {
      const def = geo.find((p) => manifests.propManifest(p.id)?.grotto === 'hood')!;
      const input = {
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg,
        tier,
        groundHeight: () => () => 0,
      };
      const policy = manifests.propManifest(def.id)!;
      const before = JSON.stringify(cfg);
      const hood = buildGeo(input);
      const built = [hood];
      const lookup = vi.spyOn(manifests, 'propManifest');
      try {
        lookup.mockReturnValue(policy);
        const renamed = buildGeo({ ...input, def: { ...def, id: 'hood-fixture' } });
        built.push(renamed);
        lookup.mockReturnValue({ ...policy, grotto: undefined });
        const plain = buildGeo(input);
        built.push(plain);
        const mesh = (built: typeof hood) =>
          built.full.getObjectByName('grotto-overhang') as THREE.Mesh;
        const roof = mesh(hood),
          other = mesh(renamed),
          original = mesh(plain);
        for (const key of Object.keys(roof.geometry.attributes))
          expect(roof.geometry.getAttribute(key).array).toEqual(
            other.geometry.getAttribute(key).array,
          );
        expect(hood.colliders).toEqual(renamed.colliders);
        const interior = (mesh: THREE.Mesh) => {
          const p = mesh.geometry.getAttribute('position');
          const n = mesh.geometry.getAttribute('normal');
          const c = mesh.geometry.getAttribute('color');
          let sum = 0,
            count = 0;
          for (let i = 0; i < p.count; i++) {
            if (
              p.getY(i) < 0.48 * input.dims[2] ||
              p.getY(i) > 0.55 * input.dims[2] ||
              n.getY(i) > -0.3
            )
              continue;
            sum += c.getX(i) + c.getY(i) + c.getZ(i);
            count++;
          }
          expect(count).toBeGreaterThan(10);
          return sum / count;
        };
        expect(interior(roof)).toBeLessThan(interior(original) * 0.95);
        expect(JSON.stringify(cfg)).toBe(before);
      } finally {
        lookup.mockRestore();
        built.forEach(disposeGeo);
      }
    });

    it(`east ${tier}: has a roof over the mouth, pendant clearance and a clear close camera`, () => {
      const def = geo.find((p) => p.id === 'karst-grotto-east')!;
      const { x, z } = latLonToWorld(meta, def.lat, def.lon);
      const originY = ground(x, z);
      const q = headingQuaternion(def.headingDeg);
      const localGround = (lx: number, lz: number): number => {
        const p = new THREE.Vector3(lx, 0, lz).applyQuaternion(q);
        return ground(x + p.x, z + p.z) - originY;
      };
      const built = buildGeo({
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg,
        tier,
        groundHeight: () => localGround,
      });
      built.full.updateMatrixWorld(true);
      const roof = built.full.getObjectByName('grotto-overhang') as THREE.Mesh;
      const gallery = built.full.getObjectByName('stalactite-gallery') as THREE.Mesh;
      // Vertical rays through the mouth must enter AND leave solid limestone,
      // with an actual cavity underneath, across its central span.
      for (const lx of [-8, 0, 8]) {
        const up = new THREE.Raycaster(
          new THREE.Vector3(lx, -100, -14),
          new THREE.Vector3(0, 1, 0),
        );
        const down = new THREE.Raycaster(
          new THREE.Vector3(lx, 100, -14),
          new THREE.Vector3(0, -1, 0),
        );
        const underside = up.intersectObject(roof)[0];
        const top = down.intersectObject(roof)[0];
        expect(underside, `missing overhang at ${lx}`).toBeTruthy();
        expect(top.point.y - underside.point.y).toBeGreaterThan(0.4);
        expect(underside.point.y - localGround(lx, -14)).toBeGreaterThan(3);
      }
      // Probe the notch centres, shoulders and overhanging flanks, which the
      // three central mouth rays alone can miss. They retain solid limestone.
      for (const [centre, halfWidth] of [
        [-0.27, 0.05],
        [0.08, 0.04],
        [0.31, 0.055],
      ]) {
        for (const offset of [-1.25, -0.85, 0, 0.85, 1.25]) {
          const x = (centre + offset * halfWidth) * def.dimensionsM![0];
          const up = new THREE.Raycaster(
            new THREE.Vector3(x, -100, -14),
            new THREE.Vector3(0, 1, 0),
          );
          const down = new THREE.Raycaster(
            new THREE.Vector3(x, 100, -14),
            new THREE.Vector3(0, -1, 0),
          );
          const underside = up.intersectObject(roof)[0];
          const top = down.intersectObject(roof)[0];
          expect(underside, `missing notch underside at ${x}`).toBeDefined();
          expect(top, `missing notch top at ${x}`).toBeDefined();
          expect(top.point.y - underside.point.y).toBeGreaterThan(0.4);
        }
      }
      const vertices = gallery.geometry.getAttribute('position');
      let minClearance = Infinity;
      for (let i = 0; i < vertices.count; i++) {
        minClearance = Math.min(
          minClearance,
          vertices.getY(i) - localGround(vertices.getX(i), vertices.getZ(i)),
        );
      }
      expect(minClearance).toBeGreaterThan(0.2);
      // Even Low retains several long pendants among its shorter companions.
      const pendantLengths = built
        .colliders!.slice(-7)
        .map((b) => b.max.y - b.min.y)
        .sort((a, b) => a - b);
      expect(pendantLengths[6]).toBeGreaterThan(3);
      expect(pendantLengths[6] / pendantLengths[0]).toBeGreaterThan(1.2);

      const pose = blueHolePoses.east;
      const target = new THREE.Vector3().fromArray(pose.target).applyQuaternion(q);
      target.add(new THREE.Vector3(x, originY, z));
      const [dx, , dz] = pose.direction;
      const { range, above, lateral } = pose.close;
      const sub = new THREE.Vector3(
        target.x + dx * range - dz * lateral,
        originY + above,
        target.z + dz * range + dx * lateral,
      );
      const yaw = Math.atan2(target.x - sub.x, -(target.z - sub.z));
      const pitch = Math.atan2(target.y - sub.y, sub.distanceTo(target));
      const rig = new CameraRig(DEFAULT_CONFIG.camera, 16 / 9, {
        sampleHeight: ground,
        getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
      });
      rig.setMode('first-person');
      rig.snap(sub, yaw, pitch);
      const eye = rig.camera.position;
      rig.lookElevation =
        (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
        0.55;
      rig.snap(sub, yaw, pitch);
      expect(sub.y - ground(sub.x, sub.z)).toBeGreaterThan(DEFAULT_CONFIG.submarine.hullRadius);
      const toLocal = new THREE.Matrix4()
        .compose(new THREE.Vector3(x, originY, z), q, new THREE.Vector3(1, 1, 1))
        .invert();
      for (const [p, radius] of [
        [sub, DEFAULT_CONFIG.submarine.hullRadius],
        [eye, 0.3],
      ] as const) {
        const sphere = new THREE.Sphere(p.clone().applyMatrix4(toLocal), radius);
        expect(built.colliders!.some((b) => b.intersectsSphere(sphere))).toBe(false);
      }
      // Test actual camera projection: the lip and the apron both fit with margin.
      rig.camera.updateMatrixWorld(true);
      for (const local of [
        new THREE.Vector3(-16, 9, -18),
        new THREE.Vector3(16, 9, -18),
        new THREE.Vector3(0, 1, -8),
      ]) {
        const projected = local
          .applyQuaternion(q)
          .add(new THREE.Vector3(x, originY, z))
          .project(rig.camera);
        expect(Math.abs(projected.x)).toBeLessThan(0.9);
        expect(Math.abs(projected.y)).toBeLessThan(0.9);
        expect(projected.z).toBeGreaterThan(-1);
        expect(projected.z).toBeLessThan(1);
      }
    });
  }
});
