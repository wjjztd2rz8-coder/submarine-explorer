import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scene, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelCache } from '../../src/world/PropLoader.js';
import { FirstMove } from '../../src/game/FirstMove.js';
import { currentObjectiveId } from '../../src/ui/ObjectivesPanel.js';
import type { ObjectiveStatus } from '../../src/game/Mission.js';
import { EventBus } from '../../src/core/EventBus.js';
import { makeConfig, FIRST_MINUTE_GUIDANCE } from '../../src/core/Config.js';
import { cameraControlsSystem } from '../../src/app/systems/camera.js';
import { shellSystem } from '../../src/app/systems/shell.js';
import { inputGateSystem } from '../../src/app/loop.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Terrain } from '../../src/world/Terrain.js';
import { requiredHull } from '../../src/game/Progress.js';
import { createSubmarineSystem } from '../../src/app/systems/submarine.js';
import { propsSystem } from '../../src/app/systems/props.js';
import { missionSystem } from '../../src/app/systems/mission.js';
import type { DebriefAction } from '../../src/ui/Debrief.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';

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

// DOM-only boundaries; MissionRouter, Mission, placement and physics stay real.
vi.mock('../../src/ui/ObjectivesPanel.js', async (original) => ({
  ...(await original<typeof import('../../src/ui/ObjectivesPanel.js')>()),
  ObjectivesPanel: class {
    setTitle() {}
    setObjectives() {}
    setVisible() {}
    setGuided() {}
    setNav() {}
    hideBanner() {}
    dispose() {}
  },
}));
vi.mock('../../src/ui/Briefing.js', () => ({
  Briefing: class {
    isOpen = false;
    startChoice = 'near-site';
    root = { querySelector: () => null };
    show() {
      this.isOpen = true;
    }
    hide() {
      this.isOpen = false;
    }
    attachDiveSettings() {}
    dispose() {}
  },
}));
// Keep debrief actions callable while leaving the lifecycle in MissionRouter.
const debrief = vi.hoisted(() => ({ actions: [] as DebriefAction[] }));
vi.mock('../../src/ui/Debrief.js', async (original) => ({
  ...(await original<typeof import('../../src/ui/Debrief.js')>()),
  Debrief: class {
    isOpen = false;
    root = { classList: { add() {}, toggle() {} } };
    show(_stats: unknown, actions: DebriefAction[]) {
      this.isOpen = true;
      debrief.actions = actions;
    }
    hide() {
      this.isOpen = false;
    }
    dispose() {}
  },
}));
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
const pose = (ctx: GameContext) => [...ctx.sub.position.toArray(), ctx.sub.yaw];

const sites: string[] = json('data/landmarks/index.json').landmarks;
const orders = [
  'briefing-late-props',
  'skip-late-props',
  'free-late-props',
  'mission-props-first',
  'free-props-first',
  'free-no-reset',
  'skip-delayed-ready',
  'free-learned',
  'skip-learned-props',
  'restart-after-debrief',
  'respawn-after-hull-loss',
] as const;
const placements = sites.flatMap((site) =>
  (['arcade', 'realistic'] as const).flatMap((mode) =>
    orders
      .filter(
        (order) =>
          site === 'beebe-vent-field' ||
          ['briefing-late-props', 'skip-late-props', 'free-late-props'].includes(order),
      )
      .map((order) => ({ site, mode, order })),
  ),
);
it.each(placements)(
  'keeps authored placement separate from piloting: $site / $mode / $order',
  async ({ site, mode, order }) => {
    const lifecycle = order === 'restart-after-debrief' || order === 'respawn-after-hull-loss';
    // Dive again reloads the page: dispose all old systems before the next init.
    for (let dive = 0; dive < (lifecycle ? 2 : 1); dive++) {
      vi.stubGlobal('document', {
        hidden: false,
        createElement: () => ({ getContext: () => null }),
      });
      vi.stubGlobal(
        'Image',
        class {
          onerror?: () => void;
          set src(_value: string) {
            this.onerror?.();
          }
        },
      );
      // Decode shipped GLBs locally; texture decoding is the only model stub.
      vi.spyOn(ModelCache.prototype, 'get').mockImplementation(async (url) => {
        const loader = new GLTFLoader();
        loader.register(() => ({
          name: 'headless-textures',
          loadTexture: async () => new Texture(),
        }));
        const data = readFileSync(`public${url}`);
        return (
          await loader.parseAsync(
            data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
            '',
          )
        ).scene;
      });
      const config = makeConfig(),
        settings = defaultSettings(config);
      settings.gameplayMode = mode;
      const effective = resolveEffective(settings, mode, null, config);
      const meta = json(`data/tiles/${site}/meta.json`);
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        config.terrain,
        'low',
      );
      const def = parseMission(json(`data/landmarks/${site}/mission.json`), site);
      const free = order.startsWith('free');
      const ready = deferred(),
        propsIO = deferred();
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) => {
          expect(url).toContain(`/data/landmarks/${site}/props.json`);
          await propsIO.promise;
          return {
            ok: true,
            text: async () => JSON.stringify(json(`data/landmarks/${site}/props.json`)),
          };
        }),
      );
      const ctx = {
        config,
        settings,
        effective,
        meta,
        terrain,
        tier: 'low',
        scene: new Scene(),
        spawnDepth: order === 'free-no-reset' ? 5 : null,
        app: { state: 'dive' },
        params: new URLSearchParams(
          order === 'free-no-reset' ? 'depth=5' : free ? '' : `mission=${site}`,
        ),
        route: free
          ? null
          : {
              landmarkId: site,
              missionId: site,
              tileId: site,
              def,
              skipBriefing: order !== 'briefing-late-props',
            },
        bus: new EventBus(),
        progress: {
          hullFor: (d: number) => requiredHull(d).id,
          cosmetics: {},
          finish: () => ({ stars: 0 }),
        },
        baseScanRadii: new Map(),
        input: { wheelDelta: 0 },
        canvas: new EventTarget(),
        rig: { resetView() {}, snap() {}, setChaseRadiusDefault() {} },
        hud: { onResetCamera: () => () => {}, setHullNote() {} },
        headlights: { setEnabled() {} },
        photoMode: { active: false },
        keyboard: { unlock() {} },
        globe: { isOpen: false },
        settingsScreen: { isOpen: false },
        save: { get: () => settings, onChange: () => () => {} },
        expose() {},
        shellBaseHref: () => 'http://localhost/',
        guidance: { visible: false },
        discovery: {
          ready: ready.promise,
          pois: [],
          guide: { isOpen: false },
          debrief: { isOpen: false },
          stats: { snapshot: (extra: object) => extra },
        },
      } as unknown as GameContext;
      const reload = vi.fn();
      vi.stubGlobal('window', { location: { reload } });
      const vehicle = createSubmarineSystem();
      try {
        vehicle.init!(ctx);
        const reset = vi.spyOn(ctx.sub, 'reset');
        propsSystem.init!(ctx);
        cameraControlsSystem.init!(ctx);
        missionSystem.init!(ctx);
        const loaded = new Promise<void>((resolve) => ctx.bus.on('props:loaded', () => resolve()));
        if (order.endsWith('props-first')) {
          propsIO.resolve();
          await loaded;
        }
        const settleReady = async () => {
          ctx.discovery.pois = placePois(
            parsePois(json(`data/landmarks/${site}/pois.json`)),
            meta,
            terrain,
            config.scan,
            site,
          );
          ready.resolve();
          await flush();
        };
        if (order !== 'skip-delayed-ready') await settleReady();
        if (order === 'briefing-late-props') {
          ctx.missionRouter!.begin('near-site');
          await flush();
        }
        const frame = (throttle = 0, resumeFrame = false) => {
          const f = {
            sampled: { ...FROZEN_INPUT, throttle },
            dt: 1 / 60,
            fixedDt: 1 / 60,
            realSteps: 1,
            resumeFrame,
          } as FrameState;
          shellSystem.frame!['gate.shell']!(f, ctx);
          inputGateSystem.frame!['gate.input']!(f, ctx);
          vehicle.frame!['sim.vehicles']!(f, ctx);
          propsSystem.frame!['sim.contact']!(f, ctx);
          vehicle.frame!.events!(f, ctx);
          missionSystem.frame!['play.mission']!(f, ctx);
          cameraControlsSystem.frame!['controls.camera']!(f, ctx);
          return f;
        };
        frame(0, true);
        expect(ctx.cameraTips.moved).toBe(false);
        const anchor = ctx.sub.position.clone();
        frame(1); // arm and move through real fixed-step physics
        let steps = 1;
        while (
          steps < 600 &&
          ctx.sub.position.distanceTo(anchor) < FIRST_MINUTE_GUIDANCE.moveDistanceM / 2
        ) {
          frame(1);
          steps++;
        }
        frame(); // release, genuine post-release physics before IO settles
        const partial = ctx.sub.position.distanceTo(anchor);
        expect(partial).toBeGreaterThanOrEqual(FIRST_MINUTE_GUIDANCE.moveDistanceM / 2);
        expect(partial).toBeLessThan(FIRST_MINUTE_GUIDANCE.moveDistanceM);
        expect(partial).toBeLessThan(2);
        expect(ctx.cameraTips.moved).toBe(false);
        if (order.includes('learned')) {
          while (!ctx.cameraTips.moved && steps++ < 600) frame(1);
          expect(ctx.cameraTips.moved).toBe(true);
          expect(ctx.sub.position.distanceTo(anchor)).toBeLessThan(2);
        }
        const learned = ctx.cameraTips.moved;
        const calls = reset.mock.calls.length;
        if (order === 'skip-delayed-ready') await settleReady();
        else if (!order.endsWith('props-first')) {
          propsIO.resolve();
          await loaded;
        }
        const resetCalls = reset.mock.calls.length - calls;
        expect(ctx.props.stats.count).toBe(
          order === 'skip-delayed-ready'
            ? 0
            : json(`data/landmarks/${site}/props.json`).props.length,
        );
        expect(ctx.props.stats.failed).toBe(0);
        expect(ctx.props.stats.skipped).toBe(0);
        expect(resetCalls).toBe(
          ['free-no-reset', 'mission-props-first', 'free-props-first'].includes(order) ? 0 : 1,
        );
        expect(ctx.cameraTips.moved).toBe(learned);
        frame(); // Authored replacement cannot complete the earlier partial command.
        expect(ctx.cameraTips.moved).toBe(learned);
        if (resetCalls && !learned) {
          // Reset discarded the old command; idle drift from the new opening cannot learn.
          ctx.sub.position.x += FIRST_MINUTE_GUIDANCE.moveDistanceM * 2;
          frame();
          expect(ctx.cameraTips.moved).toBe(false);
          const placed = ctx.sub.position.clone();
          steps = 0;
          while (!ctx.cameraTips.moved && steps++ < 600) frame(1);
          expect(ctx.cameraTips.moved).toBe(true);
          expect(ctx.sub.position.distanceTo(placed)).toBeGreaterThanOrEqual(
            FIRST_MINUTE_GUIDANCE.moveDistanceM,
          );
        }
        if (resetCalls === 0) {
          const pausedPose = pose(ctx);
          ctx.app.state = 'pause';
          expect(frame(1).steps).toBe(0);
          expect(ctx.cameraTips.moved).toBe(false);
          expect(pose(ctx)).toEqual(pausedPose);
          ctx.app.state = 'dive';
          frame(0, true);
          let coastFrames = 0;
          while (
            coastFrames++ < 600 &&
            ctx.sub.position.distanceTo(anchor) < FIRST_MINUTE_GUIDANCE.moveDistanceM
          )
            frame();
          expect(ctx.cameraTips.moved).toBe(true);
          ctx.app.state = 'pause';
          frame();
          ctx.app.state = 'dive';
          frame(0, true);
          expect(ctx.cameraTips.moved).toBe(true);
        }
        if (lifecycle && dive === 0) {
          expect(ctx.cameraTips.moved).toBe(true);
          const router = ctx.missionRouter!;
          if (order === 'respawn-after-hull-loss') {
            // Fault injection: give the breached hull water below its crush depth.
            // Restore the shipped seabed once real physics has emitted the failure.
            const crush = ctx.sub.getState().crushDepth;
            const ground = vi.spyOn(terrain, 'sampleHeight').mockReturnValue(crush - 100);
            ctx.sub.position.y = crush - 1;
            frame();
            ground.mockRestore();
            expect(ctx.sub.getState().hullBreached).toBe(true);
            expect(router.emergencyAscent).toBe(true);
            let frames = 0;
            while (!router.debriefOpen && frames++ < 600) frame();
            expect(router.mission.endReason).toBe('abort');
          } else {
            expect(router.endDive()).toBe(true);
            expect(router.mission.endReason).toBe('surface');
          }
          expect(router.debriefOpen).toBe(true);
          const heldPose = pose(ctx);
          expect(frame(1).steps).toBe(0);
          expect(pose(ctx)).toEqual(heldPose);
          const again = debrief.actions.find((action) => action.id === 'dive-again');
          expect(again).toBeDefined();
          again!.run();
          expect(router.mission.emitted.at(-1)?.name).toBe('mission:restart');
          expect(reload).toHaveBeenCalledExactlyOnceWith();
        }
      } finally {
        missionSystem.dispose!();
        cameraControlsSystem.dispose!();
        expect(ctx.reanchorFirstMove).toBeUndefined();
        propsSystem.dispose!();
        vehicle.dispose!();
        terrain.dispose();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
      }
    }
  },
);
