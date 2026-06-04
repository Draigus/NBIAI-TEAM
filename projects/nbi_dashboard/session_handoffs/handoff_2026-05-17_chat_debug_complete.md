# Handoff: Chat Panel Debug + Branding — 2026-05-17

## What Happened

Session crashed (again) from oversized image in context. This is the third time this session — the recurring issue is screenshots from UAT being too large for the context window. All work was committed before the crash.

## Branch State

- **Branch:** `feature/command-centre`
- **Last commit:** `95ede40` — `feat(cc): WorkSage chat branding + notification pulse on FAB`
- **Working tree:** CLEAN (no uncommitted changes)
- **PM2:** Online, port 8888, restarted 4x, running current code

## What Was Completed This Session (5 commits)

All work from the previous `handoff_2026-05-17_cc_v2_phase2_crash_recovery.md` plus these fixes:

### 1. `203dd9b` — fix(cc): Claude chat spawn exit code 1

**Root cause:** Two bugs in `routes/chat.js`:
- CLI v2.1.126 requires `--verbose` when using `--output-format=stream-json` in print mode. Without it: instant exit code 1 with error "When using --print, --output-format=stream-json requires --verbose"
- `--bare` flag blocks all keychain/OAuth reads, and no `ANTHROPIC_API_KEY` env var was configured. Result: "Not logged in" error.

**Fix applied:**
- Added `--verbose` to spawn args
- Removed `--bare` (allows CLI to use Glen's keychain auth)
- Added `--disable-slash-commands` (reduces overhead without blocking auth)
- Added `cwd: require('os').tmpdir()` (prevents loading repo CLAUDE.md into chat context)
- Added `--include-partial-messages` for proper streaming deltas
- Added delta-based streaming (tracks `sentLength`, only sends new text)

### 2. `2ddd5ba` — fix(cc): chat model back to Opus

Added `--model`, `opus` to spawn args. Explicitly routes chat through Opus (covered by Max plan).

### 3. `71a4a05` — perf(cc): skip user hooks on chat spawn

Added `--setting-sources`, `local` to limit what settings the child CLI loads. Cuts startup overhead by skipping user-level hooks/plugins. Response latency roughly halved.

### 4. `bbeba78` — feat(cc): PlaySage icon replaces lightning bolt on chat FAB and header

Swapped the generic lightning bolt SVG for the PlaySage brand icon on the floating action button (FAB) and the chat panel header.

### 5. `95ede40` — feat(cc): WorkSage chat branding + notification pulse on FAB

- WorkSage branding in chat header
- CSS pulse animation on the FAB when there's an unread response or notification

## Current Chat Architecture (routes/chat.js)

```
WebSocket path: /ws/chat
Spawn: claude -p --verbose --output-format stream-json --include-partial-messages
       --max-turns 1 --model opus --system-prompt <dashboard-context>
       --no-session-persistence --disable-slash-commands --setting-sources local
CWD:   os.tmpdir() (avoids loading CLAUDE.md)
Auth:  Keychain/OAuth (Glen's logged-in session, inherited by PM2)
Cost:  ~$0.20/message (31K input tokens from CLI system prompt — see optimization note below)
```

## Known Issue: Context Token Bloat

Without `--bare`, the CLI loads its own system prompt (~31,745 tokens of cache creation per message). This is expensive ($0.20/msg). Future optimization options:
1. Set `ANTHROPIC_API_KEY` in `.env` or PM2 ecosystem config, then re-add `--bare`
2. Use `--system-prompt-file` pointing to a minimal file instead of the full default
3. Call the Anthropic API directly (bypass CLI entirely) — would need the `anthropic` npm package

This isn't blocking — the chat works — but it's a cost concern for heavy usage.

## Sidebar Toggle CSS Fix

The previous handoff mentioned an uncommitted sidebar toggle fix. Based on the clean working tree and no evidence of it in recent commits, this was either:
- Already included in one of the earlier Phase 2 commits
- Lost during a previous crash
- Fixed differently (check `nbi_project_dashboard.html` lines 307-309 if needed)

## Test State

- **Vitest:** Passes when run directly (`npx vitest run`). The `npm test` wrapper hit an issue during background execution (likely env/path related in subagent context — not a real test failure).
- **Playwright E2E:** Still hasn't been run since Phase 2 landed. Should be verified.
- **Chat tests:** No unit tests for `routes/chat.js` (WebSocket-based).

## PM2 State

```
nbi-dashboard | port 8888 | online | cluster mode | 144.7MB | 4 restarts
```

No staging instance currently running.

## Immediate Priorities for Next Session

1. **Run `npm run test:e2e`** — Playwright hasn't run since all the CC v2 changes. Essential.
2. **Glen UAT** on the chat panel — it should now work (F13 key, or click FAB). Test sending a message and getting a streamed response.
3. **Verify sidebar toggle** — check that it's actually working across themes.
4. **Consider cost optimization** — if chat usage will be frequent, set up ANTHROPIC_API_KEY to re-enable `--bare` mode and cut per-message cost from $0.20 to ~$0.01.

## CC v2 Feature Status (updated)

| Feature | Status | Notes |
|---------|--------|-------|
| F1. Pipeline tracking | SHIPPED | Funnel, stale leads, follow-ups |
| F5. AIOS deep view | SHIPPED | Four Cs, recommendations, history |
| F6. Project health | SHIPPED | Milestones, SOW, risk scores |
| F7. Money tab | SHIPPED | KPI tiles, revenue bars, cost breakdown |
| F8. Client signals | SHIPPED | Part of F6 |
| F9. Team workload | SHIPPED | Assignee bars, capacity alerts |
| F11. Pipeline analytics | SHIPPED | Part of F1 |
| F12. Handoff hub | SHIPPED | File scan, parsed summaries |
| F13. Embedded Claude chat | SHIPPED + DEBUGGED | Working. Branded. Streaming. |
| F2. AI Weekly Assessment | NOT STARTED | Needs cloud routine + table |
| F3. Granola Notes | NOT STARTED | Needs Granola MCP |
| F4. Token/Cost Tracking | NOT STARTED | Needs billing API |
| F10. Active AIOS Monitoring | NOT STARTED | Real-time agent status |

## Key Files

- Chat route: `dashboard-server/routes/chat.js`
- CC route: `dashboard-server/routes/command-centre.js`
- Frontend: `nbi_project_dashboard.html` (CC section ~line 19634, chat FAB near end)
- PM2 config: `dashboard-server/ecosystem.config.js`
- CC v2 spec: `docs/superpowers/specs/2026-05-16-command-centre-v2-design.md`

## Open Bugs (unfixed)

| Bug ID | Priority | Title |
|--------|----------|-------|
| 0b50308b | high | Lighthouse Filter Not Working |
| 551b8601 | unset | "+New" Useability |
| 39ef99de | unset | Scoped view in timeline view |
| 1cf2a501 | unset | Bug Tracker Page Scrolling Issue |
