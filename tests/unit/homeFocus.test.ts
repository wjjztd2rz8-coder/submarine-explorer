import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from '../../src/ui/Home.js';

/** Small DOM surface for Home's primary Dive action and focus. */
class Element extends EventTarget {
  children: Element[] = [];
  hidden = false;
  disabled = false;
  className = '';
  textContent = '';
  title = '';
  style: Record<string, string> = {};
  isConnected = true;
  setAttribute() {}
  append(...children: Element[]) {
    this.children.push(...children);
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
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  home = new Home({
    dive,
    journal: vi.fn(),
    settings: vi.fn(),
    controls: vi.fn(),
  });
});
afterEach(() => {
  home.hide();
  vi.unstubAllGlobals();
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
