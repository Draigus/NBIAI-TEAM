---
name: intel-research
description: "Run a research cycle for a specific intelligence domain. Finds high-quality knowledge via web search and produces scored extracts. Triggers: intel research, research cycle, find intelligence, research domain, proactive research."
category: intelligence
user-invocable: true
---

# Intelligence Research

Runs a focused research cycle for a specific domain, producing scored extracts ready for bank compilation.

## Arguments

- `domain`: required. One of: pitch_decks | forecast_models | production_methods | industry_current | competitors
- `focus`: optional override for this cycle's focus area

## Process

1. **Read research brief.** Load `intelligence/config/research_briefs/{domain}.md`. This defines what to look for, quality criteria, exclusions, and where to search.

2. **Spawn research agent.** Use a sub-agent with:
   - System prompt from `intelligence/prompts/research_agent.md`
   - The research brief as context
   - Instruction: "Execute this research brief. Find 3-5 high-quality findings. Score against the brief's quality criteria. Only keep findings scoring >= 6 relevance, >= 5 novelty, >= 5 actionability."

3. **Agent executes searches.** Uses WebSearch and/or Apify actors to find content based on the brief's "where to search" guidance.

4. **Quality gate.** For each finding:
   - Does it meet the brief's "what best means" criteria?
   - Score: relevance >= 6, novelty >= 5, actionability >= 5?
   - Is it NOT in the exclusion list (listicles, paywalled, generic advice)?
   - All must pass.

5. **Format extracts.** For findings that pass: format as standard raw extract with full metadata. Deposit in `intelligence/raw/web_research/{domain}/{date}_{slug}.md`.

6. **Write research log entry.** Append to `intelligence/research_log.md`:
   ```
   ## {date} — {domain}
   - Searched: {what was searched}
   - Found: {N} results examined
   - Kept: {M} findings (passed quality gate)
   - Discarded: {reasons}
   - Next cycle suggestion: {what to focus on next}
   ```

7. **Check compilation threshold.** If the target bank has >= 3 new qualifying extracts, report ready for compilation.

8. **Commit.**
   ```
   git add intelligence/raw/web_research/{domain}/ intelligence/research_log.md
   git commit -m "intel(research): {domain} cycle — {N} findings"
   ```

## Output

Report:
- Domain: {domain}
- Sources searched: {list}
- Findings examined: {N}
- Findings kept: {M}
- Key findings: {bullet list}
- Bank ready for compilation: {yes/no}
- Next cycle suggestion: {focus area}
