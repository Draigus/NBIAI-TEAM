# NBIAI Team — AI Company Structure

## What This Is

This repository defines a reusable AI agent company that replicates a real organisational structure. It is designed to handle both business operations and software development across multiple projects simultaneously.

**Owner:** Glen Pryer, Managing Director, NBI Gaming / NBI Analytics Ltd
**Architecture inspired by:** Paperclip (github.com/paperclipai/paperclip)

## Repository Structure

- `NBI_Brain.md` — Full company knowledge base (source of truth for all NBI business information)
- `company/` — Company-wide configuration: org chart, policies, Tier 1 knowledge
- `roles/` — Agent role definitions (persona, responsibilities, workflows, knowledge, system prompts)
- `projects/` — Project-specific configurations with Tier 3 knowledge
- `pipelines/` — Reusable workflow definitions (SDLC, client delivery, BD, reporting)
- `templates/` — Output templates for common deliverables

## Knowledge Architecture (Three Tiers)

1. **Tier 1 — Company Knowledge** (`company/knowledge/`): Loaded by ALL agents. Who NBI is, clients, strategy, org chart. Keep lean (~2-3 pages)
2. **Tier 2 — Role Knowledge** (`roles/{role}/knowledge/`): Loaded per role. Deep domain knowledge relevant to the function
3. **Tier 3 — Project Knowledge** (`projects/{project}/knowledge/`): Loaded per active assignment. Project brief, requirements, status

When instantiating an agent, load: Tier 1 + their Tier 2 + the Tier 3 for their assigned project.

## Model Tier Strategy

| Tier | Model | Roles |
|---|---|---|
| Leadership | Opus | CEO, COO, CFO, CTO, CMO, VP Eng, VP Product |
| PM Review | Opus | VP Product (quality gate on deliverables) |
| Final QA | Opus | QA Lead (final validation pass) |
| IC Work | Sonnet | All engineers, designers, analysts, QA engineers, Producer, Head of People |
| Routine | Haiku | Status checks, simple formatting, data extraction |

## Approval Gates

**Auto-approve:** Internal research, code writing, document drafting, test execution, architecture proposals, status reports, cross-agent task requests

**Requires Glen's approval:** External communications, client-facing deliverables, financial decisions, hiring real people, strategic pivots, spending money, publishing publicly, anything that commits NBI externally

## Communication Style

- British English only — no American spellings
- Never use em dashes
- Direct, no-fluff communication
- Deep and thorough over fast and shallow
- Everything tailored to NBI's specific situation — no generic/template output
- If uncertain about a fact, say so — never fabricate

## Agent Communication Protocol

1. Direct reports: Agents assign tasks directly to their reports
2. Peer requests: Route through shared manager
3. Cross-department: Escalate to CEO for routing
4. Escalation: Report to manager with context when blocked
5. @mentions: Reference other agents by role to flag cross-functional needs

## Adding a New Role

1. Copy `roles/_template.md` structure
2. Create the role directory under `roles/`
3. Write persona.md, responsibilities.md, workflows.md
4. Add role-specific knowledge files in `knowledge/`
5. Write the system prompt in `prompts/system_prompt.md`
6. Update `company/org_chart.md` with the new role and reporting line

## Adding a New Project

1. Copy `projects/_template/` to `projects/{project_name}/`
2. Write the project brief
3. Add project-specific knowledge files
4. Populate the initial backlog
5. Assign agents to the project
