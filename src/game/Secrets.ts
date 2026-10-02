import { Vector3 } from 'three';
import { EXPLORE_CONFIG } from '../core/config/explore.js';
import { fetchContentJson, isSafeLandmarkId, type FetchJson } from './ContentPath.js';
import type { ScanTarget } from './Scanner.js';
import type { DiscoveryReader } from './JournalData.js';
import { publicUrl } from '../util/publicUrl.js';
import { latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';

export const SECRET_KINDS = ['frame', 'alcove', 'seep', 'bone', 'wood', 'chain', 'rock'] as const;
export type SecretKind = (typeof SECRET_KINDS)[number];
export interface SecretDef {
  id: string;
  name: string;
  kind: SecretKind;
  lat: number;
  lon: number;
  text: string;
}
export interface SampleDef {
  id: string;
  name: string;
  lat: number;
  lon: number;
}
export interface SecretsDoc {
  version: 1;
  secrets: SecretDef[];
  samples: SampleDef[];
}
export interface SecretTarget extends ScanTarget {
  def: SecretDef;
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Optional content never stops a dive; malformed rows and duplicates are ignored. */
export function parseSecrets(raw: unknown): SecretsDoc {
  const out: SecretsDoc = { version: 1, secrets: [], samples: [] };
  if (!object(raw) || raw.version !== 1) return out;
  for (const field of ['secrets', 'samples'] as const) {
    if (!Array.isArray(raw[field])) continue;
    const seen = new Set<string>();
    for (const row of raw[field]) {
      if (!object(row) || !text(row.id) || !/^[a-z0-9-]+$/.test(row.id) || seen.has(row.id))
        continue;
      if (!text(row.name) || typeof row.lat !== 'number' || typeof row.lon !== 'number') continue;
      if (
        !Number.isFinite(row.lat) ||
        !Number.isFinite(row.lon) ||
        Math.abs(row.lat) > 90 ||
        Math.abs(row.lon) > 180
      )
        continue;
      if (field === 'secrets') {
        if (!SECRET_KINDS.includes(row.kind as SecretKind) || !text(row.text)) continue;
        out.secrets.push({
          id: row.id,
          name: row.name,
          lat: row.lat,
          lon: row.lon,
          kind: row.kind as SecretKind,
          text: row.text,
        });
      } else out.samples.push({ id: row.id, name: row.name, lat: row.lat, lon: row.lon });
      seen.add(row.id);
    }
  }
  return out;
}
export async function loadSecrets(site: string, fetchFn?: FetchJson): Promise<SecretsDoc> {
  if (!isSafeLandmarkId(site)) return parseSecrets(null);
  return parseSecrets(await fetchContentJson(publicUrl(`/data/secrets/${site}.json`), fetchFn));
}
export function secretDiscoveryId(id: string): string {
  return `secret:${id}`;
}
export function secretProgress(
  site: string,
  defs: readonly SecretDef[],
  store: DiscoveryReader,
): { found: number; total: number } {
  return {
    found: defs.filter((d) => store.isDiscovered(site, secretDiscoveryId(d.id))).length,
    total: defs.length,
  };
}
/** Full 3D range: a contact on the bottom cannot be spotted from the surface. */
export function secretInRange(
  position: Vector3,
  contact: Vector3,
  rangeM: number = EXPLORE_CONFIG.contactRangeM,
): boolean {
  return position.distanceToSquared(contact) <= rangeM * rangeM;
}
export function placeSecrets(
  doc: SecretsDoc,
  site: string,
  meta: TileMeta,
  ground: (x: number, z: number) => number,
): SecretTarget[] {
  return doc.secrets.map((def) => {
    const { x, z } = latLonToWorld(meta, def.lat, def.lon);
    return {
      id: secretDiscoveryId(def.id),
      name: 'Unidentified contact',
      landmarkId: site,
      position: new Vector3(x, ground(x, z) + 2, z),
      radius: EXPLORE_CONFIG.secretScanRangeM,
      scanSeconds: EXPLORE_CONFIG.secretSeconds,
      def,
    };
  });
}
