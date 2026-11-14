/** Fixed survey contacts share one naming and progress policy across every HUD. */
export const CONTACT_CONFIG = { worldMarkerRangeM: 600, maxRangeFromPrimaryM: 1500 };

export interface ContactPoi {
  id: string;
  name: string;
  guideEntry?: string | null;
  position?: { x: number; z: number };
}
export interface ContactState {
  primary: boolean;
  found: boolean;
}
export function contactLabel(poi: Pick<ContactPoi, 'name'>, state: ContactState): string {
  return state.primary || state.found ? poi.name : 'Unknown contact';
}
export function unknownContactsForSite<T extends ContactPoi>(
  pois: readonly T[],
  primaryIds: Iterable<string>,
  optionalIds: Iterable<string> = [],
): T[] {
  const primary = new Set(primaryIds);
  const optional = new Set(optionalIds);
  const seen = new Set<string>();
  // A contact kilometres from the dive is still discoverable but is not part of it.
  const anchors = pois.flatMap((p) => (primary.has(p.id) && p.position ? [p.position] : []));
  const tooFar = (p: T): boolean =>
    !!p.position &&
    anchors.length > 0 &&
    anchors.every(
      (a) =>
        Math.hypot(a.x - p.position!.x, a.z - p.position!.z) > CONTACT_CONFIG.maxRangeFromPrimaryM,
    );
  return pois.filter((p) => {
    if (seen.has(p.id) || primary.has(p.id) || /^(life|secret|sample):/.test(p.id)) return false;
    if (tooFar(p)) return false;
    seen.add(p.id);
    return Boolean(p.guideEntry) || optional.has(p.id);
  });
}
export function foundContactCount<T extends ContactPoi>(
  contacts: readonly T[],
  found: (poi: T) => boolean,
): number {
  return contacts.filter(found).length;
}
/** Completed optional objective reward tokens from previous builds identify scanned POIs. */
export function legacyFoundContactIds(
  objectives: readonly { id: string; poi: string; primary: boolean }[],
  missionId: string,
  awarded: unknown,
): string[] {
  const tokens = new Set(
    Array.isArray(awarded) ? awarded.filter((x): x is string => typeof x === 'string') : [],
  );
  return objectives
    .filter((o) => !o.primary && tokens.has(`objective:${missionId}/${o.id}`))
    .map((o) => o.poi);
}
export function contactStars(
  objectives: readonly { primary: boolean; complete: boolean; resolved?: boolean }[],
  aborted = false,
): number {
  const live = objectives.filter((o) => o.resolved !== false);
  const primary = live.filter((o) => o.primary);
  if (aborted || !primary.length || primary.some((o) => !o.complete)) return 0;
  const contacts = live.filter((o) => !o.primary);
  const found = contacts.filter((o) => o.complete).length;
  return found === contacts.length ? 3 : found >= Math.ceil(contacts.length / 2) ? 2 : 1;
}

/** Historical credit must not reinterpret old evidence as a new contact-rated dive. */
export function legacyContactStars(
  objectives: readonly { primary: boolean; complete: boolean; resolved?: boolean }[],
  bonus: boolean,
): number {
  const live = objectives.filter((o) => o.resolved !== false);
  const primary = live.filter((o) => o.primary);
  if (!primary.length || primary.some((o) => !o.complete)) return 0;
  return live.some((o) => !o.primary && !o.complete) ? 1 : bonus ? 3 : 2;
}
