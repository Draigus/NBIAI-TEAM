---
source: claude
source_id: handoff_2026-04-15b_test_infra_and_kanban_next
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-15b_test_infra_and_kanban_next.md
ingested: 2026-05-25
topics_detected: [testing-strategy, vitest, playwright, test-architecture]
relevance_score: 7
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Test Infrastructure Architecture: Vitest + Playwright on CJS Server

## Key Content

Test infrastructure for a CJS Express server using Vitest (ESM) + Playwright. Key patterns: test files use .mjs extension for ESM, import CJS via createRequire(import.meta.url). Server's app.listen wrapped in require.main guard with module.exports = app for testability. Separate test database (nbi_dashboard_test) with baseline-schema.sql (pg_dump snapshot) loaded before migration runner runs. Shared pool from helpers/db.js is module-cached -- never call pool.end() in tests. Dashboard polls continuously so never use waitForLoadState('networkidle') in Playwright -- use locator timeouts instead. Fixture factories (createTestUser/Client/Task/BugReport) provide consistent test data.

## Decisions / Insights

- D79: Kanban drag-to-reorder uses dense integer position column, not priority enum
- .mjs test files solve ESM/CJS interop without refactoring production code
- baseline-schema.sql (pg_dump) is needed because early migrations assume tables from standalone scripts
- Never call pool.end() in test files -- Vitest fork termination handles cleanup
- Polling SPAs break networkidle -- use explicit waits instead
- Test-first development is mandatory for server endpoints per CLAUDE.md

## Context

This infrastructure serves all subsequent test-driven development. 23 initial tests grew to 400+ by mid-May.

## Applicability

- New test files must use .mjs extension and createRequire pattern
- New features need fixture factory extensions (createTestLead, createTestCandidate, etc.)
- Baseline schema must be refreshed after manual schema changes on dev DB
- E2E tests must never rely on networkidle for SPAs with polling
