/**
 * Asset service (F0-CORE): one place that owns the three.js loaders and their
 * caches, so every package loads models and textures the same way. Import it
 * from `core/assets/index.js`; the manifest types live in `manifest.ts`.
 *
 * - `loadGLTF(url)` loads a .glb/.gltf once (Draco, Meshopt and, once a
 *   renderer is registered, KTX2 textures inside it) and returns the cached
 *   result. Callers clone `scene` if they place it more than once.
 * - `loadTexture(url, { srgb, repeat })` loads a PNG/JPEG/WebP or a `.ktx2`
 *   texture once per URL and option set.
 * - `preload(list)` warms the caches (a manifest for a site or a screen) and
 *   reports failures instead of throwing.
 *
 * URLs: a root-relative path (`/assets/...`, `/data/...`) is resolved under
 * Vite's deployment base with `publicUrl()`; absolute, data: and blob: URLs and
 * paths already under the base are used as they are. Decoders are served from
 * `public/assets/decoders/{draco,basis}/` (ATTRIBUTION.md).
 *
 * The loaders are imported lazily, so modules that only validate content (and
 * their unit tests) never pull in the decoders.
 */

import * as THREE from 'three';
import type { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { publicUrl } from '../../util/publicUrl.js';
import {
  isKtx2Url,
  normaliseRequest,
  type AssetRequest,
  type PreloadResult,
  type TextureOptions,
} from './manifest.js';

/** Where the vendored decoders live (public/assets/decoders). */
export const DECODER_PATHS = {
  draco: publicUrl('/assets/decoders/draco/'),
  basis: publicUrl('/assets/decoders/basis/'),
} as const;

/** Resolve an asset URL under the deployment base (see the module header). */
export function resolveAssetUrl(url: string, base = import.meta.env.BASE_URL): string {
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return url; // http:, data:, blob:, //host
  if (base !== '/' && base !== './' && url.startsWith(base)) return url;
  return url.startsWith('/') ? publicUrl(url, base) : url;
}

function textureKey(url: string, o: TextureOptions): string {
  const r =
    o.repeat === undefined ? '' : typeof o.repeat === 'number' ? o.repeat : o.repeat.join('x');
  return `${url}|${o.srgb === false ? 'linear' : 'srgb'}|${r}`;
}

export class AssetService {
  private renderer: THREE.WebGLRenderer | null = null;
  private gltfLoader: Promise<GLTFLoader> | null = null;
  private ktx2Loader: Promise<KTX2Loader> | null = null;
  private readonly gltfCache = new Map<string, Promise<GLTF>>();
  private readonly textureCache = new Map<string, Promise<THREE.Texture>>();

  /**
   * Register the renderer. KTX2 transcoding needs it to pick a GPU format, so
   * `.ktx2` textures (standalone or inside a glTF) work only after this call.
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /** Load a glTF/GLB once; later calls share the same promise. */
  loadGLTF(url: string): Promise<GLTF> {
    const resolved = resolveAssetUrl(url);
    let p = this.gltfCache.get(resolved);
    if (!p) {
      p = this.getGltfLoader().then((loader) => loader.loadAsync(resolved));
      // A failed load may be retried later (e.g. after a network blip).
      p.catch(() => this.gltfCache.delete(resolved));
      this.gltfCache.set(resolved, p);
    }
    return p;
  }

  /** Load a texture once per URL and option set. */
  loadTexture(url: string, options: TextureOptions = {}): Promise<THREE.Texture> {
    const resolved = resolveAssetUrl(url);
    const key = textureKey(resolved, options);
    let p = this.textureCache.get(key);
    if (!p) {
      const load = isKtx2Url(resolved)
        ? this.getKtx2Loader().then((l) => l.loadAsync(resolved) as Promise<THREE.Texture>)
        : new THREE.TextureLoader().loadAsync(resolved);
      p = load.then((texture) => {
        texture.colorSpace = options.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        if (options.repeat !== undefined) {
          const [u, v] =
            typeof options.repeat === 'number' ? [options.repeat, options.repeat] : options.repeat;
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(u, v);
        }
        texture.needsUpdate = true;
        return texture;
      });
      p.catch(() => this.textureCache.delete(key));
      this.textureCache.set(key, p);
    }
    return p;
  }

  /** Warm the caches. Never rejects; failures are listed in the result. */
  async preload(list: readonly AssetRequest[]): Promise<PreloadResult> {
    const jobs = list.map((entry) => {
      const req = normaliseRequest(entry);
      const job: Promise<unknown> =
        req.kind === 'gltf' ? this.loadGLTF(req.url) : this.loadTexture(req.url, req.options);
      return job.then(
        () => null,
        (err: unknown) => ({
          url: req.url,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    const failed = (await Promise.all(jobs)).filter(
      (f): f is { url: string; error: string } => f !== null,
    );
    return { loaded: list.length - failed.length, failed };
  }

  /** Cache sizes, for `window.__game` and tests. */
  get stats(): { gltf: number; textures: number } {
    return { gltf: this.gltfCache.size, textures: this.textureCache.size };
  }

  private getGltfLoader(): Promise<GLTFLoader> {
    this.gltfLoader ??= (async () => {
      const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      const draco = new DRACOLoader();
      draco.setDecoderPath(DECODER_PATHS.draco);
      const gltf = new GLTFLoader();
      gltf.setDRACOLoader(draco);
      gltf.setMeshoptDecoder(MeshoptDecoder);
      if (this.renderer) gltf.setKTX2Loader(await this.getKtx2Loader());
      return gltf;
    })();
    return this.gltfLoader;
  }

  private getKtx2Loader(): Promise<KTX2Loader> {
    this.ktx2Loader ??= (async () => {
      const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
      if (!this.renderer) throw new Error('KTX2 textures need Assets.setRenderer() first');
      const loader = new KTX2Loader();
      loader.setTranscoderPath(DECODER_PATHS.basis);
      loader.detectSupport(this.renderer);
      return loader;
    })();
    // Allow a retry once the renderer is registered.
    this.ktx2Loader.catch(() => {
      this.ktx2Loader = null;
    });
    return this.ktx2Loader;
  }
}

/** The shared instance. */
export const assets = new AssetService();
