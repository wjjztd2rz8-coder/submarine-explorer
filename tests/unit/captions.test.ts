/** C5 caption queue (src/ui/Captions.ts): refresh-by-id, line limit, expiry. */

import { describe, expect, it } from 'vitest';
import { CaptionQueue } from '../../src/ui/Captions.js';

describe('CaptionQueue', () => {
  it('refreshes a repeated cue instead of stacking it', () => {
    const q = new CaptionQueue(2, 1.5);
    q.push({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 }, 0);
    q.push({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 }, 1);
    expect(q.lines()).toHaveLength(1);
    expect(q.lines()[0]?.expiresAt).toBeCloseTo(2.5); // min duration from the refresh
  });

  it('drops the oldest past the line limit and expires lines', () => {
    const q = new CaptionQueue(2, 1);
    q.push({ id: 'a', text: 'A', durationS: 5 }, 0);
    q.push({ id: 'b', text: 'B', durationS: 1 }, 0);
    q.push({ id: 'c', text: 'C', durationS: 2 }, 0);
    expect(q.lines().map((l) => l.text)).toEqual(['B', 'C']);
    expect(q.nextExpiry()).toBe(1);
    expect(q.prune(1.5)).toBe(true);
    expect(q.lines().map((l) => l.text)).toEqual(['C']);
    expect(q.prune(1.6)).toBe(false);
    q.clear();
    expect(q.nextExpiry()).toBeNull();
  });

  it('treats a non-finite duration as the minimum', () => {
    const q = new CaptionQueue(2, 1.5);
    q.push({ id: 'x', text: 'X', durationS: Number.NaN }, 10);
    expect(q.lines()[0]?.expiresAt).toBe(11.5);
  });
});
