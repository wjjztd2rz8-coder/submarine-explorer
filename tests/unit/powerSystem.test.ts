import { afterEach, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save } from '../../src/core/Save.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { createPowerSystem } from '../../src/app/systems/power.js';

afterEach(() => vi.unstubAllGlobals());

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
    const ctx = {
      config,
      save,
      settings: save.get(),
      bus: new EventBus(),
      route: null,
      discovery: {},
      expose: vi.fn(),
      sub: { simSpeed: 1, startEmergencyAscent: vi.fn() },
      rov: { deployed: false },
      headlights: { on: true },
      sonar: { visible: true },
    } as unknown as GameContext;
    const system = createPowerSystem();
    try {
      system.init?.(ctx);
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
      system.dispose?.();
    }
  },
);
