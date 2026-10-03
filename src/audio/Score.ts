import type { AudioConfig } from '../core/Config.js';
import type { AudioEngine } from './AudioEngine.js';
import { bandWeights } from './DepthBands.js';

/** Pure state: discovery accents decay on the audio clock, which stops on pause. */
export class ScoreState {
  private accentAt = -Infinity;
  private accent = 0;
  constructor(private readonly config: AudioConfig) {}

  discover(now: number, strength = 1): void {
    this.accent = Math.max(
      this.accent * Math.exp(-(now - this.accentAt) / this.config.discoveryDecayS),
      strength,
    );
    this.accentAt = now;
  }

  mix(depth: number, ratedDepth: number, now: number, reduceMotion = false) {
    const ratio = ratedDepth < 0 ? Math.max(0, depth / ratedDepth) : 0;
    const tension = Math.min(
      1,
      Math.max(
        0,
        (ratio - this.config.tensionStartsAtRatio) / (1 - this.config.tensionStartsAtRatio),
      ),
    );
    return {
      weights: bandWeights(depth, this.config.scoreBands),
      tension: reduceMotion ? tension * 0.35 : tension,
      swell:
        this.accent *
        Math.exp(-Math.max(0, now - this.accentAt) / this.config.discoveryDecayS) *
        (reduceMotion ? 0.35 : 1),
    };
  }
}

/** Open fifths and suspended chords, gently breathing at independent periods. */
export class AmbientScore {
  readonly state: ScoreState;
  private readonly layers: Array<{ voices: OscillatorNode[]; gain: GainNode; release: () => void }>;
  constructor(
    private readonly engine: AudioEngine,
    private readonly config: AudioConfig,
  ) {
    this.state = new ScoreState(config);
    const ctx = engine.ctx;
    this.layers = config.scoreBands.map((band) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 900;
      gain.connect(tone).connect(engine.bus('music'));
      const voices = band.notes.map((hz, i) => {
        const voice = ctx.createOscillator();
        voice.type = 'sine';
        voice.frequency.value = hz;
        voice.detune.value = (i - 1) * 3;
        voice.connect(gain);
        voice.start();
        return voice;
      });
      const release = engine.manageSources(voices, [gain, tone]);
      return { voices, gain, release };
    });
  }
  update(depth: number, ratedDepth: number, reduceMotion: boolean): void {
    const now = this.engine.ctx.currentTime;
    const mix = this.state.mix(depth, ratedDepth, now, reduceMotion);
    this.layers.forEach((layer, i) => {
      const breath = reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(now / (11 + i * 3) + i);
      const gain =
        mix.weights[i] *
        this.config.scoreGain *
        breath *
        (1 + mix.swell * 0.7 + mix.tension * 0.25);
      layer.gain.gain.setTargetAtTime(gain, now, this.config.scoreFadeS);
      // A few cents of beating brings unease without an alarm or jump scare.
      layer.voices[1]?.detune.setTargetAtTime(mix.tension * 18, now, this.config.scoreFadeS);
    });
  }
  discover(strength = 1): void {
    this.state.discover(this.engine.ctx.currentTime, strength);
  }
  stop(): void {
    for (const layer of this.layers) layer.release();
  }
}
