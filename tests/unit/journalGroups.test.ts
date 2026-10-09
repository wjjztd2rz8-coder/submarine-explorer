import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
const find = (predicate: (el: Element) => boolean): Element => {
  const el = descendants(root).find(predicate);
  expect(el).toBeDefined();
  return el!;
};
const header = (id: string) => find((el) => el.dataset.target === id && el.tagName === 'BUTTON');
const category = (key: string) =>
  find((el) => el.dataset.category === key && el.tagName === 'DETAILS');
beforeEach(() => {
  const body = new Element('body');
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { matchMedia: () => ({ matches: false }) }),
  );
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
  journal.close();
  vi.unstubAllGlobals();
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
