import { expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { EventBus } from '../../src/core/EventBus.js';
import { waypointsSystem } from '../../src/app/systems/waypoints.js';

const view = vi.hoisted(() => ({
  setVisualHints: vi.fn(),
  setReducedMotion: vi.fn(),
  setPalette: vi.fn(),
  setPois: vi.fn(),
  update: vi.fn(),
}));
vi.mock('../../src/ui/Waypoints.js', () => ({
  Waypoints: class {
    constructor() {
      return view;
    }
  },
}));
it('Realistic retains its approach marker and navigation hint, then resumes normal waypoint preferences', async () => {
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
    discovery: { ready: Promise.resolve(), pois: [], scanner: { setObjective: vi.fn() } },
    settings,
    save: { get: () => settings, onChange: () => () => {} },
    sonar: { setScanState: vi.fn(), setPois: vi.fn() },
    bus: new EventBus(),
    expose: () => {},
    missionRouter: { mission: { objectives: [objective] } },
    rig: { camera: {} },
  } as unknown as GameContext;
  try {
    waypointsSystem.init!(ctx);
    await Promise.resolve();
    const draw = () =>
      waypointsSystem.frame!['guide.waypoints']!({ pilotPosition: {} } as FrameState, ctx);
    draw();
    expect(view.setVisualHints).toHaveBeenLastCalledWith(true);
    expect(view.update.mock.lastCall?.[2]).toMatchObject({
      title: 'Head to the bow',
      hint: 'Head to the bow, 220 m ahead.',
    });
    const calls = view.setVisualHints.mock.calls.length;
    draw();
    expect(view.setVisualHints).toHaveBeenCalledTimes(calls);
    objective.title = 'Scan the bow';
    objective.hint = 'Hold SCAN to finish.';
    draw();
    expect(view.setVisualHints).toHaveBeenLastCalledWith(false);
    settings.gameplay.visualHints = true;
    draw();
    expect(view.setVisualHints).toHaveBeenLastCalledWith(true);
  } finally {
    waypointsSystem.dispose?.();
  }
});
