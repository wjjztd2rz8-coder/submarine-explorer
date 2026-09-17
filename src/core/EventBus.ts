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

import type { DepthBandName } from './Config.js';
import type { Landmark, TileMeta } from '../util/types.js';

export interface GameEvents {
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
  'sub:emergencyBlow': { depth: number; lockSeconds: number };
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
  'game:ready': { tileId: string };
  'ui:selectTile': { id: string };
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
