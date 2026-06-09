<!-- DEPRECATED 2026-06-09: This file is no longer separately maintained. State is now captured within session log entries. See the most recent session log for current state. decisions.md remains the only separate live state file. -->

# Conversation Context

Updated 2026-05-07

---

## 2026-05-07

### What Happened

Glen requested a full bug triage from the WorkSage bug tracker. 15 items found: 6 already at please_review, 9 open. All 9 audited against the codebase to confirm root causes before fixing.

**Bug batch (8 fixes):**
1. Task sort order non-deterministic (ORDER BY tiebreaker)
2. People filter showing unassigned children (visibleIds extended)
3. Multi-user sync destroying focus (detail panel guard in _softReRender)
4. 5-digit years accepted in dates (client + server validation)
5. CSV import dropping due dates (parseDdMmYyyy + column name variants)
6. Features/stories can't auto-calculate dates (computeDateRange + disabled inputs)
7. Date paste not normalised (global paste handler for DD/MM/YYYY)
8. Warnings not dated (since field from updatedAt)

**Code review caught 3 additional issues:** missing ORDER BY tiebreakers on 3 other endpoints, no refresh on detail panel close, sync/changes endpoint missing year validation. All fixed.

**Gantt timeline bug:** Glen reported bars not landing where dragged. Root cause: toISOString() used UTC dates (off by 1 day in BST), plus deferred re-render caused visible jump. Fixed with local date formatting and removed deferred re-render.

**Client portal bug:** Lorenza (Couch Heroes) couldn't access dashboard. Root cause: client_role was null despite role being admin. Fixed in DB. Also found localStorage cache leak where previous user's data was visible on login switch. Fixed with user-change detection.

**Playwright verification:** agent-browser couldn't handle the SPA, but Playwright works. Created verify-bug-batch.spec.js with visual confirmation of sort order, year validation, auto dates, and no JS errors. Also fixed pre-existing buildMultiSelect null crash that was breaking all e2e tests.

### Current State
- Master at commit `2c2ee03`
- 387/387 unit tests passing (33 files, 3 new)
- Playwright e2e: smoke + tasks + verification passing
- PM2: all 5 processes online
- 1 parked bug: "Hide Done Hides All Tasks" (unreproducible)
- Gantt drag fixed but needs Glen's visual confirmation
- 8 bug tracker items set to please_review with fix comments

---

## 2026-06-04 - Couch Heroes Zone Population Architecture Reviews

Glen has iterated several versions of the Couch Heroes zone population architecture document and requested hostile technical review from network engineer, CTO, and senior engineering perspectives.

Latest pass: Glen provided `C:\Users\gpbea\.codex\attachments\90ee778c-06fa-4757-a031-ea20b68eb942\pasted-text.txt`, version 3.0. v3.0 is substantially stronger and now reads like a full technical specification. Remaining issues are mostly over-specific competitor implementation claims, prototype assumptions worded as capacities, corruption/housing implementation detail that needs caveats, and a cost-table high-end arithmetic mismatch.

Final document pass: Glen provided `C:\Users\gpbea\.codex\attachments\6289f8ac-276e-4a1f-91b4-c14415605ace\pasted-text.txt`. Architecture is aligned and defensible, but final clean-up is still needed before sending: soften Palia causality, correct WoW sharding/layering history, clarify hub players are not overworld zone-server load, make corruption/housing capacity statements prototype assumptions, fix cost high-end to about `$55.9K`, and distinguish inherent DDoS severity from residual risk after Spectrum.
