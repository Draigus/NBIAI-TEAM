# Tech Writer Capacity SLA

**Owner:** VP Product
**Secondary stakeholder:** General Counsel
**Effective date:** 2026-03-28
**Review cadence:** Quarterly, or immediately when a capacity conflict arises

---

## Allocation Summary

The Tech Writer's capacity is allocated as follows:

| Allocation | Owner | Percentage |
|---|---|---|
| Product documentation | VP Product | 80% |
| Legal documentation support | General Counsel | 20% |

This split reflects the Tech Writer's primary reporting line to VP Product and the secondary, bounded demand from the General Counsel function.

---

## 80% Allocation: Product Documentation (VP Product)

The VP Product allocation covers all documentation work directly supporting Playsage and the NBIAI App. Specifically:

**Playsage**
- User guides and onboarding documentation for all subscriber tiers (Starter, Professional, Enterprise)
- API documentation for the Cascade Engine integration layer and all module endpoints
- Release notes for every sprint that ships to production
- In-app copy: tooltips, empty states, error messages, confirmation dialogs, onboarding flows
- Help centre articles covering product modules, account management, and common workflows
- PRD gap reports and PRD revisions (Playsage PRD v1.3 work is the current primary assignment)
- Internal spec documentation as required by VP Product or CTO

**NBIAI App**
- User-facing help content and onboarding documentation
- Release notes and changelog entries
- In-app copy and microcopy as features ship

The VP Product directs all work within this allocation. Task assignment, prioritisation, and sequencing are VP Product's decisions. The Tech Writer does not self-prioritise within this allocation; all work comes through VP Product.

---

## 20% Allocation: Legal Documentation Support (General Counsel)

The General Counsel allocation is bounded at 20% of Tech Writer capacity. It covers the following categories of work only:

**Permitted under this allocation:**
- Formatting and structural editing of legal documents produced by the legal department (employment contracts, engagement letters, policy documents, NDAs) to bring them to NBI's communication standards
- Plain-English summaries of legal output for non-lawyer audiences (e.g., a plain summary of an NDA for a client, a readable version of NBI's GDPR data processing addendum for end users)
- Formatting and layout of internal policy documents authored by the legal team
- Copyediting of Terms of Service, Privacy Policies, and similar user-facing legal documents for readability (the Tech Writer edits for clarity and consistency; the General Counsel retains ownership of legal content and accuracy)

**Not covered under this allocation:**
- Legal research or analysis
- Drafting legal documents from scratch
- Any document where the Tech Writer would be originating legal positions rather than reformatting or summarising existing ones
- Ongoing document management or filing

The General Counsel initiates requests directly to the Tech Writer, with a copy to VP Product for visibility. The Tech Writer acknowledges and schedules within the SLA timelines below.

---

## Response Time SLAs

### VP Product Allocation (80%)

| Request type | Target turnaround |
|---|---|
| Urgent in-app copy or error message (sprint blocker) | Same session or within 4 hours |
| Release notes (standard sprint) | Within 24 hours of sprint close |
| PRD gap report or section revision | Within 48 hours of receiving the source document |
| New user guide or help article | Within 3 business days |
| Full PRD revision pass | Agreed per-sprint in the sprint plan |
| API documentation update | Within 48 hours of receiving confirmed spec from CTO |

These SLAs assume the Tech Writer has received complete source material. If source material is missing or unconfirmed, the clock does not start until complete information is provided.

### General Counsel Allocation (20%)

| Request type | Target turnaround |
|---|---|
| Plain-English summary of a legal document | Within 48 hours |
| Formatting pass on a completed legal document | Within 48 hours |
| Policy document formatting | Within 48 hours |
| Urgent request (flagged as such by GC with reason) | Within 24 hours, subject to VP Product capacity check |

The 20% allocation equates to approximately one working day per week. Requests that collectively exceed this within a given week are subject to the queue management process below.

---

## Managing Competing Requests

### VP Product has first call

If a VP Product request and a General Counsel request are competing for the same capacity window, VP Product's request takes priority. This is unconditional. The Tech Writer does not need to negotiate this; it is the default.

### When GC requests exceed the 20% allocation

If General Counsel requests exceed the 20% boundary in a given week, the following applies:

1. **Queue first.** Non-urgent GC requests that arrive once the 20% is consumed are queued to the following week, unless the General Counsel flags the request as urgent with a specific business reason.

2. **Urgent overflow.** If a GC request is genuinely urgent (e.g., a legal document needed before a client meeting or a filing deadline) and exceeds the 20% boundary, the General Counsel escalates to the CEO. The CEO determines whether to temporarily increase the allocation for that week and informs VP Product.

3. **Persistent overflow.** If the General Counsel consistently requires more than 20% over two consecutive months, the General Counsel raises a resourcing request with the CEO. The CEO determines whether to adjust the standing allocation, acquire additional capacity, or decline.

VP Product does not negotiate allocation directly with General Counsel. All allocation changes go through the CEO.

---

## Tech Writer Escalation: Overload Protocol

The Tech Writer escalates to VP Product immediately if any of the following occur:

- The combined VP Product and General Counsel workload cannot be completed within committed SLAs in the current week
- A GC request arrives that would displace a VP Product commitment unless actioned immediately
- Conflicting instructions are received from VP Product and General Counsel without clear prioritisation
- Source material quality from either stakeholder is insufficient to complete the task (missing decisions, unconfirmed specs, contradictory requirements)

The escalation format is:
1. State the specific conflict or capacity constraint
2. List the affected tasks and their committed deadlines
3. Propose a resolution (which task to defer, which to prioritise)
4. Await VP Product's decision before proceeding

The Tech Writer does not resolve allocation conflicts unilaterally. When in doubt, VP Product decides.

---

## Related Policies

- `company/policies/approval_gates.md`
- `company/policies/csuite_operating_standards.md`
- `roles/tech_writer/prompts/system_prompt.md`
- `roles/general_counsel/prompts/system_prompt.md`
