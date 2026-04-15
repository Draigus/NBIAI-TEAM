# Magnus Pryer — Feedback Assessment
**Date:** 2026-04-14
**Scope:** 38 bug reports + 6 comments authored by Magnus Pryer
**Author:** Claude
**Purpose:** For each item, assess implementation complexity and whether it is a good idea based on usability. Tells Glen what to greenlight, defer, rethink, or reject.

## Summary

| Category | Count |
|---|---|
| Already resolved (in good shape) | 11 |
| Pending review (need Glen's confirmation they match intent) | 18 |
| Still open | 12 |
| Comments on other items | 6 |

**Headline take:** Magnus is a sharp, thorough tester. She has filed clear reproductions for real bugs, and her feature specs are unusually detailed. The weakness is that a few of her biggest specs (especially the Hiring Page and the Warnings Sidebar) are over-designed relative to the value they deliver — scope that would take 2–3× as long to build as the actual functional need. Greenlight the bugs, merge most of the features as-shipped, and push back on the Hiring rework before building anything else.

**Complexity legend:** Trivial (<1h) • Small (1–4h) • Medium (0.5–2d) • Large (3–5d) • Very Large (1+ week)
**Usability verdict:** ✅ Solid • ⚠️ Marginal (has issues) • ❌ Problematic (would hurt UX)
**Recommendation:** 🟢 Do it • 🟡 Defer • 🔵 Already done, close out • 🔴 Skip / rethink

---

## Section A — Already Resolved (11)

Magnus filed these and they were fixed in prior sessions. Noting for completeness; the work is done.

| # | Title | Verdict | Note |
|---|---|---|---|
| 1 | Leads Page Misshow | 🔵 Done | Sidebar link worked but top-bar link threw an error. Fixed. |
| 2 | Embed Ticket Files via SharePoint Link | 🔵 Done | Attachments table now supports links alongside files. Good idea, heavily used pattern in the industry. |
| 3 | Ticket Filters (multi-select) | 🔵 Done | Solid UX improvement. Fixed the dropdown-auto-close bug her follow-up flagged. |
| 4 | Page Up on ticket select | 🔵 Done | Her follow-up ("still occurs") was true — the first fix caught the wrong scroll container. Final fix captures `.tasks-layout__main`. |
| 5 | Consolidate "Ticket" Terminology | 🔵 Done — but the opposite way | Magnus asked us to standardise on "Ticket". We went the other way and standardised on "task / story / feature / project" (the 4-level hierarchy), because that's what the data model uses. **Worth confirming with her that she is OK with this direction** — her spec uses "ticket" consistently so she may still prefer it. |
| 6 | NBI OPS Client Redundancy | 🔵 Done | Right call — duplicates are confusing. |
| 7 | Mark Ticket as Blocked popup | 🔵 Done | The popup flow shipped. But see B.14 below — the bug is that setting a status to Blocked doesn't always stick on the record itself. |
| 8 | Bug Report modal auto-close | 🔵 Done | Catching a missed-click and losing a long report is infuriating. Correct fix. |
| 9 | Imminent / Late time-based filters | 🔵 Done | Strong usability win. The "Imminent" concept is genuinely useful. |
| 10 | Report Editing (post-submit) | 🔵 Done | Needed for error correction. Done. |
| 11 | Report Status Failure | 🔵 Done | Member role couldn't PATCH reports (admin-only). Fixed — any user can now move status. |

---

## Section B — Pending Glen Review (18)

These are shipped and sitting in `please_review`. Assessment of whether the implementation matches intent, any remaining usability concerns, and whether Magnus's underlying idea is sound.

### B.1 — HC Page and Board (a6c82c8c)
- **Original ask:** Dashboard, ticket view, leads board, and clients page for human capital.
- **What shipped:** Renamed Human Capital to Organisational. Added a "Practices" sidebar section (All / Organisational / Gaming / General) that filters every view at once. Each task, lead, and client now has a Practice dropdown. Added 7 new lead work types for organisational consulting.
- **Complexity shipped:** Medium
- **Usability:** ✅ Solid. The filter-across-all-views approach is better than duplicating the UI per practice.
- **Recommendation:** 🔵 **Ship as-is.** Magnus's framing ("we need a whole separate dashboard") was actually too heavy — a cross-cutting filter is cleaner.

### B.2 — "Complete" Marker on Won Leads (2f1b052a)
- **Complexity shipped:** Small
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship. Clean little fix, exactly what was asked for.

### B.3 — Client Page (f2d01b72)
- **Original ask:** A page per client showing studio size, current studio project, active contracts (click-through), total SoW value, contacts with mailto links, hiring positions, and an abbreviation setting.
- **What shipped:** Added to the Manage Clients view. Implemented studio_size, current_studio_project, active contracts count (click-through), total SoW value (summed from Won leads), hiring positions count, mailto links on contact emails. A "Gather Portfolio Detail Information" button that is honest about not being wired to a live search backend.
- **What's missing vs. the spec:** The abbreviation setting ("CH" for Couch Heroes, "LH" for Lighthouse) was not built. Small omission.
- **Complexity shipped:** Medium
- **Usability:** ✅ Solid. Good info density.
- **Recommendation:** 🔵 Ship. 🟡 Add abbreviation field as a tiny follow-up (~1h).

### B.4 — SoW Upload (2ecd1a01)
- **Complexity shipped:** Large (built a proper pricing/legal filter on top of pdf-parse with 47 unit tests)
- **Usability:** ✅ Solid. The "never store the original PDF, only the filtered text" choice protects NBI from accidentally leaking pricing to team members who shouldn't see it.
- **Recommendation:** 🔵 Ship. 🟡 One gap: the filter is best-effort (deny-list based). A well-formatted SoW with unusual structure could leak a number. For the volume you run today this is fine; worth revisiting if SoW uploads scale.

### B.5 — Warnings & Alerts Sidebar (686572d9)
- **Original ask:** Floating red bell top-right, slide-in panel with Warnings + Alerts tabs, per-item click-through to detail. Complex notification card layout with abbreviations, dates, click-to-expand, alerts-greyed-out-when-read, etc.
- **What shipped:** Floating red bell in the top-right. Slide-in panel with Warnings and Alerts tabs. Per-item snooze (1 day / 1 week). Severity-colour cards.
- **Complexity shipped:** Medium
- **Usability:** ⚠️ Marginal. Two issues:
  1. **The bell gets obscured by the header bar** (Magnus flagged this herself in ticket B.16 "Warning Button Obscured" and C.7 "Header Bar Obfuscation"). Still open.
  2. The spec's "click-to-expand for details" flow is not implemented; cards click through to the detail panel. This is actually fine — simpler and more consistent — but worth confirming with Magnus it matches her intent.
- **Recommendation:** 🟢 **Fix the z-index issue on the bell** (trivial, 15 min). Then 🔵 ship. Push back gently on the more elaborate spec elements — what's shipped covers 90% of the value.

### B.6 — Report Confirmation Popup Layering (c6ae864a)
- **Complexity shipped:** Trivial
- **Usability:** ✅ Solid. Fixed a z-index bug.
- **Recommendation:** 🔵 Ship.

### B.7 — Notifications Redirect Fail (b6c00390)
- **Complexity shipped:** Small
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship.

### B.8 — Notification False Information (7da50041)
- **Complexity shipped:** Trivial (DB row text update)
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship. Also see comment C.4 — Magnus flagged separately that "Dependencies" vs "Prerequisites" nomenclature is inconsistent. Worth a tiny follow-up to standardise.

### B.9 — Blocked Fields (884aa6cd)
- **Original ask:** "Blocked" should only appear in Health OR Status, not both.
- **What shipped:** Removed Blocked from Health. Still available as a Status.
- **Complexity shipped:** Trivial
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship. **But see B.14 — there's a separate still-open bug where setting status to Blocked doesn't actually persist on the ticket.**

### B.10 — Ticket Description Box Split (43d04db8)
- **Original ask:** Split description into Description of Work / Collaborations / Success Factor with specific placeholder copy.
- **What shipped:** Done, including the 3 sub-fields in both inline and overlay panels. 15-character minimum on Description of Work (also her B.12 request).
- **Complexity shipped:** Small
- **Usability:** ✅ Solid. Helps enforce writing discipline — good for a consulting shop.
- **Recommendation:** 🔵 Ship.

### B.11 — Hourly Rate in Settings (e7a24f2a)
- **Complexity shipped:** Trivial (admin gate)
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship.

### B.12 — Repeatable Ticket (61f54b31)
- **Complexity shipped:** Medium
- **Usability:** ✅ Solid. The auto-clone-on-close pattern is better than what she asked for (which was manual).
- **Recommendation:** 🔵 Ship. Worth making sure Magnus knows the clone happens on Done / Cancelled, not manually.

### B.13 — Cancelled Project Cancels Tasks (a72b1688)
- **Complexity shipped:** Medium (recursive cascade + confirmation)
- **Usability:** ✅ Solid. Correct default behaviour.
- **Recommendation:** 🔵 Ship.

### B.14 — Calendar Events (7b5b0f6a)
- **Original ask:** Event types (Vacation, Sick Leave, Bank Holiday, UTO, Business, Other), visibility toggles, filter by team / event type / employee, client-visible time off.
- **What shipped:** All 6 event types. 4-tier visibility (private/team/client/public). Client-scoped visibility routes automatically via task assignment. Filter by team. Create/edit/delete flow.
- **Complexity shipped:** Large
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship. **Edge case to confirm with Magnus:** the spec says "clients may enter time off dates on the calendar" — this was not built (it would require a client-facing portal). Low priority but worth telling her it's not in scope yet.

### B.15 — Standup Completed Tasks Collapsible (0b7e23dc)
- **Complexity shipped:** Trivial
- **Usability:** ✅ Solid. Defaults to collapsed.
- **Recommendation:** 🔵 Ship.

### B.16 — Client Sorting on My Work (271ddd10)
- **Complexity shipped:** Trivial (comparator used direct field instead of resolved-via-parent-chain)
- **Usability:** ✅ Solid.
- **Recommendation:** 🔵 Ship.

### B.17 — Ticket Creation Mandatory Fields (8304fb00)
- **Complexity shipped:** Medium (server-side validator walks parent chain for inherited client)
- **Usability:** ✅ Solid. Enforced at transition to In Progress / In Review / Done rather than at creation so rough drafts are still possible.
- **Recommendation:** 🔵 Ship.

### B.18 — Teams System (01daa43b)
- **Complexity shipped:** Large (new tables, 9 endpoints, team modal, member roles, calendar filter-by-team)
- **Usability:** ✅ Solid for the foundation.
- **Recommendation:** 🔵 Ship. **Next step when needed:** actually wire teams into workflows — automated team DM on SoW win, team dashboards, etc. Not urgent until you have more than 2–3 teams active.

---

## Section C — Still Open (12)

These need a decision. Some are real bugs, some are good feature ideas, and a few need to be pushed back on.

### C.1 — Work Organisation: Client > SoW > Project > Tickets (cb32b7f9)
- **Complexity:** Large. The data layer is already there (SoW layer shipped in B.4) but the sidebar tree, the hierarchy view, and every filter and report needs to understand the new level.
- **Usability:** ⚠️ Marginal. This sounds obviously good on paper but I'd caution: adding a level to a hierarchy doubles the navigation cost for everything above it. With 7 active clients × avg 2 SoWs × avg 3 projects = 42 nodes, you probably get a better result with a flat SoW filter at the top of the Projects view than with a 4-level tree.
- **Recommendation:** 🟡 **Defer and reframe.** Before building, talk to Magnus: show her the current SoW upload flow and ask what specific task would be easier if SoW were a navigation level. The most likely real need is "show me everything for SoW X" — which is a filter, not a tree level.
- **Magnus's own follow-up comment** confirmed SoW upload wasn't what she was asking for here — so this is explicitly still open.

### C.2 — Due & Late Ticket Warning System (f3a5e888)
- **Complexity:** Medium (server-side cron + email templates)
- **Usability:** ✅ Solid, genuinely useful for a remote-first consulting team.
- **Blocker:** 🔒 SMTP not configured. Needs Glen to decide email provider (SendGrid? Postmark? SES?) before any of this can ship.
- **Recommendation:** 🟢 **Ready to build once SMTP decision is made.** The detection logic is already in place (it feeds the Warnings sidebar). Only missing piece is the email send step.

### C.3 — PM Report System (ae561c32)
- **Complexity:** Medium
- **Usability:** ✅ Solid.
- **Blocker:** 🔒 SMTP.
- **Recommendation:** 🟢 Build once SMTP is live. Roll this and C.2 together into a single "notifications and reports via email" sprint.

### C.4 — Gantt Chart (86be4df5)
- **Original ask:** Show task dependencies in the calendar view detail panel.
- **Reality:** Already done. Task detail panel shows a Prerequisites section. Dependencies are visible from both the calendar and the Timeline sub-view.
- **Magnus's comment (C.4 in comments section):** flags inconsistent nomenclature — "Dependencies" in one view, "Prerequisites" in another.
- **Complexity to close:** Trivial (~30 min to standardise nomenclature and confirm with Magnus)
- **Recommendation:** 🟢 **Standardise on "Prerequisites" everywhere** (or "Dependencies" — Glen's call, but pick one). Then mark this resolved. Don't build anything new.

### C.5 — Hiring Page (b7a2f97f) + Magnus's 1,500-word comment (0dc90af2)
- **This is the biggest item in the whole list. Handle carefully.**
- **What shipped (v1):** Sidebar view, kanban pipeline (6 stages: Sourced/Screening/Interview/Offer/Hired/Rejected), candidate cards, CV upload, client filter, drag-and-drop between stages.
- **Magnus's original spec:** 8 custom stages, per-stage employee assignment fields with nametags, per-stage content areas, "Clear Candidate" button, warning markers when no assignee, archive-and-delete-after-24h flow, dropdown selector + arrow navigation, confirmation dialogs.
- **Magnus's follow-up comment** then rewrote the stages AGAIN (Sourcing/Screening/Interview/Offer/Onboard/Hired), added a "Clear Candidate" button, changed the stage names (removed Sourced/Rejected, added Sourcing/Onboard), moved the Stage buttons, changed centering, questioned whether Rejected should exist at all.
- **Complexity to implement the full spec:** Very Large. 2+ weeks of focused work. Per-stage content sections alone double the UI code.
- **Usability:** ❌ **Problematic.** The spec is a good example of "design by writing" — it's very prescriptive about layout details (button colours, centring, arrow directions, red outlines) but the underlying mental model is a simple kanban. The shipped v1 captures the functional core; the spec adds surface area that won't be used.

**Specific pushback I'd offer Magnus:**

1. **8 stages is too many for a 6-person consultancy hiring a handful of people a year.** 6 stages is the right ceiling. Kanban research (and every hiring tool from Greenhouse to Lever) converges on 5–7 stages for a reason. Magnus already reduced it to 6 in her follow-up — good.
2. **Per-stage assignment with nametags is a nice-to-have that becomes a maintenance burden.** Better model: one "owner" on the card, full stop. The person currently dragging it through the pipeline. If you need to split interview rounds, use the Notes field.
3. **"Archive and delete after 24h" is dangerous** — candidate records should be retained for legal reasons (right-to-work audit trail, discrimination claims window, etc.). Retain them; let admins delete if they want.
4. **"Hiring Position" dropdown confusion (her comment C.5):** She's right — the current design has both "Role" (free text) and "Hiring Position" (dropdown to a positions table) and it's not clear when to use which. **Fix:** merge them. Either Role OR Position, not both. Positions were a defensive abstraction that isn't earning its keep.
5. **"Clear Candidate" button is a genuinely good idea** — reuse the card for the next person without losing the role/client setup. Small implementation (~1h).
6. **Drag-and-drop between stages** was added today. Covers the "move through pipeline" flow she wanted via arrows + dropdown, and is universally better UX.

- **Recommendation:** 🟡 **Defer the rework. Ship v1 as-is. Have a 20-min chat with Magnus before any further iteration.** The right next step is to watch her use v1 for a week and see which friction is actually felt. Most of the spec items would never justify the build cost.
- **Quick wins worth doing now (each ~1h):** Clear Candidate button, merge Role + Hiring Position into a single field, standardise stage names.

### C.6 — Reported Ticket Scaling (3e598dc5)
- **Issue:** When opening a ticket from the reports list, the header bar obscures the title.
- **Complexity:** Trivial — same root cause as C.10 / C.11. A single z-index/padding fix covers all three.
- **Usability:** ❌ Real bug — obstructs the title.
- **Recommendation:** 🟢 **Fix now.** Batch with C.10 and C.11.

### C.7 — Unwanted Reload Redirect (eca1423b)
- **Description:** "test"
- **Recommendation:** 🔴 **Close — probably a test submission.** Ask Magnus to confirm or reproduce if it's a real issue.

### C.8 — Report Reviewing Blocked on Ownership (15d97871)
- **Issue:** Magnus can change her own bug-report status but not anyone else's.
- **Reality:** This was fixed in my earlier session (removed admin-only gate on PATCH). Should work now.
- **Complexity:** Already done.
- **Recommendation:** 🔵 **Ask Magnus to retry and confirm.** If still broken there's a lingering permissions edge case — but the server code is definitely updated.

### C.9 — Ticket Not Marked as Blocked (5049722f)
- **Issue:** Status dropdown set to Blocked triggers the popup and notification, but the ticket itself does not persist status = Blocked. Reverts to whatever it was.
- **Complexity:** Small. Almost certainly the Mark As Blocked popup's submit handler is closing before the PATCH fires, or calling PATCH with the old status. A 1–2 hour fix.
- **Usability:** ❌ **Real bug.** This is actively broken.
- **Recommendation:** 🟢 **Fix now.** High priority.

### C.10 — Warning Button Obscured (d8a0f014)
- **Issue:** The top-right warning bell is hidden behind the header bar.
- **Complexity:** Trivial (z-index or top offset).
- **Usability:** ❌ Broken feature. The whole Warnings sidebar (B.5) is inaccessible if the bell can't be clicked.
- **Recommendation:** 🟢 **Fix now.** Highest priority because it breaks an entire feature.

### C.11 — Candidate Card Client Field Null (a1282442)
- **Issue:** Client dropdown on candidate cards is empty.
- **Reality:** **Fixed in this session.** The `clients` global didn't exist; switched to `_apiClientsCache` and then narrowed to active/contracted clients.
- **Recommendation:** 🔵 **Ask Magnus to retry.** This is done.

### C.12 — Header Bar Obfuscation (bb397607)
- **Issue:** Header bar overlaps sidebars, alerts button, and other UI elements.
- **Complexity:** Small. Root cause is either:
  1. Header has z-index too high, or
  2. Header content area has fixed height but surrounding elements don't offset for it
- **Usability:** ❌ **Real bug pattern.** Same root cause as C.6 and C.10.
- **Recommendation:** 🟢 **Fix now — audit every floating element's z-index relative to the header.** Ship one commit that resolves C.6, C.10, and C.12 together.

---

## Section D — Magnus's Comments on Other Items (6)

### D.1 — on Widescreen scaling (2910dfbc)
"Issue seems to be fixed. I cannot mark this report as such."
- **Status:** She was correct. Widescreen is fixed. She couldn't mark it because of the permissions bug (C.8), now fixed.
- **Action:** 🔵 Close the widescreen item.

### D.2 — on "move the dangerzone to admin" (c8e32581)
"Issue is fixed."
- **Action:** 🔵 Close.

### D.3 — on Work Organisation (f32063fa)
"SoWs being uploaded is a great feature and is the subject of a different report, but not this one."
- She's explicitly saying the Client > SoW > Project > Tickets tree is still what she's asking for. See C.1 — my recommendation is to defer and reframe with her.

### D.4 — on Gantt Chart (ccc068ca)
"Consolidate terminology — Dependencies vs Prerequisites."
- **Action:** 🟢 Pick one and standardise (see C.4).

### D.5 — on Hiring Page: "Hiring Position" confusion (3b7fc970)
"What is the 'Hiring Position' dropdown? Is this redundant?"
- **Action:** 🟢 **She's right. Merge Role and Hiring Position into a single field.** ~1h fix.

### D.6 — on Hiring Page: the 1,500-word rework (0dc90af2)
Full spec rewrite. See C.5 for my detailed pushback. **Do not build this as written.** Have a conversation with her first.

---

## Priority Fix List (ordered for next session)

Grouped by what you should do with Magnus's queue next.

### Must-fix (real bugs, high user impact)
1. **C.10 Warning Button Obscured** — breaks the entire Warnings sidebar. Trivial fix.
2. **C.9 Ticket Not Marked as Blocked** — status doesn't persist. Small fix.
3. **C.6 Reported Ticket Scaling** — header overlaps ticket title. Trivial.
4. **C.12 Header Bar Obfuscation** — z-index audit. Small.

These four are probably a single 1–2 hour commit that fixes all header/z-index issues together.

### Quick wins (small effort, clear value)
5. **D.4 / C.4 Nomenclature standardisation** — Prerequisites ↔ Dependencies. Trivial.
6. **D.5 / C.5 Merge Role + Hiring Position** — one field, not two. ~1 hour.
7. **B.3 Add client abbreviation field** — missing piece of Client Page. ~1 hour.

### Close-out (no work, just confirm with Magnus)
8. **C.8 Report Reviewing Blocked on Ownership** — already fixed, ask her to retry.
9. **C.11 Candidate Card Client Field Null** — already fixed, ask her to retry.
10. **C.7 Unwanted Reload Redirect** — looks like a test submission, ask for clarification.
11. **Section A, all 11 items** — move from resolved to fully closed.
12. **Section B, 18 please_review items** — bulk walkthrough with Magnus, mark resolved.

### Blocked on external input
13. **C.2 Due & Late Warnings** — needs SMTP.
14. **C.3 PM Reports** — needs SMTP.

### Needs a conversation, not a build
15. **C.1 Work Organisation (Client > SoW > Project tree)** — reframe as a filter, not a tree level.
16. **C.5 + D.6 Hiring Page rework** — push back hard on the spec complexity. Watch her use v1 first.

---

## Patterns worth noting

**Magnus is a good tester.** She reproduces bugs clearly, includes screenshots-via-ticket, and files follow-ups when a fix misses. Keep her filing.

**Her specs are over-detailed.** When Magnus writes a feature request she designs the entire UI down to colours and button positions. This creates two risks:
1. Building to spec eats the time that should go into use-case testing.
2. It crowds out better solutions — the drag-and-drop kanban was a better answer than her stage-arrow navigation, but would never have come from "implement the spec."

**Rule of thumb:** Read Magnus's specs to understand what problem she's trying to solve, then solve the problem. Don't build the interface she described.

**She has a terminology preference.** She consistently says "ticket" where the codebase says "task". This is a cultural carry-over — worth confirming with her whether she is happy with the current "task / story / feature / project" language or whether she'd like a one-time rename. Easy decision to make once, hard to flip-flop.

**Several of her bugs are all one root cause.** C.6, C.10, C.12, and part of B.5 are all "the header bar overlaps stuff above/around it". One z-index / layout audit fixes all of them. That's the highest-leverage single commit in her entire queue.
