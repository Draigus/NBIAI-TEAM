# One-shot reminder: AIOS Nate Herk pickup (requested by Glen 2026-06-11).
# Deterministic - sends email via the verified msgraph connector, no LLM involved.
# Registered as Task Scheduler task "NBI Reminder - AIOS pickup 2026-06-12" (once, 2026-06-12 08:00).
# Safe to delete this file and the task after it fires.

$body = @'
<p><strong>Reminder: pick up the AIOS (Nate Herk) work.</strong></p>
<p>Handoff: projects/nbi_dashboard/session_handoffs/2026-06-11_aios-cadence-handoff.md</p>
<p>Top of the list:</p>
<ul>
<li>Check the first cadence cycle ran clean (scripts/cadence/logs/ - intel-research, intel-ingest, recompile-banks ran yesterday; this morning's brief should have arrived by Telegram and email)</li>
<li>Google OAuth credentials for the connectors (SETUP.md step 7, ~10 min) - unlocks Gmail ingestion + calendar/overnight-email in the brief</li>
<li>Intuit/QuickBooks developer app - last Tier-1 domain (live financials)</li>
<li>Remaining brain delta items + restricted extracts decision</li>
</ul>
'@

node "C:\Users\gpbea\.claude\connectors\cli.js" msgraph sendEmail --to "Gpryer@nbi-consulting.com" --subject "Reminder: pick up AIOS Nate Herk work" --body $body
exit $LASTEXITCODE
