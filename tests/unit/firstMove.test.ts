import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { FirstMove } from '../../src/game/FirstMove.js';
import { currentObjectiveId } from '../../src/ui/ObjectivesPanel.js';
import type { ObjectiveStatus } from '../../src/game/Mission.js';
import { EventBus } from '../../src/core/EventBus.js';
import { FIRST_MINUTE_GUIDANCE } from '../../src/core/Config.js';
import { cameraControlsSystem } from '../../src/app/systems/camera.js';
import { shellSystem } from '../../src/app/systems/shell.js';
import { inputGateSystem } from '../../src/app/loop.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

const origin = { x: 0, y: -100, z: 0, yaw: 0 };
const idle = { throttle: 0, yaw: 0, ballast: 0 };

describe('first successful move', () => {
  it('requires actual displacement after steering, including motion after release', () => {
    const move = new FirstMove();
    move.reset(origin);
    expect(move.update(origin, { ...idle, throttle: 1 })).toBe(false);
    expect(move.update({ ...origin, z: -0.4 }, idle)).toBe(false);
    expect(move.update({ ...origin, z: -0.5 }, idle)).toBe(true);
    expect(move.update(origin, idle)).toBe(true);
  });

  it('ignores idle current drift, stick noise and non-steering input', () => {
    const move = new FirstMove();
    move.reset(origin);
    expect(move.update({ ...origin, x: 100 }, idle)).toBe(false);
    expect(move.update({ ...origin, x: 101 }, { ...idle, yaw: 0.1 })).toBe(false);
    expect(move.update({ ...origin, x: 102 }, { ...idle, scan: true } as typeof idle)).toBe(false);
    expect(move.update({ ...origin, x: 102.1 }, { ...idle, throttle: -1 })).toBe(false);
    expect(move.update({ ...origin, x: 102.6 }, idle)).toBe(true);
  });

  it('counts a depth change or successful turn and handles the angle wrap', () => {
    const move = new FirstMove();
    move.reset(origin);
    expect(move.update({ ...origin, y: -100.5 }, { ...idle, ballast: -1 })).toBe(true);
    move.reset({ ...origin, yaw: Math.PI - 0.01 });
    expect(move.update({ ...origin, yaw: -Math.PI + 0.01 }, { ...idle, yaw: 1 })).toBe(false);
    expect(move.update({ ...origin, yaw: -Math.PI + 0.04 }, idle)).toBe(true);
    move.reset(origin);
    expect(move.moved).toBe(false);
    expect(move.update(origin, idle)).toBe(false);
  });
});

describe('first move through camera controls', () => {
  // Match the camera capability fixture without constructing a renderer or DOM HUD.
  function setup() {
    const briefing = { frozen: false };
    const exposed: { cameraTips?: GameContext['cameraTips'] } = {};
    const ctx = {
      bus: new EventBus(),
      rig: { resetView: vi.fn() },
      hud: { onResetCamera: () => () => {} },
      canvas: new EventTarget(),
      sub: { position: new Vector3(origin.x, origin.y, origin.z), yaw: origin.yaw },
      app: { state: 'dive' },
      missionRouter: briefing,
      globe: { isOpen: false },
      settingsScreen: { isOpen: false },
      discovery: { guide: { isOpen: false }, debrief: { isOpen: false } },
      input: { wheelDelta: 0 },
      photoMode: { active: false },
      keyboard: { unlock: vi.fn() },
      expose: (value: object) => Object.assign(exposed, value),
    } as unknown as GameContext;
    cameraControlsSystem.init?.(ctx);
    const tick = (sampled = idle, resumeFrame = false) => {
      const f = { sampled, resumeFrame, realSteps: 1, dt: 1 / 60 } as FrameState;
      shellSystem.frame!['gate.shell']!(f, ctx);
      inputGateSystem.frame!['gate.input']!(f, ctx);
      cameraControlsSystem.frame!['controls.camera']!(f, ctx);
      return f;
    };
    return { ctx, briefing, exposed, tick };
  }

  afterEach(() => cameraControlsSystem.dispose?.());

  it.each(['briefing', 'skipBriefing'] as const)(
    'ignores opening placement, frozen commands and idle drift with %s ordering',
    (entry) => {
      const { ctx, briefing, exposed, tick } = setup();
      expect(exposed.cameraTips).toBe(ctx.cameraTips);
      briefing.frozen = entry === 'briefing';
      const start = () =>
        ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
      // Begin applies the opening before the event; skipBriefing starts before ready.
      if (entry === 'skipBriefing') start();
      ctx.sub.position.set(120, -300, -80);
      ctx.sub.yaw = Math.PI / 2;
      if (entry === 'briefing') {
        expect(tick({ ...idle, ballast: -1 }).frozen).toBe(true);
        briefing.frozen = false;
        start();
      }
      ctx.app.state = 'pause';
      expect(tick({ ...idle, throttle: 1 }).frozen).toBe(true);
      ctx.app.state = 'dive';
      expect(ctx.cameraTips.moved).toBe(false);
      expect(tick(idle, true).steps).toBe(0);
      ctx.sub.position.x += 10;
      tick();
      expect(exposed.cameraTips?.moved).toBe(false);
      tick({ ...idle, throttle: 1 });
      expect(exposed.cameraTips?.moved).toBe(false);
      ctx.sub.position.z -= FIRST_MINUTE_GUIDANCE.moveDistanceM;
      tick();
      expect(exposed.cameraTips?.moved).toBe(true);
    },
  );

  it('anchors a held command after skipBriefing placement on the first resumed frame', () => {
    const { ctx, tick } = setup();
    ctx.app.state = 'dive';
    ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
    ctx.sub.position.set(120, -300, -80);
    const resumed = tick({ ...idle, throttle: 1 }, true);
    expect(resumed.steps).toBe(0);
    expect(ctx.cameraTips.moved).toBe(false);
    ctx.sub.position.z -= FIRST_MINUTE_GUIDANCE.moveDistanceM;
    tick();
    expect(ctx.cameraTips.moved).toBe(true);
  });

  it('anchors free dive without a mission event and starts a fresh mission after page disposal', () => {
    const { ctx, tick } = setup();
    ctx.app.state = 'pause';
    tick({ ...idle, throttle: 1 });
    ctx.sub.position.set(120, -300, -80);
    ctx.app.state = 'dive';
    tick({ ...idle, throttle: 1 }, true);
    expect(ctx.cameraTips.moved).toBe(false);
    ctx.sub.position.z -= FIRST_MINUTE_GUIDANCE.moveDistanceM;
    tick();
    expect(ctx.cameraTips.moved).toBe(true);
    ctx.app.state = 'home';
    expect(tick({ ...idle, throttle: 1 }).frozen).toBe(true);
    expect(ctx.cameraTips.moved).toBe(true);

    // Site selection and Dive again navigate/reload; no same-instance restart is required.
    cameraControlsSystem.dispose?.();
    const next = setup();
    next.ctx.app.state = 'dive';
    next.ctx.sub.position.set(200, -500, -100);
    next.ctx.bus.emit('mission:started', { missionId: 'beebe', tileId: 'beebe' });
    expect(next.exposed.cameraTips?.moved).toBe(false);
    next.tick(idle, true);
    next.ctx.sub.position.x += 10;
    next.tick();
    expect(next.exposed.cameraTips?.moved).toBe(false);
    next.tick({ ...idle, throttle: 1 });
    next.ctx.sub.position.z -= FIRST_MINUTE_GUIDANCE.moveDistanceM;
    next.tick();
    expect(next.exposed.cameraTips?.moved).toBe(true);
  });

  it('ignores paused commands and retains partial and learned movement across pause/resume', () => {
    const { ctx, tick } = setup();
    ctx.app.state = 'dive';
    tick(idle, true);
    ctx.app.state = 'pause';
    expect(tick({ ...idle, throttle: 1 }).frozen).toBe(true);
    ctx.app.state = 'dive';
    tick(idle, true);
    ctx.sub.position.x += 10;
    tick();
    expect(ctx.cameraTips.moved).toBe(false);

    tick({ ...idle, throttle: 1 });
    ctx.sub.position.z -= FIRST_MINUTE_GUIDANCE.moveDistanceM / 2;
    tick();
    expect(ctx.cameraTips.moved).toBe(false);
    ctx.app.state = 'pause';
    expect(tick({ ...idle, yaw: 1 }).frozen).toBe(true);
    expect(ctx.cameraTips.moved).toBe(false);
    ctx.app.state = 'dive';
    tick(idle, true);
    expect(ctx.cameraTips.moved).toBe(false);
    ctx.sub.position.z -= FIRST_MINUTE_GUIDANCE.moveDistanceM / 2;
    tick();
    expect(ctx.cameraTips.moved).toBe(true);
    ctx.app.state = 'pause';
    tick();
    ctx.app.state = 'dive';
    tick(idle, true);
    expect(ctx.cameraTips.moved).toBe(true);
  });
});

const objective = (
  id: string,
  primary = true,
  complete = false,
  resolved = true,
): ObjectiveStatus => ({
  id,
  title: `Scan ${id}`,
  hint: '',
  poiId: id,
  primary,
  complete,
  resolved,
});

describe('current objective during the opening', () => {
  it('shows the first primary before navigation produces a position', () => {
    const objectives = [objective('optional', false), objective('first'), objective('second')];
    expect(currentObjectiveId(objectives, null)).toBe('first');
    expect(currentObjectiveId(objectives, 'second')).toBe('second');
    expect(currentObjectiveId(objectives, 'missing')).toBe('first');
  });

  it('advances completed steps and retains a completed row when everything is done', () => {
    const objectives = [
      objective('first', true, true),
      objective('second'),
      objective('optional', false),
    ];
    expect(currentObjectiveId(objectives, 'first')).toBe('second');
    objectives[1].complete = true;
    expect(currentObjectiveId(objectives, 'second')).toBe('optional');
    objectives[2].complete = true;
    expect(currentObjectiveId(objectives, 'optional')).toBe('first');
    expect(currentObjectiveId([], null)).toBeNull();
  });

  it('keeps the objective title available while POIs are loading', () => {
    expect(currentObjectiveId([objective('loading', true, false, false)], null)).toBe('loading');
  });
});
