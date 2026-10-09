import { afterEach, expect, it, vi } from 'vitest';
import { Debrief } from '../../src/ui/Debrief.js';
import type { DebriefStats } from '../../src/game/Objectives.js';

/** Minimal DOM for the summary's show/hide lifecycle; layout is checked in Playwright. */
class Element extends EventTarget {
  children: Element[] = [];
  hidden = false;
  className = '';
  textContent = '';
  scrollTop = 0;
  dataset: Record<string, string> = {};
  setAttribute() {}
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
