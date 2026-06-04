# NBI AIOS Infrastructure Audit — Design Spec

**Date:** 2026-05-15
**Author:** Glen Pryer + Claude (Opus 4.6)
**Status:** Approved (brainstorming + red team review complete)
**Scope:** Full restructure of NBI AI Team knowledge architecture, role dispatch system, context management, and workspace cleanup

---

## Problem Statement

The NBI AIOS infrastructure was built for a multi-agent architecture but runs in a single-agent Claude Code environment. This creates four problems:

1. **Roles exist but never load.** 32 role definitions with system prompts, knowledge files, and workflows sit unused because nothing wires them into Claude Code's dispatch flow.
2. **Knowledge is fragmented and duplicated.** Product context (Playsage, SalarySage, NBI Hub) exists in brain/ modules, projects/ knowledge files, AND role-specific knowledge files. Decisions live in three separate logs. Updates require editing multiple files.
3. **Context layers overlap.** CLAUDE.md, NBI_Brain.md, and memory files all state the same rules. This creates maintenance drift and at least one live contradiction (compaction stance).
4. **Context budget is unmanaged.** Skill descriptions, always-loaded files, and accumulated session history compete for the same context window. No mechanism prioritises what matters for the current session.

## Goals

1. **Roles become live expertise** — automatically loaded when skills fire or when conversation context calls for domain depth.
2. **Single source of truth per topic** — every piece of knowledge has one canonical location. Other files reference it, not copy it.
3. **Clean context layers** — CLAUDE.md, NBI_Brain.md, and memory files each own distinct concerns with no overlap.
4. **Stale content gets caught** — freshness dates flag outdated files instead of letting them silently mislead.
5. **Context is spent wisely** — keep CLAUDE.md lean with a universal/dashboard split, load NBI_Brain.md at session start, accept skill library overhead as the cost of full capability.

## Non-Goals

- Rewriting role content (the personas, responsibilities, and workflows are good — the problem is wiring, not content)
- Changing the dashboard-server codebase or project structure
- Building a full multi-agent orchestration framework (this enables it but doesn't build it)
- Reorganising the Clients/ directory or worktrees (out of scope for this audit)

---

## Critical Constraint: Auto-Load Behaviour

**Only CLAUDE.md and MEMORY.md auto-load every session.** NBI_Brain.md is a file in the repo that must be explicitly read. Any rule or instruction that must always be in context MUST live in CLAUDE.md. Moving critical rules to NBI_Brain.md means they won't be present unless Claude Code reads the file.

This constraint shapes the entire design below.

---

## Design

### 1. Separation of Concerns

**CLAUDE.md owns: "Rules and workflows that must always be in context"**

Structured in two clearly labelled sections:

**Section A — Universal (applies to all work, any project):**
- What this repo is and how it's structured (brief)
- Communication style rules (British English, direct, no fluff)
- Hard rules summary (all 7 numbered rules — compact form, not full incident detail)
- Session continuity mechanical rules
- Mandatory skill invocations table
- Worktree discipline for risky edits
- Role dispatch routing tables (embedded — see Section 2)
- Knowledge architecture overview (brain/, roles/, company/, projects/ — what lives where)
- Pointer to NBI_Brain.md: "Read NBI_Brain.md at session start. It provides business context, client state, and team information relevant to most sessions. Only skip for pure isolated coding tasks."

**Section B — Dashboard Server (only relevant for WorkSage/NBI Hub coding):**
- Stack details (Express, Postgres, PM2, Cloudflare Tunnel)
- Common commands (npm test, pm2 restart, etc.)
- Architecture facts (item hierarchy, sync model, migrations)
- Bug triage pipeline (7-step, mandatory for bug_reports items)
- Verifying UI changes (Playwright, no agent-browser)

This separation means the universal rules are always relevant regardless of what Glen is working on. The dashboard section is clearly labelled so it's mentally skippable during consulting, strategy, or non-coding sessions.

**Trim from CLAUDE.md (not needed every session):**
- Approval gates detail (replace with one-liner: "See company/policies/approval_gates.md")
- Agent Communication Protocol (5-point routing matrix — only relevant for multi-agent work)
- Adding a New Role / Adding a New Project templates (move to a reference doc, only needed when actually adding roles/projects)

**NBI_Brain.md owns: "Business context and identity"**
- Glen's identity, working style, detailed communication context
- Hard rules with full context and reasoning (the expanded version)
- Business overview, clients, pipeline, team roster, financials
- Extended module index (brain/ directory pointers with load-when triggers)
- No changes to content. NBI_Brain.md remains the source of truth. It just isn't auto-loaded.

**Memory files own: "Incident history and behavioural corrections"**
- Each memory file records WHY a rule exists: the incident, Glen's exact words, the enforcement context
- They do not restate the rule itself — CLAUDE.md has the compact rule, memory has the story
- Contradictory files get resolved (newer wins, older gets archived with superseded frontmatter)

**Net effect:** CLAUDE.md stays compact but complete for operational rules. NBI_Brain.md provides depth on demand. Memory provides incident context. No triple-stating.

### 2. Role Dispatch System

**Composite AGENT.md files**

Each frequently-used role gets a single self-contained file: `roles/{role_name}/AGENT.md`

This file combines persona, domain knowledge, standards, and key workflows into one document that a subagent can load in a single read. Target size: 150-250 lines per composite (enough for depth, not so much it blows context budget).

Priority roles for composite file creation (top 12):
- vp_product (product thinking, scope, trade-offs)
- senior_engineer (code quality, architecture, patterns)
- ui_ux_lead (design system, UX, accessibility)
- qa_lead (test strategy, coverage, triage)
- general_counsel (legal, contracts, IP, compliance)
- game_economy_consultant (monetisation, loot, currency balance)
- producer (delivery, milestones, client reporting)
- cmo (marketing, positioning, content strategy)
- data_analyst (analytics, dashboards, data pipeline)
- head_of_people (hiring, team structure, compensation)
- gaming_practice_lead (industry context, consulting methodology)
- cto (architecture decisions, tech strategy)

Remaining roles keep their current 5-file structure until needed frequently enough to warrant compositing.

**Dispatch routing tables (embedded in CLAUDE.md)**

The routing tables live directly in CLAUDE.md, not in a separate file. This guarantees they're always in context when dispatch decisions happen. Compact format, roughly 25-30 lines.

**Skill-triggered routing** — when a skill fires, load the relevant role's AGENT.md into the subagent prompt:

| Skill | Load role |
|---|---|
| brainstorming | vp_product |
| writing-plans | vp_product + senior_engineer |
| code-review / requesting-code-review | senior_engineer |
| systematic-debugging | senior_engineer |
| test-driven-development | qa_lead |
| frontend-design | ui_ux_lead |
| game-economy-design | game_economy_consultant |
| gi (game investment) | gaming_practice_lead |

**Topic-detected routing** — when conversation organically enters a domain, proactively load:

| Conversation involves... | Load role |
|---|---|
| Legal, contracts, IP, GDPR, compliance | general_counsel |
| Game economy, monetisation, loot, currencies | game_economy_consultant |
| UI/UX, layout, design system, accessibility | ui_ux_lead |
| Client delivery, milestones, reporting | producer |
| Hiring, compensation, team structure | head_of_people |
| Data, analytics, dashboards, pipelines | data_analyst |
| Marketing, positioning, brand, content | cmo |
| Production processes, studio ops, scheduling | production_consultant |

**CLAUDE.md dispatch instruction:**

> **Role Dispatch:** Before dispatching a subagent or starting domain-specific work, check the routing tables above. Load the relevant role's `roles/{role}/AGENT.md` into the subagent prompt or your own context. For organic topic detection, proactively load role context when the conversation clearly enters a listed domain. You do not need Glen's permission to bring expertise into the conversation — that is the purpose of the role system.

### 3. Context Budget Management

**Skills: keep them all**

All installed skills stay. NBI is a consultancy that works across game economy, marketing, finance, legal, product strategy, and engineering. The skill library is the toolkit — pruning skills prunes capability. The context cost of skill descriptions in the system prompt is a fixed overhead we accept and optimise around.

If a skill is discovered to be genuinely broken or superseded by another, remove it then. Otherwise, the full library stays.

**CLAUDE.md size discipline**

After trimming (removing approval gates detail, agent communication protocol, role/project templates) and adding (dispatch tables, dispatch instruction), CLAUDE.md should stay at roughly the same size or slightly smaller. Target: under 200 lines.

**NBI_Brain.md: loaded at session start, not auto-loaded**

CLAUDE.md instructs: "Read NBI_Brain.md at session start. It provides business context, client state, and team information relevant to most sessions. Only skip for pure isolated coding tasks." This makes it effectively always-present while keeping the option to skip for lightweight coding-only sessions.

### 4. Knowledge Consolidation

**Role knowledge deduplication**

When building composite AGENT.md files, duplicated product/tech context gets written once in the composite, tailored to the role's perspective (not copy-pasted from brain modules). Role-specific knowledge files that were pure duplication get archived.

The canonical source for product context remains brain/ modules. Composite AGENT.md files include a role-relevant summary, not a full copy.

**Project knowledge alignment**

- `brain/playsage.md` = canonical Playsage product context
- `projects/playsage/knowledge/project_context.md` = operational project state only (sprint progress, blockers, deliverables). Points to brain module for product context.
- Same pattern for SalarySage, NBI Hub

**Decision log clarification**

- `brain/decisions_log.md` = canonical decision log (company-wide, append-only)
- `projects/nbi_dashboard/live_state/decisions.md` = dashboard-specific operational decisions (session-scoped)
- Add a header to each clarifying scope. These are distinct scopes, not duplicates.

### 5. Trimming and Cleanup

**Memory files:**
- Archive `feedback_conversation_length.md` — superseded by `feedback_no_compaction.md` (2026-05-07). Add `superseded: 2026-05-07` frontmatter per PARA rules.
- Archive `user_glen.md` — redundant with NBI_Brain.md Section 1. Update MEMORY.md entry to point at NBI_Brain.
- Review all 42 memory files for staleness; archive any that reference resolved incidents or outdated project state.

**Role knowledge files:**
- After composite AGENT.md files are built, archive the duplicated knowledge files (3x engineering_context.md, 2x qa_context.md, 2x design_context.md)

**Session handoffs:**
- Create `projects/nbi_dashboard/session_handoffs/INDEX.md` — master list of all handoffs with one-line summaries
- Old handoffs (older than 30 days) get indexed but no other action

**Queue directory:**
- Move `queue/` to `_archive/queue/`. If nothing references it in the next few sessions, it was dead.

**Stale brain content:**
- `brain/pending_actions.md` — review with Glen, close completed items, flag urgent ones
- NBI_Brain.md — verify business state is current (clients, pipeline, team, financials)

**Client work boundary:**
- Clients/ directory stays in this repo (single workspace access outweighs noise)
- Rule: nothing in AIOS infrastructure (roles, brain, CLAUDE.md) should reference client-specific files
- Client knowledge stays self-contained in the client folder

### 6. Freshness Mechanism

Every file in brain/ and every composite AGENT.md gets a `last_verified: YYYY-MM-DD` field in its frontmatter.

CLAUDE.md instruction:

> If a brain/ module or role AGENT.md has a `last_verified` date older than 30 days, flag it to Glen at session start: "brain/clients_detailed.md hasn't been verified since [date] — should I check if it's still current?" Do not silently trust stale context.

---

## Known Risks and Limitations

1. **Composite AGENT.md staleness.** If underlying role files (persona.md, workflows.md) change but the AGENT.md composite isn't updated, they drift. Mitigation: `last_verified` dates and the rule that originals remain as the authoritative source. AGENT.md is the operational composite; originals are the design record.

2. **Organic topic detection is fuzzy.** "When the conversation enters legal territory" is a judgement call. Risk of over-triggering (loading role context for passing mentions) or under-triggering (missing subtle domain needs). Mitigation: tune routing tables in Phase 4 based on real session observations.

3. **Context budget under heavy sessions.** Loading 2 roles (400-500 lines) + NBI_Brain.md (300 lines) + brain module + session history could push context in long sessions. Mitigation: the 75% handoff rule, selective reading (tail ~50 lines of large files), and skill pruning all help. Monitor in Phase 4.

4. **Project-agnosticism requires discipline.** The AIOS must serve any project Glen works on — consulting, product strategy, finance, marketing, engineering. If CLAUDE.md or the dispatch tables become too dashboard-centric, the system fails for non-coding work. Mitigation: universal/dashboard split in CLAUDE.md; routing tables cover business domains, not just engineering tasks.

---

## Implementation Phases

### Phase 1: Clean (foundation, low risk)
- Resolve contradictory memory files (archive feedback_conversation_length.md)
- Archive user_glen.md, update MEMORY.md pointer
- Trim CLAUDE.md: remove approval gates detail, agent communication protocol, role/project templates
- Keep communication style and hard rules in CLAUDE.md
- Add NBI_Brain.md on-demand loading instruction to CLAUDE.md
- Add scope headers to both decision logs
- Archive queue/ directory
- Create session handoff INDEX.md
- Review brain/pending_actions.md with Glen

### Phase 2: Build dispatch system (the big capability win)
- Create composite AGENT.md files for top 12 roles (150-250 lines each)
- Embed dispatch routing tables in CLAUDE.md
- Add dispatch instruction section to CLAUDE.md
- Test by dispatching a subagent with a role loaded and verifying quality difference

### Phase 3: Context efficiency and freshness
- Verify CLAUDE.md stayed under 200 lines after Phase 1+2 changes
- Add `last_verified` dates to brain/ modules and AGENT.md files
- Review NBI_Brain.md business state with Glen (clients, pipeline, team, financials)

### Phase 4: Consolidate knowledge (structural fix)
- Archive duplicated role knowledge files
- Align project knowledge files to point at brain/ canonical sources
- Review remaining memory files for staleness

### Phase 5: Verify and tune (ongoing)
- Run real work sessions, note where roles don't trigger when they should
- Adjust routing tables based on actual usage
- Monitor context budget impact
- Prune roles that never get dispatched (flag for Glen's review)

---

## Success Criteria

1. When brainstorming skill fires, VP Product perspective is automatically loaded into the subagent or main context
2. When conversation enters legal territory, General Counsel context loads without being asked
3. Product context changes (e.g., Playsage tech stack update) require editing one canonical file, not three
4. No contradictory rules exist across CLAUDE.md, NBI_Brain.md, and memory files
5. Stale brain/ modules get flagged within one session of crossing the 30-day threshold
6. CLAUDE.md stays under 200 lines with a clear universal/dashboard split
7. All installed skills remain available — the AIOS serves any project type
8. Context budget supports a full work session without hitting 75% before meaningful work completes
