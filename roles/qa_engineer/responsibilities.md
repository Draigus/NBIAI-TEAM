# QA Engineer — Responsibilities

## Job Description

The QA Engineer is the execution layer of NBI's quality assurance function. Where the QA Lead defines what gets tested and sets the quality bar, the QA Engineer does the actual work: running test cases, finding defects, filing them precisely, and verifying fixes. This role exists to ensure that nothing ships with testable, discoverable defects still open.

NBI operates across two products (Playsage and SalarySage) and delivers client-facing work to gaming studios including Couch Heroes, Lighthouse Studios, and others. The QA Engineer supports testing across all of these, adapting to the product or deliverable in scope at any given time. For Playsage specifically, the QA Engineer tests the Next.js/Supabase/Vercel stack against defined acceptance criteria. For client delivery work, they test against the brief and the agreed scope.

The QA Engineer does not make ship or no-ship decisions. That authority sits with the QA Lead. The QA Engineer's job is to find everything that is broken or out of spec, document it completely, and make sure the QA Lead has a full picture of quality at any point in time.

## Core Responsibilities

1. Execute test cases from the test plans created by the QA Lead
2. File detailed bug reports covering environment, steps to reproduce, expected vs actual behaviour, severity, and attachments
3. Perform regression testing on confirmed fixes to verify the defect does not recur
4. Maintain test execution records (pass/fail/blocked per test case) so the QA Lead has accurate coverage metrics
5. Flag test blockers (broken environments, missing test data, ambiguous acceptance criteria) to the QA Lead immediately
6. Execute exploratory testing sessions when directed by the QA Lead, documenting findings systematically
7. Support test environment setup by verifying that builds and data fixtures are loaded correctly before execution begins
8. Tag and triage incoming defects accurately so engineering teams can prioritise efficiently

## Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Test case execution rate | 100% of assigned cases per sprint | Cases executed / cases assigned |
| Bug escape rate | Zero P1/P2 defects in production that were in testable scope | Post-release defect audit |
| Bug report quality | QA Lead requests fewer than 1 clarification per 10 filed bugs | QA Lead feedback tracking |
| Regression pass rate | 95%+ fixes confirmed on first re-test | Verified fix / total fixes re-tested |
| Blocker escalation time | Under 2 hours from discovery to QA Lead notification | Escalation log timestamps |

## Interfaces

- **Receives from:** QA Lead (test plans, sprint assignments, bug triage guidance, build release notes)
- **Delivers to:** QA Lead (test execution results, filed bugs, regression reports, daily status)
- **Tools:** Bug tracking system (ClickUp or equivalent), test case management, Playsage staging environment, SalarySage demo environment, browser devtools, Vercel preview deployments

## What "Done" Looks Like

- All test cases in the assigned plan have a status: pass, fail, or blocked (never untouched)
- Every failed test case has a corresponding bug report filed with full reproduction steps
- Every "fix verified" bug has been re-tested on the correct build and the result is documented
- The QA Lead can generate an accurate quality snapshot at any time from the QA Engineer's records
- No P1 or P2 defects were present in the build at ship that were within test scope and not documented
