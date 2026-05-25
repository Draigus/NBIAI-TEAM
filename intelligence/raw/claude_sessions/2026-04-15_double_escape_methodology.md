---
source: claude
source_id: handoff_2026-04-15a_double_escape_migration
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-15a_double_escape_migration.md
ingested: 2026-05-25
topics_detected: [data-migration, xss-strategy, storage-encoding]
relevance_score: 7
novelty_score: 8
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Double-Escape Migration: Escape at Render, Never at Storage

## Key Content

Every text field in WorkSage was being HTML-escaped twice -- once by server escHtml() on write, once by frontend esc() on render. Each save compounded entities: can't > can&#39;t > can&amp;#39;t. The fix principle: stop escaping at storage time, escape only at render time. Raw text in DB is correct because XSS protection is the frontend's job via esc() at render, any data consumer (export, backup, API) gets usable text, and re-serialisation does not compound entities. The migration used a PostgreSQL fixpoint loop function that iterates replacements until no change, with &amp; decoded FIRST because other entities contain amp sequences. Server-side escHtml retained only for server-rendered HTML (public client reports, email bodies).

## Decisions / Insights

- Canonical XSS model: escape at render, never at storage -- raw text in the database
- Migration must decode in a loop until fixpoint (multiple layers of escaping need multiple passes)
- Order matters: &amp; must be decoded first because &amp;#39; contains amp
- Server-side escHtml is ONLY for server-rendered HTML surfaces (reports, emails)
- escAttrJs() is separate from esc() -- used for onclick attribute JS string contexts
- Backup compatibility: post-migration backups are safe, pre-migration backups will re-corrupt

## Context

This was the single most impactful data quality fix. It affected every text field across tasks, leads, expenses, bug reports, candidates, contacts, calendar events, teams, and hiring positions.

## Applicability

- Any new text field must follow the same pattern: raw storage, escape at render
- Never add escHtml() to a write path -- check PR diffs for this pattern
- Migration scripts that modify text must use fixpoint loops, not single-pass replacements
- Always back up the database before running text-transformation migrations
