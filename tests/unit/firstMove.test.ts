import { describe, expect, it } from 'vitest';
import { FirstMove } from '../../src/game/FirstMove.js';
import { currentObjectiveId } from '../../src/ui/ObjectivesPanel.js';
import type { ObjectiveStatus } from '../../src/game/Mission.js';

const origin = { x: 0, y: -100, z: 0, yaw: 0 };
const idle = { throttle: 0, yaw: 0, ballast: 0 };

describe('first successful move', () => {
  it('requires actual displacement after steering, including motion after release', () => {
    const move = new FirstMove();
    move.reset(origin);
    expect(move.update(origin, { ...idle, throttle: 1 })).toBe(false);
    expect(move.update({ ...origin, z: -0.4 }, idle)).toBe(false);
    expect(move.update({ ...origin, z: -0.5 }, idle)).toBe(true);
    expect(move.update(origin, idle)).toBe(true);
  });

  it('ignores idle current drift, stick noise and non-steering input', () => {
    const move = new FirstMove();
    move.reset(origin);
    expect(move.update({ ...origin, x: 100 }, idle)).toBe(false);
    expect(move.update({ ...origin, x: 101 }, { ...idle, yaw: 0.1 })).toBe(false);
    expect(move.update({ ...origin, x: 102 }, { ...idle, scan: true } as typeof idle)).toBe(false);
    expect(move.update({ ...origin, x: 102.1 }, { ...idle, throttle: -1 })).toBe(false);
    expect(move.update({ ...origin, x: 102.6 }, idle)).toBe(true);
  });

  it('counts a depth change or successful turn and handles the angle wrap', () => {
    const move = new FirstMove();
    move.reset(origin);
    expect(move.update({ ...origin, y: -100.5 }, { ...idle, ballast: -1 })).toBe(true);
    move.reset({ ...origin, yaw: Math.PI - 0.01 });
    expect(move.update({ ...origin, yaw: -Math.PI + 0.01 }, { ...idle, yaw: 1 })).toBe(false);
    expect(move.update({ ...origin, yaw: -Math.PI + 0.04 }, idle)).toBe(true);
    move.reset(origin);
    expect(move.moved).toBe(false);
    expect(move.update(origin, idle)).toBe(false);
  });
});

const objective = (
  id: string,
  primary = true,
  complete = false,
  resolved = true,
): ObjectiveStatus => ({
  id,
  title: `Scan ${id}`,
  hint: '',
  poiId: id,
  primary,
  complete,
  resolved,
});

describe('current objective during the opening', () => {
  it('shows the first primary before navigation produces a position', () => {
    const objectives = [objective('optional', false), objective('first'), objective('second')];
    expect(currentObjectiveId(objectives, null)).toBe('first');
    expect(currentObjectiveId(objectives, 'second')).toBe('second');
    expect(currentObjectiveId(objectives, 'missing')).toBe('first');
  });

  it('advances completed steps and retains a completed row when everything is done', () => {
    const objectives = [
      objective('first', true, true),
      objective('second'),
      objective('optional', false),
    ];
    expect(currentObjectiveId(objectives, 'first')).toBe('second');
    objectives[1].complete = true;
    expect(currentObjectiveId(objectives, 'second')).toBe('optional');
    objectives[2].complete = true;
    expect(currentObjectiveId(objectives, 'optional')).toBe('first');
    expect(currentObjectiveId([], null)).toBeNull();
  });

  it('keeps the objective title available while POIs are loading', () => {
    expect(currentObjectiveId([objective('loading', true, false, false)], null)).toBe('loading');
  });
});
