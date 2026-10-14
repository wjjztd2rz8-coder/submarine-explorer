import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { createOnboardSystem } from '../../src/app/systems/onboard.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { HintId } from '../../src/game/Hints.js';
import type { Tutorial } from '../../src/game/Tutorial.js';
import type { TutorialSave } from '../../src/game/TutorialSave.js';

// Keep real tutorial, hint engine, save and system frame logic. Replace the
// guidance slot with a recorder: these tests verify what the system offers it
// and how the Skip button reaches the tutorial.
const views = vi.hoisted(() => {
  const state = {
    skip: null as (() => void) | null,
    skipAll: () => {
      for (let i = 0; i < 3; i += 1) state.skip?.();
    },
    /** Every hint or note text, with its lifetime when timed. */
    chip: { show: vi.fn() },
    offers: [] as Array<{ source: string; message: Record<string, unknown> | null }>,
    guidance: {
      visible: false,
      kind: null as string | null,
      setSkipHandler: (handler: (() => void) | null) => {
        state.skip = handler;
      },
      notice: (text: string) => state.chip.show(text),
      flash: (_source: string, _kind: string, message: { text: string }, seconds: number) =>
        state.chip.show(message.text, seconds),
      offer: (source: string, _kind: string, message: Record<string, unknown> | null) => {
        state.offers.push({ source, message });
      },
    },
  };
  return state;
});
/** The latest tutorial message offered to the slot, or null when it was withdrawn. */
const lastTutorial = () =>
  views.offers.filter((o) => o.source === 'tutorial').at(-1)?.message ?? null;

vi.mock('../../src/ui/ControlsCard.js', () => ({
  ControlsCard: class {
    device = 'keyboard';
    isOpen = false;
    setDevice(device: string) {
      this.device = device;
    }
    dispose() {}
  },
}));

afterEach(() => vi.unstubAllGlobals());

function setup(seenHints: HintId[] = ['creature']) {
  vi.clearAllMocks();
  views.offers.length = 0;
  views.guidance.visible = false;
  const data = new Map([
    ['subexplorer.onboard.v1', JSON.stringify({ version: 1, tutorialDone: false, seenHints })],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { documentElement: { dataset: {} } });
  const exposed: { onboard?: { tutorial: Tutorial; store: TutorialSave } } = {};
  const ctx = {
    input: { actions: [], primaryKeyLabel: () => 'G', touchActive: false, gamepadActive: false },
    bus: new EventBus(),
    params: new URLSearchParams('tutorial=1'),
    settings: { reduceMotion: true },
    save: { onChange: () => () => {} },
    guidance: views.guidance,
    discovery: { loaded: true, guide: { isOpen: false } },
    props: { loaded: true },
    app: { state: 'dive' },
    photoMode: { active: false },
    power: { state: { enabled: false } },
    cameraTips: { moved: false },
    life: { targets: [{}] },
    expose: (fields: object) => Object.assign(exposed, fields),
  } as unknown as GameContext;
  const system = createOnboardSystem();
  system.init?.(ctx);
  const tick = (state = { throttle: 0, yaw: 0, ballast: 0 }, dt = 0.1, activeSystem = system) =>
    activeSystem.frame!['hud.draw']!(
      {
        state,
        dt,
        elapsed: 1,
        frozen: ctx.app.state !== 'dive',
        sub: { ratedRatio: 0.01, depth: -110, ratedDepth: -11000 },
      } as FrameState,
      ctx,
    );
  return { ctx, system, tick, onboard: exposed.onboard!, exposed, data };
}

describe('onboarding completion through the system', () => {
  it('rebooting an unfinished dive discards early scans and old scan listeners', () => {
    const { ctx, system, tick, exposed } = setup();
    ctx.bus.emit('scan:complete', { poiId: 'opening-target', landmarkId: 'site', firstTime: true });
    const oldTutorial = exposed.onboard!.tutorial;
    expect(oldTutorial.step?.id).toBe('move');
    system.dispose?.();
    const next = createOnboardSystem();
    try {
      next.init!(ctx);
      const onboard = exposed.onboard!;
      expect(onboard.tutorial).not.toBe(oldTutorial);
      expect(onboard.tutorial.step?.id).toBe('move');
      tick({ throttle: 1, yaw: 0, ballast: 0 }, 1, next);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1, next);
      expect(onboard.tutorial.step?.id).toBe('scan');
      ctx.bus.emit('scan:started', { poiId: 'opening-target' });
      ctx.bus.emit('scan:aborted', { poiId: 'opening-target', reason: 'released' });
      expect(onboard.tutorial.step?.id).toBe('scan');
      ctx.bus.emit('scan:complete', {
        poiId: 'opening-target',
        landmarkId: 'site',
        firstTime: false,
      });
      expect(onboard.tutorial.finished).toBe(true);
      expect(oldTutorial.step?.id).toBe('move');
      expect(onboard.store.get().tutorialDone).toBe(true);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
    } finally {
      next.dispose?.();
    }
  });

  it('an early scan is remembered only after movement and depth; started/aborted never count', () => {
    const { ctx, system, tick, onboard } = setup();
    try {
      ctx.bus.emit('scan:started', { poiId: 'opening-target' });
      ctx.bus.emit('scan:aborted', { poiId: 'opening-target', reason: 'released' });
      ctx.bus.emit('scan:complete', {
        poiId: 'opening-target',
        landmarkId: 'site',
        firstTime: false,
      });
      expect(onboard.tutorial.step?.id).toBe('move');
      expect(onboard.store.get().tutorialDone).toBe(false);
      tick({ throttle: 1, yaw: 0, ballast: 0 }, 1);
      expect(onboard.tutorial.step?.id).toBe('depth');
      expect(onboard.store.get().tutorialDone).toBe(false);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      expect(onboard.tutorial.finished).toBe(true);
      expect(onboard.store.get().tutorialDone).toBe(true);
    } finally {
      system.dispose?.();
    }
  });

  it('a new dive forgets held scan feedback and an early completion', () => {
    const { ctx, system, tick, onboard } = setup();
    try {
      ctx.bus.emit('scan:complete', {
        poiId: 'opening-target',
        landmarkId: 'site',
        firstTime: true,
      });
      ctx.bus.emit('scan:started', { poiId: 'another-target' });
      ctx.bus.emit('scan:progress', { poiId: 'another-target', progress: 0.42 });
      ctx.bus.emit('mission:started', { missionId: 'site', tileId: 'site' });
      expect(onboard.tutorial.scanning).toBe(false);
      expect(onboard.tutorial.scanProgress).toBe(0);
      tick({ throttle: 1, yaw: 0, ballast: 0 }, 1);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      expect(onboard.tutorial.step?.id).toBe('scan');
      expect(onboard.store.get().tutorialDone).toBe(false);
    } finally {
      system.dispose?.();
    }
  });

  for (const touch of [false, true]) {
    it(`remembers a completed scan before movement (${touch ? 'touch' : 'keyboard'})`, () => {
      const { ctx, system, tick, onboard } = setup();
      ctx.input.touchActive = touch;
      try {
        ctx.bus.emit('scan:started', { poiId: 'opening-target' });
        ctx.bus.emit('scan:complete', {
          poiId: 'opening-target',
          landmarkId: 'challenger-deep',
          firstTime: true,
        });
        tick();
        expect(onboard.tutorial.step?.id).toBe('move');
        tick({ throttle: 1, yaw: 0, ballast: 0 }, 1);
        expect(onboard.tutorial.step?.id).toBe('depth');
        expect(onboard.store.get().tutorialDone).toBe(false);
        tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
        expect(onboard.tutorial.finished).toBe(true);
        expect(onboard.store.get().tutorialDone).toBe(true);
        expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
          touch
            ? 'Nice work. How to play is always in the Pause menu.'
            : 'Nice work. The Controls guide is always in the Pause menu.',
        );
      } finally {
        system.dispose?.();
      }
    });
  }

  it('keeps offering the tutorial step under a scan card; the slot decides what shows', () => {
    const { system, tick, onboard } = setup();
    try {
      tick({ throttle: 1, yaw: 0, ballast: 0 }, 1);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      expect(onboard.tutorial.step?.id).toBe('scan');
      views.guidance.visible = true;
      tick();
      expect(lastTutorial()).toMatchObject({ step: 'scan', kicker: 'STEP 3 OF 3' });
      views.guidance.visible = false;
      tick();
      expect(lastTutorial()).toMatchObject({ step: 'scan' });
    } finally {
      system.dispose?.();
    }
  });

  it('an unfinished early scan does not satisfy the later scan step', () => {
    const { ctx, system, tick, onboard } = setup();
    try {
      ctx.bus.emit('scan:started', { poiId: 'opening-target' });
      tick({ throttle: 1, yaw: 0, ballast: 0 }, 1);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      expect(onboard.tutorial.step?.id).toBe('scan');
      expect(onboard.store.get().tutorialDone).toBe(false);
    } finally {
      system.dispose?.();
    }
  });

  it('a new dive clears deferred scan completion', () => {
    const { ctx, system, tick, onboard } = setup();
    try {
      ctx.bus.emit('scan:complete', {
        poiId: 'opening-target',
        landmarkId: 'challenger-deep',
        firstTime: false,
      });
      ctx.bus.emit('mission:started', { missionId: 'endurance', tileId: 'endurance' });
      tick({ throttle: 1, yaw: 0, ballast: 0 }, 1);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      expect(onboard.tutorial.step?.id).toBe('scan');
    } finally {
      system.dispose?.();
    }
  });

  it('1020: waits for the authored opening before judging a new descent', () => {
    const { ctx, system, onboard } = setup(['creature']);
    const draw = (dt: number, depth: number, frozen = false) =>
      system.frame!['hud.draw']!(
        {
          state: { throttle: 0, yaw: 0, ballast: 0 },
          dt,
          elapsed: 1000,
          frozen,
          sub: { depth, ratedDepth: -11000, ratedRatio: depth / -11000 },
        } as FrameState,
        ctx,
      );
    try {
      views.skipAll();
      views.chip.show.mockClear();
      ctx.props.loaded = false;
      draw(1, -100);
      ctx.props.loaded = true;
      ctx.discovery.loaded = false;
      draw(1, -500);
      ctx.discovery.loaded = true;
      draw(1, -10903);
      draw(100, -10903);
      expect(views.chip.show).not.toHaveBeenCalled();
      expect(onboard.store.get().seenHints).toEqual(['creature']);
      draw(1, -10913);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Near hull rating. Ascend to ease pressure.',
        9,
      );
    } finally {
      system.dispose?.();
    }
  });

  it('1020: counts dive time rather than loading, pause or app-clock time', () => {
    const { ctx, system, onboard } = setup(['creature']);
    const draw = (dt: number, depth: number, frozen = false) =>
      system.frame!['hud.draw']!(
        {
          state: { throttle: 0, yaw: 0, ballast: 0 },
          dt,
          elapsed: 1000,
          frozen,
          sub: { depth, ratedDepth: -11000, ratedRatio: depth / -11000 },
        } as FrameState,
        ctx,
      );
    try {
      views.skipAll();
      views.chip.show.mockClear();
      draw(1, -100);
      draw(18.999, -9900);
      draw(100, -9900, true);
      expect(views.chip.show).not.toHaveBeenCalled();
      expect(onboard.store.get().seenHints).toEqual(['creature']);
      ctx.bus.emit('mission:started', { missionId: 'challenger-deep', tileId: 'challenger-deep' });
      draw(20, -9900);
      expect(views.chip.show).not.toHaveBeenCalled();
      draw(1, -9910);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Near hull rating. Ascend to ease pressure.',
        9,
      );
    } finally {
      system.dispose?.();
    }
  });
  it('960: offers copy for the active device after switching inputs', () => {
    const { ctx, system, tick } = setup();
    try {
      tick();
      expect(lastTutorial()?.text).toBe('Hold G to move, then G or G to turn.');
      ctx.input.touchActive = true;
      tick();
      expect(lastTutorial()?.text).toBe('Left stick: move and turn.');
      window.dispatchEvent(new Event('keydown'));
      tick();
      expect(lastTutorial()?.text).toBe('Hold G to move, then G or G to turn.');
      ctx.input.gamepadActive = true;
      tick();
      expect(lastTutorial()?.text).toBe('Use the left stick: up to move, sideways to turn.');
    } finally {
      system.dispose?.();
    }
  });

  it('880: a mission restart resets deferred animal guidance without consuming its saved hint', () => {
    const { ctx, system, onboard, data } = setup([]);
    const draw = (dt: number, frozen = false) =>
      system.frame!['hud.draw']!(
        {
          state: { throttle: 0, yaw: 0, ballast: 0 },
          dt,
          elapsed: 1000,
          frozen,
          sub: { ratedRatio: 0.01, depth: -110, ratedDepth: -11000 },
        } as FrameState,
        ctx,
      );
    try {
      views.guidance.visible = true;
      views.skipAll();
      views.chip.show.mockClear();
      draw(7);
      ctx.bus.emit('mission:started', { missionId: 'great-blue-hole', tileId: 'great-blue-hole' });
      draw(7.999);
      draw(60, true);
      expect(views.chip.show).not.toHaveBeenCalled();
      expect(JSON.parse(data.get('subexplorer.onboard.v1')!).seenHints).toEqual([]);
      draw(0.001);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Animal nearby. Hold G to scan, or use G for a photo.',
        12,
      );
      expect(onboard.store.get().seenHints).toEqual(['creature']);
    } finally {
      system.dispose?.();
    }
  });

  it('880: hiding the scan card releases the deferred animal hint before eight seconds', () => {
    const { system, tick, onboard } = setup([]);
    try {
      views.guidance.visible = true;
      views.skipAll();
      views.chip.show.mockClear();
      tick();
      expect(onboard.store.get().seenHints).toEqual([]);
      views.guidance.visible = false;
      tick();
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Animal nearby. Hold G to scan, or use G for a photo.',
        12,
      );
      expect(onboard.store.get().seenHints).toEqual(['creature']);
    } finally {
      system.dispose?.();
    }
  });

  it('880: delaying animal guidance never delays the low-battery safety hint', () => {
    const { ctx, system, tick, onboard } = setup([]);
    try {
      views.guidance.visible = true;
      Object.assign(ctx.power.state, { enabled: true, battery: 0.2 });
      views.skipAll();
      views.chip.show.mockClear();
      tick();
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Battery low. Ascend or turn off lights (G).',
        9,
      );
      expect(onboard.store.get().seenHints).toEqual(['battery-low']);
    } finally {
      system.dispose?.();
    }
  });

  it('delays animal guidance until eight dive seconds even when the app clock is already large', () => {
    const { ctx, system, onboard } = setup([]);
    const draw = (dt: number, frozen = false) =>
      system.frame!['hud.draw']!(
        {
          state: { throttle: 0, yaw: 0, ballast: 0 },
          dt,
          elapsed: 1000,
          frozen,
          sub: { ratedRatio: 0.01, depth: -110, ratedDepth: -11000 },
        } as FrameState,
        ctx,
      );
    try {
      views.guidance.visible = true;
      views.skipAll();
      views.chip.show.mockClear();
      draw(7.999);
      draw(20, true);
      expect(views.chip.show).not.toHaveBeenCalled();
      expect(onboard.store.get().seenHints).toEqual([]);
      draw(0.001);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Animal nearby. Hold G to scan, or use G for a photo.',
        12,
      );
      expect(onboard.store.get().seenHints).toEqual(['creature']);
    } finally {
      system.dispose?.();
    }
  });

  it('Skip tutorial persists completion and shows its toast through the following frame', () => {
    const { system, tick, onboard, data } = setup();
    try {
      tick();
      expect(onboard.tutorial.active).toBe(true);
      views.skipAll();
      tick();
      expect(onboard.tutorial.active).toBe(false);
      expect(onboard.store.get().tutorialDone).toBe(true);
      expect(JSON.parse(data.get('subexplorer.onboard.v1')!).tutorialDone).toBe(true);
      expect(lastTutorial()).toBeNull();
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      views.skipAll();
      tick();
      expect(views.chip.show).toHaveBeenCalledTimes(1);
    } finally {
      system.dispose?.();
    }
  });

  it('Skip step shows completion only when the last step ends', () => {
    const { system, tick, onboard } = setup();
    try {
      for (let index = 1; index < 3; index++) {
        views.skip!();
        tick();
        expect(onboard.tutorial.index).toBe(index);
        expect(onboard.tutorial.active).toBe(true);
        expect(onboard.store.get().tutorialDone).toBe(false);
        expect(views.chip.show).not.toHaveBeenCalled();
      }
      views.skip!();
      tick();
      expect(onboard.tutorial.finished).toBe(true);
      expect(onboard.store.get().tutorialDone).toBe(true);
      expect(lastTutorial()).toBeNull();
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      views.skip!();
      expect(views.chip.show).toHaveBeenCalledTimes(1);
    } finally {
      system.dispose?.();
    }
  });

  it('normal input/event completion still shows the same toast once', () => {
    const { ctx, system, tick, onboard } = setup();
    try {
      tick({ throttle: 1, yaw: 1, ballast: 0 }, 1);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      expect(onboard.tutorial.step?.id).toBe('scan');
      ctx.bus.emit('scan:started', { poiId: 'test' });
      expect(onboard.tutorial.step?.id).toBe('scan');
      tick();
      expect(lastTutorial()?.text).toContain('Scanning…');
      ctx.bus.emit('scan:progress', { poiId: 'test', progress: 0.42 });
      tick();
      expect(lastTutorial()?.text).toContain('42%');
      ctx.bus.emit('scan:aborted', { poiId: 'test', reason: 'released' });
      tick();
      expect(onboard.tutorial.step?.id).toBe('scan');
      expect(lastTutorial()?.text).not.toContain('Scanning…');
      ctx.bus.emit('scan:started', { poiId: 'test' });
      ctx.bus.emit('scan:complete', { poiId: 'test', landmarkId: 'titanic', firstTime: true });
      expect(onboard.tutorial.finished).toBe(true);
      expect(onboard.store.get().tutorialDone).toBe(true);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      tick();
      expect(views.chip.show).toHaveBeenCalledTimes(1);
    } finally {
      system.dispose?.();
    }
  });

  it('retains the contextual animal hint after skipping for a fresh player', () => {
    const { system, tick, onboard } = setup([]);
    try {
      tick();
      expect(views.chip.show).not.toHaveBeenCalled();
      views.skipAll();
      expect(views.chip.show).toHaveBeenLastCalledWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      tick();
      expect(views.chip.show).toHaveBeenLastCalledWith(
        'Animal nearby. Hold G to scan, or use G for a photo.',
        12,
      );
      expect(onboard.store.get().seenHints).toEqual(['creature']);
      tick();
      expect(views.chip.show).toHaveBeenCalledTimes(2);
    } finally {
      system.dispose?.();
    }
  });
});

it('touch hints use visible button labels', () => {
  const { ctx, system, tick } = setup(['creature']);
  ctx.input.touchActive = true;
  try {
    views.skipAll();
    views.chip.show.mockClear();
    tick(undefined, 61);
    expect(views.chip.show).not.toHaveBeenCalled();
    Object.assign(ctx.power.state, { enabled: true, battery: 0.2 });
    tick();
    expect(views.chip.show.mock.lastCall?.[0]).toContain('LIGHTS');
    expect(views.chip.show.mock.lastCall?.[0]).not.toMatch(/\b(E|G|Space|Shift)\b/);
  } finally {
    system.dispose?.();
  }
});
