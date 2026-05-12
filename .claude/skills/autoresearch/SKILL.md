---
name: autoresearch
description: "Autonomous iteration loop that scores documents against criteria and improves them. Use when improving consulting deliverables, pricing models, pitch decks, strategy documents, or any text document that should meet defined quality standards. Triggers: autoresearch, improve document, iterate on quality, score and improve, quality loop, document quality, optimise deliverable, auto-improve, research loop, score document."
category: quality
user-invocable: true
---

# AutoResearch Engine

Autonomous experiment loop that scores a document against criteria, identifies the weakest dimension, makes one atomic improvement, re-scores, and keeps or reverts. Repeats until convergence or iteration limit.

Based on Karpathy's AutoResearch pattern. Applied beyond ML: Shopify on code performance, AutoBeta on strategic documents, MindStudio on marketing copy.

## Step 1: Intake

Parse the invocation for:
- **Target:** path to the document to improve (required)
- **Criteria:** one of `consulting` | `pricing` | `pitch` | path to custom criteria file (default: `consulting`)
- **Iterations:** number of improvement cycles (default: 10, max: 20)

If no target provided, ask:
> "Which document should I run the AutoResearch loop on? Provide the file path."

## Step 2: Load Criteria

Load the criteria file from `.claude/skills/autoresearch/criteria/{name}.md` or from the custom path provided.

The criteria file defines scoring dimensions with weights and descriptions. The judge uses these to score the document 1-10 on each dimension.

## Step 3: Initial Score

Read the target document. Score it against all criteria dimensions using this judge prompt:

> "Score the following document on each dimension from 1 to 10. For each dimension, provide:
> - Score (integer 1-10)
> - One-sentence justification citing a specific passage or absence
>
> Be harsh. An 8 means genuinely good with minor issues. A 5 means significant gaps. A 3 means fundamentally inadequate on this dimension.
>
> Dimensions:
> {list from criteria file with weights and descriptions}
>
> Document:
> {full document text}"

Record the scores. Compute weighted total. Report:
> "Initial assessment — total score: {weighted}/10
> {table of dimension scores}
> Weakest dimension: {name} ({score}/10) — starting improvement loop."

## Step 4: Improvement Loop

For each iteration (1 to N):

### 4a. Identify target
Select the dimension with the lowest score. If there's a tie, pick the one with higher weight. If the lowest-scoring dimension had three consecutive failed improvements, skip to the next-lowest.

### 4b. Plan improvement
Generate a specific, atomic improvement plan:
> "The document scores {score}/10 on '{dimension}' because: {justification from last score}.
> Identify ONE specific change that would improve this score. The change must be:
> - Atomic (one paragraph added/modified/removed, or one structural change)
> - Traceable (you can point to exactly what changed)
> - Reversible (the original text is preserved for comparison)"

### 4c. Apply change
Make the single atomic change to the document. Keep the change minimal — one paragraph, one section restructure, one evidence addition. Never rewrite the entire document.

### 4d. Re-score
Score the modified document on the SAME dimension only (not all dimensions — that's wasteful). Use the same judge prompt but for the single dimension.

### 4e. Keep or revert
- If new score > old score: **KEEP**. Update the document. Log the experiment.
- If new score <= old score: **REVERT**. Restore the original text. Log the experiment as reverted.

### 4f. Log
Append one JSON line to `{target_directory}/autoresearch.jsonl`:
```json
{"iteration": N, "dimension": "name", "change": "description of what was changed", "score_before": X, "score_after": Y, "kept": true|false, "timestamp": "ISO8601"}
```

### 4g. Check termination
Stop the loop if ANY of:
- Reached iteration limit (N)
- Three consecutive reverts (convergence — can't improve further)
- All dimensions score >= 8/10 (quality threshold met)

## Step 5: Final Score

After the loop completes, re-score ALL dimensions on the final document. Report:

> "AutoResearch complete — {iterations_run} iterations, {kept_count} improvements kept, {reverted_count} reverted.
>
> | Dimension | Before | After | Delta |
> |---|---|---|---|
> {table}
>
> **Total: {before}/10 → {after}/10 (+{delta})**
>
> Experiment log: `{path}/autoresearch.jsonl`
> Modified document: `{path}` (original preserved in git)"

## Step 6: Output

1. Write the improved document in place (overwriting the original — git preserves history)
2. The experiment log (`autoresearch.jsonl`) is already written incrementally during the loop
3. Commit both files:
   ```
   git add {document} {document_dir}/autoresearch.jsonl
   git commit -m "autoresearch: {document_name} — {before_score}→{after_score} ({iterations} iterations)"
   ```

## Error Handling

- If the document is too large to score in a single pass (>500 lines), score section-by-section and aggregate
- If a dimension is un-improvable (e.g., "evidence quality" when no external data is available), note it and move on after 3 failed attempts
- If the target file doesn't exist, error immediately
- If the criteria file doesn't exist and isn't a built-in name, error immediately
