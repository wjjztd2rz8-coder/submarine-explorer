import { loadMission } from './Mission.js';
import type { DiscoveryStore } from './DiscoveryStore.js';
import type { Photo } from './PhotoStore.js';
import type { FetchJson } from './ContentPath.js';
import type { Progress } from './Progress.js';

/** Finish legacy credit before hull gating; a returning pilot never loses access during migration. */
export async function creditPreviousDives(
  progress: Progress,
  discoveries: Pick<DiscoveryStore, 'keys' | 'isDiscovered'>,
  photos: readonly Pick<Photo, 'siteId' | 'poiId'>[],
  fetchJson?: FetchJson,
): Promise<void> {
  if (progress.legacyCredited) return;
  const keys = discoveries.keys();
  for (const key of keys) progress.credit('poi', key);
  for (const photo of photos)
    if (photo.poiId) progress.credit('photo', `${photo.siteId}/${photo.poiId}`);
  const sites = [...new Set(keys.map((key) => key.split('/')[0]))];
  await Promise.all(
    sites.map(async (site) => {
      const def = await loadMission(site, fetchJson);
      if (!def) return;
      const statuses = def.objectives.map((o) => ({
        primary: o.primary,
        complete: discoveries.isDiscovered(def.landmark, o.poi),
      }));
      def.objectives.forEach((o, i) => {
        if (statuses[i].complete) progress.credit('objective', `${site}/${o.id}`);
      });
      const primary = statuses.filter((o) => o.primary);
      if (primary.length && primary.every((o) => o.complete)) {
        progress.bonus = photos.some((p) => p.siteId === site && p.poiId !== null);
        progress.finish(site, statuses);
      }
    }),
  );
  progress.beginDive();
  progress.completeLegacyCredit();
}
