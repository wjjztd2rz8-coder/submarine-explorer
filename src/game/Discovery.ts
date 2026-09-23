/**
 * B1 wiring: loads a landmark's POIs + guide, runs the {@link Scanner},
 * persists to the {@link DiscoveryStore}, feeds {@link Objectives} and
 * {@link SessionStats}, and drives the three DOM overlays. main.ts only
 * constructs this and calls `update()` once per frame (docs/discovery.md).
 *
 * Debug params handled here: `?poi=<id>` (spawn next to a POI, via the
 * `teleport` callback) and `?debrief=1` (open the debrief after a delay).
 */

import { Vector3, type Camera } from 'three';
import type { GameConfig } from '../core/Config.js';
import type { EventBus } from '../core/EventBus.js';
import type { TileMeta } from '../util/types.js';
import { Debrief } from '../ui/Debrief.js';
import { FieldGuide } from '../ui/FieldGuide.js';
import { ScanOverlay, type ScanOverlayKeys, type ScreenPoint } from '../ui/ScanOverlay.js';
import { DiscoveryStore, type StorageLike } from './DiscoveryStore.js';
import {
  buildGuideEntries,
  entryIdForPoi,
  loadGuide,
  type GuideDoc,
  type GuideEntry,
} from './Guide.js';
import { Objectives, SessionStats, type DebriefStats } from './Objectives.js';
import {
  loadPois,
  placePois,
  spawnPoseForPoi,
  type PlacedPoi,
  type SeabedSampler,
  type SpawnPose,
} from './Pois.js';
import { Scanner } from './Scanner.js';

export interface DiscoveryOptions {
  bus: EventBus;
  config: GameConfig;
  meta: TileMeta;
  seabed: SeabedSampler;
  landmarkId: string;
  params?: URLSearchParams;
  /** Primary key label for an action, e.g. `input.primaryKeyLabel('scan')`. Read lazily. */
  keyLabel?: (action: 'scan' | 'toggleGuide') => string;
  /** Moves the sub (and snaps the camera) for the `?poi=` spawn. */
  teleport?: (pose: SpawnPose) => void;
  /** undefined = localStorage; null = in-memory only. */
  storage?: StorageLike | null;
  parent?: HTMLElement;
}

export interface DiscoveryFrameInput {
  scan: boolean;
  toggleGuide?: boolean;
}

export class Discovery {
  readonly scanner: Scanner;
  readonly store: DiscoveryStore;
  readonly objectives: Objectives;
  readonly stats: SessionStats;
  readonly guide: FieldGuide;
  readonly debrief: Debrief;
  readonly overlay: ScanOverlay;
  readonly landmarkId: string;
  /** Resolves once POIs and the guide have loaded (or turned out to be missing). */
  readonly ready: Promise<void>;

  pois: PlacedPoi[] = [];
  guideDoc: GuideDoc | null = null;
  entries: GuideEntry[] = [];
  loaded = false;
  /** Set once a `?poi=` spawn has been applied. */
  spawnedAt: string | null = null;

  private landmarkName: string;
  private unlocked = new Set<string>();
  private readonly projected = new Vector3();
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly opts: DiscoveryOptions) {
    const { bus, config, landmarkId } = opts;
    this.landmarkId = landmarkId;
    this.landmarkName = landmarkId;
    this.store = new DiscoveryStore(opts.storage);
    this.scanner = new Scanner(config.scan, bus, this.store);
    this.objectives = new Objectives(this.store, landmarkId);
    this.stats = new SessionStats(config.scan.teleportThresholdM);
    this.overlay = new ScanOverlay(config.scan, opts.parent);
    this.guide = new FieldGuide(bus, opts.parent);
    this.debrief = new Debrief({
      parent: opts.parent,
      onFieldGuide: () => this.guide.open(),
    });

    this.disposers.push(
      bus.on('scan:complete', (e) => this.onComplete(e.poiId, e.firstTime)),
      bus.on('landmarks:loaded', ({ landmarks }) => {
        const l = landmarks.find((x) => x.id === landmarkId);
        if (l?.name) {
          this.landmarkName = String(l.name);
          this.pushGuideContent();
        }
      }),
    );
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape') return;
      if (this.guide.isOpen) this.guide.close();
      else if (this.debrief.isOpen) this.debrief.hide();
    };
    window.addEventListener('keydown', onKey);
    this.disposers.push(() => window.removeEventListener('keydown', onKey));

    this.ready = this.load();

    const params = opts.params;
    if (params?.get('debrief') === '1') {
      const t = window.setTimeout(() => this.showDebrief(), config.scan.debugDebriefDelayMs);
      this.disposers.push(() => window.clearTimeout(t));
    }
    const poiParam = params?.get('poi');
    if (poiParam) {
      void this.ready.then(() => {
        const pose = this.spawnPose(poiParam);
        if (!pose) {
          console.warn(`[discovery] ?poi=${poiParam}: no such POI at landmark "${landmarkId}"`);
          return;
        }
        opts.teleport?.(pose);
        this.stats.markTeleport();
        this.scanner.cancel();
        this.spawnedAt = poiParam;
      });
    }
  }

  private async load(): Promise<void> {
    const { meta, seabed, config, landmarkId } = this.opts;
    const [defs, guide] = await Promise.all([loadPois(landmarkId), loadGuide(landmarkId)]);
    this.pois = placePois(defs, meta, seabed, config.scan, landmarkId);
    this.guideDoc = guide;
    this.entries = buildGuideEntries(guide, this.pois);
    this.objectives.setPois(
      this.pois.map((p) => ({ ...p, guideEntry: entryIdForPoi(p, this.entries) })),
    );
    this.scanner.setTargets(this.pois);
    this.unlocked = this.unlockedSet();
    this.pushGuideContent();
    this.loaded = true;
    if (this.pois.length || guide) {
      console.info(
        `[discovery] ${landmarkId}: ${this.pois.length} POIs, ${this.entries.length} guide entries, ` +
          `${this.store.discoveredFor(landmarkId).length} discovered`,
      );
    }
  }

  private unlockedSet(): Set<string> {
    return new Set(
      this.entries.filter((e) => this.objectives.isEntryUnlocked(e.id)).map((e) => e.id),
    );
  }

  private pushGuideContent(): void {
    const title = this.guideTitle();
    const content = {
      landmarkName: title,
      entries: this.entries,
      isUnlocked: (id: string) => this.unlocked.has(id),
    };
    this.guide.setContent(
      this.guideDoc?.memorial_note
        ? { ...content, memorialNote: this.guideDoc.memorial_note }
        : content,
    );
  }

  /** guide.json `title`, else the landmarks.json name, else the folder id. */
  private guideTitle(): string {
    return this.guideDoc?.title ?? this.landmarkName;
  }

  private keys(): ScanOverlayKeys {
    const label = this.opts.keyLabel;
    return {
      scan: label ? label('scan') : 'G',
      guide: label ? label('toggleGuide') : 'J',
    };
  }

  private onComplete(poiId: string, firstTime: boolean): void {
    const poi = this.pois.find((p) => p.id === poiId);
    if (!poi) return;
    this.stats.noteScan(poi.id, poi.name);
    const entryId = entryIdForPoi(poi, this.entries);
    const entry = this.entries.find((e) => e.id === entryId);
    const before = this.unlocked;
    this.unlocked = this.unlockedSet();
    for (const id of this.unlocked) {
      if (!before.has(id)) {
        const e = this.entries.find((x) => x.id === id);
        if (e) this.stats.noteNewEntry(e.id, e.title);
      }
    }
    this.guide.focus(entryId);
    this.guide.refresh();
    this.overlay.showComplete(entry?.title ?? poi.name, firstTime, this.keys());
  }

  /** Pose for the `?poi=` spawn, or null if the POI is unknown. */
  spawnPose(poiId: string): SpawnPose | null {
    const poi = this.pois.find((p) => p.id === poiId);
    if (!poi) return null;
    const sub = this.opts.config.submarine;
    return spawnPoseForPoi(
      poi,
      this.opts.seabed,
      this.opts.config.scan,
      sub.hullRadius + sub.seabedClearance,
    );
  }

  /**
   * The POI the chase camera should keep clear of the hull (QA-B #6): the
   * nearest target while it is inside its scan radius, else null. The
   * returned vector is the POI's own; do not mutate it.
   */
  focusPoint(): Vector3 | null {
    const v = this.scanner.view;
    if (!v.nearestId || !v.nearestInRange) return null;
    return this.pois.find((p) => p.id === v.nearestId)?.position ?? null;
  }

  /**
   * Once per rendered frame.
   * @param simDt simulated seconds this frame (fixed steps x fixed delta)
   * @param realDt real frame delta, for UI animation
   * @param clockDt real seconds of unfrozen play, for the debrief's DIVE TIME
   *   (QA-B #10); defaults to `simDt`
   */
  update(
    simDt: number,
    realDt: number,
    position: Vector3,
    forward: Vector3,
    input: DiscoveryFrameInput,
    camera?: Camera,
    clockDt: number = simDt,
  ): void {
    if (input.toggleGuide) this.guide.toggle();
    const overlayOpen = this.guide.isOpen || this.debrief.isOpen;
    this.scanner.enabled = !overlayOpen;
    this.scanner.update(simDt, position, forward, input.scan);
    this.stats.update(clockDt, position);

    this.overlay.setSuppressed(overlayOpen);
    const keys = this.keys();
    this.guide.setFooter(`${keys.guide} OR ESC TO CLOSE · HOLD ${keys.scan} NEAR A TARGET TO SCAN`);
    let screen: ScreenPoint | null = null;
    const nearest = this.scanner.view.nearestId;
    if (camera && nearest) {
      const poi = this.pois.find((p) => p.id === nearest);
      if (poi) {
        const v = this.projected.copy(poi.position).project(camera);
        if (v.z > -1 && v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) {
          screen = {
            x: ((v.x + 1) / 2) * window.innerWidth,
            y: ((1 - v.y) / 2) * window.innerHeight,
          };
        }
      }
    }
    this.overlay.update(this.scanner.view, keys, screen, realDt);
  }

  /** Open the debrief with this session's stats. B3 passes a title/subtitle. */
  showDebrief(extra: Partial<DebriefStats> = {}): DebriefStats {
    const stats = this.stats.snapshot({ landmarkName: this.guideTitle(), ...extra });
    this.debrief.show(stats);
    return stats;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.overlay.dispose();
    this.guide.dispose();
    this.debrief.dispose();
  }
}
