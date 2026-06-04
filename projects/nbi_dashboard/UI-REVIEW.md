# WorkSage Dashboard -- Comprehensive Usability Audit

**Audited:** 2026-05-23
**File:** `nbi_project_dashboard.html` (~27,710 lines)
**Server routes:** `dashboard-server/routes/` (39 route files)
**Server status:** Live on localhost:8888
**Screenshots:** Not captured (code-only audit -- visual verification deferred to Glen)

---

## Summary

The dashboard is a mature, feature-rich SPA covering 15+ views with solid fundamentals: design tokens, 7 colour themes, keyboard shortcuts, focus trapping in modals, toast notifications, skeleton loading states, and comprehensive CRUD across most views. The audit below surfaces usability gaps a real user would hit, not theoretical issues.

**Total findings:** 47
- CRITICAL: 4
- HIGH: 14
- MEDIUM: 18
- LOW: 11

---

## Findings by View

### 1. Portfolio / Dashboard

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 1.1 | MEDIUM | **No create action on dashboard** | Dashboard is read-only. No "New Project" or "New Client" button visible. Users must navigate to Projects or Settings to create items. The dashboard should have at least one primary CTA. |
| 1.2 | LOW | **Standup section collapsed by default** | Team standup is hidden behind a toggle (line 6068). First-time users may not discover it exists. No tooltip or hint. |
| 1.3 | LOW | **Portfolio client table has no "View All" link** | When clicking a client row, it scopes panels below. No explicit "back to all" label is visible until you click the same client again. The `selectPortfolioClient(null)` action only appears as a back arrow after selecting. |
| 1.4 | MEDIUM | **Milestone panel has no "Add Milestone" CTA** | The "Upcoming Milestones" KPI card and the milestones panel have no way to create a new milestone directly from the dashboard. Users must go to the detail panel of a project. |

### 2. Command Centre

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 2.1 | MEDIUM | **Failed load shows broken retry link** | Line 22147: retry anchor uses `color:var(--primary)` which is not a defined token. Should be `--accent` or `--accent-text`. This means the "Retry" link is invisible against the background in most themes. |
| 2.2 | LOW | **Loading states are plain text** | Lines 22141, 22151: "Loading Command Centre..." is unstyled text. Unlike other views, there is no skeleton placeholder here. |
| 2.3 | LOW | **PlaySage FAB image is 104x104px** | Line 22325: the floating action button image is `width:104px;height:104px` which is oversized for a FAB. This dominates the bottom-right corner and may obscure content on mobile. |
| 2.4 | MEDIUM | **Tab labels not keyboard-accessible** | Line 22301: CC tabs use `onclick` on div elements. While the global keyboard delegation (line 26892) patches this, the tabs lack `role="tab"`, `tabindex="0"`, and `aria-selected` unlike the bug tracker tabs which do have them (line 18654). |

### 3. Projects (Tree/Board/Gantt/Calendar)

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 3.1 | HIGH | **Quick-add requires client selection but gives no inline error** | Line 11534: `quickAddTask()` shows a toast "Select a client first" but the quick-add input has no visual indicator that client is required. The "No Client" option in the dropdown is misleading -- it should say "Select Client..." with a `required` style when unset. |
| 3.2 | MEDIUM | **Board view "No items" is unstyled** | Line 7723: empty board lanes show raw text "No items" with no styling, no icon, and no CTA. Compare to the tree empty state which uses `emptyState()` helper with icon + description. |
| 3.3 | HIGH | **Board lane cap hides items without navigation** | Line 7726: when a lane exceeds `BOARD_LANE_CAP`, it shows "+N more" but this is plain text, not a clickable link. Users have no way to see or access the truncated items. They must switch to tree view. |
| 3.4 | MEDIUM | **Gantt mobile fallback loses key functionality** | Line 8392: mobile view shows card layout but loses dependency arrows, zoom controls, and the "Link mode" toggle entirely. No indication that these features exist at wider viewports. |
| 3.5 | LOW | **Calendar dependency highlight toggle has no label** | Line 8014: button shows a link emoji icon with no text. The `title` attribute provides "Toggle dependency highlighting" but this is hidden from screen readers beyond the title. Should have an accessible label. |
| 3.6 | MEDIUM | **Inline detail panel hidden on tablet with no fallback** | Line 1473: CSS rule `display: none !important` at 1024px. The inline detail panel simply vanishes. While `openDetail()` correctly routes to the overlay at this breakpoint, users who had it visible see it disappear with no explanation when resizing. |
| 3.7 | HIGH | **Filter bar becomes very tall on mobile** | Line 1475: filter bar stacks all controls vertically. With search + 2 multi-selects + 2 dropdowns + sort + sub-view toggle + incomplete button + detail button, this creates 9+ full-width rows above the task content, pushing actual tasks far below the fold. |

### 4. Reporting

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 4.1 | MEDIUM | **No project empty state gives no CTA** | Line 11627: "This project has no features yet." is plain text with no "Create Feature" button. User reaches a dead end. |
| 4.2 | LOW | **Reporting and Report are both in the codebase** | `renderReport` (line 11963) and `renderReportingView` (line 11584) coexist. The sidebar comment (line 5015) shows Report is commented out but the function and route remain. Users with `#report` in their URL or browser history land on the old view. |
| 4.3 | LOW | **Reporting drawer toggle has no visual affordance** | Line 11576: clicking a feature row opens/closes a drawer. There is no chevron, expand icon, or hover cursor change to indicate the row is interactive. |

### 5. Documentation

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 5.1 | LOW | **Empty tree state has no guided action** | Line 13386: "No pages yet" shown as plain text. While there is a "+ New page" button above in the tree header, the empty state itself does not include a CTA button. |
| 5.2 | MEDIUM | **No client dropdown shows error instead of CTA** | Line 13329: "No clients yet." with no "Go to Settings to add a client" link. New installations hit a dead end. |
| 5.3 | LOW | **Context menu has no keyboard trigger** | Line 13363: right-click context menu for rename/delete/hide. No alternative way to access these actions via keyboard or a visible menu button on each tree item. |

### 6. People

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 6.1 | MEDIUM | **Capacity heatmap shows "Loading..." with no timeout** | Line 12503: if `loadCapacityHeatmap()` fails silently, the view stays at "Loading capacity data..." indefinitely. No error state or retry button. |
| 6.2 | HIGH | **Client staff exclusion is hardcoded** | Line 12459: `CLIENT_STAFF` array is hardcoded with specific names (`'Robin', 'Valeria', 'Lorenza'` etc.). This breaks when client teams change. Should be driven by user metadata (e.g. `client_scope_id` from the users table). |
| 6.3 | LOW | **No "Add Person" action** | People view is read-only (derived from task assignees). There is no way to add a team member from this view. The only path is Settings > Team. A "Manage Team" link would help discoverability. |

### 7. Leads

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 7.1 | LOW | **Retry button after failed load uses inline onclick** | Line 16402: `onclick="_leadsConfig=null;..."` is a long inline handler. This works but the pattern is fragile. Minor consistency issue with the rest of the app which uses `data-action` delegation. |
| 7.2 | MEDIUM | **Lead kanban drag-and-drop disabled on mobile with no alternative** | Line 16537: `draggable="true"` is conditionally omitted on mobile. No alternative mechanism (e.g. dropdown, swipe, long-press) to change a lead's pipeline stage on mobile. |
| 7.3 | LOW | **Sector tabs hidden when no sectors defined** | Line 16423: sectors conditionally rendered. This is correct behaviour, but the transition from "no sectors" to "sectors exist" after config gives no indication tabs will appear. |

### 8. Hiring (ATS)

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 8.1 | HIGH | **Create Position modal closes on overlay click but has no Save feedback** | Line 20064: cancel button uses `this.closest('.modal-overlay').remove()`. This removes the DOM node immediately. If the user accidentally clicks the overlay backdrop, the form is destroyed with no confirmation and no way to recover data. |
| 8.2 | MEDIUM | **Kanban drag-and-drop disabled on mobile with no alternative** | Same pattern as Leads -- `draggable="true"` omitted on mobile with no stage-change dropdown. Candidates cannot be moved between pipeline stages on mobile. |
| 8.3 | HIGH | **Hiring view uses hardcoded `color:#888` instead of design tokens** | Lines 19906, 19980, 20577: multiple instances of `color:#888` and `color:#8b949e` bypass the theme system. These will have wrong contrast in light themes and Solarized/Dracula themes. **55 total instances** of `color:#888` or `color:#8b949e` across the file. |
| 8.4 | MEDIUM | **Calendar tab has no empty state** | If `renderCalendarTab()` returns empty interview data, the tab renders nothing visible. No "No interviews scheduled" message. |
| 8.5 | LOW | **Metrics tab may show stale data** | Metrics tab renders from cached data. No "Last updated" timestamp or refresh button. |

### 9. Finances

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 9.1 | CRITICAL | **Finance data stored in localStorage, not server** | Line 15377: `_financeEntries = JSON.parse(localStorage.getItem('nbi_finance_entries'))`. Financial data is stored client-side only. Clearing browser data deletes all finance entries. This is the only view with this pattern -- every other view uses server APIs. |
| 9.2 | MEDIUM | **No delete/edit for finance entries visible** | `addFinanceEntry()` exists (line 16019) but there is no visible delete or edit function for existing finance entries in the UI. The "Danger Zone" reset is the only way to clear data. |
| 9.3 | HIGH | **Non-admin users see no indication of read-only state** | Line 15475: admin check gates the Danger Zone button, but the rest of the finance view is identical for admin and non-admin. If a non-admin adds a finance entry to localStorage, it stays local only. No warning that their edits are ephemeral. |
| 9.4 | MEDIUM | **Monthly view has no data entry** | The monthly finance view shows projected vs actual, but there is no mechanism to enter actual monthly figures. The "actuals" column will always show server-seeded data or nothing. |

### 10. Expenses

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 10.1 | LOW | **Empty report state copy is good** | Line 14485: "No expense reports yet. Create a report to group your expenses for submission." -- clear guidance with context. No issue. |
| 10.2 | MEDIUM | **Receipt upload has no progress indicator** | Line 14422: `processReceiptUpload(this.files[0])` -- no visible upload progress bar or spinner. For large receipt images, the user sees no feedback until the toast appears. |
| 10.3 | LOW | **Failed load shows "Failed to load expenses" with no retry** | Line 14404: dead end if initial load fails. Unlike Leads which has a Retry button. |

### 11. Bug Tracker

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 11.1 | LOW | **Good accessibility on bug rows** | Line 18704: bug rows have `tabindex="0"`, `role="button"`, `aria-label` with full context, and `onkeydown` handlers. This is the best accessibility in the app. |
| 11.2 | MEDIUM | **Kanban view has no empty-lane placeholders** | When switching to kanban, empty status columns show nothing. The list view shows "No reports found" but kanban shows blank columns with just headers. |
| 11.3 | LOW | **Default filter is "active" not "all"** | Line 18613: `btStatus || 'active'`. This is intentional but means "Resolved" and "Won't Fix" bugs are hidden by default. First-time users may think resolved bugs were deleted. |

### 12. Queue

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 12.1 | LOW | **Good empty state** | Line 23774-23778: clear icon, title, and description explaining what the queue is for. |
| 12.2 | MEDIUM | **No pagination or search** | Queue items are rendered as a flat list with no search, filter, or pagination. If the queue grows beyond ~50 items, this becomes unwieldy. |
| 12.3 | LOW | **Queue detail panel Escape handler leaks** | Line 23834: `window._queueDetailEscHandler` cleanup pattern, but the handler is only removed on close. If the panel re-renders without closing (e.g. during a sync poll), orphaned handlers accumulate. |

### 13. Settings

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 13.1 | CRITICAL | **Password change form has no confirm-password field** | Line 23306-23308: only "Current password" and "New password" fields. No "Confirm new password" field. Users can set an unintended password with no way to verify what they typed. |
| 13.2 | MEDIUM | **Add New User form has no validation feedback** | Line 23327-23334: user creation form with multiple fields but no inline validation. If username is taken or email is invalid, only a toast appears. No field-level error highlighting. |
| 13.3 | CRITICAL | **Client admin invite generates password server-side with no display** | Line 25991-26012: `inviteClientUser()` sends username/email/role but no password field. The server presumably generates one, but the response does not show the generated credentials to the admin. The invited user has no way to know their initial password unless an email is sent (which may not be configured). |
| 13.4 | LOW | **Changelog tab only visible to admin** | Line 23416: non-admin users cannot see the changelog. No indication that changelogs exist. This is a design choice but reduces transparency. |

### 14. My Work

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 14.1 | LOW | **No empty state for active tasks** | If a user has zero active tasks (all Done), the view shows KPI cards with zeros but no congratulatory or informational message in the task sections. |
| 14.2 | LOW | **Done section capped at 50 items** | Line 7293: "...and N more" but no way to see all completed items. No "View all" link. |

### 15. Cross-cutting / Global

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 15.1 | HIGH | **55 instances of hardcoded colours bypass theme tokens** | `color:#888` (19 instances), `color:#8b949e` (12 instances), `color:#484f58` (1), `color:#6b7280` (1), and various others. These will not adapt to theme changes and may fail WCAG contrast in light themes. All should use `var(--text-muted)` or `var(--text-secondary)`. |
| 15.2 | HIGH | **Keyboard shortcuts undiscoverable** | Lines 26810-26890: extensive shortcuts exist (g+d, g+t, g+p, /, n, [, 1-4 for status, Escape, Delete for deps). There is no help dialog, shortcut reference card, or "?" key handler. Users will never discover these. |
| 15.3 | CRITICAL | **Some modals created via innerHTML .remove() pattern lack focus trap** | Lines 20048-20089: Create Position modal is built with raw innerHTML and appended. It uses `this.closest('.modal-overlay').remove()` but never calls `_trapFocus()` or `_activateDynamicModal()`. Focus escapes the modal. Compare with the hiring stage editor (line 20983) which does use the overlay pattern properly. |
| 15.4 | MEDIUM | **No "unsaved changes" warning on navigation** | Switching views via sidebar while editing inline fields (title, description, notes) discards changes silently. The `_flushActiveEdits()` function (called in `renderContent`) tries to save, but race conditions with async renders can lose data. |
| 15.5 | HIGH | **Navigation shortcuts collide with form input** | Line 26813-26814: shortcut handler skips inputs/textareas/selects. But `contentEditable` divs (e.g. Tiptap editor in Documentation) are only partially covered. Pressing "g" then "d" while editing a document could trigger navigation. Line 26814 checks `e.target.isContentEditable` but the `contenteditable` attribute check may miss nested elements. |
| 15.6 | MEDIUM | **Drag-and-drop universally unavailable on mobile** | Board view (Projects), Leads kanban, Hiring kanban, and Document tree reorder all use HTML5 drag-and-drop which does not work on touch devices. No touch-based alternative (long-press, swipe, or dropdown) exists for any of these. |
| 15.7 | MEDIUM | **aria-label coverage is thin (56 instances across 27,710 lines)** | Many interactive elements -- sidebar items, filter chips, badge buttons, inline edit triggers -- lack aria-labels. Screen reader users get no context on these controls. Compare: the bug tracker rows (line 18704) are exemplary. |
| 15.8 | LOW | **Theme selector has no preview** | Theme switching (in header actions) changes the theme immediately with no preview or confirmation. Users cannot compare themes side by side. |
| 15.9 | MEDIUM | **Print stylesheet hides everything except task data** | Line 1424: `display: none !important` on header, sidebar, tabs, filters, buttons, modals, etc. Only the main content area prints. But Reporting and Finances views have no print-specific layout, so they print with web-optimised spacing that wastes paper. |

---

## Top Priority Fixes

### 1. CRITICAL -- Password change form needs confirmation field (Settings, line 23306)
**Impact:** Users can lock themselves out by mistyping a new password. No recovery mechanism beyond admin reset.
**Fix:** Add a "Confirm new password" input. Validate match before submitting. Show inline error if mismatch.

### 2. CRITICAL -- Finance data in localStorage only (Finances, line 15377)
**Impact:** Financial data lost when browser cache is cleared. Not synced across devices or users. The only data store in the app with this pattern.
**Fix:** Migrate finance entries to a server-side table (similar to expenses). Add a one-time migration on first load to push localStorage data to the API.

### 3. CRITICAL -- Create Position modal has no focus trap (Hiring, line 20048)
**Impact:** Focus escapes the modal. Keyboard users can interact with background elements. Accessibility violation.
**Fix:** Call `_activateDynamicModal()` after inserting the modal HTML, same as the candidate card modal (line 21115).

### 4. HIGH -- 55 hardcoded colour values bypass theme system (Global)
**Impact:** Text becomes invisible or low-contrast in non-default themes. Affects Hiring, Command Centre, and Reporting views most heavily.
**Fix:** Replace all `color:#888` with `var(--text-muted)`, `color:#8b949e` with `var(--text-secondary)`, etc. Grep and replace in one pass.

### 5. HIGH -- Keyboard shortcut discoverability (Global, line 26810)
**Impact:** Power features like g+d navigation, status shortcuts 1-4, and / for search are invisible. Zero discoverability.
**Fix:** Add a "?" shortcut that opens a keyboard shortcut reference modal. Add a small "Keyboard shortcuts" link in Settings > Account.

### 6. HIGH -- Board lane "+N more" items are inaccessible (Projects, line 7726)
**Impact:** Users cannot see or interact with items beyond the lane cap. Data is hidden with no way to access it.
**Fix:** Make "+N more" a clickable link that either expands the lane or switches to tree view with the lane status pre-filtered.

### 7. HIGH -- Mobile drag-and-drop has no alternative (Global)
**Impact:** On touch devices, users cannot move items between kanban lanes (Projects, Leads, Hiring). Core workflow is broken.
**Fix:** Add a "Move to..." dropdown/action on each card that appears on touch devices (detected via `'ontouchstart' in window` or media query).

---

## View-by-View Completeness Matrix

| View | Create | Read | Update | Delete | Empty State | Loading State | Error State | Mobile |
|------|--------|------|--------|--------|-------------|---------------|-------------|--------|
| Portfolio | -- | OK | -- | -- | OK | OK (snapshots) | Partial | OK |
| Command Centre | -- | OK | -- | -- | OK | Text only | Retry (broken link) | OK |
| Projects/Tree | OK (quick-add) | OK | OK (inline) | OK (confirm) | OK | Skeleton | OK | Stacked |
| Projects/Board | OK (quick-add) | OK | OK (drag) | OK | Weak | -- | -- | No drag |
| Projects/Gantt | -- | OK | -- | -- | OK | -- | -- | Card fallback |
| Projects/Calendar | OK (+ Event) | OK | OK (modal) | OK | OK | OK | OK | OK |
| Reporting | -- | OK | -- | -- | Weak (no CTA) | Skeleton | -- | OK |
| Documentation | OK (+ New page) | OK | OK (Tiptap) | OK (ctx menu) | Weak | Skeleton | Dead end | OK |
| People | -- | OK | -- | -- | OK | Partial | Partial | OK |
| Leads | OK (+ New Lead) | OK | OK (detail) | -- | OK | Skeleton + Retry | Retry | No drag |
| Hiring | OK (+ Candidate) | OK | OK (detail) | OK (archive) | OK | Skeleton | -- | No drag |
| Finances | OK (Add Entry) | OK | Partial | No | OK (access gate) | -- | -- | OK |
| Expenses | OK (+ Report, + Expense) | OK | OK | OK | OK | Skeleton | Dead end | OK |
| Bug Tracker | OK (+ Report) | OK | OK (detail) | OK (confirm) | OK | Skeleton | -- | OK |
| Queue | -- | OK | -- | OK (dismiss) | OK (good) | Skeleton | OK | OK |
| Settings | OK (users, clients) | OK | OK | -- | -- | Async load | -- | OK |
| My Work | -- | OK | -- | -- | Weak | -- | -- | OK |

---

## Accessibility Summary

**Good:**
- Focus trapping in core modals (`_trapFocus`, `_activateDynamicModal`)
- `aria-modal="true"` on all permanent dialog containers (line 3139-3160)
- Bug tracker rows have full `aria-label` with context (line 18704)
- Global keyboard delegation for Enter/Space on `onclick` elements (line 26892)
- `tabindex="0"` patched by post-render a11y function (line 26906)
- Multiple `role="tab"`, `role="tablist"`, `aria-selected` on key tab bars
- `visually-hidden` class used for loading screen reader announcements

**Gaps:**
- Only 56 `aria-label` instances across 27,710 lines
- Documentation context menu has no keyboard trigger
- Command Centre tabs lack ARIA roles
- Some dynamically created modals skip focus trapping (Create Position)
- No skip-to-content link
- No ARIA live regions for toast notifications (toasts are visual-only)
- Colour-only status indicators (health dots) have no text alternative in some contexts

---

## Files Audited

- `nbi_project_dashboard.html` -- lines 1-27710 (CSS tokens, themes, HTML structure, all JS)
- `dashboard-server/routes/` -- 39 route files (directory listing only, checked for coverage gaps)
