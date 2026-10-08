/**
 * Atmosphere (A2): depth-driven fog, lighting and caustics, the headlights,
 * marine snow and the surface lid. Updated in two stages around the
 * environment preset: the preset reads this frame's atmosphere sample, and the
 * lights, snow and water read the preset's result.
 */

import { Atmosphere, atmosphereTier } from '../../render/Atmosphere.js';
import { Headlights } from '../../render/Headlights.js';
import { MarineSnow } from '../../render/MarineSnow.js';
import { Water } from '../../world/Water.js';
import type { GameSystem } from '../System.js';
import { MONTEREY_OPENING } from '../../core/Config.js';
import { HemisphereLight } from 'three';

/** The ROV's lamp bar is this share of the sub's headlight separation. */
const ROV_LAMP_SCALE = 0.3;

export const atmosphereSystem: GameSystem = {
  name: 'atmosphere',
  init(ctx) {
    const { config, tier, scene, bus, settings, terrain } = ctx;
    const atmoTier = atmosphereTier(config.water, tier);
    const atmosphere = new Atmosphere(scene, config.water, atmoTier, bus);
    const monterey = ctx.meta.id === 'monterey-canyon';
    if (monterey) {
      const fill = MONTEREY_OPENING.hemisphere;
      const hemisphere = new HemisphereLight(fill.sky, fill.ground, fill.intensity);
      hemisphere.name = 'montereyFill';
      atmosphere.group.add(hemisphere);
    }
    const headlights = new Headlights(
      config.water,
      atmoTier,
      monterey ? MONTEREY_OPENING.lamps : undefined,
    );
    // D-MODES: the lights preset from the gameplay options.
    headlights.setPreset(config.lightPresets[settings.gameplay.lights]);
    scene.add(headlights.group);
    const snow = new MarineSnow(config.water, atmoTier);
    if (snow.points) scene.add(snow.points);
    const water = new Water(
      scene,
      config.water,
      Math.max(terrain.widthM, terrain.depthM),
      atmoTier.beamDetail,
    );
    Object.assign(ctx, { atmoTier, atmosphere, headlights, snow, water });
    ctx.expose({ water, atmosphere, headlights });
  },
  frame: {
    'env.atmosphere': (f, ctx) => {
      f.atmo = ctx.atmosphere.update(ctx.rig.camera.position.y, ctx.sub.position, f.dt);
    },
    'env.lighting': (f, ctx) => {
      const { rig, sub, renderer } = ctx;
      f.fog = { color: f.atmo.fogColor, density: f.atmo.fogDensity };
      // Beams show in dark, particle-laden water and wash out in daylight.
      const dark = 1 - Math.min(1, f.atmo.ambientIntensity / 0.9);
      const murk = f.atmo.snowDensity * (0.25 + 0.75 * dark);
      // F1-FIXES: while the ROV is out, the rig rides the ROV (its own lamps on a
      // narrower bar) instead of lighting it from behind through the mothership.
      const lit = ctx.rov.deployed ? ctx.rov : null;
      const lampOrigin = lit ? lit.position : sub.position;
      const lampForward = lit ? lit.forward : f.forward;
      ctx.headlights.update(
        lampOrigin,
        lampForward,
        f.fog,
        f.elapsed,
        murk,
        lit ? ROV_LAMP_SCALE : 1,
      );
      // D2-HAZARD: snow drifts with the preset's current.
      const lamp = ctx.headlights.lights[0]!;
      ctx.snow.update(rig.camera, f.atmo, f.dt, renderer.domElement.height, ctx.presets.current, {
        origin: lampOrigin,
        forward: lampForward,
        angle: lamp.angle,
        range: lamp.distance,
        on: ctx.headlights.on,
      });
      ctx.water.update(rig.camera.position.y, sub.position, f.elapsed, f.fog, rig.camera.position);
    },
  },
};
