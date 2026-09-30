import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

const loadAsync = vi.fn(async (url: string) => {
  if (url.includes('missing')) throw new Error(`404 ${url}`);
  return { scene: new THREE.Group(), url };
});
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setDRACOLoader(): void {}
    setMeshoptDecoder(): void {}
    setKTX2Loader(): void {}
    loadAsync = loadAsync;
  },
}));
vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
  DRACOLoader: class {
    path = '';
    setDecoderPath(p: string): void {
      this.path = p;
    }
  },
}));

const {
  AssetService,
  DECODER_PATHS,
  isGltfUrl,
  isKtx2Url,
  mergeManifests,
  normaliseRequest,
  resolveAssetUrl,
} = await import('../../src/core/assets/index.js');

describe('asset manifest helpers', () => {
  it('infers the kind from the extension', () => {
    expect(normaliseRequest('/assets/models/rock.glb')).toEqual({
      kind: 'gltf',
      url: '/assets/models/rock.glb',
    });
    expect(normaliseRequest('/assets/tex/sand.ktx2?v=2')).toEqual({
      kind: 'texture',
      url: '/assets/tex/sand.ktx2?v=2',
    });
    expect(isGltfUrl('a.GLTF#x')).toBe(true);
    expect(isKtx2Url('a.ktx2?x')).toBe(true);
    expect(isKtx2Url('a.png')).toBe(false);
  });

  it('merges manifests without repeats', () => {
    const m = mergeManifests('site:titanic', [
      { id: 'a', assets: ['/a.glb', { kind: 'texture', url: '/t.png', options: { srgb: false } }] },
      { id: 'b', assets: [{ kind: 'gltf', url: '/a.glb' }, '/t.png'] },
    ]);
    expect(m.id).toBe('site:titanic');
    expect(m.assets).toHaveLength(3);
  });
});

describe('resolveAssetUrl', () => {
  it('puts root paths under the deployment base once', () => {
    expect(resolveAssetUrl('/assets/x.glb', '/')).toBe('/assets/x.glb');
    expect(resolveAssetUrl('/assets/x.glb', '/submarine-explorer/')).toBe(
      '/submarine-explorer/assets/x.glb',
    );
    expect(resolveAssetUrl('/submarine-explorer/assets/x.glb', '/submarine-explorer/')).toBe(
      '/submarine-explorer/assets/x.glb',
    );
  });

  it('leaves absolute, data and relative URLs alone', () => {
    for (const url of ['https://x.org/a.glb', 'data:image/png;base64,AA', 'blob:abc', 'a.png']) {
      expect(resolveAssetUrl(url, '/b/')).toBe(url);
    }
  });

  it('serves the vendored decoders from public/assets/decoders', () => {
    expect(DECODER_PATHS.draco).toMatch(/assets\/decoders\/draco\/$/);
    expect(DECODER_PATHS.basis).toMatch(/assets\/decoders\/basis\/$/);
  });
});

describe('AssetService', () => {
  it('loads each glTF once and shares the promise', async () => {
    loadAsync.mockClear();
    const svc = new AssetService();
    const [a, b] = await Promise.all([svc.loadGLTF('/m/a.glb'), svc.loadGLTF('/m/a.glb')]);
    expect(a).toBe(b);
    expect(loadAsync).toHaveBeenCalledTimes(1);
    expect(svc.stats).toEqual({ gltf: 1, textures: 0 });
  });

  it('forgets failures so a later call can retry, and preload reports them', async () => {
    const svc = new AssetService();
    const result = await svc.preload(['/m/ok.glb', '/m/missing.glb']);
    expect(result.loaded).toBe(1);
    expect(result.failed).toEqual([{ url: '/m/missing.glb', error: '404 /m/missing.glb' }]);
    expect(svc.stats.gltf).toBe(1);
  });

  it('refuses KTX2 until a renderer is registered', async () => {
    const svc = new AssetService();
    await expect(svc.loadTexture('/t/a.ktx2')).rejects.toThrow(/setRenderer/);
    expect(svc.stats.textures).toBe(0);
  });
});
