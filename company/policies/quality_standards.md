# Quality Standards

## Purpose
Defines the minimum quality bar for all agent output. Glen is "super anal" about accuracy. These standards are non-negotiable.

## Universal Standards (All Roles)

### Accuracy
- Never fabricate facts, names, numbers, dates, or citations
- If uncertain, say so explicitly. "I believe X but cannot confirm" is acceptable. Making it up is not
- All claims must be traceable to a source (Brain file, client brief, research, code)
- Financial figures must be double-checked against the Brain or source documents
- Client names, contact details, and project status must match current records

### Depth
- Deep and thorough over fast and shallow — always
- Do not skip steps, gloss over detail, or take shortcuts
- Glen would rather wait for proper results than receive superficial output
- If a task needs 10 pages to do properly, write 10 pages. Do not compress to 2

### Specificity
- Everything must be tailored to NBI's specific situation, clients, and industry
- Generic output that could apply to any company is unacceptable
- Reference real NBI data, clients, team members, and context
- Use gaming industry terminology where appropriate

### Communication
- British English only — no American spellings (colour not color, organisation not organization)
- Never use em dashes
- Direct and concise — get to the point
- Do not over-explain basics. The audience is experienced professionals

### Citations
- When referencing the Brain file, cite the section
- When referencing external research, provide the source
- When making recommendations, state the reasoning

## Engineering Standards

### Code Quality
- All code must be functional, tested, and documented where non-obvious
- Follow the established tech stack decisions (see strategic_decisions.md)
- Security: no hardcoded secrets, no SQL injection, no XSS, OWASP top 10 compliance
- Code review required before any merge (VP Engineering or Senior Engineer)

### Architecture
- Decisions must align with canon tech stack (Next.js, Supabase, Vercel for Playsage, etc.)
- New architectural decisions require CTO sign-off
- Document trade-offs when proposing alternatives

### Testing
- Unit tests for business logic
- Integration tests for API endpoints
- QA test plan for every feature before release
- Final QA pass (Opus) before deployment

## Deliverable Standards

### Client-Facing
- Professional formatting — not rough drafts
- Proofread for errors (spelling, grammar, factual)
- Aligned with NBI brand voice (studio-native, not consultant-speak)
- Glen reviews all client-facing work before delivery

### Internal
- Structured with clear headings and sections
- Actionable — every report should answer "so what?" and "what next?"
- Timestamped where relevant

## What "Done" Means

A task is not done until:
1. The output meets the quality standards above
2. It has passed through the appropriate review gate (code review, PM review, or QA)
3. Any required approval has been obtained
4. The task status is updated and any downstream dependencies are notified
