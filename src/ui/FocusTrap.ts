/**
 * Keyboard ownership for the DOM overlays. While a trap is active,
 * Tab / Shift+Tab cycle through the focusable descendants of its root only,
 * so buttons behind the card (DIVE
 * SITES, the mission list) cannot be reached and triggered with Enter.
 *
 * Traps stack: when the field guide opens over a debrief, only the guide (the
 * most recently activated trap) handles Tab until it closes.
 *
 * Opening a modal does not move focus into it on purpose: Space is the
 * ballast-blow key, and a focused "Dive again" button would turn a held Space
 * into a reload. Instead, activation blurs any focused element *outside* the
 * modal (so Enter cannot fire a button behind it), and the first Tab lands on
 * the modal's first control.
 */

const FOCUSABLE =
  'button:not([disabled]), summary, a[href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const stack: FocusTrap[] = [];
let listening = false;
let keyboardOwners = 0;
const observers = new Set<(event: KeyboardEvent) => void>();
const fallbacks = new Set<(event: KeyboardEvent) => void>();

/** Passive device detection runs even when the top overlay consumes the key. */
export function observeKeyboard(observer: (event: KeyboardEvent) => void): () => void {
  observers.add(observer);
  listen();
  return () => {
    observers.delete(observer);
    releaseListener();
  };
}

/** Shell shortcuts share the dispatcher and run only for keys left unhandled. */
export function onUnhandledKeyDown(handler: (event: KeyboardEvent) => void): () => void {
  fallbacks.add(handler);
  listen();
  return () => {
    fallbacks.delete(handler);
    releaseListener();
  };
}

function listen(): void {
  if (listening) return;
  window.addEventListener('keydown', onKeyDown, true);
  listening = true;
}

function releaseListener(): void {
  if (stack.length || keyboardOwners || observers.size || fallbacks.size || !listening) return;
  window.removeEventListener('keydown', onKeyDown, true);
  listening = false;
}

function onKeyDown(e: KeyboardEvent): void {
  for (const observer of observers) observer(e);
  const top = stack[stack.length - 1];
  top?.handleKeyDown(e);
  if (e.cancelBubble) return;
  for (const fallback of fallbacks) {
    fallback(e);
    if (e.cancelBubble) break;
  }
}

export interface FocusTrapOptions {
  /** Omitted: leave Escape to the legacy caller. Null: consume without dismissing. */
  onEscape?: (() => void) | null;
  /** Other keys owned by this overlay, for example the globe's orbit controls. */
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Side effects, such as cancelling a binding capture, before focus cycles. */
  onTab?: () => void;
}

function asEl(x: unknown): HTMLElement | null {
  if (typeof HTMLElement !== 'undefined') return x instanceof HTMLElement ? x : null;
  return x && typeof (x as HTMLElement).blur === 'function' ? (x as HTMLElement) : null;
}

function hiddenByDetails(el: HTMLElement): boolean {
  let d = el.parentElement?.closest('details:not([open])');
  while (d) {
    if (el.tagName !== 'SUMMARY' || el.parentElement !== d) return true;
    d = d.parentElement?.closest('details:not([open])');
  }
  return false;
}

function canFocus(el: HTMLElement): boolean {
  return (
    el.isConnected &&
    !el.closest?.('[hidden], [inert]') &&
    !el.matches?.(':disabled') &&
    !hiddenByDetails(el) &&
    el.getClientRects().length > 0 &&
    (typeof getComputedStyle === 'undefined' || getComputedStyle(el).visibility === 'visible')
  );
}

export class FocusTrap {
  private previous: HTMLElement | null = null;
  private ownsKeyboard = false;
  private disposed = false;
  constructor(
    private readonly root: HTMLElement,
    private readonly options: FocusTrapOptions = {},
  ) {
    if (options.onEscape !== undefined && typeof window !== 'undefined') {
      // Keep one shared listener throughout the consumer's lifetime so a
      // close/reopen cannot move keyboard ownership behind other listeners.
      this.ownsKeyboard = true;
      keyboardOwners++;
      listen();
    }
  }

  get active(): boolean {
    return stack.includes(this);
  }

  get isTop(): boolean {
    return stack[stack.length - 1] === this;
  }

  /** Keep visibility, stack removal and focus return in one lifecycle path. */
  show(): void {
    if (this.disposed) return;
    this.root.hidden = false;
    this.activate();
  }

  hide(): void {
    this.root.hidden = true;
    this.deactivate();
  }

  activate(): void {
    if (this.disposed || typeof document === 'undefined') return;
    if (!this.active) this.previous = asEl(document.activeElement);
    const i = stack.indexOf(this);
    if (i >= 0) stack.splice(i, 1);
    stack.push(this);
    listen();
    const a = asEl(document.activeElement);
    if (a && a !== document.body && !this.root.contains(a)) a.blur();
  }

  deactivate(): void {
    if (typeof document === 'undefined') return;
    const i = stack.indexOf(this);
    if (i < 0) return;
    const wasTop = i === stack.length - 1;
    stack.splice(i, 1);
    // If an underlying overlay is removed first, carry its return target forward.
    // A later close must not restore focus into the removed/hidden overlay.
    for (const trap of stack) {
      if (trap.previous && this.root.contains(trap.previous)) trap.previous = this.previous;
    }
    const top = stack[stack.length - 1];
    const a = asEl(document.activeElement);
    if (a && this.root.contains(a) && (!top || !top.root.contains(a))) a.blur();
    releaseListener();
    if (
      wasTop &&
      this.previous &&
      canFocus(this.previous) &&
      (!top || top.root.contains(this.previous))
    )
      this.previous.focus();
    this.previous = null;
  }

  /** Final teardown; migrated consumers retain listener priority until disposal. */
  dispose(): void {
    if (this.disposed) return;
    this.hide();
    this.disposed = true;
    if (this.ownsKeyboard) {
      keyboardOwners--;
      this.ownsKeyboard = false;
    }
    releaseListener();
  }

  /** Focusable descendants in DOM order, skipping anything inside a `hidden` subtree. */
  focusables(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.tabIndex >= 0 && canFocus(el),
    );
  }

  /** Dispatch only for the current owner, even when a callback changes the stack. */
  handleKeyDown(e: KeyboardEvent): void {
    if (!this.isTop) return;
    if (e.key === 'Tab' || e.code === 'Tab') {
      // Legacy callers still need their own Tab side effects (binding capture, etc.).
      if (this.options.onEscape !== undefined) e.stopImmediatePropagation();
      this.options.onTab?.();
      this.handleTab(e);
    } else if (e.key === 'Escape' || e.code === 'Escape') {
      if (this.options.onEscape === undefined) return;
      // Consume before calling out: the callback may expose another overlay.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) this.options.onEscape?.();
    } else {
      this.options.onKeyDown?.(e);
    }
  }

  handleTab(e: KeyboardEvent): void {
    e.preventDefault();
    const items = this.focusables();
    if (!items.length) return;
    const a = asEl(document.activeElement);
    const i = a ? items.indexOf(a) : -1;
    let next: number;
    if (i < 0) next = e.shiftKey ? items.length - 1 : 0;
    else next = (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
    items[next]?.focus();
  }
}
