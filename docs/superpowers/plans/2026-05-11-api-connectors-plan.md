# NBI API Connectors Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified Node.js API connector library at `~/.claude/connectors/` that replaces 9 MCP servers with direct REST API calls, including full API capability manifests for future extensibility.

**Architecture:** Each service gets a standalone ES module exporting async functions that call REST APIs via native `fetch()`. A shared token store handles OAuth refresh. A CLI entry point routes `node cli.js <service> <action>` commands to the right module and outputs JSON to stdout. Manifests document the full API surface per service.

**Tech Stack:** Node.js 22, native `fetch()`, ES modules, `dotenv`, `pptxgenjs`, `node:test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-05-11-api-connectors-design.md`

---

## File Map

```
C:\Users\gpbea\.claude\connectors\
├── package.json
├── .env.example
├── .gitignore
├── cli.js
├── lib/
│   ├── http.js
│   ├── auth/
│   │   ├── token-store.js
│   │   ├── google-oauth.js
│   │   └── msgraph-auth.js
│   ├── telegram.js
│   ├── apify.js
│   ├── google-mail.js
│   ├── google-calendar.js
│   ├── google-drive.js
│   ├── msgraph.js
│   ├── miro.js
│   ├── slack.js
│   └── pptx.js
├── test/
│   ├── http.test.js
│   ├── telegram.test.js
│   ├── apify.test.js
│   ├── google-mail.test.js
│   ├── google-calendar.test.js
│   ├── google-drive.test.js
│   ├── msgraph.test.js
│   ├── miro.test.js
│   ├── slack.test.js
│   └── pptx.test.js
├── manifests/
│   ├── telegram-api.md
│   ├── apify-api.md
│   ├── gmail-api.md
│   ├── gcalendar-api.md
│   ├── gdrive-api.md
│   ├── msgraph-api.md
│   ├── miro-api.md
│   └── slack-api.md
└── smoke-test.js
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\package.json`
- Create: `C:\Users\gpbea\.claude\connectors\.gitignore`
- Create: `C:\Users\gpbea\.claude\connectors\.env.example`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p ~/.claude/connectors/{lib/auth,test,manifests}
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "nbi-connectors",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "NBI API connector library — direct REST API wrappers replacing MCP servers",
  "main": "cli.js",
  "scripts": {
    "test": "node --test test/*.test.js",
    "smoke": "node smoke-test.js"
  },
  "dependencies": {
    "dotenv": "^17.0.0",
    "pptxgenjs": "^3.12.0"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.env
.tokens.json
```

- [ ] **Step 4: Create .env.example**

```env
# Telegram Bot API
TELEGRAM_BOT_TOKEN=

# Google OAuth2 (shared by Gmail, Calendar, Drive)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft Graph (Azure MSAL)
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
MSGRAPH_USER_EMAIL=

# Miro
MIRO_ACCESS_TOKEN=

# Slack
SLACK_BOT_TOKEN=

# Apify
APIFY_TOKEN=
```

- [ ] **Step 5: Install dependencies**

```bash
cd ~/.claude/connectors && npm install
```

Expected: `node_modules/` created with dotenv and pptxgenjs.

- [ ] **Step 6: Initialise git repo and commit**

```bash
cd ~/.claude/connectors && git init && git add -A && git commit -m "chore: scaffold nbi-connectors project"
```

---

## Task 2: Shared HTTP Helper + Token Store

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\http.js`
- Create: `C:\Users\gpbea\.claude\connectors\lib\auth\token-store.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\http.test.js`

- [ ] **Step 1: Write failing test for http.js**

```javascript
// test/http.test.js
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('apiRequest', () => {
  it('sends GET request with auth header and returns parsed JSON', async () => {
    const mockResponse = { ok: true, status: 200, json: async () => ({ id: 1 }), text: async () => '{}' };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse);

    const { apiRequest } = await import('../lib/http.js');
    const result = await apiRequest('https://api.example.com/test', { token: 'tok_123' });

    assert.deepStrictEqual(result, { id: 1 });
    const call = globalThis.fetch.mock.calls[0];
    assert.strictEqual(call.arguments[0], 'https://api.example.com/test');
    assert.strictEqual(call.arguments[1].headers['Authorization'], 'Bearer tok_123');

    globalThis.fetch = originalFetch;
  });

  it('throws on non-ok response with error detail', async () => {
    const mockResponse = { ok: false, status: 401, text: async () => 'Unauthorized' };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse);

    const { apiRequest } = await import('../lib/http.js');
    await assert.rejects(
      () => apiRequest('https://api.example.com/test', { token: 'bad' }),
      (err) => { assert.match(err.message, /401/); return true; }
    );

    globalThis.fetch = originalFetch;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/http.test.js
```

Expected: FAIL — `../lib/http.js` does not exist.

- [ ] **Step 3: Implement http.js**

```javascript
// lib/http.js
export async function apiRequest(url, options = {}) {
  const { token, method = 'GET', body, headers: extraHeaders = {}, query } = options;

  let fullUrl = url;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
  }

  const headers = { ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const fetchOpts = { method, headers };
  if (body) fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);

  const res = await fetch(fullUrl, fetchOpts);

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`API ${res.status}: ${errText}`);
    err.status = res.status;
    err.body = errText;
    throw err;
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export function loadEnv() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
}
```

Wait — `loadEnv` uses top-level await inside a non-async function. Let me fix that:

```javascript
// lib/http.js

let _envLoaded = false;

export function ensureEnv() {
  if (_envLoaded) return;
  // Dynamic import not needed — dotenv is sync
  const { resolve } = await import('node:path');
  // Actually, let's use a simpler approach
}
```

Hmm, let me rethink. The env loading should happen once at CLI startup, not inside http.js. Let me keep http.js purely as a fetch wrapper, and handle env loading in cli.js.

```javascript
// lib/http.js

export async function apiRequest(url, options = {}) {
  const { token, method = 'GET', body, headers: extraHeaders = {}, query } = options;

  let fullUrl = url;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
  }

  const headers = { ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const fetchOpts = { method, headers };
  if (body) fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);

  const res = await fetch(fullUrl, fetchOpts);

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`API ${res.status}: ${errText}`);
    err.status = res.status;
    err.body = errText;
    throw err;
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd ~/.claude/connectors && node --test test/http.test.js
```

Expected: PASS

- [ ] **Step 5: Implement token-store.js**

```javascript
// lib/auth/token-store.js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = join(__dirname, '..', '..', '.tokens.json');

export function readTokens() {
  if (!existsSync(TOKEN_PATH)) return {};
  return JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
}

export function writeTokens(tokens) {
  const existing = readTokens();
  const merged = { ...existing, ...tokens };
  writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

export function getToken(service) {
  const tokens = readTokens();
  return tokens[service] || null;
}

export function setToken(service, tokenData) {
  writeTokens({ [service]: tokenData });
}
```

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add shared HTTP helper and token store"
```

---

## Task 3: CLI Framework

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\cli.js`

- [ ] **Step 1: Implement cli.js**

```javascript
#!/usr/bin/env node
// cli.js — CLI entry point for NBI API connectors
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const SERVICES = {
  telegram: () => import('./lib/telegram.js'),
  apify: () => import('./lib/apify.js'),
  gmail: () => import('./lib/google-mail.js'),
  gcalendar: () => import('./lib/google-calendar.js'),
  gdrive: () => import('./lib/google-drive.js'),
  msgraph: () => import('./lib/msgraph.js'),
  miro: () => import('./lib/miro.js'),
  slack: () => import('./lib/slack.js'),
  pptx: () => import('./lib/pptx.js'),
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const service = args[0];
  const action = args[1];
  const params = {};

  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = val;
    }
  }

  return { service, action, params };
}

function output(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function error(msg, code = 'ERROR') {
  process.stderr.write(JSON.stringify({ error: msg, code }) + '\n');
  process.exit(1);
}

async function main() {
  // Support JSON via stdin for complex inputs
  let stdinData = null;
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) {
      try { stdinData = JSON.parse(raw); } catch { error(`Invalid JSON on stdin: ${raw}`); }
    }
  }

  const { service, action, params } = parseArgs(process.argv);

  if (!service) {
    output({
      usage: 'node cli.js <service> <action> [--param value]',
      services: Object.keys(SERVICES),
    });
    return;
  }

  if (!SERVICES[service]) {
    error(`Unknown service: ${service}. Available: ${Object.keys(SERVICES).join(', ')}`, 'UNKNOWN_SERVICE');
  }

  const mod = await SERVICES[service]();

  if (!action || action === 'help') {
    const actions = Object.keys(mod).filter(k => typeof mod[k] === 'function');
    output({ service, actions });
    return;
  }

  if (typeof mod[action] !== 'function') {
    const actions = Object.keys(mod).filter(k => typeof mod[k] === 'function');
    error(`Unknown action: ${action}. Available for ${service}: ${actions.join(', ')}`, 'UNKNOWN_ACTION');
  }

  try {
    const input = stdinData || params;
    const result = await mod[action](input);
    output(result);
  } catch (err) {
    error(err.message, err.code || 'API_ERROR');
  }
}

main();
```

- [ ] **Step 2: Test CLI with no args**

```bash
cd ~/.claude/connectors && node cli.js
```

Expected: JSON output listing available services.

- [ ] **Step 3: Commit**

```bash
cd ~/.claude/connectors && git add cli.js && git commit -m "feat: add CLI framework with service routing and arg parsing"
```

---

## Task 4: Telegram Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\telegram.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\telegram.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\telegram-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/telegram.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Set env before import
process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('telegram connector', () => {
  it('getMe calls correct endpoint with bot token', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, result: { id: 123, first_name: 'NBI Bot' } }),
    }));

    const { getMe } = await import('../lib/telegram.js');
    const result = await getMe();

    assert.strictEqual(result.id, 123);
    const url = globalThis.fetch.mock.calls[0].arguments[0];
    assert.match(url, /api\.telegram\.org\/bottest_token_123\/getMe/);
  });

  it('sendMessage sends text to chat', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, result: { message_id: 42, text: 'hello' } }),
    }));

    const { sendMessage } = await import('../lib/telegram.js');
    const result = await sendMessage({ chat: '12345', message: 'hello' });

    assert.strictEqual(result.message_id, 42);
    const fetchCall = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(fetchCall.arguments[1].body);
    assert.strictEqual(body.chat_id, '12345');
    assert.strictEqual(body.text, 'hello');
  });

  it('getChats returns list of recent updates', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        ok: true,
        result: [{ update_id: 1, message: { chat: { id: 100, title: 'Test Chat' } } }],
      }),
    }));

    const { getChats } = await import('../lib/telegram.js');
    const result = await getChats();

    assert.ok(Array.isArray(result));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/telegram.test.js
```

Expected: FAIL — `../lib/telegram.js` does not exist.

- [ ] **Step 3: Implement telegram.js**

```javascript
// lib/telegram.js — Telegram Bot API connector
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method, body = null) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set in .env');
  const opts = { method: body ? 'POST' : 'GET' };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/${method}`, opts);
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description || res.status}`);
  return data.result;
}

export async function getMe() {
  return call('getMe');
}

export async function sendMessage(params) {
  const { chat, message, parse_mode } = params;
  return call('sendMessage', {
    chat_id: chat,
    text: message,
    ...(parse_mode && { parse_mode }),
  });
}

export async function getChats(params = {}) {
  const { limit = 100 } = params;
  const updates = await call('getUpdates', { limit: Number(limit), allowed_updates: ['message'] });
  const seen = new Map();
  for (const u of updates) {
    const chat = u.message?.chat;
    if (chat && !seen.has(chat.id)) seen.set(chat.id, chat);
  }
  return [...seen.values()];
}

export async function getMessages(params) {
  const { chat, limit = 50 } = params;
  const updates = await call('getUpdates', { limit: Number(limit), allowed_updates: ['message'] });
  return updates
    .filter(u => u.message && String(u.message.chat.id) === String(chat))
    .map(u => u.message);
}

export async function sendFile(params) {
  const { chat, file, caption } = params;
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set in .env');
  const { readFileSync } = await import('node:fs');
  const { basename } = await import('node:path');
  const fileData = readFileSync(file);
  const form = new FormData();
  form.append('chat_id', chat);
  form.append('document', new Blob([fileData]), basename(file));
  if (caption) form.append('caption', caption);
  const res = await fetch(`${BASE}/sendDocument`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd ~/.claude/connectors && node --test test/telegram.test.js
```

Expected: PASS

- [ ] **Step 5: Build Telegram manifest**

Research the full Telegram Bot API at https://core.telegram.org/bots/api and write the manifest to `manifests/telegram-api.md`. The manifest must follow this structure:

```markdown
# Telegram Bot API — Full Capability Manifest

**Base URL:** https://api.telegram.org/bot{token}/
**Auth:** Bot token in URL path
**Rate Limits:** 30 messages/second to different chats; 1 msg/sec to same chat
**Official Docs:** https://core.telegram.org/bots/api

## Implemented (wired into lib/telegram.js)

| Function | API Method | Description |
|----------|-----------|-------------|
| getMe | getMe | Bot identity check |
| sendMessage | sendMessage | Send text to chat |
| getChats | getUpdates | List recent chats (derived from updates) |
| getMessages | getUpdates | Message history (derived from updates) |
| sendFile | sendDocument | Send file to chat |

## Available — Not Yet Implemented

### Messages
| Method | Description | Priority |
|--------|-------------|----------|
| forwardMessage | Forward message to another chat | Medium |
| copyMessage | Copy message without forward tag | Low |
| deleteMessage | Delete a message | Medium |
| editMessageText | Edit sent text message | High |
| sendPhoto | Send photo | High |
| sendVideo | Send video | Medium |
| sendAudio | Send audio file | Low |
| sendVoice | Send voice message | Low |
| sendAnimation | Send GIF | Low |
| sendLocation | Send location | Low |
| sendContact | Send contact card | Low |
| sendPoll | Send poll | Low |
| sendDice | Send dice/random | Low |
| sendMediaGroup | Send group of photos/videos | Medium |
...
(continue with all categories: Chat Management, Stickers, Inline, Payments, etc.)
```

The implementing engineer should visit https://core.telegram.org/bots/api and add every method listed there, categorised under the appropriate heading, with a Priority rating based on NBI usage patterns.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Telegram Bot API connector with manifest"
```

---

## Task 5: Apify Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\apify.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\apify.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\apify-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/apify.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.APIFY_TOKEN = 'test_apify_token';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('apify connector', () => {
  it('searchActors queries the store API', async () => {
    globalThis.fetch = mock.fn(async (url) => ({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        data: { items: [{ id: 'act1', name: 'web-scraper', title: 'Web Scraper' }], total: 1 },
      }),
    }));

    const { searchActors } = await import('../lib/apify.js');
    const result = await searchActors({ query: 'web scraper' });

    assert.ok(Array.isArray(result.items));
    assert.strictEqual(result.items[0].name, 'web-scraper');
    const url = globalThis.fetch.mock.calls[0].arguments[0];
    assert.match(url, /api\.apify\.com/);
  });

  it('runActor starts actor execution', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true, status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: { id: 'run1', status: 'RUNNING', actId: 'abc' } }),
    }));

    const { runActor } = await import('../lib/apify.js');
    const result = await runActor({ actor: 'apify/web-scraper', input: { startUrls: [] } });

    assert.strictEqual(result.id, 'run1');
    assert.strictEqual(result.status, 'RUNNING');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/apify.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement apify.js**

```javascript
// lib/apify.js — Apify REST API connector
import { apiRequest } from './http.js';

const TOKEN = process.env.APIFY_TOKEN;
const BASE = 'https://api.apify.com/v2';

function headers() {
  if (!TOKEN) throw new Error('APIFY_TOKEN not set in .env');
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function searchActors(params = {}) {
  const { query, limit = 20, offset = 0 } = params;
  const url = `${BASE}/store`;
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query) qs.set('search', query);
  const res = await fetch(`${url}?${qs}`, { headers: headers() });
  const data = await res.json();
  return data.data;
}

export async function getActorDetails(params) {
  const { actor } = params;
  const res = await fetch(`${BASE}/acts/${encodeURIComponent(actor)}`, { headers: headers() });
  const data = await res.json();
  return data.data;
}

export async function runActor(params) {
  const { actor, input = {}, memory, timeout, build } = params;
  const qs = new URLSearchParams();
  if (memory) qs.set('memory', String(memory));
  if (timeout) qs.set('timeout', String(timeout));
  if (build) qs.set('build', build);
  const qsStr = qs.toString();
  const url = `${BASE}/acts/${encodeURIComponent(actor)}/runs${qsStr ? '?' + qsStr : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  return data.data;
}

export async function getOutput(params) {
  const { runId } = params;
  const res = await fetch(`${BASE}/actor-runs/${runId}`, { headers: headers() });
  const data = await res.json();
  return data.data;
}

export async function getDatasetItems(params) {
  const { datasetId, limit = 100, offset = 0, format = 'json' } = params;
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset), format });
  const res = await fetch(`${BASE}/datasets/${datasetId}/items?${qs}`, { headers: headers() });
  return res.json();
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/apify.test.js
```

Expected: PASS

- [ ] **Step 5: Build Apify manifest**

Research the full Apify API at https://docs.apify.com/api/v2 and write to `manifests/apify-api.md`. Structure:

```markdown
# Apify REST API — Full Capability Manifest

**Base URL:** https://api.apify.com/v2
**Auth:** Bearer token header
**Rate Limits:** Varies by plan
**Official Docs:** https://docs.apify.com/api/v2

## Implemented (wired into lib/apify.js)

| Function | API Endpoint | Description |
|----------|-------------|-------------|
| searchActors | GET /store | Search actor marketplace |
| getActorDetails | GET /acts/{actorId} | Get actor details and input schema |
| runActor | POST /acts/{actorId}/runs | Execute actor with input |
| getOutput | GET /actor-runs/{runId} | Get run status and results |
| getDatasetItems | GET /datasets/{id}/items | Get paginated dataset items |

## Available — Not Yet Implemented

### Actors
| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| /acts | GET | List user's actors | Low |
| /acts/{id}/runs | GET | List actor runs | Medium |
| /acts/{id}/runs/last | GET | Get last run | High |
...
(continue with Datasets, Key-Value Stores, Request Queues, Schedules, Webhooks, Users)
```

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Apify REST API connector with manifest"
```

---

## Task 6: Google OAuth Module

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\auth\google-oauth.js`

This module is shared by Gmail, Google Calendar, and Google Drive connectors. It handles the OAuth2 token refresh flow using stored refresh tokens.

**Prerequisite:** Glen needs to create a Google Cloud project, enable Gmail/Calendar/Drive APIs, create OAuth2 credentials (Desktop app type), and run through the initial authorisation flow once to get a refresh token. This task provides a one-time auth script for that.

- [ ] **Step 1: Implement google-oauth.js**

```javascript
// lib/auth/google-oauth.js — Google OAuth2 token management
import { getToken, setToken } from './token-store.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
].join(' ');

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  return { clientId, clientSecret };
}

export function getAuthUrl() {
  const { clientId } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCode(code) {
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
  setToken('google', {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export async function getAccessToken() {
  const stored = getToken('google');
  if (!stored || !stored.refresh_token) {
    throw new Error('No Google refresh token. Run: node cli.js google-auth to authorise.');
  }
  if (stored.expires_at && Date.now() < stored.expires_at - 60000) {
    return stored.access_token;
  }
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: stored.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google OAuth refresh error: ${data.error_description || data.error}`);
  setToken('google', {
    access_token: data.access_token,
    refresh_token: stored.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}
```

- [ ] **Step 2: Add google-auth command to cli.js**

Add a special-case handler in `cli.js` before the service lookup for the one-time auth flow:

```javascript
// In cli.js, add after parseArgs and before the SERVICES lookup:

if (service === 'google-auth') {
  const { getAuthUrl, exchangeCode } = await import('./lib/auth/google-oauth.js');
  if (!action || action === 'url') {
    output({ authUrl: getAuthUrl(), instructions: 'Open this URL in a browser, authorise, and copy the code. Then run: node cli.js google-auth exchange --code YOUR_CODE' });
  } else if (action === 'exchange') {
    const token = await exchangeCode(params.code);
    output({ status: 'ok', message: 'Google OAuth tokens saved to .tokens.json' });
  }
  return;
}
```

- [ ] **Step 3: Test the auth URL generation**

```bash
cd ~/.claude/connectors && node cli.js google-auth url
```

Expected: JSON with `authUrl` field (will fail with credential error if .env not configured — that's expected and correct).

- [ ] **Step 4: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Google OAuth2 module with auth flow and token refresh"
```

---

## Task 7: Gmail Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\google-mail.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\google-mail.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\gmail-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/google-mail.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock the google-oauth module
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Stub the token
process.env.GOOGLE_CLIENT_ID = 'test';
process.env.GOOGLE_CLIENT_SECRET = 'test';

describe('gmail connector', () => {
  it('searchThreads calls Gmail API with query', async () => {
    let callCount = 0;
    globalThis.fetch = mock.fn(async (url) => {
      if (url.includes('oauth2.googleapis.com')) {
        return {
          ok: true, status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ access_token: 'tok', expires_in: 3600 }),
        };
      }
      callCount++;
      return {
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          threads: [{ id: 'th1', snippet: 'Hello' }],
          resultSizeEstimate: 1,
        }),
      };
    });

    // Write a fake token to avoid refresh
    const { setToken } = await import('../lib/auth/token-store.js');
    setToken('google', { access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 999999 });

    const { searchThreads } = await import('../lib/google-mail.js');
    const result = await searchThreads({ query: 'from:test@example.com' });

    assert.ok(Array.isArray(result.threads));
    assert.strictEqual(result.threads[0].id, 'th1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/google-mail.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement google-mail.js**

```javascript
// lib/google-mail.js — Gmail REST API connector
import { getAccessToken } from './auth/google-oauth.js';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailFetch(path, options = {}) {
  const token = await getAccessToken();
  const { method = 'GET', body, query } = options;
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    url += '?' + params.toString();
  }
  const fetchOpts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) fetchOpts.body = JSON.stringify(body);
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API ${res.status}: ${errText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function searchThreads(params = {}) {
  const { query, max = 20 } = params;
  return gmailFetch('/threads', { query: { q: query, maxResults: max } });
}

export async function getThread(params) {
  const { id, format = 'full' } = params;
  return gmailFetch(`/threads/${id}`, { query: { format } });
}

export async function createDraft(params) {
  const { to, subject, body: messageBody, cc, bcc } = params;
  const headers = [`To: ${to}`, `Subject: ${subject}`];
  if (cc) headers.push(`Cc: ${cc}`);
  if (bcc) headers.push(`Bcc: ${bcc}`);
  headers.push('Content-Type: text/html; charset=utf-8');
  const raw = btoa(headers.join('\r\n') + '\r\n\r\n' + (messageBody || ''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return gmailFetch('/drafts', { method: 'POST', body: { message: { raw } } });
}

export async function sendEmail(params) {
  const { to, subject, body: messageBody, cc, bcc } = params;
  const headers = [`To: ${to}`, `Subject: ${subject}`];
  if (cc) headers.push(`Cc: ${cc}`);
  if (bcc) headers.push(`Bcc: ${bcc}`);
  headers.push('Content-Type: text/html; charset=utf-8');
  const raw = btoa(headers.join('\r\n') + '\r\n\r\n' + (messageBody || ''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return gmailFetch('/messages/send', { method: 'POST', body: { raw } });
}

export async function listLabels() {
  return gmailFetch('/labels');
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/google-mail.test.js
```

Expected: PASS

- [ ] **Step 5: Build Gmail manifest**

Research the full Gmail API at https://developers.google.com/gmail/api/reference/rest and write to `manifests/gmail-api.md`. Follow the standard manifest format. Categories to cover: Messages, Threads, Labels, Drafts, History, Settings, Forwarding, Filters, Delegates.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Gmail REST API connector with manifest"
```

---

## Task 8: Google Calendar Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\google-calendar.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\google-calendar.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\gcalendar-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/google-calendar.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.GOOGLE_CLIENT_ID = 'test';
process.env.GOOGLE_CLIENT_SECRET = 'test';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('google calendar connector', () => {
  it('listEvents returns events for date range', async () => {
    globalThis.fetch = mock.fn(async (url) => {
      if (url.includes('oauth2.googleapis.com')) {
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
      }
      return {
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ items: [{ id: 'ev1', summary: 'Meeting' }] }),
      };
    });

    const { setToken } = await import('../lib/auth/token-store.js');
    setToken('google', { access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 999999 });

    const { listEvents } = await import('../lib/google-calendar.js');
    const result = await listEvents({ days: 7 });

    assert.ok(Array.isArray(result.items));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/google-calendar.test.js
```

- [ ] **Step 3: Implement google-calendar.js**

```javascript
// lib/google-calendar.js — Google Calendar REST API connector
import { getAccessToken } from './auth/google-oauth.js';

const BASE = 'https://www.googleapis.com/calendar/v3';

async function calFetch(path, options = {}) {
  const token = await getAccessToken();
  const { method = 'GET', body, query } = options;
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    url += '?' + params.toString();
  }
  const fetchOpts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) fetchOpts.body = JSON.stringify(body);
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Calendar API ${res.status}: ${errText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listEvents(params = {}) {
  const { days = 7, calendar = 'primary', max = 50 } = params;
  const now = new Date();
  const future = new Date(now.getTime() + days * 86400000);
  return calFetch(`/calendars/${encodeURIComponent(calendar)}/events`, {
    query: {
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      maxResults: max,
      singleEvents: true,
      orderBy: 'startTime',
    },
  });
}

export async function createEvent(params) {
  const { calendar = 'primary', summary, start, end, description, attendees, location } = params;
  const event = {
    summary,
    description,
    location,
    start: { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
  if (attendees) event.attendees = attendees.split(',').map(e => ({ email: e.trim() }));
  return calFetch(`/calendars/${encodeURIComponent(calendar)}/events`, { method: 'POST', body: event });
}

export async function updateEvent(params) {
  const { calendar = 'primary', eventId, ...updates } = params;
  return calFetch(`/calendars/${encodeURIComponent(calendar)}/events/${eventId}`, { method: 'PATCH', body: updates });
}

export async function deleteEvent(params) {
  const { calendar = 'primary', eventId } = params;
  return calFetch(`/calendars/${encodeURIComponent(calendar)}/events/${eventId}`, { method: 'DELETE' });
}

export async function checkAvailability(params) {
  const { start, end, calendars = ['primary'] } = params;
  const items = calendars.map(id => ({ id }));
  return calFetch('/freeBusy', {
    method: 'POST',
    body: {
      timeMin: start,
      timeMax: end,
      items,
    },
  });
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/google-calendar.test.js
```

Expected: PASS

- [ ] **Step 5: Build Google Calendar manifest**

Research at https://developers.google.com/calendar/api/v3/reference. Categories: Events, Calendars, CalendarList, ACL, Settings, FreeBusy, Colors.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Google Calendar REST API connector with manifest"
```

---

## Task 9: Google Drive Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\google-drive.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\google-drive.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\gdrive-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/google-drive.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.GOOGLE_CLIENT_ID = 'test';
process.env.GOOGLE_CLIENT_SECRET = 'test';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('google drive connector', () => {
  it('searchFiles queries Drive API', async () => {
    globalThis.fetch = mock.fn(async (url) => {
      if (url.includes('oauth2.googleapis.com')) {
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
      }
      return {
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ files: [{ id: 'f1', name: 'Report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }] }),
      };
    });

    const { setToken } = await import('../lib/auth/token-store.js');
    setToken('google', { access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 999999 });

    const { searchFiles } = await import('../lib/google-drive.js');
    const result = await searchFiles({ query: 'Report' });

    assert.ok(Array.isArray(result.files));
    assert.strictEqual(result.files[0].name, 'Report.docx');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/google-drive.test.js
```

- [ ] **Step 3: Implement google-drive.js**

```javascript
// lib/google-drive.js — Google Drive REST API connector
import { getAccessToken } from './auth/google-oauth.js';
import { writeFileSync } from 'node:fs';

const BASE = 'https://www.googleapis.com/drive/v3';

async function driveFetch(path, options = {}) {
  const token = await getAccessToken();
  const { method = 'GET', body, query, raw = false } = options;
  const base = raw ? 'https://www.googleapis.com' : BASE;
  let url = `${base}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    url += '?' + params.toString();
  }
  const fetchOpts = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body) {
    fetchOpts.headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive API ${res.status}: ${errText}`);
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

export async function searchFiles(params = {}) {
  const { query, type, max = 20 } = params;
  let q = query ? `name contains '${query}'` : '';
  if (type) {
    const mimeMap = {
      spreadsheet: 'application/vnd.google-apps.spreadsheet',
      document: 'application/vnd.google-apps.document',
      presentation: 'application/vnd.google-apps.presentation',
      folder: 'application/vnd.google-apps.folder',
      pdf: 'application/pdf',
    };
    const mime = mimeMap[type] || type;
    q = q ? `${q} and mimeType='${mime}'` : `mimeType='${mime}'`;
  }
  return driveFetch('/files', {
    query: {
      q: q || undefined,
      pageSize: max,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
      orderBy: 'modifiedTime desc',
    },
  });
}

export async function readFile(params) {
  const { id, format } = params;
  if (format) {
    return driveFetch(`/files/${id}/export`, { query: { mimeType: format } });
  }
  const meta = await driveFetch(`/files/${id}`, { query: { fields: 'id,name,mimeType' } });
  const exportMap = {
    'application/vnd.google-apps.document': 'text/plain',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
  };
  const exportMime = exportMap[meta.mimeType];
  if (exportMime) {
    const res = await driveFetch(`/files/${id}/export`, { query: { mimeType: exportMime }, raw: true });
    return { content: await res.text(), mimeType: exportMime, name: meta.name };
  }
  const res = await driveFetch(`/files/${id}`, { query: { alt: 'media' }, raw: true });
  return { content: await res.text(), mimeType: meta.mimeType, name: meta.name };
}

export async function createFile(params) {
  const { name, content, mimeType = 'text/plain', folderId } = params;
  const metadata = { name };
  if (folderId) metadata.parents = [folderId];
  const token = await getAccessToken();
  const boundary = '-----nbiconnector';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function downloadFile(params) {
  const { id, output } = params;
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(output, buffer);
  return { downloaded: output, size: buffer.length };
}

export async function listRecent(params = {}) {
  const { max = 20 } = params;
  return driveFetch('/files', {
    query: {
      pageSize: max,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
      orderBy: 'modifiedTime desc',
    },
  });
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/google-drive.test.js
```

Expected: PASS

- [ ] **Step 5: Build Google Drive manifest**

Research at https://developers.google.com/drive/api/reference/rest/v3. Categories: Files, Permissions, Revisions, Comments, Replies, Changes, Channels, Drives, About.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Google Drive REST API connector with manifest"
```

---

## Task 10: Microsoft Graph Auth Module

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\auth\msgraph-auth.js`

Reuses the same MSAL client credentials pattern from the dashboard server (`dashboard-server/lib/email.js:12-31`).

- [ ] **Step 1: Implement msgraph-auth.js**

```javascript
// lib/auth/msgraph-auth.js — Microsoft Graph API token management (client credentials flow)
const TOKEN_URL_TEMPLATE = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token';

let _cachedToken = null;
let _tokenExpiry = 0;

export async function getGraphToken() {
  if (_cachedToken && Date.now() < _tokenExpiry - 60000) return _cachedToken;

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET must be set in .env');
  }

  const url = TOKEN_URL_TEMPLATE.replace('{tenant}', tenantId);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`MSAL error: ${data.error_description || data.error}`);

  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _cachedToken;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Microsoft Graph auth module (client credentials flow)"
```

---

## Task 11: Microsoft Graph Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\msgraph.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\msgraph.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\msgraph-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/msgraph.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.AZURE_CLIENT_SECRET = 'test-secret';
process.env.MSGRAPH_USER_EMAIL = 'gpryer@nbi-consulting.com';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('msgraph connector', () => {
  it('searchEmail calls Graph messages endpoint with search query', async () => {
    let graphCallUrl = '';
    globalThis.fetch = mock.fn(async (url) => {
      if (url.includes('login.microsoftonline.com')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
      }
      graphCallUrl = url;
      return {
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ value: [{ id: 'm1', subject: 'Test', from: {} }] }),
      };
    });

    const mod = await import('../lib/msgraph.js');
    const result = await mod.searchEmail({ query: 'lighthouse', folder: 'inbox' });

    assert.ok(Array.isArray(result.value));
    assert.match(graphCallUrl, /graph\.microsoft\.com/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/msgraph.test.js
```

- [ ] **Step 3: Implement msgraph.js**

```javascript
// lib/msgraph.js — Microsoft Graph API connector (mail, calendar, files)
import { getGraphToken } from './auth/msgraph-auth.js';

const BASE = 'https://graph.microsoft.com/v1.0';
const USER = () => process.env.MSGRAPH_USER_EMAIL || 'me';

async function graphFetch(path, options = {}) {
  const token = await getGraphToken();
  const { method = 'GET', body, query } = options;
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    url += '?' + params.toString();
  }
  const fetchOpts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) fetchOpts.body = JSON.stringify(body);
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API ${res.status}: ${errText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- Mail ---

export async function searchEmail(params = {}) {
  const { query, folder = 'inbox', max = 20 } = params;
  const user = USER();
  let path = `/users/${user}/mailFolders/${folder}/messages`;
  const q = {};
  q['$top'] = max;
  q['$orderby'] = 'receivedDateTime desc';
  if (query) q['$search'] = `"${query}"`;
  return graphFetch(path, { query: q });
}

export async function getEmail(params) {
  const { id } = params;
  const user = USER();
  return graphFetch(`/users/${user}/messages/${id}`, {
    query: { '$expand': 'attachments' },
  });
}

export async function sendEmail(params) {
  const { to, subject, body: content, cc, bcc } = params;
  const user = USER();
  const toRecipients = to.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  const message = {
    subject,
    body: { contentType: 'HTML', content: content || '' },
    toRecipients,
  };
  if (cc) message.ccRecipients = cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  if (bcc) message.bccRecipients = bcc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  return graphFetch(`/users/${user}/sendMail`, { method: 'POST', body: { message, saveToSentItems: true } });
}

// --- Calendar ---

export async function listEvents(params = {}) {
  const { days = 7, max = 50 } = params;
  const user = USER();
  const now = new Date();
  const future = new Date(now.getTime() + days * 86400000);
  return graphFetch(`/users/${user}/calendarView`, {
    query: {
      startDateTime: now.toISOString(),
      endDateTime: future.toISOString(),
      '$top': max,
      '$orderby': 'start/dateTime',
    },
  });
}

export async function createEvent(params) {
  const { subject, start, end, body: content, attendees, location } = params;
  const user = USER();
  const event = {
    subject,
    body: content ? { contentType: 'HTML', content } : undefined,
    start: { dateTime: start, timeZone: 'UTC' },
    end: { dateTime: end, timeZone: 'UTC' },
    location: location ? { displayName: location } : undefined,
  };
  if (attendees) {
    event.attendees = attendees.split(',').map(e => ({
      emailAddress: { address: e.trim() },
      type: 'required',
    }));
  }
  return graphFetch(`/users/${user}/events`, { method: 'POST', body: event });
}

// --- OneDrive ---

export async function listFiles(params = {}) {
  const { path = 'root', max = 50 } = params;
  const user = USER();
  const drivePath = path === 'root' ? '/drive/root/children' : `/drive/root:/${path}:/children`;
  return graphFetch(`/users/${user}${drivePath}`, { query: { '$top': max } });
}

export async function getFile(params) {
  const { id } = params;
  const user = USER();
  return graphFetch(`/users/${user}/drive/items/${id}`);
}

export async function searchFiles(params = {}) {
  const { query, max = 20 } = params;
  const user = USER();
  return graphFetch(`/users/${user}/drive/root/search(q='${encodeURIComponent(query)}')`, {
    query: { '$top': max },
  });
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/msgraph.test.js
```

Expected: PASS

- [ ] **Step 5: Build Microsoft Graph manifest**

Research at https://learn.microsoft.com/en-us/graph/api/overview. Categories: Mail (messages, folders, attachments, rules), Calendar (events, calendars, groups), OneDrive (files, permissions, sharing), Teams (channels, chats, messages), Users, Contacts, Planner, To-Do, OneNote.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Microsoft Graph API connector (mail, calendar, files) with manifest"
```

---

## Task 12: Miro Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\miro.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\miro.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\miro-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/miro.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.MIRO_ACCESS_TOKEN = 'test_miro_token';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('miro connector', () => {
  it('listBoards calls Miro API with auth header', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: [{ id: 'b1', name: 'Sprint Board' }], total: 1 }),
    }));

    const { listBoards } = await import('../lib/miro.js');
    const result = await listBoards();

    assert.ok(Array.isArray(result.data));
    const call = globalThis.fetch.mock.calls[0];
    assert.match(call.arguments[0], /api\.miro\.com/);
    assert.match(call.arguments[1].headers['Authorization'], /test_miro_token/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/miro.test.js
```

- [ ] **Step 3: Implement miro.js**

```javascript
// lib/miro.js — Miro REST API v2 connector
const BASE = 'https://api.miro.com/v2';

function authHeaders() {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) throw new Error('MIRO_ACCESS_TOKEN not set in .env');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function miroFetch(path, options = {}) {
  const { method = 'GET', body, query } = options;
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    url += '?' + params.toString();
  }
  const fetchOpts = { method, headers: authHeaders() };
  if (body) fetchOpts.body = JSON.stringify(body);
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Miro API ${res.status}: ${errText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listBoards(params = {}) {
  const { limit = 20 } = params;
  return miroFetch('/boards', { query: { limit } });
}

export async function listItems(params) {
  const { boardId, limit = 50, type } = params;
  return miroFetch(`/boards/${boardId}/items`, { query: { limit, type } });
}

export async function createDiagram(params) {
  const { boardId, dsl } = params;
  return miroFetch(`/boards/${boardId}/mind_maps`, { method: 'POST', body: dsl });
}

export async function getLayout(params) {
  const { boardId } = params;
  return miroFetch(`/boards/${boardId}`);
}

export async function createLayout(params) {
  const { name, description } = params;
  return miroFetch('/boards', { method: 'POST', body: { name, description } });
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/miro.test.js
```

Expected: PASS

- [ ] **Step 5: Build Miro manifest**

Research at https://developers.miro.com/reference/api-reference. Categories: Boards, Items (sticky notes, shapes, text, cards, images, frames, connectors), Tags, Groups, App Cards, Widgets, Comments, Users, Organizations.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Miro REST API v2 connector with manifest"
```

---

## Task 13: Slack Connector + Manifest

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\slack.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\slack.test.js`
- Create: `C:\Users\gpbea\.claude\connectors\manifests\slack-api.md`

- [ ] **Step 1: Write failing test**

```javascript
// test/slack.test.js
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('slack connector', () => {
  it('sendMessage posts to Slack API', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, channel: 'C123', ts: '1234567.89' }),
    }));

    const { sendMessage } = await import('../lib/slack.js');
    const result = await sendMessage({ channel: '#general', message: 'Deploy complete' });

    assert.strictEqual(result.ok, true);
    const call = globalThis.fetch.mock.calls[0];
    assert.match(call.arguments[0], /slack\.com\/api\/chat\.postMessage/);
    const body = JSON.parse(call.arguments[1].body);
    assert.strictEqual(body.channel, '#general');
    assert.strictEqual(body.text, 'Deploy complete');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/slack.test.js
```

- [ ] **Step 3: Implement slack.js**

```javascript
// lib/slack.js — Slack Web API connector
const BASE = 'https://slack.com/api';

function authHeaders() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set in .env');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function slackFetch(method, body = {}) {
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data;
}

export async function sendMessage(params) {
  const { channel, message, thread_ts } = params;
  return slackFetch('chat.postMessage', {
    channel,
    text: message,
    ...(thread_ts && { thread_ts }),
  });
}

export async function searchMessages(params = {}) {
  const { query, count = 20, sort = 'timestamp' } = params;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set in .env');
  const qs = new URLSearchParams({ query, count: String(count), sort });
  const res = await fetch(`${BASE}/search.messages?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data;
}

export async function readChannel(params) {
  const { channel, limit = 50 } = params;
  return slackFetch('conversations.history', { channel, limit: Number(limit) });
}

export async function readThread(params) {
  const { channel, ts, limit = 50 } = params;
  return slackFetch('conversations.replies', { channel, ts, limit: Number(limit) });
}

export async function searchUsers(params = {}) {
  const { query } = params;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set in .env');
  const res = await fetch(`${BASE}/users.list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  if (query) {
    const q = query.toLowerCase();
    data.members = data.members.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.real_name?.toLowerCase().includes(q) ||
      u.profile?.display_name?.toLowerCase().includes(q)
    );
  }
  return data;
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/slack.test.js
```

Expected: PASS

- [ ] **Step 5: Build Slack manifest**

Research at https://api.slack.com/methods. Categories: Chat (messages, scheduling, unfurling), Conversations (channels, DMs, groups), Users (info, presence, status), Files (upload, list, share), Search (messages, files), Reactions, Pins, Reminders, Bookmarks, Apps, Admin, Workflows.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add Slack Web API connector with manifest"
```

---

## Task 14: PowerPoint Connector

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\lib\pptx.js`
- Create: `C:\Users\gpbea\.claude\connectors\test\pptx.test.js`

No manifest for this one — it wraps a local library (pptxgenjs), not a REST API.

- [ ] **Step 1: Write failing test**

```javascript
// test/pptx.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('pptx connector', () => {
  it('createPresentation and addSlide produce a file', async () => {
    const { createPresentation, addSlide, addText, save } = await import('../lib/pptx.js');

    const pres = createPresentation({ title: 'Test Deck', author: 'NBI' });
    assert.ok(pres);

    addSlide({ presentation: pres, layout: 'Title Slide' });
    addText({ presentation: pres, slide: 0, text: 'Hello World', x: 1, y: 1, fontSize: 24 });

    const outPath = join(tmpdir(), `nbi-test-${Date.now()}.pptx`);
    await save({ presentation: pres, output: outPath });
    assert.ok(existsSync(outPath));

    unlinkSync(outPath);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/.claude/connectors && node --test test/pptx.test.js
```

- [ ] **Step 3: Implement pptx.js**

```javascript
// lib/pptx.js — PowerPoint file generation via pptxgenjs
import PptxGenJS from 'pptxgenjs';

const _presentations = new Map();
let _counter = 0;

export function createPresentation(params = {}) {
  const { title, author, subject, company = 'NBI Analytics' } = params;
  const pres = new PptxGenJS();
  if (title) pres.title = title;
  if (author) pres.author = author;
  if (subject) pres.subject = subject;
  pres.company = company;
  const id = `pres_${++_counter}`;
  _presentations.set(id, pres);
  return { id, title, slides: 0 };
}

function getPres(params) {
  const id = typeof params === 'string' ? params : params.presentation?.id || params.presentation;
  const pres = _presentations.get(id);
  if (!pres) throw new Error(`Presentation ${id} not found. Create one first.`);
  return pres;
}

export function addSlide(params = {}) {
  const pres = getPres(params);
  const { masterName } = params;
  const slide = masterName ? pres.addSlide({ masterName }) : pres.addSlide();
  return { slideNumber: pres.slides.length, masterName };
}

export function addText(params) {
  const pres = getPres(params);
  const { slide: slideIdx = -1, text, x = 0.5, y = 0.5, w, h, fontSize = 18, color = '363636', bold, align } = params;
  const idx = slideIdx === -1 ? pres.slides.length - 1 : slideIdx;
  const slide = pres.slides[idx];
  if (!slide) throw new Error(`Slide ${idx} not found`);
  const opts = { x, y, fontSize, color };
  if (w) opts.w = w;
  if (h) opts.h = h;
  if (bold) opts.bold = true;
  if (align) opts.align = align;
  slide.addText(text, opts);
  return { added: 'text', slideNumber: idx };
}

export function addChart(params) {
  const pres = getPres(params);
  const { slide: slideIdx = -1, type = 'bar', data, x = 0.5, y = 1.5, w = 9, h = 5 } = params;
  const idx = slideIdx === -1 ? pres.slides.length - 1 : slideIdx;
  const slide = pres.slides[idx];
  if (!slide) throw new Error(`Slide ${idx} not found`);
  const chartType = PptxGenJS.charts[type.toUpperCase()] || PptxGenJS.charts.BAR;
  slide.addChart(chartType, data, { x, y, w, h, showValue: true });
  return { added: 'chart', type, slideNumber: idx };
}

export function addTable(params) {
  const pres = getPres(params);
  const { slide: slideIdx = -1, rows, x = 0.5, y = 1.5, w = 9, fontSize = 12 } = params;
  const idx = slideIdx === -1 ? pres.slides.length - 1 : slideIdx;
  const slide = pres.slides[idx];
  if (!slide) throw new Error(`Slide ${idx} not found`);
  const tableRows = typeof rows === 'string' ? JSON.parse(rows) : rows;
  slide.addTable(tableRows, { x, y, w, fontSize, border: { pt: 1, color: 'CFCFCF' } });
  return { added: 'table', rows: tableRows.length, slideNumber: idx };
}

export function addImage(params) {
  const pres = getPres(params);
  const { slide: slideIdx = -1, path: imgPath, x = 0.5, y = 0.5, w = 4, h = 3 } = params;
  const idx = slideIdx === -1 ? pres.slides.length - 1 : slideIdx;
  const slide = pres.slides[idx];
  if (!slide) throw new Error(`Slide ${idx} not found`);
  slide.addImage({ path: imgPath, x, y, w, h });
  return { added: 'image', slideNumber: idx };
}

export async function save(params) {
  const pres = getPres(params);
  const { output } = params;
  if (!output) throw new Error('output path required');
  await pres.writeFile({ fileName: output });
  return { saved: output, slides: pres.slides.length };
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/.claude/connectors && node --test test/pptx.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add PowerPoint connector via pptxgenjs"
```

---

## Task 15: Smoke Test Script + Integration Verification

**Files:**
- Create: `C:\Users\gpbea\.claude\connectors\smoke-test.js`

- [ ] **Step 1: Write smoke test**

```javascript
// smoke-test.js — Runs a basic connectivity check against each configured service
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const results = [];

async function test(name, fn) {
  try {
    const result = await fn();
    results.push({ service: name, status: 'OK', detail: result });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ service: name, status: 'FAIL', error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

console.log('\nNBI Connectors Smoke Test\n');

if (process.env.TELEGRAM_BOT_TOKEN) {
  await test('Telegram', async () => {
    const { getMe } = await import('./lib/telegram.js');
    const me = await getMe();
    return `Bot: ${me.first_name} (${me.username})`;
  });
}

if (process.env.APIFY_TOKEN) {
  await test('Apify', async () => {
    const { searchActors } = await import('./lib/apify.js');
    const result = await searchActors({ query: 'web scraper', limit: 1 });
    return `Found ${result.total} actors`;
  });
}

if (process.env.GOOGLE_CLIENT_ID) {
  await test('Gmail', async () => {
    const { listLabels } = await import('./lib/google-mail.js');
    const labels = await listLabels();
    return `${labels.labels?.length || 0} labels`;
  });
  await test('Google Calendar', async () => {
    const { listEvents } = await import('./lib/google-calendar.js');
    const events = await listEvents({ days: 1 });
    return `${events.items?.length || 0} events today`;
  });
  await test('Google Drive', async () => {
    const { listRecent } = await import('./lib/google-drive.js');
    const files = await listRecent({ max: 1 });
    return `${files.files?.length || 0} recent files`;
  });
}

if (process.env.AZURE_TENANT_ID) {
  await test('Microsoft Graph', async () => {
    const { searchEmail } = await import('./lib/msgraph.js');
    const mail = await searchEmail({ query: 'test', max: 1 });
    return `${mail.value?.length || 0} emails found`;
  });
}

if (process.env.MIRO_ACCESS_TOKEN) {
  await test('Miro', async () => {
    const { listBoards } = await import('./lib/miro.js');
    const boards = await listBoards({ limit: 1 });
    return `${boards.data?.length || 0} boards`;
  });
}

if (process.env.SLACK_BOT_TOKEN) {
  await test('Slack', async () => {
    const { searchUsers } = await import('./lib/slack.js');
    const users = await searchUsers({});
    return `${users.members?.length || 0} workspace members`;
  });
}

await test('PowerPoint', async () => {
  const { createPresentation, addSlide, save } = await import('./lib/pptx.js');
  const pres = createPresentation({ title: 'Smoke Test' });
  addSlide({ presentation: pres });
  const { tmpdir } = await import('node:os');
  const out = join(tmpdir(), `smoke-${Date.now()}.pptx`);
  await save({ presentation: pres, output: out });
  const { unlinkSync } = await import('node:fs');
  unlinkSync(out);
  return 'Created and deleted temp file';
});

console.log(`\n${results.filter(r => r.status === 'OK').length}/${results.length} services connected\n`);
```

- [ ] **Step 2: Run unit tests (all connectors)**

```bash
cd ~/.claude/connectors && node --test test/*.test.js
```

Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "feat: add smoke test script for all connectors"
```

---

## Task 16: Memory File + MCP Removal Guide

**Files:**
- Create: memory file at `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\reference_api_connectors.md`
- Update: `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md`

- [ ] **Step 1: Create memory file**

```markdown
---
name: NBI API Connectors Library
description: Direct REST API connector library at ~/.claude/connectors/ replacing 9 MCP servers. CLI interface, shared auth, full API manifests.
type: reference
---

## Location
`C:\Users\gpbea\.claude\connectors\`

## CLI Usage
```
node C:\Users\gpbea\.claude\connectors\cli.js <service> <action> [--param value]
```

## Available Services
- `telegram` — Telegram Bot API (token auth)
- `gmail` — Gmail REST API (Google OAuth)
- `gcalendar` — Google Calendar API (Google OAuth)
- `gdrive` — Google Drive API (Google OAuth)
- `msgraph` — Microsoft Graph (mail, calendar, files — MSAL client credentials)
- `miro` — Miro REST API v2 (token auth)
- `slack` — Slack Web API (bot token)
- `apify` — Apify REST API (token auth)
- `pptx` — PowerPoint generation via pptxgenjs (local, no auth)

## Discovering Available Actions
```
node cli.js <service> help
```

## API Manifests
Full API capability maps (implemented + available endpoints) in `~/.claude/connectors/manifests/`. Use these to wire up new capabilities without re-researching the API.

## Auth Setup
- Google: `node cli.js google-auth url` then `node cli.js google-auth exchange --code CODE`
- Microsoft: env vars from dashboard server (.env)
- Others: API tokens in `.env`

## Wiring a New Capability
1. Read the manifest for the target service
2. Find the endpoint in the "Available" section
3. Add the function to `lib/<service>.js` following the existing pattern
4. Move the endpoint from "Available" to "Implemented" in the manifest
5. Register the action name in cli.js if it uses a non-matching function name
```

- [ ] **Step 2: Add to MEMORY.md index**

Add this line to `MEMORY.md`:
```
- [NBI API Connectors](reference_api_connectors.md) — Direct API library at ~/.claude/connectors/. CLI, manifests, shared auth. Replaces 9 MCPs.
```

- [ ] **Step 3: Document MCP removal steps**

After all connectors are tested and Glen confirms they work, remove MCPs in this order:

**Local MCPs (`.mcp.json`):**
1. Remove `ppt` entry from `d:\OneDrive\Claude_code\NBIAI_TEAM\.mcp.json`
2. Remove `telegram` entry from `d:\OneDrive\Claude_code\NBIAI_TEAM\.mcp.json`

**User-level MCPs (`.claude.json`):**
3. Remove `ms365` MCP from `C:\Users\gpbea\.claude.json`
4. Remove `apify` MCP from `C:\Users\gpbea\.claude.json`

**Claude.ai remote MCPs:**
5. Disconnect Gmail in Claude.ai settings
6. Disconnect Google Calendar in Claude.ai settings
7. Disconnect Google Drive in Claude.ai settings
8. Disconnect Miro in Claude.ai settings
9. Disconnect Slack in Claude.ai settings

**Important:** Remove one wave at a time. Test the connectors for that wave before removing the corresponding MCPs. Glen handles the Claude.ai remote disconnections manually.

- [ ] **Step 4: Commit**

```bash
cd ~/.claude/connectors && git add -A && git commit -m "docs: add memory file and MCP removal guide"
```

And in the NBIAI_TEAM repo:
```bash
cd d:\OneDrive\Claude_code\NBIAI_TEAM && git add -A && git commit -m "docs: add API connectors memory reference"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ All 9 connectors built (Telegram, Apify, Gmail, Calendar, Drive, MS Graph, Miro, Slack, PPTX)
   - ✅ Shared auth modules (Google OAuth, MS Graph auth, token store)
   - ✅ CLI framework with service routing
   - ✅ Full API manifests for all 8 API-based services
   - ✅ Smoke test script
   - ✅ Memory file for future session discoverability
   - ✅ MCP removal guide

2. **Placeholder scan:** No TBDs, TODOs, or incomplete sections. All code blocks are complete. Manifest tasks include structure, implemented section, and research instructions with specific URLs.

3. **Type consistency:**
   - All connectors use the pattern: `export async function actionName(params) { ... }`
   - All CLI params use `--key value` convention
   - All output is JSON to stdout
   - All errors are JSON to stderr
   - Auth modules use consistent `getAccessToken()` / `getGraphToken()` naming
   - Token store uses consistent `getToken(service)` / `setToken(service, data)` interface

4. **Build order respects dependencies:**
   - Task 1-3 (scaffolding) before any connector
   - Task 6 (Google OAuth) before Tasks 7-9 (Gmail, Calendar, Drive)
   - Task 10 (MS Graph auth) before Task 11 (MS Graph connector)
   - Tasks 4-5 (Wave 1) can run before Tasks 6-9 (Wave 2)
   - Task 15 (smoke test) after all connectors
   - Task 16 (memory + cleanup) last
