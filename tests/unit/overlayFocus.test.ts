import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { GameContext } from '../../src/app/context.js';
import { shellKeysSystem } from '../../src/app/systems/shell.js';
import { FocusTrap, observeKeyboard, type FocusTrapOptions } from '../../src/ui/FocusTrap.js';
import { Globe } from '../../src/ui/Globe.js';
import type { GlobeSite } from '../../src/ui/GlobeModel.js';
import { SettingsScreen } from '../../src/ui/Settings.js';
import { Save, ProgressSave, defaultSettings } from '../../src/core/Save.js';
import { Progress as SavedProgress } from '../../src/game/Progress.js';
import { DailySave } from '../../src/game/DailySave.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Input } from '../../src/core/Input.js';
import { Briefing } from '../../src/ui/Briefing.js';
import { Debrief } from '../../src/ui/Debrief.js';
import { Journal } from '../../src/ui/Journal.js';
import { ControlsCard } from '../../src/ui/ControlsCard.js';
import { Home } from '../../src/ui/Home.js';
import { PauseMenu } from '../../src/ui/PauseMenu.js';
import { PhotoMode } from '../../src/ui/PhotoMode.js';
import { discoverySystem } from '../../src/app/systems/discovery.js';
import { SystemRunner } from '../../src/app/System.js';
import { globeSystem, shellSystem } from '../../src/app/systems/shell.js';
import { PlacementDebug } from '../../src/world/props/PlacementDebug.js';
import type { Props, PlacedProp } from '../../src/world/Props.js';
import * as THREE from 'three';
import type { DebriefStats } from '../../src/game/Objectives.js';
import type { FrameState } from '../../src/app/System.js';
import { createPowerSystem } from '../../src/app/systems/power.js';
import { parseMission } from '../../src/game/Mission.js';
import titanicMission from '../../data/landmarks/titanic/mission.json';
import { MissionRouter } from '../../src/game/MissionRouter.js';
import { createPointerSystem } from '../../src/app/systems/pointer.js';
import { createInputSystem } from '../../src/app/systems/input.js';
import { createPhotoSystem } from '../../src/app/systems/photo.js';
import { createDailySystem } from '../../src/app/systems/daily.js';
import { inputGateSystem } from '../../src/app/loop.js';
import { modesSystem } from '../../src/app/systems/modes.js';
import { settingsSystem } from '../../src/app/systems/settings.js';
import { waypointsSystem } from '../../src/app/systems/waypoints.js';
import { Progress } from '../../src/game/Progress.js';

/** The same small EventTarget/DOM approach as the shell and Home focus specs. */
class Element extends EventTarget {
  children: Element[] = [];
  parentElement: Element | null = null;
  hidden = false;
  inert = false;
  disabled = false;
  open = false;
  connected = true;
  visibility = 'visible';
  layout = true;
  className = '';
  textContent = '';
  type = '';
  value = '';
  scrollTop = 0;
  htmlFor = { add() {} };
  attributes: Record<string, string> = {};
  style = { setProperty() {} };
  dataset: Record<string, string> = {};
  tabIndex: number;
  classList = {
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, on = !this.classList.contains(name)) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(' ');
      return on;
    },
    add: (name: string) => {
      this.classList.toggle(name, true);
    },
    remove: (name: string) => {
      this.classList.toggle(name, false);
    },
  };
  constructor(readonly tagName = 'DIV') {
    super();
    this.tabIndex = ['BUTTON', 'SUMMARY', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tagName)
      ? 0
      : -1;
  }
  get isConnected(): boolean {
    return this.connected && (!this.parentElement || this.parentElement.isConnected);
  }
  get childElementCount() {
    return this.children.length;
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  removeAttribute(name: string) {
    delete this.attributes[name];
  }
  after(child: Element) {
    const parent = this.parentElement!;
    child.parentElement = parent;
    parent.children.splice(parent.children.indexOf(this) + 1, 0, child);
  }
  replaceWith(child: Element) {
    const parent = this.parentElement!;
    child.parentElement = parent;
    parent.children.splice(parent.children.indexOf(this), 1, child);
    this.parentElement = null;
  }
  append(...children: Element[]) {
    for (const child of children) {
      if (child.parentElement) child.remove();
      child.connected = true;
      child.parentElement = this;
      this.children.push(child);
    }
  }
  appendChild(child: Element) {
    this.append(child);
    return child;
  }
  replaceChildren(...children: Element[]) {
    for (const child of this.children) child.remove();
    this.children = [];
    this.append(...children);
  }
  remove() {
    this.connected = false;
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((el) => el !== this);
  }
  contains(el: Element): boolean {
    return this === el || this.children.some((child) => child.contains(el));
  }
  matches(selector: string): boolean {
    if (selector === ':disabled')
      return this.disabled || !!this.parentElement?.closest('fieldset[disabled]');
    if (selector === 'fieldset[disabled]') return this.tagName === 'FIELDSET' && this.disabled;
    if (selector === 'details:not([open])') return this.tagName === 'DETAILS' && !this.open;
    if (selector.includes(','))
      return selector.split(',').some((part) => this.matches(part.trim()));
    if (selector === '[hidden]') return this.hidden;
    if (selector === '[inert]') return this.inert;
    const data = selector.match(/\[data-(\w+)="([^"]+)"\]/);
    if (data) return this.dataset[data[1]] === data[2];
    if (selector.startsWith('[tabindex]')) return this.tabIndex >= 0;
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const tag = selector.match(/^[a-z][a-z0-9]*/i)?.[0];
    return (
      !!tag &&
      this.tagName === tag.toUpperCase() &&
      (!selector.includes(':not([disabled])') || !this.disabled)
    );
  }
  closest(selector: string): Element | null {
    return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null);
  }
  querySelectorAll(selector?: string): Element[] {
    const all = this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
    if (!selector) return all;
    const parts = selector.split(' ');
    if (parts.length === 2)
      return all.filter(
        (child) => child.matches(parts[1]) && child.parentElement?.closest(parts[0]),
      );
    return all.filter((child) => child.matches(selector));
  }
  querySelector(selector: string): Element | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  getClientRects() {
    return this.layout && !this.closest('[hidden]') ? [{}] : [];
  }
  focus() {
    (document as unknown as { activeElement: Element }).activeElement = this;
  }
  blur() {
    (document as unknown as { activeElement: Element }).activeElement =
      document.body as unknown as Element;
  }
}

const html = (el: Element) => el as unknown as HTMLElement;
let body: Element;
const cleanup: Array<() => void> = [];
beforeEach(() => {
  body = new Element('BODY');
  const win = Object.assign(new EventTarget(), { clearTimeout: vi.fn() });
  // Node needs capture normalized on removal to match browser semantics.
  const remove = win.removeEventListener.bind(win);
  win.removeEventListener = (type, listener, options) =>
    remove(type, listener, typeof options === 'boolean' ? { capture: options } : options);
  vi.stubGlobal('window', win);
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('HTMLButtonElement', Element);
  vi.stubGlobal('HTMLInputElement', Element);
  vi.stubGlobal('getComputedStyle', (el: Element) => ({ visibility: el.visibility }));
  vi.stubGlobal('document', {
    body,
    documentElement: new Element('HTML'),
    activeElement: body,
    createElement: (tag: string) => new Element(tag.toUpperCase()),
    createElementNS: (_ns: string, tag: string) => new Element(tag.toUpperCase()),
    createTextNode: (text: string) => Object.assign(new Element('#TEXT'), { textContent: text }),
    exitPointerLock: vi.fn(),
  });
});
afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function element(tag = 'BUTTON', parent = body): Element {
  const el = new Element(tag);
  parent.append(el);
  return el;
}
function trap(root: Element, options?: FocusTrapOptions): FocusTrap {
  const t = new FocusTrap(html(root), options);
  cleanup.push(() => t.dispose());
  return t;
}
function press(code: string, extra: Partial<KeyboardEvent> = {}): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, {
    code: { value: code },
    key: { value: code },
    repeat: { value: false },
    shiftKey: { value: false },
    ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, { value }])),
  });
  window.dispatchEvent(event);
  return event as KeyboardEvent;
}
const active = () => document.activeElement as unknown as Element;

function overlay() {
  const root = element('DIV');
  const first = element('BUTTON', root);
  const last = element('BUTTON', root);
  const close = vi.fn(() => {
    root.hidden = true;
    owner.deactivate();
  });
  const owner = trap(root, { onEscape: close });
  return { root, first, last, close, owner };
}

describe('overlay keyboard ownership and focus return', () => {
  it('closes only the nested top overlay and consumes Escape before pause/input', () => {
    const opener = element();
    opener.focus();
    const lower = overlay();
    const upper = overlay(); // Construction order does not determine activation order.
    lower.owner.activate();
    lower.last.focus();
    upper.owner.activate();
    const pause = vi.fn();
    window.addEventListener('keydown', pause, true);
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(upper.close).toHaveBeenCalledOnce();
    expect(lower.close).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
    expect(active()).toBe(lower.last);
    // A held key cannot dismiss the newly exposed overlay.
    press('Escape', { repeat: true });
    expect(lower.close).not.toHaveBeenCalled();
    press('Escape');
    expect(lower.close).toHaveBeenCalledOnce();
    expect(active()).toBe(opener);
    expect(pause).not.toHaveBeenCalled();
  });

  it('dispatches in activation order after reopening, with one shared listener', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const earlier = overlay();
    const later = overlay();
    later.owner.activate();
    earlier.owner.activate();
    earlier.owner.activate();
    expect(add.mock.calls.filter(([name]) => name === 'keydown')).toHaveLength(1);
    press('Escape');
    expect(earlier.close).toHaveBeenCalledOnce();
    expect(later.close).not.toHaveBeenCalled();
  });

  it('contains Tab and Shift+Tab within the top overlay, including the first Tab', () => {
    const lower = overlay();
    lower.owner.activate();
    lower.first.focus();
    const upper = overlay();
    upper.owner.activate();
    expect(active()).toBe(body);
    const behind = vi.fn();
    window.addEventListener('keydown', behind, true);
    expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(active()).toBe(upper.last);
    press('Tab');
    expect(active()).toBe(upper.first);
    press('Tab', { shiftKey: true });
    expect(active()).toBe(upper.last);
    expect(behind).not.toHaveBeenCalled();
  });

  it('skips hidden/inert, disabled fieldsets, invisible controls and closed details', () => {
    const root = element('DIV');
    const hidden = element('DIV', root);
    hidden.hidden = true;
    element('BUTTON', hidden);
    const inert = element('DIV', root);
    inert.inert = true;
    element('BUTTON', inert);
    const fieldset = element('FIELDSET', root);
    fieldset.disabled = true;
    element('BUTTON', fieldset);
    element('BUTTON', root).disabled = true;
    element('BUTTON', root).visibility = 'hidden';
    element('BUTTON', root).layout = false;
    element('BUTTON', root).tabIndex = -1;
    const details = element('DETAILS', root);
    const summary = element('SUMMARY', details);
    element('BUTTON', details);
    const nestedDetails = element('DETAILS', details);
    element('SUMMARY', nestedDetails);
    const valid = element('BUTTON', root);
    const owner = trap(root, { onEscape: null });
    owner.activate();
    expect(owner.focusables()).toEqual([summary, valid]);
    press('Tab');
    expect(active()).toBe(summary);
    press('Tab');
    expect(active()).toBe(valid);
    details.open = true;
    expect(owner.focusables()).toHaveLength(4);
  });

  it('consumes Escape in a non-dismissible view and contains Tab without controls', () => {
    const lower = overlay();
    lower.owner.activate();
    const fixed = trap(element('DIV'), { onEscape: null });
    fixed.activate();
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(lower.close).not.toHaveBeenCalled();
    expect(fixed.active).toBe(true);
    expect(press('Tab').defaultPrevented).toBe(true);
    expect(active()).toBe(body);
  });

  it('keeps the original return target across repeated activation without focusing a button', () => {
    const opener = element();
    opener.focus();
    const view = overlay();
    view.owner.activate();
    expect(active()).toBe(body);
    press('Space', { repeat: true });
    expect(active()).toBe(body);
    view.first.focus();
    view.owner.activate();
    view.owner.deactivate();
    view.owner.deactivate();
    expect(active()).toBe(opener);
  });

  it('carries focus return across out-of-order removal, without disturbing the top', () => {
    const opener = element();
    opener.focus();
    const lower = overlay();
    lower.owner.activate();
    lower.first.focus();
    const middle = overlay();
    middle.owner.activate();
    middle.first.focus();
    const upper = overlay();
    upper.owner.activate();
    upper.first.focus();
    lower.close();
    middle.close();
    expect(active()).toBe(upper.first);
    press('Escape');
    expect(active()).toBe(opener);
  });

  it.each(['hidden', 'inert', 'disabled', 'disconnected', 'invisible'])(
    'does not return focus to a %s opener',
    (state) => {
      const opener = element();
      opener.focus();
      const view = overlay();
      view.owner.activate();
      if (state === 'hidden') opener.hidden = true;
      if (state === 'inert') opener.inert = true;
      if (state === 'disabled') opener.disabled = true;
      if (state === 'disconnected') opener.remove();
      if (state === 'invisible') opener.visibility = 'hidden';
      view.close();
      expect(active()).toBe(body);
    },
  );

  it('keeps listener priority across close/reopen and removes it on final disposal', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = overlay();
    view.owner.activate();
    view.owner.deactivate();
    expect(remove).not.toHaveBeenCalled();
    expect(press('Escape').defaultPrevented).toBe(false);
    view.owner.activate();
    press('Escape');
    expect(view.close).toHaveBeenCalledOnce();
    view.owner.dispose();
    view.owner.dispose();
    expect(remove).toHaveBeenCalledExactlyOnceWith('keydown', expect.any(Function), true);
    view.owner.activate();
    expect(view.owner.active).toBe(false);
  });

  it('keeps the original listener lifecycle for legacy-only callers', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const legacy = trap(element('DIV'));
    legacy.activate();
    legacy.deactivate();
    expect(remove).toHaveBeenCalledExactlyOnceWith('keydown', expect.any(Function), true);
  });

  it('keeps remaining owners working when a consumer is disposed out of order', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const lower = overlay();
    const upper = overlay();
    lower.owner.activate();
    upper.owner.activate();
    lower.owner.dispose();
    expect(remove).not.toHaveBeenCalled();
    press('Escape');
    expect(upper.close).toHaveBeenCalledOnce();
    const legacy = trap(element('DIV'));
    legacy.activate();
    upper.owner.dispose();
    expect(remove).not.toHaveBeenCalled();
    legacy.deactivate();
    expect(remove).toHaveBeenCalledExactlyOnceWith('keydown', expect.any(Function), true);
    expect(press('Tab').defaultPrevented).toBe(false);
  });

  it('retains migrated Escape priority after closing and reopening above a legacy overlay', () => {
    const view = overlay();
    const legacy = trap(element('DIV'));
    const legacyClose = vi.fn(() => legacy.deactivate());
    window.addEventListener('keydown', legacyClose, true);
    legacy.activate();
    view.owner.activate();
    view.close();
    view.root.hidden = false;
    view.owner.activate();
    press('Escape');
    expect(view.close).toHaveBeenCalledTimes(2);
    expect(legacyClose).not.toHaveBeenCalled();
    expect(legacy.active).toBe(true);
  });

  it.each([true, false])(
    'leaves Escape to an unmigrated top overlay (legacy handler registered first: %s)',
    (first) => {
      let legacy: FocusTrap;
      const handler = vi.fn((event: Event) => {
        if (!legacy.active) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        legacy.deactivate();
      });
      if (first) window.addEventListener('keydown', handler, true);
      const lower = overlay();
      lower.owner.activate();
      legacy = trap(element('DIV')); // Existing one-argument constructor remains valid.
      legacy.activate();
      if (!first) window.addEventListener('keydown', handler, true);
      press('Escape');
      expect(handler).toHaveBeenCalledOnce();
      expect(lower.close).not.toHaveBeenCalled();
      expect(legacy.active).toBe(false);
    },
  );

  it('retains legacy Tab side effects while only the top trap moves focus', () => {
    const lower = overlay();
    lower.owner.activate();
    const root = element('DIV');
    const button = element('BUTTON', root);
    const legacy = trap(root);
    legacy.activate();
    const cancelBindingCapture = vi.fn();
    window.addEventListener('keydown', cancelBindingCapture, true);
    press('Tab');
    expect(active()).toBe(button);
    expect(cancelBindingCapture).toHaveBeenCalledOnce();
  });
});

describe('migrated modal consumers', () => {
  it.each([true, false])(
    'closing Journal cosmetics does not also pause the dive (shell registered first: %s)',
    (first) => {
      vi.spyOn(Journal.prototype as unknown as { render(): void }, 'render').mockImplementation(
        () => {},
      );
      vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
      const journal = new Journal();
      cleanup.push(() => journal.dispose());
      const setAppState = vi.fn();
      const context = {
        app: { state: 'dive' },
        bus: new EventBus(),
        journal,
        discovery: { guide: journal, debrief: { isOpen: false } },
        settingsScreen: { isOpen: false },
        globe: { isOpen: false },
        photoMode: { active: false },
        setAppState,
      } as unknown as GameContext;
      cleanup.push(() => shellKeysSystem.dispose?.());
      if (first) shellKeysSystem.init?.(context);
      journal.open();
      if (!first) shellKeysSystem.init?.(context);
      expect(press('Escape').defaultPrevented).toBe(true);
      expect(journal.isOpen).toBe(false);
      expect(setAppState).not.toHaveBeenCalled();
    },
  );

  it('opens Journal without held-Space button focus, returns focus and releases its listener', () => {
    vi.spyOn(Journal.prototype as unknown as { render(): void }, 'render').mockImplementation(
      () => {},
    );
    vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const journal = new Journal();
    cleanup.push(() => journal.dispose());
    const opener = element();
    opener.focus();
    journal.open();
    expect(active()).toBe(body);
    journal.open();
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(add.mock.calls.filter(([name]) => name === 'keydown')).toHaveLength(1);
    press('Escape');
    expect(journal.isOpen).toBe(false);
    expect(active()).toBe(opener);
    journal.open();
    journal.dispose();
    expect(remove.mock.calls.filter(([name]) => name === 'keydown')).toHaveLength(1);
    expect(press('Escape').defaultPrevented).toBe(false);
    cleanup.pop();
  });

  it.each([false, true])(
    'owns Globe chooser Escape and restores focus (embedded: %s)',
    async (embedded) => {
      const proto = Globe.prototype as unknown as { initGl(): void; resize(): void };
      vi.spyOn(proto, 'initGl').mockImplementation(() => {});
      vi.spyOn(proto, 'resize').mockImplementation(() => {});
      const add = vi.spyOn(window, 'addEventListener');
      const globe = new Globe({
        config: DEFAULT_CONFIG.globe,
        tileIds: [],
        embedded,
        catalog: Promise.resolve({ sites: [], pending: [], missions: [] }),
      });
      cleanup.push(() => globe.dispose());
      await globe.catalog;
      const opener = element();
      opener.focus();
      globe.open();
      if (!embedded) expect(active()).toBe(body);
      const cluster = element('BUTTON', globe.root as unknown as Element);
      cluster.focus();
      const internal = globe as unknown as {
        chooser: Element;
        showChooser(leader: number, pins: Array<{ site: GlobeSite }>): void;
      };
      const site = { id: 'titanic', name: 'Titanic', state: 'mission' } as GlobeSite;
      internal.showChooser(0, [{ site }, { site }]);
      // Cluster selection immediately owns a concrete site, unlike generic modals.
      const items = internal.chooser.children.filter((child) => child.tagName === 'BUTTON');
      expect(active()).toBe(items[0]);
      const lon = globe.orbit.lon;
      expect(press('ArrowRight').defaultPrevented).toBe(true);
      globe.orbit.update(0.1);
      expect(globe.orbit.lon).toBeGreaterThan(lon);
      const keyup = new Event('keyup');
      Object.defineProperty(keyup, 'code', { value: 'ArrowRight' });
      window.dispatchEvent(keyup);
      const stopped = globe.orbit.lon;
      globe.orbit.update(0.1);
      expect(globe.orbit.lon).toBe(stopped);
      const distance = globe.orbit.distance;
      press('Equal');
      expect(globe.orbit.distance).toBeLessThan(distance);
      press('Tab');
      expect(active()).toBe(items[1]);
      expect(press('Escape').defaultPrevented).toBe(true);
      expect(internal.chooser.hidden).toBe(true);
      expect(globe.isOpen).toBe(true);
      expect(active()).toBe(cluster);
      const next = press('Escape');
      expect(globe.isOpen).toBe(embedded);
      expect(next.defaultPrevented).toBe(!embedded);
      if (!embedded) expect(active()).toBe(opener);
      expect(add.mock.calls.filter(([name]) => name === 'keydown')).toHaveLength(1);
      globe.dispose();
      expect(press('Escape').defaultPrevented).toBe(false);
      cleanup.pop();
    },
  );
});

const stats: DebriefStats = {
  elapsedS: 30,
  distanceM: 10,
  maxDepthM: 100,
  discoveries: [],
  newEntries: [],
};
function settings() {
  const input = new Input({ storage: null });
  const save = new Save({ config: DEFAULT_CONFIG, storage: null });
  const screen = new SettingsScreen({
    input,
    save,
    config: DEFAULT_CONFIG,
    activeTier: 'low',
    activeDetailStrength: save.get().detailStrength,
  });
  cleanup.push(() => {
    screen.dispose();
    input.dispose();
  });
  return { screen, input };
}
function journal() {
  const guide = new Journal();
  vi.spyOn(guide, 'load').mockResolvedValue();
  cleanup.push(() => guide.dispose());
  return guide;
}
function pauseMenu() {
  const pause = new PauseMenu({
    resume: () => pause.close(),
    journal: vi.fn(),
    settings: vi.fn(),
    controls: vi.fn(),
    credits: () => html(element('DIV')),
    quit: vi.fn(),
    objectives: () => [],
  });
  cleanup.push(() => pause.dispose());
  return pause;
}
function shell() {
  const setAppState = vi.fn();
  shellKeysSystem.init?.({
    app: { state: 'dive' },
    bus: new EventBus(),
    setAppState,
  } as unknown as GameContext);
  cleanup.push(() => shellKeysSystem.dispose?.());
  return setAppState;
}

describe('overlay policies across the app', () => {
  it('contains Settings keyboard focus above Home and returns to its opener after touch or Escape dismissal', () => {
    const { screen } = settings();
    const home = new Home({
      dive: vi.fn(),
      journal: vi.fn(),
      controls: vi.fn(),
      settings: () => screen.open(),
    });
    cleanup.push(() => home.dispose());
    home.show();
    const opener = (home.root as unknown as Element)
      .querySelectorAll('button')
      .find((button) => button.textContent === 'Settings')!;
    for (const closeWithTouch of [true, false]) {
      opener.focus();
      opener.dispatchEvent(new Event('click'));
      expect(screen.isOpen).toBe(true);
      for (let i = 0; i < 35; i++) {
        press('Tab', { shiftKey: i > 20 });
        expect((screen.root as unknown as Element).contains(active())).toBe(true);
      }
      if (closeWithTouch)
        (screen.root as unknown as Element)
          .querySelector('.settings-close')!
          .dispatchEvent(new Event('click'));
      else press('Escape');
      expect(screen.isOpen).toBe(false);
      expect(home.isOpen).toBe(true);
      expect(active()).toBe(opener);
    }
  });

  it('ignores the Journal pad button beneath Settings, then closes once and returns to Pause', () => {
    const pause = pauseMenu();
    pause.open();
    press('Tab');
    const pauseOpener = active();
    const guide = journal();
    guide.open();
    press('Tab');
    const journalOpener = active();
    const { screen } = settings();
    screen.open();
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, index: 0, axes: [0, -1, 0, 0], buttons }],
    });
    const input = new Input({ storage: null });
    const update = vi.fn((_a, _b, _c, _d, state) => {
      if (state.toggleGuide) guide.toggle();
    });
    const ctx = {
      discovery: { guide, update, scanner: { setObjective: vi.fn() } },
      rig: {},
    } as unknown as GameContext;
    const frame = () => {
      const f = { sampled: input.sample(), frozen: true, realSteps: 1, dt: 1 / 60 } as FrameState;
      inputGateSystem.frame!['gate.input']!(f, ctx);
      discoverySystem.frame!['scan.discovery']!(f, ctx);
      expect(f.steps).toBe(0);
      expect(f.state.throttle).toBe(0);
      input.endFrame();
    };
    buttons[14] = { pressed: true, value: 1 };
    frame();
    expect(guide.isOpen).toBe(true);
    expect(screen.isOpen).toBe(true);
    press('Escape');
    expect(active()).toBe(journalOpener);
    frame(); // A button held while Settings closes must not dismiss Journal.
    expect(guide.isOpen).toBe(true);
    buttons[14] = { pressed: false, value: 0 };
    frame();
    buttons[14] = { pressed: true, value: 1 };
    frame();
    expect(guide.isOpen).toBe(false);
    expect(pause.isOpen).toBe(true);
    expect(active()).toBe(pauseOpener);
  });

  it('keeps the approach waypoint after a live mode change and applies the switch once when the approach ends', async () => {
    const save = new Save({ config: DEFAULT_CONFIG, storage: null });
    const progress = new Progress(new ProgressSave(null));
    const objective = {
      id: 'bow',
      poiId: 'bow',
      title: 'Head to the bow',
      primary: true,
      complete: false,
      resolved: true,
    };
    const ctx = {
      config: DEFAULT_CONFIG,
      settings: save.get(),
      save,
      progress,
      daily: null,
      route: null,
      effective: resolveEffective(save.get(), 'arcade', null),
      discovery: {
        ready: Promise.resolve(),
        pois: [],
        scanner: { setConfig: vi.fn(), setObjective: vi.fn() },
      },
      sonar: { setScanState: vi.fn(), setPois: vi.fn(), setSensorRange: vi.fn() },
      sub: { setConfig: vi.fn() },
      rig: { setConfig: vi.fn() },
      power: { setConfig: vi.fn(), setEnabled: vi.fn() },
      headlights: { setPreset: vi.fn() },
      presets: { setCurrentMode: vi.fn() },
      hud: { setCurrentMode: vi.fn() },
      expose: vi.fn(),
      missionRouter: { mission: { objectives: [objective] } },
    } as unknown as GameContext;
    waypointsSystem.init!(ctx);
    modesSystem.init!(ctx);
    modesSystem.start!(ctx);
    cleanup.push(() => {
      modesSystem.dispose?.();
      waypointsSystem.dispose?.();
      ctx.waypoints.root.remove();
    });
    await ctx.discovery.ready;
    const frame = () => waypointsSystem.frame!['guide.waypoints']!({} as FrameState, ctx);
    frame();
    expect(ctx.waypoints.root.dataset.hints).toBe('true');
    const apply = vi.spyOn(ctx.waypoints, 'setVisualHints');
    save.setGameplayMode('realistic');
    frame();
    expect(ctx.waypoints.root.dataset.hints).toBe('true');
    expect(apply).not.toHaveBeenCalled();
    objective.title = 'Scan the bow';
    frame();
    expect(ctx.waypoints.root.dataset.hints).toBe('false');
    expect(apply).toHaveBeenCalledExactlyOnceWith(false);
    apply.mockClear();
    save.setGameplayOption('visualHints', true);
    frame();
    frame();
    expect(apply).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('applies reduced motion to waypoints once per edit and preserves the OS preference', () => {
    const motion = Object.assign(new EventTarget(), { matches: true });
    Object.assign(window, { matchMedia: () => motion });
    const save = new Save({ config: DEFAULT_CONFIG, storage: null });
    const ctx = {
      config: DEFAULT_CONFIG,
      settings: save.get(),
      save,
      tier: 'low',
      quality: { setting: 'low', urlForced: false },
      input: new Input({ storage: null }),
      discovery: { ready: Promise.resolve(), pois: [], scanner: {} },
      sonar: { setScanState: vi.fn(), setPois: vi.fn(), setPalette: vi.fn() },
      effective: resolveEffective(save.get(), 'arcade', null),
      route: null,
      globe: { isOpen: false },
      expose: vi.fn(),
      rig: {},
    } as unknown as GameContext;
    waypointsSystem.init!(ctx);
    settingsSystem.init!(ctx);
    cleanup.push(() => {
      settingsSystem.dispose?.();
      waypointsSystem.dispose?.();
      ctx.waypoints.root.remove();
    });
    const apply = vi.spyOn(ctx.waypoints, 'setReducedMotion');
    save.save({ reduceMotion: true });
    expect(apply).toHaveBeenCalledExactlyOnceWith(true);
    apply.mockClear();
    save.save({ reduceMotion: false });
    expect(apply).toHaveBeenCalledExactlyOnceWith(true);
    expect(ctx.rig.reduceMotion).toBe(true);
    motion.matches = false;
    motion.dispatchEvent(new Event('change'));
    expect(ctx.rig.reduceMotion).toBe(false);
    expect(ctx.waypoints.root.dataset.reduceMotion).toBe('false');
  });

  it.each(['focus', 'pointerenter'])(
    'rapid Home list previews replace stale globe %s and keep the latest card active',
    async (event) => {
      const proto = Globe.prototype as unknown as { initGl(): void; resize(): void };
      vi.spyOn(proto, 'initGl').mockImplementation(() => {});
      vi.spyOn(proto, 'resize').mockImplementation(() => {});
      const sites = ['reef', 'wreck', 'vent'].map((id, i): GlobeSite => ({
        id,
        name: id,
        state: 'tile',
        lat: i * 10,
        lon: i * 20,
        depthM: 100,
        type: 'other',
        region: '',
        summary: '',
        missionPending: false,
        tileAvailable: true,
      }));
      const globe = new Globe({
        config: DEFAULT_CONFIG.globe,
        tileIds: sites.map((s) => s.id),
        embedded: true,
        catalog: Promise.resolve({ sites, pending: [], missions: [] }),
      });
      cleanup.push(() => globe.dispose());
      await globe.catalog;
      globe.open();
      const pin = (globe.root as unknown as Element).querySelector('.globe-pin')!;
      pin.dispatchEvent(new Event(event));
      expect(globe.cardSite?.id).toBe('reef');
      for (const site of [sites[1], sites[2], sites[1]]) {
        globe.previewSite(site.id);
        expect(globe.cardSite?.id).toBe(site.id);
      }
    },
  );

  it.each([true, false])(
    'Settings closes only the top owner, independent of shell init order (%s)',
    (first) => {
      const setAppState = first ? shell() : null;
      const { screen } = settings();
      const fallback = setAppState ?? shell();
      const opener = element();
      opener.focus();
      screen.open();
      expect(active()).toBe(body); // Held Space cannot activate an opening button.
      press('Tab');
      const settingsControl = active();
      const card = new ControlsCard({ key: () => 'G', initialDevice: 'gamepad' });
      cleanup.push(() => card.dispose());
      card.open();
      const seen = vi.fn(() => card.setDevice('keyboard'));
      cleanup.push(observeKeyboard(seen)); // Observer order cannot change key ownership.
      expect(press('Escape').defaultPrevented).toBe(true);
      expect(card.device).toBe('keyboard');
      expect(seen).toHaveBeenCalledOnce();
      expect(card.isOpen).toBe(false);
      expect(screen.isOpen).toBe(true);
      expect(active()).toBe(settingsControl);
      expect(fallback).not.toHaveBeenCalled();
      press('Escape', { repeat: true });
      expect(screen.isOpen).toBe(true);
      press('Escape');
      expect(screen.isOpen).toBe(false);
      expect(active()).toBe(opener);
      expect(fallback).not.toHaveBeenCalled();
      press('Escape');
      expect(fallback).toHaveBeenCalledExactlyOnceWith('pause');
    },
  );

  it('Settings cancels capture on Tab/Escape, then reset confirmation, then closes and restores focus', () => {
    const { screen, input } = settings();
    const opener = element();
    opener.focus();
    screen.open();
    screen.showControls(true);
    const root = screen.root as unknown as Element;
    const binding = root.querySelector('[data-action="boost"]')!;
    binding.dispatchEvent(new Event('click'));
    expect(screen.capturingAction).toBe('boost');
    expect(press('Tab').defaultPrevented).toBe(true);
    expect(screen.capturingAction).toBe(null);
    expect(root.contains(active())).toBe(true);
    binding.dispatchEvent(new Event('click'));
    press('Escape');
    expect(screen.capturingAction).toBe(null);
    expect(screen.isOpen).toBe(true);
    const original = [...input.actions.find((action) => action.id === 'boost')!.keys];
    binding.dispatchEvent(new Event('click'));
    press('KeyX', { repeat: true });
    expect(input.actions.find((action) => action.id === 'boost')!.keys).toEqual(original);
    press('KeyX');
    expect(input.actions.find((action) => action.id === 'boost')!.keys).toEqual([
      'KeyX',
      ...original.slice(1),
    ]);
    const reset = root.querySelector('.settings-reset-progress')!;
    reset.dispatchEvent(new Event('click'));
    press('Escape', { repeat: true });
    expect(root.querySelector('.settings-confirm')!.hidden).toBe(false);
    press('Escape');
    expect(root.querySelector('.settings-confirm')!.hidden).toBe(true);
    expect(active()).toBe(reset);
    expect(screen.isOpen).toBe(true);
    press('Escape');
    expect(screen.isOpen).toBe(false);
    expect(active()).toBe(opener);
  });

  it('only the top briefing handles Enter, while its Escape policy returns to Home', () => {
    const begin = vi.fn();
    const cancel = vi.fn();
    const briefing = new Briefing({ onBegin: begin, onCancel: cancel });
    cleanup.push(() => briefing.dispose());
    briefing.show({
      kicker: 'Dive',
      title: 'Site',
      summary: '',
      meta: [],
      facts: [],
      hazards: [],
      objectives: [],
    });
    const { screen } = settings();
    screen.open();
    press('Enter');
    expect(begin).not.toHaveBeenCalled();
    expect(briefing.isOpen).toBe(true);
    press('Escape');
    expect(screen.isOpen).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
    press('Escape');
    expect(briefing.isOpen).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('mission debrief Escape keeps exploring; Journal closes first and an aborted mission remains a decision point', async () => {
    const guide = journal();
    const bus = new EventBus();
    const router = new MissionRouter({
      config: DEFAULT_CONFIG,
      bus,
      meta: { id: 'reef' } as GameContext['meta'],
      route: {
        missionId: 'reef',
        tileId: 'reef',
        landmarkId: 'reef',
        skipBriefing: true,
        def: {
          version: 1,
          id: 'reef',
          tile: 'reef',
          landmark: 'reef',
          title: 'Reef',
          spawn: { lat: 0, lon: 0, depth_m: 5, heading_deg: 0 },
          briefing: { summary: '', facts: [], hazards: [] },
          objectives: [],
          completion: 'all_primary',
        },
      },
      discovery: {
        ready: Promise.resolve(),
        pois: [],
        guide,
        stats: { snapshot: (extra) => ({ ...stats, ...extra }) },
      },
    });
    cleanup.push(() => router.dispose());
    await Promise.resolve();
    const fallback = shell();
    expect(router.endDive()).toBe(true);
    const debrief = router.debrief!;
    press('Tab');
    const control = active();
    guide.open();
    press('Escape');
    expect(guide.isOpen).toBe(false);
    expect(router.debriefOpen).toBe(true);
    expect(active()).toBe(control);
    press('Escape');
    expect(router.debriefOpen).toBe(false);
    expect(router.mission.diving).toBe(true);
    bus.emit('sub:emergencyBlow', { depth: 200, lockSeconds: 0, cause: 'power' });
    router.update(0, 0, { x: 0, y: 0, z: 0 }, 0, { emergencyBlow: false, depth: 5 });
    expect(debrief.isOpen).toBe(true);
    expect(router.mission.canResume).toBe(false);
    guide.open();
    press('Escape');
    expect(guide.isOpen).toBe(false);
    expect(debrief.isOpen).toBe(true);
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(debrief.isOpen).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('power exhaustion opens a non-dismissible free-dive debrief, with Journal and Settings above it', () => {
    const guide = journal();
    const debrief = new Debrief();
    cleanup.push(() => debrief.dispose());
    const save = new Save({ config: DEFAULT_CONFIG, storage: null });
    save.setGameplayMode('realistic');
    const ctx = {
      config: DEFAULT_CONFIG,
      settings: save.get(),
      save,
      route: null,
      bus: new EventBus(),
      expose: vi.fn(),
      discovery: {
        ready: Promise.resolve(),
        guide,
        debrief,
        showDebrief: (extra: Partial<DebriefStats>, escape: null) =>
          debrief.show({ ...stats, ...extra }, undefined, undefined, escape),
      },
      effective: resolveEffective(save.get(), save.get().gameplayMode, null),
      sub: { simSpeed: 1, startEmergencyAscent: vi.fn() },
      headlights: { on: false },
      sonar: { visible: false },
    } as unknown as GameContext;
    const system = createPowerSystem();
    system.init?.(ctx);
    cleanup.push(() => system.dispose?.());
    const fallback = shell();
    ctx.power.setLevels(0, 0);
    system.frame!['sim.power']!(
      { steps: 1, fixedDt: 1 / 60, state: { throttle: 0, ballast: 0 } } as FrameState,
      ctx,
    );
    system.frame!['events.power']!({ sub: { emergencyBlow: false } } as FrameState, ctx);
    expect(debrief.last?.title).toBe('Dive aborted');
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(debrief.isOpen).toBe(true);
    guide.open();
    press('Tab');
    const opener = active();
    const { screen } = settings();
    screen.open();
    press('Escape');
    expect(screen.isOpen).toBe(false);
    expect(guide.isOpen).toBe(true);
    expect(active()).toBe(opener);
    press('Escape');
    expect(guide.isOpen).toBe(false);
    expect(debrief.isOpen).toBe(true);
    press('Escape');
    expect(debrief.isOpen).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
    debrief.hide();
    debrief.show(stats);
    press('Escape');
    expect(debrief.isOpen).toBe(false); // A later ordinary summary resets the per-show policy.
  });

  it('Home site Escape returns to its opener, and Pause steps back before resuming', () => {
    const home = new Home({
      dive: vi.fn(),
      journal: vi.fn(),
      settings: vi.fn(),
      controls: vi.fn(),
    });
    cleanup.push(() => home.dispose());
    home.show();
    const root = home.root as unknown as Element;
    const sites =
      root.querySelector('.home-sites-button') ??
      root.querySelectorAll('button').find((button) => button.textContent === 'Dive sites')!;
    home.showSites(false, sites as unknown as HTMLButtonElement);
    const { screen } = settings();
    screen.open();
    press('Escape');
    expect(home.sitesOpen).toBe(true);
    press('Escape');
    expect(home.sitesOpen).toBe(false);
    expect(active()).toBe(sites);
    home.hide();
    const pause = pauseMenu();
    pause.open();
    pause.showView('objectives');
    press('Escape');
    expect(pause.isOpen).toBe(true);
    expect((pause.root as unknown as Element).querySelector('.pause-actions')!.hidden).toBe(false);
    press('Escape');
    expect(pause.isOpen).toBe(false);
  });

  it.each(['Settings', 'Briefing', 'Debrief', 'Journal', 'Controls', 'Pause', 'Photo'] as const)(
    '%s exposes every visible control to forward/reverse Tab and returns focus on close',
    (kind) => {
      const opener = element();
      opener.focus();
      let root: HTMLElement;
      let open: () => void;
      let close: () => void;
      if (kind === 'Settings') {
        const { screen } = settings();
        root = screen.root;
        open = () => screen.open();
        close = () => screen.close();
      } else if (kind === 'Briefing') {
        const ui = new Briefing({ onBegin: vi.fn(), onCancel: vi.fn() });
        cleanup.push(() => ui.dispose());
        root = ui.root;
        open = () =>
          ui.show({
            kicker: '',
            title: '',
            summary: '',
            meta: [],
            facts: [],
            hazards: [],
            objectives: [],
          });
        close = () => ui.hide();
      } else if (kind === 'Debrief') {
        const ui = new Debrief();
        cleanup.push(() => ui.dispose());
        root = ui.root;
        open = () => ui.show(stats);
        close = () => ui.hide();
      } else if (kind === 'Journal') {
        const ui = journal();
        root = ui.root;
        open = () => ui.open();
        close = () => ui.close();
      } else if (kind === 'Controls') {
        const ui = new ControlsCard({
          key: () => 'G',
          initialDevice: 'keyboard',
          onRebind: vi.fn(),
        });
        cleanup.push(() => ui.dispose());
        root = ui.root;
        open = () => ui.open();
        close = () => ui.close();
      } else if (kind === 'Pause') {
        const ui = pauseMenu();
        root = ui.root;
        open = () => ui.open();
        close = () => ui.close();
      } else {
        const ui = new PhotoMode(vi.fn(), vi.fn(), vi.fn());
        cleanup.push(() => ui.dispose());
        root = ui.root;
        open = () => ui.setActive(true);
        close = () => ui.setActive(false);
      }
      open();
      const controls = (root as unknown as Element)
        .querySelectorAll()
        .filter((el) => el.tabIndex >= 0 && !el.closest('[hidden], [inert]'));
      expect(controls.length).toBeGreaterThan(0);
      const visited = new Set<Element>();
      for (let i = 0; i < controls.length; i++) {
        press('Tab');
        visited.add(active());
      }
      expect(visited).toEqual(new Set(controls));
      const last = active();
      press('Tab');
      press('Tab', { shiftKey: true });
      expect(active()).toBe(last);
      close();
      expect(active()).toBe(opener);
    },
  );
});

describe('overlay host teardown', () => {
  it('three Home/dive/Home shell lifetimes release input, modal ownership and Daily/photo timers', async () => {
    vi.useFakeTimers();
    try {
      const doc = Object.assign(new EventTarget(), document);
      vi.stubGlobal('document', doc);
      Object.assign(window, {
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        matchMedia: () => ({ matches: false }),
      });
      const proto = Globe.prototype as unknown as { initGl(): void; resize(): void };
      vi.spyOn(proto, 'initGl').mockImplementation(() => {});
      vi.spyOn(proto, 'resize').mockImplementation(() => {});
      vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      for (let i = 0; i < 3; i++) {
        const guide = new Journal();
        const ctx = {
          config: DEFAULT_CONFIG,
          bus: new EventBus(),
          index: [],
          meta: { id: 'reef' },
          route: null,
          save: new Save({ config: DEFAULT_CONFIG, storage: null }),
          progress: new SavedProgress(new ProgressSave(null)),
          dailySave: new DailySave(null),
          daily: null,
          app: { state: 'home', lastSite: null },
          params: new URLSearchParams(),
          expose: vi.fn(),
          journal: guide,
          discoveries: { isDiscovered: () => false },
          discovery: { guide, debrief: { isOpen: false } },
          rig: { exitPhotoMode: vi.fn() },
          canvas: html(element('CANVAS')),
        } as unknown as GameContext;
        const runner = new SystemRunner(ctx);
        cleanup.push(() => {
          runner.dispose();
          guide.dispose();
        });
        runner.init([
          shellSystem,
          globeSystem,
          createInputSystem(),
          createDailySystem(),
          createPhotoSystem(),
          shellKeysSystem,
        ]);
        await Promise.all([ctx.globe.catalog, ctx.homeGlobe.catalog]);
        expect(ctx.home.isOpen).toBe(true);
        ctx.home.showSites(false);
        press('Escape');
        expect(ctx.home.sitesOpen).toBe(false);
        ctx.setAppState('dive');
        ctx.photoMode.setActive(true);
        ctx.photoMode.toast('Saved to Journal');
        ctx.photoMode.shutter();
        expect(vi.getTimerCount()).toBe(3);
        press('Escape');
        expect(ctx.photoMode.active).toBe(false);
        expect(ctx.app.state).toBe('dive');
        press('Escape');
        expect(ctx.pause.isOpen).toBe(true);
        ctx.setAppState('home');
        expect(ctx.home.isOpen).toBe(true);
        runner.dispose();
        guide.dispose();
        expect(vi.getTimerCount()).toBe(0);
        expect(press('Escape').defaultPrevented).toBe(false);
        expect(body.querySelectorAll('.home-screen')).toHaveLength(0);
        expect(body.querySelectorAll('.photo-mode')).toHaveLength(0);
        const before = { ...ctx.input.state };
        press('KeyW');
        expect(ctx.input.sample()).toEqual(before);
        expect(remove.mock.calls).toHaveLength(add.mock.calls.length);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['settled', 'keyboard', 'pointer'] as const)(
    'pointer teardown releases controls, DOM and pending locks (%s)',
    async (pending) => {
      const doc = Object.assign(new EventTarget(), document);
      const remove = doc.removeEventListener.bind(doc);
      doc.removeEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ) => remove(type, listener, typeof options === 'boolean' ? { capture: options } : options);
      vi.stubGlobal('document', doc);
      let resolve!: () => void;
      const locked = new Promise<void>((done) => {
        resolve = done;
      });
      const unlock = vi.fn();
      vi.stubGlobal('navigator', { keyboard: { lock: vi.fn(() => locked), unlock } });
      const canvas = html(element('CANVAS')) as HTMLCanvasElement;
      let finishPointer!: () => void;
      const pointerRequest = new Promise<void>((done) => {
        finishPointer = done;
      });
      canvas.requestPointerLock = vi.fn(() => pointerRequest);
      Object.assign(doc, { fullscreenElement: canvas, pointerLockElement: canvas });
      const input = new Input({ storage: null });
      input.setMouseLook(true);
      const ctx = {
        canvas,
        input,
        app: { state: 'dive' },
        pause: { isOpen: false },
        settingsScreen: { isOpen: false },
        globe: { isOpen: false },
        discovery: { guide: { isOpen: false }, debrief: { isOpen: false } },
        photoMode: { active: false },
        setAppState: vi.fn(),
      } as unknown as GameContext;
      const pointer = createPointerSystem();
      cleanup.push(() => pointer.dispose?.());
      pointer.init?.(ctx);
      expect(body.querySelectorAll('.d3-pointer-look-hint')).toHaveLength(1);
      expect(body.querySelectorAll('.hud-ctrl-tip')).toHaveLength(1);
      const lock = ctx.keyboard.lock();
      if (pending !== 'keyboard') {
        resolve();
        await lock;
      }
      if (pending === 'pointer') {
        Object.assign(doc, { pointerLockElement: null });
        input.setMouseLook(false);
        input.setPointerLookPreference(true);
        pointer.frame!['gate.pointer']!({ frozen: false } as FrameState, ctx);
        const down = new Event('mousedown', { cancelable: true });
        Object.defineProperty(down, 'button', { value: 0 });
        canvas.dispatchEvent(down);
        expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
      }
      pointer.dispose?.();
      expect(unlock).toHaveBeenCalled();
      expect(doc.exitPointerLock).toHaveBeenCalledTimes(pending === 'pointer' ? 0 : 1);
      expect(input.pointerLookActive).toBe(false);
      expect(body.querySelectorAll('.d3-pointer-look-hint')).toHaveLength(0);
      expect(body.querySelectorAll('.hud-ctrl-tip')).toHaveLength(0);
      unlock.mockClear();
      resolve();
      await lock;
      if (pending === 'keyboard') expect(unlock).toHaveBeenCalledOnce();
      else expect(unlock).not.toHaveBeenCalled();
      if (pending === 'pointer') {
        Object.assign(doc, { pointerLockElement: canvas });
        finishPointer();
        await pointerRequest;
        expect(doc.exitPointerLock).toHaveBeenCalledOnce();
      }
      const setMouseLook = vi.spyOn(input, 'setMouseLook');
      doc.dispatchEvent(new Event('pointerlockchange'));
      expect(setMouseLook).not.toHaveBeenCalled();
      press('ControlLeft');
      expect(ctx.setAppState).not.toHaveBeenCalled();
      pointer.dispose?.();
    },
  );

  it('disposes both hosted Globes and their chooser ownership', async () => {
    const proto = Globe.prototype as unknown as { initGl(): void; resize(): void };
    vi.spyOn(proto, 'initGl').mockImplementation(() => {});
    vi.spyOn(proto, 'resize').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
    const ctx = {
      config: DEFAULT_CONFIG,
      bus: new EventBus(),
      index: [],
      contentLandmark: 'reef',
      app: { state: 'dive' },
      params: new URLSearchParams(),
      home: { globeSlot: html(element('DIV')) },
      homeSites: { setPending: vi.fn(), highlightSite: vi.fn() },
      missionSelect: { setPending: vi.fn(), setGlobeHandler: vi.fn() },
      journal: { setSpecies: vi.fn() },
      discovery: { guide: { setSpecies: vi.fn() } },
      expose: vi.fn(),
    } as unknown as GameContext;
    globeSystem.init?.(ctx);
    cleanup.push(() => globeSystem.dispose?.());
    await Promise.all([ctx.globe.catalog, ctx.homeGlobe.catalog]);
    const dispose = vi.spyOn(Globe.prototype, 'dispose');
    ctx.globe.open();
    ctx.homeGlobe.open();
    const internal = ctx.homeGlobe as unknown as {
      showChooser(leader: number, pins: Array<{ site: GlobeSite }>): void;
    };
    const site = { id: 'reef', name: 'Reef', state: 'mission' } as GlobeSite;
    internal.showChooser(0, [{ site }, { site }]);
    globeSystem.dispose?.();
    globeSystem.dispose?.();
    expect(dispose).toHaveBeenCalledTimes(2);
    for (const globe of [ctx.globe, ctx.homeGlobe]) {
      expect(globe.isOpen).toBe(false);
      expect(globe.root.isConnected).toBe(false);
      globe.open();
      expect(globe.isOpen).toBe(false);
    }
    expect(press('Escape').defaultPrevented).toBe(false);
  });

  it('does not rebuild a disposed Globe when its catalogue resolves later', async () => {
    let resolve!: (catalog: Awaited<Globe['catalog']>) => void;
    const catalog = new Promise<Awaited<Globe['catalog']>>((done) => {
      resolve = done;
    });
    const globe = new Globe({ config: DEFAULT_CONFIG.globe, tileIds: [], catalog });
    cleanup.push(() => globe.dispose());
    globe.dispose();
    resolve({
      sites: [{ id: 'reef', name: 'Reef', state: 'mission', lat: 0, lon: 0 } as GlobeSite],
      pending: [],
      missions: [],
    });
    await catalog;
    expect(globe.pinCount).toBe(0);
    expect(globe.root.isConnected).toBe(false);
    expect(press('Escape').defaultPrevented).toBe(false);
  });

  it('selected prop editing yields Escape to Settings and releases its keyboard owner on disposal', () => {
    const panel = element('DIV');
    for (const [tag, className] of [
      ['UL', 'props-debug-list'],
      ['PRE', 'props-debug-json'],
      ['BUTTON', 'props-debug-copy'],
      ['SPAN', 'props-debug-status'],
    ]) {
      element(tag, panel).className = className;
    }
    vi.spyOn(document, 'createElement').mockImplementationOnce(
      () => panel as unknown as HTMLDivElement,
    );
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const root = new THREE.Group();
    const prop = { root, def: { id: 'reef', model: '', raw: {} } } as PlacedProp;
    const debug = new PlacementDebug(
      { placed: [prop] } as Props,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      html(element('CANVAS')) as HTMLCanvasElement,
      DEFAULT_CONFIG.props,
    );
    cleanup.push(() => debug.dispose());
    const fallback = shell();
    debug.select(prop);
    const { screen } = settings();
    screen.open();
    press('Escape');
    expect(screen.isOpen).toBe(false);
    expect(panel.querySelector('li')!.classList.contains('selected')).toBe(true);
    press('Escape');
    expect(panel.querySelector('li')!.classList.contains('selected')).toBe(false);
    expect(fallback).not.toHaveBeenCalled();
    debug.select(prop);
    debug.dispose();
    expect(panel.isConnected).toBe(false);
    press('Escape');
    expect(fallback).toHaveBeenCalledExactlyOnceWith('pause');
  });
});

it('Discovery host disposal releases Journal/debrief ownership even with both open', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
  vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
  const ctx = {
    bus: new EventBus(),
    config: DEFAULT_CONFIG,
    effective: resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null),
    meta: { id: 'reef' },
    terrain: { sampleHeight: () => -100 },
    contentLandmark: 'reef',
    params: new URLSearchParams(),
    expose: vi.fn(),
  } as unknown as GameContext;
  discoverySystem.init?.(ctx);
  cleanup.push(() => discoverySystem.dispose?.());
  await ctx.discovery.ready;
  ctx.discovery.showDebrief();
  ctx.discovery.guide.open();
  discoverySystem.dispose?.();
  discoverySystem.dispose?.();
  expect(ctx.discovery.guide.isOpen).toBe(false);
  expect(ctx.discovery.debrief.isOpen).toBe(false);
  expect(ctx.discovery.guide.root.isConnected).toBe(false);
  expect(ctx.discovery.debrief.root.isConnected).toBe(false);
  expect(press('Escape').defaultPrevented).toBe(false);
});

it('Settings keyboard toggle retains typing and repeat guards in the shared dispatcher', () => {
  const { screen, input } = settings();
  input.actions.push({ id: 'toggleSettings', label: 'Settings', category: 'View', keys: ['KeyO'] });
  const fallback = shell();
  press('KeyO', { repeat: true });
  expect(screen.isOpen).toBe(false);
  press('KeyO', { target: html(element('INPUT')) });
  expect(screen.isOpen).toBe(false);
  expect(press('KeyO').defaultPrevented).toBe(true);
  expect(screen.isOpen).toBe(true);
  press('KeyO', { repeat: true });
  expect(screen.isOpen).toBe(true);
  press('KeyO');
  expect(screen.isOpen).toBe(false);
  expect(fallback).not.toHaveBeenCalled();
});

it.each([false, true])(
  'MissionRouter disposal cancels pending discovery/start callbacks (skip briefing: %s)',
  async (skipBriefing) => {
    let resolve!: () => void;
    const ready = new Promise<void>((done) => {
      resolve = done;
    });
    const applyStart = vi.fn();
    const def = parseMission(titanicMission, 'titanic')!;
    const router = new MissionRouter({
      config: DEFAULT_CONFIG,
      bus: new EventBus(),
      meta: { id: 'titanic' } as GameContext['meta'],
      applyStart,
      route: { missionId: def.id, tileId: def.tile, landmarkId: def.landmark, skipBriefing, def },
      discovery: {
        ready,
        pois: [],
        guide: { isOpen: false, open: vi.fn() },
        stats: { snapshot: () => stats },
      },
    });
    cleanup.push(() => router.dispose());
    const initialState = router.mission.state;
    router.begin();
    router.dispose();
    resolve();
    await ready;
    expect(applyStart).not.toHaveBeenCalled();
    expect(router.mission.state).toBe(initialState);
    expect(router.briefing?.isOpen ?? false).toBe(false);
    expect(press('Escape').defaultPrevented).toBe(false);
  },
);

it('shell host teardown releases Home, Pause, both Globes and shell fallback together', async () => {
  const proto = Globe.prototype as unknown as { initGl(): void; resize(): void };
  vi.spyOn(proto, 'initGl').mockImplementation(() => {});
  vi.spyOn(proto, 'resize').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
  const ctx = {
    config: DEFAULT_CONFIG,
    bus: new EventBus(),
    index: [],
    contentLandmark: 'reef',
    meta: { id: 'reef' },
    route: null,
    save: new Save({ config: DEFAULT_CONFIG, storage: null }),
    app: { state: 'home', lastSite: null },
    controlsCard: { device: 'keyboard' },
    params: new URLSearchParams(),
    expose: vi.fn(),
    journal: { open: vi.fn(), setSpecies: vi.fn() },
    discoveries: { isDiscovered: () => false },
    discovery: {
      guide: { open: vi.fn(), setSpecies: vi.fn() },
      store: { isDiscovered: () => false },
    },
  } as unknown as GameContext;
  const runner = new SystemRunner(ctx);
  cleanup.push(() => runner.dispose());
  runner.init([shellSystem, globeSystem, shellKeysSystem]);
  await Promise.all([ctx.globe.catalog, ctx.homeGlobe.catalog]);
  expect(ctx.home.isOpen).toBe(true);
  ctx.setAppState('pause');
  expect(ctx.pause.isOpen).toBe(true);
  press('Escape');
  expect(ctx.app.state).toBe('dive');
  ctx.globe.open();
  ctx.homeGlobe.open();
  runner.dispose();
  runner.dispose();
  for (const ui of [ctx.home, ctx.pause, ctx.globe, ctx.homeGlobe]) {
    expect(ui.isOpen).toBe(false);
    expect(ui.root.isConnected).toBe(false);
  }
  expect(press('Escape').defaultPrevented).toBe(false);
});
