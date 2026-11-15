import { describe, expect, it } from 'vitest';
import { briefingIntroText } from '../../src/ui/Briefing.js';
import { HOME_INTRO } from '../../src/ui/Home.js';

describe('HOME_INTRO', () => {
  it('is a plain sentence without marketing adjectives', () => {
    expect(HOME_INTRO).toBe('Dive to thirteen real ocean sites and scan what you find.');
    expect(HOME_INTRO).not.toMatch(/\b(epic|stunning|amazing)\b/i);
  });
});

describe('briefingIntroText', () => {
  it('keeps the first sentence and adds scan guidance', () => {
    const text = briefingIntroText(
      'Dive deep. Find the wreck. Then map the debris field nearby.',
      'Titanic dive',
    );
    expect(text).toMatch(/^Dive deep\./);
    expect(text).toContain('Follow the contacts and scan what you find.');
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
});
