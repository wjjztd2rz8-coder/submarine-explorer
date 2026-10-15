/** Fixed tiers for geometry/performance diagnostics; Auto is device dependent. */
export function diagnosticTiers(value = 'low,medium,high') {
  const tiers = value.split(',').map((tier) => tier.trim());
  for (const tier of tiers) {
    if (!['low', 'medium', 'high'].includes(tier))
      throw new Error(`Unknown diagnostic graphics tier: ${JSON.stringify(tier)}`);
  }
  return tiers;
}
