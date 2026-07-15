---
name: test-health
description: "Diagnose and fix test failures and flakiness. Known failure-mode catalogue: shared test schema poisoning, zombie PM2/node processes, stale baseline schema, parallel test race conditions, port conflicts, dotenvx .env override quirk. Use when: tests failing, flaky tests, test health, tests broken, 0 of 275, pool poisoning, test infrastructure, tests hang."
user-invocable: true
---

# Test Health Diagnostics

Systematic diagnosis of test failures using the known failure-mode catalogue.

## Failure-Mode Catalogue

Check these in order. Most test failures are caused by #1 or #2.

### 1. Shared test schema poisoning
**Symptom:** Tests that passed individually fail when run together. Random 0-of-N failures.
**Cause:** globalSetup drops and recreates the shared test schema. If two test runs overlap (parallel sessions), one destroys the other's schema mid-test.
**Fix:** Ensure only one `npm test` runs at a time. Kill any orphaned test processes. Single-writer convention.

### 2. Zombie processes
**Symptom:** Port already in use. Connection refused on wrong port. Tests hang indefinitely.
**Cause:** Previous test run or PM2 restart left node processes running.
**Fix:**
```bash
pm2 list
tasklist | findstr node
```
Kill orphans. Restart PM2 cleanly.

### 3. Stale baseline schema
**Symptom:** Migration-related errors. "column X does not exist". "relation Y does not exist".
**Cause:** Test schema was created from an old baseline. New migrations were not applied.
**Fix:** Drop and recreate test schema, or run `npm run init-db` against the test database.

### 4. Port conflicts
**Symptom:** EADDRINUSE on 8887 or 8888.
**Cause:** Another process (staging, prod, or a previous test run) is using the port.
**Fix:** Find and kill the process on that port.

### 5. dotenvx .env override
**Symptom:** Tests connect to the wrong database or use wrong config.
**Cause:** dotenvx's `.env` file overrides `process.env` vars. Use `dotenvx run -f .env.test` for test runs.
**Fix:** Verify `.env.test` exists and has the correct DATABASE_URL.

### 6. Parallel test race conditions
**Symptom:** Intermittent failures in tests that share database state.
**Cause:** Tests running in parallel mutate the same rows.
**Fix:** Ensure test isolation via transactions or unique test data per suite.

## Protocol

1. Read the test output carefully. Match the error pattern to the catalogue above.
2. Run the diagnostic commands for the matched failure mode.
3. Apply the fix.
4. Re-run `npm test` to verify.
5. If the failure does not match any catalogue entry, investigate as a new failure mode and add it to this skill's catalogue.
