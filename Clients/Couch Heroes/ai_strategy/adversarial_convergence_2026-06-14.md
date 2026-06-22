# Adversarial Convergence — CH AI Tool Strategy Report
**Date:** 2026-06-14
**Sources:** Codex CLI critique + 6-agent Apify workflow + independent web verification

## Overall Score (Pre-Fix): 6.8/10
## Score Breakdown:
- Factual accuracy: 6.5
- Strategic depth: 5.5
- Analytical rigour: 7.5
- Financial analysis: 5.0
- Presentation quality: 7.5
- Methodology and scoring: 8.5
- MMO domain expertise: 5.0
- Governance and legal: 8.0

## CRITICAL Fixes Applied (This Session)

### 1. modl.ai — Product Pivot (CRITICAL)
**Finding:** modl.ai has pivoted from SDK-based engine integration to a "no-integration" black-box visual testing tool for mobile/structured games. Incompatible with MMO combat testing.
**Evidence:** modl.ai product page: "No integration — no SDKs, no code hooks" + "analyzing what's on screen and sending simulated inputs"
**Fix:** Downgraded PILOT → WATCH. Full section rewrite. Recommended custom bot infrastructure (as Rare/Riot/Blizzard use). Removed $6K-15K from pilot budget and $60K-180K from post-launch.
**Sources:** 2 workflow agents + independent Apify verification

### 2. Rovo Pricing — Included in JIRA Premium (HIGH)
**Finding:** Core Rovo (Search, Chat, Agents) is now bundled in all paid JIRA subscriptions at $0 incremental cost. The $20/user/month is for Rovo Dev (a separate coding product).
**Evidence:** Atlassian pricing page + support.atlassian.com/rovo/docs/rovo-usage-limits/
**Fix:** Removed $8,280 from pre-launch budget, $3,600/year from post-launch. All Rovo references updated.
**Sources:** 2 workflow agents + independent Apify verification

### 3. Copilot Billing Model Change (HIGH)
**Finding:** GitHub Copilot transitioned to usage-based AI Credits model June 1, 2026. $19/seat base includes 1,900 credits; premium features consume credits.
**Evidence:** GitHub blog (April 27, 2026)
**Fix:** Added billing model disclosure to Copilot section. Recommended overage ceiling ($500/month org-wide).
**Sources:** 2 workflow agents

### 4. Copilot 55% Claim Context (HIGH)
**Finding:** The 55.8% figure is from arXiv:2302.06590, measuring time to complete an HTTP server in JavaScript. Not representative of C++/UE5/MMO development.
**Evidence:** Original paper methodology; real-world studies show 10-25% for full workflows.
**Fix:** Added study context in exec summary, Section 20.3, and efficiency claims note. Clarified "2-3 FTE" is optimistic.
**Sources:** Codex + 2 workflow agents

### 5. FX Rate Correction (HIGH)
**Finding:** 0.79 GBP/USD is incorrect. June 2026 spot rate is ~0.75.
**Evidence:** Currency data week of 8-14 June 2026
**Fix:** Updated to 0.75. Recalculated all GBP figures.
**Sources:** 1 workflow agent

### 6. Budget Recalculation (CRITICAL aggregate)
**Pre-launch total:** $53,384-139,222 → $39,104-115,942
**Post-launch total:** $58,631-199,444 / $118,631-379,444 → $55,031-195,844
**Scenarios:** Conservative ~$53K→~$39K; Moderate ~$105K→~$85K; Full ~$139K→~$116K

### 7. Anti-Cheat Two-Layer Strategy (HIGH)
**Finding:** EAC (client-side only) is insufficient for subscription MMO with player economy. Server-side validation is the primary layer for all successful MMOs.
**Fix:** Added critical note to Section 15.2.1 explaining two-layer requirement.
**Sources:** 1 workflow agent (domain-obvious for MMO architecture)

### 8. Implementation Cost Section (HIGH)
**Finding:** Budget covers licence fees only; no training, productivity dip, governance drafting, or change management costs.
**Fix:** Added Section 20.4a with estimated $30K-59K implementation overhead (~35-50% of licence spend).
**Sources:** Codex + 1 workflow agent

### 9. Scoring Methodology Gating Criteria (HIGH)
**Finding:** Weighted composite hides hard blockers (no owner, missing infrastructure, etc.)
**Fix:** Added hard-blocker gates table to Section 1.1 (5 gates applied before composite scoring).
**Sources:** Codex

### 10. Sentry Citation Correction (MEDIUM)
**Finding:** Supercell is NOT confirmed on Sentry's gaming page. Riot Games, CCP Games, Facepunch Studios are.
**Fix:** Corrected citation.
**Sources:** 1 workflow agent

### 11. Rare/modl.ai Attribution (HIGH)
**Finding:** Rare built INTERNAL bots for Sea of Thieves, NOT using modl.ai's commercial product.
**Fix:** Corrected Section 2 competitive landscape entry.
**Sources:** 2 workflow agents

### 12. VAT Treatment Note (LOW)
**Fix:** Added to Section 20.5.

## Findings NOT Applied (Require Structural New Content)

These are valid findings that would require substantial new sections. They should be addressed in v2.0 of the report:

| # | Finding | Effort | Recommended for v2 |
|---|---------|--------|-------------------|
| 8 | AI Maturity Assessment baseline | 1-2 days | Yes — gives board a single-number score |
| 9 | Game Server Orchestration section (Agones/GameLift) | 1-2 days | Yes — gates multiple recommendations |
| 10 | Backend build-vs-buy decision tree | 1 day | Yes — shows how AI roadmap changes |
| 11 | Competitive landscape depth | 2-3 days | Yes — industry adoption stats needed |
| 12 | Organisational transformation model | 1-2 days | Yes — role evolution, AI literacy |
| 17 | Budget as strategic alternatives (not just min/max) | 1 day | Yes — CFO needs choices not ranges |
| 20 | Player behaviour telemetry architecture | 0.5 day | Yes — architecture NOW, tools later |
| 23 | Strategic scenario planning (4 scenarios) | 1-2 days | Yes — McKinsey standard |
| 24 | Investor-ready governance mapping (NIST/ISO) | 1 day | Yes — claimed but not delivered |

## Estimated Score After Fixes: 7.8-8.0/10

The fixes applied address all CRITICAL factual errors and the most impactful HIGH-priority items. The remaining gap to 9/10 is primarily structural — adding the strategic frameworks, financial models, and MMO architecture depth listed above.

## Path to 9/10 (v2.0 scope)
Per the workflow's assessment: ~10-14 days additional analyst work for the strategic wrapper (maturity assessment, scenario planning, ROI model, architecture integration diagram, competitive intelligence, workforce impact model). The existing tool research, legal analysis, and scoring methodology are already at or above McKinsey standard.
