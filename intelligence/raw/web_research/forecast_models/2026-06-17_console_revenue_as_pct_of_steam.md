---
source: web_research
source_id: web_2026-06-17_console_revenue_as_pct_of_steam
source_path: https://newsletter.gamediscover.co/p/its-ok-the-meh-ening-of-indie-console
ingested: 2026-06-17
topics_detected: [forecast, market_sizing, console, indie_game, steam, pc, platform_comparison, xbox, playstation, nintendo_switch, game_pass, revenue_ratio]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Console Revenue as Percentage of Steam — Indie Tier Benchmarks and Translation Framework

## Key Content

GameDiscoverCo (Simon Carless) produced the most directly usable publicly available treatment of the PC-to-console revenue ratio for indie developers. Derived from aggregate developer survey data, disclosed developer statements, GameDiscoverCo download tracking, and platform-level download volume data.

### Platform hierarchy for indie discoverability

From Devolver Digital and equivalent publisher statements, the consensus ranking:

1. PC (Steam) — best organic discovery, strongest long-term tail, international reach
2. Nintendo Switch — audience receptive to experimental and genre-forward titles; limited algorithmic discovery
3. PlayStation — higher presentation expectations; audience skews AAA-centric; trophy-driven engagement
4. Xbox — weakest organic sales for indie premium titles; structurally disrupted by Game Pass substitution

### Xbox Game Pass substitution effect (verified, widely cited)

Games launching day-and-date on Game Pass can expect approximately 80% reduction in premium unit sales on Xbox (sourced from Christopher Dring / GamesIndustry.biz). The ID@Xbox programme reports ~15x increase in monthly active users (MAU) over first 90 days for indie titles on Game Pass — high reach, collapsed sales. For market sizing: Xbox premium indie SAM is near-zero for any developer also entering Game Pass. Treat Xbox standalone premium sales as negligible for Game Pass titles.

### Sales curve shape difference (console vs. PC)

- Console: sharp initial launch spike, cliff within 4–6 weeks, slow decay
- PC (Steam): moderate launch, stronger sustained tail (seasonal sales, discovery queue, wishlist conversion over years)
- Net effect: console and PC lifetime revenues may be broadly comparable for a genuine hit, but console requires concentrated launch marketing investment while PC compounds over time

### Platform download scale (Jan–Aug 2025, Sensor Tower / VG Insights data)

Total paid-game-implied downloads:
- Steam: ~323M paid (basis for ratio calculations)
- PlayStation: ~312M paid (~97% of Steam paid volume)
- Xbox: ~172M paid (~53% of Steam paid volume)

Caution: these are total-market figures including AAA. Indie-specific ratios will be lower on console given indie titles hold a smaller share of console spending vs. Steam.

### Indie market share on console vs. PC (Sensor Tower / VG Insights 2025 data)

- Indie downloads as share of total: 60% on Steam, 34–35% on PlayStation and Xbox
- F2P share by downloads: Steam 21%, PlayStation 17%, Xbox 39%
- Implication: Console indie audiences are proportionally smaller and compete with a larger F2P footprint (especially Xbox)

### Documented anchor data point

Car Mechanic Simulator sold approximately 10% of its PC launch volume on Xbox during a comparable launch window (verified in GameDiscoverCo coverage). NIS America president publicly stated console sales show a "dramatic initial spurt" vs. PC's "steadier" long-term revenue, with similar or lower lifetime totals for most mid-tier titles.

### Working framework — console as percentage of Steam revenue

The following ranges are derived, not published as a single table. Assembled from the Car Mechanic 10% data point, developer anecdotes, the NIS president statement, and the download share arithmetic above. Use as planning ranges, not benchmarks, and disclose as such in client deliverables.

| Scenario | Switch | PlayStation | Xbox (no Game Pass) |
|---|---|---|---|
| Nintendo-adjacent genre (cozy, platformer, puzzle) | 20–35% | 10–20% | 5–10% |
| Action / RPG crossover | 10–20% | 15–25% | 5–15% |
| Darker / mature themed | 5–15% | 15–30% | 5–15% |
| Any title entering Game Pass | N/A | N/A | <5% premium sales |

## NBI Application Notes

This is the core console market sizing translation layer for NBI. When a client has a Steam revenue estimate (from the review-count multiplier or wishlist conversion method), apply the console-as-percentage-of-Steam ranges to generate console SAM estimates. Genre drives which row to apply. The Xbox question must be asked explicitly: is the client considering Game Pass inclusion? If yes, Xbox premium SAM collapses to near-zero and the relevant metric is MAU reach (brand building), not revenue. Always report console figures as a percentage-of-Steam range with the derivation disclosed — presenting these as point estimates would misrepresent their precision. The framework's value to NBI is providing a structured basis for the conversation rather than a precise forecast.
