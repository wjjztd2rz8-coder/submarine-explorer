// Break the worst frames of a frame-times run into inclusive/self time per function.
// Usage: node tools/playtest/frame-spikes.mjs <profile.json> <frames.json> [nFrames] [minMs]
import { readFileSync } from 'node:fs';
const [pf, ff, N = '8', MIN = '25'] = process.argv.slice(2);
const profile = JSON.parse(readFileSync(pf, 'utf8'));
const ft = JSON.parse(readFileSync(ff, 'utf8'));
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const name = (n) =>
  `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-1)[0]}:${n.callFrame.lineNumber + 1}`;
const off = profile.startTime / 1000 - ft.profileStart;
const times = [];
let t = profile.startTime;
for (let i = 0; i < profile.samples.length; i++) {
  t += profile.timeDeltas[i];
  times.push(t / 1000 - off);
}
const worst = ft.frames.filter((f) => f.gap < 1000 && f.script >= +MIN).sort((a, b) => b.script - a.script).slice(0, +N);
for (const f of worst) {
  const self = new Map();
  const incl = new Map();
  for (let i = 0; i < times.length; i++) {
    if (times[i] < f.t || times[i] > f.t + f.script + 2) continue;
    const dt = profile.timeDeltas[i] / 1000;
    let id = profile.samples[i];
    const n0 = nodes.get(id);
    self.set(name(n0), (self.get(name(n0)) ?? 0) + dt);
    const seen = new Set();
    while (id !== undefined) {
      const k = name(nodes.get(id));
      if (!seen.has(k)) {
        incl.set(k, (incl.get(k) ?? 0) + dt);
        seen.add(k);
      }
      id = parent.get(id);
    }
  }
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(0)}ms ${k}`).join('\n      ');
  const near = ft.events.filter((e) => e.t >= f.t - 700 && e.t <= f.t + f.script + 200).map((e) => `${e.name}@${(e.t - f.t).toFixed(0)}`);
  console.log(`\n# frame t=${((f.t - ft.profileStart) / 1000).toFixed(1)}s script=${f.script.toFixed(0)}ms ${near.join(' ')}\n  incl:\n      ${top(incl, 14)}\n  self:\n      ${top(self, 6)}`);
}
