"""Populate all 32 Paperclip agents with descriptions, instructions, managers, and skills."""
import json, os, requests, time

BASE = "http://localhost:3100/api"
COMPANY = "359ab370-c36f-4558-a252-637255ad1a7b"
ROLES_DIR = r"D:\OneDrive\Claude_code\NBIAI_TEAM\roles"

# Agent ID mapping
AGENTS = {
    "CEO": "f35ca020-cb28-4ec0-8f7b-37d236dcfd04",
    "CFO": "b3bd8f33-8027-4124-83c2-baa5158a3968",
    "CMO": "acfc9b17-a92b-472f-be62-ab2e9b18caf4",
    "COO": "4626f3be-6300-4079-a918-6751758375be",
    "CTO": "930bd58f-38e7-4354-9401-9ab2a3188d1b",
    "VP_ENG": "24fdf047-e82c-49df-b182-64496912bf7f",
    "VP_PROD": "83634d5d-0f93-4298-b251-9d7f2dfc5277",
    "HEAD_PEOPLE": "a57c5a62-b762-467a-bfe2-ae401be1223c",
    "PRODUCER": "a958d514-7123-4825-9961-65e9aeaa1aa0",
    "DATA_ANALYST": "760dc04c-97a0-4245-971a-b8fc1dc215c5",
    "DEVOPS": "0a21f694-16ea-4112-9d82-6e31915b64df",
    "CONTENT_MARKETER": "4e82246e-985c-4533-b042-f3e76b9cf91b",
    "GENERAL_COUNSEL": "effaa7fd-0b22-40c4-935b-4f5e659a092d",
    "QA_LEAD": "2bc20d9f-78fa-4e08-a066-3a338bb2767f",
    "COMMERCIAL_LAWYER": "d86fc08a-364e-4595-ab1f-1defa13b5328",
    "SENIOR_ENG": "5d5fd790-28c4-498f-b9d1-c85fa19b361b",
    "ENGINEER": "d1ee7177-b93e-4f7f-86ae-ced4ba8db5b6",
    "DATA_ENG": "5135b891-4409-491e-b7f3-87d072628125",
    "IP_LAWYER": "ed313f0d-7230-4e28-8f49-38ab05dd1248",
    "GAME_ECON": "530ecb80-fcec-4465-8a46-ee179abd0917",
    "QA_ENG": "cd03e646-7705-44c2-bbb1-af075a067993",
    "TECH_WRITER": "bea52952-e29b-4f78-ab2d-6e190de85ed1",
    "DEMAND_GEN": "a6943d0d-a08a-4367-a7df-4f7ecaad6fbc",
    "MARKET_RESEARCHER": "64f7ab61-1b40-4b56-97b8-b9ceb7ca3432",
    "STUDIO_OPS": "17a09078-916f-43c7-bdc0-6019aeead6d4",
    "UIUX_LEAD": "cad57b4a-ab73-46fd-b6be-740c5a096713",
    "UIUX_DESIGNER": "9a524d2d-9839-49ec-8268-182f6ea49e4a",
    "BRAND_MANAGER": "99804384-56b9-4e50-9555-18a390c492c2",
    "EMPLOYMENT_LAWYER": "6613dc60-a2ec-4d53-ac48-5c6161a02233",
    "LIVE_OPS": "b580171a-80fc-434e-9253-e5857c0e86ad",
    "GAMING_PRACTICE": "b3edfbc3-2eb1-4228-a128-5ce3c5f149b1",
    "PRODUCTION_CONSULTANT": "31d9cd75-68ed-4ee3-a5e5-0181f24bca6a",
}

# Manager mapping (key reports to value)
MANAGER_MAP = {
    "CEO": None,  # reports to Glen (human)
    "COO": "CEO",
    "CFO": "CEO",
    "CTO": "CEO",
    "VP_PROD": "CEO",
    "CMO": "CEO",
    "HEAD_PEOPLE": "CEO",
    "GENERAL_COUNSEL": "CEO",
    "GAMING_PRACTICE": "CEO",
    "PRODUCER": "COO",
    "DATA_ANALYST": "COO",
    "VP_ENG": "CTO",
    "QA_LEAD": "CTO",
    "UIUX_LEAD": "CTO",
    "SENIOR_ENG": "VP_ENG",
    "ENGINEER": "VP_ENG",
    "DATA_ENG": "VP_ENG",
    "DEVOPS": "VP_ENG",
    "QA_ENG": "QA_LEAD",
    "UIUX_DESIGNER": "UIUX_LEAD",
    "TECH_WRITER": "VP_PROD",
    "BRAND_MANAGER": "CMO",
    "CONTENT_MARKETER": "CMO",
    "DEMAND_GEN": "CMO",
    "MARKET_RESEARCHER": "CMO",
    "EMPLOYMENT_LAWYER": "GENERAL_COUNSEL",
    "IP_LAWYER": "GENERAL_COUNSEL",
    "COMMERCIAL_LAWYER": "GENERAL_COUNSEL",
    "GAME_ECON": "GAMING_PRACTICE",
    "LIVE_OPS": "GAMING_PRACTICE",
    "PRODUCTION_CONSULTANT": "GAMING_PRACTICE",
    "STUDIO_OPS": "GAMING_PRACTICE",
}

# System prompt file mapping (role key -> directory name under roles/)
PROMPT_DIR_MAP = {
    "CEO": "ceo",
    "CFO": "cfo",
    "CMO": "cmo",
    "COO": "coo",
    "CTO": "cto",
    "VP_ENG": "vp_engineering",
    "VP_PROD": "vp_product",
    "HEAD_PEOPLE": "head_of_people",
    "PRODUCER": "producer",
    "DATA_ANALYST": "data_analyst",
    "DEVOPS": "devops",
    "CONTENT_MARKETER": "content_marketer",
    "GENERAL_COUNSEL": "general_counsel",
    "QA_LEAD": "qa_lead",
    "COMMERCIAL_LAWYER": "commercial_dp_lawyer",
    "SENIOR_ENG": "senior_engineer",
    "ENGINEER": "engineer",
    "DATA_ENG": "data_engineer",
    "IP_LAWYER": "ip_trademark_lawyer",
    "GAME_ECON": "game_economy_consultant",
    "QA_ENG": "qa_engineer",
    "TECH_WRITER": "tech_writer",
    "DEMAND_GEN": "demand_gen_manager",
    "MARKET_RESEARCHER": "market_researcher",
    "STUDIO_OPS": "studio_ops_consultant",
    "UIUX_LEAD": "ui_ux_lead",
    "UIUX_DESIGNER": "ui_ux_designer",
    "BRAND_MANAGER": "brand_manager",
    "EMPLOYMENT_LAWYER": "employment_lawyer",
    "LIVE_OPS": "live_ops_consultant",
    "GAMING_PRACTICE": "gaming_practice_lead",
    "PRODUCTION_CONSULTANT": "production_consultant",
}

# Descriptions (one-liners for Paperclip UI)
DESCRIPTIONS = {
    "CEO": "Strategic orchestrator. Translates Glen's goals into work packages, delegates to department heads, monitors progress, resolves cross-functional conflicts.",
    "CFO": "Financial intelligence engine. Tracks revenue, costs, models scenarios, flags budget risks. Supports Bryan Rasmussen (human CFO).",
    "CMO": "Owns marketing strategy, brand positioning, demand generation, and BD pipeline management. Leads Brand Manager, Content Marketer, Demand Gen, Market Researcher.",
    "COO": "Operational engine. Tracks all client and internal deliverables, monitors deadlines, coordinates cross-functional delivery. Leads Producer and Data Analyst.",
    "CTO": "Technical authority across all NBI products. Architects, reviews, governs. Leads VP Engineering, QA Lead, UI/UX Lead.",
    "VP_ENG": "Engineering execution leader. Manages sprints, code reviews, deployment readiness. Leads Senior Engineer, Engineer, Data Engineer, DevOps.",
    "VP_PROD": "Owns Playsage product roadmap and PRD. PM review gate ensuring quality bar. Leads Technical Writer.",
    "HEAD_PEOPLE": "Supports hiring workflows, team directory, and HR coordination. Assists Patrice (human HR Advisor).",
    "PRODUCER": "Tracks project milestones, sprints, deliverable status. Prepares status reports, flags overdue items. Supports Kali Pryer.",
    "DATA_ANALYST": "Processes client and internal data. Prepares analytical briefs. Supports Lighthouse embedded team with supplementary analysis.",
    "DEVOPS": "Manages deployment pipelines, hosting, infrastructure. Configures Vercel, Docker, CI/CD, environment variables.",
    "CONTENT_MARKETER": "Produces case studies, LinkedIn content, thought leadership articles, pitch deck narratives. Follows brand guidelines.",
    "GENERAL_COUNSEL": "Strategic legal leadership. Corporate/company law, entity governance, investment docs. Leads Employment, IP, and Commercial lawyers.",
    "QA_LEAD": "Quality gate for all NBI deliverables. Defines test strategy, manages QA Engineer, conducts Opus-tier final QA pass.",
    "COMMERCIAL_LAWYER": "Client engagement agreements, SOWs, NDAs, GDPR compliance, data processing agreements, privacy policies.",
    "SENIOR_ENG": "Most technically capable IC. Implements complex features, sets quality bar, reviews all Engineer PRs. Playsage and SalarySage.",
    "ENGINEER": "Implements features, bug fixes, unit tests, integration tests. Works in Claude Code on Playsage and SalarySage.",
    "DATA_ENG": "Owns data infrastructure: schemas, migrations, event pipelines, cost computation, budget enforcement, aggregate queries.",
    "IP_LAWYER": "PlaySage trademark registration, software IP protection, open source licensing compliance, patent assessment.",
    "GAME_ECON": "F2P economy design, IAP pricing, virtual currency balancing, monetisation strategy. Gaming industry specialist.",
    "QA_ENG": "Executes test plans, logs defects with reproduction steps, validates fixes before passing to QA Lead.",
    "TECH_WRITER": "Makes documents complete, unambiguous, engineer-ready. Primary assignment: Playsage PRD v1.3 completion.",
    "DEMAND_GEN": "Inbound marketing, lead nurturing, event follow-up campaigns, SEO/SEM strategy, email marketing.",
    "MARKET_RESEARCHER": "Market sizing, TAM/SAM analysis, industry trend tracking, competitor positioning analysis, prospect research.",
    "STUDIO_OPS": "Game studio organisational design, team structure, role definitions, hiring frameworks, operational processes.",
    "UIUX_LEAD": "Owns design system and visual standards. Reviews all interfaces for consistency and usability. Dark theme, electric blue.",
    "UIUX_DESIGNER": "Creates wireframes, mockups, UI components. Implements front-end styling. Responsive design and accessibility.",
    "BRAND_MANAGER": "Owns NBI/PlaySage brand guidelines, messaging framework, positioning. Manages website copy and brand transition.",
    "EMPLOYMENT_LAWYER": "UK employment law compliance, contracts, IR35, right to work, TUPE, holiday entitlement, redundancy procedures.",
    "LIVE_OPS": "Live service architecture, event planning, retention strategy, content cadence, player engagement. Gaming specialist.",
    "GAMING_PRACTICE": "Leads NBI's gaming consulting practice. Game economy, live ops, production, studio operations. Domain authority.",
    "PRODUCTION_CONSULTANT": "Game production methodology, milestone planning, sprint frameworks, stakeholder reporting, pipeline audits.",
}

# Titles (fixing any missing ones)
TITLES = {
    "CEO": "Chief Executive Officer",
}

# Skills mapping per agent (comma-separated skill names)
SKILLS = {
    "CEO": "paperclip,company-research,product-strategy-session,roadmap-planning,meeting-prep",
    "CFO": "financial-modelling,finance-metrics-quickref,finance-based-pricing-advisor,saas-economics-efficiency-metrics,saas-revenue-growth-metrics",
    "CMO": "cold-email,content-strategy,marketing-ideas,marketing-psychology,positioning-statement,positioning-workshop,competitive-intel,client-onboarding,lead-magnets,sales-enablement,social-content,press-release",
    "COO": "roadmap-planning,meeting-prep,client-onboarding,prioritization-advisor",
    "CTO": "supabase-postgres-best-practices,deploy-to-vercel,prd-development,roadmap-planning,product-strategy-session",
    "VP_ENG": "epic-breakdown-advisor,epic-hypothesis,user-story,user-story-mapping,user-story-splitting,roadmap-planning,supabase-postgres-best-practices",
    "VP_PROD": "prd-development,product-strategy-session,roadmap-planning,feature-investment-advisor,prioritization-advisor,jobs-to-be-done,opportunity-solution-tree,user-story-mapping,problem-framing-canvas,recommendation-canvas",
    "HEAD_PEOPLE": "executive-onboarding-playbook,meeting-prep",
    "PRODUCER": "roadmap-planning,meeting-prep,prioritization-advisor",
    "DATA_ANALYST": "analytics-tracking,ab-test-setup,customer-research",
    "DEVOPS": "deploy-to-vercel,vercel-cli-with-tokens,vercel-composition-patterns",
    "CONTENT_MARKETER": "content-strategy,copywriting,copy-editing,social-content,press-release,email-sequence,marketing-ideas",
    "GENERAL_COUNSEL": "contract-review,uk-company-setup",
    "QA_LEAD": "prd-development",
    "COMMERCIAL_LAWYER": "contract-review",
    "SENIOR_ENG": "supabase-postgres-best-practices,vercel-react-best-practices,vercel-composition-patterns,deploy-to-vercel",
    "ENGINEER": "supabase-postgres-best-practices,vercel-react-best-practices,user-story",
    "DATA_ENG": "supabase-postgres-best-practices,analytics-tracking",
    "IP_LAWYER": "contract-review",
    "GAME_ECON": "financial-modelling,competitive-intel,pricing-strategy,finance-based-pricing-advisor",
    "QA_ENG": "",
    "TECH_WRITER": "prd-development,copy-editing",
    "DEMAND_GEN": "lead-magnets,email-sequence,cold-email,paid-ads,programmatic-seo,seo-audit,marketing-ideas,form-cro,page-cro,signup-flow-cro,popup-cro,onboarding-cro",
    "MARKET_RESEARCHER": "company-research,competitive-intel,customer-research,tam-sam-som-calculator,pestel-analysis,discovery-process,discovery-interview-prep",
    "STUDIO_OPS": "executive-onboarding-playbook,workshop-facilitation,uk-company-setup",
    "UIUX_LEAD": "web-design-guidelines,lean-ux-canvas,storyboard,customer-journey-map",
    "UIUX_DESIGNER": "web-design-guidelines,storyboard",
    "BRAND_MANAGER": "positioning-statement,positioning-workshop,copywriting,copy-editing,web-design-guidelines",
    "EMPLOYMENT_LAWYER": "uk-company-setup,contract-review",
    "LIVE_OPS": "churn-prevention,competitive-intel,ab-test-setup",
    "GAMING_PRACTICE": "competitive-intel,financial-modelling,pitch-deck,client-onboarding,meeting-prep,pricing-strategy",
    "PRODUCTION_CONSULTANT": "roadmap-planning,prioritization-advisor,epic-breakdown-advisor,workshop-facilitation",
}


def read_system_prompt(role_key):
    """Read the system prompt file for a role."""
    dir_name = PROMPT_DIR_MAP.get(role_key)
    if not dir_name:
        return ""
    path = os.path.join(ROLES_DIR, dir_name, "prompts", "system_prompt.md")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except FileNotFoundError:
        print(f"  WARNING: No system prompt found at {path}")
        return ""


def patch_agent(agent_id, payload):
    """PATCH an agent with the given payload."""
    url = f"{BASE}/agents/{agent_id}"
    resp = requests.patch(url, json=payload, timeout=10)
    return resp.status_code, resp.json() if resp.ok else resp.text


def main():
    success = 0
    failed = 0

    for key in AGENTS:
        agent_id = AGENTS[key]
        manager_key = MANAGER_MAP.get(key)
        manager_id = AGENTS.get(manager_key) if manager_key else None

        # Read system prompt
        instructions = read_system_prompt(key)

        # Build payload
        payload = {
            "description": DESCRIPTIONS.get(key, ""),
            "desiredSkills": SKILLS.get(key, ""),
        }

        if instructions:
            payload["instructions"] = instructions

        if manager_id:
            payload["managerId"] = manager_id

        if key in TITLES:
            payload["title"] = TITLES[key]

        # Execute
        status, result = patch_agent(agent_id, payload)

        if status == 200:
            name = result.get("name", "?") if isinstance(result, dict) else "?"
            has_instr = "YES" if isinstance(result, dict) and result.get("instructions") else "NO"
            has_mgr = "YES" if isinstance(result, dict) and result.get("managerId") else "NO"
            skills = isinstance(result, dict) and result.get("desiredSkills", "") or ""
            skill_count = len(skills.split(",")) if skills.strip() else 0
            print(f"OK  {name:40s} | instructions:{has_instr} | manager:{has_mgr} | skills:{skill_count}")
            success += 1
        else:
            print(f"ERR {key:40s} | status:{status} | {str(result)[:100]}")
            failed += 1

    print(f"\nDone. {success} succeeded, {failed} failed.")


if __name__ == "__main__":
    main()
