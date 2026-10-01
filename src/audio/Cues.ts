/** Synthesised one-shot cues; the NOAA wildlife sample lives in Soundscape. */

import type { AudioConfig } from '../core/Config.js';
import type { AudioEngine } from './AudioEngine.js';

/** A single sonar chirp: a fast downward sine sweep. Reused for the echo. */
export function playPing(
  engine: AudioEngine,
  _config: AudioConfig,
  gain = 0.5,
  pitchScale = 1,
): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2600 * pitchScale, t0);
  osc.frequency.exponentialRampToValueAtTime(900 * pitchScale, t0 + 0.35);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);

  osc.connect(g).connect(engine.bus('sonar'));
  osc.start(t0);
  osc.stop(t0 + 0.45);
}

/** Low thud + filtered noise, sized by impact speed (sub:collided). */
export function playCollisionThud(
  engine: AudioEngine,
  config: AudioConfig,
  speedMps: number,
): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;
  const gainVal = Math.min(1, Math.max(0.08, speedMps * config.collisionThudGainPerMps));

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t0);
  osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.25);

  const noise = ctx.createBufferSource();
  noise.buffer = engine.createNoiseBuffer(0.3);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 500;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gainVal, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);

  osc.connect(g);
  noise.connect(noiseFilter).connect(g);
  g.connect(engine.bus('sub'));

  osc.start(t0);
  osc.stop(t0 + 0.4);
  noise.start(t0);
  noise.stop(t0 + 0.3);
}

/** Bandpassed noise burst; frequency and loudness rise with hull stress ratio. */
export function playHullCreak(engine: AudioEngine, _config: AudioConfig, ratio: number): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = engine.createNoiseBuffer(0.6);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 200 + ratio * 400;
  filter.Q.value = 6;

  const g = ctx.createGain();
  const vol = 0.15 + ratio * 0.35;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);

  noise.connect(filter).connect(g).connect(engine.bus('sub'));
  noise.start(t0);
  noise.stop(t0 + 0.6);
}

/** Short high-passed hiss, direction only changes which caption fires. */
export function playBallastHiss(engine: AudioEngine, _config: AudioConfig): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = engine.createNoiseBuffer(0.8);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1500;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);

  noise.connect(filter).connect(g).connect(engine.bus('sub'));
  noise.start(t0);
  noise.stop(t0 + 0.8);
}

/** Rising klaxon warble for an emergency blow (crush depth reached). */
export function playEmergencyAlarm(engine: AudioEngine, _config: AudioConfig): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  // Two-tone warble, like a klaxon, for ~1.6s.
  for (let i = 0; i < 4; i++) {
    const t = t0 + i * 0.4;
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(880, t + 0.2);
  }

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
  g.gain.setValueAtTime(0.3, t0 + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);

  osc.connect(g).connect(engine.bus('sub'));
  osc.start(t0);
  osc.stop(t0 + 1.75);
}

/** A bright major-triad arpeggio for a field-guide discovery unlock. */
export function playDiscoveryChime(engine: AudioEngine, _config: AudioConfig): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;
  const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;

    const g = ctx.createGain();
    const start = t0 + i * 0.08;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 1.0);

    osc.connect(g).connect(engine.bus('ui'));
    osc.start(start);
    osc.stop(start + 1.05);
  });
}

/**
 * A soft single "tick" for a scan of something already catalogued: confirms
 * the scan finished without re-celebrating it (`scan:complete`, firstTime false).
 */
export function playScanTick(engine: AudioEngine, _config: AudioConfig): void {
  const ctx = engine.ctx;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1046.5; // C6, an octave above the chime's root

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

  osc.connect(g).connect(engine.bus('ui'));
  osc.start(t0);
  osc.stop(t0 + 0.2);
}
