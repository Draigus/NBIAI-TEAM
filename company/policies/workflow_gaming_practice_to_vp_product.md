# Gaming Practice Lead to VP Product: Market Signal Handoff Workflow

**Owner:** VP Product
**Contributing role:** Gaming Practice Lead
**Effective date:** 2026-03-28
**Review cadence:** Quarterly, or after any Playsage roadmap planning session

---

## Purpose

The Gaming Practice Lead sits closer to working studios than any other role at NBI. Active engagements with Couch Heroes, Lighthouse Studios, Sarge Universe, and Goals Studio generate continuous first-hand observations about how studios work, what frustrates them, and what they wish they had. This workflow ensures those observations reach VP Product in a structured, actionable format rather than being lost in engagement memory or passed informally.

The Playsage product exists to serve studios. The Gaming Practice Lead's client-side intelligence is one of the most direct inputs NBI has into whether Playsage is solving the right problems. This workflow formalises that channel.

---

## What the Gaming Practice Lead Captures

The Gaming Practice Lead is responsible for capturing the following categories of signal during active consulting engagements:

**Genre and platform trends**
Patterns observed across multiple studios or engagements: genre-level shifts in player behaviour, platform dynamics (console certification timelines, mobile store policy changes, PC vs console player economics), or structural changes in how studios approach development. Examples: mid-core mobile studios moving away from subscriptions toward season passes; AA studios consistently underestimating cert submission lead times on PlayStation.

**Monetisation patterns**
Observations about what is and is not working in studio monetisation at the practitioner level: pricing benchmarks, conversion rate expectations, currency economy design patterns, battle pass fatigue signals, IAP bundle structures that are performing or failing. Particularly valuable where NBI has direct visibility into studio metrics via embedded team access (Lighthouse Studios).

**Live ops and content pipeline observations**
How studios are managing content cadence, event frequency, seasonal strategy, and the operational load of running live games. Pain points in live ops tooling, gaps in analytics access, workflow bottlenecks that recur across clients.

**Client pain points with data and intelligence tools**
Where clients express frustration with existing tools (Sensor Tower, AppMagic, Newzoo, internal analytics) or describe a gap that no current product fills. This is the highest-priority signal category for Playsage because it maps directly to product-market fit.

**Competitive intelligence**
Observations about what tools clients are actually using, what they are paying, what they like and dislike, and what would make them switch. This includes direct feedback about Playsage (positive or negative) received during engagement work.

---

## The Market Signal Format

Every signal passed from the Gaming Practice Lead to VP Product uses the following structured format. Unstructured observations are not actionable. The format exists to force enough specificity that VP Product can make a prioritisation decision without needing to go back for clarification.

```
MARKET SIGNAL
Date: [YYYY-MM-DD]
Source: [Client name or "cross-engagement pattern" if observed across multiple clients. Do not include confidential client detail that the client has not consented to sharing internally]
Category: [Genre/platform trend | Monetisation | Live ops/content pipeline | Data/intelligence tooling | Competitive intelligence]
Confidence: [HIGH | MEDIUM | LOW -- see definitions below]

What was observed:
[Concrete description of what happened, what was said, or what pattern was identified. Specific over vague. "The studio's live ops team manually exports CSVs from their analytics platform every Monday because there is no API access to the retention cohort data they need" is a signal. "Studios want better analytics" is not]

Source context:
[Brief note on why this source is credible. Single embedded team member's opinion is LOW confidence. Consistent pattern across three engagements is HIGH confidence. Direct client statement about tooling spend is HIGH confidence]

Potential product implication for Playsage:
[What this might mean for Playsage features, modules, or positioning. This is the Gaming Practice Lead's hypothesis only -- VP Product determines whether to act on it. One or two sentences maximum. If there is no clear implication, say so rather than stretching the signal to fit]
```

**Confidence definitions:**
- HIGH: Observed directly, corroborated by data or multiple sources, high likelihood of being a real and persistent pattern
- MEDIUM: Observed once or twice, not yet corroborated, plausible but not confirmed
- LOW: Anecdotal, single source, possible outlier, or the Gaming Practice Lead is uncertain whether it generalises

---

## How Signals Are Passed to VP Product

**Cadence**
The Gaming Practice Lead submits a market signal batch to VP Product once per fortnight. The batch contains all signals captured since the previous submission, formatted per the template above. There is no minimum or maximum number of signals per batch; quality over quantity. Three well-evidenced signals with clear product implications are more useful than twelve vague observations.

**Mechanism**
The Gaming Practice Lead files signals as a structured document in the project knowledge directory: `projects/playsage/knowledge/market_signals_[YYYY-MM].md`. VP Product reviews from there. The Gaming Practice Lead notifies VP Product when a new batch is filed.

**Urgent signals**
If a signal is time-sensitive (e.g., a client has just told the Gaming Practice Lead that a competitor is about to launch a feature Playsage does not have, or a key client is considering switching away from a Playsage-adjacent tool), the Gaming Practice Lead flags it to VP Product immediately outside the fortnightly cadence. Urgent signals are still filed in the same format; the urgency flag is added at the top of the document.

---

## How VP Product Receives and Acts on Signals

**Review cadence**
VP Product reviews each signal batch within five business days of it being filed. This is not optional. The Gaming Practice Lead's engagement work generates the signals in real time; a backlog of unreviewed signals means the product roadmap is operating on stale intelligence.

**Intake decision**
For each signal, VP Product makes one of three decisions:

1. **Backlog candidate.** The signal points to a genuine product gap or opportunity that warrants a backlog item. VP Product creates a backlog entry in `projects/playsage/backlog/` referencing the originating signal and its confidence level. The backlog item then goes through standard prioritisation (RICE or equivalent). The signal alone does not determine priority.

2. **Monitor.** The signal is noted but the confidence is too low, or the pattern is not yet sufficiently established, to warrant a backlog item. VP Product logs it as a "watching brief" in the product intelligence notes and returns to it if additional signals reinforce it.

3. **Discard.** The signal is not relevant to Playsage, is already covered by existing roadmap items, or contradicts stronger evidence. VP Product notes the reason for discarding.

VP Product does not need to respond to the Gaming Practice Lead with a decision on every individual signal. The Gaming Practice Lead's job is to surface the intelligence; VP Product's job is to decide what to do with it.

**Feedback loop**
VP Product provides a summary response to the Gaming Practice Lead at the fortnightly cadence: which signals were actioned, which are on watching brief, and whether there are categories of intelligence that would be particularly useful for VP Product to receive. This keeps the signal quality improving over time and ensures the Gaming Practice Lead understands what is useful.

---

## What the Gaming Practice Lead Does Not Do

The following are outside the Gaming Practice Lead's remit in this workflow:

- **Does not make product decisions.** Surfacing a signal is not the same as deciding it should be built. The Gaming Practice Lead's hypothesis about product implication is input, not instruction. VP Product owns the roadmap
- **Does not add items directly to the Playsage backlog.** All backlog entries are created by VP Product. The Gaming Practice Lead has no write access to the product backlog in this workflow
- **Does not commit to clients that NBI will build specific features.** If a client asks whether Playsage will add a specific capability, the Gaming Practice Lead answers that it will pass the feedback to the product team. No promises are made about roadmap. This is VP Product's call, via the CEO if the commitment is strategic
- **Does not contact VP Product about every individual observation as it happens.** The fortnightly batch cadence exists to protect VP Product's focus. Ad hoc interruptions are reserved for genuine urgency (defined above)
- **Does not filter signals based on their own view of product strategy.** The Gaming Practice Lead captures what is observed and passes it on. It is not the Gaming Practice Lead's role to pre-judge which signals VP Product will find useful. If in doubt, include it

---

## Related Policies and Files

- `roles/gaming_practice_lead/prompts/system_prompt.md`
- `roles/vp_product/prompts/system_prompt.md`
- `projects/playsage/knowledge/` (market signals filed here)
- `company/knowledge/strategic_decisions.md`
- `company/policies/approval_gates.md`
