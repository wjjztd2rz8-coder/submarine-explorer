import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Save, migrate, type SettingsStorage } from '../../src/core/Save.js';
import { ScoreState } from '../../src/audio/Score.js';
import { distanceGain } from '../../src/audio/Soundscape.js';

const config = DEFAULT_CONFIG;
describe('adaptive score', () => {
  it('mixes all five named depth bands and never changes total weight', () => {
    const score = new ScoreState(config.audio);
    expect(config.audio.scoreBands.map((b) => b.name)).toEqual([
      'sunlit',
      'twilight',
      'midnight',
      'abyssal',
      'hadal',
    ]);
    for (let depth = 20; depth >= -11000; depth -= 79) {
      const mix = score.mix(depth, -12000, 0);
      expect(mix.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      expect(mix.weights.every((w) => w >= 0 && w <= 1)).toBe(true);
    }
    expect(score.mix(0, -1000, 0).weights).toEqual([1, 0, 0, 0, 0]);
    expect(score.mix(-11000, -12000, 0).weights).toEqual([0, 0, 0, 0, 1]);
    expect(score.mix(-2500, -6000, 0).weights).toEqual([0, 0, 0.5, 0.5, 0]);
  });
  it('is calm at the surface and tension follows the fitted hull rating', () => {
    const score = new ScoreState(config.audio);
    expect(score.mix(0, -1000, 0).tension).toBe(0);
    expect(score.mix(-790, -1000, 0).tension).toBe(0);
    expect(score.mix(-900, -1000, 0).tension).toBeCloseTo(0.5);
    expect(score.mix(-900, -6000, 0).tension).toBe(0);
    expect(score.mix(-2000, -1000, 0).tension).toBe(1);
  });
  it('swells on discovery, decays on the audio clock and bounds stacked discoveries', () => {
    const score = new ScoreState(config.audio);
    expect(score.mix(-200, -6000, 0).swell).toBe(0);
    score.discover(10);
    expect(score.mix(-200, -6000, 10).swell).toBe(1);
    expect(score.mix(-200, -6000, 19).swell).toBeCloseTo(Math.exp(-1));
    score.discover(19, 0.45);
    expect(score.mix(-200, -6000, 19).swell).toBe(0.45);
    score.discover(19, 1.2);
    score.discover(19, 1);
    expect(score.mix(-200, -6000, 19).swell).toBe(1.2);
    expect(score.mix(-200, -6000, 200).swell).toBeLessThan(0.000001);
  });
  it('softens motion without changing the depth palette', () => {
    const score = new ScoreState(config.audio);
    score.discover(0);
    const normal = score.mix(-900, -1000, 1);
    const reduced = score.mix(-900, -1000, 1, true);
    expect(reduced.weights).toEqual(normal.weights);
    expect(reduced.tension).toBeCloseTo(normal.tension * 0.35);
    expect(reduced.swell).toBeCloseTo(normal.swell * 0.35);
  });
});
describe('soundscape range', () => {
  it('falls smoothly to silence outside the source radius', () => {
    expect(distanceGain(0, 240)).toBe(1);
    expect(distanceGain(120, 240)).toBe(0.25);
    expect(distanceGain(240, 240)).toBe(0);
    expect(distanceGain(1000, 240)).toBe(0);
  });
});
describe('audio settings', () => {
  it('honours audio configuration when creating a new save', () => {
    const save = new Save({
      config: { ...config, audio: { ...config.audio, musicVolume: 0.25, masterVolume: 0.4 } },
      storage: null,
    });
    expect(save.get()).toMatchObject({
      musicVolume: 0.25,
      masterVolume: 0.4,
      sfxVolume: config.audio.sfxVolume,
    });
  });
  it('fills old saves and sanitizes volumes independently', () => {
    expect(migrate({ version: 1 }, config).musicVolume).toBe(config.audio.musicVolume);
    const saved = migrate(
      { version: 2, musicVolume: 0, sfxVolume: 9, masterVolume: -1, muted: true },
      config,
    );
    expect(saved).toMatchObject({ musicVolume: 0, sfxVolume: 1, masterVolume: 0, muted: true });
    expect(migrate({ version: 2, musicVolume: NaN, muted: 'yes' }, config)).toMatchObject({
      musicVolume: config.audio.musicVolume,
      muted: false,
    });
  });
  it('round trips separate volume settings and mute', () => {
    const map = new Map<string, string>();
    const storage: SettingsStorage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        map.set(k, v);
      },
      removeItem: (k) => {
        map.delete(k);
      },
    };
    const save = new Save({ config, storage });
    save.save({ musicVolume: 0.37, masterVolume: 0.7, sfxVolume: 0.2, muted: true });
    expect(new Save({ config, storage }).get()).toMatchObject({
      musicVolume: 0.37,
      masterVolume: 0.7,
      sfxVolume: 0.2,
      muted: true,
    });
    save.reset();
    expect(save.get().musicVolume).toBe(config.audio.musicVolume);
  });
});

describe('scan arm cues', () => {
  it('sounds the servo on deployment and retraction and unsubscribes on disposal', async () => {
    const { AudioSystem } = await import('../../src/audio/AudioSystem.js');
    const { EventBus } = await import('../../src/core/EventBus.js');
    const bus = new EventBus();
    const audio = new AudioSystem(config.audio, bus, { sampleHeight: () => -100 });
    const servo = vi.spyOn(audio, 'playManipulator').mockImplementation(() => {});
    vi.spyOn(audio, 'playDiscoveryChime').mockImplementation(() => {});
    (audio as unknown as { wireBusEvents(): void }).wireBusEvents();
    bus.emit('scan:started', { poiId: 'bow' });
    expect(servo).toHaveBeenCalledTimes(1);
    bus.emit('scan:complete', { poiId: 'bow', landmarkId: 'titanic', firstTime: true });
    expect(servo).toHaveBeenCalledTimes(2);
    bus.emit('scan:aborted', { poiId: 'bow', reason: 'released' });
    expect(servo).toHaveBeenCalledTimes(2);
    bus.emit('scan:started', { poiId: 'bow' });
    bus.emit('scan:aborted', { poiId: 'bow', reason: 'range' });
    expect(servo).toHaveBeenCalledTimes(4);
    audio.dispose();
    bus.emit('scan:started', { poiId: 'bow' });
    expect(servo).toHaveBeenCalledTimes(4);
  });
});
