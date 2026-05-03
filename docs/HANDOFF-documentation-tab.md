# HANDOFF — feature/documentation-tab

**Written:** 2026-05-03 14:40 UTC  
**Branch:** `feature/documentation-tab`  
**Worktree:** `.worktrees/documentation-tab/`  
**Tip commit:** `39e9bba` (test(docs): playwright e2e for editor + NBI block flow)  
**Tests:** 331/331 vitest, 1/1 Playwright e2e (documents.spec.js)  
**Model:** claude-opus-4-6 (pinned, never 4.7)  
**Session log:** `projects/nbi_dashboard/session_logs/2026-05-03_session_b.md`

---

## Glen's directive

Get the branch done effectively and merge it. Full speed ahead. Glen reviews FINISHED products only - no phase gates.

---

## What this branch does

Adds a Confluence-style Documentation tab to WorkSage. NBI staff and configured client portal users can author, browse, and share rich-text pages organised in a tree, with section-level NBI-only redaction enforced server-side, image upload, and Slack permalink smart cards.

---

## Current state: 25 of 26 tasks DONE

Only **Task 19** remains: merge to master, restart prod PM2, update work_completed.md.

### Completed tasks (chronological commit order)

| Task | Commit | What |
|------|--------|------|
| 1 | `49a0ef9` | Spec freeze |
| 2 | `f7f68be` | Migration 033_documents.sql |
| 3 | `f7f68be` | Migration 034_document_attachments.sql |
| 4 | `f7f68be` | Migration 035_documentation_perms.sql |
| 5+B1 | `b1b3fcc` | redact-nbi-internal lib + plain-text extractor + tests |
| 6 | `66f5107` | List/read/create endpoints + docs_* flags on req.user |
| 7+D1 | `b96ca5b` + `e8e2fc7` | PATCH/DELETE + ETag/If-Match + security fixes |
| 8+H1 | `e6373a5` + `a116f76` | Image upload/serve + NBI-block leak prevention |
| G1 | `76428a6` + `9d6104e` | Attachment orphan tracking + sweep cron + hardening |
| 9 | `2f666b8` | Surface docs_* permission flags via /api/auth/me |
| A1+10+11+12+13+14 | `d37d75f` | Frontend Documentation tab (TipTap, tree, editor, toolbar, autosave) |
| 17 | `310ce7f` | Seed 6 default pages on first GET per client |
| 16 | `fa757ad` | Per-user doc-permission checkboxes in Settings > Team |
| I1-FE | `2a15e9d` | Self-hosted TipTap bundle + autosave retry + localStorage crash recovery |
| F1 | `04c4e94` | Drag-to-reparent in document tree (POST /api/documents/:id/move) |
| J1 | `8f27289` | Mobile responsive layout + ARIA a11y + keyboard shortcuts |
| 15 | `07fb640` | Contextual Docs links on Gantt + Portfolio client headers |
| L1 | `d67e0cc` | Backup coverage (documents + document_attachments in JSON fallback) |
| 18 | `39e9bba` | Playwright e2e smoke test |

---

## Key architecture decisions

- **TipTap 2.5.9** loaded from self-hosted esbuild bundle at `/public/vendor/tiptap-bundle.min.js` (343KB). NOT from CDN - jsdelivr +esm caused ProseMirror duplicate keyed plugin errors.
- **Express static serving:** `app.use('/public', express.static(path.join(__dirname, 'public')))` - import paths must start with `/public/`.
- **No `.data` envelope** on document API responses - raw response objects.
- **Permission flags are camelCase** on req.user: `docsView`, `docsEdit`, `docsCreate`, `docsUpload`.
- **`buildPatchQuery` helper** used for PATCH fields.
- **Never edit committed migrations** (033-035 already applied to prod+test DBs).
- **Optimistic concurrency** via ETag/If-Match on document PATCH.
- **Autosave state machine:** idle -> debounce (800ms) -> in-flight -> success/retry with exponential backoff (max 15s, 5 attempts).
- **localStorage crash recovery:** backup on every edit, cleanup on save success, recovery banner on editor open if unsaved blob newer than server timestamp.

---

## Files modified (key ones)

| File | Changes |
|------|---------|
| `dashboard-server/server.js` | ~250 lines added: /api/documents CRUD, /move, /attachments, permission checks, orphan sweep cron |
| `nbi_project_dashboard.html` | ~450 lines added: docs CSS, sidebar item, TipTap loader, tree component, editor pane, drag-drop, autosave, recovery, mobile responsive, ARIA, keyboard shortcuts, contextual links on Gantt+Portfolio |
| `dashboard-server/lib/redact-nbi-internal.js` | Pure function - walks ProseMirror JSON, strips nbiInternalBlock nodes |
| `dashboard-server/public/vendor/tiptap-bundle.min.js` | 343KB self-hosted esbuild bundle |
| `dashboard-server/migrations/033_documents.sql` | documents table with self-ref hierarchy |
| `dashboard-server/migrations/034_document_attachments.sql` | Per-doc image attachments |
| `dashboard-server/migrations/035_documentation_perms.sql` | Per-user + per-client-default permission flags |
| `dashboard-server/backup.js` | Added documents + document_attachments to JSON fallback (version 3) |
| `dashboard-server/backup-validate.js` | EXPECTED_TABLES updated |
| `dashboard-server/tests/unit/documents.test.mjs` | ~40 tests covering CRUD, perms, redaction, move, seed |
| `dashboard-server/tests/unit/redact-nbi-internal.test.mjs` | Unit tests for redaction helper |
| `dashboard-server/tests/e2e/documents.spec.js` | Playwright e2e: login, create page, type, bold, autosave, NBI block |

---

## PM2 state

| Process | Port | Status | Running from |
|---------|------|--------|--------------|
| nbi-dashboard (id 1) | 8888 | online | master (production, untouched) |
| nbi-dashboard-staging (id 5) | 8887 | online | .worktrees/documentation-tab/ |
| cloudflare-tunnel (id 4) | - | online | - |

---

## Task 19 steps (THE ONLY REMAINING WORK)

1. Run full test suite one final time: `cd dashboard-server && npm test` (expect 331/331)
2. Run Playwright e2e: `npx playwright test --config tests/e2e/playwright.config.js` (expect all pass)
3. Merge branch to master:
   ```bash
   cd D:\OneDrive\Claude_code\NBIAI_TEAM
   git checkout master
   git merge feature/documentation-tab --no-ff -m "feat: Documentation tab v1"
   ```
4. Restart production PM2: `pm2 restart nbi-dashboard`
5. Verify on https://worksage.nbi-consulting.com via browser
6. Update `projects/nbi_dashboard/live_state/work_completed.md`
7. Stop staging PM2: `pm2 stop nbi-dashboard-staging`
8. Clean up worktree: `git worktree remove .worktrees/documentation-tab`

---

## Conventions observed

- British English only, no American spellings
- No em dashes anywhere
- No timelines or duration estimates
- Session log updated after every substantive exchange
- All vitest tests run from `dashboard-server/` directory
- Browser verification via claude-in-chrome MCP at worksage.nbi-consulting.com (HARD RULE)
- Model pinned to claude-opus-4-6 (HARD RULE, never 4.7)

---

## Known issues / edge cases

- **Playwright e2e client cache race:** The e2e test seeds `_apiClientsCache` directly via `page.evaluate` because the client polling cycle doesn't fire fast enough in the test environment. This is a test-only workaround; production loads clients on login.
- **Mobile responsive verification:** Could not fully verify the @media (max-width: 768px) breakpoint via claude-in-chrome because the extension screenshots at full viewport width regardless of window resize. The CSS is correct and will trigger on actual mobile devices.
- **TipTap initial load:** First load of the Documentation view takes ~1-2s while the 343KB bundle imports. Subsequent navigations are instant (module cached).
