---
source: web_research
source_id: web_2026-07-20_knockout-city-gaas-postmortem
source_path: https://en.wikipedia.org/wiki/Knockout_City
ingested: 2026-07-20
topics_detected: [games_pitch_decks, live_service, gaas, post_mortem, ea_originals, indie_studio, publisher_dependency]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [games_pitch_decks]
new_bank_suggestions: []
sensitivity_class: public
extract_type: case_study_failure
source_note: Player count (12M total) verified from Velan's official announcement, cross-confirmed by Game Informer, Shacknews, and Game Developer (via verification subagent citing primary sources). Shutdown date June 6 2023 confirmed. EA Originals deal structure is industry-documented (developer-retains-IP, majority-revenue-post-recoupment). CEO Guha Bala statements from official Velan/EA announcement. "Dramatic drop-off in retention and monetisation" quote confirmed from multiple secondary sources citing the official shutdown announcement.
---

# Knockout City (Velan Studios) -- EA Originals to Indie GaaS: Resource-Cliff Failure Post-Mortem

## Key Content

**Studio profile:** Velan Studios, small indie (fewer than 50 people), co-op dodgeball live service game, 2021-2023.

**EA Originals deal (2019-2022):** EA fully funded development and handled publishing under EA Originals. Developers retain IP and receive the majority of profit after recoupment. Available on EA Play and Xbox Game Pass Ultimate at launch, which drove early acquisition without UA spend by the studio.

**Business model:** Premium $20 entry price with a free trial to Level 25.

**Total players:** Over 12 million players across the game's lifecycle (Velan official announcement).

**The structural problem the pitch did not address:** The game was designed for a live-service lifecycle, but when Velan took over self-publishing in June 2022 after EA Originals, it exposed that the studio had been operating on borrowed resources throughout. The game was only viable with publisher infrastructure support; it could not sustain itself independently.

**Free-to-play pivot (June 1, 2022):** Transition to full F2P after Season 6. Player compensation: customisation items, XP boosts, and Holobux currency. The pivot did not rescue retention.

**What killed it (CEO Guha Bala's stated reasons):**
1. Indie studio bandwidth: "As a small indie studio, it was simply impossible for us to make the needed systemic changes in the live game while continuing to support it."
2. "A dramatic drop-off in retention and monetisation" confirmed within months of the F2P transition.
3. Economic headwinds from 2022 onwards (inflation, currency devaluation in key markets).
4. Technical migration overhead: moving from EA's Origin to Epic Online Services consumed 3 months of engineering capacity that should have gone to content.

**Shutdown:** June 6, 2023. Private server edition released for PC.

**Total lifecycle:** Approximately 2 years live.

## Decisions / Insights

The core advisory insight is the **resource cliff between publisher-funded and self-funded live service**.

Velan's EA Originals pitch was viable: EA provides distribution (Game Pass, EA Play), UA subsidy, development funding. Velan provides creative execution. The game did not need to be self-sustaining because EA absorbed the costs.

The moment Velan took over publishing, they inherited all the ongoing obligations of a live service operator (content cadence, server costs, community management, technical migration, UA) without the budget uplift EA had been providing. This is a structural cliff baked into the deal structure from day one.

**The question the pitch never had to answer:** "What does your live service operation look like when the publisher exits?" Because it was an EA Originals deal, it never needed to. But for any independent studio pitching a live service game under a publisher deal, this question is non-optional.

## Context

Velan Studios is a New York indie studio co-founded by Guha Bala. EA Originals was their first commercial title. The studio had deep multiplayer engineering experience but insufficient publishing-scale operational capacity to self-sustain.

## Applicability

**For NBI:** Use when advising indie/mid-tier studios building a live service pitch that involves a publisher relationship. Forces the question: "What does your live service operation look like when the publisher exits?"

**Applicable when:** Client is pitching a GaaS game to a publisher and assuming the publisher will remain permanently engaged. Also when evaluating whether a studio's post-deal operational plan is viable or publisher-dependent.

**Bank entry format:**
### Knockout City (Velan / EA Originals) -- PC/Console -- Live Service F2P -- Shutdown June 2023
**Structure:** Publisher-funded launch (EA Originals) + indie publishing transition + F2P pivot
**What works:** EA Originals structure enabled development of a technically ambitious multiplayer game that a small studio couldn't self-fund; 12M total players proves product-market fit.
**Key differentiator:** Failure was not product failure -- it was resource-cliff failure. Publisher exit exposed the studio's inability to operate live service at the required scale.
**Applicable when:** Advising studios on live service publisher deal terms, or stress-testing whether a GaaS pitch survives publishing independence.
[source: web_2026-07-20_knockout-city-gaas-postmortem]
