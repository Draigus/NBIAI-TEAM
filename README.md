# NBIAI Team — AI Company Structure

A complete AI agent company built for NBI, deployable to any project. 18 agent roles with full personas, responsibilities, workflows, and knowledge. Ready to use in Claude Code today — no installation required.

**Owner:** Glen Pryer, NBI Analytics Ltd
**Architecture inspired by:** [Paperclip](https://github.com/paperclipai/paperclip)

---

## Quick Start

Open this project in Claude Code and use any slash command to activate an agent:

```
/team        → see full org chart and all available commands
/briefing    → morning status briefing across all active projects
/ceo         → activate CEO (strategic orchestration)
/cto         → activate CTO (technical strategy + architecture)
/cfo         → activate CFO (financial planning + tracking)
/coo         → activate COO (operations + client delivery)
/cmo         → activate CMO / Head of BD (pipeline + marketing)
/vp_product  → activate VP Product (specs + PM review gate)
/vp_engineering → activate VP Engineering (engineering execution)
/head_of_people → activate Head of People (HR + hiring)
/senior_engineer → activate Senior Engineer
/engineer    → activate Engineer
/devops      → activate DevOps Engineer
/qa_lead     → activate QA Lead
/qa_engineer → activate QA Engineer
/ui_ux_lead  → activate UI/UX Lead
/ui_ux_designer → activate UI/UX Designer
/data_analyst → activate Data Analyst
/producer    → activate Producer
```

Each command loads the agent's full context (Tier 1 company knowledge + Tier 2 role knowledge) and adopts the persona. For IC roles, tell the agent which project to load as Tier 3 context.

---

## How It Works

### Three-Tier Knowledge Architecture

Every agent loads knowledge at three levels:

| Tier | Location | Loaded by | Contents |
|---|---|---|---|
| 1 — Company | `company/knowledge/` | All agents | Who NBI is, clients, team, tools, strategic decisions |
| 2 — Role | `roles/{role}/knowledge/` | That role only | Deep domain knowledge for the function |
| 3 — Project | `projects/{project}/knowledge/` | Assigned agents | Project brief, requirements, current status |

This keeps token usage efficient. An engineer working on Playsage loads company basics + engineering knowledge + Playsage context. They don't get CFO financials or CMO pipeline data.

### Org Structure

```
Glen Pryer (Board — Human)
│
└── CEO (Opus)
    ├── COO (Opus)
    │   ├── Producer (Sonnet)
    │   └── Data Analyst (Sonnet)
    ├── CFO (Opus)
    ├── CTO (Opus)
    │   ├── VP Engineering (Opus)
    │   │   ├── Senior Engineer (Sonnet)
    │   │   ├── Engineer (Sonnet)
    │   │   └── DevOps (Sonnet)
    │   ├── QA Lead (Sonnet / Opus for final pass)
    │   │   └── QA Engineer (Sonnet)
    │   └── UI/UX Lead (Sonnet)
    │       └── UI/UX Designer (Sonnet)
    ├── VP Product (Opus)
    ├── CMO / Head of BD (Opus)
    └── Head of People (Sonnet)
```

### Model Tiers

| Tier | Model | Used for |
|---|---|---|
| Leadership | Opus | CEO, COO, CFO, CTO, CMO, VP Eng, VP Product — strategy and complex decisions |
| PM Review | Opus | VP Product quality gate on all deliverables |
| Final QA | Opus | QA Lead final validation pass before deployment |
| IC Work | Sonnet | Engineers, designers, analysts, QA engineers, Producer |

### Approval Gates

**Auto-approve:** Internal research, code writing, document drafting, test execution, analysis, status reports

**Requires Glen's approval:** All external communications, client-facing deliverables, financial decisions, spending, publishing publicly, anything that commits NBI externally

See `company/policies/approval_gates.md` for the full policy.

---

## Repository Structure

```
NBIAI_TEAM/
├── NBI_Brain.md              ← Full company knowledge base (source of truth)
├── CLAUDE.md                 ← Project instructions for Claude Code
├── .claude/commands/         ← Slash commands for activating each agent
│
├── company/
│   ├── org_chart.md          ← Full org hierarchy with reporting lines
│   ├── policies/             ← Approval gates, escalation, quality, comms
│   └── knowledge/            ← Tier 1: company-wide knowledge (5 files)
│
├── roles/                    ← 18 agent role definitions
│   └── {role}/
│       ├── persona.md        ← Identity, style, decision authority
│       ├── responsibilities.md ← Job description and KPIs
│       ├── workflows.md      ← Standard operating procedures
│       ├── knowledge/        ← Tier 2: role-specific knowledge
│       └── prompts/
│           └── system_prompt.md ← The prompt used to instantiate this agent
│
├── projects/                 ← Active and template project configs
│   ├── _template/            ← Copy this to create a new project
│   ├── playsage/             ← Playsage SaaS platform
│   ├── salarysage/           ← SalarySage salary intelligence tool
│   ├── nbi_website/          ← NBI website redesign
│   └── nbi_operations/       ← Ongoing NBI business operations
│
├── pipelines/
│   ├── sdlc/                 ← Full SDLC (8 stages, 01-08)
│   ├── bd_pipeline/          ← Business development pipeline
│   ├── client_delivery/      ← Client engagement lifecycle
│   └── reporting/            ← Status reporting cadence
│
└── templates/                ← Reusable output templates
    ├── status_report.md
    ├── project_brief.md
    ├── technical_spec.md
    ├── code_review_checklist.md
    └── client_deliverable.md
```

---

## Active Projects

| Project | Status | Lead | Description |
|---|---|---|---|
| NBI Operations | Active | COO | Client delivery, BD pipeline, financial tracking, reporting |
| Playsage | Stalled | CTO + VP Product | Gaming intelligence SaaS platform — PRD v1.3 corrections needed |
| SalarySage | Active (urgent) | DevOps + Senior Eng | API key security fix required before any client demos |
| NBI Website | Stalled | CMO + UI/UX Lead | Prototype complete, not deployed — brand rename pending |

---

## Adding a New Role

1. Copy `roles/_template.md` as a reference
2. Create `roles/{role_name}/` with: `persona.md`, `responsibilities.md`, `workflows.md`, `knowledge/`, `prompts/system_prompt.md`
3. Add the role to `company/org_chart.md`
4. Create `.claude/commands/{role_name}.md` using an existing command as a template
5. Update `brain/people_directory.md` if relevant

## Adding a New Project

1. Copy `projects/_template/` to `projects/{project_name}/`
2. Fill in `project_brief.md` with real scope, team, timeline, success criteria
3. Add `knowledge/project_context.md` with Tier 3 context for assigned agents
4. Add initial tasks to `backlog/`
5. Update `brain/clients_detailed.md` if it is a client project

---

## Communication Standards

- British English throughout — no American spellings
- Never use em dashes
- Direct and concise — get to the point
- Deep and thorough over fast and shallow
- Everything tailored to NBI's specific situation — no generic output
- If uncertain about a fact, say so — never fabricate

---

## Roadmap

- [ ] Web application UI (Command Centre, org chart, project management, finance, BD pipeline)
- [ ] Agent execution layer (Claude API integration, real-time task status)
- [ ] Supabase data persistence (tasks, projects, agent activity)
- [ ] NBI team access with role-based permissions
- [ ] GitHub Actions for automated reporting

---

*Built for NBI Analytics Ltd | nbi-consulting.com*
