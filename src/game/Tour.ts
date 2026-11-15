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
