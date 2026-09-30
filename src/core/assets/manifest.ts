/**
 * Asset manifest types (F0-CORE). A manifest lists what a site, screen or
 * feature needs loaded before it looks right; `AssetService.preload()` warms
 * the caches from it. Pure data and pure helpers only, so content tools and
 * unit tests can use them without three.js loaders.
 */

export interface TextureOptions {
  /** Colour data (albedo, emissive): sRGB. Data maps (normal, roughness): false. Default true. */
  srgb?: boolean;
  /** Tile the texture: repeats across U and V (one number = both). Sets RepeatWrapping. */
  repeat?: number | readonly [number, number];
}

export type AssetKind = 'gltf' | 'texture';

/** A glTF / GLB model (Draco, Meshopt and KTX2 inside it are handled). */
export interface GltfRequest {
  kind: 'gltf';
  url: string;
}

/** A PNG / JPEG / WebP or `.ktx2` texture. */
export interface TextureRequest {
  kind: 'texture';
  url: string;
  options?: TextureOptions;
}

/**
 * One manifest entry: a bare URL (the kind comes from the extension, `.glb` /
 * `.gltf` are models, anything else a texture) or an explicit request.
 */
export type AssetRequest = string | GltfRequest | TextureRequest;

/** A named list of assets, e.g. one per dive site or per vehicle. */
export interface AssetManifest {
  /** Stable id, e.g. `site:titanic` or `vehicle:hero-sub`. */
  id: string;
  assets: readonly AssetRequest[];
}

export interface PreloadResult {
  loaded: number;
  /** URLs that failed, with the reason. */
  failed: Array<{ url: string; error: string }>;
}

/** True for a `.glb` / `.gltf` URL (query and hash ignored). */
export function isGltfUrl(url: string): boolean {
  return /\.(glb|gltf)(\?|#|$)/i.test(url);
}

/** True for a `.ktx2` URL (query and hash ignored). */
export function isKtx2Url(url: string): boolean {
  return /\.ktx2(\?|#|$)/i.test(url);
}

/** Turn a manifest entry into an explicit request. */
export function normaliseRequest(entry: AssetRequest): GltfRequest | TextureRequest {
  if (typeof entry !== 'string') return entry;
  return isGltfUrl(entry) ? { kind: 'gltf', url: entry } : { kind: 'texture', url: entry };
}

/** Merge manifests, dropping repeated requests (same kind, URL and options). */
export function mergeManifests(id: string, manifests: readonly AssetManifest[]): AssetManifest {
  const seen = new Set<string>();
  const assets: Array<GltfRequest | TextureRequest> = [];
  for (const manifest of manifests) {
    for (const entry of manifest.assets) {
      const req = normaliseRequest(entry);
      const key = JSON.stringify(req);
      if (seen.has(key)) continue;
      seen.add(key);
      assets.push(req);
    }
  }
  return { id, assets };
}
