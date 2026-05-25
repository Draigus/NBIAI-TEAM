---
source: chatgpt
source_id: chatgpt_6899e32a-fe64-8324-b830-8bef1f182324
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [forecast-simulator, aerm-model, scenario-analysis, monetisation-modelling, excel-product]
relevance_score: 9
novelty_score: 8
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Forecast Simulator Design: AERM Model Comparison and Enhanced Spec

## Key Content
Detailed comparison between Sarge Universe forecast model and Apex (AERM) forecast model, identifying seven key improvement areas for an enhanced simulator: (1) Scenario analysis with Low/Medium/High toggles via dropdown-driven modifier percentages. (2) Event/feature impact modelling with a dedicated timeline where each event has date, uplift value, and on/off toggle. (3) Segmentation by acquisition channel or user type. (4) Unified monetisation rollup (battle pass, direct store, lootboxes, durable deferment, credits economy) into single financial summary. (5) In-game currency sinks and sources tracking as a distinctive feature. (6) Dashboard/graphs sheet with weekly and monthly summaries. (7) Actuals integration for forecast vs real data comparison.

Sarge-specific baselines from planning docs: 28-day season at GBP4.99 battle pass, 20% attach, Commander Pass GBP19.99 from Month 3, 98 SKUs at launch, D1 retention target 45-50%, weekday sessions target 5, weekend 6-8, mean session 12-15 minutes, no rewarded ads in mobile core, bi-weekly weekend events with 15-20% ARPDAU uplift, flash sales on 5-7 day cycles with 7-day cooldown per SKU group.

## Decisions / Insights
- Glen decided: the forecast simulator is a product, not just a spreadsheet; it must be client-ready with a control panel and documentation
- Glen decided: scenario toggles (Low/Med/High) via percentage modifiers applied to baseline assumptions, not separate models
- Glen decided: in-game currency tracking (sinks and sources) is a distinctive feature that impresses clients
- Glen observed: AERM model's feature control panel with index/lookup-driven event scheduling is the gold standard for realism

## Context
Created August 2025 as the design specification for the enhanced Sarge Universe Excel forecast simulator, comparing existing Sarge and Apex/AERM models to merge the best of both.

## Applicability
- Relevant when: building or improving forecast simulators for F2P game clients
- Relevant when: designing the Playsage Foresight module's scenario engine
- Relevant when: comparing forecast model architectures for different game products
- Relevant when: implementing event-driven uplift modelling in Excel-based forecasts
