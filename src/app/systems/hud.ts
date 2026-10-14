/**
 * The dive HUD (depth, heading, speed, supplies and the hull gauge). Its
 * warnings go to the guidance slot. Other systems feed it in the `hud.feeds` stage; it draws in
 * `hud.draw`.
 */

import { HUD } from '../../ui/HUD.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const hudSystem: GameSystem = {
  name: 'hud',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { meta, config, settings, save, bus, freeDiveHull } = ctx;
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
    ctx.hud = hud;
    if (freeDiveHull && !freeDiveHull.cleared) hud.setHullNote('at rating limit');
    // D2-HAZARD: how nearing the rated depth is shown.
    hud.setHullWarningStyle(settings.hullWarningStyle);
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('hullWarningStyle')) hud.setHullWarningStyle(next.hullWarningStyle);
      }),
    );
    // D-CURRENTS: the current readout.
    hud.setCurrentMode(ctx.effective.currentMode);
    cleanup.add(bus.on('env:current', (current) => hud.setCurrent(current)));
  },
  frame: {
    'hud.draw': (f, ctx) => {
      const { hud, discovery, sub, guidance, missionRouter } = ctx;
      hud.update(f.sub, {
        nearScanTarget: discovery.focusPoint() !== null,
        simSpeed: sub.simSpeed,
      });
      // Warnings are shown by the guidance slot, so they never need their own
      // spot on the screen. The router's emergency-ascent message wins.
      const text = missionRouter?.alert ?? hud.warning;
      guidance.offer('warning', 'urgent', text ? { kicker: 'WARNING', text, tone: 'alert' } : null);
    },
  },
};
