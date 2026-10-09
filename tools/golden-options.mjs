/** Opt-in capture settings; nightly defaults stay High / desktop / hero sites. */
import bismarckPose from './bismarck-poses.json' with { type: 'json' };
import lowTierPoses from './lowtier-poses.json' with { type: 'json' };

export function goldenOptions(env = process.env) {
  const tier = env.GOLDEN_TIER ?? 'high';
  if (!['low', 'medium', 'high', 'ultra'].includes(tier))
    throw new Error(`Unknown GOLDEN_TIER: ${tier}`);
  const sizes = { desktop: [1600, 900], portrait: [390, 844], landscape: [844, 390] };
  const layouts = (env.GOLDEN_LAYOUTS ?? 'desktop').split(',').map((name) => {
    if (!Object.hasOwn(sizes, name)) throw new Error(`Unknown GOLDEN_LAYOUTS: ${name}`);
    const [width, height] = sizes[name];
    return { name, width, height };
  });
  const only = env.GOLDEN_SITES?.split(',').map(
    (site) =>
      ({ 'blue-hole': 'great-blue-hole', monterey: 'monterey-canyon' })[site.trim()] ?? site.trim(),
  );
  if (only?.includes('all') && only.length !== 1)
    throw new Error('GOLDEN_SITES=all cannot be combined with individual sites');
  return { tier, layouts, only, allSites: only?.[0] === 'all' };
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
