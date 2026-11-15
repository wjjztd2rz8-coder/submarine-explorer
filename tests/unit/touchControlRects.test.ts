import { afterEach, expect, it, vi } from 'vitest';
import { touchControlRects } from '../../src/ui/TouchControlRects.js';

afterEach(() => vi.unstubAllGlobals());

it('caches geometry across frames and held feedback, and refreshes for ancestor visibility and viewport events', () => {
  const win = new EventTarget();
  const root = { hidden: false, className: 'tc-root', parentElement: null, getAttribute: () => '' };
  const rect = { left: 10, right: 100, top: 200, bottom: 300 };
  const control = {
    hidden: false,
    className: 'tc-stick',
    parentElement: root,
    getAttribute: () => '',
    checkVisibility: vi.fn(() => !root.hidden && root.className === 'tc-root'),
    getBoundingClientRect: vi.fn(() => rect),
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { querySelectorAll: () => [control] });
  expect(touchControlRects()).toEqual([rect]);
  control.className = 'tc-stick is-held';
  for (let i = 0; i < 120; i++) expect(touchControlRects()).toEqual([rect]);
  expect(control.getBoundingClientRect).toHaveBeenCalledOnce();
  expect(control.checkVisibility).toHaveBeenCalledOnce();
  root.hidden = true;
  expect(touchControlRects()).toEqual([]);
  root.hidden = false;
  expect(touchControlRects()).toEqual([rect]);
  root.className = 'tc-root tc-sonar-open';
  expect(touchControlRects()).toEqual([]);
  root.className = 'tc-root';
  expect(touchControlRects()).toEqual([rect]);
  for (const type of ['resize', 'orientationchange']) {
    const before = control.getBoundingClientRect.mock.calls.length;
    win.dispatchEvent(new Event(type));
    expect(touchControlRects()).toEqual([rect]);
    expect(control.getBoundingClientRect).toHaveBeenCalledTimes(before + 1);
    touchControlRects();
    expect(control.getBoundingClientRect).toHaveBeenCalledTimes(before + 1);
  }
});
