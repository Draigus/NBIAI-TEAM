# Game Production Methodology -- Tier 2 Knowledge

This is the Production Consultant's definitive reference on game production methodology. It covers agile frameworks adapted for game development, JIRA configuration, sprint design, milestone frameworks, documentation standards, pipelines, estimation, risk management, and training material creation.

---

## 1. Agile for Game Development

### Why Game Dev Agile Is Different

Generic software agile assumes relatively uniform work units: user stories that can be estimated, built, tested, and shipped in a sprint. Game development breaks this assumption in several fundamental ways:

- **Art pipelines have long lead times.** A character model goes through concept, blockout, high-poly sculpt, retopology, UV mapping, texturing, rigging, animation setup, and in-engine integration. This is weeks of work across multiple specialists, not a single sprint story
- **Design requires iteration loops.** A game mechanic needs to be prototyped, playtested, evaluated, revised, playtested again. The feedback loop is inherently unpredictable. You cannot estimate "fun"
- **Engineering work varies enormously in scope.** A UI fix is an afternoon. A networking rewrite is a quarter. Both sit in the same backlog
- **QA demand is non-linear.** QA needs are light in pre-production and overwhelming approaching cert. Capacity planning must account for this ramp
- **Audio is pipeline-dependent.** Audio cannot start until gameplay, environments, and cinematics reach a certain fidelity. It is always late in the dependency chain
- **Certification is a hard external deadline.** Platform cert (Sony TRC, Microsoft XR, Nintendo Lotcheck) has fixed requirements and submission windows. You cannot negotiate with the cert process
- **Creative direction can invalidate completed work.** A creative director reviewing a vertical slice may decide the art direction is wrong. In software, requirements change; in games, the entire aesthetic can pivot

### Framework Selection Guide

**Scrum (Pure)**
- Best for: Teams of 5-15, single-discipline or tightly coupled cross-discipline, clear product owner, well-defined backlog
- Sprint length: 2 weeks is standard for engineering; 3 weeks works better for art-heavy teams
- Ceremonies: Sprint Planning, Daily Standup, Sprint Review, Retrospective, Backlog Refinement
- Risk: Falls apart when stories cannot be completed in a single sprint (common for art). Requires discipline to break work into sprint-sized chunks
- Game-dev adaptation: Allow art stories to span sprints with explicit carry-over tracking. Use sub-tasks to track the sprint-deliverable portion

**Kanban**
- Best for: Live ops teams, support/maintenance phases, art teams, any team with continuous flow rather than discrete deliverables
- Key metrics: Cycle time, throughput, WIP limits, lead time
- Board design: Columns represent workflow states (Backlog > Ready > In Progress > Review > Done), not sprint states
- Risk: Without WIP limits, Kanban degrades into an unmanaged to-do list. WIP limits are not optional
- Game-dev adaptation: Excellent for art pipelines where work flows through defined stages. Set WIP limits per stage to prevent bottlenecks (e.g., max 3 items in "Texturing" at once)

**Scrumban (Recommended Default for Most Game Studios)**
- Best for: Teams of 15-80, mixed disciplines, studios transitioning from chaos to structure
- How it works: Sprint cadence for planning and review ceremonies, Kanban board with WIP limits for daily work tracking. Commitment is per-sprint, but flow is continuous
- Why it suits game dev: Gives engineering the sprint rhythm they need while giving art the continuous flow they need. Sprint boundaries create natural sync points
- Ceremonies: Sprint Planning (lighter than pure Scrum -- set goals, not item-by-item commitment), Daily Standup, Sprint Review/Demo, Retrospective, Continuous backlog refinement
- Key metrics: Sprint velocity (for planning), cycle time (for flow optimisation), WIP (for bottleneck detection)

**SAFe (Scaled Agile Framework) -- Adapted for Game Studios**
- Best for: Studios of 100+ with multiple teams that need to coordinate
- Warning: Full SAFe is overweight for game studios. Use SAFe-lite: Program Increments (PIs) for cross-team alignment, Agile Release Trains (ARTs) as a coordination mechanism, but strip out the bureaucratic layers
- PI Planning: Quarterly (or per-milestone) planning event where all teams align on objectives, identify dependencies, and commit to deliverables. This is the most valuable part of SAFe for game studios
- Risk: SAFe introduces significant overhead. Only worth it when the coordination cost of not doing it is higher. For most studios under 100 people, Scrumban with good cross-team ceremonies is sufficient
- Game-dev adaptation: Map ARTs to game systems (Gameplay ART, World ART, Platform ART) rather than technical layers. Use PI Planning to align around milestone gates, not arbitrary quarters

### Ceremonies -- Game Dev Specifics

**Sprint Planning**
- Duration: 2 hours max for a 2-week sprint. 3 hours for a 3-week sprint
- Input: Refined backlog with estimates, sprint goal aligned to milestone progress, capacity (account for holidays, on-call, cert support)
- Game-dev nuance: Art stories that span multiple sprints need explicit "this sprint" scope defined. Engineering stories that depend on art assets need asset delivery dates confirmed. Design stories that require playtesting need playtest sessions scheduled
- Output: Sprint backlog with clear ownership, sprint goal statement, identified risks and dependencies

**Daily Standup**
- Duration: 15 minutes hard cap. If discussions emerge, take them offline ("parking lot")
- Format options:
  - Walk the board (recommended): Go through the Kanban board right-to-left, discuss blocked items first, then in-progress items. Focus on flow, not people
  - Round robin: Each person answers what they did, what they will do, what is blocking them. Works for small teams, scales poorly
- Game-dev nuance: Cross-discipline standups are essential when features span art/design/engineering. Discipline-only standups miss dependency issues. For larger teams, do discipline standups first, then a cross-discipline sync with leads only

**Sprint Review / Demo**
- Duration: 1 hour max
- Format: Show working software (or working game). Do not show slides about what was built. Play the game. If it is not playable yet, show the build running. If the build is not running, that is the sprint review: why is the build not running?
- Game-dev nuance: This is where creative direction feedback happens. The creative director and game director must attend. Feedback must be captured and triaged (not all feedback becomes sprint work -- some goes to the backlog for prioritisation)
- Danger: Sprint reviews that turn into hour-long design debates. Time-box feedback, capture it, triage it later

**Retrospective**
- Duration: 45-60 minutes
- Format options: Start/Stop/Continue, 4Ls (Liked, Learned, Lacked, Longed For), Sailboat (wind = helps, anchor = hinders, rocks = risks)
- Game-dev nuance: Retros often surface production pipeline issues (build breaks, asset handoff delays, unclear design direction) that are systemic, not sprint-specific. Track retro actions and follow up. A retro that generates actions nobody tracks is worse than no retro
- Critical: Retros must be psychologically safe. If people cannot say "crunch is killing us" or "the game director changes direction every week" then the retro is theatre

**Backlog Refinement**
- Cadence: Mid-sprint (weekly for 2-week sprints)
- Duration: 1 hour
- Purpose: Groom upcoming stories so sprint planning is not derailed by undefined work. Estimate stories, clarify acceptance criteria, break down epics, identify dependencies
- Game-dev nuance: Art and design stories are harder to define in advance than engineering stories. Accept that some stories will be "spike: explore 3 art direction options for the forest biome" rather than "implement forest biome assets." Spikes are legitimate backlog items

---

## 2. JIRA Configuration for Game Development

### Project Structure

**Single Project**
- Use when: Team is <30, single game, unified backlog
- Advantages: Simple, everything in one place, easy to query
- Disadvantages: Gets unwieldy above ~5,000 issues

**Multi-Project**
- Use when: Team is >30, or multiple games/platforms, or distinct workstreams (engine vs gameplay vs tools)
- Structure options:
  - By game system: PROJECT-GAMEPLAY, PROJECT-WORLD, PROJECT-UI, PROJECT-PLATFORM
  - By discipline: PROJECT-ART, PROJECT-ENG, PROJECT-DESIGN, PROJECT-QA
  - By team/pod: PROJECT-TEAM-ALPHA, PROJECT-TEAM-BRAVO (for feature team structures)
- Recommendation: Structure by game system or team/pod, not by discipline. Discipline-based projects create silos

### Issue Type Hierarchy

```
Epic
├── Story (user-facing feature or deliverable)
│   ├── Sub-task (discipline-specific work within the story)
│   └── Sub-task
├── Task (non-user-facing work: tech debt, pipeline, documentation)
│   ├── Sub-task
│   └── Sub-task
└── Bug (defect with reproduction steps)
```

**Epic examples:**
- Combat System, Character Customisation, Multiplayer Netcode, Procedural World Generation, Monetisation Store, Tutorial Flow, Accessibility Features

**Story examples:**
- "As a player, I can dodge-roll to avoid enemy attacks" (Gameplay)
- "As a player, I see particle effects when I land a critical hit" (VFX)
- "As a player, I can rebind my controller inputs" (UI/UX)

**Task examples:**
- Set up CI/CD pipeline for Xbox builds
- Migrate character rig to new skeleton standard
- Write TDD for save system architecture
- Profile GPU performance on minimum spec

**Bug template fields:**
- Summary, Description, Steps to Reproduce, Expected Result, Actual Result, Build Number, Platform, Severity, Frequency (Always/Often/Sometimes/Rare), Screenshot/Video, Assignee, Reporter

### Custom Fields for Game Development

| Field Name | Type | Applies To | Purpose |
|---|---|---|---|
| Platform | Multi-select (PC, PS5, Xbox Series, Switch, iOS, Android) | All issue types | Track which platform(s) the issue affects |
| Build Number | Text | Bug, Task | Which build the bug was found in or the task targets |
| Discipline | Single-select (Art, Animation, Audio, Design, Engineering, Production, QA, VFX) | Story, Task, Sub-task | Filter and report by discipline |
| Milestone Gate | Single-select (Concept, Pre-prod, Production, Alpha, Beta, Cert, Launch, Live) | Epic, Story | Track which milestone the work targets |
| Cert Status | Single-select (N/A, Not Started, In Progress, Submitted, Passed, Failed, Waived) | Epic, Story, Bug | Track certification compliance |
| Content Area | Single-select or multi-select (varies by game: Level 1, Level 2, Hub World, etc.) | Story, Bug | Track which game content area is affected |
| Art Pipeline Stage | Single-select (Concept, Blockout, First Pass, Polish, Final, Approved) | Art sub-tasks | Track art asset progress |
| Bug Frequency | Single-select (Always, Often, Sometimes, Rare, Once) | Bug | How reproducible the bug is |
| Regression | Checkbox | Bug | Was this working before and is now broken? |
| Blocker For | Issue link | All | Explicit dependency tracking |

### Board Design

**Sprint Board (Scrum/Scrumban)**
Columns: Backlog | Ready | In Progress | In Review | QA | Done
- Swimlanes: By Epic (shows feature progress) or by Assignee (shows individual workload)
- Quick filters: My Issues, Blockers Only, By Discipline, Current Milestone

**Art Pipeline Board (Kanban)**
Columns: Backlog | Concept | Blockout | First Pass | Art Review | Polish | Final | Approved
- WIP limits: Set per column (e.g., max 5 items in First Pass, max 3 in Art Review)
- Swimlanes: By content area or by asset type (Characters, Environments, Props, UI, VFX)

**Bug Triage Board**
Columns: New | Confirmed | In Progress | Fixed | QA Verify | Closed
- Swimlanes: By Severity (Blocker, Critical, Major, Minor)
- Quick filters: By Platform, By Build, By Content Area, Regressions Only

**Release Planning Board**
- Columns represent milestone gates
- Cards are Epics, showing completion percentage
- Provides high-level view of project progress against milestones

### Dashboard Design

**Sprint Health Dashboard**
- Velocity chart (last 6 sprints)
- Current sprint burndown
- Sprint goal progress (percentage of committed stories done)
- Blocked issues count
- Issues added mid-sprint (scope creep indicator)

**Milestone Progress Dashboard**
- Epics by milestone gate with completion percentage
- Outstanding stories by milestone (what is left to do)
- Bug count by severity for current milestone
- Cert status summary

**Bug Dashboard**
- Open bugs by severity (pie chart)
- Bug trend over time (opened vs closed per week)
- Bugs by platform
- Oldest open bugs
- Regression count
- Mean time to resolve by severity

**Team Workload Dashboard**
- Issues by assignee (bar chart)
- Issues by discipline (pie chart)
- Overdue issues by team member
- Capacity utilisation (story points assigned vs available)

### Essential JQL Queries

```
-- All blockers in current sprint
sprint in openSprints() AND priority = Blocker

-- Bugs found in latest build
issuetype = Bug AND "Build Number" = "0.9.42" ORDER BY priority DESC

-- All unestimated stories in the backlog
issuetype = Story AND "Story Points" is EMPTY AND statusCategory != Done

-- Overdue items by discipline
duedate < now() AND statusCategory != Done AND Discipline = Engineering

-- Cert blockers across all platforms
"Cert Status" = Failed OR ("Cert Status" = "In Progress" AND priority in (Blocker, Critical))

-- Art assets not yet at First Pass for current milestone
issuetype = Sub-task AND "Art Pipeline Stage" in (Concept, Blockout) AND "Milestone Gate" = Production

-- Sprint scope creep (items added after sprint start)
sprint in openSprints() AND created > startOfSprint()

-- All issues blocking other issues
issueLinkType = "blocks" AND statusCategory != Done

-- Bug regression rate
issuetype = Bug AND Regression = Yes AND created >= -30d

-- Items with no assignee in active sprint
sprint in openSprints() AND assignee is EMPTY AND statusCategory != Done
```

### Automation Rules

| Trigger | Condition | Action |
|---|---|---|
| Issue transitions to "Fixed" | Issue type = Bug | Auto-assign to original reporter for verification |
| Sub-task transitions to "Done" | All sibling sub-tasks are "Done" | Transition parent story to "In Review" |
| Blocker created | Priority = Blocker | Notify project lead and affected team leads via Slack/Teams |
| Issue overdue | Due date passed, status != Done | Add "Overdue" label, notify assignee |
| Bug created without build number | Issue type = Bug, Build Number is empty | Add comment: "Please add the build number where this was found" |
| Sprint started | Sprint state = Active | Create Slack/Teams notification with sprint goal and committed scope |

---

## 3. Sprint Design for Cross-Discipline Game Teams

### The Core Problem

In a typical game team, disciplines operate on different rhythms:

- **Engineering:** Works well in 2-week iterations. Tasks can usually be scoped to fit a sprint. Dependencies are mostly on design specs and art assets
- **Art:** Long pipeline (concept to final can be 2-6 weeks for a single asset). Breaking art into 2-week chunks feels artificial. Concept and blockout might be one sprint, first pass another, polish another
- **Design:** Highly iterative. A mechanic might need 3-4 prototype-test-revise cycles. Sprints help timebox iteration but the output is uncertain
- **QA:** Demand is bursty. Light during early development, heavy approaching milestones. Sprint commitment is difficult when the workload depends on what other disciplines produce
- **Audio:** Late in the dependency chain. Cannot produce final audio until gameplay is locked, environments are built, cinematics are cut. Often working 1-2 milestones behind the rest of the team
- **VFX:** Similar to audio -- depends on gameplay and art being sufficiently complete

### Sprint Structure Patterns

**Pattern 1: Unified Sprint (Teams < 30)**
All disciplines on the same 2-week (or 3-week) sprint cadence.
- Pros: Simple, one planning session, one review, one retro. Everyone syncs at the same time
- Cons: Art stories often carry over. Design iteration does not fit neatly into fixed sprints
- Mitigation: Allow explicit carry-over for art with "this sprint's deliverable" defined (e.g., "this sprint: blockout complete. Next sprint: first pass"). Track carry-over as a health metric -- if more than 20% of stories carry over regularly, the sprint structure needs adjustment

**Pattern 2: Offset Sprints (Teams 30-80)**
Engineering and Design on Sprint A (2-week). Art on Sprint B (3-week), offset by one week.
- Week 1: Eng/Design sprint starts. Art sprint is in week 2 of 3
- Week 2: Eng/Design mid-sprint. Art sprint ends, new art sprint starts
- Week 3: Eng/Design sprint ends, new sprint starts. Art sprint is in week 2 of 3
- Sync point: Shared demo/review every 3 weeks (when both sprint boundaries align, which happens every 6 weeks, or use a rolling demo)
- Pros: Each discipline gets a cadence that fits their work. Art has more room for pipeline stages
- Cons: More complex scheduling. Cross-discipline dependencies need explicit handoff dates, not just "in the sprint"

**Pattern 3: Scrumban Hybrid (Teams 30-100+)**
Engineering on 2-week sprints. Art on Kanban with WIP limits. Design on sprints with built-in spike capacity. QA flexible, ramping with milestone proximity.
- Sprint boundaries serve as sync points for cross-discipline review
- Art flow is continuous but reviewed at each sprint boundary (what entered "Approved" since last review?)
- Design sprints include 20-30% unplanned capacity for iteration and playtesting
- QA capacity is allocated per sprint based on upcoming build complexity and milestone proximity
- Pros: Best of both worlds. Disciplines get appropriate cadence. Sprint boundaries prevent drift
- Cons: Requires strong production management. Without a good producer tracking cross-discipline dependencies, teams can drift out of sync

**Pattern 4: PI Planning (SAFe-lite, Teams 100+)**
10-week Program Increments aligned to milestone gates. Within PIs, teams run sprints or Kanban as appropriate.
- PI Planning event: 2-day planning session every 10 weeks. All teams present their objectives, identify cross-team dependencies, commit to deliverables
- Iteration Planning: Within the PI, teams plan their own sprints/flow
- System Demo: Every 2 weeks, integrated build is shown to leadership
- Inspect and Adapt: End-of-PI retrospective for the entire programme
- Pros: Solves cross-team coordination at scale. PI Planning is the single most valuable ceremony for large studios
- Cons: Significant overhead. Only worth it when coordination cost exceeds ceremony cost. Most studios under 100 do not need this

### Cross-Discipline Dependency Management

Dependencies between disciplines are the #1 source of sprint failure in game development. Specific patterns:

**Art-Engineering Dependencies**
- Engineering needs: art asset specifications (polygon budgets, texture sizes, animation sets) before building systems
- Art needs: engine features (rendering pipeline, animation system, material system) before producing final assets
- Resolution: Define a "tech art specification" document early in pre-production that locks asset specifications. Art produces placeholder/blockout assets for engineering to build with. Final art replaces placeholders later. Track replacements in JIRA with "Placeholder" and "Final" labels

**Design-Engineering Dependencies**
- Engineering needs: design specs (mechanics, systems, data schemas) before implementation
- Design needs: working prototypes to playtest and iterate
- Resolution: Design produces lightweight specs (one-pagers, not 50-page documents) for initial implementation. Engineering builds a "grey-box" prototype. Design playtests and produces revision notes. Iteration cycles are explicitly planned, not assumed

**QA-Everyone Dependencies**
- QA needs: stable builds to test against
- Everyone needs: QA results to know what is broken
- Resolution: Define build cadence (daily builds minimum in production, weekly in pre-production). QA tests against specific build numbers. Bugs always reference the build number. A "build cop" role (rotating among engineers) ensures daily builds are green

---

## 4. Milestone Frameworks

### Standard Milestone Gates

#### Concept (Duration: 4-8 weeks)
**Purpose:** Prove the game idea is worth pursuing. Define what the game is, who it is for, and why it will succeed.

**Required artefacts:**
- Game vision document (2-5 pages): genre, setting, core fantasy, unique selling proposition, target audience, platform strategy
- Competitive analysis: 5-10 comparable titles, what they do well, what this game does differently
- Art direction pillars: mood boards, reference images, colour palette, visual tone (not final art -- direction)
- Core loop description: what does the player do moment-to-moment, session-to-session, long-term
- Initial scope estimate: team size needed, development timeline range, budget order of magnitude
- Risk assessment: top 5 risks to the project and mitigation strategies

**Sign-off:** Creative Director (or Game Director) + Studio Head (or NBI client lead for consulting)
**Common failure:** Vision too vague ("it's like X but better"), no competitive differentiation, unrealistic scope for budget

#### Pre-Production (Duration: 3-6 months)
**Purpose:** Prove the game works. Build the vertical slice. Establish the technical and art foundations. Define the production plan.

**Required artefacts:**
- Playable vertical slice: representative gameplay segment showing the core loop, art direction, and technical approach working together in-engine. Not a prototype -- a slice at intended quality
- Updated GDD: core loop fully designed, primary systems described in detail, secondary systems outlined. See GDD Standards section
- Technical Design Documents for major systems: see TDD Standards section
- Art style guide with in-engine examples (not just concept art -- assets at target quality rendered in the engine)
- Art asset list with initial estimates
- Project plan: team ramp-up schedule, milestone timeline, sprint/iteration structure
- Updated risk register with pre-production learnings
- Production pipeline documentation: asset pipeline, build pipeline, source control structure

**Sign-off:** Game Director + Technical Director + Art Director + Studio Head
**Common failure:** Vertical slice is a prototype dressed up as a slice. Art style guide exists only as concept art with no in-engine validation. GDD is too high-level for production to start. No TDDs for core systems

#### Production (Duration: 6-18 months depending on scope)
**Purpose:** Build the game. All features implemented, all content created, systems integrated and functional.

**Required artefacts:**
- Feature-complete build: all features are implemented and functional (not polished, but working)
- Full GDD: current, reflecting actual implementation, not the pre-production plan
- All art assets at first-pass minimum (final assets for hero content)
- All systems implemented per TDDs
- QA test plan active with regression suite
- Localisation plan defined with text strings extracted
- Performance profiling results for all target platforms
- Updated project plan with remaining work to alpha

**Sign-off:** Production Director + Game Director + Department Leads
**Common failure:** "Feature-complete" but core systems are still being redesigned. GDD has not been updated since pre-production. Performance has not been tested on minimum-spec hardware. No localisation plan despite multilingual requirements

#### Alpha (Duration: 2-4 months)
**Purpose:** Content-complete, all features functional, performance within target. This is the "everything is in the game" milestone.

**Required artefacts:**
- Content-complete build: all levels, characters, missions, items, UI screens exist and are functional
- All features integrated and playable end-to-end
- Performance within 20% of target on all platforms (80% of target framerate minimum)
- All critical bugs from backlog addressed or triaged with plan
- Cert requirements checklist started (TRC/XR/Lotcheck items identified)
- Localisation text integrated (even if not all languages are final)
- Accessibility features implemented to planned level

**Sign-off:** Game Director + Technical Director + QA Lead + Studio Head
**Common failure:** "Content-complete" but significant content is placeholder. Performance is nowhere near target because optimisation was deferred. Cert requirements have not been reviewed

#### Beta (Duration: 1-3 months)
**Purpose:** Release-candidate quality. Only minor bugs remaining. Performance optimised. Platform requirements met.

**Required artefacts:**
- Release-candidate build: playable start to finish with no critical bugs, no major bugs, acceptable minor bug count
- Performance at target on all platforms (30fps or 60fps as specified, within memory budgets)
- All platform certification requirements verified (TRC compliance checked item by item)
- Localisation complete and reviewed by native speakers
- Accessibility features complete and tested
- Age rating submissions prepared (PEGI, ESRB, CERO as applicable)
- Day-one patch scope defined (if needed)
- Launch checklist started

**Sign-off:** QA Lead + Technical Director + Studio Head + Publisher (if applicable)
**Common failure:** "Beta" is really alpha. Bug count is still in the thousands. Performance is not at target. Cert requirements have not been systematically verified

#### Certification (Duration: 2-6 weeks per platform)
**Purpose:** Pass platform holder certification (Sony TRC, Microsoft XR, Nintendo Lotcheck). Must be passed before the game can be sold on that platform.

**Required artefacts:**
- Submission build meeting all platform-specific requirements
- Completed cert checklist with evidence for each requirement
- Test reports demonstrating compliance
- Age rating certificates
- Any required legal text (EULA, privacy policy) displayed correctly in-game
- Store page assets (descriptions, screenshots, trailers, key art) submitted

**Sign-off:** QA Lead + Platform Relations + Studio Head
**Common failure:** Submission with known cert failures hoping they will be waived (they usually are not). Incomplete testing on specific hardware configurations. Missing required legal text

#### Launch (Duration: 1-2 weeks)
**Purpose:** Go/no-go decision. Final verification that everything is ready for players.

**Required artefacts:**
- Gold master build (or equivalent for digital distribution)
- Live ops infrastructure verified (servers, matchmaking, leaderboards, store, telemetry)
- Community management plan active
- Customer support plan active
- Launch marketing assets delivered and scheduled
- Post-launch roadmap drafted (first 30/60/90 day plan)
- Rollback plan defined (what happens if something catastrophic is found on day one)

**Sign-off:** Studio Head + Publisher (if applicable) + Platform Relations
**Common failure:** Launch without adequate server capacity. No rollback plan. Community management unprepared for volume

---

## 5. Documentation Standards

### Game Design Document (GDD)

**What a GDD is:** The comprehensive design reference for the game. It describes what the player experiences and why. It is the designer's primary output and the team's shared understanding of what they are building.

**What a GDD is not:** A static document written once and filed. A GDD that does not reflect the current state of the game is worse than no GDD because it actively misleads the team.

**GDD structure:**

1. **Game Overview** (1-2 pages)
   - Game title, genre, platforms, target audience
   - High concept (one paragraph: what is this game?)
   - Unique selling proposition (why would someone play this instead of alternatives?)
   - Core pillars (3-5 design principles that guide every decision)

2. **Core Gameplay Loop** (3-5 pages)
   - Moment-to-moment loop (what does the player do in any given 30-second window?)
   - Session loop (what does a typical 30-60 minute play session look like?)
   - Long-term progression loop (what keeps the player coming back over days/weeks/months?)
   - Flow diagram showing how loops connect

3. **Game Systems** (variable length, 2-10 pages per system)
   - Each major system gets its own section: Combat, Movement, Inventory, Crafting, Economy, Progression, Social, etc.
   - Per system: purpose, mechanics, player-facing rules, data schemas (what stats exist, what values they take), edge cases, system interactions (how combat and progression interact)
   - Per system: wireframes or mockups for UI elements
   - Per system: balance targets and tuning parameters (clearly marked as "initial values, subject to tuning")

4. **Content Design** (variable length)
   - World structure: levels, zones, hubs, maps
   - Mission/quest design: structure, flow, reward logic
   - Character/NPC design: roster, roles, behaviours
   - Narrative design: story structure, dialogue approach, lore depth
   - Content matrix: what content exists per level/zone, completion status

5. **UI/UX Design** (5-10 pages)
   - Screen flow diagram (all screens and transitions)
   - HUD design: what information is shown during gameplay
   - Menu design: main menu, pause menu, settings, inventory, etc.
   - Accessibility requirements: remappable controls, colourblind modes, subtitle options, difficulty options

6. **Multiplayer Design** (if applicable, 5-15 pages)
   - Network model (peer-to-peer, client-server, dedicated servers)
   - Player counts, matchmaking rules
   - Anti-cheat approach
   - Social features: friends, parties, guilds, chat
   - Live ops: seasons, events, content updates

7. **Monetisation Design** (if applicable, 3-10 pages)
   - Business model: premium, free-to-play, subscription, hybrid
   - Store design: what is sold, pricing tiers, currency design
   - Economy flow: currency sources and sinks
   - Ethical guidelines: no pay-to-win commitment, loot box probability disclosure (if applicable)

**GDD detail level by milestone:**
- Concept: Sections 1-2 complete. Section 3 high-level for core systems only. Sections 4-7 outlined
- Pre-production: Sections 1-3 complete for all major systems. Section 4 detailed for vertical slice content. Sections 5-7 detailed where relevant to the slice
- Production: Full document. All sections detailed. Updated to reflect actual implementation, not just design intent
- Alpha onwards: GDD is a living document. Updated as changes occur. Versioned

### Technical Design Document (TDD)

**When a TDD is needed:** Before implementing any system that is architecturally significant, touches multiple teams, or has performance implications. Examples: save system, networking layer, animation system, procedural generation, build pipeline, rendering pipeline.

**When a TDD is not needed:** Simple features, bug fixes, UI layouts, content implementation within established systems.

**TDD structure:**

1. **Overview** (1 page)
   - What system this covers
   - Why it is needed (the problem it solves)
   - Dependencies on other systems
   - Team members involved

2. **Requirements** (1-2 pages)
   - Functional requirements (what it must do)
   - Non-functional requirements (performance targets, memory budgets, platform constraints)
   - Scope: what is explicitly not covered

3. **Technical Design** (variable, 3-15 pages)
   - Architecture: component diagram, data flow, class hierarchy (as appropriate)
   - Data schemas: what data structures exist, how they are stored, how they are accessed
   - API design: what interfaces other systems use to interact with this one
   - Platform-specific considerations: what differs on PS5 vs Xbox vs Switch vs PC
   - Third-party dependencies: what external libraries or services are used, why, and what the fallback is

4. **Implementation Plan** (1-2 pages)
   - Phased delivery: what is built first, what comes later
   - Task breakdown with rough estimates
   - Integration points: when does this system need to connect with others, and what do those systems need to be ready

5. **Testing Strategy** (1 page)
   - How this system is tested: unit tests, integration tests, performance tests
   - Acceptance criteria: how do we know it works?

6. **Risks and Mitigations** (1 page)
   - Technical risks specific to this system
   - Mitigation strategies for each

**Relationship between GDD and TDD:** The GDD describes what the player experiences. The TDD describes how it is built. For every major system in the GDD, there should be a corresponding TDD. The GDD is the "what and why." The TDD is the "how."

---

## 6. Production Pipelines

### Asset Pipeline

The asset pipeline is the end-to-end process from an artist creating an asset to that asset appearing in the game build. Bottlenecks in the asset pipeline directly impact every discipline.

**Typical stages:**
1. **Concept:** Reference gathering, concept sketches, style exploration
2. **Blockout:** Low-fidelity version in-engine for spatial planning and gameplay testing
3. **High-poly/Sculpt:** Detailed model created in ZBrush/Maya/Blender (for 3D) or detailed illustration (for 2D)
4. **Game-ready model:** Retopology to meet polygon budgets, UV mapping, LOD creation
5. **Texturing:** Material creation in Substance Painter/Designer or equivalent
6. **Rigging and Animation:** Skeleton setup, skinning, animation sets (for characters/props that move)
7. **Integration:** Import into engine, material setup, collision setup, LOD configuration
8. **Art review:** Lead artist or art director reviews in-engine
9. **Approved:** Asset is final and locked

**Pipeline health indicators:**
- Average time from concept to approved (cycle time)
- Assets stuck in review (bottleneck indicator)
- Revision rate (how often assets go back for rework)
- Placeholder asset count vs final asset count (progress indicator)

### Build Pipeline

The build pipeline produces the playable game from source code and assets. A healthy build pipeline is essential for QA, playtesting, and milestone demos.

**Build cadence recommendations:**
- Pre-production: Weekly builds minimum (daily if pipeline supports it)
- Production: Daily builds mandatory. Nightly builds ideal
- Alpha onwards: Continuous integration -- build on every commit, nightly full builds for all platforms
- Cert: Specific cert builds on demand with full regression testing

**Build pipeline components:**
- Source control (Perforce for large studios with binary assets, Git with LFS for smaller teams)
- Build server (Jenkins, TeamCity, or platform-specific: PlayStation DevNet, Xbox Partner Center)
- Automated tests (unit tests, smoke tests, boot tests -- does the game start on every platform?)
- Build notification (Slack/Teams notification on build success/failure)
- Build archival (every build numbered and archived, old builds retained for regression testing)
- Build notes (automated changelog from commit messages, linked to JIRA tickets)

**Build cop rotation:** One engineer per week is responsible for keeping the build green. If the build breaks, the build cop investigates and fixes (or reverts the breaking change). This prevents the "someone else will fix it" problem that leaves builds red for days.

### Localisation Pipeline

**When to start:** Localisation planning starts in pre-production. Text extraction starts in production. Audio recording starts in alpha. Integration and testing happen in beta.

**Key components:**
- Text string extraction system (all player-facing text in a localisable format, not hardcoded)
- Translation management system (Crowdin, Lokalise, memoQ, or spreadsheets for small projects)
- LQA (Localisation Quality Assurance): native speakers playing in each supported language
- Text expansion planning: German text is typically 30% longer than English. UI must accommodate
- Cultural adaptation: not just translation -- some content may need regional changes (gestures, symbols, references)
- Audio localisation: dubbed vs subtitled, voice actor casting per language, lip sync adaptation

### Certification Pipeline

**Platform cert requirements (high-level summary):**

**Sony TRC (Technical Requirements Checklist):**
- Trophy implementation and compliance
- Save data handling
- Network features compliance
- Controller handling (including DualSense features)
- System software integration
- Accessibility requirements
- Age rating display

**Microsoft XR (Xbox Requirements):**
- Achievement implementation
- Save game handling
- Xbox Live integration
- Smart Delivery compliance (for cross-gen)
- Accessibility requirements
- Quick Resume support

**Nintendo Lotcheck:**
- Nintendo Switch-specific requirements
- Joy-Con handling (including detached, tabletop, handheld modes)
- Save data management
- Nintendo Account integration
- Age rating display

**Cert preparation checklist:**
1. Obtain the current TRC/XR/Lotcheck requirements document from the platform holder (these update regularly)
2. Create a JIRA epic for cert compliance with one story per requirement
3. Track compliance status using the Cert Status custom field
4. Run a cert pre-check 4-6 weeks before planned submission
5. Fix all failures before submission -- do not submit hoping for waivers
6. Prepare submission package: build, test reports, compliance evidence
7. Account for re-submission time if the first submission fails (budget 2-4 weeks for re-submission cycles)

---

## 7. Estimation and Velocity

### Story Points vs Time-Based Estimation

**Story Points (Recommended for teams with some agile experience)**
- Measure relative complexity, not time. A 5-point story is roughly 2.5x the effort of a 2-point story
- Fibonacci scale: 1, 2, 3, 5, 8, 13, 21. Anything above 13 should be broken down
- Planning poker for estimation: each team member estimates independently, then discuss outliers
- Velocity is measured in points per sprint. After 3-4 sprints, velocity stabilises and becomes predictive
- Game-dev nuance: Art stories are harder to estimate in points because the "complexity" is subjective (how complex is a "high-quality environment"?). For art teams, consider using T-shirt sizing (S/M/L/XL) mapped to point values

**Time-Based Estimation (For teams new to structured estimation)**
- Estimate in ideal hours or ideal days (time without interruptions)
- Apply a multiplier for reality (typically 1.5-2x for game dev: meetings, context switching, iteration)
- Capacity planning: available hours = total hours minus meetings, support, admin, holidays
- Game-dev nuance: Time-based estimation is more intuitive for teams that have never estimated before. The risk is that time estimates feel like commitments, leading to crunch when estimates are wrong. Frame estimates as forecasts, not promises

### Velocity Tracking

**What velocity is:** The amount of work (in story points or hours) a team completes per sprint on average.

**What velocity is not:** A performance metric. A target to beat. A measure of individual productivity. Using velocity as a performance metric destroys its predictive value because teams game the estimates.

**Healthy velocity patterns:**
- Stable velocity (within 20% variance sprint to sprint) = team is predictable
- Rising velocity in early sprints = team is learning and improving processes
- Falling velocity = something is wrong (scope creep, tech debt, morale, key person departure)
- Wildly variable velocity = stories are inconsistently estimated, or sprint scope is changing mid-sprint

**Velocity-based planning:** If the team averages 40 story points per sprint and there are 200 points of work remaining, that is roughly 5 sprints of work. Add a buffer (20-30%) for unknowns. This is a forecast, not a guarantee

### Capacity Planning for Game Teams

**The discipline ratio problem:** A game team is not homogeneous. A typical AAA team might be 40% art, 25% engineering, 15% design, 10% QA, 5% audio, 5% production. Sprint capacity must be calculated per discipline, not just for "the team."

**Capacity calculation:**
```
Available capacity per discipline per sprint =
  (Number of people in discipline)
  x (Working days in sprint)
  x (Hours per day after meetings/admin -- typically 5-6 productive hours of an 8-hour day)
  x (Availability factor: account for holidays, illness, on-call -- typically 0.85)
```

**Common capacity planning mistakes:**
- Assuming 100% availability (people are sick, on holiday, in meetings, doing support)
- Not accounting for different discipline capacities (if you have 2 engineers and 8 artists, you cannot plan 50% engineering work)
- Planning to full capacity with no slack (leaves zero room for iteration, bugs, or unplanned work)
- Not adjusting for milestone ramp (QA capacity needs to double or triple approaching cert)

---

## 8. Risk Management for Game Development

### Production Risk Register

Every active project should have a risk register tracking known risks with impact, probability, and mitigation plans.

**Risk register fields:**
| Field | Description |
|---|---|
| Risk ID | Unique identifier (RISK-001) |
| Category | Technical, Schedule, Resource, External, Creative, Financial |
| Description | Clear statement of what could go wrong |
| Impact | High/Medium/Low -- what happens if this risk materialises |
| Probability | High/Medium/Low -- how likely is it |
| Risk Score | Impact x Probability (H/H = Critical, H/M = High, etc.) |
| Mitigation Plan | What are we doing to reduce the probability or impact |
| Owner | Who is responsible for monitoring and mitigating this risk |
| Status | Open, Mitigated, Materialised, Closed |
| Last Reviewed | Date of most recent review |

**Common game development risks:**

| Risk | Category | Typical Impact | Mitigation |
|---|---|---|---|
| Core mechanic is not fun | Creative | Critical -- may require fundamental redesign | Playtest early and often. Build vertical slice in pre-production. Kill scope before production if the core loop does not work |
| Key person departure | Resource | High -- loss of institutional knowledge | Document everything. Avoid single points of failure. Cross-train team members on critical systems |
| Technology does not scale | Technical | High -- performance problems that require rearchitecture | Profile early and often. Build on proven tech. Define performance budgets per system |
| Scope creep | Schedule | High -- delayed milestones, crunch | Lock scope at production start. All additions require equivalent cuts. Track sprint scope changes |
| Platform cert failure | External | Medium -- delays launch by 2-6 weeks | Start cert preparation early. Pre-check against requirements. Do not submit with known failures |
| Outsource partner quality | Resource | Medium -- rework required | Clear art specifications, review gates, small initial batch before committing |
| Engine upgrade mid-production | Technical | High -- integration risk, regressions | Avoid mid-production engine upgrades. If required, plan a dedicated integration sprint |
| Publisher changes direction | External | Critical -- may invalidate completed work | Frequent milestone reviews with publisher. Written approval at each gate |

### Dependency Tracking

Dependencies between teams and systems are the most common source of schedule risk. Track them explicitly.

**Dependency types:**
- **Finish-to-Start:** Task B cannot start until Task A is finished (most common: engineering cannot implement until design spec is done)
- **Start-to-Start:** Task B cannot start until Task A starts (less common: QA test plan creation can start when engineering implementation starts)
- **Finish-to-Finish:** Task B cannot finish until Task A finishes (common: localisation cannot finish until all text strings are final)
- **External:** Dependency on something outside the team's control (platform SDK update, middleware licence, outsource delivery)

**Critical path analysis:** The critical path is the longest sequence of dependent tasks from now to the target milestone. Any delay on the critical path delays the milestone. Identify the critical path and monitor it weekly. Non-critical-path work has float; critical-path work has none.

---

## 9. Greenlight Processes

### Publisher Greenlight

Publisher-funded games go through a stage-gate process where the publisher reviews progress and decides whether to continue funding. Each gate typically corresponds to a milestone.

**What publishers want at each gate:**

| Gate | Key Questions | Common Artefacts |
|---|---|---|
| Concept | Is this a game we want to publish? Does it fit our portfolio? Is the team credible? | Pitch deck, game vision doc, team bios, comparable titles analysis, rough budget |
| Pre-production | Does the game work? Is the vertical slice compelling? Is the plan realistic? | Playable vertical slice, updated GDD, production plan, detailed budget, risk assessment |
| Production (mid-point) | Is the team executing? Is quality where it should be? Are milestones being hit? | Build, milestone progress report, bug metrics, updated plan, spend vs budget |
| Alpha | Is the game content-complete? Is it on track for the target release date? | Alpha build, full content inventory, performance report, cert readiness assessment |
| Beta/Gold | Is this ready to ship? Will it review well? Are there any deal-breakers? | Beta/Gold build, QA sign-off, cert status, marketing readiness, day-one patch plan |

**What makes a good greenlight deck:**
- Lead with the game, not the team. Show gameplay first, credentials second
- Be honest about the state of development. Publishers can smell optimism bias
- Show that you understand your market and competition
- Have a realistic timeline and budget. Padding is expected (10-20%); lying is not
- Address risks proactively. A team that acknowledges risks is more credible than one that claims there are none
- Include a playable build whenever possible. A mediocre build beats a brilliant slide deck

### Self-Funded Greenlight

Self-funded studios still benefit from internal greenlight processes. The discipline of milestone gates prevents runaway projects.

**Internal gate structure:**
- Same milestone gates as publisher-funded
- Gate review panel: studio leadership, not external parties
- Go/no-go decisions at each gate with clear criteria
- Budget checkpoints: are we on track financially?
- The hardest decision in self-funded development: when to kill a project that is not working. Internal gates create structured decision points for this

---

## 10. Tutorial and Training Material Design

### Principles for Production Training

1. **Teach the why before the how.** Teams resist process changes when they do not understand the problem being solved. Start every training module with "here is what goes wrong without this practice"
2. **Use the studio's own examples.** Generic agile training with software examples does not land with game teams. Use examples from their project: their backlog, their sprints, their bugs
3. **Make it self-service.** Materials should be usable without a trainer present. Screenshots, step-by-step instructions, "common mistakes" sections, video walkthroughs where appropriate
4. **Layer the detail.** Quick-start guide for day one. Detailed reference for week one. Advanced topics for month one. Do not front-load a 50-page manual
5. **Include assessment.** How does the studio know the training worked? Define observable behaviours: "after this training, team members should be able to create a JIRA ticket with all required fields, estimate a story using the team's estimation scale, and update their ticket status daily"
6. **Plan for maintenance.** Training materials go stale. Include a review date and a named owner for each document

### Standard Training Package Structure

```
Production Training Package/
├── Quick Start/
│   ├── 01_daily_standup_guide.md (1 page)
│   ├── 02_updating_your_jira_ticket.md (1 page, with screenshots)
│   ├── 03_logging_a_bug.md (1 page, with template)
│   └── 04_who_to_ask_for_help.md (1 page, escalation paths)
├── Process Guides/
│   ├── sprint_planning_guide.md
│   ├── sprint_review_guide.md
│   ├── retrospective_guide.md
│   ├── backlog_refinement_guide.md
│   ├── estimation_guide.md
│   └── milestone_gate_review_guide.md
├── JIRA Guides/
│   ├── jira_getting_started.md
│   ├── jira_boards_and_filters.md
│   ├── jira_writing_good_tickets.md
│   ├── jira_dashboards.md
│   └── jql_cheat_sheet.md
├── Templates/
│   ├── sprint_planning_template.md
│   ├── retrospective_template.md
│   ├── risk_register_template.xlsx
│   ├── milestone_review_template.md
│   ├── gdd_template.md
│   └── tdd_template.md
└── Reference/
    ├── definition_of_done_by_discipline.md
    ├── bug_severity_definitions.md
    ├── workflow_state_definitions.md
    └── estimation_scale_reference.md
```
