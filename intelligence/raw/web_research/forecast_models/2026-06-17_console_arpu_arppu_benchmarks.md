---
source: web_research
source_id: web_2026-06-17_console_arpu_arppu_benchmarks
source_path: https://gamedevreports.substack.com/p/newzoo-arpu-and-arppu-on-pc-and-consoles
ingested: 2026-06-17
topics_detected: [forecast, market_sizing, arpu, arppu, playstation, xbox, pc, console, revenue_per_user, benchmark, monetisation]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Newzoo: Console vs. PC ARPU/ARPPU Benchmarks (US Market, Jan–Sep 2022)

## Key Content

Newzoo published platform-level ARPU and ARPPU data for the US market covering January–September 2022, summarised by GameDevReports. This is the most recent publicly available cross-platform ARPU breakdown on free-tier research. Data is 2022 vintage (see calibration note below).

### ARPU (Average Revenue Per User — all users including non-payers)

| Platform | Monthly ARPU |
|---|---|
| PC | $2.2 |
| Xbox | $1.2 |
| PlayStation | $1.1 |
| Nintendo Switch | Not reported |

### ARPPU (Average Revenue Per Paying User — only users who made a purchase)

| Platform | Monthly ARPPU |
|---|---|
| PlayStation | $21.2 |
| PC | $20.5 |
| Xbox | $19.2 |
| Nintendo Switch | Not reported |

### Non-paying user proportion

| Platform | % of users making no purchase in prior 6 months |
|---|---|
| PC | 18% |
| Console (combined) | 23% |

Key structural insight: PC ARPU is higher than console ARPU despite comparable ARPPU across platforms. The gap is driven by a higher proportion of paying users on PC (82% paying) vs. console (77% paying). Console audiences have a larger non-paying segment relative to PC.

### Implication for indie premium games

Console ARPPU for premium games (no F2P, no live service) is broadly comparable to PC — paying users on PlayStation and Xbox spend at similar rates. The challenge is that fewer console users convert to paying users for premium titles, and the paying pool on console skews toward established franchises and AAA titles rather than indie discoveries.

### Switch ARPU/ARPPU gap

No public ARPU/ARPPU data exists for Nintendo Switch. Nintendo does not report digital revenue in a way that permits per-user calculations. The closest directional proxy is Nintendo's reported average software revenue per hardware unit sold (approximately $35–40 per Switch owner per year in recent fiscal disclosures), but this includes first-party titles and is not applicable to indie market sizing.

### Calibration note — data age and subscription inflation

These are 2022 figures. Console market composition has shifted since: Game Pass, PS Plus Extra, and Nintendo Switch Online have all grown, increasing the non-paying share for premium titles as subscription-accessible games cannibalise the paying pool. Current ARPPU for pure premium indie titles is likely lower in nominal terms. Treat as directional floor rather than current benchmark; apply a conservative haircut for 2025+ projections.

## NBI Application Notes

Use ARPU/ARPPU data as a sanity-check input in bottom-up LTV models for console audiences. For a premium indie title, apply the platform ARPPU (~$20) to the estimated paying-user proportion (77% for console, 82% for PC) of the platform's addressable audience, and use that as a revenue-per-addressable-user input. This is most useful for validating whether a SOM is plausible: if a proposed revenue figure implies ARPPU well above the $20 platform baseline for the client's genre, the model is likely optimistic. The Switch data gap means any Switch-specific ARPU modelling requires a different approach — use the chart rank-to-units benchmarks (see companion extract) for Switch rather than ARPU-based bottom-up modelling.
