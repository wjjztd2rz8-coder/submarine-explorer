/** C5 settings screen, pure parts (src/ui/Settings.ts): rebinding plan and messages. */

import { describe, expect, it } from 'vitest';
import { defaultActions } from '../../src/core/Input.js';
import { keysText, planRebind, rebindMessage } from '../../src/ui/Settings.js';

describe('planRebind', () => {
  it('makes the key primary, keeps secondaries and lists displaced actions', () => {
    const actions = defaultActions();
    const plan = planRebind(actions, 'thrustForward', 'KeyX');
    expect(plan?.keys).toEqual(['KeyX', 'ArrowUp']);
    expect(plan?.displaced).toEqual([{ id: 'boost', label: 'Boost', remaining: [] }]);
    expect(rebindMessage('Ahead', 'KeyX', plan!)).toBe(
      'Ahead is now X. X was taken from Boost, which is now unbound.',
    );
  });

  it('reports what a partly displaced action keeps', () => {
    const plan = planRebind(defaultActions(), 'boost', 'ArrowUp');
    expect(plan?.displaced).toEqual([{ id: 'thrustForward', label: 'Ahead', remaining: ['KeyW'] }]);
    expect(rebindMessage('Boost', 'ArrowUp', plan!)).toContain('(still W)');
  });

  it('does not duplicate the key and refuses reserved keys or unknown actions', () => {
    const actions = defaultActions();
    expect(planRebind(actions, 'thrustForward', 'ArrowUp')?.keys).toEqual(['ArrowUp']);
    expect(planRebind(actions, 'boost', 'Escape')).toBeNull();
    expect(planRebind(actions, 'boost', 'Tab')).toBeNull();
    expect(planRebind(actions, 'nope' as never, 'KeyZ')).toBeNull();
  });

  it('labels keys and unbound actions', () => {
    expect(keysText(['KeyW', 'ArrowUp'])).toBe('W / Up');
    expect(keysText([])).toBe('Unbound');
  });
});
