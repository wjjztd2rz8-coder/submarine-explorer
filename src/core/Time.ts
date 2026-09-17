/**
 * Fixed-timestep clock.
 *
 * Physics runs at a fixed 60 Hz so that behaviour is deterministic and
 * frame-rate independent; rendering runs as fast as the browser allows and
 * interpolates using {@link Time.alpha}.
 */
export class Time {
  /** Seconds per physics step. */
  readonly fixedDelta: number;
  /** Real seconds elapsed since start(). */
  elapsed = 0;
  /** Real seconds since the previous frame (clamped). */
  frameDelta = 0;
  /** Interpolation factor in [0,1) between the last two physics steps. */
  alpha = 0;
  /** Total number of physics steps executed. */
  steps = 0;

  private accumulator = 0;
  private lastMs = 0;
  private started = false;

  /** Guard against the spiral of death after a tab is backgrounded. */
  private readonly maxFrameDelta: number;
  private readonly maxStepsPerFrame: number;

  constructor(fixedHz = 60, maxFrameDelta = 0.25, maxStepsPerFrame = 8) {
    this.fixedDelta = 1 / fixedHz;
    this.maxFrameDelta = maxFrameDelta;
    this.maxStepsPerFrame = maxStepsPerFrame;
  }

  /** Advance the clock. Returns how many fixed steps the caller should run. */
  tick(nowMs: number): number {
    if (!this.started) {
      this.started = true;
      this.lastMs = nowMs;
      return 0;
    }
    let dt = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    if (dt < 0) dt = 0;
    if (dt > this.maxFrameDelta) dt = this.maxFrameDelta;

    this.frameDelta = dt;
    this.elapsed += dt;
    this.accumulator += dt;

    let n = 0;
    while (this.accumulator >= this.fixedDelta && n < this.maxStepsPerFrame) {
      this.accumulator -= this.fixedDelta;
      n++;
    }
    if (n === this.maxStepsPerFrame) this.accumulator = 0; // drop the backlog
    this.steps += n;
    this.alpha = this.accumulator / this.fixedDelta;
    return n;
  }
}
