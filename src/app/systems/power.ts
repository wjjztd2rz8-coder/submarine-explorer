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
      const { bus, route, discovery } = ctx;
      const power = new Power(ctx.effective.power, ctx.effective.gameplay.batteryOxygen);
      ctx.power = power;
      cleanup.add(
        bus.on('mission:started', () => {
          power.reset();
          powerEmergencyStarted = false;
          // D2-HAZARD: the descent to a deep start already used some battery.
          void discovery.ready.then(() =>
            queueMicrotask(() => {
              if (!ctx.effective.gameplay.batteryOxygen || !route) return;
              const depth = Math.max(0, -ctx.sub.position.y);
              if (depth < 25) return;
              const reserve = startingReserves(depth, ctx.effective.submarine, ctx.effective.power);
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
      ctx.expose({ power });
    },
    frame: {
      'sim.power': (f, ctx) => {
        const { power, sub, headlights, sonar } = ctx;
        const { steps, state } = f;
        if (!steps) return;
        const empty = power.step(steps * f.fixedDt * sub.simSpeed, {
          throttle: state.throttle,
          ballast: state.ballast,
          boost: state.boost,
          lights: headlights.on,
          sensors: state.scan || sonar.visible,
        });
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
          ctx.discovery.showDebrief(
            { title: 'Dive aborted', subtitle: 'Supplies exhausted · safe ascent completed' },
            null,
          );
        }
      },
      'hud.feeds': (_f, ctx) => {
        ctx.hud.setPowerState(ctx.power.state);
      },
    },
  };
}
