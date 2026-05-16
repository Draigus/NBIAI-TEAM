> **Note:** This file contains legacy role knowledge that has been consolidated into the composite `AGENT.md` file in the parent role directory. The AGENT.md file is the operational version used by the dispatch system. This file is retained as the design record.

# QA Lead — QA Context

## NBI's Products Under Test

### Playsage
A gaming industry intelligence SaaS platform. B2B, targeting AA-to-AAA live-service studios. Multiple modules with a cross-module integration layer (Cascade Engine).

**Modules to test:**
1. Market Overview & TAM — dashboard data accuracy, TAM/SAM modelling, collaborative notes
2. Competitive Landscape — head-to-head comparison accuracy, feature diff matrix, competitor briefs
3. Sentiment Analysis — NLP topic clustering, "Since Last Update" view, influencer tracking
4. Foresight — 90-day forecasting, backtest accuracy display, driver cards
5. Market Watch / Release Calendar — release radar, collision alerts, advisory windows
6. Alerts — configurable KPI alerts, threshold logic, in-app and email/Slack delivery
7. The Sage — recommendation quality, evidence-to-action linkage, projected lift ranges
8. Executive Dashboard & Scenario Planning — six-tile layout, scenario planning workflow
9. Finance / IAP Intelligence — IAP pricing analysis, storefront fee tracking, revenue proxy
10. API & Integrations — scheduled reports, role-based access, data export

**The Cascade Engine** connects modules — when a signal appears in one module, Cascade surfaces it across related modules. This integration layer is a key test surface: test that signals propagate correctly and that false positives do not flood the interface.

**Tech stack for QA context:**
- Frontend: Next.js (App Router) on Vercel
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth

### SalarySage
A standalone gaming salary intelligence tool.

**Components to test:**
- Authentication flow (SalarySage-Auth.html): login, rejected credentials, case sensitivity
- Salary query interface: natural language queries return correct data from the CSV
- Data accuracy: salary ranges reflect the CSV data; hub vs non-hub differentials are applied correctly
- Access logging: every authenticated session is logged with correct timestamp and user identifier
- API proxy security: LLM API key must not appear in any browser-accessible code, network request, or response
- Edge cases: countries with caution flags (small market data — flagged by Jeff Day's QA assessment), queries with no results, queries with ambiguous input

## Key Test Areas by Risk Level

### Highest Risk (test most thoroughly)

**Authentication and authorisation:**
- Users cannot access data they are not permitted to see
- Auth tokens expire and refresh correctly
- Unauthenticated requests are rejected at route level, not just UI level
- Supabase RLS policies are functioning (data layer protection, not just UI guards)

**Secrets and API key exposure (SalarySage specifically):**
- The LLM API key must not appear anywhere in browser DevTools: Sources, Network requests, Response bodies
- The auth credentials must not be exposed to the client beyond what is necessary for the SHA-256 hash
- After the server-side proxy is implemented, verify it thoroughly — this is a prior security incident area

**Data accuracy:**
- Salary data returned by queries matches the source CSV
- Hub vs non-hub location differentials are applied correctly
- Countries with caution flags are displayed with appropriate caution indicators (per Jeff Day's QA recommendation)
- Playsage dashboard data accurately reflects the underlying data sources

**Cascade Engine integration:**
- Signals detected in one module appear correctly in related modules
- The integration does not generate false positives that would confuse a user
- Removing or updating a signal in one module propagates correctly

### Medium Risk

**UI and navigation:**
- All routes render correctly in all tested environments
- Loading states are displayed while data fetches are in progress
- Error states are handled gracefully — no unhandled exceptions visible to the user
- shadcn/ui components render consistently across screen sizes

**Vercel preview vs production parity:**
- Features that work in preview should work identically in production
- Environment-specific configuration does not cause discrepancies

**SalarySage data loading:**
- 5MB CSV loads correctly at runtime
- Large CSV does not cause performance issues or timeout

### Lower Risk (but still tested)

- Cosmetic and typography consistency
- Link targets and navigation correctness
- Tooltip and helper text accuracy
- Email/Slack alert formatting (when alerts are implemented)

## Testing Environments

**Playsage:**
- Development: local (Next.js dev server with local Supabase or dev Supabase project)
- Preview: Vercel PR preview deployment (use this for feature testing before merge)
- Production: Vercel production deployment (use for regression and smoke testing post-deploy)

**SalarySage:**
- Current: local file (double-click HTML to open) — note this does not accurately simulate server deployment
- Target: Vercel preview/production once server-side hosting is set up

**Important:** Browser DevTools must be open during security-relevant testing (auth, API key exposure checks). Test using at least two browsers.

## Bug Severity Framework for NBI Products

| Severity | Definition | Examples | Release impact |
|---|---|---|---|
| Critical | Core functionality blocked, data loss risk, security vulnerability, auth broken | LLM API key visible in browser, auth bypass, data not loading at all, crash on core flow | Blocks release |
| High | Major feature broken, significant degradation, no acceptable workaround | Cascade Engine not propagating signals, salary queries returning wrong data, alerts not firing | Likely blocks release |
| Medium | Feature partially degraded, workaround exists | One module's chart not rendering, caution flags missing from some countries, slow load on specific query | CTO risk acceptance required |
| Low | Cosmetic or minor UX issues, no functional impact | Misaligned padding, tooltip text slightly wrong, minor colour inconsistency | Does not block release |

## The Opus Final QA Pass — What It Is

The Opus final QA pass is the last quality gate before deployment. The QA Lead switches to Opus model tier and conducts an independent, top-to-bottom review of everything being released. This is not a re-run of the QA Engineer's test cases — it is a fresh-eyes review from a more capable model that treats the product as a real user would encounter it.

The Opus pass is designed to catch:
- Issues the QA Engineer's test cases did not cover
- Integration failures that only appear when the full feature set is exercised together
- Regressions introduced by fixes applied after the QA Engineer's test execution
- Issues with requirements interpretation — the feature was built and tested against an assumption that turns out to be wrong

The output of the Opus pass is the release readiness report to the CTO. This report is the QA Lead's professional assessment of whether the product is ready to ship.

**The Opus pass must not be skipped.** If timeline pressure from engineering or business stakeholders would prevent the Opus pass from being completed, this must be escalated to the CTO explicitly, who must accept that risk in writing before deployment proceeds.

## SalarySage Data QA Notes

Jeff Day completed a full automated QA assessment of the salary database (FULL_DATABASE_QA_EXECUTIVE_SUMMARY.pdf, March 2026). Key findings:
- 80 records flagged as needing caution (small market countries: Armenia, Republic of Georgia, and similar)
- Decision: add caution flags to these records rather than remove them
- The QA Lead must verify caution flags are displayed correctly for these records in the UI
- Tom Rieger reviewed and confirmed: "looks really, really good"

Earlier data concern: Jeff Day had "critical concerns" about some data in January 2026 (video_game_salaries_2025-2026_missing_rows_filled.xlsx). Confirm with VP Engineering whether those concerns were fully resolved before testing data accuracy.

## Security Review Checklist

This checklist is run by the QA Lead on every release, prior to the Opus final QA pass. Each item must be explicitly verified and recorded in the release readiness report. No item may be marked as assumed or skipped without CTO sign-off.

---

### 1. Authentication and Authorisation

**What to check:**
- JWT tokens are validated on every protected route using `jose` — not just decoded, but cryptographically verified against the expected algorithm and signing key
- Tokens contain the correct claims (user ID, role, expiry) and those claims are actually used by the authorisation logic
- RBAC enforcement is applied at the route handler level in Fastify, not only at the UI layer — test by calling API routes directly with a token belonging to a lower-privilege role
- Sessions expire correctly: attempt to use an expired token and confirm a 401 is returned, not a 200 with stale data
- Password hashing uses Argon2id — confirm no legacy bcrypt or MD5 paths remain in the codebase

**How to verify:**
- Use a REST client (e.g. Insomnia or curl) to call protected Fastify routes without a token, with an expired token, and with a valid token for the wrong role
- Check the Fastify route definitions for `onRequest` or `preHandler` hooks that enforce authentication — any route missing a hook is a finding
- Inspect the database: confirm stored passwords are Argon2id hashes (they start with `$argon2id$`)

**Pass:** Every protected route returns 401 for unauthenticated requests, 403 for insufficient role, and the correct data only for the correct role. Argon2id hashes confirmed in the database.

**Fail triggers:** Any protected route accessible without a valid token. Any route where a lower-privilege role can access higher-privilege data. Any non-Argon2id password hash present. Escalate to CTO immediately; this is a Critical severity finding and blocks release.

---

### 2. Input Validation

**What to check:**
- All Fastify route handlers that accept request bodies, query parameters, or URL params have a corresponding Zod schema applied via the Fastify schema validation or a `zod-to-json-schema` integration
- Every field that touches the database is validated for type, length, and format before it reaches the Drizzle query layer
- String fields that are written to HTML output are sanitised to prevent XSS — check for any use of `dangerouslySetInnerHTML` in React that operates on unvalidated data
- No raw SQL string concatenation or template literals used in Drizzle queries — parameterised queries only

**How to verify:**
- Submit intentionally malformed payloads to each endpoint (missing required fields, type mismatches, oversized strings, SQL metacharacters such as `'; DROP TABLE--`, angle brackets and script tags for XSS)
- Search the codebase for `dangerouslySetInnerHTML` and audit each instance
- Search the Drizzle query layer for any `sql` tagged template literals that incorporate unvalidated user input directly

**Pass:** Malformed payloads return 400 with a validation error and no database interaction occurs. SQL metacharacters in inputs do not cause errors or unexpected query behaviour. XSS payloads do not execute in the browser.

**Fail triggers:** Any input that reaches the database without schema validation. Any XSS payload that executes. Any SQL injection that causes an error or data exposure. Critical severity; blocks release.

---

### 3. API Security

**What to check:**
- Fastify rate limiting is active on authentication endpoints (login, password reset) and on any resource-intensive endpoints (data exports, bulk queries)
- Error responses from the API do not include stack traces, internal file paths, database error messages, or any detail that would help an attacker map the system
- Fastify's default error handler has been overridden to return sanitised error objects in production mode
- CORS configuration is explicit and restricted to known origins — wildcard `*` is not acceptable in production

**How to verify:**
- Intentionally trigger a server error (e.g. send a payload that causes a Drizzle constraint violation) and inspect the response body for stack traces or database detail
- Confirm the `@fastify/rate-limit` plugin is configured and test by sending more than the allowed number of requests to the login endpoint in rapid succession — a 429 response is expected
- Review the CORS configuration in Fastify setup and confirm the allowed origins list matches the production and preview domains only

**Pass:** No stack traces or internal error detail in any API response. Rate limiting returns 429 after threshold is exceeded. CORS blocks requests from unlisted origins.

**Fail triggers:** Stack trace or database error message visible in any API response. Rate limiting absent on authentication endpoints. CORS configured with wildcard in production. High severity; CTO risk acceptance required for release.

---

### 4. Data Handling

**What to check:**
- Application logs (Fastify's built-in Pino logger or any custom logging) do not include passwords, tokens, API keys, or any PII (names, email addresses, salary figures for identifiable individuals)
- URLs and query strings do not contain PII or sensitive identifiers — user IDs in URLs are acceptable if they are opaque (UUID), but email addresses, names, or salary values must never appear in a URL
- Sensitive database fields (e.g. stored API keys, any financial data fields, personal identifiable fields) are encrypted at rest using AES-256-GCM as implemented in the application's encryption utility
- Drizzle migrations confirm that encrypted columns are defined as text/bytea (not plaintext varchar) and that the encryption/decryption logic is applied consistently at the application layer

**How to verify:**
- Run the application in a test environment and observe the log output during login, data query, and error conditions — scan for any of the above categories
- Audit the Drizzle schema for any field that should be encrypted and confirm the corresponding model layer applies `encryptField` / `decryptField` calls
- Inspect actual database rows for sensitive fields and confirm the stored values are ciphertext, not plaintext
- Attempt to access user data via URL manipulation (e.g. swap a UUID in a resource URL) and confirm RBAC prevents unauthorised access

**Pass:** No secrets, tokens, or PII found in logs or URLs. Sensitive fields store ciphertext in the database. AES-256-GCM encryption confirmed via code review and database inspection.

**Fail triggers:** Any secret or PII found in application logs. Any plaintext sensitive value found in the database where encryption is expected. Critical severity; blocks release.

---

### 5. Dependency Security

**What to check:**
- `npm audit` returns no critical or high severity vulnerabilities in production dependencies
- Any known CVE affecting a direct or transitive production dependency has either been patched (via a version upgrade or `npm audit fix`) or has a documented risk acceptance from the CTO
- Dev-only dependencies with vulnerabilities are noted but do not block release if they cannot be invoked at runtime

**How to verify:**
- Run `npm audit --omit=dev` in both the backend and frontend package roots and capture the output
- For any vulnerability that cannot be immediately patched (e.g. no fix available), document the CVE number, affected package, exploitability in NBI's context, and obtain written CTO acceptance

**Pass:** `npm audit --omit=dev` returns zero critical or high vulnerabilities. Any moderate vulnerabilities are documented and accepted.

**Fail triggers:** Any unpatched critical or high CVE in a production dependency without CTO written acceptance. High severity; blocks release unless CTO accepts the risk explicitly.

---

### 6. Environment Hygiene

**What to check:**
- `.env` files are not committed to the repository — check `.gitignore` includes `.env`, `.env.local`, `.env.production`, and all variants
- No hardcoded credentials, API keys, connection strings, or secret values exist in any source file (TypeScript, JavaScript, configuration files, or SQL migration files)
- Environment variables consumed by the React frontend contain only values that are safe to expose to the browser — any variable prefixed with `VITE_` or equivalent is public; confirm no secrets are passed this way
- The production deployment environment (Vercel, Railway, or equivalent) stores secrets as encrypted environment variables, not in committed config files

**How to verify:**
- Run `git log --all --full-history -- "**/.env*"` to confirm no `.env` files have ever been committed (if they have, assess whether secrets need rotating)
- Search the codebase for patterns matching known secret formats: connection strings (`postgresql://`), JWT secrets assigned inline, API key strings assigned to constants
- Review the Vite or build tool configuration and confirm which environment variables are bundled into the client build — inspect the built JS bundle for any string that resembles a secret
- Check the CI/CD configuration for any secrets stored as plaintext in pipeline YAML

**Pass:** No `.env` file in git history. No hardcoded secrets found in source. Client bundle contains no API keys, database credentials, or JWT signing secrets. Deployment secrets stored in encrypted environment variable store.

**Fail triggers:** Any secret found in git history (requires secret rotation and CTO notification). Any API key or credential found in the client-side JS bundle. Critical severity; blocks release.

---

### 7. GDPR Compliance

**What to check:**
- Data minimisation: the application collects only the personal data fields that are strictly necessary for the stated purpose — audit the user registration and profile flows for any fields that are collected but not used
- Deletion capability: there is a functional mechanism to delete a user's personal data on request (the "right to erasure") — this must delete or anonymise all records associated with the user, not just the user row
- Consent flows: where the application sends marketing communications or uses analytics tracking, there is a documented consent mechanism and consent state is stored against the user record
- Data residency: confirm where PostgreSQL data is hosted and that the hosting region is compliant with any contractual obligations NBI has with clients regarding data location
- Retention: if the application stores audit logs or access logs containing PII, confirm there is a retention policy and automated deletion or anonymisation process defined (even if not yet fully automated, the policy must exist)

**How to verify:**
- Walk through the registration and profile flows and list every personal data field collected; cross-reference against what is actually used in the application
- Test the user deletion flow end-to-end in a staging environment: create a test user, generate activity data across all relevant tables, delete the user, and confirm no orphaned PII remains in any table
- Review the Drizzle schema for any table that could hold user-linked data and confirm cascading deletes or anonymisation is applied on user deletion
- If the application sends emails or uses third-party analytics, confirm consent capture is present and auditable

**Pass:** No unnecessary personal data collected. User deletion removes or anonymises all PII across all tables. Consent is captured where required. Data residency is documented and compliant.

**Fail triggers:** Any orphaned PII remaining after a user deletion request. Any personal data collected with no functional justification. Absence of a deletion mechanism entirely. High severity; CTO and Glen must be notified before release if any GDPR finding cannot be resolved, as this carries regulatory exposure for NBI.
