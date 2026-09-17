/**
 * Audio-owned types and a small dedicated event channel.
 *
 * Deliberately NOT added to `GameEvents` (src/core/EventBus.ts). The audio
 * system only *subscribes* to events other lanes already emit there
 * (`sub:collided`, `sub:crushWarning`, `game:ready`) rather than defining new
 * shared events, per CONTRIBUTING-AGENTS.md's "add through an existing
 * extension point rather than editing that lane's files" and to avoid
 * touching a shared file while A1/A2/A3 are also mid-flight.
 *
 * Two things live here because nothing else in the repo owns them yet:
 *
 *   - `TerrainSampler`, a minimal structural interface so this module reads
 *     seabed height for the sonar ray-march without importing
 *     `src/world/Terrain.ts` or `src/sub/Submarine.ts` (Terrain already
 *     satisfies this structurally, so `new AudioSystem(cfg, bus, terrain)`
 *     just works).
 *   - `CaptionBus`, a tiny pub/sub for the caption/subtitle events A4's
 *     deliverable #5 asks for. The accessibility package (C5) is expected to
 *     subscribe to `audioSystem.captions` and render them; see docs/audio.md.
 */

export interface TerrainSampler {
  sampleHeight(x: number, z: number): number;
}

/** One accessibility caption for an audio cue (A4 deliverable #5). */
export interface CaptionEvent {
  /** Stable machine id, e.g. "sonar-ping". Use for de-duplication/localisation. */
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
  /** Sub world position (metres), used as the sonar ping origin. */
  position: { x: number; y: number; z: number };
  /** Sub forward unit vector, used as the sonar ping direction. */
  forward: { x: number; y: number; z: number };
  /**
   * Edge-triggered: true on the one frame the `ping` action fired (see
   * `Input.actions`, bound to Q / Tab / gamepad LB by src/core/Input.ts).
   */
  pingPressed: boolean;
}
