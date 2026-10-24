import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { GameContext } from '../../src/app/context.js';
import { shellKeysSystem } from '../../src/app/systems/shell.js';
import { FocusTrap, observeKeyboard, type FocusTrapOptions } from '../../src/ui/FocusTrap.js';
import { Globe } from '../../src/ui/Globe.js';
import type { GlobeSite } from '../../src/ui/GlobeModel.js';
import { SettingsScreen } from '../../src/ui/Settings.js';
import { Save, ProgressSave, defaultSettings, SETTINGS_STORAGE_KEY } from '../../src/core/Save.js';
import { Progress as SavedProgress } from '../../src/game/Progress.js';
import { DailySave } from '../../src/game/DailySave.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Input } from '../../src/core/Input.js';
import { Briefing } from '../../src/ui/Briefing.js';
import { Debrief } from '../../src/ui/Debrief.js';
import { Journal } from '../../src/ui/Journal.js';
import { ControlsCard } from '../../src/ui/ControlsCard.js';
import { Home } from '../../src/ui/Home.js';
import { SubScreen } from '../../src/ui/SubScreen.js';
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
import { missionSystem } from '../../src/app/systems/mission.js';
import { startingReserves } from '../../src/game/Power.js';
import {
  loadMissionSummaries,
  parseMission,
  type ObjectiveStatus,
} from '../../src/game/Mission.js';
import { MissionSelect } from '../../src/ui/MissionSelect.js';
import landmarkIndex from '../../data/landmarks/index.json';
import titanicMission from '../../data/landmarks/titanic/mission.json';
import { MissionRouter, pickNavTarget } from '../../src/game/MissionRouter.js';
import { createPointerSystem } from '../../src/app/systems/pointer.js';
import { createInputSystem } from '../../src/app/systems/input.js';
import { createControlsSystem } from '../../src/app/systems/controls.js';
import { createPhotoSystem } from '../../src/app/systems/photo.js';
import { sonarControlsSystem } from '../../src/app/systems/sonar.js';
import { createDailySystem } from '../../src/app/systems/daily.js';
import { inputGateSystem, startLoop } from '../../src/app/loop.js';
import { modesSystem } from '../../src/app/systems/modes.js';
import { settingsSystem } from '../../src/app/systems/settings.js';
import { waypointsSystem } from '../../src/app/systems/waypoints.js';
import { Progress, requiredHull } from '../../src/game/Progress.js';
import { makeSyntheticTile } from './helpers.js';
import { PROGRESS_STORAGE_KEY } from '../../src/core/Save.js';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { buildJournalSite } from '../../src/game/JournalData.js';
import { ObjectivesPanel } from '../../src/ui/ObjectivesPanel.js';
import { hudSystem } from '../../src/app/systems/hud.js';
import { createHomeSystems } from '../../src/app/homeStartup.js';

vi.mock('three', async (original) => {
  const actual = await original<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(function (options?: THREE.WebGLRendererParameters) {
      return new actual.WebGLRenderer(options);
    }),
  };
});

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
  title = '';
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
  get firstElementChild() {
    return this.children[0] ?? null;
  }
  set innerHTML(markup: string) {
    // Static SVG roots are enough to exercise the touch guide's DOM lifecycle.
    if (markup.trim().startsWith('<svg')) this.replaceChildren(new Element('SVG'));
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
  prepend(child: Element) {
    this.append(child);
    this.children.unshift(this.children.pop()!);
  }
  setPointerCapture() {}
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
  getContext() {
    return null;
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
    querySelector: (selector: string) => body.querySelector(selector),
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

it('compact shell site rows keep catalog, Tab and activation order while retaining reward labels', async () => {
  // Guard row omissions/reordering and lost summaries or progress after compacting the picker.
  const docs = import.meta.glob('../../data/landmarks/*/mission.json', {
    eager: true,
    import: 'default',
  });
  const files: Record<string, unknown> = { '/data/landmarks/index.json': landmarkIndex };
  for (const [path, doc] of Object.entries(docs)) files[path.replace('../..', '')] = doc;
  vi.stubGlobal('fetch', async (url: string) => ({
    ok: url in files,
    text: async () => JSON.stringify(files[url]),
  }));
  const summaries = await loadMissionSummaries();
  const select = vi.fn();
  const preview = vi.fn();
  const picker = new MissionSelect([], {
    presentation: 'shell',
    onSelectMission: select,
    onSiteFocus: preview,
    completion: (_id, pois) => `0/${pois.length} logged`,
  });
  cleanup.push(() => picker.dispose());
  picker.setProgress(new Progress(new ProgressSave(null)));
  picker.setMissions(summaries);
  const root = picker.root as unknown as Element;
  const buttons = root.querySelectorAll('.is-mission');
  expect(buttons.map((button) => button.dataset.mission)).toEqual(landmarkIndex.landmarks);
  const owner = trap(root);
  owner.activate();
  expect(owner.focusables()).toEqual(buttons);
  for (const [index, button] of buttons.entries()) {
    press('Tab');
    expect(active()).toBe(button);
    expect(button.querySelector('.mission-item-name')?.textContent).toBe(summaries[index].title);
    expect(button.querySelector('.mission-item-summary')).toBeNull();
    expect(button.title).toBe(summaries[index].summary);
    expect(button.querySelector('.mission-stars')?.getAttribute('aria-label')).toBe(
      'Best dive: 0 of 3 stars',
    );
    button.dispatchEvent(new Event('focus'));
    expect(preview).toHaveBeenLastCalledWith(summaries[index].id);
    // Pointer/touch and native keyboard activation share the same button handler.
    button.dispatchEvent(new Event('click'));
    expect(select).toHaveBeenLastCalledWith(summaries[index].id);
  }
  press('Tab');
  expect(active()).toBe(buttons[0]);
  press('Tab', { shiftKey: true });
  expect(active()).toBe(buttons.at(-1));
  // Flush the real content fetches that fill the compact metadata/progress labels.
  await vi.waitFor(() => {
    for (const [index, button] of buttons.entries()) {
      const doc = files[`/data/landmarks/${summaries[index].id}/mission.json`] as {
        objectives: unknown[];
      };
      const depth = summaries[index].depthM!;
      expect(button.querySelector('.mission-item-meta')?.textContent).toBe(
        `${Math.round(depth).toLocaleString('en-US')} m · Class ${requiredHull(depth).id} hull`,
      );
      expect(button.querySelector('.mission-item-progress')?.textContent).toBe(
        `0/${doc.objectives.length} logged`,
      );
    }
  });
});

it('keeps fresh, formerly locked and finished sites in authored order across progress refreshes', async () => {
  // All sites now fit their hull automatically; old unlock thresholds must not reorder or disable rows.
  const ids = ['deep', 'unknown', 'shallow'];
  const files: Record<string, unknown> = {
    '/data/landmarks/index.json': { version: 1, landmarks: ids },
  };
  for (const [index, id] of ids.entries()) {
    files[`/data/landmarks/${id}/mission.json`] = {
      ...titanicMission,
      tile: id,
      hull_class: 'B',
      briefing: { ...titanicMission.briefing, depth_m: [10931, undefined, 125][index] },
    };
  }
  vi.stubGlobal('fetch', async (url: string) => ({
    ok: url in files,
    text: async () => JSON.stringify(files[url]),
  }));
  const summaries = await loadMissionSummaries();
  const progress = new Progress(new ProgressSave(null));
  const select = vi.fn();
  const picker = new MissionSelect(
    ids.map((id) => ({ id })),
    {
      presentation: 'shell',
      onSelectMission: select,
      completion: (id, pois) => `${id === 'deep' ? pois.length : 0}/${pois.length} logged`,
    },
  );
  cleanup.push(() => picker.dispose());
  picker.setMissions(summaries);
  const root = picker.root as unknown as Element;
  for (const finished of [false, true]) {
    if (finished) progress.finish('deep', [{ primary: true, complete: true }]);
    picker.setProgress(progress);
    const buttons = root.querySelectorAll('.is-mission');
    expect(buttons.map((b) => b.dataset.mission)).toEqual(ids);
    expect(buttons.every((b) => !b.disabled)).toBe(true);
    expect(progress.canDive(10931)).toBe(true);
    for (const button of buttons) button.dispatchEvent(new Event('click'));
    expect(select.mock.calls.slice(-3).map(([id]) => id)).toEqual(ids);
    await vi.waitFor(() => {
      expect(buttons.map((b) => b.querySelector('.mission-item-meta')!.textContent)).toEqual([
        '10,931 m · Class C hull',
        'Class B hull',
        '125 m · Class A hull',
      ]);
      expect(buttons[0].querySelector('.mission-stars')!.getAttribute('aria-label')).toBe(
        `Best dive: ${finished ? 2 : 0} of 3 stars`,
      );
      expect(buttons[0].querySelector('.mission-item-progress')!.textContent).toBe(
        `${titanicMission.objectives.length}/${titanicMission.objectives.length} logged`,
      );
    });
  }
});

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
  it.each(['keyboard', 'touch'] as const)(
    '%s Pause/Resume dismisses simultaneous guidance and rebuilds the current card',
    async (device) => {
      vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      document.documentElement.classList.toggle('is-touch', device === 'touch');
      const ctx = {
        bus: new EventBus(),
        config: DEFAULT_CONFIG,
        effective: resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null),
        meta: makeSyntheticTile().meta,
        terrain: { sampleHeight: () => -100 },
        contentLandmark: 'reef',
        params: new URLSearchParams(),
        sub: {},
        rig: {},
        input: { primaryKeyLabel: () => 'G' },
        expose: vi.fn(),
        app: { state: 'dive' },
      } as unknown as GameContext;
      discoverySystem.init?.(ctx);
      cleanup.push(() => discoverySystem.dispose?.());
      await ctx.discovery.ready;
      const pause = new PauseMenu({
        resume: () => ctx.setAppState('dive'),
        controls: vi.fn(),
        credits: () => html(new Element()),
        objectives: () => [],
        journal: vi.fn(),
        subScreen: vi.fn(),
        settings: vi.fn(),
        quit: vi.fn(),
      });
      cleanup.push(() => pause.dispose());
      ctx.setAppState = (state) => {
        ctx.app.state = state;
        if (state === 'pause') pause.open();
        else pause.close();
        ctx.bus.emit('app:state', { state });
      };
      shellKeysSystem.init?.(ctx);
      cleanup.push(() => shellKeysSystem.dispose?.());
      const slot = ctx.guidance;
      slot.offer('objective', 'objective', {
        kicker: 'OBJECTIVE',
        text: 'Old objective',
        tone: 'dim',
      });
      ctx.discovery.overlay.showComplete('Bow result', true, { scan: 'G', guide: 'J' });
      slot.offer('warning', 'urgent', { kicker: 'WARNING', text: 'Hazard', tone: 'alert' });
      if (device === 'keyboard') press('Escape');
      else ctx.setAppState('pause'); // The touch Pause callback uses this same shell entry.
      expect(pause.isOpen).toBe(true);
      expect(slot.visible).toBe(false);
      const frame = (frozen: boolean) =>
        discoverySystem.frame!['scan.discovery']!(
          {
            steps: 0,
            fixedDt: 1 / 60,
            dt: 1 / 60,
            clockDt: 0,
            frozen,
            state: {},
            sampled: {},
            pilotPosition: new THREE.Vector3(),
            pilotForward: new THREE.Vector3(0, 0, -1),
          } as FrameState,
          ctx,
        );
      frame(true);
      expect(slot.visible).toBe(false);
      press('Escape');
      expect(ctx.app.state).toBe('dive');
      frame(false);
      expect(slot.visible).toBe(false);
      slot.offer('objective', 'objective', {
        kicker: 'OBJECTIVE',
        text: 'Next target',
        tone: 'dim',
      });
      expect(slot.kind).toBe('objective');
      expect(slot.showsName('Next target')).toBe(true);
      expect(body.querySelectorAll('.guidance-slot')).toHaveLength(1);
    },
  );

  it.each([
    [
      'legacy RP',
      JSON.stringify({ version: 0, rp: 60, cosmetics: { paint: 'blue' } }),
      'blue',
      false,
    ],
    [
      'legacy stars',
      JSON.stringify({ version: 1, ratings: { titanic: 3 }, cosmetics: { paint: 'orange' } }),
      'orange',
      false,
    ],
    [
      'current grants',
      JSON.stringify({ version: 2, cosmeticGrants: ['paint:blue'], cosmetics: { paint: 'blue' } }),
      'blue',
      false,
    ],
    [
      'damaged fields',
      JSON.stringify({
        version: 2,
        ratings: [],
        awarded: [null],
        cosmetics: { paint: '__proto__' },
      }),
      'stock',
      false,
    ],
    ['broken JSON', '{broken', 'stock', false],
    [
      'future version',
      JSON.stringify({ version: 99, cosmetics: { paint: 'gold' } }),
      'stock',
      true,
    ],
  ] as const)(
    'opens debrief → Journal after %s and reloads safely',
    async (_name, raw, paint, readOnly) => {
      vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
      const values = new Map([
        [PROGRESS_STORAGE_KEY, raw],
        [DISCOVERY_STORAGE_KEY, '{broken'],
      ]);
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
      const guide = new Journal();
      cleanup.push(() => guide.dispose());
      Object.assign(guide, {
        sites: [buildJournalSite({ id: 'reef', guide: null, pois: [], species: null })],
      });
      guide.setStore(new DiscoveryStore(storage));
      const debrief = new Debrief({ onFieldGuide: () => guide.open() });
      cleanup.push(() => debrief.dispose());
      const rating = progress.finish('reef', [{ primary: true, complete: true }]);
      debrief.show({ ...stats, discoveries: [{ poiId: 'bow', name: 'Bow' }] }, undefined, rating);
      const journalButton = (debrief.root as unknown as Element)
        .querySelectorAll('button')
        .find((b) => b.dataset.action === 'journal')!;
      journalButton.dispatchEvent(new Event('click'));
      await Promise.resolve();
      expect(guide.isOpen).toBe(true);
      expect(progress.cosmetics.paint).toBe(paint);
      if (readOnly) expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(raw);
      press('Escape');
      expect(guide.isOpen).toBe(false);
      expect(debrief.isOpen).toBe(true);
      expect(storage.getItem(DISCOVERY_STORAGE_KEY)).toBe('{broken');
    },
  );
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
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
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
function settings(onResetProgress?: () => 'cleared' | 'sessionOnly') {
  const input = new Input({ storage: null });
  const save = new Save({ config: DEFAULT_CONFIG, storage: null });
  const screen = new SettingsScreen({
    input,
    save,
    config: DEFAULT_CONFIG,
    activeTier: 'low',
    activeDetailStrength: save.get().detailStrength,
    onResetProgress,
  });
  cleanup.push(() => {
    screen.dispose();
    input.dispose();
  });
  return { screen, input, save };
}

it.each(['cleared', 'sessionOnly'] as const)(
  'cancels the pending %s discoveries reload when Settings is disposed',
  (result) => {
    vi.useFakeTimers();
    const reload = vi.fn();
    Object.assign(window, { setTimeout, clearTimeout, location: { reload } });
    const { screen } = settings(() => result);
    try {
      const root = screen.root as unknown as Element;
      const confirm = root.querySelector('.settings-confirm')!.querySelector('button')!;
      confirm.dispatchEvent(new Event('click'));
      expect(vi.getTimerCount()).toBe(1);
      screen.dispose();
      vi.runAllTimers();
      expect(reload).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  },
);

it('keeps repeated discovery resets to one delayed reload while Settings remains alive', () => {
  vi.useFakeTimers();
  const reload = vi.fn();
  Object.assign(window, { setTimeout, clearTimeout, location: { reload } });
  const { screen } = settings(() => 'cleared');
  try {
    const root = screen.root as unknown as Element;
    const confirm = root.querySelector('.settings-confirm')!.querySelector('button')!;
    confirm.dispatchEvent(new Event('click'));
    vi.advanceTimersByTime(300);
    confirm.dispatchEvent(new Event('click'));
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(599);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reload).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

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
    subScreen: vi.fn(),
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
  it.each(['journal', 'settings', 'controls', 'globe', 'debrief', 'briefing', 'photo'])(
    'leaves wheel scrolling and range shortcuts to the %s overlay above expanded sonar',
    (modal) => {
      const ctx = {
        app: { state: 'dive' },
        settingsScreen: { root: html(element('DIV')), isOpen: modal === 'settings' },
        controlsCard: { isOpen: modal === 'controls' },
        globe: { isOpen: modal === 'globe' },
        discovery: {
          guide: { isOpen: modal === 'journal' },
          debrief: { isOpen: modal === 'debrief' },
        },
        missionRouter: { frozen: modal === 'briefing' },
        photoMode: { active: modal === 'photo' },
        sonar: { expanded: true, zoomWheel: vi.fn(), zoomBy: vi.fn() },
      } as unknown as GameContext;
      sonarControlsSystem.init!(ctx);
      cleanup.push(() => sonarControlsSystem.dispose?.());
      const wheel = new Event('wheel', { cancelable: true });
      Object.assign(wheel, { deltaY: 100 });
      window.dispatchEvent(wheel);
      const key = press('Equal');
      expect(wheel.defaultPrevented).toBe(false);
      expect(key.defaultPrevented).toBe(false);
      expect(ctx.sonar.zoomWheel).not.toHaveBeenCalled();
      expect(ctx.sonar.zoomBy).not.toHaveBeenCalled();
      Object.assign(ctx.settingsScreen, { isOpen: false });
      Object.assign(ctx.controlsCard, { isOpen: false });
      Object.assign(ctx.globe, { isOpen: false });
      Object.assign(ctx.discovery.guide, { isOpen: false });
      Object.assign(ctx.discovery.debrief, { isOpen: false });
      Object.assign(ctx.missionRouter!, { frozen: false });
      Object.assign(ctx.photoMode, { active: false });
      const resumed = new Event('wheel', { cancelable: true });
      Object.assign(resumed, { deltaY: -100 });
      window.dispatchEvent(resumed);
      expect(resumed.defaultPrevented).toBe(true);
      expect(ctx.sonar.zoomWheel).toHaveBeenCalledExactlyOnceWith(-1);
      press('Equal');
      expect(ctx.sonar.zoomBy).toHaveBeenCalledExactlyOnceWith(-1);
    },
  );

  it('contains Settings keyboard focus above Home and returns to its opener after touch or Escape dismissal', () => {
    const { screen } = settings();
    const home = new Home({
      dive: vi.fn(),
      journal: vi.fn(),
      subScreen: vi.fn(),
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
      quality: { setting: 'low', urlForced: false, detected: { tier: 'low', reason: 'test' } },
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

  it('applies session-only accessibility edits and detaches live consumers on disposal', () => {
    const motion = Object.assign(new EventTarget(), { matches: false });
    Object.assign(window, { matchMedia: () => motion });
    const save = new Save({
      config: DEFAULT_CONFIG,
      storage: {
        getItem: () => null,
        setItem() {
          throw new DOMException('Full', 'QuotaExceededError');
        },
        removeItem() {},
      },
    });
    const ctx = {
      config: DEFAULT_CONFIG,
      settings: save.get(),
      save,
      tier: 'low',
      quality: { setting: 'low', urlForced: false, detected: { tier: 'low' } },
      input: new Input({ storage: null }),
      globe: { isOpen: false },
      expose: vi.fn(),
      rig: {},
      waypoints: { setReducedMotion: vi.fn() },
      captions: { setEnabled: vi.fn() },
      sonar: { setPalette: vi.fn() },
    } as unknown as GameContext;
    settingsSystem.init!(ctx);
    cleanup.push(() => settingsSystem.dispose?.());
    const scale = vi.spyOn(document.documentElement.style, 'setProperty');
    save.save({ reduceMotion: true, captions: true, sonarPalette: 'highContrast', uiScale: 140 });
    expect(save.reloadSafe).toBe(false);
    expect(ctx.rig.reduceMotion).toBe(true);
    expect(document.documentElement.dataset.reduceMotion).toBe('true');
    expect(ctx.waypoints.setReducedMotion).toHaveBeenLastCalledWith(true);
    expect(ctx.captions.setEnabled).toHaveBeenCalledExactlyOnceWith(true);
    expect(ctx.sonar.setPalette).toHaveBeenLastCalledWith('highContrast');
    expect(scale).toHaveBeenLastCalledWith('--ui-user-scale', '1.4');
    save.save({ reduceMotion: false, captions: false, sonarPalette: 'default', uiScale: 100 });
    expect(ctx.rig.reduceMotion).toBe(false);
    expect(ctx.captions.setEnabled).toHaveBeenLastCalledWith(false);
    expect(ctx.sonar.setPalette).toHaveBeenLastCalledWith('default');
    expect(scale).toHaveBeenLastCalledWith('--ui-user-scale', '1');
    settingsSystem.dispose?.();
    vi.mocked(ctx.waypoints.setReducedMotion).mockClear();
    vi.mocked(ctx.captions.setEnabled).mockClear();
    vi.mocked(ctx.sonar.setPalette).mockClear();
    scale.mockClear();
    motion.matches = true;
    motion.dispatchEvent(new Event('change'));
    save.save({ reduceMotion: true, captions: true, sonarPalette: 'highContrast', uiScale: 150 });
    expect(save.get().reduceMotion).toBe(true);
    expect(ctx.rig.reduceMotion).toBe(false);
    expect(document.documentElement.dataset.reduceMotion).toBe('false');
    expect(ctx.waypoints.setReducedMotion).not.toHaveBeenCalled();
    expect(ctx.captions.setEnabled).not.toHaveBeenCalled();
    expect(ctx.sonar.setPalette).not.toHaveBeenCalled();
    expect(scale).not.toHaveBeenCalled();
  });

  it.each([
    { savedMotion: false, osMotion: false },
    { savedMotion: true, osMotion: false },
    { savedMotion: false, osMotion: true },
    { savedMotion: true, osMotion: true },
  ])('restores accessibility controls and live values after reload: %j', (fixture) => {
    const motion = Object.assign(new EventTarget(), { matches: fixture.osMotion });
    Object.assign(window, { matchMedia: () => motion });
    const records = new Map<string, string>([
      [
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ version: 3, reduceMotion: fixture.savedMotion, uiScale: 135 }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => {
        records.set(key, value);
      },
      removeItem: (key: string) => {
        records.delete(key);
      },
    };
    const scale = vi.spyOn(document.documentElement.style, 'setProperty');
    for (let session = 0; session < 2; session++) {
      const save = new Save({ config: DEFAULT_CONFIG, storage });
      const ctx = {
        config: DEFAULT_CONFIG,
        settings: save.get(),
        save,
        tier: 'low',
        quality: { setting: 'low', urlForced: false, detected: { tier: 'low', reason: 'test' } },
        input: new Input({ storage: null }),
        globe: { isOpen: false },
        expose: vi.fn(),
        rig: {},
        waypoints: { setReducedMotion: vi.fn() },
      } as unknown as GameContext;
      settingsSystem.init!(ctx);
      cleanup.push(() => settingsSystem.dispose?.());
      const root = ctx.settingsScreen.root;
      const reduce = root.querySelector<HTMLInputElement>('[data-setting="reduceMotion"]')!;
      const size = root.querySelector<HTMLInputElement>('[data-setting="uiScale"]')!;
      const savedMotion = session === 0 ? fixture.savedMotion : !fixture.savedMotion;
      expect(reduce.checked).toBe(savedMotion);
      expect(size.value).toBe(session === 0 ? '135' : '150');
      expect(ctx.rig.reduceMotion).toBe(savedMotion || fixture.osMotion);
      expect(document.documentElement.dataset.reduceMotion).toBe(String(ctx.rig.reduceMotion));
      expect(ctx.waypoints.setReducedMotion).toHaveBeenLastCalledWith(ctx.rig.reduceMotion);
      if (session === 0) {
        reduce.checked = !fixture.savedMotion;
        reduce.dispatchEvent(new Event('change'));
        size.value = '150';
        size.dispatchEvent(new Event('change'));
        expect(scale).toHaveBeenLastCalledWith('--ui-user-scale', '1.5');
        expect(ctx.rig.reduceMotion).toBe(!fixture.savedMotion || fixture.osMotion);
        expect(save.reloadSafe).toBe(true);
      }
      settingsSystem.dispose?.();
    }
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
    const binding = root.querySelector('[data-action="thrustReverse"]')!;
    binding.dispatchEvent(new Event('click'));
    expect(screen.capturingAction).toBe('thrustReverse');
    expect(press('Tab').defaultPrevented).toBe(true);
    expect(screen.capturingAction).toBe(null);
    expect(root.contains(active())).toBe(true);
    binding.dispatchEvent(new Event('click'));
    press('Escape');
    expect(screen.capturingAction).toBe(null);
    expect(screen.isOpen).toBe(true);
    const original = [...input.actions.find((action) => action.id === 'thrustReverse')!.keys];
    binding.dispatchEvent(new Event('click'));
    press('KeyX', { repeat: true });
    expect(input.actions.find((action) => action.id === 'thrustReverse')!.keys).toEqual(original);
    press('KeyX');
    expect(input.actions.find((action) => action.id === 'thrustReverse')!.keys).toEqual([
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

  it.each(
    [false, true].flatMap((shortcut) => [false, true].map((direct) => ({ shortcut, direct }))),
  )(
    'Settings header transitions restore focus (dive shortcut=$shortcut, direct Controls=$direct)',
    ({ shortcut, direct }) => {
      const { screen } = settings();
      const root = screen.root as unknown as Element;
      const controls = root.querySelector('.settings-controls-open')!;
      const back = root.querySelector('.settings-controls-back')!;
      const pane = root.querySelector('.settings-bindings')!.parentElement!;
      const card = new ControlsCard({ key: () => 'G', initialDevice: 'keyboard' });
      cleanup.push(() => card.dispose());
      // Match the dive's header extension; Home leaves the same SettingsScreen alone.
      const layout = shortcut ? new Element('BUTTON') : null;
      if (layout) {
        layout.className = 'settings-layout-open';
        layout.textContent = 'Device layout';
        layout.addEventListener('click', () => card.open());
        controls.after(layout);
      }
      const focus = trap(root);
      const opener = element();
      for (let cycle = 0; cycle < 3; cycle++) {
        opener.focus();
        screen.open();
        expect(active()).toBe(body); // Preserve protection from a held activation key.
        if (direct) screen.showControls(true);
        else {
          press('Tab');
          expect(active()).toBe(controls);
          controls.dispatchEvent(new Event('click'));
        }
        expect(pane.hidden).toBe(false);
        expect(root.querySelector('.settings-title')!.textContent).toBe('Controls');
        expect(active()).toBe(back);
        if (layout) {
          expect(layout.hidden).toBe(true);
          expect(focus.focusables()).not.toContain(layout);
        }
        for (const shiftKey of [false, true]) {
          for (let step = 0; step <= focus.focusables().length; step++) {
            press('Tab', { shiftKey });
            expect(root.contains(active())).toBe(true);
            expect(active().closest('[hidden]')).toBe(null);
            expect(active()).not.toBe(layout);
          }
        }
        back.dispatchEvent(new Event('click'));
        expect(pane.hidden).toBe(true);
        expect(root.querySelector('.settings-title')!.textContent).toBe('Settings');
        expect(active()).toBe(controls);
        if (layout) {
          expect(layout.hidden).toBe(false);
          press('Tab');
          expect(active()).toBe(layout);
          layout.dispatchEvent(new Event('click'));
          expect(card.isOpen).toBe(true);
          press('Escape');
          expect(card.isOpen).toBe(false);
          expect(screen.isOpen).toBe(true);
          expect(active()).toBe(layout);
          expect(layout.isConnected).toBe(true);
        } else expect(root.querySelector('.settings-layout-open')).toBe(null);
        if (cycle === 1) screen.showControls(true);
        if (cycle === 2) root.querySelector('.settings-close')!.dispatchEvent(new Event('click'));
        else press('Escape');
        expect(screen.isOpen).toBe(false);
        expect(active()).toBe(opener);
        expect(opener.isConnected).toBe(true);
      }
    },
  );

  it('Settings keeps the dive layout usable when a touch Controls request resolves to Settings', () => {
    const { screen } = settings();
    const root = screen.root as unknown as Element;
    const controls = root.querySelector('.settings-controls-open')!;
    const back = root.querySelector('.settings-controls-back')!;
    const pane = root.querySelector('.settings-bindings')!.parentElement!;
    const layout = new Element('BUTTON');
    layout.className = 'settings-layout-open';
    controls.after(layout);
    const card = new ControlsCard({ key: () => 'G', initialDevice: 'touch' });
    cleanup.push(() => card.dispose());
    layout.addEventListener('click', () => card.open());
    const opener = element();
    opener.focus();
    screen.open();
    screen.showControls(true);
    expect(active()).toBe(back);
    expect(layout.hidden).toBe(true);
    document.documentElement.classList.add('is-touch');
    screen.showControls(true);
    expect(pane.hidden).toBe(true);
    expect(controls.hidden).toBe(true);
    expect(back.hidden).toBe(true);
    expect(layout.hidden).toBe(false);
    expect(active()).toBe(layout);
    layout.dispatchEvent(new Event('click'));
    expect(card.isOpen).toBe(true);
    press('Escape');
    expect(active()).toBe(layout);
    expect(screen.isOpen).toBe(true);
    document.documentElement.classList.remove('is-touch');
    screen.showControls(true);
    expect(pane.hidden).toBe(false);
    expect(layout.hidden).toBe(true);
    expect(active()).toBe(back);
    press('Escape');
    expect(screen.isOpen).toBe(false);
    expect(active()).toBe(opener);
  });

  it.each(['before construction', 'before first open'])(
    'Settings keeps touch Controls hidden and normal settings usable with touch %s',
    (when) => {
      if (when === 'before construction') document.documentElement.classList.add('is-touch');
      const { screen, save } = settings();
      document.documentElement.classList.add('is-touch');
      const root = screen.root as unknown as Element;
      const controls = root.querySelector('.settings-controls-open')!;
      const back = root.querySelector('.settings-controls-back')!;
      const pane = root.querySelector('.settings-bindings')!.parentElement!;
      const normal = root.querySelectorAll('.settings-section').filter((s) => s !== pane);
      const close = root.querySelector('.settings-close')!;
      const controlsFocus = vi.spyOn(controls, 'focus');
      const backFocus = vi.spyOn(back, 'focus');
      const opener = element();
      for (let cycle = 0; cycle < 3; cycle++) {
        opener.focus();
        screen.open();
        expect(active()).toBe(body); // Opening keeps the existing held-key protection.
        expect(controls.hidden).toBe(true);
        expect(back.hidden).toBe(true);
        expect(pane.hidden).toBe(true);
        press('Tab');
        expect(active()).toBe(close);
        screen.showControls(true);
        expect(pane.hidden).toBe(true);
        expect(normal.every((s) => !s.hidden)).toBe(true);
        expect(root.querySelector('.settings-title')!.textContent).toBe('Settings');
        expect(controlsFocus).not.toHaveBeenCalled();
        expect(backFocus).not.toHaveBeenCalled();
        expect(active().closest('[hidden]')).toBe(null);

        const visited = new Set<Element>();
        const items = root
          .querySelectorAll('button, input, select, summary, [tabindex]')
          .filter((el) => el.tabIndex >= 0 && !el.closest('[hidden]') && !el.disabled);
        for (const shiftKey of [false, true]) {
          for (let step = 0; step <= items.length; step++) {
            press('Tab', { shiftKey });
            expect(active().isConnected).toBe(true);
            expect(active().closest('[hidden]')).toBe(null);
            expect(root.contains(active())).toBe(true);
            expect(pane.contains(active())).toBe(false);
            expect([controls, back]).not.toContain(active());
            visited.add(active());
          }
        }
        expect(visited).toContain(root.querySelector('[data-setting="graphicsTier"]'));
        expect(visited).toContain(root.querySelector('[data-setting="captions"]'));
        expect(visited).toContain(root.querySelector('[data-setting="masterVolume"]'));
        const captions = root.querySelector(
          '[data-setting="captions"]',
        )! as unknown as HTMLInputElement;
        captions.focus();
        const enabled = !save.get().captions;
        captions.checked = enabled;
        captions.dispatchEvent(new Event('change'));
        expect(save.get().captions).toBe(enabled);
        if (cycle % 2) close.dispatchEvent(new Event('click'));
        else press('Escape');
        expect(screen.isOpen).toBe(false);
        expect(active()).toBe(opener);
        expect(active().isConnected).toBe(true);
        expect(active().getClientRects()).toHaveLength(1);
      }
    },
  );

  it.each([
    { touch: false, requestControls: false },
    { touch: true, requestControls: false },
    { touch: true, requestControls: true },
  ])(
    'Settings cancels pane capture on return (touch=$touch, requestControls=$requestControls)',
    ({ touch, requestControls }) => {
      const { screen, input } = settings();
      const opener = element();
      opener.focus();
      screen.open();
      const root = screen.root as unknown as Element;
      const controls = root.querySelector('.settings-controls-open')!;
      const back = root.querySelector('.settings-controls-back')!;
      const binding = root.querySelector('[data-action="thrustReverse"]')!;
      const pane = binding.closest('.settings-section')!;
      controls.dispatchEvent(new Event('click'));
      expect(pane.hidden).toBe(false);
      expect(active()).toBe(back);
      binding.focus();
      binding.dispatchEvent(new Event('click'));
      expect(screen.capturingAction).toBe('thrustReverse');
      const original = [...input.actions.find((a) => a.id === 'thrustReverse')!.keys];
      document.documentElement.classList.toggle('is-touch', touch);
      if (requestControls) screen.showControls(true);
      else back.dispatchEvent(new Event('click'));
      expect(pane.hidden).toBe(true);
      expect(back.hidden).toBe(true);
      expect(controls.hidden).toBe(touch);
      expect(active() === (touch ? root.querySelector('.settings-close') : controls)).toBe(true);
      expect(active().closest('[hidden]')).toBe(null);
      expect(screen.capturingAction).toBe(null);
      expect(binding.textContent).not.toBe('Press a key…');
      press('KeyZ');
      expect(input.actions.find((a) => a.id === 'thrustReverse')!.keys).toEqual(original);
      press('Escape');
      expect(screen.isOpen).toBe(false);
      expect(active()).toBe(opener);

      document.documentElement.classList.remove('is-touch');
      screen.open();
      expect(controls.hidden).toBe(false);
      controls.dispatchEvent(new Event('click'));
      expect(active()).toBe(back);
      expect(pane.hidden).toBe(false);
      expect(root.querySelector('.settings-title')!.textContent).toBe('Controls');
      screen.close();
      expect(active()).toBe(opener);
    },
  );

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

  it.each(['primary', 'all'] as const)(
    'keeps Journal ownership through %s completion, then resumes debrief and abort decisions',
    async (completion) => {
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
            objectives: [
              {
                id: 'primary',
                poi: 'primary',
                type: 'scan',
                title: 'Primary',
                hint: '',
                primary: true,
              },
              {
                id: 'optional',
                poi: 'optional',
                type: 'scan',
                title: 'Optional',
                hint: '',
                primary: false,
              },
            ],
            completion: 'all_primary',
          },
        },
        discovery: {
          ready: Promise.resolve(),
          pois: ['primary', 'optional'].map((id) => ({
            id,
            name: id,
            position: { x: 0, y: -100, z: -10 },
          })),
          guide,
          stats: { snapshot: (extra) => ({ ...stats, ...extra }) },
        },
      });
      cleanup.push(() => router.dispose());
      await Promise.resolve();
      const fallback = shell();
      // A late scan may finish dispatching while Journal owns the keyboard.
      guide.open();
      press('Tab');
      const journalControl = active();
      bus.emit('scan:complete', { poiId: 'primary', landmarkId: 'reef', firstTime: true });
      if (completion === 'all') {
        bus.emit('scan:complete', { poiId: 'optional', landmarkId: 'reef', firstTime: true });
      }
      expect(router.mission.primaryComplete).toBe(true);
      expect(router.mission.allComplete).toBe(completion === 'all');
      const tick = (frozen: boolean, resumeFrame = false) => {
        const f = { dt: 0.25, realSteps: 8, frozen, resumeFrame, sampled: {} } as FrameState;
        inputGateSystem.frame!['gate.input']!(f, {} as GameContext);
        router.update(f.clockDt, f.dt, { x: 0, y: -100, z: 0 }, 0);
      };
      for (let i = 0; i < 16; i++) tick(true);
      expect(router.mission.elapsedS).toBe(0);
      expect(router.panel.bannerOpen).toBe(false);
      expect(router.debriefOpen).toBe(false);
      expect(guide.isTop).toBe(true);
      expect(active()).toBe(journalControl);
      press('Escape');
      expect(guide.isOpen).toBe(false);
      tick(false, true);
      for (let i = 0; i < 11; i++) tick(false);
      expect(router.panel.bannerOpen).toBe(false);
      const beforeBanner = active();
      tick(false);
      expect(router.panel.bannerOpen).toBe(true);
      expect(router.mission.elapsedS).toBe(3);
      expect(active()).toBe(beforeBanner);
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
    },
  );

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
      subScreen: vi.fn(),
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

  it('the site sheet grab keeps keyboard activation after a swipe and ignores its trailing pointer click', () => {
    const home = new Home({
      dive: vi.fn(),
      journal: vi.fn(),
      subScreen: vi.fn(),
      settings: vi.fn(),
      controls: vi.fn(),
    });
    cleanup.push(() => home.dispose());
    home.show();
    home.showSites(false);
    const root = home.root as unknown as Element;
    const grab = root.querySelector('.home-sites-grab')!;
    const sites = root.querySelector('.home-sites')!;
    for (const [type, clientY] of [
      ['pointerdown', 100],
      ['pointerup', 40],
    ] as const) {
      const event = Object.assign(new Event(type), { clientY, pointerId: 1 });
      grab.dispatchEvent(event);
    }
    expect(sites.classList.contains('is-collapsed')).toBe(false);
    grab.dispatchEvent(Object.assign(new Event('click'), { detail: 1 }));
    expect(sites.classList.contains('is-collapsed')).toBe(false);
    grab.focus();
    grab.dispatchEvent(Object.assign(new Event('click'), { detail: 0 }));
    expect(sites.classList.contains('is-collapsed')).toBe(true);
    grab.dispatchEvent(Object.assign(new Event('click'), { detail: 0 }));
    expect(sites.classList.contains('is-collapsed')).toBe(false);
    press('Escape');
    expect(home.sitesOpen).toBe(false);
  });

  it('completion choices are keyboard reachable without stealing flight focus or piloting on Space', () => {
    const panel = new ObjectivesPanel();
    cleanup.push(() => panel.dispose());
    const keep = vi.fn();
    const surface = vi.fn();
    panel.showBanner({ title: 'Complete', detail: '', onKeepExploring: keep, onSurface: surface });
    expect(active()).toBe(body);
    const buttons = (panel.root as unknown as Element).querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.tabIndex === 0)).toBe(true);
    vi.stubGlobal('document', Object.assign(new EventTarget(), document));
    const input = new Input({ storage: null });
    input.attach();
    cleanup.push(() => input.dispose());
    for (const button of buttons) {
      button.focus();
      expect(press('Space', { target: html(button) }).defaultPrevented).toBe(false);
      expect(input.sample().ballast).toBe(0);
      button.dispatchEvent(new Event('click'));
    }
    expect(keep).toHaveBeenCalledOnce();
    expect(surface).toHaveBeenCalledOnce();
  });

  it.each([
    {
      done: [],
      optionalOnly: false,
      rows: ['a', 'b', 'side'],
      current: 'a',
      progress: '0 of 3 objectives · 0 of 2 primary',
    },
    {
      done: ['a'],
      optionalOnly: false,
      rows: ['b', 'side'],
      current: 'b',
      progress: '1 of 3 objectives · 1 of 2 primary',
    },
    {
      done: ['a', 'b'],
      optionalOnly: false,
      rows: ['side'],
      current: 'side',
      progress: '2 of 3 objectives · primaries done',
    },
    {
      done: ['a', 'b', 'side'],
      optionalOnly: false,
      rows: ['a', 'b', 'side'],
      current: 'a',
      progress: '3 of 3 objectives · all complete',
    },
    {
      done: ['a'],
      optionalOnly: true,
      rows: ['side', 'b'],
      current: 'side',
      progress: '1 of 3 objectives · 0 of 0 primary',
    },
  ])(
    'keeps objective rows and the current step honest for $done (optionalOnly=$optionalOnly)',
    (test) => {
      // Guards completed-row filtering, stable authored order and accessible current-step handoff.
      const panel = new ObjectivesPanel();
      cleanup.push(() => panel.dispose());
      const objectives: ObjectiveStatus[] = ['side', 'a', 'b'].map((id) => ({
        id,
        title: `Scan ${id}`,
        hint: `Find ${id}`,
        poiId: id,
        primary: !test.optionalOnly && id !== 'side',
        resolved: true,
        complete: false,
      }));
      panel.setObjectives(objectives);
      panel.setObjectives(objectives.map((o) => ({ ...o, complete: test.done.includes(o.id) })));
      const root = panel.root as unknown as Element;
      const rows = root.querySelectorAll('.obj-item');
      expect(rows.map((row) => row.dataset.objective)).toEqual(test.rows);
      expect(
        rows
          .filter((row) => row.getAttribute('aria-current') === 'step')
          .map((row) => row.dataset.objective),
      ).toEqual([test.current]);
      expect(rows.filter((row) => row.classList.contains('is-complete'))).toHaveLength(
        test.done.length === 3 ? 3 : 0,
      );
      expect(root.querySelector('.obj-progress')!.textContent).toBe(test.progress);
      expect(root.querySelector('.obj-hint')!.textContent).toBe(`Find ${test.current}`);
      expect(objectives.map((o) => o.id)).toEqual(['side', 'a', 'b']);
      panel.setObjectives([]);
      expect(root.querySelectorAll('.obj-item')).toHaveLength(0);
      expect(root.querySelector('.obj-hint')!.hidden).toBe(true);
    },
  );

  it.each([
    { remaining: 'primary', text: 'NO TARGET POSITION' },
    { remaining: 'optional', text: 'NO TARGET POSITION' },
    { remaining: 'none', text: 'ALL OBJECTIVES COMPLETE' },
    { remaining: 'empty', text: 'NO TARGET POSITION' },
  ])(
    'keeps the nav notice honest with $remaining objectives and no positions',
    ({ remaining, text }) => {
      // Missing coordinates must not turn primary completion into an all-objectives reward.
      const panel = new ObjectivesPanel();
      cleanup.push(() => panel.dispose());
      const objectives: ObjectiveStatus[] =
        remaining === 'empty'
          ? []
          : [
              {
                id: 'a',
                title: 'Primary',
                hint: '',
                poiId: 'a',
                primary: true,
                resolved: true,
                complete: remaining !== 'primary',
              },
              {
                id: 'b',
                title: 'Optional',
                hint: '',
                poiId: 'b',
                primary: false,
                resolved: true,
                complete: remaining === 'none',
              },
            ];
      panel.setObjectives(objectives);
      // Populate all nav fields first so the null-target branch must also withdraw stale directions.
      panel.setNav(
        { id: 'a', name: 'Primary', primary: true, bearingDeg: 90, depthM: 100, relativeDeg: 90 },
        false,
      );
      const nav = pickNavTarget(objectives, [], { x: 0, y: 0, z: 0 });
      expect(nav).toBeNull();
      panel.setNav(null, remaining === 'optional' || remaining === 'none');
      const root = panel.root as unknown as Element;
      expect(root.querySelector('.obj-nav-target')!.textContent).toBe(text);
      for (const field of ['bearing', 'depth', 'turn']) {
        expect(root.querySelector(`.obj-nav-${field}`)!.textContent).toBe('');
      }
    },
  );

  it('wraps a long objective list around the selected step and drops finished rows before counting more', () => {
    const panel = new ObjectivesPanel();
    cleanup.push(() => panel.dispose());
    const objectives: ObjectiveStatus[] = Array.from({ length: 8 }, (_, i) => ({
      id: `o${i}`,
      title: `Scan ${i}`,
      hint: '',
      poiId: `p${i}`,
      primary: i < 6,
      resolved: true,
      complete: i === 0,
    }));
    panel.setObjectives(objectives);
    panel.setNav(
      { id: 'o5', name: 'Target', primary: true, bearingDeg: 90, depthM: 100, relativeDeg: 0 },
      false,
    );
    const root = panel.root as unknown as Element;
    expect(root.querySelectorAll('.obj-item').map((row) => row.dataset.objective)).toEqual([
      'o5',
      'o6',
      'o7',
      'o1',
    ]);
    expect(root.querySelector('.obj-more')!.textContent).toBe('+3 more · Esc for all');
    expect(
      root
        .querySelectorAll('.obj-item')
        .filter((row) => row.getAttribute('aria-current') === 'step'),
    ).toHaveLength(1);
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
  it.each([
    { device: 'keyboard', focused: '.controls-card-tab' },
    { device: 'keyboard', focused: '.controls-card-rebind' },
    { device: 'gamepad', focused: '.controls-card-tab' },
  ] as const)(
    'switching an open $device guide to touch releases hidden $focused focus',
    ({ device, focused }) => {
      // Device changes must release focus from either kind of newly hidden control.
      const opener = element();
      opener.focus();
      const card = new ControlsCard({
        key: () => 'G',
        initialDevice: device,
        onRebind: vi.fn(),
      });
      cleanup.push(() => card.dispose());
      card.open();
      const root = card.root as unknown as Element;
      root.querySelector(focused)!.focus();
      card.setDevice('touch');
      expect(card.root.getAttribute('aria-label')).toBe('How to play');
      expect(root.querySelector('.how-to-play')).not.toBeNull();
      expect(root.querySelector('.controls-card-tabs')!.hidden).toBe(true);
      expect(root.querySelector('.controls-card-rebind')!.hidden).toBe(true);
      expect(active()).toBe(root.querySelector('.controls-card-close'));
      press('Tab');
      expect(active()).toBe(root.querySelector('.controls-card-close'));
      press('Escape');
      expect(active()).toBe(opener);
    },
  );

  it('a covered controls guide changing device leaves focus with the top overlay', () => {
    // A background device update cannot steal focus or restore a hidden tab on dismissal.
    const opener = element();
    opener.focus();
    const card = new ControlsCard({ key: () => 'G', initialDevice: 'keyboard' });
    cleanup.push(() => card.dispose());
    card.open();
    (card.root as unknown as Element).querySelector('.controls-card-tab')!.focus();
    const top = overlay();
    top.owner.show();
    top.first.focus();
    card.setDevice('touch');
    expect(active()).toBe(top.first);
    expect(card.root.getAttribute('aria-label')).toBe('How to play');
    press('Escape');
    expect(active().closest('[hidden]')).toBeNull();
    press('Tab');
    expect(active()).toBe((card.root as unknown as Element).querySelector('.controls-card-close'));
    press('Escape');
    expect(active()).toBe(opener);
  });

  it('Home ignores the Journal pad shortcut while Controls owns the modal stack', () => {
    const home = new Home({
      dive: vi.fn(),
      journal: vi.fn(),
      subScreen: vi.fn(),
      settings: vi.fn(),
      controls: vi.fn(),
    });
    cleanup.push(() => home.dispose());
    home.show();
    const guide = journal();
    const card = new ControlsCard({ key: () => 'G', initialDevice: 'gamepad' });
    cleanup.push(() => card.dispose());
    const opener = (home.root as unknown as Element)
      .querySelectorAll('button')
      .find((button) => button.textContent === 'Controls')!;
    opener.focus();
    card.open();
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, index: 0, axes: [0, 0, 0, 0], buttons }],
    });
    const input = new Input({ storage: null });
    const ctx = {
      input,
      journal: guide,
      controlsCard: card,
      settingsScreen: { isOpen: false },
      globe: { isOpen: false },
    } as unknown as GameContext;
    const menu = createHomeSystems().find((system) => system.name === 'menuData')!;
    const frame = () => {
      input.sample();
      menu.frame!['scan.discovery']!({ dt: 0, nowMs: 0, frozen: true }, ctx);
      input.endFrame();
    };
    buttons[14] = { pressed: true, value: 1 };
    frame();
    expect(guide.isOpen).toBe(false);
    expect(card.isOpen).toBe(true);
    press('Tab');
    expect(card.root.contains(document.activeElement)).toBe(true);
    press('Escape');
    expect(active()).toBe(opener);
    frame();
    expect(guide.isOpen).toBe(false);
    buttons[14] = { pressed: false, value: 0 };
    frame();
    buttons[14] = { pressed: true, value: 1 };
    frame();
    expect(guide.isOpen).toBe(true);
    buttons[14] = { pressed: false, value: 0 };
    frame();
    buttons[14] = { pressed: true, value: 1 };
    frame();
    expect(guide.isOpen).toBe(false);
    expect(active()).toBe(opener);
  });

  it('Home leaves an open Journal alone while another overlay owns its keyboard focus', () => {
    // Guard the Journal's own top-owner check, independently of the named shell modals.
    const guide = journal();
    guide.open();
    const top = overlay();
    top.owner.show();
    top.first.focus();
    const ctx = {
      input: { state: { toggleGuide: true } },
      journal: guide,
      controlsCard: { isOpen: false },
      settingsScreen: { isOpen: false },
      globe: { isOpen: false },
    } as unknown as GameContext;
    const menu = createHomeSystems().find((system) => system.name === 'menuData')!;
    const draw = () => menu.frame!['scan.discovery']!({ dt: 0, nowMs: 0, frozen: true }, ctx);
    draw();
    expect(guide.isOpen).toBe(true);
    expect(guide.isTop).toBe(false);
    expect(active()).toBe(top.first);
    press('Escape');
    expect(guide.isTop).toBe(true);
    draw();
    expect(guide.isOpen).toBe(false);
  });

  it.each(
    (['home', 'pause'] as const).flatMap((source) =>
      (['keyboard', 'gamepad', 'touch'] as const).flatMap((device) =>
        [false, true].map((initialTouch) => ({ source, device, initialTouch })),
      ),
    ),
  )(
    '$source routes $device Controls with initial touch=$initialTouch without simulation or settings',
    ({ source, device, initialTouch }) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
      const controls = createControlsSystem();
      const settingsOpen = vi.fn();
      const ctx = {
        config: DEFAULT_CONFIG,
        bus: new EventBus(),
        index: [],
        route: null,
        meta: source === 'pause' ? { id: 'reef' } : undefined,
        save: new Save({ config: DEFAULT_CONFIG, storage: null }),
        app: { state: 'home', lastSite: null },
        params: new URLSearchParams(),
        expose: vi.fn(),
        journal: { open: vi.fn() },
        discoveries: { isDiscovered: () => false },
        input: new Input({ storage: null }),
        settingsScreen: { root: html(element('DIV')), open: settingsOpen },
      } as unknown as GameContext;
      const runner = new SystemRunner(ctx);
      cleanup.push(() => runner.dispose());
      // A phone keeps its touch controls active when a pad supplies the first frame.
      ctx.input.touchActive = initialTouch;
      runner.init([shellSystem, controls]);
      if (device === 'keyboard') press('KeyW');
      if (device === 'touch')
        window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }));
      if (device === 'gamepad') {
        ctx.input.gamepadActive = true;
        controls.frame!['hud.draw']!({}, ctx);
      }
      ctx.setAppState(source);
      expect(ctx.controlsCard.device).toBe(device);
      const opener = ((source === 'home' ? ctx.home : ctx.pause).root as unknown as Element)
        .querySelectorAll('button')
        .find(
          (button) =>
            button.textContent ===
            (source === 'pause' && device === 'touch' ? 'How to play' : 'Controls'),
        )!;
      for (let cycle = 0; cycle < 3; cycle++) {
        // DOM activation keeps the sampled device rather than synthesizing a mouse input.
        opener.focus();
        opener.dispatchEvent(new Event('click'));
        expect(ctx.controlsCard.isOpen).toBe(true);
        expect(ctx.controlsCard.device).toBe(device);
        expect(ctx.controlsCard.root.getAttribute('aria-label')).toBe(
          device === 'touch' ? 'How to play' : 'Controls guide',
        );
        expect(settingsOpen).not.toHaveBeenCalled();
        expect(ctx.app.state).toBe(source);
        expect(ctx).not.toHaveProperty('terrain');
        expect(ctx).not.toHaveProperty('sub');
        const close = (ctx.controlsCard.root as unknown as Element)
          .querySelectorAll('button')
          .find((button) => button.textContent === 'Close')!;
        close.dispatchEvent(new Event('click'));
        expect(ctx.controlsCard.isOpen).toBe(false);
        expect(active()).toBe(opener);
      }
    },
  );

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
      let previousControls: ReturnType<typeof createControlsSystem> | undefined;
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
          settingsScreen: { root: html(element('DIV')) },
        } as unknown as GameContext;
        const runner = new SystemRunner(ctx);
        const controls = createControlsSystem();
        cleanup.push(() => {
          runner.dispose();
          guide.dispose();
        });
        runner.init([
          shellSystem,
          globeSystem,
          createInputSystem(),
          controls,
          createDailySystem(),
          createPhotoSystem(),
          shellKeysSystem,
        ]);
        await Promise.all([ctx.globe.catalog, ctx.homeGlobe.catalog]);
        previousControls?.dispose?.();
        expect(ctx.home.isOpen).toBe(true);
        for (let cycle = 0; cycle < 3; cycle++) {
          const opener = (ctx.home.root as unknown as Element)
            .querySelectorAll('button')
            .find((button) => button.textContent === 'Controls')!;
          opener.focus();
          opener.dispatchEvent(new Event('click'));
          expect(body.querySelectorAll('.controls-card')).toHaveLength(1);
          press('Tab');
          expect(ctx.controlsCard.root.contains(document.activeElement)).toBe(true);
          press('Escape');
          expect(ctx.controlsCard.isOpen).toBe(false);
          expect(active()).toBe(opener);
        }
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
        expect(body.querySelectorAll('.controls-card')).toHaveLength(0);
        expect(body.querySelectorAll('.photo-mode')).toHaveLength(0);
        const before = { ...ctx.input.state };
        press('KeyW');
        expect(ctx.input.sample()).toEqual(before);
        expect(remove.mock.calls).toHaveLength(add.mock.calls.length);
        previousControls = controls;
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

  it.each([false, true])(
    'waypoint teardown removes its DOM and ignores late POIs (pending: %s)',
    async (pending) => {
      let finish!: () => void;
      const ready = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const sonar = { setPois: vi.fn(), setScanState: vi.fn() };
      const save = new Save({ config: DEFAULT_CONFIG, storage: null });
      const ctx = {
        discovery: { ready, pois: [], scanner: {} },
        settings: save.get(),
        save,
        effective: resolveEffective(save.get(), 'arcade', null),
        sonar,
        expose: vi.fn(),
      } as unknown as GameContext;
      waypointsSystem.init!(ctx);
      cleanup.push(() => waypointsSystem.dispose?.());
      const setPois = vi.spyOn(ctx.waypoints, 'setPois');
      if (!pending) {
        finish();
        await ready;
      }
      setPois.mockClear();
      sonar.setPois.mockClear();
      waypointsSystem.dispose?.();
      expect(ctx.waypoints.root.isConnected).toBe(false);
      finish();
      await ready;
      expect(setPois).not.toHaveBeenCalled();
      expect(sonar.setPois).not.toHaveBeenCalled();
      waypointsSystem.dispose?.();
    },
  );

  it('HUD host teardown removes readouts and both bar buttons across repeated lifetimes', () => {
    const save = new Save({ config: DEFAULT_CONFIG, storage: null });
    const ctx = {
      meta: { id: 'reef', cols: 1, rows: 1 },
      config: DEFAULT_CONFIG,
      settings: save.get(),
      save,
      bus: new EventBus(),
      effective: resolveEffective(save.get(), 'arcade', null),
    } as unknown as GameContext;
    cleanup.push(() => hudSystem.dispose?.());
    element('DIV').className = 'hud-regions';
    for (let i = 0; i < 2; i++) {
      // Supply the static template nodes; this fixture does not parse innerHTML.
      const hud = element('DIV');
      for (const className of ['hud-readouts', 'hud-sim-speed', 'hud-power', 'hud-current']) {
        element('DIV', hud).className = className;
      }
      vi.spyOn(document, 'createElement').mockImplementationOnce(() => html(hud));
      hudSystem.init!(ctx);
      const dispose = vi.spyOn(ctx.hud, 'dispose');
      expect(body.querySelectorAll('.hud-journal')).toHaveLength(1);
      hudSystem.dispose?.();
      hudSystem.dispose?.();
      expect(dispose).toHaveBeenCalledOnce();
      for (const selector of ['.hud', '.hud-journal', '.hud-reset-camera'])
        expect(body.querySelectorAll(selector)).toHaveLength(0);
    }
  });

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

it.each(['pause', 'journal', 'hidden', 'blur then hidden', 'hidden then blur'] as const)(
  'interrupts a scan once through %s and excludes a long resume interval',
  async (boundary) => {
    // Exercise real discovery and frame gates: frozen time must neither scan nor decay.
    const events = new EventTarget();
    Object.assign(document, {
      hidden: false,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
    vi.spyOn(Journal.prototype, 'load').mockResolvedValue();
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      callbacks.set(++nextId, fn);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
    const ctx = {
      bus: new EventBus(),
      config: DEFAULT_CONFIG,
      effective: resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null),
      meta: { id: 'reef' },
      terrain: { sampleHeight: () => -200 },
      contentLandmark: 'reef',
      params: new URLSearchParams(),
      app: { state: 'dive' },
      globe: { isOpen: false },
      settingsScreen: { isOpen: false },
      photoMode: { active: false },
      rig: {},
      sub: {
        getState: () => ({}),
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(),
      },
      expose: vi.fn(),
    } as unknown as GameContext;
    discoverySystem.init!(ctx);
    cleanup.push(() => discoverySystem.dispose?.());
    await ctx.discovery.ready;
    const inputSystem = createInputSystem();
    inputSystem.init!(ctx);
    cleanup.push(() => inputSystem.dispose?.());
    const scanner = ctx.discovery.scanner;
    scanner.setTargets([
      {
        id: 'target',
        landmarkId: 'reef',
        name: 'Target',
        position: new THREE.Vector3(0, -100, -10),
        radius: 50,
        scanSeconds: 1,
      },
    ]);
    const aborted = vi.fn();
    const completed = vi.fn();
    ctx.bus.on('scan:aborted', aborted);
    ctx.bus.on('scan:complete', completed);
    const frames: FrameState[] = [];
    const runner = new SystemRunner(ctx);
    runner.init([
      { name: 'shell', frame: shellSystem.frame },
      inputGateSystem,
      {
        name: 'pose',
        frame: { 'camera.pilot': (f) => f.pilotForward.set(0, 0, -1) },
      },
      { name: 'discovery', frame: discoverySystem.frame },
      { name: 'input', frame: inputSystem.frame },
      { name: 'capture', frame: { 'late.debug': (f) => frames.push({ ...f }) } },
    ]);
    const stop = startLoop(ctx, runner);
    cleanup.push(stop);
    const step = (now: number) => {
      const [id, fn] = callbacks.entries().next().value!;
      callbacks.delete(id);
      fn(now);
      return frames.at(-1)!;
    };
    const setState = (state: 'pause' | 'dive') => {
      ctx.app.state = state;
      ctx.bus.emit('app:state', { state });
    };
    const visibility = (hidden: boolean) => {
      Object.assign(document, { hidden });
      events.dispatchEvent(new Event('visibilitychange'));
    };
    step(0);
    const scanKey = ctx.input.actions.find((action) => action.id === 'scan')!.keys[0];
    ctx.input.injectKey(scanKey, true);
    step(100);
    const progress = scanner.view.progress;
    const elapsed = ctx.discovery.stats.elapsedS;
    expect(progress).toBeGreaterThan(0);
    if (boundary === 'pause') setState('pause');
    else if (boundary === 'journal') ctx.discovery.guide.open();
    else {
      if (boundary === 'blur then hidden') window.dispatchEvent(new Event('blur'));
      visibility(true);
      if (boundary === 'hidden then blur') window.dispatchEvent(new Event('blur'));
    }
    for (const now of [1_000, 30_000, 60_000]) {
      expect(step(now)).toMatchObject({ frozen: true, steps: 0, clockDt: 0 });
      expect(scanner.view.progress).toBe(progress);
      expect(ctx.discovery.stats.elapsedS).toBe(elapsed);
    }
    expect(aborted).toHaveBeenCalledExactlyOnceWith({ poiId: 'target', reason: 'released' });
    expect(scanner.view.phase).toBe('interrupted');
    expect(completed).not.toHaveBeenCalled();
    if (boundary === 'pause') setState('dive');
    else if (boundary === 'journal') ctx.discovery.guide.close();
    else {
      if (boundary === 'hidden then blur') window.dispatchEvent(new Event('focus'));
      visibility(false);
      if (boundary !== 'hidden then blur') window.dispatchEvent(new Event('focus'));
    }
    expect(step(3_600_000)).toMatchObject({ frozen: false, steps: 0, clockDt: 0 });
    expect(scanner.view.progress).toBe(progress);
    expect(ctx.discovery.stats.elapsedS).toBe(elapsed);
    expect(ctx.input.state.scan).toBe(false);
    step(3_600_100);
    expect(scanner.view.progress).toBeLessThan(progress);
    ctx.input.injectKey(scanKey, true);
    for (let now = 3_600_200; now <= 3_601_500; now += 100) step(now);
    expect(completed).toHaveBeenCalledExactlyOnceWith({
      poiId: 'target',
      landmarkId: 'reef',
      firstTime: true,
    });
    expect(ctx.discovery.store.get('reef', 'target')?.count).toBe(1);
    expect(aborted).toHaveBeenCalledOnce();
    stop();
    expect(callbacks.size).toBe(0);
  },
);

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

it.each(
  (['before readiness', 'after the reserve microtask is queued'] as const).flatMap((timing) =>
    (['quit', 'pause', 'dispose'] as const).map((action) => ({ timing, action })),
  ),
)(
  'deferred mission reserves respect $action $timing across shell lifetimes',
  async ({ timing, action }) => {
    // Quit keeps the shell runtime alive, while page teardown disposes it.
    // Both must cancel a pending start; Pause must retain the live dive's reserves.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
    vi.stubGlobal('history', { pushState: vi.fn() });
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const bus = new EventBus();
    const previousResets: Array<ReturnType<typeof vi.spyOn>> = [];
    let previousRunner: SystemRunner | undefined;
    for (let cycle = 0; cycle < 3; cycle++) {
      let resolveReady!: () => void;
      const ready = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });
      const save = new Save({ config: DEFAULT_CONFIG, storage: null });
      save.setGameplayMode('realistic');
      const def = parseMission(titanicMission, 'titanic')!;
      const notice = vi.fn();
      const ctx = {
        config: DEFAULT_CONFIG,
        bus,
        index: [],
        meta: { id: 'titanic' },
        route: {
          missionId: 'titanic',
          tileId: 'titanic',
          landmarkId: 'titanic',
          def,
          skipBriefing: true,
        },
        params: new URLSearchParams('depth=3800'),
        save,
        effective: resolveEffective(save.get(), 'realistic', null),
        app: { state: 'dive', lastSite: null },
        discovery: { ready, pois: def.objectives.map((objective) => ({ id: objective.poi })) },
        guidance: { notice },
        sub: { position: new THREE.Vector3(0, -3800, 0), getState: () => ({ hullClass: 'C' }) },
        expose: vi.fn(),
        journal: { open: vi.fn() },
        discoveries: { isDiscovered: () => false },
        shellBaseHref: () => '/',
      } as unknown as GameContext;
      const runner = new SystemRunner(ctx);
      cleanup.push(() => runner.dispose());
      runner.init([createPowerSystem(), shellSystem, missionSystem, shellKeysSystem]);
      previousRunner?.dispose();
      for (const reset of previousResets) expect(reset).not.toHaveBeenCalled();
      const setLevels = vi.spyOn(ctx.power, 'setLevels');
      const reset = vi.spyOn(ctx.power, 'reset');
      const resolveObjectives = vi.spyOn(ctx.missionRouter!.mission, 'resolve');
      if (timing === 'after the reserve microtask is queued') {
        resolveReady();
        await ready;
        expect(setLevels).not.toHaveBeenCalled();
      }
      press('Escape');
      expect(ctx.app.state).toBe('pause');
      if (action === 'quit') {
        (ctx.pause.root as unknown as Element)
          .querySelectorAll('button')
          .find((button) => button.textContent === 'Quit to home')!
          .dispatchEvent(new Event('click'));
        expect(ctx.app.state).toBe('home');
        expect(ctx.home.isOpen).toBe(true);
      } else if (action === 'dispose') runner.dispose();
      resolveReady();
      await ready;
      await Promise.resolve();
      if (action === 'pause') {
        const reserve = startingReserves(3800, ctx.effective.submarine, ctx.effective.power);
        expect(setLevels).toHaveBeenCalledExactlyOnceWith(reserve.battery, reserve.oxygen);
        expect(notice).toHaveBeenCalledOnce();
        press('Escape');
        expect(ctx.app.state).toBe('dive');
      } else {
        expect(setLevels).not.toHaveBeenCalled();
        expect(notice).not.toHaveBeenCalled();
        expect(ctx.power.state).toMatchObject({ battery: 1, oxygen: 1 });
        if (timing === 'before readiness') expect(resolveObjectives).not.toHaveBeenCalled();
      }
      runner.dispose();
      runner.dispose();
      bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
      expect(reset).not.toHaveBeenCalled();
      expect(press('Escape').defaultPrevented).toBe(false);
      expect(remove.mock.calls).toHaveLength(add.mock.calls.length);
      previousRunner = runner;
      previousResets.push(reset);
    }
  },
);

it.each(['home', 'pause'] as const)(
  'Your sub releases all preview resources and RAFs on close, navigation and teardown from %s',
  async (source) => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      frames.set(++nextFrame, fn);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const renderers: Array<{
      domElement: HTMLElement;
      dispose: ReturnType<typeof vi.fn>;
      forceContextLoss: ReturnType<typeof vi.fn>;
      resources: Array<ReturnType<typeof vi.spyOn>>;
    }> = [];
    vi.spyOn(THREE, 'WebGLRenderer').mockImplementation(function () {
      const resources: Array<ReturnType<typeof vi.spyOn>> = [];
      const renderer = {
        domElement: html(new Element('CANVAS')),
        dispose: vi.fn(),
        forceContextLoss: vi.fn(),
        resources,
        render: vi.fn((scene: THREE.Scene) => {
          if (resources.length) return;
          const owned = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
          scene.traverse((object) => {
            if (
              !(object instanceof THREE.Mesh) &&
              !(object instanceof THREE.Points) &&
              !(object instanceof THREE.Sprite)
            )
              return;
            // Sprite geometry, the environment map and halo texture are shared caches.
            if (!(object instanceof THREE.Sprite)) owned.add(object.geometry);
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              owned.add(material);
              if (material instanceof THREE.SpriteMaterial) continue;
              const maps = material as THREE.MeshStandardMaterial;
              for (const value of [maps.map, maps.normalMap, maps.roughnessMap])
                if (value instanceof THREE.Texture) owned.add(value);
            }
          });
          for (const resource of owned) resources.push(vi.spyOn(resource, 'dispose'));
        }),
      };
      renderers.push(renderer);
      return renderer as unknown as THREE.WebGLRenderer;
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '[]' }));
    const ctx = {
      bus: new EventBus(),
      index: [],
      meta: source === 'pause' ? { id: 'reef' } : undefined,
      route: null,
      save: new Save({ config: DEFAULT_CONFIG, storage: null }),
      progress: new Progress(new ProgressSave(null)),
      app: { state: source, lastSite: null },
      expose: vi.fn(),
      journal: { open: vi.fn() },
      discoveries: { isDiscovered: () => false },
    } as unknown as GameContext;
    const runner = new SystemRunner(ctx);
    cleanup.push(() => runner.dispose());
    runner.init([shellSystem, shellKeysSystem]);
    ctx.setAppState(source);
    let screen!: SubScreen;
    const open = vi.spyOn(SubScreen.prototype, 'open');
    const opener = ((source === 'home' ? ctx.home : ctx.pause).root as unknown as Element)
      .querySelectorAll('button')
      .find((button) => button.textContent === 'Your sub')!;
    const show = () => {
      opener.focus();
      opener.dispatchEvent(new Event('click'));
      screen = open.mock.instances.at(-1)! as SubScreen;
      expect(screen.isOpen).toBe(true);
    };
    // Closing before the lazy import resolves must allocate no renderer at all.
    show();
    screen.close();
    expect(renderers).toHaveLength(0);
    const flush = async () => {
      await vi.waitFor(() => expect(frames.size).toBe(1));
      const [id, draw] = [...frames][0];
      frames.delete(id);
      draw(performance.now());
      expect(frames.size).toBe(1);
    };
    const released = () => {
      expect(frames.size).toBe(0);
      expect(screen.root.querySelectorAll('canvas')).toHaveLength(0);
      for (const renderer of renderers) {
        expect(renderer.dispose).toHaveBeenCalledTimes(1);
        expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
        expect(renderer.resources.length).toBeGreaterThan(10);
        for (const dispose of renderer.resources) expect(dispose).toHaveBeenCalledTimes(1);
      }
    };
    for (let cycle = 0; cycle < 3; cycle++) {
      show();
      screen.open(); // Duplicate open must keep the same preview and RAF.
      await flush();
      expect(renderers).toHaveLength(cycle + 1);
      const controls = (screen.root as unknown as Element)
        .querySelectorAll('button')
        .filter((button) => !button.disabled);
      expect((screen.root as unknown as Element).querySelectorAll('button').length).toBeGreaterThan(
        controls.length,
      );
      for (const control of controls) {
        press('Tab');
        expect(active()).toBe(control);
      }
      press('Tab');
      expect(active()).toBe(controls[0]);
      press('Tab', { shiftKey: true });
      expect(active()).toBe(controls.at(-1));
      press('Escape', { repeat: true });
      expect(screen.isOpen).toBe(true);
      expect(ctx.app.state).toBe(source);
      if (cycle % 2) {
        (screen.root as unknown as Element)
          .querySelector('.ss-close')!
          .dispatchEvent(new Event('click'));
      } else press('Escape');
      expect(screen.isOpen).toBe(false);
      expect(active()).toBe(opener);
      expect(ctx.app.state).toBe(source);
      screen.close(); // Repeated close must not dispose twice.
      released();
      press('Escape');
      expect(ctx.app.state).toBe(source === 'pause' ? 'dive' : 'home');
      ctx.setAppState(source);
    }
    show();
    await flush();
    ctx.setAppState(source === 'pause' ? 'home' : 'dive');
    expect(screen.isOpen).toBe(false);
    released();
    ctx.setAppState(source);
    show();
    await flush();
    runner.dispose();
    runner.dispose();
    expect(screen.root.isConnected).toBe(false);
    expect(screen.isOpen).toBe(false);
    released();
    expect(press('Escape').defaultPrevented).toBe(false);
    expect(remove.mock.calls).toHaveLength(add.mock.calls.length);
  },
);
