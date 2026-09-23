/** Fix S: HUD depth sign (QA-B #3c), hull line (#2) and SEABED PROXIMITY rules (#14). */

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import {
  formatDepth,
  formatTileLine,
  seabedWarning,
  uiScaleFactors,
  type HudWarnConfig,
} from '../../src/ui/HUD.js';

const s = DEFAULT_CONFIG.submarine;
const W: HudWarnConfig = {
  hullRadius: s.hullRadius,
  seabedWarnAltitudeM: s.seabedWarnAltitudeM,
  seabedWarnTimeToContactS: s.seabedWarnTimeToContactS,
  seabedApproachAltitudeM: s.seabedApproachAltitudeM,
  contactAltitudeM: s.hullRadius + s.seabedClearance,
};

describe('formatDepth', () => {
  it('a boat above the water never reads as a positive depth', () => {
    expect(formatDepth(6.6, 8)).toBe('0 m · SURFACED');
    expect(formatDepth(-8, 8)).toBe('8 m · SURFACED');
    expect(formatDepth(-9, 8)).toBe('9 m');
    expect(formatDepth(-3812.4, 8)).toBe('3812 m');
    expect(Number.parseFloat(formatDepth(-8, 8))).toBe(8);
  });
});

describe('seabedWarning', () => {
  it('wreck inspection altitudes (12-25 m) are quiet near a scan target', () => {
    for (const alt of [12.5, 14, 18, 25]) expect(seabedWarning(alt, 0, W, true)).toBe(false);
    expect(seabedWarning(18, 0, W, false)).toBe(false); // above the 15 m static threshold
    expect(seabedWarning(13, 0, W, false)).toBe(true); // genuinely close, no target
  });

  it('a fast approach always warns, target or not', () => {
    // 40 m up, sinking 8 m/s: contact at 12 m in 3.5 s.
    expect(seabedWarning(40, -8, W, true)).toBe(true);
    expect(seabedWarning(40, -2, W, true)).toBe(false); // 14 s away
    expect(seabedWarning(40, 3, W, false)).toBe(false); // rising
    expect(seabedWarning(200, -20, W, false)).toBe(false); // above the approach band
  });
});

describe('formatTileLine', () => {
  it('shows the fitted hull class and rating', () => {
    const meta = { id: 'challenger-deep', cols: 10, rows: 10 };
    expect(formatTileLine(meta, 'C', -11000)).toBe('challenger-deep · hull C 11,000 m');
    expect(formatTileLine(meta, 'C', -11000, 'at rating limit')).toBe(
      'challenger-deep · hull C 11,000 m · at rating limit',
    );
  });
});

describe('UI scale factors', () => {
  it('clamps viewport and saved scale independently', () => {
    expect(uiScaleFactors(1280, 150)).toEqual({ auto: 0.8, user: 1.5 });
    expect(uiScaleFactors(1920, 100)).toEqual({ auto: 1, user: 1 });
    expect(uiScaleFactors(3000, 60)).toEqual({ auto: 1.25, user: 0.8 });
  });
});
