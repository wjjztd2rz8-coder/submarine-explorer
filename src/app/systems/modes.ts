/**
 * Gameplay modes (D-MODES): speed / descent profiles, sensor presets and sim
 * speed from the saved gameplay options, applied at boot and live when the
 * options change.
 */

import type { GameConfig } from '../../core/Config.js';
import type { SettingsData } from '../../core/Save.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

/**
 * Boot-time part, run before anything reads the config: profile values into
 * `config.submarine` / `config.camera`, sensor range into `config.scan`.
 * Returns the unscaled hint range for later changes.
 */
export function applyBootModes(
  config: GameConfig,
  settings: SettingsData,
): { baseHintRangeFactor: number } {
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
  return { baseHintRangeFactor };
}

export const modesSystem: GameSystem = {
  name: 'modes',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { config, discovery, save } = ctx;
    const baseScanRadii = new Map<string, number>();
    ctx.baseScanRadii = baseScanRadii;
    void discovery.ready.then(() => {
      for (const poi of discovery.pois) baseScanRadii.set(poi.id, poi.radius);
      const factor = config.sensorPresets[save.get().gameplay.sensors].scanRadiusMultiplier;
      for (const poi of discovery.pois)
        poi.radius = (baseScanRadii.get(poi.id) ?? poi.radius) * factor;
    });
    cleanup.add(
      save.onChange((next, changed) => {
        if (!changed.includes('gameplay')) return;
        ctx.sub.applyProfiles(
          config.speedProfiles[next.gameplay.speedProfile],
          config.descentProfiles[next.gameplay.descentProfile],
        );
        config.camera.lookAheadPerSpeed =
          config.speedProfiles[next.gameplay.speedProfile].cameraLookAheadPerSpeed;
        ctx.headlights.setPreset(config.lightPresets[next.gameplay.lights]);
        const sensor = config.sensorPresets[next.gameplay.sensors];
        config.scan.hintRangeFactor = ctx.baseHintRangeFactor * sensor.hintRangeMultiplier;
        for (const poi of discovery.pois)
          poi.radius = (baseScanRadii.get(poi.id) ?? poi.radius) * sensor.scanRadiusMultiplier;
        ctx.sub.setSimSpeed(next.gameplay.simSpeed);
      }),
    );
  },
};
