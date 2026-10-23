import { describe, expect, it } from 'vitest';
import {
  contentUrl,
  fetchContentJson,
  landmarkIdFor,
  type FetchJson,
} from '../../src/game/ContentPath.js';
import { loadGuide } from '../../src/game/Guide.js';
import { loadPois } from '../../src/game/Pois.js';
import { loadSecrets } from '../../src/game/Secrets.js';
import { emptySpecies, loadSpecies } from '../../src/game/Species.js';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe.each([
  {
    name: 'guide',
    url: '/data/landmarks/reef/guide.json',
    load: (fetch: FetchJson) => loadGuide('reef', fetch),
    empty: null,
    doc: { entries: [{ id: 'overview', title: 'Reef', paragraphs: ['A reef.'] }] },
    expected: {
      version: 1,
      landmark: 'reef',
      entries: [
        {
          id: 'overview',
          title: 'Reef',
          paragraphs: ['A reef.'],
          facts: [],
          sources: [],
          reconstruction: false,
        },
      ],
    },
  },
  {
    name: 'POIs',
    url: '/data/landmarks/reef/pois.json',
    load: (fetch: FetchJson) => loadPois('reef', fetch),
    empty: [],
    doc: { pois: [{ id: 'rock', name: 'Rock', lat: 1, lon: 1, kind: 'geology' }] },
    expected: [{ id: 'rock', name: 'Rock', lat: 1, lon: 1, kind: 'geology', primary: false }],
  },
  {
    name: 'species',
    url: '/data/landmarks/reef/species.json',
    load: (fetch: FetchJson) => loadSpecies('reef', fetch),
    empty: emptySpecies('reef'),
    doc: { species: [{ scientificName: 'Desmophyllum pertusum', records: 9 }] },
    expected: {
      ...emptySpecies('reef'),
      species: [{ scientificName: 'Desmophyllum pertusum', records: 9 }],
    },
  },
  {
    name: 'secrets',
    url: '/data/secrets/reef.json',
    load: (fetch: FetchJson) => loadSecrets('reef', fetch),
    empty: { version: 1, secrets: [], samples: [] },
    doc: { version: 1, samples: [{ id: 'mud', name: 'Sediment', lat: 1, lon: 1 }] },
    expected: {
      version: 1,
      secrets: [],
      samples: [{ id: 'mud', name: 'Sediment', lat: 1, lon: 1 }],
    },
  },
])('$name optional content', ({ url, load, empty, doc, expected }) => {
  it.each(['fetch', 'body', 'non-ok', 'HTML', 'JSON'] as const)(
    '%s failure becomes missing content without poisoning a fresh request',
    async (stage) => {
      const failure = deferred<never>();
      const requested = deferred<void>();
      const urls: string[] = [];
      let failNext = true;
      const fetchFn: FetchJson = async (request) => {
        urls.push(request);
        // Species reads the mission before requesting its optional species document.
        if (request !== url) return { ok: true, text: async () => '{}' };
        if (failNext) {
          failNext = false;
          requested.resolve();
          if (stage === 'fetch') return failure.promise;
          if (stage === 'body') return { ok: true, text: () => failure.promise };
          if (stage === 'non-ok') {
            return { ok: false, status: 503, text: async () => JSON.stringify(doc) };
          }
          return {
            ok: true,
            text: async () => (stage === 'HTML' ? '  <!doctype html><html></html>' : '{broken'),
          };
        }
        return { ok: true, text: async () => JSON.stringify(doc) };
      };
      const pending = load(fetchFn);
      await requested.promise;
      if (stage === 'fetch' || stage === 'body') {
        failure.reject(new Error('optional content unavailable'));
      }
      expect(await pending).toEqual(empty);
      expect(await load(fetchFn)).toEqual(expected);
      expect(urls.filter((request) => request === url)).toEqual([url, url]);
    },
  );
});
