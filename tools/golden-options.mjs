/** Nightly defaults: High / desktop heroes plus every catalog mission opening. */
import bismarckPose from './bismarck-poses.json' with { type: 'json' };
import lowTierPoses from './lowtier-poses.json' with { type: 'json' };

export function goldenOptions(env = process.env) {
  const mode = env.GOLDEN_MODE ?? 'all';
  if (!['all', 'free-dive', 'mission'].includes(mode))
    throw new Error(`Unknown GOLDEN_MODE: ${mode}`);
  const tier = env.GOLDEN_TIER ?? 'high';
  if (!['low', 'medium', 'high'].includes(tier)) throw new Error(`Unknown GOLDEN_TIER: ${tier}`);
  const sizes = { desktop: [1600, 900], portrait: [390, 844], landscape: [844, 390] };
  const layouts = (
    env.GOLDEN_LAYOUTS ?? (mode === 'mission' ? 'desktop,portrait,landscape' : 'desktop')
  )
    .split(',')
    .map((name) => {
      if (!Object.hasOwn(sizes, name)) throw new Error(`Unknown GOLDEN_LAYOUTS: ${name}`);
      const [width, height] = sizes[name];
      return { name, width, height };
    });
  const aliases = {
    'blue-hole': 'great-blue-hole',
    monterey: 'monterey-canyon',
    axial: 'axial-seamount-ashes',
    kama: 'kamaehuakanaloa',
    hunga: 'hunga-tonga-caldera',
  };
  const only = env.GOLDEN_SITES?.split(',').map((site) => {
    const id = site.trim();
    return Object.hasOwn(aliases, id) ? aliases[id] : id;
  });
  if (only?.includes('all') && only.length !== 1)
    throw new Error('GOLDEN_SITES=all cannot be combined with individual sites');
  return { mode, tier, layouts, only, allSites: only?.[0] === 'all' };
}

/** Missions use the catalog once each, with no hero pose or gallery aliases. */
export function selectGoldenMissions(catalog, { only, allSites }) {
  if (only && !allSites && only.some((id) => !catalog.includes(id)))
    throw new Error(`Unknown GOLDEN_SITES for mission: ${only.join(',')}`);
  const selected = catalog.filter((id) => !only || allSites || only.includes(id));
  if (!selected.length) throw new Error('Empty mission catalog');
  return selected.map((id) => [id]);
}

/** One shared runner handles authored heroes and unmodified mission openings. */
export function goldenJobs(defaultHeroes, catalog, options) {
  const heroes =
    options.mode === 'mission' ? [] : selectGoldenHeroes(defaultHeroes, catalog, options);
  const missions =
    options.mode === 'free-dive'
      ? []
      : selectGoldenMissions(catalog, {
          ...options,
          only:
            options.mode === 'all' && options.only && !options.allSites
              ? [...new Set(heroes.map(([id]) => id))]
              : options.only,
        });
  return options.layouts.flatMap((layout) => [
    ...heroes.map((hero) => ({ layout, hero, mode: 'free-dive' })),
    ...missions.map((hero) => ({ layout, hero, mode: 'mission' })),
  ]);
}

export function goldenUrl(base, site, { mode, tier }, layout) {
  const url = new URL(base);
  url.search = new URLSearchParams({
    ...(mode === 'mission' ? { mission: site, skipBriefing: '1' } : { tile: site }),
    tutorial: '0',
    tier,
    lifeSeed: '42',
    dynres: '0',
    ...(layout !== 'desktop' ? { touch: '1' } : {}),
  }).toString();
  return url;
}

const extraHeroes = {
  'axial-seamount-ashes': 'mushroom-chimney',
  'hudson-canyon': 'coral-ledge-mound',
  kamaehuakanaloa: 'hiolo-north-pillows',
  bismarck: 'main-hull',
  'hunga-tonga-caldera': 'caldera-tuff-wall',
  'blake-plateau-corals': 'lophelia-mound',
};

export function selectGoldenHeroes(defaultHeroes, catalog, { only, allSites }) {
  const heroes = [...defaultHeroes];
  if (allSites || only) {
    for (const site of catalog) {
      if (heroes.some(([id]) => id === site) || (!allSites && !only.includes(site))) continue;
      if (!Object.hasOwn(extraHeroes, site))
        throw new Error(`No golden hero configured for catalog site: ${site}`);
      // Bismarck's box centre is buried in the slope; aim at its exposed upper side.
      heroes.push(
        site === 'bismarck'
          ? [site, extraHeroes[site], site, bismarckPose]
          : Object.hasOwn(lowTierPoses, site)
            ? [site, extraHeroes[site], site, lowTierPoses[site]]
            : [site, extraHeroes[site]],
      );
    }
  }
  const selected =
    allSites || !only
      ? heroes
      : heroes.filter(([site, , slug]) => only.includes(site) || only.includes(slug));
  if (
    !selected.length ||
    (!allSites &&
      only?.some((site) => !selected.some(([id, , slug]) => id === site || slug === site)))
  )
    throw new Error(`Unknown or empty GOLDEN_SITES: ${only?.join(',')}`);
  return selected;
}
