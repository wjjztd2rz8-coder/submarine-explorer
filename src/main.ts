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
  const index = await loader.loadIndex();
  const requested = params.get('tile');
  const tileId = requested ?? index[0]?.id ?? config.defaultTileId;
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

  const landmarks = new Landmarks(meta);
  scene.add(landmarks.group);
  void landmarks.load(terrain).then((placed) => {
    if (placed.length) bus.emit('landmarks:loaded', { landmarks: placed.map((p) => p.landmark) });
  });

  // --------------------------------------------------------------- submarine
  const sub = new Submarine(config.submarine, terrain);
  // Spawn above the centre of the tile, comfortably clear of the seabed.
  const spawnGround = terrain.sampleHeight(0, 0);
  // Close enough to the seabed that it is inside the fog's visual range.
  const spawnY =
    spawnDepth !== null
      ? Math.max(spawnGround + 40, Math.min(-config.submarine.hullRadius, -spawnDepth))
      : Math.min(-config.submarine.hullRadius, spawnGround + 90);
  sub.reset(0, spawnY, 0, 0);

  const subMesh = new SubMesh({ length: 26 });
  scene.add(subMesh.group);

  // A3: the rig samples the terrain so the camera never clips below the seabed.
  const rig = new CameraRig(config.camera, window.innerWidth / window.innerHeight, terrain);
  rig.snap(sub.position, sub.yaw, sub.pitch);

  // ---------------------------------------------------------------------- UI
  const hud = new HUD(meta);
  const sonar = new Sonar(terrain, landmarks.placed);
  new MissionSelect(index, { currentTileId: meta.id });

  const input = new Input(canvas);
  input.attach();

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

    const state = input.sample();
    const steps = time.tick(nowMs);
    for (let i = 0; i < steps; i++) sub.step(state, time.fixedDelta);

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
    subMesh.group.position.copy(sub.position);
    subMesh.group.rotation.set(sub.pitch, sub.yaw, sub.roll, 'YXZ');
    subMesh.update(state.throttle, time.frameDelta);
    // Hide our own hull in first person so it does not fill the screen.
    subMesh.group.visible = rig.mode === 'chase';

    sub.getForward(forward);
    rig.update(sub.position, sub.yaw, sub.pitch, time.frameDelta, {
      roll: sub.roll,
      velocity: sub.velocity,
      hullStress: s.hullStress,
    });
    const atmo = atmosphere.update(rig.camera.position.y, sub.position, time.frameDelta);
    const fogNow = { color: atmo.fogColor, density: atmo.fogDensity };
    headlights.update(sub.position, forward, fogNow);
    snow.update(rig.camera, atmo, time.frameDelta, renderer.domElement.height);
    water.update(rig.camera.position.y, sub.position, time.elapsed, fogNow);

    hud.update(s);
    sonar.update(s);
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
        `[terrain] ${terrain.debugString()} | ${atmosphere.debugString()} | draws ${renderer.info.render.calls} | ` +
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
  };
  requestAnimationFrame(frame);
}

main().catch((err: unknown) => {
  showFatal(err instanceof Error ? `${err.message}` : String(err));
});
