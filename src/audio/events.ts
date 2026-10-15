/**
 * Audio-owned types and a dedicated event channel. Audio subscribes to shared
 * game events without adding its own cue-specific events to GameEvents.
 * TerrainSampler keeps ray marching independent of the world implementation;
 * CaptionBus carries accessibility cues to the caption overlay (docs/audio.md).
 */

export interface TerrainSampler {
  sampleHeight(x: number, z: number): number;
}

/** One accessibility caption for an audio cue. */
export interface CaptionEvent {
  /** Stable machine id, e.g. "discovery". Use for de-duplication/localisation. */
  id: string;
  /** Human-readable caption text for the CC overlay. */
  text: string;
  /** Seconds the caption should stay visible. */
  durationS: number;
}

export type CaptionHandler = (event: CaptionEvent) => void;

/** Minimal pub/sub, mirroring EventBus's shape but scoped to captions only. */
export class CaptionBus {
  private handlers = new Set<CaptionHandler>();

  on(handler: CaptionHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: CaptionEvent): void {
    for (const h of [...this.handlers]) h(event);
  }
}

/**
 * Continuous per-frame state the audio system needs but that isn't (and
 * shouldn't be) an EventBus event -- depth, throttle and position change
 * every frame, so broadcasting them as events would be event-bus spam.
 * Pushed once per frame from the small hook added in src/main.ts.
 */
export interface AudioFrameInput {
  /** Sub depth, negative metres (0 = surface). */
  depth: number;
  /** -1 (reverse) .. +1 (ahead). */
  throttle: number;
  /** -1 (flood/dive) .. +1 (blow/surface). */
  ballast: number;
  /** Sub speed, m/s. */
  speed: number;
  ratedDepth?: number;
  hullStress?: number;
  soundSites?: readonly import('./Soundscape.js').SoundSite[];
  whaleHabitat?: boolean;
  /** Sub world position (metres), used for spatial environment audio. */
  position: { x: number; y: number; z: number };
  /** Sub forward unit vector, used for spatial environment audio. */
  forward: { x: number; y: number; z: number };
}
