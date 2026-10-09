import { loadMission } from './Mission.js';
import type { DiscoveryStore } from './DiscoveryStore.js';
import type { Photo } from './PhotoStore.js';
import type { FetchJson } from './ContentPath.js';
import type { Progress } from './Progress.js';

// 940 changed these routes. A discoveries-only save can already have earned
// completion on the old primaries; retain that credit without marking a new
// mission run complete or requiring the newly promoted scenic scan.
// f-mission-pacing moved the second required target close to the first; the
// 940-era route stays credited too.
const PRE_940_OBJECTIVES: Record<string, Record<string, boolean>[]> = {
  'great-blue-hole': [
    { 'outer-dropoff': true, 'western-dropoff': true },
    { stalactites: true, 'outer-dropoff': true, 'stalactites-east': false },
  ],
  'monterey-canyon': [
    { 'canyon-head': true, 'upper-channel': true, 'canyon-wall': false, 'mars-node': false },
    { 'canyon-wall': true, 'upper-channel': true, 'canyon-axis': false },
  ],
};

/** Finish legacy credit before hull gating; a returning pilot never loses access during migration. */
export async function creditPreviousDives(
  progress: Progress,
  discoveries: Pick<DiscoveryStore, 'keys' | 'isDiscovered'>,
  photos: readonly Pick<Photo, 'siteId' | 'poiId'>[],
  fetchJson?: FetchJson,
): Promise<void> {
  if (progress.legacyCredited) return;
  const keys = discoveries.keys();
  for (const key of keys) progress.creditDiscovery(key);
  for (const photo of photos)
    if (photo.poiId) progress.credit('photo', `${photo.siteId}/${photo.poiId}`);
  const sites = progress.legacyPending ?? [...new Set(keys.map((key) => key.split('/')[0]))];
  const pending = await Promise.all(
    sites.map(async (site) => {
      let absent = false;
      const def = await loadMission(site, async (url) => {
        const response = await (fetchJson ?? fetch)(url);
        absent = response.status === 404 || response.status === 410;
        return response;
      });
      if (!def) return absent ? null : site;
      const statuses = def.objectives.map((o) => ({
        primary: o.primary,
        complete: discoveries.isDiscovered(def.landmark, o.poi),
      }));
      def.objectives.forEach((o, i) => {
        if (statuses[i].complete) progress.credit('objective', `${site}/${o.id}`);
      });
      const oldRoutes = (PRE_940_OBJECTIVES[site] ?? []).map((roles) =>
        def.objectives.flatMap((o, i) =>
          Object.hasOwn(roles, o.id)
            ? [{ primary: roles[o.id], complete: statuses[i].complete }]
            : [],
        ),
      );
      for (const route of [...oldRoutes, statuses]) {
        const primary = route.filter((o) => o.primary);
        if (!primary.length || !primary.every((o) => o.complete)) continue;
        progress.bonus =
          photos.some((p) => p.siteId === site && !!p.poiId) ||
          keys.some(
            (key) => key.startsWith(`${def.landmark}/life:`) && key !== `${def.landmark}/life:`,
          );
        progress.finish(site, route);
      }
      return null;
    }),
  );
  progress.beginDive();
  progress.completeLegacyCredit(pending.filter((site): site is string => site !== null));
}
