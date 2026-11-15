import { afterEach, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { createRevealSystem } from '../../src/app/systems/reveal.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import type { PlacedPoi } from '../../src/game/Pois.js';

const card = vi.hoisted(() => ({
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
  showHint: vi.fn(),
  hideHint: vi.fn(),
}));
vi.mock('../../src/ui/DiscoveryCard.js', () => ({
  DiscoveryCard: class {
    show = card.show;
    hide = card.hide;
    dispose = card.dispose;
    showHint = card.showHint;
    hideHint = card.hideHint;
  },
}));
const thumbnail = vi.hoisted(() => vi.fn((): string | null => null));
vi.mock('../../src/ui/PhotoMode.js', () => ({ canvasThumbnail: thumbnail }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  thumbnail.mockReturnValue(null);
});

async function setup() {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { hidden: false, exitPointerLock: vi.fn() });
  const bus = new EventBus();
  const pois = ['a', 'b'].map(
    (id) =>
      ({
        id,
        name: id,
        kind: 'wreck',
        landmarkId: 'site',
        position: new Vector3(),
        def: {},
      }) as PlacedPoi,
  );
  const canvas = Object.assign(new EventTarget(), {
    clientWidth: 1280,
    clientHeight: 720,
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => false,
    releasePointerCapture: vi.fn(),
  });
  const ctx = {
    canvas,
    config: { camera: { fovDeg: 62 } },
    bus,
    expose: vi.fn(),
    app: { state: 'dive' },
    params: new URLSearchParams(),
    propsReady: Promise.resolve(),
    props: { placed: [] },
    photoMode: { active: false },
    sub: { position: new Vector3() },
    discovery: {
      ready: Promise.resolve(),
      pois,
      entries: [],
      store: { isDiscovered: () => true },
      siteName: 'Site',
    },
    rig: {
      camera: new PerspectiveCamera(),
      beginReveal: vi.fn(),
      endReveal: vi.fn(),
      revealSettle: vi.fn(),
      revealOrbit: vi.fn(() => true),
      revealZoom: vi.fn(() => true),
      revealRelease: vi.fn(),
    },
    renderer: { domElement: {} },
    progress: { cosmetics: { frame: 'stock' } },
  } as unknown as GameContext;
  const system = createRevealSystem();
  system.init!(ctx);
  await Promise.resolve();
  await Promise.resolve();
  const scan = (poiId: string) =>
    bus.emit('scan:complete', { poiId, landmarkId: 'site', firstTime: true });
  const frame = (dt = 0.25, blocked = false) => {
    const f = { dt, blocked } as FrameState;
    system.frame!['gate.shell']!(f, ctx);
    system.frame!['render.capture']!(f, ctx);
    return f;
  };
  return { ctx, system, bus, scan, frame, canvas };
}

it.each([false, true])(
  'clears active and queued reveals when the dive ends (opened=%s)',
  async (opened) => {
    const { ctx, system, bus, scan, frame } = await setup();
    try {
      scan('a');
      scan('b');
      if (opened) frame();
      bus.emit('mission:ended', {
        missionId: 'site',
        reason: 'surface',
        completed: 1,
        total: 2,
        durationS: 1,
      });
      expect(ctx.discovery.reveal!.active).toBe(false);
      expect(card.hide).toHaveBeenCalled();
      expect(ctx.rig.endReveal).toHaveBeenCalled();
      expect(frame(0.25, true).frozen).not.toBe(true);
    } finally {
      system.dispose!();
    }
  },
);

it.each(['pause', 'hidden', 'journal'] as const)(
  'preserves the reveal reading time while interrupted by %s',
  async (interruption) => {
    const { ctx, system, scan, frame } = await setup();
    try {
      scan('a');
      frame(0.25);
      frame(3);
      vi.mocked(ctx.rig.endReveal).mockClear();
      if (interruption === 'pause') ctx.app.state = 'pause';
      if (interruption === 'hidden') Object.assign(document, { hidden: true });
      for (let i = 0; i < 60; i++) frame(0.25, true);
      expect(ctx.rig.endReveal).not.toHaveBeenCalled();
      expect(ctx.discovery.reveal!.active).toBe(true);
      ctx.app.state = 'dive';
      Object.assign(document, { hidden: false });
      for (let i = 0; i < 40; i++) frame();
      expect(ctx.rig.endReveal).toHaveBeenCalledOnce();
      expect(ctx.discovery.reveal!.active).toBe(false);
    } finally {
      system.dispose!();
    }
  },
);

it('shows the current mission count on a replay instead of all saved primary finds', async () => {
  const { ctx, system, scan, frame } = await setup();
  try {
    Object.assign(ctx, {
      missionRouter: {
        frozen: false,
        mission: {
          objectives: [
            { poiId: 'a', resolved: true, complete: true },
            { poiId: 'b', resolved: true, complete: false },
          ],
          counts: () => ({ completed: 1, total: 2 }),
        },
      },
    });
    // Both POIs were discovered on an earlier dive; only a was scanned this time.
    scan('a');
    frame();
    expect(card.show).toHaveBeenCalledWith('a', 'a', '', 1, 2, 'Site');
  } finally {
    system.dispose!();
  }
});

it.each([false, true])('captures only authored close-up reveals (framed=%s)', async (framed) => {
  const { ctx, system, scan, frame } = await setup();
  const save = vi.fn(() => ({ saved: false }));
  Object.assign(ctx, { photos: { save }, contentLandmark: 'site', journal: { refresh: vi.fn() } });
  if (framed) ctx.discovery.pois[0].def.reveal = { distance_m: 15 };
  thumbnail.mockReturnValue('data:image/jpeg;base64,YQ==');
  try {
    scan('a');
    frame(4);
    if (framed) {
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ poiId: 'a', framedReveal: true }),
      );
    } else {
      expect(thumbnail).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    }
  } finally {
    system.dispose!();
  }
});

function pointer(type: string, init: Record<string, unknown>): Event {
  return Object.assign(new Event(type), { pointerType: 'touch', button: 0, ...init });
}

it('drags look around without dismissing, and hold the auto-close until 3 s after the last drag', async () => {
  const { ctx, system, scan, frame, canvas } = await setup();
  try {
    scan('a');
    frame(0.25);
    frame(4); // past the still capture
    const down = pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    Object.defineProperty(down, 'target', { value: canvas });
    canvas.dispatchEvent(down);
    window.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 140, clientY: 90 }));
    frame(0.1);
    expect(ctx.rig.revealOrbit).toHaveBeenCalled();
    const [dAz, dEl] = vi.mocked(ctx.rig.revealOrbit).mock.calls[0]!;
    expect(dAz).toBeLessThan(0);
    expect(dEl).toBeLessThan(0);
    expect(card.hideHint).toHaveBeenCalled();
    // Holding the finger down for a long time: no auto-close, no continue.
    for (let i = 0; i < 80; i++) frame(0.25);
    expect(ctx.rig.endReveal).not.toHaveBeenCalled();
    expect(ctx.discovery.reveal!.active).toBe(true);
    window.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 140, clientY: 90 }));
    frame(0.25);
    expect(ctx.rig.revealRelease).toHaveBeenCalled();
    // 3 s grace, then the remaining countdown (13 - 4.35 s already counted).
    for (let i = 0; i < 12; i++) frame(0.25);
    expect(ctx.rig.endReveal).not.toHaveBeenCalled();
    for (let i = 0; i < 40; i++) frame(0.25);
    expect(ctx.rig.endReveal).toHaveBeenCalledOnce();
  } finally {
    system.dispose!();
  }
});

it('takes the journal still from the authored framing before the first drag moves the camera', async () => {
  const { ctx, system, scan, frame, canvas } = await setup();
  const save = vi.fn(() => ({ saved: false }));
  Object.assign(ctx, { photos: { save }, contentLandmark: 'site', journal: { refresh: vi.fn() } });
  ctx.discovery.pois[0].def.reveal = { distance_m: 15 };
  thumbnail.mockReturnValue('data:image/jpeg;base64,YQ==');
  try {
    scan('a');
    frame(0.25);
    const down = pointer('pointerdown', { pointerId: 2, clientX: 10, clientY: 10 });
    Object.defineProperty(down, 'target', { value: canvas });
    canvas.dispatchEvent(down);
    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 60, clientY: 10 }));
    frame(0.05);
    expect(ctx.rig.revealSettle).toHaveBeenCalled();
    expect(ctx.rig.revealOrbit).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledOnce();
    frame(0.05);
    expect(ctx.rig.revealOrbit).toHaveBeenCalledOnce();
  } finally {
    system.dispose!();
  }
});

it('ignores pointers that start on the card', async () => {
  const { ctx, system, scan, frame } = await setup();
  try {
    scan('a');
    frame(4);
    const down = pointer('pointerdown', { pointerId: 3, clientX: 10, clientY: 600 });
    Object.defineProperty(down, 'target', { value: new EventTarget() });
    window.dispatchEvent(down);
    window.dispatchEvent(pointer('pointermove', { pointerId: 3, clientX: 60, clientY: 500 }));
    frame(0.1);
    expect(ctx.rig.revealOrbit).not.toHaveBeenCalled();
  } finally {
    system.dispose!();
  }
});
