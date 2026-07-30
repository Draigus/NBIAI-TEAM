# Handoff: Couch Heroes design pillars, review and iteration

> **STATE UPDATE 2026-07-30 (Fable session):**
> - **DOCX is CURRENT again.** Word lock cleared; rebuilt from the markdown and verified
>   (543 paragraphs, 1 Title, 12 H1, 1 table, 0 stray markdown, 0 em/en/double dashes).
>   It reflects the round-2 mechanical fixes but NOT findings 7-17, which remain open in
>   both formats.
> - **Tier changed:** the successor session runs on Fable (project pin reverted to
>   `claude-fable-5[1m]` on 2026-07-30), so convergence needs ONE clean Codex pass, not
>   two. Resume step 3 below reads accordingly.
> - **Findings 7-17 still need a fresh-context session** (the "do not attempt at high
>   context" instruction stands; the 2026-07-30 session was carrying a full audit context
>   and deliberately did not attempt them). They are design judgement calls, not
>   mechanical fixes. `simon.txt` / `robin.txt` remain at repo root for Codex until
>   convergence.
> - Background note: rounds 1-2 ran under Opus 5. The 2026-07-28/30 audit
>   (memory `opus5-audit-2026-07`) found Opus 5 fabricated under pressure elsewhere that
>   week. Spot-checking its round-2 fix claims against the document on 2026-07-30 found
>   one HALF-APPLIED: fix 3 ("faster" removed from solo-valid activities) was applied in
>   Part 2 (the pillar text) but not in Part 1's review text at the three-category list,
>   which still conceded "faster". Corrected 2026-07-30 in both md and DOCX. The
>   draft-history removals (fix 1) grep clean. Re-verify any other specific claim before
>   building on it.

**Date:** 2026-07-27
**Session model:** Opus 5 (non-Fable, strict tier)
**Workstream:** Couch Heroes client deliverable. Separate from the dashboard workstream, whose
handoff remains untouched in `docs/HANDOFF.md`.

## Why this work exists

Glen rejected the 20 July pillars deliverable: "you synthesized a bunch of files to a pillars
doc but left in a bunch of llm guidance bullshit that corrupted its value. I wanted a
designers review synthisis and iteration not a llm guidance doc."

Verified before acting: his copy at `C:\Users\gpbea\Downloads\CH pillars GP.docx` is
text-identical to `Clients/Couch Heroes/game_design/Couch_Heroes_MMO_Game_Pillars_2026-07-20.docx`
(diffed clean, 477 paragraphs, no Word comments, no tracked changes). He is reading the 20 July
21-page version, not the 21 July four-pillar `Couch_Heroes_Core_MMO_Game_Pillars_2026-07-21.docx`.

Two failures in the rejected document:
1. Every concrete image from the sources was boiled off into abstraction.
2. Roughly half the page count was scaffolding present in neither source (traceability table,
   feature trace record, red-team checks, review test, decision order, source disposition).

Harness intervention logged, confirmed, severity `rejection`, component `role_dispatch`, in
`C:\Users\gpbea\.claude\harness\data\NBIAI_TEAM_aeb5ed\events\2026-07-27\ses_01KYH491FQVMZY4GQXRD.jsonl`.

## Glen's directives, in order given

1. Deliverable = designer's review AND iterated draft in one document (AskUserQuestion).
2. Audience = the four-way alignment session: Robin, Vardis, Simon, Glen (AskUserQuestion).
3. Structure = originally "keep all nine, fix in place" (AskUserQuestion), then **superseded**
   by: "consolidate to one pillar where there is real overlap and reframe as needed".
4. "no class wont be an issue with the skills system taking the place where players have
   choice to pick thier" (own).
5. "use common sense with the rest and try to build please, take your time and dont cut
   corners this only is valuable if deep thought is given to it and deep design skill is used".

Standing constraint from 21 July, still in force: "hobby" and "not a job" are not acceptable
identity language for the game; "respects the player's time" is self-congratulatory.

## Source material, all verified read this session

| File | Location | Notes |
|---|---|---|
| Simon's unified draft | `C:\Users\gpbea\Downloads\Design_Pillars_Unified_Draft.md.docx` | 426 paragraphs, 9 pillars + Trust the Player. The strong source. |
| Robin's pillars | `C:\Users\gpbea\Downloads\The Pillars (1).docx` | 44 paragraphs, 7 pillars, motto, checklist. Punchier, more directorial. |
| Glen's marked copy | `C:\Users\gpbea\Downloads\CH pillars GP.docx` | Identical to the 20 July output. No annotations. |

Plain-text extracts were staged at repo root as `simon.txt` and `robin.txt` so Codex could
read them. **These two files are temporary and should be deleted once Codex convergence is
finished.** They are untracked.

Miro alignment material was NOT read this session. Any claim sourced to it must not be made.

## Deliverables

- **`Clients/Couch Heroes/game_design/Couch_Heroes_Design_Pillars_Review_and_Iteration_2026-07-27.md`**
  13,585 words. Source of truth. Current.
- **`Clients/Couch Heroes/game_design/Couch_Heroes_Design_Pillars_Review_and_Iteration_2026-07-27.docx`**
  **STALE.** Built from the pre-Codex version. Rebuild is blocked by a Word file lock from the
  earlier `Start-Process`.
- **`Clients/Couch Heroes/scripts/build_pillars_review_docx.py`** Markdown to DOCX builder.
  Deliberately plain Word styling to match Simon's own draft register. No cover, no colour.

### To rebuild the DOCX (first action on resume)

```
# Glen must close the file in Word first, or this throws PermissionError
cd "d:/OneDrive/Claude_code/NBIAI_TEAM/Clients/Couch Heroes/scripts"
python build_pillars_review_docx.py
```

Then verify with the extraction check: 1 Title, ~12 Heading 1, 1 table, zero paragraphs
containing `**` or starting with `#` or `- `.

## Document structure as built

Part 1, the review: where the drafts are strong; what was merged and why; what was
deliberately not merged and why; what was moved; five things argued wrong; where Robin is
overruled; gaps neither draft answers. Part 2, the iterated draft: the game we want to make,
Trust the Player and Build Systemically moved to the front, eight pillars in Simon's six-part
structure, philosophy, three checklists, then eleven decisions for the session.

**Eight pillars:** 1 Identity Is Earned Not Picked / 2 The World Remembers / 3 Never the Same
Twice Never One Answer / 4 Better Off Beside Each Other / 5 Players Author the Best Moments /
6 Possibility Never Obligation / 7 Tend the World Together / 8 A World of Worlds.

## Design decisions taken (do not silently reverse these)

- **Merged Simon's 3 and 4.** Per Glen's consolidation instruction. Codex argues strongly for
  splitting them back, on the grounds that they are orthogonal tests. Both arguments are in
  the document; decision item 2 puts it to the room.
- **Did NOT merge P2 with P7**, despite the apparent overlap, because merging demotes
  Corruption to a bullet. Boundary is now mechanical and three-way: P2 afterwards and
  attribution and lore, P7 the verb and the permanence tiers, P5 the moment.
- **Difficulty:** the challenge sets a fixed bar, skills are the vocabulary for clearing it.
  Explicitly NOT adaptive scaling to the player's loadout, which would rubber-band and destroy
  Simon's "the boss that used to beat you, beaten". Labelled in the document as Glen's call.
- **Cooperation:** three named activity categories, solo-valid / cooperative / solo-viable
  progression, assigned at design time. No raw per-head yield multipliers anywhere.
- **Balance:** ecosystem viability. Trivialising one encounter is a story; being the answer to
  most content is a defect corrected in the open.

## Verification state

| Check | Result |
|---|---|
| Em dashes, en dashes, double-dash substitutes | 0 / 0 / 0 |
| Americanisms, minimising language | none ("just" appears 13 times, all "not just X") |
| Stray markdown in DOCX | 0 (checked against the pre-Codex build) |
| Legal claim on minors' accounts | VERIFIED by live web search: UK GDPR self-consent at 13, under-13s need parental consent, ICO Children's Code covers services likely accessed by under-18s |
| Harness `finish-task.js` | was NOT VERIFIED pending web_search on `client_deliverables`; that search has since been run |
| **Codex convergence** | **NOT REACHED. Round 1 FAIL, all findings fixed. Round 2 FAIL, six mechanical findings fixed, eleven design findings OPEN (below).** |

## Codex round 2: FAIL. Open findings, in priority order

Round 2 output is at
`C:\Users\gpbea\AppData\Local\Temp\...\tasks\bzkjws4zr.output` (temp, will not survive). The
findings are reproduced here in full because they are the work list.

**Fixed already (mechanical, no design judgement needed):**

1. Draft-history narration removed from the client text ("my first attempt", "argued myself
   out of it twice", "the first version of this edit"). This was revision-process debris and
   the closest thing left to the failure Glen originally rejected.
2. "A note on the shape" section deleted entirely. It was an authoring rubric explaining how
   to write a pillar, which is not game direction.
3. Solo-valid activities: "faster" removed. Faster completion IS higher hourly productivity,
   so the throughput pressure survived my round-1 fix in a different unit.
4. The absence guarantee no longer promises that relative economic position is preserved,
   which is impossible in a live market. It now promises nothing is taken from you.
5. Footer provenance claim corrected. It previously asserted that every position absent from
   the sources is identified as such, which is false.
6. Pillar 2 no longer claims "the moment" or lists music, both of which belong to Pillar 5
   under the new during/after boundary.

**OPEN, needs design judgement. Do not attempt these at high context.**

7. **The three-category cooperation model is a category error.** "Solo-valid" and
   "cooperative" classify activities; "solo-viable progression" describes a route across many
   activities. They overlap, so "every activity is placed in exactly one" is not executable.
   Likely fix: two activity categories plus a separate global guarantee about progression
   routes. This is my defect, introduced in round 1.
8. **Pillars 2 and 7 still double-own permanence and attribution.** P2 claims "the credit and
   the permanence of the record"; P7's Forever tier includes both the historical record and
   "who reopened it". Separately, P2 promises the rebuilt bridge is there "every day after"
   while P7 allows restored structures to break in an incursion. Decide: P7 owns the tier, P2
   owns the credit only, and the record of who built it survives the structure.
9. **The two-part test for the retained P3/P4 merge is unusable as written.** "Three visits a
   week apart" is arbitrary and unavailable during ordinary feature approval, cannot test
   one-off adventures or permanent events, and requiring both halves of every citing feature
   makes foundational systems fail unless unrelated scope is bundled in. Make it a review
   question, and scope it to features that shape encounters, regions or events.
10. **The readable-grammar versus secret boundary is labelled, not solved.** "Thresholds" and
    "conditions" are classified as secret, but they can define how a verb works. Needs a
    mechanical test. Proposed direction: if not knowing it makes a plan fail unpredictably it
    is grammar, and a genuine bug must be distinguishable from a secret we refuse to confirm.
11. **Skills are still not a difficulty anchor.** A fixed bar prevents rubber-banding but does
    not define the capability envelope, progression band or execution standard the bar is
    tuned against. The draft also keeps gear and stat progression while saying skills mainly
    widen routes. What "becoming stronger" means mechanically is undecided and should go on
    the decisions list rather than be papered over.
12. **Quest continuity is an unsupported absolute.** "The quest waits" and "no quest fails" do
    not survive a shared world where the required state may be gone, and the document itself
    calls unstrandable objectives its biggest unsolved problem. Bind the promise to that
    pattern rather than asserting it.
13. **Time-slow: instanced is not the same as unshared.** Robin said instances slow time; he
    did not say solo instances. A party instance is still a shared simulation. The text
    alternates between the two as if equivalent.
14. **Simon's pillar 6 is still mischaracterised.** Round 1 fixed "almost no concrete images",
    but the replacement claims every cited element is retrospective capture. His pillar also
    covers authoring restraint, lightly held goals and the main quest's place. Fix it properly;
    he is going to read this.
15. **Robin's lore promise was silently narrowed.** "Moments of greatness upgrade the Lore"
    became "the rarest achievements" by "a handful of players". Rarity and exclusivity are new
    gates that are not on the decisions list. Either restore Robin's scope or disclose the
    override alongside the other two.
16. **Unsupported production claims remain.** "Mythologies cost nothing", every shared story is
    free marketing, regularity causes retention, and group yield is "the easiest thing in an
    MMO" for bots. Some are Simon's own lines and should be attributed to him rather than
    asserted by this document; the bot claim is mine and should be qualified or dropped.
17. **Workshop plumbing still sits in the pillar bodies:** inline `[RATIFY]`, `Open`,
    `Flagged` and "see the decisions list" markers, when a decisions appendix already exists.
    Note that `[RATIFY]` is Simon's own marker, so keep his and remove mine.

Round 3 cannot be treated as a fresh start: strict tier needs two consecutive clean passes,
so a clean round 3 still requires a round 4.

## Resume sequence

1. Read `projects/nbi_dashboard/session_logs/2026-07-27_session.md` entries 7 to 10. They hold
   the full reasoning, not a summary of it.
2. Retrieve Codex round 2 from
   `C:\Users\gpbea\AppData\Local\Temp\claude\d--OneDrive-Claude-code-NBIAI-TEAM\c8e89f08-7001-4e46-833e-284ca5f84f7c\tasks\bzkjws4zr.output`.
   If that temp path is gone, re-run the round 2 prompt recorded in session log entry 10.
3. Fix anything round 2 raises. Strict tier needs **two consecutive clean passes**, so a clean
   round 2 still requires a round 3.
4. Ask Glen to close the DOCX in Word, then rebuild and verify.
5. Delete `simon.txt` and `robin.txt` from the repo root.
6. Do not send anything to Simon, Robin or Vardis without Glen's explicit approval. External
   sharing is an approval gate.

## Offers made to Glen, not yet answered

- Turn the eleven decisions into a running order for the alignment session.
- Cut a one-page version of the eight pillars for the wider team once these are signed.
- Mark the 20 and 21 July pillar documents superseded so nobody picks up the wrong one.
