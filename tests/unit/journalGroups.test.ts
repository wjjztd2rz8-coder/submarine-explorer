import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COSMETIC_CHOICES, type CosmeticSlot } from '../../src/game/Cosmetics.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { Journal } from '../../src/ui/Journal.js';
import type { JournalEntry, JournalSite } from '../../src/game/JournalData.js';

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

it.each([false, true])(
  'makes every cosmetic selectable and persistent on the Journal front page (phone=%s)',
  (phone) => {
    phoneQuery.matches = phone;
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
    const progress = new Progress(new ProgressSave(storage));
    journal.setProgress(progress);
    journal.show('front');
    const selects = () =>
      descendants(root).filter((el) => el.tagName === 'SELECT' && el.dataset.cosmetic);
    expect(
      selects()
        .map((el) => el.dataset.cosmetic)
        .sort(),
    ).toEqual(Object.keys(COSMETIC_CHOICES).sort());
    for (const select of selects())
      for (const option of select.children) expect(option.disabled).toBe(option.value !== 'stock');
    for (let i = 0; i < 25; i++) progress.award('poi', `reef/${i}`);
    progress.award('secret', 'reef/find');
    journal.refresh();
    for (const select of selects()) {
      const slot = select.dataset.cosmetic as CosmeticSlot;
      expect(select.children.map((option) => option.value)).toEqual(
        COSMETIC_CHOICES[slot].map((def) => def.id),
      );
      for (const option of select.children) {
        expect(option.disabled).toBe(false);
        select.value = option.value;
        select.dispatchEvent(new Event('change'));
        const restored = new Progress(new ProgressSave(storage));
        expect(restored.cosmetics[slot]).toBe(option.value);
        journal.setProgress(restored);
        journal.refresh();
        expect(selects().find((el) => el.dataset.cosmetic === slot)!.value).toBe(option.value);
      }
    }
    const restored = new Progress(new ProgressSave(storage));
    const mesh = new SubMesh({ tier: 'low', hullClass: 'A', cosmetics: restored.cosmetics });
    try {
      expect(mesh.vehicle.materials.paintUniforms.uHullBase.value.getHex()).toBe(0xabbcc8);
      mesh.setHullClass('C');
      expect(mesh.vehicle.materials.paintUniforms.uHullBase.value.getHex()).toBe(0xabbcc8);
    } finally {
      mesh.dispose();
    }
  },
);
