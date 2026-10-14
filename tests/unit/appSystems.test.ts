import { describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/Input.js';
import { EventBus } from '../../src/core/EventBus.js';
import { createInputSystem } from '../../src/app/systems/input.js';
import { inputGateSystem } from '../../src/app/loop.js';
import { discoverySystem } from '../../src/app/systems/discovery.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import type { GameContext } from '../../src/app/context.js';
import {
  FRAME_STAGES,
  SystemRunner,
  type FrameState,
  type GameSystem,
} from '../../src/app/System.js';
import { createHomeSystems } from '../../src/app/homeStartup.js';
import { createSystems } from '../../src/app/systems.js';

describe('SystemRunner', () => {
  it('discards held keys across pause/Home and removes input listeners before re-entry', () => {
    const win = new EventTarget();
    vi.stubGlobal('window', win);
    const bus = new EventBus();
    const inputSystem = createInputSystem();
    const ctx = {
      bus,
      canvas: null,
      expose: vi.fn(),
      photoMode: { active: false },
    } as unknown as GameContext;
    try {
      inputSystem.init!(ctx);
      const old = ctx.input;
      old.injectKey('KeyW', true);
      expect(old.sample().throttle).toBe(1);
      bus.emit('app:state', { state: 'pause' });
      bus.emit('app:state', { state: 'dive' });
      expect(old.sample().throttle).toBe(0);
      old.injectKey('KeyW', true);
      inputSystem.frame!['late.input']!({ frozen: true } as FrameState, ctx);
      expect(old.sample().throttle).toBe(0);
      old.injectKey('KeyW', true);
      bus.emit('app:state', { state: 'home' });
      expect(old.sample().throttle).toBe(0);
      inputSystem.dispose!();
      inputSystem.init!(ctx);
      const event = Object.assign(new Event('keydown'), { code: 'KeyW' });
      Object.defineProperty(event, 'target', { value: { closest: () => null } });
      win.dispatchEvent(event);
      expect(old.sample().throttle).toBe(0);
      expect(ctx.input.sample().throttle).toBe(1);
    } finally {
      inputSystem.dispose!();
      vi.unstubAllGlobals();
    }
  });
  it('inits in list order, starts after every init, and runs hooks by stage then list order', () => {
    const log: string[] = [];
    const sys = (name: string, stages: (typeof FRAME_STAGES)[number][]): GameSystem => ({
      name,
      init: () => log.push(`init ${name}`),
      start: () => log.push(`start ${name}`),
      frame: Object.fromEntries(stages.map((s) => [s, () => log.push(`${s} ${name}`)])),
      dispose: () => log.push(`dispose ${name}`),
    });
    const runner = new SystemRunner({} as GameContext);
    runner.init([sys('a', ['render.draw', 'gate.shell']), sys('b', ['gate.shell'])]);
    expect(log.splice(0)).toEqual(['init a', 'init b', 'start a', 'start b']);
    runner.frame({} as FrameState);
    expect(log.splice(0)).toEqual(['gate.shell a', 'gate.shell b', 'render.draw a']);
    expect(runner.order).toEqual(['gate.shell: a', 'gate.shell: b', 'render.draw: a']);
    runner.dispose();
    expect(log).toEqual(['dispose b', 'dispose a']);
  });
});

describe('createSystems', () => {
  const systems = createSystems();
  const names = systems.map((s) => s.name);

  it('has unique names and fresh stateful systems per call', () => {
    expect(new Set(names).size).toBe(names.length);
    const again = createSystems();
    expect(again.find((s) => s.name === 'input')).not.toBe(systems.find((s) => s.name === 'input'));
    expect(again.find((s) => s.name === 'submarine')).not.toBe(
      systems.find((s) => s.name === 'submarine'),
    );
  });

  it('keeps the listener-order constraints from the old main.ts', () => {
    const at = (n: string): number => names.indexOf(n);
    // Power's capture-phase Escape guard before the shell's Escape handler.
    expect(at('power')).toBeLessThan(at('shellKeys'));
    // Settings' capture-phase key handler before the mission router's.
    expect(at('settings')).toBeLessThan(at('mission'));
    // app:state: journal and audio hear the initial `dive` emit; photo does not.
    expect(at('journal')).toBeLessThan(at('shellKeys'));
    expect(at('audio')).toBeLessThan(at('shellKeys'));
  });

  it('uses every frame stage that has a job, in the pre-F0 frame order', () => {
    const runner = new SystemRunner({} as GameContext);
    runner.init(systems.map((s) => ({ name: s.name, frame: s.frame })));
    const stages = runner.order.map((e) => e.split(':')[0]);
    expect(new Set(stages)).toEqual(new Set(FRAME_STAGES));
    expect(runner.order).toContain('gate.input: inputGate');
    expect(runner.order).toContain('sim.vehicles: submarine');
    // Limit boost before physics consumes it; sampling reads the updated scanner.
    expect(runner.order.filter((hook) => hook.startsWith('sim.vehicles:'))).toEqual([
      'sim.vehicles: progress',
      'sim.vehicles: submarine',
    ]);
    expect(runner.order.indexOf('sim.vehicles: submarine')).toBeLessThan(
      runner.order.indexOf('sim.power: power'),
    );
    expect(runner.order.filter((hook) => hook.startsWith('scan.discovery:'))).toEqual([
      'scan.discovery: discovery',
      'scan.discovery: explore',
    ]);
    expect(runner.order.indexOf('hud.feeds: power')).toBeLessThan(
      runner.order.indexOf('hud.feeds: currents'),
    );
  });
});

describe('Journal gamepad input through the freeze gate', () => {
  it('opens and closes once per press, preserves frozen piloting and cannot open behind another modal', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, index: 0, axes: [0, -1, 0, 0], buttons }],
    });
    try {
      const input = new Input({ storage: null });
      const guide = { isOpen: false };
      const update = vi.fn();
      const ctx = {
        discovery: { guide, update, scanner: { setObjective: vi.fn() } },
        rig: {},
      } as unknown as GameContext;
      const frame = (frozen: boolean): FrameState => {
        const f = {
          sampled: input.sample(),
          frozen,
          realSteps: 1,
          fixedDt: 1 / 60,
          dt: 1 / 60,
        } as FrameState;
        inputGateSystem.frame!['gate.input']!(f, ctx);
        discoverySystem.frame!['scan.discovery']!(f, ctx);
        return f;
      };
      const release = (): void => {
        input.endFrame();
        buttons[14] = { pressed: false, value: 0 };
        input.sample();
      };
      buttons[14] = { pressed: true, value: 1 };
      frame(false);
      expect(update.mock.calls.at(-1)![4]).toMatchObject({ toggleGuide: true, throttle: 1 });
      guide.isOpen = true;
      input.endFrame();
      frame(true);
      expect(update.mock.calls.at(-1)![4]).toBe(FROZEN_INPUT); // holding never closes
      release();
      buttons[14] = { pressed: true, value: 1 };
      const closing = frame(true);
      expect(closing.state).toBe(FROZEN_INPUT);
      expect(closing.steps).toBe(0);
      expect(update.mock.calls.at(-1)![4]).toEqual({ ...FROZEN_INPUT, toggleGuide: true });
      guide.isOpen = false;
      release();
      buttons[14] = { pressed: true, value: 1 };
      frame(true); // a different modal froze the dive
      expect(update.mock.calls.at(-1)![4]).toBe(FROZEN_INPUT);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Home startup capabilities', () => {
  it('keeps menus, Daily, Journal input, performance diagnostics and title rendering without simulation stages', () => {
    const home = createHomeSystems();
    const names = home.map((system) => system.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'shell',
        'globe',
        'settings',
        'daily',
        'menuProgress',
        'shellKeys',
        'title',
        'titleRender',
        'quality',
      ]),
    );
    const stages = home.flatMap((system) => Object.keys(system.frame ?? {}));
    expect(stages).toContain('render.draw');
    expect(stages).toContain('late.input');
    expect(
      stages.filter(
        (stage) =>
          stage.startsWith('sim.') || stage.startsWith('env.') || stage.startsWith('play.mission'),
      ),
    ).toEqual([]);
    const diveOnly = [
      'terrain',
      'submarine',
      'atmosphere',
      'landmarks',
      'discovery',
      'power',
      'props',
      'life',
      'mission',
      'photo',
      'audio',
      'explore',
    ];
    expect(names.filter((name) => diveOnly.includes(name))).toEqual([]);
  });
});
