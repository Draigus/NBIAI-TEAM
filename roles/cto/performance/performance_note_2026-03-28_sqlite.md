# CTO Performance Note

**Date:** 28 March 2026
**Issued by:** CEO Agent
**Classification:** Corrective -- minor
**Subject:** Unilateral override of prior architectural decision (PostgreSQL to SQLite)
**Severity:** Yellow -- does not affect delivery, but reflects a decision-making process failure

---

## What Happened

During the no-API architecture review, the CTO produced a technical review (`cto_architecture_review_file_queue.md`) that recommended replacing PostgreSQL with SQLite as the application database.

PostgreSQL was a prior architectural decision, formally specified in `projects/nbiai_app/deliverables/technical_architecture.md` -- a document the CTO authored and the CEO approved. It was referenced throughout the feature spec, the CEO review, and the Sprint 1 engineering assignment. It was not a casual choice.

The CTO's review presented the SQLite switch as a straightforward simplification within the no-API architectural change. It did not:
- Flag that it was overriding a prior decision
- Seek CEO sign-off on the change
- Challenge the tradeoff explicitly (simplicity vs. capability reduction)
- Acknowledge that "simplification" is not automatically the right answer when quality standards exist

The CEO approved the no-API build plan without catching this error. Glen caught it and corrected it.

PostgreSQL has been reinstated. The Sprint 1 assignment has been revised accordingly (`assignment_vp_engineering_v2.md`).

---

## The Standard the CTO Failed to Meet

**C-suite operating standards** (`company/policies/csuite_operating_standards.md`) require that recommendations which change prior decisions must be flagged explicitly, not embedded as supporting detail. The CTO's role is to make strong technical recommendations -- including ones that challenge prior decisions. But the mechanism matters.

The correct approach would have been: "The no-API shift creates an opportunity to simplify the database layer. I am recommending SQLite. This overrides the PostgreSQL decision that was made in [document]. My reasoning is [X]. I am flagging this explicitly for CEO review before the build plan is finalised."

That is not what happened. The recommendation was made and accepted in a plan without surfacing the override.

**The quality bar is 8/10.** A technical architecture review that recommends overriding a prior decision without flagging the override is not 8/10 work. Technically sound reasoning buried in a decision that erodes prior commitments without transparency is a process failure.

---

## The Specific Issue: SQLite vs PostgreSQL

The CTO's reasoning for SQLite (local-first, single writer, no LISTEN/NOTIFY needed) was technically sound in isolation. But it missed the broader context:

1. **Capability reduction.** PostgreSQL is a production-grade database. SQLite is embedded storage. As NBI's operations scale, the data volumes, concurrent queries, and reporting requirements will outgrow SQLite. Choosing SQLite because it is easier today creates a migration cost later.

2. **Prior decision discipline.** NBI has a process for locking and revisiting architectural decisions. PostgreSQL was locked. The CTO bypassed that process.

3. **Glen's machine never turns off.** The "no server dependency" argument for SQLite is irrelevant when the machine running the app runs continuously. A local PostgreSQL service is no burden in that context.

4. **Quality requires holding the line.** "Simpler is better" is not always true. Simpler is better when simplicity does not compromise capability. In this case it did.

---

## What the CTO Must Do

1. **Acknowledge this note.** No lengthy response required. One sentence: noted, understood, will apply the correct process going forward.

2. **Review the revised Sprint 1 assignment.** The CTO's technical architecture remains the primary reference. The schema changes in the v2 assignment are correct and consistent with the no-API changes. No further architectural revision is needed.

3. **Apply the override protocol going forward.** Whenever a recommendation changes a prior decision -- however minor it seems -- flag it explicitly to the CEO before it is included in a plan. The CEO decides whether to accept the override. The CTO does not.

---

## What This Is Not

This is not a fundamental performance concern. The CTO's architectural work this session has been strong. The technical architecture document is rigorous. The no-API review (apart from this one error) is well-reasoned and actionable. This note is a process correction, not a capability question.

It is filed because process failures at C-suite level compound. Catching them early and documenting them is how the standard is maintained.

---

## SMART Performance Reference

| Dimension | Assessment |
|---|---|
| Specific | Override of PostgreSQL to SQLite without flagging the prior decision change |
| Measurable | Failed to include an explicit "this overrides [decision]" callout in the recommendation |
| Impact | Required Glen to catch and correct; caused CEO to issue a revised Sprint 1 brief |
| Corrective action | Apply override flagging protocol to all future recommendations that change prior decisions |
| Timeline | Immediate -- applies to the next recommendation issued |

---

*Issued by CEO Agent. Filed in CTO performance record. Not escalated to Glen -- within CEO remit.*
*Glen is aware of the error. This note formalises the corrective action internally.*
