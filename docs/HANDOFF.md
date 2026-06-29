# Handoff -- 2026-06-29 Session 2 (AIOS Phase 1 Implemented)

## What Happened

Picked up from the 2026-06-29 handoff. Glen authorised full autonomy overnight. The AIOS Phase 1 plan was sent to Codex for a second adversarial review (round 2), which found 8 remaining defects (2 CRITICAL, 5 HIGH, 1 LOW). All were addressed during implementation. The implementation was then sent to Codex for a code review, which found 7 more issues (3 in AIOS code, 4 pre-existing). The 3 AIOS issues were fixed (stale claim recovery, rate-limit retry). The 4 pre-existing issues (python3 hook parser, MultiEdit matcher, claude CLI path, unverified tool names) were noted but not fixed here.

## Commits (all snapshot: prefixed, need squashing before push)

| Commit | Description |
|---|---|
| `969d6ec` | feat(aios): Phase 1 implementation -- 18 files, 1,480 insertions |
| `73d9469` | docs: AIOS Phase 1 session log |
| `26f5833` | fix(aios): recover stale in_progress claims, rate-limited items return to pending |

## Files Created

| File | Purpose |
|---|---|
| `dashboard-server/migrations/072_aios_actions.sql` | aios_actions + aios_outbound_queue tables. Includes confidence column. |
| `dashboard-server/lib/outbound-broker.js` | Outbound message broker. Startup-safe (disabled mode if config missing). Transaction-wrapped processQueue with stale claim recovery. Glen-only allowlist. |
| `dashboard-server/lib/commitment-extractor.js` | Regex-based commitment extraction from meeting text. High/medium/low confidence. Owner case preserved. Input coercion + length caps. |
| `dashboard-server/routes/aios.js` | Two route groups: `createInternalRoutes` (token auth, before requireAuth) + `createAdminRoutes` (session auth, after requireAuth). 503 for unconfigured broker. |
| `dashboard-server/tests/unit/outbound-broker.test.mjs` | 16 tests: startup safety, validation, queue, processQueue with transaction mocks, rate limit retry, unconfigured broker |
| `dashboard-server/tests/unit/commitment-extractor.test.mjs` | 26 tests: date parsing, commitments, decisions, action items, null safety, dedup, length caps |
| `dashboard-server/tests/unit/aios-routes.test.mjs` | 13 tests: internal token auth, admin endpoints, invalid payloads, 503 for unconfigured broker |
| `scripts/cadence/state/routine_runs.json` | Initial empty state file for cadence catch-up tracking |

## Files Modified

| File | Change |
|---|---|
| `.mcp.json` | Telegram server entry REMOVED (local config, not committed) |
| `.claude/settings.json` | 3 new PreToolUse hooks: block Telegram MCP, block Slack sends, block MS365 email sends (local config, not committed) |
| `brain/processes_tools.md` | Telegram retired at 4 locations: tools table, MCP list, priority stack, cadence delivery |
| `company/routines.md` | Morning brief delivery changed to Slack DM via outbound broker |
| `dashboard-server/server.js` | AIOS broker init (startup-safe try/catch), internal routes before requireAuth, admin routes after |
| `dashboard-server/lib/granola-sync.js` | Import commitment-extractor, add extractCommitmentsFromMeeting, post-sync extraction from sync batch, all commitments stored as pending |
| `dashboard-server/tests/unit/granola-sync.test.mjs` | 5 new tests for commitment extraction including null safety |
| `dashboard-server/package.json` | Added @slack/web-api dependency |
| `scripts/cadence/register-tasks.ps1` | S4U principal for all tasks (run whether logged on), monthly task upgraded via Set-ScheduledTask |
| `scripts/cadence/run-cadence.ps1` | Atomic state tracking with routine_runs.json, GUID-based temp file, keep last 10 runs per task |
| `scripts/cadence/prompts/morning-brief.md` | Rewritten: Slack DM via internal AIOS API using node -e (not curl), reads tokens from .env |

## Test Results

- 928/930 unit tests pass
- 55 new AIOS tests pass (16 broker + 26 extractor + 13 routes)
- 2 failures are pre-existing slack-bot test isolation (pass when run alone)
- Dashboard loads at http://localhost:8888 (verified via Playwright)
- Commitment extractor verified standalone: `Glen will send the proposal by Friday` from 2026-06-30 = owner:Glen, confidence:high, due:2026-07-03

## Codex Review History

| Round | Findings | Addressed |
|---|---|---|
| R1 (plan) | 10 findings, all fixed in plan rewrite | Previous session |
| R2 (plan) | 8 findings: broker startup crash, double-send race, email_draft loop, missing confidence column, brittle curl, monthly S4U, hook names, input guards | All addressed in implementation |
| R3 (implementation) | 7 findings: 3 AIOS (stale claims, rate-limit retry, race note), 4 pre-existing | 3 AIOS fixed, 4 pre-existing noted |

## What Needs Doing Next

### 1. Squash snapshot commits and push

The 3 commits use `snapshot:` prefix (verification gate required it for non-testable config surfaces). Before pushing:

```bash
git rebase -i HEAD~3   # squash into one commit
# Change commit message to: feat(aios): Phase 1 -- safety lockdown, broker, extractor, Granola loop
git push
```

### 2. Set environment variables (MUST do before restart)

Add to `dashboard-server/.env`:

```
GLEN_SLACK_USER_ID=<Glen's Slack user ID -- find via Slack MCP: slack_search_users for "Glen">
AIOS_INTERNAL_TOKEN=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

`SLACK_BOT_TOKEN` already exists. If `GLEN_SLACK_USER_ID` is blank, the broker starts in disabled mode (503 on send endpoints, server doesn't crash).

### 3. Restart dashboard server (applies migration 072)

```bash
cd dashboard-server && npx pm2 restart nbi-dashboard
```

Verify migration applied:
```bash
node -e "const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(\"SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'aios%' ORDER BY 1\").then(r=>{r.rows.forEach(x=>console.log(x.table_name));p.end()})"
```

### 4. Re-register cadence tasks

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/register-tasks.ps1
```

### 5. Test Slack DM manually

After env vars are set and server restarted:
```bash
# Create a test action
curl -s -X POST http://localhost:8888/api/internal/aios/actions \
  -H "Content-Type: application/json" \
  -H "x-nbi-internal-token: $AIOS_INTERNAL_TOKEN" \
  -d '{"source_system":"test","action_type":"task","title":"Test AIOS Slack DM","approval_state":"approved","idempotency_key":"test:slack:1"}'

# Send and process (use the id from above)
curl -s -X POST http://localhost:8888/api/internal/aios/outbound/send-and-process \
  -H "Content-Type: application/json" \
  -H "x-nbi-internal-token: $AIOS_INTERNAL_TOKEN" \
  -d '{"actionId":"<id>","destinationType":"slack_dm","destinationId":"<GLEN_SLACK_USER_ID>","text":"Test AIOS Phase 1 Slack DM","reason":"Integration test"}'

# Clean up
node -e "const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(\"DELETE FROM aios_outbound_queue WHERE action_id IN (SELECT id FROM aios_actions WHERE idempotency_key = 'test:slack:1')\").then(()=>p.query(\"DELETE FROM aios_actions WHERE idempotency_key = 'test:slack:1'\")).then(()=>p.end())"
```

### 6. Verify next morning brief (2026-06-30 07:30)

Check that:
- Slack DM arrives in Glen's DM from the bot
- `scripts/cadence/state/routine_runs.json` shows a `morning-brief` entry
- `intelligence/synthesis/intelligence_brief.md` is updated

### 7. Pre-existing issues noted by Codex (not blocking)

- Existing PreToolUse hooks for deprecated files and client deliverables use `python3` which may not resolve in Git Bash -- consider switching to `node` parser
- `MultiEdit` tool not covered by Write|Edit matchers in existing hooks
- These are separate fixes, not part of AIOS Phase 1

## Key Architecture Decisions

1. **Broker is startup-safe**: blank config = disabled mode, not crash. Endpoints return 503.
2. **Transaction-wrapped claims**: `UPDATE ... RETURNING *` atomically claims rows. Stale `in_progress` rows recovered after 5 minutes.
3. **Rate-limited messages return to pending**: not permanently failed. Will retry on next processQueue call.
4. **All Granola commitments stored as pending**: never auto-approved. Glen reviews in action queue.
5. **Hooks block MCP sends, not connector CLI**: morning brief uses connector CLI for email (approved path). MCP sends blocked for interactive sessions.
6. **MS365 blocked instead of Gmail**: Gmail MCP has no send tools (only create_draft). MS365 has send_email, reply_to_email, reply_all_email.

## Codebase Context

- server.js: AIOS broker init at ~line 358, internal routes at ~360, admin routes after requireAuth at ~365
- Latest migration: 072 (aios_actions + aios_outbound_queue)
- New lib modules follow factory pattern: `createBroker({pool, log, ...})`
- New route module exports two factories: `{createInternalRoutes, createAdminRoutes}`
- Commitment extractor exports: `{extractCommitments, extractDecisions, extractActionItems, buildIdempotencyKey, parseRelativeDate}`
- Granola sync now also exports: `extractCommitmentsFromMeeting`
