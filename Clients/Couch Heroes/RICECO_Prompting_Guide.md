# RICECO: How to Write Prompts That Actually Work

RICECO is a six-part structure for writing AI prompts. Each letter is one section of your prompt. You don't always need all six, but when you use them together, the output quality jumps dramatically. Think of it as a briefing document for an extremely capable new hire who knows nothing about your situation.

---

## R — Role

Tell the AI **who it is** for this task. Not just a job title; include the expertise, experience level, and perspective you need.

**Weak:** "You are a marketing expert."
**Strong:** "You are a senior games marketing strategist with 10+ years in live-service titles. You understand Steam community dynamics, MMO launch cycles, and the difference between awareness marketing and retention marketing."

**Why it matters:** The role shapes tone, depth, vocabulary, and which trade-offs the AI prioritises. A CFO perspective produces different output from a creative director perspective, even on the same topic.

---

## I — Instructions

Tell the AI **exactly what to do**, step by step. This is the core task. Be specific about the deliverable, not vague about the goal.

**Weak:** "Help me with our marketing plan."
**Strong:** "Produce a 12-month marketing calendar for a cosy MMO launching in Q4 2028. For each month, specify: the campaign theme, primary channel, target audience segment, estimated budget range, and the key metric to track. Prioritise community-building over paid acquisition in months 1 through 6."

**Why it matters:** Vague instructions produce generic output. Specific instructions produce output you can actually use. If you would give a contractor a detailed brief, give the AI the same.

---

## C — Context

Give the AI **the background it needs** to make good judgements. Team size, constraints, timeline, tools you already use, decisions already made, anything that shapes what "good" looks like.

**Examples of useful context:**
- "We are a 70-person remote studio using Unreal Engine 5, targeting a late 2028 launch."
- "Our QA team is one person. We cannot absorb additional process overhead."
- "The art director has strong reservations about AI-generated imagery."

**Why it matters:** Without context, the AI gives you advice for a generic company. With context, it gives you advice for *your* company. Context is where most prompts fail; people assume the AI knows their situation. It does not.

---

## E — Examples

Show the AI **what good output looks like**. Paste in a sample of the format, tone, depth, or structure you want. One concrete example is worth a paragraph of description.

**How to use it:**
- Paste a previous report section and say "match this format"
- Show a table layout and say "use this exact structure for all entries"
- Give a before/after pair: "This is what I don't want [example]. This is what I do want [example]."

**Why it matters:** Examples eliminate ambiguity. Instead of arguing about what "concise" or "detailed" or "professional" means, you just show it.

---

## C — Constraints

Tell the AI **what it must not do**, what rules are non-negotiable, and where the boundaries are. Constraints prevent the AI from taking shortcuts or making assumptions you haven't approved.

**Examples of useful constraints:**
- "Do not recommend tools that have no verified production use in a shipped game."
- "All costs must be in USD."
- "British English throughout."
- "If you are uncertain about a fact, flag it rather than guessing."
- "Do not include company X in any recommendation."

**Why it matters:** Without constraints, the AI optimises for what looks impressive. Constraints force it to optimise for what is actually correct and usable. This is where you prevent hallucination, wrong tone, out-of-scope suggestions, and wasted effort.

---

## O — Output Format

Tell the AI **how to structure the response**. Specify headings, tables, bullet points, word counts, section order, or any structural requirement.

**Examples:**
- "Structure as: Executive Summary (1 page), then one section per department."
- "Use a table with columns: Tool, Cost, Verdict, Key Risk."
- "Each recommendation must include: what to do, who owns it, what success looks like after 90 days, and what would trigger a rollback."

**Why it matters:** Format controls readability. A brilliant analysis buried in a wall of text is useless. Specifying the output format means the result lands ready to use, not ready to reformat.

---

## Putting It Together

You don't need all six every time. For a quick question, **I + C** (instruction + context) is usually enough. For anything you would share with a colleague or present to a stakeholder, use all six.

| Situation | Sections to use |
|---|---|
| Quick question | **I** + **C** |
| Internal working document | **R** + **I** + **C** + **O** |
| Client-facing deliverable | All six: **R** + **I** + **C** + **E** + **C** + **O** |
| Complex multi-part analysis | All six, with detailed constraints |

**The single biggest improvement** most people can make: add more **Context** and at least one **Example**. These two sections alone will transform generic AI output into something specific and usable.

---

*RICECO works with any AI model: Claude, ChatGPT, Gemini, or others. The framework is model-agnostic; what matters is the structure of the brief, not the tool you feed it to.*
