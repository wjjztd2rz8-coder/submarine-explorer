/**
 * Top-level audio facade wired up from src/main.ts. Owns the WebAudio graph
 * lifecycle (created lazily on the first user gesture, per browser autoplay
 * policy), subscribes to the shared EventBus for discrete cues, and exposes
 * `update()` for the continuous per-frame state (depth, throttle, ballast,
 * position) that isn't a good fit for the event bus.
 *
 * See docs/audio.md for the full design writeup and manual test checklist.
 */

import type { EventBus } from '../core/EventBus.js';
import type { AudioConfig } from '../core/Config.js';
import { AudioEngine } from './AudioEngine.js';
import {
  playBallastHiss,
  playCollisionThud,
  playDiscoveryChime,
  playEmergencyAlarm,
  playHullCreak,
  playPing,
  playScanTick,
} from './Cues.js';
import { AmbientBeds, ThrusterLoop } from './Loops.js';
import { castSonarRay } from './Sonar.js';
import { CaptionBus, type AudioFrameInput, type TerrainSampler } from './events.js';

export class AudioSystem {
  /** Accessibility captions for every cue this system plays (A4 deliverable #5). */
  readonly captions = new CaptionBus();

  private engine: AudioEngine | null = null;
  private thruster: ThrusterLoop | null = null;
  private ambient: AmbientBeds | null = null;
  private lastFrame: AudioFrameInput | null = null;
  private lastBallastSign = 0;
  private lastCreakAt = -Infinity;
  private readonly unsubs: Array<() => void> = [];

  constructor(
    private readonly config: AudioConfig,
    private readonly bus: EventBus,
    private readonly terrain: TerrainSampler,
  ) {}

  /**
   * Build the WebAudio graph and start the loops. MUST be called from inside
   * a user-gesture handler (click/keydown) -- browsers refuse to start an
   * AudioContext otherwise. Safe to call more than once.
   */
  unlock(): void {
    if (this.engine) {
      this.engine.unlock();
      return;
    }
    this.engine = new AudioEngine(this.config);
    this.engine.unlock();
    this.thruster = new ThrusterLoop(this.engine, this.config);
    this.ambient = new AmbientBeds(this.engine, this.config);
    this.wireBusEvents();
  }

  get isReady(): boolean {
    return this.engine !== null;
  }

  private wireBusEvents(): void {
    this.unsubs.push(
      this.bus.on('sub:collided', ({ speed }) => {
        if (!this.engine) return;
        playCollisionThud(this.engine, this.config, speed);
        this.captions.emit({ id: 'collision', text: 'Hull scrapes bottom', durationS: 1.5 });
      }),
    );
    // A3's `sub:hullStress` already rate-limits itself to whenever stress
    // crosses `hullStressEventThreshold`; we additionally throttle creaks so
    // a sustained high-stress state doesn't retrigger every single frame.
    // `cause: 'impact'` is skipped here -- that moment is already covered by
    // the collision thud above; creaks are reserved for crush-depth pressure.
    this.unsubs.push(
      this.bus.on('sub:hullStress', ({ stress, cause }) => {
        if (!this.engine || cause !== 'pressure') return;
        const c = this.config;
        const now = this.engine.ctx.currentTime;
        const minGap = c.hullCreakMaxGapS - stress * (c.hullCreakMaxGapS - c.hullCreakMinGapS);
        if (now - this.lastCreakAt < minGap) return;
        this.lastCreakAt = now;
        playHullCreak(this.engine, this.config, stress);
        this.captions.emit({
          id: 'hull-creak',
          text: 'Hull creaks under pressure',
          durationS: 1.2,
        });
      }),
    );
    // B1's scan beam: a new catalogue entry gets the chime, a repeat scan of
    // something already logged gets a quiet tick so it still confirms.
    this.unsubs.push(
      this.bus.on('scan:complete', ({ firstTime }) => {
        if (firstTime) this.playDiscoveryChime();
        else this.playScanTick();
      }),
    );
    this.unsubs.push(
      this.bus.on('sub:emergencyBlow', ({ lockSeconds }) => {
        if (!this.engine) return;
        playEmergencyAlarm(this.engine, this.config);
        this.captions.emit({
          id: 'emergency-blow',
          text: `Emergency blow! Controls locked ${lockSeconds}s`,
          durationS: 2,
        });
      }),
    );
  }

  /**
   * Fire a sonar ping from the most recent frame's sub pose. Normally
   * triggered automatically by `update()` when `frame.pingPressed` is set
   * (the `ping` action -- Q / Tab / gamepad LB, see `Input.actions`); safe to
   * call directly too, e.g. from a debug console.
   */
  ping(): void {
    if (!this.engine || !this.lastFrame) return;
    const c = this.config;
    const engine = this.engine;

    playPing(engine, c);
    this.captions.emit({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 });

    const { position, forward } = this.lastFrame;
    const downRad = (c.sonarBeamDownDeg * Math.PI) / 180;
    const cos = Math.cos(downRad);
    const dir = {
      x: forward.x * cos,
      y: forward.y * cos - Math.sin(downRad),
      z: forward.z * cos,
    };
    const hit = castSonarRay(position, dir, this.terrain, {
      maxRangeM: c.sonarMaxRangeM,
      stepM: c.sonarRayStepM,
      speedOfSoundMps: c.sonarSpeedOfSoundMps,
    });
    if (!hit) return;

    window.setTimeout(() => {
      const rangeGain = 1 / (1 + hit.rangeM / 200);
      playPing(engine, c, rangeGain * 0.6, 0.9);
      this.captions.emit({
        id: 'sonar-echo',
        text: `Sonar echo, range ${Math.round(hit.rangeM)} m`,
        durationS: 0.6,
      });
    }, hit.delayS * 1000);
  }

  /** Call once per rendered frame (small additive hook in src/main.ts). */
  update(frame: AudioFrameInput): void {
    this.lastFrame = frame;
    if (!this.engine || !this.thruster || !this.ambient) return;

    this.engine.setDepth(frame.depth);
    this.thruster.update(frame.throttle);
    this.ambient.update(frame.depth);

    if (frame.pingPressed) this.ping();

    const ballastSign = Math.sign(frame.ballast);
    if (ballastSign !== 0 && ballastSign !== this.lastBallastSign) {
      playBallastHiss(this.engine, this.config);
      this.captions.emit({
        id: 'ballast',
        text: ballastSign > 0 ? 'Blowing ballast' : 'Flooding ballast',
        durationS: 1,
      });
    }
    this.lastBallastSign = ballastSign;
  }

  /** The discovery chime, played on `scan:complete` with `firstTime: true`. */
  playDiscoveryChime(): void {
    if (!this.engine) return;
    playDiscoveryChime(this.engine, this.config);
    this.captions.emit({ id: 'discovery', text: 'New discovery logged', durationS: 1.5 });
  }

  /** The quiet confirmation for re-scanning something already catalogued. */
  playScanTick(): void {
    if (!this.engine) return;
    playScanTick(this.engine, this.config);
    this.captions.emit({
      id: 'scan-repeat',
      text: 'Scan complete, already catalogued',
      durationS: 1,
    });
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    this.thruster?.stop();
    this.ambient?.stop();
  }
}
