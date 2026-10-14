import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { createExploreSystem } from '../../src/app/systems/explore.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';
import type { EventScheduler } from '../../src/game/Events.js';

afterEach(() => vi.unstubAllGlobals());

it('prompts an approach, witnesses once, persists the log and preserves the caption while paused', async () => {
  /** What the slot would show for the sighting: the last message offered, or null. */
  const slot = { shown: null as { text: string; detail?: string } | null };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ version: 1, secrets: [], samples: [] }),
    })),
  );
  const progress = new Progress(new ProgressSave(null));
  const store = new DiscoveryStore(null);
  const exposed = { progress } as unknown as {
    progress: Progress;
    explore: {
      ready: boolean;
      previewEvent(kind: string): boolean;
      scheduler: EventScheduler;
      summary(): { events: string[] };
    };
  };
  vi.stubGlobal('window', { __game: exposed });
  const position = new THREE.Vector3(0, -85, 0);
  const camera = new THREE.PerspectiveCamera(60, 844 / 390, 0.1, 1000);
  camera.position.set(0, -68, 20);
  camera.lookAt(0, -85, -45);
  camera.updateMatrixWorld();
  const focus = vi.fn();
  const bus = new EventBus();
  const witnessed = vi.fn();
  bus.on('event:witnessed', witnessed);
  const context = {
    tier: 'low',
    contentLandmark: 'monterey-canyon',
    meta: {},
    bus,
    scene: new THREE.Scene(),
    sub: { position, getForward: () => new THREE.Vector3(0, 0, -1) },
    rig: { camera },
    terrain: { sampleHeight: () => -100 },
    app: { state: 'dive' },
    guidance: {
      offer: (_source: string, _kind: string, message: typeof slot.shown) => {
        slot.shown = message;
      },
    },
    discovery: {
      ready: Promise.resolve(),
      store,
      debrief: {},
      scanner: { setSupplementalTargets: vi.fn(), isScanned: () => false },
    },
    journal: { focus, refresh: vi.fn() },
    sonar: { setFaintContacts: vi.fn() },
    audio: { playExploreCue: vi.fn() },
    expose: (extra: object) => Object.assign(exposed, extra),
  } as unknown as GameContext;
  const system = createExploreSystem();
  system.init!(context);
  try {
    await vi.waitFor(() => expect(exposed.explore.ready).toBe(true));
    expect(exposed.explore.previewEvent('turbidity')).toBe(true);
    const frame = (dt: number, blocked = false, frozen = false) => {
      system.frame!['world.life']!(
        { pilotPosition: position, clockDt: dt, dt, blocked, frozen } as FrameState,
        context,
      );
    };
    // Move outside range before the minimum witness time. Framing alone cannot log it.
    position.z = 100;
    frame(1);
    expect(slot.shown?.detail).toBe('Get closer to log it');
    expect(store.keys()).toEqual([]);
    expect(progress.points).toBe(0);
    position.z = 0;
    frame(0.1);
    expect(slot.shown?.detail).toBe('Sighting logged in Journal');
    expect(store.keys()).toEqual(['monterey-canyon/event:turbidity']);
    expect(focus).toHaveBeenCalledWith('event:turbidity');
    expect(exposed.explore.summary().events).toEqual(['Silt cloud']);
    const elapsed = exposed.explore.scheduler.active!.elapsedS;
    frame(100, true);
    expect(slot.shown).toBeNull();
    expect(exposed.explore.scheduler.active!.elapsedS).toBe(elapsed);
    frame(100, false, true);
    expect(exposed.explore.scheduler.active!.elapsedS).toBe(elapsed);
    frame(0.1);
    expect(slot.shown).not.toBeNull();
    expect(slot.shown?.detail).toBe('Sighting logged in Journal');
    expect(witnessed).toHaveBeenCalledTimes(1);
    expect(progress.points).toBe(5);
    expect(progress.bonus).toBe(false);
    expect(store.snapshot().discovered['monterey-canyon/event:turbidity'].count).toBe(1);
    frame(18);
    expect(exposed.explore.scheduler.active).toBeNull();
    expect(slot.shown).toBeNull();
    bus.emit('mission:restart', { missionId: 'monterey-canyon' });
    expect(exposed.explore.summary().events).toEqual([]);
    expect(store.isDiscovered('monterey-canyon', 'event:turbidity')).toBe(true);
  } finally {
    system.dispose!();
  }
});
