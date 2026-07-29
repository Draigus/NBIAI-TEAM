---
source: web_research
source_id: web_2026-07-29_holdout-incrementality-live-ops
source_path: https://atticusli.com/blog/posts/holdout-tests-incremental-revenue/
ingested: 2026-07-29
topics_detected: [live_ops, incrementality_testing, holdout_group, revenue_lift, event_measurement, a_b_testing]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Holdout Group Testing for Live Ops Incrementality: Isolating True Event Revenue Lift from Organic Trend

## Key Content

The core measurement problem in live ops is attribution: when a seasonal event or promotion runs, how much of the revenue spike is caused by the event versus organic trend, concurrent marketing, or normal variance? Holdout group testing (incrementality testing) is the methodology that resolves this. It is the same framework used in digital advertising attribution, adapted for in-game event measurement.

### The Fundamental Design

A holdout test is a controlled experiment where a randomly selected portion of the active player base is excluded from event participation while the remaining players receive the event normally. Both groups are measured before and during the event window. The revenue difference between groups, minus the pre-event baseline difference, represents incremental lift attributable to the event.

**Group allocation:**
- Treatment group: receives the live ops event (standard product experience)
- Holdout (control) group: withheld from event access; receives baseline game experience
- Typical holdout size: 5% to 20% of active users

The holdout size decision involves a trade-off: a larger holdout improves statistical precision but withholds the event from more players (sacrificing revenue in the test period for measurement accuracy). Five per cent is viable for high-volume games; 10-20% may be necessary for titles with lower DAU.

### The Statistical Method: Difference-in-Differences

The correct analytical framework is difference-in-differences (DiD). This isolates the event effect by controlling for any pre-existing trend affecting both groups equally.

**Step 1:** Measure revenue per user (RPU) in a baseline pre-event window for both groups (minimum 2 weeks, aligned on calendar to avoid seasonal distortion).

**Step 2:** Measure RPU during the event window for both groups.

**Step 3:** Calculate:

```
Incremental lift per user = (Treatment RPU change) - (Control RPU change)
```

Where:
- Treatment RPU change = RPU(event window) - RPU(baseline), treatment group
- Control RPU change = RPU(event window) - RPU(baseline), control group

**Worked example (verified from source):**
- Treatment group (80,000 users): RPU increased from $10.00 to $11.40 (+$1.40)
- Control group (20,000 users): RPU increased from $10.10 to $10.60 (+$0.50)
- The control group's $0.50 increase represents organic trend during the event window
- Incremental lift per user: $1.40 - $0.50 = **$0.90**
- Total incremental revenue: $0.90 x 80,000 = **$72,000**

Without the holdout, the naive calculation would attribute the entire $1.40 increase per user to the event, overstating incremental revenue by 56%.

### Statistical Power and Sample Sizing

The most common failure mode is running underpowered tests. Standard guidance:

**Minimum Detectable Effect (MDE):** Define upfront what minimum revenue lift would change your decision about running this event type again. For live ops events where 20-50% engagement uplift is common, an MDE of 10-15% on revenue is appropriate.

**Control group conversions required:** At 80% statistical power and 95% confidence, detecting a 10% lift requires approximately 200 monetisation events (purchases or sessions with spend) per week in the control group.

**Deriving holdout size from this:**
```
Required holdout size = (200 required control events) / (weekly revenue events per user x total users)
```

Example: if the game generates 2,000 purchase events per week total, you need 200 control events, so 10% holdout. If the game generates only 500 purchase events per week, you need 40% holdout, at which point the test cost becomes significant.

**Duration:** Commit to the test duration before starting. Live ops events typically run 1-2 weeks. A proper holdout requires:
- 2-week pre-event baseline window
- Full event duration (1-2 weeks)
- 1-week post-event stabilisation window to measure carry-over effects
- Total: minimum 4-5 weeks of measurement

Do not stop early if results look favourable; this inflates false positive rates.

### Four Holdout Test Types Applicable to Live Ops

**User-level holdout** (preferred for live ops): The game's own backend randomly assigns a per-user flag at the start of each event cycle. Players in the holdout see the baseline game. This is the cleanest design for live ops because the studio controls randomisation. Risk: players in the holdout may notice missing event content and feel disadvantaged, increasing churn risk in the holdout group.

**Geo holdout**: Split by region; event runs in some markets, not others. Controls for user-level contamination (players cannot compare notes across holdout boundary as easily). Limitation: regions differ on many dimensions; the control region must be matched carefully on baseline ARPU, seasonality, and competitive environment.

**Time-based on/off**: Run event, then pause next cycle, compare. Valid only as directional signal. Confounded by seasonality and product changes. Cannot produce reliable quantitative lift estimates.

**Matched market model**: Statistical control region derived from historical co-movement. Requires historical data and modelling investment. Not recommended for small studios.

### Applying This to a Mobile Game Live Ops Event

**Define the treatment:** What exactly constitutes event participation? Visibility of event UI? Ability to purchase event pass? Ability to earn event currency? Define clearly so the holdout excludes precisely that experience.

**Contamination risk:** High in live ops. If the holdout group's friends are posting about event rewards in community channels, the holdout group changes behaviour even without direct exposure. This cannot be fully controlled but is mitigated by: short event windows, user-level (not guild or group-level) randomisation, and avoiding holdouts during virality-heavy events.

**Incremental ROAS calculation for paid promotions around events:**
```
Incremental ROAS = (Incremental event revenue) / (Event marketing cost)
```

If the event also runs paid UA, the holdout must also be excluded from the UA campaign, otherwise you are measuring event + UA lift conflated.

**Carry-over effects:** Some event revenue materialises after the event closes (players who started event pass progress and continue buying). Measure revenue in a 7-day post-event window for both groups and include it in the analysis.

### Decision Thresholds

The author recommends scaling if incremental ROAS clears a threshold approximately 3x the cost of running the event. For live ops events where variable costs are low (primarily design and community management), even a 1.2x incremental ROAS may justify the event if it also positively affects 30-day retention for event participants.

A finding of near-zero or negative incremental revenue lift does not necessarily mean the event should be cancelled; it may mean the event drives engagement and retention without driving immediate IAP. These need to be measured separately with the same holdout design applied to D30 retention as the outcome variable.

## Decisions / Insights

- The DiD formula subtracts organic trend from observed lift; always run a pre-event baseline window of at least equal length to the event window
- A 10% holdout is the practical minimum for games with DAU above 20,000; smaller games may require 20-40% holdouts to achieve statistical power
- Never stop a holdout test early; define duration and MDE before execution and commit
- Measure post-event carry-over in a 7-day window after event close; some event IAP occurs in this tail
- Incremental ROAS and retention impact must be measured separately; an event can have negative incremental IAP and positive incremental retention, or vice versa

## Context

Primary source: atticusli.com blog post on holdout tests and incremental revenue. Worked example numbers (treatment group RPU $10.00 to $11.40, control $10.10 to $10.60, $0.90 incremental lift, $72,000 total) are from this source, verified accessible 2026-07-29. Secondary source: adlibrary.com/posts/holdout-test (2026 guide), which provided the 80% statistical power / 200 conversions / 10% holdout sizing framework (also verified 2026-07-29). Primary source is a digital advertising incrementality framework adapted here to live ops events; the methodology is well-established in attribution science and the game-specific adaptation is mechanical. No game-specific holdout results are cited in either source.

## Applicability

NBI can use this framework to design holdout tests for client live ops programmes. Most practical application is in advising clients who have already launched a live ops programme and want to know whether their events are generating incremental revenue or simply redistributing existing spend.

Minimum viable implementation: segment 10% of active users into a persistent holdout group (randomised by user ID hash), exclude from event rewards and event-related push notifications, measure RPU weekly for both groups.

Limitation: requires client backend capability to exclude users from specific event mechanics at the server level. Many Unity-era small studios using off-the-shelf backends (PlayFab, BrainCloud) can implement this as a remote config flag. Studios on legacy or custom monolithic backends may find this technically complex. Assess backend capability before recommending.

Also requires a long enough event history to run properly (minimum 3 events of the same type before the pattern is interpretable). Not recommended as an initial evaluation for a client running their first event.
