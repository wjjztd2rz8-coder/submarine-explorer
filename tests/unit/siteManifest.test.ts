import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import {
  allSiteManifests,
  siteManifest,
  propManifest,
  validateSiteManifest,
} from '../../src/core/SiteManifest.js';

const eventSpot = {
  name: 'Vent plume',
  anchor: { lat: 1, lon: 2, altitudeM: 6 },
  contactRadiusM: 110,
  arrivalRadiusM: 40,
  headingDeg: 90,
};

const ids = (
  JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as { landmarks: string[] }
).landmarks;

describe('site manifest validator', () => {
  it('resolves omitted smoker defaults without changing the source profile', () => {
    const {
      topFraction: _top,
      throatColor: _throat,
      bodyShade: _shade,
      bodyGlow: _glow,
      ...smoker
    } = propManifest('beebe-chimney-1')!.smoker!;
    Object.freeze(smoker);
    const raw = { id: 's', props: { p: { smoker } } };
    const resolved = validateSiteManifest(raw, 's').props!.p!.smoker!;
    expect(resolved).toEqual({
      ...smoker,
      topFraction: 0.45,
      throatColor: 0,
      bodyShade: 0.95,
      bodyGlow: 0.16,
    });
    expect(smoker).not.toHaveProperty('topFraction');
    expect(smoker).not.toHaveProperty('throatColor');
    expect(smoker).not.toHaveProperty('bodyShade');
    expect(smoker).not.toHaveProperty('bodyGlow');
  });

  for (const key of ['bodyShade', 'bodyGlow']) {
    it.each([Number.MIN_VALUE, 0.01, 1])('preserves valid smoker ' + key + '=%s', (value) => {
      const smoker = { ...propManifest('beebe-chimney-1')!.smoker!, [key]: value };
      expect(
        validateSiteManifest({ id: 's', props: { p: { smoker } } }, 's').props!.p!.smoker,
      ).toEqual(smoker);
    });

    it.each([NaN, Infinity, -Infinity, -0.1, 0, 1 + Number.EPSILON, null, '0.5', true, {}, []])(
      'rejects malformed smoker ' + key + '=%s',
      (value) => {
        const smoker = { ...propManifest('beebe-chimney-1')!.smoker!, [key]: value };
        expect(() => validateSiteManifest({ id: 's', props: { p: { smoker } } }, 's')).toThrow(
          `props.p.smoker.${key}`,
        );
      },
    );
  }

  it.each([0, 0xffffff])('preserves throat RGB boundary %s', (throatColor) => {
    const smoker = { ...propManifest('beebe-chimney-1')!.smoker!, throatColor };
    expect(
      validateSiteManifest({ id: 's', props: { p: { smoker } } }, 's').props!.p!.smoker,
    ).toEqual(smoker);
  });

  it.each([0.01, 0.3, 1])(
    'preserves valid taper %s and an explicitly unlit throat',
    (topFraction) => {
      const smoker = { ...propManifest('beebe-chimney-1')!.smoker!, topFraction, throatColor: 0 };
      expect(
        validateSiteManifest({ id: 's', props: { p: { smoker } } }, 's').props!.p!.smoker,
      ).toEqual(smoker);
    },
  );

  it.each([
    ['topFraction', NaN],
    ['topFraction', Infinity],
    ['topFraction', -0.1],
    ['topFraction', 0],
    ['topFraction', 1.01],
    ['throatColor', NaN],
    ['throatColor', Infinity],
    ['throatColor', -Infinity],
    ['throatColor', null],
    ['throatColor', '16738330'],
    ['throatColor', true],
    ['throatColor', {}],
    ['throatColor', []],
    ['throatColor', 0.5],
    ['throatColor', -1],
    ['throatColor', 0x1000000],
    ['topMouthRadiusFraction', 0],
    ['outletBaseRadiusM', 0],
    ['outletTipRadiusM', 0],
    ['outletMouthRadiusM', 0],
  ])('rejects unsafe smoker %s=%s before geometry construction', (key, value) => {
    const smoker = { ...propManifest('beebe-chimney-1')!.smoker!, [key]: value };
    expect(() => validateSiteManifest({ id: 's', props: { p: { smoker } } }, 's')).toThrow(
      `props.p.smoker.${key}`,
    );
  });

  const cases: [string, unknown, string | null][] = [
    ['minimal', { id: 's' }, null],
    ['empty terrain', { id: 's', terrain: {} }, null],
    ...['canyon-bend', 'sinkhole'].map((carve): [string, unknown, null] => [
      `terrain carve ${carve}`,
      { id: 's', terrain: { carve } },
      null,
    ]),
    ...[null, [], 'terrain', 1].map((terrain): [string, unknown, string] => [
      `malformed terrain ${JSON.stringify(terrain)}`,
      { id: 's', terrain },
      'terrain: expected an object',
    ]),
    ['unknown terrain field', { id: 's', terrain: { typo: 1 } }, 'terrain.typo: unknown field'],
    ...['', ' ', 'monterey-canyon', 'great-blue-hole', 1, null, {}, []].map(
      (carve): [string, unknown, string] => [
        `invalid terrain carve ${JSON.stringify(carve)}`,
        { id: 's', terrain: { carve } },
        'terrain.carve: expected canyon-bend or sinkhole',
      ],
    ),
    ['empty sonar', { id: 's', sonar: {} }, null],
    ['disabled reef', { id: 's', sonar: { reef: false } }, null],
    [
      'sonar policies',
      { id: 's', sonar: { scourHullPoi: 'hull', maxContourIntervalM: 10, reef: true } },
      null,
    ],
    ...[null, [], 'sonar', 1].map((sonar): [string, unknown, string] => [
      `malformed sonar ${JSON.stringify(sonar)}`,
      { id: 's', sonar },
      'sonar: expected an object',
    ]),
    ['unknown sonar field', { id: 's', sonar: { typo: 1 } }, 'sonar.typo: unknown field'],
    ...['', ' ', 1, null, {}].map((scourHullPoi): [string, unknown, string] => [
      `invalid scour anchor ${JSON.stringify(scourHullPoi)}`,
      { id: 's', sonar: { scourHullPoi } },
      'sonar.scourHullPoi: expected a nonempty string',
    ]),
    ...[0, -1, NaN, Infinity, -Infinity, '10', null].map(
      (maxContourIntervalM): [string, unknown, string] => [
        `invalid contour cap ${maxContourIntervalM}`,
        { id: 's', sonar: { maxContourIntervalM } },
        'sonar.maxContourIntervalM',
      ],
    ),
    ...[1, 'true', null, {}].map((reef): [string, unknown, string] => [
      `invalid reef flag ${JSON.stringify(reef)}`,
      { id: 's', sonar: { reef } },
      'sonar.reef: expected a boolean',
    ]),
    ['empty scatter', { id: 's', scatter: {} }, null],
    ['disabled keepout', { id: 's', scatter: { keepoutHero: false } }, null],
    ['opening hero keepout', { ...siteManifest('challenger-deep'), id: 's' }, null],
    ['invalid scatter object', { id: 's', scatter: [] }, 'scatter: expected an object'],
    ['null scatter', { id: 's', scatter: null }, 'scatter: expected an object'],
    [
      'unknown scatter policy',
      { id: 's', scatter: { keepoutHeros: true } },
      'scatter.keepoutHeros: unknown field',
    ],
    ...['leggo-lander-marker', 1, null, {}].map((keepoutHero): [string, unknown, string] => [
      `invalid keepout flag ${JSON.stringify(keepoutHero)}`,
      { id: 's', scatter: { keepoutHero } },
      'scatter.keepoutHero: expected a boolean',
    ]),
    [
      'keepout requires the opening hero',
      { id: 's', scatter: { keepoutHero: true } },
      'scatter.keepoutHero: requires opening.freeDive.hero',
    ],
    [
      'reframe alone cannot bind keepout',
      {
        id: 's',
        scatter: { keepoutHero: true },
        opening: { reframe: siteManifest('challenger-deep')!.opening!.reframe },
      },
      'scatter.keepoutHero: requires opening.freeDive.hero',
    ],
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
    ['full', { id: 's', audio: { whaleHabitat: true }, events: { plume: eventSpot } }, null],
    ['not an object', 'x', 'site manifest "s": $: expected an object'],
    ['id mismatch', { id: 'other' }, 'site manifest "s": id: expected "s"'],
    [
      'missing field',
      { id: 's', events: { whale: {} } },
      'events.whale.name: expected a nonempty string',
    ],
    [
      'wrong type',
      { id: 's', events: { plume: { ...eventSpot, arrivalRadiusM: '40' } } },
      'events.plume.arrivalRadiusM',
    ],
    [
      'wrong flag type',
      { id: 's', audio: { whaleHabitat: 1 } },
      'audio.whaleHabitat: expected a boolean',
    ],
    [
      'unknown field',
      { id: 's', events: { plume: { ...eventSpot, x: 1 } } },
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

it('ships only authored sonar policies with an existing scour anchor', () => {
  const expected = new Map([
    ['endurance', { scourHullPoi: 'endurance-hull' }],
    ['great-blue-hole', { maxContourIntervalM: 10, reef: true }],
  ]);
  for (const id of ids) {
    const policy = siteManifest(id)!.sonar;
    expect(policy).toEqual(expected.get(id));
    if (policy?.scourHullPoi) {
      const { pois } = JSON.parse(readFileSync(`data/landmarks/${id}/pois.json`, 'utf8'));
      expect(pois.map((poi: { id: string }) => poi.id)).toContain(policy.scourHullPoi);
    }
  }
  expect(siteManifest('unknown')?.sonar).toBeUndefined();
});

describe('shipped site manifests', () => {
  it('ships hull-gated wreck policy only for its owning POI, shared with sonar', () => {
    for (const id of ids) {
      const manifest = siteManifest(id)!;
      if (id !== 'endurance') {
        expect(manifest.wreck).toBeUndefined();
        continue;
      }
      const { pois } = JSON.parse(readFileSync(`data/landmarks/${id}/pois.json`, 'utf8'));
      expect(manifest.wreck!.hullPoi).toBe('endurance-hull');
      expect(manifest.wreck!.hullPoi).toBe(manifest.sonar!.scourHullPoi);
      expect(pois.filter((poi: { id: string }) => poi.id === manifest.wreck!.hullPoi)).toHaveLength(
        1,
      );
    }
  });
  it('ships only the two authored terrain reconstructions', () => {
    const expected = new Map([
      ['monterey-canyon', { carve: 'canyon-bend' }],
      ['great-blue-hole', { carve: 'sinkhole' }],
    ]);
    for (const id of ids) expect(siteManifest(id)!.terrain).toEqual(expected.get(id));
    expect(siteManifest('unknown')?.terrain).toBeUndefined();
  });

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

  it('only Challenger reserves its existing opening hero, which belongs to its prop content', () => {
    const keepouts = allSiteManifests().filter((m) => m.scatter?.keepoutHero);
    expect(keepouts.map((m) => m.id)).toEqual(['challenger-deep']);
    for (const manifest of keepouts) {
      const hero = manifest.opening!.freeDive!.hero;
      const doc = JSON.parse(readFileSync(`data/landmarks/${manifest.id}/props.json`, 'utf8'));
      expect(hero).toBe('leggo-lander-marker');
      expect(doc.props.filter((p: { id: string }) => p.id === hero)).toHaveLength(1);
    }
  });
});

describe('site manifest wreck validation', () => {
  const wreck = siteManifest('endurance')!.wreck!;
  const wrap = (path: string, value: unknown) => {
    const [section, key] = path.split('.');
    return {
      id: 's',
      wreck: key
        ? { ...wreck, [section!]: { ...wreck[section as 'atmosphere' | 'horizon'], [key]: value } }
        : { ...wreck, [section!]: value },
    };
  };
  const cases: [string, unknown, string | null][] = [
    ['omitted policy', { id: 's' }, null],
    ['authored policy', { id: 's', wreck }, null],
    ['empty policy', { id: 's', wreck: {} }, 'wreck.hullPoi'],
    ...[null, [], 'wreck', 1].map((value): [string, unknown, string] => [
      `malformed policy ${JSON.stringify(value)}`,
      { id: 's', wreck: value },
      'wreck: expected an object',
    ]),
    ['unknown policy field', wrap('typo', true), 'wreck.typo: unknown field'],
    ...['atmosphere', 'horizon'].flatMap((section): [string, unknown, string][] => [
      [`missing ${section}`, wrap(section, undefined), `wreck.${section}`],
      [`empty ${section}`, wrap(section, {}), `wreck.${section}`],
      ...[null, [], 1].map((value): [string, unknown, string] => [
        `malformed ${section} ${JSON.stringify(value)}`,
        wrap(section, value),
        `wreck.${section}: expected an object`,
      ]),
      [
        `unknown ${section} field`,
        wrap(`${section}.typo`, 1),
        `wreck.${section}.typo: unknown field`,
      ],
    ]),
    ...['hullPoi', 'horizon.name'].flatMap((path) =>
      ['', ' ', 1, null, {}, []].map((value): [string, unknown, string] => [
        `invalid ${path} ${JSON.stringify(value)}`,
        wrap(path, value),
        `wreck.${path}: expected a nonempty string`,
      ]),
    ),
    ...[
      ...Object.keys(wreck.atmosphere).map((key) => `atmosphere.${key}`),
      ...Object.keys(wreck.horizon)
        .filter((key) => key !== 'name')
        .map((key) => `horizon.${key}`),
    ].flatMap((path) =>
      [NaN, Infinity, -Infinity, -1, '1', null].map((value): [string, unknown, string] => [
        `invalid ${path} ${String(value)}`,
        wrap(path, value),
        `wreck.${path}`,
      ]),
    ),
    ...[
      ['atmosphere.hazeParticles', 0.5],
      ['atmosphere.motesPerHull', 0.5],
      ['atmosphere.hazeSizeM', 0],
      ['atmosphere.moteSizeM', 0],
      ['atmosphere.maxSizePx', 0],
      ['atmosphere.hazeOpacity', 1.1],
      ['atmosphere.moteOpacity', 1.1],
      ['horizon.upperColor', 0.5],
      ['horizon.hazeColor', 0x1000000],
      ['horizon.hazePeakElevation', 0],
      ['horizon.hazePeakElevation', 1.1],
      ['horizon.fogHaze', 1.1],
    ].map(([path, value]): [string, unknown, string] => [
      `out of range ${path} ${value}`,
      wrap(path as string, value),
      `wreck.${path}`,
    ]),
    ...[
      'atmosphere.hazeParticles',
      'atmosphere.motesPerHull',
      'atmosphere.hazeOpacity',
      'atmosphere.moteOpacity',
      'atmosphere.maxBrightness',
      'horizon.fogLift',
      'horizon.fogHaze',
    ].map((path): [string, unknown, null] => [`allows disabled ${path}`, wrap(path, 0), null]),
  ];
  it.each(cases)('%s', (_name, raw, error) => {
    if (error === null)
      expect(validateSiteManifest(raw, 's').wreck).toEqual((raw as { wreck?: unknown }).wreck);
    else expect(() => validateSiteManifest(raw, 's')).toThrow(error);
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
  expect(seen.size).toBeGreaterThan(0);
  expect([...seen].sort()).toEqual(
    ids
      .flatMap((id) =>
        Object.keys(JSON.parse(readFileSync(`data/landmarks/${id}/site.json`, 'utf8')).props ?? {}),
      )
      .sort(),
  );
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

const LIFTED_FILL: Record<string, number> = {
  'blake-plateau-corals': 11,
  'hunga-tonga-caldera': 9,
  'axial-seamount-ashes': 14,
  'hudson-canyon': 15,
  bismarck: 18,
};

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
    'titanic',
  ];
  const allTiers = [
    'axial-seamount-ashes',
    'bismarck',
    'blake-plateau-corals',
    'hudson-canyon',
    'hunga-tonga-caldera',
    'kamaehuakanaloa',
    'titanic',
  ];
  for (const id of ids) {
    const atmosphere = siteManifest(id)!.atmosphere;
    if (id === 'monterey-canyon') {
      expect(atmosphere).toEqual({
        hemisphere: { name: 'montereyFill', sky: 0xa8bbc8, ground: 0x493d32, intensity: 3 },
        lamps: { intensity: 2, distance: 1.2, fillIntensity: 3, fillDistance: 1.5 },
      });
    } else if (id === 'great-blue-hole') {
      // A bluer column from the twilight stop down; no extra lights.
      expect(atmosphere).toEqual({
        water: { depthM: -20, waterColor: 0x15608c, fogColor: 0x1c4e76 },
      });
    } else if (low.includes(id)) {
      const tiers = allTiers.includes(id) ? ['low', 'medium', 'high'] : ['low'];
      expect(atmosphere).toEqual({
        // Beebe lamps sit below Titanic's so close sulfide keeps its texture while the hull and seabed still read.
        ...(id === 'beebe-vent-field'
          ? { lamps: { intensity: 2.4, distance: 1.2, fillIntensity: 2.4, fillDistance: 1.3 } }
          : {}),
        // Titanic keeps its lamps and a hemisphere fill so the wreck reads from the first frame.
        ...(id === 'titanic'
          ? {
              hemisphere: { name: 'titanicFill', sky: 0x4a6a7a, ground: 0x2a2218, intensity: 6 },
              key: {
                name: 'titanicKey',
                color: 0xc8d8d8,
                intensity: 4.5,
                direction: [-1, 0.7, -0.2],
              },
              lamps: { intensity: 3, distance: 1.2, fillIntensity: 2.5, fillDistance: 1.3 },
            }
          : {}),
        // Hunga's dim tuff slope gets stronger lamps so the rim and glow read on a phone.
        ...(id === 'hunga-tonga-caldera'
          ? { lamps: { intensity: 3, distance: 1.2, fillIntensity: 3.5, fillDistance: 1.4 } }
          : {}),
        tiers: Object.fromEntries(
          tiers.map((tier) => [
            tier,
            // Kamaʻehuakanaloa's spawn hangs in open water over a dark slope, so its fill is lifted.
            id === 'kamaehuakanaloa'
              ? { depthM: -200, color: 0x9aa6ad, intensity: 18 }
              : // Blake, Hunga, Axial and Hudson lift the same fill so the opening bed reads.
                id in LIFTED_FILL
                ? { depthM: -200, color: 0x6f8f9e, intensity: LIFTED_FILL[id] }
                : { depthM: -200, color: 0x879399, intensity: 6 },
          ]),
        ),
      });
    } else expect(atmosphere).toBeUndefined();
  }
});

describe('event anchor validation', () => {
  for (const [path, value] of [
    ['name', ' '],
    ['contactRadiusM', 0],
    ['arrivalRadiusM', -1],
    ['arrivalRadiusM', 110],
    ['arrivalRadiusM', 111],
    ['headingDeg', Infinity],
    ['anchor', {}],
    ['anchor', { lat: 0, lon: 0 }],
    ['anchor', { lat: 0, lon: 0, altitudeM: 6, depthM: 60 }],
    ['anchor', { lat: 91, lon: 0, depthM: 60 }],
    ['anchor', { lat: 0, lon: -181, depthM: 60 }],
    ['anchor', { lat: NaN, lon: 0, depthM: 60 }],
    ['anchor', { lat: 0, lon: 0, altitudeM: 0 }],
    ['anchor', { lat: 0, lon: 0, depthM: -60 }],
    ['anchor', { lat: 0, lon: 0, depthM: 60, x: 0 }],
  ] as const) {
    it(`rejects event ${path}=${JSON.stringify(value)}`, () => {
      expect(() =>
        validateSiteManifest({ id: 's', events: { plume: { ...eventSpot, [path]: value } } }, 's'),
      ).toThrow(`events.plume.${path}`);
    });
  }
});

describe('site manifest graded backdrop', () => {
  const horizon = siteManifest('blake-plateau-corals')!.horizon!;
  it('accepts the authored backdrop and rejects typos and bad values', () => {
    expect(validateSiteManifest({ id: 's', horizon }, 's').horizon).toEqual(horizon);
    expect(() => validateSiteManifest({ id: 's', horizon: { ...horizon, typo: 1 } }, 's')).toThrow(
      'horizon.typo: unknown field',
    );
    for (const key of Object.keys(horizon)) {
      expect(() =>
        validateSiteManifest({ id: 's', horizon: { ...horizon, [key]: -1 } }, 's'),
      ).toThrow(`horizon.${key}`);
    }
  });
  it('is authored only where the water above the seabed needs grading', () => {
    expect(
      allSiteManifests()
        .filter((m) => m.horizon)
        .map((m) => m.id),
    ).toEqual(['blake-plateau-corals', 'lost-city']);
  });
});

describe('opening depth and column colour', () => {
  const mission = { rangeM: 150, openingDepthM: 24 };
  it('accepts an authored mission opening depth and rejects a non-positive one', () => {
    expect(validateSiteManifest({ id: 's', opening: { mission } }, 's').opening?.mission).toEqual(
      mission,
    );
    for (const bad of [0, -5])
      expect(() =>
        validateSiteManifest(
          { id: 's', opening: { mission: { ...mission, openingDepthM: bad } } },
          's',
        ),
      ).toThrow('openingDepthM');
  });
  it('accepts a water column colour and rejects typos and surface depths', () => {
    const water = { depthM: -20, waterColor: 0x15608c, fogColor: 0x1c4e76 };
    expect(validateSiteManifest({ id: 's', atmosphere: { water } }, 's').atmosphere?.water).toEqual(
      water,
    );
    expect(() =>
      validateSiteManifest({ id: 's', atmosphere: { water: { ...water, depthM: 5 } } }, 's'),
    ).toThrow('depthM');
    expect(() =>
      validateSiteManifest({ id: 's', atmosphere: { water: { ...water, typo: 1 } } }, 's'),
    ).toThrow('water.typo: unknown field');
  });
  it('recolours only the sites that author it', () => {
    const blue = siteManifest('great-blue-hole')!;
    expect(blue.opening?.mission?.openingDepthM).toBeGreaterThan(0);
    expect(blue.atmosphere?.water).toBeDefined();
    expect(
      allSiteManifests()
        .filter((m) => m.opening?.mission?.openingDepthM !== undefined || m.atmosphere?.water)
        .map((m) => m.id),
    ).toEqual(['great-blue-hole']);
  });
});
