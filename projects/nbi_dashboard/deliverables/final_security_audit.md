# NBI WorkSage Security Audit

**Date:** 2026-04-14
**Scope:** Full security review of server + frontend + migrations
**Reviewer:** Claude Opus 4.6 (security audit agent)

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 4 |
| Medium | 11 |
| Low | 9 |
| Info | 6 |

**Key strengths:** parameterised SQL throughout, bcrypt hashing, hashed session tokens, brute-force lockout, rate limiting, security headers, SoW filter, memory-only multer for sensitive uploads, CSRF-resistant bearer token model, audit log with secret redaction, path traversal guards on file serving.

**Top priorities:**
1. **H3** — Admin gate on `/api/audit-log` (5 min fix)
2. **H2** — Bump nodemailer (1 command)
3. **H4** — Move auth token off localStorage (1-2 days)
4. **H1** — Plan xlsx migration (days)

## HIGH

### H1. `xlsx` 0.18.5 has unpatched CVEs
**File:** `dashboard-server/package.json:26`

Prototype pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9). SheetJS moved to their own CDN; npm version has no fix.

**Fix:** Replace with `exceljs` or `node-xlsx`. Until then: admin-only gate is in place. Run parsing in a worker.

### H2. `nodemailer` 8.0.4 SMTP CRLF injection
**File:** `dashboard-server/package.json:19`

CVE GHSA-vvjj-xcjg-gr5g. Not directly exploitable in current code (name not user-supplied) but trivial fix.

**Fix:** `npm install nodemailer@^8.0.5`

### H3. `/api/audit-log` is not admin-restricted
**File:** `server.js:874-951`

Any authenticated `member` can read 200 audit entries per page, including change deltas, reporter names, and a free-text search param. Significant PII exposure.

**Fix:** Add admin check at handler top.

### H4. Auth token in localStorage (XSS → takeover)
**File:** `nbi_project_dashboard.html:2138`

7-day bearer tokens in localStorage. CSP allows `'unsafe-inline'` for scripts. Any reflected XSS immediately exfiltrates the token.

**Fix:** Move to httpOnly SameSite=strict cookie. Drop `'unsafe-inline'` with nonces.

## MEDIUM

### M1. CSP allows `'unsafe-inline'` for script-src and style-src
**File:** `server.js:306-315`

Defeats CSP's main protection. Combined with H4 this is the attack chain.

### M2. escHtml applied at storage time
Same as code review H1. Double-escape corruption. Affects XSS resilience indirectly (encoded form defangs displayed text but not round-tripped storage).

### M3. Cross-client data leak via several read endpoints
**Files:** `server.js:3024`, `2976`, `3015`, `2397`, `4096-4142`

Members can read all clients, contacts (emails, phones), notes, all tasks including cross-client data. If the business model is "everyone sees everything", document it. Otherwise filter non-admin reads.

### M4. SoW filter is best-effort not provable
**File:** `lib/sow-extractor.js`

Denylist-based. False negatives possible on:
- Wrapped numbers where currency ends up on a separate line
- Uncommon currency symbols (₪, kr., fr.)
- Numbers written in words
- Multi-column tables joined oddly by pdf-parse
- Pricing under a non-matching heading

**Fix:** Add allow-list mode alongside deny-list. Pre-scan tables and drop any with numbers. Add real-world SoW test samples.

### M5. Bug report screenshots stored as base64 data URLs without validation
**File:** `server.js:5219-5235, 5440-5453`

No image validation. 5MB of arbitrary binary can be served back as `image/png`. No per-user submission rate cap.

**Fix:** Decode and re-encode via `sharp`, enforce max pixels, store as binary, per-user-per-day cap.

### M6. OCR/extract endpoints are CPU-heavy, only globally rate-limited
**Files:** `server.js:1734-1791, 5064-5192`

`/api/contract/extract` and `/api/expenses/from-receipt` use Tesseract/OCR.space and can take 30s+ each. 60/min global cap is too generous.

**Fix:** Per-endpoint 5/min cap, queue jobs.

### M7. `POST /api/restore` accepts arbitrary payload
**File:** `server.js:1086-1265`

Admin-only, but no schema validation. A compromised admin or malformed backup can corrupt every table. A malicious admin could elevate themselves via user role updates.

**Fix:** Validate payload against schema before opening transaction.

### M8. `POST /api/import/parse-file` has weak path traversal guard
**File:** `server.js:1469-1527`

`parts.some(p => p === '..' || p === '.')` misses Unicode tricks and Windows ADS.

**Fix:** realpath + containment check.

### M9. No token rotation or sliding expiry
**Files:** `server.js:496-508, 541-572`

7-day tokens, no idle timeout, no rotation on password change for other users.

### M10. Public report share_token can be scraped via referrer
**File:** `server.js:6280-6489`

16 bytes (128 bits) entropy is fine. No `meta name="robots" noindex` or `Referrer-Policy: no-referrer` in the report HTML.

**Fix:** Add those meta tags. Add revoke capability. Shorter default expiry.

### M11. Cross-client task data returned by several endpoints
**Files:** `server.js:3073-3153, 3814-3869, 3972-4049, 4096-4142`

Same theme as M3.

## LOW

### L1. Failed-login map is memory-resident and unbounded
PM2 restart clears lockouts. Attacker can deny service by flooding failed attempts per username (but brute-force protection is otherwise OK).

### L2. `/api/team-members` and `/api/teams/:id` leak usernames
Username is the login identifier. Combined with H4/M1 this is a credential-stuffing aid.

### L3. Password minimum length is 6
NIST recommends 8+. Run new passwords through a breach list (haveibeenpwned).

### L4. bcrypt cost 10 (OWASP recommends 12 today)
Not urgent. ~10ms → ~40ms per hash.

### L5. `/api/expenses/from-receipt` extends timeout to 120s without concurrency cap
One user can hold 60 × 120s OCR jobs.

### L6. Failed-login map Unicode normalisation
`glen` vs `glén` vs `GLEN` are different keys.

### L7. Unbounded ILIKE '%foo%' search
`audit-log`, `leads` search params have no length cap. Slow query DoS bounded by 30s statement timeout.

### L8. `/api/import/scan-downloads` not rate-limited
Admin only, low impact.

### L9. `/api/attachments/:filename` doesn't verify user can access the parent entity
Random hex filename makes guessing hard but once known, anyone can re-fetch.

## INFO

- I1: Express 4.22 stable, Express 5 now available
- I2: `trust proxy: 1` with `validate: {ip: false}` — Cloudflare Tunnel is fine but would break without it
- I3: `process.on('unhandledRejection')` only logs — OK with express-async-errors
- I4: `archiver` / `node-cron` defensive loading
- I5: Utility Python scripts in `dashboard-server/` root — audit these are non-functional in prod
- I6: Bug tracker content visible to all users (intentional collaboration)

## Recommended Priority

1. **H3** (5 min) — admin gate `/api/audit-log`
2. **H2** (1 command) — `npm install nodemailer@^8.0.5`
3. **H1** (days) — plan xlsx replacement
4. **H4** (1-2 days) — httpOnly cookie for auth token
5. **M2** (coordinated frontend+server) — stop double-escaping at storage
6. **M3/M11** — decide and enforce cross-client read model
7. **M5** — validate bug screenshots through sharp
8. **M1** — tighten CSP (remove `'unsafe-inline'`)

## Strengths to Preserve

- Parameterised SQL everywhere (only dynamic fragments from `buildPatchQuery` which validates column names)
- Session tokens SHA-256 hashed before storage
- Brute-force lockout, rate limiting on auth
- SoW PDFs use memory-only multer + buffer nulled post-extraction
- Universal security headers
- Audit log secret redaction
- `/metrics` localhost-only
- Circuit breaker on OCR / external HTTP
- Mass assignment bounded by per-endpoint allowlists
