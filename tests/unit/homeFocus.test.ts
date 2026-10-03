import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from '../../src/ui/Home.js';

/** Small DOM surface for Home's initial/validated Continue focus policy. */
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
beforeEach(() => {
  const body = new Element();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { body, activeElement: body, createElement: () => new Element() });
  home = new Home({
    continueDive: vi.fn(),
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

describe('home Continue focus', () => {
  it('focuses Dive sites for a fresh save', () => {
    home.show();
    expect(home.continueButton.disabled).toBe(true);
    expect(focusedLabel()).toBe('Dive sites');
  });
  it('focuses saved Continue when home is shown again after a dive', () => {
    home.show();
    home.hide();
    home.setContinue('titanic');
    home.show();
    expect(document.activeElement).toBe(home.continueButton);
    expect(home.continueButton.title).toBe('Continue titanic');
  });
  it('moves focus to Dive sites when late catalogue validation rejects the saved mission', () => {
    home.setContinue('removed-mission');
    home.show();
    expect(document.activeElement).toBe(home.continueButton);
    home.setContinue(null);
    expect(home.continueButton.disabled).toBe(true);
    expect(focusedLabel()).toBe('Dive sites');
  });
  it('does not steal focus when Continue is validated while another action is focused', () => {
    home.show();
    const focused = document.activeElement;
    home.setContinue('titanic');
    home.setContinue(null);
    expect(document.activeElement).toBe(focused);
  });
});

it('makes globe pin targets 48px without changing or displacing their dots', () => {
  const pin = new Element();
  const dot = new Element();
  pin.append(dot);
  Object.assign(home.globeSlot, { querySelectorAll: () => [pin] });
  home.sizeGlobeTargets();
  home.sizeGlobeTargets();
  expect(pin.style).toEqual({ width: '48px', height: '48px', margin: '-24px 0 0 -24px' });
  expect(dot.style).toEqual({});
});
