/**
 * Where per-landmark content lives (plan/PHASE-B-CONTRACTS.md §1, §3).
 *
 *     /data/landmarks/<landmark-id>/{mission,pois,props,guide}.json
 *
 * The landmark folder defaults to the tile id; `?landmark=<id>` overrides it so
 * tests can point the Titanic tile at the `_test` fixture folder. Shared with
 * B4 (props) and B3 (missions), so keep this file tiny and dependency-free.
 */

/** Root URL of the per-landmark content folders (served via public/data). */
export const CONTENT_ROOT = '/data/landmarks';

/** Landmark ids are folder names: letters, digits, `_` and `-` only. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** True if `id` is safe to use as a content folder name. */
export function isSafeLandmarkId(id: string): boolean {
  return SAFE_ID.test(id);
}

/**
 * The content folder for this session: `?landmark=` if present and well
 * formed, else the tile id. A malformed `?landmark=` value (path traversal,
 * spaces, ...) is ignored rather than fetched.
 */
export function landmarkIdFor(params: URLSearchParams, tileId: string): string {
  const requested = params.get('landmark');
  if (requested && isSafeLandmarkId(requested)) return requested;
  return tileId;
}

/** URL of one content file, e.g. `contentUrl('titanic', 'pois.json')`. */
export function contentUrl(landmarkId: string, file: string): string {
  return `${CONTENT_ROOT}/${encodeURIComponent(landmarkId)}/${file}`;
}

/** Minimal fetch shape so loaders can be tested without a network. */
export type FetchJson = (url: string) => Promise<{ ok: boolean; text(): Promise<string> }>;

/**
 * Fetch and parse a JSON content file. Resolves to `null` for anything other
 * than a parseable JSON document: a 404, a network error, or the HTML page a
 * dev/preview server's SPA fallback returns for a missing file. Never throws,
 * because every content file is optional (contracts §1).
 */
export async function fetchContentJson(
  url: string,
  fetchFn: FetchJson = (u) => fetch(u),
): Promise<unknown> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const text = await res.text();
    const trimmed = text.trimStart();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}
