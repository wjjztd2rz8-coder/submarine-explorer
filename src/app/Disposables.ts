/**
 * Teardown bookkeeping for systems (F1-FIXES, F0-CORE audit finding 3). A
 * system registers its window/DOM listeners, bus and save subscriptions
 * through one of these in `init`, and calls `dispose()` from its own
 * `dispose()` so an in-page restart does not stack a second set on top.
 */

type Off = () => void;

export class Disposables {
  private offs: Off[] = [];

  /** Add a window/document/element listener; removed on dispose. */
  listen<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K | (string & {}),
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const fn = handler as EventListener;
    target.addEventListener(type, fn, options);
    this.offs.push(() => target.removeEventListener(type, fn, options));
  }

  /** Track an unsubscribe function (`bus.on`, `save.onChange`); returns it unchanged. */
  add(off: Off): Off {
    this.offs.push(off);
    return off;
  }

  /** Run every teardown, newest first. Safe to call twice; reusable afterwards. */
  dispose(): void {
    for (const off of this.offs.reverse()) off();
    this.offs = [];
  }
}
