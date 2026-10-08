import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import doc from '../../data/landmarks/beebe-vent-field/props.json';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import { VENT_BUILDERS } from '../../src/world/props/builders/vents.js';
import { countGeo, hashString } from '../../src/world/props/geo/shared.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';

const defs = parsePropsDoc(doc, DEFAULT_CONFIG.props).props;
const build = (tier: string, def = defs[0]!) =>
  VENT_BUILDERS.chimney({
    def,
    dims: def.dimensionsM!,
    seed: hashString(def.id),
    cfg: DEFAULT_CONFIG.props,
    tier,
    groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
  });

describe('850 Beebe sediment and cooler vent margins', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
    it(`${tier}: adds attached clumps and broken chimney rubble to every smoker, within a small budget`, () => {
      for (const def of defs) {
        const built = build(tier, def);
        const habitat = built.full.getObjectByName('beebe-flow-habitat') as THREE.Mesh;
        expect(habitat).toBeDefined();
        expect(habitat.userData.clumps).toBeGreaterThanOrEqual(3);
        expect(habitat.userData.worms).toBeGreaterThan(0);
        expect(habitat.userData.mussels).toBeGreaterThan(0);
        expect(habitat.userData.rubble).toBeGreaterThan(0);
        expect(countGeo(habitat).draws).toBe(1);
        expect(countGeo(habitat).triangles).toBeLessThan(
          tier === 'low' ? 1600 : tier === 'ultra' ? 30000 : 16000,
        );
        expect((habitat.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0);
        expect(built.bounds.containsBox(new THREE.Box3().setFromObject(habitat))).toBe(true);
        const bare = build(tier, { ...def, raw: { ...def.raw, beebe_habitat: undefined } });
        expect(built.colliders).toEqual(bare.colliders ?? [bare.bounds]);
        expect(built.full.userData.ventTop).toEqual(bare.full.userData.ventTop);
        const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
        const apron = built.full.getObjectByName('beebe-mineral-seabed');
        for (const [x, y, z] of habitat.userData.anchors as number[][]) {
          ray.ray.origin.set(x!, y! + 10, z!);
          const hit = apron ? ray.intersectObject(apron)[0] : undefined;
          expect(y).toBeCloseTo(Math.max(x! * 0.07 - z! * 0.1, hit?.point.y ?? -Infinity), 5);
        }
        const tally = countGeo(habitat);
        console.log(
          `BEEBE-HABITAT ${tier} ${def.id}: ${JSON.stringify({ ...tally, clumps: habitat.userData.clumps, worms: habitat.userData.worms, mussels: habitat.userData.mussels, rubble: habitat.userData.rubble })}`,
        );
        const positions = habitat.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++)
          expect(Number.isFinite(positions.getY(i))).toBe(true);
        // Seeds and placement are reproducible independently of load order.
        const again = build(tier, def).full.getObjectByName('beebe-flow-habitat') as THREE.Mesh;
        expect(again.geometry.getAttribute('position').array).toEqual(positions.array);
      }
    });
    it(`${tier}: uses existing sand/rubble/basalt slots and Titanic's fog output path`, () => {
      const biome = biomeFor('beebe-vent-field');
      expect([biome.a, biome.b, biome.c]).toEqual(['sand', 'rubble', 'basalt']);
      expect(biome.ripple).toBeGreaterThan(0.2);
      expect(biome.colorA).not.toBe(biome.colorB);
      expect(biome.scatter.some((s) => s.kind === 'rubble' && s.density >= 6)).toBe(true);
      const built = createTerrainMaterial({
        config: DEFAULT_CONFIG.terrain,
        tier,
        biome,
        exaggeration: 1,
      });
      const shader = {
        ...THREE.ShaderLib.standard,
        uniforms: { ...THREE.ShaderLib.standard.uniforms },
      };
      built.material.onBeforeCompile(
        shader as Parameters<typeof built.material.onBeforeCompile>[0],
        {} as THREE.WebGLRenderer,
      );
      expect(biome.abyssFadeM).toEqual([300, 1100]);
      expect(shader.fragmentShader).toContain('mix(gl_FragColor.rgb, fogColor, abyssFade)');
      expect(shader.fragmentShader.indexOf('float abyssFade')).toBeGreaterThan(
        shader.fragmentShader.indexOf('#include <fog_fragment>'),
      );
      if (tier === 'low')
        expect(shader.fragmentShader).not.toContain('#define TERRAIN_PBR_NORMALS');
    });
  }
  it('keeps an Axial vent byte-identical even with copied Beebe extensions', () => {
    const elsewhere = { ...defs[0]!, id: 'axial-smoker' };
    const decorated = build('high', elsewhere);
    const bare = build('high', {
      ...elsewhere,
      raw: { ...elsewhere.raw, beebe_habitat: undefined, beebe_seabed: undefined },
    });
    const buffers = (root: THREE.Object3D) => {
      const result: unknown[] = [];
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        result.push(
          Object.fromEntries(
            Object.entries(object.geometry.attributes as Record<string, THREE.BufferAttribute>).map(
              ([key, value]) => [key, value.array],
            ),
          ),
        );
        if (object instanceof THREE.InstancedMesh)
          result.push(object.instanceMatrix.array, object.instanceColor?.array);
      });
      return result;
    };
    expect(buffers(decorated.full)).toEqual(buffers(bare.full));
    expect(decorated.bounds).toEqual(bare.bounds);
    expect(decorated.colliders).toEqual(bare.colliders);
  });
  it('ignores Beebe decoration on another site and rejects malformed extensions', () => {
    for (const def of [
      { ...defs[0]!, id: 'axial-smoker' },
      { ...defs[0]!, raw: { ...defs[0]!.raw, beebe_habitat: { flow_deg: NaN } } },
    ])
      expect(build('high', def).full.getObjectByName('beebe-flow-habitat')).toBeUndefined();
  });
});
