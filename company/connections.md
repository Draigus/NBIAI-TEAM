# Connections Registry

Last verified: 2026-06-11

**Headless caveat (verified 2026-06-11):** claude.ai remote MCPs are NOT available in headless `claude -p` runs (and therefore not in the local cadence tasks — see `company/routines.md`). Local MCPs from `.mcp.json` (Telegram, Playwright, PPT, Foundry) ARE available headless.

---

## MCP Servers (Claude.ai Remote)

Services managed by claude.ai's OAuth. Available in Claude Code conversations automatically.

| Service | What It Accesses | Auth Method | Status |
|---------|-----------------|-------------|--------|
| Gmail | Read/send email, drafts, labels, threads | Google OAuth2 (claude.ai managed) | Active |
| Google Calendar | Events, availability, scheduling, suggest time | Google OAuth2 (claude.ai managed) | Active |
| Google Drive | Files, search, permissions, download/upload | Google OAuth2 (claude.ai managed) | Active |
| Slack | Channels, messages, search, users, canvases | Bot token (claude.ai managed) | Active |
| Miro | Boards, items, diagrams, tables, images, docs | Token (claude.ai managed) | Active |
| Granola | Meeting transcripts, folders, account info | OAuth (claude.ai managed) | Active |
| Gamma | Presentations, documents, webpages, templates | OAuth (claude.ai managed) | Active |

---

## MCP Servers (Local)

Self-hosted MCP servers configured in `.mcp.json` or user-level settings.

| Service | What It Accesses | Auth Method | Status |
|---------|-----------------|-------------|--------|
| Foundry VTT | Actors, journals, scenes, compendiums, tokens, maps | Local WebSocket | Active |
| Blender | 3D scenes, objects, textures, Polyhaven/Sketchfab/Hyper3D generation | Local WebSocket | Active |
| Desktop Commander | File ops, processes, system commands, search | Local | Active |
| Context7 | Library/framework documentation lookup | API | Active |
| Telegram | Messages, chats, contacts, media, channels, groups | MTProto user session (Glen's account, Python telegram-mcp) | Active (verified headless 2026-06-11) |
| PPT | PowerPoint creation, slides, charts, tables, shapes | Local (pptxgenjs) | Active |
| MS365 | Mail, calendar, OneDrive, contacts, search | MSAL client credentials (AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET) | Active |
| Apify | Web scraping actors, datasets, key-value stores | Token (APIFY_TOKEN) | Active |

---

## Direct API Connectors (`~/.claude/connectors/`)

REST API library with CLI interface. Use for scripted/batch operations where MCP conversation flow is unnecessary.

**CLI:** `node C:\Users\gpbea\.claude\connectors\cli.js <service> <action> [--param value]`
**Help:** `node C:\Users\gpbea\.claude\connectors\cli.js <service> help`

**STATUS (verified 2026-06-11): NOT CREDENTIALED.** `connectors/.env` is empty (0 vars injected) — every env-auth service fails, and the Google services fail too (GOOGLE_CLIENT_ID/SECRET missing; `.tokens.json` alone is insufficient). The 2026-05-13 "credential setup reminder" routine fired but setup never happened. Until the .env is populated, treat every row below as **Inactive**. The cadence layer's email delivery and gmail/slack ingestion are blocked on this (see company/routines.md Gaps). Quickest wins: copy AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET from dashboard-server/.env for msgraph (the dashboard already sends Graph email with those creds as nbihub@nbi-consulting.com); Glen to provide Google OAuth client credentials for gmail/gcalendar/gdrive.

| Service | What It Accesses | Auth Method | Manifest |
|---------|-----------------|-------------|----------|
| telegram | Bot API: messages, chats, updates | TELEGRAM_BOT_TOKEN | `manifests/telegram-api.md` |
| gmail | Email, drafts, labels, threads | Google OAuth2 | `manifests/gmail-api.md` |
| gcalendar | Events, calendars, free/busy | Google OAuth2 (shared with Gmail) | `manifests/gcalendar-api.md` |
| gdrive | Files, folders, permissions, export | Google OAuth2 (shared with Gmail) | `manifests/gdrive-api.md` |
| msgraph | Mail, calendar, OneDrive, contacts | MSAL client credentials | `manifests/msgraph-api.md` |
| miro | Boards, items, members | MIRO_ACCESS_TOKEN | `manifests/miro-api.md` |
| slack | Channels, messages, users, reactions | SLACK_BOT_TOKEN | `manifests/slack-api.md` |
| apify | Actors, runs, datasets, key-value stores | APIFY_TOKEN | `manifests/apify-api.md` |
| pptx | PowerPoint generation (slides, charts, tables) | Local (no auth) | — |

### Wiring a New Capability

1. Read the manifest for the target service in `manifests/`
2. Find the endpoint in the "Available" section
3. Add the function to `lib/<service>.js` following the existing fetch-helper pattern
4. Move the endpoint from "Available" to "Implemented" in the manifest
5. Test via CLI: `node cli.js <service> <newAction> --params`

---

## Overlap Notes

Several services are available via both MCP and direct connector:

| Service | MCP Use Case | Connector Use Case |
|---------|-------------|-------------------|
| Gmail / GCal / GDrive | Conversational queries ("check my calendar") | Batch operations, scheduled data pulls |
| Telegram | Interactive chat, media handling | Bot API automation, message sends from routines |
| MS365 | Conversational email/calendar queries | Scripted batch operations |
| Slack | Reading channels, interactive replies | Automated message sends, bulk search |
| Apify | Interactive actor runs, browsing results | Scripted scraping pipelines |
| Miro | Board interaction, diagram creation | Programmatic board manipulation |

**Rule of thumb:** MCP for conversational use within a Claude session. Connector for automation, routines, and anything that runs without a human in the loop.

---

## Dashboard Server Integrations

Services wired into `dashboard-server/server.js` directly (not via MCP or connector).

| Integration | Purpose | Auth / Config |
|-------------|---------|--------------|
| PostgreSQL | WorkSage data (nbi_dashboard DB, port 5432) | DATABASE_URL / ADMIN_DATABASE_URL |
| Azure MSAL | User authentication | AZURE_TENANT_ID / CLIENT_ID / CLIENT_SECRET |
| Prometheus | `/metrics` endpoint via `prom-client` | None (local) |
| Cloudflare Tunnel | Public access at worksage.nbi-consulting.com | Tunnel config |
| PM2 | Process management (`nbi-dashboard` on :8888, `nbi-dashboard-staging` on :8887) | Local CLI |

---

## MCPs Kept vs Replaced

The direct connector library replaces these MCPs (remove only after verifying connector works):
- **Local MCPs (.mcp.json):** telegram, ppt
- **User-level MCPs:** ms365, apify
- **Claude.ai remote:** Gmail, Google Calendar, Google Drive, Miro, Slack

**MCPs with no connector replacement (kept):** Foundry VTT, Blender, Desktop Commander, Context7, Granola, Gamma
