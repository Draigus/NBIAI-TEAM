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
- Changes to the org structure
- Hiring real people (not AI agents)

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
