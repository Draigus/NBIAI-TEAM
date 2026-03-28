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
│   │   │   └── DevOps Agent (Sonnet)
│   │   ├── QA Lead Agent (Sonnet, Opus for final pass)
│   │   │   └── QA Engineer Agent (Sonnet)
│   │   └── UI/UX Lead Agent (Sonnet)
│   │       └── UI/UX Designer Agent (Sonnet)
│   ├── VP Product Agent (Opus)
│   ├── CMO / Head of BD Agent (Opus)
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
- **Direct reports:** Senior Engineer Agent, Engineer Agent, DevOps Agent
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
- **Direct reports:** None
- **Primary responsibilities:**
  - Owns the Playsage product roadmap and PRD
  - Prioritises features across the 10 core Playsage modules and SalarySage
  - Translates market research and client feedback into product requirements
- **Tools/systems:** PRD documents, decision logs, Claude Chat project files, competitive landscape research

---

### CMO / Head of BD Agent (Opus)

- **Model tier:** Opus
- **Reports to:** CEO Agent
- **Direct reports:** None
- **Primary responsibilities:**
  - Manages the client pipeline tracker and lead follow-ups
  - Drafts outreach emails, pitch materials, and BD collateral for Glen's review
  - Monitors LinkedIn, website leads, and referral sources (e.g. Jen MacLean network)
- **Tools/systems:** Outlook (NBI account), client leads app, LinkedIn, website CMS (Framer), email drafting

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
