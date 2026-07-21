---
source: granola
source_id: not_ZcfWFukyOSn4KV
source_path: https://notes.granola.ai/d/41852d3f-9031-4a2f-b501-b80bba5c3178
ingested: 2026-07-21
topics_detected: [meeting-facilitation, ryg-framework, priority-scoring, executive-meetings, action-capture]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Executive Meeting Facilitation: R/Y/G Status Framework and Multi-Column Priority Scoring

## Key Content

Meeting facilitation model for game studio executive and leadership meetings, designed to prevent rat-holing and enforce delivery accountability.

**R/Y/G status framework:**
- Green: topic is moving; move on in meeting.
- Yellow (watching): flag for awareness; no intervention needed today.
- Red-with-mitigation: problem identified, mitigation agreed, owner confirmed; record and close in meeting.
- Red-needs-help: problem needs intervention; agree what help is needed, schedule a focused follow-up meeting; do not detail in the exec meeting.
- Purple: done; acknowledge and move on.

**Facilitation mechanic:** Facilitator drives people to date-commit on actions, not just "I'll do that." Push for specific deliverable + date + owner. When a topic goes red, agree on help needed and book a focused follow-up; extract it from the exec meeting immediately.

**Meeting hierarchy (example):** C-level = high-level status only; Directors/Leads = more detail; Executive/SLT = tactical (rat-holes badly; facilitator required to keep it moving); Operations meeting = weekly cadence.

**Multi-column priority scoring:**
- Divide company work into columns by domain: Ops, Business, Game, Tech, Studio.
- Assign separate priority scores within each column (1 = highest priority in that column).
- The item with the lowest aggregate score across all columns is the company's current priority 1.
- This surfaces cross-domain blockers that a single-list priority approach would miss.

**AI integration:** Use Granola (or equivalent) to capture transcripts; extract action items via AI post-meeting to populate the tracker. Facilitator's role is to drive actions and dates in the meeting; AI handles capture and formatting.

## Decisions / Insights

- Pattern: executive meetings rat-hole when tactical detail is raised without a facilitator; a dedicated facilitator with R/Y/G authority is the fix.
- Pattern: multi-column priority scoring (lowest aggregate = company priority 1) surfaces cross-domain blockers that a single priority list hides.
- Pattern: R/Y/G Purple (done) is often omitted in RAG frameworks; including it creates a complete signal set and allows clean closure.
- Anti-pattern: "I'll do that" without date and owner is not an action; facilitator must push for both before moving on.

## Context

Derived from an onboarding session for a new project manager at a ~55-person UK game studio, 20 Jul 2026. The facilitation model was designed to address a specific problem: SLT executive meetings were running long and poorly focused due to tactical rat-holes. The multi-column priority scoring was designed to replace a manual Excel priority list that was not surfacing cross-function blockers.

## Applicability

Relevant when: a client studio's executive meetings are running over or losing focus -- the R/Y/G model with dedicated facilitation is the practical fix; can be set up in one meeting.
Relevant when: a studio's priority list is a single flat backlog -- multi-column scoring (Ops/Business/Game/Tech/Studio) is the structural upgrade; lowest aggregate score identifies company priority 1.
Relevant when: a studio is onboarding a new PM or producer -- this facilitation model is a concrete day-one deliverable; set up R/Y/G tracking and multi-column priority in week 1.
Relevant when: a studio uses Granola or any transcript tool -- AI-assisted action extraction post-meeting is a practical way to maintain action logs without manual note-taking.
