import { describe, expect, it } from 'vitest';
import { Disposables } from '../../src/app/Disposables.js';
import { EventBus } from '../../src/core/EventBus.js';
import { createSystems } from '../../src/app/systems.js';

/** An EventTarget that counts its live listeners. */
class CountingTarget extends EventTarget {
  live = 0;
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>): void {
    this.live++;
    super.addEventListener(...args);
  }
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>): void {
    this.live--;
    super.removeEventListener(...args);
  }
}

describe('Disposables', () => {
  it('init -> dispose -> init leaves one set of listeners and subscriptions', () => {
    const target = new CountingTarget();
    const bus = new EventBus();
    let fired = 0;
    const cleanup = new Disposables();
    const init = (): void => {
      cleanup.listen(target, 'keydown', () => {}, true);
      cleanup.listen(target, 'resize', () => {}, { once: true });
      cleanup.add(bus.on('app:state', () => fired++));
    };
    init();
    cleanup.dispose();
    expect(target.live).toBe(0);
    init();
    expect(target.live).toBe(2);
    bus.emit('app:state', { state: 'dive', previous: 'home' } as never);
    expect(fired).toBe(1);
    cleanup.dispose();
    cleanup.dispose();
    expect(target.live).toBe(0);
    bus.emit('app:state', { state: 'dive', previous: 'home' } as never);
    expect(fired).toBe(1);
  });

  it('systems that register listeners implement dispose', () => {
    const names = createSystems()
      .filter((s) => typeof s.dispose === 'function')
      .map((s) => s.name);
    for (const n of ['audio', 'pointer', 'power', 'rov', 'shellKeys', 'sonarControls', 'render'])
      expect(names).toContain(n);
  });
});
