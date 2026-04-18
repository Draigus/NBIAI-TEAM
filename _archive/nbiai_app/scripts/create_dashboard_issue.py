"""Create the dashboard integration issue for CEO."""
import json, requests

BASE = "http://localhost:3100/api"
COMPANY = "359ab370-c36f-4558-a252-637255ad1a7b"
CEO = "f35ca020-cb28-4ec0-8f7b-37d236dcfd04"
OPS_PROJECT = "4a2b5c2e-ec6f-42e2-81b7-03196d3ea47b"
NBI_GOAL = "0610c7db-ede8-46b9-a2a4-53a7eee94b88"

desc = r"""## Overview

Glen wants the NBI Project Dashboard redesigned properly by the AI team. The dashboard (glen_project_dashboard_v2.html) needs to integrate Paperclip AI team work alongside Glen's manual tasks. A rough implementation was started but needs the full product/design/engineering pipeline treatment.

## Glen's Requirements (Verbatim)

"I want the NBI projects dashboard to have an AI team section, just like we have for my tasks. It has the AI tasks, and under Couch Heroes would be AI tasks. Under Goals or Lighthouse or whatever would be AI tasks. Treat them just like employees. The AI COO or the AI CMO or the AI senior engineer will all have tasks to do, and any artifact that NBI AI completes or is still working on, I want it to be represented in the NBI projects dashboard."

"I also want a section for deliverables, and those deliverables or anything that anyone, including the AI team, has done, they attach it to the task. They mark the task for review; it shows up in the deliverables for review section."

"I need the design team, the UX team, and the product team to redesign the dashboard. Make sure all the stuff is appropriately laid out and done correctly."

## What Needs to Be Built

### 1. Paperclip API Integration
- Dashboard fetches AI team issues from Paperclip API (localhost:3100)
- Auto-refreshes every 60 seconds
- CORS already added to Paperclip server (app.ts) and working

### 2. AI Team Tasks Per Client
- Sidebar shows AI task counts under each client
- Source filter: All Tasks / My Tasks / AI Team
- AI tasks visually distinct (robot icon, purple accent)
- AI tasks read-only (changes via Paperclip API)
- Shows agent name, issue ID, status, priority

### 3. Deliverables for Review View
- New view listing Paperclip issues with status "in_review"
- Approve/Reject workflow with comments
- Work products displayed
- Link to Paperclip UI for full detail

### 4. Dashboard KPI Updates
- AI Team KPI row
- Awaiting Review count (clickable)

### 5. AI Task Detail Panel
- Read-only properties, Paperclip link
- Work products / deliverables display
- Approve/Reject if in_review

## Current State

A rough first pass exists in the HTML file with some working code:
- CORS middleware added to Paperclip (working)
- fetchAIData() function exists
- Deliverables view exists (basic)
- AI Team sidebar section exists (basic)
- AI KPI cards exist (basic)
- openAIDetail() function exists

The CEO should have VP Product, UI/UX Lead, and UI/UX Designer review and redesign the layout properly, then Senior Engineer implements, QA Lead validates.

## Technical Context

- File: D:\OneDrive\Claude_code\NBIAI_TEAM\glen_project_dashboard_v2.html
- Single HTML file, ~2000 lines
- Dark theme, electric blue accents, Orbitron font
- localStorage persistence for manual tasks
- Embedded CSV with ~150 Couch Heroes tasks

### Paperclip API Endpoints
- GET /api/companies/{companyId}/issues?limit=200
- GET /api/companies/{companyId}/agents
- GET /api/companies/{companyId}/projects
- PATCH /api/issues/{id} (status changes)
- POST /api/issues/{id}/comments

### Project-to-Client Mapping
- 4562211f = Couch Heroes
- 83a5b5cb = Lighthouse Studios
- 2e28d87c = Sarge Universe
- 2c839625 = Goals Studio
- e4d7ebab = Playsage
- 86b87500 = Playsage (SalarySage)
- fe46bf83 = NBI Operations (Website)
- 4a2b5c2e = NBI Operations
- 4a7b874f = Blizzard Entertainment

## Quality Standards
- Must not break existing functionality
- Must follow existing design system
- Auto-refresh must not cause UI flicker
- Every value must match Paperclip reality
"""

issue = {
    "title": "Redesign NBI Project Dashboard with AI team integration",
    "description": desc,
    "priority": "high",
    "status": "todo",
    "assigneeAgentId": CEO,
    "projectId": OPS_PROJECT,
    "goalId": NBI_GOAL,
}

resp = requests.post(f"{BASE}/companies/{COMPANY}/issues", json=issue, timeout=10)
if resp.ok:
    d = resp.json()
    print(f'Created: {d.get("identifier","?")} -- {d.get("title","?")[:60]}')
else:
    print(f"ERROR: {resp.status_code} {resp.text[:200]}")
