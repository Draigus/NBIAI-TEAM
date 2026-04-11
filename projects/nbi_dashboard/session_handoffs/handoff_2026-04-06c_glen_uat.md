# Handoff -- 2026-04-06c -- Glen UAT + Feature Build (RECOVERED FROM RAW TRANSCRIPT)

This handoff was reconstructed from the raw JSONL transcript after context compaction destroyed the active conversation. Every detail below comes from Glen's 78 messages and 335 assistant responses in `f36b36e9-490d-41ea-99f8-fe07fb436840.jsonl`.

## Session Summary
Glen performed live UAT on the dashboard from both desktop and phone. 14 features built from real-time feedback. Major scroll preservation engineering. Receipt OCR pipeline built. Mobile expense view reworked. Auto-compact permanently disabled.

## What's Running
- **Server:** `node dashboard-server/server.js` on port 8888
- **DB:** PostgreSQL at `postgresql://nbiai:***@localhost:5432/nbi_dashboard`
- **Files:** `dashboard-server/server.js` (~3,400 lines), `nbi_project_dashboard.html` (~9,800 lines)
- **Auth:** Token-based, default password `nbi2026`, Glen's username `glen`
- **NPM deps added this session:** `tesseract.js`, `pdf-parse`, `sharp` (for receipt OCR)
- **External API:** OCR.space free tier (500 req/day, 1MB limit, no API key needed)

---

## Glen's Exact Directives (Verbatim Quotes)

### Message 2: Task Detail + Standup Inline
> "If there's a client attached, we don't need to show the dropdown. On the properties of a task at some point I accidentally let you add a set timer, which doesn't make any sense."
> "On the stand-up work by person, it'd be good to have drop-downs for all of the task fields right there across the bar, so that you don't have to open the ticket. You can just change, add hours, do whatever you need to with that task on that single bar. So status, priority, health, assigning start and end and due dates, and our estimate as well as dependencies should be listed on the bar if we can make them fit."

### Message 4: Desktop Layout
> "In widescreen or full desktop view, the adjustment you made to the stand up work by person should have all the fields after the name, not underneath it. You've got the priority and the status anchored to the right, which is strange."

### Message 6: Sort Order + At Risk
> "Okay, let's please sort the ones that are working, the ones that are done. I don't even know for sure why we would want done in the workload list. And can you please look at the at-risk section and align everything? The chaotic nature of how it's formatting out of the page is driving me crazy."

### Message 8: Multi-Column At Risk
> "I really wanted the at risk in two columns or perhaps three columns, but I wanted the columns formatted correctly. not put into one column"

### Message 10: Title Cutoff
> "can we space this out better its cutting off the title" (with screenshot showing 2051x702 viewport)

### Message 13: Live Updates
> "Please check and make sure all the fields update when a task is updated on every page so that the new information gets updated immediately when it's changed. It shouldn't require a dashboard refresh by the user."

### Message 15: Scroll Preservation (CRITICAL)
> "ok it updates but it resets the page to the top of the page which is bad UX the page shouldnt reset the to the top it should not reload the whole page if possible jsut the element update. so the user doesnt loose thier place"

### Message 17: Still Resetting
> "still reloads the page and resets"

### Message 19: Rethink Logic
> "nope it still resets the sheet to the top after updating a field, seems like we need to rethink the logic"

### Message 21: Page Flash
> "still it still refreshes the page but now at least it scrolls to back to the field working on, there shouldnt ideally reload the page"

### Message 23: Hover Brightness
> "when you mouse over items in the work by person can you please increase the blue highlight brightness so its easier to see?"

### Message 24: Check Remaining Work
> "much better thanks, what do we have left to do? check back through the project"

### Message 25: UAT Review of Audit Findings
> "lets do 1, 2,3,4" [Finance P&L, Board filter, Gantt scope, Drag-and-drop]
> "do UI/UX"
> "5 that will change with more data so no changes needed" [Health chart]
> "6 that will change with more data so no changes needed" [EST/ACTUAL columns]
> "7 that will change with more data so no changes needed" [Finance bars]
> "8 - fix these" [Leads typos -- data issue, not code]
> "9 explain this one?" [Duplicate portfolio tables -- already resolved]
> "10 TBD is fine until tom tells me or adds the amount" [Blizzard P&L]
> "11 agreed fix" [Sidebar dots]
> "12 agreed fix" [Standup chevrons]
> "13 agreed fix, also the setting are a bit of a mess we need to fix the UI/UX there all around" [Settings overhaul]

### Message 27: Leads Drag-and-Drop
> "The leads dashboard should allow us to drag and drop leads higher and lower based on priority."

### Message 28: Consistent Board Behaviour
> "this should be consistent behaviour on all dashboards"

### Message 29: Lead Contact Info
> "lead cards need contact info name, email, phone number"

### Message 32: Lead Detail Direct Edit
> "I shouldnt have to go to the manage leads section to add details they should be on the card when I click on the leads board"

### Message 34: Receipt Upload + OCR
> "ont he expenses view there needs to be an upload button for receipts. it would be great if we can then extract all fields needed from the receipts and add expanse lines clearly adding all details from the reciept as needed"

### Message 38: Free OCR, No External API
> "no i want the amounts read and added I dont want an external api, we can add a skill or something free if thats an option"

### Message 41: Mobile Upload Failure
> "uploading receipt process failure on my phone"

### Message 49: Processing Error
> "recieept oricessing failure: unknown error"

### Message 53: Better OCR Engine
> "if tesseract sucks is there a better one?"

### Message 54: Approve OCR.space
> "yup" (to OCR.space suggestion)

### Message 57: Wrong Extraction
> "it labelled the expanse wrong and didnt add the amount, should have had the fare and tip itemization"

### Message 63: Currency Misread
> "Ok, that one did a whole lot better. It just misread the pound sign for a dollar sign."

### Message 66: Currency Logic (CRITICAL)
> "well thats not a good result we jsut went to gdc in san fran and incurred alot of expenses and there are us employees as well as uk employees so it need to read teh symbol correctly or remove it all together and go from the drop down. it would be better if it read it right"

### Message 71: Save & Close
> "I'd like a save button for the expense so I can hit the save button, so it should be saving close" [*close]

---

## Decisions Made This Session (D47-D58)

### D47: Remove Timer from Task Detail
Timer was accidentally added. Remove it.

### D48: Client Field -- Text When Set
Show client as text+badge when already assigned. Only show dropdown when no client is set.

### D49: Standup Inline Editing
All task fields editable directly on the standup bar. On desktop, all fields on one line.

### D50: Standup Sort Order
Blocked > overdue > planning > in progress > drafted > in review > done (sprint only).

### D51: No Scroll Reset on Field Update
Page must NOT reset scroll position when updating fields. No page reload, just element updates. Glen tested this 5 times before it was right.

### D52: Drag-and-Drop on All Boards
Consistent drag-and-drop priority reordering on Tasks Board AND Leads Kanban.

### D53: Lead Contact Info on Card
Contact name, email, phone editable directly on the lead detail card. Don't need to go to Manage Leads.

### D54: Receipt OCR Upload
Upload receipts, extract fields automatically. Free tools only. OCR.space approved.

### D55: Currency Detection -- No Symbols
OCR misreads pound/dollar signs. Use explicit text mentions only ("USD", "GBP", "EUR", "SEK"). Fallback to user's last expense currency. Company has both UK and US employees (GDC San Francisco expenses).

### D56: Save & Close on Expense Detail
Explicit save button so user can review OCR data, make corrections, and confirm.

### D57: Mobile Expense View -- Cards Not Table
Expense list view on phone is terrible. Needs card-based layout.

### D58: Disable Auto-Compact -- Manual Handoff Only
Auto-compact is permanently disabled. When context gets heavy, write full handoff and tell Glen to start new chat.

---

## Features Built (14 Total)

### 1. Timer Removed from Task Detail
- **What:** Removed timer button from detail panel and `startTimer`/`stopTimer`/`_activeTimer` JS functions
- **Files:** `nbi_project_dashboard.html` lines ~4140-4145 (button), ~8959-8996 (JS)
- **Also cleaned:** `_activeTimer` reference in logout handler at line ~1358

### 2. Client Field -- Text When Set
- **What:** If client is already set, show text + coloured badge. Only show dropdown when no client assigned.
- **Files:** `nbi_project_dashboard.html` lines ~3725 (inline detail) and ~4126 (full detail)

### 3. Standup Inline Editing
- **What:** All task fields (status, priority, health, assignee, start/end/due dates, hours est, dependencies) editable directly on the standup Work by Person task bar
- **New functions:** `standupUpdateTask()`, `standupSelect()`, `standupDate()`, `standupAssigneeHtml()`, `standupAddAssignee()`, `standupRemoveAssignee()`, `toggleStandupPerson()`
- **CSS:** `.standup-task`, `.standup-task__row`, `.standup-task__title { flex: 1 1 200px; }`, `.standup-inline`, `.standup-inline--select`, `.standup-inline--date`, `.standup-inline--number`
- **State:** `_expandedStandupPeople` Set preserves expansion state across re-renders
- **Layout bug:** Title was taking all space (2694px) due to implicit `flex-grow:1`. Fixed with explicit `flex: 1 1 200px`.

### 4. Standup Sort Order
- **What:** Tasks sorted: blocked (0) > overdue (1, excludes Done) > planning (2) > in progress (3) > drafted (4) > in review (5) > done (6, this sprint only)
- **Implementation:** `standupSortOrder` map, overdue check excludes Done tasks, Done filtered to current sprint

### 5. At Risk/Blocked Grid Layout
- **What:** CSS grid cards replacing CSS columns. `repeat(auto-fill, minmax(340px, 1fr))`.
- **CSS:** `.risk-grid`, `.risk-card` classes
- **Card structure:** Top row: client badge + title + health badge. Bottom row: assignee + reason text.
- **Previous issue:** CSS `column-rule` layout was "chaotic" and "driving Glen crazy"

### 6. Scroll Preservation (MAJOR -- 5 Iterations)
- **Problem:** `renderAll()` rebuilds entire view, resetting scroll. 10-second sync poll also called `renderAll()` when it detected own changes bouncing from server.
- **Iteration 1:** Save/restore `scrollTop` on `.main__content` around `renderAll()` -- failed because standup renders async 50ms later
- **Iteration 2:** `_scrollRestoreTarget` global, deferred restore at end of `renderStandupSection` -- failed because wrong `currentView` check (`'report'` instead of `'dashboard'`)
- **Iteration 3:** Fixed condition to `currentView === 'dashboard'` -- worked for scroll restore but still showed page flash
- **Iteration 4:** Made `standupUpdateTask()` bypass `renderAll()` entirely, targeted DOM updates only -- no flash for standup edits
- **Iteration 5:** Added `_lastLocalSyncTime` cooldown (15s) to suppress sync poll re-renders of own changes
- **Final solution (3 mechanisms):**
  1. `standupUpdateTask` bypasses `renderAll()` -- targeted updates only
  2. `_scrollRestoreTarget` for deferred restore when `renderAll()` must be called
  3. Sync poll cooldown (`_lastLocalSyncTime`) -- skips re-render if within 15s of local save

### 7. Hover Highlight
- **CSS:** `.standup-task:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface)); }`

### 8. Finance P&L Sidebar
- **Cash Runway metric** added to sidebar
- **P&L Summary waterfall** chart showing Revenue, Cost of Services, Gross Profit, Overheads, Other Income, Net Profit with colour-coded bars
- **File:** `nbi_project_dashboard.html` Finance view sidebar section

### 9. Project Filter Dropdown
- **What:** "All Projects" dropdown added to shared filter bar after People dropdown
- **Implementation:** Uses `getRootTasks()`, populates dropdown, sets `currentFilter.project`
- **Scope:** Applies to Board, Gantt, Tree, Calendar (all use `getFilteredTasks()`)
- **Also added:** Filter chip so active project filter is visible and clearable
- **Note:** This also covers the "Gantt scope selector" requirement -- same filter bar

### 10. Settings Tabbed Overhaul
- **What:** 5 tabs (Account, Team, Config, Data, Changelog) replacing one long scroll
- **State:** `window._settingsTab` tracks active tab
- **Inline editable:** Display name and email fields in User Management table via `updateUserField()` function
- **Names fixed:** "Ruan" -> "Ruan Pearce-Authers", "Stavros" -> "Stavros Kylakos", "Patrice" -> "Patrice Love" in hardcoded data arrays (clientBriefs line ~1620, payroll line ~5244)
- **Note:** DB records still need manual editing in the Team tab

### 11. Board Drag-and-Drop
- **What:** Within-lane priority reordering + cross-lane status change on Tasks Board
- **Functions:** `onBoardDragOver()` shows blue drop indicator, `onBoardDrop()` handles both
- **Priority mapping:** Top = Critical ACT, then Urgent, High, Medium, Low based on drop position
- **CSS:** `.board-drop-indicator`
- **Toast:** Confirms change on drop

### 12. Leads Drag-and-Drop
- **What:** Within-lane priority reordering + cross-lane stage change on Leads Kanban
- **Functions:** `onLeadLaneDragOver()`, `onLeadLaneDragLeave()`, `onLeadDrop()` with position-based priority
- **CSS:** `.leads-drop-indicator`

### 13. Lead Detail Contact Info
- **What:** Contact name, email, phone editable directly on lead detail panel. "Add" row for new contacts.
- **Functions:** `patchContact()` (inline edit on blur), `addContactFromDetail()` (add new contact)
- **Server changes:**
  - Auto-migration: `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)` / `phone VARCHAR(100)`
  - Contacts POST/PATCH updated to accept email/phone
  - Leads GET queries return `primary_contact_email`, `primary_contact_phone`
- **CSS:** `.leads-card__contact`

### 14. Expense Receipt Upload + OCR Pipeline
- **Upload button:** "Upload Receipt" (camera icon) next to "+ New Expense" on Expenses view
- **File picker:** `accept="image/*,.pdf"` (no `capture` attribute so phone shows camera + library choice)
- **Server endpoint:** `POST /api/expenses/from-receipt` (multipart file upload)
- **OCR pipeline:**
  1. If image > 900KB, resize to 1600px width JPEG quality 75 via `sharp`
  2. Send to OCR.space API (Engine 2, with table detection, no API key needed, 500 req/day free)
  3. If OCR.space fails, fall back to Tesseract.js (local, slower, less accurate)
  4. Extract text, run `extractReceiptFields()` regex parser
- **Field extraction (`extractReceiptFields`):**
  - **Amount:** Looks for labelled totals first ("total", "amount due", "grand total", "balance due", "net amount"), falls back to largest number
  - **Date:** Multiple formats: DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY, Month DD YYYY
  - **Currency:** Explicit text only ("USD", "GBP", "EUR", "SEK") -- NOT from symbols (OCR misreads £ as $)
  - **Vendor:** First substantial line of text (not a number, not a date)
  - **Itemization:** fare, tip, tax/VAT/GST, subtotal, service fee, discount, booking fee, delivery
- **Currency fallback chain:** OCR text mention > user's last expense currency > GBP
- **Creates:** Expense record (status: pending) with receipt attached, opens detail panel for review

### Post-Compaction Additions:
15. **Save & Close button** on expense detail panel
16. **Mobile expense card layout** for <768px screens

---

## Bugs Found and Fixed

### Title Taking All Space (2694px)
- `flexGrow: "1"` was computed on `.standup-task__title` despite not being explicitly set
- Fixed: `flex: 0 1 auto` initially, then changed to `flex: 1 1 200px` when Glen said titles were cut off

### Wrong currentView Check
- Used `currentView !== 'report'` for scroll restore but Workload tab is `currentView === 'dashboard'`
- Fixed condition

### Scroll Reset from Sync Poll (ROOT CAUSE)
- 10-second poll detected own changes bouncing from server, called `renderAll()`
- Fixed: `_lastLocalSyncTime` set in `syncToAPI()`, poll skips re-render if within 15s

### Assignee Controls Calling updateTask
- `addAssignee()`/`removeAssignee()` bypassed `standupUpdateTask`, caused full page re-render
- Created `standupAddAssignee()`/`standupRemoveAssignee()`

### pdfParse Duplicate Declaration
- `const pdfParse` at top (new addition) + `let pdfParse` at line 1089 (original optional import)
- Server crashed with `SyntaxError: Identifier 'pdfParse' has already been declared`
- Fixed: removed the duplicate `let` block

### OCR.space 1MB Limit
- Phone photos were ~2.2MB, exceeding free tier limit
- Fixed: added `sharp` resize to 1600px width, JPEG quality 75 before sending

### Currency Misread
- OCR reads £ as $. Initially hardcoded GBP default, Glen corrected (US employees too)
- Fixed: only use explicit text mentions, fall back to user's last expense currency

### Old Server Running on Port 8888
- Multiple times old server was still running when trying to restart
- Had to `taskkill //F //IM node.exe` before starting new code
- One instance: old server was serving stale code without the `/api/expenses/from-receipt` endpoint

### iPhone HEIC Format
- Added detection and graceful skip (HEIC not supported by Tesseract or OCR.space)
- Tells user to use JPEG

---

## Infrastructure Changes

### Settings File
- `.claude/settings.local.json` -- added `"env": { "DISABLE_AUTO_COMPACT": "1" }`

### CLAUDE.md
- Updated Session Continuity section with Context Warning Protocol
- Auto-compact disabled, manual handoff on context warning

### Memory Files Updated
- `feedback_conversation_length.md` -- updated with no-compact rule

### NPM Dependencies Added
- `tesseract.js` -- local OCR fallback
- `pdf-parse` -- PDF text extraction
- `sharp` -- image resizing for OCR.space 1MB limit

### DB Migrations (auto-run on server start)
- `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`
- `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone VARCHAR(100)`

---

## UI/UX Audit Findings -- Glen's Responses

| # | Finding | Glen's Response | Action |
|---|---------|-----------------|--------|
| 1-4 | Finance P&L, Board filter, Gantt scope, Drag-drop | "lets do 1, 2, 3, 4" | Built all four |
| 5 | Health chart nearly invisible | "will change with more data" | No action |
| 6 | EST/ACTUAL columns all 0.0h | "will change with more data" | No action |
| 7 | Finance bars flat | "will change with more data" | No action |
| 8 | Leads typos ("Mutliple", "insomniac") | "fix these" | Data issue, not code |
| 9 | Duplicate portfolio tables | "explain this one?" | Already resolved |
| 10 | Blizzard "TBD" in P&L | "TBD is fine until tom tells me" | No action |
| 11 | Sidebar dots too small | "agreed fix" | Fixed: 7px -> 10px |
| 12 | Standup chevrons invisible | "agreed fix" | Fixed: 0.6rem -> 0.75rem |
| 13 | Settings messy | "agreed fix, also the setting are a bit of a mess" | Tabbed overhaul |

---

## How to Start
```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node server.js
# Server runs on http://localhost:8888
# Dashboard at http://localhost:8888/nbi_project_dashboard.html
# Login: glen / nbi2026
```

## Next Session Instructions

1. **Load this handoff** -- `projects/nbi_dashboard/session_handoffs/handoff_2026-04-06c_glen_uat.md`
2. **Glen is actively UAT testing** -- more feedback expected
3. **Auto-compact is OFF** -- follow Context Warning Protocol in CLAUDE.md
4. **Log every exchange** -- mechanical rule, no exceptions
5. **Check if server is running** -- kill stale processes first if port 8888 is busy
