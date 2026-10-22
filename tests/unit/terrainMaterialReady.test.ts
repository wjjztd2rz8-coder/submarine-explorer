import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IUniform, Texture } from 'three';
import * as THREE from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';
import { smoothstep } from '../../src/util/math.js';

afterEach(() => vi.unstubAllGlobals());

/** Keep browser completion order under test control without creating a renderer. */
function controlledImages() {
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
  return images;
}

async function flushMapCallbacks() {
  // Drain bindings, Promise.all and readiness observers, without advancing time.
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

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
      const images = controlledImages();
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
        const images = controlledImages();
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

  for (const tier of ['low', 'high'] as const) {
    for (const beforeDispose of ['none', 'some'] as const) {
      for (const order of ['forward', 'reverse'] as const) {
        it.each(['none', 'sand_a.jpg', 'basalt_a.jpg', 'all'])(
          `${tier}: ${beforeDispose} maps settled at teardown, ${order} completion, failed %s; replacement stays isolated`,
          async (failed) => {
            const images = controlledImages();
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const options = {
              config: DEFAULT_CONFIG.terrain,
              tier,
              biome: { ...biomeFor('test'), a: 'sand', b: 'sand', c: 'basalt' } as const,
              exaggeration: 1,
            };
            const old = createTerrainMaterial(options);
            const requestCount = tier === 'low' ? 2 : 4;
            const oldImages = images.slice();
            const replacement = createTerrainMaterial(options);
            const replacementImages = images.slice(requestCount);
            const oldDisposed = old.textures.map((texture) => {
              const spy = vi.fn();
              texture.addEventListener('dispose', spy);
              return spy;
            });
            const replacementDisposed = replacement.textures.map((texture) => {
              const spy = vi.fn();
              texture.addEventListener('dispose', spy);
              return spy;
            });
            const liveUniforms = replacement.material.userData.uniforms as Record<string, IUniform>;
            const fails = (src: string) => failed === 'all' || src.endsWith(failed);
            const settle = (image: (typeof images)[number]) => {
              if (fails(image.src)) image.onerror();
              else image.onload();
            };
            let oldReady = false;
            let liveReady = false;
            let rock: Texture | null | 'pending' = 'pending';
            void old.texturesReady.then(() => (oldReady = true));
            void replacement.texturesReady.then(() => (liveReady = true));
            void old.rockTexture.then((texture) => (rock = texture));
            try {
              // A/B share requests within an owner, never across owners with identical URLs.
              expect(oldImages).toHaveLength(requestCount);
              expect(replacementImages).toHaveLength(requestCount);
              expect(new Set(oldImages.map((image) => image.src)).size).toBe(requestCount);
              expect(replacementImages.map((image) => image.src)).toEqual(
                oldImages.map((image) => image.src),
              );
              expect(old.textures).toHaveLength(requestCount + 2);
              expect(replacement.textures).toHaveLength(requestCount + 2);
              for (const texture of replacement.textures)
                expect(old.textures).not.toContain(texture);

              const pending = order === 'forward' ? [...oldImages] : [...oldImages].reverse();
              if (beforeDispose === 'some') {
                settle(pending.shift()!);
                await flushMapCallbacks();
              }
              expect(oldReady).toBe(false);
              const cImage = oldImages.find((image) => image.src.endsWith('basalt_a.jpg'))!;
              if (pending.includes(cImage)) expect(rock).toBe('pending');
              else
                expect(rock).toBe(
                  fails(cImage.src) ? null : old.textures[oldImages.indexOf(cImage) + 2],
                );

              // Match Terrain.dispose's ownership order; material disposal alone does not own maps.
              old.material.dispose();
              for (const texture of old.textures) texture.dispose();
              expect(oldDisposed.every((spy) => spy.mock.calls.length > 0)).toBe(true);
              await flushMapCallbacks();
              expect(oldReady).toBe(false);

              // Leave a replacement request pending while old callbacks settle. In reverse order
              // the rock albedo can be ready before the final high-tier normal map.
              const livePending =
                order === 'forward' ? [...replacementImages].reverse() : [...replacementImages];
              const liveLast = livePending.pop()!;
              for (const image of livePending) settle(image);
              await flushMapCallbacks();
              expect(liveReady).toBe(false);
              const uniformValues = () =>
                Object.fromEntries(
                  Object.entries(liveUniforms).map(([key, uniform]) => [
                    key,
                    uniform.value instanceof THREE.Texture
                      ? uniform.value.uuid
                      : JSON.parse(JSON.stringify(uniform.value)),
                  ]),
                );
              const snapshot = uniformValues();
              const textureState = replacement.textures.map((texture) => ({
                image: texture.image,
                version: texture.version,
                sourceVersion: texture.source.version,
              }));
              for (const image of pending) {
                settle(image);
                await flushMapCallbacks();
                expect(uniformValues()).toEqual(snapshot);
                replacement.textures.forEach((texture, i) => {
                  expect(texture.image).toBe(textureState[i].image);
                  expect(texture.version).toBe(textureState[i].version);
                  expect(texture.source.version).toBe(textureState[i].sourceVersion);
                });
                expect(replacementDisposed.every((spy) => spy.mock.calls.length === 0)).toBe(true);
                expect(liveReady).toBe(false);
              }
              await expect(old.texturesReady).resolves.toBeUndefined();
              expect(oldReady).toBe(true);
              // Disposing is not cancellation: retain the existing success/null promise contract.
              const oldRock = fails(cImage.src)
                ? null
                : old.textures[oldImages.indexOf(cImage) + 2];
              await expect(old.rockTexture).resolves.toBe(oldRock);
              expect(old.textures).toHaveLength(requestCount + 2);
              expect(images).toHaveLength(requestCount * 2);
              // Repeated Three dispose events are harmless; require release, not exactly once.
              expect(oldDisposed.every((spy) => spy.mock.calls.length > 0)).toBe(true);

              settle(liveLast);
              await expect(replacement.texturesReady).resolves.toBeUndefined();
              expect(liveReady).toBe(true);
              expect(liveUniforms.tAlbA.value).toBe(liveUniforms.tAlbB.value);
              expect(liveUniforms.tNrmA.value).toBe(liveUniforms.tNrmB.value);
              for (const [suffix, set] of [
                ['A', 'sand'],
                ['B', 'sand'],
                ['C', 'basalt'],
              ]) {
                for (const [prefix, file, fallback] of [
                  ['tAlb', `${set}_a.jpg`, 0],
                  ...(tier === 'high' ? [['tNrm', `${set}_n.jpg`, 1] as const] : []),
                ] as const) {
                  const bound = liveUniforms[`${prefix}${suffix}`].value as Texture;
                  if (fails(file)) {
                    expect(bound).toBe(replacement.textures[fallback]);
                    expect(replacementDisposed[fallback]).not.toHaveBeenCalled();
                  } else {
                    expect(replacement.textures.slice(2)).toContain(bound);
                    expect(bound.image).toBe(
                      replacementImages.find((image) => image.src.endsWith(file)),
                    );
                    expect(
                      replacementDisposed[replacement.textures.indexOf(bound)],
                    ).not.toHaveBeenCalled();
                  }
                }
              }
              await expect(replacement.rockTexture).resolves.toBe(
                fails('basalt_a.jpg') ? null : liveUniforms.tAlbC.value,
              );
            } finally {
              warn.mockRestore();
              old.material.dispose();
              for (const texture of old.textures) texture.dispose();
              replacement.material.dispose();
              for (const texture of replacement.textures) texture.dispose();
            }
          },
        );
      }
    }

    it.each(['success', 'error'])(
      `${tier}: disposal between Image %s callbacks and promise bindings still settles`,
      async (outcome) => {
        const images = controlledImages();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = createTerrainMaterial({
          config: DEFAULT_CONFIG.terrain,
          tier,
          biome: { ...biomeFor('test'), a: 'sand', b: 'sand', c: 'basalt' },
          exaggeration: 1,
        });
        let ready = false;
        void result.texturesReady.then(() => (ready = true));
        try {
          for (const image of [...images].reverse()) {
            if (outcome === 'success') image.onload();
            else image.onerror();
          }
          expect(ready).toBe(false);
          result.material.dispose();
          for (const texture of result.textures) texture.dispose();
          await expect(result.texturesReady).resolves.toBeUndefined();
          expect(ready).toBe(true);
          const cImage = images.find((image) => image.src.endsWith('basalt_a.jpg'))!;
          await expect(result.rockTexture).resolves.toBe(
            outcome === 'success' ? result.textures[images.indexOf(cImage) + 2] : null,
          );
        } finally {
          warn.mockRestore();
          result.material.dispose();
          for (const texture of result.textures) texture.dispose();
        }
      },
    );
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
