---
last_verified: 2026-06-23
---

# AI Operations — Service Capability

**Last Updated:** 2026-06-23

---

## What NBI Has Built

NBI runs on an LLM Operating System. Not as a metaphor. As literal architecture.

Andrej Karpathy's framework describes the emerging shape of LLM-native software: a central model acts as the kernel, with persistent memory, tool integrations, system calls, and specialised processing units layered around it. NBI has built exactly this, tailored to a gaming advisory firm.

**The Brain (long-term memory).** `NBI_Brain.md` plus 15 extended modules in `brain/`. Persistent institutional knowledge that loads at the start of every working session: client details, engagement terms, contact networks, commercial positions, strategic decisions, career context. The Brain is not a knowledge base that sits on a shelf. It is active working memory, updated in real time as business state changes. Nothing is repeated across sessions because nothing is forgotten.

**13-Role Agent Team (system calls).** Role definitions in `roles/` acting as depth-skill assets (reduced from 33 when Paperclip orchestration was archived June 2026; 19 skeleton roles archived, 13 active AGENT.md composites retained). Game Economy Consultant, Production Consultant, Gaming Practice Lead, Data Analysts, QA Lead, General Counsel, CMO, and others. Each role carries its own persona, responsibilities, decision authority, and domain knowledge base. When a question requires economy design expertise, the system calls on economy design knowledge. When it requires production planning, it calls on production knowledge. The roles are not chatbots. They are structured expertise that the central model draws on for domain-specific depth.

**Skills System (tool integrations).** Custom Claude Code skills in `.claude/skills/`. `/gi` routes game investment analysis through the AERM framework with 8 reference files. `/compile-client` compiles raw client documents into structured, provenance-tagged knowledge bases. `/autoresearch` runs autonomous quality iteration loops, scoring documents against weighted criteria and making atomic improvements until convergence. `/games` routes to specialised game development sub-skills. These are not prompt templates. They are repeatable, testable workflows with defined inputs, outputs, and error handling.

**Session Continuity (crash recovery).** Append-only session logging after every substantive exchange. Live state files tracking decisions, completed work, pending tasks, and conversation context. Structured handoffs at session boundaries. Context is never lost, even across model resets or session boundaries. The system writes to disk in real time so that continuity is mechanical, not dependent on memory.

**Approval Gates (permissions).** Internal research, document drafting, architecture proposals, and cross-agent task requests proceed automatically. External communications, client-facing deliverables, financial decisions, and anything that commits NBI externally requires Glen's sign-off. Quality control is built into the workflow, not bolted on after the fact.

**Model Tier Routing (resource allocation).** Opus for strategic decisions, quality gates, and leadership-tier work. Sonnet for implementation, analysis, and individual contributor tasks. Haiku for routine extraction, formatting, and status checks. Cost and quality optimised per task type. The routing is explicit: a model tier strategy table maps roles to models, ensuring the right capability is applied to the right work.

The result: Claude is the kernel. The Brain is persistent storage. Skills are system calls. The agent team provides domain-specific processing units. Approval gates enforce permissions. Model routing optimises resource allocation. It is a complete operating system for a consulting firm.

---

## Internal Impact

This is not theoretical. Here is what the architecture produces in practice.

**Goals Studio engagement.** A $10K price elasticity and live service engagement with a Stockholm-based studio. 21 tasks across 5 features, scoped at 116 hours, delivered against a hard 27 April platform certification deadline. Three output formats produced in parallel: Excel project tracker (6 sheets, 43-row WorkSage-compatible hierarchy), Word task guide (21 task breakdowns with acceptance criteria), and live WorkSage project data. Three-way alignment verified automatically: 21/21 tasks matched across all three outputs, hours summed correctly, deadlines consistent, no stale references. A single consultant (Glen) with AI backing delivered what would normally require a project manager, an analyst, and a document specialist.

**Competitive research pipelines.** Multi-source competitive analysis with structured extraction, cross-referencing, and red-team validation. The Goals engagement included automated competitive monetisation research across 8 comparable titles, with findings synthesised into actionable pricing recommendations. Red-team scoring identified weaknesses before delivery.

**Automated document generation.** Python scripts generating formatted Excel workbooks and Word documents from structured plans. Not templates filled with placeholders, but generated outputs cross-checked against source plans. When the deadline moved from 28 April to 27 April, correction propagated across 7 files, 3 output formats, and the live database in a single session.

**Bug triage pipeline.** A 7-step mandatory workflow enforced through project configuration: receive, review, plan, prioritise, fix, test, update. Every bug follows the same path regardless of who reported it or how it arrived. Consistency is structural, not dependent on individual discipline. The WorkSage dashboard itself was built this way: 870 tests across 90 test files, continuous delivery through PM2, Cloudflare Tunnel for public access.

**Daily operational intelligence.** The Command Centre aggregates 8 data sources into a single operational view: calendar, task queue, bugs, knowledge health, session state, team activity, client status, and decision log. Not a static dashboard. An intelligence layer that surfaces what needs attention.

The headline: a 7-person firm delivering at the depth and consistency of a team three to four times the size. Not through overwork. Through architectural leverage.

---

## Client Service: AI Operations Setup

What NBI offers to game studios wanting the same capability.

### What We Build

**Studio Brain.** Persistent institutional knowledge, compiled and structured. Game design philosophy, technical architecture decisions, team working preferences, market positioning, competitive intelligence. All provenance-tagged to source documents. Survives employee turnover. New team members load the Brain instead of spending months absorbing tribal knowledge.

**Role-specific knowledge bases.** What your lead economy designer knows about sink/faucet balance. What your live ops team assumes about event cadence. What production has decided about milestone gates. Captured, structured, and queryable. Not buried in Confluence pages nobody reads.

**Workflow automation.** Repetitive processes handled systematically with human checkpoints at decision points. Sprint reporting, competitive monitoring, metrics reviews, post-mortem analysis. The AI handles the volume and consistency. Humans handle the judgement calls.

**Approval gates.** Calibrated to the studio's risk tolerance. What proceeds automatically (internal analysis, draft documents, routine monitoring). What stops for human review (client-facing output, financial commitments, strategic changes). The gates are configurable, not binary.

**Quality loops.** Documents, models, and analyses scored against explicit criteria and improved iteratively before they reach stakeholders. Design documents scored on specificity, evidence quality, actionability, and domain accuracy. Pricing models scored on internal consistency, benchmark grounding, and scenario coverage. The scoring is harsh, the improvements are atomic, and the result is measurably better output.

### What the Client Gets

- Institutional knowledge that persists beyond any individual employee
- Consistent quality on routine deliverables regardless of who is in the room
- Reduced dependency on key individuals for day-to-day operational decisions
- A system that compounds: knowledge grows, quality loops improve, workflows get tighter
- Faster onboarding for new hires (context is compiled and structured, not tribal and scattered)
- Audit trail on decisions (what was decided, when, by whom, and why)

---

## Client Service: Continuous Intelligence

The alternative to project-based consulting. A subscription model where NBI's AI layer runs continuously alongside the studio's operations.

### How It Works

NBI's intelligence layer monitors the studio's operating environment: market data, competitor releases, app store movements, community sentiment, internal metrics against benchmarks, live ops event performance. Automated weekly intelligence briefs surface what changed, what matters, and what to do about it.

Human consultants step in for judgement calls. Strategic pivots, sensitive client-facing recommendations, cross-domain synthesis that requires twenty years of pattern recognition. Monthly strategic reviews combine automated intelligence with human insight.

### Value Proposition

Always-on advisory at a fraction of the cost of a full-time strategic hire. The AI handles volume, consistency, and monitoring. NBI's humans handle judgement, relationships, and the work that requires someone who has actually shipped a live service game.

### Compared to Project-Based Work

Projects end. Knowledge leaves. The engagement delivers value, but the capability does not persist.

Continuous intelligence compounds. Every month the system knows more about the studio's game, its market, and its team. The weekly briefs get more relevant. The benchmarks get more calibrated. The anomaly detection gets sharper. Six months in, the system has institutional memory that no new hire could match.

---

## Positioning Against Big Four AI Consulting

### What the Large Firms Are Doing

The major consulting and technology firms are investing heavily in agentic AI capabilities.

**Sia Partners:** 800+ AI agents deployed across 19 countries. Generalist coverage: finance, energy, public sector, healthcare, retail. The breadth is impressive. The depth in any single vertical is necessarily shallow.

**McKinsey:** 20,000 AI agents working alongside 40,000 human consultants. The sheer scale is the message. But scale optimises for coverage, not for knowing what a healthy D7 retention curve looks like in a competitive mobile shooter.

**Cognizant:** 1,000 "context engineers" building enterprise AI infrastructure through their ContextFabric platform. Infrastructure-focused. The plumbing is excellent. The domain knowledge is generic.

**Google Cloud:** $750M committed to accelerate partners' agentic AI adoption. A platform play. Powerful tooling, no industry-specific knowledge.

### NBI's Advantage Is Depth, Not Scale

**Gaming-native.** Built by people who shipped games at Blizzard, Xbox, EA, Mojang, Jagex, and Build A Rocket Boy. The agent team's knowledge bases contain actual game economy models, live ops playbooks, and production frameworks. Not "best practices for digital entertainment" repackaged from a cross-industry study.

**Practitioner architecture.** When the Goals Studio engagement needed price elasticity analysis, the system drew on economy design knowledge that knows the difference between a hard currency anchor and a soft currency sink. When Couch Heroes needed production support, it drew on production knowledge calibrated to AA game development cycles. The depth is structural, not superficial.

**Context engineering by example.** NBI's own Brain is the proof of concept. 15 extended modules covering clients, career history, products, tools, people, brand, decisions, financial resilience, and AI operations. Not a pitch deck describing what could be built. A working system that runs the business every day.

**Custom per studio.** Every setup is tailored to the studio's genre, platform, development stage, and team structure. A mobile F2P studio in Helsinki gets different knowledge architecture from a premium PC studio in Montreal. The system adapts to the studio. The studio does not adapt to the system.

### Where the Big Firms Struggle

**Cultural resistance.** The partner-led consulting model does not map cleanly to agent-directed workflows. Partners sell relationships and hours. AI operations sells capability transfer. The incentive structures conflict.

**Generic knowledge.** Their AI knows "consulting" and "digital transformation." It does not know that your gem economy has an inflation problem because your daily login reward is too generous relative to your sink design. Domain depth cannot be bolted on after deployment.

**Scale over depth.** 20,000 agents doing shallow work across every industry is a different product from focused agents doing deep work on one domain. Both have value. They serve different needs. Studios that need gaming-specific depth will not get it from a generalist platform, regardless of scale.

---

## Pricing Framework

*Ranges to be confirmed by Glen. The following is directional.*

**AI Operations Setup** (one-time engagement). Initial audit of current knowledge landscape, Brain architecture design and population, role-specific knowledge base construction, workflow automation, quality loop configuration. Scoped per studio complexity: team size, number of live titles, existing documentation state.

**Continuous Intelligence** (monthly retainer). Ongoing market monitoring, automated weekly intelligence briefs, human consultant availability for judgement calls, quarterly strategic reviews with senior NBI staff.

**Likely positioning.** Between NBI's Medium engagement size (approximately GBP 150K) and Large engagement size (GBP 300-400K/year). The setup phase is a project engagement. Continuous intelligence is a retainer. Studios can take the setup without the retainer if they want to run the system themselves.

---

## When to Propose This

Trigger conditions for including AI operations in a client conversation:

- **Client asks about AI integration** in their studio operations or workflows
- **Engagement is ending** and the client wants to retain capability rather than lose it when NBI steps back
- **Knowledge loss is a pain point:** the client has experienced key people leaving and taking institutional knowledge with them
- **Rapid scaling:** the studio is growing fast and needs consistency across a team that is doubling or tripling
- **Live service operations:** the client is running or launching a live service and needs always-on market and performance intelligence
- **Fractional C-level engagement:** NBI is providing strategic leadership and wants to leave lasting capability rather than creating dependency
- **Post-mortem situation:** the client has been through a failed launch or missed targets and needs systematic processes to prevent recurrence

---

## Productised Offering: Studio Brain Sprint

Fixed-price engagement (GBP 15-25K, 2-3 weeks) that packages NBI's internal AI knowledge architecture as a client deliverable. See projects/studio_brain_sprint/engagement_template.md for full scope, pricing, and methodology.

Key positioning: NBI built and operates this system internally (300+ line Brain, 15 extended modules, 13 role knowledge assets, intelligence pipeline with 7 banks). The Studio Brain Sprint applies the same methodology to a client studio. This is not theoretical. It is a proven, operating system delivered as a consulting engagement.

Added: 2026-06-09
