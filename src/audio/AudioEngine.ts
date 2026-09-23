/**
 * The WebAudio graph itself.
 *
 *   bus(ambient|sub|ui|sonar) -> depthFilter (shared lowpass) -> master -> destination
 *
 * One shared depth low-pass rather than one per bus, because "the whole mix
 * gets muffled with depth" is a property of the water and hull between the
 * player's ears and every sound source, not of any one bus.
 *
 * No `howler` or other npm dependency: CONTRIBUTING-AGENTS.md pins the
 * runtime dependency list to exactly `three`, and raw WebAudio is simple
 * enough here that a wrapper isn't worth the addition.
 */

import type { AudioConfig } from '../core/Config.js';

export type BusName = 'ambient' | 'sub' | 'ui' | 'sonar';

export class AudioEngine {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly depthFilter: BiquadFilterNode;
  private readonly buses: Record<BusName, GainNode>;
  private unlocked = false;

  constructor(private readonly config: AudioConfig) {
    // Safari still exposes webkitAudioContext only in some versions.
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = config.masterVolume;
    this.master.connect(this.ctx.destination);

    this.depthFilter = this.ctx.createBiquadFilter();
    this.depthFilter.type = 'lowpass';
    this.depthFilter.frequency.value = config.depthLowpassSurfaceHz;
    this.depthFilter.connect(this.master);

    this.buses = {
      ambient: this.ctx.createGain(),
      sub: this.ctx.createGain(),
      ui: this.ctx.createGain(),
      sonar: this.ctx.createGain(),
    };
    for (const gain of Object.values(this.buses)) gain.connect(this.depthFilter);
  }

  bus(name: BusName): GainNode {
    return this.buses[name];
  }

  /** Must be invoked from inside a user-gesture handler (autoplay policy). */
  unlock(): void {
    this.unlocked = true;
    void this.ctx.resume();
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Slew the shared depth low-pass toward the cutoff for the given depth. */
  setDepth(depthM: number): void {
    const c = this.config;
    const t = clamp01(depthM / c.lowpassFullAt); // both operands <= 0 -> t in [0,1]
    const hz = lerp(c.depthLowpassSurfaceHz, c.depthLowpassAbyssHz, t);
    this.depthFilter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.25);
  }

  /** A short buffer of white noise, looped by callers that want a bed/hiss. */
  createNoiseBuffer(durationS = 2): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(rate * durationS)), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
