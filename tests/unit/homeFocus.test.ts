import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from '../../src/ui/Home.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Save } from '../../src/core/Save.js';
import { loadMissionSummaries, parseMission, type MissionSummary } from '../../src/game/Mission.js';
import blueHoleMission from '../../data/landmarks/great-blue-hole/mission.json';
import {
  initializeShell,
  LAST_SITE_KEY,
  readLastSite,
  shellSystem,
} from '../../src/app/systems/shell.js';
import type { ShellContext } from '../../src/app/context.js';

vi.mock('../../src/game/Mission.js', async (original) => ({
  ...(await original<typeof import('../../src/game/Mission.js')>()),
  loadMissionSummaries: vi.fn(),
}));

/** Small DOM surface for Home's primary Dive action and focus. */
class Element extends EventTarget {
  children: Element[] = [];
  hidden = false;
  disabled = false;
  className = '';
  textContent = '';
  title = '';
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  parentElement: Element | null = null;
  get isConnected(): boolean {
    return this === (document.body as unknown as Element) || !!this.parentElement?.isConnected;
  }
  classList = {
    contains: (name: string) => this.className.split(' ').includes(name),
    add: (name: string) => this.classList.toggle(name, true),
    remove: (name: string) => this.classList.toggle(name, false),
    toggle: (name: string, force = !this.classList.contains(name)) => {
      const names = new Set(this.className.split(' ').filter(Boolean));
      if (force) names.add(name);
      else names.delete(name);
      this.className = [...names].join(' ');
      return force;
    },
  };
  setAttribute() {}
  append(...children: Element[]) {
    for (const child of children) child.parentElement = this;
    this.children.push(...children);
  }
  appendChild(child: Element) {
    this.append(child);
    return child;
  }
  replaceChildren(...children: Element[]) {
    for (const child of [...this.children]) child.remove();
    this.append(...children);
  }
  contains(child: Element): boolean {
    return child === this || this.children.some((el) => el.contains(child));
  }
  getClientRects() {
    return this.hidden ? [] : [{}];
  }
  focus() {
    (document as unknown as { activeElement: Element }).activeElement = this;
  }
  remove() {
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  blur() {
    (document as unknown as { activeElement: Element }).activeElement =
      document.body as unknown as Element;
  }
}
let home: Home;
let dive = vi.fn();
beforeEach(() => {
  dive = vi.fn();
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { href: '' } }));
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  home = new Home({
    dive,
    journal: vi.fn(),
    subScreen: vi.fn(),
    settings: vi.fn(),
    controls: vi.fn(),
  });
});
afterEach(() => {
  shellSystem.dispose?.();
  home.dispose();
  vi.unstubAllGlobals();
});

const catalogue: MissionSummary[] = [
  { id: 'titanic', tile: 'titanic', title: 'Titanic dive', summary: '', depthM: 3800 },
  {
    id: 'great-blue-hole',
    tile: 'great-blue-hole',
    title: 'Great Blue Hole: Lighthouse Reef',
    summary: '',
    depthM: 125,
  },
];

function shell(savedSite: string | null = null, inDive = false, reuse?: ShellContext) {
  let resolve!: (list: MissionSummary[]) => void;
  const ready = new Promise<MissionSummary[]>((done) => (resolve = done));
  vi.mocked(loadMissionSummaries).mockReturnValueOnce(ready);
  if (savedSite) localStorage.setItem(LAST_SITE_KEY, JSON.stringify({ missionId: savedSite }));
  const def = parseMission(blueHoleMission, 'great-blue-hole')!;
  const ctx = Object.assign(reuse ?? {}, {
    index: [],
    meta: inDive ? { id: 'great-blue-hole' } : undefined,
    route: inDive
      ? { missionId: def.id, tileId: def.tile, landmarkId: def.landmark, skipBriefing: false, def }
      : null,
    bus: new EventBus(),
    save: new Save({ config: DEFAULT_CONFIG, storage: null }),
    journal: { open: vi.fn() },
    discoveries: { isDiscovered: () => false },
    app: { state: inDive ? 'dive' : 'home', lastSite: readLastSite() },
    shellBaseHref: () =>
      'https://example.test/submarine-explorer/?tier=low&touch=1&daily=old&tile=old',
    expose: vi.fn(),
  }) as unknown as ShellContext;
  initializeShell(ctx);
  ctx.setAppState(inDive ? 'dive' : 'home');
  const selected = vi.fn();
  ctx.bus.on('app:siteSelected', selected);
  return {
    ctx,
    selected,
    async arrive(list = catalogue) {
      resolve(list);
      await ready;
    },
    launch(id: string, title: string | null, tileId = id) {
      const announced = ctx.home.diveButton.textContent;
      expect(ctx.home.diveButton.disabled).toBe(false);
      ctx.home.diveButton.dispatchEvent(new Event('click'));
      expect(selected).toHaveBeenLastCalledWith({ missionId: id, tileId });
      expect(window.location.href).toBe(
        `https://example.test/submarine-explorer/?mission=${id}&tier=low&touch=1`,
      );
      expect(announced).toBe(title ? `Dive: ${title}` : 'Dive');
    },
  };
}

it('browser history traversal reloads the selected route and releases its listener on teardown', () => {
  const fixture = shell(null, true);
  const reload = vi.fn();
  Object.assign(window.location, { reload });
  fixture.ctx.setAppState('home');
  window.dispatchEvent(new Event('popstate'));
  expect(reload).toHaveBeenCalledOnce();
  window.dispatchEvent(new Event('popstate'));
  expect(reload).toHaveBeenCalledTimes(2);
  shellSystem.dispose?.();
  window.dispatchEvent(new Event('popstate'));
  expect(reload).toHaveBeenCalledTimes(2);
});

describe('Home announced destination', () => {
  it.each([null, 'great-blue-hole', 'removed-site'])(
    'keeps pending and resolved launch consistent with saved site %s',
    async (savedSite) => {
      const fixture = shell(savedSite);
      // Pending catalogue keeps the existing opening-mission fallback and generic label.
      fixture.launch('titanic', null);
      await fixture.arrive();
      const target = catalogue[savedSite === 'great-blue-hole' ? 1 : 0];
      fixture.launch(target.id, target.title);
      expect(readLastSite()).toBe(savedSite);
      expect(document.activeElement).toBe(fixture.ctx.home.diveButton);
    },
  );

  it.each([false, true])(
    'reflects a mission started before catalogue arrival: %s',
    async (early) => {
      const fixture = shell('titanic', true);
      if (!early) await fixture.arrive();
      fixture.ctx.bus.emit('mission:started', {
        missionId: 'great-blue-hole',
        tileId: 'great-blue-hole',
      });
      if (early) await fixture.arrive();
      fixture.ctx.setAppState('home');
      expect(document.activeElement).toBe(fixture.ctx.home.diveButton);
      expect(readLastSite()).toBe('great-blue-hole');
      fixture.launch('great-blue-hole', catalogue[1].title);
      fixture.ctx.setAppState('dive');
      fixture.ctx.setAppState('home');
      fixture.launch('great-blue-hole', catalogue[1].title);
    },
  );

  it('uses the catalogue tile when mission and tile identities differ', async () => {
    const fixture = shell('survey-mission');
    await fixture.arrive([{ ...catalogue[1], id: 'survey-mission' }]);
    fixture.launch('survey-mission', catalogue[1].title, 'great-blue-hole');
  });

  it.each([false, true])(
    'ignores a disposed catalogue after replacement (reuse context: %s)',
    async (reuse) => {
      const old = shell('titanic');
      const oldHome = old.ctx.home;
      const label = vi.spyOn(oldHome, 'setDiveSite');
      const menu = vi.spyOn(old.ctx.missionSelect, 'setMissions');
      const sites = vi.spyOn(old.ctx.homeSites, 'setMissions');
      shellSystem.dispose?.();
      const replacement = shell('great-blue-hole', false, reuse ? old.ctx : undefined);
      const replacementList = [catalogue[1]];
      await replacement.arrive(replacementList);
      const focused = document.activeElement;
      await old.arrive();
      expect(label).not.toHaveBeenCalled();
      expect(menu).not.toHaveBeenCalled();
      expect(sites).not.toHaveBeenCalled();
      if (!reuse) expect(old.ctx.missionSummaries).toEqual([]);
      expect(oldHome.root.isConnected).toBe(false);
      expect(oldHome.isOpen).toBe(false);
      expect(oldHome.diveButton.textContent).toBe('Dive');
      expect(old.selected).not.toHaveBeenCalled();
      expect(replacement.ctx.missionSummaries).toBe(replacementList);
      expect(replacement.ctx.app.lastSite).toBe('great-blue-hole');
      expect(document.activeElement).toBe(focused);
      replacement.launch('great-blue-hole', catalogue[1].title);
    },
  );
});
const focusedLabel = () => document.activeElement?.textContent;

describe('home primary action', () => {
  it('focuses the single enabled Dive button, first-run or returning', () => {
    home.show();
    expect(home.diveButton.disabled).toBe(false);
    expect(focusedLabel()).toBe('Dive');
    home.hide();
    home.show();
    expect(document.activeElement).toBe(home.diveButton);
  });
  it('runs the dive action when Dive is pressed', () => {
    home.diveButton.dispatchEvent(new Event('click'));
    expect(dive).toHaveBeenCalledTimes(1);
  });
});
