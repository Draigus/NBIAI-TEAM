---
source: granola
source_id: not_BnJG1zZhVGts0U
source_path: https://notes.granola.ai/d/749f79aa-3dd6-40aa-b7a8-ee0b5d9d2edd
ingested: 2026-07-22
topics_detected: [ai-policy, ip-risk, copyright, gdpr, studio-governance]
relevance_score: 9
novelty_score: 6
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Studio AI Tool Governance: Enterprise vs Personal Accounts and IP Risk

## Key Content

Critical gap identified: game studio team members using personal AI project trackers or tools (not enterprise accounts) to organise company IP including creative direction documents, design notes, and ClickUp data. Risk: IP fed into personal AI tools may lose copyright protection on both literary works and design elements. Two active lawsuits by Oregon-based actors exploiting this gap as of July 2026.

Distinction that matters:
- Enterprise Claude / ChatGPT accounts: IP stays within the enterprise tenant; "do not use for training" policy applies
- Personal accounts: IP may be used for model training; copyright protection undermined
- Integrated platform tools (Google Drive + Gemini): legal gray area -- likely fine if IP is not intentionally ingested, but flagged for follow-up

Immediate governance actions required when this risk is identified:
1. Stop granting new AI tool access to game team until policy is formalised
2. Require all team members to enable "do not use for training" in tool settings
3. Establish enterprise-only AI access policy (no personal accounts for work tasks)
4. Bring in DPO expertise -- GDPR, PII, and COPPA intersect with AI tool usage in game studios
5. Granola meeting transcripts and game design discussions: open legal question requiring DPO review

## Decisions / Insights

- COO and CPO decided: pause all new AI access grants to the game team until policy is set; existing access unchanged
- Glen identified: the enterprise vs personal account distinction is the critical boundary -- enterprise accounts with training opt-out are defensible; personal accounts are not
- Glen assessed: Google Drive / Gemini integration is a gray area requiring DPO guidance rather than immediate prohibition
- Pattern identified: game studios routinely underestimate the copyright exposure from AI ingestion of creative IP -- this is an active litigation area as of mid-2026

## Context

Operations sync at a game studio where a team member had loaded company creative direction documents into a personal AI tool. CPO (Glen) identified the IP risk and escalated immediately. Attendees: COO, CPO, Finance/Ops lead. Actions set in motion same day. 2026-07-22. Note: partially builds on prior web research extract (studio-ai-copyright-ip-risk-game-dev-framework.md, 2026-07-20) with operational specifics from a live incident.

## Applicability

Relevant when: advising a game studio on AI tool policy -- the enterprise vs personal account boundary is the first and most important distinction to establish.
Relevant when: a studio team member is using personal AI tools for work tasks -- immediate remediation actions apply.
Relevant when: a studio has not yet formalised AI governance and is approaching a fundraise or due diligence -- investors will ask, and an informal policy is a red flag.
Relevant when: assessing GDPR / PII / COPPA exposure in a game studio using AI tools -- DPO involvement is required, not optional.
Relevant when: building an AI acceptable-use policy for a client studio from scratch -- the five immediate actions are a minimum viable governance framework.
