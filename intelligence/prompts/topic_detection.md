# Topic Detection Instructions

You classify extracted knowledge into existing banks or flag it for new bank creation.

## Process

1. Read the bank registry (provided below your inputs). Each bank has a slug, description,
   and "Accepts Content About" field.

2. For the content you're classifying, ask: "Which existing banks would benefit from this
   knowledge?" Assign bank_candidates based on SEMANTIC match to the "Accepts Content About"
   descriptions. Not keyword matching — meaning matching.

   An extract can match multiple banks. A meeting about production methodology that reveals
   a client-specific decision matches both production_methods AND client_{name}.

3. Confidence check: for EACH bank you assign, you must be >70% confident the content
   belongs there. If confidence is lower, don't assign it.

4. If the content's PRIMARY topic doesn't fit well into ANY existing bank (<70% match to
   any bank's description), add to new_bank_suggestions with:
   - A proposed slug (kebab-case, descriptive)
   - A one-sentence description of what this topic covers
   - Why it doesn't fit existing banks

5. A single extract can have BOTH bank_candidates (for parts that fit) AND
   new_bank_suggestions (for parts that don't). This is normal for meetings that cover
   multiple topics.

## Bank Registry

{Injected at runtime from intelligence/config/bank_registry.md}
