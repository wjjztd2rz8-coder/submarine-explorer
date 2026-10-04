/**
 * The dive HUD (depth, heading, speed, hull, warnings, prompts and control
 * tips). Other systems feed it in the `hud.feeds` stage; it draws in
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
    hud.setCurrentMode(settings.gameplay.currents);
    cleanup.add(bus.on('env:current', (current) => hud.setCurrent(current)));
  },
  frame: {
    'hud.draw': (f, ctx) => {
      const { hud, discovery, input, sub, rig, save, rov, cameraTips } = ctx;
      const scanView = discovery.scanner.view;
      const key = (action: Parameters<typeof input.primaryKeyLabel>[0]): string =>
        input.primaryKeyLabel(action);
      hud.update(f.sub, {
        nearScanTarget: discovery.focusPoint() !== null,
        // The objectives panel already shows the current objective; a second
        // copy here crowded the screen (owner playtest).
        objective: undefined,
        scanPrompt: scanView.candidateId ? `${key('scan')} Scan · ${scanView.nearestName}` : null,
        simSpeed: sub.simSpeed,
        controlTips:
          !f.frozen &&
          rig.mode !== 'orbit' &&
          save.get().controlTips &&
          performance.now() < cameraTips.until
            ? ctx.controlsCard.compactTips(rov.deployed)
            : null,
      });
      hud.layoutDataCredits();
    },
  },
};
