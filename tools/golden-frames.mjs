/** Browser init script: hold presented frames without changing mission physics or cameras. */
export function installGoldenFrames({ mission }) {
  const raf = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const pending = new Map();
  let nextId = 0;
  let paused = false;
  let pausedAt = 0;
  let timeOffset = 0;
  let texturesReady = false;
  let texturesWatching = false;
  let firstElapsedS = null;
  let targetElapsedS = null;
  const pause = () => {
    paused = true;
    pausedAt = performance.now();
  };
  const schedule = (id, entry) => {
    entry.nativeId = raf((now) => {
      entry.nativeId = null;
      if (paused) return;
      pending.delete(id);
      const renderFrame = window.__game?.renderer?.info.render.frame;
      entry.callback(now - timeOffset);
      if (!mission) return;
      const g = window.__game;
      if (g?.terrain && !texturesWatching) {
        texturesWatching = true;
        Promise.resolve(g.terrain.texturesReady).then(() => {
          texturesReady = true;
        });
      }
      if (
        !window.__gameReady ||
        g?.renderer?.info.render.frame === renderFrame ||
        !g?.props.loaded ||
        !g?.discovery.loaded ||
        !texturesReady ||
        g?.mission?.state !== 'diving'
      )
        return;
      const elapsedS = g.mission.elapsedS;
      if (firstElapsedS === null) {
        firstElapsedS = elapsedS;
        pause();
      } else if (targetElapsedS !== null && elapsedS >= targetElapsedS) {
        targetElapsedS = null;
        pause();
      }
    });
  };
  window.requestAnimationFrame = (callback) => {
    const id = ++nextId;
    const entry = { callback, nativeId: null };
    pending.set(id, entry);
    if (!paused) schedule(id, entry);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    const entry = pending.get(id);
    if (entry?.nativeId !== null && entry?.nativeId !== undefined) cancel(entry.nativeId);
    pending.delete(id);
  };
  const resume = () => {
    // Screenshot readback time is not gameplay time. Preserve native frame deltas.
    if (paused && mission) timeOffset += performance.now() - pausedAt;
    paused = false;
    for (const [id, entry] of pending) if (entry.nativeId === null) schedule(id, entry);
  };
  window.__goldenFrames = {
    pause,
    resume,
    get paused() {
      return paused;
    },
    get firstElapsedS() {
      return firstElapsedS;
    },
    advance(seconds) {
      targetElapsedS = firstElapsedS + seconds;
      resume();
    },
  };
}
