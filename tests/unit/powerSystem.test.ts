import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { modesSystem } from '../../src/app/systems/modes.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';
import { afterEach, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save } from '../../src/core/Save.js';
import type { GameContext } from '../../src/app/context.js';
import { SystemRunner, type FrameState } from '../../src/app/System.js';
import { inputGateSystem, makeFrameState } from '../../src/app/loop.js';
import { shellSystem } from '../../src/app/systems/shell.js';
import { createSubmarineSystem } from '../../src/app/systems/submarine.js';
import { Time } from '../../src/core/Time.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { Vector3 } from 'three';
import { createPowerSystem } from '../../src/app/systems/power.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import { Power, startingReserves } from '../../src/game/Power.js';
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

function powerFixture() {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { hidden: false });
  const config = makeConfig();
  const save = new Save({ config, storage: null });
  save.setGameplayMode('realistic');
  const effective = resolveEffective(save.get(), 'realistic', null, config);
  const sub = new Submarine(effective.submarine, {
    sampleHeight: () => -20000,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  });
  sub.reset(0, -20, 0);
  const ascent = vi.spyOn(sub, 'startEmergencyAscent');
  const showDebrief = vi.fn();
  const headlights = { on: true, setPreset: vi.fn() };
  const debrief = { isOpen: false };
  const ctx = {
    config,
    save,
    settings: save.get(),
    progress: new Progress(new ProgressSave(null)),
    effective,
    daily: null,
    app: { state: 'dive' },
    globe: { isOpen: false },
    settingsScreen: { isOpen: false },
    input: { state: { ...FROZEN_INPUT } },
    rig: { setConfig: vi.fn() },
    presets: { setCurrentMode: vi.fn() },
    hud: { setCurrentMode: vi.fn(), setPowerState: vi.fn() },
    waypoints: { setVisualHints: vi.fn() },
    bus: new EventBus(),
    route: null,
    discovery: {
      ready: Promise.resolve(),
      pois: [],
      scanner: { setConfig: vi.fn() },
      guide: { isOpen: false },
      debrief,
      showDebrief,
    },
    expose: vi.fn(),
    sub,
    headlights,
    sonar: { visible: true, setSensorRange: vi.fn() },
  } as unknown as GameContext;
  const system = createPowerSystem();
  const submarine = createSubmarineSystem();
  const runner = new SystemRunner(ctx);
  // Use the production CPU hooks without constructing a hull mesh or renderer.
  runner.init([
    { name: shellSystem.name, frame: { 'gate.shell': shellSystem.frame!['gate.shell']! } },
    inputGateSystem,
    {
      name: submarine.name,
      frame: {
        'sim.vehicles': submarine.frame!['sim.vehicles']!,
        events: submarine.frame!.events!,
      },
    },
    system,
  ]);
  const frame = (realSteps: number, extra: Partial<FrameState> = {}) => {
    const f = {
      ...makeFrameState(ctx),
      realSteps,
      fixedDt: 1 / config.physicsHz,
      dt: realSteps / config.physicsHz,
      ...extra,
    };
    runner.frame(f);
    return f;
  };
  return {
    ctx,
    system,
    frame,
    ascent,
    showDebrief,
    headlights,
    debrief,
    dispose: () => runner.dispose(),
  };
}

const loads = [
  { throttle: 0, ballast: 0, scan: false, sonar: false, lights: false, sensors: false },
  { throttle: 0.6, ballast: 0, scan: true, sonar: false, lights: true, sensors: true },
  { throttle: -0.2, ballast: -0.8, scan: false, sonar: true, lights: false, sensors: true },
];

it.each(makeConfig().submarine.simSpeeds)(
  'conserves six simulated seconds across ordinary and batched fixed steps at %s×',
  (speed) => {
    for (const load of loads) {
      for (const batch of [1, 6]) {
        const f = powerFixture();
        try {
          expect(f.ctx.sub.setSimSpeed(speed)).toBe(speed);
          Object.assign(f.ctx.input.state, {
            throttle: load.throttle,
            ballast: load.ballast,
            scan: load.scan,
          });
          f.headlights.on = load.lights;
          f.ctx.sonar.visible = load.sonar;
          const reference = new Power(f.ctx.effective.power, true);
          reference.step(6, load);
          const clock = new Time(f.ctx.config.physicsHz);
          expect(clock.tick(0)).toBe(0);
          const totalSteps = (6 * f.ctx.config.physicsHz) / speed;
          for (let i = batch; i <= totalSteps; i += batch) {
            // A microsecond past the boundary avoids rounding down an exact tick.
            const steps = clock.tick((i * 1000) / f.ctx.config.physicsHz + 0.001);
            expect(steps).toBe(batch);
            f.frame(steps, { fixedDt: clock.fixedDelta, dt: clock.frameDelta });
          }
          expect(clock.steps).toBe(totalSteps);
          expect(f.ctx.power.state.battery).toBeCloseTo(reference.state.battery, 12);
          expect(f.ctx.power.state.oxygen).toBeCloseTo(reference.state.oxygen, 12);
          expect(f.ctx.power.state).toMatchObject({ enabled: true, depleted: null });
          expect(f.ascent).not.toHaveBeenCalled();
          expect(f.showDebrief).not.toHaveBeenCalled();
        } finally {
          f.dispose();
        }
      }
    }
  },
);

it.each(makeConfig().submarine.simSpeeds)(
  'charges only admitted fixed steps, once per active frame at %s×',
  (speed) => {
    const f = powerFixture();
    try {
      f.ctx.sub.setSimSpeed(speed);
      Object.assign(f.ctx.input.state, { throttle: 0.6, scan: true });
      f.ctx.sonar.visible = false;
      const step = vi.spyOn(f.ctx.power, 'step');
      const initial = f.ctx.power.state;
      expect(f.frame(0, { dt: 0.25 }).steps).toBe(0);
      f.ctx.app.state = 'pause';
      expect(f.frame(8).steps).toBe(0);
      f.ctx.app.state = 'dive';
      f.debrief.isOpen = true;
      expect(f.frame(8).steps).toBe(0);
      f.debrief.isOpen = false;
      expect(f.frame(8, { resumeFrame: true }).steps).toBe(0);
      expect(step).not.toHaveBeenCalled();
      expect(f.ctx.power.state).toEqual(initial);
      const reference = new Power(f.ctx.effective.power, true);
      for (const steps of [1, 8]) {
        f.frame(steps, { dt: 0.25 });
        reference.step((steps * speed) / f.ctx.config.physicsHz, loads[1]!);
        expect(f.ctx.power.state.battery).toBeCloseTo(reference.state.battery, 12);
        expect(f.ctx.power.state.oxygen).toBeCloseTo(reference.state.oxygen, 12);
      }
      expect(step).toHaveBeenCalledTimes(2);
      expect(f.ascent).not.toHaveBeenCalled();
    } finally {
      f.dispose();
    }
  },
);

it.each([
  { battery: 1e-9, oxygen: 0.5, depleted: 'battery' },
  { battery: 0.5, oxygen: 1e-9, depleted: 'oxygen' },
  { battery: 1e-9, oxygen: 1e-9, depleted: 'battery' },
])('dispatches one ascent for depletion from $battery/$oxygen', ({ battery, oxygen, depleted }) => {
  for (const missionOwned of [false, true]) {
    const f = powerFixture();
    try {
      if (missionOwned) {
        // The real router's abort/debrief behavior is guarded in missionRouter.test.
        f.ctx.missionRouter = { frozen: false, debriefOpen: false } as GameContext['missionRouter'];
      }
      const blow = vi.fn();
      const off = f.ctx.bus.on('sub:emergencyBlow', blow);
      f.ctx.power.setLevels(battery, oxygen);
      f.frame(1);
      expect(f.ctx.power.state.depleted).toBe(depleted);
      if (battery === 1e-9) expect(f.ctx.power.state.battery).toBe(0);
      if (oxygen === 1e-9) expect(f.ctx.power.state.oxygen).toBe(0);
      expect(f.ctx.sub.getState()).toMatchObject({ emergencyBlow: true, emergencyCause: 'power' });
      expect(f.ascent).toHaveBeenCalledOnce();
      expect(blow).toHaveBeenCalledExactlyOnceWith({
        depth: f.ctx.sub.getState().depth,
        lockSeconds: f.ctx.effective.submarine.emergencyBlowLockSeconds,
        cause: 'power',
      });
      expect(f.showDebrief).not.toHaveBeenCalled();
      for (let i = 0; i < 600 && f.ctx.sub.getState().emergencyBlow; i++) {
        f.frame(8);
        if (f.ctx.sub.getState().emergencyBlow) expect(f.showDebrief).not.toHaveBeenCalled();
      }
      expect(f.ctx.sub.getState().emergencyBlow).toBe(false);
      expect(f.ctx.sub.position.y).toBeCloseTo(-f.ctx.effective.submarine.hullRadius);
      if (missionOwned) expect(f.showDebrief).not.toHaveBeenCalled();
      else
        expect(f.showDebrief).toHaveBeenCalledExactlyOnceWith(
          { title: 'Dive aborted', subtitle: 'Supplies exhausted · safe ascent completed' },
          null,
        );
      // Further active frames cannot restart the blow or repeat either dispatch.
      for (let i = 0; i < 3; i++) f.frame(1);
      expect(f.ascent).toHaveBeenCalledOnce();
      expect(blow).toHaveBeenCalledOnce();
      expect(f.showDebrief).toHaveBeenCalledTimes(missionOwned ? 0 : 1);
      off();
    } finally {
      f.dispose();
    }
  }
});

it.each([
  [0, 0.5],
  [0.5, 0],
])(
  'freezes exhausted supplies (%s/%s) in Arcade and restores depletion on returning to Realistic',
  (battery, oxygen) => {
    const f = powerFixture();
    const { ctx, system } = f;
    const { save } = ctx;
    try {
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
      f.dispose();
    }
  },
);
