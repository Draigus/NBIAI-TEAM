---
source: granola
source_id: ad9cc165-c76f-49f4-8f68-e282b61f99e7
source_path: https://notes.granola.ai/d/ad9cc165-c76f-49f4-8f68-e282b61f99e7
ingested: 2026-06-23
topics_detected: [worksage, product, ux, feature-requirements, slack-integration, ai]
relevance_score: 9
novelty_score: 8
actionability_score: 10
bank_candidates: [personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# WorkSage UX Requirements: Plus-Button Entry, Visibility Controls, AI Summary

## Key Content

Four WorkSage product requirements surfaced from a CH HR lead working session (2026-06-23). These came from a real client user, not internal testing.

**1. Rapid task creation (plus-button + inline edit)**
- Current pain: too many clicks to add a task, feature, or story (click project, scroll to section, click "add", fill panel)
- Fix: contextual plus button at the left of each section; clicking opens a centre modal
- Inline: after clicking plus, user names the task directly in-line without opening the side panel
- Keyboard shortcut also requested (ClickUp's Ctrl+Enter pattern as reference)

**2. Row-level visibility controls per project**
- Default: owner + admins only (admins always have access)
- Eye icon toggle per project: open = accessible to all with project access; closed = restricted
- When restricted: dropdown of all users lets owner grant discrete individual access
- Applies across all item types: tasks, features, stories, epics

**3. AI project summary with Slack Canvas delivery**
- Feature: focus on a project, consume all detail, generate a written summary
- Save to Documentation tab as a named report
- "Send to Slack" button: multi-person dropdown + Channel/Canvas selector to append to a specific Canvas
- Use case confirmed: CH HR lead runs weekly HR meetings in WorkSage and wants to auto-send summaries to the active Slack Canvas used by the team
- Canvas strategy: archive periodically, keep active Canvas as the current-week summary

**4. Personal work list with restricted visibility**
- A project created for a specific user's personal tasks (not tied to any active project)
- Default access: owner + admins only
- Use case: HR lead transitioning personal task tracking from Slack into WorkSage

## Decisions / Insights

- Glen decided: build plus-button task creation with centre modal and inline naming
- Glen decided: build row-level visibility controls with eye-icon toggle applying to all item types
- Glen decided: build AI project summary with Slack send and Canvas append
- Glen decided: create a personal work list project type with restricted visibility by default
- Pattern observed: client users will not use a PM tool that requires too many clicks for basic task entry -- rapid entry is table stakes

## Context

Working session between Glen and Lorenza Menna (CH Head of HR), June 2026. Lorenza is an active WorkSage user managing CH HR processes. Requirements gathered from her direct experience using the tool; all four items surfaced organically from friction in her workflow.

## Applicability

Relevant when: Glen is planning WorkSage development sprints -- these are confirmed client-validated requirements with named use cases.
Relevant when: assessing WorkSage's readiness for additional client users -- rapid task entry and visibility controls are baseline expectations.
Relevant when: pitching WorkSage to a new client with HR or ops users -- AI summary + Slack Canvas delivery is a differentiator worth demonstrating.
Relevant when: reviewing WorkSage against ClickUp or Notion for a client -- plus-button rapid entry is specifically what CH users missed from ClickUp.
