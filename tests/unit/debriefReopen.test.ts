import { afterEach, expect, it, vi } from 'vitest';
import { Debrief, type DebriefAction } from '../../src/ui/Debrief.js';
import type { DebriefStats } from '../../src/game/Objectives.js';
import { siteHook } from '../../src/game/Tour.js';

/** Minimal DOM for the summary's show/hide lifecycle; layout is checked in Playwright. */
class Element extends EventTarget {
  children: Element[] = [];
  hidden = false;
  className = '';
  textContent = '';
  scrollTop = 0;
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  get childElementCount() {
    return this.children.length;
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  append(...children: Element[]) {
    this.children.push(...children);
  }
  appendChild(child: Element) {
    this.append(child);
  }
  replaceChildren(...children: Element[]) {
    this.children = children;
  }
  contains(child: Element): boolean {
    return child === this || this.children.some((e) => e.contains(child));
  }
  blur() {}
  remove() {}
}

afterEach(() => vi.unstubAllGlobals());

it('lists this dive and keeps next destination primary when reopened', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const debrief = new Debrief();
  const run = vi.fn();
  const actions: DebriefAction[] = [
    { id: 'next-dive', label: 'Next dive: Lost City', primary: true, run },
    { id: 'keep-exploring', label: 'Keep exploring', run },
    { id: 'journal', label: 'Journal', run },
    { id: 'dive-again', label: 'Dive again', run },
  ];
  const stats: DebriefStats = {
    elapsedS: 10,
    distanceM: 0,
    maxDepthM: 100,
    discoveries: [],
    newEntries: [],
  };
  try {
    for (const count of [0, 3, 1]) {
      stats.discoveries = Array.from({ length: count }, (_, i) => ({
        poiId: String(i),
        name: `Target ${i}`,
      }));
      debrief.show(stats, actions, { stars: 1, best: 1, points: 0 });
      const panel = (debrief.root as unknown as Element).children[0];
      expect(panel.children[0].children[1].className).toBe('debrief-title');
      expect(JSON.stringify(panel.children)).not.toContain('debrief-stars');
      const finds = panel.children.find((e) => e.className === 'debrief-finds')!;
      expect(finds.children).toHaveLength(count || 1);
      const row = panel.children.find((e) => e.className === 'debrief-actions')!;
      expect(row.children[0].children[0].dataset.action).toBe('next-dive');
      const secondary = row.children[1];
      expect(secondary.children.slice(0, 2).map((e) => e.dataset.action)).toEqual([
        'keep-exploring',
        'journal',
      ]);
      const [toggle, more] = secondary.children[2].children;
      expect(more.hidden).toBe(true);
      expect(more.children[0].dataset.action).toBe('dive-again');
      toggle.dispatchEvent(new Event('click'));
      expect(more.hidden).toBe(false);
      panel.scrollTop = 100;
      debrief.hide();
      debrief.show(stats, actions);
      expect(panel.scrollTop).toBe(0);
      debrief.hide();
    }
  } finally {
    debrief.dispose();
  }
});

it('renders wildlife as a text tile and a framed landmark as a photo card', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const debrief = new Debrief({
    context: { siteId: 'site', primaryIds: [], store: { isDiscovered: () => false } },
  });
  Object.assign(debrief, { sites: [{ id: 'site', entries: [{ kind: 'poi', poiIds: ['bow'] }] }] });
  vi.stubGlobal('localStorage', {
    getItem: () =>
      JSON.stringify({
        version: 1,
        photos: [
          {
            id: 'photo',
            siteId: 'site',
            siteName: 'Site',
            poiId: 'bow',
            poiName: 'Bow',
            image: 'data:image/jpeg;base64,YQ==',
            framedReveal: true,
            at: '2026-01-01',
            depthM: 1,
          },
          {
            id: 'animal',
            siteId: 'site',
            siteName: 'Site',
            poiId: 'life:anemone',
            poiName: 'White sea anemone',
            image: 'data:image/jpeg;base64,YQ==',
            at: '2026-01-01',
            depthM: 1,
          },
        ],
      }),
  });
  try {
    debrief.show(
      {
        elapsedS: 1,
        distanceM: 0,
        maxDepthM: 1,
        newEntries: [],
        discoveries: [
          { poiId: 'life:anemone', name: 'White sea anemone' },
          { poiId: 'bow', name: 'Bow' },
        ],
        finds: { found: 2, total: 2 },
      },
      [{ id: 'next-dive', label: 'Next dive', run() {} }],
    );
    const panel = (debrief.root as unknown as Element).children[0];
    expect(panel.children[0].children[1].textContent).toBe('You found 2 of 2');
    const tiles = panel.children.find((e) => e.className === 'debrief-finds')!.children;
    expect(tiles[0].children[0].className).toBe('debrief-thumb');
    expect((tiles[0].children[0] as unknown as HTMLImageElement).src).toBe(
      'data:image/jpeg;base64,YQ==',
    );
    expect(tiles[1].className).toContain('debrief-find-text');
    expect(tiles[1].children.map((e) => e.textContent)).toEqual(['White sea anemone', 'Wildlife']);
    expect(tiles[1].children.some((e) => e.className === 'debrief-thumb')).toBe(false);
  } finally {
    debrief.dispose();
  }
});

it('shows the next site hook with the next-dive button, and none for the chooser', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const debrief = new Debrief();
  const stats: DebriefStats = {
    elapsedS: 1,
    distanceM: 0,
    maxDepthM: 1,
    discoveries: [],
    newEntries: [],
  };
  const navigation = () => {
    const panel = (debrief.root as unknown as Element).children[0];
    return panel.children.find((e) => e.className === 'debrief-actions')!.children[0];
  };
  try {
    debrief.show(stats, [
      {
        id: 'next-dive',
        siteId: 'lost-city',
        label: 'Next dive: Lost City',
        primary: true,
        run() {},
      },
    ]);
    expect(navigation().children.map((e) => e.className)).toEqual([
      'debrief-hook',
      'debrief-btn is-primary',
    ]);
    expect(navigation().children[0].textContent).toBe(siteHook('lost-city'));
    debrief.show(stats, [
      { id: 'dive-sites', label: 'Choose a dive site', primary: true, run() {} },
    ]);
    expect(navigation().children.map((e) => e.className)).toEqual(['debrief-btn is-primary']);
  } finally {
    debrief.dispose();
  }
});
