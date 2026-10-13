// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

const loadAsync = vi.fn(async (url: string) => {
  if (url.includes('missing')) throw new Error(`404 ${url}`);
  return { scene: new THREE.Group(), url };
});
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync = loadAsync;
  },
}));
const { AssetService, isGltfUrl, mergeManifests, normaliseRequest, resolveAssetUrl } =
  await import('../../src/core/assets/index.js');

describe('asset manifest helpers', () => {
  it('infers the kind from the extension', () => {
    expect(normaliseRequest('/assets/models/rock.glb')).toEqual({
      kind: 'gltf',
      url: '/assets/models/rock.glb',
    });
    expect(normaliseRequest('/assets/tex/sand.jpg?v=2')).toEqual({
      kind: 'texture',
      url: '/assets/tex/sand.jpg?v=2',
    });
    expect(isGltfUrl('a.GLTF#x')).toBe(true);
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

  it('loads ordinary textures once per option set and retains their disposal', async () => {
    const load = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockImplementation(async () => new THREE.Texture());
    try {
      const svc = new AssetService();
      const [a, b] = await Promise.all([
        svc.loadTexture('/t/sand.jpg', { repeat: [2, 3] }),
        svc.loadTexture('/t/sand.jpg', { repeat: [2, 3] }),
      ]);
      const linear = await svc.loadTexture('/t/sand.jpg', { srgb: false });
      expect(a).toBe(b);
      expect(linear).not.toBe(a);
      expect(load).toHaveBeenCalledTimes(2);
      expect(a.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(a.repeat.toArray()).toEqual([2, 3]);
      expect(a.wrapS).toBe(THREE.RepeatWrapping);
      expect(a.wrapT).toBe(THREE.RepeatWrapping);
      expect(linear.colorSpace).toBe(THREE.NoColorSpace);
      expect(svc.stats).toEqual({ gltf: 0, textures: 2 });
      const disposed = vi.fn();
      a.addEventListener('dispose', disposed);
      a.dispose();
      expect(disposed).toHaveBeenCalledOnce();
    } finally {
      load.mockRestore();
    }
  });

  it('retries failed model and texture loads', async () => {
    loadAsync.mockClear();
    const load = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(new THREE.Texture());
    try {
      const svc = new AssetService();
      await expect(svc.loadGLTF('/m/missing.glb')).rejects.toThrow('404');
      await expect(svc.loadGLTF('/m/missing.glb')).rejects.toThrow('404');
      expect(loadAsync).toHaveBeenCalledTimes(2);
      expect(svc.stats.gltf).toBe(0);
      const result = await svc.preload(['/t/sand.png']);
      expect(result).toEqual({ loaded: 0, failed: [{ url: '/t/sand.png', error: 'offline' }] });
      expect(svc.stats.textures).toBe(0);
      await svc.loadTexture('/t/sand.png');
      expect(load).toHaveBeenCalledTimes(2);
      expect(svc.stats.textures).toBe(1);
    } finally {
      load.mockRestore();
    }
  });
});

describe('shipped plain GLB fixtures', () => {
  it.each([
    ['rock_09.glb', 6628],
    ['barrel_stove.glb', 6637],
  ])(
    'parses %s geometry and ordinary embedded textures without decoders',
    async (file, vertices) => {
      const bytes = readFileSync(`public/assets/models/${file}`);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const jsonLength = new DataView(buffer).getUint32(12, true);
      const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
      expect(doc.extensionsUsed ?? []).toEqual([]);
      expect(doc.extensionsRequired ?? []).toEqual([]);
      expect(doc.images).toHaveLength(3);
      expect(
        doc.images.every((image: { mimeType: string }) => image.mimeType === 'image/jpeg'),
      ).toBe(true);
      const { GLTFLoader } = await vi.importActual<
        typeof import('three/examples/jsm/loaders/GLTFLoader.js')
      >('three/examples/jsm/loaders/GLTFLoader.js');
      // Node has no image DOM: stub image IO while exercising the real GLB parser.
      vi.stubGlobal('self', globalThis);
      const images = vi
        .spyOn(THREE.TextureLoader.prototype, 'load')
        .mockImplementation((_url, done) => {
          const texture = new THREE.Texture<HTMLImageElement>();
          done?.(texture);
          return texture;
        });
      try {
        const gltf = await new GLTFLoader().parseAsync(buffer, '');
        const meshes: THREE.Mesh[] = [];
        gltf.scene.traverse((object) => {
          if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
        });
        expect(meshes).toHaveLength(1);
        expect(meshes[0]!.geometry.getAttribute('position').count).toBe(vertices);
        expect(meshes[0]!.geometry.index!.count).toBeGreaterThan(0);
        const material = meshes[0]!.material as THREE.MeshStandardMaterial;
        expect(material.isMeshStandardMaterial).toBe(true);
        expect(material.map).toBeInstanceOf(THREE.Texture);
        expect(material.normalMap).toBeInstanceOf(THREE.Texture);
        expect(material.roughnessMap).toBeInstanceOf(THREE.Texture);
        expect(images).toHaveBeenCalledTimes(3);
      } finally {
        images.mockRestore();
        vi.unstubAllGlobals();
      }
    },
  );
});
