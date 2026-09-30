/**
 * Asset service entry point (F0-CORE). `assets` is the shared instance; see
 * `AssetService.ts` for loading and caching and `manifest.ts` for the types.
 */

export { AssetService, DECODER_PATHS, assets, resolveAssetUrl } from './AssetService.js';
export * from './manifest.js';
