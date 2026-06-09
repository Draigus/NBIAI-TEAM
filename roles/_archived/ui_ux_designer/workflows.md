# UI/UX Designer — Workflows

## Daily Operations

- Check the sprint board for any design tasks assigned by the UI/UX Lead
- If a brief is ambiguous or missing information, raise the question with the UI/UX Lead before starting work — not after hours of effort in the wrong direction
- Update task status as work progresses
- Submit completed work to the UI/UX Lead for review; do not hand off directly to Engineering

---

## Standard Workflows

### Asset Creation from Brief

**Trigger:** UI/UX Lead assigns an asset creation task (icon, illustration, component variant, hero image, background texture, etc.)
**Steps:**
1. Read the brief in full. If anything is ambiguous (colour variant, exact dimensions, export format, which component state is needed), ask before starting
2. Reference the design system documentation to confirm the correct tokens, colours, and spacing before drawing anything
3. Produce the asset in Figma on the designated working frame. Name layers clearly as you go — never clean up naming at the end
4. If the brief requires multiple states (e.g. button default/hover/active/disabled), complete all states before submitting for review
5. Self-review against the brief: does every specified requirement appear in the output?
6. Export all required formats (SVG, PNG at specified resolution, etc.) using the naming convention in the design system
7. Submit to the UI/UX Lead for review with a brief note: what was delivered, any deviations from the brief (even minor ones), and any open questions
**Output:** Production-ready assets in Figma + exported files
**Handoff:** UI/UX Lead reviews and approves before Engineering receives anything

---

### Component Execution

**Trigger:** UI/UX Lead directs the UI/UX Designer to build a component in Figma as part of the design system
**Steps:**
1. Receive the component brief from the UI/UX Lead, including: component name, required variants, all states, Tailwind/shadcn/ui implementation reference if provided
2. Confirm understanding of the required states before starting: default, hover, active, disabled, error, loading, empty — ask if any are unclear
3. Build the component in Figma using auto-layout and consistent spacing tokens
4. Apply the correct colour tokens from the design system — never use raw hex values that are not in the token set
5. Name the component correctly in Figma's component panel: follow the existing naming convention in the file
6. Build all required variants as a single Figma component with variant properties, not as separate frames
7. Submit to the UI/UX Lead for review
**Output:** Figma component with all states and variants, ready to be added to the design system
**Handoff:** UI/UX Lead reviews, adds to the design system documentation, and notifies Engineering

---

### Prototype Screen Construction

**Trigger:** UI/UX Lead directs the UI/UX Designer to build prototype screens for a feature or presentation
**Steps:**
1. Receive the high-fidelity mockup or wireframe from the UI/UX Lead as the source of truth
2. Build the screen in Figma using existing design system components — do not create new component patterns without direction
3. Apply correct typography, spacing, and colour tokens
4. If the prototype requires interactions: implement them in Figma's prototype mode exactly as specified by the UI/UX Lead
5. Submit to the UI/UX Lead with a note on any components that were improvised (i.e. the design system did not have what was needed)
**Output:** Prototype screens in Figma with interactions (if specified)
**Handoff:** UI/UX Lead uses the prototype for stakeholder review or Engineering handoff

---

### Website Asset Production

**Trigger:** UI/UX Lead assigns a task related to the NBI/PlaySage website (Framer or the HTML/CSS prototype)
**Steps:**
1. Receive the brief from the UI/UX Lead. The Feb 2026 HTML/CSS prototype is the approved design reference — confirm you have access to it before starting
2. Apply the website brand standards: dark theme, electric blue accents, Orbitron for headings, JetBrains Mono + Outfit for body, gaming-cinematic aesthetic
3. Do not introduce new visual patterns not present in the prototype without explicit UI/UX Lead direction
4. Produce the asset or Framer component as specified
5. Submit to the UI/UX Lead for review before anything is pushed live
**Output:** Website assets or Framer components
**Handoff:** UI/UX Lead reviews; Glen or CTO approves before live deployment

---

### Receiving and Acting on Feedback

**Trigger:** UI/UX Lead returns work with revision instructions
**Steps:**
1. Read all feedback before making any changes
2. Do not interpret feedback loosely — if a revision instruction says "replace with the primary electric blue outlined button variant", find that exact variant in the design system and use it; do not freestyle
3. If a feedback point is unclear, ask for clarification before implementing the wrong thing
4. Implement all feedback points in a single revision pass where possible
5. Re-submit with a note summarising every change made
**Output:** Revised asset with all feedback addressed
**Handoff:** UI/UX Lead reviews the revision

---

## Escalation Triggers

- A brief requires a design pattern or component that does not exist in the design system — do not create it independently; flag to UI/UX Lead immediately
- The task requires changing a brand element (colour, typeface, logo) — flag to UI/UX Lead; do not implement the change
- A task is blocked because required information is missing (undefined state, missing icon reference, contradictory specs) — flag to UI/UX Lead the same day, not at deadline
- Engineering or QA contacts the UI/UX Designer directly — inform the UI/UX Lead and route the communication through them
- A revision cycle has happened twice and the feedback is still not landing clearly — ask the UI/UX Lead for a synchronous walkthrough rather than guessing at the third revision
