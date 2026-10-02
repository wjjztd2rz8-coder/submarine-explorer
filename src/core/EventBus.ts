/**
 * Minimal typed pub/sub. Modules communicate through this rather than holding
 * references to each other, so new subsystems can be bolted on without edits
 * to existing ones.
 *
 * Add your event to {@link GameEvents} to make it available:
 *
 *     bus.on('sub:crushWarning', ({ depth }) => ...);
 *     bus.emit('sub:crushWarning', { depth: -3900 });
 */

import type { DepthBandName, EnvPresetName } from './Config.js';
import type { Landmark, TileMeta } from '../util/types.js';

export interface GameEvents {
  'app:state': { state: 'home' | 'dive' | 'pause' };
  'app:siteSelected': { missionId: string | null; tileId: string };
  'tile:loaded': { meta: TileMeta };
  'tile:error': { id: string; error: string };
  'terrain:built': { chunks: number; vertices: number };
  'landmarks:loaded': { landmarks: Landmark[] };
  'sub:collided': { depth: number; speed: number };
  'sub:crushWarning': { depth: number; ratio: number };
  // --- A3: submarine feel ---------------------------------------------------
  /** Hull stress crossed the reporting threshold. Drives creaks, shake, HUD. */
  'sub:hullStress': { stress: number; cause: 'impact' | 'pressure'; depth: number };
  /** Crush depth reached: the boat is blowing tanks and the controls are locked. */
  'sub:emergencyBlow': { depth: number; lockSeconds: number; cause?: 'crush' | 'power' };
  /** Sim-speed multiplier changed (1x / 2x / 3x). */
  'sub:simSpeed': { multiplier: number };
  // --- A2: atmosphere -------------------------------------------------------
  /**
   * The camera crossed into a different depth band (docs/atmosphere.md).
   * Audio crossfades its ambient bed on this; UI can label the band.
   */
  'env:depthBand': {
    band: DepthBandName;
    previous: DepthBandName | null;
    depth: number;
  };
  // --- B1: scan & discovery --------------------------------------------------
  'scan:started': { poiId: string };
  /** 0..1, emitted at most ~10 Hz. */
  'scan:progress': { poiId: string; progress: number };
  'scan:aborted': { poiId: string; reason: 'range' | 'facing' | 'released' };
  'scan:complete': { poiId: string; landmarkId: string; firstTime: boolean };
  'guide:opened': { entryId: string };
  'discovery:secret': { landmarkId: string; secretId: string; name: string; firstTime: boolean };
  'discovery:sample': { landmarkId: string; sampleId: string; name: string };
  'event:witnessed': {
    landmarkId: string;
    eventId: string;
    kind: 'plume' | 'turbidity' | 'snow' | 'whale';
  };
  // --- B3: mission flow ------------------------------------------------------
  'mission:started': { missionId: string; tileId: string };
  'mission:objective': { missionId: string; objectiveId: string; complete: boolean };
  /** D-FLOW: once per dive, when the player ends it after the primaries are done. */
  'mission:complete': { missionId: string; durationS: number };
  'mission:restart': { missionId: string };
  /** Fix S: the dive failed (crush depth -> emergency ascent), before the aborted debrief. */
  'mission:aborted': { missionId: string; reason: 'crush' | 'power' };
  // --- D-FLOW: dive flow (plan/PHASE-D-CONTRACTS.md §4) -----------------------
  /** The scan that completed the last primary objective; the dive continues. */
  'mission:primaryComplete': { missionId: string; completed: number; total: number };
  /** Every transition into the debrief (after `mission:complete`, when that fires). */
  'mission:ended': {
    missionId: string;
    reason: 'surface' | 'all' | 'abort';
    completed: number;
    total: number;
    durationS: number;
  };
  // --- B4: props -------------------------------------------------------------
  'props:loaded': { landmarkId: string; count: number; models: number; procedural: number };
  // --- C3: environment presets (docs/presets.md) -----------------------------
  /** The environment preset chosen for this dive (after mission/landmark lookup). */
  'env:preset': { preset: EnvPresetName; landmarkId: string };
  /** The water current at the sub changed noticeably (compass bearing it flows toward). */
  'env:current': { dirDeg: number; speedMps: number };
  /** Hadal pressure ambience tick, at intervals that shorten with depth (for audio creaks). */
  'env:trench': { depth: number };
  // --- C1: globe mission select ---------------------------------------------
  /** The globe overlay opened (`?globe=1`, the GLOBE button or the toggleGlobe key). */
  'globe:opened': { source: 'url' | 'button' | 'key' | 'api' };
  /** A launchable pin was chosen (click / Enter), just before navigating. */
  'globe:pinSelected': { landmarkId: string };
  'game:ready': { tileId: string };
  'ui:selectTile': { id: string };
  // --- C5: settings ------------------------------------------------------------
  /** One setting changed (docs/settings.md); emitted once per changed key. */
  'settings:changed': { key: string; value: unknown };
}

export type EventName = keyof GameEvents;
export type Handler<K extends EventName> = (payload: GameEvents[K]) => void;

export class EventBus {
  private handlers = new Map<EventName, Set<(payload: never) => void>>();

  /** Subscribe; returns an unsubscribe function. */
  on<K extends EventName>(name: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as (payload: never) => void);
    return () => {
      set?.delete(handler as (payload: never) => void);
    };
  }

  once<K extends EventName>(name: K, handler: Handler<K>): () => void {
    const off = this.on(name, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  emit<K extends EventName>(name: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const h of [...set]) {
      try {
        (h as Handler<K>)(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${String(name)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
