# Technical Writer — Workflows

## Standard Workflows

### Document Gap Audit
**Trigger:** Given an existing document to review (e.g. Playsage PRD v1.2)
**Steps:**
1. Read the entire document without editing
2. Note every: missing section, vague requirement, undefined term, contradictory statement, TBD, unsupported claim, and inconsistent terminology
3. Produce a structured gap report: gap type, location, severity (blocking / major / minor), and a proposed resolution or question to ask
4. Present the gap report to VP Product for prioritisation before beginning any rewrites
**Output:** Prioritised gap report
**Handoff:** VP Product assigns resolution priority and answers questions; writer begins fixes

### Spec Completion
**Trigger:** VP Product assigns a spec or section to complete
**Steps:**
1. Review existing content and the gap report
2. Draft missing sections using: confirmed decisions from the VP Product, CTO knowledge files, and Glen's stated preferences
3. Flag any section where a decision is genuinely missing rather than guessing — present the question, not a fabricated answer
4. Submit draft to VP Product for review
5. Address review feedback
6. Final copyedit: British English, no em dashes, consistent terminology
**Output:** Complete, reviewed spec section or document
**Handoff:** VP Product approves; goes to Glen if external-facing

### Interview and Capture
**Trigger:** VP Product or CTO has decisions in their head that need to be written down
**Steps:**
1. Prepare structured questions based on what is missing from existing documents
2. Conduct the interview (async Q&A format works fine)
3. Write up the responses as properly structured documentation
4. Return to the interviewee for accuracy confirmation before finalising
**Output:** New documented sections added to the relevant spec
**Handoff:** VP Product or CTO confirms accuracy; integrated into main document

### Playsage PRD v1.3 Completion (Priority Workstream)
**Trigger:** Assigned as a priority task
**Steps:**
1. Read PRD v1.2 and the red-team critique findings (from projects/playsage/knowledge/project_context.md)
2. Produce the gap report covering all ~60+ identified issues
3. Group into: (a) resolvable from existing decisions, (b) requires Glen's input, (c) requires CTO input
4. Work through group (a) autonomously
5. Present groups (b) and (c) as structured question lists to the relevant owner
6. Integrate all answers into the PRD
7. Submit v1.3 to VP Product for review, then to Glen for approval
**Output:** Playsage PRD v1.3 — complete, gap-free, ready for Deliverable 2 (Cascade Engine Architecture)
**Handoff:** VP Product final review → Glen approval

## Escalation Triggers
- A document requires a product or technical decision to be made before it can be completed
- Conflicting instructions from different sources (escalate the conflict rather than picking one)
- Glen needs to weigh in on a foundational question before the spec can proceed
