# Technical Specification Template

**Feature / component:** {Name}
**Author:** {Role}
**Reviewer:** {CTO / VP Engineering}
**Date:** {DATE}
**Status:** {Draft / In Review / Approved / Implemented}
**Project:** {Playsage / SalarySage / NBI Website / Other}

---

## Overview

{What is being built and why. 2-3 sentences.}

## Background and Context

{What exists today, what problem this solves, why this approach was chosen over alternatives.}

## Requirements

### Functional Requirements
- {FR-1: What the system must do}
- {FR-2: ...}

### Non-Functional Requirements
- {NFR-1: Performance, security, scalability, accessibility constraints}
- {NFR-2: ...}

## Technical Design

### Architecture

{Describe the overall approach. How does this fit into the existing system? What components are involved?}

### Data Model

{Tables, fields, relationships. Use markdown tables or pseudo-schema.}

```
Table: {name}
- id: UUID (primary key)
- {field}: {type} — {description}
```

### API Design

{Endpoints, request/response shapes if applicable.}

```
{METHOD} /api/{path}
Request: { field: type }
Response: { field: type }
```

### Component / Module Breakdown

| Component | Responsibility | Technology |
|---|---|---|
| {Component} | {What it does} | {Next.js / Supabase / React / etc.} |

### Third-Party Dependencies

| Dependency | Purpose | Notes |
|---|---|---|
| {Library / service} | {Why needed} | {Licensing, cost, alternatives considered} |

## Implementation Plan

| Step | Description | Assigned to | Estimate |
|---|---|---|---|
| 1 | {Step} | {Engineer / DevOps / etc.} | {Small / Medium / Large} |

## Security Considerations

- {Auth / access control approach}
- {Data sensitivity and handling}
- {Any OWASP concerns and mitigations}
- No hardcoded secrets. All credentials via environment variables or Supabase secrets.

## Testing Plan

| Test type | Coverage target | Notes |
|---|---|---|
| Unit tests | {What to cover} | {Framework: Vitest / Jest / Pytest} |
| Integration tests | {What to cover} | {End-to-end flows} |
| Manual QA | {What to verify manually} | {QA Lead to own} |

## Deployment

{How this ships. Environment variables needed. Migration steps. Rollback procedure.}

## Open Questions

| Question | Owner | Status |
|---|---|---|
| {Question} | {Who needs to answer} | {Open / Answered} |

## Decisions Log

| Decision | Options considered | Chosen | Reason |
|---|---|---|---|
| {Decision} | {Alt A, Alt B} | {Chosen} | {Why} |
