import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { GameContext } from '../../src/app/context.js';
import { shellKeysSystem } from '../../src/app/systems/shell.js';
import type { Progress } from '../../src/game/Progress.js';
import { FocusTrap, type FocusTrapOptions } from '../../src/ui/FocusTrap.js';
import { Globe } from '../../src/ui/Globe.js';
import type { GlobeSite } from '../../src/ui/GlobeModel.js';
import { Upgrades } from '../../src/ui/Upgrades.js';

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
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  tabIndex: number;
  classList = { add() {}, remove() {}, toggle() {} };
  constructor(readonly tagName = 'DIV') {
    super();
    this.tabIndex = ['BUTTON', 'SUMMARY', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tagName)
      ? 0
      : -1;
  }
  get isConnected(): boolean {
    return this.connected && (!this.parentElement || this.parentElement.isConnected);
  }
  setAttribute() {}
  removeAttribute() {}
  append(...children: Element[]) {
    for (const child of children) {
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
    return (
      (selector.includes('[hidden]') && this.hidden) || (selector.includes('[inert]') && this.inert)
    );
  }
  closest(selector: string): Element | null {
    return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null);
  }
  querySelectorAll(): Element[] {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
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
  const win = new EventTarget();
  // Node needs capture normalized on removal to match browser semantics.
  const remove = win.removeEventListener.bind(win);
  win.removeEventListener = (type, listener, options) =>
    remove(type, listener, typeof options === 'boolean' ? { capture: options } : options);
  vi.stubGlobal('window', win);
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('HTMLButtonElement', Element);
  vi.stubGlobal('getComputedStyle', (el: Element) => ({ visibility: el.visibility }));
  vi.stubGlobal('document', {
    body,
    activeElement: body,
    createElement: (tag: string) => new Element(tag.toUpperCase()),
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
    'closing Upgrades does not also pause the dive (shell registered first: %s)',
    (first) => {
      vi.spyOn(Upgrades.prototype as unknown as { render(): void }, 'render').mockImplementation(
        () => {},
      );
      const upgrades = new Upgrades({ onChange: () => vi.fn() } as unknown as Progress);
      cleanup.push(() => upgrades.dispose());
      const setAppState = vi.fn();
      const context = {
        app: { state: 'dive' },
        bus: new EventBus(),
        journal: { isOpen: false },
        discovery: { guide: { isOpen: false }, debrief: { isOpen: false } },
        settingsScreen: { isOpen: false },
        globe: { isOpen: false },
        photoMode: { active: false },
        upgrades,
        setAppState,
      } as unknown as GameContext;
      cleanup.push(() => shellKeysSystem.dispose?.());
      if (first) shellKeysSystem.init?.(context);
      upgrades.open();
      if (!first) shellKeysSystem.init?.(context);
      expect(press('Escape').defaultPrevented).toBe(true);
      expect(upgrades.isOpen).toBe(false);
      expect(setAppState).not.toHaveBeenCalled();
    },
  );

  it('opens Upgrades without held-Space button focus, returns focus and releases its listener', () => {
    // Content is independently owned; this capability checks the actual open/close lifecycle.
    vi.spyOn(Upgrades.prototype as unknown as { render(): void }, 'render').mockImplementation(
      () => {},
    );
    const off = vi.fn();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const upgrades = new Upgrades({ onChange: () => off } as unknown as Progress);
    cleanup.push(() => upgrades.dispose());
    const opener = element();
    opener.focus();
    upgrades.open();
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(active()).toBe(body);
    upgrades.open();
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(add.mock.calls.filter(([name]) => name === 'keydown')).toHaveLength(1);
    press('Escape');
    expect(upgrades.isOpen).toBe(false);
    expect(active()).toBe(opener);
    upgrades.open();
    upgrades.dispose();
    expect(off).toHaveBeenCalledOnce();
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
      expect(active()).toBe(body);
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
      expect(internal.chooser.contains(active())).toBe(true);
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
