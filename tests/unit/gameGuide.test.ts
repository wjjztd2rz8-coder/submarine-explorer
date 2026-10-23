import { describe, expect, it, vi } from 'vitest';
import { buildGuideEntries, entryIdForPoi, parseGuide, safeUrl } from '../../src/game/Guide.js';

const doc = {
  version: 1,
  landmark: 'titanic',
  memorial_note: 'Remember.',
  entries: [
    {
      id: 'bow',
      title: 'Bow',
      paragraphs: ['One.', 2, 'Two.'],
      facts: [{ label: 'Depth', value: '3,800 m' }, { label: 'Year', value: 1985 }, { label: 'x' }],
      image: { url: 'javascript:alert(1)' },
      reconstruction: true,
      sources: [
        { title: 'Wiki', url: 'https://en.wikipedia.org/wiki/Wreck_of_the_Titanic' },
        { title: 'Bad', url: 'javascript:alert(1)' },
        'https://example.org/x',
      ],
      confidence: 'high',
    },
    { id: 'bow', title: 'duplicate' },
    { title: 'no id' },
  ],
};

describe('parseGuide', () => {
  it('validates entries, keeping only safe URLs', () => {
    const g = parseGuide(doc, 'titanic')!;
    expect(g.memorial_note).toBe('Remember.');
    expect(g.entries).toHaveLength(1);
    const e = g.entries[0]!;
    expect(e.paragraphs).toEqual(['One.', 'Two.']);
    expect(e.facts).toEqual([
      { label: 'Depth', value: '3,800 m' },
      { label: 'Year', value: '1985' },
    ]);
    expect(e.image).toBeUndefined();
    expect(e.sources).toEqual([
      { title: 'Wiki', url: 'https://en.wikipedia.org/wiki/Wreck_of_the_Titanic' },
      { title: 'Bad' },
      { title: 'https://example.org/x', url: 'https://example.org/x' },
    ]);
    expect(e.reconstruction).toBe(true);
  });

  it('returns null without an entries array', () => {
    expect(parseGuide({}, 'x')).toBeNull();
    expect(parseGuide(null, 'x')).toBeNull();
  });

  it('safeUrl allows http(s) and site-relative only', () => {
    expect(safeUrl('/data/landmarks/t/img/a.jpg')).toBe('/data/landmarks/t/img/a.jpg');
    expect(safeUrl('//evil.example/x')).toBeUndefined();
    expect(safeUrl('/\\evil.example/x')).toBeUndefined();
    expect(safeUrl('data:image/png;base64,xx')).toBeUndefined();
  });
});

describe('buildGuideEntries', () => {
  const guide = parseGuide(doc, 'titanic');
  const poi = (id: string, guideEntry: string | null) => ({
    id,
    name: id.toUpperCase(),
    kind: 'debris',
    guideEntry,
    def: { sources: ['https://example.org/s'] },
  });

  it('adds a stand-in entry for POIs without a resolvable guide entry', () => {
    const pois = [poi('p-bow', 'bow'), poi('p-lost', 'missing'), poi('p-none', null)];
    const entries = buildGuideEntries(guide, pois);
    expect(entries.map((e) => e.id)).toEqual(['bow', 'p-lost', 'p-none']);
    expect(entries[1]?.title).toBe('P-LOST');
    expect(entries[1]?.sources[0]?.url).toBe('https://example.org/s');
    expect(entryIdForPoi(pois[0]!, entries)).toBe('bow');
    expect(entryIdForPoi(pois[1]!, entries)).toBe('p-lost');
  });

  it('works with no guide at all', () => {
    expect(buildGuideEntries(null, [poi('a', null)]).map((e) => e.id)).toEqual(['a']);
  });
});

describe('guide URLs under deployment bases', () => {
  it.each(['/', '/submarine-explorer/'])('resolves href/src values once under %s', async (base) => {
    vi.stubEnv('BASE_URL', base);
    vi.resetModules();
    try {
      const guideApi = await import('../../src/game/Guide.js');
      // The content contract documents this optional image path; no image file is promised.
      const local = '/data/landmarks/titanic/img/bow.jpg';
      const https = 'https://en.wikipedia.org/wiki/Wreck_of_the_Titanic';
      const http = 'http://www.joncopley.com/docs/Rimicaris_hybisae.pdf';
      const sources = [{ title: 'Wiki', url: https }, { title: 'Paper', url: http }, local];
      const guide = guideApi.parseGuide(
        { entries: [{ id: 'bow', image: { url: local }, sources }] },
        'titanic',
      )!;
      const expectedLocal = `${base}data/landmarks/titanic/img/bow.jpg`;
      const expectedSources = [
        { title: 'Wiki', url: https },
        { title: 'Paper', url: http },
        { title: local, url: expectedLocal },
      ];
      expect(guide.entries[0]?.image?.url).toBe(expectedLocal);
      expect(guide.entries[0]?.sources).toEqual(expectedSources);
      const entries = guideApi.buildGuideEntries(guide, [
        {
          id: 'unlinked',
          name: 'Unlinked',
          kind: 'debris',
          guideEntry: null,
          def: { sources: [local, https, http] },
        },
      ]);
      expect(entries[0]?.image?.url).toBe(expectedLocal);
      expect(entries[0]?.sources).toEqual(expectedSources);
      expect(entries[1]?.sources.map((s) => s.url)).toEqual([expectedLocal, https, http]);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
