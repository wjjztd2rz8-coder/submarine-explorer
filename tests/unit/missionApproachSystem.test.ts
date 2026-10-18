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
for (const mode of ['arcade', 'realistic'] as const) {
  for (const dataRadius of [30, 200]) {
    it(`${mode}, radius ${dataRadius}: mission glue preserves the approach, scan radius and navigation copy, then restores surface starts`, () => {
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
      ctx.applyMissionStart!('near-site');
      expect(sub.position.distanceTo(target.position)).toBeCloseTo(220, 2);
      const multiplier = ctx.effective.sensor.scanRadiusMultiplier;
      expect(target.radius).toBe(
        Math.max(mode === 'arcade' ? 100 : 0, Math.min(dataRadius, 80) * multiplier),
      );
      expect(ctx.baseScanRadii.get(target.id)).toBe(Math.min(dataRadius, 80));
      const draw = () =>
        missionSystem.frame!['play.mission']!(
          { clockDt: 0, dt: 0, sub: sub.getState() } as FrameState,
          ctx,
        );
      draw();
      const first = ctx.missionRouter!.mission.objectives[0];
      expect(first.title).toBe('Head to the bow');
      expect(first.hint).toBe(def.objectives[0].hint);
      sub.position.copy(target.position).add(new Vector3(0, 24, target.radius / 2));
      draw();
      expect(first.title).toBe('Scan the bow');
      expect(first.hint).toBe(def.objectives[0].hint);
      ctx.applyMissionStart!('surface');
      draw();
      expect(target.radius).toBe(Math.max(mode === 'arcade' ? 100 : 0, dataRadius * multiplier));
      expect(ctx.baseScanRadii.get(target.id)).toBe(dataRadius);
      expect(first.title).toBe('Scan the bow');
      const surface = missionStartPose(def, 'surface', [target], ctx.meta, terrain, config);
      expect(sub.position.toArray()).toEqual([surface.x, surface.y, surface.z]);
      expect(sub.yaw).toBeCloseTo(surface.yaw, 6);
      missionSystem.dispose?.();
      expect(ctx.missionRouter!.dispose).toHaveBeenCalledOnce();
    });
  }
}
