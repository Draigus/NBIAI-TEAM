---
source: onedrive
source_id: nbi_dashboard_project_brief
source_path: projects/nbi_dashboard/PROJECT_BRIEF.md
ingested: 2026-05-25
topics_detected: [product-architecture, work-management, dashboard-design, team-tooling]
relevance_score: 7
novelty_score: 5
actionability_score: 5
bank_candidates: [personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: insight
---

# WorkSage (NBI Hub) Architecture and User Base

## Key Content

NBI's bespoke work management platform replacing Microsoft Teams/Planner. Tracks all client engagements, tasks, hours, costs, client intelligence (profiles, contacts, meeting notes), BD pipeline, and generates reports. 6 users: Glen Pryer (MD, admin), Magnus Pryer (Producer), Tom Rieger (HC Partner, US-based), Devin Rieger (Data Analyst), Jeff Day (Data Scientist), Amir Didar (Senior Analyst). Tech: single-file HTML/CSS/JS frontend (~21,300 lines), Express.js on port 8888, PostgreSQL, Cloudflare Tunnel for remote access, bcrypt auth. BD pipeline sourced from clean client list xlsx (41 leads). 396+ tests. PM2 for process management.

## Decisions / Insights

- Glen decided: single monolithic HTML file over component framework (rapid iteration, single-file deployment)
- Glen decided: Cloudflare Tunnel for public access rather than cloud hosting (cost control, local data)
- Glen decided: WorkSage replaces Microsoft Teams/Planner as central operating system

## Context

Project brief for NBI's internal dashboard. Active development with continuous feature additions. Serves as both internal tool and demonstration of NBI's ability to build bespoke management platforms.

## Applicability

- Relevant when: scoping bespoke work management platforms for small consulting firms
- Relevant when: demonstrating NBI's ability to build production tools to prospects
