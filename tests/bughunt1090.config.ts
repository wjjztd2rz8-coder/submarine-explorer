import { defineConfig } from 'vitest/config';
import base from '../vitest.config.js';

// Strict exploratory route checks stay separate from the regression suite:
// a failed bounded route search needs manual navigation, not a relaxed assertion.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    pool: 'threads',
    maxWorkers: 1,
    include: ['tests/unit/bughunt1090Routes.audit.ts'],
  },
});
