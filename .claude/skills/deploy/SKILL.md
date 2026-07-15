---
name: deploy
description: "Deploy server changes to staging and production. Restart staging, verify migration logs, run e2e against staging, restart production, tail logs for errors. Non-Fable models must verify staging e2e green before touching production. Use when: deploy, restart server, push to prod, ship server changes, apply migration, pm2 restart."
user-invocable: true
---

# Deploy Protocol

Deterministic deployment sequence for dashboard-server changes.

## Model Tier Check

**Fable tier:** For config-only changes (env vars, PM2 config), may restart prod directly after visual confirmation. Code changes always go through staging first.

**Strict tier (non-Fable):** ALL changes go through staging first, no exceptions. e2e must be green on staging before touching production.

## Sequence

### 1. Pre-flight
- Verify `npm test` is green (unit tests)
- Verify all changes are committed (no dirty working tree)
- List what changed: migrations, routes, lib modules, frontend files

### 2. Staging deployment
```bash
pm2 restart nbi-dashboard-staging
```
Wait 5 seconds, then check logs:
```bash
pm2 logs nbi-dashboard-staging --lines 50 --nostream
```
Confirm:
- "Server listening on port 8887"
- "Applied migration NNN" for any new migrations
- No error stack traces

### 3. Staging verification
```bash
cd dashboard-server && npm run test:e2e
```
All e2e tests must pass against the staging server (:8887).

If any fail: diagnose, fix, recommit, restart this sequence from step 1.

### 4. Production deployment
```bash
pm2 restart nbi-dashboard
```
Wait 5 seconds, then check logs:
```bash
pm2 logs nbi-dashboard --lines 50 --nostream
```
Same checks: listening on 8888, migrations applied, no errors.

### 5. Production smoke check
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/health
```
Expected: 200.

### 6. Report
State: what was deployed, which migrations ran, staging and prod status.
