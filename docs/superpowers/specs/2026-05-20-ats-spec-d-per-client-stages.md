# ATS Spec D: Per-Client Custom Stages

Depends on: Spec A (stage transition history, enriched positions), Spec B (interview rounds reference stage keys), Spec C (metrics compute from stage keys, stall thresholds reference stage keys, rejection enforcement references terminal stage).

## Summary

This spec is the existing [per-client-hiring-stages-design.md](2026-05-20-per-client-hiring-stages-design.md), updated to account for the ATS data layer built in Specs A-C.

The core design is unchanged: `hiring_stages` JSONB column on `clients`, gear icon editor for NBI admins, `onboarded` as the terminal stage, dynamic colour palette, kanban and detail panel render from resolved stages.

This document captures only the **deltas** — things that need updating now that Specs A-C exist.

## Delta 1: Stage Transition History Compatibility

Stage keys in `candidate_stage_history.from_stage` and `to_stage` are free text — they store whatever the stage key was at transition time. When a client changes their stages, historical transitions remain valid because they record what the stage WAS, not what it IS now.

The metrics queries (Spec C) group by stage key. If a client renames a stage key (removes old, adds new), historical data for the old key won't appear in current stage metrics. This is correct behaviour — the old stage no longer exists. The history timeline still shows the transition accurately.

No schema or logic changes needed. This is a documentation note.

## Delta 2: Stall Reminder Thresholds

Spec C hardcodes stall thresholds per stage name (sourcing: 7 days, interviews: 10 days, etc.). With custom stages, these named thresholds won't match.

**Resolution:** When a client has custom stages, use a single default threshold (10 days) for all custom stage keys. The named thresholds only apply to stages matching the default stage keys. Future enhancement: allow per-stage thresholds in the `hiring_stages` JSONB objects:

```json
{ "key": "technical-review", "label": "Technical Review", "stall_days": 5 }
```

For now, the `stall_days` field is optional and defaults to 10 if not present.

## Delta 3: Rejection Enforcement and Terminal Stage

Spec C enforces rejection reasons when archiving, with an exception for the terminal stage confirm flow. With custom stages, the terminal stage is the last entry in the client's `hiring_stages` array (always `onboarded` per the constraint).

The `hiringConfirmHire` function (updated in the original per-client stages plan) already resolves the terminal key dynamically. The rejection enforcement in Spec C must use the same resolution:

```javascript
const resolved = await getStagesForClient(candidate.client_id);
const terminalKey = resolved.stages[resolved.stages.length - 1].key;
const isTerminalArchive = req.body.stage === terminalKey;
if (req.body.archived_at && !isTerminalArchive && !req.body.rejection_category) {
  return res.status(400).json({ error: 'Rejection category required when archiving a candidate' });
}
```

## Delta 4: Interview Round Stage Context

Spec B's interview rounds are created per-candidate regardless of stage configuration. However, the "Interviews" section in the detail panel currently renders when `c.stage === 'interviews'`. With custom stages, a client might name their interview stage `technical-interview` or `panel-review`.

**Resolution:** The interview rounds section in the detail panel should always be visible (not gated by stage name). Interview rounds are relevant at any point in the pipeline — a candidate in the "offer" stage might still have upcoming interview rounds recorded. Remove the stage-name gate.

## Delta 5: Email Template Trigger Stages

Spec C's email templates have a `trigger_stage` field. With custom stages, a template triggered on `interviews` won't fire for a client whose stage is called `technical-review`.

**Resolution:** `trigger_stage` stores the stage key. Templates are scoped by `client_id`. A client-specific template uses that client's stage keys. Global templates (client_id IS NULL) use the default stage keys and are only suggested when the candidate's client uses default stages.

## Delta 6: Onboarding Checklist Auto-Population

Spec C auto-populates the onboarding checklist when a candidate moves to the "onboarding" stage. With custom stages, the stage key might differ.

**Resolution:** Add an `is_onboarding` boolean flag to the stage object:

```json
{ "key": "setup", "label": "Setup & Onboarding", "is_onboarding": true }
```

The auto-populate trigger checks if the target stage has `is_onboarding: true` in the resolved stages array. For the default stages, `onboarding` has this flag set. For custom stages, the client sets it via the stage editor on whichever stage represents their onboarding step.

The second-to-last stage assumption is wrong — a client with `sourcing → hired → onboarded` would trigger onboarding items when entering `hired`, which makes no sense. The explicit flag is the correct approach.

Update the stage editor (Spec D gear icon UI) to show an "Onboarding stage" toggle on each stage row. Only one stage can have `is_onboarding: true` — toggling it on one stage toggles it off the others. The `onboarded` (terminal) stage cannot be the onboarding stage.

## Delta 7: Metrics Query Stage Resolution

Spec C's time-in-stage and pipeline metrics endpoints currently return stage keys without labels. With custom stages, the frontend needs labels for display.

**Resolution:** The metrics endpoints already return stage keys. The frontend resolves labels via `getResolvedStageLabel(resolved, key)` — the same helper used everywhere else. No server change needed. The frontend Metrics sub-view must call `loadHiringStagesForClient(clientId)` before rendering charts, same as the kanban view does.

## Delta 8: Scorecard Criteria Templates

Spec B allows positions to define `scorecard_criteria`. With custom stages, this doesn't change — criteria are per-position, not per-stage. No delta needed. Documentation note only.

## Implementation Sequence

The original per-client stages plan (already written at `docs/superpowers/plans/2026-05-20-per-client-hiring-stages.md`) covers Tasks 1-9. The deltas above are applied during implementation of the respective Spec A/B/C tasks — they don't require additional plan tasks. Each delta is a small adjustment to an existing task in Specs A-C.

The per-client stages migration and frontend changes execute AFTER Specs A-C are complete.

## What This Spec Does NOT Cover

- Per-stage stall thresholds in the stage editor UI (future)
- Stage-level permissions (e.g. only certain users can move candidates past a certain stage) (future)
- Conditional stage paths (branching pipelines) (out of scope — pipeline is always linear)
