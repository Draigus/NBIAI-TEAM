# Handoff — 2026-05-15 AIOS Extensions (Cadence Layer)

## Branch & Server State

- **Branch:** `feature/command-centre` (pushed to `origin/feature/command-centre`)
- **GitHub remote:** `https://github.com/Draigus/NBIAI-TEAM` (private, added this session)
- **GitHub username:** Draigus (login: gpbear77@hotmail.com)
- **PM2:** No changes to PM2 processes. Dashboard unchanged.
- **Tests:** No code changes to dashboard — test counts unchanged (396 unit)
- **Git history:** Rewritten via `git filter-repo` to strip two 108MB .pptx files. All commit content preserved, hashes changed.

## What Was Done This Session

### 1. Video Review — Nate Herk "Build & Sell Claude Code Operating Systems"

Reviewed the full 2+ hour course (10 parts, 65+ lessons) via curriculum page, GitHub repo (AIS-OS), LinkedIn post, Skool community, and UDCourse listing. Catalogued everything and mapped against Glen's existing system.

**Key finding:** Glen's system is more sophisticated than what the course produces across Context, Connections, and Capabilities. The gap is **Cadence** — autonomous operations running without Glen present.

**Frameworks extracted:**
- **Four Cs** (Architecture): Context → Connections → Capabilities → Cadence
- **Three Ms** (Operator Brain): Mindset → Method → Machine
- **EAD** (Process Rule): Eliminate → Automate → Delegate

### 2. Design Spec — Written and Approved

- **Spec:** `docs/superpowers/specs/2026-05-15-aios-extensions-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-15-aios-extensions.md`
- Four deliverables scoped through brainstorming skill with Glen's input on all decisions

### 3. Connections Manifest — DONE

- **File:** `company/connections.md`
- **Content:** Single registry of all 15 MCP servers (7 remote, 8 local), 9 direct API connectors, overlap guidance (MCP vs connector), dashboard integrations (Postgres, MSAL, Prometheus, Cloudflare, PM2), and MCP replacement status
- **Maintenance rule:** Update when connections change. System audit skill flags stale entries via "Last verified" date.
- **Committed:** `79842a8`

### 4. EAD Brain Module — DONE

- **File:** `brain/ead_framework.md`
- **Content:** Eliminate/Automate/Delegate consulting methodology. Three gates in strict order, five delegation tiers (AI routine → AI supervised → junior human → senior human → owner), client engagement scoping process, four named anti-patterns
- **Use:** Reference knowledge for process optimisation work with clients. Loaded on demand.
- **Committed:** `79842a8` (same commit as connections.md)

### 5. System Audit Skill — DONE

- **File:** `.claude/skills/system-audit/SKILL.md` (gitignored — lives locally only)
- **Invocation:** `/system-audit`
- **What it does:** Read-only health check across four layers (Context, Connections, Capabilities, Cadence), 25 points each, 100-point total. 13 individual checks. Produces scored report with Top 3 Actions.
- **Design constraint:** Under 60 seconds, read-only, connector pings use `help` command only
- **Already visible in skills list** — confirmed by system-reminder after creation

### 6. Four Cloud Routines — ALL LIVE

All created via Claude Code `/schedule` (RemoteTrigger API). Run in Anthropic's cloud with git checkout of the repo.

| Routine | ID | Schedule (UTC) | MCPs | Next Run |
|---------|-----|---------------|------|----------|
| NBI Morning Briefing | `trig_01HaS349cB85gXhXPkkKa5ob` | `30 7 * * 1-5` (weekdays 07:30) | Gmail, GCal, Slack | Mon 18 May |
| WorkSage Health Check | `trig_013igveZCPUj3NAwswkPiBhE` | `0 6 * * *` (daily 06:00) | None (curl + repo) | Tomorrow 06:00 |
| Weekly Client Digest | `trig_019QddHgQg2atYpT4jPXJ2Kh` | `0 17 * * 5` (Fridays 17:00) | Slack, Gmail | Today 17:00 UTC |
| Weekly System Audit | `trig_01MHvrDJvEnfFWtUDiBMiNNr` | `0 8 * * 1` (Mondays 08:00) | None (repo + curl) | Mon 18 May |

**Manage at:** https://claude.ai/code/routines

**Remote limitations (until Hermes deployed):**
- No Telegram access (Sarge Universe / Steve Green digest is manual)
- No PM2/localhost checks (health check uses public URL only)
- No local connector pings (audit uses git log dates instead of filesystem)
- No `.claude/skills/` inventory (gitignored)
- Routines read from GitHub, not local disk — auto-push hook handles this

### 7. Auto-Push Hook — CONFIGURED

- **File:** `.claude/settings.json` — PostToolUse hook on `Bash` with `if: "Bash(git commit *)"`
- **What it does:** After every successful `git commit` command, runs `git push origin` asynchronously
- **Why:** Cloud routines read files from GitHub. Without auto-push, routines would see stale data.
- **Timeout:** 60 seconds, async (non-blocking)

### 8. GitHub Setup

- **Repo created:** `https://github.com/Draigus/NBIAI-TEAM` (private)
- **Branches pushed:** `master`, `feature/command-centre`
- **History rewrite:** `git filter-repo` stripped two files from all history:
  - `Clients/Couch Heroes/ama/CH AMA.pptx` (108 MB)
  - `Clients/Couch Heroes/org_strategy/Couch_Heroes_Studio_Announcement2.pptx` (108 MB)
- **Gitignore updated:** Added `*.pptx` and `*.xlsx` to prevent future large binary commits
- **Commit:** `bba5c89`

## Files Created This Session

| File | Purpose | In Git |
|------|---------|--------|
| `company/connections.md` | Connections registry | Yes |
| `brain/ead_framework.md` | EAD consulting methodology | Yes |
| `.claude/skills/system-audit/SKILL.md` | System audit skill | No (gitignored) |
| `docs/superpowers/specs/2026-05-15-aios-extensions-design.md` | Design spec | Yes |
| `docs/superpowers/plans/2026-05-15-aios-extensions.md` | Implementation plan | Yes |

## Files Modified This Session

| File | Change |
|------|--------|
| `.gitignore` | Added `*.pptx`, `*.xlsx` at top |
| `.claude/settings.json` | Added PostToolUse auto-push hook |

## Memory Updated

- `project_nbiai_team.md` — Added GitHub remote info, AIOS Cadence layer details, routine limitations

## What Needs Attention Next

1. **First Client Digest fires today** (Friday 17:00 UTC / 18:00 BST) — check the result at https://claude.ai/code/routines
2. **First Health Check fires tomorrow** (06:00 UTC) — should be silent if WorkSage is up
3. **First Morning Briefing fires Monday** (07:30 UTC) — calendar + email + Slack + repo files
4. **First System Audit fires Monday** (08:00 UTC) — baseline score of the system
5. **14 bugs still at `please_review`** in WorkSage bug tracker — unchanged this session
6. **Hermes agent** — once deployed, upgrade all four routines to local execution for full coverage (Telegram, PM2, connector pings, skills inventory)
7. **Git push awareness** — the auto-push hook only fires when Claude Code commits. If Glen commits manually from terminal, he'd need to push manually too (or we add a git post-commit hook to `.git/hooks/`)

## Decisions Made

- **D-AIOS-1:** Cadence layer implemented as cloud routines now, not waiting for Hermes
- **D-AIOS-2:** Connections manifest lives at `company/connections.md` (alongside org_chart.md)
- **D-AIOS-3:** EAD framework is a brain module, not an interactive skill
- **D-AIOS-4:** System audit is both on-demand skill AND scheduled routine
- **D-AIOS-5:** All routine times specified in GMT (UTC), not BST
- **D-AIOS-6:** `.pptx` and `.xlsx` files permanently excluded from git
- **D-AIOS-7:** GitHub repo is `Draigus/NBIAI-TEAM` (private), auto-push on every Claude commit
