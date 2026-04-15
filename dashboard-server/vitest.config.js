// dashboard-server/vitest.config.js
//
// Vitest configuration for the dashboard-server unit suite.
//
// Key settings:
//   - Serial execution (single-fork pool) so Postgres tests don't
//     clobber each other.
//   - globalSetup runs once before all tests (bootstraps test DB +
//     migrates schema).
//   - Test files match tests/unit/**/*.test.js only — Playwright
//     specs in tests/e2e are run by playwright, not vitest.
//   - 30s timeout per test (DB ops can be slow on Windows).

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/unit/**/*.test.mjs'],
    globalSetup: ['./tests/setup/global-setup.js'],
    setupFiles: ['./tests/setup/load-env.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default'],
  },
});
