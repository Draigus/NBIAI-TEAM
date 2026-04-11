# Approval Gates Policy

## Purpose
Defines which actions agents can take autonomously and which require Glen Pryer's explicit approval before execution.

## Auto-Approve (No Human Review Needed)

These actions proceed without waiting for approval:

- Internal research and analysis
- Code writing, refactoring, and technical implementation
- Internal document drafting (specs, reports, plans, briefs)
- Test plan creation and test execution
- Architecture proposals within existing canon decisions
- Internal status reports and summaries
- Cross-agent task requests through proper channels
- Data analysis and dashboard creation
- Meeting preparation and agenda drafting
- Competitive research and market analysis
- Internal process documentation
- Bug filing and triage
- Code review feedback

### C-Suite Delegated Authority (CEO, CFO, COO jointly)

The following decisions are delegated to the C-suite and do not require Glen's approval:

- **AI agent hiring:** Creating new AI agent roles when the C-suite has high confidence the role is critically needed. Requirements: (1) deep and robust job description following the role template, (2) thorough interview/fitness test of the agent using the Head of People's activation assessment protocol, (3) joint agreement from CEO, CFO, and COO
- **AI spend cap management:** Setting and adjusting the monthly AI token budget within the formula: Max plan token cap minus 30%. C-suite can adjust the cap within this ceiling
- **Tool call limits per execution:** Setting and adjusting the maximum tool calls per agent execution. Starting at 10. C-suite can increase based on performance data. Zero tolerance for wasteful token burn with no value produced
- **Operational optimisation decisions:** Adjustments to agent execution parameters, scheduling, and resource allocation that improve efficiency without increasing overall spend ceiling

## Requires Glen's Approval

These actions MUST be presented to Glen for sign-off before execution:

### External Communications
- Sending emails to anyone outside NBI
- Posting in client Slack channels, Teams, or Telegram
- Social media posts (LinkedIn, X, or any public platform)
- Responding to client enquiries
- Any message sent on Glen's behalf

### Client-Facing Work
- Deliverables going to clients (reports, decks, analyses)
- Proposals and statements of work
- Client meeting agendas and follow-up actions
- Pricing and engagement terms

### Financial
- Any spending commitment (subscriptions, tools, services)
- Invoice creation or payment authorisation
- Budget changes or reallocations
- Financial projections shared externally

### Strategic
- Pivoting from canon decisions (see strategic_decisions.md)
- Changing company positioning or messaging
- New partnership or client commitments
- Hiring real people (not AI agents)

Note: AI agent role creation is delegated to C-suite (see C-Suite Delegated Authority above). Org structure changes involving real humans still require Glen's approval.

### Legal
- Any document that creates binding legal obligations (contracts, terms of service, NDAs, engagement letters) must be reviewed by a qualified human solicitor before signature, even if drafted by the AI legal team
- Changes to company articles, shareholder agreements, or entity structure
- Regulatory filings (ICO registration, Companies House filings)
- Responses to legal claims, disputes, or regulatory enquiries

Note: The AI legal team (General Counsel + 3 lawyers) drafts, advises, and structures legal documents. A real human solicitor validates before anything is signed or filed. This is a non-negotiable safety gate.

### Publishing
- Anything posted publicly (website, social media, forums)
- Press releases or public statements
- Case studies or testimonials shared externally

## How Approval Works

1. Agent prepares the deliverable or action
2. Agent presents it with clear context: what it is, who it goes to, why now
3. Glen reviews and either approves, requests changes, or rejects
4. Only after explicit approval does the action execute
5. If Glen is unavailable, the action waits. It does not default to approved

## Edge Cases

- If an agent is unsure whether something needs approval, it needs approval
- "Draft" does not mean "send" — drafts are auto-approved, sending requires approval
- Internal-to-NBI communications (Teams messages to the NBI team) require approval if they contain decisions or commitments
