/**
 * The dive HUD (depth, heading, speed, supplies and the hull gauge). Its
 * warnings go to the guidance slot. Other systems feed it in the `hud.feeds` stage; it draws in
 * `hud.draw`.
 */

import * as THREE from 'three';
import { HUD } from '../../ui/HUD.js';
import type { ScanView } from '../../game/Scanner.js';
import type { GameContext } from '../context.js';
import { hudRegions } from '../../ui/hudRegions.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

const pathProbe = new THREE.Vector3();
const pathNormal = new THREE.Vector3();

/** True when a prop box blocks the straight line toward the mission objective. */
function approachBlockedByProp(ctx: GameContext, view: ScanView): boolean {
  const { props, sub } = ctx;
  const id = view.objectiveId;
  if (!props || id == null) return false;
  const target = ctx.discovery.scanner.getTargets().find((t) => t.id === id);
  if (!target) return false;
  const r = ctx.effective.submarine.hullRadius;
  for (let step = 1; step <= 12; step++) {
    pathProbe.copy(sub.position).lerp(target.position, step / 12);
    if (props.collide(pathProbe, r, pathNormal) && Math.abs(pathNormal.y) < 0.85) return true;
  }
  return false;
}

/** How to rise, in the active input device's words. */
function riseCue(ctx: GameContext): string {
  const device = ctx.controlsCard.device;
  if (device === 'touch') return 'RISE · SLIDER UP';
  if (device === 'gamepad') {
    const pad = ctx.input.actions.find((a) => a.id === 'ballastBlow')?.pad ?? 'A';
    return `PRESS ${pad} TO RISE`;
  }
  return `HOLD ${ctx.input.primaryKeyLabel('ballastBlow')} TO RISE`;
}

export const hudSystem: GameSystem = {
  name: 'hud',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { meta, config, settings, save, bus, freeDiveHull } = ctx;
    const hud = new HUD(
      meta,
      hudRegions(),
      {
        hullRadius: config.submarine.hullRadius,
        seabedWarnAltitudeM: config.submarine.seabedWarnAltitudeM,
        seabedWarnTimeToContactS: config.submarine.seabedWarnTimeToContactS,
        seabedApproachAltitudeM: config.submarine.seabedApproachAltitudeM,
        seabedClearAltitudeM: config.submarine.seabedClearAltitudeM,
        seabedHoldS: config.submarine.seabedHoldS,
        contactAltitudeM: config.submarine.hullRadius + config.submarine.seabedClearance,
      },
      config.currents.hudMinMps,
    );
    ctx.hud = hud;
    cleanup.add(() => hud.dispose());
    if (freeDiveHull && !freeDiveHull.cleared) hud.setHullNote('at rating limit');
    // How nearing the rated depth is shown.
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
      const { hud, discovery, sub, guidance, missionRouter, config } = ctx;
      const scanView = discovery.scanner.view;
      const vertObjective =
        scanView.objectiveId !== null && Math.abs(scanView.objectiveVertDeg) > 5;
      const pc = ctx.propContact;
      const blockedApproach =
        pc?.touching &&
        f.state.throttle > 0.05 &&
        scanView.objectiveId != null &&
        scanView.phase === 'idle' &&
        !scanView.objectiveInRange;
      const pathBlocked =
        f.state.throttle > 0.05 &&
        scanView.objectiveId != null &&
        scanView.phase === 'idle' &&
        !scanView.objectiveInRange &&
        approachBlockedByProp(ctx, scanView);
      const obstacle =
        (blockedApproach && (pc!.headOn || pc!.contactNormal.y < 0.85)) || pathBlocked
          ? 'Go up ↑ to clear the tower'
          : null;
      ctx.discovery.overlay.setApproachObstacle(obstacle);
      hud.update(f.sub, {
        // Any unscanned contact in range (animals too) or scan under way: its prompt or result
        // card must not lose the slot to the static altitude warning.
        // A contact already scanned has no prompt left to protect, and a hull resting on
        // a slope it cannot climb needs the rise cue whatever is in range.
        // A deeper mission objective still needs sink/approach cues on ledges (Blue Hole).
        nearScanTarget:
          scanView.phase !== 'idle' ||
          vertObjective ||
          (scanView.nearestInRange &&
            !scanView.nearestScanned &&
            f.sub.altitude > config.submarine.hullRadius + config.submarine.seabedClearance + 1),
        dt: f.dt,
        riseCue: riseCue(ctx),
        simSpeed: sub.simSpeed,
      });
      // Warnings are shown by the guidance slot, so they never need their own
      // spot on the screen. The router's emergency-ascent message wins.
      const text = missionRouter?.alert ?? hud.warning;
      guidance.offer('warning', 'urgent', text ? { kicker: 'WARNING', text, tone: 'alert' } : null);
    },
  },
};
