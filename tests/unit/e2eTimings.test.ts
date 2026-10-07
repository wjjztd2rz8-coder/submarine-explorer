// @ts-expect-error The Node CLI module intentionally has no browser declarations.
import { measuredTimings } from '../../tools/e2e-update-timings.mjs';
import { expect, test } from 'vitest';

test('hosted timing import counts retry cost and keeps helper source title paths', () => {
  const report = (results: { status: string; duration: number }[]) => ({
    suites: [
      {
        title: 'base-url.spec.ts',
        suites: [
          {
            title: 'base /submarine-explorer/',
            specs: [{ file: 'helpers/titleAudit.ts', title: 'Continue', tests: [{ results }] }],
          },
        ],
      },
    ],
  });
  expect(
    measuredTimings([
      report([
        { status: 'failed', duration: 60_000 },
        { status: 'passed', duration: 20_000 },
      ]),
      report([{ status: 'passed', duration: 40_000 }]),
    ]),
  ).toEqual({ 'helpers/titleAudit.ts › base /submarine-explorer/ › Continue': 60 });
  expect(
    measuredTimings([
      report([]),
      report([{ status: 'skipped', duration: 0 }]),
      report([{ status: 'interrupted', duration: 5_000 }]),
    ]),
  ).toEqual({});
  expect(measuredTimings([report([{ status: 'timedOut', duration: 240_000 }])])).toEqual({
    'helpers/titleAudit.ts › base /submarine-explorer/ › Continue': 240,
  });
});
