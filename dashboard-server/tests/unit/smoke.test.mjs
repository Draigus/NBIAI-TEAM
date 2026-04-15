// dashboard-server/tests/unit/smoke.test.mjs
//
// Smoke test for the test harness itself. Proves Vitest is wired up,
// global setup ran, and the test runner can both pass AND fail
// assertions correctly.
//
// Test files are ESM (.mjs) so vitest 2.x's import semantics work,
// even though server.js is CJS. ESM files can require() CJS modules
// via default-import (see escape.test.mjs for an example).

import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('1 + 1 should equal 2', () => {
    expect(1 + 1).toBe(2);
  });
});
