# DevOps Engineer — DevOps Context

## NBI's Infrastructure Overview

NBI runs three distinct web surfaces, each on a different platform:

| Surface | Platform | Notes |
|---|---|---|
| Playsage (SaaS product) | Vercel | Next.js App Router, Supabase backend |
| SalarySage (salary tool) | Currently local / standalone | Server-side hosting required before external distribution |
| NBI website | Framer | nbi-consulting.com |

## Playsage Infrastructure

### Vercel
- **Framework:** Next.js (App Router)
- **Deployment model:** Git-based. PRs get automatic preview deployments. Merges to main trigger production deployments
- **Environment scopes:** Development (local), Preview (PR deployments), Production (main branch)
- **Custom domain:** To be confirmed — likely a playsage.com or similar domain (pending brand rename decision)

### Supabase
- **Database:** PostgreSQL
- **Auth:** Supabase Auth (handles user sessions, JWTs)
- **Row Level Security:** Enabled on all user-facing tables — never disable
- **Environment variables in Vercel:**
  - `NEXT_PUBLIC_SUPABASE_URL` — safe for browser (set as NEXT_PUBLIC)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for browser; protected by RLS policies (set as NEXT_PUBLIC)
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only; never set as NEXT_PUBLIC; never exposed to client

### Environment Variable Naming Conventions (Next.js on Vercel)
- Variables prefixed with `NEXT_PUBLIC_` are embedded in the client-side JavaScript bundle. They are visible to anyone who visits the site
- Variables without `NEXT_PUBLIC_` are only available server-side (in Route Handlers, Server Components, server actions)
- **Rule:** Any secret (API key, service role key, LLM API key) must NOT use the `NEXT_PUBLIC_` prefix

## SalarySage Infrastructure

### Current State (as of March 2026)
- Standalone HTML application (`SalarySage-Standalone.html`, 29KB)
- Loads `Demo_Salary.csv` (5MB) at runtime
- Auth via `SalarySage-Auth.html` using SHA-256 hashed credentials
- Access logging to `SalarySage_AccessLog_YYYY-MM-DD.txt` (client-side — not suitable for production)
- LLM API key was embedded in HTML (security incident — key belongs to Jeff Day's personal credit card)

### Security Incident Record
The LLM API key used for SalarySage's natural language query interface was embedded directly in the client-side HTML file. Anyone who opened developer tools in their browser could read the key. The key was on Jeff Day's personal credit card.

**Resolution required:**
1. Move the LLM API call to a server-side function (Route Handler in Next.js, or a separate serverless function)
2. Store the API key as a server-side environment variable (not NEXT_PUBLIC)
3. The HTML/JS client calls the server endpoint — the server calls the LLM API — the key never reaches the browser
4. Confirm the API key belongs to an NBI-controlled account (not Jeff Day's personal card)
5. Access logging must move server-side

### Target Hosting Model for SalarySage
Options under consideration (VP Eng to decide):
1. **Separate Vercel project** — SalarySage deployed as its own Next.js (or minimal Express/serverless) app on Vercel
2. **Module within Playsage** — SalarySage is integrated directly into the Playsage Next.js codebase as a route/module (this is the eventual destination anyway, per the product roadmap)

Until a hosting decision is made, SalarySage should not be distributed to external clients.

## NBI Website (Framer)

- **Platform:** Framer
- **Domain:** nbi-consulting.com
- **DNS:** Managed separately from Vercel — do not conflate
- **Deployment:** Published via Framer dashboard (no CI/CD pipeline)
- **HTML prototype exists:** A full 10-file HTML/CSS prototype was built and reviewed but has not been migrated to Framer. This is a pending task

## Secrets Management Policy

### Rules (non-negotiable)
1. No API key, secret, password, or service credential ever appears in committed code
2. `.env.local` is in `.gitignore` and is never committed
3. All secrets for deployed environments are set in Vercel's dashboard, scoped to the correct environment
4. Secrets are never shared in plain text over Slack, Teams, email, or any other channel
5. If a secret is compromised (exposed in code, repo, or conversation): revoke and rotate immediately, before fixing the code
6. Third-party API keys should belong to NBI-controlled accounts, not personal accounts

### Environment Variable Registry
The DevOps Engineer must maintain a documented registry of all environment variables used across Playsage and SalarySage. The registry should record:
- Variable name
- Purpose (what it connects to)
- Scope (Production / Preview / Development)
- Owner (who manages the account this key belongs to)
- Last rotated date
- Whether it is a secret (server-only) or public (NEXT_PUBLIC)

This registry lives in a secure, access-controlled location — not in the codebase.

## CI/CD Pipeline Expectations

Playsage on Vercel has automatic CI/CD built in:
- Vercel runs build checks on every PR
- Failed builds block the PR from being considered deployable
- Preview deployments are created for every PR — these should be tested before merging

Additional checks that may be configured:
- TypeScript type checking (`tsc --noEmit`)
- Linting (`eslint`)
- Any automated test suite (if/when implemented)

The DevOps Engineer is responsible for ensuring these checks run and that the team knows when they fail.

## Monitoring and Alerting

Playsage monitoring surfaces:
- **Vercel dashboard:** Build logs, deployment status, function invocation logs, error rates
- **Supabase dashboard:** Database query performance, connection pool usage, auth events, storage usage
- **Application-level errors:** To be set up — Vercel logs provide basic error visibility; a proper error tracking tool (e.g. Sentry) may be warranted as the product matures

SalarySage monitoring:
- Currently: access log text files (client-side — not reliable)
- Required: server-side access logging once hosting is resolved

## Useful Reference — Vercel CLI and Dashboard

Key Vercel operations:
- `vercel env pull` — pull current environment variables to local `.env.local`
- `vercel env add` — add a new environment variable
- Vercel dashboard: Settings > Environment Variables — manage all vars with scope selection
- Vercel dashboard: Deployments — full history, rollback is one click
- Instant rollback is available for any production deployment — use it without hesitation if a bad deployment reaches production
