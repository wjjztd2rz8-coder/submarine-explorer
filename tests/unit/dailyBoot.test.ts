import { afterEach, expect, it, vi } from 'vitest';
import * as Daily from '../../src/game/Daily.js';

const fixtures = vi.hoisted(() => ({
  routes: [] as string[],
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
    return [{ id: 'shallow', tile: 'shallow', depthM: 125 }];
  },
}));
vi.mock('../../src/app/systems/progress.js', () => ({
  loadSavedProgress: async () => ({ canDive: () => true }),
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
      return [{ id: 'shallow' }];
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
});
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
