---
last_verified: 2026-05-16
---

# EAD Framework — Process Optimisation Methodology

**Last Updated:** 2026-05-15

---

## The EAD Rule

For every process you touch, ask three questions in strict order:

### 1. Eliminate

**"Does this need to exist at all?"**

Before optimising a process, challenge whether it should exist. Most organisations carry processes that were created for a reason that no longer applies: a compliance requirement that changed, a stakeholder who left, a tool limitation that was fixed, a workaround that became permanent.

**Questions to ask:**
- What happens if we stop doing this entirely?
- Who would notice? How quickly?
- Is this serving the business or serving the process?
- Was this created as a workaround? Does the original constraint still exist?

**Kill criteria:** If stopping the process for two weeks would go unnoticed, or if the only justification is "we've always done it", eliminate it.

### 2. Automate

**"Can a system do this without human judgement?"**

If the process survives the Eliminate gate, ask whether it requires human thinking or just human hands. Processes that follow predictable rules, operate on structured data, and produce deterministic outputs are automation candidates.

**Good automation targets:**
- Data transformation and formatting
- Status aggregation and reporting
- Threshold monitoring and alerting
- Scheduled information gathering
- Template-driven document generation
- Cross-system data synchronisation

**Poor automation targets (keep human):**
- Relationship-dependent decisions
- Ambiguous or context-heavy judgement calls
- Creative strategy requiring taste
- Anything where the cost of a wrong answer exceeds the cost of a slow answer

### 3. Delegate

**"Who or what should own this?"**

If it can't be eliminated or fully automated, delegate it to the right level. Delegation isn't just "give it to someone junior." It's matching the process to the appropriate capability tier.

**Delegation tiers:**
- **AI agent (routine):** Scheduled, autonomous, no human in loop. Daily briefs, monitoring, data pulls.
- **AI agent (supervised):** AI does the work, human reviews before it ships. Draft documents, analysis, recommendations.
- **Junior human:** Process is well-defined, training is straightforward, judgement required is bounded.
- **Senior human:** Process requires experience, relationships, or strategic judgement.
- **Owner (Glen):** Only if it requires Glen's specific relationships, authority, or taste. Everything else should be delegated away from the owner.

---

## Applying EAD to Client Engagements

When scoping AI operations work for a client studio:

1. **Audit phase:** Map every recurring process the studio runs (weekly reports, sprint ceremonies, competitive monitoring, QA pipelines, release checklists, etc.)
2. **EAD pass:** Run each process through Eliminate, Automate, Delegate in order
3. **Deliverable:** A process map showing: eliminated (with justification), automated (with implementation approach), delegated (with tier assignment and ownership)
4. **Priority:** Automate the highest-frequency, lowest-judgement processes first. These deliver visible ROI fastest and build trust for the harder changes.

---

## Anti-patterns

- **Automating before eliminating:** Building a sophisticated system to do something that shouldn't be done at all
- **Delegating without defining:** Handing off a process without clear inputs, outputs, and success criteria
- **Eliminating by neglect:** Stopping a process without telling anyone, then discovering it mattered
- **Over-automating:** Automating processes that change frequently; the maintenance cost exceeds the execution cost
