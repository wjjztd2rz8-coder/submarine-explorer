import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Discover from Playwright, so new tests never need a hand-maintained roster. */
export function collectTests(report) {
  const tests = [];
  function visit(suite, parents, entryFile) {
    const titles = [...parents, suite.title];
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        tests.push({
          // CI lists report source locations, including tests declared in helpers.
          key: [spec.file, ...titles.slice(1), spec.title].join(' › '),
          // grep matches the entry spec's title path, not the helper's location.
          title: [test.projectName, ...titles, spec.title, ...(spec.tags ?? [])].join(' '),
          file: entryFile,
          skipped: test.expectedStatus === 'skipped',
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child, titles, entryFile);
  }
  for (const suite of report.suites) visit(suite, [], suite.file);
  if (new Set(tests.map((test) => test.title)).size !== tests.length)
    throw new Error('Duplicate test title paths would cause overlapping shards');
  if (!tests.length) throw new Error('Playwright discovered no tests');
  return tests;
}

/** Longest estimated test first, assigned to the currently lightest shard. */
export function balanceTests(tests, count, timings) {
  if (!Number.isInteger(count) || count < 1) throw new Error('Invalid shard count');
  const weighted = tests.map((test) => ({
    ...test,
    seconds: test.skipped
      ? 0
      : (timings.tests[test.key] ?? timings.fallbacks[test.file] ?? timings.defaultSeconds),
  }));
  if (weighted.some((test) => !Number.isFinite(test.seconds) || test.seconds < 0))
    throw new Error('Invalid test duration estimate');
  weighted.sort((a, b) => b.seconds - a.seconds || a.title.localeCompare(b.title, 'en'));
  const shards = Array.from({ length: count }, () => ({ tests: [], seconds: 0 }));
  for (const test of weighted) {
    const lightest = shards.reduce((best, shard) => (shard.seconds < best.seconds ? shard : best));
    lightest.tests.push(test);
    // Include a context/worker startup allowance even for statically skipped tests.
    lightest.seconds += test.seconds + 2;
  }
  return shards;
}

export function shardGrep(shard) {
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `^(?:${shard.tests.map((test) => escape(test.title)).join('|')})$`;
}

function main() {
  const [selection, ...extra] = process.argv.slice(2);
  const match = /^(\d+)\/(\d+)$/.exec(selection ?? '');
  if (!match || Number(match[1]) < 1 || Number(match[1]) > Number(match[2]))
    throw new Error(
      'Usage: node tools/e2e-shards.mjs <current/total> [--plan | Playwright options]',
    );
  const timings = JSON.parse(readFileSync(new URL('./e2e-timings.json', import.meta.url), 'utf8'));
  const report = JSON.parse(
    execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
      encoding: 'utf8',
      // Discovery must go to stdout, not overwrite the real run's timing artifact.
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: '', PLAYWRIGHT_JSON_OUTPUT_DIR: '' },
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
  const tests = collectTests(report);
  const shards = balanceTests(tests, Number(match[2]), timings);
  console.log(`Discovered ${tests.length} tests; each belongs to exactly one shard.`);
  for (const [index, shard] of shards.entries())
    console.log(
      `Shard ${index + 1}/${shards.length}: ${shard.tests.length} tests, estimated ${(shard.seconds / 60).toFixed(1)} min`,
    );
  if (extra.includes('--plan')) return;
  if (extra.some((arg) => /^--(?:shard|grep|test-list)/.test(arg)))
    throw new Error('The shard runner owns test selection');
  const shard = shards[Number(match[1]) - 1];
  const result = spawnSync(
    'npx',
    ['playwright', 'test', '--fully-parallel', '--workers=1', '--grep', shardGrep(shard), ...extra],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
