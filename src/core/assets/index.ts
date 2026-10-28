/**
 * Asset service entry point. `assets` is the shared instance; see
 * `AssetService.ts` for loading and caching and `manifest.ts` for the types.
 */

export { AssetService, assets, resolveAssetUrl } from './AssetService.js';
export * from './manifest.js';
