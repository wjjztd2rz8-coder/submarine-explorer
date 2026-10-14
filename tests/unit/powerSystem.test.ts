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
