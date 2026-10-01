/**
 * Boot (F0-CORE, from the top of the old `main.ts`): URL params, shell start
 * state, mission route, saved settings, the tile, the renderer and the quality
 * tier. Everything here happens before the first system initialises; the
 * result is the `BootContext` every system builds on.
 */

import { loadSavedProgress } from './systems/progress.js';
import * as THREE from 'three';
import { assets } from '../core/assets/index.js';
import { makeConfig } from '../core/Config.js';
import { EventBus } from '../core/EventBus.js';
import { readDeviceCaps, resolveQuality } from '../core/Quality.js';
import { Save } from '../core/Save.js';
import { chooseTileId, resolveMissionRoute } from '../game/MissionRouter.js';
import { TileLoader } from '../world/TileLoader.js';
import { makeExposer, type AppState, type BootContext } from './context.js';
import { applyBootModes } from './systems/modes.js';
import { readLastSite } from './systems/shell.js';

/** Show the "Dive aborted" card and record the message for tests. */
export function showFatal(message: string): void {
  window.__gameError = message;
  const el = document.createElement('div');
  el.className = 'fatal';
  el.innerHTML = `<h1>Dive aborted</h1><p></p>
    <p class="fatal-hint">Fetch a tile first:<br />
    <code>python3 tools/fetch_tile.py --id titanic --north 41.88 --south 41.58
    --east -49.80 --west -50.10</code></p>`;
  (el.querySelector('p') as HTMLParagraphElement).textContent = message;
  document.body.appendChild(el);
  console.error('[main]', message);
}

/** URL params that skip the home screen and go straight into a dive. */
const BYPASS_HOME_PARAMS = [
  'mission',
  'tile',
  'skipBriefing',
  'poi',
  'at',
  'depth',
  'debrief',
  'globe',
  'landmark',
  'preset',
  'debugTerrain',
  'debugProps',
];

/** Build the boot context, or return null after showing a fatal error. */
export async function boot(): Promise<BootContext | null> {
  const config = makeConfig();
  const bus = new EventBus();
  const params = new URLSearchParams(window.location.search);
  // D-SHELL: the home screen unless a dive param is present.
  const bypassHome = BYPASS_HOME_PARAMS.some((key) => params.has(key));
  const appState: AppState = bypassHome ? 'dive' : 'home';
  document.body.dataset.appState = appState;
  const lastSite = readLastSite();
  const shellBaseHref = (): string => {
    const base = new URL('.', window.location.href);
    const tier = params.get('tier');
    if (tier) base.searchParams.set('tier', tier);
    return base.toString();
  };
  const loader = new TileLoader();
  // B3: `?mission=<id>` (docs/missions.md) names the tile and the content
  // folder; without it (or if its mission.json is missing) this is the free dive.
  const [index, route, progress] = await Promise.all([
    loader.loadIndex(),
    resolveMissionRoute(params),
    loadSavedProgress(),
  ]);
  const requested = route?.tileId ?? params.get('tile');
  const tileId = chooseTileId(requested, index, config.defaultTileId);
  // C5: saved settings (docs/settings.md). The saved graphics tier applies
  // unless `?tier=` is given; terrain detail is read once, when the terrain is built.
  const save = new Save({ config, bus });
  const settings = save.get();
  const { baseHintRangeFactor } = applyBootModes(config, settings);
  config.terrain.detailStrength = settings.detailStrength;
  const debugTerrain = params.get('debugTerrain') === '1';
  // A2: `?depth=300` spawns the boat 300 m down (clamped above the seabed),
  // for the depth-band screenshots in docs/atmosphere.md.
  const depthParam = Number(params.get('depth'));
  const spawnDepth = Number.isFinite(depthParam) && depthParam > 0 ? depthParam : null;

  // ---------------------------------------------------------------- loading
  let tile;
  try {
    tile = await loader.load(tileId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    bus.emit('tile:error', { id: tileId, error: message });
    showFatal(`Could not load tile "${tileId}": ${message}`);
    return null;
  }
  const { meta } = tile;
  bus.emit('tile:loaded', { meta });

  // ---------------------------------------------------------------- renderer
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  // Quality tiers v2: `?tier=low|medium|high|ultra` beats the saved setting,
  // and `auto` (the default) detects from the GPU and device (core/Quality.ts).
  const quality = resolveQuality(
    params.get('tier'),
    settings.graphicsTier,
    readDeviceCaps(renderer.getContext()),
  );
  const tier = quality.tier;
  console.info(`[quality] ${tier} (${quality.source}: ${quality.reason})`);
  renderer.setPixelRatio(
    Math.min(config.quality.tiers[tier].maxPixelRatio, window.devicePixelRatio || 1),
  );
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES lifts the very dark midtones the abyss lives in and keeps the
  // headlight's hot spot from clipping to white.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // KTX2 textures pick a GPU format from the renderer (core/assets).
  assets.setRenderer(renderer);

  const scene = new THREE.Scene();

  return {
    params,
    config,
    bus,
    app: { state: appState, lastSite },
    shellBaseHref,
    loader,
    index,
    route,
    tileId,
    save,
    progress,
    settings,
    baseHintRangeFactor,
    tier,
    quality,
    postFx: settings.postFx,
    debugTerrain,
    spawnDepth,
    tile,
    meta,
    canvas,
    renderer,
    scene,
    ...makeExposer(),
  };
}
