# HANDOFF v9: HTML Brief — Content Rewrite + Comprehensive Tool Coverage

**Date:** 2026-06-17
**Branch:** master
**Reason:** Session complete. Full HTML brief rewrite done.
**Model:** Claude Opus 4.6 [1M]

---

## What was done this session

### HTML Brief: Complete content rewrite (DONE)

All 5 issues from Glen's v8 handoff directive addressed:

1. **All org commentary stripped.** Every DISC overview and TOOLS entry rewritten to focus purely on tool capability, market position, evidence, and value. No references to specific CH employees, PIPs, team dynamics, or "no CTO" framing. Risks rewritten to focus on tool/vendor risks (RICO lawsuits, vendor stability, pricing uncertainty, category maturity) not org readiness.

2. **Tool coverage expanded from 11 to 25 profiles.** Every discipline except Production now has at least one tool card:
   - Animation: 3 (MetaHuman ADOPT, Rokoko PILOT, Cascadeur PILOT)
   - Art: 3 (Firefly PILOT, Substance 3D AI PILOT, Meshy WATCH)
   - Audio: 2 (Wwise PILOT, ElevenLabs PILOT)
   - Engineering: 2 (Aura PILOT, UE CoPilot WATCH)
   - DevOps: 1 (TeamCity AI WATCH)
   - Game Design: 2 (Machinations PILOT, Ludo.ai PILOT)
   - QA: 1 (modl.ai PILOT)
   - Narrative: 3 (Charisma.ai WATCH, Inworld AI WATCH, Convai WATCH)
   - Production: 0 (no specialist AI tools exist; note explains market)
   - Marketing: 2 (ToxMod WATCH, GGWP WATCH)
   - Data: 1 (Sonamine WATCH)
   - HR: 1 (HireVue WATCH)
   - Finance: 2 (Harvey WATCH, Luminance WATCH)
   - Platform: 1 (Anybrain WATCH)

3. **Vendor artwork added.** Two layers:
   - Google Favicon API icons for all 25 tools (real vendor favicons next to tool names)
   - Hero product images for 7 tools with good vendor imagery: Rokoko (mocap suit photo), Meshy (3D game assets), ElevenLabs (creative platform), modl.ai (AI testing graphic), Charisma.ai (demo character), Harvey (year in review), and more
   - CSS `.tool-hero` class with gradient fade into card content

4. **HiBob removed entirely** from HR discipline. Replaced with HireVue WATCH profile showing why it's not recommended (GDPR Article 22, EU AI Act barriers, regulatory scores).

5. **Tab overflow fixed** with CSS scroll indicators (gradient fades on left/right edges when tabs are scrollable). Active tab scrolls into view on click.

6. **Website URLs are clickable links** in all 25 tool cards (blue, opens in new tab).

7. **Overview rewritten:**
   - Exec summary leads with tools and value (MetaHuman, Machinations, modl.ai)
   - "Three strategic priorities" (hire CTO etc.) replaced with "Four waves" tool adoption sequence ordered by cost and risk
   - Top risks are now tool/market risks (AI marketing backlash 20/25, modl.ai budget concentration 12/25, NPC dialogue immaturity 15/25) not org risks
   - Budget table, roadmap, and avoid callout retained

### Screenshot QA pass (DONE)

Every tab verified via Playwright screenshots:
- Overview: renders correctly, 4 verdict cards, 4 metric cards, 4 waves, 3 risks, budget table, roadmap
- Animation: 3 tools, hero image on Rokoko, MetaHuman favicon
- Art Pipeline: 3 tools, hero image on Meshy
- Audio: 2 tools
- Engineering: 2 tools (Aura + UE CoPilot)
- DevOps: 1 tool (TeamCity AI)
- Game Design: 2 tools
- QA: 1 tool, hero image on modl.ai
- Narrative: 3 tools, hero image on Charisma.ai
- Production: "No specialist AI tools" note with explanation
- Marketing: 2 tools (ToxMod + GGWP)
- Data: 1 tool (Sonamine)
- HR: 1 tool (HireVue)
- Finance: 2 tools, hero image on Harvey
- Platform: 1 tool (Anybrain), last tab accessible via scroll

---

## Files

| File | Status |
|------|--------|
| `CH_AI_Tool_Strategy_v2.md` | Editorial pass COMPLETE. Unchanged this session. |
| `CH_AI_Strategy_Brief.html` | Content rewrite COMPLETE. 25 tool profiles, vendor artwork, clickable links, tab overflow fixed. |
| `HANDOFF_v8.md` | Superseded by this file. |

---

## What could still improve

1. **More hero images.** 7 of 25 tools have hero product images. The remaining 18 show branded initial icons with vendor favicons. More images could be fetched from vendor websites (Cascadeur, Machinations, Wwise, etc.) but the current state is a clean professional baseline.

2. **Downloadable logos.** Current approach hotlinks to vendor CDNs and Google's favicon API. For offline viewing, images would need to be downloaded to a local `img/` folder or base64 encoded.

3. **Print stylesheet.** Print mode exists (white background, all panes visible) but hero images may not render well in print. Could add `@media print` rules to hide hero images or resize them.

4. **Production tab.** Only discipline with zero tool cards. The note explains why (no specialist AI tools exist; Jira AI is a platform feature). Could add Jira AI/Rovo as a "platform feature" card if Glen wants completeness.

---

## Critical rules (unchanged)
1. No Copilot as a recommendation. Glen's hard exclusion.
2. AI tools only. Not generic platforms.
3. The brief evaluates TOOLS on their merits. No CH org commentary.
4. British English, no em dashes.
5. McKinsey quality bar.
6. Opus only for this work.
