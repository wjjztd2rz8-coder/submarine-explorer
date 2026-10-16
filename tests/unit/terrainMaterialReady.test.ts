import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IUniform, Texture } from 'three';
import * as THREE from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';
import { smoothstep } from '../../src/util/math.js';

afterEach(() => vi.unstubAllGlobals());

describe('terrain albedo distance filtering', () => {
  it.each(['low', 'medium', 'high'] as const)(
    '%s: suppresses distant carbonate aliasing while preserving nearby detail',
    (tier) => {
      const result = createTerrainMaterial({
        config: DEFAULT_CONFIG.terrain,
        tier,
        biome: biomeFor('lost-city'),
        exaggeration: 1,
      });
      try {
        const shader = {
          ...THREE.ShaderLib.standard,
          uniforms: { ...THREE.ShaderLib.standard.uniforms },
        };
        result.material.onBeforeCompile(
          shader as Parameters<typeof result.material.onBeforeCompile>[0],
          {} as THREE.WebGLRenderer,
        );
        const source = shader.fragmentShader;
        const gain = Number(source.match(/const float TERRAIN_FAR_MIP_BIAS = ([\d.]+);/)![1]);
        const ramp = source.match(
          /float bias = TERRAIN_FAR_MIP_BIAS \* smoothstep\(([\d.]+), ([\d.]+), dist\);/,
        )!;
        const bias = (distance: number) =>
          gain * smoothstep(Number(ramp[1]), Number(ramp[2]), distance);
        expect(bias(0)).toBe(0);
        expect(bias(3)).toBe(0);
        expect(bias(25)).toBeCloseTo(5);
        expect(bias(1000)).toBeCloseTo(5);
        const distances = [3, 10, 15, 20, 25];
        for (let i = 1; i < distances.length; i++)
          expect(bias(distances[i])).toBeGreaterThan(bias(distances[i - 1]));
        // Every triplanar albedo tap, including breakup, uses the same bias.
        const albedo = source.slice(
          source.indexOf('vec3 terrainAlbedo('),
          source.indexOf('vec4 terrainNormalRough('),
        );
        const taps = [...albedo.matchAll(/texture2D\(([^)]+)\)/g)];
        expect(taps).toHaveLength(4);
        for (const tap of taps) expect(tap[1]).toMatch(/, bias$/);
        expect(source.includes('#define TERRAIN_BREAKUP')).toBe(tier !== 'low');
        expect(source.includes('#define TERRAIN_PBR_NORMALS')).toBe(tier !== 'low');
        // Low keeps the extra albedo fetch behind the existing compile-time switch.
        expect(albedo).toMatch(/#ifdef TERRAIN_BREAKUP\s+if \(brk\)/);
      } finally {
        result.material.dispose();
        for (const texture of result.textures) texture.dispose();
      }
    },
  );
});

describe('terrain map readiness and temporary texture lifetime', () => {
  for (const tier of ['low', 'high'] as const) {
    it(`${tier}: releases placeholders only after every required map is bound`, async () => {
      const images: Array<{ src: string; onload: () => void }> = [];
      vi.stubGlobal('document', {});
      vi.stubGlobal(
        'Image',
        class {
          src = '';
          onload = () => {};
          constructor() {
            images.push(this);
          }
        },
      );
      const result = createTerrainMaterial({
        config: DEFAULT_CONFIG.terrain,
        tier,
        biome: { ...biomeFor('test'), a: 'sand', b: 'sand', c: 'basalt' },
        exaggeration: 1,
      });
      const uniforms = result.material.userData.uniforms as Record<string, IUniform<Texture>>;
      const albedoDisposed = vi.fn();
      const normalDisposed = vi.fn();
      result.textures[0].addEventListener('dispose', albedoDisposed);
      result.textures[1].addEventListener('dispose', normalDisposed);
      // Shared A/B slots fetch once; normals are fetched only by the high tier.
      expect(images).toHaveLength(tier === 'low' ? 2 : 4);
      let ready = false;
      void result.texturesReady.then(() => (ready = true));
      try {
        for (const image of images.slice(0, -1)) image.onload();
        await Promise.resolve();
        expect(ready).toBe(false);
        expect(albedoDisposed).not.toHaveBeenCalled();
        expect(normalDisposed).not.toHaveBeenCalled();
        images.at(-1)!.onload();
        await result.texturesReady;
        expect(ready).toBe(true);
        expect(albedoDisposed).toHaveBeenCalledTimes(1);
        expect(normalDisposed).toHaveBeenCalledTimes(1);
        expect(uniforms.tAlbA.value).toBe(uniforms.tAlbB.value);
        for (const key of [
          'tAlbA',
          'tAlbB',
          'tAlbC',
          ...(tier === 'high' ? ['tNrmA', 'tNrmB', 'tNrmC'] : []),
        ]) {
          expect(result.textures.slice(2)).toContain(uniforms[key].value);
          expect(images).toContain(uniforms[key].value.image);
        }
        expect(await result.rockTexture).toBe(uniforms.tAlbC.value);
      } finally {
        result.material.dispose();
        for (const texture of result.textures) texture.dispose();
      }
    });
  }

  for (const tier of ['low', 'high'] as const) {
    for (const failed of [
      'sand_a.jpg',
      'basalt_a.jpg',
      'all',
      ...(tier === 'high' ? ['sand_n.jpg'] : []),
    ]) {
      it(`${tier}: settles failed ${failed} maps while keeping required fallback textures alive`, async () => {
        const images: Array<{ src: string; onload: () => void; onerror: () => void }> = [];
        vi.stubGlobal('document', {});
        vi.stubGlobal(
          'Image',
          class {
            src = '';
            onload = () => {};
            onerror = () => {};
            constructor() {
              images.push(this);
            }
          },
        );
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = createTerrainMaterial({
          config: DEFAULT_CONFIG.terrain,
          tier,
          biome: { ...biomeFor('test'), a: 'sand', b: 'sand', c: 'basalt' },
          exaggeration: 1,
        });
        const uniforms = result.material.userData.uniforms as Record<string, IUniform<Texture>>;
        const albedo = result.textures[0];
        const normal = result.textures[1];
        const albedoDisposed = vi.fn();
        const normalDisposed = vi.fn();
        albedo.addEventListener('dispose', albedoDisposed);
        normal.addEventListener('dispose', normalDisposed);
        let ready = false;
        void result.texturesReady.then(() => (ready = true));
        try {
          const fails = (src: string) => failed === 'all' || src.endsWith(failed);
          for (const image of images) {
            if (fails(image.src)) image.onerror();
            else image.onload();
          }
          // Failure must settle just like a successful load, without a timeout.
          for (let i = 0; i < 8; i++) await Promise.resolve();
          expect(ready).toBe(true);
          const needsAlbedo = Object.entries(uniforms).some(
            ([key, u]) => key.startsWith('tAlb') && u.value === albedo,
          );
          const needsNormal =
            tier === 'high' &&
            Object.entries(uniforms).some(
              ([key, u]) => key.startsWith('tNrm') && u.value === normal,
            );
          expect(albedoDisposed).toHaveBeenCalledTimes(needsAlbedo ? 0 : 1);
          expect(normalDisposed).toHaveBeenCalledTimes(needsNormal ? 0 : 1);
          for (const [key, set] of [
            ['A', 'sand'],
            ['B', 'sand'],
            ['C', 'basalt'],
          ]) {
            expect(uniforms[`tAlb${key}`].value === albedo).toBe(fails(`${set}_a.jpg`));
            if (tier === 'high')
              expect(uniforms[`tNrm${key}`].value === normal).toBe(fails(`${set}_n.jpg`));
          }
          expect(await result.rockTexture).toBe(
            fails('basalt_a.jpg') ? null : uniforms.tAlbC.value,
          );
        } finally {
          warn.mockRestore();
          result.material.dispose();
          for (const texture of result.textures) texture.dispose();
        }
      });
    }
  }

  it('is immediately ready without browser image loading under Node', async () => {
    const result = createTerrainMaterial({
      config: DEFAULT_CONFIG.terrain,
      tier: 'low',
      biome: biomeFor('test'),
      exaggeration: 1,
    });
    try {
      await expect(result.texturesReady).resolves.toBeUndefined();
      expect(await result.rockTexture).toBeNull();
      expect(result.textures).toHaveLength(2);
    } finally {
      result.material.dispose();
      for (const texture of result.textures) texture.dispose();
    }
  });
});
