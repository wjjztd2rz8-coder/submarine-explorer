/**
 * Journal progress for the current landmark, plus per-dive session stats.
 *
 * `Objectives` answers "which POIs of this landmark are logged in the Journal?"
 * from the {@link DiscoveryStore}. It is persistent, across dives: it never
 * decides mission objectives, which count scans made during this dive only
 * (`Mission`, plan/PHASE-D-CONTRACTS.md §4). `SessionStats` accumulates what
 * the debrief shows: distance, max depth, time, and what was scanned this dive.
 */

import type { Vector3 } from 'three';
import type { DiscoveryStore } from './DiscoveryStore.js';

/** The part of a POI Objectives needs (`PlacedPoi` satisfies it). */
export interface ObjectivePoi {
  id: string;
  name: string;
  primary: boolean;
  guideEntry: string | null;
}

export interface ObjectiveItem {
  poiId: string;
  name: string;
  primary: boolean;
  discovered: boolean;
}

export interface ObjectivesProgress {
  landmarkId: string;
  total: number;
  discovered: number;
  primaryTotal: number;
  primaryDiscovered: number;
  /** True when there is at least one primary POI and every one is discovered. */
  primaryComplete: boolean;
  items: ObjectiveItem[];
}

export class Objectives {
  private pois: ObjectivePoi[] = [];

  constructor(
    private readonly store: Pick<DiscoveryStore, 'isDiscovered'>,
    readonly landmarkId: string,
    pois: ObjectivePoi[] = [],
  ) {
    this.setPois(pois);
  }

  setPois(pois: ObjectivePoi[]): void {
    this.pois = [...pois];
  }

  isDiscovered(poiId: string): boolean {
    return this.store.isDiscovered(this.landmarkId, poiId);
  }

  /** Is a guide entry unlocked? Entries no POI points at are always unlocked. */
  isEntryUnlocked(entryId: string): boolean {
    const refs = this.pois.filter((p) => p.guideEntry === entryId);
    return refs.length === 0 || refs.some((p) => this.isDiscovered(p.id));
  }

  progress(): ObjectivesProgress {
    const items = this.pois.map((p) => ({
      poiId: p.id,
      name: p.name,
      primary: p.primary,
      discovered: this.isDiscovered(p.id),
    }));
    const primary = items.filter((i) => i.primary);
    const primaryDiscovered = primary.filter((i) => i.discovered).length;
    return {
      landmarkId: this.landmarkId,
      total: items.length,
      discovered: items.filter((i) => i.discovered).length,
      primaryTotal: primary.length,
      primaryDiscovered,
      primaryComplete: primary.length > 0 && primaryDiscovered === primary.length,
      items,
    };
  }

  primaryComplete(): boolean {
    return this.progress().primaryComplete;
  }
}

/** What {@link Debrief.show} renders. B3 may fill `title`/`subtitle`. */
export interface DebriefStats {
  title?: string;
  subtitle?: string;
  landmarkName?: string;
  distanceM: number;
  /** Positive metres. */
  maxDepthM: number;
  elapsedS: number;
  /** Mission objectives done this dive ("X of Y objectives"); absent in a free dive. */
  objectives?: { completed: number; total: number };
  /** POIs scanned this session (first-time or repeat). */
  discoveries: Array<{ poiId: string; name: string }>;
  /** Journal entries first unlocked this session. */
  newEntries: Array<{ id: string; title: string }>;
}

export class SessionStats {
  distanceM = 0;
  /** Positive metres. */
  maxDepthM = 0;
  elapsedS = 0;
  private readonly scanned = new Map<string, string>();
  private readonly entries = new Map<string, string>();
  private last: { x: number; y: number; z: number } | null = null;

  /** @param teleportThresholdM a single-update move longer than this is a reset, not travel. */
  constructor(private readonly teleportThresholdM: number) {}

  update(dt: number, position: Vector3): void {
    this.elapsedS += dt;
    const depth = Math.max(0, -position.y);
    if (depth > this.maxDepthM) this.maxDepthM = depth;
    if (this.last) {
      const d = Math.hypot(
        position.x - this.last.x,
        position.y - this.last.y,
        position.z - this.last.z,
      );
      if (d <= this.teleportThresholdM) this.distanceM += d;
    }
    this.last = { x: position.x, y: position.y, z: position.z };
  }

  /** Forget the previous position so the next update does not count as travel. */
  markTeleport(): void {
    this.last = null;
  }

  noteScan(poiId: string, name: string): void {
    if (!this.scanned.has(poiId)) this.scanned.set(poiId, name);
  }

  noteNewEntry(id: string, title: string): void {
    if (!this.entries.has(id)) this.entries.set(id, title);
  }

  snapshot(extra: Partial<DebriefStats> = {}): DebriefStats {
    return {
      distanceM: this.distanceM,
      maxDepthM: this.maxDepthM,
      elapsedS: this.elapsedS,
      discoveries: [...this.scanned].map(([poiId, name]) => ({ poiId, name })),
      newEntries: [...this.entries].map(([id, title]) => ({ id, title })),
      ...extra,
    };
  }

  reset(): void {
    this.distanceM = 0;
    this.maxDepthM = 0;
    this.elapsedS = 0;
    this.scanned.clear();
    this.entries.clear();
    this.last = null;
  }
}
