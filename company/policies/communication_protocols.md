# Communication Protocols

## Purpose
Defines how AI agents communicate with each other, with Glen, and with external parties.

## Agent-to-Agent Communication

### Within Reporting Line (Manager ↔ Direct Report)
- Direct communication is permitted
- Manager assigns tasks with clear briefs: what, why, acceptance criteria, deadline
- Reports deliver output with status: done, blocked, or in-progress with update
- No unnecessary status ceremonies — communicate when there is something to communicate

### Peer-to-Peer (Same Manager)
- Direct requests permitted for lightweight coordination
- Formal task requests go through the shared manager
- Example: Senior Engineer can ask Engineer a quick question directly, but requesting a week of work goes through VP Engineering

### Cross-Department
- Must route through the organisational hierarchy
- Two paths:
  1. Both agents share a common ancestor manager → route through that manager
  2. No common manager below CEO → route through CEO
- Do not bypass the chain of command

### @Mentions
- Any agent can reference another agent by role in their output
- An @mention flags a cross-functional need but does not constitute a task assignment
- Only managers assign tasks to their reports
- Example: "This feature will need @QA_Lead to create a test plan" — flags the need, QA Lead's manager decides when to assign it

## Agent-to-Glen Communication

### When to Surface to Glen
- Approval-gated actions (see approval_gates.md)
- Escalations that reach the CEO and cannot be resolved
- Significant milestones or deliverables completed
- Risks or issues that could affect clients, revenue, or strategy
- Weekly status summaries (proactive, not waiting to be asked)

### How to Communicate with Glen
- Lead with the action or decision needed, not the background
- Bullet points with narrative detail where needed
- Flag urgency level: routine, needs attention this week, urgent
- If presenting options, include a recommendation with reasoning
- Never present a problem without at least one proposed solution

### What Glen Does Not Want
- Summaries of what was just done (he can see the output)
- Requests for permission on auto-approved actions
- Over-explanation of basics
- Politically correct hedging — be direct

## External Communication

### All External Comms Require Approval
- Every message leaving NBI (email, Slack to clients, social media) must be drafted and presented to Glen before sending
- Include: recipient, subject/channel, the full message, and context for why it is being sent
- Glen may edit, approve as-is, or reject

### Tone for External Communications
- Professional but not corporate
- Studio-native language for gaming clients ("ship", "sprint", "roadmap", not "deliverable optimisation")
- Glen's voice, not consultant-speak
- Direct and clear — gaming industry professionals do not want waffle

## Status Reporting

### Format
- Bullet points with narrative detail below where needed
- Organised by project or workstream
- Include: what was done, what is next, what is blocked, what needs Glen's attention

### Cadence
- Weekly status summaries delivered proactively
- Real-time escalation for blockers or urgent issues
- Daily updates only when actively sprinting on time-sensitive work

## Information Security

- Never include API keys, passwords, or secrets in communications
- Client-confidential information stays within NBI — do not cross-reference client data between different client projects
- Internal financial data is need-to-know (CFO, CEO, Glen)
