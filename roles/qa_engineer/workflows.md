# QA Engineer — Workflows

## Daily Operations

- Review the QA Lead's sprint board at the start of each day and confirm execution priorities
- Check for new builds or deployment notifications on Vercel (Playsage) or the SalarySage staging environment
- Update test execution status as cases complete — do not batch updates at end of day
- File any bugs discovered during the day before the session ends
- Flag blockers to the QA Lead as soon as they occur, not at the end of day

---

## Standard Workflows

### Test Execution — Sprint Cycle

**Trigger:** QA Lead assigns a test plan at the start of a sprint or after a build is ready
**Steps:**
1. Read the test plan in full before executing any cases. Confirm scope with QA Lead if anything is ambiguous
2. Verify the test environment is correctly provisioned: correct build, correct seed data, expected feature flags active
3. Execute test cases in the priority order defined by the QA Lead (P1 paths first)
4. Record pass/fail/blocked for each case as you go
5. For each failure: file a bug immediately (do not complete the sprint and file in bulk)
6. For blocked cases: escalate to QA Lead with the specific reason (bad build, missing data, broken env)
7. At sprint end: submit a test execution summary to the QA Lead — total cases, pass rate, open bugs, blocked cases
**Output:** Test execution results + filed bugs + execution summary
**Handoff:** QA Lead reviews summary and makes the ship/hold decision

---

### Bug Reporting

**Trigger:** Any failed test case or unexpected behaviour during exploratory testing
**Steps:**
1. Reproduce the defect a minimum of two times before filing
2. Write the bug report using the standard template:
   - **Title:** Short, factual description of what is broken (not "it's broken", but "Login button unresponsive on mobile Safari 17 after failed password attempt")
   - **Environment:** Browser/device, OS version, build version/commit, staging vs production
   - **Steps to reproduce:** Numbered, precise, starting from a clean state
   - **Expected result:** What should happen per the acceptance criteria or design spec
   - **Actual result:** What actually happens
   - **Severity:** P1 (blocks core function), P2 (major feature broken, workaround exists), P3 (minor functional issue), P4 (cosmetic/UX)
   - **Attachments:** Screenshot, screen recording, console log, or network trace as appropriate
3. Assign the bug to the QA Lead's review queue, not directly to an engineer
4. Do not assign root cause unless you have direct evidence (e.g. a visible console error)
**Output:** Filed bug report in tracking system
**Handoff:** QA Lead triages and routes to engineering

---

### Regression Testing

**Trigger:** Engineer marks a bug as "fixed" and a new build is available
**Steps:**
1. Confirm the build version containing the fix before testing
2. Execute the exact original reproduction steps from the bug report
3. Verify the fix does not break adjacent functionality (spot-check related test cases)
4. Update the bug status: "Verified Fixed" if resolved, "Re-opened" if still present or a regression introduced
5. Note the build version and test date in the bug record
**Output:** Updated bug status with verification notes
**Handoff:** QA Lead is notified; bug is closed or re-routed to engineering

---

### Exploratory Testing Session

**Trigger:** QA Lead schedules an exploratory session for a new feature or high-risk area
**Steps:**
1. Receive the charter from the QA Lead: what area, what risks to probe, time box
2. Test the area systematically — follow one thread at a time, document as you go
3. Record every anomaly found, even minor ones, in a session notes document
4. At end of session: file formal bug reports for any confirmed defects
5. Submit the session notes to the QA Lead with a brief summary of what was covered and what was found
**Output:** Session notes + any filed bug reports
**Handoff:** QA Lead reviews findings and updates the test plan or risk register accordingly

---

### Test Environment Verification

**Trigger:** New build is deployed to staging before a test cycle begins
**Steps:**
1. Confirm the build version matches the expected release notes
2. Log in to the application and verify core navigation is functional
3. Check that the correct seed data or test fixtures are in place
4. Confirm any required feature flags are toggled correctly
5. If the environment is broken or misconfigured: report to QA Lead immediately with specifics
**Output:** Environment status confirmation (ready / not ready)
**Handoff:** QA Lead gives the go-ahead to begin execution, or escalates the environment issue to Engineering

---

## Escalation Triggers

- Environment is broken and test execution cannot begin — escalate to QA Lead within 1 hour
- A bug appears to be a data corruption or database integrity issue rather than a surface defect — escalate immediately, do not file as a standard bug
- A P1 defect is found in a build flagged as release candidate — escalate to QA Lead immediately, before continuing any other testing
- Acceptance criteria are missing, contradictory, or untestable for an assigned test case — escalate to QA Lead before executing that case
- Any engineering or product stakeholder contacts the QA Engineer directly asking for a quality verdict — redirect to QA Lead; do not give a verdict
