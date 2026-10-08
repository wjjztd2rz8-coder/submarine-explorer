// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { BIOMES, DEFAULT_BIOME } from '../../src/world/TerrainBiome.js';
import { Terrain } from '../../src/world/Terrain.js';
import { makeSyntheticTile } from './helpers.js';
import beebeDoc from '../../data/landmarks/beebe-vent-field/props.json';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import { VENT_BUILDERS } from '../../src/world/props/builders/vents.js';
import { countGeo, hashString } from '../../src/world/props/geo/shared.js';

const digest = (value: string | ArrayBufferView): string =>
  createHash('sha256').update(value).digest('hex');

it('850: other sites retain byte-identical biome, terrain buffers, uniforms, shaders and opening presets', () => {
  const evidence: Record<string, unknown> = {};
  for (const [id, biome] of [...Object.entries(BIOMES), ['unknown', DEFAULT_BIOME] as const]) {
    if (id === 'beebe-vent-field') continue;
    const tiers: Record<string, unknown> = {};
    for (const tier of ['low', 'high'] as const) {
      const terrain = new Terrain(makeSyntheticTile({ id }), makeConfig().terrain, tier);
      try {
        const meshes = terrain.group.children.filter(
          (o) => (o as THREE.Mesh).isMesh,
        ) as THREE.Mesh[];
        const material = meshes[0]!.material as THREE.MeshStandardMaterial;
        const shader = {
          ...THREE.ShaderLib.standard,
          uniforms: { ...THREE.ShaderLib.standard.uniforms },
        };
        material.onBeforeCompile(
          shader as Parameters<typeof material.onBeforeCompile>[0],
          {} as THREE.WebGLRenderer,
        );
        const uniforms = Object.fromEntries(
          Object.entries(material.userData.uniforms).filter(
            ([key]) => !key.startsWith('tAlb') && !key.startsWith('tNrm'),
          ),
        );
        tiers[tier] = {
          buffers: meshes.map((mesh) =>
            Object.fromEntries([
              ...Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [
                key,
                digest(attribute.array),
              ]),
              ['index', digest(mesh.geometry.index!.array)],
            ]),
          ),
          uniforms: digest(JSON.stringify(uniforms)),
          shader: digest(shader.vertexShader + shader.fragmentShader),
          cache: material.customProgramCacheKey(),
        };
      } finally {
        terrain.dispose();
      }
    }
    evidence[id] = { biome: digest(JSON.stringify(biome)), tiers };
  }
  // Only the Beebe authored opening may change; shared spawn logic stays identical.
  evidence.spawn = digest(
    readFileSync('src/game/Spawn.ts', 'utf8').replace(
      /  'beebe-vent-field': \{[\s\S]*?\n  \},/,
      '',
    ),
  );
  expect(evidence).toMatchSnapshot();
});

// The additive dispatch is Beebe-only; pin the rest of the shared placement code too.
it('keeps shared prop placement byte-identical outside the Beebe dispatch', () => {
  const source = readFileSync('src/world/Props.ts', 'utf8')
    .replace(/    \/\/ 850: Beebe[\s\S]*?def.raw.beebe_habitat !== null\) \|\|\n/, '')
    .replace(
      "import { beebeRenderedGround, beebeSeabedMaterial } from './props/geo/beebe.js';\n",
      '',
    )
    .replace(
      /        \/\/ 930 Beebe material begin[\s\S]*?        \/\/ 930 Beebe material end\n/,
      '',
    )
    .replace(/    \/\/ 850 Beebe ground begin[\s\S]*?    \/\/ 850 Beebe ground end\n/, '');
  expect(digest(source)).toBe('c73869437510f21786195dde1bde0497b08de26dbaab636d04b8ff93a43a5277');
});

it('930: preserves the 850 Beebe geometry, clumps, collision and vent sources on every tier', () => {
  const cfg = makeConfig();
  const defs = parsePropsDoc(beebeDoc, cfg.props).props;
  const evidence: Record<string, unknown> = {};
  for (const tier of ['low', 'medium', 'high', 'ultra']) {
    evidence[tier] = defs.map((def) => {
      const built = VENT_BUILDERS.chimney({
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg: cfg.props,
        tier,
        groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
      });
      const meshes: unknown[] = [];
      built.full.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push({
          name: object.name,
          buffers: Object.fromEntries(
            Object.entries(object.geometry.attributes as Record<string, THREE.BufferAttribute>)
              // Only the apron finish changes: radial vertex tint becomes neutral cavity data.
              .filter(
                ([name]) =>
                  object.name !== 'beebe-mineral-seabed' || !['color', 'aCavity'].includes(name),
              )
              .map(([name, attribute]) => [name, digest(attribute.array)]),
          ),
          index: object.geometry.index ? digest(object.geometry.index.array) : null,
          instances:
            object instanceof THREE.InstancedMesh ? digest(object.instanceMatrix.array) : null,
          userData: digest(JSON.stringify(object.userData)),
        });
      });
      if (tier === 'low' && def.id === 'beebe-chimney-1') {
        console.log(`BEEBE-930-LOW ${JSON.stringify(countGeo(built.full))}`);
      }
      return {
        id: def.id,
        placement: digest(JSON.stringify({ bounds: built.bounds, colliders: built.colliders })),
        ventTop: built.full.userData.ventTop,
        geometry: digest(JSON.stringify(meshes)),
        budget: countGeo(built.full),
        impostor: countGeo(built.impostor),
      };
    });
  }
  // Captured from the unmodified 850 builder, before replacing the apron material.
  expect(evidence).toMatchSnapshot();
});
