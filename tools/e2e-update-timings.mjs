import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Include completed retries; never turn unexecuted coverage into zero-cost work. */
export function measuredTimings(reports) {
  const samples = new Map();
  function visit(suite, parents) {
    const titles = [...parents, suite.title];
    for (const spec of suite.specs ?? []) {
      const key = [spec.file, ...titles.slice(1), spec.title].join(' › ');
      for (const test of spec.tests) {
        const results = test.results ?? [];
        if (
          !results.length ||
          results.some((result) => !['passed', 'failed', 'timedOut'].includes(result.status))
        )
          continue;
        const seconds = results.reduce((sum, result) => sum + result.duration / 1000, 0);
        if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Invalid duration: ${key}`);
        const values = samples.get(key) ?? [];
        values.push(seconds);
        samples.set(key, values);
      }
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  for (const report of reports) for (const suite of report.suites) visit(suite, []);
  return Object.fromEntries(
    [...samples].map(([key, values]) => [
      key,
      Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
    ]),
  );
}

function main() {
  const [source, ...paths] = process.argv.slice(2);
  if (!source || !paths.length)
    throw new Error('Usage: node tools/e2e-update-timings.mjs <run-url> <report.json>...');
  const url = new URL('./e2e-timings.json', import.meta.url);
  const previous = JSON.parse(readFileSync(url, 'utf8'));
  const measured = measuredTimings(paths.map((path) => JSON.parse(readFileSync(path, 'utf8'))));
  if (!Object.keys(measured).length) throw new Error('No completed timing samples');
  const updated = {
    ...previous,
    sources: [...new Set([...previous.sources, source])],
    method:
      'Latest hosted JSON durations in seconds, summed across completed attempts including retries. Multiple supplied reports of the same case are averaged. Timed-out attempts are conservative observed costs, not successful timings. Skipped, unexecuted and interrupted cases retain prior estimates/fallbacks. No local durations are used.',
    tests: Object.fromEntries(
      Object.entries({ ...previous.tests, ...measured }).sort(([a], [b]) =>
        a.localeCompare(b, 'en'),
      ),
    ),
  };
  writeFileSync(url, JSON.stringify(updated, null, 2) + '\n');
  console.log(
    `Updated ${Object.keys(measured).length} completed test costs from ${paths.length} reports.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
