// Frame-time profiler. Runs the scripted dive (tour.mjs) with a CDP CPU profile and per-frame
// script timing, then prints percentiles, spikes and top self-time functions.
// Usage: node tools/playtest/frame-times.mjs <outDir> <site> [seconds] [cpuThrottle] [url]
// Env: LABEL=name for the output file prefix.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [OUT = '.cache/s34/ft', SITE = 'titanic', MAX = '120', THROTTLE = '4', URL = 'http://127.0.0.1:4971/'] =
  process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const r = spawnSync(
  process.execPath,
  ['tools/playtest/tour.mjs', OUT, SITE, MAX, '1280', '720', URL],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      TOUR_NO_FINISH: '1',
      TOUR_NO_ANTISTUCK: '1',
      TOUR_HOOK: 'tools/playtest/frame-times-hook.mjs',
      FT_OUT: OUT,
      FT_THROTTLE: THROTTLE,
    },
  },
);
process.exit(r.status ?? 1);
