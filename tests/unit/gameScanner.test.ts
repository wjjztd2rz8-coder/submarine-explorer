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

it.each(['fixed', 'wildlife', 'curiosity'] as const)(
  'keeps a coincident arrival contact out of the %s scan beam across mode changes',
  (pool) => {
    const contact = target({ position: new Vector3(0, -100, -60), radius: 30 });
    const arrival = target({
      id: 'event:plume',
      name: 'Vent plume',
      position: contact.position.clone(),
      radius: 110,
      arrivalRadiusM: 40,
      scanSeconds: 0,
    });
    const { scanner, log, store } = setup(pool === 'fixed' ? [contact] : []);
    scanner.setExtraTargets(pool === 'wildlife' ? [contact] : []);
    scanner.setSupplementalTargets(pool === 'curiosity' ? [arrival, contact] : [arrival]);
    for (const radiusFloorM of [0, 100, 0]) {
      scanner.setConfig({ ...cfg, radiusFloorM });
      scanner.update(0, AT, NORTH, true);
      const candidate = radiusFloorM === 100 ? contact.id : null;
      expect(scanner.view.candidateId).toBe(candidate);
      expect(scanner.view.nearestId).toBe(candidate ?? arrival.id);
      expect(scanner.view.nearestArrivalRadiusM).toBe(candidate ? undefined : 40);
      expect(store.keys()).toEqual([]);
    }
    scanner.setConfig({ ...cfg, radiusFloorM: 100 });
    scanner.update(contact.scanSeconds, AT, NORTH, true);
    expect(store.keys()).toEqual(['lm/bow']);
    expect(names(log).filter((name) => name === 'scan:complete')).toHaveLength(1);
    scanner.update(100, AT, NORTH, true);
    expect(scanner.view.candidateId).toBeNull();
    expect(store.keys()).toEqual(['lm/bow']);
  },
);

it('prefers the nearest unscanned contact over a closer logged contact, independent of target order', () => {
  const logged = target({ id: 'west', position: new Vector3(0, -100, -20) });
  const fresh = target({ id: 'east', position: new Vector3(0, -100, -40) });
  for (const targets of [
    [logged, fresh],
    [fresh, logged],
  ]) {
    const { scanner } = setup(targets);
    scanner.scannedThisDive.add('lm/west');
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.nearestId).toBe('east');
    expect(scanner.view.candidateId).toBe('east');
    expect(scanner.view.nearestScanned).toBe(false);
    scanner.scannedThisDive.add('lm/east');
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.nearestId).toBe('west');
    expect(scanner.view.nearestScanned).toBe(true);
    expect(scanner.view.candidateId).toBeNull();
  }
});

it('names the wildlife that Scan will scan, not the logged POI, when both are in range', () => {
  const { scanner } = setup();
  scanner.scannedThisDive.add('lm/bow');
  scanner.setExtraTargets([target({ id: 'life:fish', position: new Vector3(0, -100, -20) })]);
  scanner.update(0, AT, NORTH, false);
  expect(scanner.view.nearestId).toBe('life:fish');
  expect(scanner.view.nearestScanned).toBe(false);
  expect(scanner.view.candidateId).toBe('life:fish');
});

it('keeps a logged contact in scan range ahead of a distant unscanned hint, then resumes remote guidance after leaving', () => {
  const logged = target({ id: 'logged', position: new Vector3(0, -100, -80) });
  const remote = target({ id: 'remote', position: new Vector3(0, -100, -300) });
  for (const targets of [
    [logged, remote],
    [remote, logged],
  ]) {
    const { scanner } = setup(targets);
    scanner.update(logged.scanSeconds, AT, NORTH, true);
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.nearestId).toBe('logged');
    expect(scanner.view.nearestInRange).toBe(true);
    expect(scanner.view.nearestScanned).toBe(true);
    expect(scanner.view.candidateId).toBeNull();
    scanner.update(0, new Vector3(0, -100, 100), NORTH, false);
    expect(scanner.view.nearestId).toBe('remote');
    expect(scanner.view.nearestInRange).toBe(false);
    expect(scanner.view.nearestScanned).toBe(false);
  }
});

it('prefers an unscanned contact in range over a closer remote hint with a smaller radius', () => {
  const logged = target({ id: 'logged', position: new Vector3(0, -100, -20) });
  const remote = target({ id: 'remote', position: new Vector3(0, -100, -30), radius: 20 });
  const local = target({ id: 'local', position: new Vector3(0, -100, -60) });
  for (const supplemental of [false, true]) {
    const { scanner } = setup(supplemental ? [logged, remote] : [logged, remote, local]);
    if (supplemental) scanner.setSupplementalTargets([local]);
    scanner.scannedThisDive.add('lm/logged');
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.nearestId).toBe('local');
    expect(scanner.view.nearestInRange).toBe(true);
    expect(scanner.view.nearestScanned).toBe(false);
    expect(scanner.view.candidateId).toBe('local');
  }
});

describe('Scanner', () => {
  it.each(['fixed', 'wildlife', 'curiosity'] as const)(
    'applies the Arcade floor to %s targets and restores data reach in Realistic',
    (pool) => {
      const contact = target({ radius: 30 });
      const { scanner } = setup([]);
      if (pool === 'fixed') scanner.setTargets([contact]);
      if (pool === 'wildlife') scanner.setExtraTargets([contact]);
      if (pool === 'curiosity') scanner.setSupplementalTargets([contact]);
      scanner.setObjective(contact.id);
      scanner.setConfig({ ...cfg, radiusFloorM: 100 });
      scanner.update(0, AT, NORTH, false);
      expect(scanner.view.candidateId).toBe(contact.id);
      expect(scanner.view.nearestRadius).toBe(100);
      if (pool === 'fixed') expect(scanner.view.objectiveRadius).toBe(100);
      scanner.update(0, AT.clone().add(new Vector3(0, 0, 1)), NORTH, true);
      expect(scanner.view.candidateId).toBeNull();
      expect(scanner.isScanning).toBe(false);
      scanner.setConfig({ ...cfg, radiusFloorM: 0 });
      scanner.update(0, AT, NORTH, true);
      expect(scanner.view.candidateId).toBeNull();
      scanner.update(0, contact.position.clone().add(new Vector3(0, 0, 30)), NORTH, true);
      expect(scanner.view.candidateId).toBe(contact.id);
      expect(scanner.view.nearestRadius).toBe(30);
    },
  );

  it.each([false, true])(
    'selects the nearest adjacent POI at overlapping floor radii and holds its lock (reversed=%s)',
    (reversed) => {
      const a = target({ id: 'a', position: new Vector3(-10, -100, -80), radius: 30 });
      const b = target({ id: 'b', position: new Vector3(10, -100, -80), radius: 30 });
      const { scanner } = setup(reversed ? [b, a] : [a, b]);
      scanner.setConfig({ ...cfg, radiusFloorM: 100 });
      for (const [x, expected] of [
        [-1, 'a'],
        [1, 'b'],
      ] as const) {
        scanner.update(0, new Vector3(x, -100, 0), NORTH, false);
        expect(scanner.view.nearestId).toBe(expected);
        expect(scanner.view.candidateId).toBe(expected);
      }
      scanner.update(0.1, new Vector3(1, -100, 0), NORTH, true);
      scanner.update(0.1, new Vector3(-1, -100, 0), NORTH, true);
      expect(scanner.view.activeId).toBe('b');
      expect(scanner.view.nearestId).toBe('b');
      expect(scanner.view.progress).toBeCloseTo(0.1);
    },
  );

  it.each(['range', 'facing', 'logged'] as const)(
    'falls back to an eligible sample when the objective is unavailable through %s',
    (reason) => {
      const objective = target({
        id: 'objective',
        position: reason === 'facing' ? new Vector3(100, -100, 0) : new Vector3(0, -100, -100),
        radius: reason === 'range' ? 80 : 150,
      });
      const sample = target({ id: 'sample:rock', position: new Vector3(0, -100, -40) });
      const { scanner, log } = setup([objective]);
      scanner.setObjective(objective.id);
      scanner.setSupplementalTargets([sample]);
      scanner.setExtraTargets([target({ id: 'life:fish', position: new Vector3(0, -100, -20) })]);
      if (reason === 'logged') scanner.scannedThisDive.add('lm/objective');
      scanner.update(DT, AT, NORTH, true);
      expect(scanner.view.candidateId).toBe(sample.id);
      expect(scanner.view.nearestId).toBe(sample.id);
      expect(scanner.view.activeId).toBe(sample.id);
      expect(scanner.view.objectiveId).toBe(reason === 'logged' ? null : objective.id);
      expect(log[0]).toEqual(['scan:started', { poiId: sample.id }]);
      scanner.update(sample.scanSeconds, AT, NORTH, true);
      expect(log.filter(([name]) => name === 'scan:complete')).toEqual([
        ['scan:complete', { poiId: sample.id, landmarkId: 'lm', firstTime: true }],
      ]);
    },
  );

  it.each([false, true])(
    'prefers an in-cone objective over nearer contacts (reversed=%s)',
    (reversed) => {
      const objective = target({ id: 'objective', name: 'Objective' });
      const near = target({ id: 'near', position: new Vector3(0, -100, -40) });
      const { scanner, log } = setup(reversed ? [objective, near] : [near, objective]);
      scanner.setSupplementalTargets([
        target({ id: 'sample:rock', position: new Vector3(0, -100, -20) }),
      ]);
      scanner.setExtraTargets([target({ id: 'life:fish', position: new Vector3(0, -100, -15) })]);
      scanner.setObjective('objective');
      scanner.update(DT, AT, NORTH, true);
      expect(scanner.view.candidateId).toBe('objective');
      expect(scanner.view.nearestId).toBe('objective');
      expect(scanner.view.activeId).toBe('objective');
      expect(scanner.view.activeName).toBe('Objective');
      expect(log[0]).toEqual(['scan:started', { poiId: 'objective' }]);
      // Active scans stay locked even when objective guidance changes.
      scanner.setObjective('near');
      scanner.update(DT, AT, NORTH, true);
      expect(scanner.view.candidateId).toBe('objective');
      expect(scanner.view.activeId).toBe('objective');
    },
  );

  it.each(['facing', 'range'] as const)(
    'starts and names the new contact when a held scan loses its target through %s',
    (reason) => {
      const north = target({ id: 'north', name: 'North' });
      const east = target({
        id: 'east',
        name: 'East',
        position: new Vector3(200, -100, 0),
        radius: 300,
      });
      const { scanner, log, store } = setup([north, east]);
      scanner.update(0.5, AT, NORTH, true);
      const pos = reason === 'range' ? east.position.clone() : AT;
      const forward = EAST;
      log.length = 0;
      scanner.update(DT, pos, forward, true);
      expect(scanner.view.phase).toBe('scanning');
      expect(scanner.view.activeId).toBe('east');
      expect(scanner.view.activeName).toBe('East');
      expect(scanner.view.nearestId).toBe('east');
      expect(scanner.view.candidateId).toBe('east');
      expect(scanner.view.progress).toBeCloseTo(DT / east.scanSeconds, 8);
      expect(log).toEqual([
        ['scan:aborted', { poiId: 'north', reason }],
        ['scan:started', { poiId: 'east' }],
        ['scan:progress', { poiId: 'east', progress: DT / east.scanSeconds }],
      ]);
      scanner.update(east.scanSeconds, pos, forward, true);
      expect(store.isDiscovered('lm', 'north')).toBe(false);
      expect(store.isDiscovered('lm', 'east')).toBe(true);
      expect(log.filter(([name]) => name === 'scan:complete')).toEqual([
        ['scan:complete', { poiId: 'east', landmarkId: 'lm', firstTime: true }],
      ]);
    },
  );

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

  it('needs the sub below a target minimum depth, however close it is', () => {
    const { scanner, log } = setup([target({ minDepthM: 60 })]);
    run(scanner, 3, new Vector3(0, -50, 0), NORTH, true);
    expect(scanner.view.nearestInRange).toBe(false);
    expect(names(log)).not.toContain('scan:complete');
    run(scanner, 3, new Vector3(0, -70, 0), NORTH, true);
    expect(names(log)).toContain('scan:complete');
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

  it('reports the vertical correction so touch can say rise or sink', () => {
    const { scanner } = setup([target({ position: new Vector3(0, -50, -100) })]);
    scanner.update(0, AT, NORTH, false); // target 50 m above, level heading
    expect(scanner.view.nearestVertDeg).toBeCloseTo(26.57, 1);
    const below = setup([target({ position: new Vector3(0, -150, -100) })]).scanner;
    below.update(0, AT, NORTH, false);
    expect(below.view.nearestVertDeg).toBeCloseTo(-26.57, 1);
  });

  it('guides to the mission objective without changing the scan candidate', () => {
    const near = target({
      id: 'debris',
      name: 'Debris',
      position: new Vector3(0, -100, -50),
      radius: 100,
    });
    const stern = target({
      id: 'stern',
      name: 'Stern',
      position: new Vector3(300, -100, 0),
      radius: 80,
    });
    const { scanner } = setup([near, stern]);
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.objectiveId).toBeNull();
    scanner.setObjective('stern');
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.candidateId).toBe('debris');
    expect(scanner.view.nearestId).toBe('debris');
    expect(scanner.view.objectiveId).toBe('stern');
    expect(scanner.view.objectiveName).toBe('Stern');
    expect(scanner.view.objectiveDistance).toBeCloseTo(300, 3);
    expect(scanner.view.objectiveInRange).toBe(false);
    expect(scanner.view.objectiveTurnDeg).toBeCloseTo(90, 0);
    expect(scanner.view.objectiveVertDeg).toBeCloseTo(0, 3);
    // Unknown POI id or a scanned objective drops back to no objective.
    scanner.setObjective('missing');
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.objectiveId).toBeNull();
    scanner.setObjective('debris');
    scanner.scannedThisDive.add('lm/debris');
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.objectiveId).toBeNull();
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
    expect(scanner.view.completed).toBe(1);
    expect(store.get('lm', 'bow')?.count).toBe(1);
    scanner.resetDive();
    expect(scanner.view.completed).toBe(0);
    expect(scanner.view.lastCompleteId).toBeNull();
    expect(scanner.isScanned('lm', 'bow')).toBe(false);
    run(scanner, 2.2, AT, NORTH, true);
    const completes = log.filter(([n]) => n === 'scan:complete');
    expect(completes).toHaveLength(2);
    expect((completes[1]?.[1] as { firstTime: boolean }).firstTime).toBe(false);
    expect(store.get('lm', 'bow')?.count).toBe(2);
    expect(store.isDiscovered('lm', 'bow')).toBe(true);
    expect(scanner.view.completed).toBe(1);
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

it('names exactly the contact Scan will scan when a nearer off-axis contact exists', () => {
  const offAxis = target({ id: 'side', position: new Vector3(30, -100, 0) }); // 30 m east, nearer
  const ahead = target({ id: 'ahead', position: new Vector3(0, -100, -60) }); // 60 m north
  for (const targets of [
    [offAxis, ahead],
    [ahead, offAxis],
  ]) {
    const { scanner, log } = setup(targets);
    scanner.update(0, AT, NORTH, false);
    expect(scanner.view.candidateId).toBe('ahead');
    expect(scanner.view.nearestId).toBe('ahead');
    expect(scanner.view.nearestName).toBe('Bow');
    scanner.update(DT, AT, NORTH, true);
    expect(scanner.view.activeId).toBe(scanner.view.nearestId);
    expect(log.find(([n]) => n === 'scan:started')?.[1]).toEqual({ poiId: 'ahead' });
  }
});
