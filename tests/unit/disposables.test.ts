import { describe, expect, it, vi } from 'vitest';
import { Disposables } from '../../src/app/Disposables.js';
import { EventBus } from '../../src/core/EventBus.js';
import * as THREE from 'three';
import { terrainSystem } from '../../src/app/systems/world.js';
import { atmosphereSystem } from '../../src/app/systems/atmosphere.js';
import { createSubmarineSystem } from '../../src/app/systems/submarine.js';
import { presetsSystem } from '../../src/app/systems/presets.js';
import { makeConfig } from '../../src/core/Config.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import type { GameContext } from '../../src/app/context.js';
import { makeSyntheticTile } from './helpers.js';
import { createSystems } from '../../src/app/systems.js';

/** An EventTarget that counts its live listeners. */
class CountingTarget extends EventTarget {
  live = 0;
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>): void {
    this.live++;
    super.addEventListener(...args);
  }
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>): void {
    this.live--;
    super.removeEventListener(...args);
  }
}

describe('Disposables', () => {
  it('init -> dispose -> init leaves one set of listeners and subscriptions', () => {
    const target = new CountingTarget();
    const bus = new EventBus();
    let fired = 0;
    const cleanup = new Disposables();
    const init = (): void => {
      cleanup.listen(target, 'keydown', () => {}, true);
      cleanup.listen(target, 'resize', () => {}, { once: true });
      cleanup.add(bus.on('app:state', () => fired++));
    };
    init();
    cleanup.dispose();
    expect(target.live).toBe(0);
    init();
    expect(target.live).toBe(2);
    bus.emit('app:state', { state: 'dive', previous: 'home' } as never);
    expect(fired).toBe(1);
    cleanup.dispose();
    cleanup.dispose();
    expect(target.live).toBe(0);
    bus.emit('app:state', { state: 'dive', previous: 'home' } as never);
    expect(fired).toBe(1);
  });

  it('systems that register listeners implement dispose', () => {
    const names = createSystems()
      .filter((s) => typeof s.dispose === 'function')
      .map((s) => s.name);
    for (const n of ['audio', 'pointer', 'power', 'shellKeys', 'sonarControls', 'render'])
      expect(names).toContain(n);
  });
});

describe('dive scene ownership', () => {
  function context(tier: GameContext['tier']) {
    const config = makeConfig();
    const settings = defaultSettings(config);
    const tile = makeSyntheticTile({ cols: 16, rows: 16 });
    return {
      config,
      settings,
      tile,
      meta: tile.meta,
      tier,
      effective: resolveEffective(settings, 'arcade', null, config),
      bus: new EventBus(),
      scene: new THREE.Scene(),
      expose() {},
      params: new URLSearchParams(),
      route: null,
      spawnDepth: null,
      progress: { hullFor: () => 'B', cosmetics: {} },
      terrain: {
        widthM: 1000,
        depthM: 1000,
        sampleHeight: () => -1000,
        getNormal: (_x: number, _z: number, out = new THREE.Vector3()) => out.set(0, 1, 0),
      },
    } as unknown as GameContext;
  }

  for (const tier of ['low', 'high'] as const) {
    it(`${tier}: terrain teardown releases chunks and removes its scene root`, () => {
      const ctx = context(tier);
      terrainSystem.init!(ctx);
      const dispose = vi.spyOn(ctx.terrain, 'dispose');
      const material = vi.spyOn(
        (ctx.terrain.group.children.find((o) => (o as THREE.Mesh).isMesh) as THREE.Mesh)
          .material as THREE.Material,
        'dispose',
      );
      terrainSystem.dispose?.();
      terrainSystem.dispose?.();
      expect(dispose).toHaveBeenCalledOnce();
      expect(material).toHaveBeenCalledOnce();
      expect(ctx.scene.children).toHaveLength(0);
    });

    it(`${tier}: atmosphere teardown releases optional particles, lamps and surface`, () => {
      const ctx = context(tier);
      // Include the legal zero-particle/no-cone case as well as the full rig.
      ctx.config.water.tiers[tier] = {
        ...ctx.config.water.tiers[tier],
        causticsSize: 0,
        ...(tier === 'low' ? { snowCount: 0, headlightCones: false } : {}),
      };
      atmosphereSystem.init!(ctx);
      const owners = [ctx.atmosphere, ctx.headlights, ctx.snow, ctx.water];
      const disposals = owners.map((o) => vi.spyOn(o, 'dispose'));
      const surface = vi.spyOn(ctx.water.surface.geometry, 'dispose');
      atmosphereSystem.dispose?.();
      atmosphereSystem.dispose?.();
      for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
      expect(surface).toHaveBeenCalledOnce();
      expect(ctx.scene.children).toHaveLength(0);
      expect(ctx.scene.fog).toBeNull();
    });

    it(`${tier}: submarine teardown releases its current vehicle and cockpit`, () => {
      const ctx = context(tier);
      const system = createSubmarineSystem();
      system.init!(ctx);
      const dispose = vi.spyOn(ctx.subMesh, 'dispose');
      system.dispose!();
      system.dispose!();
      expect(dispose).toHaveBeenCalledOnce();
      expect(ctx.scene.children).toHaveLength(0);
    });
  }

  it('preset system teardown exits the installed site preset exactly once', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}'));
    const ctx = context('low');
    Object.assign(ctx, { contentLandmark: 'unknown', sub: { position: new THREE.Vector3() } });
    try {
      presetsSystem.init!(ctx);
      await ctx.presets.ready;
      const exit = vi.spyOn(ctx.presets.preset!, 'exit');
      presetsSystem.dispose?.();
      presetsSystem.dispose?.();
      expect(exit).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
