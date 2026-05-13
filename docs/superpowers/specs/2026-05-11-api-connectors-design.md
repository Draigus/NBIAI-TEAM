# NBI API Connectors Library — Design Spec

**Date:** 2026-05-11
**Author:** Glen Pryer + Claude
**Status:** Draft — awaiting review

## Problem

NBI's Claude Code environment has 17 MCP servers connected. Most wrap REST APIs that could be called directly. The MCP layer adds:

- ~240 deferred tool name entries consuming context tokens every turn
- MCP server instruction blocks loaded per turn
- Multiple processes spawned at startup (local MCPs)
- Permission prompt noise for each MCP tool
- Dependency on MCP protocol reliability (connection drops, timeouts)
- Lock-in: these integrations only work inside Claude Code sessions

## Goal

Replace MCP servers with a unified Node.js API connector library that:

1. **Works everywhere** — importable from dashboard server, callable from CLI, usable in standalone scripts, not just Claude Code
2. **Is globally accessible** — lives at `~/.claude/connectors/`, available from any Claude Code project
3. **Documents the full API surface** — manifests capture every capability per service, even unimplemented ones, so future sessions can wire up new features without re-researching APIs
4. **Reduces context overhead** — no tool registrations, no MCP instructions injected into context
5. **Improves reliability** — direct HTTP calls, no MCP protocol layer, no WebSocket connections for REST-based services

## Architecture

### Location

```
~/.claude/connectors/
├── package.json
├── .env                        # API keys, client IDs, secrets
├── .tokens.json                # Persisted OAuth refresh tokens (gitignored)
├── .gitignore                  # Ignore .env, .tokens.json, node_modules
├── cli.js                      # CLI entry point
├── lib/
│   ├── auth/
│   │   ├── google-oauth.js     # Shared Google OAuth2 (Gmail + Calendar + Drive)
│   │   ├── msgraph-oauth.js    # Microsoft Graph MSAL OAuth
│   │   └── token-store.js      # Read/write .tokens.json with auto-refresh
│   ├── telegram.js             # Telegram Bot API
│   ├── msgraph.js              # Microsoft Graph API
│   ├── google-mail.js          # Gmail API
│   ├── google-calendar.js      # Google Calendar API
│   ├── google-drive.js         # Google Drive API
│   ├── miro.js                 # Miro REST API v2
│   ├── slack.js                # Slack Web API
│   ├── apify.js                # Apify REST API
│   └── pptx.js                 # pptxgenjs wrapper (local, no auth)
└── manifests/
    ├── telegram-api.md
    ├── msgraph-api.md
    ├── gmail-api.md
    ├── gcalendar-api.md
    ├── gdrive-api.md
    ├── miro-api.md
    ├── slack-api.md
    └── apify-api.md
```

### Auth Model

| Service | Auth Type | Credentials Source |
|---------|-----------|-------------------|
| Telegram | Bot token | `.env` → `TELEGRAM_BOT_TOKEN` |
| Microsoft Graph | MSAL OAuth2 | `.env` → `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| Gmail | Google OAuth2 | `.env` → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; `.tokens.json` → refresh token |
| Google Calendar | Google OAuth2 | Shared with Gmail |
| Google Drive | Google OAuth2 | Shared with Gmail |
| Miro | API token | `.env` → `MIRO_ACCESS_TOKEN` |
| Slack | Bot token | `.env` → `SLACK_BOT_TOKEN` |
| Apify | API token | `.env` → `APIFY_TOKEN` |
| PowerPoint | None | Local library, no auth |

Google OAuth note: Gmail, Calendar, and Drive share a single OAuth2 credential set. One auth flow, one refresh token, three services. The Google Cloud project needs scopes for all three enabled.

### CLI Interface

```bash
# Standard calling convention
node ~/.claude/connectors/cli.js <service> <action> [--param value]

# Examples
node ~/.claude/connectors/cli.js telegram send --chat "Steve Green" --message "Goals update"
node ~/.claude/connectors/cli.js gmail search --query "from:client subject:invoice" --max 10
node ~/.claude/connectors/cli.js gcalendar list --days 7
node ~/.claude/connectors/cli.js gdrive search --query "Q2 report" --type spreadsheet
node ~/.claude/connectors/cli.js msgraph mail-search --query "lighthouse" --folder inbox
node ~/.claude/connectors/cli.js miro boards
node ~/.claude/connectors/cli.js slack send --channel "#general" --message "Deploy complete"
node ~/.claude/connectors/cli.js apify run --actor "apify/web-scraper" --input '{"url":"..."}'
node ~/.claude/connectors/cli.js pptx create --output "deck.pptx" --template "nbi-standard"
```

All commands output structured JSON to stdout. Errors output JSON with `{"error": "...", "code": "..."}` to stderr.

### Connector Module Interface

Each module exports async functions following a consistent pattern:

```javascript
// lib/telegram.js
export async function sendMessage(chatId, text, options = {}) { ... }
export async function getChats(options = {}) { ... }
export async function getMessages(chatId, options = {}) { ... }
export async function sendFile(chatId, filePath, options = {}) { ... }
```

Importable from dashboard server or any Node.js script:

```javascript
import { sendMessage } from '~/.claude/connectors/lib/telegram.js';
await sendMessage('Steve Green', 'Goals update sent');
```

### Initial Scope Per Connector

#### Telegram (Bot API)
- `sendMessage` — send text to chat
- `getChats` — list recent chats
- `getMessages` — retrieve message history from chat
- `sendFile` — send document/photo to chat
- `getMe` — bot identity check

#### Microsoft Graph
- `searchEmail` — search mailbox
- `getEmail` — get email by ID with attachments
- `sendEmail` — send/reply email
- `listEvents` — calendar events for date range
- `createEvent` — create calendar event
- `listFiles` — OneDrive file listing
- `getFile` — download file content
- `searchFiles` — search OneDrive

#### Gmail
- `searchThreads` — search email threads
- `getThread` — get full thread with messages
- `createDraft` — create email draft
- `sendEmail` — send email
- `listLabels` — list Gmail labels

#### Google Calendar
- `listEvents` — events for date range
- `createEvent` — create event
- `updateEvent` — modify existing event
- `deleteEvent` — remove event
- `checkAvailability` — free/busy check

#### Google Drive
- `searchFiles` — search by name/type/content
- `readFile` — read file content
- `createFile` — create new file
- `downloadFile` — download to local path
- `listRecent` — recently modified files

#### Miro
- `listBoards` — list accessible boards
- `listItems` — items on a board
- `createDiagram` — create diagram from DSL
- `getLayout` — read board layout
- `createLayout` — create structured layout

#### Slack
- `sendMessage` — post to channel/DM
- `searchMessages` — search workspace messages
- `readChannel` — read channel history
- `readThread` — read thread replies
- `searchUsers` — find users

#### Apify
- `searchActors` — search actor marketplace
- `getActorDetails` — actor README and input schema
- `runActor` — execute actor with input
- `getOutput` — get run results
- `getDatasetItems` — paginated dataset retrieval

#### PowerPoint (pptxgenjs)
- `createPresentation` — new empty deck
- `addSlide` — add slide with layout
- `addText` — add text box
- `addChart` — add chart from data
- `addTable` — add table
- `addImage` — add image
- `save` — write to file

### Manifest File Format

Each `manifests/<service>-api.md` file documents the complete API surface:

```markdown
# <Service> API — Full Capability Manifest

**Base URL:** https://api.example.com/v2
**Auth:** Bearer token / OAuth2
**Rate Limits:** 100 req/min
**Official Docs:** https://docs.example.com

## Implemented (wired into lib/<service>.js)

| Function | API Endpoint | Description |
|----------|-------------|-------------|
| sendMessage | POST /messages | Send text message to chat |
| getChats | GET /chats | List recent conversations |

## Available — Not Yet Implemented

### Category: Messages
| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| /messages/forward | POST | Forward message to another chat | Low |
| /messages/{id}/pin | PUT | Pin message in chat | Low |

### Category: Media
| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| /photos | POST | Send photo | Medium |
| /documents | POST | Send document | Medium |

### Category: Administration
...
```

Priority field (`High` / `Medium` / `Low`) indicates likely usefulness to NBI workflows, guiding future implementation decisions.

## MCP Disposition

### Replace with API Connector

| MCP | Config Location | Removal Action |
|-----|----------------|----------------|
| Telegram | `.mcp.json` (local) | Remove from `.mcp.json` |
| MS365 | User-level `.claude.json` | Remove from user config |
| Apify | User-level `.claude.json` | Remove from user config |
| PowerPoint | `.mcp.json` (local) | Remove from `.mcp.json` |
| Gmail | Claude.ai remote | Disconnect in Claude.ai settings |
| Google Calendar | Claude.ai remote | Disconnect in Claude.ai settings |
| Google Drive | Claude.ai remote | Disconnect in Claude.ai settings |
| Miro | Claude.ai remote | Disconnect in Claude.ai settings |
| Slack | Claude.ai remote | Disconnect in Claude.ai settings |

### Investigate (verify API exists before committing)

| MCP | Status |
|-----|--------|
| Granola | Check for public API; if none, keep MCP and note "MCP-only" in manifests |
| Gamma | Check for public API; if none, keep MCP and note "MCP-only" in manifests |

Decision trigger: if no documented public REST API is found after searching official docs and developer portals, the service stays as an MCP with no connector built. No further investigation needed.

### Keep as MCP

| MCP | Reason |
|-----|--------|
| Foundry VTT | Custom WebSocket bridge, purpose-built for Arthrea |
| Blender | Desktop application control, no REST API alternative |
| Desktop Commander | Used in Claude Chat (web app), not redundant |
| Context7 | Library docs utility, no standalone equivalent |
| Claude in Chrome | Browser extension bridge |
| Framer | HTTP connector, niche usage for website work |

## Build Order

Ordered by auth complexity (simplest first) and dependency chains:

### Wave 1 — Token Auth (no OAuth, quick wins)
1. **Telegram** — Bot token auth, well-documented API, high usage
2. **Apify** — API token auth, already have credentials

### Wave 2 — Google OAuth (one setup, three connectors)
3. **Google OAuth setup** — Create GCP project, configure OAuth consent, get credentials
4. **Gmail** — First Google connector, validates auth flow
5. **Google Calendar** — Shares auth with Gmail
6. **Google Drive** — Shares auth with Gmail

### Wave 3 — Microsoft + Token Services
7. **Microsoft Graph** — Reuse existing Azure MSAL credentials from dashboard server
8. **Miro** — API token auth
9. **Slack** — Bot token auth

### Wave 4 — Local Library
10. **PowerPoint** — pptxgenjs, no auth needed, no API calls

### Parallel — Manifests
Build each manifest alongside its connector. Research the full API surface during implementation.

## Integration with Claude Code

### How Claude Code calls connectors
```bash
# Via Bash tool — falls under existing Bash(*) permission
node ~/.claude/connectors/cli.js telegram send --chat "123456" --message "hello"
```

### How the dashboard server imports connectors
```javascript
import { searchEmail } from '../../../.claude/connectors/lib/msgraph.js';
// Or via package name if linked
import { searchEmail } from 'nbi-connectors/msgraph';
```

### Memory file for discoverability
A memory file at `~/.claude/projects/.../memory/reference_api_connectors.md` will point future sessions to:
- Connector location: `~/.claude/connectors/`
- CLI syntax: `node cli.js <service> <action> [--params]`
- Manifest location: `~/.claude/connectors/manifests/`
- How to wire up new capabilities from manifests

## Success Criteria

1. All 9 "replace" MCPs removed from configuration
2. Each connector passes a smoke test (call → structured JSON response)
3. Manifests document full API surface for all 8 services with APIs
4. Dashboard server can import and use at least one connector
5. Context token savings confirmed (before/after tool listing comparison)
6. No regression in Glen's day-to-day workflows

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Google OAuth setup is fiddly | Follow Google's quickstart exactly; test with Gmail first before Calendar/Drive |
| Token expiry mid-session | Auto-refresh in token-store.js; refresh proactively when token age > 80% of TTL |
| Losing a capability that was in the MCP but not in initial connector scope | Manifests document everything; wire up on demand |
| CLI parsing errors for complex arguments | Accept JSON stdin for complex inputs: `echo '{"to":"x","body":"y"}' \| node cli.js gmail send` |
| Glen disconnects Claude.ai remote MCPs but connector isn't ready | Remove MCPs one wave at a time, only after that wave's connectors are tested |
