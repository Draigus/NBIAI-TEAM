---
report_type: financial_reconciliation
period: 2026-08
generated: 2026-08-01
cadence: monthly (1st of month, unattended)
sources_read:
  - NBI_Brain.md (last_updated 2026-07-03)
  - brain/financial_resilience.md (last_verified 2026-06-09)
  - brain/clients_detailed.md (last_verified 2026-07-03)
  - intelligence/banks/forecast_models.md (last_compiled 2026-07-29)
  - intelligence/banks/client_couch_heroes.md (last_compiled 2026-07-30)
  - session_logs/2026-07-23 through 2026-07-31
discrepancy_count: 3
payroll_issues: 0
margin_floor_status: BREACHED
concentration_status: BREACHED
---

# Financial Reconciliation Report -- 2026-08

**Run:** 2026-08-01 (monthly cadence, unattended)

---

## Revenue Reconciliation

| Client | Brain (annual GBP) | Fin. Resilience monthly x12 (GBP) | Clients Detailed | Discrepancy? |
|---|---|---|---|---|
| Couch Heroes | 360,000 | 360,000 (30K/mo) | 30K/month confirmed | NO |
| Lighthouse Studios | 350,000 | 300,000 (25K/mo x12) | 3-year contract, no figure stated | YES -- GBP 50K gap (D-1) |
| Activision/Blizzard | 60,000 | 60,000 (5K/mo) | No figure | NO |
| Goals Studio | ~8,000 ($10K US) | ~8,000 ($10K US) | $10K US, first package | NO |
| Sarge Universe | 0 | 0 | Unpaid, pre-funding | NO |
| WorkSage/DoD alpha | ~4,000/mo (USD 5K/mo)* | NOT PRESENT | NOT PRESENT | YES -- active revenue absent from model (D-3) |
| **Monthly stated total** | -- | 55,000 | -- | -- |
| **Monthly per-client sum** | -- | 60,000 (30+25+5) | -- | YES -- GBP 5K gap (D-2) |

*USD 5K/month at approximate 1.25 USD/GBP = ~GBP 4,000/month. FX rate unverified.

---

## Revenue Discrepancies Found: 3

### D-1: Lighthouse contracted rate vs monthly actuals (pre-existing, unresolved)

| Source | Annual figure |
|---|---|
| NBI_Brain.md Section 5 | GBP 350,000/year (stated contracted) |
| financial_resilience.md monthly actuals (Granola 2026-05-04) | GBP 300,000/year (GBP 25K/month x 12) |
| Gap | GBP 50,000/year |

Pre-noted in financial_resilience.md; no resolution from any source read this cycle. Could reflect invoicing timing, contract structure, or a stale Brain figure. Needs Glen to confirm whether GBP 350K is the full contracted value or whether GBP 25K/month is the actual invoice amount.

### D-2: Per-client monthly figures do not sum to stated total (pre-existing, unresolved)

| Measure | GBP/month |
|---|---|
| Sum of per-client actuals (30+25+5) | 60,000 |
| Stated monthly total (forecast bank) | 55,000 |
| Gap | 5,000 |

Pre-noted in financial_resilience.md; no resolution from any source read this cycle. One of the per-client figures or the stated total is wrong. The gap affects gross margin and concentration calculations throughout the model.

### D-3: WorkSage/DoD alpha revenue absent from financial model (NEW this cycle)

NBI_Brain.md Section 6 states: "a DOD consultancy partner pays USD 5K/month for alpha access (started ~May 2026) -- active revenue, not in the contracted revenue table above."

This revenue stream is absent from all sections of financial_resilience.md: not in the revenue table, not in the monthly actuals, not in the margin calculation, not in the concentration table, and not in the gap-to-target analysis.

If still active (unverified from current-session sources), this represents approximately GBP 4,000/month (~USD 5K/month) uncaptured in the financial model.

Sensitivity: if D-3 revenue is included alongside the GBP 60K per-client sum (D-2 resolved in NBI's favour), monthly revenue would reach ~GBP 64,000 and gross margin ~GBP 11,883 -- the only scenario that clears the GBP 10K floor.

---

## Payroll Check

| Staff Member | Brain Role | Brain Monthly (GBP) | Fin. Resilience Monthly (GBP) | Match? |
|---|---|---|---|---|
| Glen Pryer | MD, Gaming Practice Lead | 18,000 | 18,000 | YES |
| Amir Didar | Senior Analyst (Lighthouse) | 10,000 | 10,000 | YES |
| Ruan | Data Engineer (Lighthouse) | 10,000 | 10,000 | YES |
| Stavros | Lead Data Scientist (Lighthouse) | 10,000 | 10,000 | YES |
| Devin Rieger | Analyst | 5,617 | 5,617 | YES |
| Magnus (Kali) Pryer | Producer | 4,500 | 4,500 | YES |
| Patrice | HR Advisor / General Admin | 4,000 | 4,000 | YES |
| **Total (7 UK staff)** | | **52,117** | **52,117** | **YES** |

**Payroll issues: 0.** Both sources agree exactly across all 7 staff members and the total.

**Former NSI-covered staff:** Tom Rieger (not drawing from NBI), Bryan Rasmussen (stayed at NSI), Jeff Day (let go June 2026), Jessica Williams (let go June 2026). Status consistent across all sources; no change detected.

**Residual payroll risk:** Tom Rieger has expressed a desire to draw from NBI (~GBP 200K/year). No session log material indicates this has changed or been agreed. The financial model has no HC practice revenue to support it. This is a conditional risk only -- flagged for awareness.

---

## Current Position

Using financial_resilience.md base figures (GBP 55K/month stated total, source: Granola meeting 2026-05-04). These are the most recent reconciled actuals available.

| Line | Monthly (GBP) | Annual (GBP) |
|---|---|---|
| Revenue (stated actuals) | 55,000 | 660,000 |
| UK payroll | 52,117 | 625,407 |
| **Gross margin** | **2,883** | **34,596** |

Note: gross margin does not account for overheads (software subscriptions, insurance, accounting, travel). Net margin is likely negative or negligibly positive.

**Sensitivity table (unresolved discrepancies):**

| Scenario | Monthly revenue | Gross margin | Margin floor |
|---|---|---|---|
| Base (stated GBP 55K) | 55,000 | 2,883 | BREACHED |
| D-2 resolved (per-client sum GBP 60K) | 60,000 | 7,883 | BREACHED |
| D-2 + D-3 resolved (GBP 60K + ~GBP 4K DoD) | ~64,000 | ~11,883 | CLEARED |

Gap to GBP 75K operating target: GBP 20,000/month on the stated base.

---

## Threshold Alerts

| Metric | Threshold | Current Status | Detail |
|---|---|---|---|
| Monthly gross margin | Floor: GBP 10,000 | **BREACHED** | GBP 2,883 on stated GBP 55K total |
| Single-client concentration | Cap: 50% | **BREACHED** | Couch Heroes at 54.5% (GBP 30K / GBP 55K); 50.8% if GBP 60K total is correct |
| Monthly revenue vs operating target | Gap: >GBP 10K below GBP 75K | **BREACHED** | GBP 20K below target on stated base |
| Invoice aging | Alert: >30 days overdue | **UNKNOWN** | No invoice tracking data available in any source |
| Tom Rieger paycheck decision | Alert: if drawing commences | NOT DRAWING | Per Brain and financial_resilience.md; no change detected |

---

## HC Pipeline Conversion Status (informational, unverified)

NBI_Brain.md Section 6 showed the following Tom Rieger HC pipeline as of 30 June 2026:

| Opportunity | Estimated Value | Stated Status (30 Jun 2026) |
|---|---|---|
| Tulane University | ~$150K over 2 months | "Starting within 2 weeks" (= mid-July 2026) |
| Sony | $76K over 4 months (scalable to $700K-$1M/year) | Contract expected July 2026 |
| Pentagon / DoD | TBD | ~80% probability |
| SEC | TBD | Active pursuit |

As of 2026-08-01, Tulane and Sony should have converted or not. No session log material from the last 30 days confirms conversion for any of these. If Tulane and Sony both landed at stated values (~$225K combined over their windows), this would materially change NBI's financial picture. These remain **unverified pipeline** and cannot be included in the financial model without Glen's confirmation.

---

## NSI Wind-Down Status

**UNCHANGED.** NSI and NBI fully separated as of June 2026. The previously modelled wind-down cliff (GBP 620K/year of salaries landing on NBI payroll) does not apply. Jeff Day and Jessica Williams were let go (zero NBI cost). Bryan Rasmussen stayed at NSI (zero NBI cost). Tom Rieger is not drawing from NBI.

No new NSI information found in any source read this cycle.

---

## Actions Needed

1. **D-1 (Lighthouse rate):** Confirm whether the contracted value is GBP 350K/year or GBP 25K/month (GBP 300K annualised). Update financial_resilience.md with the confirmed figure and source.

2. **D-2 (Monthly total):** Confirm the correct monthly revenue total. Per-client figures sum to GBP 60K but stated total is GBP 55K. Affects every downstream calculation including gross margin, concentration %, and target gap.

3. **D-3 (WorkSage/DoD alpha revenue):** Confirm whether the USD 5K/month DoD alpha access arrangement is still active. If yes, authorise inclusion in financial_resilience.md and recalculate margin and concentration.

4. **HC pipeline status:** Confirm whether Tulane, Sony, or other Tom Rieger HC opportunities have converted to paid work. If any landed, update financial_resilience.md revenue growth targets and the Brain pipeline section.

5. **financial_resilience.md reverification:** Module last_verified 2026-06-09, now nearly 2 months old. Following Glen's resolution of the above discrepancies, update the last_verified date and any corrected figures with source attribution.

---

*Report generated: 2026-08-01 | Cadence run, unattended | Discrepancies: 3 | Payroll issues: 0*
*Next run: 2026-09-01*
*Sources: NBI_Brain.md (2026-07-03), financial_resilience.md (last_verified 2026-06-09), clients_detailed.md (last_verified 2026-07-03), forecast_models.md (2026-07-29), client_couch_heroes.md (2026-07-30), session logs 2026-07-23 to 2026-07-31*
