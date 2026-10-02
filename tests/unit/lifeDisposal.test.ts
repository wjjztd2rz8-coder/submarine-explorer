import { afterEach, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { createLifeSystem } from '../../src/app/systems/life.js';
import type { GameContext } from '../../src/app/context.js';
import { Scanner } from '../../src/game/Scanner.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Life } from '../../src/world/life/Life.js';
import { loadLifeDoc } from '../../src/world/life/tables.js';
import type { SubInfo } from '../../src/world/life/agent.js';
import type { LifeDoc } from '../../src/world/life/types.js';

vi.mock(import('../../src/world/life/tables.js'), async (importOriginal) => ({
  ...(await importOriginal()),
  loadLifeDoc: vi.fn(),
}));
afterEach(() => vi.unstubAllGlobals());
const doc: LifeDoc = { version: 1, sites: {}, species: {} };
const sub: SubInfo = {
  x: 0,
  y: -100,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  fx: 0,
  fy: 0,
  fz: -1,
  speed: 0,
  lightsOn: true,
  hullR: 6,
};
function setup() {
  const config = makeConfig();
  const bus = new EventBus();
  const on = vi.spyOn(bus, 'on');
  const scanner = new Scanner(config.scan, bus, new DiscoveryStore(null));
  const ctx = {
    params: new URLSearchParams(),
    scene: new Scene(),
    tier: 'low',
    contentLandmark: 'site',
    terrain: { sampleHeight: () => -200 },
    currents: { sample: (_x: number, _z: number, out: Vector3) => out.set(0, 0, 0) },
    bus,
    discovery: { scanner, onLifeScan: vi.fn() },
    config,
    expose: vi.fn(),
  } as unknown as GameContext;
  const system = createLifeSystem();
  return { ctx, system, on, scanner };
}
it('cannot recreate life or listeners after disposal while content is pending', async () => {
  let resolve!: (doc: LifeDoc) => void;
  vi.mocked(loadLifeDoc).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { ctx, system, on, scanner } = setup();
  system.init?.(ctx);
  system.dispose?.();
  resolve(doc);
  await Promise.resolve();
  expect(ctx.life).toBeNull();
  expect(ctx.scene.children).toHaveLength(0);
  expect(on).not.toHaveBeenCalled();
  expect(scanner.getExtraTargets()).toHaveLength(0);
});
it('loaded disposal clears scene ownership, scanner targets, and bus subscriptions', async () => {
  vi.mocked(loadLifeDoc).mockResolvedValue(doc);
  const { ctx, system, scanner } = setup();
  system.init?.(ctx);
  await Promise.resolve();
  const life = ctx.life!;
  expect(life).toBeInstanceOf(Life);
  life.sim.spawnNear('comb-jelly', sub, 14, 1);
  for (const a of life.sim.pool) if (a.alive) a.fade = 1;
  life.update(0, sub, new PerspectiveCamera(), 800, 0);
  expect(scanner.getExtraTargets()).toHaveLength(1);
  const onScan = vi.mocked(ctx.discovery.onLifeScan);
  system.dispose?.();
  system.dispose?.();
  ctx.bus.emit('scan:complete', { poiId: 'life:comb-jelly', landmarkId: 'site', firstTime: true });
  ctx.bus.emit('mission:restart', { missionId: 'site' });
  expect(onScan).not.toHaveBeenCalled();
  expect(ctx.life).toBeNull();
  expect(scanner.getExtraTargets()).toHaveLength(0);
  expect(life.targets).toHaveLength(0);
  expect(ctx.scene.children).toHaveLength(0);
  life.update(1, sub, new PerspectiveCamera(), 800, 0);
  expect(life.targets).toHaveLength(0);
});
it('reuses target selection storage in populated frozen frames and preserves target stickiness', () => {
  const life = new Life({
    tier: 'low',
    table: undefined,
    env: { groundAt: () => -200 },
    scene: new Scene(),
    landmarkId: 'site',
    seed: 7,
  });
  const camera = new PerspectiveCamera();
  try {
    life.sim.spawnNear('comb-jelly', sub, 14, 2);
    const agents = life.sim.pool.filter((a) => a.alive);
    expect(agents).toHaveLength(2);
    for (const a of agents) {
      a.fade = 1;
      a.x = 0;
      a.y = -100;
    }
    agents[0].z = -12;
    agents[1].z = -20;
    life.update(0, sub, camera, 800, 0);
    const target = life.targets[0];
    agents[1].z = -8; // a closer candidate must not displace a fair held target
    const NativeMap = Map;
    let allocations = 0;
    vi.stubGlobal(
      'Map',
      new Proxy(NativeMap, {
        construct(target, args) {
          allocations++;
          return Reflect.construct(target, args);
        },
      }),
    );
    for (let frame = 0; frame < 120; frame++) life.update(0, sub, camera, 800, 0);
    expect(allocations).toBe(0);
    expect(life.targets[0]).toBe(target);
    expect(target.position.z).toBe(-12);
    agents[0].leaving = true;
    life.update(0, sub, camera, 800, 0);
    expect(life.targets[0]).toBe(target);
    expect(target.position.z).toBe(-8);
    agents[1].leaving = true;
    life.update(0, sub, camera, 800, 0);
    expect(life.targets).toHaveLength(0);
  } finally {
    vi.unstubAllGlobals();
    life.dispose();
  }
});
