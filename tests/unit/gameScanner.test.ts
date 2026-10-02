import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus, type GameEvents } from '../../src/core/EventBus.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Scanner, type ScanTarget } from '../../src/game/Scanner.js';

const DT = 1 / 60;
const cfg = { ...DEFAULT_CONFIG.scan, coneHalfAngleDeg: 30, closeRangeM: 10, decayPerSecond: 0.5 };

type Log = Array<[keyof GameEvents, unknown]>;

function setup(targets: ScanTarget[] = [target()]) {
  const bus = new EventBus();
  const log: Log = [];
  for (const name of ['scan:started', 'scan:progress', 'scan:aborted', 'scan:complete'] as const) {
    bus.on(name, (p) => log.push([name, p]));
  }
  const store = new DiscoveryStore(null);
  const scanner = new Scanner(cfg, bus, store);
  scanner.setTargets(targets);
  return { bus, log, store, scanner };
}

function target(over: Partial<ScanTarget> = {}): ScanTarget {
  return {
    id: 'bow',
    name: 'Bow',
    landmarkId: 'lm',
    position: new Vector3(0, -100, -100), // 100 m north of the origin
    radius: 150,
    scanSeconds: 2,
    ...over,
  };
}

const NORTH = new Vector3(0, 0, -1);
const EAST = new Vector3(1, 0, 0);
const AT = new Vector3(0, -100, 0);

function run(s: Scanner, seconds: number, pos: Vector3, fwd: Vector3, held: boolean): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) s.update(DT, pos, fwd, held);
}

const names = (log: Log) => log.map(([n]) => n);

describe('Scanner', () => {
  it('completes after scan_seconds of holding while in range and facing', () => {
    const { scanner, log, store } = setup();
    run(scanner, 1.9, AT, NORTH, true);
    expect(scanner.view.phase).toBe('scanning');
    expect(scanner.view.progress).toBeGreaterThan(0.9);
    expect(names(log)).not.toContain('scan:complete');
    run(scanner, 0.2, AT, NORTH, true);
    const complete = log.find(([n]) => n === 'scan:complete');
    expect(complete?.[1]).toEqual({ poiId: 'bow', landmarkId: 'lm', firstTime: true });
    expect(names(log)[0]).toBe('scan:started');
    expect(store.isDiscovered('lm', 'bow')).toBe(true);
    expect(scanner.view.phase).toBe('idle');
  });

  it('rate-limits scan:progress to the configured Hz', () => {
    const { scanner, log } = setup([target({ scanSeconds: 10 })]);
    run(scanner, 3, AT, NORTH, true);
    const progress = log.filter(([n]) => n === 'scan:progress').length;
    expect(progress).toBeGreaterThanOrEqual(25);
    expect(progress).toBeLessThanOrEqual(3 * cfg.progressEventHz + 1);
  });

  it('does nothing out of range, and reports the contact as a hint', () => {
    const { scanner, log } = setup();
    const far = new Vector3(0, -100, 200); // 300 m away
    run(scanner, 3, far, NORTH, true);
    expect(log).toEqual([]);
    expect(scanner.view.candidateId).toBeNull();
    expect(scanner.view.nearestId).toBe('bow');
    expect(scanner.view.nearestInRange).toBe(false);
  });

  it('does nothing while facing away, and says which way to turn', () => {
    const { scanner, log } = setup();
    run(scanner, 3, AT, EAST, true);
    expect(log).toEqual([]);
    expect(scanner.view.nearestInRange).toBe(true);
    expect(scanner.view.nearestFacing).toBe(false);
    // Target is north, we face east: turn to port (negative).
    expect(scanner.view.nearestTurnDeg).toBeCloseTo(-90, 0);
  });

  it('waives the facing test inside closeRangeM', () => {
    const { scanner } = setup([target({ position: new Vector3(5, -100, 0) })]);
    scanner.update(DT, AT, NORTH.clone().negate(), true);
    expect(scanner.view.phase).toBe('scanning');
  });

  it('aborts with "released" and decays, then resumes where it left off', () => {
    const { scanner, log } = setup();
    run(scanner, 1, AT, NORTH, true);
    const p = scanner.view.progress;
    scanner.update(DT, AT, NORTH, false);
    expect(log.at(-1)).toEqual(['scan:aborted', { poiId: 'bow', reason: 'released' }]);
    expect(scanner.view.phase).toBe('interrupted');
    run(scanner, 0.4, AT, NORTH, false);
    const decayed = scanner.view.progress;
    expect(decayed).toBeLessThan(p);
    expect(decayed).toBeCloseTo(p - DT * 0.5 - 0.4 * 0.5, 2);
    // Only one abort for one interruption.
    expect(log.filter(([n]) => n === 'scan:aborted')).toHaveLength(1);
    scanner.update(DT, AT, NORTH, true);
    expect(scanner.view.phase).toBe('scanning');
    expect(scanner.view.progress).toBeGreaterThan(decayed);
    expect(names(log).filter((n) => n === 'scan:started')).toHaveLength(2);
  });

  it('aborts with "facing" when the beam swings off the target', () => {
    const { scanner, log } = setup();
    run(scanner, 0.5, AT, NORTH, true);
    scanner.update(DT, AT, EAST, true);
    expect(log.at(-1)).toEqual(['scan:aborted', { poiId: 'bow', reason: 'facing' }]);
  });

  it('aborts with "range" when the sub leaves the radius', () => {
    const { scanner, log } = setup();
    run(scanner, 0.5, AT, NORTH, true);
    scanner.update(DT, new Vector3(0, -100, 200), NORTH, true);
    expect(log.at(-1)).toEqual(['scan:aborted', { poiId: 'bow', reason: 'range' }]);
  });

  it('fully decayed progress returns to idle', () => {
    const { scanner } = setup();
    run(scanner, 0.5, AT, NORTH, true);
    run(scanner, 2, AT, NORTH, false);
    expect(scanner.view.phase).toBe('idle');
    expect(scanner.view.progress).toBe(0);
    expect(scanner.view.activeId).toBeNull();
  });

  it('prefers the nearest scannable target', () => {
    const near = target({ id: 'near', position: new Vector3(0, -100, -50) });
    const far = target({ id: 'far', position: new Vector3(0, -100, -120) });
    const { scanner } = setup([far, near]);
    scanner.update(DT, AT, NORTH, true);
    expect(scanner.view.activeId).toBe('near');
  });

  it('suppresses rescans for the dive, then allows a repeat in a new dive without losing Journal state', () => {
    const { scanner, log, store } = setup();
    run(scanner, 2.2, AT, NORTH, true);
    run(scanner, 3, AT, NORTH, true); // still held: latched, no second scan
    expect(log.filter(([n]) => n === 'scan:complete')).toHaveLength(1);
    scanner.update(DT, AT, NORTH, false);
    run(scanner, 2.2, AT, NORTH, true);
    expect(log.filter(([n]) => n === 'scan:complete')).toHaveLength(1);
    expect(scanner.view.nearestScanned).toBe(true);
    expect(scanner.view.candidateId).toBeNull();
    expect(scanner.isScanned('lm', 'bow')).toBe(true);
    expect(store.get('lm', 'bow')?.count).toBe(1);
    scanner.resetDive();
    expect(scanner.isScanned('lm', 'bow')).toBe(false);
    run(scanner, 2.2, AT, NORTH, true);
    const completes = log.filter(([n]) => n === 'scan:complete');
    expect(completes).toHaveLength(2);
    expect((completes[1]?.[1] as { firstTime: boolean }).firstTime).toBe(false);
    expect(store.get('lm', 'bow')?.count).toBe(2);
    expect(store.isDiscovered('lm', 'bow')).toBe(true);
  });

  it('is suppressed while disabled (an overlay is open)', () => {
    const { scanner, log } = setup();
    scanner.enabled = false;
    run(scanner, 3, AT, NORTH, true);
    expect(log).toEqual([]);
  });

  it('progress depends on accumulated dt, not call count (fixed-step friendly)', () => {
    const a = setup([target({ scanSeconds: 4 })]);
    const b = setup([target({ scanSeconds: 4 })]);
    run(a.scanner, 1, AT, NORTH, true);
    for (let i = 0; i < 15; i++) b.scanner.update(4 * DT, AT, NORTH, true);
    expect(a.scanner.view.progress).toBeCloseTo(b.scanner.view.progress, 6);
  });
});

it('detaches an active moving target immediately when its owner disposes', () => {
  const { scanner } = setup([]);
  scanner.setExtraTargets([target({ id: 'life:comb-jelly' })]);
  run(scanner, 0.5, AT, NORTH, true);
  expect(scanner.isScanning).toBe(true);
  scanner.setExtraTargets([]);
  expect(scanner.isScanning).toBe(false);
  expect(scanner.view.candidateId).toBeNull();
  expect(scanner.view.nearestId).toBeNull();
  expect(scanner.view.progress).toBe(0);
  run(scanner, 0.1, AT, NORTH, true);
  expect(scanner.view.candidateId).toBeNull();
});
