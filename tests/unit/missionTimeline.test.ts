/**
 * B3 time budget: the Titanic mission must be playable start -> debrief in
 * under 10 minutes at 2x sim speed (plan/WORK-PACKAGES.md). This drives the
 * real Submarine physics with Config's numbers and checks the budget, so a
 * tuning change that breaks it fails here. The numbers are written up in
 * docs/missions.md (run with `--reporter verbose` to see them logged).
 */

import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';

const DT = 1 / 60;
const SEABED = -3802; // GMRT seabed at the bow (pois.json note)
const BOW_DEPTH = 3790; // pois.json titanic-bow depth_m
const TRANSIT_M = 2005; // spawn -> bow, from mission.json / pois.json lat-lon
const BOW_STERN_M = 600;
const SCANS_S = 4 + 4; // bow + stern scan_seconds (real time, not sim time)

const flat: HeightField = {
  sampleHeight: () => SEABED,
  getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
};

const input = (over: Partial<InputState>): InputState => ({ ...FROZEN_INPUT, ...over });

/** Simulated seconds (at 1x) until `done` holds, stepping 1/60 s. */
function simUntil(sub: Submarine, cmd: InputState, done: () => boolean, maxS = 3600): number {
  let t = 0;
  while (!done() && t < maxS) {
    sub.step(cmd, DT);
    t += DT;
  }
  return t;
}

function freshSub(y: number): Submarine {
  const sub = new Submarine(DEFAULT_CONFIG.submarine, flat);
  sub.reset(0, y, 0, 0);
  return sub;
}

describe('Titanic mission timeline', () => {
  const c = DEFAULT_CONFIG;
  const hullY = -Math.max(5, c.submarine.hullRadius);

  // Terminal speeds.
  const vSub = freshSub(-1000);
  simUntil(vSub, input({ ballast: -1 }), () => false, 60);
  const vertical = -vSub.velocity.y;
  const fSub = freshSub(-1000);
  simUntil(fSub, input({ throttle: 1 }), () => false, 60);
  const forward = Math.hypot(fSub.velocity.x, fSub.velocity.z);

  // Descent, ballast only (sim seconds at 1x).
  const dSub = freshSub(hullY);
  const descentS = simUntil(dSub, input({ ballast: -1 }), () => dSub.position.y <= -BOW_DEPTH);
  // Typical pilot: W + Shift toward the bow until the 2 km are covered, then
  // Shift only (holding W all the way down would overshoot the wreck by km).
  const cSub = freshSub(hullY);
  const run = (): number => Math.hypot(cSub.position.x, cSub.position.z);
  const reached = (): boolean => cSub.position.y <= -BOW_DEPTH;
  const combinedS =
    simUntil(cSub, input({ ballast: -1, throttle: 1 }), () => reached() || run() >= TRANSIT_M) +
    simUntil(cSub, input({ ballast: -1 }), reached);
  const combinedRunM = run();

  const transitS = TRANSIT_M / forward;
  const bowSternS = BOW_STERN_M / forward;
  const realAt = (speed: number, simS: number): number => simS / speed;
  // Worst case: descend, then transit, then bow -> stern, one after the other.
  const sequentialSim = descentS + transitS + bowSternS;
  const budget = (speed: number): number =>
    realAt(speed, sequentialSim) + SCANS_S + c.mission.completeDelayS;
  // Typical: descend while transiting (the spawn heading points at the bow).
  const overlapSim = combinedS + Math.max(0, TRANSIT_M - combinedRunM) / forward + bowSternS;
  const typical = (speed: number): number =>
    realAt(speed, overlapSim) + SCANS_S + c.mission.completeDelayS;

  it('logs the numbers for docs/missions.md', () => {
    const f = (s: number): string => `${s.toFixed(0)} s (${(s / 60).toFixed(1)} min)`;
    console.info(
      [
        `vertical terminal (full flood) ${vertical.toFixed(2)} m/s, forward terminal ${forward.toFixed(2)} m/s`,
        `descent ${BOW_DEPTH} m: ${f(descentS)} sim; W+Shift for the transit then Shift: ${f(combinedS)} sim, ${combinedRunM.toFixed(0)} m run`,
        `transit ${TRANSIT_M} m: ${f(transitS)} sim; bow->stern ${BOW_STERN_M} m: ${f(bowSternS)} sim`,
        `descent real: 1x ${f(descentS)}, 2x ${f(descentS / 2)}, 3x ${f(descentS / 3)}`,
        `sequential total real: 1x ${f(budget(1))}, 2x ${f(budget(2))}, 3x ${f(budget(3))}`,
        `overlapped total real: 1x ${f(typical(1))}, 2x ${f(typical(2))}, 3x ${f(typical(3))}`,
      ].join('\n'),
    );
    expect(vertical).toBeGreaterThan(0);
  });

  it('terminal speeds match the Config comments', () => {
    expect(forward).toBeGreaterThan(5.5);
    expect(forward).toBeLessThan(6.5);
    expect(vertical).toBeGreaterThan(4.5);
    expect(vertical).toBeLessThan(6.5);
  });

  it('start -> debrief fits in 10 minutes at 2x, even flying the legs one after another', () => {
    expect(budget(2)).toBeLessThan(600);
  });

  it('the mission starts at a sim speed where the descent is well under 6 minutes', () => {
    expect(realAt(c.mission.defaultSimSpeed, descentS)).toBeLessThan(6 * 60);
    expect(budget(c.mission.defaultSimSpeed)).toBeLessThan(budget(2));
  });
});
