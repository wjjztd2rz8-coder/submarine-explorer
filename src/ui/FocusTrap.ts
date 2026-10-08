/**
 * Keyboard focus trap for the DOM modals (briefing, debrief, field guide),
 * QA-B #12. While a trap is active, Tab / Shift+Tab cycle through the
 * focusable descendants of its root only, so buttons behind the card (DIVE
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

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Tab' && e.code !== 'Tab') return;
  const top = stack[stack.length - 1];
  if (!top) return;
  top.handleTab(e);
}

function asEl(x: unknown): HTMLElement | null {
  if (typeof HTMLElement !== 'undefined') return x instanceof HTMLElement ? x : null;
  return x && typeof (x as HTMLElement).blur === 'function' ? (x as HTMLElement) : null;
}

function hiddenByDetails(el: HTMLElement): boolean {
  const d = el.parentElement?.closest('details:not([open])');
  return !!d && !(el.tagName === 'SUMMARY' && el.parentElement === d);
}

export class FocusTrap {
  private previous: HTMLElement | null = null;
  constructor(private readonly root: HTMLElement) {}

  get active(): boolean {
    return stack.includes(this);
  }

  activate(): void {
    if (typeof document === 'undefined') return;
    if (!this.active) this.previous = asEl(document.activeElement);
    const i = stack.indexOf(this);
    if (i >= 0) stack.splice(i, 1);
    stack.push(this);
    if (!listening) {
      // Capture phase: runs before any other handler moves focus.
      window.addEventListener('keydown', onKeyDown, true);
      listening = true;
    }
    const a = asEl(document.activeElement);
    if (a && a !== document.body && !this.root.contains(a)) a.blur();
  }

  deactivate(): void {
    if (typeof document === 'undefined') return;
    const i = stack.indexOf(this);
    if (i < 0) return;
    const wasTop = i === stack.length - 1;
    if (i >= 0) stack.splice(i, 1);
    const a = asEl(document.activeElement);
    if (a && this.root.contains(a)) a.blur();
    if (!stack.length && listening) {
      window.removeEventListener('keydown', onKeyDown, true);
      listening = false;
    }
    const top = stack[stack.length - 1];
    if (
      wasTop &&
      this.previous?.isConnected &&
      this.previous.getClientRects().length &&
      (!top || top.root.contains(this.previous))
    )
      this.previous.focus();
    this.previous = null;
  }

  /** Focusable descendants in DOM order, skipping anything inside a `hidden` subtree. */
  focusables(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) =>
        el.tabIndex >= 0 &&
        !el.closest('[hidden], [inert]') &&
        // Content of a collapsed <details> keeps layout boxes but cannot take focus.
        !hiddenByDetails(el) &&
        el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility === 'visible',
    );
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
