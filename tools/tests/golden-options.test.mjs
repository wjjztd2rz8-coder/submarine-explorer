import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goldenOptions } from '../golden-options.mjs';
import bismarckPose from '../bismarck-poses.json' with { type: 'json' };
import lowTierPoses from '../lowtier-poses.json' with { type: 'json' };

test('nightly defaults remain High desktop and the original hero selection', () => {
  assert.deepEqual(goldenOptions({}), {
    tier: 'high',
    layouts: [{ name: 'desktop', width: 1600, height: 900 }],
    only: undefined,
    allSites: false,
  });
});
test('Low all-site sweep uses exact portrait and landscape phone sizes', () => {
  assert.deepEqual(
    goldenOptions({
      GOLDEN_TIER: 'low',
      GOLDEN_LAYOUTS: 'portrait,landscape',
      GOLDEN_SITES: 'all',
    }),
    {
      tier: 'low',
      layouts: [
        { name: 'portrait', width: 390, height: 844 },
        { name: 'landscape', width: 844, height: 390 },
      ],
      only: ['all'],
      allSites: true,
    },
  );
});
test('site aliases and whitespace remain supported', () => {
  assert.deepEqual(goldenOptions({ GOLDEN_SITES: 'blue-hole, monterey' }).only, [
    'great-blue-hole',
    'monterey-canyon',
  ]);
});
test('invalid sweep settings fail before browser launch', () => {
  for (const env of [
    { GOLDEN_TIER: 'auto' },
    { GOLDEN_LAYOUTS: 'phone' },
    { GOLDEN_LAYOUTS: 'constructor' },
    { GOLDEN_SITES: 'all,titanic' },
  ])
    assert.throws(() => goldenOptions(env), /Unknown|cannot be combined/);
});

test('all-site hero selection covers the live catalog with valid prop IDs and fails closed on new sites', async () => {
  const { readFile } = await import('node:fs/promises');
  const { selectGoldenHeroes } = await import('../golden-options.mjs');
  const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const catalog = (await read('../../data/landmarks/index.json')).landmarks;
  const defaults = [
    ['titanic', 'bow-hull'],
    ['lost-city', 'poseidon-tower'],
    ['great-blue-hole', 'karst-grotto'],
    ['great-blue-hole', 'karst-grotto-east', 'great-blue-hole-east'],
    ['beebe-vent-field', 'beebe-chimney-1'],
    ['monterey-canyon', 'canyon-wall-ledge'],
    ['challenger-deep', 'leggo-lander-marker'],
    ['endurance', 'main-hull'],
  ];
  assert.deepEqual(selectGoldenHeroes(defaults, catalog, goldenOptions({})), defaults);
  const selected = selectGoldenHeroes(defaults, catalog, goldenOptions({ GOLDEN_SITES: 'all' }));
  assert.equal(catalog.length, 13);
  assert.deepEqual([...new Set(selected.map(([site]) => site))].sort(), [...catalog].sort());
  assert.equal(selected.length, 14); // Two galleries in Blue Hole.
  for (const [site, hero] of selected) {
    const props = (await read(`../../data/landmarks/${site}/props.json`)).props;
    assert.ok(
      props.some(({ id }) => id === hero),
      `${site}: missing ${hero}`,
    );
  }
  assert.deepEqual(
    selectGoldenHeroes(defaults, catalog, goldenOptions({ GOLDEN_SITES: 'bismarck' })),
    [['bismarck', 'main-hull', 'bismarck', bismarckPose]],
  );
  assert.throws(
    () => selectGoldenHeroes(defaults, catalog, goldenOptions({ GOLDEN_SITES: 'typo' })),
    /Unknown or empty/,
  );
  assert.throws(
    () =>
      selectGoldenHeroes(
        defaults,
        [...catalog, 'new-site'],
        goldenOptions({ GOLDEN_SITES: 'all' }),
      ),
    /No golden hero/,
  );
});

test('Low follow-up captures frame the pillow field and exposed tuff wall using their authored poses', async () => {
  const { selectGoldenHeroes } = await import('../golden-options.mjs');
  assert.deepEqual(
    selectGoldenHeroes(
      [],
      ['kamaehuakanaloa', 'hunga-tonga-caldera'],
      goldenOptions({ GOLDEN_TIER: 'low', GOLDEN_SITES: 'kamaehuakanaloa,hunga-tonga-caldera' }),
    ),
    [
      ['kamaehuakanaloa', 'hiolo-north-pillows', 'kamaehuakanaloa', lowTierPoses.kamaehuakanaloa],
      [
        'hunga-tonga-caldera',
        'caldera-tuff-wall',
        'hunga-tonga-caldera',
        lowTierPoses['hunga-tonga-caldera'],
      ],
    ],
  );
});
