---
name: harness-intervention
description: "Flag an intervention during a session — Glen corrected the approach, redirected, or rejected output. Creates a confirmed intervention event in the harness capture layer. Use when: Glen correction, intervention, approach rejected, wrong approach, redirect, stop doing that, harness flag, log correction, capture feedback."
user-invocable: true
---

# Harness Intervention

Capture an explicit intervention event — Glen corrected, redirected, or rejected the current approach.

This creates a `confirmed: true` intervention event in `.claude/harness/data/events/` for the current session. The weekly diagnosis routine uses these events to identify harness gaps and propose improvements.

## When to use

- Glen says "no", "stop", "don't do that", "that's wrong"
- Glen redirects the approach ("actually, do X instead")
- Glen rejects output ("this isn't what I asked for")
- You realise an existing rule/skill/memory should have prevented the mistake

## Steps

1. **Classify severity:**
   - `correction` — Glen corrected a specific detail or approach
   - `redirect` — Glen changed the direction entirely
   - `rejection` — Glen rejected the output

2. **Identify the harness component that failed:**
   - `context` — relevant information wasn't loaded
   - `skill_routing` — wrong skill or skill not invoked
   - `verification` — output wasn't verified properly
   - `memory` — stale or missing memory caused the error
   - `permission` — action should have required approval
   - `tool_use` — wrong tool or tool used incorrectly
   - `role_dispatch` — relevant role not loaded

3. **Check for existing rules:**
   - Search CLAUDE.md, feedback memories, and active skill files
   - Did an existing rule already cover this case?
   - If yes, record which rule was missed

4. **Write the event by running:**

```bash
node "${CLAUDE_PROJECT_DIR:-.}/.claude/harness/lib/emit-event.js" intervention <<'EVENTJSON'
{
  "severity": "<correction|redirect|rejection>",
  "harness_component": "<context|skill_routing|verification|memory|permission|tool_use|role_dispatch>",
  "description": "<What Glen said/did, in plain English>",
  "task_context": "<What task was being worked on>",
  "avoidable": <true|false>,
  "existing_rule_missed": "<filename or null>",
  "proposed_fix": "<What harness change would prevent this>",
  "confirmed": true,
  "capture_method": "explicit_command"
}
EVENTJSON
```

5. **Acknowledge to Glen:** "Logged harness intervention: [one-line summary]. The weekly diagnosis will incorporate this."

## Do NOT use for

- Glen asking a question (not a correction)
- Glen providing new information (not correcting existing behaviour)
- Technical errors (tool failures, network issues) — those are captured automatically
