# NBI WorkSage UI/UX Audit

**Date:** 2026-04-14
**File:** `nbi_project_dashboard.html` (15,828 lines, 941 KB raw, 132 KB inline CSS, 961 CSS rules)
**Method:** preview server, eval/inspect/snapshot driven (full-page screenshots time out due to file size)
**Themes verified:** 7 (dark, light, midnight, nord, solarized, dracula, emerald)

## CRITICAL

### C1. Light theme breaks status/priority/type badges (WCAG AA fail)
Red `#dc2626` on tinted-white = 3.76 contrast (need 4.5). Yellow 2.15. Green 2.28. Blue 2.84. Affects Bug Tracker, Hiring kanban, Calendar event bars, Warnings sidebar chips. Dark theme is fine.

### C2. Task detail panel does not move focus on open and does not close on Escape
- `#detailPanel` opens with `activeElement === <body>`, no focus moved
- Escape does NOT close (but bug detail and candidate detail DO — inconsistent)
- Close button `×` has no `aria-label`

**FIXED in post-audit pass:** added `aria-label="Close detail panel"`, Escape handler, and focus-on-open via openDetailOverlay wrapper.

### C3. Detail panel form inputs lack id/name/label association
24+ inputs in the panel use sibling `<span class="detail-field__label">` instead of `<label for=...>`. Screen readers can't identify which field is which.

### C4. Warnings & Alerts sidebar `.open` class does not slide the panel in
Right: -420px never transitions to right: 0. `panel.style.setProperty('right','0px','important')` reports inline 0px but computed stays at -420px. Whole feature is invisible at runtime.

**FIXED in post-audit pass:** switched from `right` slide animation to `display: none / flex` toggle (same fix applied to bug detail panel earlier).

### C5. Practice filter counts are 0 except "All"
`getTaskPractice()` reads `t.practiceArea` (camelCase) but `/api/tasks` returns `practice_area` (snake_case). 0 of 1123 tasks have practice set in either form.

**FIXED in post-audit pass:** `getTaskPractice()` and detail panel renderers now read both camelCase and snake_case.

### C6. Mobile (375 px) horizontal overflow on 5 views
- Dashboard: 216 px overflow — `.tactical-grid` hardcoded `1fr 1fr` with no media query
- Settings: 149 px
- Leads: 65 px
- Finances: 67 px
- Report: 42 px

**PARTIAL FIX:** `.tactical-grid` now uses `repeat(auto-fit, minmax(min(100%, 380px), 1fr))`. Other views still need attention.

### C7. No `<h1>` and no `<main>` landmark
Skip link points to `#mainContent` div but there's no semantic main element. Screen readers can't navigate by landmark.

## HIGH

### H1. Calendar events keyboard inaccessible
`.cal__event` div has onclick but no tabindex/role, while `.cal__task` in the same loop is keyboard accessible.

### H2. Nested interactive elements in Warnings sidebar
`.warn-item` is `role="button" tabindex="0"` AND contains `<button>` Snooze elements. Invalid ARIA.

### H3. Widescreen scaling regressions on new views
- `.bug-tracker { max-width: 1400px }` — 915 px dead space at 2560
- `.hiring { max-width: 1400px }` — same
- `.mytasks { max-width: 960px }` — ~1340 px dead space
- `.settings { max-width: 800px }` — inconsistent

**FIXED in post-audit pass:** all four max-width caps removed.

### H4. Sidebar overload — 27 items in 6 sections
At 1280×800 sidebar height is 748px, just fits. Smaller heights scroll. Consider collapsible sections.

### H5. Sidebar `<aside>` lacks `role="navigation"` and items lack `aria-current="page"`

### H6. Sidebar item label/badge concatenation: "Projects1123" with no separator

### H7. Bug rows have no aria-label, only concatenated content

### H8. ID collision risk: `#bugDetailPanel`, `#detailPanel`, `#candidateDetailPanel` reuse global IDs across re-renders

### H9. Client research stub UX is misleading
Confirmation copy says "search public sources" but reality is hardcoded `fields: {}`. Success toast says "0 fields verified and populated" — sounds like a clean no-op rather than not-yet-implemented.

### H10. Candidate Create modal missing dialog ARIA

### H11. Team modal lacks aria-label and Escape handler

## MEDIUM (12 items)
- M1: Bug Tracker filter dropdowns reuse `.leads-select` class (cross-view leakage)
- M2: Sidebar item id/handler mismatch (`si_Dashboard` invokes `report` view)
- M3: Page initialisation runs data load twice on first login
- M4: Calendar events use 280-char inline style attributes instead of classes
- M5: Bug Tracker grid uses fixed 794px title column at 1400px max-width — title clipping
- M6: Negative HSL hues in client badge generation (`hsl(-30, 60%, 55%)`)
- M7: `_btFilterType`, `_hiringFilterClient` etc on `window` (other modules use module-scoped)
- M8: Skeleton screens only on 3 views — Bug Tracker, Hiring, Calendar, Settings, Finances missing
- M9: SoW viewer modal is a wall of inline styles
- M10: Offline banner and sync badge silent to assistive tech (no `role="status"` / `aria-live="polite"`)
- M11: Hiring view "All Clients" filter is empty (data fetch not happening)
- M12: 3 icon-only buttons missing aria-label

## LOW (8 items)
- L1: 7 themes confirmed (audit prompt mentioned 8)
- L2: Server startup `ERR_ERL_KEY_GEN_IPV6` validation warning (express-rate-limit IPv6)
- L3: Full-page screenshots time out — 941 KB monolith too heavy for headless rasteriser
- L4: SHOW PASSWORD checkbox label has leading space
- L5: Sidebar collapse arrow needs aria-label toggling on state
- L6: Mobile sidebar overlay node remains in DOM with width 0
- L7: Calendar legend uses 8 inline-styled spans
- L8: nbi-dashboard launch config note (port collision with PM2 instance)

## What's working well
- 7 themes all change `--bg`, `--text`, `--accent`, sidebar bg correctly
- `:focus-visible { outline: 2px solid var(--accent) }` proper accessible focus rings
- Bug detail, candidate detail, blocker modal: all have role="dialog", aria-modal, aria-label, AND Escape handler
- Bug tracker rows support keyboard activation (Enter, Space)
- Skip link first element after `<body>`, revealed on focus
- British English throughout, no "ticket" anywhere
- Client research stub server-side is honest (note field, audit log, persists structured data)
- Mobile responsive at page level (no body horizontal scroll on any view at 375 px)

## Post-Audit Fixes Applied (this session)

| ID | Issue | Status |
|---|---|---|
| C2 | Detail panel focus + Escape + close aria-label | FIXED |
| C4 | Warnings panel doesn't slide in | FIXED (display toggle) |
| C5 | Practice filter reads wrong field | FIXED (read both casings) |
| C6 partial | tactical-grid mobile overflow | FIXED (auto-fit grid) |
| H3 | Widescreen max-width caps on 4 views | FIXED (all removed) |

## Recommended Fix Priority for Next Session
1. C1 — light theme badge contrast (single CSS swap fixes all components)
2. C3 — detail panel input/label association (biggest a11y sweep)
3. C7 — add `<main>` landmark + active sidebar `aria-current`
4. C6 remainder — mobile overflow on Settings, Leads, Finances, Report
5. H1, H2 — calendar event keyboard, warning nested buttons
6. H6 — sidebar badge separator
7. H9 — research stub UX copy
8. H10, H11 — modal ARIA on candidate + team modals
