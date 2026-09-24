/**
 * Bootstrap and game loop.
 *
 * Loop structure (see docs/architecture.md):
 *   - Time.tick() converts the real frame delta into N fixed 60 Hz steps.
 *   - Each step advances Submarine physics with the sampled input.
 *   - Rendering then happens once, using the real frame delta for camera
 *     smoothing and animation, so visuals are smooth at any refresh rate.
 *
 * `window.__gameReady` is set to true once the first frame has been presented;
 * the Playwright smoke test waits on it.
 */

import * as THREE from 'three';
import { AudioSystem } from './audio/AudioSystem.js';
import { makeConfig, resolveGraphicsTier } from './core/Config.js';
import { EventBus } from './core/EventBus.js';
import { Input } from './core/Input.js';
import { Time } from './core/Time.js';
import { Atmosphere, atmosphereTier } from './render/Atmosphere.js';
import { Headlights } from './render/Headlights.js';
import { MarineSnow } from './render/MarineSnow.js';
import { CameraRig } from './sub/CameraRig.js';
import { SubMesh } from './sub/SubMesh.js';
import { Submarine } from './sub/Submarine.js';
import { HUD, uiScaleFactors } from './ui/HUD.js';
import { MissionSelect } from './ui/MissionSelect.js';
import { Sonar } from './ui/Sonar.js';
import { Waypoints } from './ui/Waypoints.js';
import { UnderwaterPass } from './shaders/underwater.js';
import { Landmarks } from './world/Landmarks.js';
import { Terrain } from './world/Terrain.js';
import { TileLoader } from './world/TileLoader.js';
import { Water } from './world/Water.js';
// --- D-CURRENTS begin ---
import { Currents } from './world/Currents.js';
// --- D-CURRENTS end ---
// --- D-POWER begin ---
import { Power } from './game/Power.js';
// --- D-POWER end ---
// --- C3 begin ---
import { PresetSystem } from './world/presets/Presets.js';
import { latLonToWorld } from './util/geo.js';
import { fetchContentJson } from './game/ContentPath.js';
// --- C3 end ---
// --- B1 begin ---
import { landmarkIdFor } from './game/ContentPath.js';
import { Discovery } from './game/Discovery.js';
// --- B1 end ---
// --- B4 begin ---
import { contentUrl, landmarkIdFor as propsLandmarkIdFor } from './game/ContentPath.js';
import { Props } from './world/Props.js';
import { PlacementDebug } from './world/props/PlacementDebug.js';
import { PropContact, atSpawnPose, parseAtParam } from './world/props/Wiring.js';
// --- B4 end ---
// --- B3 begin ---
import { loadMissionSummaries } from './game/Mission.js';
import {
  FROZEN_INPUT,
  MissionRouter,
  applyMissionLoadout,
  chooseTileId,
  resolveMissionRoute,
} from './game/MissionRouter.js';
// --- B3 end ---
// --- C1 begin ---
import { loadSpecies } from './game/Species.js';
import { Globe } from './ui/Globe.js';
import { Home } from './ui/Home.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { missionUrl, tileUrl } from './ui/MissionSelect.js';
// --- C1 end ---
// --- C5 begin ---
import { SAVE_KEYS, Save } from './core/Save.js';
import { DISCOVERY_VERSION } from './game/DiscoveryStore.js';
import { Captions } from './ui/Captions.js';
import { SettingsScreen } from './ui/Settings.js';
// --- C5 end ---
// --- fix S begin ---
import { applyFreeDiveHull, chooseSpawn, spawnSettings } from './game/Spawn.js';
// --- fix S end ---
// --- D-START begin ---
import { missionStartPose } from './game/MissionRouter.js';
import type { MissionStartPosition } from './game/MissionRouter.js';
import { spawnHeight } from './game/Spawn.js';
// --- D-START end ---
// --- D-ROV begin ---
import { Rov } from './rov/Rov.js';
import { RovVisual } from './rov/RovVisual.js';
import { RovHUD } from './ui/RovHUD.js';
// --- D-ROV end ---
// --- D-PHOTO begin ---
import { PHOTO_LIMIT, PhotoStore, poiInPhoto } from './game/PhotoStore.js';
import type { PlacedPoi } from './game/Pois.js';
import { PhotoGallery } from './ui/PhotoGallery.js';
import { PhotoMode, canvasThumbnail } from './ui/PhotoMode.js';
// --- D-PHOTO end ---

declare global {
  interface Window {
    /** Set once the first frame has rendered. The e2e smoke test waits on this. */
    __gameReady?: boolean;
    /** Populated on a fatal startup error, for diagnostics. */
    __gameError?: string;
    /** Handy live handles for debugging from the console. */
    __game?: Record<string, unknown>;
  }
}

const config = makeConfig();
const bus = new EventBus();

function showFatal(message: string): void {
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

async function main(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  // --- D-SHELL begin ---
  const bypassHome = [
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
  ].some((key) => params.has(key));
  let appState: 'home' | 'dive' | 'pause' = bypassHome ? 'dive' : 'home';
  document.body.dataset.appState = appState;
  const lastSiteKey = 'subexplorer.lastSite.v1';
  const readLastSite = (): string | null => {
    try {
      const value = JSON.parse(localStorage.getItem(lastSiteKey) ?? 'null') as unknown;
      if (typeof value !== 'object' || value === null) return null;
      const id = (value as { missionId?: unknown }).missionId;
      return typeof id === 'string' && /^[a-z0-9-]+$/.test(id) ? id : null;
    } catch {
      return null;
    }
  };
  let lastSite = readLastSite();
  const shellBaseHref = (): string => {
    const base = new URL('.', window.location.href);
    const tier = params.get('tier');
    if (tier) base.searchParams.set('tier', tier);
    return base.toString();
  };
  // --- D-SHELL end ---
  const loader = new TileLoader();
  // --- B3 begin ---
  // `?mission=<id>` (docs/missions.md) names the tile and the content folder;
  // without it (or if its mission.json is missing) this is the free dive.
  const [index, route] = await Promise.all([loader.loadIndex(), resolveMissionRoute(params)]);
  const requested = route?.tileId ?? params.get('tile');
  const tileId = chooseTileId(requested, index, config.defaultTileId);
  // --- B3 end ---
  // --- C5 begin ---
  // Saved settings (docs/settings.md). The saved graphics tier applies unless
  // `?tier=` is given; terrain detail is read once, when the terrain is built.
  const save = new Save({ config, bus });
  const settings = save.get();
  // --- D-MODES begin ---
  Object.assign(
    config.submarine,
    config.speedProfiles[settings.gameplay.speedProfile],
    config.descentProfiles[settings.gameplay.descentProfile],
  );
  config.camera.lookAheadPerSpeed =
    config.speedProfiles[settings.gameplay.speedProfile].cameraLookAheadPerSpeed;
  const baseHintRangeFactor = config.scan.hintRangeFactor;
  config.scan.hintRangeFactor =
    baseHintRangeFactor * config.sensorPresets[settings.gameplay.sensors].hintRangeMultiplier;
  // --- D-MODES end ---
  config.terrain.detailStrength = settings.detailStrength;
  let postFxOn = settings.postFx;
  // Graphics tier: `?tier=low|medium|high` (see docs/terrain.md).
  const tier = resolveGraphicsTier(params.get('tier'), settings.graphicsTier);
  // --- C5 end ---
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
    return;
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
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES lifts the very dark midtones the abyss lives in and keeps the
  // headlight's hot spot from clipping to white.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();

  // ------------------------------------------------------------------- world
  const terrain = new Terrain(tile, config.terrain, tier);
  scene.add(terrain.group);
  bus.emit('terrain:built', {
    chunks: terrain.stats.chunks,
    vertices: terrain.stats.vertices,
  });
  console.info(
    `[terrain] ${meta.id}: ${meta.cols}x${meta.rows} cells -> ${terrain.stats.chunks} chunks, ` +
      `${terrain.stats.vertices} vertices, ${(terrain.widthM / 1000).toFixed(1)}x` +
      `${(terrain.depthM / 1000).toFixed(1)} km, depth ${meta.min_m.toFixed(0)}..${meta.max_m.toFixed(0)} m`,
  );
  console.info(`[terrain] ${terrain.debugString()}`);

  // A2: depth-driven fog/lighting/caustics, headlights, marine snow, surface lid.
  const atmoTier = atmosphereTier(config.water, tier);
  const atmosphere = new Atmosphere(scene, config.water, atmoTier, bus);
  const headlights = new Headlights(config.water, atmoTier);
  // --- D-MODES begin ---
  headlights.setPreset(config.lightPresets[settings.gameplay.lights]);
  // --- D-MODES end ---
  scene.add(headlights.group);
  const snow = new MarineSnow(config.water, atmoTier);
  if (snow.points) scene.add(snow.points);
  const water = new Water(scene, config.water, Math.max(terrain.widthM, terrain.depthM));

  const landmarks = new Landmarks(meta, config.landmarks);
  // QA-B #1: in a mission the POI reticle and objectives guide you; the
  // free-dive markers would only clutter the wreck. Sonar blips stay.
  landmarks.setVisible(route === null);
  scene.add(landmarks.group);
  void landmarks.load(terrain).then((placed) => {
    if (placed.length) bus.emit('landmarks:loaded', { landmarks: placed.map((p) => p.landmark) });
  });

  // --------------------------------------------------------------- submarine
  const sub = new Submarine(config.submarine, terrain);
  // --- D-POWER begin ---
  const power = new Power(config.power, settings.gameplay.batteryOxygen);
  let powerEmergencyStarted = false;
  bus.on('mission:started', () => {
    power.reset();
    powerEmergencyStarted = false;
  });
  // --- D-POWER end ---
  // --- fix S begin ---
  // Free-dive spawn (QA-B #3): over the tile centre, or the nearest cell at
  // least `minSpawnSeabedM` deep if the centre is a reef flat / caldera rim;
  // `?depth=` clamped between the surface and the seabed. Free dive also fits
  // the lowest hull class rated for the tile's deepest cell (QA-B #2).
  const spawn = chooseSpawn(terrain, meta, spawnDepth, spawnSettings(config));
  sub.reset(spawn.x, spawn.y, spawn.z, spawn.yaw);
  if (spawn.moved) {
    console.info(
      `[main] shallow tile centre: spawning ${Math.hypot(spawn.x, spawn.z).toFixed(0)} m out, seabed ${spawn.ground.toFixed(0)} m`,
    );
  }
  const freeDiveHull = route ? null : applyFreeDiveHull(sub, config, meta.min_m);
  // --- fix S end ---
  // --- B3 begin ---
  // Mission surface start + hull class + sim speed. `?poi=` / `?at=` below
  // still override the pose (tests rely on them).
  if (route) {
    const pose = applyMissionLoadout(sub, route.def, config, meta, terrain);
    sub.reset(pose.x, pose.y, pose.z, pose.yaw);
  }
  // --- D-START begin ---
  // Keep URL probes deterministic even when a mission uses a near-site default.
  if (route && spawnDepth !== null && !params.has('at') && !params.has('poi')) {
    const p = sub.position;
    sub.reset(
      p.x,
      spawnHeight(terrain.sampleHeight(p.x, p.z), spawnDepth, spawnSettings(config)),
      p.z,
      sub.yaw,
    );
  }
  // --- D-START end ---
  // Content folder for POIs, guide and props: the mission's, else `?landmark=` / the tile.
  const contentLandmark = route?.landmarkId ?? landmarkIdFor(params, meta.id);
  // --- B3 end ---
  // --- C5 begin ---
  // --- D-MODES begin ---
  sub.setSimSpeed(settings.gameplay.simSpeed);
  // --- D-MODES end ---
  // --- C5 end ---

  const subMesh = new SubMesh({
    length: 26,
    // fix S (QA-B #6): faint rim + ambient floor so the hull reads below 300 m.
    rimColor: config.submarine.hullRimColor,
    rimStrength: config.submarine.hullRimStrength,
    emissive: config.submarine.hullEmissive,
  });
  scene.add(subMesh.group);

  // A3: the rig samples the terrain so the camera never clips below the seabed.
  // --- D-INPUT-HUD begin ---
  const rig = new CameraRig(config.camera, window.innerWidth / window.innerHeight, terrain);
  // --- D-INPUT-HUD end ---
  rig.snap(sub.position, sub.yaw, sub.pitch);

  // ---------------------------------------------------------------------- UI
  // --- fix S begin ---
  const hud = new HUD(
    meta,
    document.body,
    {
      hullRadius: config.submarine.hullRadius,
      seabedWarnAltitudeM: config.submarine.seabedWarnAltitudeM,
      seabedWarnTimeToContactS: config.submarine.seabedWarnTimeToContactS,
      seabedApproachAltitudeM: config.submarine.seabedApproachAltitudeM,
      contactAltitudeM: config.submarine.hullRadius + config.submarine.seabedClearance,
    },
    config.currents.hudMinMps,
  );
  if (freeDiveHull && !freeDiveHull.cleared) hud.setHullNote('at rating limit');
  // --- D-CURRENTS begin ---
  hud.setCurrentMode(settings.gameplay.currents);
  bus.on('env:current', (current) => hud.setCurrent(current));
  // --- D-CURRENTS end ---
  // --- fix S end ---
  // --- D-SONAR begin ---
  const sonar = new Sonar(terrain, landmarks.placed, {
    palettes: config.sonarPalettes,
    zoom: config.sonarZoom,
  });
  sonar.setSensorRange(config.sensorPresets[settings.gameplay.sensors].sonarPoiRange);
  // --- D-SONAR end ---
  // --- B1 begin ---
  // POIs, scan beam, discoveries, field guide (J), debrief. `?landmark=` picks
  // the content folder, `?poi=` spawns next to a POI, `?debrief=1` opens the
  // debrief after a few seconds. See docs/discovery.md.
  const discovery = new Discovery({
    bus,
    config,
    meta,
    seabed: terrain,
    landmarkId: contentLandmark,
    params,
    // `input` is constructed below; this is only called once frames run.
    keyLabel: (action) => input.primaryKeyLabel(action),
    teleport: (pose) => {
      sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      rig.snap(sub.position, sub.yaw, sub.pitch);
    },
  });
  // --- D-POWER begin ---
  window.addEventListener(
    'keydown',
    (event) => {
      if (
        event.code === 'Escape' &&
        freeDivePowerDebriefShown &&
        discovery.debrief.isOpen &&
        !discovery.guide.isOpen
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  // --- D-POWER end ---
  // --- D-SCAN begin ---
  const waypoints = new Waypoints(discovery.scanner);
  waypoints.setVisualHints(settings.gameplay.visualHints);
  waypoints.setReducedMotion(settings.reduceMotion);
  waypoints.setPalette(settings.sonarPalette);
  void discovery.ready.then(() => waypoints.setPois(discovery.pois));
  // --- D-SONAR begin ---
  sonar.setScanState((poi) => discovery.scanner.isScanned(poi.landmarkId, poi.id));
  void discovery.ready.then(() => sonar.setPois(discovery.pois));
  // --- D-SONAR end ---
  // Mission's current parser drops the content hint, so read the authored
  // sentence here until that field is passed through by the mission owner.
  const scanObjectiveHints = new Map<string, string>();
  if (route) {
    void fetchContentJson(contentUrl(route.missionId, 'mission.json')).then((raw) => {
      if (!raw || typeof raw !== 'object') return;
      const objectives = (raw as { objectives?: unknown }).objectives;
      if (!Array.isArray(objectives)) return;
      for (const value of objectives) {
        if (!value || typeof value !== 'object') continue;
        const { id, hint } = value as { id?: unknown; hint?: unknown };
        if (typeof id === 'string' && typeof hint === 'string' && hint.trim()) {
          scanObjectiveHints.set(id, hint.trim());
        }
      }
    });
  }
  // --- D-SCAN end ---
  // --- D-MODES begin ---
  const baseScanRadii = new Map<string, number>();
  void discovery.ready.then(() => {
    for (const poi of discovery.pois) baseScanRadii.set(poi.id, poi.radius);
    const factor = config.sensorPresets[save.get().gameplay.sensors].scanRadiusMultiplier;
    for (const poi of discovery.pois)
      poi.radius = (baseScanRadii.get(poi.id) ?? poi.radius) * factor;
  });
  // --- D-MODES end ---
  // --- B1 end ---
  // --- B4 begin ---
  // Placed props (docs/props.md). `?at=lat,lon[,heading]` spawns the boat there
  // (at `?depth=` if given); `?debugProps=1` opens the placement tool.
  const props = new Props(meta, terrain, config.props);
  scene.add(props.group);
  const propsDebug =
    params.get('debugProps') === '1'
      ? new PlacementDebug(props, scene, rig.camera, canvas, config.props)
      : null;
  const propsLandmark = route ? contentLandmark : propsLandmarkIdFor(params, meta.id);
  void props.load(contentUrl(propsLandmark, 'props.json'), propsLandmark).then((st) => {
    const { landmarkId, count, models, procedural } = st;
    bus.emit('props:loaded', { landmarkId, count, models, procedural });
    if (count || st.skipped) console.info(`[props] ${landmarkId}: ${props.debugString()}`);
    propsDebug?.refresh();
  });
  const at = parseAtParam(params.get('at'));
  if (at) {
    const c = config.props.atSpawnClearanceM;
    const pose = atSpawnPose(at, meta, terrain, spawnDepth, c, config.submarine.hullRadius);
    sub.reset(pose.x, pose.y, pose.z, pose.yaw);
    rig.snap(sub.position, sub.yaw, sub.pitch);
  }
  const propContact = new PropContact(props, bus, config.props, config.submarine.hullRadius);
  // --- B4 end ---
  // --- D-CURRENTS begin ---
  const currents = new Currents(meta.id, meta.id, fetchContentJson);
  // --- D-CURRENTS end ---
  // --- C3 begin ---
  const presets = new PresetSystem({
    scene,
    bus,
    config,
    tier,
    params,
    tileId: meta.id,
    landmarkId: contentLandmark,
    missionId: route?.missionId ?? null,
    terrain,
    sub,
    // --- D-CURRENTS begin ---
    currents,
    currentMode: settings.gameplay.currents,
    // --- D-CURRENTS end ---
    props,
    discovery,
    atmosphere,
    headlights,
    toWorld: (lat, lon) => latLonToWorld(meta, lat, lon),
    fetchJson: fetchContentJson,
  });
  // --- C3 end ---
  const missionSelect = new MissionSelect(index, {
    currentTileId: meta.id,
    currentMissionId: route?.missionId,
    collapsed: route !== null,
  });
  // --- D-SHELL begin ---
  const home = new Home({
    continueDive: () => {
      if (lastSite) {
        const m = missionSummaries.find((entry) => entry.id === lastSite);
        bus.emit('app:siteSelected', { missionId: lastSite, tileId: m?.tile ?? lastSite });
        window.location.href = missionUrl(shellBaseHref(), lastSite);
      }
    },
    journal: () => discovery.guide.open(),
    settings: () => settingsScreen.open(),
    controls: () => {
      settingsScreen.open();
      settingsScreen.showControls(true);
    },
  });
  home.setContinue(lastSite);
  const completion = (id: string, pois: string[]): string =>
    `${pois.filter((poi) => discovery.store.isDiscovered(id, poi)).length}/${pois.length} logged`;
  const summaries = loadMissionSummaries();
  const selectMission = (id: string): void => {
    const m = missionSummaries.find((entry) => entry.id === id);
    bus.emit('app:siteSelected', { missionId: id, tileId: m?.tile ?? id });
    window.location.href = missionUrl(shellBaseHref(), id);
  };
  const selectTile = (id: string): void => {
    bus.emit('app:siteSelected', { missionId: null, tileId: id });
    window.location.href = tileUrl(shellBaseHref(), id);
  };
  let missionSummaries: Awaited<typeof summaries> = [];
  const homeSites = new MissionSelect(index, {
    parent: home.sitesSlot,
    presentation: 'shell',
    onSelect: selectTile,
    onSelectMission: selectMission,
    completion,
    onSiteFocus: (id) => homeGlobe.previewSite(id),
  });
  const pause = new PauseMenu({
    resume: () => setAppState('dive'),
    journal: () => discovery.guide.open(),
    settings: () => settingsScreen.open(),
    controls: () => {
      settingsScreen.open();
      settingsScreen.showControls(true);
    },
    quit: () => {
      history.pushState({}, '', new URL('.', window.location.href));
      setAppState('home');
    },
    objectives: () =>
      missionRouter?.mission.objectives.map((objective) => ({
        title: objective.title,
        hint: objectiveHints.get(objective.id) ?? 'Explore the site to locate this objective.',
        complete: objective.complete,
        primary: objective.primary,
      })) ?? [],
  });
  const pauseSites = new MissionSelect(index, {
    parent: pause.sitesSlot,
    presentation: 'shell',
    onSelect: selectTile,
    onSelectMission: selectMission,
    completion,
  });
  const objectiveHints = new Map<string, string>();
  if (route)
    void fetchContentJson(contentUrl(route.missionId, 'mission.json')).then((raw) => {
      if (typeof raw !== 'object' || raw === null) return;
      const objectives = (raw as { objectives?: unknown }).objectives;
      if (!Array.isArray(objectives)) return;
      for (const entry of objectives) {
        if (typeof entry?.id === 'string' && typeof entry?.hint === 'string')
          objectiveHints.set(entry.id, entry.hint);
      }
    });
  void summaries.then((list) => {
    missionSummaries = list;
    missionSelect.setMissions(list);
    homeSites.setMissions(list);
    pauseSites.setMissions(list);
    if (!list.some((m) => m.id === lastSite)) home.setContinue(null);
  });
  bus.on('mission:started', ({ missionId }) => {
    lastSite = missionId;
    home.setContinue(missionId);
    try {
      localStorage.setItem(lastSiteKey, JSON.stringify({ missionId }));
    } catch {
      /* optional */
    }
  });
  const setAppState = (state: 'home' | 'dive' | 'pause'): void => {
    appState = state;
    document.body.dataset.appState = state;
    if (state === 'home') {
      pause.close();
      home.show();
      homeGlobe.open('api');
    } else {
      home.hide();
      homeGlobe.close();
      if (state === 'pause') {
        document.exitPointerLock?.();
        pause.open();
      } else pause.close();
    }
    bus.emit('app:state', { state });
  };
  // --- D-SHELL end ---
  // --- D-INPUT-HUD begin ---
  missionSelect.root.hidden = true;
  // --- D-INPUT-HUD end ---
  // --- C1 begin ---
  // Globe mission select (docs/globe.md): `?globe=1` and shell site pins.
  // While open it freezes the game like the briefing. SPECIES tab in the guide.
  const globe = new Globe({
    config: config.globe,
    bus,
    tileIds: index.map((t) => t.id),
    currentId: contentLandmark,
    onSiteSelected: (site) =>
      bus.emit('app:siteSelected', {
        missionId: site.state === 'mission' ? site.id : null,
        tileId: missionSummaries.find((m) => m.id === site.id)?.tile ?? site.id,
      }),
  });
  // --- D-SHELL begin ---
  const homeGlobe = new Globe({
    config: config.globe,
    bus,
    tileIds: index.map((t) => t.id),
    currentId: contentLandmark,
    parent: home.globeSlot,
    embedded: true,
    onSiteFocus: (id) => homeSites.highlightSite(id),
    onSiteSelected: (site) =>
      bus.emit('app:siteSelected', {
        missionId: site.state === 'mission' ? site.id : null,
        tileId: missionSummaries.find((m) => m.id === site.id)?.tile ?? site.id,
      }),
  });
  void homeGlobe.catalog.then((c) => homeSites.setPending(c.pending));
  void globe.catalog.then((c) => pauseSites.setPending(c.pending));
  if (appState === 'home') setAppState('home');
  // --- D-SHELL end ---
  missionSelect.setGlobeHandler(() => globe.open('button'));
  void globe.catalog.then((c) => missionSelect.setPending(c.pending));
  void loadSpecies(contentLandmark).then((doc) => discovery.guide.setSpecies(doc));
  if (params.get('globe') === '1') globe.open('url');
  // --- C1 end ---

  const input = new Input(canvas);
  input.attach();
  // --- D2-CAMERA begin ---
  let cameraTipsUntil = performance.now() + 20_000;
  bus.on('mission:started', () => {
    rig.resetView();
    cameraTipsUntil = performance.now() + 20_000;
  });
  hud.onResetCamera(() => {
    if (appState === 'dive') {
      rig.resetView();
      cameraTipsUntil = 0;
    }
  });
  canvas.addEventListener('dblclick', () => {
    if (
      appState === 'dive' &&
      !settingsScreen.isOpen &&
      !globe.isOpen &&
      !(missionRouter?.frozen ?? false)
    ) {
      rig.resetView();
      cameraTipsUntil = 0;
    }
  });
  // --- D2-CAMERA end ---
  // --- D-INPUT-HUD begin ---
  const lockKeyboard = async (): Promise<void> => {
    const keyboard = (
      navigator as Navigator & {
        keyboard?: { lock?: (keys: string[]) => Promise<void>; unlock?: () => void };
      }
    ).keyboard;
    if (!document.fullscreenElement || !keyboard?.lock) return;
    try {
      await keyboard.lock(['ControlLeft', 'ControlRight', 'KeyW']);
    } catch {
      keyboard.unlock?.();
    }
  };
  const unlockKeyboard = (): void => {
    (navigator as Navigator & { keyboard?: { unlock?: () => void } }).keyboard?.unlock?.();
  };
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) void lockKeyboard();
    else unlockKeyboard();
  });
  // --- D2-CAMERA begin ---
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    const wasLocked = input.pointerLookActive;
    input.setMouseLook(locked);
    if (
      wasLocked &&
      !locked &&
      appState === 'dive' &&
      !settingsScreen.isOpen &&
      !globe.isOpen &&
      !discovery.guide.isOpen &&
      !(missionRouter?.frozen ?? false) &&
      !photoMode.active &&
      !discovery.debrief.isOpen &&
      !(missionRouter?.debriefOpen ?? false)
    )
      setAppState('pause');
  });
  // --- D2-CAMERA end ---
  let ctrlTipShown = false;
  try {
    ctrlTipShown = JSON.parse(localStorage.getItem('subexplorer.tips.v1') ?? '{}').ctrlW === true;
  } catch {
    /* A session-only tip is still useful. */
  }
  const ctrlTip = document.createElement('div');
  ctrlTip.className = 'hud-ctrl-tip';
  ctrlTip.hidden = true;
  ctrlTip.innerHTML = '<span>Ctrl+W may close this tab. Use C or fullscreen.</span>';
  const dismissTip = document.createElement('button');
  dismissTip.type = 'button';
  dismissTip.textContent = 'Dismiss';
  dismissTip.addEventListener('click', () => {
    ctrlTip.hidden = true;
  });
  const fullscreenTip = document.createElement('button');
  fullscreenTip.type = 'button';
  fullscreenTip.textContent = 'Fullscreen';
  fullscreenTip.addEventListener('click', () => {
    void canvas.requestFullscreen?.().catch(() => {});
    ctrlTip.hidden = true;
  });
  ctrlTip.append(fullscreenTip, dismissTip);
  document.body.append(ctrlTip);
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (
      ctrlTipShown ||
      !['ControlLeft', 'ControlRight'].includes(e.code) ||
      e.repeat ||
      globe.isOpen ||
      settingsScreen.isOpen ||
      (missionRouter?.frozen ?? false) ||
      (target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
    )
      return;
    ctrlTipShown = true;
    ctrlTip.hidden = false;
    try {
      localStorage.setItem('subexplorer.tips.v1', JSON.stringify({ ctrlW: true }));
    } catch {
      /* Private storage is optional. */
    }
  });
  // --- D-INPUT-HUD end ---

  // --- C5 begin ---
  // Built before the mission router so its capture-phase key handler runs
  // first and can keep keys from the briefing/debrief while open.
  const settingsScreen = new SettingsScreen({
    save,
    input,
    config,
    activeTier: tier,
    activeDetailStrength: settings.detailStrength,
    activeSimSpeedDefault: settings.simSpeedDefault,
    tierFromUrl: params.get('tier') !== null && params.get('tier') === tier,
    canOpen: () => !globe.isOpen,
    onRequestPointerLock: () => {
      // --- D2-CAMERA begin ---
      if (appState === 'pause' && !(missionRouter?.frozen ?? false)) setAppState('dive');
      if (
        appState === 'dive' &&
        !settingsScreen.isOpen &&
        !pause.isOpen &&
        !globe.isOpen &&
        !discovery.guide.isOpen &&
        !(missionRouter?.frozen ?? false)
      ) {
        void canvas.requestPointerLock?.();
      }
      // --- D2-CAMERA end ---
    },
    onOpen: () => {
      document.exitPointerLock?.();
      unlockKeyboard();
    },
    onResetProgress: () => {
      if (discovery.store.readOnly) return 'protected';
      let storage: Storage | null;
      try {
        storage = window.localStorage;
      } catch {
        discovery.store.reset();
        return 'sessionOnly';
      }
      try {
        if (storage) {
          const raw = storage.getItem(SAVE_KEYS.discoveries);
          if (raw) {
            try {
              const version = (JSON.parse(raw) as { version?: unknown }).version;
              if (typeof version === 'number' && version > DISCOVERY_VERSION) return 'protected';
            } catch {
              // A malformed save is safe to discard after confirmation.
            }
          }
          storage.removeItem(SAVE_KEYS.discoveries);
          if (storage.getItem(SAVE_KEYS.discoveries) !== null) return 'unavailable';
        }
      } catch {
        return 'unavailable';
      }
      discovery.store.reset();
      return storage ? 'cleared' : 'sessionOnly';
    },
  });

  // --- D-SONAR begin ---
  const sonarControls = document.createElement('p');
  sonarControls.className = 'settings-note d-sonar-controls';
  sonarControls.textContent =
    'Sonar: M expands the map; + / − change range. Wheel over the map also changes range.';
  settingsScreen.root.querySelector('.settings-bindings')?.before(sonarControls);
  window.addEventListener('keydown', (event) => {
    if (
      appState !== 'dive' ||
      settingsScreen.isOpen ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea, button, [contenteditable="true"]')
    )
      return;
    if (event.code === 'Equal' || event.code === 'NumpadAdd') sonar.zoomBy(-1);
    else if (event.code === 'Minus' || event.code === 'NumpadSubtract') sonar.zoomBy(1);
    else return;
    event.preventDefault();
  });
  // --- D-SONAR end ---

  rig.reduceMotion = settings.reduceMotion;
  sonar.setPalette(settings.sonarPalette);
  // --- C5 end ---

  // --- B3 begin ---
  // Briefing (freezes the game until "Begin dive" / Enter), objectives panel,
  // completion -> debrief. `?skipBriefing=1` starts immediately.
  const missionRouter = route
    ? new MissionRouter({
        route,
        bus,
        config,
        meta,
        discovery,
        // --- D-START begin ---
        defaultStartPosition: settings.gameplay.startPosition,
        applyStart: (choice: MissionStartPosition) => {
          if (params.has('poi') || params.has('at') || params.has('depth')) return;
          const pose = missionStartPose(route.def, choice, discovery.pois, meta, terrain, config);
          sub.reset(pose.x, pose.y, pose.z, pose.yaw);
          rig.snap(sub.position, sub.yaw, sub.pitch);
          headlights.setEnabled(true);
        },
        // --- D-START end ---
        // --- D-FLOW begin ---
        // Debrief "Dive sites" / "Home" go to the shell without launching a dive.
        onDiveSites: () => {
          history.pushState({}, '', shellBaseHref());
          setAppState('home');
          home.showSites(false);
        },
        onHome: () => {
          history.pushState({}, '', shellBaseHref());
          setAppState('home');
        },
        // --- D-FLOW end ---
        simSpeed: sub.simSpeed,
        keyLabel: (action) =>
          input.primaryKeyLabel(action as Parameters<Input['primaryKeyLabel']>[0]),
      })
    : null;
  // --- B3 end ---
  // --- D-FLOW begin ---
  // The Journal (docs/missions.md): reads the persistent discovery store for
  // every site, lists this dive's site first, and opens on its front page from
  // home. The pause menu offers "Surface and debrief" while a mission dive is on.
  const journal = discovery.guide;
  journal.setStore(discovery.store);
  journal.setCurrentSite(contentLandmark);
  journal.setHomeMode(appState === 'home');
  bus.on('app:state', ({ state }) => journal.setHomeMode(state === 'home'));
  // --- D-PHOTO begin ---
  // Photos live in their own store (subexplorer.photos.v1) and show in the
  // Journal's Photos page and on each POI entry. The viewfinder is PhotoMode.
  const photos = new PhotoStore();
  journal.setPhotoGallery(photos, new PhotoGallery(photos, () => journal.refresh()));
  let photoCaptureRequested = false;
  const photoMode = new PhotoMode(() => {
    photoCaptureRequested = true;
  });
  // --- D-PHOTO end ---
  if (missionRouter) {
    const surface = document.createElement('button');
    surface.type = 'button';
    surface.className = 'pause-surface';
    surface.textContent = 'Surface and debrief';
    surface.hidden = true;
    surface.addEventListener('click', () => {
      setAppState('dive');
      missionRouter.endDive();
    });
    const pauseActions = pause.root.querySelector('.pause-actions');
    const quitButton = [...(pauseActions?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === 'Quit to home',
    );
    pauseActions?.insertBefore(surface, quitButton ?? null);
    bus.on('app:state', ({ state }) => {
      if (state === 'pause') surface.hidden = !missionRouter.canEndDive;
    });
  }
  // --- D-FLOW end ---
  // --- D-INPUT-HUD begin ---
  const briefingControls = missionRouter?.briefing?.root.querySelector('.briefing-controls');
  if (briefingControls) {
    const controlsButton = document.createElement('button');
    controlsButton.type = 'button';
    controlsButton.textContent = 'View controls';
    controlsButton.addEventListener('click', () => {
      settingsScreen.open();
      settingsScreen.showControls(true);
    });
    briefingControls.replaceChildren(controlsButton);
  }
  // --- D-INPUT-HUD end ---

  // Audio: WebAudio can only start from inside a user-gesture handler, so we
  // wait for the first keydown/pointerdown rather than starting at load.
  // `terrain` already satisfies the audio module's minimal TerrainSampler
  // interface (sampleHeight), so no adapter is needed.
  const audio = new AudioSystem(config.audio, bus, terrain);
  // --- D-SHELL begin ---
  audio.setPaused(appState !== 'dive');
  bus.on('app:state', ({ state }) => audio.setPaused(state !== 'dive'));
  const onShellKey = (e: KeyboardEvent): void => {
    if (appState !== 'dive' && (e.code === 'ControlLeft' || e.code === 'ControlRight')) {
      e.stopPropagation();
      return;
    }
    if (
      e.code !== 'Escape' ||
      e.repeat ||
      settingsScreen.isOpen ||
      globe.isOpen ||
      discovery.guide.isOpen ||
      discovery.debrief.isOpen ||
      missionRouter?.briefing?.isOpen ||
      missionRouter?.debriefOpen
    )
      return;
    // --- D-PHOTO begin ---
    if (photoMode.active) {
      e.preventDefault();
      e.stopImmediatePropagation();
      exitPhotoMode();
      return;
    }
    // --- D-PHOTO end ---
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    if (appState === 'home') {
      if (home.sitesOpen) {
        e.preventDefault();
        home.closeSites();
      }
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (appState === 'pause') pause.escape();
    else setAppState('pause');
  };
  window.addEventListener('keydown', onShellKey, true);
  if (appState === 'dive') bus.emit('app:state', { state: 'dive' });
  // --- D-SHELL end ---
  // --- C5 begin ---
  const captions = new Captions(audio.captions, {
    enabled: settings.captions,
    maxLines: config.settings.captionMaxLines,
    minDurationS: config.settings.captionMinDurationS,
  });
  save.onChange((next, changed) => {
    if (changed.includes('reduceMotion')) rig.reduceMotion = next.reduceMotion;
    if (changed.includes('captions')) captions.setEnabled(next.captions);
    if (changed.includes('sonarPalette')) sonar.setPalette(next.sonarPalette);
    if (changed.includes('postFx')) postFxOn = next.postFx;
    // --- D-INPUT-HUD begin ---
    if (changed.includes('uiScale'))
      document.documentElement.style.setProperty('--ui-user-scale', String(next.uiScale / 100));
    // --- D-INPUT-HUD end ---
  });
  // --- D-SONAR begin ---
  save.onChange((next, changed) => {
    if (changed.includes('gameplay'))
      sonar.setSensorRange(config.sensorPresets[next.gameplay.sensors].sonarPoiRange);
  });
  // --- D-SONAR end ---
  // --- D-SCAN begin ---
  save.onChange((next, changed) => {
    if (changed.includes('gameplay')) waypoints.setVisualHints(next.gameplay.visualHints);
    if (changed.includes('reduceMotion')) waypoints.setReducedMotion(next.reduceMotion);
    if (changed.includes('sonarPalette')) waypoints.setPalette(next.sonarPalette);
  });
  // --- D-SCAN end ---
  // --- D-MODES begin ---
  save.onChange((next, changed) => {
    if (!changed.includes('gameplay')) return;
    sub.applyProfiles(
      config.speedProfiles[next.gameplay.speedProfile],
      config.descentProfiles[next.gameplay.descentProfile],
    );
    config.camera.lookAheadPerSpeed =
      config.speedProfiles[next.gameplay.speedProfile].cameraLookAheadPerSpeed;
    headlights.setPreset(config.lightPresets[next.gameplay.lights]);
    const sensor = config.sensorPresets[next.gameplay.sensors];
    config.scan.hintRangeFactor = baseHintRangeFactor * sensor.hintRangeMultiplier;
    for (const poi of discovery.pois)
      poi.radius = (baseScanRadii.get(poi.id) ?? poi.radius) * sensor.scanRadiusMultiplier;
    sub.setSimSpeed(next.gameplay.simSpeed);
  });
  // --- D-MODES end ---
  // --- D-POWER begin ---
  save.onChange((next, changed) => {
    if (changed.includes('gameplay')) power.setEnabled(next.gameplay.batteryOxygen);
  });
  // --- D-POWER end ---
  // --- D-CURRENTS begin ---
  save.onChange((next, changed) => {
    if (!changed.includes('gameplay')) return;
    hud.setCurrentMode(next.gameplay.currents);
    presets.setCurrentMode(next.gameplay.currents);
  });
  // --- D-CURRENTS end ---
  // --- C5 end ---
  const unlockAudio = (): void => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  const post = new UnderwaterPass(window.innerWidth, window.innerHeight);

  // ------------------------------------------------------------------ resize
  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    rig.setAspect(w / h);
    post.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    // --- D-INPUT-HUD begin ---
    const scale = uiScaleFactors(w, save.get().uiScale);
    document.documentElement.style.setProperty('--ui-auto-scale', String(scale.auto));
    document.documentElement.style.setProperty('--ui-user-scale', String(scale.user));
    // --- D-INPUT-HUD end ---
  }
  window.addEventListener('resize', resize);
  resize();

  // -------------------------------------------------------------------- loop
  const time = new Time(config.physicsHz);
  const forward = new THREE.Vector3();
  // --- D-ROV begin ---
  const rov = new Rov(config.rov, terrain);
  const rovVisual = new RovVisual(config.rov);
  rovVisual.setLightPreset(config.lightPresets[settings.gameplay.lights]);
  save.onChange((next, changed) => {
    if (changed.includes('gameplay'))
      rovVisual.setLightPreset(config.lightPresets[next.gameplay.lights]);
  });
  const rovHud = new RovHUD(hud.root.querySelector('.hud-readouts') as HTMLElement);
  scene.add(rovVisual.group);
  const rovCurrent = new THREE.Vector3();
  const cameraFromSub = new THREE.Vector3();
  const rovCameraAim = new THREE.Vector3();
  let savedChaseRadius = rig.chaseRadius;
  const abortRov = (): void => {
    if (!rov.deployed) return;
    rov.abort();
    rig.chaseRadius = savedChaseRadius;
    rig.setMode('chase');
    rig.snap(sub.position, sub.yaw, sub.pitch);
    rovHud.update(rov);
    rovVisual.update(rov, sub.position);
    headlights.setConesSuppressed(false);
  };
  bus.on('app:state', ({ state }) => {
    if (state !== 'dive') abortRov();
  });
  bus.on('mission:ended', abortRov);
  bus.on('mission:aborted', abortRov);
  bus.on('mission:restart', abortRov);
  bus.on('mission:started', abortRov);
  bus.on('sub:emergencyBlow', abortRov);
  // --- D-ROV end ---
  // --- D-PHOTO begin ---
  // Photo mode freezes the sim like pause; the camera orbits whatever is being
  // piloted (the ROV when deployed) and leaving restores the previous view.
  let photoPoi: PlacedPoi | null = null;
  let lastCaptureMs = -Infinity;
  const enterPhotoMode = (): void => {
    document.exitPointerLock?.();
    void journal.load(); // site names for the caption
    rig.enterPhotoMode(rov.deployed ? rov.position : sub.position);
    photoMode.setActive(true, input.primaryKeyLabel('capturePhoto'));
    photoCaptureRequested = false;
  };
  function exitPhotoMode(): void {
    if (!photoMode.active) return;
    photoMode.setActive(false);
    rig.exitPhotoMode();
    photoCaptureRequested = false;
    // Orbit drag/wheel still queued for this frame must not move the old view.
    input.state.lookDx = 0;
    input.state.lookDy = 0;
    input.wheelDelta = 0;
  }
  bus.on('app:state', ({ state }) => {
    if (state !== 'dive') exitPhotoMode();
  });
  const capturePhoto = (target: THREE.Vector3): void => {
    const now = performance.now();
    if (now - lastCaptureMs < 400) return; // Enter on the focused button fires twice
    lastCaptureMs = now;
    const image = canvasThumbnail(renderer.domElement);
    if (!image) {
      photoMode.toast('This browser could not create the photo.', true);
      return;
    }
    const result = photos.save({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      image,
      siteId: contentLandmark,
      siteName: journal.siteName(contentLandmark),
      poiId: photoPoi?.id ?? null,
      poiName: photoPoi?.name ?? null,
      at: new Date().toISOString(),
      depthM: Math.round(Math.max(0, -target.y) * 10) / 10,
    });
    if (!result.saved) photoMode.toast(result.error, true);
    else if (result.dropped)
      photoMode.toast(
        `Saved to Journal · oldest ${result.dropped === 1 ? 'photo' : `${result.dropped} photos`} removed (keeps ${PHOTO_LIMIT})`,
      );
    else photoMode.toast('Saved to Journal');
    journal.refresh();
  };
  // --- D-PHOTO end ---
  let ready = false;
  let lastTerrainLog = 0;
  let wasFrozen = false;
  let emergencyBlowAnnounced = false;
  // --- D-POWER begin ---
  let freeDivePowerDebriefShown = false;
  // --- D-POWER end ---
  let lastHullStress = 0;

  function frame(nowMs: number): void {
    requestAnimationFrame(frame);

    const sampled = input.sample();
    const realSteps = time.tick(nowMs);
    // --- B3 begin ---
    // While the mission briefing is up nothing simulates and input is ignored
    // (sampling still runs, so edge presses do not queue up behind the card).
    // --- D-SHELL begin ---
    const shellFrozen =
      appState !== 'dive' ||
      (missionRouter?.frozen ?? false) ||
      globe.isOpen ||
      settingsScreen.isOpen ||
      discovery.guide.isOpen;
    // --- D-SHELL end ---
    // --- D-POWER begin ---
    const blocked =
      shellFrozen || discovery.debrief.isOpen || (missionRouter?.debriefOpen ?? false);
    // --- D-POWER end ---
    // --- D-PHOTO begin ---
    if (photoMode.active && blocked) exitPhotoMode();
    else if (sampled.togglePhotoMode) {
      if (photoMode.active) exitPhotoMode();
      else if (!blocked) enterPhotoMode();
    }
    const frozen = shellFrozen || discovery.debrief.isOpen || photoMode.active;
    // --- D-PHOTO end ---
    // --- D2-CAMERA begin ---
    if (frozen && document.pointerLockElement === canvas) document.exitPointerLock?.();
    // --- D2-CAMERA end ---
    // --- D-INPUT-HUD begin ---
    if (wasFrozen && !frozen) void lockKeyboard();
    wasFrozen = frozen;
    // --- D-INPUT-HUD end ---
    const state = frozen ? FROZEN_INPUT : sampled;
    const steps = frozen ? 0 : realSteps;
    // --- B3 end ---
    // --- D-ROV begin ---
    if (blocked) abortRov(); // D-PHOTO: photo mode keeps the ROV out
    if (!frozen && state.toggleRov && !sub.getState().emergencyBlow) {
      if (rov.mode === 'piloting') rov.retrieve();
      else if (!rov.deployed && rov.deploy(sub.position, sub.yaw)) {
        sub.velocity.set(0, 0, 0);
        rig.setMode('chase');
        savedChaseRadius = rig.chaseRadius;
        rig.chaseRadius = config.rov.cameraDistanceM;
        rig.snap(rov.position, rov.yaw, 0);
      }
    }
    const currentMode = save.get().gameplay.currents;
    for (let i = 0; i < steps; i++) {
      if (rov.deployed) {
        currents.sample(rov.position.x, rov.position.z, rovCurrent);
        rovCurrent.multiplyScalar(
          currentMode === 'off' ? 0 : currentMode === 'gentle' ? config.currents.gentleScale : 1,
        );
        rov.step(time.fixedDelta * sub.simSpeed, state, sub.position, rovCurrent);
        if (!rov.deployed) {
          rig.chaseRadius = savedChaseRadius;
          rig.snap(sub.position, sub.yaw, sub.pitch);
        }
      } else sub.step(state, time.fixedDelta);
    }
    // --- D-ROV end ---
    // --- D-POWER begin ---
    if (steps) {
      const empty = power.step(steps * time.fixedDelta * sub.simSpeed, {
        throttle: rov.deployed ? 0 : state.throttle,
        ballast: rov.deployed ? 0 : state.ballast,
        boost: rov.deployed ? false : state.boost,
        lights: headlights.on,
        sensors: state.scan || sonar.visible,
      });
      // --- D-ROV begin ---
      if (rov.deployed && power.state.enabled) {
        const p = power.state;
        power.setLevels(
          p.battery -
            (steps * time.fixedDelta * sub.simSpeed) / (config.rov.batteryDrainPerHour * 3600),
          p.oxygen,
        );
      }
      // --- D-ROV end ---
      if ((empty || power.state.depleted) && !powerEmergencyStarted) {
        sub.startEmergencyAscent();
        powerEmergencyStarted = true;
      }
    }
    // --- D-POWER end ---
    // --- B4 begin ---
    if (!frozen && !rov.deployed) propContact.resolve(sub, time.frameDelta); // prop push-out, after physics
    // --- B4 end ---

    // --- D2-CAMERA begin ---
    if (!frozen && !rov.deployed && state.toggleCamera) {
      rig.toggleMode();
      cameraTipsUntil = 0;
    }
    if (!frozen && !rov.deployed && state.resetCamera) {
      rig.resetView();
      cameraTipsUntil = 0;
    }
    // --- D2-CAMERA end ---
    // --- D-INPUT-HUD begin ---
    if (!frozen || photoMode.active) {
      if (sampled.lookDx || sampled.lookDy) {
        rig.orbit(-sampled.lookDx * 0.004, sampled.lookDy * 0.004);
        cameraTipsUntil = 0;
      }
      if (input.wheelDelta) {
        rig.orbit(0, 0, input.wheelDelta * 0.001);
        cameraTipsUntil = 0;
      }
    } else unlockKeyboard();
    // --- D-INPUT-HUD end ---
    // --- D-SONAR begin ---
    if (state.toggleSonar) sonar.toggle();
    // --- D-SONAR end ---
    if (state.toggleLights) headlights.toggle();
    if (state.cycleSimSpeed) bus.emit('sub:simSpeed', { multiplier: sub.cycleSimSpeed() });

    const s = sub.getState();
    if (s.touchedBottom) bus.emit('sub:collided', { depth: s.depth, speed: s.impactSpeed });
    if (s.crushWarning) bus.emit('sub:crushWarning', { depth: s.depth, ratio: s.crushRatio });
    // A3: hull stress + emergency blow, for audio (A4), HUD and mission restart.
    // Only on a meaningful change, so a long pressure hold is not a per-frame
    // event storm for the audio bus.
    if (
      Math.abs(s.hullStress - lastHullStress) > config.submarine.hullStressEventThreshold ||
      (s.touchedBottom && s.hullStress > config.submarine.hullStressEventThreshold)
    ) {
      lastHullStress = s.hullStress;
      bus.emit('sub:hullStress', {
        stress: s.hullStress,
        cause: s.touchedBottom ? 'impact' : 'pressure',
        depth: s.depth,
      });
    }
    if (s.emergencyBlow && !emergencyBlowAnnounced) {
      emergencyBlowAnnounced = true;
      bus.emit('sub:emergencyBlow', {
        depth: s.depth,
        lockSeconds: config.submarine.emergencyBlowLockSeconds,
        cause: s.emergencyCause ?? 'crush',
      });
    } else if (!s.emergencyBlow) {
      emergencyBlowAnnounced = false;
    }
    // --- D-POWER begin ---
    if (powerEmergencyStarted && !s.emergencyBlow && !missionRouter && !freeDivePowerDebriefShown) {
      freeDivePowerDebriefShown = true;
      discovery.showDebrief({
        title: 'Dive aborted',
        subtitle: 'Supplies exhausted · safe ascent completed',
      });
    }
    // --- D-POWER end ---

    // Present the boat.
    subMesh.setPose(sub.position, sub.yaw, sub.pitch, sub.roll);
    subMesh.update(rov.deployed ? 0 : state.throttle, time.frameDelta);
    // Hide our own hull in first person so it does not fill the screen.
    subMesh.group.visible = rig.mode !== 'first-person'; // D-PHOTO: and in the photo orbit
    // --- D-ROV begin ---
    rovVisual.update(rov, sub.position);
    rovHud.update(rov);
    // Only the additive beam geometry is hidden; the sub's actual lamps stay on.
    headlights.setConesSuppressed(rov.deployed);
    // --- D-ROV end ---

    sub.getForward(forward);
    // --- D-ROV begin ---
    const pilotPosition = rov.deployed ? rov.position : sub.position;
    const pilotForward = rov.deployed ? rov.forward : forward;
    // --- D-ROV end ---
    rig.update(
      pilotPosition,
      rov.deployed ? rov.yaw : sub.yaw,
      rov.deployed ? 0 : sub.pitch,
      time.frameDelta,
      {
        roll: sub.roll,
        velocity: rov.deployed ? rov.velocity : sub.velocity,
      },
    );
    // --- D-ROV begin ---
    if (rov.deployed && rig.mode !== 'orbit') {
      rig.camera.position.y += config.rov.cameraRaiseM;
      cameraFromSub.copy(rig.camera.position).sub(sub.position);
      const distance = cameraFromSub.length();
      if (distance < config.rov.mothershipCameraClearanceM) {
        if (distance < 0.001) cameraFromSub.copy(rov.forward);
        cameraFromSub.normalize().multiplyScalar(config.rov.mothershipCameraClearanceM);
        rig.camera.position.copy(sub.position).add(cameraFromSub);
      }
      rovCameraAim.copy(rov.position).addScaledVector(rov.forward, config.rov.cameraLookAheadM);
      rovCameraAim.y += config.rov.cameraAimAboveM;
      rig.camera.lookAt(rovCameraAim);
      subMesh.group.visible =
        rig.camera.position.distanceTo(sub.position) > config.rov.mothershipCameraClearanceM + 3;
    }
    // --- D-ROV end ---
    // --- D-PHOTO begin ---
    if (photoMode.active) {
      photoPoi = poiInPhoto(rig.camera, discovery.pois, pilotPosition);
      photoMode.setCaption(journal.siteName(contentLandmark), photoPoi?.name ?? null);
      if (sampled.capturePhoto) photoCaptureRequested = true;
    }
    // --- D-PHOTO end ---
    const atmo = atmosphere.update(rig.camera.position.y, sub.position, time.frameDelta);
    // --- C3 begin ---
    presets.update(
      frozen ? 0 : time.frameDelta,
      rov.deployed ? 0 : steps * time.fixedDelta * sub.simSpeed,
      atmo,
      rig.camera,
      renderer.domElement.height,
      time.elapsed,
    );
    // --- C3 end ---
    const fogNow = { color: atmo.fogColor, density: atmo.fogDensity };
    headlights.update(sub.position, forward, fogNow);
    snow.update(rig.camera, atmo, time.frameDelta, renderer.domElement.height);
    water.update(rig.camera.position.y, sub.position, time.elapsed, fogNow);

    // fix S (QA-B #10): mission clock and DIVE TIME count real seconds of
    // unfrozen play, not capped physics time.
    const clockDt = frozen ? 0 : time.frameDelta;
    // --- D-ROV begin ---
    const rovScanRadii = rov.deployed
      ? discovery.pois.map((poi) => {
          const radius = poi.radius;
          poi.radius *= config.rov.scanRangeFactor;
          return radius;
        })
      : null;
    // --- D-ROV end ---
    // --- B1 begin ---
    discovery.update(
      steps * time.fixedDelta,
      time.frameDelta,
      pilotPosition,
      pilotForward,
      missionRouter?.debriefOpen ? { ...state, scan: false } : state, // B3: no beam under the debrief
      rig.camera,
      clockDt,
    );
    // --- B1 end ---
    // --- D-ROV begin ---
    if (rovScanRadii)
      discovery.pois.forEach((poi, index) => {
        poi.radius = rovScanRadii[index]!;
      });
    // --- D-ROV end ---
    // --- D-SCAN begin ---
    const nextScanObjective =
      missionRouter?.mission.objectives.find((o) => o.resolved && !o.complete && o.primary) ??
      missionRouter?.mission.objectives.find((o) => o.resolved && !o.complete);
    const scanContent = route?.def.objectives.find((o) => o.id === nextScanObjective?.id) as
      { hint?: string } | undefined;
    waypoints.update(
      rig.camera,
      pilotPosition,
      nextScanObjective
        ? {
            poiId: nextScanObjective.poiId,
            title: nextScanObjective.title,
            hint: scanContent?.hint ?? scanObjectiveHints.get(nextScanObjective.id),
          }
        : null,
    );
    // --- D-SCAN end ---
    // --- D-SONAR begin ---
    sonar.setObjective(nextScanObjective?.poiId ?? null);
    sonar.update(s);
    // --- D-SONAR end ---
    // --- D-POWER begin ---
    const powerState = power.state;
    hud.setPowerState(powerState);
    // --- D-POWER end ---
    // --- D-CURRENTS begin ---
    hud.setCurrentStatus(currents.status);
    // --- D-CURRENTS end ---
    // --- D-INPUT-HUD begin ---
    const scanView = discovery.scanner.view;
    // --- D-ROV begin ---
    const rovControlTips = `${input.primaryKeyLabel('thrustForward')}/${input.primaryKeyLabel('thrustReverse')} fly · ${input.primaryKeyLabel('yawPort')}/${input.primaryKeyLabel('yawStarboard')} turn · ${input.primaryKeyLabel('ballastBlow')}/${input.primaryKeyLabel('ballastFlood')} rise/sink · ${input.primaryKeyLabel('scan')} scan · ${input.primaryKeyLabel('toggleRov')} retrieve ROV`;
    // --- D-ROV end ---
    hud.update(s, {
      nearScanTarget: discovery.focusPoint() !== null,
      // The objectives panel already shows the current objective; a second
      // copy here crowded the screen (owner playtest).
      objective: undefined,
      scanPrompt: scanView.candidateId
        ? `${input.primaryKeyLabel('scan')} Scan · ${scanView.nearestName}`
        : null,
      simSpeed: sub.simSpeed,
      controlTips:
        !frozen &&
        rig.mode !== 'orbit' &&
        save.get().controlTips &&
        performance.now() < cameraTipsUntil
          ? rov.deployed
            ? rovControlTips
            : `${input.primaryKeyLabel('thrustForward')}/${input.primaryKeyLabel('thrustReverse')} speed · ${input.primaryKeyLabel('yawPort')}/${input.primaryKeyLabel('yawStarboard')} turn · ${input.primaryKeyLabel('ballastBlow')}/${input.primaryKeyLabel('ballastFlood')} rise/sink · Drag: look · Wheel: zoom · ${input.primaryKeyLabel('resetCamera')}: reset camera`
          : null,
    });
    // --- D-INPUT-HUD end ---
    // --- B3 begin ---
    // fix S: `s` lets the router turn the end of an emergency blow into the
    // "Dive aborted" debrief (plan/DECISIONS.md failure model).
    missionRouter?.update(clockDt, time.frameDelta, sub.position, s.headingDeg, s);
    // --- B3 end ---
    // --- B4 begin ---
    props.update(rig.camera);
    if (debugTerrain && nowMs - lastTerrainLog > 1000) {
      console.info(`[props] ${props.debugString()}`);
    }
    // --- B4 end ---
    if (!frozen)
      audio.update({
        depth: s.depth,
        throttle: rov.deployed ? 0 : state.throttle,
        ballast: rov.deployed ? 0 : state.ballast,
        speed: s.speed,
        position: sub.position,
        forward,
        pingPressed: state.ping,
      });

    // --- C1 begin ---
    globe.update(time.frameDelta);
    // --- D-SHELL begin ---
    homeGlobe.update(time.frameDelta);
    // --- D-SHELL end ---
    // --- C1 end ---

    // Chunk LOD selection + draw-call accounting; must run before render.
    terrain.update(rig.camera);

    // Scene -> offscreen target, then the post-process pass to the screen.
    // --- C5 begin ---
    if (atmoTier.post && postFxOn) {
      // --- C5 end ---
      // Grade and vignette come from the current depth band (A2).
      (post.material.uniforms.uTint!.value as THREE.Color).copy(atmo.gradeTint);
      post.material.uniforms.uVignette!.value = atmo.vignette;
      renderer.setRenderTarget(post.target);
      renderer.clear();
      renderer.render(scene, rig.camera);
      post.render(renderer, time.elapsed, atmo.depth01);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, rig.camera);
    }
    // --- D-PHOTO begin ---
    // Read the canvas in the same task as the render, before it is composited.
    if (photoCaptureRequested) {
      photoCaptureRequested = false;
      if (photoMode.active) capturePhoto(pilotPosition);
    }
    // --- D-PHOTO end ---

    input.endFrame();

    if (debugTerrain && nowMs - lastTerrainLog > 1000) {
      lastTerrainLog = nowMs;
      console.info(
        // The post quad's own render() auto-resets info, so add the scene's calls it captured.
        `[terrain] ${terrain.debugString()} | ${atmosphere.debugString()} | ` +
          `draws ${(atmoTier.post ? post.sceneDrawCalls : 0) + renderer.info.render.calls} | ` +
          `${(1 / Math.max(1e-3, time.frameDelta)).toFixed(0)} fps`,
      );
    }

    if (!ready) {
      ready = true;
      window.__gameReady = true;
      bus.emit('game:ready', { tileId: meta.id });
      console.info(`[main] ready: ${meta.id}`);
    }
  }

  window.__game = {
    scene,
    renderer,
    terrain,
    sub,
    rig,
    water,
    atmosphere,
    headlights,
    audio,
    bus,
    config,
    // --- D-POWER begin ---
    power,
    // --- D-POWER end ---
    // --- D-CURRENTS begin ---
    currents,
    // --- D-CURRENTS end ---
    // --- D-ROV begin ---
    rov,
    rovHud,
    rovVisual,
    // --- D-ROV end ---
    // --- D-PHOTO begin ---
    photos,
    photoMode,
    // --- D-PHOTO end ---
    meta,
    // --- B1 begin ---
    scanner: discovery.scanner,
    discoveries: discovery.store,
    discovery,
    debrief: discovery.debrief,
    fieldGuide: discovery.guide,
    // --- B1 end ---
    // --- B4 begin ---
    props,
    propsDebug,
    // --- B4 end ---
    // --- C3 begin ---
    presets,
    // --- C3 end ---
    // --- B3 begin ---
    mission: missionRouter?.mission ?? null,
    missionRouter,
    missionSelect,
    sonar,
    // --- B3 end ---
    // --- D-SCAN begin ---
    waypoints,
    // --- D-SCAN end ---
    // --- D-FLOW begin ---
    journal,
    // --- D-FLOW end ---
    // --- C1 begin ---
    globe,
    // --- D-SHELL begin ---
    home,
    homeGlobe,
    pause,
    get appState() {
      return appState;
    },
    // --- D-SHELL end ---
    // --- C1 end ---
    // --- C5 begin ---
    save,
    settings: settingsScreen,
    captions,
    input,
    // --- C5 end ---
  };
  requestAnimationFrame(frame);
}

main().catch((err: unknown) => {
  showFatal(err instanceof Error ? `${err.message}` : String(err));
});
