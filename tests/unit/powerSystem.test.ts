import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { modesSystem } from '../../src/app/systems/modes.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';
import { afterEach, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save } from '../../src/core/Save.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { createPowerSystem } from '../../src/app/systems/power.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import { startingReserves } from '../../src/game/Power.js';
import titanicMission from '../../data/landmarks/titanic/mission.json';

afterEach(() => vi.unstubAllGlobals());

function deepStartFixture(initialDepth = 3800) {
  vi.stubGlobal('window', new EventTarget());
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const config = makeConfig();
  const save = new Save({ config, storage: null });
  save.setGameplayMode('realistic');
  const def = parseMission(titanicMission, 'titanic');
  if (!def) throw new Error('Invalid Titanic mission fixture');
  const bus = new EventBus();
  const mission = new Mission({ def, bus });
  const notice = vi.fn();
  const ctx = {
    effective: resolveEffective(save.get(), 'realistic', null, config),
    bus,
    route: { def, skipBriefing: true },
    discovery: { ready },
    guidance: { notice },
    // A supported ?depth= probe can already be deep before discovery is ready.
    sub: { position: { y: -initialDepth } },
    expose: vi.fn(),
  } as unknown as GameContext;
  const system = createPowerSystem();
  system.init?.(ctx);
  let disposed = false;
  const start = (depth = 3800) => {
    // The skip-briefing router emits first, then registers its deferred pose.
    mission.start('titanic');
    void ready.then(() => {
      if (!disposed) ctx.sub.position.y = -depth;
    });
  };
  const dispose = () => {
    disposed = true;
    system.dispose?.();
    mission.dispose();
  };
  return { ctx, config, ready, resolveReady, start, dispose, notice };
}

it('initializes a deep start once, after its pose resolves, using effective supplies and speed', async () => {
  const f = deepStartFixture(5);
  try {
    const setLevels = vi.spyOn(f.ctx.power, 'setLevels');
    f.start();
    expect(f.ctx.power.state).toMatchObject({ enabled: true, battery: 1, oxygen: 1 });
    expect(f.notice).not.toHaveBeenCalled();
    f.resolveReady();
    await f.ready;
    // Promise handlers have run; the extra microtask still owns the reserve write.
    expect(setLevels).not.toHaveBeenCalled();
    await Promise.resolve();
    const reserve = startingReserves(3800, f.ctx.effective.submarine, f.ctx.effective.power);
    expect(reserve.battery).not.toBe(
      startingReserves(3800, f.config.submarine, f.config.power).battery,
    );
    expect(f.ctx.power.state).toMatchObject({ battery: reserve.battery, oxygen: reserve.oxygen });
    expect(setLevels).toHaveBeenCalledExactlyOnceWith(reserve.battery, reserve.oxygen);
    expect(f.notice).toHaveBeenCalledExactlyOnceWith(
      `Descent to 3,800 m used ${Math.round((1 - reserve.battery) * 100)}% battery`,
    );
  } finally {
    f.dispose();
  }
});

it.each(['before readiness', 'after the reserve microtask is queued'] as const)(
  'cancels deferred deep-start reserves and guidance when disposed %s',
  async (timing) => {
    const f = deepStartFixture();
    try {
      f.start();
      f.ctx.power.setLevels(0.4, 0.6);
      const setLevels = vi.spyOn(f.ctx.power, 'setLevels');
      if (timing === 'after the reserve microtask is queued') {
        f.resolveReady();
        await f.ready;
        expect(setLevels).not.toHaveBeenCalled();
      }
      f.dispose();
      f.resolveReady();
      await f.ready;
      await Promise.resolve();
      expect(f.ctx.power.state).toMatchObject({ battery: 0.4, oxygen: 0.6 });
      expect(setLevels).not.toHaveBeenCalled();
      expect(f.notice).not.toHaveBeenCalled();
    } finally {
      f.dispose();
    }
  },
);

it('keeps successive runtimes isolated when both starts precede discovery readiness', async () => {
  const old = deepStartFixture();
  old.start();
  old.ctx.power.setLevels(0.4, 0.6);
  old.dispose();
  const live = deepStartFixture();
  try {
    // Teardown is idempotent, including after a replacement has subscribed.
    old.dispose();
    live.start(1800);
    live.resolveReady();
    await live.ready;
    await Promise.resolve();
    const reserve = startingReserves(1800, live.ctx.effective.submarine, live.ctx.effective.power);
    expect(live.ctx.power.state).toMatchObject({
      battery: reserve.battery,
      oxygen: reserve.oxygen,
    });
    expect(live.notice).toHaveBeenCalledOnce();
    const liveState = live.ctx.power.state;
    old.resolveReady();
    await old.ready;
    await Promise.resolve();
    expect(old.ctx.power.state).toMatchObject({ battery: 0.4, oxygen: 0.6 });
    expect(old.notice).not.toHaveBeenCalled();
    expect(live.ctx.power.state).toEqual(liveState);
    expect(live.notice).toHaveBeenCalledOnce();
  } finally {
    live.dispose();
    old.dispose();
  }
});

it.each([
  [0, 0.5],
  [0.5, 0],
])(
  'freezes exhausted supplies (%s/%s) in Arcade and restores depletion on returning to Realistic',
  (battery, oxygen) => {
    vi.stubGlobal('window', new EventTarget());
    const config = makeConfig();
    const save = new Save({ config, storage: null });
    save.setGameplayMode('realistic');
    const progress = new Progress(new ProgressSave(null));
    const ctx = {
      config,
      save,
      settings: save.get(),
      progress,
      effective: resolveEffective(save.get(), 'realistic', null, config),
      daily: null,
      rig: { setConfig: vi.fn() },
      presets: { setCurrentMode: vi.fn() },
      hud: { setCurrentMode: vi.fn() },
      waypoints: { setVisualHints: vi.fn() },
      bus: new EventBus(),
      route: null,
      discovery: { ready: Promise.resolve(), pois: [], scanner: { setConfig: vi.fn() } },
      expose: vi.fn(),
      sub: { simSpeed: 1, setConfig: vi.fn(), startEmergencyAscent: vi.fn() },
      headlights: { on: true, setPreset: vi.fn() },
      sonar: { visible: true, setSensorRange: vi.fn() },
    } as unknown as GameContext;
    const system = createPowerSystem();
    try {
      system.init?.(ctx);
      modesSystem.init?.(ctx);
      modesSystem.start?.(ctx);
      ctx.power.setLevels(battery, oxygen);
      save.setGameplayMode('arcade');
      const tick = system.frame!['sim.power']!;
      const frame = { steps: 1, fixedDt: 1 / 60, state: { throttle: 0, ballast: 0 } } as FrameState;
      tick(frame, ctx);
      expect(ctx.sub.startEmergencyAscent).not.toHaveBeenCalled();
      expect(ctx.power.state).toMatchObject({ enabled: false, battery, oxygen });
      save.setGameplayMode('realistic');
      tick(frame, ctx);
      expect(ctx.power.state.enabled).toBe(true);
      expect(ctx.sub.startEmergencyAscent).toHaveBeenCalledOnce();
      tick(frame, ctx);
      expect(ctx.sub.startEmergencyAscent).toHaveBeenCalledOnce();
    } finally {
      modesSystem.dispose?.();
      system.dispose?.();
    }
  },
);
