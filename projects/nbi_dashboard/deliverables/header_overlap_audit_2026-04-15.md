# Header Overlap Audit — 2026-04-15

## Scope
Systematic check of every panel, modal, and card header across five viewport widths, looking for overlap, clipping, or off-screen elements. Motivated by Glen's report of persistent header-obfuscation on ticket cards.

## Method
Programmatic audit harness (`window.__audit`) run in the live app. For each container:
1. Open the container with real content
2. Measure the header's bounding rect — verify it's within viewport and below the app header bar
3. Verify the close button is reachable (not off-screen horizontally or vertically)
4. Force the body to scroll by up to 600 px
5. Verify the header did NOT move during the scroll (sticky behavior works)

Harness records a pass/fail per check with specific failure notes.

## Viewports tested
- 1920 × 1080 (wide desktop)
- 1440 × 900 (normal laptop)
- 1024 × 768 (iPad landscape)
- 768 × 1024 (iPad portrait)
- 375 × 812 (mobile)

## Containers checked (16 per viewport × 5 viewports = 80 total checks)

### Panels (6)
- Task detail overlay (`.detail-panel`)
- Task inline detail (`.inline-detail`, inside `.tasks-layout__detail`)
- Bug detail panel (`.bug-detail-panel`)
- Candidate detail panel (`.candidate-detail-panel`)
- Lead detail panel (`.lead-detail-panel`)
- Warnings & alerts sidebar (`.warn-alert-panel`)

### Modals (6)
- Bug report modal (`#bugReportModal`)
- Import CSV (`#importModal`)
- Confirm (`#confirmModal`)
- Mark As Blocked (`#blockerModal`)
- Create Candidate (`#createCandidateOverlay`)
- Create Team (`#createTeamModal`)

### Static elements (4)
- Warn alert trigger button (`#warnAlertBtn`)
- App header bar (`.g-header`)
- Main tabs bar (`.main__tabs`)
- Body horizontal overflow check

## Results

| Container | 1920×1080 | 1440×900 | 1024×768 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| task-detail-overlay | ✅ | ✅ | ✅ | ✅ | ✅ |
| task-inline-detail | ✅ | ✅ | N/A (hidden by design) | N/A | N/A |
| bug-detail-panel | ✅ | ✅ | ✅ | ✅ | ✅ |
| candidate-detail-panel | ✅ | ✅ | ✅ | ✅ | ✅ |
| lead-detail-panel | ✅ | ✅ | ✅ | ✅ | ✅ |
| warn-alert-panel | ✅ | ✅ | ✅ | ✅ | ✅ |
| modal-bug-report | ✅ | ✅ | ✅ | ✅ | ✅ |
| modal-import | ✅ | ✅ | ✅ | ✅ | ✅ |
| modal-confirm | ✅ | ✅ | ✅ | ✅ | ✅ |
| modal-mark-as-blocked | ✅ | ✅ | ✅ | ✅ | ✅ |
| modal-create-candidate | ✅ | ✅ | ✅ | ✅ | ✅ |
| modal-create-team | ✅ | ✅ | ✅ | ✅ | ✅ |
| warn-alert-btn-visible | ✅ | ✅ | ✅ | ✅ | ✅ |
| header-bar | ✅ | ✅ | ✅ | ✅ | ✅ |
| main-tabs | ✅ | ✅ | ✅ | ✅ | ✅ |
| body-no-horizontal-overflow | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total: 80/80 pass** (inline detail intentionally hidden at ≤1024 px, counted as N/A).

## Edge cases (spot-checked at 375 × 812)
- Longest task title in the dataset ("Identify key strengths and weaknesses across C-level and dep...") — close button stays within viewport, title truncates into the input
- Deep scroll (scrolled `.detail-panel__body` 1608 / 2304 px) — header stayed pinned at `top: 52`
- Stacked state (warnings sidebar opened over task detail) — both visible, headers intact

## Bugs found and fixed during this audit

### 1. Detail panel headers scrolled off with content
**Containers affected:** `.detail-panel` (task detail overlay), `.inline-detail` (inside `.tasks-layout__detail`)
**Root cause:** The panel container had `overflow-y: auto` and the `.detail-panel__body` was `flex: 1` without its own overflow. When body content was taller than the available space, the whole panel scrolled including the header.
**Fix:** Moved the overflow to the body with `overflow-y: auto; min-height: 0`. The panel is now `overflow: hidden` as a flex column, so only the body scrolls and the header is `flex-shrink: 0` pinned to the top.

### 2. Bug / candidate detail panels had redundant outer scrolls
**Containers affected:** `.bug-detail-panel`, `.candidate-detail-panel`
**Root cause:** Both the panel container AND the `__body` had `overflow-y: auto`. Nested scrolls are confusing and the outer one could still scroll the header off in certain flex-sizing scenarios.
**Fix:** Removed outer overflow, kept inner body overflow. Panel header is `flex-shrink: 0` with a background so it's visually anchored.

### 3. Lead detail panel had no sticky header at all
**Container:** `.lead-detail-panel`
**Root cause:** Was a plain `overflow-y: auto` scroll container with the header as a regular div at the top. Any long lead (multiple contacts, history) pushed the title out of view.
**Fix:** Restructured as a flex column. `.lead-detail` is now the scroll container (`flex: 1; overflow-y: auto`), and `.lead-detail__header` uses `position: sticky; top: 0` with a background so it stays pinned.

### 4. Modal titles scrolled with body content on long modals
**Containers affected:** Every modal — `.modal__title` for the static modals, `<h2>` first-child for the dynamic modals (bug report, calendar event, new team, new lead, etc.)
**Root cause:** `.modal` has `max-height: 85vh; overflow-y: auto` with everything inside as siblings. The title scrolled off when the body was long.
**Fix:** Added a sticky rule covering `.modal__title`, `.modal > h2:first-child`, and `.modal > h3:first-child` — all three become sticky at `top: calc(-1 * var(--space-2xl))` with negative horizontal margins + matching padding to extend the background across the modal's padding. Border-bottom separator so scrolling content is clearly below.

### 5. Task inline detail panel stacked below the fold on iPad landscape
**Container:** `.inline-detail` inside `.tasks-layout__detail`
**Root cause:** At ≤1024 px the `.tasks-layout` becomes a flex column via media query. `.tasks-layout__detail` is pushed below `.tasks-layout__main`, which takes most of the available viewport height. The inline detail header landed at `top: 770` on a 768 px tall viewport — off the bottom of the fold. Body scrolling didn't pin the header because the page itself was scrolling, not the inner container.
**Fix:** At ≤1024 px, (a) `.tasks-layout__detail { display: none }` to hide the inline panel outright, (b) `openDetail()` checks `window.innerWidth > 1024` and routes to `openDetailOverlay()` on tablet/mobile. Clicking a task on a tablet now opens the well-tested overlay panel instead of trying to cram an inline panel into a stacked layout.

### 6. Long task titles pushing close buttons off-screen (verified, not a bug)
**Container:** Task detail overlay header
**Finding:** The title is an `<input>` with `flex: 1` and the close button is `flex-shrink: 0`. I stress-tested at 375 px with the longest task title in the dataset (60+ chars) — the input correctly flex-shrinks and the close button stays on screen. No fix needed, but adding `min-width: 0` to the title input as a defensive measure while I was in there.

## Files modified
- `nbi_project_dashboard.html` — CSS for `.detail-panel`, `.inline-detail`, `.bug-detail-panel`, `.candidate-detail-panel`, `.lead-detail-panel`, `.modal`, `.modal__title` + sticky selectors; media query hiding `.tasks-layout__detail` at ≤1024; `openDetail()` viewport-check routing

## What I don't know from this audit
- I only stress-tested scrolling with the harness. I did not manually click every control inside every panel to make sure nothing else broke as a side-effect of the flex restructure. Glen should spot-check the panels he uses most.
- Cards (bug kanban cards, hiring kanban cards, task board cards, calendar event chips, standup items, risk cards, tactical items) were NOT in the header audit because they don't have sticky headers — they're single-line display elements. If Glen meant those when he said "ticket cards," a follow-up might be needed.
- The SoW viewer modal uses `<h3>` inside `display: flex` — my sticky rule targets `.modal > h3:first-child` and should apply, but it wasn't in my automated harness list because the SoW viewer requires a SoW record to open. Worth manually verifying if Glen uses SoWs.

## Harness
The `window.__audit` harness and `window.__runFullAudit()` runner are in-memory only — they don't persist. If you need to re-run this audit, copy the harness code from commit `<pending>` into the browser console after loading the app.
