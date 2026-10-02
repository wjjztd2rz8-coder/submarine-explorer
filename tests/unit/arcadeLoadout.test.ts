// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scene, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save, ProgressSave, type GameplayMode } from '../../src/core/Save.js';
import { Progress } from '../../src/game/Progress.js';
import { parseMission } from '../../src/game/Mission.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import { createSubmarineSystem } from '../../src/app/systems/submarine.js';
import type { GameContext } from '../../src/app/context.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';

afterEach(() => vi.unstubAllGlobals());

function context(site: string, mode: GameplayMode): GameContext {
  const config = makeConfig();
  const save = new Save({ config, storage: null });
  save.setGameplayMode(mode);
  const def = parseMission(
    JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8')),
    site,
  )!;
  const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
  return {
    config,
    save,
    settings: save.get(),
    meta,
    params: new URLSearchParams(`mission=${site}`),
    spawnDepth: null,
    route: { def, missionId: site, landmarkId: site, tileId: site, skipBriefing: true },
    progress: new Progress(new ProgressSave(null)),
    bus: new EventBus(),
    terrain: {
      sampleHeight: () => -Math.abs(def.briefing.depth_m!),
      getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
    },
    scene: new Scene(),
    tier: 'low',
    expose: () => {},
  } as unknown as GameContext;
}

describe('fresh-player mission routing and vehicle loadout', () => {
  for (const [site, hull] of [
    ['titanic', 'B'],
    ['bismarck', 'B'],
    ['beebe-vent-field', 'B'],
    ['challenger-deep', 'C'],
  ]) {
    it(`Arcade ${site} keeps the mission and fits its rated vehicle without research`, () => {
      const ctx = context(site, 'arcade');
      const progress = createProgressSystem();
      try {
        progress.init?.(ctx);
        expect(ctx.route).not.toBeNull();
        expect(ctx.route!.def.hull_class).toBe(hull);
        createSubmarineSystem().init?.(ctx);
        expect(ctx.sub.getState().hullClass).toBe(hull);
        expect(ctx.subMesh.hullClass).toBe(hull);
        expect(Math.abs(ctx.sub.getState().ratedDepth)).toBeGreaterThan(
          ctx.route!.def.briefing.depth_m!,
        );
        expect(ctx.progress.lifetime).toBe(0);
      } finally {
        progress.dispose?.();
        ctx.subMesh?.dispose();
      }
    });
  }
  it('Realistic Titanic keeps the research gate and coastal free-dive vehicle', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', { location: { href: 'http://localhost/?mission=titanic' } });
    vi.stubGlobal('history', { replaceState });
    const ctx = context('titanic', 'realistic');
    const progress = createProgressSystem();
    try {
      progress.init?.(ctx);
      expect(ctx.route).toBeNull();
      expect(replaceState).toHaveBeenCalledWith({}, '', 'http://localhost/?tile=titanic');
      createSubmarineSystem().init?.(ctx);
      expect(ctx.sub.getState().hullClass).toBe('A');
      expect(ctx.sub.getState().ratedDepth).toBe(-1000);
      expect(ctx.subMesh.hullClass).toBe('A');
    } finally {
      progress.dispose?.();
      ctx.subMesh?.dispose();
    }
  });
  it('the fresh Arcade Titanic opening is close to its actual wreck and seabed', async () => {
    const ctx = context('titanic', 'arcade');
    const progress = createProgressSystem();
    const bytes = readFileSync('data/tiles/titanic/heightmap.bin');
    const terrain = new Terrain(
      {
        meta: ctx.meta,
        heights: new Float32Array(bytes.buffer, bytes.byteOffset, ctx.meta.cols * ctx.meta.rows),
      },
      ctx.config.terrain,
      'low',
    );
    const props = new Props(ctx.meta, terrain, ctx.config.props, 'medium');
    const content = JSON.parse(readFileSync('data/landmarks/titanic/props.json', 'utf8'));
    content.props = content.props.filter((p: { model: string }) =>
      p.model.startsWith('procedural:'),
    );
    try {
      progress.init?.(ctx);
      ctx.terrain = terrain;
      createSubmarineSystem().init?.(ctx);
      await props.placeAll(content, 'titanic');
      const pose = composedFreeDiveSpawn(
        'titanic',
        ctx.meta,
        terrain,
        props,
        spawnSettings(ctx.config),
        ctx.sub.getState().ratedDepth,
        ctx.config.camera,
      );
      expect(pose).not.toBeNull();
      const pos = new Vector3(pose!.x, pose!.y, pose!.z);
      const hero = props.placed.find((p) => p.def.id === 'bow-hull')!;
      const bounds = hero.localBounds.clone().applyMatrix4(hero.root.matrixWorld);
      expect(-pos.y).toBeGreaterThan(3500);
      expect(pos.y - terrain.sampleHeight(pos.x, pos.z)).toBeGreaterThan(10);
      expect(pos.y - terrain.sampleHeight(pos.x, pos.z)).toBeLessThan(80);
      expect(bounds.distanceToPoint(pos)).toBeGreaterThan(8);
      expect(bounds.distanceToPoint(pos)).toBeLessThan(150);
      expect(props.collide(pos.clone(), ctx.config.submarine.hullRadius, new Vector3())).toBe(
        false,
      );
    } finally {
      progress.dispose?.();
      ctx.subMesh?.dispose();
      terrain.dispose();
    }
  });
  it('refits the hull on live mode changes and removes subscriptions on dispose', () => {
    const ctx = context('titanic', 'arcade');
    const progress = createProgressSystem();
    const submarine = createSubmarineSystem();
    try {
      progress.init?.(ctx);
      submarine.init?.(ctx);
      ctx.save.setGameplayMode('realistic');
      expect(ctx.sub.getState().hullClass).toBe('A');
      ctx.save.setGameplayMode('arcade');
      expect(ctx.sub.getState().hullClass).toBe('B');
      submarine.dispose?.();
      ctx.save.setGameplayMode('realistic');
      expect(ctx.sub.getState().hullClass).toBe('B');
    } finally {
      submarine.dispose?.();
      progress.dispose?.();
      ctx.subMesh?.dispose();
    }
  });
  it('refreshes free-dive clearance and the hull note after mode changes and research unlocks', () => {
    const ctx = context('titanic', 'arcade');
    ctx.route = null;
    ctx.hud = { setHullNote: vi.fn() } as unknown as GameContext['hud'];
    const submarine = createSubmarineSystem();
    try {
      submarine.init?.(ctx);
      expect(ctx.freeDiveHull?.cleared).toBe(true);
      ctx.save.setGameplayMode('realistic');
      expect(ctx.freeDiveHull?.cleared).toBe(false);
      expect(ctx.hud.setHullNote).toHaveBeenLastCalledWith('at rating limit');
      ctx.save.setGameplayMode('arcade');
      expect(ctx.freeDiveHull?.cleared).toBe(true);
      expect(ctx.hud.setHullNote).toHaveBeenLastCalledWith('');
      ctx.save.setGameplayMode('realistic');
      for (let i = 0; i < 10; i++) ctx.progress.award('primary', `site-${i}`);
      expect(ctx.sub.getState().hullClass).toBe('B');
      expect(ctx.freeDiveHull?.cleared).toBe(true);
    } finally {
      submarine.dispose?.();
      ctx.subMesh?.dispose();
    }
  });
});
