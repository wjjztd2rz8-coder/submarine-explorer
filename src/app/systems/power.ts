/**
 * Battery and oxygen (D-POWER): drain while diving, an emergency ascent when
 * either runs out, the free-dive "Dive aborted" debrief, and the D2-HAZARD
 * descent cost when a mission starts below 25 m.
 */

import { Power, startingReserves } from '../../game/Power.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export function createPowerSystem(): GameSystem {
  let powerEmergencyStarted = false;
  let freeDivePowerDebriefShown = false;
  return {
    name: 'power',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const { config, settings, bus, save, route, discovery } = ctx;
      const power = new Power(config.power, settings.gameplay.batteryOxygen);
      ctx.power = power;
      cleanup.add(
        bus.on('mission:started', () => {
          power.reset();
          powerEmergencyStarted = false;
          // D2-HAZARD: the descent to a deep start already used some battery.
          void discovery.ready.then(() =>
            queueMicrotask(() => {
              if (!save.get().gameplay.batteryOxygen || !route) return;
              const depth = Math.max(0, -ctx.sub.position.y);
              if (depth < 25) return;
              const reserve = startingReserves(
                depth,
                config.descentProfiles[save.get().gameplay.descentProfile],
                config.power,
              );
              power.setLevels(reserve.battery, reserve.oxygen);
              ctx.hud.notice(
                `Descent to ${Math.round(depth).toLocaleString('en-US')} m used ${Math.round((1 - reserve.battery) * 100)}% battery`,
              );
            }),
          );
        }),
      );
      // The free-dive power debrief cannot be dismissed with Escape.
      cleanup.listen(
        window,
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
      cleanup.add(
        save.onChange((next, changed) => {
          if (changed.includes('gameplay')) power.setEnabled(next.gameplay.batteryOxygen);
        }),
      );
      ctx.expose({ power });
    },
    frame: {
      'sim.power': (f, ctx) => {
        const { power, rov, sub, headlights, sonar, config } = ctx;
        const { steps, state } = f;
        if (!steps) return;
        const empty = power.step(steps * f.fixedDt * sub.simSpeed, {
          throttle: rov.deployed ? 0 : state.throttle,
          ballast: rov.deployed ? 0 : state.ballast,
          boost: rov.deployed ? false : state.boost,
          lights: headlights.on,
          sensors: state.scan || sonar.visible,
        });
        // D-ROV: the ROV draws on the same battery.
        if (rov.deployed && power.state.enabled) {
          const p = power.state;
          power.setLevels(
            p.battery -
              (steps * f.fixedDt * sub.simSpeed) / (config.rov.batteryDrainPerHour * 3600),
            p.oxygen,
          );
        }
        if (power.state.enabled && (empty || power.state.depleted) && !powerEmergencyStarted) {
          sub.startEmergencyAscent();
          powerEmergencyStarted = true;
        }
      },
      'events.power': (f, ctx) => {
        if (
          powerEmergencyStarted &&
          !f.sub.emergencyBlow &&
          !ctx.missionRouter &&
          !freeDivePowerDebriefShown
        ) {
          freeDivePowerDebriefShown = true;
          ctx.discovery.showDebrief({
            title: 'Dive aborted',
            subtitle: 'Supplies exhausted · safe ascent completed',
          });
        }
      },
      'hud.feeds': (_f, ctx) => {
        ctx.hud.setPowerState(ctx.power.state);
      },
    },
  };
}
