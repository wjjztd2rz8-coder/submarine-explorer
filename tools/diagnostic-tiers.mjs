/** Fixed tiers for geometry/performance diagnostics; Auto is device dependent. */
export function diagnosticTiers(value = 'low,medium,high') {
  const tiers = value.split(',').map((tier) => tier.trim());
  for (const tier of tiers) {
    if (!['low', 'medium', 'high'].includes(tier))
      throw new Error(`Unknown diagnostic graphics tier: ${JSON.stringify(tier)}`);
  }
  return tiers;
}

/** Match the desktop and portrait mission captures; use CSS pixels, not render scale. */
export const diagnosticViewports = [
  { width: 1600, height: 900 },
  { width: 390, height: 844 },
];
