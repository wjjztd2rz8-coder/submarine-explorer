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
    ['empty optional sections', { id: 's', opening: {}, life: {} }, null],
    [
      'opening and staged groups',
      {
        id: 's',
        opening: siteManifest('monterey-canyon')!.opening,
        life: siteManifest('monterey-canyon')!.life,
      },
      null,
    ],
    [
      'wreck opening',
      {
        id: 's',
        opening: siteManifest('endurance')!.opening,
        life: siteManifest('endurance')!.life,
      },
      null,
    ],
    ['mode override', { id: 's', opening: siteManifest('lost-city')!.opening }, null],
    [
      'missing opening range',
      { id: 's', opening: { freeDive: { hero: 'h', bearing: 0 } } },
      'opening.freeDive.range',
    ],
    [
      'negative altitude and zero offsets',
      {
        id: 's',
        opening: { freeDive: { hero: 'h', bearing: 0, range: 1, altitude: -28, chaseOffsetX: 0 } },
      },
      null,
    ],
    [
      'nonfinite bearing',
      { id: 's', opening: { freeDive: { hero: 'h', bearing: NaN, range: 1 } } },
      'opening.freeDive.bearing',
    ],
    [
      'negative mission range',
      { id: 's', opening: { mission: { rangeM: -1 } } },
      'opening.mission.rangeM',
    ],
    [
      'unknown mode',
      { id: 's', opening: { freeDive: { hero: 'h', bearing: 0, range: 1, modes: { easy: {} } } } },
      'opening.freeDive.modes.easy: unknown field',
    ],
    [
      'unknown camera flag',
      { id: 's', opening: { camera: { applyDefault: true } } },
      'opening.camera.applyDefault: unknown field',
    ],
    [
      'wrong camera flag',
      { id: 's', opening: { camera: { applyDefaults: 1 } } },
      'opening.camera.applyDefaults',
    ],
    [
      'missing reframe altitude',
      { id: 's', opening: { reframe: { hero: 'h', range: 1, yawOffset: 0 } } },
      'opening.reframe.altitude',
    ],
    [
      'unknown life strategy',
      { id: 's', life: { opening: { strategy: 'fish' } } },
      'life.opening.strategy',
    ],
    [
      'unknown life field',
      { id: 's', life: { opening: { ...siteManifest('endurance')!.life!.opening, typo: 1 } } },
      'life.opening.typo: unknown field',
    ],
    [
      'missing wreck mesh',
      {
        id: 's',
        life: { opening: { ...siteManifest('endurance')!.life!.opening, mesh: undefined } },
      },
      'wreck habitat requires mesh and deckPatch',
    ],
    [
      'negative population',
      { id: 's', life: { opening: { ...siteManifest('endurance')!.life!.opening, low: -1 } } },
      'life.opening.low',
    ],
    [
      'fractional population',
      { id: 's', life: { opening: { ...siteManifest('endurance')!.life!.opening, count: 1.5 } } },
      'life.opening.count',
    ],
    [
      'bad group offset',
      {
        id: 's',
        life: {
          opening: {
            ...siteManifest('monterey-canyon')!.life!.opening,
            groups: [{ species: 'fish', low: 0, count: 1, offset: [1, 2] }],
          },
        },
      },
      'life.opening.groups.0.offset',
    ],
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
