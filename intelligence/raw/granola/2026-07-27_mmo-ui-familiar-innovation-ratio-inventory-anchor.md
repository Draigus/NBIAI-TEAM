---
source: granola
source_id: not_9NCUPqZVFNbx4Q
source_path: https://notes.granola.ai/d/968fb7b5-0734-4f5a-8194-2952f7bb0e4e
ingested: 2026-07-27
topics_detected: [mmo-ui, ux-design, ftue, inventory-design, player-onboarding, ui-philosophy]
relevance_score: 8
novelty_score: 7
actionability_score: 7
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# MMO UI Design: 60/40 Familiar-Innovation Ratio with Inventory as the Load-Bearing Anchor

## Key Content

A practical heuristic for MMO UI design from a senior UI/UX practitioner with deep Unreal and live-service experience:

**The 60/40 (or 70/30) ratio rule:**
- Majority of the UI (60-70%) should be familiar -- genre conventions, learned patterns, standard affordances
- The remainder (30-40%) can be deliberately innovative: novel skill trees, diegetic UI elements, non-standard interaction patterns
- The ratio keeps onboarding friction low while creating moments of genuine distinction
- Violating the ratio (too much innovation) alienates veteran players; too little makes the product invisible

**Diegetic UI as the innovation slot:**
- Standard menus replaced by in-world screens or objects (e.g. a character customisation "matrix chair" screen rather than a flat pause-menu)
- Diegetic elements are best positioned in high-engagement low-frequency interactions (character creation, equipment, housing) where the player has time and motivation to lean in
- Avoid diegetic elements in high-frequency, low-latency interactions (combat, quick-access inventory) where friction costs are immediate

**Inventory as the hill to die on:**
- Inventory design is the highest-leverage single UI system in an MMO: loadout logic, item interaction verbs, icon language, slot/weight architecture all flow downstream from it
- Get inventory wrong and the entire economy, loot, and trading UX inherits the defect
- Inventory should be the first system fully designed and locked; other UI systems are downstream

**FTUE for veteran vs. newcomer:**
- It is not possible to design a single FTUE screen that serves both audiences simultaneously
- Solution: shallow entry layer with depth available on demand -- veterans skip, newcomers follow the guided path
- Do not open player customisation to full control early; the studio should define the "best path" first and unlock customisation progressively
- WoW's 400-mod ecosystem took 20 years of trust-building to earn -- studios should not try to replicate that on launch

## Decisions / Insights

- Practitioner observed: inventory is the MMO UI system with the highest downstream leverage -- design it first and lock it before touching other systems
- Practitioner observed: the 60/40 familiar-innovation ratio is a practical ceiling; exceeding the innovation allocation alienates veterans without meaningful gain
- Practitioner observed: diegetic UI works best in low-frequency, high-engagement interactions; it creates friction if applied to high-frequency or time-critical interactions
- Practitioner observed: a single FTUE cannot serve veterans and newcomers simultaneously -- a layered entry path (shallow default, depth on demand) is the structural solution

## Context

Interview and onboarding conversation with a senior UI/UX practitioner (20 years in games: Sony, Google, BBC, Splash Damage, CCP, Sharkmob, Rebellion) joining an MMO studio. 2026-07-27. The practitioner brought these frameworks independently as their design philosophy; not studio-specific directives.

## Applicability

Relevant when: reviewing or advising on MMO UI architecture -- the 60/40 ratio and inventory-first sequencing are immediately applicable evaluation criteria.
Relevant when: a studio is debating how much to innovate on UI -- the familiar-innovation ratio gives a defensible ceiling for innovation scope.
Relevant when: designing FTUE for a game with both veteran MMO players and newcomers in the target audience -- the layered entry approach is the only viable structure.
Relevant when: a studio is considering diegetic UI elements -- apply them to low-frequency, high-engagement interactions; avoid them in high-frequency gameplay loops.
