// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scene, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save, ProgressSave, type GameplayMode } from '../../src/core/Save.js';
import { Progress } from '../../src/game/Progress.js';
import { parseMission } from '../../src/game/Mission.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import { createSubmarineSystem } from '../../src/app/systems/submarine.js';
import type { GameContext } from '../../src/app/context.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';
import { missionSystem } from '../../src/app/systems/mission.js';
import { propsSystem } from '../../src/app/systems/props.js';
import { createRovSystem } from '../../src/app/systems/rov.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import type { FrameState } from '../../src/app/System.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { missionStartPose } from '../../src/game/MissionRouter.js';

// Keep real mission routing, vehicle physics and lamp meshes. Only DOM views
// are replaced: these node tests inspect the content passed to the briefing.
vi.mock('../../src/ui/Briefing.js', () => ({
  Briefing: class {
    root = { querySelector: () => null };
    isOpen = false;
    startChoice = 'near-site';
    content: unknown;
    show(content: unknown) {
      this.content = content;
      this.isOpen = true;
    }
    hide() {
      this.isOpen = false;
    }
    attachDiveSettings() {}
    dispose() {}
  },
}));
vi.mock('../../src/ui/ObjectivesPanel.js', () => ({
  ObjectivesPanel: class {
    setTitle() {}
    setObjectives() {}
    setVisible() {}
    dispose() {}
  },
}));
vi.mock('../../src/ui/RovHUD.js', () => ({
  RovHUD: class {
    update() {}
  },
}));

function loadTerrain(ctx: GameContext): Terrain {
  const bytes = readFileSync(`data/tiles/${ctx.meta.id}/heightmap.bin`);
  return new Terrain(
    {
      meta: ctx.meta,
      heights: new Float32Array(bytes.buffer, bytes.byteOffset, ctx.meta.cols * ctx.meta.rows),
    },
    ctx.config.terrain,
    'low',
  );
}

function safeTicks(ctx: GameContext): void {
  for (let i = 0; i < 10; i++) ctx.sub.step(FROZEN_INPUT, 1 / 60);
  expect(ctx.sub.getState()).toMatchObject({ hullBreached: false, emergencyBlow: false });
}

function stubShell(ctx: GameContext): void {
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    location: { href: 'http://localhost/?mission=titanic' },
  });
  vi.stubGlobal('history', { replaceState: vi.fn() });
  vi.stubGlobal('Image', class {});
  ctx.input = { primaryKeyLabel: () => '' } as unknown as GameContext['input'];
  vi.stubGlobal('document', {
    createElement: () => ({ addEventListener: vi.fn(), getContext: () => null }),
  });
  ctx.rig = { snap: vi.fn(), setMode: vi.fn(), chaseRadius: 100 } as unknown as GameContext['rig'];
  ctx.headlights = {
    setEnabled: vi.fn(),
    setConesSuppressed: vi.fn(),
  } as unknown as GameContext['headlights'];
  ctx.hud = {
    root: { querySelector: () => null },
    notice: vi.fn(),
    setHullNote: vi.fn(),
  } as unknown as GameContext['hud'];
  ctx.currents = {
    sample: (_x, _z, out) => Object.assign(out, { x: 0, y: 0, z: 0 }),
  } as GameContext['currents'];
}

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
      widthM: 100000,
      depthM: 100000,
      sampleHeight: () => -Math.abs(def.briefing.depth_m!),
      getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
    },
    scene: new Scene(),
    tier: 'low',
    expose: () => {},
  } as unknown as GameContext;
}

const catalogueSites: string[] = JSON.parse(
  readFileSync('data/landmarks/index.json', 'utf8'),
).landmarks;

describe('fresh-player mission routing and vehicle loadout', () => {
  it('loads and applies live cosmetic selections without refitting physics and removes its listener', () => {
    const ctx = context('titanic', 'arcade');
    ctx.progress.recordDailyStreak(3);
    ctx.progress.selectCosmetic('paint', 'silver');
    const submarine = createSubmarineSystem();
    try {
      submarine.init?.(ctx);
      const vehicle = ctx.subMesh.vehicle;
      const before = ctx.sub.getState();
      expect(vehicle.materials.paintUniforms.uHullBase.value.getHex()).toBe(0xabbcc8);
      ctx.progress.selectCosmetic('paint', 'stock');
      expect(vehicle.materials.paintUniforms.uHullPaint.value).toBe(0);
      expect(ctx.subMesh.vehicle).toBe(vehicle);
      expect(ctx.sub.getState()).toEqual(before);
      submarine.dispose?.();
      ctx.progress.selectCosmetic('paint', 'silver');
      expect(vehicle.materials.paintUniforms.uHullPaint.value).toBe(0);
    } finally {
      submarine.dispose?.();
      ctx.subMesh?.dispose();
    }
  });

  it.each(catalogueSites)(
    'fresh Arcade %s fits a hull that reaches every placed mission contact',
    (site) => {
      const ctx = context(site, 'arcade');
      const terrain = loadTerrain(ctx);
      ctx.terrain = terrain;
      const progress = createProgressSystem();
      const submarine = createSubmarineSystem();
      try {
        progress.init?.(ctx);
        submarine.init?.(ctx);
        const pois = placePois(
          parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8'))),
          ctx.meta,
          terrain,
          ctx.config.scan,
          site,
        );
        const contacts = pois.filter((p) => ctx.route!.def.objectives.some((o) => o.poi === p.id));
        expect(contacts).toHaveLength(ctx.route!.def.objectives.length);
        for (const contact of contacts)
          expect(-ctx.sub.getState().ratedDepth, contact.id).toBeGreaterThanOrEqual(
            -contact.position.y,
          );
        expect(ctx.progress.lifetime).toBe(0);
      } finally {
        submarine.dispose?.();
        progress.dispose?.();
        ctx.subMesh?.dispose();
        terrain.dispose();
      }
    },
  );

  it.each(
    JSON.parse(readFileSync('data/tiles/index.json', 'utf8')).tiles.map(
      (tile: { id: string }) => tile.id,
    ) as string[],
  )('fresh default Arcade free dive reaches the deepest cell at %s', (site) => {
    const ctx = context('titanic', 'arcade');
    ctx.meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    ctx.route = null;
    ctx.params = new URLSearchParams({ tile: site });
    const submarine = createSubmarineSystem();
    try {
      submarine.init?.(ctx);
      expect(-ctx.sub.getState().ratedDepth).toBeGreaterThanOrEqual(-ctx.meta.min_m);
      expect(ctx.progress.lifetime).toBe(0);
      safeTicks(ctx);
    } finally {
      submarine.dispose?.();
      ctx.subMesh?.dispose();
    }
  });

  it('a direct Realistic deep tile link is pressure-safe before any props system exists', () => {
    const ctx = context('titanic', 'realistic');
    ctx.route = null;
    ctx.params = new URLSearchParams('tile=titanic');
    const terrain = loadTerrain(ctx);
    ctx.terrain = terrain;
    const submarine = createSubmarineSystem();
    try {
      submarine.init?.(ctx);
      expect(ctx.sub.getState().hullClass).toBe('A');
      expect(ctx.props).toBeUndefined();
      safeTicks(ctx);
    } finally {
      submarine.dispose?.();
      ctx.subMesh.dispose();
      terrain.dispose();
    }
  });

  it('a deferred Arcade downgrade is applied safely when the next Realistic dive loads', () => {
    const ctx = context('titanic', 'arcade');
    stubShell(ctx);
    const firstProgress = createProgressSystem();
    const firstSubmarine = createSubmarineSystem();
    const nextProgress = createProgressSystem();
    const nextSubmarine = createSubmarineSystem();
    try {
      firstProgress.init?.(ctx);
      firstSubmarine.init?.(ctx);
      ctx.sub.reset(0, -3780, 0);
      ctx.save.setGameplayMode('realistic');
      safeTicks(ctx);
      expect(ctx.hud.notice).toHaveBeenCalledWith(
        'Hull and site access changes apply when you load your next dive.',
      );
      firstSubmarine.dispose?.();
      firstProgress.dispose?.();
      ctx.subMesh.dispose();
      ctx.settings = ctx.save.get();
      nextProgress.init?.(ctx);
      expect(ctx.route).toBeNull();
      nextSubmarine.init?.(ctx);
      expect(ctx.sub.getState().hullClass).toBe('A');
      safeTicks(ctx);
    } finally {
      firstProgress.dispose?.();
      firstSubmarine.dispose?.();
      nextProgress.dispose?.();
      nextSubmarine.dispose?.();
      ctx.subMesh.dispose();
    }
  });

  for (const site of [
    'titanic',
    'beebe-vent-field',
    'bismarck',
    'challenger-deep',
    'endurance',
    'axial-seamount-ashes',
  ]) {
    for (const propsState of ['delayed', 'failed', 'absent'] as const) {
      it(`locked Realistic ${site} is safe before ${propsState} props`, async () => {
        const ctx = context(site, 'realistic');
        stubShell(ctx);
        const terrain = loadTerrain(ctx);
        ctx.terrain = terrain;
        const progress = createProgressSystem();
        const submarine = createSubmarineSystem();
        let finishFetch:
          ((response: { ok: boolean; text: () => Promise<string> }) => void) | undefined;
        const fetch = vi.fn(() =>
          propsState === 'delayed'
            ? new Promise((resolve) => {
                finishFetch = resolve;
              })
            : propsState === 'failed'
              ? Promise.reject(new Error('offline'))
              : Promise.resolve({ ok: false }),
        );
        vi.stubGlobal('fetch', fetch);
        try {
          progress.init?.(ctx);
          expect(ctx.route).toBeNull();
          submarine.init?.(ctx);
          expect(ctx.sub.position.y).toBeGreaterThanOrEqual(
            ctx.sub.getState().ratedDepth + ctx.config.submarine.hullRadius,
          );
          safeTicks(ctx);
          propsSystem.init?.(ctx);
          safeTicks(ctx);
          if (propsState === 'delayed') {
            expect(ctx.props.loaded).toBe(false);
            finishFetch!({ ok: true, text: async () => JSON.stringify({ version: 1, props: [] }) });
          }
          // Drain the actual optional-load promise chain and verify the final pose too.
          await vi.waitFor(() => expect(ctx.props.loaded).toBe(true));
          safeTicks(ctx);
        } finally {
          submarine.dispose?.();
          progress.dispose?.();
          ctx.subMesh?.dispose();
          terrain.dispose();
        }
      });
    }
  }

  for (const bootMode of ['arcade', 'realistic'] as const) {
    it(`${bootMode} briefing keeps both directions safe and uses the effective hull for copy/pose`, async () => {
      const ctx = context('titanic', bootMode);
      if (bootMode === 'realistic') {
        for (let i = 0; i < 10; i++) ctx.progress.award('primary', `funding-${i}`);
      }
      ctx.route!.skipBriefing = false;
      stubShell(ctx);
      const terrain = loadTerrain(ctx);
      ctx.terrain = terrain;
      const progress = createProgressSystem();
      const submarine = createSubmarineSystem();
      try {
        progress.init?.(ctx);
        submarine.init?.(ctx);
        ctx.props = new Props(ctx.meta, terrain, ctx.config.props, 'low');
        const pois = placePois(
          parsePois(JSON.parse(readFileSync('data/landmarks/titanic/pois.json', 'utf8'))),
          ctx.meta,
          terrain,
          ctx.config.scan,
          'titanic',
        );
        ctx.discovery = { ready: Promise.resolve(), pois } as unknown as GameContext['discovery'];
        // A stale authored class must not control the briefing or classic start.
        ctx.route!.def.hull_class = 'A';
        missionSystem.init?.(ctx);
        await Promise.resolve();
        expect(ctx.missionRouter!.briefing!.isOpen).toBe(true);
        const copy = (
          ctx.missionRouter!.briefing as unknown as {
            content: { meta: string[][]; hazards: string[] };
          }
        ).content;
        expect(copy.meta.find(([label]) => label === 'HULL')![1]).toContain('6,500');
        expect(copy.hazards.join(' ')).toContain('Class B hull');
        ctx.save.setGameplayMode('realistic');
        ctx.applyMissionStart('near-site');
        expect(-ctx.sub.position.y).toBeGreaterThan(3500);
        safeTicks(ctx);
        ctx.save.setGameplayMode('arcade');
        ctx.applyMissionStart('near-site');
        safeTicks(ctx);
        // Begin resolves the safe preview after a surface/near-site round trip.
        ctx.applyMissionStart('surface');
        safeTicks(ctx);
        ctx.missionRouter!.begin('near-site');
        await Promise.resolve();
        expect(ctx.missionRouter!.briefing!.isOpen).toBe(false);
        safeTicks(ctx);
        expect(ctx.sub.getState().hullClass).toBe('B');
      } finally {
        missionSystem.dispose?.();
        ctx.missionRouter?.dispose();
        submarine.dispose?.();
        progress.dispose?.();
        ctx.subMesh?.dispose();
        terrain.dispose();
      }
    });
  }

  it('preserves the mothership while switching both directions with a deployed ROV, including retrieval', () => {
    const ctx = context('titanic', 'arcade');
    stubShell(ctx);
    const progress = createProgressSystem();
    const submarine = createSubmarineSystem();
    const rov = createRovSystem();
    try {
      progress.init?.(ctx);
      submarine.init?.(ctx);
      ctx.sub.reset(0, -3780, 0);
      rov.init?.(ctx);
      const frame = {
        state: { ...FROZEN_INPUT, toggleRov: true },
        steps: 10,
        fixedDt: 1 / 60,
        frozen: false,
        blocked: false,
      } as FrameState;
      rov.frame!['sim.vehicles']!(frame, ctx);
      expect(ctx.rov.deployed).toBe(true);
      frame.state = { ...FROZEN_INPUT, throttle: 0.5 };
      for (const mode of ['realistic', 'arcade'] as const) {
        ctx.save.setGameplayMode(mode);
        const before = ctx.rov.position.clone();
        rov.frame!['sim.vehicles']!(frame, ctx);
        expect(ctx.rov.deployed).toBe(true);
        expect(ctx.rov.position.distanceTo(before)).toBeGreaterThan(0);
        safeTicks(ctx);
      }
      ctx.rov.abort();
      rov.frame!['sim.vehicles']!(frame, ctx);
      safeTicks(ctx);
      expect(ctx.sub.getState().hullClass).toBe('B');
    } finally {
      rov.dispose?.();
      ctx.rovVisual?.dispose();
      submarine.dispose?.();
      progress.dispose?.();
      ctx.subMesh?.dispose();
    }
  });

  it('Monterey mission ignores the distant free-dive wall and opens near a primary before and after props', async () => {
    const ctx = context('monterey-canyon', 'arcade');
    ctx.route!.skipBriefing = false;
    stubShell(ctx);
    const terrain = loadTerrain(ctx);
    ctx.terrain = terrain;
    const progress = createProgressSystem();
    const submarine = createSubmarineSystem();
    try {
      progress.init?.(ctx);
      submarine.init?.(ctx);
      ctx.props = new Props(ctx.meta, terrain, ctx.config.props, 'low');
      const pois = placePois(
        parsePois(JSON.parse(readFileSync('data/landmarks/monterey-canyon/pois.json', 'utf8'))),
        ctx.meta,
        terrain,
        ctx.config.scan,
        'monterey-canyon',
      );
      ctx.discovery = { ready: Promise.resolve(), pois } as unknown as GameContext['discovery'];
      missionSystem.init?.(ctx);
      await Promise.resolve();
      const check = () => {
        const primary = pois.filter((p) =>
          ctx.route!.def.objectives.some((o) => o.primary && o.poi === p.id),
        );
        expect(
          Math.min(...primary.map((p) => p.position.distanceTo(ctx.sub.position))),
        ).toBeLessThanOrEqual(300 + 1e-8);
        expect(
          ctx.props.collide(
            ctx.sub.position.clone(),
            ctx.config.submarine.hullRadius,
            new Vector3(),
          ),
        ).toBe(false);
        safeTicks(ctx);
      };
      check();
      const content = JSON.parse(readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8'));
      content.props = content.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      const stats = await ctx.props.placeAll(content, 'monterey-canyon');
      expect(stats.count).toBe(content.props.length);
      expect(ctx.props.placed.some((p) => p.def.id === 'canyon-wall-ledge')).toBe(true);
      ctx.bus.emit('props:loaded', {
        landmarkId: 'monterey-canyon',
        count: content.props.length,
        procedural: content.props.length,
        models: 0,
      });
      check();
    } finally {
      missionSystem.dispose?.();
      ctx.missionRouter?.dispose();
      submarine.dispose?.();
      progress.dispose?.();
      ctx.subMesh?.dispose();
      terrain.dispose();
    }
  });

  for (const skipBriefing of [false, true]) {
    it(`Lost City ${skipBriefing ? 'skip' : 'briefing'} starts clear the Arcade camera default for Realistic, surface, Daily and missing props`, async () => {
      const ctx = context('lost-city', 'arcade');
      ctx.route!.skipBriefing = skipBriefing;
      stubShell(ctx);
      const terrain = loadTerrain(ctx);
      ctx.terrain = terrain;
      const submarine = createSubmarineSystem();
      try {
        submarine.init?.(ctx);
        ctx.rig = new CameraRig(ctx.config.camera, 16 / 9, terrain);
        ctx.props = new Props(ctx.meta, terrain, ctx.config.props, 'low');
        const pois = placePois(
          parsePois(JSON.parse(readFileSync('data/landmarks/lost-city/pois.json', 'utf8'))),
          ctx.meta,
          terrain,
          ctx.config.scan,
          'lost-city',
        );
        ctx.discovery = { ready: Promise.resolve(), pois } as unknown as GameContext['discovery'];
        await ctx.props.placeAll(
          JSON.parse(readFileSync('data/landmarks/lost-city/props.json', 'utf8')),
          'lost-city',
        );
        missionSystem.init?.(ctx);
        await Promise.resolve();
        expect(ctx.rig.chaseRadius).toBe(50);
        const arcadePos = ctx.sub.position.clone();
        // Both boot directions must use current saved settings, even when the
        // near-site choice is unchanged. The preview must match Begin.
        ctx.save.setGameplayMode('realistic');
        await Promise.resolve();
        if (!skipBriefing) expect(ctx.rig.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
        ctx.applyMissionStart('near-site');
        const legacy = missionStartPose(
          { ...ctx.route!.def, hull_class: ctx.sub.getState().hullClass },
          'near-site',
          pois,
          ctx.meta,
          terrain,
          ctx.config,
        );
        expect(ctx.sub.position.toArray()).toEqual([legacy.x, legacy.y, legacy.z]);
        expect(ctx.sub.position.distanceTo(arcadePos)).toBeGreaterThan(1);
        ctx.rig.chaseRadius = 35;
        ctx.rig.resetView();
        expect(ctx.rig.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
        ctx.save.setGameplayMode('arcade');
        await Promise.resolve();
        ctx.applyMissionStart('near-site');
        expect(ctx.sub.position.distanceTo(arcadePos)).toBeLessThan(1e-6);
        expect(ctx.rig.chaseRadius).toBe(50);
        ctx.applyMissionStart('surface');
        ctx.rig.resetView();
        expect(ctx.rig.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
        ctx.applyMissionStart('near-site');
        expect(ctx.rig.chaseRadius).toBe(50);
        ctx.daily = { start: { x: 0, z: 0, headingDeg: 0 } } as GameContext['daily'];
        ctx.applyMissionStart('near-site');
        ctx.rig.resetView();
        expect(ctx.rig.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
        ctx.daily = null;
        ctx.applyMissionStart('near-site');
        // Losing optional content must also clear a previously shortened arm.
        ctx.props = new Props(ctx.meta, terrain, ctx.config.props, 'low');
        ctx.applyMissionStart('near-site');
        ctx.rig.resetView();
        expect(ctx.rig.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
      } finally {
        missionSystem.dispose?.();
        ctx.missionRouter?.dispose();
        submarine.dispose?.();
        ctx.subMesh?.dispose();
        terrain.dispose();
      }
    });
  }

  for (const mode of ['arcade', 'realistic', 'custom'] as const) {
    it(`Lost City ${mode} free dive installs its reset distance after optional props load`, async () => {
      const ctx = context('lost-city', mode);
      ctx.route = null;
      ctx.params = new URLSearchParams('tile=lost-city');
      stubShell(ctx);
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        text: async () => readFileSync('data/landmarks/lost-city/props.json', 'utf8'),
      }));
      const terrain = loadTerrain(ctx);
      ctx.terrain = terrain;
      const submarine = createSubmarineSystem();
      try {
        submarine.init?.(ctx);
        ctx.rig = new CameraRig(ctx.config.camera, 16 / 9, terrain);
        propsSystem.init?.(ctx);
        const radius = mode === 'arcade' ? 50 : Math.hypot(38, 90);
        await vi.waitFor(() => {
          expect(ctx.props.loaded).toBe(true);
          const hero = ctx.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
          expect(
            Math.hypot(
              ctx.sub.position.x - hero.root.position.x,
              ctx.sub.position.z - hero.root.position.z,
            ),
          ).toBeCloseTo(mode === 'arcade' ? 38 : 44, 6);
          expect(ctx.rig.chaseRadius).toBeCloseTo(radius, 6);
        });
        ctx.rig.chaseRadius = 180;
        ctx.rig.resetView();
        expect(ctx.rig.chaseRadius).toBeCloseTo(radius, 6);
      } finally {
        submarine.dispose?.();
        ctx.subMesh?.dispose();
        terrain.dispose();
      }
    });
  }
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
  it('defers mode refits during a deep active dive and removes subscriptions on dispose', () => {
    const ctx = context('titanic', 'arcade');
    const progress = createProgressSystem();
    const submarine = createSubmarineSystem();
    try {
      progress.init?.(ctx);
      submarine.init?.(ctx);
      ctx.sub.reset(0, -3780, 0);
      ctx.save.setGameplayMode('realistic');
      for (let i = 0; i < 10; i++) ctx.sub.step(FROZEN_INPUT, 1 / 60);
      expect(ctx.sub.getState()).toMatchObject({
        hullClass: 'B',
        hullBreached: false,
        emergencyBlow: false,
      });
      ctx.save.setGameplayMode('arcade');
      for (let i = 0; i < 10; i++) ctx.sub.step(FROZEN_INPUT, 1 / 60);
      expect(ctx.sub.getState()).toMatchObject({
        hullClass: 'B',
        hullBreached: false,
        emergencyBlow: false,
      });
      submarine.dispose?.();
      ctx.save.setGameplayMode('realistic');
      expect(ctx.sub.getState().hullClass).toBe('B');
    } finally {
      submarine.dispose?.();
      progress.dispose?.();
      ctx.subMesh?.dispose();
    }
  });
  it('keeps free-dive hull/clearance through mode changes and research until a new dive loads', () => {
    const ctx = context('titanic', 'realistic');
    ctx.route = null;
    ctx.hud = { setHullNote: vi.fn(), notice: vi.fn() } as unknown as GameContext['hud'];
    const submarine = createSubmarineSystem();
    const nextDive = createSubmarineSystem();
    try {
      submarine.init?.(ctx);
      expect(ctx.freeDiveHull?.cleared).toBe(false);
      ctx.save.setGameplayMode('arcade');
      for (let i = 0; i < 10; i++) ctx.sub.step(FROZEN_INPUT, 1 / 60);
      expect(ctx.sub.getState()).toMatchObject({
        hullClass: 'A',
        hullBreached: false,
        emergencyBlow: false,
      });
      ctx.save.setGameplayMode('realistic');
      for (let i = 0; i < 10; i++) ctx.sub.step(FROZEN_INPUT, 1 / 60);
      for (let i = 0; i < 10; i++) ctx.progress.award('primary', `site-${i}`);
      expect(ctx.sub.getState()).toMatchObject({
        hullClass: 'A',
        hullBreached: false,
        emergencyBlow: false,
      });
      expect(ctx.freeDiveHull?.cleared).toBe(false);
      submarine.dispose?.();
      ctx.subMesh.dispose();
      ctx.settings = ctx.save.get();
      nextDive.init?.(ctx);
      for (let i = 0; i < 10; i++) ctx.sub.step(FROZEN_INPUT, 1 / 60);
      expect(ctx.sub.getState()).toMatchObject({
        hullClass: 'B',
        hullBreached: false,
        emergencyBlow: false,
      });
      expect(ctx.freeDiveHull?.cleared).toBe(true);
    } finally {
      submarine.dispose?.();
      nextDive.dispose?.();
      ctx.subMesh?.dispose();
    }
  });
});
