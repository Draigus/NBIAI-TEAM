# SDLC Stage 8: Post-Deploy Monitoring

**Stage:** 08 — Monitoring
**Triggered by:** Successful production deployment (Stage 07 complete)
**Ongoing:** This stage runs continuously — it does not close until the feature or product is decommissioned
**Escalates to:** VP Engineering, CTO, or Glen depending on severity

---

## Overview

Monitoring begins the moment a production deployment is confirmed live and continues indefinitely. It is not a one-time check after deployment — it is an ongoing operational responsibility. The DevOps Agent owns first-line monitoring. Escalation paths lead to VP Engineering and, for significant incidents, to Glen.

For NBI's current stage (early product, limited live users), monitoring is lightweight but structured. The goal is to catch problems before users have to report them. As Playsage scales to paid customers, monitoring becomes increasingly critical.

---

## What to Monitor by Platform

### Playsage (Vercel + Supabase)

**Application health:**
- Vercel deployment status: confirm the current production deployment is "Ready" and not in an error state
- Build failures: if a new deployment fails to build, Vercel marks the deployment as failed. The previous deployment remains live, but the new code has not shipped. DevOps Agent must detect and report this
- Edge function or serverless function errors: Vercel logs runtime errors from API routes. Any 5xx errors appearing in production logs must be investigated

**Database health (Supabase):**
- Supabase dashboard: active connections, query performance, database size
- Watch for: connection count approaching limits (Supabase free tier: 60 connections; paid plans higher), slow query indicators
- Row-Level Security policy correctness: periodic spot-checks confirming that cross-tenant data leakage is not occurring (test with two accounts from different tenants)

**API health:**
- Response time trends for key API routes (the 5 most-called routes for the active modules)
- Error rate: percentage of requests returning 4xx or 5xx. A non-zero 5xx rate on key routes requires investigation
- Any sudden spike in 4xx responses (may indicate auth issues, malformed requests, or a breaking change)

**User-facing health:**
- Playsage pages loading at the production URL (the Executive Dashboard, Competitive Landscape, Sentiment Analysis, and Foresight modules are the highest priority — these are the core demo and investor-facing surfaces)
- Cascade Engine signals functioning: if alerts are configured, confirm they are firing on expected conditions and not triggering false positives

### NBI Website (Framer / nbi-consulting.com)

**Uptime:**
- The homepage must be accessible at nbi-consulting.com at all times
- Contact form must be functional (this is the primary lead generation mechanism)

**Key pages:**
- Homepage, Services page (Digital Entertainment, Analytics & Insights, Organisational Performance), About, Contact
- Client logo carousel loading correctly (social proof — Blizzard, Xbox, NASA, etc.)

**SSL certificate:**
- Certificate expiry monitoring (Framer typically manages this automatically, but confirm after any domain configuration changes)

### SalarySage (Static Hosting)

**Access:**
- Application is reachable at its hosted URL
- Authentication is functioning (test logins should work)
- CSV data is loading correctly

**Access log:**
- SalarySage_AccessLog file is being written on each login
- Review access log weekly: identify any unexpected access patterns or failed login clusters that could indicate probing

---

## Monitoring Frequency

| Check | Frequency | Owner |
|---|---|---|
| Vercel deployment status | After every deploy, then daily | DevOps Agent |
| Supabase dashboard health | Daily | DevOps Agent |
| API error rate review | Daily | DevOps Agent |
| Playsage production smoke test (key pages) | Daily | DevOps Agent |
| NBI website uptime and contact form | Daily | DevOps Agent |
| SalarySage access and auth | After every deploy; weekly thereafter | DevOps Agent |
| SalarySage access log review | Weekly | DevOps Agent |
| Supabase connection count trend | Weekly | DevOps Agent |
| Database query performance review | Weekly | VP Engineering |
| Full Playsage module functional check | Weekly (or after any deploy) | QA Lead |
| Cross-tenant data isolation spot-check | Monthly | CTO |

---

## Monitoring Outputs

DevOps Agent produces a brief monitoring status update at each weekly check-in. The update format:

```
## Monitoring Status: [DATE]

### Playsage
- Vercel status: [OK / Issue — describe]
- Supabase health: [OK / Issue — describe]
- API error rate (past 7 days): [X%]
- Any incidents: [None / Yes — describe]

### NBI Website
- Uptime: [OK / Issue — describe]
- Contact form: [OK / Not tested]

### SalarySage
- Access: [OK / Issue]
- Access log review: [Notable entries or None]

### Open issues
- [Any ongoing problems or watch items]
```

This report is delivered to VP Engineering. VP Engineering includes a summary in any reporting to Glen.

---

## Escalation Paths

The severity of an issue determines how it is escalated and how fast.

### Severity Definitions

**S1 — Critical (Production is down or data is at risk):**
- The Playsage application is unreachable in production
- Database connection failure preventing any user access
- Security breach: evidence of unauthorised access, data exposure, or cross-tenant leakage
- SalarySage access log shows a pattern of credential-stuffing or breach attempt

Response time: Immediate (within the current working session). Do not wait for a scheduled check.
Escalation: DevOps Agent notifies VP Engineering immediately. VP Engineering notifies CTO. CTO notifies Glen. All three are in the loop for an S1.

**S2 — High (Significant functionality impaired):**
- A core Playsage module is returning errors or showing incorrect data for users
- The NBI website contact form is broken (lead generation is interrupted)
- A deploy has failed silently (the Vercel build errored but a previous version is still serving)
- SalarySage auth is broken

Response time: Within 2 hours of detection.
Escalation: DevOps Agent notifies VP Engineering. VP Engineering decides whether to involve CTO based on the nature of the issue.

**S3 — Medium (Notable issue, not urgent):**
- A non-critical module is returning stale or incorrect data
- API response times have degraded noticeably but the application is still functional
- A monitoring check has discovered a gap (e.g. a migration was applied but its rollback script has a bug)

Response time: Within the current working day.
Escalation: DevOps Agent notifies VP Engineering. VP Engineering logs as a work item for resolution.

**S4 — Low (Informational / watch item):**
- A metric is trending in a direction that may become a problem (e.g. database size growing faster than expected)
- A P4 bug has surfaced in production monitoring that was not caught in QA

Response time: Next scheduled review.
Escalation: Logged in the monitoring status report. VP Engineering aware.

---

## Incident Response Steps

When an S1 or S2 is detected:

### Step 1: Assess (first 5 minutes)
- Confirm the issue is real and in production (not a false positive from the monitoring check, not a local issue)
- Determine scope: which product, which functionality, which users are affected
- Check whether the issue appeared immediately after a deployment (most likely cause) or appeared spontaneously

### Step 2: Communicate (first 10 minutes)
- DevOps Agent notifies VP Engineering in writing with: what is broken, when it started, current assessment of root cause, and whether rollback is being considered
- VP Engineering notifies CTO and Glen for S1 incidents
- For Playsage, if any customers are affected, Glen makes the call on whether to notify them and how (this is a Glen decision, not an agent decision)

### Step 3: Contain (first 30 minutes)
- If the issue was caused by a recent deployment: initiate rollback per the procedure in Stage 07
- If the issue is not deployment-related: identify whether there is a temporary mitigation (e.g. disabling a specific feature flag, reverting a config change)
- If the root cause is unclear: do not make changes blindly. Gather information first

### Step 4: Fix
- Root cause is identified and confirmed
- Fix is implemented through the standard SDLC pipeline (do not push unreviewed code directly to production to fix an incident — exception: VP Engineering and CTO may approve an emergency hotfix with a post-hoc review, but this must be explicitly approved by Glen)
- Emergency hotfixes: branch named `hotfix/[description]`, reviewed by VP Engineering (shortened review, not full Stage 05 process), approved by Glen, deployed

### Step 5: Verify
- Smoke test confirms the fix works in production
- The specific issue that triggered the incident is confirmed resolved
- No new issues introduced by the fix

### Step 6: Post-Incident Review
- Within 48 hours of resolution, DevOps Agent writes a brief post-incident note covering:
  - What happened
  - Root cause
  - How it was detected
  - How it was resolved
  - What will be done to prevent recurrence
- Post-incident note is shared with VP Engineering and Glen

---

## Long-Term Monitoring Considerations

As Playsage scales to paid customers, the monitoring setup should evolve to include:

- **Uptime monitoring service** (e.g. BetterUptime, UptimeRobot) — automated pings every 5 minutes with email/Slack alerts on downtime. Not yet implemented; should be added before any paying customer onboards
- **Error tracking** (e.g. Sentry) — captures JavaScript errors from the browser and server-side errors from API routes with full stack traces. High-value for debugging production issues that do not reproduce locally
- **Performance monitoring** — tracking API response time percentiles (p50, p95, p99) over time to catch gradual degradation
- **Database query analytics** — Supabase provides basic query analytics; at scale, may need pg_stat_statements analysis

These are forward-looking requirements. DevOps Agent should flag to Glen and VP Engineering when Playsage is approaching its first paying customer, so these can be implemented before they are needed in anger.

---

## Common Failure Modes

- **Monitoring only happens after deploys.** Production can break without a deployment (database issues, external data feed changes, Supabase maintenance windows). Monitoring must be ongoing, not event-triggered only.
- **S1 not escalated to Glen.** Glen needs to know when production is down. This is not an agent-level decision to manage quietly. Escalate.
- **Post-incident review skipped.** Incidents that are resolved without a post-mortem tend to recur. The review does not need to be long, but it must happen.
- **Monitoring reports produced but not read.** If the weekly monitoring status is produced but VP Engineering does not review it, monitoring is just theatre. VP Engineering owns reviewing the output, not just receiving it.
- **Emergency hotfix deployed without Glen approval.** The temptation to push a quick fix directly to production is real during an incident. Resist it. The abbreviated hotfix review still requires Glen's sign-off.
