# Bank Registry

Master list of all knowledge banks. The ingestion agent reads this to classify extracts.

## Active Banks

| Slug | Description | Accepts Content About | Role Associations |
|------|-------------|----------------------|-------------------|
| production_methods | Studio production frameworks, sprint methodologies, milestone planning | How studios organise work: sprints, cycles, milestones, team coordination, remote work patterns, agile adaptations for games | producer, production_consultant |
| games_pitch_decks | Pitch deck examples, structures, investor expectations by platform/stage | Investment pitches for games, deck structure, VC expectations, fundraising processes, what works by platform and stage | gaming_practice_lead, cmo |
| forecast_models | Revenue and player forecasting methodologies | Financial models for games, player projections, LTV calculations, retention curve analysis, market sizing, revenue projection frameworks | data_analyst, gaming_practice_lead |
| industry_current | Current market state, trends, deals, platform changes | Acquisitions, funding rounds, studio closures, platform policy changes, market shifts, technology trends in gaming | gaming_practice_lead, cmo |
| client_patterns | Cross-client learnings and engagement patterns | What worked across NBI client engagements, advisory approaches, delivery patterns, pricing that landed, proposals that won | producer, gaming_practice_lead |
| personal_insights | Glen's decisions, preferences, strategic thinking | Glen's choices and reasoning, rejected approaches and why, strategic positions, working patterns, business philosophy | (all roles — loaded on request) |
| client_couch_heroes | Couch Heroes specific knowledge | Anything specific to CH: their team structure, their game, their decisions, their production approach, their people | producer, production_consultant, head_of_people |

## Bank Lifecycle

- Banks are created dynamically when the pipeline detects topic clusters (>= 3 extracts from >= 2 sources in 14 days)
- New banks require Glen's approval unless auto-create is enabled for that topic family
- Banks exceeding 500 lines get split into sub-banks
- Banks unused for 60+ days get flagged for review (archive or deprioritise research)
