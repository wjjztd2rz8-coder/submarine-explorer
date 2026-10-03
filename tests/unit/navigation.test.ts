import { describe, expect, it } from 'vitest';
import { shellUrl } from '../../src/util/navigation.js';
import { missionUrl, tileUrl } from '../../src/ui/MissionSelect.js';

describe('touch route preferences', () => {
  const href =
    'https://example.com/submarine-explorer/?mission=old&tile=old&daily=2026-10-01&skipBriefing=1&globe=1&poi=bow&tier=low&touch=1';

  it('preserves forced touch and tier through home, mission and free-dive routes', () => {
    const home = shellUrl(href);
    expect(home).toBe('https://example.com/submarine-explorer/?tier=low&touch=1');
    for (const source of [href, home]) {
      const mission = new URL(missionUrl(source, 'shallow'));
      expect(mission.pathname).toBe('/submarine-explorer/');
      expect(Object.fromEntries(mission.searchParams)).toEqual({
        mission: 'shallow',
        tier: 'low',
        touch: '1',
      });
      const tile = new URL(tileUrl(source, 'shallow'));
      expect(tile.searchParams.get('touch')).toBe('1');
      expect(tile.searchParams.get('tier')).toBe('low');
      expect(tile.searchParams.get('tile')).toBe('shallow');
      expect(tile.searchParams.has('mission')).toBe(false);
      expect(tile.searchParams.has('daily')).toBe(false);
    }
  });

  it('retains boot preferences after the visible URL has changed', () => {
    expect(shellUrl('https://example.com/submarine-explorer/', new URL(href).searchParams)).toBe(
      'https://example.com/submarine-explorer/?tier=low&touch=1',
    );
  });

  it('does not force touch on desktop routes', () => {
    const desktop = 'https://example.com/?mission=old&tier=high';
    for (const target of [shellUrl(desktop), missionUrl(desktop, 'new'), tileUrl(desktop, 'new')]) {
      expect(new URL(target).searchParams.has('touch')).toBe(false);
    }
  });
});
