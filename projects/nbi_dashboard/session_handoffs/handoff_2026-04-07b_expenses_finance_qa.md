# Session Handoff — 2026-04-07b (Expenses, Finance, QA)

## Session Overview
Picked up from Session E handoff (security/dashboard/expenses). Completed expense receipt matching, finance page restructuring, expense report workflow, full QA/review suite (5 deliverables), security hardening, and bug fixes. P0 crash fix applied.

## Server State
- **Port:** 8888 (running via .claude/launch.json "dashboard" config)
- **DB:** postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard
- **Login:** glen/nbi2026 (admin), tom/nbi2026! (expense approver, also admin role)
- **Other users:** magnus/nbi2026!, devin/nbi2026, jeff/nbi2026, amir/nbi2026 (all member role, default password nbi2026 unless reset)

---

## 1. Expense Receipts — 22 of 69 Attached

### Receipts Successfully Matched
| Vendor | Date | Amount | VAT | Receipt Source |
|---|---|---|---|---|
| Framer Website | Jan 7 | £48.00 | £8.00 | Screenshot PDF from Gmail (gpryer@gmail.com) |
| Framer Website | Jan 30 | £331.20 | £55.20 | Screenshot PDF from Gmail |
| Framer Website | Feb 7 | £48.00 | £8.00 | Screenshot PDF from Gmail |
| Framer Website | Mar 10 | £48.00 | £8.00 | Stripe PDF (Receipt-2885-0915.pdf) |
| Gamma.App | Jan 15 | £20.00 | — | Screenshot PDF from Gmail |
| Gamma.App | Feb 15 | £20.00 | — | Screenshot PDF from Gmail |
| Gamma.App | Mar 15 | £20.00 | — | Screenshot PDF from Gmail |
| Claude/Anthropic | Jan 28 | £18.00 | £3.00 | Generated PDF from Gmail data |
| Claude/Anthropic | Feb 3 | £165.19 | £27.53 | Generated PDF from Gmail data |
| Claude/Anthropic | Mar 3 | £180.00 | £30.00 | Generated PDF from Gmail data |
| Internet (Cuckoo) | Jan 15 | £50.00 | £8.33 | Original PDF from Hotmail (MS365 MCP) |
| Internet (Cuckoo) | Feb 16 | £50.00 | £8.33 | Original PDF from Hotmail |
| Internet (Cuckoo) | Mar 16 | £20.00 | £3.33 | Original PDF from Hotmail |
| ChatGPT/OpenAI | Jan 24 | £17.81 | £2.97 | Original PDF from Downloads folder |
| ChatGPT/OpenAI | Feb 24 | £17.81 | £2.97 | Original PDF from Downloads folder |
| O2 Cell Phone | Jan 22 | £10.00 | — | Generated PDF from Hotmail email (news@o2-email.co.uk) |
| O2 Cell Phone | Feb 22 | £10.00 | — | Generated PDF from Hotmail email |
| Trainline | Jan 18 | £32.69 | — | Generated PDF from Glen's screenshots |
| Trainline | Jan 19 | £48.10 | — | Generated PDF from Glen's screenshots |
| Trainline | Mar 6 | £78.30 | — | Generated PDF from Glen's screenshots |
| Trainline | Mar 14 | £76.20 | — | Generated PDF from Glen's screenshots |
| Taxi | Apr 5 | £49.14 | — | OCR receipt (IMG_5656.jpeg, from previous session) |

### Receipts NOT Found
- **ChatGPT Mar** (£18.11): Not in Downloads. Glen needs to download from platform.openai.com/billing
- **O2 Mar** (£10.00): March renewal email not found in Hotmail
- **GDC trip** (39 expenses, Mar 6-14): Uber, hotels, flights, meals. Uber download pending from Glen (2-3 day wait)
- **Jan 19 London trip** (6 expenses): Uber, restaurants, coffee, taxi

### Email Accounts Searched
- GPBear77@hotmail.com (MS365 MCP) — Cuckoo, O2 found
- g.pryer@couch-heroes.com (Gmail MCP) — nothing relevant
- Gpryer@nbi-consulting.com (MS365 MCP) — nothing relevant
- gpryer@gmail.com (Chrome browser) — Framer, Gamma, Anthropic found

---

## 2. Expense Report

- **Report:** "Monthly Expenses Catch-Up (Jan-Mar 2026)"
- **ID:** bd290104-5ce1-464a-9a96-5d8a53d51ad1
- **Status:** SUBMITTED
- **69 expenses** totalling £2,480.66, VAT £165.66
- All expenses verified: 21 have both bank statement + receipt, 47 bank statement only, 1 receipt only (Apr taxi)

### Full-Screen Report View (nbi_project_dashboard.html)
- Replaced side panel with full-page overlay (z-index 400, class `.report-fullscreen`)
- 4 summary cards: Total Amount, VAT Claimed, Expenses, Receipts
- Expenses grouped by 7 categories with subtotals, each row shows date/description/amount/VAT/receipt status
- Click any expense row → detail sidebar opens on top (z-index 500/501) with receipt preview
- Receipt preview: click receipt link → inline PDF iframe or image display
- **Export Excel** button → CSV download with BOM for Excel UTF-8 compatibility
- **Email** button → downloads ZIP (CSV + 22 receipts + 3 bank statements via archiver npm), then opens mailto to trieger@nbi-consulting.com
- **Submit Report** button → changes status to submitted, auto-dismisses expense reminder notifications, sends in-app notification to Tom
- ZIP export endpoint: GET /api/expense-reports/:id/export (server.js)

### Tom's Approval Flow
- Tom sees submitted reports on his Expenses tab (API: approver sees submitted/approved/rejected)
- Tom can open full-screen view, click into expenses, preview receipts
- **Approve** or **Reject & Return** buttons with mandatory notes textarea for rejection
- `review_notes` column on expense_reports table, displayed on report view
- Tom's email: trieger@nbi-consulting.com (fixed from tom@nbigaming.com in server.js fallback)
- Tom's password: nbi2026! (reset via admin endpoint)

### Non-Dismissable Expense Notifications
- Cron: 25th of every month at 9:00 AM (node-cron in server.js)
- All active users get `expense_reminder` notification with `dismissable=false`
- "Mark all read" skips non-dismissable notifications
- Shown with red "Action required" badge and highlighted background
- Auto-cleared when user submits an expense report (in POST /api/expense-reports/:id/submit)
- `dismissable` column added to notifications table

---

## 3. Finance Page — Major Restructuring

### Summary Tab (first tab)
- **"Cost of Services" → "Staff"** — single section with two sub-groups:
  - Billable (Cost of Revenue): green sub-header, 4 people
  - Non-billable (Overhead): grey sub-header, 4 people (Tom Rieger added at £0)
- **Employer Costs row**: NI + Pension at 15% (editable via click, stored as `employerCostPct` in finance data)
- **Gross Profit = Revenue - Billable Staff (full cost incl. employer %)** — proper consulting P&L
- **"Overheads" → "Operating Expenses"** — 8 seeded OpEx items from Q1 expense data:
  - Software & Subscriptions: £324/mo
  - Travel & Transport: £271/mo
  - Meals & Entertainment: £129/mo
  - Utilities: £50/mo
  - Insurance: £100/mo
  - Accountancy & Legal: £200/mo
  - Office & Workspace: £0/mo
  - Marketing & BD: £50/mo
- P&L waterfall sidebar updated: Revenue → Billable Staff → Gross Profit → Support Staff → OpEx → Net Profit
- P&L CSV export updated to match new structure

### Monthly View Tab (second tab)
- **Horizontal layout**: 12 months across top, categories down left
- Sections: Revenue (by client), Payroll (by person), Operating Expenses (by item)
- **All 132+ cells editable** — saved to localStorage as `nbi_monthly_overrides`
- **Actuals vs Forecast**: Past months shaded green with "actual" label, current highlighted with "current", future dimmed with "forecast"
- **Expense actuals row**: loaded async from GET /api/expenses, shows actual Q1 spend per month
- **Pipeline weighted row**: pipeline opportunities × probability (High=75%, Medium=50%, Low=25%), shown for future months
- Summary rows: Gross Profit, Net Profit/Loss, Cumulative P&L
- First column sticky for horizontal scrolling, FY Total column
- Legend: actual = from expense reports, forecast = projected

### Current P&L Numbers (verified via API)
- Revenue: £650,000
- Billable Staff (incl. 15%): £563,500
- Gross Profit: £86,500 (13% margin)
- Overheads: £208,306
- Net Loss: -£121,806 (-19%)

---

## 4. Dashboard KPI Cards
- Trend arrows font-size: 0.6rem → 0.85rem (was unreadable)
- KPI labels: 0.78rem → 0.85rem
- Responsive breakpoint labels also bumped

---

## 5. Security Fixes Applied

| Issue | Severity | Fix |
|---|---|---|
| No Content-Security-Policy | Critical | CSP header added with script-src, style-src, font-src, img-src, connect-src, frame-src, object-src |
| No rate limiting | Critical | express-rate-limit installed: 120/min API, 15/15min auth endpoints |
| File upload accepts any type | High | Multer fileFilter added: only images, PDFs, spreadsheets, docs, CSV, plain text |
| Uploaded files served without Content-Disposition | High | Non-image/PDF files force attachment download, X-Content-Type-Options: nosniff |
| /api/auth/reset-password skipping auth | High | Auth bypass path narrowed from /api/auth/reset to /api/auth/reset-token only |

---

## 6. Bug Fixes Applied

| Bug | Severity | Fix |
|---|---|---|
| BUG-002: Negative amounts accepted | Medium | PATCH /api/expenses/:id validates amount >= 0 |
| BUG-004: Invalid UUID returns 500 | Low | UUID format regex check before DB query, returns 404 |
| BUG-005: Report status accepts anything | Medium | Status enum validation: draft/submitted/approved/rejected only |
| BUG-006: Finance write not admin-only | High | PUT /api/finance now requires req.user.role === 'admin' |
| P0 crash: duplicate const now | Critical | Removed duplicate variable declaration in monthly view (found by UAT agent) |

---

## 7. Review/QA Deliverables

All in `projects/nbi_dashboard/deliverables/`:

| File | Lines | Summary |
|---|---|---|
| code_review.md | 604 | 35 findings (3 critical, 10 high, 14 medium, 8 low). Top criticals fixed. |
| test_plan.md | 1,036 | 540 test cases across 39 sections. Every API endpoint + all UI features. |
| qa_pass_results.md | 285 | 48 tests run, 38 pass, 7 bugs (4 fixed). Data integrity all verified. |
| ui_ux_audit.md | 592 | Design system strong. Accessibility weakest area (1 ARIA label in 11k lines). 20 recommendations. |
| uat_report.md | ~300 | 12 bugs, P0 fixed. Conditional pass. Backend production-ready, frontend needs perf work. |

---

## 8. Open Issues (Next Session)

### P1 — Must Fix
- **Browser freezes with 1,123 tasks**: No pagination or virtualisation. 30+ second freezes on tab navigation. Needs virtual scrolling or server-side pagination.
- **Finance PUT race condition**: Full JSON replace with no conflict detection. Two users editing simultaneously = silent data loss.

### P2 — Should Fix
- **Pipeline summary NaN**: Backlog stage shows NaN for total_rom_max and weighted values. Null handling in SQL aggregation.
- **People view duplicates**: Free-text assignee names cause "Glen" vs "Glen Pryer" duplication. Capacity grid shows 0% for everyone.
- **BUG-001**: Account lockout shows flag but doesn't actually block. Existing code has threshold of 10, but the counter check may not be enforcing correctly.
- **BUG-003**: XSS stored raw in descriptions. The esc() function is applied on render (correct pattern) but QA flagged it. Verify esc() covers all output paths.

### P3 — Nice to Have
- Accessibility improvements (ARIA, keyboard nav, focus management) per ui_ux_audit.md
- Form validation feedback, loading states per ui_ux_audit.md
- ChatGPT Mar receipt (£18.11) from platform.openai.com
- O2 Mar receipt (£10.00)
- Uber receipts when Glen's download completes

---

## File Locations
- Dashboard HTML: `nbi_project_dashboard.html` (root)
- Server: `dashboard-server/server.js`
- Server config: `dashboard-server/.env`
- Launch config: `.claude/launch.json` (name: "dashboard")
- Uploads: `dashboard-server/uploads/`
- Redacted bank PDFs: `dashboard-server/uploads/Monzo_*_REDACTED.pdf`
- Receipt files: `dashboard-server/uploads/` (various names)
- Session handoffs: `projects/nbi_dashboard/session_handoffs/`
- Deliverables: `projects/nbi_dashboard/deliverables/`
- Finance data: PostgreSQL `finance_data` table (append-only JSON, latest row = current)
- Monthly overrides: Browser localStorage key `nbi_monthly_overrides`
