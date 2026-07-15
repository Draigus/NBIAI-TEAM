# Skill Router and Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ~89 unused skill descriptions from every session's system prompt by archiving them outside the discovery path, routing through a modified gsd router and a new consolidated skill-router.

**Architecture:** Two archive directories (`C:\Users\gpbea\.claude\skills-archive\` for 66 user-level skills, `.claude\skills-archive\` for 23 project-level skills) sit outside Claude Code's skill discovery path. The existing `gsd` router is modified to Read sub-skill files from archive instead of invoking via Skill tool. A new `skill-router` skill consolidates trigger keywords for all non-gsd archived skills and routes via INDEX.md matching. One combined INDEX.md in the project archive catalogs all 89 archived skills.

**Spec:** `docs/superpowers/specs/2026-07-10-harness-efficiency-overhaul-design.md` (sub-project 1)

**Pre-flight results:** No cadence task, mandatory-skill rule, or CLAUDE.md routing table references any archive-target skill. Two orphaned settings.json entries (`Skill(agent-browser)` permission, `autoresearch` additionalDirectories) need cleanup. All clear to archive.

**Conventions:** `$WT` = worktree root path, set during Task 2. All worktree paths use this prefix.

---

### Task 1: Baseline Measurement

**Files:**
- Read: `C:\Users\gpbea\.claude\skills\*\SKILL.md` (67 user-level)
- Read: `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills\*\SKILL.md` (56 project-level)

- [ ] **Step 1: Run measurement script**

Save and run this PowerShell script to count character lengths of all skill descriptions injected at session start:

```powershell
$report = @()
$totalChars = 0

$dirs = @(
    "C:\Users\gpbea\.claude\skills",
    "d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills"
)

foreach ($baseDir in $dirs) {
    if (-not (Test-Path $baseDir)) { continue }
    Get-ChildItem -Directory $baseDir | ForEach-Object {
        $skillFile = Join-Path $_.FullName "SKILL.md"
        if (Test-Path $skillFile) {
            $content = Get-Content $skillFile -Raw -Encoding utf8
            $desc = ""
            if ($content -match '(?s)description:\s*"(.*?)"') {
                $desc = $Matches[1]
            } elseif ($content -match "(?s)description:\s*'(.*?)'") {
                $desc = $Matches[1]
            } elseif ($content -match 'description:\s*(.+)') {
                $desc = $Matches[1].Trim()
            }
            $nameLen = $_.Name.Length
            $descLen = $desc.Length
            $entryOverhead = 4 + $nameLen + $descLen
            $totalChars += $entryOverhead
            $report += [PSCustomObject]@{
                Skill = $_.Name
                DescChars = $descLen
                EntryChars = $entryOverhead
                Source = if ($baseDir -like "*NBIAI*") { "project" } else { "user" }
            }
        }
    }
}

$report | Sort-Object EntryChars -Descending | Format-Table Skill, DescChars, EntryChars, Source -AutoSize
Write-Host "`nTOTAL SKILL ENTRY CHARACTERS (name + desc + formatting): $totalChars"
Write-Host "TOTAL SKILLS: $($report.Count)"
```

Expected: a table showing all 123 skills with per-entry character counts and a grand total.

- [ ] **Step 2: Record the baseline total**

Note the `TOTAL SKILL ENTRY CHARACTERS` number. This is the "before" measurement for the delta report in Task 10.

---

### Task 2: Create Worktree and Archive Directories

**Files:**
- Create: `C:\Users\gpbea\.claude\skills-archive\` (directory)
- Create: `$WT\.claude\skills-archive\` (directory, in worktree)

- [ ] **Step 1: Create worktree**

Use the `using-git-worktrees` skill to create a worktree for branch `feature/skill-router-archive` based on `master`.

Record the worktree path as `$WT` for all subsequent tasks.

- [ ] **Step 2: Create user-level archive directory**

```powershell
New-Item -ItemType Directory -Path "C:\Users\gpbea\.claude\skills-archive" -Force
```

- [ ] **Step 3: Create project-level archive directory in worktree**

```powershell
New-Item -ItemType Directory -Path "$WT\.claude\skills-archive" -Force
```

---

### Task 3: Move Project-Level Skills to Archive (in worktree)

**Files:**
- Move: 23 directories from `$WT\.claude\skills\` to `$WT\.claude\skills-archive\`

The 23 archive-target project-level skills (confirmed by pre-flight -- zero cadence/mandatory-skill references):

```
agent-browser autoresearch churn-prevention competitor-alternatives
compile-client content-strategy copy-editing copywriting customer-research
huashu-design launch-strategy marketing-ideas marketing-psychology
pricing-strategy product-marketing-context proposal seo-audit shadcn
site-architecture vercel-composition-patterns vercel-react-best-practices
vercel-react-view-transitions web-design-guidelines
```

- [ ] **Step 1: Move all archive-target skills with git mv**

Run from `$WT`:

```bash
for skill in agent-browser autoresearch churn-prevention competitor-alternatives compile-client content-strategy copy-editing copywriting customer-research huashu-design launch-strategy marketing-ideas marketing-psychology pricing-strategy product-marketing-context proposal seo-audit shadcn site-architecture vercel-composition-patterns vercel-react-best-practices vercel-react-view-transitions web-design-guidelines; do
    git mv ".claude/skills/$skill" ".claude/skills-archive/$skill"
done
```

- [ ] **Step 2: Verify the moves**

```bash
echo "Remaining in skills/:"
ls .claude/skills/ | wc -l
ls .claude/skills/
echo ""
echo "In skills-archive/:"
ls .claude/skills-archive/ | wc -l
```

Expected: 33 remaining in `skills/`, 23 in `skills-archive/`.

The 33 remaining should be: brain-freshness, brainstorming, compile-bank, dispatching-parallel-agents, executing-plans, financial-reconciliation, finishing-a-development-branch, foundry, game-economy-design, games, gi, gsd, harness-intervention, ingest-chats, ingest-email, ingest-granola, ingest-local, ingest-slack, intel-brief, intel-research, pipeline, recompile-banks, receiving-code-review, requesting-code-review, subagent-driven-development, system-audit, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills.

- [ ] **Step 3: Commit the moves**

```bash
git add -A .claude/skills/ .claude/skills-archive/
git commit -m "$(cat <<'EOF'
refactor: archive 23 project-level skills outside discovery path

Skills archived: agent-browser, autoresearch, churn-prevention,
competitor-alternatives, compile-client, content-strategy, copy-editing,
copywriting, customer-research, huashu-design, launch-strategy,
marketing-ideas, marketing-psychology, pricing-strategy,
product-marketing-context, proposal, seo-audit, shadcn, site-architecture,
vercel-composition-patterns, vercel-react-best-practices,
vercel-react-view-transitions, web-design-guidelines

Part of harness efficiency overhaul sub-project 1.
Pre-flight confirmed zero cadence/mandatory-skill dependencies.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Generate INDEX.md (in worktree)

**Files:**
- Create: `$WT\.claude\skills-archive\INDEX.md`

The INDEX.md catalogs every archived skill (both user-level and project-level) with full original descriptions and archive paths. The skill-router reads this to match requests.

- [ ] **Step 1: Generate INDEX.md with extraction script**

Run this PowerShell script from `$WT`. It reads each archived skill's SKILL.md, extracts the full description, and builds the combined index:

```powershell
$indexContent = @"
# Skills Archive Index

Generated: 2026-07-11
Part of harness efficiency overhaul sub-project 1.

This index catalogs every skill archived from the discovery path.
The gsd router uses direct path mapping (command name = directory name).
The skill-router reads this index to match non-gsd requests.

---

## User-Level Archive (C:\Users\gpbea\.claude\skills-archive\)

"@

function Get-SkillDescription($skillPath) {
    if (-not (Test-Path $skillPath)) { return "(file not found)" }
    $content = Get-Content $skillPath -Raw -Encoding utf8
    if ($content -match '(?s)description:\s*"(.*?)"') { return $Matches[1].Trim() }
    if ($content -match "(?s)description:\s*'(.*?)'") { return $Matches[1].Trim() }
    if ($content -match 'description:\s*(.+)') { return $Matches[1].Trim() }
    return "(no description found)"
}

$userArchive = "C:\Users\gpbea\.claude\skills-archive"
if (Test-Path $userArchive) {
    Get-ChildItem -Directory $userArchive | Sort-Object Name | ForEach-Object {
        $desc = Get-SkillDescription (Join-Path $_.FullName "SKILL.md")
        $indexContent += @"

### $($_.Name)
**Path:** ``C:\Users\gpbea\.claude\skills-archive\$($_.Name)\SKILL.md``
**Description:** $desc

"@
    }
}

$indexContent += @"

---

## Project-Level Archive (.claude\skills-archive\)

"@

$projectArchive = Join-Path $PWD ".claude\skills-archive"
Get-ChildItem -Directory $projectArchive | Sort-Object Name | ForEach-Object {
    $desc = Get-SkillDescription (Join-Path $_.FullName "SKILL.md")
    $indexContent += @"

### $($_.Name)
**Path:** ``.claude\skills-archive\$($_.Name)\SKILL.md``
**Description:** $desc

"@
}

$indexContent | Out-File (Join-Path $projectArchive "INDEX.md") -Encoding utf8
Write-Host "INDEX.md written with entries for both archives"
```

- [ ] **Step 2: Spot-check the INDEX.md**

Read `$WT\.claude\skills-archive\INDEX.md` and verify:
- All 66 user-level archived skills are listed (65 gsd-* + para-memory-files)
- All 23 project-level archived skills are listed
- Descriptions are complete (not truncated or missing)
- Paths are accurate

If user-level skills haven't been moved yet (Task 7), the user-level section will be empty. In that case, re-run the script after Task 7 to populate it.

- [ ] **Step 3: Commit INDEX.md**

```bash
git add .claude/skills-archive/INDEX.md
git commit -m "$(cat <<'EOF'
docs: add skills-archive INDEX.md

Catalogs all 89 archived skills (66 user-level, 23 project-level)
with full original descriptions and archive paths.
Read by skill-router for non-gsd request matching.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Modify GSD Router (in worktree)

**Files:**
- Modify: `$WT\.claude\skills\gsd\SKILL.md`

The gsd router changes from Skill() invocation to Read-from-archive dispatch. The command reference tables and freeform intent matching are unchanged. The `allowed-tools` restriction is removed so sub-skills have full tool access.

- [ ] **Step 1: Write the updated gsd router SKILL.md**

Replace the entire content of `$WT\.claude\skills\gsd\SKILL.md` with:

```markdown
---
name: gsd
description: "GSD (Get Shit Done) project management framework router. Use when planning phases, executing plans, managing milestones, running audits, debugging, code review, shipping, workspaces, threads, or any structured project workflow. Also use when the user types /gsd followed by a command name. Covers all gsd-* commands: phase planning, execution, verification, code review, debugging, security audit, UI review, eval review, UAT audit, autonomous mode, codebase mapping, knowledge graphs, documentation, workstreams, threads, import/export, project setup, milestones, cleanup, stats, health, capture, explore, sketch, spike, spec, fast, quick, ship, undo, inbox, PR branch, profile, backlog review, AI integration, test generation, forensics, pause/resume, and more."
user-invocable: true
argument-hint: "<command> [args] --- e.g. /gsd plan-phase 3 --research"
---

# GSD Command Router

You are the single entry point for the GSD framework. Match the user's intent to the correct gsd-* skill in the archive and load it.

## How to Use

1. Parse `$ARGUMENTS` to identify the target command
2. Find the matching command in the reference table below
3. Read the archived skill file using the Read tool: `C:\Users\gpbea\.claude\skills-archive\gsd-<command>\SKILL.md`
4. Follow the loaded skill's instructions exactly. The sub-skill's `$ARGUMENTS` are whatever remains after removing the command name from the original arguments.

If the Read fails (file not found), tell the user the command is not recognised and show the command reference below.

If the user types `/gsd` with no arguments or a vague description, show the command reference grouped by category below.

## Command Reference

### Phase Workflow
| Command | Skill | What it does |
|---|---|---|
| discuss-phase | gsd-discuss-phase | Gather context through adaptive questioning before planning |
| spec-phase | gsd-spec-phase | Clarify WHAT a phase delivers with ambiguity scoring |
| plan-phase | gsd-plan-phase | Create detailed phase plan (PLAN.md) with verification loop |
| execute-phase | gsd-execute-phase | Execute all plans in a phase with wave-based parallelisation |
| verify-work | gsd-verify-work | Validate built features through conversational UAT |
| phase | gsd-phase | CRUD for phases in ROADMAP.md (add, insert, remove, edit) |
| progress | gsd-progress | Check progress, advance workflow, or dispatch freeform intent |
| ultraplan-phase | gsd-ultraplan-phase | Offload plan phase to ultraplan cloud |
| plan-review-convergence | gsd-plan-review-convergence | Cross-AI plan convergence loop |

### Quality & Review
| Command | Skill | What it does |
|---|---|---|
| code-review | gsd-code-review | Review source files for bugs, security, and quality |
| audit-uat | gsd-audit-uat | Cross-phase audit of outstanding UAT items |
| secure-phase | gsd-secure-phase | Verify threat mitigations for a completed phase |
| eval-review | gsd-eval-review | Audit AI phase evaluation coverage |
| ui-review | gsd-ui-review | Retroactive 6-pillar visual audit of frontend code |
| validate-phase | gsd-validate-phase | Audit and fill Nyquist validation gaps |
| debug | gsd-debug | Systematic debugging with persistent state |
| forensics | gsd-forensics | Post-mortem investigation for failed workflows |
| audit-fix | gsd-audit-fix | Autonomous audit-to-fix pipeline |
| add-tests | gsd-add-tests | Generate tests for a completed phase |

### Codebase Intelligence
| Command | Skill | What it does |
|---|---|---|
| map-codebase | gsd-map-codebase | Analyse codebase with parallel mapper agents |
| graphify | gsd-graphify | Build, query, and inspect the project knowledge graph |
| docs-update | gsd-docs-update | Generate or update project documentation |
| extract-learnings | gsd-extract-learnings | Extract decisions, lessons, and patterns from completed phases |

### Ideation & Capture
| Command | Skill | What it does |
|---|---|---|
| explore | gsd-explore | Socratic ideation and idea routing |
| sketch | gsd-sketch | Sketch UI/design ideas with throwaway HTML mockups |
| spike | gsd-spike | Time-boxed experiential exploration |
| capture | gsd-capture | Capture ideas, tasks, notes, and seeds |

### Project Lifecycle
| Command | Skill | What it does |
|---|---|---|
| new-project | gsd-new-project | Initialise a new project with deep context gathering |
| new-milestone | gsd-new-milestone | Start a new milestone cycle |
| complete-milestone | gsd-complete-milestone | Archive completed milestone and prepare for next |
| audit-milestone | gsd-audit-milestone | Audit milestone completion against original intent |
| milestone-summary | gsd-milestone-summary | Generate comprehensive project summary |

### Management & Ops
| Command | Skill | What it does |
|---|---|---|
| config | gsd-config | Configure GSD settings, integrations, and profile |
| workspace | gsd-workspace | Manage isolated workspace environments |
| workstreams | gsd-workstreams | Manage parallel workstreams |
| thread | gsd-thread | Manage persistent context threads |
| pause-work | gsd-pause-work | Create context handoff when pausing mid-phase |
| resume-work | gsd-resume-work | Resume work with full context restoration |
| ship | gsd-ship | Create PR, run review, prepare for merge |
| pr-branch | gsd-pr-branch | Create clean PR branch filtering out .planning/ commits |
| inbox | gsd-inbox | Triage open GitHub issues and PRs |
| undo | gsd-undo | Safe git revert with dependency checks |
| update | gsd-update | Update GSD to latest version |
| cleanup | gsd-cleanup | Archive phase directories from completed milestones |

### Utility
| Command | Skill | What it does |
|---|---|---|
| help | gsd-help | Show full GSD command reference |
| fast | gsd-fast | Execute a trivial task inline (no planning overhead) |
| quick | gsd-quick | Execute a quick task with GSD guarantees |
| autonomous | gsd-autonomous | Run all remaining phases autonomously |
| stats | gsd-stats | Display project statistics and metrics |
| health | gsd-health | Diagnose planning directory health |
| import | gsd-import | Ingest external plans with conflict detection |
| ingest-docs | gsd-ingest-docs | Bootstrap .planning/ from existing docs |
| manager | gsd-manager | Interactive command center for multiple phases |
| review | gsd-review | Request cross-AI peer review of phase plans |
| review-backlog | gsd-review-backlog | Review and promote backlog items |
| profile-user | gsd-profile-user | Generate developer behavioural profile |
| ai-integration-phase | gsd-ai-integration-phase | Generate AI-SPEC.md design contract |
| ui-phase | gsd-ui-phase | Generate UI design contract (UI-SPEC.md) |

### Namespace Routers
| Command | Skill | What it does |
|---|---|---|
| ns-context | gsd-ns-context | Codebase intelligence shorthand |
| ns-ideate | gsd-ns-ideate | Exploration and capture shorthand |
| ns-manage | gsd-ns-manage | Config and workspace shorthand |
| ns-project | gsd-ns-project | Project lifecycle shorthand |
| ns-review | gsd-ns-review | Quality gates shorthand |
| ns-workflow | gsd-ns-workflow | Workflow shorthand |

## Freeform Intent Matching

If the user provides a description instead of a command name, match their intent:

| User says something like... | Route to |
|---|---|
| "plan the next phase" / "create a plan" | gsd-plan-phase |
| "run the plan" / "execute" / "build it" | gsd-execute-phase |
| "what's next" / "what should I do" | gsd-progress |
| "review the code" / "check quality" | gsd-code-review |
| "debug this" / "something's broken" | gsd-debug |
| "ship it" / "create a PR" | gsd-ship |
| "new project" / "start fresh" | gsd-new-project |
| "test this" / "verify" / "does it work" | gsd-verify-work |
| "quick fix" / "just do this small thing" | gsd-fast |
| "explore an idea" / "brainstorm" | gsd-explore |
| "pause" / "save my progress" | gsd-pause-work |
| "resume" / "pick up where I left off" | gsd-resume-work |
| "stats" / "how are we doing" | gsd-stats |
| "help" / "what commands are there" | gsd-help |

If uncertain, show the user the 2-3 most likely matches and ask which they want.
```

- [ ] **Step 2: Verify the diff**

```bash
git diff .claude/skills/gsd/SKILL.md
```

Expected changes:
- `allowed-tools` block removed (was `Read` + `Skill`)
- "How to Use" section changed from Skill() invocation to Read-from-archive
- "Namespace Routers" subsection added to Command Reference (was missing from original)
- All other content identical

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/gsd/SKILL.md
git commit -m "$(cat <<'EOF'
refactor: gsd router reads sub-skills from archive via Read tool

Previously dispatched via Skill() invocation which required skills
to be in the discovery path. Now reads directly from
~/.claude/skills-archive/gsd-{command}/SKILL.md.

allowed-tools restriction removed so sub-skills have full tool access.
Namespace router commands (ns-*) added to command reference.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Create Skill-Router (in worktree)

**Files:**
- Create: `$WT\.claude\skills\skill-router\SKILL.md`

The skill-router consolidates trigger keywords from all 23 archived non-gsd project-level skills into one description. On invocation it reads INDEX.md, matches the request, loads the archived skill, and follows it.

- [ ] **Step 1: Create the skill-router directory**

```bash
mkdir -p .claude/skills/skill-router
```

- [ ] **Step 2: Write the skill-router SKILL.md**

Create `$WT\.claude\skills\skill-router\SKILL.md` with this content:

```markdown
---
name: skill-router
description: "Routes to archived marketing, SEO, CRO, design, React/Next.js, prototyping, and utility skills on demand. Triggers on: marketing copy, copywriting, copy editing, proofread, SEO audit, technical SEO, why am I not ranking, landing pages, homepage copy, pricing strategy, pricing tiers, freemium, free trial, churn prevention, cancel flow, dunning, retention, save offer, competitor comparison, alternative page, vs page, content strategy, what should I write about, content ideas, blog topics, editorial calendar, launch strategy, Product Hunt, go-to-market, feature release, product marketing context, ICP, positioning, customer research, customer interviews, VOC, JTBD, Reddit mining, review mining, marketing ideas, growth ideas, how to market, marketing psychology, cognitive bias, persuasion, mental models, React best practices, Next.js performance, composition patterns, render props, view transitions, startViewTransition, shadcn/ui, component registry, branded design systems, design tokens, high-fidelity prototyping, interactive demos, HTML mockups, animation, web design guidelines, accessibility audit, review my UI, browser automation, fill out a form, take a screenshot, document improvement loop, autoresearch, quality loop, client folder compilation, compile client, client brain, proposal generation, site architecture, sitemap, information architecture, navigation design."
user-invocable: true
argument-hint: "<request> --- e.g. help me with SEO, or review my pricing"
---

# Skill Router

You route requests to archived skills that are no longer in the active discovery path but remain fully functional.

## How to Use

1. Read the archive index using the Read tool: `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills-archive\INDEX.md`
2. Scan the **Project-Level Archive** section of the index. Match the user's request to the most relevant archived skill by comparing their request against each skill's description.
3. Read the matched skill's SKILL.md from the path listed in its index entry (the path is relative to the project root, e.g. `.claude\skills-archive\copywriting\SKILL.md` resolves to `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills-archive\copywriting\SKILL.md`).
4. Follow the loaded skill's instructions exactly, treating the original user request as the skill's input/arguments.

If no good match is found, list the available archived skill categories and ask the user to be more specific.

## Categories Available

- **Copywriting & Editing:** copywriting, copy-editing, product-marketing-context
- **SEO & Site Structure:** seo-audit, site-architecture, web-design-guidelines
- **CRO & Growth:** churn-prevention, pricing-strategy, launch-strategy
- **Marketing Strategy:** content-strategy, marketing-ideas, marketing-psychology, customer-research, competitor-alternatives
- **React/Next.js:** vercel-react-best-practices, vercel-composition-patterns, vercel-react-view-transitions
- **UI/Design:** shadcn, huashu-design
- **Utilities:** agent-browser, autoresearch, compile-client, proposal
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/skill-router/
git commit -m "$(cat <<'EOF'
feat: add skill-router for archived non-gsd skills

Consolidated trigger keywords from 23 archived project-level skills
into one description. Routes via INDEX.md matching and Read-based
dispatch. Replaces 23 individual skill descriptions in the system
prompt with one.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Move User-Level Skills to Archive

**Files:**
- Move: 65 `gsd-*` directories + `para-memory-files` from `C:\Users\gpbea\.claude\skills\` to `C:\Users\gpbea\.claude\skills-archive\`

These are filesystem moves outside the git repo. Do them immediately before merging the worktree (Task 8) so both changes land together.

- [ ] **Step 1: Move all gsd-* skills**

```powershell
$src = "C:\Users\gpbea\.claude\skills"
$dst = "C:\Users\gpbea\.claude\skills-archive"

Get-ChildItem -Directory $src -Filter "gsd-*" | ForEach-Object {
    Move-Item $_.FullName (Join-Path $dst $_.Name)
}
```

- [ ] **Step 2: Move para-memory-files**

```powershell
Move-Item "C:\Users\gpbea\.claude\skills\para-memory-files" "C:\Users\gpbea\.claude\skills-archive\para-memory-files"
```

- [ ] **Step 3: Verify**

```powershell
$remaining = (Get-ChildItem -Directory "C:\Users\gpbea\.claude\skills").Count
$archived = (Get-ChildItem -Directory "C:\Users\gpbea\.claude\skills-archive").Count
Write-Host "Remaining user-level skills: $remaining (expected: 1 = open-design-systems)"
Write-Host "Archived user-level skills: $archived (expected: 66)"
Get-ChildItem -Directory "C:\Users\gpbea\.claude\skills" | ForEach-Object { Write-Host "  Live: $($_.Name)" }
```

Expected: 1 remaining (`open-design-systems`), 66 archived.

---

### Task 8: Regenerate INDEX.md, Merge Worktree, Clean Up Settings

**Files:**
- Modify: `$WT\.claude\skills-archive\INDEX.md` (regenerate with user-level entries)
- Merge: `feature/skill-router-archive` into `master`
- Modify: `C:\Users\gpbea\.claude\settings.json` (remove orphaned entries)

- [ ] **Step 1: Regenerate INDEX.md now that user-level archive is populated**

Re-run the INDEX.md generation script from Task 4 Step 1 in the worktree. This time the user-level archive at `C:\Users\gpbea\.claude\skills-archive\` is populated, so the user-level section will contain all 66 entries.

Commit the updated INDEX.md:

```bash
git add .claude/skills-archive/INDEX.md
git commit -m "$(cat <<'EOF'
docs: regenerate INDEX.md with user-level archive entries

User-level skills now moved to archive, so the user-level
section is fully populated (66 entries).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Merge worktree to master**

From the main working tree (`d:\OneDrive\Claude_code\NBIAI_TEAM`):

```bash
git merge feature/skill-router-archive --no-ff -m "$(cat <<'EOF'
feat: skill router and archive (harness efficiency overhaul SP1)

- 23 project-level skills archived to .claude/skills-archive/
- GSD router reads sub-skills from ~/.claude/skills-archive/ via Read
- New skill-router with consolidated trigger keywords
- INDEX.md catalogs all 89 archived skills
- 66 user-level skills moved to ~/.claude/skills-archive/ (filesystem)

Spec: docs/superpowers/specs/2026-07-10-harness-efficiency-overhaul-design.md

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Clean up orphaned settings.json entries**

Edit `C:\Users\gpbea\.claude\settings.json` to remove:

1. The `Skill(agent-browser)` and `Skill(agent-browser:*)` permission entries (the skill is archived; pre-approving a non-discoverable skill is harmless but clutters the allow-list)

2. The `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills\autoresearch` entry from `additionalDirectories` (the directory no longer exists at that path)

These are cosmetic cleanups. Neither causes errors but both reference paths/skills that no longer exist.

- [ ] **Step 4: Delete the worktree**

```bash
git worktree remove <worktree-path>
git branch -d feature/skill-router-archive
```

---

### Task 9: Final Measurement and Delta Report

**Files:**
- Read: all live skill SKILL.md files (post-archive)

- [ ] **Step 1: Re-run the measurement script from Task 1**

Run the same PowerShell measurement script from Task 1 Step 1. The counts now reflect the post-archive state.

- [ ] **Step 2: Compute and report the delta**

```
BEFORE: [number from Task 1]
AFTER:  [number from this run]
DELTA:  [before - after] characters removed
SKILLS BEFORE: 123 (67 user + 56 project)
SKILLS AFTER:  [count] (should be ~35: 1 user + 34 project)
```

The delta represents the actual reduction in skill description text injected at session start. Report these numbers in the session log and the spec's verification section.

Expected: significant reduction. 89 skills replaced by 2 (gsd router description unchanged + 1 new skill-router description). The router descriptions are shorter than the sum of the 89 they replace.

---

### Task 10: Verification

Per the spec, a fresh session must pass three checks:

- [ ] **Step 1: Verify archived skills absent from available-skills list**

Start a new Claude Code session in the NBIAI_TEAM project. Check the system-reminder's available-skills list. Confirm:
- No `gsd-*` skills listed individually (only the `gsd` router)
- No `churn-prevention`, `copywriting`, `seo-audit`, `shadcn`, `huashu-design`, `vercel-*`, `agent-browser`, `autoresearch`, `compile-client`, `proposal`, `web-design-guidelines`, `para-memory-files`, or `gsd-settings` listed
- The `skill-router` IS listed with its consolidated description
- The `gsd` router IS listed with its existing description

- [ ] **Step 2: Verify archived skill execution via routers**

In the fresh session, test both dispatch paths:

**GSD router test:** Run `/gsd help` (or `/gsd stats`). The gsd router should Read the archived `gsd-help` (or `gsd-stats`) SKILL.md from `~/.claude/skills-archive/` and follow its instructions. Success = the help/stats output appears normally.

**Skill-router test:** Trigger a marketing skill, e.g. say "help me audit SEO for our site." The skill-router should fire (matched by "SEO audit" in its description), read INDEX.md, find `seo-audit`, load its SKILL.md from `.claude/skills-archive/`, and follow its instructions. Success = the SEO audit skill's workflow begins.

- [ ] **Step 3: Verify cadence jobs unaffected**

Check that the next cadence run completes without errors. The pre-flight confirmed no cadence task references any archived skill, but runtime verification is required.

```powershell
# Check most recent cadence run state
Get-Content "d:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\state\routine_runs.json" | ConvertFrom-Json | Format-Table name, last_status, last_run -AutoSize
```

Expected: all cadence tasks showing their normal last_status (not failing due to missing skills).

- [ ] **Step 4: Record verification in session log**

Append the measurement delta and verification results to the session log.
