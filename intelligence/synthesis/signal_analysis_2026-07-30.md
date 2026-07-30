# Signal Engine Analysis -- 2026-07-30 (Evening Run)

_13 extracts from 4 meetings. Ingested 19:00. Analysis generated same evening._

## Source Meetings

| Meeting ID | Topic | Extracts | Key Altitude |
|------------|-------|----------|--------------|
| not_0x0pcAAIov0XGK | Game vision / design pillars | 4 | Strategic + Operational |
| not_KDHVs2T7MHO8LW | Operations | 5 | Operational + Tactical |
| not_fe1kO350nJDsp0 | Senior UI/UX Designer interview | 1 | Operational |
| not_5AYNSavix0Mtl9 | VS1 scope / Sasha | 3 | Tactical |

---

## STRATEGIC SIGNALS (NBI-level)

### S1. NBI Embedded PM Model -- First Live Deployment

**Signal:** Magnus Pryer deployed as embedded PM inside CH ops team. Operating model defined: artifact building, roadmap maintenance, deliverable chasing. Ownership stays with client leads. PM operates inside the client's tool, not NBI tooling.

**Source quote:** "The value of an embedded PM is context transfer velocity -- getting CPO knowledge out of Glen's head and into a structured artifact that the client can run without him."

**Confidence:** HIGH. Decision made and deployed in the same meeting. Magnus is already in-seat.

**Why it matters:** This is the first concrete instance of NBI delivering fractional support at a level below Glen. It validates a scalable service model: Glen sets direction, a junior PM maintains the structure. If this works at CH, it becomes a replicable offering.

**Proposal:**
1. Track Magnus's first 4 weeks for a post-mortem (what worked, what the client pushed back on, where Glen still got pulled in).
2. Document the operating model (scope, cadence, tool access, handoff mechanism) as a reusable NBI service template.
3. Add to the NBI services/delivery model documentation once the 4-week test concludes.

---

### S2. Glen's AI Workflow as Distributable Knowledge Product

**Signal:** Glen's document generation pipeline (brainstorm dump, structured Claude prompt, adversarial roast prompt, refinement) was requested as a shareable package by the Game Director. The roast step is the quality gate.

**Source quote:** "The roast prompt step is the quality gate -- without adversarial critique from a credible persona, the output is competent but not stress-tested."

**Confidence:** HIGH. Glen described the workflow, the Game Director requested the package, Glen decided to assemble and share it.

**Why it matters:** This is NBI's AI advisory practice (EAD framework) generating a tangible deliverable: a prompt package that transfers AI capability from Glen to a client team member. If the Game Director uses it successfully, it proves NBI can scale AI expertise through tooling distribution, not just through Glen's presence.

**Proposal:**
1. Package the prompt set: brainstorm capture template, structured generation prompt (with role skills), roast prompt (senior game designer / MMO veteran persona), refinement prompt.
2. Include brief instructions (when to use each step, what "good" roast output looks like).
3. Track whether the Game Director uses it independently and what quality difference he observes.

---

### S3. Fundraising Timeline Crystallised: Gamescom (21 Aug) and DICE (Sep)

**Signal:** Three-phase fundraising roadmap locked. Gamescom = soft pitch (one-pager, deck, revenue ranges). DICE = full pitch (data room complete, round formally opens). Legal close timeline follows investor conversations.

**Source quote:** "Revenue ranges (not full projections) are sufficient for Gamescom; headcount plan takes priority over the financial model as a first deliverable."

**Confidence:** HIGH. Dates are fixed external events. Decision made by CPO in a multi-person ops meeting with explicit asset requirements per phase.

**Why it matters:** Every NBI deliverable for CH now has a hard external deadline. Gamescom is 22 days away. The data room skeleton needs building, revenue ranges need scoping, and the pitch deck (which Glen just rebuilt the pillars for) needs to be investor-ready.

**Proposal:**
1. Map NBI's open CH deliverables against the Gamescom deadline (21 Aug). Flag anything not on track.
2. Revenue range scoping needs a separate sync before Gamescom (identified in the meeting as not yet done).
3. Data room ownership: CPO builds skeleton, leads fill sections. NBI PM (Magnus) should be tracking this.
4. Ensure pitch deck and one-pager are consistent with the pillars document Glen rebuilt on Jul 30.

---

## OPERATIONAL SIGNALS (CH Client)

### O1. AI Concept Art Controller Model: 5-to-2 Headcount Reduction

**Signal:** Concept art team reduced from 5 planned headcount to 2 senior "controllers" who direct AI-generated base imagery. 10% probability of needing a third. Controllers = creative judgment and prompt-level art direction, not volume output.

**Source quote:** "The value of a senior concept artist in an AI-assisted pipeline is creative judgment and art direction, not volume output -- the role description and hiring criteria must reflect this shift."

**Confidence:** HIGH. Decision made in ops meeting, confirmed by CPO.

**Why it matters:** This is the most concrete AI headcount impact Glen has driven at any client. The 60% reduction (5 to 2) with a defined role shift (volume to controller) is a case study for NBI's AI advisory practice. It also changes the hiring profile: senior concept artists with art direction capability, not production volume artists.

**Bank routing:** client_couch_heroes (decision), production_methods (methodology), personal_insights (Glen's AI advisory pattern).

---

### O2. Design Org Junior-Heavy Risk and Lead Gameplay Designer Priority Hire

**Signal:** Design team diagnosed as junior-heavy with no T-shaped employees. Systems designer slot swapped for a Lead Gameplay Designer covering 3Cs, combat, and systems. One senior covering three areas delivers more leverage than one additional junior specialist.

**Source quote:** "No T-shaped employees in a junior-heavy design team creates fragility; every decision escalates to the Game Director."

**Confidence:** HIGH. Headcount swap decision made by CPO.

**Why it matters:** The design org is structurally fragile. Bottleneck at the Game Director level. The Lead Gameplay Designer hire is the remediation, but until filled, the risk persists. Audio separation from design also decided (reduces design director span of control).

**Bank routing:** client_couch_heroes (decision), production_methods (pattern), client_patterns (junior-heavy org diagnostic).

---

### O3. Candidate Lost to Inconsistent Game Pitch

**Signal:** Senior design candidate withdrew after multiple team members gave inconsistent descriptions of the game. Root cause: no scripted game pitch for hiring interactions. Fix: scripted game description (what it is, who it's for, why it matters) for all hiring managers.

**Source quote:** "The absence of a consistent game pitch script is a hiring risk -- senior candidates assess cultural confidence from the coherence of what the team says about their game."

**Confidence:** HIGH. Real candidate withdrawal, root cause diagnosed, fix decided.

**Why it matters:** The candidate loss is a direct cost. The systemic risk is larger: every candidate touchpoint without a consistent pitch is a chance to lose good people. With active hiring across design, engineering, and art, the fix is time-sensitive.

**Immediate action:** Scripted game description needs to exist before the next candidate interview round. This should be on Magnus's tracker.

---

### O4. Two-Template Contractor Policy

**Signal:** Permanent contractors (216-day IR35 clause) and temporary/bespoke contractors (lighter template, at-will, no monthly cap) split into two distinct templates. HiBob config ~2 weeks. Rollout October for new hires. Scripted offer speech required for managers.

**Source quote:** "Scripted offer speech is a prerequisite for hiring manager rollout -- inconsistent verbal explanation of contractor terms is a recurring source of onboarding friction."

**Confidence:** HIGH. Policy decided, implementation timeline set, five US contractors already onboarded using the bespoke template.

**Bank routing:** client_couch_heroes (decision), production_methods (contractor policy pattern), client_patterns (IR35 framework).

---

### O5. Animation Outsource: Supervised, Specialist, Relationship-Based

**Signal:** Animation outsource vendor selected on three combined criteria: cheapest, pre-existing relationship, animation-focused studio. Prior unsupervised outsource failure diagnosed as management failure, not vendor failure. Close supervision by internal art lead required.

**Source quote:** "Prior unsupervised outsource failure was a management failure, not a vendor failure -- close supervision by an experienced internal lead is required regardless of vendor quality."

**Confidence:** HIGH. Vendor selected, supervision structure defined, plugin baseline quantified (~45 core animations from ACF/Traversal).

**Bank routing:** production_methods (outsource methodology), client_couch_heroes (decision).

---

### O6. Culture Pitch Validated in Interview

**Signal:** "I love you, but that's awful" and the social contract concept resonated strongly with a senior UI/UX candidate. First time in her career she had heard culture articulated concretely.

**Source quote:** "Naming the specific phrase ('I love you, but that's awful') and the intent/accident distinction is more credible than abstract claims about 'no blame culture'."

**Confidence:** MEDIUM-HIGH. Single candidate data point, but the candidate's reaction was strong and the mechanism (specific phrases over abstract values) is generalizable.

**Bank routing:** client_patterns (culture articulation method), production_methods (hiring process).

---

## TACTICAL SIGNALS (Immediate Actions)

### T1. VS1 Scope Protection: Two Cuts Held

**Armor floating geometry:** Out of scope. No design origin document. Three-department impact (art, animation, programming). Scope creep pattern correctly identified and declined.

**Source quote:** "The feature was never formally scoped; its emergence mid-production is a scope creep pattern, not a late requirement."

**Proxy mesh standard:** Low-poly held as standard. Box-proxy request declined. Junior skill gap not accommodated by lowering production standards.

**Source quote:** "Adapting production asset standards to junior skill gaps is the wrong direction; the standard should be set by the pipeline's needs, not the team's current capability ceiling."

**Confidence:** HIGH. Both decisions made and confirmed. Consistent with Glen's scope discipline pattern.

---

### T2. Contract Clerical Error: Addendum, Not Amendment

**Signal:** Addendum letter chosen over full contract void-and-reissue for a level designation error with no salary impact. Proportionate response. Manager tone flagged as adding unnecessary friction.

**Source quote:** "Addendum letter (not contract void and reissue) is the correct remedy for a clerical error with no financial impact."

**Confidence:** HIGH. Decision made and resolution path agreed.

---

## CROSS-SIGNAL PATTERNS

### P1. Scope Discipline is Consistent and Working

Three scope-related decisions in one day (armor cut, proxy standard held, revenue ranges not full projections for Gamescom) all follow the same principle: do the proportionate thing, not the maximal thing. Glen's scope discipline at this client is now a repeating pattern with a track record.

### P2. Hiring Process is Uneven: Culture Pitch Strong, Game Pitch Broken

The culture pitch landed powerfully with a senior candidate. In the same meeting cycle, a different senior candidate withdrew because the game pitch was incoherent across team members. The hiring process has a strong culture narrative and a broken product narrative. The scripted game description is the fix, but it needs to exist before the next interview round.

### P3. AI is Reducing Headcount AND Improving Individual Output

Concept art 5-to-2 controller model (headcount reduction). Glen's brainstorm-roast-refine pipeline (individual output improvement). Both use AI differently, both produce measurable results, both can be documented as NBI advisory outcomes.

### P4. NBI Service Model Crystallising at Three Levels

1. **Glen as CPO** -- strategic decisions, scope discipline, hiring process design.
2. **Magnus as embedded PM** -- artifact building, roadmap maintenance, deliverable tracking.
3. **AI prompt packages** -- distributable tooling that transfers capability without NBI presence.

This three-layer model (strategic advisory, operational embedding, tooling distribution) is emerging organically. If documented, it becomes the NBI service architecture.

---

## BANK ROUTING SUMMARY

| Extract | Target Banks |
|---------|-------------|
| mmo-identity-pitch-no-one-to-someone | games_pitch_decks, client_couch_heroes |
| design-org-junior-heavy-lead-gameplay-gap | production_methods, client_couch_heroes, client_patterns |
| candidate-game-pitch-consistency | production_methods, client_couch_heroes, client_patterns |
| glen-ai-document-workflow-roast-prompt | personal_insights |
| studio-fundraising-gamescom-dice-milestone | games_pitch_decks, client_couch_heroes |
| ai-concept-art-controller-headcount-reduction | production_methods, client_couch_heroes |
| temp-vs-perm-contractor-template-split | production_methods, client_patterns, client_couch_heroes |
| animation-outsource-supervised-partner | production_methods |
| nbi-embedded-pm-client-team-model | client_patterns |
| studio-culture-radical-candor-social-contract | production_methods, client_patterns, client_couch_heroes |
| contract-error-addendum-vs-amendment | production_methods, client_patterns |
| vs1-armor-floating-geometry-scope-cut | production_methods, client_couch_heroes |
| proxy-mesh-low-poly-vs-box-proxy | production_methods, client_couch_heroes |

**Bank hit counts:** production_methods x8, client_couch_heroes x11, client_patterns x4, games_pitch_decks x2, personal_insights x1. All 5 size-flagged banks would grow further. Split decisions remain the blocking constraint.

---

## ACTIONS FOR GLEN

1. **Gamescom prep (22 days):** Revenue range scoping sync not yet done. Pitch deck must align with rebuilt pillars. One-pager needed. Data room skeleton to build. Magnus should be tracking all of these.
2. **Scripted game description:** Exists nowhere. Needs to be written and distributed before next candidate interview. The candidate withdrawal is a concrete cost of the gap.
3. **AI prompt package:** Game Director requested it. Package the brainstorm/roast/refine prompts with brief instructions. Low effort, high goodwill, and it proves NBI's AI tooling distribution model.
4. **Bank split decisions (still blocking):** 5 banks over cap, 68+ extracts unable to compile. Tonight's 13 extracts add 8 more to production_methods and 11 more to client_couch_heroes. The backlog grows every ingestion cycle.
