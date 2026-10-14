/** Appearance rewards only; no physics, depth access or beam settings. */
type CosmeticReward =
  { kind: 'default' } | { kind: 'discoveries'; total: number } | { kind: 'secret' };
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
    reward: { kind: 'discoveries', total: 3 },
  },
  {
    id: 'blue',
    name: 'Blue',
    swatch: '#619dce',
    colors: { base: 0x619dce, accent: 0xdaeaf3 },
    reward: { kind: 'discoveries', total: 6 },
  },
  {
    id: 'green',
    name: 'Green',
    swatch: '#64aa90',
    colors: { base: 0x64aa90, accent: 0xe0e5ae },
    reward: { kind: 'discoveries', total: 10 },
  },
  {
    id: 'gold',
    name: 'Gold',
    swatch: '#d4b46b',
    colors: { base: 0xd4b46b, accent: 0xf5e9ca },
    reward: { kind: 'discoveries', total: 15 },
  },
  {
    id: 'orange',
    name: 'Orange',
    swatch: '#e89052',
    colors: { base: 0xe89052, accent: 0xf1e7d2 },
    reward: { kind: 'discoveries', total: 20 },
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
    reward: { kind: 'discoveries', total: 25 },
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
    reward: { kind: 'discoveries', total: 25 },
  },
] as const satisfies readonly (CosmeticDef & { color: number | null })[];

export const SUB_DECALS = [
  { id: 'stock', name: 'Stock', text: null, reward: { kind: 'default' } },
  {
    id: 'explorer',
    name: 'Explorer',
    text: { name: 'EXPLORER', number: 'SEA' },
    reward: { kind: 'discoveries', total: 5 },
  },
  {
    id: 'finder',
    name: 'Finder',
    text: { name: 'FINDER', number: 'FIND' },
    reward: { kind: 'secret' },
  },
] as const satisfies readonly (Omit<CosmeticDef, 'swatch'> & {
  text: { name: string; number: string } | null;
})[];
export const PHOTO_FRAMES = [
  { id: 'stock', name: 'None', color: null, reward: { kind: 'default' } },
  { id: 'white', name: 'White', color: '#e6e8e6', reward: { kind: 'discoveries', total: 3 } },
  { id: 'gold', name: 'Gold', color: '#d4b46b', reward: { kind: 'discoveries', total: 15 } },
] as const satisfies readonly (Omit<CosmeticDef, 'swatch'> & { color: string | null })[];
export const COSMETIC_CHOICES = {
  paint: HULL_PAINTS,
  decal: SUB_DECALS,
  frame: PHOTO_FRAMES,
  trim: LIGHT_TRIMS,
} as const;
export interface CosmeticSelection {
  paint: (typeof HULL_PAINTS)[number]['id'];
  decal: (typeof SUB_DECALS)[number]['id'];
  frame: (typeof PHOTO_FRAMES)[number]['id'];
  /** Retained for returning pilots; no separate lamp picker. */
  trim: (typeof LIGHT_TRIMS)[number]['id'];
}
export type CosmeticSlot = keyof CosmeticSelection;
export interface CosmeticProgress {
  ratings: Readonly<Record<string, number>>;
  awarded: readonly string[];
  dailyBestStreak: number;
  cosmeticGrants?: readonly string[];
}
export function defaultCosmetics(): CosmeticSelection {
  return { paint: 'stock', trim: 'stock', decal: 'stock', frame: 'stock' };
}
export function totalStars(progress: CosmeticProgress): number {
  return Object.values(progress.ratings).reduce((sum, stars) => sum + stars, 0);
}
/** Only discoveries count: objectives, star tokens, photos and sightings are not checklists. */
export function discoveryCount(progress: CosmeticProgress): number {
  return new Set(progress.awarded.filter((token) => /^(poi|species|sample|secret):.+/.test(token)))
    .size;
}
export function cosmeticUnlocked(
  def: Pick<CosmeticDef, 'id' | 'reward'>,
  progress: CosmeticProgress,
): boolean {
  if (
    progress.cosmeticGrants?.some((grant) => {
      const [slot, id] = grant.split(':');
      return (
        id === def.id && COSMETIC_CHOICES[slot as CosmeticSlot]?.some((choice) => choice === def)
      );
    })
  )
    return true;
  const reward = def.reward;
  switch (reward.kind) {
    case 'default':
      return true;
    case 'discoveries':
      return discoveryCount(progress) >= reward.total;
    case 'secret':
      return progress.awarded.some((token) => /^secret:[^/]+\/.+/.test(token));
  }
}
export function cosmeticRequirement(def: Pick<CosmeticDef, 'reward'>): string {
  switch (def.reward.kind) {
    case 'default':
      return 'Available';
    case 'discoveries':
      return `${def.reward.total} discoveries`;
    case 'secret':
      return 'Log a find';
  }
}
/** Unknown, malformed or unearned choices fall back independently to the current look. */
export function sanitizeCosmetics(raw: unknown, progress: CosmeticProgress): CosmeticSelection {
  const selection = defaultCosmetics();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return selection;
  const value = raw as Record<string, unknown>;
  for (const slot of Object.keys(COSMETIC_CHOICES) as CosmeticSlot[]) {
    const def = COSMETIC_CHOICES[slot].find((choice) => choice.id === value[slot]);
    if (def && cosmeticUnlocked(def, progress)) Object.assign(selection, { [slot]: def.id });
  }
  return selection;
}
