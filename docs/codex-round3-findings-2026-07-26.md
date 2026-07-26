codex
I’m loading the repository review guidance and the adversarial convergence workflow, then I’ll trace each claimed fix through its callers and tests. I’ll keep this read-only and report only reproducible findings. The mandated session log cannot be created because this session’s filesystem access is read-only.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw 'D:\\OneDrive\\Claude_code\\NBIAI_TEAM\\.agents\\skills\\using-superpowers\\SKILL.md'; Get-Content -Raw 'D:\\OneDrive\\Claude_code\\NBIAI_TEAM\\.agents\\skills\\codex-converge\\SKILL.md'" in D:\OneDrive\Claude_code\NBIAI_TEAM
 succeeded in 5831ms:
---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## Instruction Priority

Superpowers skills override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) â€” highest priority
2. **Superpowers skills** â€” override default system behavior where they conflict
3. **Default system prompt** â€” lowest priority

If CLAUDE.md, GEMINI.md, or AGENTS.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions. The user is in control.

## How to Access Skills

**In Claude Code:** Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to youâ€”follow it directly. Never use the Read tool on skill files.

**In Copilot CLI:** Use the `skill` tool. Skills are auto-discovered from installed plugins. The `skill` tool works the same as Claude Code's `Skill` tool.

**In Gemini CLI:** Skills activate via the `activate_skill` tool. Gemini loads skill metadata at session start and activates the full content on demand.

**In other environments:** Check your platform's documentation for how skills are loaded.

## Platform Adaptation

Skills use Claude Code tool names. Non-CC platforms: see `references/copilot-tools.md` (Copilot CLI), `references/codex-tools.md` (Codex) for tool equivalents. Gemini CLI users get the tool mapping loaded automatically via GEMINI.md.

# Using Skills

## The Rule

**Invoke relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means that you should invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.

```dot
digraph skill_flow {
    "User message received" [shape=doublecircle];
    "About to EnterPlanMode?" [shape=doublecircle];
    "Already brainstormed?" [shape=diamond];
    "Invoke brainstorming skill" [shape=box];
    "Might any skill apply?" [shape=diamond];
    "Invoke Skill tool" [shape=box];

---
Disposition (same session, 2026-07-26): 7 of 10 fixed (sidebar FX, sidebar cause,
export horizon, globalSetup pool + strict ledger check, migrations name test,
089 ledger repairs, print coverage all views). 3 deferred with reasons recorded
in the session log: raw workbook Budget/CompMin/CompMax columns (design decision
for Glen), cron-before-migrations window (pre-existing, narrow, boot now exits
on failure), init-db.js runner call (documented dev-tool contract). Round 4
verdict: CLEAN PASS.
