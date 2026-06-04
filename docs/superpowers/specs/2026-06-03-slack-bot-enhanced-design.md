# Slack Bot Enhanced — Client, Assignee, Item Type + Feedback

**Date:** 2026-06-03
**Status:** Approved
**Scope:** `dashboard-server/lib/slack-bot.js`, `routes/slack.js`, `routes/queue.js`, migration 058, tests

## Problem

The @WorkSage Slack bot accepts task submissions but only captures title and description. There is no way to specify which client the task belongs to, who should be assigned, or what type of work item it is. The feedback reply is minimal (just "Queued: title").

## Message Format

```
@WorkSage [CLIENT] [TYPE] for [ASSIGNEE]: Title goes here
Optional description on subsequent lines
```

All metadata tokens are optional and can appear in any order before the title. The colon separating metadata from title is optional. If no metadata is detected, the whole first line is the title (backwards compatible).

### Token recognition rules

Tokens are consumed greedily left-to-right from the first line (after stripping bot mentions). Each word is tested against these matchers in priority order:

1. **Client shortcode** — tested first. Matches if the word exactly equals a known `clients.abbreviation` (case-insensitive). Looked up from a cached set loaded at startup / refreshed hourly. Known values: CH, LH, NBI, GO, SU, PL. If a future client abbreviation collides with an item type keyword, the client wins (client shortcodes are DB-backed and take precedence).
2. **Item type** — matches if the word is one of `task`, `story`, `feature`, `project` (case-insensitive). Defaults to `task` if not specified.
3. **Assignee** — matches the pattern `for <Name>` but ONLY when `<Name>` resolves to a known user in the DB (case-insensitive match on `users.display_name`). If `for` is followed by a word that does NOT match any user, the `for` and subsequent word are left in place as part of the title. This prevents "Fix for production" from being mis-parsed. The `for` pattern is greedy up to the colon or end-of-first-line, but only the first matching user name is consumed. Multi-word display names are supported: "for Glen Pryer" matches if "Glen Pryer" is a display_name.
4. **Colon separator** — if present after metadata tokens, stripped. If absent, parser still works.
5. **Remainder** — everything left on the first line after stripping matched tokens = title. If empty after stripping, the submission is rejected.

### Assignee matching detail

- The parser extracts the raw name after `for` (up to colon or EOL)
- `resolveAssignee` does an exact case-insensitive match first: `WHERE LOWER(display_name) = LOWER($1)`
- If no exact match, tries first-name prefix: `WHERE LOWER(display_name) LIKE (LOWER($1) || ' %')` — this matches "Aris" to "Aris Kotsomitopoulos" but NOT "A" to "Aris" (requires the full first name followed by a space)
- If exactly one match: resolved. If multiple matches: ambiguous — stored as raw text, flagged in reply. If zero matches: unresolved — stored as raw text, flagged in reply.
- Single assignee only. "for Aris and Magnus" is not supported; "Aris and Magnus" would be treated as one name, fail to resolve, and be stored as raw text with a warning.

### Parsing strategy: two-pass with DB validation

Because the `for <Name>` pattern requires DB validation, the parser works in two passes:

**Pass 1 (pure, no DB):** Tokenise the first line. Identify candidate client abbreviation, candidate item type, candidate `for <Name>` phrase, and remainder (title). Return all as raw strings.

**Pass 2 (in handleAppMention, with DB):** Resolve client abbreviation against `clients` table. Resolve assignee name against `users` table. If `for <Name>` didn't resolve, re-merge "for Name" back into the title.

### Examples

| Message | Client | Type | Assignee | Title |
|---------|--------|------|----------|-------|
| `@WorkSage CH task for Aris: Fix login timeout` | CH (Couch Heroes) | task | Aris | Fix login timeout |
| `@WorkSage LH for Magnus: Review analytics spec` | LH (Lighthouse) | task (default) | Magnus | Review analytics spec |
| `@WorkSage NBI feature: Build Slack integration` | NBI | feature | null | Build Slack integration |
| `@WorkSage Fix the broken button` | null | task (default) | null | Fix the broken button |
| `@WorkSage story for Glen: User can export CSV` | null | story | Glen Pryer | User can export CSV |
| `@WorkSage CH Deploy fix for production` | CH | task (default) | null (no user "production") | Deploy fix for production |
| `@WorkSage task CH for Aris: Works in any order` | CH | task | Aris | Works in any order |
| `@WorkSage CH for Nobody: Test unknown user` | CH | task | raw:"Nobody" (flagged) | Test unknown user |
| `@WorkSage CH task for Aris:` | — | — | — | REJECTED (empty title) |

## Database Migration (058_queue_metadata.sql)

```sql
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task';
```

- `client_id`: NULL if no client specified or client abbreviation not recognised
- `assignee`: the resolved `display_name` if matched, or the raw text if unresolved. NULL if not specified.
- `item_type`: defaults to 'task'. Always populated.

No changes to the `tasks` table. The queue remains a staging area; admins triage queue items into proper work items.

## Slack Feedback Responses

All replies are threaded to the original message.

### Success — all metadata resolved
```
✅ Queued: *Fix login timeout*
📋 Task · 👤 Aris · 🏢 Couch Heroes
🆔 a1b2c3d4-...
🔗 https://worksage.nbi-consulting.com/nbi_project_dashboard.html
```

### Success — assignee unresolved
```
✅ Queued: *Fix login timeout*
📋 Task · ⚠️ "Nobody" (not matched to a user) · 🏢 Couch Heroes
🆔 a1b2c3d4-...
🔗 https://worksage.nbi-consulting.com/nbi_project_dashboard.html
```

### Success — client unresolved
```
✅ Queued: *Fix login timeout*
📋 Task · 👤 Aris · ⚠️ "XX" (unknown client)
🆔 a1b2c3d4-...
```

### Success — minimal (no metadata)
```
✅ Queued: *Fix the broken button*
📋 Task
🆔 a1b2c3d4-...
🔗 https://worksage.nbi-consulting.com/nbi_project_dashboard.html
```

### Failure — empty message / no title
```
❌ Couldn't parse a task from that message.
Usage: @WorkSage [CH|LH|NBI] [task|story|feature] for [Name]: Title
```

### Failure — DB error during resolution
Queue the task with whatever resolved successfully. Do NOT fail the submission because a lookup query failed. Reply with:
```
✅ Queued: *Fix login timeout*
📋 Task
⚠️ Couldn't look up client/assignee — queued without metadata
🆔 a1b2c3d4-...
```

## Architecture

### Parser (`parseSlackMessage` enhanced)

**Pass 1 — pure function, no DB:**

1. Strip `<@BOTID>` mentions (regex: `/<@[A-Z0-9]+>/g`)
2. Split on first `\n`: first line = metadata + title, rest = description
3. Tokenise first line into words
4. Scan tokens left-to-right:
   a. If token matches a known abbreviation set (passed in as argument): consume as `clientAbbr`
   b. If token matches item type set `['project', 'feature', 'story', 'task']`: consume as `itemType`
   c. If token is `for` (case-insensitive): consume subsequent tokens as `assigneeRaw` until colon or end-of-tokens
   d. If token is `:` or ends with `:`: strip colon, break — everything remaining is title
5. Remaining unconsumed tokens = title (joined with spaces)
6. Return `{ title, description, clientAbbr, itemType, assigneeRaw }`

**The abbreviation set is passed into the parser** so it remains a pure function. `handleAppMention` loads abbreviations from DB and passes them in.

### Client abbreviation cache

- Loaded at server startup: `SELECT abbreviation FROM clients WHERE abbreviation IS NOT NULL`
- Stored as a `Set` of lowercase strings
- Refreshed every 60 minutes (simple setInterval) or on cache miss
- Exposed via `loadClientAbbreviations(pool)` and `getClientAbbreviations()`

### Resolvers (new functions in slack-bot.js)

- **`resolveClient(pool, abbr)`** — `SELECT id, name, abbreviation FROM clients WHERE LOWER(abbreviation) = LOWER($1)`. Returns `{ id, name, abbreviation }` or `null`.
- **`resolveAssignee(pool, rawName)`** — Two-step:
  1. Exact: `SELECT display_name FROM users WHERE LOWER(display_name) = LOWER($1) AND is_active = true`
  2. If no exact match, first-name: `SELECT display_name FROM users WHERE LOWER(display_name) LIKE (LOWER($1) || ' %') AND is_active = true LIMIT 2`
  - Returns `{ resolved: true, displayName }` if exactly one match
  - Returns `{ resolved: false, raw, reason: 'ambiguous'|'not_found' }` otherwise
  - Only matches active users (`is_active = true`)

### handleAppMention (updated)

1. Load client abbreviation cache (or use cached set)
2. Call `parseSlackMessage(text, abbreviationSet)`
3. If no title: post error reply, return `{ queued: false }`
4. Resolve client abbreviation via `resolveClient` (if `clientAbbr` present). Wrap in try/catch — on DB error, set `clientId = null` and add warning.
5. Resolve assignee via `resolveAssignee` (if `assigneeRaw` present). Wrap in try/catch — same degradation. If unresolved, re-merge "for Name" back into title.
6. INSERT into `task_queue` with `client_id`, `assignee`, `item_type`
7. Build and post rich feedback reply (threaded)
8. Return `{ queued: true, item, warnings }`

### Feedback reply builder (`buildSlackReply`)

New pure function. Takes `{ title, itemType, clientName, assigneeName, assigneeResolved, clientResolved, queueId, warnings }`. Returns formatted Slack mrkdwn string. Testable in isolation.

### queue.js route (updated)

- `POST /api/queue` accepts optional `client_id`, `assignee`, `item_type` in body. Validates `item_type` against the allowed set if provided.
- `GET /api/queue` returns all columns including new ones.
- INSERT query updated to include three new columns.

### Slack user identity

The `submitted_by` field stores `slack:<slack_user_id>` (e.g. `slack:U99SENDER`). There is no Slack-to-WorkSage user mapping currently. This spec does NOT add one — the submitter identity stays as the Slack ID. The `assignee` field is the WorkSage display_name of the person the task is FOR, not the person who submitted it.

## Files Changed

1. **`lib/slack-bot.js`** — enhanced `parseSlackMessage` (takes abbreviation set), new `resolveClient`, `resolveAssignee`, `buildSlackReply`, `loadClientAbbreviations`/`getClientAbbreviations` cache, updated `handleAppMention`
2. **`routes/slack.js`** — initialise abbreviation cache on server start, pass to handler
3. **`routes/queue.js`** — updated INSERT to include `client_id`, `assignee`, `item_type`; validate `item_type` on POST
4. **`migrations/058_queue_metadata.sql`** — three ALTER TABLEs
5. **`tests/unit/slack-bot.test.mjs`** — new and updated tests (see test plan below)

## Test Plan

### Parser tests (pure, no DB)

| Test case | Input | Expected |
|-----------|-------|----------|
| Full metadata | `CH task for Aris: Fix login` | `{ clientAbbr: 'CH', itemType: 'task', assigneeRaw: 'Aris', title: 'Fix login' }` |
| Client + assignee, no type | `LH for Magnus: Review spec` | `{ clientAbbr: 'LH', itemType: null, assigneeRaw: 'Magnus', title: 'Review spec' }` |
| Client + type, no assignee | `NBI feature: Build integration` | `{ clientAbbr: 'NBI', itemType: 'feature', assigneeRaw: null, title: 'Build integration' }` |
| Bare title | `Fix the broken button` | `{ clientAbbr: null, itemType: null, assigneeRaw: null, title: 'Fix the broken button' }` |
| "for" in title (no user match) | `Deploy fix for production` | `{ clientAbbr: null, ..., assigneeRaw: 'production', title: 'Deploy fix' }` — then pass 2 re-merges |
| Any token order | `task CH for Aris: Title` | `{ clientAbbr: 'CH', itemType: 'task', assigneeRaw: 'Aris', title: 'Title' }` |
| Case insensitive | `ch TASK For aris: Title` | `{ clientAbbr: 'ch', itemType: 'TASK', assigneeRaw: 'aris', title: 'Title' }` |
| Metadata only, no title | `CH task for Aris:` | `{ ..., title: null }` |
| No colon separator | `CH task for Aris Fix login` | `{ clientAbbr: 'CH', itemType: 'task', assigneeRaw: 'Aris Fix login', title: null }` — greedy assignee. Pass 2 resolves: if "Aris" matches but "Aris Fix login" doesn't, falls back to prefix match on "Aris", re-merges "Fix login" into title. |
| Multi-line | `CH task for Aris: Fix\nDetails here` | `{ ..., title: 'Fix', description: 'Details here' }` |
| Multiple mentions stripped | `<@U1> <@U2> CH Fix it` | `{ clientAbbr: 'CH', title: 'Fix it' }` |

### Resolver tests (DB required)

| Test case | Expected |
|-----------|----------|
| resolveClient('CH') | `{ id: <uuid>, name: 'Couch Heroes', abbreviation: 'CH' }` |
| resolveClient('XX') | `null` |
| resolveClient(null) | `null` |
| resolveAssignee('Glen Pryer') | `{ resolved: true, displayName: 'Glen Pryer' }` |
| resolveAssignee('Glen') | `{ resolved: true, displayName: 'Glen Pryer' }` (first-name prefix) |
| resolveAssignee('Nobody') | `{ resolved: false, raw: 'Nobody', reason: 'not_found' }` |
| resolveAssignee('') | `{ resolved: false, raw: '', reason: 'not_found' }` |

### Feedback builder tests (pure)

| Test case | Expected output contains |
|-----------|------------------------|
| All resolved | `✅ Queued`, title in bold, type, assignee name, client name, queue ID |
| Unresolved assignee | `⚠️` + raw name + "(not matched to a user)" |
| Unresolved client | `⚠️` + abbreviation + "(unknown client)" |
| Minimal (no metadata) | Just title, type, and ID |
| Empty title | `❌ Couldn't parse` + usage line |

### Integration tests (supertest)

| Test case | Expected |
|-----------|----------|
| Signed app_mention with full metadata → 200, queue row has client_id + assignee + item_type | Existing test pattern extended |
| POST /api/queue with client_id + assignee + item_type in body → 201 | API key path supports new fields |

## Deployment

1. Run migration 058 (`npm run init-db`)
2. Set env vars: `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN` (from Slack app config)
3. Install Slack app to NBI workspace using the manifest at `slack-app-manifest.yml`
4. Restart PM2 (`pm2 restart nbi-dashboard`)
5. Test with `@WorkSage CH task for Glen: Test submission` in any channel
6. Verify: threaded reply appears with correct metadata, queue row visible in admin view

## Edge Cases and Decisions

| Edge case | Decision |
|-----------|----------|
| "for" followed by non-user word | Re-merged into title during pass 2. Not treated as assignee. |
| Client abbreviation collides with future item type keyword | Client wins (DB-backed, checked first). |
| Ambiguous assignee (multiple users match prefix) | Stored as raw text, flagged with ⚠️ in reply. |
| DB error during client/assignee resolution | Degrade gracefully — queue with nulls, warn in reply. Never fail the submission. |
| Slack user not in WorkSage | submitted_by stores `slack:<id>`. No mapping attempted. |
| Multiple assignees ("for Aris and Magnus") | Not supported. Treated as one name, fails to resolve, stored as raw text. |
| Very long message | Existing `validateLength` in queue.js applies to title/description. |
| Bot message / subtype=bot_message | Already filtered in routes/slack.js — ignored. |
| Duplicate submissions (Slack retry) | Slack sends retries with same `ts`. Could INSERT duplicate. Acceptable for queue — admin deduplicates during triage. Not worth adding uniqueness constraint on `slack_message_ts` since legitimate edits should be allowed. |
