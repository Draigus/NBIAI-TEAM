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
