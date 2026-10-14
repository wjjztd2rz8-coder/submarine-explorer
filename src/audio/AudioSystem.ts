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
  playSensorCue,
  playScanTick,
} from './Cues.js';
import { AmbientBeds, ThrusterLoop } from './Loops.js';
import { AmbientScore } from './Score.js';
import { MachineLoop, Soundscape, mechanicalCue } from './Soundscape.js';
import { CaptionBus, type AudioFrameInput, type CaptionEvent } from './events.js';
// --- C3 begin ---
import { HADAL_TOP_M } from '../world/presets/maths.js';
// --- C3 end ---

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
  private paused = false;
  private hidden = false;

  private get playbackBlocked(): boolean {
    return this.paused || this.hidden;
  }
  private score: AmbientScore | null = null;
  private soundscape: Soundscape | null = null;
  private scanHum: MachineLoop | null = null;
  private lastThrust = 0;
  private scanning = false;
  private disposed = false;
  private settings: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    muted: boolean;
    reduceMotion: boolean;
  };

  setSettings(settings: Partial<typeof this.settings>): void {
    Object.assign(this.settings, settings);
    if (!this.engine || this.disposed) return;
    const now = this.engine.ctx.currentTime;
    this.engine.master.gain.setTargetAtTime(
      this.settings.muted || this.playbackBlocked ? 0 : this.settings.masterVolume,
      now,
      0.03,
    );
    this.engine.effects.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.03);
    this.engine.bus('music').gain.setTargetAtTime(this.settings.musicVolume, now, 0.03);
  }

  get diagnostics() {
    return {
      state: this.engine?.ctx.state ?? 'locked',
      sampleReady: this.soundscape?.sampleReady ?? false,
      musicVolume: this.settings.musicVolume,
      sfxVolume: this.settings.sfxVolume,
      muted: this.settings.muted,
      masterGain: this.engine?.master.gain.value ?? 0,
      musicGain: this.engine?.bus('music').gain.value ?? 0,
      sfxGain: this.engine?.effects.gain.value ?? 0,
      contextTime: this.engine?.ctx.currentTime ?? 0,
      score:
        this.score?.state.mix(
          this.lastFrame?.depth ?? 0,
          this.lastFrame?.ratedDepth ?? -6000,
          this.engine?.ctx.currentTime ?? 0,
          this.settings.reduceMotion,
        ) ?? null,
    };
  }

  idle(): void {
    this.thruster?.update(0);
    this.scanHum?.update(0);
    this.lastThrust = 0;
  }

  playShutter(): void {
    if (!this.engine || this.playbackBlocked || this.disposed) return;
    mechanicalCue(this.engine, 'shutter');
    this.captions.emit({ id: 'shutter', text: 'Camera shutter', durationS: 1 });
  }

  /** Quiet sensor cue for a nearby natural event, on the existing sonar bus. */
  playExploreCue(): void {
    if (!this.engine || this.playbackBlocked || this.disposed) return;
    playSensorCue(this.engine);
  }

  playManipulator(): void {
    if (!this.engine || this.playbackBlocked || this.disposed) return;
    mechanicalCue(this.engine, 'servo');
    this.captions.emit({ id: 'servo', text: 'Manipulator servo', durationS: 1.5 });
  }

  constructor(
    private readonly config: AudioConfig,
    private readonly bus: EventBus,
  ) {
    this.settings = {
      masterVolume: config.masterVolume,
      sfxVolume: config.sfxVolume,
      musicVolume: config.musicVolume,
      muted: false,
      reduceMotion: false,
    };
    if (typeof document !== 'undefined') {
      const onVisibility = (): void => {
        this.hidden = document.hidden;
        this.syncPlayback();
      };
      this.hidden = document.hidden;
      document.addEventListener('visibilitychange', onVisibility);
      this.unsubs.push(() => document.removeEventListener('visibilitychange', onVisibility));
    }
  }

  /**
   * Build the WebAudio graph and start the loops. MUST be called from inside
   * a user-gesture handler (click/keydown) -- browsers refuse to start an
   * AudioContext otherwise. Safe to call more than once.
   */
  unlock(): void {
    if (this.disposed) return;
    if (this.engine) {
      if (this.playbackBlocked && this.engine.isUnlocked) return;
      void this.engine.unlock().then(() => this.syncPlayback());
      return;
    }
    this.engine = new AudioEngine(this.config);
    // Apply saved gains before any source starts, including a muted first touch.
    this.engine.master.gain.value =
      this.settings.muted || this.playbackBlocked ? 0 : this.settings.masterVolume;
    this.engine.effects.gain.value = this.settings.sfxVolume;
    this.engine.bus('music').gain.value = this.settings.musicVolume;
    void this.engine.unlock().then(() => this.syncPlayback());
    this.thruster = new ThrusterLoop(this.engine, this.config);
    this.ambient = new AmbientBeds(this.engine, this.config);
    this.score = new AmbientScore(this.engine, this.config);
    this.soundscape = new Soundscape(this.engine, this.config, this.captions);
    this.scanHum = new MachineLoop(this.engine, 380);
    this.setSettings(this.settings);
    this.wireBusEvents();
  }

  get isReady(): boolean {
    return this.engine !== null;
  }

  /** Suspend continuous audio while the app shell has frozen the dive. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.engine || this.disposed) return;
    this.syncPlayback();
  }

  private syncPlayback(): void {
    if (!this.engine || this.disposed) return;
    const blocked = this.playbackBlocked;
    // Visibility and shell transitions can reverse while suspend/resume is
    // pending. Reconcile either completion against the latest desired state.
    const reconcile = (): void => {
      if (!this.disposed && blocked !== this.playbackBlocked) this.syncPlayback();
    };
    if (blocked) {
      // Silence synchronously, including when a resume promise is still pending.
      this.engine.master.gain.cancelScheduledValues(this.engine.ctx.currentTime);
      this.engine.master.gain.value = 0;
      void this.engine.ctx.suspend().then(reconcile, () => {});
    } else {
      this.setSettings(this.settings);
      void this.engine.ctx.resume().then(reconcile, () => {});
    }
  }

  private wireBusEvents(): void {
    this.unsubs.push(
      this.bus.on('scan:started', () => {
        this.playManipulator();
        this.scanning = true;
        this.captions.emit({ id: 'scan-hum', text: 'Scan beam hums', durationS: 1.5 });
      }),
      this.bus.on('scan:aborted', () => {
        if (this.scanning) this.playManipulator();
        this.scanning = false;
        this.scanHum?.update(0);
      }),
      this.bus.on('mission:objective', ({ complete }) => {
        if (complete && !this.playbackBlocked) this.score?.discover(1.2);
      }),
    );
    this.unsubs.push(
      this.bus.on('sub:collided', ({ speed }) => {
        if (!this.engine || this.disposed || this.playbackBlocked) return;
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
        if (cause !== 'pressure') return;
        const c = this.config;
        const minGap = c.hullCreakMaxGapS - stress * (c.hullCreakMaxGapS - c.hullCreakMinGapS);
        this.tryHullCreak(stress, minGap, {
          id: 'hull-creak',
          text: 'Hull creaks under pressure',
          durationS: 1.2,
        });
      }),
    );
    // --- C3 begin ---
    // Trench events supply the depth-dependent cadence. Share the existing
    // cooldown with pressure stress so both sources cannot creak at once.
    this.unsubs.push(
      this.bus.on('env:trench', ({ depth }) => {
        const stress = Math.min(1, Math.max(0, -depth / HADAL_TOP_M - 1));
        this.tryHullCreak(stress, this.config.hullCreakMinGapS, {
          id: 'trench-creak',
          text: 'Hull creaks under deep pressure',
          durationS: 1.2,
        });
      }),
    );
    // --- C3 end ---
    // B1's scan beam: a new catalogue entry gets the chime, a repeat scan of
    // something already logged gets a quiet tick so it still confirms.
    this.unsubs.push(
      this.bus.on('scan:complete', ({ firstTime }) => {
        if (this.scanning) this.playManipulator();
        this.scanning = false;
        this.scanHum?.update(0);
        if (!this.playbackBlocked) this.score?.discover(firstTime ? 1 : 0.45);
        if (firstTime) this.playDiscoveryChime();
        else this.playScanTick();
      }),
    );
    this.unsubs.push(
      this.bus.on('sub:emergencyBlow', ({ lockSeconds }) => {
        if (!this.engine || this.disposed || this.playbackBlocked) return;
        playEmergencyAlarm(this.engine, this.config);
        this.captions.emit({
          id: 'emergency-blow',
          text: `Emergency blow! Controls locked ${lockSeconds}s`,
          durationS: 2,
        });
      }),
    );
  }

  private tryHullCreak(stress: number, minGap: number, caption: CaptionEvent): void {
    if (!this.engine || this.disposed || this.playbackBlocked) return;
    const now = this.engine.ctx.currentTime;
    if (now - this.lastCreakAt < minGap) return;
    // Reserve the shared cooldown before playback or caption callbacks can re-enter.
    this.lastCreakAt = now;
    playHullCreak(this.engine, this.config, stress);
    this.captions.emit(caption);
  }

  /** Call once per rendered frame (small additive hook in src/main.ts). */
  update(frame: AudioFrameInput): void {
    this.lastFrame = frame;
    if (!this.engine || !this.thruster || !this.ambient || this.playbackBlocked || this.disposed)
      return;

    this.engine.setDepth(frame.depth);
    this.thruster.update(frame.throttle);
    if (Math.abs(frame.throttle) > 0.2 && this.lastThrust <= 0.2)
      this.captions.emit({ id: 'thruster', text: 'Thrusters whine', durationS: 1.5 });
    this.lastThrust = Math.abs(frame.throttle);
    this.ambient.update(frame.depth);
    this.score?.update(frame.depth, frame.ratedDepth ?? -6000, this.settings.reduceMotion);
    this.soundscape?.update(
      frame.position,
      frame.forward,
      frame.soundSites ?? [],
      this.settings.reduceMotion,
      frame.whaleHabitat ?? false,
    );
    this.scanHum?.update(this.scanning ? 0.06 : 0);
    const stress = frame.hullStress ?? 0;
    const gap = 20 - Math.min(1, stress) * 17;
    if (frame.depth < -200) {
      this.tryHullCreak(Math.max(stress, Math.min(0.3, -frame.depth / 20000)), gap, {
        id: 'hull-creak',
        text: 'Hull creaks under pressure',
        durationS: 1.5,
      });
    }

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
    if (!this.engine || this.disposed || this.playbackBlocked) return;
    this.score?.discover();
    playDiscoveryChime(this.engine, this.config);
    this.captions.emit({ id: 'discovery', text: 'New discovery logged', durationS: 1.5 });
  }

  /** The quiet confirmation for re-scanning something already catalogued. */
  playScanTick(): void {
    if (!this.engine || this.disposed || this.playbackBlocked) return;
    playScanTick(this.engine, this.config);
    this.captions.emit({
      id: 'scan-repeat',
      text: 'Scan complete, already catalogued',
      durationS: 1,
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.score?.stop();
    this.soundscape?.stop();
    this.scanHum?.stop();

    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    this.thruster?.stop();
    this.ambient?.stop();
    this.engine?.dispose();
  }
}
