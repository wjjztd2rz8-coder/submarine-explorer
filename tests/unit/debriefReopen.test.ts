import { afterEach, expect, it, vi } from 'vitest';
import { Debrief, type DebriefAction } from '../../src/ui/Debrief.js';
import type { DebriefStats } from '../../src/game/Objectives.js';

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

it('switches the primary and quiet actions after the first scan without stale More state', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const debrief = new Debrief();
  const run = vi.fn();
  const actions: DebriefAction[] = [
    { id: 'keep-exploring', label: 'Keep exploring', primary: true, run },
    { id: 'dive-again', label: 'Dive again', run },
    { id: 'dive-sites', label: 'Dive sites', run },
    { id: 'home', label: 'Home', run },
    { id: 'journal', label: 'Journal', run },
  ];
  const stats: DebriefStats = {
    elapsedS: 60,
    distanceM: 20,
    maxDepthM: 100,
    discoveries: [],
    newEntries: [],
  };
  const panel = (debrief.root as unknown as Element).children[0];
  const groups = () => {
    const row = panel.children.find((e) => e.className === 'debrief-actions')!;
    const [navigation, secondary] = row.children;
    const more = secondary.children.find((e) => e.className === 'debrief-more')!;
    return { navigation, secondary, toggle: more.children[0], moreBox: more.children[1] };
  };
  try {
    for (const scans of [0, 1, 0]) {
      stats.discoveries = scans ? [{ poiId: 'bow', name: 'Bow' }] : [];
      debrief.show(stats, actions);
      const { navigation, secondary, toggle, moreBox } = groups();
      expect(navigation.children).toHaveLength(1);
      expect(navigation.children[0].className).toBe('debrief-btn is-primary');
      expect(navigation.children[0].dataset.action).toBe(scans ? 'dive-sites' : 'keep-exploring');
      expect(secondary.children.slice(0, 2).map((e) => e.dataset.action)).toEqual([
        scans ? 'keep-exploring' : 'dive-sites',
        'journal',
      ]);
      expect(moreBox.children.map((e) => e.dataset.action)).toEqual(['dive-again', 'home']);
      expect(moreBox.hidden).toBe(true);
      expect(toggle.attributes['aria-expanded']).toBe('false');
      toggle.dispatchEvent(new Event('click'));
      expect(moreBox.hidden).toBe(false);
      expect(toggle.attributes['aria-expanded']).toBe('true');
      const keep = [...navigation.children, ...secondary.children].find(
        (e) => e.dataset.action === 'keep-exploring',
      )!;
      keep.dispatchEvent(new Event('click'));
      debrief.hide();
    }
    expect(run).toHaveBeenCalledTimes(3);
    expect(actions.map((a) => a.id)).toEqual([
      'keep-exploring',
      'dive-again',
      'dive-sites',
      'home',
      'journal',
    ]);
  } finally {
    debrief.dispose();
  }
});

it('keeps zero-scan non-resumable and free dives on their existing primary actions', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const run = vi.fn();
  const debrief = new Debrief({ onDiveAgain: run });
  const stats: DebriefStats = {
    elapsedS: 60,
    distanceM: 20,
    maxDepthM: 100,
    discoveries: [],
    newEntries: [],
  };
  const panel = (debrief.root as unknown as Element).children[0];
  const primary = () =>
    panel.children.find((e) => e.className === 'debrief-actions')!.children[0].children[0];
  try {
    debrief.show(stats, [
      { id: 'dive-again', label: 'Dive again', primary: true, run },
      { id: 'dive-sites', label: 'Dive sites', run },
      { id: 'home', label: 'Home', run },
      { id: 'journal', label: 'Journal', run },
    ]);
    expect(primary().dataset.action).toBe('dive-sites');
    debrief.hide();
    debrief.show(stats);
    expect(primary().dataset.action).toBe('dive-again');
    primary().dispatchEvent(new Event('click'));
    expect(run).toHaveBeenCalledOnce();
  } finally {
    debrief.dispose();
  }
});

it('a second surfaced dive opens at the new summary heading after scrolling and resuming', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const debrief = new Debrief();
  const first: DebriefStats = {
    title: 'Back at the surface',
    elapsedS: 60,
    distanceM: 20,
    maxDepthM: 100,
    discoveries: [],
    newEntries: [],
  };
  try {
    debrief.show(first);
    const panel = (debrief.root as unknown as Element).children[0];
    panel.scrollTop = 220;
    debrief.hide();
    const second: DebriefStats = {
      ...first,
      title: 'Mission complete',
      elapsedS: 180,
      discoveries: [{ poiId: 'bow', name: 'Bow' }],
      newEntries: [{ id: 'bow', title: 'The bow' }],
    };
    debrief.show(second);
    expect(debrief.isOpen).toBe(true);
    expect(debrief.last).toEqual(second);
    expect(panel.children[0].children[1].textContent).toBe('Mission complete');
    expect(panel.scrollTop).toBe(0);
  } finally {
    debrief.dispose();
  }
});

it('renders a collected sample as the single classified highlight and clears it on the next dive', () => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  const debrief = new Debrief();
  const stats: DebriefStats = {
    elapsedS: 60,
    distanceM: 20,
    maxDepthM: 100,
    discoveries: [],
    newEntries: [],
  };
  const exploration = { found: 0, total: 0, secrets: [], samples: ['Sediment core'], events: [] };
  debrief.exploration = () => exploration;
  const panel = (debrief.root as unknown as Element).children[0];
  const highlights = () =>
    panel.children.filter((el) => el.className.split(' ').includes('debrief-highlight'));
  try {
    debrief.show(stats);
    expect(highlights()).toHaveLength(1);
    expect(highlights()[0].className).toBe('debrief-highlight is-samples');
    expect(highlights()[0].textContent).toBe('Collected Sediment core.');
    debrief.hide();
    exploration.samples = [];
    debrief.show(stats);
    expect(highlights()).toHaveLength(1);
    expect(highlights()[0].className).toBe('debrief-highlight');
    expect(highlights()[0].textContent).toBe('The site is waiting for your first scan.');
  } finally {
    debrief.dispose();
  }
});
