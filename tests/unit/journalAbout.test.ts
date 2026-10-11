import { describe, expect, it } from 'vitest';
import type { JournalSite } from '../../src/game/JournalData.js';
import {
  aboutLists,
  dataCreditFor,
  uniqueLines,
  withoutHullRating,
} from '../../src/ui/journalAbout.js';

function site(facts: string[], briefing?: { facts: string[]; hazards: string[] }): JournalSite {
  return {
    id: 'x',
    name: 'X',
    region: '',
    depthM: null,
    summary: '',
    facts,
    links: [],
    entries: [],
    poiIds: [],
    species: null,
    ...(briefing ? { briefing: { summary: '', ...briefing } } : {}),
  } as JournalSite;
}

describe('hull rating', () => {
  it('drops a sentence that only restates the rating and keeps the rest', () => {
    expect(
      withoutHullRating(
        'Crushing pressure: about 380 atmospheres at the seabed. Your Class B hull is rated to 6,500 m.',
      ),
    ).toBe('Crushing pressure: about 380 atmospheres at the seabed.');
    expect(
      withoutHullRating('Your Class B hull is rated to 6,500 m, clearing the deepest cell.'),
    ).toBe('');
    expect(
      withoutHullRating(
        'Rated depth: 11,000 m. The deepest terrain is 10,931 m; the hull warning begins beyond its rating.',
      ),
    ).toBe('');
  });

  it('leaves other hazards alone', () => {
    const line = 'Strong currents, including internal tidal flows along the canyon.';
    expect(withoutHullRating(line)).toBe(line);
  });
});

describe('repeats', () => {
  it('skips blanks, exact repeats and a line that says what an earlier one says', () => {
    expect(
      uniqueLines([
        'The wreck was found on 1 September 1985 by a team led by Jean-Louis Michel and Robert Ballard.',
        '',
        'Discovered September 1, 1985 by Robert Ballard/Jean-Louis Michel',
        'Bow and stern sections lie ~600 m apart with a debris field between',
        'Bow and stern sections lie ~600 m apart with a debris field between',
      ]),
    ).toEqual([
      'The wreck was found on 1 September 1985 by a team led by Jean-Louis Michel and Robert Ballard.',
      'Bow and stern sections lie ~600 m apart with a debris field between',
    ]);
  });

  it('keeps short, distinct lines', () => {
    expect(uniqueLines(['Cold water.', 'Strong current.'])).toHaveLength(2);
  });
});

describe('about lists', () => {
  const briefing = {
    facts: ['The ship broke apart as it sank near the bow.'],
    hazards: [
      'Near-freezing water, about 1-2 degC.',
      'Your Class B hull is rated to 6,500 m, clearing the deepest cell.',
    ],
  };

  it('merges briefing and catalogue facts once and omits the hull-rating hazard', () => {
    const lists = aboutLists(site(['Protected by an international agreement'], briefing), true);
    expect(lists.facts).toEqual([
      'The ship broke apart as it sank near the bow.',
      'Protected by an international agreement',
    ]);
    expect(lists.hazards).toEqual(['Near-freezing water, about 1-2 degC.']);
  });

  it('adds the mission overview only when the page shows another summary', () => {
    const withSummary = site([], { ...briefing });
    withSummary.briefing!.summary = 'Find the stalactite galleries on the north wall.';
    expect(aboutLists(withSummary, true, 'A flooded sinkhole in the reef.').overview).toBe(
      'Find the stalactite galleries on the north wall.',
    );
    expect(
      aboutLists(withSummary, true, 'Find the stalactite galleries on the north wall.').overview,
    ).toBe('');
    expect(aboutLists(withSummary, false).overview).toBe(
      'Find the stalactite galleries on the north wall.',
    );
  });

  it('holds back catalogue facts until the site is open', () => {
    expect(
      aboutLists(site(['Protected by an international agreement'], briefing), false).facts,
    ).toEqual(['The ship broke apart as it sank near the bow.']);
  });
});

describe('data credit', () => {
  it('credits GMRT with its licence link and nothing for synthetic terrain', () => {
    const credit = dataCreditFor('GMRT')!;
    expect(credit.links.map(([text]) => text)).toContain('CC BY 4.0');
    expect(credit.links.every(([, href]) => href.startsWith('https://'))).toBe(true);
    expect(dataCreditFor('synthetic')).toBeNull();
    expect(dataCreditFor(undefined)).toBeNull();
  });
});
