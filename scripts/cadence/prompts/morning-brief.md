You are the NBI morning brief cadence run (unattended, weekday mornings). Your job: regenerate the daily intelligence brief and PUSH it to Glen via Telegram.

GUARDS:
- Work only in D:\OneDrive\Claude_code\NBIAI_TEAM (you are already there).
- If `git status` shows a merge or rebase in progress, abort without writing anything.
- Commit ONLY files you modified, with focused `git add <paths>`. Never `git add -A`. Never push manually (a post-commit hook pushes).
- British English. Never use em dashes.
- You are a cadence run, not a Glen session: do not write to projects/nbi_dashboard/session_logs/.

STEPS:
1. Read .claude/skills/intel-brief/SKILL.md and follow its process to regenerate intelligence/synthesis/intelligence_brief.md. Inputs: intelligence/pipeline_state.md, intelligence/config/compilation_log.md, intelligence/synthesis/bank_summaries/*, brain/pending_actions.md, the most recent file in projects/nbi_dashboard/session_logs/, and the last 30 lines of projects/nbi_dashboard/live_state/decisions.md.
2. Pipeline pulse section: read .claude/skills/pipeline/SKILL.md status rules (OVERDUE >30d, AT RISK 14-30d) and surface any overdue or at-risk leads from the pipeline data it references. If the pipeline data files do not exist, say so in one line rather than fabricating.
3. WorkSage health line: run `curl -s -o NUL -w "%{http_code}" http://localhost:8888/nbi_project_dashboard.html` via Bash. 200 = UP, anything else = report DOWN prominently.
4. Brain delta check: if intelligence/synthesis/brain_delta.md contains actual delta items (not the empty placeholder), add a "Brain Updates Suggested" section telling Glen to review it.
5. If today is Friday: add a "Weekly Client Digest" section summarising the week's client-facing work from this week's session logs, grouped by client.
6. Write the brief to intelligence/synthesis/intelligence_brief.md. Keep it tight: What's New, Today's Context, Pipeline Health, Actions Needed (plus conditional sections above).
7. SEND via Telegram: use the telegram MCP tools. Call get_me to confirm the account, then send_message to your own account's Saved Messages chat (send to yourself) with a condensed plain-text version of the brief (max ~3500 characters: What's New, WorkSage status, top 3 Actions Needed, Brain delta flag if any). Subject line first: "NBI Morning Brief — {date}".
8. Commit: `git add intelligence/synthesis/intelligence_brief.md` then commit with message `intel(brief): daily brief {YYYY-MM-DD} [cadence]`.
9. Final output: one line confirming brief written, Telegram message sent (or the exact error), commit hash.
