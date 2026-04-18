"""Create real work issues in Paperclip for all NBI projects."""
import json, requests

BASE = "http://localhost:3100/api"
COMPANY = "359ab370-c36f-4558-a252-637255ad1a7b"

# Agent IDs
A = {
    "CEO": "f35ca020-cb28-4ec0-8f7b-37d236dcfd04",
    "CFO": "b3bd8f33-8027-4124-83c2-baa5158a3968",
    "CMO": "acfc9b17-a92b-472f-be62-ab2e9b18caf4",
    "COO": "4626f3be-6300-4079-a918-6751758375be",
    "CTO": "930bd58f-38e7-4354-9401-9ab2a3188d1b",
    "VP_PROD": "83634d5d-0f93-4298-b251-9d7f2dfc5277",
    "GAMING": "b3edfbc3-2eb1-4228-a128-5ce3c5f149b1",
    "GAME_ECON": "530ecb80-fcec-4465-8a46-ee179abd0917",
    "PROD_CON": "31d9cd75-68ed-4ee3-a5e5-0181f24bca6a",
    "STUDIO_OPS": "17a09078-916f-43c7-bdc0-6019aeead6d4",
    "CONTENT": "4e82246e-985c-4533-b042-f3e76b9cf91b",
    "BRAND": "99804384-56b9-4e50-9555-18a390c492c2",
    "IP_LAW": "ed313f0d-7230-4e28-8f49-38ab05dd1248",
    "TECH_WRITER": "bea52952-e29b-4f78-ab2d-6e190de85ed1",
    "SR_ENG": "5d5fd790-28c4-498f-b9d1-c85fa19b361b",
    "UIUX_LEAD": "cad57b4a-ab73-46fd-b6be-740c5a096713",
    "COMM_LAW": "d86fc08a-364e-4595-ab1f-1defa13b5328",
    "EMP_LAW": "6613dc60-a2ec-4d53-ac48-5c6161a02233",
}

# Project IDs
P = {
    "COUCH": "4562211f-e112-4b82-bacf-cd3b6b682e70",
    "LIGHT": "83a5b5cb-c09e-4496-86cb-3ccdeb436c8d",
    "SARGE": "2e28d87c-720e-4fa4-a8af-3acb0515df88",
    "GOALS": "2c839625-0e12-4359-b823-29ac9959f2b5",
    "PLAYSAGE": "e4d7ebab-a6c2-479a-8214-46e44a84ec6f",
    "SALARY": "86b87500-b816-496b-85b8-dff4281eb188",
    "WEBSITE": "fe46bf83-e549-428d-8843-04090b8e4319",
    "OPS": "4a2b5c2e-ec6f-42e2-81b7-03196d3ea47b",
}

# Goal IDs
G = {
    "NBI": "0610c7db-ede8-46b9-a2a4-53a7eee94b88",
    "COUCH": "7d197a74-236c-494d-996d-46782bfa0bd4",
    "SARGE": "2aa7923c-1f66-4017-bd4a-50e3fa6546d8",
    "GOALS": "285c677f-b143-4234-b612-bdab1d3cae13",
    "LIGHT": "9bdae56e-9a48-4318-98ba-061229504558",
    "PLAY": "3518f85a-326c-443d-ab41-f02b5c26912c",
    "BRAND": "685838ae-db3b-4de7-8f8d-9b5e499e8441",
    "BD": "62148ea2-db3b-4de7-8f8d-9b5e499e8441",
    "CLIENTS": "d8bc38a7-db3b-4de7-8f8d-9b5e499e8441",
}

ISSUES = [
    # === SARGE UNIVERSE (URGENT) ===
    {
        "title": "Complete Sarge Universe pitch deck for investor readiness",
        "description": "Working session Monday 30 March. Deck must follow proven structure (Eremeev/Katkoff framework). Steve Green seeking GBP 5-10M. Key elements: problem/solution, market sizing (bottom-up), team, traction, financials, ask. Use competitive-intel skill for comparable title analysis.",
        "priority": "critical",
        "assigneeAgentId": A["GAMING"],
        "projectId": P["SARGE"],
        "goalId": G["SARGE"],
    },
    {
        "title": "Build Sarge Universe due diligence deck",
        "description": "DD deck progress review Tuesday 31 March. Separate from pitch deck. Covers: detailed financials, technical architecture, team bios, market analysis, legal structure, IP ownership, competitive landscape. Must be investor-grade.",
        "priority": "critical",
        "assigneeAgentId": A["GAMING"],
        "projectId": P["SARGE"],
        "goalId": G["SARGE"],
    },
    {
        "title": "Draft investor outreach emails for Sarge Universe",
        "description": "Target: send to investors by end of w/c 6 April. Known contacts: Jackson (RMT), Riley Graebner (Magna Capital), Binni (Behold Ventures), Manjit Dawe (TDR Capital). Emails must be concise, attach pitch deck, request 30-min meeting. Glen approves before sending.",
        "priority": "high",
        "assigneeAgentId": A["CMO"],
        "projectId": P["SARGE"],
        "goalId": G["SARGE"],
    },
    # === GOALS STUDIO ===
    {
        "title": "Draft Goals Studio engagement proposal for Jonas Rundberg",
        "description": "Follow-up overdue since GDC (11 March). Jonas requested: (1) HC pricing review across 7 hard currency items with regional pricing recommendations, (2) in-game store offering review. Draft proposal with scope, timeline, pricing. Contact: jonas@playgoals.com. Glen approves before sending.",
        "priority": "high",
        "assigneeAgentId": A["CMO"],
        "projectId": P["GOALS"],
        "goalId": G["GOALS"],
    },
    {
        "title": "Prepare hard currency pricing benchmarking framework",
        "description": "Research competitor pricing across 1st party stores for similar games. Regional pricing analysis methodology. Deliverable framework ready before Goals Studio engagement starts.",
        "priority": "medium",
        "assigneeAgentId": A["GAME_ECON"],
        "projectId": P["GOALS"],
        "goalId": G["GOALS"],
    },
    # === PLAYSAGE ===
    {
        "title": "Complete Playsage PRD v1.3 corrections",
        "description": "PRD v1.2 scored 7.1/10. 60+ corrections identified, 10 decision points need resolution. Red-team issues: retention KPIs claimed from public data (impossible), EBITDA from public data (impossible), LLM overclaim for The Sage, lift range methodology undefined, no wireframes. Produce gap report first, categorise into: resolvable from canon, needs Glen, needs CTO.",
        "priority": "high",
        "assigneeAgentId": A["TECH_WRITER"],
        "projectId": P["PLAYSAGE"],
        "goalId": G["PLAY"],
    },
    {
        "title": "Define Cascade Engine architecture",
        "description": "Deliverable 2 from Playsage roadmap. NOT STARTED. The cross-module integration intelligence layer. When one module detects a signal, Cascade checks related modules and surfaces connected picture. This is the technical moat differentiating Playsage from Sensor Tower et al.",
        "priority": "high",
        "assigneeAgentId": A["CTO"],
        "projectId": P["PLAYSAGE"],
        "goalId": G["PLAY"],
    },
    {
        "title": "Design Playsage pitch deck content",
        "description": "Deliverable 4 from Playsage roadmap. NOT STARTED. Target USD 10M raise via USA LLC. Use pitch-deck skill (v2.0 with real VC research). Include: Cascade Engine as moat, studio partnership data flywheel, NBI consulting relationships as GTM advantage, TAM of USD 2.12B game analytics market.",
        "priority": "medium",
        "assigneeAgentId": A["GAMING"],
        "projectId": P["PLAYSAGE"],
        "goalId": G["PLAY"],
    },
    # === SALARYSAGE (URGENT SECURITY) ===
    {
        "title": "Fix SalarySage API key exposure -- critical security",
        "description": "Glen flagged 26 March as URGENT. API key embedded in HTML code visible in source. Currently on Jeff Days personal credit card (USD 25 loaded). Must: (1) remove all exposed keys from client-side code, (2) implement server-side API proxy, (3) move API key off personal card to NBI account. No client demos until fixed.",
        "priority": "critical",
        "assigneeAgentId": A["SR_ENG"],
        "projectId": P["SALARY"],
        "goalId": G["PLAY"],
    },
    # === NBI WEBSITE ===
    {
        "title": "Deploy NBI website redesign prototype to hosting",
        "description": "HTML/CSS prototype exists (10 files from Claude Chat About NBI project). Current Framer site scored 4.8/10. Options: deploy to Vercel/Netlify directly, or recreate in Framer. Gaming-first positioning, 6 service pages, dark theme with electric blue accents.",
        "priority": "high",
        "assigneeAgentId": A["SR_ENG"],
        "projectId": P["WEBSITE"],
        "goalId": G["BRAND"],
    },
    {
        "title": "Add 4 active clients to website carousel",
        "description": "Missing from current site: Lighthouse Studios, Sarge Universe, Couch Heroes, Goals Studio. No NDAs requiring omission confirmed. Update carousel/logo section on homepage.",
        "priority": "medium",
        "assigneeAgentId": A["BRAND"],
        "projectId": P["WEBSITE"],
        "goalId": G["BRAND"],
    },
    {
        "title": "Build NBI case studies from existing client work",
        "description": "Zero case studies exist despite 200+ projects. Critical gap for credibility. Start with: (1) Lighthouse Studios embedded analytics, (2) Couch Heroes fractional studio head, (3) Xbox/Blizzard legacy wins with published testimonials. Glen must approve final versions before publishing.",
        "priority": "high",
        "assigneeAgentId": A["CONTENT"],
        "projectId": P["WEBSITE"],
        "goalId": G["BRAND"],
    },
    # === NBI OPERATIONS ===
    {
        "title": "Draft reply to Jen MacLean GDC follow-up emails",
        "description": "Two unread emails from 19 March in NBI Outlook. Email 1: offering NBI referrals in exec/indie CEO groups, asks for NBI sweet spots. Email 2: Dragon Snacks Games seeking USD 4M seed for Farhaven (co-op sandbox RPG). Draft both responses for Glen review. Strategic BD relationship.",
        "priority": "high",
        "assigneeAgentId": A["CMO"],
        "projectId": P["OPS"],
        "goalId": G["NBI"],
    },
    {
        "title": "Activate NBI LinkedIn company page with content strategy",
        "description": "Page exists but zero activity. Untapped asset for BD. Develop: content strategy, posting cadence (2-3x/week), thought leadership leveraging Glen 20yr gaming experience and Tom published books. Include: industry commentary, case study teasers, hiring signal posts.",
        "priority": "medium",
        "assigneeAgentId": A["CONTENT"],
        "projectId": P["OPS"],
        "goalId": G["BRAND"],
    },
    {
        "title": "PlaySage trademark search across UK IPO, USPTO, EUIPO",
        "description": "HIGH priority brand decision. Check: (1) domain playsage.com availability, (2) USPTO Class 35 and 41, (3) UK IPO search, (4) EU trademark EUIPO, (5) social handles on LinkedIn, X, Instagram. Also flag: immigration implications of NBI Analytics Ltd trading name change (sponsor licence, Home Office notification).",
        "priority": "high",
        "assigneeAgentId": A["IP_LAW"],
        "projectId": P["OPS"],
        "goalId": G["NBI"],
    },
    {
        "title": "Model NSI wind-down financial impact on NBI payroll",
        "description": "As NSI closes, Tom, Bryan, Jeff, Jessica move to NBI payroll. Projected additional cost approx GBP 620K/year (total from GBP 625K to GBP 1.245M). Build scenarios: (1) immediate full transfer, (2) phased over 12 months, (3) partial transfer (critical roles only). Include cash flow impact timeline.",
        "priority": "high",
        "assigneeAgentId": A["CFO"],
        "projectId": P["OPS"],
        "goalId": G["NBI"],
    },
    {
        "title": "Prepare NBI client engagement agreement template",
        "description": "NBI currently custom-scopes every engagement. Need a reusable engagement agreement template covering: scope of work, pricing (T&M and fixed), IP ownership, confidentiality, GDPR compliance, termination, liability caps. Must be UK law governed.",
        "priority": "medium",
        "assigneeAgentId": A["COMM_LAW"],
        "projectId": P["OPS"],
        "goalId": G["NBI"],
    },
    # === COUCH HEROES ===
    {
        "title": "Audit Couch Heroes UK entity setup completeness",
        "description": "Glen building full FTE hiring/business artefacts. Checklist and Excel plan exist in Claude Chat. Key areas: employment contracts, right to work, payroll, pension auto-enrolment, HMRC registration, employer liability insurance, company policies handbook. Use uk-company-setup skill as reference.",
        "priority": "high",
        "assigneeAgentId": A["STUDIO_OPS"],
        "projectId": P["COUCH"],
        "goalId": G["COUCH"],
    },
    {
        "title": "Evaluate ClickUp vs Teams for Couch Heroes project management",
        "description": "Teams acknowledged as poor PM tool. ClickUp under consideration but not yet actioned. Compare: features for game production workflow, sprint management, Kanban boards, reporting, cost, migration effort, team adoption risk. Deliver recommendation with pros/cons matrix.",
        "priority": "medium",
        "assigneeAgentId": A["PROD_CON"],
        "projectId": P["COUCH"],
        "goalId": G["COUCH"],
    },
    # === LIGHTHOUSE ===
    {
        "title": "Prepare Lighthouse contract renewal brief",
        "description": "3-year contract at GBP 350K/year. Current team: Amir (Senior Analyst), Ruan (Data Engineer), Stavros (Lead Data Scientist). Prepare renewal brief documenting: value delivered, KPIs met, expansion opportunities, recommended pricing for renewal. Key contacts: Justin Logan, James Firth.",
        "priority": "medium",
        "assigneeAgentId": A["COO"],
        "projectId": P["LIGHT"],
        "goalId": G["LIGHT"],
    },
]

def main():
    success = 0
    failed = 0
    for issue in ISSUES:
        issue["status"] = "todo"
        resp = requests.post(
            f"{BASE}/companies/{COMPANY}/issues",
            json=issue,
            timeout=10
        )
        if resp.ok:
            data = resp.json()
            title = data.get("title", "?")[:65]
            print(f"OK  {title}")
            success += 1
        else:
            print(f"ERR {issue['title'][:50]} | {resp.status_code} | {resp.text[:100]}")
            failed += 1

    print(f"\nCreated {success} issues, {failed} failed.")

if __name__ == "__main__":
    main()
