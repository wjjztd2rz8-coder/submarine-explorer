/**
 * World systems: the terrain (built from the loaded tile at the boot tier) and
 * the free-dive landmark markers. The atmosphere sits between them in
 * `app/systems.ts` because that is the order the scene was built in.
 */

import { Landmarks } from '../../world/Landmarks.js';
import { Terrain } from '../../world/Terrain.js';
import { Disposables } from '../Disposables.js';
import type { GameSystem } from '../System.js';

const terrainCleanup = new Disposables();
const landmarksCleanup = new Disposables();

export const terrainSystem: GameSystem = {
  name: 'terrain',
  dispose: () => terrainCleanup.dispose(),
  init(ctx) {
    const { tile, meta, config, tier, scene, bus } = ctx;
    const terrain = new Terrain(
      tile,
      { ...config.terrain, detailStrength: ctx.settings.detailStrength },
      tier,
    );
    terrainCleanup.add(() => {
      terrain.dispose();
      terrain.group.removeFromParent();
    });
    ctx.terrain = terrain;
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
    ctx.expose({ terrain, meta });
  },
  frame: {
    // Chunk LOD selection + draw-call accounting; must run before render.
    'render.prepare': (_f, ctx) => ctx.terrain.update(ctx.rig.camera),
  },
};

export const landmarksSystem: GameSystem = {
  name: 'landmarks',
  dispose: () => landmarksCleanup.dispose(),
  init(ctx) {
    const { meta, config, route, scene, terrain, bus } = ctx;
    const landmarks = new Landmarks(meta, config.landmarks);
    landmarksCleanup.add(() => landmarks.dispose());
    ctx.landmarks = landmarks;
    // In a mission the POI reticle and objectives guide you; the
    // free-dive markers would only clutter the wreck. Sonar blips stay.
    landmarks.setVisible(route === null);
    scene.add(landmarks.group);
    void landmarks.load(terrain).then((placed) => {
      if (placed.length) bus.emit('landmarks:loaded', { landmarks: placed.map((p) => p.landmark) });
    });
  },
};
