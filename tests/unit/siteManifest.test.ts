import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import {
  allSiteManifests,
  siteManifest,
  propManifest,
  validateSiteManifest,
} from '../../src/core/SiteManifest.js';

const ids = (
  JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as { landmarks: string[] }
).landmarks;

describe('site manifest validator', () => {
  const cases: [string, unknown, string | null][] = [
    ['minimal', { id: 's' }, null],
    [
      'gallery apron',
      { id: 's', props: { p: { galleryApron: propManifest('karst-grotto')!.galleryApron } } },
      null,
    ],
    [
      'missing apron dimensions',
      { id: 's', props: { p: { galleryApron: {} } } },
      'props.p.galleryApron.bedHeightM',
    ],
    [
      'unknown apron field',
      {
        id: 's',
        props: { p: { galleryApron: { ...propManifest('karst-grotto')!.galleryApron, typo: 1 } } },
      },
      'props.p.galleryApron.typo: unknown field',
    ],
    ['empty props', { id: 's', props: {} }, null],
    [
      'prop policies',
      {
        id: 's',
        props: {
          p: {
            habitat: false,
            mineralCrust: false,
            apronHabitat: true,
            grounding: 'rendered',
            grotto: 'hood',
            seabed: { biome: 'b' },
          },
        },
      },
      null,
    ],
    ['chimney profiles', { id: 's', props: siteManifest('beebe-vent-field')!.props }, null],
    ['invalid props object', { id: 's', props: [] }, 'props: expected an object'],
    ['invalid prop row', { id: 's', props: { p: null } }, 'props.p: expected an object'],
    ['empty prop id', { id: 's', props: { '': {} } }, 'props: expected a nonempty string'],
    [
      'unknown prop field',
      { id: 's', props: { p: { habitual: true } } },
      'props.p.habitual: unknown field',
    ],
    [
      'invalid habitat flag',
      { id: 's', props: { p: { habitat: 1 } } },
      'props.p.habitat: expected a boolean',
    ],
    [
      'invalid crust flag',
      { id: 's', props: { p: { mineralCrust: 'yes' } } },
      'props.p.mineralCrust: expected a boolean',
    ],
    [
      'invalid apron flag',
      { id: 's', props: { p: { apronHabitat: {} } } },
      'props.p.apronHabitat: expected a boolean',
    ],
    [
      'unknown grounding',
      { id: 's', props: { p: { grounding: 'bed' } } },
      'props.p.grounding: expected rendered',
    ],
    [
      'unknown grotto',
      { id: 's', props: { p: { grotto: 'east' } } },
      'props.p.grotto: expected hood',
    ],
    [
      'missing biome',
      { id: 's', props: { p: { seabed: {} } } },
      'props.p.seabed.biome: expected a nonempty string',
    ],
    [
      'unknown seabed field',
      { id: 's', props: { p: { seabed: { biome: 'b', extra: true } } } },
      'props.p.seabed.extra: unknown field',
    ],
    ['missing smoker profile', { id: 's', props: { p: { smoker: {} } } }, 'props.p.smoker.ledge'],
    [
      'unknown profile field',
      {
        id: 's',
        props: { p: { smoker: { ...propManifest('beebe-chimney-1')!.smoker, typo: 1 } } },
      },
      'props.p.smoker.typo: unknown field',
    ],
    [
      'nonfinite profile',
      {
        id: 's',
        props: { p: { smoker: { ...propManifest('beebe-chimney-1')!.smoker, wobble: Infinity } } },
      },
      'props.p.smoker.wobble: expected a finite number',
    ],
    [
      'negative shape',
      {
        id: 's',
        props: { p: { smoker: { ...propManifest('beebe-chimney-1')!.smoker, lip: -1 } } },
      },
      'props.p.smoker.lip: expected a positive number',
    ],
    [
      'fractional shelf count',
      {
        id: 's',
        props: { p: { smoker: { ...propManifest('beebe-chimney-1')!.smoker, mainShelves: 0.5 } } },
      },
      'props.p.smoker.mainShelves: expected a nonnegative integer',
    ],
    [
      'invalid color',
      {
        id: 's',
        props: {
          p: { smoker: { ...propManifest('beebe-chimney-1')!.smoker, mouthColor: 0x1000000 } },
        },
      },
      'props.p.smoker.mouthColor: expected a color',
    ],
    [
      'missing side shape',
      {
        id: 's',
        props: {
          p: { chimney: { ...propManifest('beebe-chimney-2')!.chimney, shape: undefined } },
        },
      },
      'props.p.chimney.shape: expected an object',
    ],
    [
      'fractional flange count',
      {
        id: 's',
        props: { p: { chimney: { ...propManifest('beebe-chimney-2')!.chimney, flanges: 1.5 } } },
      },
      'props.p.chimney.flanges: expected a nonnegative integer',
    ],
    [
      'signed lean and angle',
      {
        id: 's',
        props: {
          p: { chimney: { ...propManifest('beebe-chimney-2')!.chimney, lean: 0, leanDir: -1 } },
        },
      },
      null,
    ],
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
    expect(propManifest('no-such-prop')).toBeUndefined();
  });
});

it('binds each authored prop profile once in its owning content pack', () => {
  const seen = new Set<string>();
  const owners = new Map<string, string[]>();
  for (const site of ids) {
    const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')) as {
      props: { id: string }[];
    };
    for (const prop of doc.props) owners.set(prop.id, [...(owners.get(prop.id) ?? []), site]);
  }
  for (const manifest of allSiteManifests()) {
    const doc = JSON.parse(readFileSync(`data/landmarks/${manifest.id}/props.json`, 'utf8')) as {
      props: { id: string }[];
    };
    for (const [id, tuning] of Object.entries(manifest.props ?? {})) {
      expect(seen.has(id)).toBe(false);
      expect(doc.props.some((prop) => prop.id === id)).toBe(true);
      expect(propManifest(id)).toBe(tuning);
      expect(owners.get(id)).toEqual([manifest.id]);
      if (tuning.seabed) expect(siteManifest(tuning.seabed.biome)).toBeDefined();
      seen.add(id);
    }
  }
  expect(seen.size).toBe(6);
});

describe('site manifest atmosphere validation', () => {
  const floor = { depthM: -200, color: 0x879399, intensity: 6 };
  const hemisphere = { name: 'fill', sky: 0xa8bbc8, ground: 0x493d32, intensity: 3 };
  const lamps = { intensity: 2, distance: 1.2, fillIntensity: 3, fillDistance: 1.5 };
  const wrap = (path: string, value: unknown) => ({
    id: 's',
    atmosphere: path.startsWith('tiers.')
      ? { tiers: { [path.slice(6)]: value } }
      : { [path]: value },
  });
  const cases: [string, unknown, string | null][] = [
    ['absent', { id: 's' }, null],
    ['empty section', { id: 's', atmosphere: {} }, null],
    ['empty tiers', { id: 's', atmosphere: { tiers: {} } }, null],
    ['unknown section field', wrap('fog', {}), 'atmosphere.fog: unknown field'],
    ['unknown tier', wrap('tiers.ultra', floor), 'atmosphere.tiers.ultra: unknown field'],
    ['zero floor', wrap('tiers.low', { depthM: 0, color: 0, intensity: 0 }), null],
    [
      'zero lamps',
      wrap('lamps', { intensity: 0, distance: 0, fillIntensity: 0, fillDistance: 0 }),
      null,
    ],
    ['zero fill', wrap('hemisphere', { ...hemisphere, intensity: 0 }), null],
    ['positive depth', wrap('tiers.low', { ...floor, depthM: 200 }), 'atmosphere.tiers.low.depthM'],
    [
      'blank light name',
      wrap('hemisphere', { ...hemisphere, name: ' ' }),
      'atmosphere.hemisphere.name',
    ],
  ];
  for (const value of [null, [], 'water', 1]) {
    cases.push([
      'malformed section',
      { id: 's', atmosphere: value },
      'atmosphere: expected an object',
    ]);
    cases.push(['malformed tiers', wrap('tiers', value), 'atmosphere.tiers: expected an object']);
  }
  const rows: [string, Record<string, unknown>][] = [
    ['hemisphere', hemisphere],
    ['lamps', lamps],
    ...(['low', 'medium', 'high'] as const).map((tier): [string, Record<string, unknown>] => [
      `tiers.${tier}`,
      floor,
    ]),
  ];
  for (const [path, row] of rows) {
    cases.push([`${path} alone`, wrap(path, row), null]);
    for (const value of [null, [], 'invalid'])
      cases.push([
        `malformed ${path}`,
        wrap(path, value),
        `atmosphere.${path}: expected an object`,
      ]);
    cases.push([
      `unknown ${path} field`,
      wrap(path, { ...row, typo: 1 }),
      `atmosphere.${path}.typo: unknown field`,
    ]);
    for (const [key, value] of Object.entries(row)) {
      const field = `atmosphere.${path}.${key}`;
      cases.push([`missing ${field}`, wrap(path, { ...row, [key]: undefined }), field]);
      cases.push([
        `wrong type ${field}`,
        wrap(path, { ...row, [key]: typeof value === 'number' ? '1' : 1 }),
        field,
      ]);
      if (typeof value !== 'number') continue;
      for (const invalid of [NaN, Infinity, -Infinity])
        cases.push([
          `nonfinite ${field}: ${invalid}`,
          wrap(path, { ...row, [key]: invalid }),
          field,
        ]);
      if (key === 'depthM') continue;
      cases.push([`negative ${field}`, wrap(path, { ...row, [key]: -1 }), field]);
      if (['sky', 'ground', 'color'].includes(key))
        for (const invalid of [0x1000000, 1.5])
          cases.push([
            `invalid color ${field}: ${invalid}`,
            wrap(path, { ...row, [key]: invalid }),
            field,
          ]);
    }
  }
  it.each(cases)('%s', (_name, raw, error) => {
    const before = structuredClone(raw);
    if (error === null) validateSiteManifest(raw, 's');
    else expect(() => validateSiteManifest(raw, 's')).toThrow(error);
    expect(raw).toEqual(before);
  });
});

it('ships exactly the authored atmosphere policies and leaves other sites absent', () => {
  const low = [
    'axial-seamount-ashes',
    'beebe-vent-field',
    'bismarck',
    'blake-plateau-corals',
    'hudson-canyon',
    'hunga-tonga-caldera',
    'kamaehuakanaloa',
    'lost-city',
  ];
  const allTiers = ['bismarck', 'blake-plateau-corals', 'hudson-canyon', 'hunga-tonga-caldera'];
  for (const id of ids) {
    const atmosphere = siteManifest(id)!.atmosphere;
    if (id === 'monterey-canyon') {
      expect(atmosphere).toEqual({
        hemisphere: { name: 'montereyFill', sky: 0xa8bbc8, ground: 0x493d32, intensity: 3 },
        lamps: { intensity: 2, distance: 1.2, fillIntensity: 3, fillDistance: 1.5 },
      });
    } else if (low.includes(id)) {
      const tiers = allTiers.includes(id) ? ['low', 'medium', 'high'] : ['low'];
      expect(atmosphere).toEqual({
        tiers: Object.fromEntries(
          tiers.map((tier) => [tier, { depthM: -200, color: 0x879399, intensity: 6 }]),
        ),
      });
    } else expect(atmosphere).toBeUndefined();
  }
});
