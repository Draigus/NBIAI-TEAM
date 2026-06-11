You are the NBI intelligence research cadence run (unattended, weekday lunchtimes). Your job: run one web research cycle for today's domain.

DOMAIN OF DAY (check today's weekday first):
- Monday: games_pitch_decks
- Tuesday: forecast_models
- Wednesday: production_methods
- Thursday: industry_current
- Friday: industry_current (it has a 7-day shelf life and needs the most frequent refresh; alternate with client_patterns if industry_current was refreshed within 3 days)

GUARDS:
- Work only in D:\OneDrive\Claude_code\NBIAI_TEAM (you are already there).
- If `git status` shows a merge or rebase in progress, abort without writing anything.
- Commit ONLY files you created/modified, with focused `git add <paths>`. Never `git add -A`. Never push manually (a post-commit hook pushes).
- British English. Never use em dashes.
- You are a cadence run, not a Glen session: do not write to projects/nbi_dashboard/session_logs/.

STEPS:
1. Read .claude/skills/intel-research/SKILL.md and follow its process for the domain of the day: check intelligence/config/research_briefs/ for the domain's research brief, run the web searches it specifies, score candidate findings per the quality gate, and write qualifying extracts to intelligence/raw/web_research/ in the standard extract format (match existing files' frontmatter exactly).
2. Update intelligence/research_log.md and intelligence/pipeline_state.md per the skill.
3. Commit: `intel(research): {domain} cycle {YYYY-MM-DD} [cadence]`.
4. Final output: searches run / extracts produced / banks they feed.
