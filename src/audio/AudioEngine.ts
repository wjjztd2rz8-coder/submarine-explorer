/**
 * The WebAudio graph itself.
 *
 *   bus(ambient|sub|ui|sonar) -> SFX -> depthFilter -> master
 *   bus(music) -------------------------------------> master
 *   master -> compressor -> peak guard -> destination
 *
 * One shared depth low-pass rather than one per bus, because "the effects mix
 * gets muffled with depth" is a property of the water and hull between the
 * player's ears and every sound source, not of any one bus.
 *
 * No `howler` or other npm dependency: CONTRIBUTING-AGENTS.md pins the
 * runtime dependency list to exactly `three`, and raw WebAudio is simple
 * enough here that a wrapper isn't worth the addition.
 */

import type { AudioConfig } from '../core/Config.js';

export type BusName = 'ambient' | 'sub' | 'ui' | 'sonar' | 'music';

export class AudioEngine {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly depthFilter: BiquadFilterNode;
  private readonly buses: Record<BusName, GainNode>;
  private unlocked = false;
  readonly effects: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly peakGuard: WaveShaperNode;
  private readonly sources = new Set<() => void>();
  private disposed = false;

  constructor(private readonly config: AudioConfig) {
    // Safari still exposes webkitAudioContext only in some versions.
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = config.masterVolume;
    // Compress stacked cues, with a final sample ceiling for extreme overlaps.
    this.compressor = this.ctx.createDynamicsCompressor();
    const compression = config.mixCompression;
    this.compressor.threshold.value = compression.thresholdDb;
    this.compressor.knee.value = compression.kneeDb;
    this.compressor.ratio.value = compression.ratio;
    this.compressor.attack.value = compression.attackS;
    this.compressor.release.value = compression.releaseS;
    this.peakGuard = this.ctx.createWaveShaper();
    this.peakGuard.curve = peakCurve(config.outputCeiling);
    this.master.connect(this.compressor).connect(this.peakGuard).connect(this.ctx.destination);

    this.depthFilter = this.ctx.createBiquadFilter();
    this.depthFilter.type = 'lowpass';
    this.depthFilter.frequency.value = config.depthLowpassSurfaceHz;
    this.depthFilter.connect(this.master);

    this.effects = this.ctx.createGain();
    this.effects.gain.value = config.sfxVolume;
    this.effects.connect(this.depthFilter);
    this.buses = {
      music: this.ctx.createGain(),
      ambient: this.ctx.createGain(),
      sub: this.ctx.createGain(),
      ui: this.ctx.createGain(),
      sonar: this.ctx.createGain(),
    };
    for (const [name, gain] of Object.entries(this.buses))
      gain.connect(name === 'music' ? this.master : this.effects);
    this.bus('music').gain.value = config.musicVolume;
  }

  bus(name: BusName): GainNode {
    return this.buses[name];
  }

  /** Must be invoked from inside a user-gesture handler (autoplay policy). */
  unlock(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.unlocked && this.ctx.state === 'running') return Promise.resolve();
    const resumed = this.ctx.resume();
    // iOS needs a source started synchronously in the gesture, including when
    // the first touch opens a dive from a paused home screen.
    const source = this.ctx.createBufferSource();
    source.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    source.connect(this.master);
    const release = this.manageSources([source], []);
    source.start();
    return resumed.then(
      () => {
        this.unlocked = true;
      },
      () => {
        this.unlocked = false;
        release();
      },
    );
  }

  /** Release complete voice graphs on end or teardown, even while suspended. */
  manageSources(
    sources: AudioScheduledSourceNode[],
    nodes: AudioNode[],
    onEnded?: () => void,
  ): () => void {
    const pending = new Set(sources);
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      this.sources.delete(release);
      for (const source of sources) {
        source.onended = null;
        if (pending.has(source)) {
          try {
            source.stop();
          } catch {
            /* A source may already have ended before its event is delivered. */
          }
        }
        source.disconnect();
      }
      for (const node of nodes) node.disconnect();
    };
    for (const source of sources)
      source.onended = () => {
        pending.delete(source);
        if (!pending.size) {
          release();
          onEnded?.();
        }
      };
    this.sources.add(release);
    return release;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const release of this.sources) release();
    for (const node of [
      ...Object.values(this.buses),
      this.effects,
      this.depthFilter,
      this.master,
      this.compressor,
      this.peakGuard,
    ])
      node.disconnect();
    void this.ctx.close().catch(() => {});
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

/** Unity below the ceiling; bounded even when WebAudio sums signals above 1. */
export function peakCurve(ceiling: number): Float32Array<ArrayBuffer> {
  return Float32Array.from({ length: 2049 }, (_, i) =>
    Math.max(-ceiling, Math.min(ceiling, (i / 2048) * 2 - 1)),
  );
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
