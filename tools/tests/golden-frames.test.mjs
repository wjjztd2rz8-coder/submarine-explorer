import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installGoldenFrames } from '../golden-frames.mjs';

for (const pauses of [1, 2, 3]) {
  test(`mission hold excludes the entire readback interval after ${pauses} pause call(s)`, () => {
    const originalWindow = globalThis.window;
    const originalPerformance = globalThis.performance;
    let now = 100;
    let nativeId = 0;
    const callbacks = new Map();
    globalThis.window = {
      requestAnimationFrame(callback) {
        callbacks.set(++nativeId, callback);
        return nativeId;
      },
      cancelAnimationFrame(id) {
        callbacks.delete(id);
      },
    };
    globalThis.performance = { now: () => now };
    try {
      installGoldenFrames({ mission: true });
      const timestamps = [];
      const canceled = window.requestAnimationFrame(() => assert.fail('canceled frame ran'));
      window.requestAnimationFrame((time) => timestamps.push(time));
      window.cancelAnimationFrame(canceled);
      window.__goldenFrames.pause();
      for (let i = 1; i < pauses; i++) {
        now += 100;
        window.__goldenFrames.pause();
      }
      // Native callbacks already queued at pause must remain pending, even if dispatched.
      const due = [...callbacks.values()];
      callbacks.clear();
      due.forEach((callback) => callback(now));
      assert.deepEqual(timestamps, []);
      now = 1100;
      window.__goldenFrames.resume();
      window.__goldenFrames.resume();
      assert.equal(callbacks.size, 1);
      now += 16;
      [...callbacks.values()].forEach((callback) => callback(now));
      assert.deepEqual(timestamps, [116]);
    } finally {
      globalThis.window = originalWindow;
      globalThis.performance = originalPerformance;
    }
  });
}

test('mission settles decoded textures before holding the opening and +10 seconds, excluding screenshot latency without overriding physics', async () => {
  const originalWindow = globalThis.window;
  const nativePerformance = globalThis.performance;
  let now = 0;
  let nextId = 0;
  const callbacks = new Map();
  const step = () => {};
  let decodeTextures;
  const game = {
    renderer: { info: { render: { frame: 0 } } },
    terrain: { texturesReady: new Promise((done) => (decodeTextures = done)) },
    props: { loaded: false },
    discovery: { loaded: false },
    mission: { id: 'titanic', state: 'diving', elapsedS: 0 },
    sub: { step },
    rig: { mode: 'third-person' },
  };
  globalThis.window = {
    __game: game,
    __gameReady: false,
    requestAnimationFrame(callback) {
      callbacks.set(++nextId, callback);
      return nextId;
    },
    cancelAnimationFrame(id) {
      callbacks.delete(id);
    },
  };
  globalThis.performance = { now: () => now };
  try {
    installGoldenFrames({ mission: true });
    let last = 0;
    let presented = 0;
    function render(time) {
      window.requestAnimationFrame(render);
      game.mission.elapsedS += (time - last) / 1000;
      game.renderer.info.render.frame++;
      last = time;
      presented++;
    }
    window.requestAnimationFrame(render);
    const frame = async (delta) => {
      now += delta;
      const due = [...callbacks.values()];
      callbacks.clear();
      due.forEach((callback) => callback(now));
      await Promise.resolve();
    };
    const settling = window.__goldenFrames.settle();
    await frame(100);
    assert.equal(window.__goldenFrames.paused, false);
    window.__gameReady = true;
    game.props.loaded = game.discovery.loaded = true;
    await frame(100);
    assert.equal(window.__goldenFrames.paused, false, 'loaded props cannot bypass decoding');
    decodeTextures();
    await Promise.resolve();
    for (let i = 0; i < 8; i++) {
      await frame(100);
      assert.equal(
        window.__goldenFrames.paused,
        false,
        'settle callbacks cannot hold a game frame',
      );
    }
    assert.deepEqual(await settling, { medianMs: 100, maxMs: 100, samples: Array(7).fill(100) });
    await frame(100);
    const first = game.mission.elapsedS;
    const presentedAtHold = presented;
    assert.equal(window.__goldenFrames.paused, true);
    assert.equal(window.__goldenFrames.firstElapsedS, first);
    await frame(30_000); // Slow screenshot readback must not become play time.
    assert.equal(presented, presentedAtHold);
    window.__goldenFrames.advance(10);
    for (let i = 0; i < 40; i++) await frame(250);
    assert.equal(window.__goldenFrames.paused, true);
    assert.equal(game.mission.elapsedS - first, 10);
    assert.equal(game.sub.step, step);
    assert.equal(game.rig.mode, 'third-person');
    await frame(1000);
    assert.equal(presented, presentedAtHold + 40);
  } finally {
    globalThis.window = originalWindow;
    globalThis.performance = nativePerformance;
  }
});

test('free-dive uses the same terrain settle for each pose and remains live until explicitly paused', async () => {
  const originalWindow = globalThis.window;
  let callback;
  globalThis.window = {
    __game: { terrain: { texturesReady: Promise.resolve() } },
    requestAnimationFrame(fn) {
      callback = fn;
      return 1;
    },
    cancelAnimationFrame() {},
  };
  try {
    installGoldenFrames({ mission: false });
    let timestamp;
    window.requestAnimationFrame((now) => {
      timestamp = now;
    });
    callback(123);
    assert.equal(timestamp, 123);
    for (let pose = 0; pose < 2; pose++) {
      const settling = window.__goldenFrames.settle();
      await Promise.resolve();
      for (let i = 0; i < 8; i++) callback(200 + pose * 1000 + i * 16);
      assert.deepEqual(await settling, { medianMs: 16, maxMs: 16, samples: Array(7).fill(16) });
    }
    assert.equal(window.__goldenFrames.paused, false);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('mission capture holds a rendered game frame rather than an unrelated animation callback', async () => {
  const originalWindow = globalThis.window;
  let callback;
  const renderer = { info: { render: { frame: 5 } } };
  globalThis.window = {
    __gameReady: true,
    __game: {
      renderer,
      terrain: { texturesReady: Promise.resolve() },
      props: { loaded: true },
      discovery: { loaded: true },
      mission: { state: 'diving', elapsedS: 0 },
    },
    requestAnimationFrame(fn) {
      callback = fn;
      return 1;
    },
    cancelAnimationFrame() {},
  };
  try {
    installGoldenFrames({ mission: true });
    const settling = window.__goldenFrames.settle();
    await Promise.resolve();
    for (let i = 0; i < 8; i++) {
      callback(i);
      await Promise.resolve();
      assert.equal(window.__goldenFrames.paused, false);
    }
    await settling;
    window.requestAnimationFrame(() => {});
    callback(8);
    assert.equal(window.__goldenFrames.paused, false);
    window.requestAnimationFrame(() => {
      renderer.info.render.frame++;
    });
    callback(9);
    assert.equal(window.__goldenFrames.paused, true);
  } finally {
    globalThis.window = originalWindow;
  }
});
