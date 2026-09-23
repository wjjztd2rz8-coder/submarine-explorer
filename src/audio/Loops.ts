/**
 * Continuous (looping) synthesised sources: the thruster hum and the
 * per-depth-band ambient bed. Both are started once and steered with
 * `AudioParam.setTargetAtTime` rather than being retriggered, so there is no
 * click/pop on every update.
 */

import type { AudioConfig } from '../core/Config.js';
import type { AudioEngine } from './AudioEngine.js';
import { bandWeights } from './DepthBands.js';

/** Sawtooth + filtered noise, pitch and gain modulated by throttle magnitude. */
export class ThrusterLoop {
  private readonly osc: OscillatorNode;
  private readonly noise: AudioBufferSourceNode;
  private readonly gain: GainNode;

  constructor(
    engine: AudioEngine,
    private readonly config: AudioConfig,
  ) {
    const ctx = engine.ctx;
    this.osc = ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = config.thrusterMinHz;

    this.noise = ctx.createBufferSource();
    this.noise.buffer = engine.createNoiseBuffer(2);
    this.noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;

    this.osc.connect(this.gain);
    this.noise.connect(noiseFilter).connect(this.gain);
    this.gain.connect(engine.bus('sub'));

    this.osc.start();
    this.noise.start();
  }

  /** `throttle` is -1..1; magnitude drives both pitch and loudness. */
  update(throttle: number): void {
    const ctx = this.osc.context;
    const mag = Math.min(1, Math.abs(throttle));
    const hz =
      this.config.thrusterMinHz + mag * (this.config.thrusterMaxHz - this.config.thrusterMinHz);
    this.osc.frequency.setTargetAtTime(hz, ctx.currentTime, 0.2);
    const targetGain = mag > 0.02 ? 0.05 + mag * 0.12 : 0.0001;
    this.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.3);
  }

  stop(): void {
    this.osc.stop();
    this.noise.stop();
  }
}

interface BedLayer {
  osc: OscillatorNode;
  noise: AudioBufferSourceNode;
  gain: GainNode;
}

/** One drone+noise layer per Config.audio.ambientBands entry, crossfaded by depth. */
export class AmbientBeds {
  private readonly layers: BedLayer[];

  constructor(
    engine: AudioEngine,
    private readonly config: AudioConfig,
  ) {
    const ctx = engine.ctx;
    this.layers = config.ambientBands.map((band) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = band.droneHz;

      const noise = ctx.createBufferSource();
      noise.buffer = engine.createNoiseBuffer(4);
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 300;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = band.noiseMix;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      osc.connect(gain);
      noise.connect(noiseFilter).connect(noiseGain).connect(gain);
      gain.connect(engine.bus('ambient'));

      osc.start();
      noise.start();
      return { osc, noise, gain };
    });
  }

  update(depthM: number): void {
    const ctx = this.layers[0]?.osc.context;
    if (!ctx) return;
    const weights = bandWeights(depthM, this.config.ambientBands);
    weights.forEach((w, i) => {
      // 0.18 keeps the loudest single band comfortably under the sonar/UI cues.
      this.layers[i].gain.gain.setTargetAtTime(w * 0.18, ctx.currentTime, 1.5);
    });
  }

  stop(): void {
    for (const layer of this.layers) {
      layer.osc.stop();
      layer.noise.stop();
    }
  }
}
