# Theme Contrast & Colour Audit Handoff — 2026-06-05

## What Was Done

### Phase 1: Text Contrast Fix (COMPLETE)
- **Removed `--text-faint` token** from all 8 themes (Dark, Light, Midnight, Nord, Solarized, Dracula, Emerald, Command)
- **Replaced all `var(--text-faint)` usages** (~25 instances) with `var(--text-muted)`
- **Fixed `--text-muted` contrast** in 5 themes to pass WCAG 4.5:1 on card backgrounds:
  - Midnight: `#7a8ba4` → `#8a99b0` (5.06:1)
  - Nord: `#8893aa` → `#a7b0c0` (4.61:1)
  - Solarized: `#839496` → `#93a1a1` (4.86:1, canonical base1)
  - Dracula: `#7585b5` → `#95a2c6` (4.64:1)
  - Command: `rgba(232,236,241,0.38)` → `rgba(232,236,241,0.55)` (5.14:1)
- **Fixed semantic colour contrast** in 3 themes:
  - Nord danger: `#bf616a` → `#d9a2a6` (4.63:1 on bgCard)
  - Solarized success: `#859900` → `#90a318`, warning: `#cb4b16` → `#e57e55`, danger: `#dc322f` → `#e97977`
  - Dracula danger: `#ff5555` → `#ff7878` (4.61:1 on bgCard)
- **Fixed question text inheritance bug**: `div#qbQuestionsList` was setting `color:var(--text-muted)` which cascaded to all question text. Added explicit `color:var(--text-primary)` to question text element at line ~21262.
- All contrast ratios verified passing via script.

### Phase 2: Hardcoded Colour Replacement (IN PROGRESS — ~70% done)
Replaced hardcoded hex colours with semantic CSS tokens throughout `nbi_project_dashboard.html`.

**Control Centre CSS (lines ~2899-2977):** FULLY CONVERTED to tokens:
- `#0d1117` → `var(--bg-base)`, `#161b22` → `var(--bg-raised)`, `#30363d` → `var(--bg-hover)` / `var(--border-default)`
- `#f85149` → `var(--danger)`, `#3fb950` → `var(--success)`, `#d29922` → `var(--warning)`, `#58a6ff` → `var(--accent-text)`
- `#484f58` → `var(--text-muted)`, `#a371f7` → `var(--purple)`, `#238636` → `var(--success)`
- All `.cc-tag`, `.cc-badge`, `.cc-btn` variants converted

**Bulk replacements done (both `color:` and `background:` forms, with and without spaces):**
- `#f85149` → `var(--danger)` (GitHub red)
- `#3fb950` → `var(--success)` (GitHub green)
- `#d29922` → `var(--warning)` (GitHub amber)
- `#58a6ff` → `var(--accent-text)` (GitHub blue)
- `#484f58` → `var(--text-muted)` (GitHub grey)
- `#a371f7` → `var(--purple)` (GitHub purple)
- `#ef4444` → `var(--danger)` (standard red)
- `#22c55e` → `var(--success)` (standard green)
- `#f59e0b` → `var(--warning)` (standard amber)
- `#dc2626` → `var(--danger)` (dark red)
- `#64748b` → `var(--text-muted)` (slate grey)
- `#7c3aed` → `var(--purple)` (purple)
- `#60a5fa` → `var(--accent-text)` (light blue)
- `#3b82f6` → `var(--accent-text)` (blue)
- `#2563eb` → `var(--accent-text)` / `var(--accent)` (blue)
- `#10b981` → `var(--success)` (teal green)
- `#0d1117` → `var(--bg-base)` (dark bg)
- `#30363d` → `var(--bg-hover)` (hover bg)
- `#1f6feb` → `var(--accent)` (blue bg)
- `#238636` → `var(--success)` (green bg)
- `#e0e0e0` → `var(--text-primary)` (light grey text)
- `#e6edf3` → `var(--text-primary)` (light text in CC)
- `#94a3b8` → `var(--text-muted)` (slate muted)
- `#e2e8f0` → needs conversion (3 uses in news monthly section)

**Started at 310 hardcoded instances, now approximately ~140 remaining.**

### What's Left — Hardcoded Colours

1. **`#fff` (68 uses)** — White text on coloured backgrounds. Most are intentional (white on accent buttons/badges). Need case-by-case review: some should stay `#fff`, some should be `var(--text-primary)`.

2. **News monthly section (lines ~2718-2726)** — Has hardcoded `#0f172a`, `#1e293b`, `#e2e8f0`, `#94a3b8`, `#cbd5e1`, `#f1f5f9`, `#475569`. Needs full conversion to tokens.

3. **Tooltip styles (lines ~3121-3131)** — `#1a1a2e` and `#e8e8f0` for tooltip bg/text. Should be `var(--bg-raised)` / `var(--text-primary)`.

4. **Verify badges (lines ~1732, 2786)** — `#fef3c7` / `#92400e` combos for light-yellow warning badges. These are light-theme-specific and need a theme-aware approach.

5. **Gantt bar progress colours** — Some remaining `#f59e0b` in background properties within gantt CSS.

6. **ATS calendar area (lines ~2230-2300)** — Some remaining `#7c3aed` border-bottom-color and search focus border.

7. **CC remaining JS template strings** — Several functions render CC content with inline hardcoded colours. Search for functions containing `#f85149`, `#3fb950`, `#d29922`, `#58a6ff`, `#0d1117`, `#161b22`, `#238636`, `#2ea043`, `#e8a87c` in the JS section (lines 24000+).

8. **Interview decision buttons (lines ~22579-22600)** — `#2a2218`, `#4a4a2d`, `#e8d87c`, `#2d4a2d`, `#7dce7d`, `#3a6a3a`, `#e87d7d`, `#4a2d2d`. These are hardcoded hold/advance/reject button colours.

### What's Left — Font Sizes

**Below 12px (60 instances — MUST FIX):**
- `0.6rem` (10.2px) — 2 uses
- `0.65rem` (11.1px) — 3 uses
- `0.68rem` (11.6px) — 4 uses
- `0.7rem` (11.9px) — 3 uses
- `8px` — 1 use
- `10px` — 17 uses
- `11px` — 29 uses

**Below 14px but above 12px (1,186 instances — need triage):**
- `0.72rem` (12.2px) — 11 uses → bump to 0.75rem minimum
- `0.75rem` (12.8px) — 595 uses → bump to 0.82rem for body content, keep for tags/badges
- `0.78rem` (13.3px) — 290 uses → bump to 0.82rem for body content
- `0.8rem` (13.6px) — 72 uses → close to 14px, borderline
- `0.82rem` (13.9px) — 207 uses → close enough to 14px
- `12px` — 122 uses in inline styles → bump to 13px minimum
- `13px` — 47 uses → borderline

**Glen's font rules:** Min 12px anywhere, body 14-15px, data 16px+.

**Strategy:** Don't blindly bump everything — tags, badges, and uppercase labels can be smaller. Focus on:
1. Fix all below-12px to at least 12px
2. Bump 0.75rem content text to 0.82rem (CSS class changes fix hundreds of inline uses)
3. Leave tags/badges/uppercase labels at 0.75rem (they're readable at 12.8px with the uppercase + weight)

### Tests
- Unit tests: 683 passed, 21 failed (all pre-existing: 19 from missing DB tables in test env, 2 slack-bot assertion mismatches). None related to CSS changes.
- E2E tests not yet run for this session.

### Files Changed
- `nbi_project_dashboard.html` — all changes in this one file

### Branch
- `feature/command-centre` — all work is uncommitted
