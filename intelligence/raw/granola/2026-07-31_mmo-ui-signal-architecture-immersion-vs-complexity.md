---
source: granola
source_id: not_dx7xZpU2pXwi5w
source_path: https://notes.granola.ai/d/edcb2f9c-c15a-4ab4-a6c6-372e889e61e7
ingested: 2026-07-31
topics_detected: [mmo-ui, ux-design, diegetic-ui, signal-architecture, game-design]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# MMO UI Signal Architecture: Match Information Layer to Experience Intent

## Key Content

The decision framework for how to architect UI in a given context: match information density and presentation to the experience the player is intended to have in that moment.

**Two poles:**

- **Immersion-first (Naughty Dog style):** Minimise UI. Filter information for the player -- show only what the experience demands. The UI disappears into the fiction.

- **Complexity-first (RTS, WoT style):** Customisable UI with layered information. Players tune their data view. Example: World of Tanks RTS overlay layers 7-tank info into one HUD with temporalised icon priority.

**Application to MMO character customization:** diegetic in-world experience (e.g. visiting an armorer's workshop to customise a sword) calls for immersive treatment. A pop-up windowed widget breaks the fictional frame. The inventory widget can be windowed (already outside the fiction); the weapon customization widget at a workbench should not be.

**UI brief design error:** defaulting all UI elements to windowed/HUD treatment misses the diegetic intent. Briefs must explicitly classify which elements are diegetic (in-world, cinematic treatment) and which are conventional (HUD/windowed).

**Test benchmark:** 87% of Skyrim players mod the UI immediately -- a design philosophy that consistently overrides player need creates a modding tax and signals misaligned information architecture.

## Decisions / Insights

- CPO confirmed: mostly windowed UI but not exclusively -- cinematic and full-screen elements are in scope for specific MMO contexts
- CPO concluded: UI test brief must be clarified when windowed-only language is causing candidate confusion -- brief will be reviewed
- UX methodology: onboarding approach for a new UI designer joining an MMO project -- play all game references first, get on the same language before pushing ideas (3-6 months in MMO/RPG references before proposing changes)

## Context

Senior UI/UX designer interview at a ~60-person UK/Cyprus MMO studio, July 2026. Candidate with multi-studio background covering art direction, UX, and game UI. Interview covered MMO-specific UI challenges. Candidate identity is not the extractable knowledge -- the framework discussed is.

## Applicability

Relevant when: advising on MMO UI design brief -- classify each UI element as diegetic vs. conventional before specifying window/HUD treatment; never default everything to windowed.
Relevant when: reviewing UI/UX work at a studio -- check whether information architecture matches experience intent, not just whether the UI is functional.
Relevant when: hiring a UI/UX designer for an MMO -- test signal architecture reasoning (immersion vs. complexity) as a core evaluation criterion.
Relevant when: onboarding a UI/UX designer to a new MMO project -- reference-first onboarding (play the references, align on language) before allowing design proposals reduces misalignment.
