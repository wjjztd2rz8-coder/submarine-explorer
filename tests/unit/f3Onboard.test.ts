import { describe, expect, it } from 'vitest';
import { HINT_TEXT, HintEngine, type HintContext } from '../../src/game/Hints.js';
import { TUTORIAL_STEPS, Tutorial } from '../../src/game/Tutorial.js';
import { ONBOARD_STORAGE_KEY, TutorialSave, migrateOnboard } from '../../src/game/TutorialSave.js';
import { compactTips, controlGroups } from '../../src/ui/ControlsCard.js';
import { tutorialText } from '../../src/ui/TutorialCard.js';
import type { SettingsStorage } from '../../src/core/Save.js';

const calm: HintContext = {
  battery: 1,
  ratedRatio: 0.1,
  scanTargetInRange: false,
  creatureInView: false,
  rovAvailable: false,
  canShow: true,
};
const labels = { scan: 'F', rov: 'E', photo: 'P', lights: 'L' };

describe('hint engine', () => {
  it('shows nothing when nothing is due', () => {
    expect(new HintEngine().update(100, calm)).toBeNull();
  });
  it('fires each hint once and saves it as seen', () => {
    const e = new HintEngine();
    expect(e.update(0, { ...calm, battery: 0.29 })).toBe('battery-low');
    expect(e.update(100, { ...calm, battery: 0.1 })).toBeNull();
    expect(e.seen).toEqual(['battery-low']);
  });
  it('rate limits to one hint per 20 s', () => {
    const e = new HintEngine();
    const busy = { ...calm, ratedRatio: 0.9, scanTargetInRange: true };
    expect(e.update(10, busy)).toBe('near-hull');
    expect(e.update(29.9, busy)).toBeNull();
    expect(e.update(30, busy)).toBe('scan-target');
  });
  it('does not consume a hint while it cannot be shown', () => {
    const e = new HintEngine();
    expect(e.update(0, { ...calm, scanTargetInRange: true, canShow: false })).toBeNull();
    expect(e.hasSeen('scan-target')).toBe(false);
    expect(e.update(1, { ...calm, scanTargetInRange: true })).toBe('scan-target');
  });
  it('ignores the battery when supplies are off and honours previously seen hints', () => {
    const e = new HintEngine(['creature']);
    expect(e.update(0, { ...calm, battery: null })).toBeNull();
    expect(e.update(0, { ...calm, creatureInView: true })).toBeNull();
    expect(e.update(0, { ...calm, rovAvailable: true })).toBe('rov');
  });
  it('has a one-line, caveat-free text for every hint', () => {
    for (const make of Object.values(HINT_TEXT)) {
      const text = make(labels);
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toContain('\n');
    }
  });
});

describe('tutorial progression', () => {
  const hold = (
    t: Tutorial,
    s: Partial<{ throttle: number; yaw: number; ballast: number }>,
    n = 60,
  ) => {
    for (let i = 0; i < n; i += 1) t.update({ dt: 1 / 30, throttle: 0, yaw: 0, ballast: 0, ...s });
  };
  it('has five steps in the documented order', () => {
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual(['move', 'depth', 'lights', 'scan', 'journal']);
  });
  it('move needs both thrust and turning', () => {
    const t = new Tutorial();
    hold(t, { throttle: 1 });
    expect(t.step?.id).toBe('move');
    hold(t, { yaw: -1 });
    expect(t.step?.id).toBe('depth');
  });
  it('ignores tiny stick drift and zero-length frames', () => {
    const t = new Tutorial();
    hold(t, { throttle: 0.1, yaw: 0.1 }, 600);
    expect(t.index).toBe(0);
    expect(t.update({ dt: 0, throttle: 1, yaw: 1, ballast: 1 })).toBe(false);
  });
  it('events only count for the step waiting for them', () => {
    const t = new Tutorial();
    expect(t.notify('scan')).toBe(false);
    hold(t, { throttle: 1, yaw: 1 });
    hold(t, { ballast: -1 });
    expect(t.step?.id).toBe('lights');
    expect(t.notify('journal')).toBe(false);
    expect(t.notify('lights')).toBe(true);
    expect(t.notify('scan')).toBe(true);
    expect(t.step?.id).toBe('journal');
    expect(t.notify('photo')).toBe(true);
    expect(t.finished).toBe(true);
    expect(t.active).toBe(false);
    expect(t.step).toBeNull();
  });
  it('skip step moves on; skip all ends it', () => {
    const t = new Tutorial();
    t.skipStep();
    expect(t.index).toBe(1);
    t.skipAll();
    expect(t.active).toBe(false);
    expect(t.notify('lights')).toBe(false);
  });
  it('writes text for every step on every device', () => {
    const keys = {
      move: 'W',
      turn: 'A or D',
      rise: 'Space',
      sink: 'Ctrl',
      lights: 'L',
      scan: 'F',
      photo: 'P',
      journal: 'J',
    };
    for (const step of TUTORIAL_STEPS)
      for (const device of ['keyboard', 'gamepad', 'touch'] as const)
        expect(tutorialText(step.id, device, keys).length).toBeGreaterThan(10);
  });
});

describe('onboard save', () => {
  const memory = (initial?: string): SettingsStorage & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    if (initial !== undefined) data.set(ONBOARD_STORAGE_KEY, initial);
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };
  it('defaults a new or hostile record to a new player', () => {
    for (const raw of [undefined, 'nope', '[]', '{"version":9,"tutorialDone":true}'])
      expect(new TutorialSave(memory(raw)).get()).toEqual({
        version: 1,
        tutorialDone: false,
        seenHints: [],
      });
  });
  it('round-trips and drops unknown hint ids', () => {
    const storage = memory();
    new TutorialSave(storage).save({ tutorialDone: true, seenHints: ['rov', 'battery-low'] });
    const back = new TutorialSave(storage).get();
    expect(back.tutorialDone).toBe(true);
    expect(back.seenHints).toEqual(['battery-low', 'rov']);
    expect(migrateOnboard({ tutorialDone: true, seenHints: ['x', 'rov'] }).seenHints).toEqual([
      'rov',
    ]);
  });
  it('never overwrites a newer version', () => {
    const storage = memory('{"version":2,"tutorialDone":true}');
    new TutorialSave(storage).save({ tutorialDone: true });
    expect(storage.data.get(ONBOARD_STORAGE_KEY)).toBe('{"version":2,"tutorialDone":true}');
  });
  it('works with no storage', () => {
    const s = new TutorialSave(null);
    s.save({ tutorialDone: true });
    expect(s.get().tutorialDone).toBe(true);
  });
});

describe('controls layouts', () => {
  const key = (id: string): string => ({ scan: 'F', boost: 'Shift' })[id] ?? id;
  it('gives every device a non-empty layout', () => {
    for (const device of ['keyboard', 'gamepad', 'touch'] as const) {
      const groups = controlGroups(device, key as never);
      expect(groups.length).toBeGreaterThan(1);
      for (const g of groups) expect(g.rows.length).toBeGreaterThan(0);
    }
  });
  it('shows touch buttons and no keyboard keys on touch', () => {
    const text = JSON.stringify(controlGroups('touch', key as never));
    expect(text).toContain('SCAN');
    expect(text).not.toContain('Shift');
  });
  it('compact tips follow the device', () => {
    expect(compactTips('touch', key as never, false)).toBeNull();
    expect(compactTips('keyboard', key as never, false)).toContain('speed');
    expect(compactTips('gamepad', key as never, false)).toContain('Left stick');
    expect(compactTips('keyboard', key as never, true)).toContain('retrieve ROV');
  });
});
