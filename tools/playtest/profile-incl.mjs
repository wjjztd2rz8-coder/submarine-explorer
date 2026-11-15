// Inclusive time per function (and callers of one function) for a CPU profile, restricted to frames.
// Usage: node tools/playtest/profile-incl.mjs <profile.json> [callersOf]
import { readFileSync } from 'node:fs';
const [pf, callersOf] = process.argv.slice(2);
const profile = JSON.parse(readFileSync(pf, 'utf8'));
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const nm = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`;
const incl = new Map();
const callers = new Map();
let total = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const dt = profile.timeDeltas[i] / 1000;
  let id = profile.samples[i];
  if (nodes.get(id).callFrame.functionName === '(idle)') continue;
  total += dt;
  const seen = new Set();
  let prev = null;
  while (id !== undefined) {
    const k = nm(nodes.get(id));
    if (!seen.has(k)) {
      incl.set(k, (incl.get(k) ?? 0) + dt);
      seen.add(k);
    }
    if (callersOf && nodes.get(id).callFrame.functionName === callersOf && !callers.has(i)) callers.set(i, [dt, nm(nodes.get(parent.get(id)) ?? nodes.get(id))]);
    id = parent.get(id);
  }
}
console.log('busy ms', total.toFixed(0));
for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 400)) console.log(`${v.toFixed(0).padStart(6)} ms ${((100 * v) / total).toFixed(1).padStart(5)}%  ${k}`);
if (callersOf) {
  const c = new Map();
  for (const [dt, who] of callers.values()) c.set(who, (c.get(who) ?? 0) + dt);
  console.log('callers of', callersOf, [...c].sort((a, b) => b[1] - a[1]).slice(0, 8));
}
