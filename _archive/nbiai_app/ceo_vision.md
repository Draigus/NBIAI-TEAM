# NBIAI App — CEO Vision
**Author:** CEO
**Date:** 2026-03-28
**Status:** Active — briefing issued to VP Product, CTO, UI/UX Lead

---

## The Problem We Are Solving

NBI's AI agent company exists in markdown files. We have 18 agents, full role definitions, three-tier knowledge architecture, and complete pipelines — but no control plane to manage any of it. Glen cannot see what agents are doing. He cannot approve actions in real time. He cannot track projects, pipeline, or finances without opening files.

We need a web application that makes the agent company visible, manageable, and operational.

---

## What We Are Building

A Paperclip-style control plane for NBI's AI agent company. Not a demo. Not a prototype. A production-grade internal tool that Glen uses every day to run the business.

The app is the interface between Glen as board operator and the AI org beneath him. It is where:
- Glen issues directives that flow down to the CEO agent and cascade through the org
- Every agent's activity is visible in real time
- Tasks are created, assigned, tracked, and completed
- External actions (emails, client comms, financial commitments) are approved before they execute
- Finance, BD pipeline, and client health are monitored
- New agents are hired, paused, or terminated

**Stack:** Node.js + PostgreSQL + React + Tailwind + shadcn/ui. Hosted on Railway or Render.

---

## Three Workstreams — Running in Parallel

### Workstream 1: Feature Specification (VP Product)
VP Product owns Deliverable 1: a complete feature spec for all 11 sections of the app. Engineering cannot start without it. Every screen, every data object, every workflow, every edge case.

Brief: `projects/nbiai_app/backlog/assignment_vp_product.md`

### Workstream 2: Technical Architecture (CTO)
CTO owns Deliverable 2: full database schema, API design, agent execution layer, real-time architecture, security, deployment. Engineering cannot start without it.

Brief: `projects/nbiai_app/backlog/assignment_cto.md`

### Workstream 3: UI/UX Design Spec (UI/UX Lead)
UI/UX Lead owns Deliverable 3: complete design system and screen-by-screen layout spec. Dark, professional, control-room aesthetic. Frontend engineering cannot start without it.

Brief: `projects/nbiai_app/backlog/assignment_ui_ux_lead.md`

---

## Success Criteria

The app is done when Glen can:

1. Log in and see the Command Centre in under 3 seconds
2. See all 18 agents, their real-time status, and current tasks
3. Drill into any agent and see their full history and performance
4. Create a task, assign it to an agent, and watch it move through states
5. Receive an approval request from an agent, review the full content, and approve or reject it
6. See NBI's revenue, payroll, cash flow, and pipeline on one screen
7. Manage the BD pipeline from lead identification through to close
8. Add or remove users, set agent budgets, and manage API keys
9. Do all of the above without opening a single markdown file

---

## Build Order (After Deliverables 1–3 Are Complete)

1. **Sprint 1:** Database + auth + core APIs (CEO signs off on architecture first)
2. **Sprint 2:** Command Centre + Org Chart (the two most-used screens)
3. **Sprint 3:** Projects, Tasks, Approvals (operational core)
4. **Sprint 4:** Finance + Leads & Clients (business intelligence)
5. **Sprint 5:** Agent execution layer (the heartbeat system — agents actually run)
6. **Sprint 6:** Settings, polish, deployment to Railway/Render

---

## CEO Sign-Off Gate

Before VP Engineering begins Sprint 1:
- Deliverable 1 (VP Product spec) reviewed and approved by CEO
- Deliverable 2 (CTO architecture) reviewed and approved by CEO
- Deliverable 3 (UI/UX spec) reviewed and approved by CEO

All three must be complete and consistent with each other. VP Product, CTO, and UI/UX Lead are expected to cross-reference each other's work before submitting.

---

## Note to the Team

This is not a side project. This app is how NBI's AI agent company becomes operational. The faster we build it, the faster agents can work autonomously. Treat this as the highest-priority engineering effort in the company.

Questions, blockers, or decisions that require CEO input: escalate immediately. Do not sit on a blocker.
