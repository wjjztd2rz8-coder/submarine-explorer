import { afterEach, expect, it, vi } from 'vitest';
import * as Daily from '../../src/game/Daily.js';
import { makeConfig } from '../../src/core/Config.js';
import { ProgressSave, Save, SETTINGS_STORAGE_KEY } from '../../src/core/Save.js';
import { Progress } from '../../src/game/Progress.js';

const fixtures = vi.hoisted(() => ({
  routes: [] as string[],
  deep: false,
  def: {
    title: 'Shallow',
    briefing: { summary: 'Explore.' },
    objectives: [{ id: 'a', primary: true }],
  },
}));
vi.mock('../../src/game/Mission.js', () => ({
  loadMissionSummaries: async () => {
    // Catalogue fetching straddles UTC midnight.
    vi.setSystemTime(new Date('2026-10-02T00:00:01Z'));
    return [
      { id: 'shallow', tile: 'shallow', depthM: 125 },
      ...(fixtures.deep ? [{ id: 'deep', tile: 'deep', depthM: 3800 }] : []),
    ];
  },
}));
vi.mock('../../src/app/systems/progress.js', () => ({
  loadSavedProgress: async () => new Progress(new ProgressSave(null)),
}));
vi.mock('../../src/game/MissionRouter.js', () => ({
  chooseTileId: () => 'shallow',
  resolveMissionRoute: async (params: URLSearchParams) => {
    fixtures.routes.push(params.toString());
    return { tileId: 'shallow', def: structuredClone(fixtures.def) };
  },
}));
vi.mock('../../src/world/TileLoader.js', () => ({
  TileLoader: class {
    async loadIndex() {
      return [{ id: 'shallow' }, { id: 'deep' }];
    }
    async load() {
      // Stop before rendering; this regression targets route resolution during boot.
      throw new Error('test stop after route resolution');
    }
  },
}));
import { boot } from '../../src/app/boot.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fixtures.routes = [];
  fixtures.deep = false;
});
it.each(['arcade', 'realistic'] as const)(
  'resolves Daily using the reloaded %s mode before catalogue loading',
  async (mode) => {
    fixtures.deep = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
    new Save({ config: makeConfig(), storage }).setGameplayMode(mode);
    const saved = storage.getItem(SETTINGS_STORAGE_KEY);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      location: { search: '?mission=shallow&daily=2026-10-01', href: 'http://localhost/' },
    });
    vi.stubGlobal('document', {
      body: { dataset: {}, appendChild: vi.fn() },
      createElement: () => ({ querySelector: () => ({ textContent: '' }) }),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const dive = vi.spyOn(Daily, 'dailyDive');
    await boot();
    expect(dive).toHaveBeenCalledWith(
      '2026-10-01',
      mode === 'arcade' ? ['shallow', 'deep'] : ['shallow'],
    );
    expect(fixtures.routes.at(-1)).toBe(`mission=${mode === 'arcade' ? 'deep' : 'shallow'}`);
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBe(saved);
  },
);
it('keeps the requested daily date when loading crosses UTC midnight', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
  vi.stubGlobal('window', {
    location: { search: '?mission=shallow&daily=2026-10-01', href: 'http://localhost/' },
  });
  vi.stubGlobal('document', {
    body: { dataset: {}, appendChild: vi.fn() },
    createElement: () => ({ querySelector: () => ({ textContent: '' }) }),
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dive = vi.spyOn(Daily, 'dailyDive');
  await boot();
  expect(fixtures.routes).toEqual(['mission=shallow&daily=2026-10-01', 'mission=shallow']);
  expect(dive).toHaveBeenCalledWith('2026-10-01', ['shallow']);
});
