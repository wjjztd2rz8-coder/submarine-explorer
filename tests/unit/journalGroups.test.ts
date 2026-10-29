import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Journal } from '../../src/ui/Journal.js';
import {
  buildJournalSite,
  type JournalEntry,
  type JournalSite,
} from '../../src/game/JournalData.js';
import { parseSecrets, secretDiscoveryId } from '../../src/game/Secrets.js';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { PhotoStore, type Photo } from '../../src/game/PhotoStore.js';
import type { PhotoGallery } from '../../src/ui/PhotoGallery.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';

/** Lifecycle DOM double; native disclosure keys and layout are covered in e2e. */
class Element extends EventTarget {
  children: Element[] = [];
  parentElement: Element | null = null;
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  style: Record<string, string> = {};
  className = '';
  textContent = '';
  hidden = false;
  open = false;
  value = '';
  disabled = false;
  scrollTop = 0;
  tagName: string;
  tabIndex: number;
  constructor(tag = 'div') {
    super();
    this.tagName = tag.toUpperCase();
    this.tabIndex = ['button', 'summary', 'a', 'input', 'select', 'textarea'].includes(tag)
      ? 0
      : -1;
  }
  classList = {
    toggle: (name: string, on: boolean) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(' ');
    },
    add: (name: string) => this.classList.toggle(name, true),
    contains: (name: string) => this.className.split(' ').includes(name),
  };
  setAttribute(key: string, value: string) {
    this.attributes[key] = value;
  }
  append(...children: Element[]) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }
  appendChild(child: Element) {
    this.append(child);
  }
  remove() {
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  replaceChildren(...children: Element[]) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    this.append(...children);
  }
  contains(child: Element): boolean {
    return this === child || this.children.some((e) => e.contains(child));
  }
  get isConnected(): boolean {
    return this === (document.body as unknown as Element) || !!this.parentElement?.isConnected;
  }
  getClientRects(): object[] {
    return this.hidden || !this.isConnected ? [] : [{}];
  }
  querySelectorAll(selector: string): Element[] {
    return descendants(this).filter((el) =>
      selector.split(',').some((part) => {
        const s = part.trim();
        if (s === '[data-target]') return !!el.dataset.target;
        if (s.startsWith('.')) return el.className.split(' ').includes(s.slice(1));
        return el.tagName.toLowerCase() === s.split(/[:\[]/)[0];
      }),
    );
  }
  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  closest(selector: string): Element | null {
    if (selector === '[hidden], [inert]' && this.hidden) return this;
    if (selector === 'details:not([open])' && this.tagName === 'DETAILS' && !this.open) return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  focus() {
    (document as unknown as { activeElement: Element }).activeElement = this;
  }
  blur() {
    (document as unknown as { activeElement: Element }).activeElement =
      document.body as unknown as Element;
  }
}
function descendants(el: Element): Element[] {
  return el.children.flatMap((child) => [child, ...descendants(child)]);
}
function site(id: string): JournalSite {
  const entries: JournalEntry[] = ['site', 'poi', 'species', 'life', 'secret'].map((kind) => ({
    key: `${id}/${kind}/entry`,
    siteId: id,
    kind: kind as JournalEntry['kind'],
    id: kind === 'poi' ? 'entry' : `${kind}-entry`,
    title: `${kind} entry`,
    poiIds: kind === 'poi' ? ['target'] : [],
    linkedEntryIds: [],
    recreation: false,
  }));
  return {
    id,
    name: id,
    region: '',
    depthM: null,
    summary: '',
    facts: [],
    links: [],
    entries,
    poiIds: ['target'],
    species: null,
  };
}
let journal: Journal;
let root: Element;
/** The phone-sheet media query, flipped per test. */
const phoneQuery = Object.assign(new EventTarget(), { matches: false });
const find = (predicate: (el: Element) => boolean): Element => {
  const el = descendants(root).find(predicate);
  expect(el).toBeDefined();
  return el!;
};
const header = (id: string) => find((el) => el.dataset.target === id && el.tagName === 'BUTTON');
const category = (key: string) =>
  find((el) => el.dataset.category === key && el.tagName === 'DETAILS');
beforeEach(() => {
  phoneQuery.matches = false;
  const body = new Element('body');
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
  vi.stubGlobal('window', Object.assign(new EventTarget(), { matchMedia: () => phoneQuery }));
  vi.stubGlobal('document', {
    body,
    activeElement: body,
    createElement: (tag: string) => new Element(tag),
  });
  journal = new Journal();
  root = journal.root as unknown as Element;
  // The catalogue is loaded already; do not make network requests in lifecycle tests.
  Object.assign(journal, { sites: [site('reef'), site('wreck')] });
  vi.spyOn(journal, 'load').mockResolvedValue();
  journal.setCurrentSite('reef');
  journal.open();
});
afterEach(() => {
  journal.dispose();
  vi.unstubAllGlobals();
});

it.each([
  { scanned: [], found: 0 },
  { scanned: ['secret:arch'], found: 1 },
  { scanned: ['sample:mud'], found: 0 },
  { scanned: ['secret:arch', 'sample:mud'], found: 1 },
])('counts only hidden secrets in site progress after scans $scanned', ({ scanned, found }) => {
  // Regression: adding sample entries to Finds inflated both secret counts.
  const reef = buildJournalSite({
    id: 'reef',
    guide: null,
    pois: [],
    species: null,
    secrets: [{ id: 'arch', name: 'Arch', kind: 'rock', lat: 0, lon: 0, text: 'A hidden arch.' }],
    samples: [{ id: 'mud', name: 'Sediment core', lat: 0, lon: 0 }],
  });
  Object.assign(journal, { sites: [reef] });
  const store = new DiscoveryStore(null);
  for (const id of scanned) store.record('reef', id);
  journal.setStore(store);
  journal.show('reef');
  const chips = find((el) => el.className.split(' ').includes('jr-progress'));
  expect(chips.children.map((el) => el.textContent)).toEqual(['0/0 entries', `${found}/1 secrets`]);
  expect(reef.entries.filter((entry) => entry.kind === 'secret')).toHaveLength(2);
  if (scanned.includes('sample:mud')) {
    journal.show('reef/sample/mud');
    expect(find((el) => el.className === 'jr-title').textContent).toBe('Sediment core');
  }
});

it.each(
  [false, true].flatMap((phone) =>
    ['empty', 'missing', 'corrupt', 'offline'].map((content) => ({ phone, content })),
  ),
)(
  'finishes loading an unavailable Home catalogue ($content, phone=$phone) and stays closable',
  async ({ phone, content }) => {
    journal.close();
    phoneQuery.matches = phone;
    journal.setCurrentSite(null);
    journal.setHomeMode(true);
    Object.assign(journal, { sites: [] });
    vi.mocked(journal.load).mockRestore();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await pending;
        if (content === 'offline') throw new Error('offline');
        return {
          ok: content !== 'missing',
          text: async () => (content === 'corrupt' ? '{' : '{"version":1,"landmarks":[]}'),
        };
      }),
    );
    const opener = new Element('button');
    (document.body as unknown as Element).append(opener);
    opener.focus();
    journal.open();
    expect(find((el) => el.className === 'jr-empty').textContent).toBe('Loading the Journal…');
    finish();
    await journal.load();
    expect(find((el) => el.className === 'jr-empty').textContent).toBe(
      'No Journal sites available.',
    );
    expect(journal.viewKey).toBe('front');
    find((el) => el.className === 'jr-close').dispatchEvent(new Event('click'));
    expect(journal.isOpen).toBe(false);
    expect(document.activeElement).toBe(opener);
    journal.open();
    await journal.load();
    expect(find((el) => el.className === 'jr-empty').textContent).toBe(
      'No Journal sites available.',
    );
  },
);

it.each([false, true])('counts hidden secrets independently of samples (phone=%s)', (phone) => {
  // Samples share the Finds section, but collecting them must not change the secret tally.
  phoneQuery.matches = phone;
  const id = 'monterey-canyon';
  const content = parseSecrets(JSON.parse(readFileSync(`data/secrets/${id}.json`, 'utf8')));
  const store = new DiscoveryStore(null);
  Object.assign(journal, {
    sites: [buildJournalSite({ id, guide: null, pois: [], species: null, ...content })],
  });
  journal.setStore(store);
  journal.show(id);
  const progress = () =>
    find((el) => el.classList.contains('jr-progress')).children.map((el) => el.textContent);
  expect(content.secrets).toHaveLength(3);
  expect(content.samples).toHaveLength(2);
  expect(progress()).toContain('0/3 secrets');
  for (const sample of content.samples) store.record(id, `sample:${sample.id}`);
  journal.refresh();
  expect(progress()).toContain('0/3 secrets');
  for (const secret of content.secrets) store.record(id, secretDiscoveryId(secret.id));
  journal.refresh();
  expect(progress()).toContain('3/3 secrets');
});

it('retains the Journal preview height cap without forcing an aspect ratio', () => {
  // Numeric style contract only; native CSS sizing and screenshot acceptance belong to browser QA.
  const css = readFileSync('src/styles/photo.css', 'utf8');
  const rule = /\.jr-hero img\s*\{([^}]+)\}/.exec(css)![1];
  expect(rule).toMatch(/max-height:\s*min\(300px, 32vh\)/);
  expect(rule).toMatch(/max-width:\s*100%/);
  expect(rule).toMatch(/object-fit:\s*contain/);
});

it.each(['absent', 'empty', 'other site', 'other subject', 'untagged', 'matching'])(
  'opens a logged entry when its capture is %s and removes a stale hero on refresh',
  (capture) => {
    journal.setStore({ isDiscovered: () => true });
    if (capture !== 'absent') {
      const photo: Photo = {
        id: 'capture',
        image: 'data:image/jpeg;base64,YQ==',
        siteId: capture === 'other site' ? 'wreck' : 'reef',
        siteName: 'Reef',
        poiId: capture === 'untagged' ? null : capture === 'other subject' ? 'other' : 'target',
        poiName: null,
        at: '2026-10-17T00:00:00Z',
        depthM: 100,
      };
      let saved = JSON.stringify({ version: 1, photos: capture === 'empty' ? [] : [photo] });
      const store = new PhotoStore({
        getItem: () => saved,
        setItem: (_key, value) => {
          saved = value;
        },
      });
      const gallery = { render: vi.fn(), dispose: vi.fn() };
      journal.setPhotoGallery(store, gallery as unknown as PhotoGallery);
      journal.show('reef/poi/entry');
      const heroes = descendants(root).filter((el) => el.classList.contains('jr-hero'));
      expect(heroes).toHaveLength(capture === 'matching' ? 1 : 0);
      if (capture === 'matching') {
        const image = heroes[0].children[0] as unknown as HTMLImageElement;
        expect(image.src).toBe(photo.image);
        expect(image.alt).toBe('poi entry');
        expect(store.delete(photo.id)).toBe(true);
        journal.refresh();
        expect(descendants(root).filter((el) => el.classList.contains('jr-hero'))).toHaveLength(0);
      }
      expect(gallery.render).not.toHaveBeenCalled();
    } else {
      journal.show('reef/poi/entry');
      expect(descendants(root).filter((el) => el.classList.contains('jr-hero'))).toHaveLength(0);
    }
    expect(journal.viewKey).toBe('reef/poi/entry');
    expect(find((el) => el.className === 'jr-title').textContent).toBe('poi entry');
  },
);

it('removes the rotation listener before another Journal is created', () => {
  const oldRefresh = vi.spyOn(journal, 'refresh');
  journal.dispose();
  const next = new Journal();
  const refresh = vi.spyOn(next, 'refresh');
  try {
    phoneQuery.dispatchEvent(new Event('change'));
    expect(oldRefresh).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  } finally {
    next.dispose();
  }
});

it('moves focus to the article when rotation hides the connected spoilers switch', () => {
  journal.setStore({ isDiscovered: () => true });
  journal.open('site-entry');
  const box = find((el) => el.tagName === 'INPUT');
  // The phone stylesheet hides the desktop nav, including its still-connected switch.
  vi.spyOn(box, 'getClientRects').mockImplementation(() => (phoneQuery.matches ? [] : [{}]));
  box.focus();
  phoneQuery.matches = true;
  phoneQuery.dispatchEvent(new Event('change'));
  expect(box.isConnected).toBe(true);
  expect(document.activeElement).toBe(find((el) => el.className === 'jr-body'));
});

it('opens the current site and points of interest, keeping other sites/categories collapsed', () => {
  expect(header('reef').attributes['aria-expanded']).toBe('true');
  expect(header('wreck').attributes['aria-expanded']).toBe('false');
  expect(category('reef/poi').open).toBe(true);
  for (const kind of ['site', 'species', 'life', 'secret'])
    expect(category(`reef/${kind}`).open).toBe(false);
  expect(
    descendants(root)
      .filter((el) => el.className === 'jr-more-to-find')
      .map((el) => el.textContent),
  ).toEqual(['1 more to find']);
});
it('collapses a site without changing its article and restores focus on the rebuilt button', () => {
  const button = header('reef');
  button.focus();
  button.dispatchEvent(new Event('click'));
  expect(journal.viewKey).toBe('reef');
  expect(header('reef').attributes['aria-expanded']).toBe('false');
  expect(document.activeElement).toBe(header('reef'));
  const container = find(
    (el) => (el as unknown as { id: string }).id === header('reef').attributes['aria-controls'],
  );
  expect(container.hidden).toBe(true);
});
it('opens another site on demand and displays its overview', () => {
  header('wreck').dispatchEvent(new Event('click'));
  expect(header('wreck').attributes['aria-expanded']).toBe('true');
  expect(journal.viewKey).toBe('wreck');
  expect(category('wreck/poi').open).toBe(true);
});

it.each([false, true])(
  'shows wildlife-first site rows after a legacy save reload without unlocking another site (phone=%s)',
  (phone) => {
    phoneQuery.matches = phone;
    const raw = JSON.stringify(['reef/life:life-entry']);
    const storage = {
      getItem: (key: string) => (key === DISCOVERY_STORAGE_KEY ? raw : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    for (let reload = 0; reload < 2; reload++) {
      journal.setStore(new DiscoveryStore(storage));
      journal.show('front');
      const cards = descendants(root).filter((el) => el.className.includes('jr-site-card'));
      expect(
        cards.find((el) => el.dataset.target === 'reef')!.classList.contains('is-locked'),
      ).toBe(false);
      expect(
        cards.find((el) => el.dataset.target === 'wreck')!.classList.contains('is-locked'),
      ).toBe(true);
      journal.show('reef');
      expect(descendants(root).some((el) => el.textContent === 'No scans logged')).toBe(false);
      const rows = descendants(root).filter((el) => el.classList.contains('jr-row'));
      expect(rows.map((el) => el.dataset.row)).toContain('reef/life/entry');
      expect(rows.map((el) => el.dataset.row)).toContain('reef/site/entry');
      expect(rows.map((el) => el.dataset.row)).not.toContain('reef/poi/entry');
      journal.show('wreck');
      expect(descendants(root).some((el) => el.classList.contains('jr-locked'))).toBe(true);
    }
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  },
);
it('routes an expanded site row back from an entry, then collapses it on the overview', () => {
  journal.show('reef/poi/entry');
  const button = header('reef');
  button.focus();
  button.dispatchEvent(new Event('click'));
  expect(journal.viewKey).toBe('reef');
  expect(header('reef').attributes['aria-expanded']).toBe('true');
  expect(document.activeElement).toBe(header('reef'));
  header('reef').dispatchEvent(new Event('click'));
  expect(journal.viewKey).toBe('reef');
  expect(header('reef').attributes['aria-expanded']).toBe('false');
});
it('keeps a category collapsed through spoiler refreshes and site collapse/reopen', () => {
  const group = category('reef/poi');
  group.open = false;
  group.dispatchEvent(new Event('toggle'));
  journal.setSpoilers(true);
  expect(category('reef/poi').open).toBe(false);
  header('reef').dispatchEvent(new Event('click'));
  header('reef').dispatchEvent(new Event('click'));
  expect(category('reef/poi').open).toBe(false);
});
it('restores a category summary when discovery refresh rebuilds the contents', () => {
  const summary = category('reef/life').children[0]!;
  summary.focus();
  journal.refresh();
  expect(document.activeElement).toBe(category('reef/life').children[0]);
});
it('blurs the opener without focusing a control on activation and restores it on close', () => {
  journal.close();
  const opener = new Element('button');
  (document.body as unknown as Element).append(opener);
  opener.focus();
  journal.open();
  expect(document.activeElement).toBe(document.body);
  category('reef/life').children[0]!.focus();
  journal.close();
  expect(document.activeElement).toBe(opener);
});
it('direct entry navigation reveals its site and category and renders one addition tag', () => {
  journal.setSpoilers(true);
  journal.show('wreck/secret/entry');
  expect(header('wreck').attributes['aria-expanded']).toBe('true');
  expect(category('wreck/secret').open).toBe(true);
  expect(descendants(root).filter((el) => el.textContent === 'Game addition')).toHaveLength(1);
});
it('opens a focused scan even when its category was manually collapsed', () => {
  const group = category('reef/poi');
  group.open = false;
  group.dispatchEvent(new Event('toggle'));
  journal.close();
  journal.focus('entry');
  journal.open();
  expect(category('reef/poi').open).toBe(true);
  expect(journal.selectedId).toBe('entry');
});

it.each([false, true])('opens a wildlife scan after browsing another site (phone=%s)', (phone) => {
  phoneQuery.matches = phone;
  journal.setStore({ isDiscovered: () => true });
  journal.show('wreck/poi/entry');
  journal.close();
  journal.focus('life/entry');
  journal.open();
  expect(journal.viewKey).toBe('reef/life/entry');
  expect(journal.selectedId).toBeNull();
  expect(find((el) => el.className === 'jr-title').textContent).toBe('life entry');
});

it('opens the front page from Home after quitting with an unread scan, then consumes that focus', () => {
  journal.close();
  journal.focus('entry');
  journal.setHomeMode(true);
  journal.open();
  expect(journal.viewKey).toBe('front');
  journal.close();
  journal.setHomeMode(false);
  journal.open();
  expect(journal.viewKey).toBe('reef');
  journal.close();
  journal.open('entry');
  expect(journal.selectedId).toBe('entry');
});

it('keeps one front-page caveat through refreshes and only a provenance tag on entries', () => {
  for (let round = 0; round < 2; round++) {
    journal.show('front');
    journal.refresh();
    expect(descendants(root).filter((el) => el.className === 'jr-honesty')).toHaveLength(1);
    journal.setSpoilers(true);
    journal.show('wreck/secret/entry');
    expect(descendants(root).filter((el) => el.className === 'jr-honesty')).toHaveLength(0);
    expect(descendants(root).filter((el) => el.textContent === 'Game addition')).toHaveLength(1);
  }
});

describe('phone sheet', () => {
  const byClass = (cls: string): Element[] =>
    descendants(root).filter((el) => el.className.split(' ').includes(cls));
  const body = () => byClass('jr-body')[0]!;
  beforeEach(() => {
    phoneQuery.matches = true;
    journal.refresh();
  });

  it('lists the sites as rows on the front page and renders no contents tree', () => {
    journal.show('front');
    expect(root.classList.contains('is-phone')).toBe(true);
    expect(root.classList.contains('at-front')).toBe(true);
    expect(byClass('jr-site-card').map((el) => el.dataset.target)).toEqual(['reef', 'wreck']);
    expect(byClass('jr-nav-list')).toHaveLength(0);
  });

  it('puts the spoilers switch at the end of the contents and site pages, off the header', () => {
    journal.show('front');
    const label = byClass('jr-spoilers')[0]!;
    expect(label.parentElement).toBe(body());
    expect(byClass('jr-header')[0]!.contains(label)).toBe(false);
    journal.show('reef');
    expect(label.parentElement).toBe(body());
    // A logged entry's page is not cluttered by it.
    journal.setStore({ isDiscovered: () => true });
    journal.show('reef/poi/entry');
    expect(label.parentElement).not.toBe(body());
  });

  it('lists a site page as entry rows and goes back one level at a time', () => {
    journal.setSpoilers(true);
    journal.show('reef');
    expect(root.classList.contains('at-front')).toBe(false);
    const rows = byClass('jr-row');
    expect(rows.map((el) => el.dataset.row)).toContain('reef/site/entry');
    // Until a first scan, the page is a short locked note with no rows.
    journal.setSpoilers(false);
    expect(byClass('jr-locked')).toHaveLength(1);
    expect(byClass('jr-row')).toHaveLength(0);
    journal.setSpoilers(true);
    const open = byClass('jr-row').find((el) => el.dataset.row === 'reef/poi/entry')!;
    open.dispatchEvent(new Event('click'));
    expect(journal.viewKey).toBe('reef/poi/entry');
    byClass('jr-back')[0]!.dispatchEvent(new Event('click'));
    expect(journal.viewKey).toBe('reef');
    byClass('jr-back')[0]!.dispatchEvent(new Event('click'));
    expect(journal.viewKey).toBe('front');
  });
});

// Guards the cosmetic picker staying on the Your sub screen rather than returning to the front page.
it.each([false, true])('keeps cosmetic controls off the Journal front page (phone=%s)', (phone) => {
  phoneQuery.matches = phone;
  journal.show('front');
  expect(descendants(root).filter((el) => el.dataset.cosmetic)).toHaveLength(0);
  expect(descendants(root).some((el) => el.textContent === 'Cosmetics')).toBe(false);
  expect(readFileSync('src/ui/Journal.ts', 'utf8')).not.toMatch(/cosmetic/i);
  expect(readFileSync('src/styles/journal.css', 'utf8')).not.toMatch(/cosmetic/i);
});
