import { afterEach, expect, it, vi } from 'vitest';
import { hudSystem } from '../../src/app/systems/hud.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

afterEach(() => vi.restoreAllMocks());

it('renders fresh hints, expires at the deadline, and still respects settings and camera dismissal', () => {
  const now = vi.spyOn(performance, 'now').mockReturnValue(0);
  const update = vi.fn();
  const ctx = {
    hud: { update, layoutDataCredits: vi.fn() },
    discovery: { scanner: { view: {} }, focusPoint: () => null },
    input: { primaryKeyLabel: () => 'G' },
    sub: { simSpeed: 1 },
    rig: { mode: 'chase' },
    save: { get: () => ({ controlTips: enabled }) },
    rov: { deployed: false },
    controlsCard: { compactTips: () => 'W/S speed' },
    cameraTips: { until: 20_000 },
  } as unknown as GameContext;
  let enabled = true;
  const frame = { frozen: false, sub: {} } as FrameState;
  const tips = () => {
    hudSystem.frame!['hud.draw']!(frame, ctx);
    return update.mock.lastCall![1].controlTips;
  };

  expect(tips()).toBe('W/S speed');
  now.mockReturnValue(19_999);
  expect(tips()).toBe('W/S speed');
  now.mockReturnValue(20_000);
  expect(tips()).toBeNull();

  // A layout fixture can hold this deadline without overriding any hide rule.
  ctx.cameraTips.until = Infinity;
  expect(tips()).toBe('W/S speed');
  enabled = false;
  expect(tips()).toBeNull();
  enabled = true;
  frame.frozen = true;
  expect(tips()).toBeNull();
  frame.frozen = false;
  ctx.rig.mode = 'orbit';
  expect(tips()).toBeNull();
  ctx.rig.mode = 'chase';
  ctx.cameraTips.until = 0;
  expect(tips()).toBeNull();
});
