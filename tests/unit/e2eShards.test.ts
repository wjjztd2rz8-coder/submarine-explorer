// @ts-expect-error The Node CLI module intentionally has no browser declarations.
import { balanceTests, collectTests, shardGrep } from '../../tools/e2e-shards.mjs';
import { expect, test } from 'vitest';

const timings = { tests: { slow: 300 }, fallbacks: {}, defaultSeconds: 30 };
const cases = [
  { key: 'slow', title: 'chromium slow.spec.ts long', file: 'slow.spec.ts', skipped: false },
  { key: 'new', title: 'chromium new.spec.ts new test', file: 'new.spec.ts', skipped: false },
  { key: 'fast', title: 'chromium fast.spec.ts fast', file: 'fast.spec.ts', skipped: false },
];

test('duration balancing separates expensive cases and assigns unseen tests exactly once', () => {
  const shards = balanceTests(cases, 2, timings);
  expect(shards[0].tests).toHaveLength(1);
  expect(shards[1].tests).toHaveLength(2);
  expect(shards.flatMap((shard: { tests: typeof cases }) => shard.tests)).toHaveLength(3);
  expect(balanceTests([...cases].reverse(), 2, timings)).toEqual(shards);
});

test('selectors match complete title paths literally, including regex punctuation', () => {
  const title = 'chromium a.spec.ts 150% [touch] + (scan?) Home -> Journal';
  const pattern = new RegExp(shardGrep({ tests: [{ title }] }));
  expect(pattern.test(title)).toBe(true);
  expect(pattern.test(title + ' extra')).toBe(false);
  expect(pattern.test('chromium b.spec.ts 150% [touch] + (scan?) Home -> Journal')).toBe(false);
});

test('helper-defined cases retain their entry file selector and source timing key', () => {
  const report = {
    suites: [
      {
        file: 'base-url.spec.ts',
        title: 'base-url.spec.ts',
        suites: [
          {
            title: 'base /submarine-explorer/',
            specs: [
              {
                file: 'helpers/titleAudit.ts',
                title: 'Continue',
                tests: [{ projectName: 'chromium', expectedStatus: 'passed' }],
              },
            ],
          },
        ],
      },
    ],
  };
  expect(collectTests(report)).toEqual([
    {
      key: 'helpers/titleAudit.ts › base /submarine-explorer/ › Continue',
      title: 'chromium base-url.spec.ts base /submarine-explorer/ Continue',
      file: 'base-url.spec.ts',
      skipped: false,
    },
  ]);
});

test('empty discovery, overlapping selectors and invalid budgets fail closed', () => {
  expect(() => collectTests({ suites: [] })).toThrow('no tests');
  expect(() =>
    collectTests({
      suites: [
        {
          title: 'a',
          file: 'a',
          specs: [
            {
              title: 'duplicate',
              file: 'a',
              tests: [{ projectName: 'chromium' }, { projectName: 'chromium' }],
            },
          ],
        },
      ],
    }),
  ).toThrow('overlapping');
  expect(() => balanceTests(cases, 0, timings)).toThrow('count');
  expect(() => balanceTests(cases, 2, { ...timings, defaultSeconds: -1 })).toThrow('duration');
});
