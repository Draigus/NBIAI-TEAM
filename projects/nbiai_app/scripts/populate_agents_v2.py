"""Populate all 32 Paperclip agents with capabilities (descriptions), title fixes, and skill wiring."""
import json, requests

BASE = "http://localhost:3100/api"
COMPANY = "359ab370-c36f-4558-a252-637255ad1a7b"

# Load skill name -> ID mapping
with open("/tmp/skill_ids.json") as f:
    SKILL_MAP = json.load(f)

def skill_ids(names):
    """Convert comma-separated skill names to list of UUIDs."""
    ids = []
    for name in names.split(","):
        name = name.strip()
        if name and name in SKILL_MAP:
            ids.append(SKILL_MAP[name])
        elif name:
            print(f"  WARNING: skill '{name}' not found in registry")
    return ids

# Agent configs: agent_id -> {capabilities, title (optional), skills (comma-sep names)}
CONFIGS = {
    # CEO
    "f35ca020-cb28-4ec0-8f7b-37d236dcfd04": {
        "capabilities": "Strategic orchestrator. Translates Glen's goals into work packages, delegates to department heads, monitors progress, resolves cross-functional conflicts.",
        "title": "Chief Executive Officer",
        "skills": "paperclip,company-research,product-strategy-session,roadmap-planning,meeting-prep",
    },
    # CFO
    "b3bd8f33-8027-4124-83c2-baa5158a3968": {
        "capabilities": "Financial intelligence engine. Tracks revenue, costs, models scenarios, flags budget risks. Supports Bryan Rasmussen (human CFO).",
        "skills": "financial-modelling,finance-metrics-quickref,finance-based-pricing-advisor,saas-economics-efficiency-metrics,saas-revenue-growth-metrics",
    },
    # CMO / Head of BD
    "acfc9b17-a92b-472f-be62-ab2e9b18caf4": {
        "capabilities": "Owns marketing strategy, brand positioning, demand generation, and BD pipeline management. Leads Brand Manager, Content Marketer, Demand Gen, Market Researcher.",
        "skills": "cold-email,content-strategy,marketing-ideas,marketing-psychology,positioning-statement,positioning-workshop,competitive-intel,client-onboarding,lead-magnets,sales-enablement,social-content,press-release",
    },
    # COO
    "4626f3be-6300-4079-a918-6751758375be": {
        "capabilities": "Operational engine. Tracks all client and internal deliverables, monitors deadlines, coordinates cross-functional delivery. Leads Producer and Data Analyst.",
        "skills": "roadmap-planning,meeting-prep,client-onboarding,prioritization-advisor",
    },
    # CTO
    "930bd58f-38e7-4354-9401-9ab2a3188d1b": {
        "capabilities": "Technical authority across all NBI products. Architects, reviews, governs. Leads VP Engineering, QA Lead, UI/UX Lead.",
        "skills": "supabase-postgres-best-practices,deploy-to-vercel,prd-development,roadmap-planning,product-strategy-session",
    },
    # VP Engineering
    "24fdf047-e82c-49df-b182-64496912bf7f": {
        "capabilities": "Engineering execution leader. Manages sprints, code reviews, deployment readiness. Leads Senior Engineer, Engineer, Data Engineer, DevOps.",
        "skills": "epic-breakdown-advisor,epic-hypothesis,user-story,user-story-mapping,user-story-splitting,roadmap-planning,supabase-postgres-best-practices",
    },
    # VP Product
    "83634d5d-0f93-4298-b251-9d7f2dfc5277": {
        "capabilities": "Owns Playsage product roadmap and PRD. PM review gate ensuring quality bar. Leads Technical Writer.",
        "skills": "prd-development,product-strategy-session,roadmap-planning,feature-investment-advisor,prioritization-advisor,jobs-to-be-done,opportunity-solution-tree,user-story-mapping,problem-framing-canvas,recommendation-canvas",
    },
    # Head of People
    "a57c5a62-b762-467a-bfe2-ae401be1223c": {
        "capabilities": "Supports hiring workflows, team directory, and HR coordination. Assists Patrice (human HR Advisor).",
        "skills": "executive-onboarding-playbook,meeting-prep",
    },
    # Producer
    "a958d514-7123-4825-9961-65e9aeaa1aa0": {
        "capabilities": "Tracks project milestones, sprints, deliverable status. Prepares status reports, flags overdue items. Supports Kali Pryer.",
        "skills": "roadmap-planning,meeting-prep,prioritization-advisor",
    },
    # Data Analyst
    "760dc04c-97a0-4245-971a-b8fc1dc215c5": {
        "capabilities": "Processes client and internal data. Prepares analytical briefs. Supports Lighthouse embedded team with supplementary analysis.",
        "skills": "analytics-tracking,ab-test-setup,customer-research",
    },
    # DevOps
    "0a21f694-16ea-4112-9d82-6e31915b64df": {
        "capabilities": "Manages deployment pipelines, hosting, infrastructure. Configures Vercel, Docker, CI/CD, environment variables.",
        "skills": "deploy-to-vercel,vercel-cli-with-tokens,vercel-composition-patterns",
    },
    # Content Marketer
    "4e82246e-985c-4533-b042-f3e76b9cf91b": {
        "capabilities": "Produces case studies, LinkedIn content, thought leadership articles, pitch deck narratives. Follows brand guidelines.",
        "skills": "content-strategy,copywriting,copy-editing,social-content,press-release,email-sequence,marketing-ideas",
    },
    # General Counsel
    "effaa7fd-0b22-40c4-935b-4f5e659a092d": {
        "capabilities": "Strategic legal leadership. Corporate/company law, entity governance, investment docs. Leads Employment, IP, and Commercial lawyers.",
        "skills": "contract-review,uk-company-setup",
    },
    # QA Lead
    "2bc20d9f-78fa-4e08-a066-3a338bb2767f": {
        "capabilities": "Quality gate for all NBI deliverables. Defines test strategy, manages QA Engineer, conducts Opus-tier final QA pass.",
        "skills": "prd-development",
    },
    # Commercial and Data Protection Lawyer
    "d86fc08a-364e-4595-ab1f-1defa13b5328": {
        "capabilities": "Client engagement agreements, SOWs, NDAs, GDPR compliance, data processing agreements, privacy policies.",
        "skills": "contract-review",
    },
    # Senior Engineer
    "5d5fd790-28c4-498f-b9d1-c85fa19b361b": {
        "capabilities": "Most technically capable IC. Implements complex features, sets quality bar, reviews all Engineer PRs. Playsage and SalarySage.",
        "skills": "supabase-postgres-best-practices,vercel-react-best-practices,vercel-composition-patterns,deploy-to-vercel",
    },
    # Engineer
    "d1ee7177-b93e-4f7f-86ae-ced4ba8db5b6": {
        "capabilities": "Implements features, bug fixes, unit tests, integration tests. Works in Claude Code on Playsage and SalarySage.",
        "skills": "supabase-postgres-best-practices,vercel-react-best-practices,user-story",
    },
    # Data Engineer
    "5135b891-4409-491e-b7f3-87d072628125": {
        "capabilities": "Owns data infrastructure: schemas, migrations, event pipelines, cost computation, budget enforcement, aggregate queries.",
        "skills": "supabase-postgres-best-practices,analytics-tracking",
    },
    # IP and Trademark Lawyer
    "ed313f0d-7230-4e28-8f49-38ab05dd1248": {
        "capabilities": "PlaySage trademark registration, software IP protection, open source licensing compliance, patent assessment.",
        "skills": "contract-review",
    },
    # Game Economy and Monetisation Consultant
    "530ecb80-fcec-4465-8a46-ee179abd0917": {
        "capabilities": "F2P economy design, IAP pricing, virtual currency balancing, monetisation strategy. Gaming industry specialist.",
        "skills": "financial-modelling,competitive-intel,pricing-strategy,finance-based-pricing-advisor",
    },
    # QA Engineer
    "cd03e646-7705-44c2-bbb1-af075a067993": {
        "capabilities": "Executes test plans, logs defects with reproduction steps, validates fixes before passing to QA Lead.",
        "skills": "",
    },
    # Technical Writer
    "bea52952-e29b-4f78-ab2d-6e190de85ed1": {
        "capabilities": "Makes documents complete, unambiguous, engineer-ready. Primary assignment: Playsage PRD v1.3 completion.",
        "skills": "prd-development,copy-editing",
    },
    # Demand Generation Manager
    "a6943d0d-a08a-4367-a7df-4f7ecaad6fbc": {
        "capabilities": "Inbound marketing, lead nurturing, event follow-up campaigns, SEO/SEM strategy, email marketing.",
        "skills": "lead-magnets,email-sequence,cold-email,paid-ads,programmatic-seo,seo-audit,marketing-ideas,form-cro,page-cro,signup-flow-cro,popup-cro,onboarding-cro",
    },
    # Market Researcher
    "64f7ab61-1b40-4b56-97b8-b9ceb7ca3432": {
        "capabilities": "Market sizing, TAM/SAM analysis, industry trend tracking, competitor positioning analysis, prospect research.",
        "skills": "company-research,competitive-intel,customer-research,tam-sam-som-calculator,pestel-analysis,discovery-process,discovery-interview-prep",
    },
    # Studio Operations and Org Design Consultant
    "17a09078-916f-43c7-bdc0-6019aeead6d4": {
        "capabilities": "Game studio organisational design, team structure, role definitions, hiring frameworks, operational processes.",
        "skills": "executive-onboarding-playbook,workshop-facilitation,uk-company-setup",
    },
    # UI/UX Lead
    "cad57b4a-ab73-46fd-b6be-740c5a096713": {
        "capabilities": "Owns design system and visual standards. Reviews all interfaces for consistency and usability. Dark theme, electric blue.",
        "skills": "web-design-guidelines,lean-ux-canvas,storyboard,customer-journey-map",
    },
    # UI/UX Designer
    "9a524d2d-9839-49ec-8268-182f6ea49e4a": {
        "capabilities": "Creates wireframes, mockups, UI components. Implements front-end styling. Responsive design and accessibility.",
        "skills": "web-design-guidelines,storyboard",
    },
    # Brand Manager
    "99804384-56b9-4e50-9555-18a390c492c2": {
        "capabilities": "Owns NBI/PlaySage brand guidelines, messaging framework, positioning. Manages website copy and brand transition.",
        "skills": "positioning-statement,positioning-workshop,copywriting,copy-editing,web-design-guidelines",
    },
    # Employment Lawyer
    "6613dc60-a2ec-4d53-ac48-5c6161a02233": {
        "capabilities": "UK employment law compliance, contracts, IR35, right to work, TUPE, holiday entitlement, redundancy procedures.",
        "skills": "uk-company-setup,contract-review",
    },
    # Live Operations Consultant
    "b580171a-80fc-434e-9253-e5857c0e86ad": {
        "capabilities": "Live service architecture, event planning, retention strategy, content cadence, player engagement. Gaming specialist.",
        "skills": "churn-prevention,competitive-intel,ab-test-setup",
    },
    # Gaming Practice Lead
    "b3edfbc3-2eb1-4228-a128-5ce3c5f149b1": {
        "capabilities": "Leads NBI's gaming consulting practice. Game economy, live ops, production, studio operations. Domain authority.",
        "skills": "competitive-intel,financial-modelling,pitch-deck,client-onboarding,meeting-prep,pricing-strategy",
    },
    # Production Consultant
    "31d9cd75-68ed-4ee3-a5e5-0181f24bca6a": {
        "capabilities": "Game production methodology, milestone planning, sprint frameworks, stakeholder reporting, pipeline audits.",
        "skills": "roadmap-planning,prioritization-advisor,epic-breakdown-advisor,workshop-facilitation",
    },
}

def main():
    success = 0
    failed = 0

    for agent_id, config in CONFIGS.items():
        payload = {"capabilities": config["capabilities"]}

        if "title" in config:
            payload["title"] = config["title"]

        skills_str = config.get("skills", "")
        if skills_str:
            ids = skill_ids(skills_str)
            if ids:
                payload["desiredSkills"] = ids

        resp = requests.patch(f"{BASE}/agents/{agent_id}", json=payload, timeout=10)

        if resp.ok:
            data = resp.json()
            name = data.get("name", "?")
            print(f"OK  {name:45s} | caps set | skills wired")
            success += 1
        else:
            # Try to identify agent
            print(f"ERR {agent_id[:12]}... | status:{resp.status_code} | {resp.text[:120]}")
            failed += 1

    print(f"\nDone. {success} succeeded, {failed} failed.")


if __name__ == "__main__":
    main()
