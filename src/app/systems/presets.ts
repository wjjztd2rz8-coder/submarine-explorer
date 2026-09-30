/**
 * Environment presets (C3, docs/presets.md): per-site look and events (vent
 * smoke, brine pool, reef light, wreck haze, …) and the current applied to
 * the sub. Runs between the atmosphere sample and the lights.
 */

import { fetchContentJson } from '../../game/ContentPath.js';
import { latLonToWorld } from '../../util/geo.js';
import { PresetSystem } from '../../world/presets/Presets.js';
import type { GameSystem } from '../System.js';

export const presetsSystem: GameSystem = {
  name: 'presets',
  init(ctx) {
    const { scene, bus, config, tier, params, meta, contentLandmark, route, terrain, sub } = ctx;
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
      currents: ctx.currents,
      currentMode: ctx.settings.gameplay.currents,
      props: ctx.props,
      discovery: ctx.discovery,
      atmosphere: ctx.atmosphere,
      headlights: ctx.headlights,
      toWorld: (lat, lon) => latLonToWorld(meta, lat, lon),
      fetchJson: fetchContentJson,
    });
    ctx.presets = presets;
    ctx.expose({ presets });
  },
  frame: {
    'env.presets': (f, ctx) => {
      const { rov, sub, rig, renderer } = ctx;
      ctx.presets.update(
        f.frozen ? 0 : f.dt,
        rov.deployed ? 0 : f.steps * f.fixedDt * sub.simSpeed,
        f.atmo,
        rig.camera,
        renderer.domElement.height,
        f.elapsed,
      );
    },
  },
};
