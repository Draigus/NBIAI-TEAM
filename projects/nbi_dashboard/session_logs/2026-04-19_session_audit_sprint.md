# Session Log -- 2026-04-19 (audit sprint continuation)

## Session start

Loaded handoff: `session_handoffs/handoff_2026-04-19_inventory_and_permissions.md`
HEAD: `6ba4bff` on master. No code changes since last session.

**Starting state:**
- 16/20 critical audit items shipped
- 4 critical items remain: B-C1 (Glen manual), F-C2 (cookie port), F-C7 (finance conflict UI), B-C2 (restore validation)
- 64 Bad-tier items open, 47 Needs Review items open
- Feature backlog: G5 client scoping, news aggregator M3-M5, email (blocked on SMTP), several brainstorm-needed items

Awaiting Glen's direction on what to work on.

---

## Audit verification and remaining fixes

Glen directed: "do all the ones you can do on your own."

### Verification pass

Systematically verified every Bad-tier item (64 total) against the current codebase. Found that the vast majority were already shipped in prior sessions (commits cb86041, 6ba4bff, 7ca259a, bb6aef5, 8a31b48, dec1652, 49fee40, 15522a5, and others).

**Items confirmed already fixed (not in the audit's shipped count):**
- F-B3 (parseFloat NaN guards), F-B4 (prompt() replaced), F-B5 (alert() removed), F-B6 (most noopener), F-B12 (null guard), F-B13 (sort preserved), F-B15 (Gantt banner), F-B18 (escAttrJs), F-B19 (safeUrl), F-B20 (cycle guard)
- B-B1, B-B2, B-B4, B-B5, B-B6, B-B7, B-B8, B-B9, B-B10, B-B11, B-B13, B-B16, B-B19, B-B20, B-B21, B-B25, B-B27
- N-B9, N-B14, N-B15

### Fixes applied this session

1. **B-B3**: Added `is_active` to PATCH /api/users/:id allow-list. Admins can now deactivate users through the API. When is_active is set to false, all sessions for that user are immediately deleted and their token cache entries are cleared.

2. **B-B15**: Added per-item validation to POST /api/tasks/bulk: title required (string, max 500), status must be in VALID_STATUSES, client_id must be valid UUID, item_type must be in ITEM_TYPES. Also added batch size limits (1-500).

3. **F-B6 (partial)**: Added `rel="noopener noreferrer"` to the 2 remaining `target="_blank"` links on the client report generation overlay (PDF download + HTML preview).

### Tests
128 vitest tests pass. No regressions.

### What remains open

**Critical (2):**
- B-C1: Credential rotation (Glen's manual work)
- F-C2: Session cookie port (high-risk, needs focused session with browser verification)

**Bad tier - still open (architectural/performance, not mechanical fixes):**
- B-B12: Expense-report view fetches full row before access check (minor - access check is correct, just ordered sub-optimally)
- B-B14: Calendar visibility degrades silently on DB errors
- B-B17: Contract PDFs retained with no cleanup
- B-B22: Notification fan-out errors silently drop
- B-B23: shiftForInsert O(N) per insert (performance)
- B-B24: Several aggregates no pagination (performance)
- F-B1/F-B2: Attachment upload uses localStorage token (blocked on F-C2)
- F-B7: Polling intervals may double-up after re-login (mitigated with clearInterval)
- F-B8: Board-drop bypasses sync/conflict detection
- F-B11: toggleStandupDone triggers full renderContent() (performance)
- F-B16: Window globals as view state (architectural)
- F-B17: renderAll/renderContent near-duplicates (architectural)
- F-B21: pushState on every filter pollutes back-history (architectural)
- F-B22: ~211 inline onclick handlers (architectural, blocks strict CSP)

**Needs Review (47):** All still open. These are architectural judgement calls, not bugs.

---

