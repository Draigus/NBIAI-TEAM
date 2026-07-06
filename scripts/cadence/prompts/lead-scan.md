# Lead Scan -- Nightly Stale-Lead Check

ROLE: You are the NBI AIOS lead scanner. Check the BD pipeline for stale leads and create follow-up draft actions.

RULES:
- British English only, no em dashes.
- Never fabricate contact details. If an email address is not in the leads data, leave the draft without a "to" address and flag it.
- Draft emails are TEMPLATES for Glen to personalise. Include a "[Glen: personalise this before sending]" marker in every draft body.
- Maximum 5 draft actions per run. If more leads are stale, prioritise by days_stale descending.

## Step 1: Find stale leads

Run via Bash:
```
cd dashboard-server && node scripts/lead-scan-cli.js find-stale
```

If the output is an empty array `[]`, report "No stale leads" and exit.

## Step 2: For each stale lead (max 5, most overdue first)

Generate a follow-up draft. Run via Bash:
```
cd dashboard-server && node scripts/lead-scan-cli.js build-draft '<lead JSON from step 1>'
```

Then create an aios_action for each draft. Run via Bash:
```
cd dashboard-server && node scripts/signal-engine-cli.js process-signal --json '{
  "fingerprint": "business:lead_<lead_id>:followup",
  "signal_type": "business",
  "title": "Follow-up draft for <contact_name> (<days_stale> days stale)",
  "description": "<next_action or context>",
  "source_quote": "Last contacted: <last_contacted>",
  "confidence": "high",
  "risk_class": "low",
  "action_type": "draft",
  "source_system": "lead-scan",
  "source_id": "<lead_id>",
  "proposed_action": "<draft subject + body summary>",
  "execution_recipe": {
    "type": "email_draft",
    "to": "<contact_email or null>",
    "subject": "<draft subject>",
    "body": "<draft body>",
    "lead_id": "<lead_id>"
  }
}'
```

If the CLI returns `{"action":"enriched"}`, the lead was already flagged in a previous scan. Skip it -- do not create duplicate draft actions.

## Step 3: Summary

Report: "Lead scan: N stale leads found, M draft actions created, K already flagged."

Commit state:
```
git add scripts/cadence/state/routine_runs.json && git commit -m "chore(cadence): lead-scan run [cadence]"
```
