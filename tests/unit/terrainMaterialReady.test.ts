import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IUniform, Texture } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';

afterEach(() => vi.unstubAllGlobals());

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
