import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { createOnboardSystem } from '../../src/app/systems/onboard.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { HintId } from '../../src/game/Hints.js';
import type { Tutorial } from '../../src/game/Tutorial.js';
import type { TutorialSave } from '../../src/game/TutorialSave.js';
import type { TutorialCardActions } from '../../src/ui/TutorialCard.js';

// Keep real tutorial, hint engine, save and system frame logic. Replace DOM
// views only: these tests verify how actual card callbacks reach the toast.
const views = vi.hoisted(() => ({
  actions: null as TutorialCardActions | null,
  card: { show: vi.fn(), dispose: vi.fn() },
  chip: {
    visible: false,
    show: vi.fn(),
    hide: vi.fn(),
    fade: vi.fn(),
    dispose: vi.fn(),
  },
}));
vi.mock('../../src/ui/TutorialCard.js', async (original) => ({
  ...(await original<typeof import('../../src/ui/TutorialCard.js')>()),
  TutorialCard: class {
    constructor(actions: TutorialCardActions) {
      views.actions = actions;
      return views.card;
    }
  },
  HintChip: class {
    constructor() {
      return views.chip;
    }
  },
}));
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
  views.chip.visible = false;
  views.chip.show.mockImplementation(() => {
    views.chip.visible = true;
  });
  views.chip.hide.mockImplementation(() => {
    views.chip.visible = false;
  });
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
  const headlights = { on: false };
  const photos = { photos: [] as object[] };
  const ctx = {
    input: { actions: [], primaryKeyLabel: () => 'G', touchActive: false, gamepadActive: false },
    bus: new EventBus(),
    params: new URLSearchParams('tutorial=1'),
    settings: { reduceMotion: true },
    save: { onChange: () => () => {} },
    discovery: { overlay: { messages: {} }, guide: { isOpen: false } },
    app: { state: 'dive' },
    photoMode: { active: false },
    photos,
    headlights,
    journal: { isOpen: false },
    power: { state: { enabled: false } },
    cameraTips: { moved: false },
    life: { targets: [{}] },
    rov: { deployed: false },
    expose: (fields: object) => Object.assign(exposed, fields),
  } as unknown as GameContext;
  const system = createOnboardSystem();
  system.init?.(ctx);
  const tick = (state = { throttle: 0, yaw: 0, ballast: 0 }, dt = 0.1) =>
    system.frame!['hud.draw']!(
      { state, dt, elapsed: 1, frozen: false, sub: { ratedRatio: 0.01 } } as FrameState,
      ctx,
    );
  return { ctx, system, tick, onboard: exposed.onboard!, data, headlights, photos };
}

describe('onboarding completion through the system', () => {
  it('Skip tutorial persists completion and shows its toast through the following frame', () => {
    const { system, tick, onboard, data } = setup();
    try {
      tick();
      expect(onboard.tutorial.active).toBe(true);
      views.actions!.skipAll();
      tick();
      expect(onboard.tutorial.active).toBe(false);
      expect(onboard.store.get().tutorialDone).toBe(true);
      expect(JSON.parse(data.get('subexplorer.onboard.v1')!).tutorialDone).toBe(true);
      expect(views.card.show).toHaveBeenLastCalledWith(null);
      expect(views.chip.visible).toBe(true);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      views.actions!.skipAll();
      tick();
      expect(views.chip.show).toHaveBeenCalledTimes(1);
    } finally {
      system.dispose?.();
    }
  });

  it('Skip step shows completion only when the last step ends', () => {
    const { system, tick, onboard } = setup();
    try {
      for (let index = 1; index < 5; index++) {
        views.actions!.skipStep();
        tick();
        expect(onboard.tutorial.index).toBe(index);
        expect(onboard.tutorial.active).toBe(true);
        expect(onboard.store.get().tutorialDone).toBe(false);
        expect(views.chip.show).not.toHaveBeenCalled();
      }
      views.actions!.skipStep();
      tick();
      expect(onboard.tutorial.finished).toBe(true);
      expect(onboard.store.get().tutorialDone).toBe(true);
      expect(views.card.show).toHaveBeenLastCalledWith(null);
      expect(views.chip.show).toHaveBeenCalledExactlyOnceWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      views.actions!.skipStep();
      expect(views.chip.show).toHaveBeenCalledTimes(1);
    } finally {
      system.dispose?.();
    }
  });

  it('normal input/event completion still shows the same toast once', () => {
    const { ctx, system, tick, onboard, headlights, photos } = setup();
    try {
      tick({ throttle: 1, yaw: 1, ballast: 0 }, 1);
      tick({ throttle: 0, yaw: 0, ballast: 1 }, 1);
      headlights.on = true;
      tick();
      expect(onboard.tutorial.step?.id).toBe('scan');
      ctx.bus.emit('scan:started', { poiId: 'test' });
      expect(onboard.tutorial.step?.id).toBe('journal');
      photos.photos.push({});
      tick();
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
      views.actions!.skipAll();
      expect(views.chip.show).toHaveBeenLastCalledWith(
        'Nice work. The Controls guide is always in the Pause menu.',
      );
      tick();
      expect(views.chip.show).toHaveBeenLastCalledWith(
        'Animal nearby. Hold G to scan, or press G for a photo.',
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
