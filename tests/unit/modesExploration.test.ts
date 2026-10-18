import { afterEach, expect, it, vi } from 'vitest';
import { Scene, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Save, ProgressSave, type GameplayMode } from '../../src/core/Save.js';
import { createExploreSystem } from '../../src/app/systems/explore.js';
import type { GameContext } from '../../src/app/context.js';
import { dailyDive } from '../../src/game/Daily.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Progress } from '../../src/game/Progress.js';
import { Scanner } from '../../src/game/Scanner.js';
import * as Secrets from '../../src/game/Secrets.js';
import type { ExplorationSummary } from '../../src/ui/Debrief.js';
import type { Samples } from '../../src/game/Samples.js';
import { Input } from '../../src/core/Input.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { modesSystem } from '../../src/app/systems/modes.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(['keyboard', 'touch', 'gamepad'] as const)(
  '%s held controls and scan progress survive live Arcade/Realistic switches without replayed edges',
  async (device) => {
    const config = makeConfig();
    const original = structuredClone(config);
    const save = new Save({ config, storage: null });
    const input = new Input({ storage: null });
    const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
    vi.stubGlobal('navigator', {
      getGamepads: () =>
        device === 'gamepad' ? [{ connected: true, index: 0, axes: [0.5, -1, 0, 0], buttons }] : [],
    });
    if (device === 'keyboard') {
      for (const code of ['KeyW', 'KeyD', 'KeyC', 'KeyG', 'KeyQ']) input.injectKey(code, true);
    } else if (device === 'touch') {
      Object.assign(input.touchAxes, { throttle: 1, yaw: 1, ballast: -1 });
      input.touchHeld.add('scan');
      input.touchEdge('toggleCamera');
    } else {
      for (const i of [1, 3, 5]) buttons[i] = { value: 1, pressed: true };
    }
    const effective = resolveEffective(save.get(), 'arcade', null, config);
    const sub = new Submarine(effective.submarine, {
      sampleHeight: () => -5000,
      getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
    });
    sub.reset(0, -1000, 0);
    const scanner = new Scanner(effective.scan, new EventBus());
    const poi = {
      id: 'contact',
      name: 'Contact',
      landmarkId: 'fixture',
      position: new Vector3(0, -1000, -10),
      radius: 100,
      scanSeconds: 10,
    };
    scanner.setTargets([poi]);
    const ctx = {
      config,
      save,
      effective,
      daily: null,
      sub,
      discovery: { ready: Promise.resolve(), pois: [poi], scanner },
      rig: { setConfig: vi.fn() },
      power: { setConfig: vi.fn(), setEnabled: vi.fn() },
      headlights: { setPreset: vi.fn() },
      sonar: { setSensorRange: vi.fn() },
      presets: { setCurrentMode: vi.fn() },
      hud: { setCurrentMode: vi.fn() },
      expose: vi.fn(),
    } as unknown as GameContext;
    try {
      modesSystem.init!(ctx);
      modesSystem.start!(ctx);
      await ctx.discovery.ready;
      expect(input.sample().toggleCamera).toBe(true);
      input.endFrame();
      for (const [index, mode] of (
        ['realistic', 'arcade', 'realistic', 'arcade'] as const
      ).entries()) {
        const before = sub.position.clone();
        const hull = sub.getState().hullClass;
        save.setGameplayMode(mode);
        expect(sub.position.equals(before)).toBe(true);
        expect(sub.getState().hullClass).toBe(hull);
        expect(ctx.effective.speedName).toBe(mode === 'arcade' ? 'fast' : 'research');
        expect(poi.radius).toBe(100 * ctx.effective.sensor.scanRadiusMultiplier);
        const state = input.sample();
        expect(state).toMatchObject({
          throttle: 1,
          yaw: device === 'gamepad' ? 0.5 : 1,
          ballast: -1,
          scan: true,
          toggleCamera: false,
        });
        scanner.update(0.5, sub.position, new Vector3(0, 0, -1), state.scan);
        expect(scanner.view.activeId).toBe('contact');
        expect(scanner.view.progress).toBeCloseTo((index + 1) * 0.05);
        sub.step(state, 1 / 60);
        expect(sub.position.distanceTo(before)).toBeGreaterThan(0);
        expect(sub.velocity.length()).toBeLessThanOrEqual(ctx.effective.submarine.maxSpeed);
        input.endFrame();
      }
      expect(config).toEqual(original);
    } finally {
      modesSystem.dispose?.();
      input.dispose();
    }
  },
);

it.each([
  ['arcade', 'realistic', false],
  ['realistic', 'arcade', false],
  ['arcade', 'realistic', true],
  ['realistic', 'arcade', true],
] as const)(
  'retains secret/sample discoveries and rewards from %s to %s (Daily: %s)',
  async (from, to, daily) => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const doc = Secrets.parseSecrets({
      version: 1,
      secrets: [{ id: 'arch', name: 'Arch', kind: 'alcove', lat: 0, lon: 0, text: 'A shelter.' }],
      samples: [{ id: 'sediment', name: 'Sediment', lat: 0, lon: 0.001 }],
    });
    vi.spyOn(Secrets, 'loadSecrets').mockResolvedValue(doc);
    const save = new Save({ config: makeConfig(), storage });
    save.setGameplayMode(from);

    const run = async (mode: GameplayMode, switchTo?: GameplayMode) => {
      const config = makeConfig();
      const settings = new Save({ config, storage });
      expect(settings.get().gameplayMode).toBe(mode);
      const bus = new EventBus();
      const store = new DiscoveryStore(storage);
      const progress = new Progress(new ProgressSave(storage));
      const scanner = new Scanner(config.scan, bus, store);
      let exploration!: { samples: Samples; summary(): ExplorationSummary };
      const ctx = {
        config,
        bus,
        progress,
        save: settings,
        settings: settings.get(),
        scene: new Scene(),
        tier: 'low',
        contentLandmark: 'shallow',
        meta: { center: { lat: 0, lon: 0 } },
        terrain: { sampleHeight: () => -500 },
        daily: daily ? dailyDive('2026-10-01', ['shallow']) : null,
        discovery: {
          ready: Promise.resolve(),
          store,
          scanner,
          debrief: {},
          onLifeScan: vi.fn(),
          onSampleCollected: vi.fn(),
        },
        journal: { focus: vi.fn() },
        guidance: { offer: vi.fn() },
        expose: (value: { explore: typeof exploration }) => {
          exploration = value.explore;
        },
      } as unknown as GameContext;
      vi.stubGlobal('window', { __game: { progress } });
      const system = createExploreSystem();
      try {
        system.init?.(ctx);
        await vi.waitFor(() => expect(scanner.getSupplementalTargets()).toHaveLength(2));
        expect(exploration.samples.collected.size).toBe(0);
        for (const target of scanner.getSupplementalTargets()) {
          if (switchTo) settings.setGameplayMode(mode);
          scanner.update(target.scanSeconds / 2, target.position, new Vector3(0, 0, -1), true);
          if (switchTo) settings.setGameplayMode(switchTo);
          scanner.update(
            target.scanSeconds / 2 + 0.1,
            target.position,
            new Vector3(0, 0, -1),
            true,
          );
          expect(scanner.isScanned('shallow', target.id)).toBe(true);
        }
        expect(exploration.summary()).toMatchObject({
          found: 1,
          total: 1,
          secrets: ['Arch'],
          samples: ['Sediment'],
        });
        expect(progress.points).toBe(0);
      } finally {
        system.dispose?.();
      }
    };
    await run(from, to);
    await run(to);
    const restored = new DiscoveryStore(storage);
    expect(restored.keys().sort()).toEqual(['shallow/sample:sediment', 'shallow/secret:arch']);
    for (const entry of Object.values(restored.snapshot().discovered)) expect(entry.count).toBe(2);
    expect(new Progress(new ProgressSave(storage)).snapshot().awarded.sort()).toEqual([
      'sample:shallow/sediment',
      'secret:shallow/arch',
    ]);
  },
);
