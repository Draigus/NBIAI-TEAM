# HANDOFF v8: HTML Brief Content Rewrite

**Date:** 2026-06-17
**Branch:** master
**Reason:** Context limit reached during HTML brief content rewrite.
**Model:** Claude Opus 4.6 [1M]

---

## What was done this session

### Editorial pass on the markdown report (COMPLETE)
All 9 handoff v7 items done and verified:

1. **Cost reconciliation:** Dashboard and Appendix A row costs now match discipline budgets (Rokoko $7,400, Cascadeur $1,584, Substance $0 marginal, Wwise $0 marginal, ElevenLabs $2,376, Firefly $14,400).
2. **[VERIFY] flags:** All resolved. Cascadeur Live Link confirmed released (2026.1). Firefly indemnification confirmed ($50K+ caps). TeamCity AI clarified as Early Access. Anybrain updated ($1.1M seed, 19 employees). ElevenLabs updated ($781M raised, $11B valuation). modl.ai pricing marked as estimated. All remaining flags converted to "(estimated)" or qualified notes. Zero [VERIFY] flags remain.
3. **Missing tools:** GameDriver added as WATCH in QA + Appendix A. Scenario and Layer added as "also considered" in Art. Copilot/Cursor NOT added per Glen's explicit directive (harness intervention logged).
4. **ElevenLabs/Inworld:** ElevenLabs funding corrected. Inworld "pivoted away from gaming" softened to "broadened beyond game-specific NPC tooling" in all 6 locations.
5. **Analytics readiness checklist:** 10-item pre-beta checklist added to Data & Analytics section.
6. **Appendix A:** Reordered by discipline then composite descending. DeepMotion and GameDriver added. Footnote corrected.
7. **Section renumbering:** All 23 sections numbered 1-23. ~40 heading renames, ~30 cross-reference updates, Table of Contents updated. Verified by grep: all sequential, no orphans.
8. **Em dashes:** All 72 removed. Task title headings fixed to colons. Company Profile headings fixed. "Production-only: No." fixed. Verified: zero em dashes remain.
9. **Temp files:** preassembly and codex review deleted.

### Verification pass (COMPLETE)
- 10 composite scores spot-checked: all arithmetic correct
- Sensitivity floor verified: no violations
- (est.) markers present on all Team Adoption Risk scores
- All semicolons from bulk replacement reviewed and fixed where awkward

### HTML Brief (IN PROGRESS - needs content rewrite)

**Current state:** Interactive tabbed SPA at `CH_AI_Strategy_Brief.html`. Structure and styling are GOOD:
- Dark mode, full-screen, 15 discipline tabs
- Overview tab with exec summary, verdict counters, budget bar, risks, roadmap
- Tool profile cards with 6-dimension visual score bars, facts grids, evidence, costs
- 11 ADOPT/PILOT tools fully profiled in JS data objects
- Responsive, print-ready

**What needs to change (Glen's directive):**
The content is polluted with organisational commentary (no CTO, Hannah sole QA, Sasha opposition, etc.). Glen's correction: "This is about laying out skills and functions, and then picking the best possible AI tools, currently hot and fresh on the market, and the ones that are deeply performing."

The brief should evaluate TOOLS, not CH's org chart. Specifically:

1. **Strip all organisational commentary** from discipline overviews. Replace with: what this discipline does in game development, what AI tools exist for it, and what's worth using.
2. **Rewrite tool descriptions** to focus on capability, market position, and value delivered. Not "Hannah can't absorb this" but "10,000+ simulated play-hours per cycle, regression testing, exploit detection."
3. **Rewrite verdict rationales** to focus on tool merit, production evidence, and ROI. Not "contingent on QA expansion" but "strongest automated playtesting tool in the market; proven at Die Gute Fabrik and commercially equivalent to Rare's in-house Sea of Thieves framework."
4. **Rewrite risks** to focus on tool/vendor risks (stability, IP, pricing uncertainty), not organisational readiness risks.
5. **Rewrite exec summary** to lead with the tools and their value, not with hiring recommendations.
6. **The three strategic priorities section should be removed or replaced** with a tool adoption sequence focused on impact and cost.

### Tool artwork/imagery needed

Glen flagged: no artwork from any of the tool companies. Each tool profile should include company logos and/or product screenshots (the tool's UI, output examples, etc.). These need to be fetched from vendor websites and embedded. The tool card design needs an image area (either a header image or a side panel).

Options for sourcing:
- Vendor websites (logos from press kits, product screenshots from marketing pages)
- UE Marketplace screenshots (for Aura, UE CoPilot, Cascadeur Live Link)
- Apify web scraper MCP to pull images programmatically
- Manual download from vendor sites

The tool card CSS needs a `.tool-img` area added, probably as a full-width header image above the tool-top section, or as a left-side panel in the tool-top grid.

### What the content rewrite involves

The data lives in two JS arrays in the HTML file:
- `DISC` array (~line varies): 14 discipline objects with `over` (overview), `risks`, `gov` (governance) fields
- `TOOLS` array: 11 tool objects with `co` (company), `desc`, `ev` (evidence), `rat` (rationale) fields

Each of these text fields needs rewriting. The rendering code and CSS do NOT need changes.

### Also: tools with no data in the brief

The WATCH tools are not individually profiled in the HTML. The full report has profiles for all 32. Glen may want brief WATCH profiles too. At minimum, disciplines that currently show "No specialist AI tools recommended" (Data, HR, Production) should explain what tools EXIST in the space even if they're not recommended, so the brief reads as a comprehensive market survey, not just a shortlist.

---

## Files

| File | Status |
|------|--------|
| `CH_AI_Tool_Strategy_v2.md` | Editorial pass COMPLETE. Ready for delivery. |
| `CH_AI_Strategy_Brief.html` | Structure/design COMPLETE. Content rewrite NEEDED. |
| `build-brief.js` | Markdown-to-HTML converter. Still works but the HTML brief is now a separate SPA, not generated from markdown. Can be deleted. |
| `HANDOFF_v7.md` | Superseded by this file. |

---

### Bugs and quality issues in current HTML

1. **HR and Finance tabs cut off** in the tab bar (text truncated, tabs overflow off-screen right). The tab strip needs either wrapping, a scroll indicator, or grouped/dropdown navigation for 15 tabs.
2. **HiBob is in the report** as an HR recommendation. It is NOT an AI tool. It's an HRIS platform with bolted-on AI features. This violates the report's own methodology: "Specialist tools purpose-built for the discipline over general-purpose LLMs" and the constraint "AI tools only, not generic platforms with AI features." HiBob should be removed from the brief entirely.
3. **No screenshot-by-screenshot QA was done.** Every tab, every card, every scroll position needs to be screenshotted and reviewed before presenting. The verification-before-completion skill was not properly applied.
4. **No UI/UX review skill invoked.** The web-design-guidelines skill and frontend-design skill should be used to audit each page state.

---

## Critical rules (unchanged)
1. No Copilot as a recommendation. Glen's hard exclusion. Harness intervention logged.
2. AI tools only. Not generic platforms.
3. The brief evaluates TOOLS on their merits. CH's internal org is Glen's advisory conversation, not the brief's content.
4. British English, no em dashes.
5. McKinsey quality bar.
6. Opus only for this work.

---

## Design research findings (from web research agent)

Premium report design patterns that should inform the brief:

- **Stripe Annual Letter**: Big stats as 48px text (the number IS the visual). Light font weights (300). Purple accent at 20%. Restraint. cubic-bezier(0.25, 1, 0.5, 1) easing.
- **McKinsey**: Alternating dark/light sections. One-third colour panel + two-thirds data as signature layout. "50 shades of blue." Custom serif for headings (Bower). One insight per chart.
- **Linear**: Dark mode, Inter Display + Inter, one accent colour, minimal chrome. Fewer colours than expected.
- **Cross-cutting**: Typography does hierarchy (not borders/colour). Data as text for single stats. Generous whitespace (60-100px padding). Subtle animation only.

Current design already follows several of these (dark mode, big stat numbers, blue accent, Inter + Space Grotesk + JetBrains Mono, tab navigation). The content layer is the blocker, not the design.
