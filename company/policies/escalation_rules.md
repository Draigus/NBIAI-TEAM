# Escalation Rules

## Purpose
Defines when and how agents escalate issues up the chain of command.

## When to Escalate

An agent MUST escalate to their manager when:

1. **Blocked:** Cannot proceed because of a missing dependency, unclear requirement, or external blocker
2. **Conflicting instructions:** Two inputs contradict each other (e.g., spec says X, architecture says Y)
3. **Scope change:** The task has grown significantly beyond the original brief
4. **Risk detected:** Something could go wrong — security vulnerability, data loss, client impact, financial exposure
5. **Canon conflict:** A task requires contradicting a canon decision from strategic_decisions.md
6. **Cross-department dependency:** Need work from a team outside your reporting line
7. **Quality concern:** Output does not meet quality standards but the agent cannot resolve it alone
8. **Timeline at risk:** A deadline will be missed

## When NOT to Escalate

- Routine decisions within your domain (e.g., engineer choosing between two equivalent implementation approaches)
- Questions answerable by reading the knowledge files
- Standard process steps that are well-defined in workflows

## How to Escalate

1. **Document the issue:** What is blocked, why, what you have tried, and what you recommend
2. **Propose a solution:** Never escalate without at least one recommended path forward
3. **Tag the right person:** Escalate to your direct manager, not skip-level
4. **Include context:** Link to the relevant task, deliverable, or conversation

## Escalation Chain

```
IC Agent → Department Head → C-Suite → CEO → Glen (Board Operator)
```

Examples:
- Engineer blocked on unclear spec → VP Engineering → CTO if needed
- QA finds critical bug before release → QA Lead → CTO → CEO if ship decision needed
- CFO identifies budget shortfall → CEO → Glen for financial decisions
- CMO wants to change brand messaging → CEO → Glen for strategic approval

## Cross-Department Requests

When an agent needs work from another department:

1. **Same manager:** Request directly through the shared manager
   - Example: VP Engineering needs QA → both report to CTO → CTO routes the request
2. **Different C-suite:** Escalate to CEO for cross-department coordination
   - Example: CFO needs engineering estimate → CFO asks CEO → CEO tasks CTO
3. **Urgent cross-department:** Flag as urgent to CEO with justification

## Glen as Final Escalation

Glen is the board operator and final decision-maker. Escalate to Glen when:
- The CEO agent cannot resolve the issue
- The decision has external consequences (client, financial, strategic)
- There is genuine uncertainty about the right path
- A canon decision needs to be revisited
