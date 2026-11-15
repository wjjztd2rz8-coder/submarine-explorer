// Camera travel smoothness while cruising at steady speed (from frame-times *-frames.json).
// Usage: node tools/playtest/judder.mjs <frames.json>...
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const c = JSON.parse(readFileSync(f, 'utf8')).cam ?? [];
  const r = [];
  for (let i = 2; i < c.length; i++) {
    const [a, b, d] = [c[i - 2], c[i - 1], c[i]];
    if (d[4] < 4 || Math.abs(d[4] - b[4]) > 0.01 * d[4] || d[0] - b[0] > 20 || d[0] - b[0] < 14)
      continue;
    const t1 = Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]);
    const t2 = Math.hypot(d[1] - b[1], d[2] - b[2], d[3] - b[3]);
    if (t1 > 0.01) r.push(Math.abs(t2 - t1) / t1);
  }
  r.sort((x, y) => x - y);
  const p = (q) => (r[Math.floor(q * r.length)] ?? 0).toFixed(3);
  console.log(
    f.split('/').pop(),
    `n=${r.length} frame-to-frame travel change: p50=${p(0.5)} p90=${p(0.9)} p99=${p(0.99)}`,
  );
}
