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
      debrief.show(stats, actions);
      const panel = (debrief.root as unknown as Element).children[0];
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
