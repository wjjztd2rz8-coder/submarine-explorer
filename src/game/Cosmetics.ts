/** Appearance rewards only; no physics, depth access or beam settings. */
export type CosmeticReward =
  | { kind: 'default' }
  | { kind: 'stars'; total: number }
  | { kind: 'hero'; stars: number }
  | { kind: 'secret' }
  | { kind: 'daily'; streak: number };
export interface HullPaint {
  base: number;
  accent: number;
}
export interface CosmeticDef {
  id: string;
  name: string;
  swatch: string;
  reward: CosmeticReward;
}
export const HERO_SITES = [
  'titanic',
  'lost-city',
  'great-blue-hole',
  'beebe-vent-field',
  'monterey-canyon',
] as const;

export const HULL_PAINTS = [
  { id: 'stock', name: 'Stock', swatch: '#e6e8e6', colors: null, reward: { kind: 'default' } },
  {
    id: 'red',
    name: 'Red',
    swatch: '#da655b',
    colors: { base: 0xda655b, accent: 0xf5d7ad },
    reward: { kind: 'stars', total: 3 },
  },
  {
    id: 'blue',
    name: 'Blue',
    swatch: '#619dce',
    colors: { base: 0x619dce, accent: 0xdaeaf3 },
    reward: { kind: 'stars', total: 6 },
  },
  {
    id: 'green',
    name: 'Green',
    swatch: '#64aa90',
    colors: { base: 0x64aa90, accent: 0xe0e5ae },
    reward: { kind: 'stars', total: 10 },
  },
  {
    id: 'gold',
    name: 'Gold',
    swatch: '#d4b46b',
    colors: { base: 0xd4b46b, accent: 0xf5e9ca },
    reward: { kind: 'stars', total: 15 },
  },
  {
    id: 'orange',
    name: 'Orange',
    swatch: '#e89052',
    colors: { base: 0xe89052, accent: 0xf1e7d2 },
    reward: { kind: 'hero', stars: 3 },
  },
  {
    id: 'violet',
    name: 'Violet',
    swatch: '#a68ec8',
    colors: { base: 0xa68ec8, accent: 0xe5dcef },
    reward: { kind: 'secret' },
  },
  {
    id: 'silver',
    name: 'Silver',
    swatch: '#abbcc8',
    colors: { base: 0xabbcc8, accent: 0x5d93b4 },
    reward: { kind: 'daily', streak: 3 },
  },
] as const satisfies readonly (CosmeticDef & { colors: HullPaint | null })[];

export const LIGHT_TRIMS = [
  { id: 'stock', name: 'Stock', swatch: '#ffffff', color: null, reward: { kind: 'default' } },
  { id: 'amber', name: 'Amber', swatch: '#ffd49a', color: 0xffd49a, reward: { kind: 'secret' } },
  {
    id: 'blue',
    name: 'Blue',
    swatch: '#a8ddff',
    color: 0xa8ddff,
    reward: { kind: 'daily', streak: 3 },
  },
] as const satisfies readonly (CosmeticDef & { color: number | null })[];

export interface CosmeticSelection {
  paint: (typeof HULL_PAINTS)[number]['id'];
  trim: (typeof LIGHT_TRIMS)[number]['id'];
}
export type CosmeticSlot = keyof CosmeticSelection;
export interface CosmeticProgress {
  ratings: Readonly<Record<string, number>>;
  awarded: readonly string[];
  dailyBestStreak: number;
}
export function defaultCosmetics(): CosmeticSelection {
  return { paint: 'stock', trim: 'stock' };
}
export function totalStars(progress: CosmeticProgress): number {
  return Object.values(progress.ratings).reduce((sum, stars) => sum + stars, 0);
}
export function cosmeticUnlocked(def: CosmeticDef, progress: CosmeticProgress): boolean {
  const reward = def.reward;
  switch (reward.kind) {
    case 'default':
      return true;
    case 'stars':
      return totalStars(progress) >= reward.total;
    case 'hero':
      return HERO_SITES.some(
        (site) => Object.hasOwn(progress.ratings, site) && progress.ratings[site] >= reward.stars,
      );
    case 'secret':
      return progress.awarded.some((token) => /^secret:[^/]+\/.+/.test(token));
    case 'daily':
      return progress.dailyBestStreak >= reward.streak;
  }
}
export function cosmeticRequirement(def: CosmeticDef): string {
  const reward = def.reward;
  switch (reward.kind) {
    case 'default':
      return 'Available';
    case 'stars':
      return `${reward.total} total stars`;
    case 'hero':
      return `${reward.stars} stars at a hero site`;
    case 'secret':
      return 'Find a secret';
    case 'daily':
      return `${reward.streak}-day Daily streak`;
  }
}
/** Unknown, malformed or unearned choices fall back independently to the current look. */
export function sanitizeCosmetics(raw: unknown, progress: CosmeticProgress): CosmeticSelection {
  const selection = defaultCosmetics();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return selection;
  const value = raw as Record<string, unknown>;
  const paint = HULL_PAINTS.find((def) => def.id === value.paint);
  const trim = LIGHT_TRIMS.find((def) => def.id === value.trim);
  if (paint && cosmeticUnlocked(paint, progress)) selection.paint = paint.id;
  if (trim && cosmeticUnlocked(trim, progress)) selection.trim = trim.id;
  return selection;
}
