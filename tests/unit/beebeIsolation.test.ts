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
    .replace("import { beebeRenderedGround } from './props/geo/beebe.js';\n", '')
    .replace(/    \/\/ 850 Beebe ground begin[\s\S]*?    \/\/ 850 Beebe ground end\n/, '');
  expect(digest(source)).toBe('c73869437510f21786195dde1bde0497b08de26dbaab636d04b8ff93a43a5277');
});
