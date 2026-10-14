import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine, peakCurve } from '../../src/audio/AudioEngine.js';
import { AudioSystem } from '../../src/audio/AudioSystem.js';
import * as cues from '../../src/audio/Cues.js';
import { AmbientBeds, ThrusterLoop } from '../../src/audio/Loops.js';
import { AmbientScore } from '../../src/audio/Score.js';
import { MachineLoop, Soundscape, mechanicalCue } from '../../src/audio/Soundscape.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { CaptionBus, type AudioFrameInput } from '../../src/audio/events.js';

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
const system = (bus = new EventBus()) => new AudioSystem(config, bus);
const creakFrame = (depth = -7000, hullStress?: number): AudioFrameInput => ({
  depth,
  hullStress,
  throttle: 0,
  ballast: 0,
  speed: 0,
  position: { x: 0, y: depth, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
});
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
  it('three dive-to-Home lifetimes silence audio and release voices, timers and visibility listeners', async () => {
    vi.useFakeTimers();
    const remove = vi.spyOn(doc, 'removeEventListener');
    for (let i = 0; i < 3; i++) {
      const audio = system();
      audio.unlock();
      await flush();
      const ctx = context();
      audio.update(creakFrame());
      audio.setPaused(true);
      await flush();
      expect(audio.diagnostics.masterGain).toBe(0);
      expect(ctx.state).toBe('suspended');
      audio.dispose();
      audio.dispose();
      expect(ctx.close).toHaveBeenCalledOnce();
      expect(ctx.state).toBe('closed');
      for (const node of ctx.nodes) expect(node.connections).toEqual([]);
      expect(vi.getTimerCount()).toBe(0);
      const suspends = ctx.suspend.mock.calls.length;
      visibility(true);
      visibility(false);
      audio.unlock();
      expect(ctx.suspend).toHaveBeenCalledTimes(suspends);
      expect(Context.instances).toHaveLength(i + 1);
    }
    expect(remove.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(3);
  });

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

  it('has no player ping or echo path and preserves the quiet environment sensor cue', async () => {
    vi.useFakeTimers();
    const audio = system();
    audio.unlock();
    await flush();
    const captions: string[] = [];
    audio.captions.on((event) => captions.push(event.id));
    const before = context().nodes.length;
    audio.update({
      depth: -10,
      throttle: 0,
      ballast: 0,
      speed: 0,
      position: { x: 0, y: -10, z: 0 },
      forward: { x: 0, y: -1, z: 0 },
    });
    expect(context().nodes).toHaveLength(before);
    expect(audio).not.toHaveProperty('ping');
    expect(cues).not.toHaveProperty('playPing');
    audio.playExploreCue();
    const [osc, gain] = context().nodes.slice(before);
    expect(osc!.frequency.setValueAtTime).toHaveBeenCalledWith(780, 0);
    expect(osc!.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(270, 0.35);
    expect(gain!.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.025, 0.01);
    expect(vi.getTimerCount()).toBe(0);
    expect(captions).not.toContain('sonar-ping');
    expect(captions).not.toContain('sonar-echo');
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('suppresses every discrete cue while paused or hidden without echo timers', async () => {
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
    });
    audio.playExploreCue();
    expect(vi.getTimerCount()).toBe(0);
    for (const blocked of ['pause', 'hidden']) {
      if (blocked === 'pause') audio.setPaused(true);
      else visibility(true);
      const count = context().nodes.length;
      audio.playDiscoveryChime();
      audio.playScanTick();
      audio.playManipulator();
      audio.playShutter();
      audio.playExploreCue();
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

describe('hull creak dispatch', () => {
  it.each([0, 0.5, 1])(
    'keeps pressure stress %s and its configured boundary gap',
    async (stress) => {
      const bus = new EventBus();
      const custom = { ...config, hullCreakMinGapS: 1, hullCreakMaxGapS: 5 };
      const audio = new AudioSystem(custom, bus);
      const creak = vi.spyOn(cues, 'playHullCreak');
      const caption = vi.fn();
      audio.captions.on(caption);
      audio.unlock();
      await flush();
      const emit = () => bus.emit('sub:hullStress', { stress, cause: 'pressure', depth: -100 });
      emit();
      expect(creak).toHaveBeenCalledWith(expect.any(AudioEngine), custom, stress);
      expect(caption).toHaveBeenLastCalledWith({
        id: 'hull-creak',
        text: 'Hull creaks under pressure',
        durationS: 1.2,
      });
      const gap = 5 - stress * 4;
      context().currentTime = gap - 0.001;
      emit();
      expect(creak).toHaveBeenCalledTimes(1);
      expect(caption).toHaveBeenCalledTimes(1);
      context().currentTime = gap;
      emit();
      expect(creak).toHaveBeenCalledTimes(2);
      expect(caption).toHaveBeenCalledTimes(2);
      audio.dispose();
    },
  );

  it.each([
    [0, 0],
    [-6000, 0],
    [-9000, 0.5],
    [-12000, 1],
    [-18000, 1],
  ])('keeps trench depth %s at stress %s and the minimum boundary gap', async (depth, stress) => {
    const bus = new EventBus();
    const audio = system(bus);
    const creak = vi.spyOn(cues, 'playHullCreak');
    const caption = vi.fn();
    audio.captions.on(caption);
    audio.unlock();
    await flush();
    const emit = () => bus.emit('env:trench', { depth });
    emit();
    expect(creak).toHaveBeenCalledWith(expect.any(AudioEngine), config, stress);
    expect(caption).toHaveBeenLastCalledWith({
      id: 'trench-creak',
      text: 'Hull creaks under deep pressure',
      durationS: 1.2,
    });
    context().currentTime = config.hullCreakMinGapS - 0.001;
    emit();
    expect(creak).toHaveBeenCalledTimes(1);
    expect(caption).toHaveBeenCalledTimes(1);
    context().currentTime = config.hullCreakMinGapS;
    emit();
    expect(creak).toHaveBeenCalledTimes(2);
    expect(caption).toHaveBeenCalledTimes(2);
    audio.dispose();
  });

  it.each([
    [-201, undefined, 0.01005, 20],
    [-4000, undefined, 0.2, 20],
    [-10000, undefined, 0.3, 20],
    [-8000, 0.5, 0.5, 11.5],
    [-8000, 1.5, 1.5, 3],
  ])(
    'keeps frame depth %s, stress %s, cue ratio %s and gap %s',
    async (depth, stress, ratio, gap) => {
      const audio = system();
      const creak = vi.spyOn(cues, 'playHullCreak');
      const caption = vi.fn();
      audio.captions.on(caption);
      audio.unlock();
      await flush();
      audio.update(creakFrame(-200, stress));
      expect(creak).not.toHaveBeenCalled();
      const frame = creakFrame(depth, stress);
      audio.update(frame);
      expect(creak).toHaveBeenCalledWith(expect.any(AudioEngine), config, ratio);
      expect(caption).toHaveBeenLastCalledWith({
        id: 'hull-creak',
        text: 'Hull creaks under pressure',
        durationS: 1.5,
      });
      context().currentTime = gap - 0.001;
      audio.update(frame);
      expect(creak).toHaveBeenCalledTimes(1);
      expect(caption).toHaveBeenCalledTimes(1);
      context().currentTime = gap;
      audio.update(frame);
      expect(creak).toHaveBeenCalledTimes(2);
      expect(caption).toHaveBeenCalledTimes(2);
      audio.dispose();
    },
  );

  it('ignores impact stress while collision thuds stay independent of creak cooldown', async () => {
    const bus = new EventBus();
    const audio = system(bus);
    const creak = vi.spyOn(cues, 'playHullCreak');
    const thud = vi.spyOn(cues, 'playCollisionThud');
    const caption = vi.fn();
    audio.captions.on(caption);
    audio.unlock();
    await flush();
    bus.emit('sub:hullStress', { stress: 1, cause: 'impact', depth: -7000 });
    expect(creak).not.toHaveBeenCalled();
    expect(thud).not.toHaveBeenCalled();
    expect(caption).not.toHaveBeenCalled();
    bus.emit('sub:collided', { speed: 10, depth: -7000 });
    bus.emit('sub:hullStress', { stress: 1, cause: 'pressure', depth: -7000 });
    bus.emit('sub:collided', { speed: 20, depth: -7000 });
    expect(creak).toHaveBeenCalledTimes(1);
    expect(thud).toHaveBeenCalledTimes(2);
    expect(thud).toHaveBeenLastCalledWith(expect.any(AudioEngine), config, 20);
    expect(caption.mock.calls.map(([event]) => event.id)).toEqual([
      'collision',
      'hull-creak',
      'collision',
    ]);
    expect(caption).toHaveBeenLastCalledWith({
      id: 'collision',
      text: 'Hull scrapes bottom',
      durationS: 1.5,
    });
    audio.dispose();
  });

  it.each([
    ['pressure', 'trench', 'frame'],
    ['pressure', 'frame', 'trench'],
    ['trench', 'pressure', 'frame'],
    ['trench', 'frame', 'pressure'],
    ['frame', 'pressure', 'trench'],
    ['frame', 'trench', 'pressure'],
  ])('shares cooldown for coincident %s, %s, %s inputs and caption re-entry', async (...order) => {
    const bus = new EventBus();
    const audio = system(bus);
    const creak = vi.spyOn(cues, 'playHullCreak');
    const caption = vi.fn(() => bus.emit('env:trench', { depth: -9000 }));
    audio.captions.on(caption);
    audio.unlock();
    await flush();
    const inputs: Record<string, () => void> = {
      pressure: () => bus.emit('sub:hullStress', { stress: 1, cause: 'pressure', depth: -9000 }),
      trench: () => bus.emit('env:trench', { depth: -9000 }),
      frame: () => audio.update(creakFrame(-9000, 1)),
    };
    for (const source of order) inputs[source]();
    expect(creak).toHaveBeenCalledTimes(1);
    expect(caption).toHaveBeenCalledTimes(1);
    expect(caption).toHaveBeenLastCalledWith({
      id: order[0] === 'trench' ? 'trench-creak' : 'hull-creak',
      text:
        order[0] === 'trench' ? 'Hull creaks under deep pressure' : 'Hull creaks under pressure',
      durationS: order[0] === 'frame' ? 1.5 : 1.2,
    });
    context().currentTime = config.hullCreakMinGapS - 0.001;
    for (const source of order) inputs[source]();
    expect(creak).toHaveBeenCalledTimes(1);
    expect(caption).toHaveBeenCalledTimes(1);
    // The incoming frame still uses its longer gap after a trench/pressure cue.
    context().currentTime = config.hullCreakMinGapS;
    inputs.frame();
    expect(creak).toHaveBeenCalledTimes(1);
    inputs.trench();
    inputs.pressure();
    expect(creak).toHaveBeenCalledTimes(2);
    expect(caption).toHaveBeenCalledTimes(2);
    audio.dispose();
  });

  it.each(['pause', 'hidden'])(
    'blocks all inputs during %s without consuming cooldown on return',
    async (blocked) => {
      const bus = new EventBus();
      const audio = system(bus);
      const creak = vi.spyOn(cues, 'playHullCreak');
      const caption = vi.fn();
      audio.captions.on(caption);
      const inputs = () => {
        bus.emit('sub:hullStress', { stress: 1, cause: 'pressure', depth: -9000 });
        bus.emit('env:trench', { depth: -9000 });
        audio.update(creakFrame(-9000, 1));
      };
      inputs();
      expect(Context.instances).toHaveLength(0);
      expect(creak).not.toHaveBeenCalled();
      expect(caption).not.toHaveBeenCalled();
      audio.unlock();
      await flush();
      inputs();
      if (blocked === 'pause') audio.setPaused(true);
      else visibility(true);
      context().currentTime = 3;
      inputs();
      expect(creak).toHaveBeenCalledTimes(1);
      expect(caption).toHaveBeenCalledTimes(1);
      if (blocked === 'pause') audio.setPaused(false);
      else visibility(false);
      inputs();
      expect(creak).toHaveBeenCalledTimes(2);
      expect(caption).toHaveBeenCalledTimes(2);
      audio.dispose();
    },
  );

  it.each(['pressure', 'trench'] as const)(
    'ignores a queued %s callback when an earlier event listener disposes audio',
    async (source) => {
      const bus = new EventBus();
      let audio: AudioSystem;
      const off = bus.on(source === 'pressure' ? 'sub:hullStress' : 'env:trench', () =>
        audio.dispose(),
      );
      audio = system(bus);
      const creak = vi.spyOn(cues, 'playHullCreak');
      const caption = vi.fn();
      audio.captions.on(caption);
      audio.unlock();
      await flush();
      // EventBus snapshots listeners, so unsubscription alone cannot cancel this callback.
      if (source === 'pressure')
        bus.emit('sub:hullStress', { stress: 1, cause: 'pressure', depth: -9000 });
      else bus.emit('env:trench', { depth: -9000 });
      expect(creak).not.toHaveBeenCalled();
      expect(caption).not.toHaveBeenCalled();
      expect(context().close).toHaveBeenCalledTimes(1);
      off();
    },
  );

  it('keeps captions and sound gains when muted, cleans up, and starts a fresh system on re-entry', async () => {
    const bus = new EventBus();
    const audio = system(bus);
    const creak = vi.spyOn(cues, 'playHullCreak');
    const caption = vi.fn();
    const off = audio.captions.on(caption);
    const removed = vi.spyOn(doc, 'removeEventListener');
    audio.setSettings({ muted: true, masterVolume: 0.8, sfxVolume: 0.3, musicVolume: 0.2 });
    audio.unlock();
    audio.unlock();
    await flush();
    bus.emit('env:trench', { depth: -9000 });
    expect(Context.instances).toHaveLength(1);
    expect(creak).toHaveBeenCalledTimes(1);
    expect(caption).toHaveBeenCalledTimes(1);
    expect(audio.diagnostics).toMatchObject({
      muted: true,
      masterGain: 0,
      sfxGain: 0.3,
      musicGain: 0.2,
    });
    const ctx = context();
    audio.dispose();
    audio.dispose();
    ctx.currentTime = 100;
    audio.unlock();
    audio.setPaused(false);
    visibility(true);
    bus.emit('sub:hullStress', { stress: 1, cause: 'pressure', depth: -9000 });
    bus.emit('env:trench', { depth: -9000 });
    audio.update(creakFrame(-9000, 1));
    expect(creak).toHaveBeenCalledTimes(1);
    expect(caption).toHaveBeenCalledTimes(1);
    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
    for (const node of ctx.nodes) expect(node.connections).toEqual([]);
    off();
    visibility(false);
    const next = system(bus);
    const nextCaption = vi.fn();
    next.captions.on(nextCaption);
    next.unlock();
    await flush();
    bus.emit('env:trench', { depth: -9000 });
    expect(Context.instances).toHaveLength(2);
    expect(creak).toHaveBeenCalledTimes(2);
    expect(caption).toHaveBeenCalledTimes(1);
    expect(nextCaption).toHaveBeenCalledTimes(1);
    next.dispose();
  });
});

const cueCases = [
  () => (e: AudioEngine) => cues.playSensorCue(e),
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
