/** Resolve route, saved preferences, renderer and quality before starting Home or a selected dive. */

import { DailySave } from '../game/DailySave.js';
import { dailyDive, dailyMission, utcDate } from '../game/Daily.js';
import { loadMissionSummaries } from '../game/Mission.js';
import { unlockedDailySites } from './systems/daily.js';
import { loadSavedProgress } from './systems/progress.js';
import * as THREE from 'three';
import { makeConfig } from '../core/Config.js';
import { EventBus } from '../core/EventBus.js';
import { readDeviceCaps, resolveQuality } from '../core/Quality.js';
import { Save } from '../core/Save.js';
import { chooseTileId, resolveMissionRoute } from '../game/MissionRouter.js';
import { TileLoader } from '../world/TileLoader.js';
import { makeExposer, type AppState, type BootContext } from './context.js';
import { resolveEffective } from '../game/EffectiveSettings.js';
import { readLastSite } from './systems/shell.js';
import { shellUrl } from '../util/navigation.js';

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
  // Capture before any loading: crossing UTC midnight must not change this run's seed.
  const bootDate = utcDate();
  // Daily route selection must use the saved mode, just like ordinary missions.
  const save = new Save({ config, bus });
  const settings = save.get();
  // D-SHELL: the home screen unless a dive param is present.
  const bypassHome = BYPASS_HOME_PARAMS.some((key) => params.has(key));
  const appState: AppState = bypassHome ? 'dive' : 'home';
  document.body.dataset.appState = appState;
  const lastSite = readLastSite();
  const shellBaseHref = (): string => shellUrl(window.location.href, params);
  const loader = new TileLoader();
  // `?mission=<id>` (docs/missions.md) names the tile and the content
  // folder; without it (or if its mission.json is missing) this is the free dive.
  const [index, initialRoute, progress] = await Promise.all([
    loader.loadIndex(),
    resolveMissionRoute(params),
    loadSavedProgress(),
  ]);
  let route = initialRoute;
  let daily = null;
  if (params.get('daily') === bootDate) {
    const summaries = await loadMissionSummaries();
    daily = dailyDive(bootDate, unlockedDailySites(summaries, index));
    if (daily) {
      route = await resolveMissionRoute(new URLSearchParams({ mission: daily.site }));
      if (route) route.def = dailyMission(route.def, daily);
      else daily = null;
    }
  }
  const requested = route?.tileId ?? params.get('tile');
  const tileId = chooseTileId(requested, index, config.defaultTileId);
  // Saved settings (docs/settings.md). The saved graphics tier applies
  // unless `?tier=` is given; terrain detail is read once, when the terrain is built.
  const effective = resolveEffective(settings, settings.gameplayMode, daily, config);
  const debugTerrain = params.get('debugTerrain') === '1';
  // `?depth=300` spawns the boat 300 m down (clamped above the seabed),
  // for the depth-band screenshots in docs/atmosphere.md.
  const depthParam = Number(params.get('depth'));
  const spawnDepth = Number.isFinite(depthParam) && depthParam > 0 ? depthParam : null;

  // ---------------------------------------------------------------- renderer
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  // Quality tiers v2: `?tier=low|medium|high` beats the saved setting,
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

  const scene = new THREE.Scene();

  return {
    params,
    daily,
    dailySave: new DailySave(),
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
    effective,
    tier,
    quality,
    postFx: settings.postFx,
    debugTerrain,
    spawnDepth,
    canvas,
    renderer,
    scene,
    ...makeExposer(),
  };
}
