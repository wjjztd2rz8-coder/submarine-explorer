import { afterEach, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { createRevealSystem } from '../../src/app/systems/reveal.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import type { PlacedPoi } from '../../src/game/Pois.js';

const card = vi.hoisted(() => ({ show: vi.fn(), hide: vi.fn(), dispose: vi.fn() }));
vi.mock('../../src/ui/DiscoveryCard.js', () => ({
  DiscoveryCard: class {
    show = card.show;
    hide = card.hide;
    dispose = card.dispose;
  },
}));
vi.mock('../../src/ui/PhotoMode.js', () => ({ canvasThumbnail: () => null }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
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
  const ctx = {
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
    rig: { camera: new PerspectiveCamera(), beginReveal: vi.fn(), endReveal: vi.fn() },
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
  return { ctx, system, bus, scan, frame };
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
