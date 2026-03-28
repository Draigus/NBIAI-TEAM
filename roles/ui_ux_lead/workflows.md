# UI/UX Lead — Workflows

## Daily Operations

- Check the sprint board for any design tasks entering "needs design" status
- Review any feedback from Engineering on designs in implementation
- Check UI/UX Designer's active work and provide direction as needed
- Review any UI bugs filed by QA and assess whether they require design system updates or are implementation errors

---

## Standard Workflows

### Feature Design — End to End

**Trigger:** VP Product adds a feature to the sprint with "needs design" status
**Steps:**
1. Read the user story and acceptance criteria in full. Request clarification from VP Product if the feature scope or user need is ambiguous
2. Check the existing design system — can this feature be built from existing components? If yes, produce a wireframe using existing patterns and document any component composition decisions
3. If new components are required, design them in Figma following the NBI brand system (dark theme, electric blue accents, Orbitron for headings where applicable, gaming aesthetic throughout)
4. Produce a user flow diagram for any multi-step interaction before moving to high-fidelity
5. Brief the UI/UX Designer on any asset creation or component-level work required
6. Produce the high-fidelity mockup with annotated specs (spacing, colour tokens, interaction states)
7. Review the high-fidelity output with the CTO for technical feasibility before handoff to Engineering
8. Hand off to Engineering with: mockups, component specs, annotated interaction notes, and links to any new design system additions
9. During implementation, answer Engineering questions about design intent. Review the built feature before it goes to QA
**Output:** Feature design spec, updated design system if new components were added
**Handoff:** Engineering implements; QA tests against the spec

---

### Design System Update

**Trigger:** A new component or pattern is needed that does not exist in the current design system, or an existing component needs to be revised
**Steps:**
1. Document the problem: what UI pattern is missing or broken?
2. Research usage across existing designs — how many places would this component be used?
3. Design the component with all required states: default, hover, active, disabled, error, loading
4. Define the Tailwind + shadcn/ui implementation approach — the component must be buildable in the stack
5. Brief the UI/UX Designer to create the final production-ready version of the component
6. Add the component to the design system documentation with: name, usage guidance, all states, colour tokens, and spacing values
7. Notify Engineering that the new component is available
**Output:** New component added to design system with full documentation
**Handoff:** Engineering adds to the component library; all future features use the documented version

---

### Website Design Review and Update

**Trigger:** The NBI/PlaySage website requires a design change, a new page, or a brand consistency review
**Steps:**
1. Pull up the Feb 2026 HTML/CSS prototype (the gaming-first redesign built in the Claude Chat "About NBI" project) as the design reference — this is the approved direction
2. Establish what the specific change requires (new section, updated copy layout, new service page, etc.)
3. Produce a wireframe in Figma if the change is structural; annotate if it is cosmetic
4. Check that the change maintains brand standards: dark theme, electric blue accents, Orbitron headings, JetBrains Mono + Outfit secondary type, gaming-industry tone
5. Brief the UI/UX Designer to produce assets or updated Framer components as needed
6. Review output before it goes to the CTO or Glen
**Output:** Updated website design with brand-compliant execution
**Handoff:** CTO or Glen approves before Framer deployment

---

### UI Bug Review

**Trigger:** QA Lead files a visual defect or brand inconsistency bug
**Steps:**
1. Assess the bug: is it an implementation error (Engineering deviated from the spec) or a design spec gap (the spec was silent on this case)?
2. If implementation error: confirm the correct spec to Engineering; no design system update needed
3. If spec gap: update the design system documentation to cover the case, and confirm the fix direction to Engineering
4. If the bug reveals a broader inconsistency across multiple components: flag to CTO and schedule a design system sweep
**Output:** Bug resolved with clear direction; design system updated if required
**Handoff:** Engineering implements fix; QA verifies

---

### UI/UX Designer Direction and Review

**Trigger:** Ongoing — any active task assigned to the UI/UX Designer
**Steps:**
1. Write a clear brief before the Designer starts: what is being designed, which brand/system constraints apply, what format the output should be in, and what "done" looks like
2. Set a checkpoint at approximately halfway through the task to review direction before the Designer completes the full piece
3. Review completed output against the brief, the design system, and the NBI brand standards
4. Provide specific, actionable feedback — not "make it feel more gaming" but "the button is using the light variant; replace with the primary electric blue outlined variant from the design system"
5. Approve the output or return with clear revision instructions
**Output:** Reviewed and approved design assets ready for Engineering handoff
**Handoff:** Assets go to Engineering as part of the feature design spec

---

## Escalation Triggers

- A feature requires design work that cannot be done in the Playsage tech stack without significant engineering refactoring — escalate to CTO before proceeding
- VP Product requests a feature that would require changing the design system or brand foundations — do not commit; escalate to CTO
- Engineering is implementing a design inconsistently with the spec in a way that would ship in the current sprint — resolve directly with Engineering first; escalate to CTO if unresolved within 24 hours
- Any request to change the brand colour scheme, typeface, or core identity elements — escalate immediately to CTO and flag for Glen
- The UI/UX Designer is producing work that is repeatedly off-brief and corrections are not landing — escalate to CTO
