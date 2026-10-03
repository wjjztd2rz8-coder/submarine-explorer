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

vi.mock('../../src/ui/ExploreNotice.js', () => ({
  ExploreNotice: class {
    dispose() {}
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
        expect(progress.points).toBe(25);
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
