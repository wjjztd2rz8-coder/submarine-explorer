// tour.mjs hook: CPU throttle, CDP CPU profile, per-frame script time, long tasks, event marks.
import { writeFileSync } from 'node:fs';

const INIT = () => {
  const w = window;
  w.__ft = { frames: [], events: [], long: [], gc: 0 };
  const T = w.__ft;
  const mark = (name, extra) => T.events.push({ t: performance.now(), name, ...extra });
  w.__ftMark = mark;
  const raf = w.requestAnimationFrame.bind(w);
  let prevStart = null;
  w.requestAnimationFrame = (cb) =>
    raf((ts) => {
      const t0 = performance.now();
      try {
        cb(ts);
      } finally {
        const t1 = performance.now();
        if (prevStart !== null) T.frames.push({ t: t0, gap: t0 - prevStart, script: t1 - t0 });
        prevStart = t0;
        try {
          const c = w.__game?.rig?.camera?.position;
          const sp = w.__game?.sub?.velocity?.length?.() ?? 0;
          if (c) (T.cam ??= []).push([t0, c.x, c.y, c.z, sp]);
        } catch {}
        if (performance.memory && T.frames.length % 5 === 0) (T.heap ??= []).push([t0, performance.memory.usedJSHeapSize]);
        const g = w.__game;
        try {
          if (g?.scene) {
            let lights = 0;
            g.scene.traverseVisible((o) => { if (o.isLight) (lights++, (T.ln = (T.ln ?? []).concat([o.name || o.type]))); });
            const names = (T.ln ?? []).join(","); T.ln = [];
            const key = names + ` fog=${!!g.scene.fog} lights=${lights} env=${!!g.scene.environment} bg=${!!g.scene.background}`;
            if (key !== T.sceneKey) { T.sceneKey = key; mark('SCENE ' + key); }
          }
        } catch {}
        try {
          const n = g?.scanner?.scannedThisDive?.size ?? 0;
          if (n !== T.finds) {
            T.finds = n;
            mark('find', { n });
          }
        } catch {}
      }
    });
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) T.long.push({ t: e.startTime, dur: e.duration });
    }).observe({ entryTypes: ['longtask'] });
  } catch {}
  // Time the usual stall suspects.
  const wrap = (obj, key, name) => {
    const f = obj[key];
    if (!f) return;
    obj[key] = function (...a) {
      const t = performance.now();
      try {
        return f.apply(this, a);
      } finally {
        const d = performance.now() - t;
        if (d > 2) mark(name, { dur: d });
      }
    };
  };
  wrap(HTMLCanvasElement.prototype, 'toDataURL', 'toDataURL');
  wrap(HTMLCanvasElement.prototype, 'toBlob', 'toBlob');
  wrap(WebGL2RenderingContext.prototype, 'readPixels', 'readPixels');
  for (const k of ['linkProgram', 'getProgramParameter', 'getProgramInfoLog', 'texImage2D', 'texSubImage2D', 'texImage3D', 'bufferData', 'generateMipmap', 'compressedTexImage2D'])
    wrap(WebGL2RenderingContext.prototype, k, k);
  // Count programs linked (first draw of a new material variant): every one is a stall.
  {
    const f = WebGL2RenderingContext.prototype.linkProgram;
    WebGL2RenderingContext.prototype.linkProgram = function (p) {
      let nm = '';
      try {
        const src = this.getShaderSource(this.getAttachedShaders(p)[1]) ?? '';
        nm = (src.match(/#define SHADER_NAME (\w+)/) ?? [])[1] ?? '';
        nm += ' L' + src.length;
      } catch {}
      const t0 = performance.now();
      const r = f.call(this, p);
      mark('PROGRAM', { shader: nm, dur: performance.now() - t0 });
      return r;
    };
  }
  wrap(CanvasRenderingContext2D.prototype, 'drawImage', 'drawImage');
  const mo = () => {
    const seen = new Set();
    new MutationObserver(() => {
      for (const [sel, nm] of [
        ['.discovery-reveal', 'reveal'],
        ['.obj-banner:not([hidden])', 'banner'],
        ['.debrief-panel, .debrief', 'debrief'],
        ['.scan-reticle:not([hidden])', 'reticle'],
      ]) {
        const on = !!document.querySelector(sel);
        const k = nm + on;
        if (on !== (seen.has(nm) ? true : false)) {
          if (on) seen.add(nm);
          else seen.delete(nm);
          mark(nm + (on ? ' start' : ' end'));
        }
        void k;
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden', 'class'],
    });
  };
  if (document.documentElement) mo();
  else addEventListener('DOMContentLoaded', mo);
};

const pct = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

export default async ({ page, site }) => {
  const out = process.env.FT_OUT ?? '.cache/s34/ft';
  const label = process.env.LABEL ?? 'run';
  const throttle = +(process.env.FT_THROTTLE ?? 4);
  await page.addInitScript(INIT);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  let started = false;
  // Start the profile once the game is live and the dive began.
  const startProfile = async () => {
    if (started) return;
    started = true;
    await cdp.send('Profiler.start');
    if (process.env.FT_HEAP) {
      await cdp.send('HeapProfiler.enable');
      await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    }
    const now = await page.evaluate(() => performance.now());
    startProfile.at = now;
    startProfile.wall = Date.now();
    await page.evaluate(() => {
      window.__ft.frames.length = 0;
      window.__ft.long.length = 0;
      window.__ft.profileStart = performance.now();
    });
  };
  page.on('console', (m) => {
    if (!started && /\[main\] ready/.test(m.text())) setTimeout(() => startProfile().catch(() => {}), 6500);
  });
  return {
    async finish() {
      const { profile } = await cdp.send('Profiler.stop');
      if (process.env.FT_HEAP) {
        const { profile: hp } = await cdp.send('HeapProfiler.stopSampling');
        const by = new Map();
        const walk = (n) => {
          const cf = n.callFrame;
          const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
          by.set(k, (by.get(k) ?? 0) + n.selfSize);
          n.children.forEach(walk);
        };
        walk(hp.head);
        const tot = [...by.values()].reduce((a, b) => a + b, 0);
        console.log(`allocation samples (total ${(tot / 1e6).toFixed(0)} MB):`);
        for (const [k, v] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`  ${(v / 1e6).toFixed(1).padStart(6)} MB ${((100 * v) / tot).toFixed(1).padStart(5)}% ${k}`);
      }
      const ft = await page.evaluate(() => window.__ft);
      const uptime = await page.evaluate(() => performance.now());
      void uptime;
      writeFileSync(`${out}/${label}-${site}-profile.json`, JSON.stringify(profile));
      writeFileSync(`${out}/${label}-${site}-frames.json`, JSON.stringify(ft));
      report(profile, ft, site, label, out);
    },
  };
};

function report(profile, ft, site, label, out) {
  const frames = ft.frames.filter((f) => f.gap < 1000);
  const script = frames.map((f) => f.script);
  const gaps = frames.map((f) => f.gap);
  const med = pct(script, 50);
  const spikes = frames.filter((f) => f.script > 50);
  console.log(`\n== FRAME TIMES ${label} ${site} (n=${frames.length}) ==`);
  console.log(
    `script ms p50=${med.toFixed(1)} p95=${pct(script, 95).toFixed(1)} p99=${pct(script, 99).toFixed(1)} max=${Math.max(0, ...script).toFixed(0)}`,
  );
  console.log(
    `gap ms    p50=${pct(gaps, 50).toFixed(1)} p95=${pct(gaps, 95).toFixed(1)} p99=${pct(gaps, 99).toFixed(1)}`,
  );
  const mult = frames.filter((f) => f.script > Math.max(3 * med, 20)).length;
  console.log(`frames script>50ms: ${spikes.length}; >max(3x median,20ms): ${mult}; longtasks: ${ft.long.length}`);
  // Map profile time (µs, monotonic) to page performance.now via start offset.
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const total = new Map();
  let t = profile.startTime;
  const samples = profile.samples;
  const deltas = profile.timeDeltas;
  const inSpike = new Map();
  const spikeWins = frames
    .filter((f) => f.script > Math.max(3 * med, 20))
    .map((f) => [f.t, f.t + f.script]);
  const off = profile.startTime / 1000 - (ft.profileStart ?? 0);
  let all = 0;
  let spikeAll = 0;
  for (let i = 0; i < samples.length; i++) {
    t += deltas[i];
    const dt = (deltas[i] || 0) / 1000;
    const n = nodes.get(samples[i]);
    const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + dt);
    all += dt;
    const pt = t / 1000 - off;
    if (spikeWins.some(([a, b]) => pt >= a - 1 && pt <= b + 1)) {
      inSpike.set(key, (inSpike.get(key) ?? 0) + dt);
      spikeAll += dt;
    }
  }
  const top = (m, tot, n = 14) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => `  ${v.toFixed(0).padStart(6)} ms ${((100 * v) / tot).toFixed(1).padStart(5)}%  ${k}`)
      .join('\n');
  console.log(`top self time (total ${all.toFixed(0)} ms):\n${top(self, all)}`);
  console.log(`top self time in spike frames (total ${spikeAll.toFixed(0)} ms):\n${top(inSpike, spikeAll || 1)}`);
  if (ft.heap?.length) {
    let alloc = 0, drops = 0, dropBytes = 0;
    for (let i = 1; i < ft.heap.length; i++) {
      const d = ft.heap[i][1] - ft.heap[i - 1][1];
      if (d > 0) alloc += d; else if (d < -1e6) { drops++; dropBytes -= d; }
    }
    const secs = (ft.heap.at(-1)[0] - ft.heap[0][0]) / 1000;
    console.log(`heap: growth+ ${(alloc / 1e6 / secs).toFixed(1)} MB/s, GC drops >1MB: ${drops} (${(drops / secs).toFixed(2)}/s, avg ${(dropBytes / 1e6 / Math.max(1, drops)).toFixed(1)} MB), end ${(ft.heap.at(-1)[1] / 1e6).toFixed(0)} MB`);
  }
  if (ft.cam?.length > 50) {
    // Judder: frame-to-frame camera travel while cruising, relative to the steady-state travel.
    const steps = [];
    for (let i = 1; i < ft.cam.length; i++) {
      const a = ft.cam[i - 1], b = ft.cam[i];
      if (b[4] > 4 && b[0] - a[0] < 40) steps.push(Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) / ((b[0] - a[0]) / 16.667));
    }
    const m = pct(steps, 50);
    const dev = steps.map((x) => Math.abs(x - m) / (m || 1));
    console.log(`camera travel per 16.7ms while cruising: n=${steps.length} median=${m.toFixed(3)} m; relative deviation p50=${pct(dev, 50).toFixed(3)} p95=${pct(dev, 95).toFixed(3)} p99=${pct(dev, 99).toFixed(3)}; zero-travel frames ${steps.filter((x) => x < 0.01 * m).length}`);
  }
  console.log('worst frames:');
  for (const f of [...frames].sort((a, b) => b.script - a.script).slice(0, 8)) {
    const near = ft.events.filter((e) => e.t >= f.t - 700 && e.t <= f.t + f.script + 200).map((e) => `${e.name}${e.dur ? '=' + e.dur.toFixed(0) : ''}@${(e.t - f.t).toFixed(0)}`);
    console.log(`  t=${(f.t - ft.profileStart).toFixed(0)}ms script=${f.script.toFixed(0)} gap=${f.gap.toFixed(0)} ${near.join(' ')}`);
  }
  const progs = ft.events.filter((e) => e.name === 'PROGRAM').map((e) => ((e.t - ft.profileStart) / 1000).toFixed(0) + 's ' + e.shader);
  console.log(`programs linked during profile: ${progs.length} \n  ${progs.join('\n  ')}`);
  const sums = {};
  for (const e of ft.events) if (e.dur) (sums[e.name] ??= { n: 0, ms: 0, max: 0 }), (sums[e.name].n++, (sums[e.name].ms += e.dur), (sums[e.name].max = Math.max(sums[e.name].max, e.dur)));
  console.log('GL/canvas calls >2ms:', JSON.stringify(sums));
  console.log('events:', ft.events.filter((e) => !e.dur || e.dur > 5).slice(0, 40).map((e) => `${e.name}${e.dur ? '=' + e.dur.toFixed(0) + 'ms' : ''}@${((e.t - ft.profileStart) / 1000).toFixed(0)}s`).join(' '));
}
