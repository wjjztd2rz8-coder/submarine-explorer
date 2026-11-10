import { MISSION_APPROACH_M } from '../../src/game/Spawn.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { missionSystem } from '../../src/app/systems/mission.js';
import { parseMission } from '../../src/game/Mission.js';
import { missionStartPose, type MissionRouterOptions } from '../../src/game/MissionRouter.js';
import { Submarine } from '../../src/sub/Submarine.js';

vi.mock('../../src/game/MissionRouter.js', async (original) => ({
  ...(await original<typeof import('../../src/game/MissionRouter.js')>()),
  MissionRouter: class {
    dispose = vi.fn();
    briefing = null;
    mission: { objectives: object[] };
    panel = { setObjectives: vi.fn(), setGuided: vi.fn() };
    update = vi.fn();
    constructor(opts: MissionRouterOptions) {
      this.mission = {
        objectives: opts.route.def.objectives.map((o) => ({ ...o, poiId: o.poi, complete: false })),
      };
    }
  },
}));
afterEach(() => missionSystem.dispose?.());

function fixture(mode: 'arcade' | 'realistic', dataRadius: number) {
  const config = makeConfig();
  const terrain = {
    sampleHeight: () => -3820,
    getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
  };
  const sub = new Submarine(config.submarine, terrain);
  sub.setHullClass('B');
  const def = parseMission(
    JSON.parse(readFileSync('data/landmarks/titanic/mission.json', 'utf8')),
    'titanic',
  )!;
  const target = {
    id: 'titanic-bow',
    name: 'Bow section',
    position: new Vector3(0, -3790, 0),
    radius: dataRadius,
  };
  const settings = {
    gameplayMode: mode,
    gameplay: { ...config.settings.gameplayPresets[mode], startPosition: 'near-site' },
  };
  const ctx = {
    app: { state: 'dive' },
    route: { landmarkId: 'titanic', missionId: 'titanic', tileId: 'titanic', def },
    params: new URLSearchParams(),
    discovery: { pois: [target] },
    meta: JSON.parse(readFileSync('data/tiles/titanic/meta.json', 'utf8')),
    terrain,
    config,
    effective: resolveEffective(defaultSettings(config), mode, null, config),
    sub,
    props: { placed: [], collide: () => false },
    baseScanRadii: new Map([['titanic-bow', dataRadius]]),
    rig: { setChaseRadiusDefault: vi.fn(), snap: vi.fn() },
    headlights: { setEnabled: vi.fn() },
    guidance: { visible: false },
    bus: new EventBus(),
    settings,
    input: {},
    save: { get: () => settings },
    settingsScreen: {},
    expose: () => {},
  } as unknown as GameContext;
  missionSystem.init!(ctx);
  return { ctx, sub, target, config, terrain, def };
}

for (const mode of ['arcade', 'realistic'] as const) {
  for (const dataRadius of [30, 200]) {
    it(`${mode}, radius ${dataRadius}: mission glue preserves the approach, scan radius and navigation copy, then restores surface starts`, () => {
      const { ctx, sub, target, config, terrain, def } = fixture(mode, dataRadius);
      ctx.applyMissionStart!('near-site');
      expect(sub.position.distanceTo(target.position)).toBeCloseTo(MISSION_APPROACH_M.titanic, 2);
      const approachRadius = Math.min(dataRadius, 80, (MISSION_APPROACH_M.titanic - 60) / 2);
      const multiplier = ctx.effective.sensor.scanRadiusMultiplier;
      expect(target.radius).toBe(
        Math.max(mode === 'arcade' ? 100 : 0, approachRadius * multiplier),
      );
      expect(ctx.baseScanRadii.get(target.id)).toBe(approachRadius);
      const draw = () =>
        missionSystem.frame!['play.mission']!(
          { clockDt: 0, dt: 0, sub: sub.getState() } as FrameState,
          ctx,
        );
      draw();
      const first = ctx.missionRouter!.mission.objectives[0];
      expect(first.title).toBe('Scan the bow');
      expect(first.approachTo).toBe('the bow');
      expect(first.hint).toBe(def.objectives[0].hint);
      sub.position.copy(target.position).add(new Vector3(0, 24, target.radius / 2));
      draw();
      expect(first.title).toBe('Scan the bow');
      expect(first.approachTo).toBeUndefined();
      expect(first.hint).toBe(def.objectives[0].hint);
      ctx.applyMissionStart!('surface');
      draw();
      expect(target.radius).toBe(Math.max(mode === 'arcade' ? 100 : 0, dataRadius * multiplier));
      expect(ctx.baseScanRadii.get(target.id)).toBe(dataRadius);
      expect(first.title).toBe('Scan the bow');
      const surface = missionStartPose(def, 'surface', [target], ctx.meta, terrain, config);
      expect(sub.position.toArray()).toEqual([surface.x, surface.y, surface.z]);
      expect(sub.yaw).toBeCloseTo(surface.yaw, 6);
      sub.position.x += 1;
      const homePosition = sub.position.clone();
      const homeRadius = target.radius;
      ctx.app.state = 'home';
      ctx.bus.emit('props:loaded', { landmarkId: 'titanic', count: 1, models: 0, procedural: 1 });
      expect(sub.position).toEqual(homePosition);
      expect(target.radius).toBe(homeRadius);
      expect(ctx.rig.snap).toHaveBeenCalledTimes(2);
      missionSystem.dispose?.();
      expect(ctx.missionRouter!.dispose).toHaveBeenCalledOnce();
    });
  }
}

it.each([
  { state: 'diving', app: 'dive', ascent: false },
  { state: 'diving', app: 'pause', ascent: false },
  { state: 'primaries-complete', app: 'dive', ascent: false },
  { state: 'diving', app: 'dive', ascent: true },
  { state: 'aborted', app: 'dive', ascent: false },
  { state: 'debrief', app: 'dive', ascent: false },
])('late props preserve the $state dive in $app (ascent=$ascent)', ({ state, app, ascent }) => {
  // Optional model loading must not rewind a pilot or cancel an emergency ascent.
  const { ctx, sub } = fixture('realistic', 30);
  ctx.applyMissionStart!('near-site');
  Object.assign(ctx.missionRouter!.mission, { state });
  ctx.app.state = app as typeof ctx.app.state;
  sub.position.x += 1;
  sub.velocity.set(1, 2, 3);
  if (ascent) sub.startEmergencyAscent();
  const position = sub.position.clone();
  const velocity = sub.velocity.clone();
  const hull = sub.getState();
  ctx.bus.emit('props:loaded', { landmarkId: 'titanic', count: 1, models: 1, procedural: 0 });
  expect(sub.position).toEqual(position);
  expect(sub.velocity).toEqual(velocity);
  expect(sub.getState()).toEqual(hull);
  expect(ctx.rig.snap).toHaveBeenCalledOnce();
});

it.each(['near-site', 'surface'] as const)(
  'late props refresh the open %s briefing preview, then leave a pending Begin alone',
  (choice) => {
    const { ctx, sub } = fixture('realistic', 30);
    ctx.applyMissionStart!(choice);
    Object.assign(ctx.missionRouter!.mission, { state: 'briefing' });
    const briefing = { isOpen: true, startChoice: choice };
    Object.assign(ctx.missionRouter!, { briefing });
    const preview = sub.position.clone();
    sub.position.x += 1;
    ctx.bus.emit('props:loaded', { landmarkId: 'titanic', count: 1, models: 1, procedural: 0 });
    expect(sub.position).toEqual(preview);
    expect(ctx.rig.snap).toHaveBeenCalledTimes(2);
    briefing.isOpen = false;
    sub.position.x += 1;
    const pending = sub.position.clone();
    ctx.bus.emit('props:loaded', { landmarkId: 'titanic', count: 1, models: 1, procedural: 0 });
    expect(sub.position).toEqual(pending);
    expect(ctx.rig.snap).toHaveBeenCalledTimes(2);
  },
);
