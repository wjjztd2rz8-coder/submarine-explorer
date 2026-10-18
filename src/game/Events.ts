import { Vector3 } from 'three';
import { EXPLORE_CONFIG } from '../core/config/explore.js';
import { siteManifest } from '../core/SiteManifest.js';
import type { ScanTarget } from './Scanner.js';
import { latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';

export type ExploreEventKind = 'plume' | 'turbidity' | 'whale';
export interface EventContact extends ScanTarget {
  kind: ExploreEventKind;
  arrivalRadiusM: number;
  headingDeg: number;
}
export interface ExploreEvent {
  contact: EventContact;
  kind: ExploreEventKind;
  elapsedS: number;
  durationS: number;
}
export const EVENT_CAPTIONS: Record<ExploreEventKind, string> = {
  plume: 'Vent plume: warm mineral-rich water rises from the seabed',
  turbidity: 'Silt cloud: sediment-laden water flows downslope',
  whale: 'Whale passing: whales use canyon waters to find food',
};
export function eventKinds(site: string): ExploreEventKind[] {
  return Object.keys(siteManifest(site)?.events ?? {}) as ExploreEventKind[];
}

/** Full 3D contacts make the authored depth/altitude the arrival eligibility. */
export function placeEventContacts(
  site: string,
  meta: TileMeta,
  ground: (x: number, z: number) => number,
): EventContact[] {
  return eventKinds(site).map((kind) => {
    const spot = siteManifest(site)!.events![kind]!;
    const { x, z } = latLonToWorld(meta, spot.anchor.lat, spot.anchor.lon);
    return {
      id: `event:${kind}`,
      landmarkId: site,
      position: new Vector3(
        x,
        spot.anchor.depthM !== undefined
          ? -spot.anchor.depthM
          : ground(x, z) + spot.anchor.altitudeM!,
        z,
      ),
      radius: spot.contactRadiusM,
      scanSeconds: 0,
      name: spot.name,
      arrivalRadiusM: spot.arrivalRadiusM,
      headingDeg: spot.headingDeg,
      kind,
    };
  });
}

/** Arrivals replace timers: no overlap, and staying inside never fires twice. */
export class AnchoredEvents {
  active: ExploreEvent | null = null;
  private readonly inside = new Set<string>();

  update(dt: number, position: Vector3, contacts: readonly EventContact[]): ExploreEvent | null {
    if (!Number.isFinite(dt) || dt <= 0) return null;
    const wasActive = this.active !== null;
    if (this.active) {
      this.active.elapsedS = Math.min(this.active.durationS, this.active.elapsedS + dt);
      if (this.active.elapsedS >= this.active.durationS) this.active = null;
    }
    let arriving: EventContact | undefined;
    for (const contact of contacts) {
      const inside = position.distanceToSquared(contact.position) <= contact.arrivalRadiusM ** 2;
      if (inside) {
        if (!this.inside.has(contact.id) && !arriving) arriving = contact;
        this.inside.add(contact.id);
      } else this.inside.delete(contact.id);
    }
    if (wasActive || !arriving) return null;
    this.active = {
      contact: arriving,
      kind: arriving.kind,
      elapsedS: 0,
      durationS: EXPLORE_CONFIG.eventDurationS,
    };
    return this.active;
  }

  /** Retire the approach cue until another entry can actually play. */
  available(contact: EventContact): boolean {
    return !this.active && !this.inside.has(contact.id);
  }

  reset(): void {
    this.active = null;
    this.inside.clear();
  }
}
