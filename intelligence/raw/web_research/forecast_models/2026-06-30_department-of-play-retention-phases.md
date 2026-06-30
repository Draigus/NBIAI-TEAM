---
source: web_research
source_id: web_2026-06-30_department-of-play-retention-phases
source_path: https://departmentofplay.net/retention-framework-keep-your-players-forever/
ingested: 2026-06-30
topics_detected: [forecast, retention, framework, diagnostic, design, d1_d7_d30, live_ops, social_mechanics]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Four-Phase Retention Diagnostic Framework (Department of Play)

## Key Content

Source: Department of Play games consultancy (Luke Muscat, formerly Halfbrick). Published on departmentofplay.net and syndicated to Unity LevelUp / Medium. Framework maps temporal phases of player retention to the specific game design levers that drive them -- distinguishing this from pure benchmark frameworks.

**Core premise:** Retention at different points in a game's lifecycle is driven by different underlying factors. Diagnosing a retention problem requires identifying *which phase* is failing before prescribing a fix. Applying Phase 3 solutions (live ops) to a Phase 1 problem (first-session experience) wastes resources and delays recovery.

---

**Phase 1: Early (D0–D7) -- First-Session Quality**

What drives D1 retention:
- *Grokability:* Can players understand what to do without external help? Tutorial completion rate is the leading indicator. Drop-off on first tutorial step = grokability failure, not game design failure.
- *Novelty:* Does the game feel different from its category? Not objectively novel -- just meaningfully differentiated to the target audience. "Same as X but better" rarely generates strong D1.
- *Technicality:* Crash rate, load time, battery draw. Analytics frequently misattributes poor D1 to design when the true cause is a technical barrier. Rule: audit technical issues before changing design.

*Diagnostic:* Poor D1 is almost always a first-session experience problem, not a monetisation problem. Check these three factors before anything else.

---

**Phase 2: Mid (D7–D30) -- Habit Loop Validation**

What drives D7 retention:
- *Progression vectors:* Are there visible advancement paths (levels, upgrades, content unlocks) that give players a clear "why return tomorrow"?
- *Mastery:* Can players perceive themselves improving? Skill-correlated outcomes (not random reward) drive this.
- *Return triggers:* Daily bonuses, timers, energy refills, push notifications. The cheapest D7-D30 lever to implement and among the highest-impact.

*Diagnostic:* Strong D1 / weak D7 = habit loop failure. The first-session problem is solved; the game is not creating a reason to return. Common miss: studios add content (new levels) when the issue is triggers (notifications, daily rewards), not content volume.

---

**Phase 3: Late (D30–D90) -- Social and Live Ops Anchors**

What drives D30+ retention:
- *Social comparison:* Leaderboards, PvP, rankings, guild competition. Players who can measure themselves against others have an externally generated reason to return that content alone cannot replicate.
- *Live ops cadence:* Regular content events drive return spikes visible in the retention curve. A flat retention curve between D30 and D60 (no spikes) in the absence of live ops indicates a game approaching churn ceiling.

*Diagnostic:* Games that survive to D90 at retention above 5% almost universally have either social comparison mechanics or regular live events -- usually both.

---

**Phase 4: Terminal (D90+) -- Community and Identity**

What sustains long-term retention:
- *Meaningful social interaction:* Clans, guilds, persistent rivalries, player-as-creator (UGC).
- *External engagement:* Discord communities, esports, streaming, content creator ecosystems.

Framework's central claim: "Players will tire of most elements of a game -- except those that involve other people." Mechanical depth is exhausted; social connection is not. Games that reach multi-year player lifespans without requiring content volume comparable to AAA titles are almost always those with strong social identity anchors.

---

**The Flattening Signal (cross-phase diagnostic):**

The most predictive single indicator of long-term LTV is the shape of the retention curve between D30 and D60, not the absolute value at any single day. A game retaining 4% at D60 on a flat curve has higher LTV trajectory than one at 7% D60 still declining steeply. Monitor slope, not just level.

---

**Key diagnostic questions at each phase boundary:**

| Boundary | Diagnostic Question |
|----------|-------------------|
| D0→D7    | Did the first experience create a daily habit? |
| D7→D30   | Does the progression system give a reason to return tomorrow? |
| D30→D90  | Is there a social or live-ops anchor? |
| D90+     | Is the game part of a player's identity or community? |

## Decisions / Insights

- Misdiagnosing retention phase is the most common and expensive retention mistake: applying D30+ solutions (live ops, social) to a D1 problem (tutorial) burns budget and delays the real fix
- Return triggers (daily bonuses, energy timers) are disproportionately high-ROI interventions because they address Phase 2 at low implementation cost -- studios frequently overlook them in favour of content creation
- The curve-flattening signal at D30-D60 is more informative than any absolute benchmark and should be the primary metric in long-term LTV discussions with clients

## Context

Department of Play is a games consultancy focused on mobile game analytics and design. The framework has been republished by Unity/IronSource (LevelUp Medium channel), indicating it has been reviewed and validated by practitioners at those organisations. The framework's design-rootedness (connecting retention data to specific game mechanics) distinguishes it from pure benchmark sources like GameAnalytics. Genre-level benchmark data referenced in the source article derives from GameAnalytics -- those figures are already in the bank as web_2026-05-26_gameanalytics_2025_retention_benchmarks.

## Applicability

**Direct NBI use:** Diagnostic structure for retention analysis conversations with studio clients. When a client presents weak retention data, this framework routes the investigation to the correct game layer before recommending interventions. Prevents the common error of recommending live ops (Phase 3) for a Phase 1 problem.

**Client fit:** Mobile-native framework but the phase logic applies to any game with daily engagement goals. PC/console studios may have longer phase durations (Phase 2 might extend to D14 or D30 for weekly-engagement games).

**Pairing:** Use alongside the Ovans power-curve model (web_2026-06-30_ovans-power-curve-retention-fitting) for the quantitative layer. This framework provides the qualitative diagnostic; the power curve provides the projections.
