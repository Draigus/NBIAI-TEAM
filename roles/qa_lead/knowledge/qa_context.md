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
