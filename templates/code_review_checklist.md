# Code Review Checklist

**PR / change:** {Title or link}
**Author:** {Engineer}
**Reviewer:** {VP Engineering / Senior Engineer}
**Date:** {DATE}
**Project:** {Playsage / SalarySage / NBI Website / Other}

---

## Functionality

- [ ] Code does what the spec / ticket describes
- [ ] Edge cases handled (empty states, nulls, errors, boundary values)
- [ ] No obvious bugs or logic errors
- [ ] Behaviour tested manually or with automated tests

## Code Quality

- [ ] Code is readable — clear variable names, no unnecessary complexity
- [ ] No duplication — existing utilities and patterns reused where appropriate
- [ ] Functions do one thing and are appropriately sized
- [ ] No dead code, commented-out blocks, or debug statements left in
- [ ] No over-engineering for hypothetical future requirements

## Security (OWASP Top 10 Checklist)

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Input validated and sanitised at all system boundaries
- [ ] No SQL injection risk (parameterised queries used)
- [ ] No XSS risk (output properly escaped)
- [ ] Authentication and authorisation checks in place
- [ ] No sensitive data logged

## Tests

- [ ] Unit tests cover the business logic
- [ ] Integration tests cover the API or data flow
- [ ] Tests pass locally
- [ ] No tests removed without justification

## Tech Stack Compliance

- [ ] Follows established tech stack (Next.js App Router, Tailwind + shadcn/ui, Supabase PostgreSQL, Vercel for Playsage)
- [ ] No new dependencies added without CTO awareness
- [ ] TypeScript types correct (no `any` without justification)

## Performance

- [ ] No N+1 queries
- [ ] No unnecessary re-renders (React)
- [ ] Large data sets paginated or streamed

## Documentation

- [ ] Complex logic has inline comments where not self-evident
- [ ] API changes documented
- [ ] README or spec updated if behaviour changed

## Deployment

- [ ] Environment variables documented
- [ ] Database migrations included and reversible
- [ ] No breaking changes to existing data or APIs (or migration path provided)

---

## Reviewer Notes

{Any specific feedback, questions, or required changes before approval}

## Decision

- [ ] Approved — ready to merge
- [ ] Approved with minor comments — merge after addressing
- [ ] Changes required — do not merge until resolved
