---
type: financial_reconciliation
period: 2026-07
run_date: 2026-07-01
cadence: monthly-automated
sources_read:
  - NBI_Brain.md (sections 5 and 7)
  - brain/financial_resilience.md (last_verified: 2026-06-09)
  - brain/clients_detailed.md (last_verified: 2026-06-23)
  - intelligence/banks/forecast_models.md (last_compiled: 2026-06-30)
  - intelligence/banks/client_couch_heroes.md (last_compiled: 2026-06-30)
discrepancy_count: 4
margin_floor_breached: true
concentration_breached: true
nsi_status: resolved
---

# Monthly Financial Reconciliation -- July 2026

**Run date:** 2026-07-01  
**Period:** Month-open reconciliation (Q2 close)  
**Oldest underlying data:** Granola meeting 2026-05-04 (revenue actuals)  
**Data age warning:** Revenue actuals are approximately 8 weeks old. These are the most recent figures across all sources.

---

## Revenue Reconciliation

### Per-Client Table

| Client | Brain (annual contracted) | Fin. Resilience (monthly actual) | CH Bank / Clients Detailed | Discrepancy? |
|---|---|---|---|---|
| Couch Heroes | GBP 300,000 | GBP 30,000/month (GBP 360,000 ann.) | GBP 30K/month confirmed [granola_53aa4eef] | **YES -- D1: contracted vs actual gap of GBP 60K/year. Actuals exceed contract; reflects scope escalation to fractional C-level. Actuals are more current.** |
| Lighthouse Studios | GBP 350,000 | GBP 25,000/month (GBP 300,000 ann.) | 3-year embedded contract confirmed; no monthly figure | **YES -- D2: contracted vs actual gap of GBP 50K/year. Actuals are GBP 50K below contract. May reflect invoicing timing, contract structure, or overhead inclusion in contracted figure. Needs Glen to clarify.** |
| Blizzard/Activision | Not in Brain (listed as "Tom manages, minimal -- no revenue figure") | GBP 5,000/month (GBP 60,000 ann.) [Granola 2026-05-04] | Tom manages; no figure in clients_detailed | **YES -- D3: Brain has no revenue figure. financial_resilience.md records GBP 5K/month from forecast bank. Brain should be updated to include this.** |
| Goals Studio | ~$10K US (first package, one-time) | ~GBP 667/month est. (project-based, non-recurring) | $10K US confirmed -- one package only | MINOR -- cross-currency, project-based. Not counted in recurring total. Consistent across sources. |
| Sarge Universe | GBP 0 (pre-funding) | GBP 0 | Pre-funding, unpaid | None -- consistent across all sources. |

### Monthly Total Arithmetic Error

**D4: The stated monthly total in financial_resilience.md is GBP 55,000, but the individual line items sum to GBP 60,000 (30K + 25K + 5K).** This GBP 5K/month discrepancy was flagged in the module and remains unresolved. The correct monthly figure cannot be determined from existing sources alone; Glen must confirm which figure is accurate. All margin and concentration calculations below show both scenarios.

---

## Payroll Verification

### UK Payroll (cross-check: Brain Section 7 vs financial_resilience.md)

| Name | Brain Role | Monthly (GBP) | Fin. Resilience | Match? |
|---|---|---|---|---|
| Glen Pryer | MD, Gaming Practice Lead | 18,000 | 18,000 | Yes |
| Magnus (Kali) Pryer | Producer | 4,500 | 4,500 | Yes |
| Amir Didar | Senior Analyst (Lighthouse) | 10,000 | 10,000 | Yes |
| Ruan | Data Engineer (Lighthouse) | 10,000 | 10,000 | Yes |
| Stavros | Lead Data Scientist (Lighthouse) | 10,000 | 10,000 | Yes |
| Devin Rieger | Analyst | 5,617 | 5,617 | Yes |
| Patrice | HR Advisor / General Admin | 4,000 | 4,000 | Yes |
| **Total** | | **52,117** | **52,117** | **Consistent** |

**Payroll issues found: 0.** Both sources are fully consistent. All NSI-covered staff (Jeff Day, Jessica Williams, Bryan Rasmussen) have been removed. Tom Rieger is not drawing a paycheck from NBI.

**Residual risk:** Tom Rieger has expressed a desire to draw from NBI (~GBP 200K/year). This would increase payroll by ~GBP 16,667/month. No decision has been made; flag persists from prior reconciliation.

---

## Margin and Threshold Check

### Scenario A: Using stated GBP 55K/month total

| Line | Monthly (GBP) | Annual (GBP) |
|---|---|---|
| Revenue (Granola 2026-05-04, stated total) | 55,000 | 660,000 |
| UK payroll | 52,117 | 625,407 |
| **Gross margin** | **2,883** | **34,596** |
| Gap to GBP 75K operating target | 20,000 | 240,000 |

### Scenario B: Using line-item corrected GBP 60K/month total

| Line | Monthly (GBP) | Annual (GBP) |
|---|---|---|
| Revenue (line items: 30+25+5) | 60,000 | 720,000 |
| UK payroll | 52,117 | 625,407 |
| **Gross margin** | **7,883** | **94,596** |
| Gap to GBP 75K operating target | 15,000 | 180,000 |

**In both scenarios the margin floor of GBP 10,000/month is breached.** These are gross margin figures before overheads (software subscriptions, insurance, accounting, travel, etc.). Actual net margin is negative in both scenarios.

---

## Client Concentration Check

### Scenario A (GBP 55K stated total)

| Client | Monthly (GBP) | % of Revenue |
|---|---|---|
| Couch Heroes | 30,000 | 54.5% |
| Lighthouse Studios | 25,000 | 45.5% |
| Blizzard/Activision | 5,000 | 9.1% |

**BREACHED -- Couch Heroes at 54.5%. Above the 50% single-client cap.**

### Scenario B (GBP 60K corrected total)

| Client | Monthly (GBP) | % of Revenue |
|---|---|---|
| Couch Heroes | 30,000 | 50.0% |
| Lighthouse Studios | 25,000 | 41.7% |
| Blizzard/Activision | 5,000 | 8.3% |

**AT THRESHOLD -- Couch Heroes at exactly 50.0% on corrected total. The arithmetic error (D4) determines whether this threshold is breached or met.** Until Glen confirms the correct monthly total, the concentration position cannot be stated definitively. Under either reading, the risk is material.

---

## NSI Wind-Down Status

**Status: RESOLVED -- unchanged since 2026-06-11.**

- NSI, Inc. (owned by Robert Pop) and NBI are completely separated.
- Jeff Day and Jessica Williams let go. Bryan Rasmussen stayed at NSI.
- The previously modelled GBP 620K/year cliff no longer exists.
- Tom Rieger's USD 600K investor debt resolved via NSI stock sale.
- Investor debt risk: removed from active risk register.

No new information found in any source. NSI status stable.

---

## Threshold Alerts

| Metric | Threshold | Status |
|---|---|---|
| Monthly gross margin floor | GBP 10,000 | **BREACHED** -- GBP 2,883 (Scenario A) or GBP 7,883 (Scenario B). Both below floor. |
| Single-client concentration | 50% cap | **BREACHED or AT THRESHOLD** -- depends on resolution of D4. CH at 54.5% (A) or 50.0% (B). |
| Revenue vs operating target | GBP 75K/month | **BREACHED** -- GBP 20K gap (A) or GBP 15K gap (B). |
| Tom Rieger paycheck | Alert if drawing | NOT DRAWING -- desire confirmed; decision with Glen. |
| Invoice aging | Alert: any >30 days | **UNKNOWN** -- no tracking data. Unchanged from prior reconciliation. |

---

## Discrepancies Requiring Glen's Resolution

### D1 -- Couch Heroes contracted vs actual (GBP 60K/year gap)
**Contracted:** GBP 300K/year (Brain Section 5).  
**Actuals:** GBP 360K/year (GBP 30K/month, from Granola 2026-05-04 and client_couch_heroes bank).  
**Gap:** GBP 60K/year. Actuals exceed contract, consistent with scope escalation from project work to fractional C-level.  
**Resolution needed:** Confirm whether the contract has been updated to reflect current scope, or whether the Brain figure should be updated to GBP 360K/year.

### D2 -- Lighthouse contracted vs actual (GBP 50K/year gap)
**Contracted:** GBP 350K/year (Brain Section 5).  
**Actuals:** GBP 300K/year (GBP 25K/month, from Granola 2026-05-04).  
**Gap:** GBP 50K/year. Actuals are below the contracted figure.  
**Resolution needed:** Clarify whether the GBP 350K includes overhead/margin not reflected in monthly invoicing, or whether the contracted value or the actual is the correct working figure.

### D3 -- Blizzard/Activision missing from Brain
**Brain:** No revenue figure. Listed only as "Tom manages, minimal involvement."  
**financial_resilience.md:** GBP 5K/month (GBP 60K/year) under "Activision/Blizzard" [Granola 2026-05-04].  
**Resolution needed:** Glen or Tom to confirm the GBP 5K/month figure is still current. If confirmed, Brain Section 5 should be updated to include it.

### D4 -- Monthly total arithmetic error in financial_resilience.md
**Stated total:** GBP 55,000/month.  
**Line-item sum:** GBP 60,000/month (30+25+5).  
**Gap:** GBP 5,000/month (GBP 60K/year).  
**Resolution needed:** Glen to confirm which figure is accurate. This determines whether the concentration threshold is breached (D4 affects the Couch Heroes % and the margin floor calculation).

---

## Current Position Summary

| Metric | Scenario A (GBP 55K stated) | Scenario B (GBP 60K corrected) |
|---|---|---|
| Monthly revenue | GBP 55,000 | GBP 60,000 |
| Monthly payroll | GBP 52,117 | GBP 52,117 |
| Gross margin | GBP 2,883 | GBP 7,883 |
| Margin floor (GBP 10K) | BREACHED | BREACHED |
| CH concentration | 54.5% -- BREACHED | 50.0% -- AT THRESHOLD |
| Gap to GBP 75K target | GBP 20K/month | GBP 15K/month |
| Gap to Year 2 target (GBP 1.2M/year) | GBP 540K/year | GBP 480K/year |

---

## Actions Needed

1. **Glen to resolve D4 (arithmetic error)** -- confirm whether correct monthly total is GBP 55K or GBP 60K. This unblocks D2 (concentration check) and produces accurate margin figures.
2. **Glen to resolve D1 (CH contract value)** -- confirm current contracted revenue for Couch Heroes; update Brain if scope escalation has changed the commercial terms.
3. **Glen to resolve D2 (Lighthouse actual vs contracted)** -- clarify the GBP 50K/year gap.
4. **Tom/Glen to confirm D3 (Blizzard monthly figure)** -- verify GBP 5K/month is still current and update Brain Section 5.
5. **Invoice aging tracking** -- still unimplemented as of this reconciliation. No data available to assess invoice health.
6. **Monitor Tom Rieger paycheck decision** -- if Tom begins drawing from NBI, the payroll impact (~GBP 16,667/month) would push the business into certain negative margin at current revenue levels. Requires explicit Glen decision before any payroll change.

---

*This report was generated by the monthly financial reconciliation cadence (automated, 2026-07-01). Figures marked as discrepancies are not corrected here -- resolution is Glen's decision. See financial_resilience.md for full risk register and threshold definitions.*
