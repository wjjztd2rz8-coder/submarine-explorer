import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Terrain/prop audits build dense meshes. Limit simultaneous builds so
    // shared runners do not turn CPU contention into individual test timeouts.
    maxWorkers: 2,
    testTimeout: 30000,
    include: ['tests/unit/**/*.test.ts'],
  },
});
