# HANDOFF -- AIOS Phases 1-3 COMPLETE + Google OAuth live (2026-07-07)

**Supersedes** the earlier 2026-07-07 handoff. Phase 3 fully verified. Google OAuth set up and working.

## 1. AIOS STATUS

Phases 1, 2, 3 + approval-routing all COMPLETE, merged to master, fully verified. Phase 4 not started.

### Phase 3 verification closure (2026-07-07)

1. **Morning brief send (dotenv fix)** -- exit 0, Slack + email delivered, 2026-07-06 07:30 run.
2. **Midday nudge send-path** -- exit 0, 3 real delta items produced, 2026-07-06 14:00 run.
3. **Draft approval E2E** -- Erich Poch action approved + executed via executeAndReport. Graph createDraft returned success. Draft in Glen's Outlook Drafts. execution_state=completed.

### Phase 4 scope (from spec)

1. **Voice at the desk** -- Glen wants this. NOT MCP, NOT ElevenLabs TTS. Wants native PC voice. Needs brainstorming on approach.
2. **Gmail/Calendar as engine inputs** -- UNBLOCKED. Google OAuth now live (see below).
3. **Slack ingestion** -- still blocked on user-level token (xoxp-). Bot token (xoxb-) cannot read DMs or use search API.
4. **Hermes/VPS** -- Glen undecided, skip for now.

## 2. GOOGLE OAUTH SETUP (completed this session)

- **GCP Project**: `nbi-connectors` under couch-heroes.com org (Internal audience, no verification needed)
- **APIs enabled**: Gmail API, Google Calendar API, Google Drive API
- **OAuth client**: Desktop app "NBI Connectors CLI" (client ID `433594037563-qqddetcs6mp912732jkfhki5qvv0r5fo.apps.googleusercontent.com`)
- **Credentials**: saved to `C:\Users\gpbea\.claude\connectors\.env` (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)
- **Tokens**: exchanged and saved to `.tokens.json` via localhost redirect flow. Account: g.pryer@couch-heroes.com
- **Smoke tests passed**: `gmail listLabels` (labels returned), `gcalendar listEvents` (calendar accessible), `gdrive listRecent` (files listed incl. CH Candidate Tracker)
- **Code fix**: updated `lib/auth/google-oauth.js` to use localhost:8339 redirect (Google deprecated OOB flow). Added `node cli.js google-auth login` command for one-step auth. Connectors repo needs committing.

## 3. OPEN ITEMS

1. **4 pending lead drafts** in AIOS Queue (Tom Rieger, Mike Palin, Jason Greer x2). Normal triage.
2. **3 test drafts** in Glen's Outlook Drafts (2 smoke tests + 1 Erich Poch E2E) -- delete when seen.
3. **Tom Rieger email** `triegier@nbi-consulting.com` may be misspelt -- verify before sending.
4. **Midday nudge Slack delivery** blocked by safety lockdown -- delivers inline to log.
5. **Connectors repo** has uncommitted changes (google-oauth.js localhost redirect fix + cli.js login command).
6. **Master push** -- NBIAI_TEAM master is ahead of origin.
7. **Slack user token** (xoxp-) still needed for Slack ingestion (Phase 4 item 3).
8. Carried: harness proposals P003-P008 + P011, restricted CH extracts, EU Withdrawal Button.

## 4. ENVIRONMENT

- DB: Postgres, `DATABASE_URL` in dashboard-server/.env. Session timezone Europe/London.
- Server: PM2 `nbi-dashboard` on :8888. Slack bot running.
- Connectors: `C:\Users\gpbea\.claude\connectors` (own git). Azure Mail.ReadWrite (Application) granted on app bff14f81. Google OAuth live on g.pryer@couch-heroes.com.
- Cadence: `scripts/cadence/run-cadence.ps1`. Model-map: lead-scan + midday-nudge on claude-sonnet-4-6. 10 NBI Cadence schtasks registered.
- Repo-root scripts require dotenv via `./dashboard-server/node_modules/dotenv`.
