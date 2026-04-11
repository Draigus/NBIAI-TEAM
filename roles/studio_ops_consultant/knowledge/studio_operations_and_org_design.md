# Studio Operations and Organisational Design -- Tier 2 Knowledge

This is the Studio Operations and Org Design Consultant's definitive reference on game studio organisational structure, team topologies, role taxonomy, hiring, team health, onboarding, studio culture, outsourcing, and compensation.

---

## 1. Studio Organisational Structures

### Team Topologies for Game Studios

Game studios organise their teams in fundamentally different ways depending on their size, the number of simultaneous projects, the genre and scope of their games, and their organisational maturity. There is no single correct structure -- the right topology depends on the studio's specific circumstances.

#### Feature Teams (Pods)

**What it is:** Each team owns a vertical slice of the game. A Combat Pod includes its own engineers, artists, designers, and QA. The pod is responsible for everything related to combat: design, implementation, art, audio integration, and testing.

**When to use:** Studios of 30-100 people making a single game with clearly separable feature areas. Works best when features are relatively independent (combat does not deeply depend on crafting every sprint).

**Advantages:**
- Clear ownership. If combat is broken, the Combat Pod owns it
- Reduced cross-team dependencies. Most work happens within the pod
- Faster decision-making. The pod can iterate without waiting for other teams
- Stronger team cohesion. Pod members build working relationships and shared context

**Disadvantages:**
- Skill silos. The combat engineer may not know the world-streaming code at all
- Resource inefficiency. If combat is feature-complete but world needs more engineers, moving people between pods is disruptive
- Inconsistency. Different pods may solve similar problems differently (three different UI patterns for inventory, shop, and crafting)
- Art direction fragmentation. Without strong central art direction, pods produce visually inconsistent work

**How to implement:**
- Pod size: 5-12 people is optimal. Below 5, the pod lacks coverage. Above 12, coordination overhead increases
- Pod composition: minimum 1 designer, 2-3 engineers, 2-3 artists, 0.5-1 QA (shared across pods at small scale). One person is the pod lead (often the senior designer or senior engineer, not a dedicated manager)
- Shared services: some functions stay centralised -- tech art, build engineering, platform engineering, audio, localisation. These service the pods but are not embedded in them
- Coordination: pod leads meet weekly (or bi-weekly) to sync on cross-pod dependencies, shared systems, and art/design direction consistency

#### Component Teams

**What it is:** Teams organised by discipline or technical domain. The Engineering Team, the Art Team, the Design Team, the QA Team. Each team works on its domain across the entire game.

**When to use:** Small studios (<20 people) where specialised teams would be too small. Also works for studios with multiple small projects that share resources, or studios in very early pre-production where the game is not yet separable into features.

**Advantages:**
- Discipline expertise stays concentrated. Artists learn from artists. Engineers review each other's code
- Flexible resourcing. An engineer can work on whatever needs engineering most this week
- Consistent standards. One engineering team means one coding standard, one art team means one visual quality bar

**Disadvantages:**
- Cross-discipline coordination is hard. Art waits for engineering, engineering waits for design, design waits for playtesting that needs art and engineering
- No clear ownership of features. If the quest system is buggy, is that a design problem, an engineering problem, or a QA problem?
- Handoff culture. Work passes between teams rather than flowing within a team
- Bottlenecks on leads. Every cross-discipline decision routes through department leads

**When to transition away:** When the studio reaches 20-30 people and cross-discipline coordination becomes the dominant bottleneck, transition to feature teams or a hybrid

#### Platform Teams

**What it is:** Teams that own technical platforms that other teams build on. The Engine Team maintains the rendering pipeline, physics, and core systems. The Online Services Team owns matchmaking, leaderboards, and backend infrastructure. The Tools Team builds and maintains the editor and pipeline tools.

**When they emerge:** At 100+ person studios. Below that size, platform concerns are handled by senior engineers within feature or component teams.

**Key platform teams in game studios:**
- Engine/Core Tech: rendering, physics, animation systems, memory management, platform abstraction
- Online/Backend: matchmaking, leaderboards, telemetry, live ops infrastructure, server infrastructure
- Tools: level editor, asset pipeline tools, build system, debug tools, profiling tools
- Platform/Porting: platform-specific code (PS5, Xbox, Switch, mobile), certification compliance, platform SDK integration

**Relationship to feature teams:** Platform teams are internal service providers. They do not build game features -- they build the infrastructure that feature teams use to build game features. The key tension: feature teams want platform teams to prioritise their needs now. Platform teams need to balance immediate requests against long-term infrastructure health.

#### Matrix Structure

**What it is:** People belong to two structures simultaneously. Their discipline (Art, Engineering, Design) owns their career progression, craft standards, and professional development. Their project team (feature pod, game team) owns their daily work and delivery commitments.

**When to use:** Studios of 150+ people, or studios running multiple concurrent projects. Also useful when the studio needs to maintain strong discipline expertise while still organising delivery around features.

**How it works in practice:**
- Each person has a discipline manager (Art Director oversees all artists) and a team lead (Pod Lead assigns daily work)
- Discipline manager handles: career development, performance reviews, hiring for the discipline, craft standards, training
- Team lead handles: task assignment, sprint planning, delivery commitments, daily coordination
- Potential conflict: who "owns" the person? Resolve by clearly defining which decisions belong to which manager. Delivery belongs to the team lead. Career belongs to the discipline manager. If they disagree on priorities, escalate to the studio head

**The matrix trap:** Matrix structures can create confusion if decision authority is unclear. "Who is my real boss?" is the most common complaint. Prevent this by explicitly documenting which manager decides what, and making sure both managers communicate regularly about each person's workload and development.

---

## 2. Scaling Patterns

### 1-10 People (Founding Team / Prototype Phase)

**Structure:** Flat. Everyone reports to the studio head (who is probably also the creative director, lead programmer, and office manager). No formal departments.

**Key roles:**
- Studio Head / Creative Director (1): Sets the vision, makes all major decisions, codes/designs/manages
- Programmers (2-4): Generalist engineers. Everyone works on everything
- Artists (1-3): Generalist artists. Concept, 3D, 2D, UI -- whoever can do what is needed
- Designer (0-1): Often the studio head fills this role. If separate, they own the GDD and core systems design

**What works at this size:**
- Everyone talks to everyone. Communication is effortless
- Decisions are fast. The studio head decides, and everyone knows
- Passion drives productivity. Small teams are self-motivated

**What breaks as you approach 10:**
- The studio head becomes a bottleneck. Every decision, every art review, every code review goes through one person
- Generalists hit their limits. You need a specialist animator but your generalist artist is doing animation, environments, and UI
- No production structure. Work lives in someone's head. When that person is sick, nobody knows the plan

**When to restructure:** At 8-10 people. Add a producer (even part-time). Define who owns what. Start using a project management tool. The studio head must start delegating or they will become the studio's single point of failure.

### 10-30 People (Pre-Production / Early Production)

**Structure:** Component teams with discipline leads. Studio Head + Art Lead + Tech Lead + Design Lead + Producer.

**Key additions:**
- Producer (1): Owns the schedule, runs ceremonies, tracks progress. This is the first "non-creative" hire and often the most resisted -- and the most needed
- Discipline Leads: Art Lead, Tech Lead, Design Lead. These people are still IC contributors (50%+ of their time is making the game) but they also set standards, review work, and mentor juniors
- QA (1-2): Dedicated testers. Before this, everyone tested their own work (badly)
- Specialist artists: Separate concept artist, 3D artist, animator, VFX artist as needed by the game's demands
- Audio (0-1 or contractor): Dedicated audio person or outsourced audio

**What works at this size:**
- Small enough that everyone still knows the whole game
- Discipline leads provide quality gates without heavy process
- The producer creates visibility into what is happening and what is at risk

**What breaks as you approach 30:**
- Discipline leads spend too much time managing and not enough time creating. They need to either become full-time managers or delegate management
- Cross-discipline coordination becomes difficult. Art, engineering, and design start working in parallel on different things without syncing
- Onboarding becomes a problem. A new hire at a 10-person studio absorbs context by osmosis. At 25 people, they need structured onboarding
- The studio head can no longer be involved in every decision. Delegation becomes essential, not optional

**When to restructure:** At 25-30 people. Introduce feature teams / pods. Elevate discipline leads to department heads with dedicated management time. Add a second producer or scrum master.

### 30-80 People (Full Production)

**Structure:** Feature teams (pods) with shared services. Department heads for each discipline. Multiple producers.

**Key additions:**
- Department Heads: Art Director, Technical Director, Design Director, Production Director. These are full-time management/leadership roles. They set direction, hire, manage performance, and ensure quality across their discipline. They do not (much) IC work
- Multiple Producers/Scrum Masters: One per pod, or one per two pods. They run the pods' daily operations
- Tech Art (1-3): The bridge between art and engineering. Critical for asset pipeline quality and performance
- Build Engineer (1): Dedicated person maintaining the build pipeline, automated tests, and CI/CD
- QA Lead + QA Team (3-6): Structured QA with test plans, regression suites, and dedicated bug triage
- Community Manager (0-1): If the game has a public presence (early access, beta, live service)
- Specialist design roles: Split "Game Designer" into Systems Designer, Level Designer, Narrative Designer, Economy Designer as needed

**Team topology example (60-person studio, single game):**
```
Studio Head
├── Art Director
│   ├── Environment Art Lead + 4 artists
│   ├── Character Art Lead + 3 artists
│   ├── VFX Lead + 1 VFX artist
│   ├── Concept Artist (1-2)
│   └── Tech Art Lead + 1 tech artist
├── Technical Director
│   ├── Gameplay Engineering Lead + 4 engineers
│   ├── Engine/Platform Lead + 2 engineers
│   ├── Online/Backend Lead + 2 engineers
│   └── Build Engineer (1)
├── Design Director
│   ├── Systems Design Lead + 1 systems designer
│   ├── Level Design Lead + 2 level designers
│   └── Narrative Designer (1)
├── Production Director
│   ├── Producer -- Pod Alpha (Combat + AI)
│   ├── Producer -- Pod Bravo (World + Exploration)
│   └── Producer -- Pod Charlie (UI + Metagame)
├── QA Lead
│   └── QA Testers (4-5)
├── Audio Director (1, or outsourced)
└── Community Manager (1)
```

**What works at this size:**
- Feature teams create clear ownership and faster delivery
- Department heads maintain quality standards across the game
- Multiple producers prevent any single producer from becoming overwhelmed
- Specialised roles (tech art, build engineer) eliminate bottlenecks

**What breaks as you approach 80:**
- The studio head has too many direct reports if all department heads report to them. Consider adding a Head of Development or General Manager layer
- Pod leads may lack management training. Being a good senior engineer does not automatically make someone a good pod lead
- Company culture becomes fragile. At 30 people, culture is implicit. At 80, it needs to be explicit: values, norms, expectations must be documented and reinforced

### 80-150 People (Large Production / Multi-Project)

**Structure:** Matrix or scaled feature teams. Executive layer emerges. HR function required.

**Key additions:**
- Executive layer: Head of Studio / GM, CTO, Art Director becomes VP Art, etc. The studio head focuses on strategy, external relationships, and creative vision -- not daily management
- HR (1-2): Dedicated HR function. At this size, hiring, onboarding, performance management, and compliance require full-time attention
- IT/Infrastructure (1-2): Office IT, dev kit management, VPN, security
- Finance/Operations (1): Budget tracking, vendor management, office operations
- Multiple QA teams: Platform-specific QA, dedicated regression team, possibly an embedded QA model (QA within each pod)
- Dedicated localisation coordinator: If shipping in multiple languages

**The 150-person inflection point (Dunbar's number):** At around 150 people, the studio crosses the threshold where not everyone can know everyone. Sub-cultures form within teams. Information stops flowing organically. This is the point where formal communication processes (all-hands meetings, team newsletters, internal wikis) become essential, not optional. Studios that do not adapt their communication at this point develop silos, rumour cultures, and alignment problems.

### 150-500+ People (AAA / Publisher Studio)

**Structure:** Full matrix with functional organisations, project organisations, and corporate support functions.

**Key additions at scale:**
- Multiple game teams with shared technology and services
- Central Technology Group: engine, tools, platform, online -- serving multiple game teams
- Central Art Services: outsource management, art standards, shared asset libraries
- Dedicated People/HR team: recruitment, L&D, employee relations, compensation, benefits
- Finance team: budgeting, forecasting, publisher reporting
- Business Intelligence: player data, analytics, market research
- Legal: contracts, IP, compliance (or handled by parent company)
- Facility Management: multiple office locations, remote team coordination

**The scaling trap:** Large studios often become slow. Adding people adds communication overhead. The solution is not more process -- it is clearer ownership, smaller teams with defined boundaries, and explicit coordination mechanisms at the boundaries. Conway's Law applies: the game's architecture will mirror the studio's organisational structure. Design the org to produce the architecture you want.

---

## 3. Gaming Role Taxonomy

### Design Discipline

| Role | Scope | Key Skills | Common Confusion |
|---|---|---|---|
| Game Director | Overall game vision and creative leadership. Final say on what the game is | Creative vision, leadership, cross-discipline understanding, player empathy | Not the same as Creative Director (who focuses on narrative/world) at some studios. Titles vary |
| Creative Director | Narrative direction, world building, tone, aesthetic vision | Storytelling, world design, art direction collaboration, brand consistency | Some studios merge this with Game Director. Scope varies significantly |
| Lead Game Designer | Manages the design team. Sets design standards. Reviews all design work | Design leadership, mentoring, systems thinking, documentation | Not just the best designer -- must be able to manage people and set standards |
| Systems Designer | Designs game systems: combat, progression, economy, crafting, AI behaviours. Owns the rules of the game | Systems thinking, mathematical modelling, spreadsheet skills, data analysis, balancing | Often confused with Level Designer. Systems Designers work on rules; Level Designers work on spaces |
| Level Designer | Designs playable spaces: levels, maps, encounters, environmental storytelling. Owns the spatial experience | Spatial reasoning, pacing, encounter design, tool proficiency (Unreal Editor, Unity, proprietary), blockout skills | Highly engine-specific skill set. An experienced Unreal level designer may need significant ramp time in a proprietary engine |
| Narrative Designer | Designs story delivery: dialogue systems, quest narratives, environmental storytelling, cinematics direction | Writing, branching narrative design, dialogue tools proficiency, collaboration with systems and level design | Not the same as a Writer. Narrative Designers own how the story is delivered through gameplay, not just the words |
| Economy Designer | Designs virtual economies: currency systems, pricing, loot tables, player spending behaviour, live ops economy tuning | Mathematical modelling, economics, data analysis, monetisation ethics, live ops experience | Increasingly critical for F2P and live service games. Requires comfort with data and A/B testing |
| UX Designer | Designs player-facing interfaces and interactions: menus, HUD, control feel, accessibility, tutorial/onboarding flow | Wireframing, user research, accessibility standards, prototyping, player testing | Sometimes merged with UI Artist. UX Designer focuses on interaction design; UI Artist focuses on visual execution |
| Technical Designer | Bridges design and engineering: implements systems in engine/scripting, builds tools for designers, prototypes mechanics | Scripting (Blueprint, Lua, C#), tool development, systems implementation, debugging | Increasingly valuable role. Lets designers iterate without waiting for engineering for every change |

### Art Discipline

| Role | Scope | Key Skills |
|---|---|---|
| Art Director | Overall visual direction. Sets the art style, quality bar, and aesthetic standards | Visual direction, team leadership, cross-discipline communication, broad art skills |
| Lead Artist (by speciality) | Manages artists in their speciality. Sets technical and quality standards | Speciality mastery, pipeline knowledge, mentoring, review skills |
| Concept Artist | Creates concept art for characters, environments, props, UI, marketing. Defines the visual language before production begins | Traditional art skills, digital painting, visual development, speed and iteration |
| Environment Artist | Creates 3D environments: terrain, architecture, vegetation, props, lighting setup | 3D modelling, texturing, world building, performance awareness (draw calls, LODs), engine proficiency |
| Character Artist | Creates 3D character models: heroes, NPCs, creatures, armour, weapons | High-poly sculpting, retopology, texturing, anatomy knowledge, style adaptation |
| Animator | Creates character and object animations: locomotion, combat, facial, cinematic | Animation principles, rigging knowledge, motion capture cleanup, state machine design |
| VFX Artist | Creates visual effects: particles, shaders, post-processing, destruction, weather | Particle systems, shader authoring, performance optimisation, timing/feel |
| UI Artist | Creates visual designs for user interfaces: menus, HUD, icons, typography | Graphic design, typography, motion graphics, asset optimisation, responsive layout |
| Technical Artist | Bridges art and engineering: shader development, pipeline tools, performance optimisation, rigging tools | Programming (Python, MEL, HLSL/GLSL), DCC tool expertise, pipeline automation, performance profiling |
| Lighting Artist | Creates lighting setups for environments and cinematics. Owns the mood and atmosphere | Colour theory, engine lighting systems, performance awareness, cinematography |
| Audio Designer | Creates sound effects, ambient soundscapes, implements audio in engine. May also handle music direction | Sound design, middleware (Wwise, FMOD), engine integration, mixing, musical knowledge |

### Engineering Discipline

| Role | Scope | Key Skills |
|---|---|---|
| Technical Director / CTO | Owns technical architecture, technology strategy, engineering standards | Architecture, cross-platform expertise, team leadership, risk assessment |
| Lead Programmer (by domain) | Manages engineers in their domain. Sets coding standards, reviews code | Domain mastery, code review, mentoring, architecture within their domain |
| Gameplay Programmer | Implements game mechanics, player controls, AI, combat, physics interactions | C++ (typically), game engine expertise, gameplay feel, rapid iteration |
| Engine Programmer | Works on core engine systems: rendering, physics, memory management, platform abstraction | Low-level C++, graphics programming, performance optimisation, platform SDKs |
| Tools Programmer | Builds and maintains development tools: level editor, asset pipeline, debug tools | C++/C#/Python, UI development, DCC tool scripting, developer UX |
| Online/Network Programmer | Implements multiplayer: netcode, matchmaking, replication, backend services | Networking protocols, client-server architecture, latency compensation, cloud infrastructure |
| UI Programmer | Implements user interfaces: menus, HUD, data binding, localisation integration | UI frameworks (Slate, UMG, IMGUI, custom), data binding, animation, accessibility |
| Build Engineer | Maintains the build pipeline: CI/CD, automated testing, build distribution, platform builds | Jenkins/TeamCity, scripting (Python, Bash, PowerShell), platform SDKs, source control |
| Platform Engineer | Handles platform-specific code: PS5, Xbox, Switch, mobile. Certification compliance | Platform SDKs, TRC/XR/Lotcheck requirements, performance optimisation per platform |
| DevOps Engineer | Infrastructure: servers, cloud services, deployment, monitoring, scaling | AWS/Azure/GCP, containerisation, infrastructure-as-code, monitoring, incident response |

### QA Discipline

| Role | Scope | Key Skills |
|---|---|---|
| QA Lead / QA Manager | Manages the QA team. Defines test strategy, manages test plans, reports quality metrics | Test planning, team management, risk-based testing, bug triage, stakeholder communication |
| QA Analyst / Tester | Executes test cases, files bugs, regression testing, exploratory testing | Attention to detail, systematic testing, clear bug reporting, platform knowledge |
| QA Automation Engineer | Builds and maintains automated test frameworks: smoke tests, unit tests, performance tests, integration tests | Programming (Python, C#, C++), test framework development, CI/CD integration |
| Compliance / Cert QA | Specialises in platform certification requirements: TRC, XR, Lotcheck | Platform requirement expertise, compliance testing, submission process knowledge |

### Production Discipline

| Role | Scope | Key Skills |
|---|---|---|
| Production Director / EP | Strategic production leadership. Owns the overall project plan and milestone framework | Executive production, stakeholder management, risk management, portfolio planning |
| Producer | Day-to-day production management: sprint management, dependency tracking, status reporting, ceremony facilitation | Agile methodology, JIRA expertise, cross-discipline coordination, problem-solving |
| Associate Producer | Supports the producer: meeting notes, status tracking, asset tracking, schedule maintenance | Organisation, communication, tool proficiency, learning production methodology |
| Scrum Master | Facilitates agile ceremonies, removes impediments, coaches the team on agile practices | Agile coaching, facilitation, conflict resolution, servant leadership |
| Live Ops Producer | Manages live service operations: content drops, events, season management, incident response | Live ops cadence management, data-informed decisions, rapid response, player communication |

---

## 4. Interview Question Banks

### Principles for Gaming Interviews

1. **Test domain knowledge, not generic competency.** "Tell me about a time you solved a problem" tells you nothing about whether someone can design a progression system or debug a netcode issue
2. **Practical tests over theory.** A 2-hour design test reveals more than a 1-hour interview. A take-home programming test shows how someone actually works
3. **Specificity matters.** "How would you approach game design?" is a bad question. "How would you design a crafting system for a survival game with 4-player co-op that needs to stay engaging after 100 hours?" is a good question
4. **Test for the level.** A junior engineer should demonstrate solid fundamentals and willingness to learn. A senior engineer should demonstrate system design thinking and mentoring ability. Do not test juniors like seniors or seniors like juniors
5. **Portfolio review is essential for creative roles.** For artists, designers, and audio professionals, their portfolio tells you more than any interview question. Structure the portfolio review: do not just flip through it

### Sample Questions by Role (Abbreviated -- Full Banks in Client Deliverables)

**Systems Designer**
- Design a loot system for a looter-shooter that maintains player excitement over 200 hours. How do you handle rarity tiers, duplicate protection, and power creep?
- Your combat system feels "floaty" in playtesting. Walk me through how you would diagnose and fix this. What data would you look at? What would you change?
- You are designing an economy for a free-to-play game. How do you create monetisation that funds development without making non-paying players feel punished?
- A feature you designed in the GDD is not fun in prototype. The team has spent 2 months on it. What do you do?

**Gameplay Programmer**
- Walk me through how you would implement a character controller for a third-person action game. What are the key considerations for making it feel responsive?
- You are seeing intermittent physics glitches where the player clips through walls. How do you diagnose this? What are the likely causes?
- Describe the architecture of an AI system for 50 simultaneous NPCs with different behaviour trees. How do you handle performance?
- How do you approach networking for a cooperative game with 4 players? Client-server or peer-to-peer? How do you handle latency?

**Environment Artist**
- Walk me through your process for creating a game-ready environment from concept to engine. What are your key decision points?
- You have a polygon budget of 500K tris for a large exterior environment. How do you allocate that budget? What techniques do you use to maintain visual quality within the budget?
- How do you approach LOD creation for your assets? What are the tradeoffs between manual and automated LOD?
- Show me two pieces from your portfolio that demonstrate different art styles. How did you adapt your workflow for each?

**Producer**
- Your game is 3 months from beta and you have just discovered that a core system needs to be rearchitected. How do you handle this?
- Describe how you would set up a JIRA workspace for a 40-person team making an open-world RPG. What project structure, issue types, and workflows would you use?
- Your art team consistently carries over sprint work. What do you do?
- The creative director wants to add a major feature that was not in the original scope. The publisher has not approved additional budget. How do you handle this?

### Practical Test Design

**Design Test (Systems Designer example):**
- Brief: "Design a player housing system for an MMO. Players can build, decorate, and visit each other's homes. The system must work for both casual and hardcore players. You have 3 hours."
- Deliverable: 2-4 page design document covering core mechanics, progression, social features, edge cases, and monetisation hooks (if applicable)
- Evaluation: Creativity and originality (20%), Systems thinking and completeness (30%), Edge case handling (20%), Communication clarity (20%), Feasibility (10%)

**Programming Test (Gameplay Programmer example):**
- Brief: "Given this partially implemented combat system [provide codebase], add a combo system where chaining specific attack sequences triggers special abilities. Include unit tests."
- Duration: 4 hours (take-home) or 2 hours (on-site with simpler scope)
- Evaluation: Code quality and readability (25%), Architecture and extensibility (25%), Correctness (25%), Test coverage (15%), Performance awareness (10%)

**Art Test (Environment Artist example):**
- Brief: "Create a game-ready modular building facade in [specified style]. Must include 3 modular pieces that tile correctly. Target: mobile platform, 10K tris total, 2K textures."
- Duration: 8-12 hours (take-home)
- Evaluation: Visual quality (30%), Technical execution (25%), Modularity and tiling (20%), Optimisation (15%), Style adherence (10%)

---

## 5. Skills Matrices and Competency Levels

### Level Definitions (Universal Across Disciplines)

| Level | Title Pattern | Decision Scope | Expected Impact | Management |
|---|---|---|---|---|
| Junior (L1) | Junior [Role] | Executes assigned tasks within established patterns | Completes defined work reliably with guidance | No management responsibility |
| Mid (L2) | [Role] | Works independently on standard tasks. Identifies and solves problems within their domain | Delivers features independently. Contributes to planning | No management responsibility |
| Senior (L3) | Senior [Role] | Drives technical/creative decisions within their domain. Mentors juniors | Shapes project direction within their area. Raises quality of the team | May mentor 1-2 juniors informally |
| Lead (L4) | Lead [Role] | Owns direction for their discipline within a team/pod. Sets standards | Defines how work is done. Quality gatekeeper. Team enabler | Manages 3-8 people. Performance reviews |
| Principal (L5) | Principal [Role] | Influences studio-wide direction. Solves the hardest problems | Sets technical/creative direction across the project. Thought leadership | May manage leads or operate as IC with broad influence |
| Director (L6) | [Discipline] Director | Owns discipline direction for the entire studio. Hiring, strategy, standards | Department-level impact. Shapes the studio's capability | Manages a department. Budget responsibility |

### Example: Engineer Competency Matrix

| Competency | Junior | Mid | Senior | Lead |
|---|---|---|---|---|
| Code quality | Writes code that works. May need significant review feedback | Writes clean, maintainable code. Handles most review feedback before submission | Writes exemplary code. Sets coding standards. Provides meaningful code review | Defines and enforces coding standards across the team |
| System design | Implements within existing systems | Designs small systems independently. Understands tradeoffs | Designs complex systems. Anticipates scaling and performance issues | Architects systems that span multiple teams. Guides others on design |
| Debugging | Fixes bugs with guidance. Uses basic debugging tools | Independently diagnoses and fixes complex bugs | Debugs across system boundaries. Identifies root causes of systemic issues | Builds debugging infrastructure. Mentors others on debugging methodology |
| Domain knowledge | Learning the codebase and engine. Asks many questions | Solid understanding of their domain (gameplay, engine, tools, etc.) | Deep expertise in their domain. Credible authority | Broad expertise across multiple domains. Industry-level knowledge |
| Collaboration | Communicates status and blockers. Asks for help when stuck | Proactively coordinates with other disciplines. Gives useful feedback | Drives cross-discipline technical decisions. Unblocks others | Facilitates collaboration across the team. Resolves technical disputes |
| Mentoring | N/A | Answers questions from juniors | Actively mentors 1-2 people. Writes documentation | Develops the careers of team members. Identifies growth opportunities |

---

## 6. Team Health Assessment Framework

### Combining Tom Rieger's Methodology with Gaming Specifics

Tom Rieger's work on organisational health focuses on measurable factors that predict team performance: engagement, alignment, enablement, and development. Applied to game studios, these generic factors need gaming-specific indicators.

### Assessment Dimensions

#### 1. Engagement
**Generic indicator:** Do people care about their work?
**Gaming-specific indicators:**
- Do team members play the game they are making? (Studio players metric -- a team that does not play its own game has lost the thread)
- Do people voluntarily share work they are proud of? (Show-and-tell culture)
- Do people stay late because they are excited or because they are pressured?
- Is there passion for the craft or resignation to the grind?

**Assessment questions (anonymous survey):**
- "I am proud of the game we are making" (1-5 scale)
- "I regularly play our game outside of required playtests" (Yes/No/Sometimes)
- "I feel my creative contributions matter" (1-5 scale)
- "I would recommend this studio as a great place to work" (1-5 scale)

#### 2. Alignment
**Generic indicator:** Does the team share a common direction?
**Gaming-specific indicators:**
- Can 5 random team members describe the game's core fantasy in consistent terms?
- Does the creative direction feel stable or does it change frequently?
- Do departments agree on priorities or does each department have its own agenda?
- Is the milestone plan understood and believed across the team?

**Red flags:**
- Art and engineering disagree on what the game looks like
- Design keeps changing core mechanics in production
- Different pods are building towards different visions of the game
- The milestone plan exists but nobody refers to it

#### 3. Role Clarity
**Generic indicator:** Does everyone know what they are responsible for?
**Gaming-specific indicators:**
- Are there decision-making bottlenecks where one person must approve everything?
- Do people step on each other's toes (two people think they own the same thing)?
- Are there gaps where nobody owns something critical (e.g., nobody owns the tutorial, nobody owns accessibility)?
- Can new hires figure out who to go to for what?

#### 4. Creative Autonomy
**Gaming-specific dimension (not in generic org health models):**
- Do ICs have appropriate creative freedom within their domain?
- Is the creative director a collaborator or a dictator?
- Can an artist propose an alternative approach, or must they execute exactly what the concept shows?
- Can a designer iterate on a mechanic, or must every change go through approval?
- Balance: Too much autonomy leads to inconsistency. Too little kills motivation and creativity

#### 5. Sustainable Pace
**Gaming-specific dimension (crunch culture):**
- What are actual average working hours per week? (Not what the policy says -- what actually happens)
- How many weekends have people worked in the last 3 months?
- Is there recovery time after crunch periods, or is it crunch-to-crunch?
- Is overtime voluntary or implicitly mandatory ("nobody is forced to stay, but everyone stays")?
- What is the attrition rate? Industry average is 15-20% annually. Above 25% signals a problem

**Crunch assessment questions:**
- "I regularly work more than 45 hours per week" (frequency scale)
- "I have worked weekends in the last month" (count)
- "I feel I can leave at the end of the workday without judgment" (1-5 scale)
- "After busy periods, I get adequate recovery time" (1-5 scale)

#### 6. Cross-Discipline Collaboration
**Gaming-specific dimension:**
- Do art, design, and engineering collaborate on features or hand off work over walls?
- Do people understand what other disciplines do and what their constraints are?
- Are retrospectives cross-discipline or discipline-only?
- Do tech artists exist (a key indicator of art-engineering collaboration maturity)?

#### 7. Knowledge Sharing
**Indicator of organisational resilience:**
- Are there single points of failure (one person who knows a critical system)?
- Is documentation current and accessible?
- Do people pair or share knowledge proactively?
- Could the team survive the departure of any one person without significant disruption?

---

## 7. Onboarding for Game Studios

### Week 1 Essentials

The goal of week 1 is: the new hire can build and run the game, knows who their team is, and has a small task to start contributing.

**Day 1 checklist:**
- Equipment set up (workstation, dev kit if applicable, peripherals)
- Accounts created: email, source control, JIRA, Slack/Teams, wiki/Confluence, build system
- Source control client installed and configured (Perforce/Git)
- Engine/IDE installed and configured
- Successfully build and run the game on their machine by end of day
- Meet their immediate team (pod/discipline)
- Receive the studio guide and new hire pack

**Week 1 tasks:**
- Tour of the codebase/asset structure (guided by their buddy/mentor)
- Tour of JIRA: how to find their work, update tickets, log bugs
- Read the GDD (at least the overview and their relevant system area)
- Attend all team ceremonies (standup, planning, review if timing aligns)
- Complete a small, well-defined first task (fix a simple bug, add a minor asset, tweak a value). Purpose: experience the full workflow from ticket to commit
- 1:1 with their manager to discuss expectations, working style, and first-month goals

### Month 1 Goals

- Understands the project holistically: what the game is, where it is in development, what the current priorities are
- Has completed 3-5 tasks of increasing complexity
- Has working relationships with their immediate team
- Understands the production workflow: how work flows from backlog to done
- Has attended a sprint review and retrospective
- Can navigate the codebase/asset library independently for standard tasks
- Has a development plan for their first quarter

### Quarter 1 Goals

- Full contributor: can take on standard tasks independently
- Understands cross-discipline dependencies (how their work connects to other disciplines)
- Has contributed to at least one feature that shipped to a build played by the team
- Has received and incorporated feedback from their lead/mentor
- Understands the studio's quality standards and can self-evaluate against them

---

## 8. Studio Culture

### What Makes Great Game Studios Great

**Creative ownership:** People at every level feel their contributions matter. An environment artist who takes pride in a specific area of the world. An engineer who owns a system and cares about its elegance. A designer who can see their ideas in the game. When people feel ownership, quality rises and attrition falls.

**Psychological safety:** People can say "this isn't fun," "I'm struggling," or "I think we should cut this feature" without fear. Studios where honest feedback is punished (even subtly) develop a culture where problems are hidden until they become crises.

**Sustainable pace:** The studios that produce the best games over time are not the ones that crunch hardest. They are the ones that maintain consistent productivity without burning out their teams. Crunch is sometimes necessary (cert deadlines, launch emergencies), but chronic crunch is a management failure, not a badge of honour.

**Knowledge sharing:** Great studios have a culture of sharing knowledge: tech talks, post-mortems, documentation, pair programming, art reviews. This builds collective capability and reduces single points of failure.

**Playtest culture:** Studios that playtest frequently (weekly, or even daily for core loop) make better games. Playtesting is not QA -- it is the whole team playing the game and providing honest feedback about the experience.

### What Kills Creative Teams

**Crunch culture normalised as "passion."** When overtime is expected and leaving on time is seen as lacking commitment, the studio selects for people willing to sacrifice their health. These people burn out and leave. The studio is left with a revolving door of exhausted developers.

**Unclear creative direction.** When the creative director (or game director, or studio head) cannot articulate what the game is, or changes direction frequently, the team builds and rebuilds the same things. Morale collapses because work feels pointless.

**Siloed disciplines.** When art, design, and engineering do not communicate, features feel disconnected. The art is beautiful but does not serve gameplay. The mechanics are interesting but feel disconnected from the world. Silos produce technically impressive but experientially incoherent games.

**Hero culture.** When the studio depends on a few "heroes" who work 80-hour weeks and know everything, the studio is fragile. When (not if) those heroes leave, institutional knowledge walks out the door.

**Process for process's sake.** Over-processed studios -- where every decision requires a meeting, every change requires a document, every idea requires a proposal -- kill creative energy. Process should enable creativity, not constrain it. If a process is not helping the team make a better game, cut it.

---

## 9. Contractor and Outsourcing Strategy

### When to Outsource

**Good candidates for outsourcing:**
- **Asset production to clear specifications:** Environment props, foliage, modular building kits, generic NPCs -- anything where the style guide is locked, the specifications are precise, and quality can be objectively assessed
- **QA:** Regression testing, compatibility testing, localisation QA. Works when test plans are thorough and bug reporting standards are defined
- **Localisation:** Translation, audio recording for non-primary languages, LQA
- **Porting:** Bringing a game to a new platform when the internal team lacks platform expertise
- **Audio:** Foley, ambient soundscapes, music recording -- especially for one-time production bursts
- **Motion capture:** Studio rental and session management

**Risky candidates:**
- **Core gameplay engineering:** Requires too much project context and iteration speed. Outsourced engineers cannot attend standups, read the design intent, or debug issues collaboratively
- **Game design:** Design requires constant playtesting and iteration with the team. Outsourced designers are disconnected from the feedback loop
- **Hero character art:** Key characters that define the game's visual identity should be done in-house where art direction collaboration is constant

**Bad candidates:**
- **Creative direction:** Cannot be outsourced. Must be internal and integrated
- **Production management:** The producer needs deep team context. An outsourced producer is managing from the outside
- **Technical direction:** Architecture decisions require understanding the full system. Cannot be made by someone who sees only part of the codebase

### Co-Dev Studio Selection Criteria

| Criterion | Weight | Assessment Method |
|---|---|---|
| Portfolio quality (relevant genre/style) | High | Review completed work. Request engine-rendered examples, not just beauty shots |
| Communication capability | High | Trial period. Assess response time, clarity, willingness to ask questions |
| Time zone overlap | Medium | Minimum 4 hours overlap for daily sync. Less than 2 hours is unworkable for iterative work |
| Pipeline compatibility | High | Do they use the same engine? Same DCC tools? Can they deliver in your format? |
| Scale and availability | Medium | Can they commit the headcount you need for the duration you need? |
| Quality process | High | Do they have internal review before delivery? What is their revision process? |
| Cultural fit | Medium | Trial project to assess working style, communication norms, quality standards |
| Reference checks | High | Talk to previous clients. Ask about quality consistency, communication, and deadline adherence |

### Managing Outsource Quality

1. **Style guide:** Provide a comprehensive style guide with do/don't examples, in-engine screenshots, material specifications, polygon budgets, texture specifications. The more precise the specification, the better the output
2. **Review gates:** Define review points: first pass review (rough blockout), second pass review (detailed model before texturing), final review (complete asset). Catching problems early prevents wasted work
3. **Small test batch:** Before committing to a large order, commission 3-5 test assets. Evaluate quality, adherence to specifications, revision needs, and communication
4. **Feedback loops:** Establish a clear feedback process. Written feedback with visual markup. Limit revision rounds (typically 2-3). Define what constitutes "approved"
5. **Integration testing:** Assets look different in isolation versus in-engine alongside other assets. Test outsourced assets in-engine before approving

---

## 10. Compensation and Benefits

### Gaming Industry Salary Context

Gaming industry compensation has three key tensions:

1. **Games vs Tech:** Engineers, product managers, data scientists, and other roles that exist in both gaming and tech face a salary gap. Tech companies (FAANG, fintech, enterprise SaaS) typically pay 20-50% more for equivalent roles. Studios must compete on culture, creative mission, and lifestyle -- or match tech salaries for critical roles
2. **Creative roles have fewer alternatives:** Artists, designers, and audio professionals have fewer high-paying alternatives outside gaming. This means studios can pay less, but ethical studios recognise that underpaying creative talent leads to attrition and quality problems
3. **Geography matters enormously:** London salaries differ from Manchester. UK salaries differ from US. Remote work has compressed but not eliminated geographic differences. Studios must benchmark against their actual talent market, not global averages

### UK Salary Ranges by Role (2025-2026 indicative ranges, GBP)

**Note:** These are indicative ranges for the UK market. London commands a 10-20% premium. Ranges vary by studio size, funding, and game scope.

| Role | Junior | Mid | Senior | Lead | Director |
|---|---|---|---|---|---|
| Game Designer | 25-32K | 32-45K | 45-60K | 55-75K | 70-100K |
| Level Designer | 25-32K | 32-42K | 42-55K | 50-70K | -- |
| Systems Designer | 28-35K | 35-48K | 48-65K | 60-80K | -- |
| Programmer (Gameplay) | 30-40K | 40-55K | 55-75K | 70-95K | 85-120K |
| Programmer (Engine/Low-level) | 35-45K | 45-65K | 65-90K | 80-110K | 95-140K |
| 3D Artist (Environment) | 24-30K | 30-40K | 40-52K | 48-65K | 60-85K |
| 3D Artist (Character) | 25-32K | 32-42K | 42-55K | 50-70K | -- |
| Concept Artist | 25-32K | 32-42K | 42-55K | 50-70K | -- |
| Animator | 25-32K | 32-42K | 42-55K | 50-70K | 60-85K |
| Technical Artist | 30-38K | 38-50K | 50-70K | 65-90K | 80-110K |
| VFX Artist | 25-32K | 32-42K | 42-55K | 50-70K | -- |
| UI Artist | 24-30K | 30-38K | 38-50K | 45-60K | -- |
| Producer | 28-35K | 35-45K | 45-60K | 55-75K | 70-100K |
| QA Tester | 22-26K | 26-32K | 32-40K | 38-50K | 45-65K |
| Audio Designer | 25-32K | 32-42K | 42-55K | 50-70K | 60-85K |
| Community Manager | 24-30K | 30-38K | 38-48K | 45-60K | -- |

### Equity and Bonus Structures

**Publisher-owned studios:** Typically no equity. Bonuses tied to Metacritic scores, sales targets, or studio performance. Bonuses range from 5-20% of salary for ICs, 10-30% for leads and directors.

**Independent studios (VC-funded or bootstrapped):**
- Equity: Founders hold significant equity. Early employees may receive 0.1-2% depending on stage and seniority. Equity vests over 4 years with a 1-year cliff (standard)
- Profit sharing: Some indies share profits above a threshold. This can be highly motivating when a game succeeds
- Revenue bonuses: Tied to game sales milestones. More directly connected to team effort than Metacritic

**Benefits that matter to game developers:**
- Flexible working hours (not just "core hours" -- actual flexibility)
- Remote or hybrid work options (post-COVID expectation)
- Conference attendance budget (GDC, Develop, EGX, platform-specific events)
- Learning and development budget (courses, tools, software licences)
- Game library / platform access (consoles, games for research)
- Generous holiday (above UK statutory minimum of 28 days)
- Mental health support (increasingly important given industry burnout)
- No-crunch or managed-crunch policy (a genuine differentiator for recruitment)

### Competing with Tech

For roles where gaming competes directly with tech (engineers, data scientists, product managers):

**Where studios cannot compete:** Base salary at FAANG level. A senior gameplay programmer at a UK studio earning 75K is competing against a senior software engineer at a tech company earning 90-120K (or more with equity).

**Where studios can compete:**
- Mission: "You are building a game that millions of people will play" is more compelling than "you are optimising ad click-through rates" for people who care about games
- Creative environment: Working with artists, designers, and musicians in a creative environment
- Visible impact: Your code directly creates player experiences. You can see (and play) your work
- Culture: Smaller teams, less bureaucracy, more autonomy (if the studio is well run)
- Specialised challenge: Game engineering problems (real-time rendering, physics, AI, netcode) are genuinely harder and more interesting than many enterprise problems

**The compensation conversation:** Studios should be honest about the salary gap and transparent about what they offer instead. "We pay 20% less than Google, and here is exactly why people choose to work here" is more credible than pretending the gap does not exist.
