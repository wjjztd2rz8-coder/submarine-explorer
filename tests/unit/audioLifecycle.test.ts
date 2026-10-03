import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine, peakCurve } from '../../src/audio/AudioEngine.js';
import { AudioSystem } from '../../src/audio/AudioSystem.js';
import * as cues from '../../src/audio/Cues.js';
import { AmbientBeds, ThrusterLoop } from '../../src/audio/Loops.js';
import { AmbientScore } from '../../src/audio/Score.js';
import { MachineLoop, Soundscape, mechanicalCue } from '../../src/audio/Soundscape.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { CaptionBus } from '../../src/audio/events.js';

class Param {
  value = 1;
  setTargetAtTime = vi.fn((value: number) => {
    this.value = value;
  });
  setValueAtTime = vi.fn((value: number) => {
    this.value = value;
  });
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}
class Node {
  gain = new Param();
  frequency = new Param();
  detune = new Param();
  Q = new Param();
  playbackRate = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  attack = new Param();
  release = new Param();
  curve: Float32Array | null = null;
  onended: (() => void) | null = null;
  connections: Node[] = [];
  connect = vi.fn((node: Node) => {
    this.connections.push(node);
    return node;
  });
  disconnect = vi.fn(() => {
    this.connections = [];
  });
  start = vi.fn();
  stop = vi.fn();
  setPosition = vi.fn();
  constructor(readonly context: Context) {}
  end(): void {
    this.onended?.();
  }
}
class Context {
  static instances: Context[] = [];
  static resumeResult: (() => Promise<void>) | null = null;
  state = 'suspended';
  currentTime = 0;
  sampleRate = 100;
  nodes: Node[] = [];
  destination = new Node(this);
  listener = { setPosition: vi.fn(), setOrientation: vi.fn() };
  resume = vi.fn(async () => {
    if (Context.resumeResult) return Context.resumeResult();
    this.state = 'running';
  });
  suspend = vi.fn(async () => {
    this.state = 'suspended';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  constructor() {
    Context.instances.push(this);
  }
  private node(): Node {
    const node = new Node(this);
    this.nodes.push(node);
    return node;
  }
  decodeAudioData = vi.fn(async () => this.createBuffer(1, 100));
  createGain = () => this.node();
  createBiquadFilter = () => this.node();
  createOscillator = () => this.node();
  createBufferSource = () => this.node();
  createPanner = () => this.node();
  createDynamicsCompressor = () => this.node();
  createWaveShaper = () => this.node();
  createBuffer = (_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  });
}
const config = DEFAULT_CONFIG.audio;
let doc: EventTarget & { hidden: boolean };
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const context = () => Context.instances.at(-1)!;
const system = (bus = new EventBus()) => new AudioSystem(config, bus, { sampleHeight: () => -100 });
function visibility(hidden: boolean): void {
  doc.hidden = hidden;
  doc.dispatchEvent(new Event('visibilitychange'));
}
beforeEach(() => {
  Context.instances = [];
  Context.resumeResult = null;
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { AudioContext: Context, setTimeout, clearTimeout });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Optional recording unavailable')));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('audio lifecycle', () => {
  it('unlocks on the first gesture while paused and warms a source synchronously', async () => {
    const audio = system();
    audio.setPaused(true);
    audio.unlock();
    const ctx = context();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    const warmup = ctx.nodes.find((node) => node.start.mock.calls.length)!;
    expect(warmup.start).toHaveBeenCalledTimes(1);
    expect(audio.diagnostics.masterGain).toBe(0);
    warmup.end();
    expect(warmup.disconnect).toHaveBeenCalledTimes(1);
    await flush();
    expect(ctx.state).toBe('suspended');
    audio.setPaused(false);
    expect(ctx.state).toBe('running');
    expect(audio.diagnostics.masterGain).toBe(config.masterVolume);
    audio.dispose();
  });

  it('retries a rejected first touch while paused and releases its warmup source', async () => {
    Context.resumeResult = () => Promise.reject(new Error('Gesture not accepted'));
    const audio = system();
    audio.setPaused(true);
    audio.setSettings({ muted: true, masterVolume: 0.8, musicVolume: 0.2, sfxVolume: 0.3 });
    audio.unlock();
    const ctx = context();
    const warmup = ctx.nodes.find((node) => node.start.mock.calls.length)!;
    await flush();
    expect(warmup.disconnect).toHaveBeenCalledTimes(1);
    expect(warmup.stop).toHaveBeenCalledTimes(1);
    Context.resumeResult = null;
    audio.unlock();
    await flush();
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(ctx.state).toBe('suspended');
    audio.unlock();
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    audio.setPaused(false);
    expect(audio.diagnostics).toMatchObject({ masterGain: 0, musicGain: 0.2, sfxGain: 0.3 });
    audio.dispose();
  });

  it('keeps hidden and paused states independent and does not recreate voices on mode changes', async () => {
    const audio = system();
    audio.unlock();
    await flush();
    const ctx = context();
    const count = ctx.nodes.length;
    for (let i = 0; i < 10; i++) {
      audio.setPaused(true);
      visibility(true);
      audio.setPaused(false);
      expect(ctx.state).toBe('suspended');
      expect(audio.diagnostics.masterGain).toBe(0);
      audio.setSettings({ masterVolume: 0.8, muted: false });
      expect(audio.diagnostics.masterGain).toBe(0);
      visibility(false);
      expect(ctx.state).toBe('running');
      expect(audio.diagnostics.masterGain).toBe(0.8);
    }
    expect(ctx.nodes).toHaveLength(count);
    audio.setSettings({ muted: true });
    visibility(true);
    visibility(false);
    expect(audio.diagnostics.masterGain).toBe(0);
    audio.dispose();
    audio.dispose();
    for (const node of ctx.nodes) expect(node.connections).toEqual([]);
    expect(ctx.close).toHaveBeenCalledTimes(1);
    visibility(true);
    audio.unlock();
    expect(Context.instances).toHaveLength(1);
  });

  it('reconciles a late gesture resume with pause and disposal', async () => {
    const audio = system();
    audio.unlock();
    await flush();
    const ctx = context();
    ctx.state = 'interrupted';
    let resolveResume!: () => void;
    ctx.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveResume = () => {
            ctx.state = 'running';
            resolve();
          };
        }),
    );
    audio.unlock();
    audio.setPaused(true);
    expect(audio.diagnostics.masterGain).toBe(0);
    resolveResume();
    await flush();
    expect(ctx.state).toBe('suspended');
    audio.setPaused(false);
    audio.dispose();
    resolveResume();
    await flush();
    expect(ctx.suspend).toHaveBeenCalledTimes(2);
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  it('suspends a visibility resume that finishes after the tab hides again', async () => {
    const audio = system();
    audio.unlock();
    await flush();
    const ctx = context();
    visibility(true);
    let finish!: () => void;
    ctx.resume.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            ctx.state = 'running';
            resolve();
          };
        }),
    );
    visibility(false);
    visibility(true);
    finish();
    await flush();
    expect(ctx.state).toBe('suspended');
    expect(audio.diagnostics.masterGain).toBe(0);
    visibility(false);
    await flush();
    expect(ctx.state).toBe('running');
    audio.dispose();
  });

  it('resumes a late hide suspension after returning to a muted dive', async () => {
    const audio = system();
    audio.setSettings({ muted: true });
    audio.unlock();
    await flush();
    const ctx = context();
    let finish!: () => void;
    ctx.suspend.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            ctx.state = 'suspended';
            resolve();
          };
        }),
    );
    visibility(true);
    visibility(false);
    finish();
    await flush();
    expect(ctx.state).toBe('running');
    expect(audio.diagnostics.masterGain).toBe(0);
    audio.dispose();
  });

  it('suppresses every discrete cue while paused or hidden and cancels old echoes', async () => {
    vi.useFakeTimers();
    Object.assign(window, { setTimeout, clearTimeout });
    const bus = new EventBus();
    const audio = system(bus);
    audio.unlock();
    await flush();
    audio.update({
      depth: -10,
      throttle: 0,
      ballast: 0,
      speed: 0,
      position: { x: 0, y: -10, z: 0 },
      forward: { x: 0, y: -1, z: 0 },
      pingPressed: false,
    });
    audio.ping();
    expect(vi.getTimerCount()).toBe(1);
    for (const blocked of ['pause', 'hidden']) {
      if (blocked === 'pause') audio.setPaused(true);
      else visibility(true);
      const count = context().nodes.length;
      audio.playDiscoveryChime();
      audio.playScanTick();
      audio.playManipulator();
      audio.playShutter();
      audio.playExploreCue();
      audio.ping();
      bus.emit('env:trench', { depth: -7000 });
      bus.emit('sub:collided', { speed: 10, depth: -10 });
      bus.emit('scan:complete', { poiId: 'bow', landmarkId: 'titanic', firstTime: true });
      expect(context().nodes).toHaveLength(count);
      audio.setPaused(false);
    }
    expect(vi.getTimerCount()).toBe(0);
    visibility(false);
    vi.runAllTimers();
    audio.dispose();
  });
});

const cueCases = [
  () => (e: AudioEngine) => cues.playPing(e, config),
  () => (e: AudioEngine) => cues.playCollisionThud(e, config, 20),
  () => (e: AudioEngine) => cues.playHullCreak(e, config, 1),
  () => (e: AudioEngine) => cues.playBallastHiss(e, config),
  () => (e: AudioEngine) => cues.playEmergencyAlarm(e, config),
  () => (e: AudioEngine) => cues.playDiscoveryChime(e, config),
  () => (e: AudioEngine) => cues.playScanTick(e, config),
  () => (e: AudioEngine) => mechanicalCue(e, 'servo'),
];
describe('audio graph ownership and peaks', () => {
  it.each(cueCases)('disconnects every cue node after its last source ends (%#)', (makeCue) => {
    const engine = new AudioEngine(config);
    const ctx = context();
    const initial = ctx.nodes.length;
    makeCue()(engine);
    const nodes = ctx.nodes.slice(initial);
    const sources = nodes.filter((node) => node.start.mock.calls.length);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) source.end();
    for (const node of nodes) expect(node.disconnect).toHaveBeenCalledTimes(1);
    engine.dispose();
    for (const node of nodes) expect(node.disconnect).toHaveBeenCalledTimes(1);
  });

  it('stops and disconnects loops idempotently and releases suspended one-shots on teardown', () => {
    const engine = new AudioEngine(config);
    const ctx = context();
    const initial = ctx.nodes.length;
    const loops = [
      new ThrusterLoop(engine, config),
      new AmbientBeds(engine, config),
      new AmbientScore(engine, config),
      new MachineLoop(engine, 380),
    ];
    const loopNodes = ctx.nodes.slice(initial);
    for (const loop of loops) {
      loop.stop();
      loop.stop();
    }
    for (const node of loopNodes) expect(node.disconnect).toHaveBeenCalledTimes(1);
    for (const node of loopNodes.filter((node) => node.start.mock.calls.length))
      expect(node.stop).toHaveBeenCalledTimes(1);
    cues.playDiscoveryChime(engine, config);
    cues.playCollisionThud(engine, config, 50);
    engine.dispose();
    for (const node of ctx.nodes) expect(node.connections).toEqual([]);
    for (const node of ctx.nodes.filter((node) => node.start.mock.calls.length))
      expect(node.stop).toHaveBeenCalledTimes(loopNodes.includes(node) ? 1 : 2);
  });

  it('disconnects a whale call on habitat exit without leaving its gain connected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
    );
    const engine = new AudioEngine(config);
    const ctx = context();
    const soundscape = new Soundscape(engine, config, new CaptionBus());
    for (let i = 0; i < 8; i++) await flush();
    expect(soundscape.sampleReady).toBe(true);
    ctx.currentTime = 12;
    const initial = ctx.nodes.length;
    const position = { x: 0, y: -100, z: 0 };
    const forward = { x: 0, y: 0, z: -1 };
    soundscape.update(position, forward, [], false, true);
    const call = ctx.nodes.slice(initial);
    expect(call).toHaveLength(2);
    soundscape.update(position, forward, [], false, false);
    for (const node of call) expect(node.disconnect).toHaveBeenCalledTimes(1);
    ctx.currentTime += config.wildlifeGapS;
    soundscape.update(position, forward, [], false, true);
    const nextCall = ctx.nodes.slice(initial + 2);
    nextCall[0].end();
    for (const node of nextCall) expect(node.disconnect).toHaveBeenCalledTimes(1);
    soundscape.stop();
    soundscape.stop();
    engine.dispose();
    for (const node of ctx.nodes) expect(node.connections).toEqual([]);
  });

  it('routes the entire music and effects mix through compression and a bounded unity peak guard', () => {
    const engine = new AudioEngine(config);
    const ctx = context();
    const master = engine.master as unknown as Node;
    const compressor = master.connections[0];
    const limiter = compressor.connections[0];
    expect(limiter.connections).toEqual([ctx.destination]);
    expect(compressor.ratio.value).toBeGreaterThan(1);
    const curve = peakCurve(config.outputCeiling);
    expect(limiter.curve).toEqual(curve);
    expect(Math.max(...curve)).toBeLessThan(1);
    expect(Math.min(...curve)).toBeGreaterThan(-1);
    expect(curve[1536]).toBe(0.5);
    expect(curve[1024]).toBe(0);
    // WebAudio clamps out-of-range inputs to the end points of the curve.
    expect(curve[0]).toBeCloseTo(-config.outputCeiling);
    expect(curve.at(-1)).toBeCloseTo(config.outputCeiling);
    engine.dispose();
  });
});
