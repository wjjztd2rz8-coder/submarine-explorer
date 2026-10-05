import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import doc from '../../data/landmarks/beebe-vent-field/props.json';
import meta from '../../data/tiles/beebe-vent-field/meta.json';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { Terrain } from '../../src/world/Terrain.js';
import { headingQuaternion } from '../../src/world/Props.js';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import { VENT_BUILDERS } from '../../src/world/props/builders/vents.js';
import { hashString } from '../../src/world/props/geo/shared.js';

const def = parsePropsDoc(doc, DEFAULT_CONFIG.props).props[0]!;
const ground = (x: number, z: number): number =>
  x * 0.12 - z * 0.07 + 0.4 * Math.sin(x / 7) * Math.cos(z / 9);
const build = (tier: string, entry = def) =>
  VENT_BUILDERS.chimney({
    def: entry,
    dims: entry.dimensionsM!,
    seed: hashString(entry.id),
    cfg: DEFAULT_CONFIG.props,
    tier,
    groundHeight: () => ground,
  });
const withoutApron = { ...def, raw: { ...def.raw, beebe_seabed: undefined } };
const apronOf = (
  built: ReturnType<typeof build>,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> =>
  built.full.getObjectByName('beebe-mineral-seabed') as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >;

describe('Beebe opening mineral seabed', () => {
  for (const tier of ['low', 'high'] as const) {
    it(`${tier}: keeps the opening apron above the rendered Beebe terrain triangles`, () => {
      const bytes = readFileSync('data/tiles/beebe-vent-field/heightmap.bin');
      const heights = new Float32Array(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      );
      const terrain = new Terrain({ meta, heights }, DEFAULT_CONFIG.terrain, tier);
      const { x, z } = latLonToWorld(meta, def.lat, def.lon);
      const originY = terrain.sampleHeight(x, z);
      const heading = headingQuaternion(def.headingDeg);
      const local = new THREE.Vector3();
      const actual = VENT_BUILDERS.chimney({
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg: DEFAULT_CONFIG.props,
        tier,
        groundHeight: () => (lx, lz) => {
          local.set(lx, 0, lz).applyQuaternion(heading);
          return terrain.sampleHeight(x + local.x, z + local.z) - originY;
        },
      });
      terrain.group.updateMatrixWorld(true);
      const positions = apronOf(actual).geometry.getAttribute('position');
      const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
      let samples = 0;
      let minClearance = Infinity;
      for (let i = 0; i < positions.count; i += 5) {
        const lx = positions.getX(i);
        const lz = positions.getZ(i);
        if (Math.hypot(lx / 45, lz / 40) > 0.65) continue;
        local
          .set(lx, positions.getY(i), lz)
          .applyQuaternion(heading)
          .add(new THREE.Vector3(x, originY, z));
        ray.ray.origin.set(local.x, local.y + 100, local.z);
        const hit = ray.intersectObject(terrain.group, true)[0];
        expect(hit).toBeDefined();
        minClearance = Math.min(minClearance, local.y - hit.point.y);
        samples++;
      }
      terrain.dispose();
      expect(samples).toBeGreaterThan(25);
      expect(minClearance).toBeGreaterThan(0.05);
    });
  }
  for (const tier of ['low', 'high']) {
    it(`${tier}: follows sloping measured-plus-detail ground, lifts its interior and buries its rim`, () => {
      const built = build(tier);
      const apron = apronOf(built);
      expect(apron).toBeDefined();
      const positions = apron.geometry.getAttribute('position');
      let raised = 0;
      let buried = 0;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const radius = Math.hypot(x / 45, z / 40);
        const above = y - ground(x, z);
        if (radius < 0.5) {
          expect(above).toBeGreaterThanOrEqual(1.09);
          expect(above).toBeLessThan(1.26);
          raised++;
        }
        if (Math.abs(x) === 45 || Math.abs(z) === 40) {
          expect(above).toBeLessThan(-0.25);
          buried++;
        }
      }
      expect(raised).toBeGreaterThan(30);
      expect(buried).toBeGreaterThan(30);
      expect(apron.material.vertexColors).toBe(true);
      expect(apron.material.emissive.getHex()).toBe(0);
      const colors = apron.geometry.getAttribute('color');
      const warm = Array.from({ length: colors.count }, (_, i) => colors.getX(i) - colors.getZ(i));
      expect(Math.max(...warm)).toBeGreaterThan(0.03);
      expect(new Set(warm.map((v) => Math.round(v * 1000))).size).toBeGreaterThan(20);
      const talus = built.full.getObjectByName('beebe-seabed-talus') as THREE.Mesh;
      expect(talus.geometry.getAttribute('color')).toBeDefined();
      expect(built.bounds.containsBox(new THREE.Box3().setFromObject(apron))).toBe(true);
      expect(built.bounds.containsBox(new THREE.Box3().setFromObject(talus))).toBe(true);
    });

    it(`${tier}: keeps chimney, vent tip, collision volumes and impostor unchanged`, () => {
      const bare = build(tier, withoutApron);
      const decorated = build(tier);
      const bareBody = bare.full.getObjectByName('smoker-body') as THREE.Mesh;
      const body = decorated.full.getObjectByName('smoker-body') as THREE.Mesh;
      expect(body.geometry.getAttribute('position').array).toEqual(
        bareBody.geometry.getAttribute('position').array,
      );
      expect(body.geometry.getAttribute('color').array).toEqual(
        bareBody.geometry.getAttribute('color').array,
      );
      expect(decorated.full.userData.ventTop).toBe(bare.full.userData.ventTop);
      expect(decorated.colliders!.length).toBe(bare.colliders!.length);
      for (let i = 0; i < bare.colliders!.length; i++) {
        expect(decorated.colliders![i].equals(bare.colliders![i])).toBe(true);
      }
      expect(
        new THREE.Box3()
          .setFromObject(decorated.impostor)
          .equals(new THREE.Box3().setFromObject(bare.impostor)),
      ).toBe(true);
      expect(decorated.bounds.min.x).toBe(-45);
      expect(decorated.bounds.max.x).toBe(45);
      expect(decorated.bounds.min.z).toBe(-40);
      expect(decorated.bounds.max.z).toBe(40);
    });
  }

  it('budgets the extra sediment and rubble geometry on Low', () => {
    const low = build('low');
    const high = build('high');
    expect(apronOf(low).geometry.getAttribute('position').count).toBeLessThan(
      apronOf(high).geometry.getAttribute('position').count,
    );
    const talusVertices = (built: ReturnType<typeof build>): number =>
      (built.full.getObjectByName('beebe-seabed-talus') as THREE.Mesh).geometry.getAttribute(
        'position',
      ).count;
    expect(talusVertices(low)).toBeLessThan(talusVertices(high) / 2);
  });

  it('does not decorate other vent sites, missing terrain or malformed content', () => {
    const elsewhere = build('high', { ...def, id: 'axial-smoker' });
    expect(apronOf(elsewhere)).toBeUndefined();
    const bad = build('high', {
      ...def,
      raw: { ...def.raw, beebe_seabed: { ...(def.raw.beebe_seabed as object), width_m: -1 } },
    });
    expect(apronOf(bad)).toBeUndefined();
    const missingGround = VENT_BUILDERS.chimney({
      def,
      dims: def.dimensionsM!,
      seed: hashString(def.id),
      cfg: DEFAULT_CONFIG.props,
      tier: 'high',
      groundHeight: () => undefined,
    });
    expect(apronOf(missingGround)).toBeUndefined();
  });
});
