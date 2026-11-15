import type { Progress } from './Progress.js';
import type { ProgressRecord } from '../core/Save.js';
import { loadJournalSites, type JournalSite, type DiscoveryReader } from './JournalData.js';

/** A guided introduction, followed by contrasting terrain and wreck dives. */
export const TOUR_ORDER = [
  'titanic',
  'lost-city',
  'great-blue-hole',
  'beebe-vent-field',
  'monterey-canyon',
  'endurance',
  'kamaehuakanaloa',
  'hudson-canyon',
  'challenger-deep',
  'bismarck',
  'axial-seamount-ashes',
  'blake-plateau-corals',
  'hunga-tonga-caldera',
] as const;
/** One plain line per site: what you will see, so the next dive has a reason. Claims come from each site's guide. */
export const SITE_HOOKS: Record<(typeof TOUR_ORDER)[number], string> = {
  titanic: 'Two halves of a liner lie about 600 m apart, the bow still hung with rust icicles.',
  'lost-city': 'White stone towers, one about 60 m tall, grown from seawater reacting with rock.',
  'great-blue-hole':
    'A round blue sinkhole 320 m wide, hung with stalactites from when it was dry cave.',
  'beebe-vent-field':
    'Black smokers near 5,000 m down, hotter than 400 °C, swarmed by shrimp with an eye on their back.',
  'monterey-canyon':
    'A canyon that starts just off a beach, where underwater avalanches have reached 7.2 m/s.',
  endurance:
    "Shackleton's ship lies upright in the dark, her wheel still standing and her name still readable.",
  kamaehuakanaloa:
    'Rust-coloured bacterial mats around vents on the floor of a 600 m pit in a young volcano.',
  'hudson-canyon':
    "The old Hudson River's path running out under the Atlantic, its rocky walls hung with corals.",
  'challenger-deep':
    'Three dark basins in a row, more than 10,900 m down, where amphipods scavenge the floor.',
  bismarck:
    "A battleship lying upright on a volcano's slope, her gun turrets scattered down the hillside.",
  'axial-seamount-ashes':
    "Black smokers at the foot of a volcano's caldera wall, crowded with tube worms and palm worms.",
  'blake-plateau-corals':
    'White coral mounds tens of metres tall, tens of thousands of them, fed by the Gulf Stream.',
  'hunga-tonga-caldera':
    'A caldera surveyed before the 2022 eruption, its two islands still joined by a shallow saddle.',
};
export function siteHook(id: string | undefined): string | null {
  return (id && (SITE_HOOKS as Record<string, string>)[id]) || null;
}
export type TourProgress =
  | (Pick<Progress, 'rating'> & Partial<Pick<Progress, 'snapshot'>>)
  | (Pick<ProgressRecord, 'ratings'> & Partial<Pick<ProgressRecord, 'awarded'>>);
export function siteComplete(id: string, progress: TourProgress): boolean {
  const awarded = 'rating' in progress ? progress.snapshot?.().awarded : progress.awarded;
  return (
    ('rating' in progress ? progress.rating(id) : (progress.ratings[id] ?? 0)) > 0 ||
    !!awarded?.includes(`primary:${id}`)
  );
}
export function nextSite(progress: TourProgress): string | null {
  return TOUR_ORDER.find((id) => !siteComplete(id, progress)) ?? null;
}
export function nextSiteAfter(siteId: string, progress: TourProgress): string | null {
  const start = TOUR_ORDER.findIndex((id) => id === siteId);
  for (let offset = 1; offset <= TOUR_ORDER.length; offset++) {
    const id = TOUR_ORDER[(start + offset) % TOUR_ORDER.length];
    if (id !== siteId && !siteComplete(id, progress)) return id;
  }
  return null;
}
/** Count fixed, Journal-linked POIs, once each; species and game additions are separate. */
export function siteFinds(
  site: JournalSite,
  store: DiscoveryReader,
): { found: number; total: number } {
  const ids = new Set(
    site.entries
      .filter((e) => e.kind === 'poi')
      .flatMap((e) => e.poiIds)
      .filter((id) => !id.includes(':')),
  );
  return {
    total: ids.size,
    found: [...ids].filter((id) => store.isDiscovered(site.id, id)).length,
  };
}
let journal: Promise<JournalSite[]> | undefined;
export function tourJournal(): Promise<JournalSite[]> {
  return (journal ??= loadJournalSites());
}
