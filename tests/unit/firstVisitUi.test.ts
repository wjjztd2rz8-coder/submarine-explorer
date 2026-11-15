import { describe, expect, it } from 'vitest';
import { briefingIntroText } from '../../src/ui/Briefing.js';

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
