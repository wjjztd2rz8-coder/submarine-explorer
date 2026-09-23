import { describe, expect, it } from 'vitest';
import { contentUrl, fetchContentJson, landmarkIdFor } from '../../src/game/ContentPath.js';

describe('ContentPath', () => {
  it('defaults the landmark to the tile id', () => {
    expect(landmarkIdFor(new URLSearchParams(''), 'titanic')).toBe('titanic');
  });

  it('honours ?landmark=', () => {
    expect(landmarkIdFor(new URLSearchParams('landmark=_test'), 'titanic')).toBe('_test');
  });

  it('ignores unsafe ?landmark= values', () => {
    for (const bad of ['../etc', 'a/b', 'a b', '', '%2e%2e']) {
      const p = new URLSearchParams();
      p.set('landmark', bad);
      expect(landmarkIdFor(p, 'titanic')).toBe('titanic');
    }
  });

  it('builds content URLs under /data/landmarks', () => {
    expect(contentUrl('titanic', 'pois.json')).toBe('/data/landmarks/titanic/pois.json');
  });

  it('fetchContentJson parses JSON and returns null for anything else', async () => {
    const f = (ok: boolean, body: string) => async () => ({ ok, text: async () => body });
    expect(await fetchContentJson('u', f(true, ' {"a":1}'))).toEqual({ a: 1 });
    expect(await fetchContentJson('u', f(true, '<html>'))).toBeNull();
    expect(await fetchContentJson('u', f(true, '{broken'))).toBeNull();
    expect(await fetchContentJson('u', f(false, '{}'))).toBeNull();
  });
});
