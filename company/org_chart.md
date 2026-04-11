# NBI AI Agent Org Chart

Last updated: 2026-03-28

## Hierarchy

```
Glen Pryer (Board Operator / Human)
│
├── CEO Agent (Opus)
│   ├── COO Agent (Opus)
│   │   ├── Producer Agent (Sonnet)
│   │   └── Data Analyst Agent (Sonnet)
│   ├── CFO Agent (Opus)
│   ├── CTO Agent (Opus)
│   │   ├── VP Engineering Agent (Opus)
│   │   │   ├── Senior Engineer Agent (Sonnet)
│   │   │   ├── Engineer Agent (Sonnet)
│   │   │   ├── Data Engineer Agent (Sonnet)
│   │   │   └── DevOps Agent (Sonnet)
│   │   ├── QA Lead Agent (Sonnet, Opus for final pass)
│   │   │   └── QA Engineer Agent (Sonnet)
│   │   └── UI/UX Lead Agent (Sonnet)
│   │       └── UI/UX Designer Agent (Sonnet)
│   ├── VP Product Agent (Opus)
│   │   └── Technical Writer Agent (Sonnet)
│   ├── CMO / Head of BD Agent (Opus)
│   │   ├── Brand Manager Agent (Sonnet)
│   │   ├── Content Marketer Agent (Sonnet)
│   │   ├── Demand Generation Manager Agent (Sonnet)
│   │   └── Market Researcher Agent (Sonnet)
│   ├── General Counsel (Opus)
│   │   ├── Employment Lawyer Agent (Sonnet)
│   │   ├── IP and Trademark Lawyer Agent (Sonnet)
│   │   └── Commercial and Data Protection Lawyer Agent (Sonnet)
│   ├── Gaming Practice Lead (Opus)
│   │   ├── Game Economy and Monetisation Consultant (Sonnet)
│   │   ├── Live Operations Consultant (Sonnet)
│   │   ├── Production Consultant (Sonnet)
│   │   └── Studio Operations and Org Design Consultant (Sonnet)
│   └── Head of People Agent (Sonnet)
```

---

## Role Details

### Glen Pryer -- Board Operator (Human)

- **Model tier:** N/A (human)
- **Reports to:** Nobody. Glen is the owner and final authority
- **Direct reports:** CEO Agent
- **Primary responsibilities:**
  - Final approval on all external-facing actions (emails, commitments, spending)
  - Strategic direction and canon decision-making
  - Client relationship ownership
- **Tools/systems:** All NBI systems. Outlook, Teams, Slack, Telegram, WhatsApp, Claude Code, Claude Chat, QuickBooks, Framer, Google Calendar, Granola

---

### CEO Agent (Opus)

- **Model tier:** Opus
- **Reports to:** Glen Pryer (Board Operator)
- **Direct reports:** COO, CFO, CTO, VP Product, CMO / Head of BD, Head of People
- **Primary responsibilities:**
  - Orchestrates all agent activity and prioritisation
  - Translates Glen's strategic intent into delegated work packages
  - Escalates decisions and blockers to Glen
- **Tools/systems:** Brain file (read), all agent communication channels, task queue

---

### COO Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** Producer Agent, Data Analyst Agent
- **Primary responsibilities:**
  - Manages day-to-day operational workflows across clients and internal projects
  - Monitors deadlines, deliverables, and workload allocation
  - Coordinates cross-functional delivery (production, data, engineering)
- **Tools/systems:** Microsoft Teams, Slack (Couch Heroes), Telegram (Sarge Universe), client project trackers, scheduled task outputs

---

### Producer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** COO Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Tracks project milestones, sprints, and deliverable status
  - Prepares status reports and flags overdue items
  - Supports Kali Pryer's producer work with drafts and scheduling
- **Tools/systems:** Microsoft Teams, Slack, client project management tools, Excel/ClickUp

---

### Data Analyst Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** COO Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Processes and summarises data from client engagements and internal projects
  - Prepares analytical briefs and supporting materials for Glen
  - Supports the Lighthouse embedded team (Amir, Ruan, Stavros) with supplementary analysis
- **Tools/systems:** Excel, CSV processing, data visualisation tools, OneDrive

---

### CFO Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Tracks revenue, payroll costs, and financial targets
  - Prepares financial summaries and flags budget concerns
  - Supports Bryan Rasmussen (human CFO) with modelling and reporting
- **Tools/systems:** QuickBooks, Excel, financial models, OneDrive

---

### CTO Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** VP Engineering Agent, QA Lead Agent, UI/UX Lead Agent
- **Primary responsibilities:**
  - Owns technical architecture decisions for all NBI software (Playsage, SalarySage, website, internal tools)
  - Reviews and approves technical designs from engineering agents
  - Ensures alignment with locked tech stack decisions (Next.js, Supabase, Vercel, etc.)
- **Tools/systems:** Claude Code, GitHub/version control, CLAUDE.md project configs, Docker

---

### VP Engineering Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CTO Agent
- **Direct reports:** Senior Engineer Agent, Engineer Agent, Data Engineer Agent, DevOps Agent
- **Primary responsibilities:**
  - Manages the engineering backlog and assigns implementation tasks
  - Reviews code from engineer agents before QA
  - Owns build pipeline and deployment readiness
- **Tools/systems:** Claude Code, GitHub/version control, CI/CD pipelines

---

### Senior Engineer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** VP Engineering Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Implements complex features and architectural components
  - Writes production code for Playsage modules, SalarySage, and internal tools
  - Mentors Engineer Agent on codebase patterns
- **Tools/systems:** Claude Code, Next.js, Supabase, Tailwind CSS, shadcn/ui

---

### Engineer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** VP Engineering Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Implements features, bug fixes, and smaller scoped work items
  - Writes unit tests and integration tests
  - Documents code changes
- **Tools/systems:** Claude Code, Next.js, Supabase, Tailwind CSS, shadcn/ui

---

### Data Engineer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** VP Engineering Agent
- **Direct reports:** None
- **Collaborates closely with:** Data Analyst Agent (primary internal customer), Senior Engineer Agent (shared codebase), DevOps Agent (deployment and scheduling)
- **Primary responsibilities:**
  - Owns the data infrastructure layer: schemas, migrations, event pipelines, cost computation, budget enforcement, real-time broadcast, and aggregate query endpoints
  - Designs and maintains all data-layer tables (agent_executions, agent_heartbeats, activity_log, agent_budgets, model_pricing, pipeline_lead_stage_history)
  - Builds and maintains the execution metrics pipeline (token counting, cost computation, spend accumulation)
  - Implements budget enforcement (80% alerts, 100% hard stops, monthly resets)
  - Owns dashboard and finance aggregate query performance
  - Maintains event taxonomy documentation and schema reference
- **Tools/systems:** PostgreSQL, Drizzle ORM, Node.js/TypeScript, Fastify, node-cron, Claude Code, Git

---

### DevOps Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** VP Engineering Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Manages deployment pipelines, hosting, and infrastructure
  - Configures Vercel deployments, Docker Compose setups, and environment variables
  - Monitors build health and uptime
- **Tools/systems:** Vercel, Docker, CI/CD pipelines, environment configuration

---

### QA Lead Agent (Sonnet, Opus for final pass)

- **Model tier:** Sonnet (initial pass), Opus (final review pass)
- **Reports to:** CTO Agent
- **Direct reports:** QA Engineer Agent
- **Primary responsibilities:**
  - Defines test plans and acceptance criteria for all deliverables
  - Performs final quality review (Opus pass) before anything reaches Glen
  - Ensures Glen's quality standards are met: no hallucinations, no corner-cutting, no shallow work
- **Tools/systems:** Claude Code, test frameworks, browser preview tools

---

### QA Engineer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** QA Lead Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Executes test plans against implemented features
  - Logs defects and regressions with reproduction steps
  - Validates fixes before passing back to QA Lead
- **Tools/systems:** Claude Code, test frameworks, browser preview tools

---

### UI/UX Lead Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** CTO Agent
- **Direct reports:** UI/UX Designer Agent
- **Primary responsibilities:**
  - Owns the design system and visual standards (dark theme, electric blue accents, Orbitron font)
  - Reviews all user-facing interfaces for consistency and usability
  - Translates Glen's design preferences into actionable specs
- **Tools/systems:** Framer, HTML/CSS prototyping, Figma (if adopted), browser preview tools

---

### UI/UX Designer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** UI/UX Lead Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Creates wireframes, mockups, and UI component designs
  - Implements front-end styling and layout changes
  - Ensures responsive design and accessibility
- **Tools/systems:** Framer, HTML/CSS, Tailwind CSS, shadcn/ui, browser preview tools

---

### VP Product Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** Technical Writer Agent
- **Primary responsibilities:**
  - Owns the Playsage product roadmap and PRD
  - Prioritises features across the 10 core Playsage modules and SalarySage
  - Translates market research and client feedback into product requirements
- **Tools/systems:** PRD documents, decision logs, Claude Chat project files, competitive landscape research

---

### Technical Writer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** VP Product Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Converts ideas, decisions, and discussions into complete, unambiguous, engineer-ready documentation
  - Produces gap reports before any rewrites, identifying every missing, vague, or contradictory element
  - Completes the Playsage PRD to v1.3 standard (primary assignment)
  - Ensures terminology consistency across all product documentation
  - Copyedits all external documents: British English, no em dashes, studio-native language
- **Tools/systems:** Document drafting tools, PRD files, project knowledge files, OneDrive

---

### CMO / Head of BD Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** Brand Manager Agent, Content Marketer Agent, Demand Generation Manager Agent, Market Researcher Agent
- **Also owns directly:** BD pipeline management (lead tracking, outreach, deal progression, client follow-ups)
- **Primary responsibilities:**
  - Owns NBI's marketing strategy, brand positioning, and demand generation across both practice areas
  - Manages the client pipeline tracker and lead follow-ups (BD function, retained directly)
  - Sets marketing direction and briefs for the four IC reports
  - Runs close-loop corrective action on all marketing output (8/10 minimum quality bar)
  - Actively challenges C-suite peers on positioning, messaging, and market assumptions
  - Drafts outreach emails, pitch materials, and BD collateral for Glen's review
  - Coordinates with VP Product on Playsage go-to-market strategy
- **Tools/systems:** Outlook (NBI account), client leads app, LinkedIn, website CMS (Framer), email drafting, market research tools

---

### Brand Manager Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** CMO / Head of BD Agent
- **Direct reports:** None
- **Collaborates closely with:** UI/UX Lead (design system), Content Marketer (content within brand guidelines)
- **Primary responsibilities:**
  - Owns NBI/PlaySage brand guidelines, messaging framework, and positioning documents
  - Maintains voice and tone standards for all external communications
  - Manages website copy and service page messaging
  - Ensures brand consistency across all touchpoints (website, LinkedIn, pitch materials, email signatures)
  - Owns the NBI-to-PlaySage brand transition when trademark/domain are confirmed
- **Tools/systems:** Brand guidelines documents, website CMS (Framer), style guides

---

### Content Marketer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** CMO / Head of BD Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Produces case studies from NBI's 200+ project history (currently zero exist -- critical gap)
  - Creates LinkedIn content strategy and posts for NBI's company page
  - Writes thought leadership articles leveraging Glen's and Tom's expertise
  - Produces pitch deck narratives and marketing collateral copy
  - All content must align with Brand Manager's guidelines and positioning
- **Tools/systems:** LinkedIn, content calendar, document drafting tools, OneDrive

---

### Demand Generation Manager Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** CMO / Head of BD Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Owns inbound marketing strategy and lead nurturing funnels
  - Manages event follow-up campaigns (GDC, industry conferences)
  - Develops SEO/SEM strategy for nbi-consulting.com and Playsage
  - Builds email marketing campaigns for prospect engagement
  - Tracks marketing-attributed pipeline contribution
- **Tools/systems:** Client leads app, email marketing tools, SEO tools, analytics, LinkedIn

---

### Market Researcher Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** CMO / Head of BD Agent
- **Direct reports:** None
- **Scope boundary:** Market-level intelligence only. VP Product owns product-level competitive analysis (feature comparisons, roadmap intelligence)
- **Primary responsibilities:**
  - Produces market sizing and TAM/SAM analysis for Playsage investor materials
  - Tracks industry trends, studio funding rounds, layoffs, and expansions
  - Analyses competitor marketing positioning (how rivals position, not what they build)
  - Researches prospective clients and their public pain points
  - Develops event strategy recommendations (conferences, speaking opportunities for Glen)
- **Tools/systems:** Industry databases, web research, gaming industry publications, conference directories

---

### General Counsel (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** Employment Lawyer Agent, IP and Trademark Lawyer Agent, Commercial and Data Protection Lawyer Agent
- **Also owns directly:** Corporate/company law (entity governance, investment documentation, NSI wind-down, PlaySage USA LLC formation)
- **Primary responsibilities:**
  - Strategic legal leadership across all areas for NBI
  - Directly handles corporate/company law matters (entity governance, shareholder agreements, investment docs for Playsage $10M raise)
  - Reviews and approves all legal output from the three specialist lawyers
  - Advises C-suite on legal risk across all decisions
  - Manages the NSI wind-down legal requirements
  - Runs close-loop corrective action on all legal output (8/10 minimum quality bar)
  - Ensures all binding documents go through human solicitor review before signature
- **Tools/systems:** Legal document drafting, Companies House filings, contract management, OneDrive
- **Critical constraint:** AI legal team drafts and advises. A qualified human solicitor must validate all binding documents before signature. This is a non-negotiable safety gate

---

### Employment Lawyer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** General Counsel
- **Direct reports:** None
- **Collaborates closely with:** Head of People Agent (HR compliance), CFO Agent (payroll and employment cost implications)
- **Primary responsibilities:**
  - UK employment law compliance (Employment Rights Act 1996, Equality Act 2010, Working Time Regulations)
  - Contracts of employment, offer letters, termination procedures
  - IR35 assessment for contractor engagements
  - Right to work verification guidance
  - TUPE compliance if business transfers occur
  - Holiday entitlement, notice periods, probation, redundancy procedures
  - Supports the NSI-to-NBI staff transition with employment law guidance
- **Tools/systems:** Legal document drafting, UK legislation reference, HMRC guidance, ACAS codes of practice
- **UK focus:** This role is scoped to UK employment law. US employment matters are flagged to the General Counsel

---

### IP and Trademark Lawyer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** General Counsel
- **Direct reports:** None
- **Collaborates closely with:** Brand Manager Agent (trademark usage), CTO Agent (software IP), VP Product Agent (product IP strategy)
- **Primary responsibilities:**
  - PlaySage trademark registration and monitoring (UK IPO, potentially Madrid Protocol for international)
  - Software IP protection for Playsage, SalarySage, and NBIAI App
  - Client deliverable IP ownership clauses in engagement agreements
  - Open source licensing compliance across the engineering codebase
  - Trade secrets protection (NBI's proprietary methodologies, Tom Rieger's frameworks)
  - Patent assessment for novel technologies (Cascade Engine, The Sage recommendation methodology)
- **Tools/systems:** UK IPO database, trademark monitoring tools, legal document drafting, open source license databases

---

### Commercial and Data Protection Lawyer Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** General Counsel
- **Direct reports:** None
- **Collaborates closely with:** CMO/Head of BD Agent (client contracts), CTO Agent (technical data protection), DevOps Agent (data infrastructure compliance)
- **Primary responsibilities:**
  - Client engagement agreements, statements of work, NDAs for all NBI client relationships
  - Subcontractor agreements and vendor terms
  - GDPR compliance framework (UK GDPR, data controller/processor obligations)
  - Data processing agreements (DPAs) as annexes to Playsage client contracts
  - Privacy policies for Playsage platform and NBI website
  - Data subject rights procedures (access, deletion, portability)
  - Breach notification legal requirements (ICO, 72-hour obligation)
  - Cookie policies and consent mechanisms
- **Tools/systems:** Legal document drafting, ICO guidance, contract management, GDPR compliance tools

---

### Head of People Agent (Sonnet)

- **Model tier:** Sonnet
- **Reports to:** CEO Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Supports hiring workflows (job descriptions, interview scheduling, onboarding materials)
  - Tracks team directory and staffing changes across both practices
  - Assists Patrice (human HR Advisor) with administrative coordination
- **Tools/systems:** Outlook, Teams, Excel, hiring artifact templates, OneDrive
