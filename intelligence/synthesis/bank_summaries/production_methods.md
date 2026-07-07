# Production Methods -- Bank Summary

**Last compiled:** 2026-07-07 (incremental, 8 new extracts) | **Sources:** 139 qualifying extracts (18 web/chatgpt frameworks, ~108 Granola/Slack primary, 4 OneDrive, 3 Claude sessions)
**Role associations:** producer, production_consultant
**Bank lines:** ~650 (OVER 500-LINE SOFT CAP -- Glen review required for potential split)

## What This Bank Knows

- **Framework comparison table** covering Agilefall, NBI 6-Stage Pipeline, Rami Ismail LTPF, Tim Cain 9-Stage, Supergiant monthly milestone, Ghost Ship "develop by doing", and CSA -- with team size sweet spots, remote-friendliness, and real outcomes
- **Pre-production to production transition** -- false production belief diagnostics, NBI exit criteria, the Beautiful Corner, VS dual purpose, VS real game anxiety pattern, VS art quality floor (proxy kit as default), live service vs box game mindset gap, scope governance, three-tier lock system, feature tiering, forced art direction lock (convene-decide-close; chronic-drift diagnostic), VS proxy-to-finished ratio ~1:1.8 and skunkworks icon model
- **FTU/tutorial zone design** -- adaptive telemetry-driven tutorial design; investor vs player walkthrough as distinct modes; instanced single-player start area; Miro sign-off frame and consolidated doc folder as handoff prerequisites
- **Build stability and creative documentation** -- weekly build as primary visibility, GDD-first feature pipeline (fixed 5-step sequence with CPO escalation gate), R&D Confluence section for plugin evaluations, structured UE plugin evaluation methodology (3-day standalone process), plugin governance approval gate and UE5/UE6 lock rationale, concept art as support function (not pipeline gatekeeper), Art Bible as SOT, multi-discipline DoD (Game Director ownership)
- **Sprint and build governance (MMO at scale)** -- sprint-branch model (sprint → QA → main) for large-team VS (69 features); feature branches rejected for cross-team contributor model; Product Council branch sign-off; engine version lock protocol; bug cadence three-workstream model (features/bugs/tech debt every sprint + data-driven bug bash ~every 3 sprints; 845K item evidence for deferral risk)
- **Meeting structure and decision discipline** -- four-layer cadence, decision owner per pipeline stage, named ownership "who has the ball" protocol (red ball P0; GDD kickback gate; production channel as broadcast layer), executive RAG format, poisoned phrase problem
- **Org structure -- CPO model and two-house budget** -- hard separation between game (producer track) and studio ops (CPO track) at ~55+ staff; two-house budget with intentional friction as founder discipline mechanism; five macro budget codes; petty cash stops at director level; AI spend excluded from petty cash
- **Director accountability separation from production** -- directors commit to estimates they have reviewed; production flags failures, does not absorb them; "you cannot direct what you don't understand"; 40% discrepancy corrected by production = accountability failure, not production success
- **Performance composite dashboard** -- Slack + Jira + Perforce composite index; lead-only visibility (not company-wide); composite corrects for deep-work Slack silence; 30/55 output baseline, visibility effect expected to lift to 40-45 equivalent; flags trigger 1:1, not HR process
- **Leadership management-to-execution ratio** -- phased correction: 80/20 managing/doing → 60/40 as phase 1; 50/30/20 (managing/doing/cross-team) as phase 2; triggered by multi-stakeholder independent convergence on same gap; must specify concrete "hands-on" deliverables, not just time allocation
- **Executive meeting tracker** -- structured RAG Excel replaces AI summaries; silence as enforcement for unfilled sections; previous tabs locked weekly; C-suite only as standing members; historical decision record without separate minutes process
- **Plugin evaluation -- carve not replace** -- "what can we extract without replacing architecture?" is the correct question; repeated rejection is confirmed correct outcome, not evaluation failure; UE version decisions require joint art + tech sign-off
- **Strike-based performance protocol** -- three-strike escalation for returning or at-risk staff; senior advisor attribution protects line manager relationship; protocol has symmetric value (success or failure both produce coaching leverage)
- **Junior vs senior mindset diagnostic** -- response to incomplete VS build is the seniority signal: wait-and-see = junior; read the roadmap and close the gap = senior; coaching via overlap with senior new hire before exit of junior-mindset contributor
- **Contractor workforce management** -- IR35 gross-up day rate model, dead contracts closed immediately, 20-day average billing restructure, red-team rollout (one trusted contractor per department before studio-wide); Finance sign-off on statutory obligations before amendments; UK contractor compliance failure points (misclassification £60K/infraction, right-to-work checks for contractors, sponsorship sequencing, fintech banking risk)
- **Onboarding at scale** -- red and pink list framework for incoming leaders (independent audit in first 2-4 weeks, cross-reference diagnostic, UK probation window); role-specific machine builds and common stack; Jira implementation and migration; early probation exit grounds
- **Estimation methodology** -- blind affinity planning, min+20% corrective, wide-gap diagnostic, "shenanigans" culture, VS T4 floor commit protocol, ±10% buffer, leadership absorbs caveats
- **Hiring and people** -- 80/20 mid-senior target, quad assessment, staff quadrant 2x2, staged replacement waves, ATS workflow, early probation exit grounds
- **Statistical evidence** -- Shirinian (71% scope failure rate); Game Outcomes Project (design risk management 0.57, crunch avoidance 0.44, methodology 0.29)

## Most Recent Additions (2026-07-07, 8 new extracts)

- **Pillars vs value creations (razors)** -- aspirational pillars need operative constraints to be usable; two universally missing value creations: commercial viability and delivery constraint; stress-test method: ask how the team will misinterpret the pillar, not whether it is well written
- **Concept-first gate for new art work** -- mandatory concept pass before any new character or environment art; concept team sized to gating role (right-sized from 5 to 2 at one studio); AI generation and direct-to-3D are the structural cause of upstream bypass and style drift
- **AI tooling policy for game studios** -- formal written policy versus ad hoc permission required; approved tool list, usage protocol per tool type, output liability, image training opt-out, copyright-clear datasets (Getty/Shutterstock-licensed stock); legal review mandatory before policy goes live
- **Three-tier studio meeting cadence** -- C-level / operations / project tiers; operations tier is the missing layer in four-layer structures; code-word system for in-meeting escalation (named in-the-room signal to request topic escalation upward without disrupting flow)
- **CTO vs Technical Director role distinction** -- CTO: org/strategy/hiring/investor communication; TD: technical excellence/execution/delivery quality; neither role is interchangeable with the other past ~40 engineers; hiring sequencing: VS phase needs TD, funding round needs CTO
- **Contractor exit protocol** -- hostile/non-hostile distinction codified in advance; graceful exit for non-hostile departures: Slack maintained for handover, work acknowledged publicly; hostile actors get swift and precise exit with no notice; over-honesty about performance reasons increases legal exposure
- **MMO geo-distributed infrastructure** -- gameplay servers geo-distributed for latency; persistence centralised (inventory, economy); non-gameplay transactions latency-masked with caches and proxies; Unreal defaults single-threaded server execution -- multi-threaded must be forced as an early decision; Australia unsolvable for low-latency MMO; Hathora as cross-cloud fallback option
- **MMO server authority model** -- server-authoritative always: combat hit resolution, cooldown checks, range/LoS validation, AoE conical hit check, all outcome state; client-side projection for responsiveness: ability VFX immediate, server resolves hits; wave ban anti-cheat posture: log silently, issue batch bans not real-time flags; divergence management is the core MMO-specific engineering challenge

## Gaps

- No primary data on optimal sprint length for 50-100 person cross-discipline teams
- Live ops cadence benchmarks are mobile-centric; PC/console MMO live ops patterns undocumented in primary sources
- Post-T3 cut cost quantification by system type: no primary dataset
- EP transition onboarding -- optimal sequence for adding an EP to a studio with no prior EP -- undocumented
- Junior hire density upper bound in fully remote studios: maximum viable junior-to-senior ratio undocumented
- Contracted QA onboarding timeline: typical time to consistent output quality for a 30-person contracted team -- no primary data
- IR35 multi-jurisdiction interaction: concurrent exposure across UK + EU jurisdictions -- no case data on tribunal handling
- Performance composite dashboard calibration: 30/55 output estimate and 40-45 visibility-effect projection are single-studio observations; no cross-studio data
- Sprint-branch vs feature-branch threshold: decision made at 69 VS features with cross-team contributors; transition criteria undocumented
- Telemetry-driven tutorial calibration: trigger thresholds (pause duration, behaviour signal) are from a single studio kick-off; no cross-studio data on optimal ranges by player skill distribution
