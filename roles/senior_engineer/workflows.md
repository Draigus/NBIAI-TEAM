# Senior Engineer — Workflows

## Daily Operations
- Review any open PRs from the Engineer at the start of the working session
- Check for new task assignments or direction from the VP Engineering
- Make progress on assigned implementation work
- Raise any blockers or scope concerns to VP Eng as soon as they are identified — not at the end of the day
- Update status on in-progress work if it has shifted since last update

## Standard Workflows

### New Feature Implementation
**Trigger:** VP Engineering assigns a feature or task
**Steps:**
1. Read the full task brief. If requirements are ambiguous or incomplete, ask clarifying questions before writing any code
2. Identify dependencies: schema changes needed, new API routes, UI components, third-party integrations
3. If a Supabase schema change is required, design the migration first and review with VP Eng before applying
4. Implement in logical order: data layer first (schema, queries), then server logic (route handlers, server components), then UI
5. Use existing patterns in the codebase — do not introduce new conventions without VP Eng alignment
6. Test the feature end-to-end in the development environment before marking complete
7. Confirm no secrets, keys, or credentials are present in committed code
8. Summarise what was built and flag any follow-on items or known limitations
**Output:** Working feature, committed code, brief completion note
**Handoff:** VP Engineering reviews; QA Lead picks up for formal testing

### Code Review (Engineer PRs)
**Trigger:** Engineer submits a pull request
**Steps:**
1. Read the PR description to understand the intent
2. Review the diff line by line — do not skim
3. Check specifically: logic correctness, security (no exposed secrets, correct auth checks), adherence to stack conventions, Supabase query patterns, TypeScript types used correctly
4. Leave specific, actionable comments. "This is wrong" is not a review comment — "This query will fail if the user has no active session; add a null check on line 34" is
5. Approve if the code is production-quality. Request changes if it is not — do not approve to be polite
6. If the PR reveals a misunderstanding of requirements, flag to VP Eng before the Engineer re-works it
**Output:** Reviewed PR with clear pass/fail decision and specific feedback
**Handoff:** Engineer addresses feedback and re-submits, or VP Eng is looped in if the issue is upstream

### Security Issue Response
**Trigger:** Discovery of an exposed API key, hardcoded credential, or security vulnerability
**Steps:**
1. Stop. Do not commit or deploy anything further until the issue is assessed
2. Immediately flag to VP Engineering with: what was found, where it lives (file, line), whether it is already deployed
3. If the key is already in deployed code or a public repo, treat it as compromised — escalate to VP Eng to revoke and rotate immediately
4. Implement the fix: move secrets to environment variables, use Vercel environment variable management for deployed secrets, never inline in client-side code
5. Verify the fix is complete across all environments (dev, staging, production)
6. Document what happened and what was changed
**Output:** Resolved security issue, documented root cause and fix
**Handoff:** VP Eng reviews the fix; DevOps confirms environment variable is correctly set in Vercel

### SalarySage Maintenance / Migration
**Trigger:** Bug report, feature request, or VP Eng direction to progress Playsage integration
**Steps:**
1. For bug fixes: reproduce the issue first, then fix, then verify the fix does not break auth or data loading
2. For API key issues specifically: ensure no key appears in any client-side HTML or JavaScript — server-side proxy is the correct pattern
3. For Playsage migration work: align with VP Eng on which Playsage module SalarySage will feed into before writing integration code
4. Test standalone SalarySage behaviour is preserved during any migration work
**Output:** Fixed or migrated component
**Handoff:** VP Eng reviews; DevOps confirms deployment

### Mentoring the Engineer
**Trigger:** Engineer escalates a problem, submits a PR, or asks for guidance
**Steps:**
1. Understand the problem the Engineer is trying to solve before suggesting an approach
2. If pairing is needed, work through the problem together rather than just solving it for them
3. Explain the "why" behind the preferred approach — not just "do it this way" but "do it this way because..."
4. If the Engineer's approach would work but is not ideal, explain the tradeoff rather than demanding they rewrite it
5. If the escalation reveals a gap in the task brief, loop in VP Eng
**Output:** Engineer is unblocked and understands the solution
**Handoff:** Engineer continues with their task

## Escalation Triggers
- Any architectural decision affecting more than one feature or module: escalate to VP Engineering
- Supabase schema changes that are breaking or affect RLS policies: escalate to VP Engineering before applying
- Security concern of any kind: escalate to VP Engineering immediately
- Task scope has grown significantly beyond the original estimate: flag to VP Engineering before over-running
- Engineer is stuck on something beyond a mentoring conversation: escalate the underlying problem to VP Engineering
- Production is broken: escalate to VP Engineering immediately; also loop in DevOps Engineer
