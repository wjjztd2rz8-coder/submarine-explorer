import { loadMission } from './Mission.js';
import type { DiscoveryStore } from './DiscoveryStore.js';
import type { Photo } from './PhotoStore.js';
import type { FetchJson } from './ContentPath.js';
import type { Progress } from './Progress.js';
import type { LegacyEvidence } from '../core/Save.js';

// Historical routes use the POI keys stored in the Journal. Current objective IDs
// can change or disappear without erasing earned stars or shrinking an old route.
const PREVIOUS_ROUTES: Record<string, Record<string, boolean>[]> = {
  'great-blue-hole': [
    { 'great-blue-hole-outer-dropoff': true, 'great-blue-hole-western-dropoff': true },
    {
      'great-blue-hole-stalactites': true,
      'great-blue-hole-outer-dropoff': true,
      'great-blue-hole-stalactites-east': false,
    },
  ],
  'monterey-canyon': [
    {
      'monterey-canyon-head': true,
      'monterey-canyon-upper-channel': true,
      'monterey-canyon-wall': false,
      'mbari-mars-node': false,
    },
    {
      'monterey-canyon-wall': true,
      'monterey-canyon-upper-channel': true,
      'monterey-canyon-axis': false,
    },
  ],
  'challenger-deep': [
    {
      'cd-leggo-amphipod-site': true,
      'cd-north-wall': true,
      'cd-central-basin': false,
      'cd-axis-sill': false,
    },
  ],
  'hunga-tonga-caldera': [{ 'hunga-tonga-caldera-floor': true, 'hunga-tonga-rim-wall': true }],
  'hudson-canyon': [{ 'hc-canyon-wall': true, 'hc-coral-ledge': true }],
};

/** Finish legacy credit before hull gating; a returning pilot never loses access during migration. */
export async function creditPreviousDives(
  progress: Progress,
  discoveries: Pick<DiscoveryStore, 'keys'>,
  photos: readonly Pick<Photo, 'siteId' | 'poiId'>[],
  fetchJson?: FetchJson,
): Promise<void> {
  // Journal and reward writes are separate. Repair missing discovery credit on
  // every boot, even after legacy migration, without inferring finished dives.
  const keys = discoveries.keys();
  for (const key of keys) progress.creditDiscovery(key);
  for (const photo of photos)
    if (photo.poiId) progress.credit('photo', `${photo.siteId}/${photo.poiId}`);
  if (progress.legacyCredited) return;
  const sites =
    progress.legacyPending ??
    [...new Set(keys.map((key) => key.split('/')[0]))].map((site): LegacyEvidence => ({
      site,
      keys: keys.filter((key) => key.startsWith(`${site}/`)),
      bonus:
        photos.some((p) => p.siteId === site && !!p.poiId) ||
        keys.some((key) => key.startsWith(`${site}/life:`) && key !== `${site}/life:`),
    }));
  const pending = await Promise.all(
    sites.map(async (evidence) => {
      // Site-only retries have lost their original evidence; current stores cannot prove old stars.
      if (typeof evidence === 'string') return null;
      const { site } = evidence;
      let absent = false;
      const def = await loadMission(site, async (url) => {
        const response = await (fetchJson ?? fetch)(url);
        absent = response.status === 404 || response.status === 410;
        return response;
      });
      // Historical checklists remain usable when current content is retired or offline.
      const statuses =
        def?.objectives.map((o) => ({
          primary: o.primary,
          complete: evidence.keys.includes(`${def.landmark}/${o.poi}`),
        })) ?? [];
      def?.objectives.forEach((o, i) => {
        if (statuses[i].complete) progress.credit('objective', `${site}/${o.id}`);
      });
      const previous = Object.hasOwn(PREVIOUS_ROUTES, site) ? PREVIOUS_ROUTES[site] : [];
      const oldRoutes = previous.map((roles) =>
        Object.entries(roles).map(([poi, primary]) => ({
          primary,
          complete: evidence.keys.includes(`${site}/${poi}`),
        })),
      );
      for (const route of [...oldRoutes, statuses]) {
        const primary = route.filter((o) => o.primary);
        if (!primary.length || !primary.every((o) => o.complete)) continue;
        progress.bonus = evidence.bonus;
        progress.finish(site, route);
      }
      return def || absent ? null : evidence;
    }),
  );
  progress.beginDive();
  progress.completeLegacyCredit(pending.filter((site): site is LegacyEvidence => site !== null));
}
