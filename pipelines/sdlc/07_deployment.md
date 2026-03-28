# SDLC Stage 7: Deployment

**Stage:** 07 — Deployment
**Triggered by:** QA Lead final approval from Stage 06
**Output:** Feature live in production (or staging, for pre-production releases)
**Hands off to:** Stage 08 — Monitoring

---

## Overview

Deployment is the controlled process of moving approved, QA-verified code into production. The DevOps Agent owns the mechanics of deployment. Glen Pryer holds the final approval gate for all production deployments. Nothing goes to production without Glen's explicit sign-off.

Different NBI products deploy differently. This document covers all three production targets: Playsage (Vercel), SalarySage (static hosting), and the NBI website (Framer).

---

## Deployment Authority

| Person / Role | Authority |
|---|---|
| Glen Pryer | Final production deployment approval — required for all production releases |
| DevOps Agent | Executes deployments once approval is confirmed. Has deploy access to Vercel and Framer. Does not initiate without Glen's approval |
| VP Engineering | Confirms build is deployment-ready and passes to DevOps. Does not trigger production deploy directly |
| QA Lead | Issues QA approval. Does not trigger deploys |

There is no automatic or unsupervised production deployment. Every production deployment is a deliberate human-approved action.

---

## Pre-Deploy Checklist

This checklist must be completed by DevOps Agent before every production deployment, regardless of how small the change appears.

### Code and Quality Gates
- [ ] QA Lead has issued written final approval (Stage 06 complete)
- [ ] All tests pass on the build being deployed (`npm run test` clean)
- [ ] `npm run build` completes without errors or warnings that indicate runtime risk
- [ ] No open P1 or P2 bugs against the feature being deployed
- [ ] Glen has given written approval for the production deployment (Slack message, email, or explicit instruction in the current session)

### Environment and Configuration
- [ ] All environment variables required by this deployment are documented and confirmed as set in the production environment
- [ ] No environment variables have changed in a way that could break existing functionality
- [ ] Any new Supabase migrations have been applied to the production database in the correct order
- [ ] Migrations are confirmed as applied successfully (check Supabase migration history) before deploying the application code that depends on them
- [ ] If the deployment includes a Docker Compose update (offline demo), the compose file is validated and the image builds cleanly

### Rollback Readiness
- [ ] The previous production deployment reference is recorded (Vercel deployment ID, or Framer version)
- [ ] The database migration has a tested down migration available
- [ ] Rollback procedure steps are confirmed for this specific deployment (see Rollback Procedure below)

### Communication
- [ ] Glen has been informed of what is being deployed and when
- [ ] If the deployment affects live users (i.e. Playsage has active customers), a deployment window has been agreed — not during peak usage hours

---

## Deployment by Platform

### Playsage — Vercel

**Stack:** Next.js (App Router), Supabase, Vercel

**Deployment process:**

1. **Database migration first.** If the deployment includes schema changes, apply the Supabase migration to production before deploying the application code. Never deploy application code that requires a schema that does not yet exist. Steps:
   ```
   supabase db push --linked
   ```
   Verify the migration has applied cleanly in the Supabase dashboard (migration history tab).

2. **Trigger Vercel deployment.** Vercel is connected to the main branch of the repository. When QA-approved code is merged to main (Stage 05), Vercel will queue a build automatically. DevOps Agent confirms the build completes successfully in the Vercel dashboard.

3. **Verify the production build.** After the Vercel build completes:
   - Navigate to the production URL
   - Confirm the application loads correctly
   - Execute a smoke test: the 5-10 most critical user flows, confirmed working (see Smoke Test below)
   - Confirm no JavaScript errors in the browser console
   - Confirm no failed network requests in the browser network tab

4. **Record the deployment.** Log the Vercel deployment ID and the git commit hash in the project's deployment log. This is the rollback reference.

**Vercel environment variables:**
- Production environment variables are managed in the Vercel project settings
- DevOps Agent does not hardcode values or commit .env files
- Any new variables required by the deployment must be added to Vercel before the deployment, not after

---

### SalarySage — Static Hosting

**Stack:** Standalone HTML + CSV, no server-side runtime

**Current deployment status:** SalarySage is currently a local-run standalone HTML file. When it transitions to hosted deployment, the following applies.

**Deployment process:**

1. **Build package.** Confirm the deployment package contains:
   - SalarySage-Auth.html (authentication front end)
   - SalarySage-Standalone.html (main application)
   - Demo_Salary.csv (salary database)
   - No server-side dependencies

2. **Offline integrity check.** Disconnect from the internet and confirm the application loads and functions correctly from the local file system or the hosting environment. SalarySage must not require any CDN calls or external APIs at runtime. If any external resource is loaded at runtime, this is a bug.

3. **Upload to hosting.** Upload files to the designated static hosting location.

4. **Verify access.** Confirm:
   - Authentication front end loads
   - Login with a test credential works
   - The salary query interface loads and returns data
   - Access logging is working (check SalarySage_AccessLog file is being written)

5. **Security verification.** SalarySage contains salary data. Confirm:
   - The application is not indexed by search engines (robots.txt or equivalent)
   - Direct URL access to the CSV data file is not possible without authentication
   - API key (currently on Jeff Day's personal credit card at $25 loaded) — confirm this is not exposed in the deployed HTML source. Flag to VP Engineering if found.

---

### NBI Website — Framer

**Stack:** Framer CMS

**Who has Framer access:** Glen Pryer (primary), DevOps Agent (if Framer access is configured)

**Deployment process:**

1. **Confirm Framer changes are complete.** Website changes are made in the Framer editor. Before publishing, confirm all pages affected by the change are in the expected state.

2. **Desktop preview check.** Use Framer's built-in preview to verify the changes look correct on desktop (primary viewport for NBI's audience).

3. **Mobile preview check.** Verify mobile layout is not broken by the change.

4. **Glen approval gate.** The NBI website is a public-facing marketing asset. Any publish to production requires Glen's explicit approval. DevOps Agent presents the preview to Glen before clicking Publish.

5. **Publish.** In Framer: "Publish to nbi-consulting.com" (or the configured domain). Framer handles CDN distribution.

6. **Post-publish verification.** Visit the live site immediately after publish and confirm:
   - The changed pages look correct
   - No previously working pages have broken (check navigation links work, contact form works)
   - The change is visible (Framer CDN can cache; hard refresh if needed)

**Framer-specific constraints:**
- Framer does not have a staging environment separate from the live site in the standard plan. Changes are previewed in the editor before publishing. This means there is no separate staging deploy for website changes.
- Custom code in Framer (if any) must be reviewed by CTO before publishing
- Do not publish partial changes — Framer publishes the entire site. Ensure all in-progress work is either complete or reverted to last-good state before publishing

---

## Glen Approval Gate

For every production deployment, DevOps Agent must obtain Glen's explicit approval before executing. The approval request to Glen must include:

- What is being deployed (one sentence)
- Which platform (Vercel / static hosting / Framer)
- What changed (summary of features and fixes)
- Any risk factors or reasons for extra caution
- Confirmation that QA has approved and all pre-deploy checklist items are complete

Glen's approval can be given in any written form: Slack message, email, or explicit instruction in the current Claude session. "Looks good, deploy it" counts. Silence does not count.

If Glen cannot be reached for approval and the deployment is time-sensitive (e.g. a production bug fix is waiting), the CEO Agent escalates to Glen through all available communication channels. Do not deploy without approval.

---

## Smoke Test (Post-Deploy Verification)

After every production deployment, DevOps Agent runs a smoke test. The smoke test is not a full QA pass — it is a quick confidence check that the deployment did not break anything obvious.

**Playsage smoke test (minimum):**
- Application loads at the production URL
- Login works with a test account
- The Executive Dashboard renders with data
- Navigation between at least 3 modules works without errors
- No JavaScript console errors on any navigated page
- No 5xx errors in the network tab

**NBI website smoke test (minimum):**
- Homepage loads
- Navigation works (Services, About, Contact links all work)
- Contact form loads (does not need to be submitted in production smoke test)
- No broken images or missing assets

**SalarySage smoke test (minimum):**
- Auth page loads
- Login with test credentials works
- A salary query returns results
- Access log entry is written

Smoke test results are recorded. If any smoke test item fails, the deployment is considered failed and rollback is initiated.

---

## Rollback Procedure

If a production deployment causes problems (smoke test fails, users report breakage, monitoring alerts fire), the rollback procedure is:

### Playsage (Vercel) Rollback:

1. In the Vercel dashboard, navigate to Deployments for the project.
2. Find the previous successful deployment (the deployment ID recorded in the pre-deploy checklist).
3. Click "Promote to Production" on the previous deployment. Vercel will immediately serve the prior build.
4. If the deployment that is being rolled back included a database migration, run the down migration:
   ```
   supabase db push --linked
   ```
   (applying the down migration SQL manually if Supabase CLI does not support automated rollback in the current version)
5. Verify the rollback: confirm the application is working correctly on the previous version.
6. Notify Glen that a rollback has occurred, what was rolled back, and what the root cause appears to be.

### NBI Website (Framer) Rollback:

Framer maintains version history. In the Framer editor:
1. Go to version history.
2. Restore the last published version before the problematic change.
3. Publish the restored version.
4. Verify the live site is back to the pre-change state.

### SalarySage Rollback:

1. Re-upload the previous version of the HTML files and CSV.
2. Verify the application is working.

### After Any Rollback:

1. DevOps Agent reports to VP Engineering and Glen with: what was rolled back, what evidence triggered the rollback, what the known or suspected root cause is.
2. The feature re-enters the engineering pipeline (Stage 04 or 05, depending on root cause) before another deployment is attempted.
3. The failed deployment is logged with root cause analysis.

---

## Handoff Criteria

The following must all be true before Stage 08 (Monitoring) begins and the deployment is considered complete:

- [ ] Production deployment confirmed live (correct URL, correct version)
- [ ] Glen approval obtained and recorded
- [ ] Smoke test passed on all critical paths
- [ ] Deployment reference (Vercel ID or equivalent) logged
- [ ] Any database migrations confirmed as applied
- [ ] VP Engineering notified that deployment is live and stable
- [ ] Stage 08 monitoring responsibility handed to the relevant agent

---

## Common Failure Modes

- **Deploying application code before applying the database migration.** This causes runtime errors the instant the new code tries to access tables or columns that do not yet exist. Migration always comes first.
- **Deploying without Glen's approval.** Not an acceptable shortcut under any circumstances.
- **No rollback reference recorded.** If the deployment ID or prior version reference was not captured before deploying, a rollback requires digging through logs under pressure. Always record it in advance.
- **Skipping the smoke test.** A deployment that appears to have succeeded can still be serving a broken experience to users. The smoke test catches this in the first minutes rather than after users have reported it.
- **Deploying to Framer with in-progress work not reverted.** Framer publishes the entire site — any half-finished page goes live. Confirm every page is in a complete state before publishing.
