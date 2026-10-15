import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import {
  allSiteManifests,
  siteManifest,
  validateSiteManifest,
} from '../../src/core/SiteManifest.js';

const ids = (
  JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as { landmarks: string[] }
).landmarks;

describe('site manifest validator', () => {
  const cases: [string, unknown, string | null][] = [
    ['minimal', { id: 's' }, null],
    [
      'full',
      { id: 's', audio: { whaleHabitat: true }, events: { plume: { maxAltitudeM: 70 } } },
      null,
    ],
    ['not an object', 'x', 'site manifest "s": $: expected an object'],
    ['id mismatch', { id: 'other' }, 'site manifest "s": id: expected "s"'],
    [
      'missing field',
      { id: 's', events: { whale: {} } },
      'events.whale.maxDepthM: expected a positive number',
    ],
    [
      'wrong type',
      { id: 's', events: { plume: { maxAltitudeM: '70' } } },
      'events.plume.maxAltitudeM',
    ],
    [
      'wrong flag type',
      { id: 's', audio: { whaleHabitat: 1 } },
      'audio.whaleHabitat: expected a boolean',
    ],
    [
      'unknown field',
      { id: 's', events: { plume: { maxAltitudeM: 5, x: 1 } } },
      'events.plume.x: unknown field',
    ],
    ['unknown section', { id: 's', extra: {} }, '$.extra: unknown field'],
  ];
  it.each(cases)('%s', (_name, raw, error) => {
    if (error === null) expect(validateSiteManifest(raw, 's').id).toBe('s');
    else expect(() => validateSiteManifest(raw, 's')).toThrow(error);
  });
});

describe('shipped site manifests', () => {
  it('every landmark has a valid manifest, and unknown sites have none', () => {
    expect(
      allSiteManifests()
        .map((m) => m.id)
        .sort(),
    ).toEqual([...ids].sort());
    for (const id of ids) expect(siteManifest(id)?.id).toBe(id);
    expect(siteManifest('no-such-site')).toBeUndefined();
  });
});
