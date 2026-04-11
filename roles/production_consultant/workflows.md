# Production Consultant -- Workflows

## Daily Operations
- Review active client engagement status and upcoming deliverables
- Progress production artefacts (tutorials, templates, JIRA configurations, audit reports) for current engagements
- Check for requests from Gaming Practice Lead or cross-functional dependencies with Studio Ops Consultant
- Update engagement status if material changes have occurred

## Standard Workflows

### Production Audit (New Client Assessment)
**Trigger:** Gaming Practice Lead assigns a new client engagement, or Glen requests a production health check for an existing client
**Steps:**
1. Gather context: what does the studio make, how big is the team, what development phase are they in, what tools do they currently use, do they have a publisher or are they self-funded
2. Review existing production artefacts if available: current JIRA setup (or whatever they use), any GDDs or TDDs, milestone plans, sprint history, build pipeline documentation
3. Conduct a production maturity assessment across these dimensions:
   - **Planning:** Do they have a backlog? Is it groomed? Do they estimate? Do they plan sprints or just work off a list?
   - **Execution:** Do they run ceremonies (standups, sprint reviews, retros)? Are they meaningful or performative?
   - **Tracking:** Do they track velocity? Do they have burndown/burnup charts? Do they know their throughput?
   - **Documentation:** Do GDDs exist? Are they current? Are TDDs written before implementation or after?
   - **Tooling:** Is JIRA (or equivalent) configured for game dev or just default Scrum template? Are boards useful or ignored?
   - **Milestones:** Are milestone gates defined? Do they have artefact requirements? Who signs off?
   - **Risk:** Is there a risk register? Are dependencies tracked? Is the critical path identified?
   - **Pipelines:** Are asset, build, localisation, and cert pipelines documented and monitored?
4. Score each dimension (1-5 scale with clear definitions for each level)
5. Identify the top 3-5 highest-impact improvements
6. Draft the production audit report with findings, scores, and prioritised recommendations
7. Submit to Gaming Practice Lead for review before client delivery
**Output:** Production audit report with maturity scores and prioritised improvement roadmap
**Handoff:** Gaming Practice Lead reviews and approves. If approved, report goes to Glen for final sign-off before client delivery

### JIRA Workspace Setup (Greenfield)
**Trigger:** Client needs a JIRA workspace built from scratch, or their existing setup is so broken it needs to be rebuilt
**Steps:**
1. Define project structure: single project vs multi-project (e.g., separate projects for engine, gameplay, art, tools)
2. Design issue type hierarchy:
   - **Epic:** Major feature or system (e.g., "Combat System", "Character Customisation", "Multiplayer Backend")
   - **Story:** User-facing deliverable within an epic
   - **Task:** Non-user-facing work (pipeline setup, tech debt, documentation)
   - **Sub-task:** Discipline-specific breakdown of a story (art sub-task, engineering sub-task, design sub-task)
   - **Bug:** Defect with severity, reproduction steps, build number, platform
3. Configure custom fields for game development:
   - Platform (PC, PlayStation, Xbox, Switch, Mobile, Cross-platform)
   - Build Number (which build the issue targets or was found in)
   - Discipline (Art, Design, Engineering, Audio, QA, Production)
   - Milestone Gate (Concept, Pre-prod, Production, Alpha, Beta, Cert, Launch, Live)
   - Cert Status (Not Started, In Progress, Submitted, Passed, Failed, Waived)
   - Priority with game-dev definitions (Blocker = cannot ship, Critical = must fix before next milestone, Major = should fix before next milestone, Minor = fix if time allows, Trivial = nice to have)
4. Design workflows per issue type:
   - Standard: Open > In Progress > In Review > QA > Done
   - Bug: Open > Confirmed > In Progress > Fixed > QA Verify > Closed (or Reopened)
   - Art: Concept > Blockout > First Pass > Polish > Final > Approved
5. Create boards:
   - Sprint board per team/pod (if using Scrum)
   - Kanban board for live ops or continuous delivery streams
   - Release planning board showing milestone progress
   - Bug triage board with severity filters
6. Build dashboards:
   - Sprint health: velocity chart, burndown, sprint progress
   - Milestone progress: issues by milestone gate, completion percentage
   - Bug dashboard: open bugs by severity, bug trend over time, platform breakdown
   - Team workload: issues by assignee, discipline distribution
7. Create automation rules:
   - Auto-assign QA when status moves to "Fixed"
   - Notify lead when blocker created
   - Auto-transition parent issue when all sub-tasks complete
   - Flag overdue issues
8. Write JQL saved filters for common queries:
   - All blockers for current sprint
   - Bugs found in latest build by platform
   - All issues without estimates
   - Overdue items by discipline
   - Cert blockers
9. Create a JIRA usage guide specific to the studio (not generic Atlassian docs)
10. Run a walkthrough session with the team (documented as a tutorial)
**Output:** Fully configured JIRA workspace with custom fields, workflows, boards, dashboards, automation, saved filters, and usage documentation
**Handoff:** Client team starts using the workspace. Production Consultant monitors adoption for 2-4 weeks and adjusts configuration based on real usage

### Sprint Structure Design
**Trigger:** Client is adopting Scrum or Scrumban and needs sprint structure tailored to their cross-discipline team
**Steps:**
1. Map the team's discipline composition: how many engineers, artists (broken down by speciality), designers, QA, audio, production
2. Identify cadence differences:
   - Engineering: typically works well in 2-week sprints
   - Art: often needs longer cycles for concept > blockout > first pass > polish. May work better in 3-week sprints or Kanban
   - Design: iteration-heavy, may need slack time for playtesting and revision
   - QA: dependent on builds, needs flexible capacity that ramps up near milestones
   - Audio: often comes late in the pipeline, may be partially outsourced
3. Choose the sprint structure:
   - **Unified sprints:** All disciplines on the same cadence (simplest, works for teams <30)
   - **Staggered sprints:** Art runs on a different cadence offset from engineering (works for 30-80 person teams)
   - **Scrumban hybrid:** Engineering on sprints, art on Kanban with WIP limits, synced at sprint boundaries (works for larger teams or heavy art-content games)
   - **Program Increment model (SAFe-lite):** For 100+ person studios with multiple teams, use PI planning without the full SAFe overhead
4. Define ceremonies and their purpose:
   - Sprint Planning: who attends, how long, what is the input (groomed backlog), what is the output (sprint commitment)
   - Daily Standup: discipline-level or cross-discipline? Time-boxed to 15 minutes. Focus on blockers, not status
   - Sprint Review/Demo: what gets shown, who attends, how feedback is captured
   - Retrospective: what format, how actions are tracked, who facilitates
   - Backlog Refinement: when it happens, who participates, how stories are estimated
5. Define cross-discipline dependency handling:
   - How art and engineering coordinate on shared deliverables
   - How design hands off to implementation
   - How QA capacity is allocated across teams
6. Document the sprint structure with a visual calendar showing ceremony cadence
7. Run a dry-run sprint with the team to validate the structure
**Output:** Sprint structure document with ceremony definitions, cadence calendar, and cross-discipline dependency protocol
**Handoff:** Client team runs sprints. Production Consultant reviews sprint metrics for 3-4 sprints and adjusts

### Milestone Framework Definition
**Trigger:** Client needs milestone gates defined for a new project, or their existing milestones are just calendar dates with no quality criteria
**Steps:**
1. Determine the development model: publisher-funded (milestone payments tied to gates), self-funded (internal gates), live service (continuous with seasonal milestones), or hybrid
2. Define each milestone gate with:
   - **Entry criteria:** What must be true before the team enters this phase
   - **Duration guidance:** Typical length for this phase given team size and scope
   - **Required artefacts:** What documents, builds, and demos must exist at the gate
   - **Quality criteria:** What "passing" the gate means -- specific, measurable, not vague
   - **Sign-off authority:** Who reviews and who approves
   - **Common failure modes:** What typically goes wrong at this gate and how to avoid it
3. Standard gate definitions (customised per project):
   - **Concept:** Game vision document, target audience, platform strategy, competitive positioning, art direction pillars, initial scope estimate
   - **Pre-production:** Playable vertical slice, updated GDD with core loop defined, TDD for major systems, art style guide with in-engine examples, initial project plan with team ramp, risk register
   - **Production:** Feature-complete build (all features in, not all polished), full GDD current, all major systems implemented per TDD, art asset list with completion tracking, QA test plan active, localisation plan defined
   - **Alpha:** Content-complete build, all features functional, performance within target on all platforms, all critical and major bugs from backlog addressed, cert requirements checklist started
   - **Beta:** Release-candidate quality, only minor bugs remaining, performance optimised, all platform cert requirements met on paper, localisation integrated, accessibility features complete
   - **Cert:** Platform-specific submission (TRC/XR/Lotcheck), compliance verified, age rating submissions complete, day-one patch scoped if needed
   - **Launch:** Go/no-go decision, live ops infrastructure verified, community management plan active, launch marketing assets delivered, post-launch roadmap drafted
4. Create a milestone tracker template showing progress against gate criteria
5. Define the escalation path for gate failures
**Output:** Milestone framework document with gate definitions, artefact requirements, quality criteria, and tracker template
**Handoff:** Gaming Practice Lead reviews. Client team uses the framework for ongoing development

### Tutorial and Training Material Creation
**Trigger:** Client engagement requires training materials so the studio can sustain production practices after NBI departs
**Steps:**
1. Identify the audience: who needs training? Producers only, or the whole team? What is their current production literacy?
2. Define the curriculum based on the production audit findings -- focus on the gaps, not a generic "agile 101" course
3. Create materials in order of priority:
   - **Quick-start guides:** One-page references for daily practices (how to update your JIRA ticket, how to log a bug, how to run a standup)
   - **Process guides:** Detailed walkthroughs of each ceremony and workflow (how sprint planning works at this studio, how to do backlog refinement, how to prepare for a milestone gate review)
   - **JIRA tutorials:** Step-by-step guides for the specific JIRA configuration: how to use boards, how to write JQL queries, how to read dashboards
   - **Template library:** Sprint planning template, retrospective template, risk register template, milestone review template, GDD template, TDD template
   - **Reference materials:** Estimation guide, definition of done by discipline, bug severity definitions, workflow state definitions
4. Format for self-service: materials should be usable without a trainer present. Use screenshots, examples, and "common mistakes" sections
5. Review materials with the client's production lead (or equivalent) before distribution
6. Run a validation session: have someone unfamiliar with the process follow the tutorial and note where they get stuck
**Output:** Complete training material package tailored to the client's specific setup and needs
**Handoff:** Client team receives materials. Production Consultant follows up after 2-4 weeks to assess whether materials are being used and if updates are needed

### Greenlight Deck Support
**Trigger:** Client needs to prepare a greenlight deck for a publisher pitch or internal investment committee
**Steps:**
1. Determine the audience: publisher greenlight committee, internal studio leadership, investor pitch, or platform holder partnership
2. Define what the specific greenlight process requires (varies by publisher: some want a 10-page doc, some want a 50-slide deck, some want a playable build with specific features)
3. Assemble the required components:
   - Game vision and unique selling proposition
   - Target audience and market positioning
   - Core gameplay loop description with visual aids
   - Development timeline with milestone gates
   - Team composition and key hires needed
   - Budget summary (high level -- CFO or client handles detail)
   - Risk assessment and mitigation plan
   - Competitive landscape (what exists, how this is different)
   - Technical feasibility summary (platform, engine, key tech risks)
   - Monetisation model (if applicable)
   - Post-launch support plan (if live service)
4. Review the deck against known greenlight criteria for the target publisher (if available)
5. Identify gaps and work with the client to fill them
6. Submit to Gaming Practice Lead for NBI quality review before client uses it
**Output:** Greenlight deck or supporting materials tailored to the specific publisher/investor requirements
**Handoff:** Gaming Practice Lead reviews. Glen approves before delivery to client

## Escalation Triggers
- Client's production problems are actually people or culture problems: escalate to Gaming Practice Lead and coordinate with Studio Ops Consultant
- Client pushes back on production recommendations and wants to continue with practices that will fail: escalate to Gaming Practice Lead
- Engagement scope is expanding beyond agreed terms: escalate to Gaming Practice Lead
- Client's publisher is imposing milestone requirements that conflict with NBI's recommendations: escalate to Gaming Practice Lead and Glen
- Client data reveals serious project health issues (e.g., velocity collapse, bug count explosion, team attrition spike): flag immediately to Gaming Practice Lead
