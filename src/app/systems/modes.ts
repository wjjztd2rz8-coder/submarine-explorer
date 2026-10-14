import { resolveEffective } from '../../game/EffectiveSettings.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

/** The sole live application path for modes and Daily conditions. */
export const modesSystem: GameSystem = {
  name: 'modes',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const baseScanRadii = new Map<string, number>();
    ctx.baseScanRadii = baseScanRadii;
    void ctx.discovery.ready.then(() => {
      for (const poi of ctx.discovery.pois) {
        baseScanRadii.set(poi.id, poi.radius);
        poi.radius *= ctx.effective.sensor.scanRadiusMultiplier;
      }
    });
  },
  start(ctx) {
    const recompute = (): void => {
      const settings = ctx.save.get();
      const effective = resolveEffective(settings, settings.gameplayMode, ctx.daily, ctx.config);
      ctx.effective = effective;
      ctx.sub.setConfig(effective.submarine);
      ctx.rig.setConfig(effective.camera);
      ctx.discovery.scanner.setConfig(effective.scan);
      ctx.power.setConfig(effective.power);
      ctx.power.setEnabled(effective.gameplay.batteryOxygen);
      ctx.headlights.setPreset(effective.light);
      ctx.sonar.setSensorRange(effective.sensor.sonarPoiRange);
      ctx.presets.setCurrentMode(effective.currentMode);
      ctx.hud.setCurrentMode(effective.currentMode);
      ctx.waypoints.setVisualHints(effective.gameplay.visualHints);
      for (const poi of ctx.discovery.pois) {
        const radius = ctx.baseScanRadii.get(poi.id);
        if (radius !== undefined) poi.radius = radius * effective.sensor.scanRadiusMultiplier;
      }
    };
    cleanup.add(
      ctx.save.onChange((_next, changed) => {
        if (changed.some((key) => ['gameplay', 'gameplayMode', 'gameplayBaseMode'].includes(key)))
          recompute();
      }),
    );
    ctx.expose({
      get effective() {
        return ctx.effective;
      },
    });
  },
};
