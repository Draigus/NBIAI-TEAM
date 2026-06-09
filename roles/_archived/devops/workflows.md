# DevOps Engineer — Workflows

## Daily Operations
- Check Vercel dashboard for any failed deployments or build errors
- Review Supabase dashboard for any database health alerts or unusual query patterns
- Confirm production environment is healthy and preview deployments are working for open PRs
- Surface any infrastructure concerns to VP Eng at the start of the day

## Standard Workflows

### New Environment Variable / Secret Setup
**Trigger:** Senior Engineer or VP Eng requests a new API key or secret be configured
**Steps:**
1. Confirm the secret will never appear in any codebase file — get confirmation from the Senior Engineer that the code references it only via environment variable
2. Add the variable to Vercel: set correct scope (Production, Preview, Development as needed)
3. Confirm the variable name matches exactly what the code expects (case-sensitive)
4. Verify the variable is available in a preview deployment before it goes to production
5. Document the variable: name, purpose, which service it connects to, who owns the account it belongs to, and when it was last rotated
6. Do not share secret values in plain text over any channel — use Vercel's dashboard directly
**Output:** Environment variable correctly scoped in Vercel, documented in environment registry
**Handoff:** Senior Engineer confirms the feature works with the new variable in preview

### Production Deployment Gate
**Trigger:** PR approved by Senior Engineer, ready to merge to main
**Steps:**
1. Confirm the preview deployment for the PR is healthy and has been tested
2. Confirm no new environment variables are needed in production that have not been set
3. Confirm no Supabase migrations are pending that have not been applied
4. Merge proceeds to main; monitor the production deployment in Vercel
5. Confirm production deployment succeeds within 5 minutes of merge
6. If deployment fails: do not panic. Vercel supports instant rollback — roll back immediately, then investigate
**Output:** Successful production deployment or clean rollback
**Handoff:** VP Eng notified of deployment outcome

### Secrets Incident Response
**Trigger:** Discovery of an exposed secret, hardcoded API key, or credential in code or a deployed environment
**Steps:**
1. Treat the secret as compromised immediately, regardless of whether it has been accessed
2. Escalate to VP Eng immediately — this is not a fix-quietly situation
3. Revoke or rotate the secret at the source (API provider, Supabase dashboard, etc.) before fixing the code
4. Work with Senior Engineer to remove the hardcoded value from the codebase and replace with environment variable
5. Confirm the fix is applied across all environments
6. Write an incident report: what was exposed, for how long, what access it could have enabled, what was done to fix it, and what process change prevents recurrence
7. Review other secrets in the same codebase for the same pattern
**Output:** Secret rotated, code fixed, incident documented, process updated
**Handoff:** VP Eng reviews incident report; considers whether Glen needs to be informed

### SalarySage Server-Side Hosting Setup
**Trigger:** VP Eng directs that SalarySage is ready for proper server-side hosting (pre-external distribution)
**Steps:**
1. Identify the appropriate hosting model: Vercel serverless function, Vercel project, or lightweight server
2. Design the server-side API proxy: LLM API calls go through the server, key never reaches the client
3. Confirm with Senior Engineer that the SalarySage HTML/React code references the proxy endpoint, not the API directly
4. Set the LLM API key as a server-side environment variable (not `NEXT_PUBLIC_` prefix)
5. Set up access logging: SalarySage-Auth access log should write to a persistent, server-side log, not client-side text files
6. Test authentication flow, salary query flow, and access logging end-to-end
7. Document the hosting configuration
**Output:** SalarySage running with server-side API proxy, no exposed keys, working auth and logging
**Handoff:** VP Eng reviews; QA Lead runs acceptance tests before any external distribution

### Supabase Maintenance
**Trigger:** Scheduled (monthly) or triggered by VP Eng / Senior Engineer request
**Steps:**
1. Review Supabase dashboard: database size, connection pool usage, slow query log
2. Confirm automated backups are running and point-in-time recovery is enabled
3. Verify RLS policies are in place on all tables containing user data (confirm with Senior Engineer list of tables)
4. Review Supabase Auth settings: confirm email templates, redirect URLs, and auth provider settings are correct
5. Check for any Supabase-issued security advisories relevant to NBI's setup
6. Document any findings or changes
**Output:** Supabase health report, any changes made
**Handoff:** VP Eng receives summary

### Framer Website Deployment
**Trigger:** Website update ready for publication, directed by VP Eng or CMO/Head of BD
**Steps:**
1. Confirm the change has been reviewed by the requesting party before publishing
2. Publish via Framer dashboard
3. Verify the published page at nbi-consulting.com looks correct and links work
4. If a domain or DNS change is involved: escalate to VP Eng before making any changes — DNS changes have wide impact
**Output:** Updated website published and verified
**Handoff:** Requesting party confirms the published state is correct

## Escalation Triggers
- Any suspected security incident or exposed secret: escalate to VP Eng immediately
- Production deployment fails and cannot be resolved in 15 minutes: escalate to VP Eng, consider rollback
- Supabase database approaching capacity or performance degradation: escalate to VP Eng with data
- A new third-party service integration is requested: escalate to VP Eng before setting it up
- A domain, SSL, or DNS change is needed: escalate to VP Eng — do not make DNS changes without explicit approval
- Infrastructure costs have increased unexpectedly: flag to VP Eng
