---
source: granola
source_id: not_TesS3FuhZewl5j
source_path: https://notes.granola.ai/d/0f0ffadd-72b7-4d89-8ce3-bf643fd20534
ingested: 2026-07-27
topics_detected: [hiring, interview-methodology, ai-assisted-interviews, candidate-assessment, data-analyst]
relevance_score: 8
novelty_score: 9
actionability_score: 9
bank_candidates: [client_patterns, production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Interview AI-Assistance Detection: Behavioural Signals and the Practical Task Backstop

## Key Content

A pattern emerging in technical interviews: candidates appearing to use AI tools (LLMs, translation aids, or both) to generate answers in real time during the call, producing surface-level answers that are technically correct but lack applied depth.

**Behavioural signals observed:**
- Eye contact drops on complex questions; eyes move laterally across a screen rather than staying with the camera
- The candidate types or inputs something before responding to complex questions -- delay is inconsistent with the question complexity
- English fluency is otherwise functional but degrades on spontaneous or abstract follow-up questions
- Answers are technically correct at a definitional level but contain no distinctive applied detail -- every technical topic produces the same texture of response (generic, textbook-level)
- The candidate struggles with abstract or scenario-based questions that require rapid contextual reasoning -- these are harder to route through a tool in real time

**What it does NOT prove:**
- The signals are behavioural, not conclusive -- a second-language candidate processing carefully may exhibit similar patterns
- A candidate using a translation tool (not an LLM) may produce the same signals for different reasons
- The consistency of the pattern across multiple question types, rather than a single instance, is what elevates concern

**The practical task backstop:**
- If there is any doubt after a video interview showing these signals, do not advance without a time-boxed practical task designed to be completed independently without AI assistance
- Design the task to require applied judgement that does not produce a clean, structured answer through a general LLM prompt -- e.g. an ambiguous dataset with an implicit question rather than an explicit one
- A candidate who cannot do the practical task without AI assistance will reveal the gap; a candidate who is genuinely capable will show applied depth that was missing in the live interview

**Interview probe for data analyst roles observed to surface the pattern:**
- Dashboard design question (produces generic answers if AI-assisted)
- Retention formula derivation (same)
- Telemetry schema design (same)
- Scenario: unexpected metric anomaly (crash rate and completion rate diverge) -- requires genuine situational reasoning, harder to AI-assist in real time
- Domain-specific terminology check (e.g. "gains and drains"): recognise and define is easy to AI-assist; demonstrate applied experience is not

## Decisions / Insights

- Interviewer decided: candidate showed consistent behavioural signals of AI assistance across multiple question types -- advance only with a practical task, not on interview performance alone
- Interviewer observed: surface-level generic answers that are technically correct across every domain topic are a stronger AI-assistance signal than a single weak answer -- no genuine specialist produces uniformly textbook-level responses
- Interviewer observed: abstract or scenario-based questions are the most resistant to real-time AI assistance -- these should be included in any interview where AI-assistance is a concern
- Interviewer decided: the practical task is the backstop, not the primary screen -- it is the tool for resolving ambiguity when the live interview is inconclusive

## Context

Technical interview for a game data analyst role at a studio, 2026-07-27. Two rounds of interviews conducted. Candidate showed consistent behavioural signals of AI-assisted answering throughout the second round, assessed by an interviewer with data science and game analytics background. Candidate outcome: not advanced without a practical task assessment. Named candidate details withheld.

## Applicability

Relevant when: interviewing candidates for any technical role where AI assistance could allow a junior or misrepresenting candidate to pass a verbal interview -- the practical task backstop is the resolution mechanism.
Relevant when: designing interview processes for game data analyst, data scientist, or analytics roles -- scenario-based and anomaly-diagnosis questions are more AI-resistant than formula or definition questions.
Relevant when: a candidate shows a mix of technically correct answers and poor abstract reasoning -- the inconsistency pattern (strong on definitions, weak on applied scenarios) is a signal worth investigating with a practical task.
Relevant when: advising a client on interview process design for technical roles -- adding one AI-resistant scenario question and a contingency practical task requirement costs little and substantially reduces the risk of a misrepresented hire.
