import type { AudioConfig } from '../core/Config.js';
import type { AudioEngine } from './AudioEngine.js';
import { publicUrl } from '../util/publicUrl.js';
import type { CaptionBus } from './events.js';

export type SoundPosition = { x: number; y: number; z: number };
export interface SoundSite {
  id: string;
  kind: 'vent' | 'wreck' | 'reef';
  position: SoundPosition;
}

export function distanceGain(distance: number, range: number): number {
  return Math.max(0, 1 - Math.max(0, distance) / Math.max(1, range)) ** 2;
}

/** Filtered noise serves both quiet machinery loops and geological rumble. */
export class MachineLoop {
  private readonly source: AudioBufferSourceNode;
  private readonly gain: GainNode;
  constructor(
    private readonly engine: AudioEngine,
    hz: number,
    destination: AudioNode = engine.bus('sub'),
  ) {
    const ctx = engine.ctx;
    this.source = ctx.createBufferSource();
    this.source.buffer = engine.createNoiseBuffer();
    this.source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = hz;
    filter.Q.value = 7;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.source.connect(filter).connect(this.gain).connect(destination);
    this.source.start();
  }
  update(level: number): void {
    this.gain.gain.setTargetAtTime(level, this.engine.ctx.currentTime, 0.15);
  }
  stop(): void {
    this.source.stop();
  }
}

/** Short mechanical transients; deliberately softer than the sonar. */
export function mechanicalCue(engine: AudioEngine, kind: 'servo' | 'shutter' | 'shrimp'): void {
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = engine.createNoiseBuffer(0.4);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = kind === 'servo' ? 700 : kind === 'shutter' ? 2200 : 3800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(kind === 'shrimp' ? 0.07 : 0.16, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'servo' ? 0.35 : 0.06));
  source
    .connect(filter)
    .connect(gain)
    .connect(engine.bus(kind === 'shrimp' ? 'ambient' : 'sub'));
  source.start();
  source.stop(now + 0.4);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

/** Two fixed spatial voices bound to the nearest actual prop of each kind. */
export class Soundscape {
  private readonly voices: Array<{ kind: 'vent' | 'wreck'; panner: PannerNode; loop: MachineLoop }>;
  private whale: AudioBuffer | null = null;
  private whaleSource: AudioBufferSourceNode | null = null;
  private disposed = false;
  private nextWhale = 12;
  private nextReef = 0;
  private nextCaption = 0;
  constructor(
    private readonly engine: AudioEngine,
    private readonly config: AudioConfig,
    private readonly captions: CaptionBus,
  ) {
    this.voices = (['vent', 'wreck'] as const).map((kind) => {
      const panner = engine.ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = 12;
      panner.maxDistance = config.spatialRangeM;
      panner.rolloffFactor = 1;
      panner.connect(engine.bus('ambient'));
      return { kind, panner, loop: new MachineLoop(engine, kind === 'vent' ? 65 : 160, panner) };
    });
    // Audio fetch is optional; a failed request cannot interrupt the dive.
    void fetch(publicUrl('audio/noaa-humpback.ogg'))
      .then((r) => {
        if (!r.ok) throw new Error('Audio unavailable');
        return r.arrayBuffer();
      })
      .then((b) => engine.ctx.decodeAudioData(b))
      .then((b) => {
        if (!this.disposed) this.whale = b;
      })
      .catch(() => {});
  }
  update(
    position: SoundPosition,
    forward: SoundPosition,
    sites: readonly SoundSite[],
    reduceMotion: boolean,
    whaleHabitat: boolean,
  ): void {
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    const listener = ctx.listener;
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else {
      listener.setPosition(position.x, position.y, position.z);
      listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
    const distance = (site: SoundSite) =>
      Math.hypot(
        site.position.x - position.x,
        site.position.y - position.y,
        site.position.z - position.z,
      );
    for (const voice of this.voices) {
      let nearest: SoundSite | undefined;
      let range = this.config.spatialRangeM;
      for (const site of sites)
        if (site.kind === voice.kind && distance(site) < range) {
          range = distance(site);
          nearest = site;
        }
      voice.loop.update(
        nearest
          ? 0.2 *
              distanceGain(range, this.config.spatialRangeM) *
              (voice.kind === 'wreck' ? Math.max(0, Math.sin(now * 0.7)) ** 4 : 1)
          : 0,
      );
      if (nearest) {
        voice.panner.setPosition(nearest.position.x, nearest.position.y, nearest.position.z);
        if (range < 80 && now >= this.nextCaption) {
          this.captions.emit({
            id: voice.kind,
            text: voice.kind === 'vent' ? 'Vent rumbles nearby' : 'Wreck metal creaks nearby',
            durationS: 2,
          });
          this.nextCaption = now + 20;
        }
      }
    }
    if (sites.some((s) => s.kind === 'reef' && distance(s) < 80) && now >= this.nextReef) {
      mechanicalCue(this.engine, 'shrimp');
      this.nextReef = now + (reduceMotion ? 8 : 3 + Math.random() * 5);
      if (now >= this.nextCaption) {
        this.captions.emit({ id: 'shrimp', text: 'Snapping shrimp crackle', durationS: 2 });
        this.nextCaption = now + 20;
      }
    }
    const inWhaleRange = whaleHabitat && position.y > -1000 && position.y < -5;
    if (!inWhaleRange && this.whaleSource) {
      this.whaleSource.stop();
      this.whaleSource = null;
    }
    if (inWhaleRange && this.whale && now >= this.nextWhale && !this.whaleSource) {
      const source = ctx.createBufferSource();
      source.buffer = this.whale;
      // PMEL identifies this recording as 10x speed. Restore its original cadence.
      source.playbackRate.value = 0.1;
      const gain = ctx.createGain();
      gain.gain.value = 0.18;
      source.connect(gain).connect(this.engine.bus('ambient'));
      source.start();
      this.whaleSource = source;
      this.nextWhale = now + this.config.wildlifeGapS;
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.whaleSource === source) this.whaleSource = null;
      };
      this.captions.emit({ id: 'whale', text: 'Distant whale call', durationS: 4 });
    }
  }
  get sampleReady(): boolean {
    return this.whale !== null;
  }

  stop(): void {
    this.disposed = true;
    for (const v of this.voices) {
      v.loop.stop();
      v.panner.disconnect();
    }
    this.whaleSource?.stop();
  }
}
