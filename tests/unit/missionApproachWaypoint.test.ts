import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
import { expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import { Scanner } from '../../src/game/Scanner.js';
import type { GameContext } from '../../src/app/context.js';
import { SystemRunner, type FrameState } from '../../src/app/System.js';
import { EventBus } from '../../src/core/EventBus.js';
import { discoverySystem } from '../../src/app/systems/discovery.js';
import { waypointsSystem } from '../../src/app/systems/waypoints.js';

const view = vi.hoisted(() => ({
  setVisualHints: vi.fn(),
  setReducedMotion: vi.fn(),
  setPalette: vi.fn(),
  setPois: vi.fn(),
  update: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('../../src/ui/Waypoints.js', () => ({
  Waypoints: class {
    constructor() {
      return view;
    }
  },
}));

it('a held scan on the first resolved mission frame locks the objective before nearer contacts', () => {
  const bus = new EventBus();
  const mission = new Mission({
    def: parseMission(
      {
        spawn: { lat: 0, lon: 0 },
        objectives: [{ id: 'primary', poi: 'bow', primary: true }],
      },
      'site',
    )!,
    bus,
  });
  const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
  scanner.setTargets(
    ['bow', 'debris'].map((id, index) => ({
      id,
      name: id,
      landmarkId: 'site',
      position: new Vector3(0, 0, index ? -20 : -100),
      radius: 150,
      scanSeconds: 1,
    })),
  );
  const ctx = {
    app: { state: 'dive' },
    discovery: {
      scanner,
      guide: { isOpen: false },
      update: (
        dt: number,
        _realDt: number,
        position: Vector3,
        forward: Vector3,
        input: { scan: boolean },
      ) => scanner.update(dt, position, forward, input.scan),
    },
    missionRouter: { mission },
    waypoints: view,
    save: { get: () => ({ gameplay: { visualHints: true } }) },
    effective: { gameplay: { visualHints: true } },
    guidance: { showsName: () => false },
    rig: { camera: {} },
  } as unknown as GameContext;
  const runner = new SystemRunner(ctx);
  // Preserve production stage ordering while keeping DOM construction out of this capability test.
  runner.init([discoverySystem, waypointsSystem].map(({ name, frame }) => ({ name, frame })));
  const frame = {
    state: { scan: false },
    sampled: {},
    steps: 1,
    fixedDt: 0.1,
    dt: 0.1,
    clockDt: 0.1,
    pilotPosition: new Vector3(),
    pilotForward: new Vector3(0, 0, -1),
  } as FrameState;
  try {
    // Discovery can finish loading between frames, after the previous guidance pass.
    mission.resolve([]);
    runner.frame(frame);
    expect(scanner.view.candidateId).toBe('debris');
    mission.resolve(['bow', 'debris']);
    mission.start('site');
    frame.state = { ...frame.state, scan: true };
    runner.frame(frame);
    expect(scanner.view.candidateId).toBe('bow');
    expect(scanner.view.activeId).toBe('bow');
    expect(scanner.view.nearestId).toBe('bow');
    expect(scanner.view.objectiveId).toBe('bow');
    runner.frame(frame);
    expect(scanner.view.activeId).toBe('bow');
  } finally {
    mission.dispose();
    runner.dispose();
  }
});

it('guides optional objectives after primary completion and scans leftover contacts after debrief resume', async () => {
  const bus = new EventBus();
  const finished = vi.fn();
  bus.on('mission:complete', finished);
  const mission = new Mission({
    def: parseMission(
      {
        spawn: { lat: 0, lon: 0 },
        objectives: [
          { id: 'primary', poi: 'bow', primary: true },
          { id: 'optional', poi: 'stern', primary: false },
        ],
      },
      'site',
    )!,
    bus,
  });
  const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
  const pois = [
    {
      id: 'bow',
      name: 'Bow',
      landmarkId: 'site',
      position: new Vector3(0, 0, -100),
      radius: 150,
      scanSeconds: 1,
    },
    {
      id: 'stern',
      name: 'Stern',
      landmarkId: 'site',
      position: new Vector3(0, 0, -50),
      radius: 150,
      scanSeconds: 1,
    },
    {
      id: 'debris',
      name: 'Debris',
      landmarkId: 'site',
      position: new Vector3(0, 0, -20),
      radius: 150,
      scanSeconds: 1,
    },
  ];
  scanner.setTargets(pois);
  mission.resolve(pois.map((p) => p.id));
  mission.start('site');
  const settings = { gameplay: { visualHints: true } };
  const ctx = {
    app: { state: 'dive' },
    discovery: { ready: Promise.resolve(), pois, scanner },
    settings,
    effective: resolveEffective(
      {
        ...defaultSettings(DEFAULT_CONFIG),
        gameplay: {
          ...DEFAULT_CONFIG.settings.gameplayPresets.arcade,
          visualHints: settings.gameplay.visualHints,
        },
      },
      'custom',
      null,
    ),
    save: { get: () => settings, onChange: () => () => {} },
    sonar: { setScanState: vi.fn(), setPois: vi.fn() },
    expose: () => {},
    missionRouter: { mission },
    rig: { camera: {} },
  } as unknown as GameContext;
  const position = new Vector3();
  const forward = new Vector3(0, 0, -1);
  const guide = () => {
    waypointsSystem.frame!['guide.waypoints']!({ pilotPosition: position } as FrameState, ctx);
    scanner.update(0, position, forward, false);
  };
  try {
    waypointsSystem.init!(ctx);
    await Promise.resolve();
    guide();
    expect(scanner.view.objectiveId).toBe('bow');
    expect(scanner.view.candidateId).toBe('bow');
    scanner.update(1, position, forward, true);
    expect(mission.state).toBe('primaries-complete');
    expect(finished).not.toHaveBeenCalled();
    guide();
    expect(scanner.view.objectiveId).toBe('stern');
    expect(scanner.view.candidateId).toBe('stern');
    expect(view.update.mock.lastCall?.[2]).toMatchObject({ poiId: 'stern' });
    expect(mission.end()).toBe(true);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(mission.counts()).toEqual({ completed: 1, total: 2 });
    expect(mission.resume()).toBe(true);
    scanner.update(1, position, forward, true);
    expect(mission.allComplete).toBe(true);
    guide();
    expect(scanner.view.objectiveId).toBeNull();
    expect(scanner.view.candidateId).toBe('debris');
    expect(scanner.view.nearestId).toBe('debris');
    expect(view.update.mock.lastCall?.[2]).toBeNull();
    scanner.update(1, position, forward, true);
    expect(scanner.isScanned('site', 'debris')).toBe(true);
    expect(mission.counts()).toEqual({ completed: 2, total: 2 });
    expect(mission.end()).toBe(true);
    expect(finished).toHaveBeenCalledTimes(1);
  } finally {
    mission.dispose();
    waypointsSystem.dispose?.();
  }
});

it('Realistic retains its approach marker, then resumes normal waypoint preferences', async () => {
  const objective = {
    resolved: true,
    complete: false,
    primary: true,
    poiId: 'bow',
    title: 'Head to the bow',
    hint: 'Head to the bow, 220 m ahead.',
  };
  const settings = { gameplay: { visualHints: false } };
  const ctx = {
    app: { state: 'dive' },
    discovery: { ready: Promise.resolve(), pois: [], scanner: { setObjective: vi.fn() } },
    settings,
    effective: resolveEffective(
      {
        ...defaultSettings(DEFAULT_CONFIG),
        gameplay: {
          ...DEFAULT_CONFIG.settings.gameplayPresets.arcade,
          visualHints: settings.gameplay.visualHints,
        },
      },
      'custom',
      null,
    ),
    save: { get: () => settings, onChange: () => () => {} },
    sonar: { setScanState: vi.fn(), setPois: vi.fn() },
    bus: new EventBus(),
    expose: () => {},
    missionRouter: { mission: { objectives: [objective] } },
    guidance: { showsName: () => false },
    rig: { camera: {} },
  } as unknown as GameContext;
  try {
    waypointsSystem.init!(ctx);
    await Promise.resolve();
    const draw = () =>
      waypointsSystem.frame!['guide.waypoints']!({ pilotPosition: {} } as FrameState, ctx);
    draw();
    expect(view.setVisualHints).toHaveBeenLastCalledWith(true);
    expect(view.update.mock.lastCall?.[2]).toEqual({ poiId: 'bow' });
    const calls = view.setVisualHints.mock.calls.length;
    draw();
    expect(view.setVisualHints).toHaveBeenCalledTimes(calls);
    objective.title = 'Scan the bow';
    objective.hint = 'Hold SCAN to finish.';
    draw();
    expect(view.setVisualHints).toHaveBeenLastCalledWith(false);
    ctx.effective.gameplay.visualHints = true;
    draw();
    expect(view.setVisualHints).toHaveBeenLastCalledWith(true);
  } finally {
    waypointsSystem.dispose?.();
  }
});
