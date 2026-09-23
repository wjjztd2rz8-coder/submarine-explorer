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
import { HUD } from './ui/HUD.js';
import { MissionSelect } from './ui/MissionSelect.js';
import { Sonar } from './ui/Sonar.js';
import { UnderwaterPass } from './shaders/underwater.js';
import { Landmarks } from './world/Landmarks.js';
import { Terrain } from './world/Terrain.js';
import { TileLoader } from './world/TileLoader.js';
import { Water } from './world/Water.js';
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
// --- fix S begin ---
import { applyFreeDiveHull, chooseSpawn, spawnSettings } from './game/Spawn.js';
// --- fix S end ---

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
  const loader = new TileLoader();
  // --- B3 begin ---
  // `?mission=<id>` (docs/missions.md) names the tile and the content folder;
  // without it (or if its mission.json is missing) this is the free dive.
  const [index, route] = await Promise.all([loader.loadIndex(), resolveMissionRoute(params)]);
  const requested = route?.tileId ?? params.get('tile');
  const tileId = chooseTileId(requested, index, config.defaultTileId);
  // --- B3 end ---
  // Graphics tier: `?tier=low|medium|high` (see docs/terrain.md).
  const tier = resolveGraphicsTier(params.get('tier'), config.graphicsTier);
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
  // Content folder for POIs, guide and props: the mission's, else `?landmark=` / the tile.
  const contentLandmark = route?.landmarkId ?? landmarkIdFor(params, meta.id);
  // --- B3 end ---

  const subMesh = new SubMesh({
    length: 26,
    // fix S (QA-B #6): faint rim + ambient floor so the hull reads below 300 m.
    rimColor: config.submarine.hullRimColor,
    rimStrength: config.submarine.hullRimStrength,
    emissive: config.submarine.hullEmissive,
  });
  scene.add(subMesh.group);

  // A3: the rig samples the terrain so the camera never clips below the seabed.
  const rig = new CameraRig(config.camera, window.innerWidth / window.innerHeight, terrain);
  rig.snap(sub.position, sub.yaw, sub.pitch);

  // ---------------------------------------------------------------------- UI
  // --- fix S begin ---
  const hud = new HUD(meta, document.body, {
    hullRadius: config.submarine.hullRadius,
    seabedWarnAltitudeM: config.submarine.seabedWarnAltitudeM,
    seabedWarnTimeToContactS: config.submarine.seabedWarnTimeToContactS,
    seabedApproachAltitudeM: config.submarine.seabedApproachAltitudeM,
    contactAltitudeM: config.submarine.hullRadius + config.submarine.seabedClearance,
  });
  if (freeDiveHull && !freeDiveHull.cleared) hud.setHullNote('at rating limit');
  // --- fix S end ---
  const sonar = new Sonar(terrain, landmarks.placed);
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
  const missionSelect = new MissionSelect(index, {
    currentTileId: meta.id,
    currentMissionId: route?.missionId,
    collapsed: route !== null,
  });
  void loadMissionSummaries().then((list) => missionSelect.setMissions(list));

  const input = new Input(canvas);
  input.attach();

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
        simSpeed: sub.simSpeed,
        keyLabel: (action) =>
          input.primaryKeyLabel(action as Parameters<Input['primaryKeyLabel']>[0]),
      })
    : null;
  // --- B3 end ---

  // Audio: WebAudio can only start from inside a user-gesture handler, so we
  // wait for the first keydown/pointerdown rather than starting at load.
  // `terrain` already satisfies the audio module's minimal TerrainSampler
  // interface (sampleHeight), so no adapter is needed.
  const audio = new AudioSystem(config.audio, bus, terrain);
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
  }
  window.addEventListener('resize', resize);
  resize();

  // -------------------------------------------------------------------- loop
  const time = new Time(config.physicsHz);
  const forward = new THREE.Vector3();
  let ready = false;
  let lastTerrainLog = 0;
  let emergencyBlowAnnounced = false;
  let lastHullStress = 0;

  function frame(nowMs: number): void {
    requestAnimationFrame(frame);

    const sampled = input.sample();
    const realSteps = time.tick(nowMs);
    // --- B3 begin ---
    // While the mission briefing is up nothing simulates and input is ignored
    // (sampling still runs, so edge presses do not queue up behind the card).
    const frozen = missionRouter?.frozen ?? false;
    const state = frozen ? FROZEN_INPUT : sampled;
    const steps = frozen ? 0 : realSteps;
    // --- B3 end ---
    for (let i = 0; i < steps; i++) sub.step(state, time.fixedDelta);
    // --- B4 begin ---
    propContact.resolve(sub, time.frameDelta); // prop push-out, after physics (contracts §3)
    // --- B4 end ---

    if (state.toggleCamera) {
      // Mouse-look only makes sense from the first-person viewport.
      input.setMouseLook(rig.toggleMode() === 'first-person');
    }
    if (state.togglePhotoMode) rig.togglePhotoMode();
    if (state.toggleSonar) sonar.toggle();
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
      });
    } else if (!s.emergencyBlow) {
      emergencyBlowAnnounced = false;
    }

    // Present the boat.
    subMesh.setPose(sub.position, sub.yaw, sub.pitch, sub.roll);
    subMesh.update(state.throttle, time.frameDelta);
    // Hide our own hull in first person so it does not fill the screen.
    subMesh.group.visible = rig.mode === 'chase';

    sub.getForward(forward);
    // fix S (QA-B #6): a scan target in range (last frame's scanner view)
    // makes the chase camera frame it clear of our own hull.
    const scanFocus = discovery.focusPoint();
    rig.update(sub.position, sub.yaw, sub.pitch, time.frameDelta, {
      roll: sub.roll,
      velocity: sub.velocity,
      hullStress: s.hullStress,
      focus: scanFocus,
    });
    const atmo = atmosphere.update(rig.camera.position.y, sub.position, time.frameDelta);
    const fogNow = { color: atmo.fogColor, density: atmo.fogDensity };
    headlights.update(sub.position, forward, fogNow);
    snow.update(rig.camera, atmo, time.frameDelta, renderer.domElement.height);
    water.update(rig.camera.position.y, sub.position, time.elapsed, fogNow);

    hud.update(s, { nearScanTarget: scanFocus !== null }); // fix S (QA-B #14)
    sonar.update(s);
    // fix S (QA-B #10): mission clock and DIVE TIME count real seconds of
    // unfrozen play, not capped physics time.
    const clockDt = frozen ? 0 : time.frameDelta;
    // --- B1 begin ---
    discovery.update(
      steps * time.fixedDelta,
      time.frameDelta,
      sub.position,
      forward,
      missionRouter?.debriefOpen ? { ...state, scan: false } : state, // B3: no beam under the debrief
      rig.camera,
      clockDt,
    );
    // --- B1 end ---
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
    audio.update({
      depth: s.depth,
      throttle: state.throttle,
      ballast: state.ballast,
      speed: s.speed,
      position: sub.position,
      forward,
      pingPressed: state.ping,
    });

    // Chunk LOD selection + draw-call accounting; must run before render.
    terrain.update(rig.camera);

    // Scene -> offscreen target, then the post-process pass to the screen.
    if (atmoTier.post) {
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
    // --- B3 begin ---
    mission: missionRouter?.mission ?? null,
    missionRouter,
    missionSelect,
    sonar,
    // --- B3 end ---
  };
  requestAnimationFrame(frame);
}

main().catch((err: unknown) => {
  showFatal(err instanceof Error ? `${err.message}` : String(err));
});
