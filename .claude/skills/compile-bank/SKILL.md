---
name: compile-bank
description: "Compile raw intelligence extracts into a structured knowledge bank. Synthesises multiple extracts into coherent, queryable reference document. Triggers: compile bank, compile intelligence, build bank, update bank, synthesise knowledge."
category: intelligence
user-invocable: true
---

# Bank Compilation

Compiles raw intelligence extracts into a structured knowledge bank following the compilation agent's synthesis principles.

## Arguments

- `bank`: bank slug to compile (required). Must exist in intelligence/config/bank_registry.md.
- `--full`: force full rebuild (discard current bank and regenerate from all qualifying extracts)

## Process

1. **Validate bank exists.** Read `intelligence/config/bank_registry.md`. Confirm the slug is listed. If not: "Bank '{slug}' not found in registry. Available banks: {list}."

2. **Read bank schema.** Load `intelligence/config/bank_schemas/{slug}.md`. This defines the section structure.

3. **Gather qualifying extracts.**
   - Glob all files in `intelligence/raw/` (all source subdirectories).
   - Read frontmatter of each. Select where `bank_candidates` contains this bank's slug.
   - Apply quality gate: relevance >= 6 AND novelty >= 5 AND actionability >= 5.
   - If `--full`: use ALL qualifying extracts.
   - If incremental: use only extracts with `ingested` date > bank's `last_compiled` date.

4. **Check sensitivity.** If any qualifying extracts are `sensitivity_class: restricted`, list them and ask Glen for approval before including. Skip `restricted` extracts without approval.

5. **Read current bank** (if incremental). Load `intelligence/banks/{slug}.md` if it exists.

6. **Run compilation agent.** Spawn a sub-agent with:
   - System prompt: content of `intelligence/prompts/compilation_agent.md`
   - Inputs: current bank content (or "empty — new bank"), bank schema, qualifying extracts, bank registry entry
   - Instruction (incremental): "Update this existing bank with these {N} new extracts. Integrate — don't append. Tighten existing content if new material supersedes it."
   - Instruction (new/full): "Create this bank from scratch. Here is the schema and {N} qualifying extracts. Synthesise into a coherent reference document."

7. **Verify output.**
   - Line count <= 500. If exceeded: ask compilation agent to tighten or recommend a split.
   - Has all schema sections (at minimum Executive Summary, domain sections, Open Questions, Source Index).
   - Every factual claim has a [source: extract_id] tag.

7b. **Verify content accuracy (MANDATORY — cannot be replaced by checking file existence or line count).**
   - Read 3 randomly selected entries from the compiled output.
   - For each entry: locate the cited `[source: extract_id]` in `intelligence/raw/`, read that source extract, and confirm the bank entry accurately represents the source. If a qualifier has been dropped, a threshold conflated, or a fact distorted: correct the entry before proceeding.
   - Sensitivity compliance check: search the compiled output for proper nouns appearing in any `sensitivity_class: restricted` or `anonymisable` extracts from the input set. If restricted content appears verbatim: abort, report to Glen, and do NOT proceed to Step 8. If anonymisable content appears unmasked in a general bank: correct before proceeding.
   - If any check fails: fix the issue and re-run this step. Do not proceed to Step 8 until all three sampled entries pass and sensitivity compliance is confirmed.

8. **Write bank.** Save to `intelligence/banks/{slug}.md`.

9. **Generate bank summary.** Write 50-line summary to `intelligence/synthesis/bank_summaries/{slug}.md` following the summary format: title, metadata line, What This Bank Knows (5 bullets), Most Recent Additions, Gaps.

10. **Update pipeline state.** In `pipeline_state.md`: update bank's last_compiled date, line count, extract count.

11. **Check if brief needs regeneration.** If >= 5 new entries were added OR this is a new bank: regenerate `intelligence/synthesis/intelligence_brief.md` by running the brief generation process.

12. **Commit.**
    ```
    git add intelligence/banks/{slug}.md intelligence/synthesis/bank_summaries/{slug}.md intelligence/pipeline_state.md
    git commit -m "intel(bank): {create|update} {slug} ({N} sources)"
    ```

## Anonymisation Handling

If any qualifying extract has `sensitivity_class: anonymisable`:
- For the client-scoped bank: include the full specific version
- For general banks: strip client name, replace with anonymous descriptor (e.g., "a 55-person remote UK game studio"), preserve the insight/pattern

## Output

Report:
- Bank: {slug}
- Mode: {new | incremental | full rebuild}
- Extracts integrated: {N}
- Bank size: {lines} / 500 max
- Key additions: {bullet list of main new content}
- Split needed: {yes/no}
