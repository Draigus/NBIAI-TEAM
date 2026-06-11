---
module: financial_resilience
last_verified: 2026-06-09
description: NBI financial position, revenue tracking, risk modelling, and disaster recovery
---

# Financial Resilience

## Revenue Position

### Contracted Revenue (from NBI_Brain.md Section 5)

| Client | Contracted Annual (GBP) | Contract End | Risk Level |
|---|---|---|---|
| Lighthouse Studios | 350,000 | 3-year contract (end date not specified) | MEDIUM - analytics manager disengaged, Justin frustrated |
| Couch Heroes | 300,000 | Ongoing fractional engagement | LOW - heavy engagement, Glen deeply embedded |
| Goals Studio | ~8,000 ($10K US, first package only) | Project-based | LOW (small exposure) |
| Sarge Universe | 0 | Pre-funding | N/A - upside only if funded |
| Blizzard | UNVERIFIED - last known: ~GBP 60K/year (GBP 5K/month from forecast bank, attributed as "Activision") | Ongoing | LOW - Tom manages |
| **TOTAL (contracted)** | **~658,000 - 718,000** | | |

### Monthly Actuals (from forecast_models.md, source: Granola meeting 2026-05-04)

| Client | Monthly (GBP) | Annualised (GBP) |
|---|---|---|
| Couch Heroes | 30,000 | 360,000 |
| Lighthouse Studios | 25,000 | 300,000 |
| Activision/Blizzard | 5,000 | 60,000 |
| **TOTAL** | **55,000** | **660,000** |

### Source Discrepancies

- **Lighthouse:** Brain says GBP 350K/year contracted. Monthly actuals show GBP 25K/month (GBP 300K annualised). GBP 50K gap - may reflect invoicing timing, contract structure, or the Brain figure including overhead/margin. **Needs Glen to clarify.**
- **Couch Heroes:** Brain says GBP 300K/year contracted. Monthly actuals show GBP 30K/month (GBP 360K annualised). Actuals exceed contract - likely reflects scope escalation from project work to fractional C-level. **Actuals appear more current.**
- **Blizzard/Activision:** Brain lists as "Tom manages, minimal involvement" with no revenue figure. Forecast bank records GBP 5K/month under "Activision". **Brain should be updated to include this figure.**

### Operating Target

GBP 75,000 - 80,000/month (from forecast bank). Current actual of GBP 55K/month leaves a gap of GBP 20-25K/month (GBP 240-300K/year).

---

## Payroll and Margin

### UK Payroll (from NBI_Brain.md Section 7)

| Name | Role | Monthly (GBP) |
|---|---|---|
| Glen Pryer | MD, Gaming Practice Lead | 18,000 |
| Amir Didar | Senior Analyst (Lighthouse) | 10,000 |
| Ruan | Data Engineer (Lighthouse) | 10,000 |
| Stavros | Lead Data Scientist (Lighthouse) | 10,000 |
| Devin Rieger | Analyst | 5,617 |
| Magnus (Kali) Pryer | Producer | 4,500 |
| Patrice | HR Advisor / General Admin | 4,000 |
| **UK Total (7 staff)** | | **52,117/month = 625,407/year** |

### Former NSI-Covered Staff (status after NSI/NBI separation, per Glen 2026-06-11)

| Name | Status |
|---|---|
| Tom Rieger | NBI Partner. No longer at NSI. Not currently drawing a paycheck from NBI, though he would like to. If he starts drawing, expect ~GBP 200K/year additional payroll |
| Bryan Rasmussen | Stayed at NSI after the separation. Not an NBI cost. Whether he continues as NBI's CFO in any capacity: TO CONFIRM with Glen |
| Jeff Day | Let go (June 2026) |
| Jessica Williams | Let go (June 2026) |

### Monthly Margin Calculation

| Line | Monthly (GBP) | Annual (GBP) |
|---|---|---|
| Revenue (actual, Q2 2026) | 55,000 | 660,000 |
| UK payroll | 52,117 | 625,407 |
| **Gross margin** | **2,883** | **34,593** |

This does not account for: office costs, software subscriptions, travel, insurance, accounting, or any other overheads. **Actual net margin is likely negative or negligibly positive.**

Note: These are the last known figures from the Brain (last updated 2026-04-20) and forecast bank (source date 2026-05-04). They may be stale.

---

## NSI Separation (cliff resolved)

**The previously modelled "NSI wind-down cliff" (~GBP 620K/year of salaries landing on NBI payroll) NO LONGER EXISTS.** Resolved per Glen, 2026-06-11:

- NSI, Inc. is owned by **Robert Pop**, not Tom Rieger. The Brain's earlier claim that NSI was "Tom Rieger's firm" was wrong; Tom was a senior employee there and no longer is.
- **NSI and NBI are completely separated** as of June 2026.
- **Jeff Day and Jessica Williams have been let go.** No NBI cost.
- **Bryan Rasmussen stayed at NSI.** No NBI cost. (Whether he remains NBI's CFO in any advisory capacity: to confirm.)
- **Tom Rieger is not currently drawing a paycheck from NBI, though he would like to.** This is the only residual payroll consideration: if Tom starts drawing, expect ~GBP 200K/year against a business currently running ~GBP 2.9K/month gross margin. That decision sits with Glen.

Related: Tom's USD 600K debt to Robert Pop and partners is being negated by Tom selling his NSI stock (see Investor Debt section above).

---

## Client Concentration Risk

### Revenue Concentration (based on monthly actuals)

| Client | Monthly (GBP) | % of Revenue | Annualised (GBP) |
|---|---|---|---|
| Couch Heroes | 30,000 | 54.5% | 360,000 |
| Lighthouse Studios | 25,000 | 45.5% | 300,000 |
| Blizzard/Activision | 5,000 | 9.1% | 60,000 |
| Goals Studio | ~667 | 1.2% | ~8,000 |

Note: Percentages are calculated against the GBP 55K/month total stated in the forecast bank. However, the per-client figures sum to GBP 60K (30+25+5), not 55K — a GBP 5K discrepancy. **Needs Glen to clarify the actual monthly total.** Goals Studio is project-based and not included in the recurring total.

### Churn Impact Modelling

| If This Client Churns | Revenue Gap (GBP/year) | Remaining Revenue (GBP/year) | Can NBI Cover Payroll? |
|---|---|---|---|
| Couch Heroes | 360,000 | ~300,000 | NO - GBP 325K shortfall |
| Lighthouse Studios | 300,000 | ~360,000 | NO - GBP 265K shortfall |
| Both | 660,000 | ~60,000 | NO - catastrophic |

**ALERT: Couch Heroes alone represents >50% of revenue.** This exceeds the 50% single-client concentration threshold. Any disruption to this engagement would immediately threaten NBI's ability to meet payroll.

### Lighthouse-Specific Risk

Three NBI staff (Amir, Ruan, Stavros) are embedded at Lighthouse on GBP 30K/month combined payroll. If Lighthouse churns:
- GBP 300K revenue loss
- GBP 360K payroll still owed (unless staff are redeployed or let go)
- Net impact: GBP 660K swing

---

## Revenue Growth Targets

### Current vs Target

| Metric | Value | Source |
|---|---|---|
| Current annual revenue | ~GBP 660K | Forecast bank (Q2 2026 actuals annualised) |
| Year 2 (2026) target | GBP 1.2M | NBI_Brain.md Section 4 |
| Year 3 (2027) target | GBP 2.0M | NBI_Brain.md Section 4 |
| Operating target (monthly) | GBP 75-80K | Forecast bank |

### Gap Analysis

| Target | Gap from Current | Monthly Shortfall |
|---|---|---|
| Operating target (GBP 80K/month) | GBP 300K/year | GBP 25K/month |
| Year 2 target (GBP 1.2M) | GBP 540K/year | GBP 45K/month |
| Year 3 target (GBP 2.0M) | GBP 1.34M/year | GBP 112K/month |

### High-Confidence Pipeline (from forecast bank)

| Opportunity | Estimated Annual (GBP) | Status |
|---|---|---|
| UXR/data science expansion | 150,000 - 250,000 | UNVERIFIED - pipeline stage unknown |
| Lighthouse data manager | 130,000 - 150,000 | UNVERIFIED - pipeline stage unknown |
| Greek fund auditing | 50,000 - 100,000 (initial) | UNVERIFIED - pipeline stage unknown |

If all three convert at midpoint: ~GBP 380K additional, bringing total to ~GBP 1.04M. Still short of the GBP 1.2M Year 2 target by ~GBP 160K.

### Sarge Universe Upside

If funded (GBP 5-10M raise), NBI would build the entire backend team and Glen would serve as fractional C-level. Revenue potential is significant but cannot be forecasted until funding closes.

---

## WorkSage Disaster Recovery

### PostgreSQL Database

| Item | Status |
|---|---|
| Automated backup script | DOCUMENTED - `dashboard-server/backup.js` runs pg_dump, saves timestamped SQL to `backups/`, prunes files >30 days |
| Scheduled execution | DOCUMENTED - runs daily at 2am via node-cron from server.js |
| Backup validation | DOCUMENTED - `dashboard-server/backup-validate.js` exists with corresponding test (`tests/unit/restore-validation.test.mjs`) |
| Off-site backup copy | NEEDS DOCUMENTING - are backups replicated outside the server? |
| Restore procedure | NEEDS DOCUMENTING - step-by-step restore from backup not written up |
| Backup monitoring/alerting | NEEDS DOCUMENTING - no evidence of alerts if backup fails |

### PM2 Process Management

| Item | Status |
|---|---|
| ecosystem.config.js | DOCUMENTED - `dashboard-server/ecosystem.config.js` defines both production (:8888) and staging (:8887) apps |
| Process recreation | DOCUMENTED - `pm2 start ecosystem.config.js` recreates both processes |
| Log locations | DOCUMENTED - `./logs/error.log`, `./logs/out.log` (prod); `./logs/staging-error.log`, `./logs/staging-out.log` (staging) |
| PM2 startup persistence | NEEDS DOCUMENTING - is `pm2 save` / `pm2 startup` configured for system reboot? |

### Cloudflare Tunnel

| Item | Status |
|---|---|
| Tunnel target | DOCUMENTED - routes `worksage.nbi-consulting.com` to localhost:8888 |
| Tunnel reconfiguration steps | NEEDS DOCUMENTING - no written procedure for recreating the tunnel |
| DNS configuration | NEEDS DOCUMENTING - Cloudflare DNS settings not recorded |

### Environment Secrets (.env)

| Item | Status |
|---|---|
| Required variables | PARTIALLY DOCUMENTED - CLAUDE.md lists `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `DATABASE_URL`, `ADMIN_DATABASE_URL`, `APP_URL`, `EMAIL_FROM` |
| Secret recovery procedure | NEEDS DOCUMENTING - where are credentials stored if the .env is lost? |
| Azure MSAL app registration | NEEDS DOCUMENTING - how to recreate the Azure AD app if needed |

### Database Schema

| Item | Status |
|---|---|
| Migration files | DOCUMENTED - 69 numbered SQL files in `dashboard-server/migrations/` |
| Schema recreation | DOCUMENTED - `npm run init-db` applies all migrations in order |
| Baseline schema | DOCUMENTED - `tests/fixtures/baseline-schema.sql` exists |

---

## Investor Debt — RESOLVED

**Status (Glen, 2026-06-11): resolved — remove from outstanding liabilities and risk assessments.** Tom is selling stock in NSI (entity confirmed by Glen 2026-06-11) to negate the debt he incurred; Glen has confirmed the debt can be considered dealt with. Do not count it as a cash-flow draw, do not surface it as a risk.

Historical record: USD 600K (Glen's stated currency 2026-06-11; the 2026-05-04 Granola meeting extract granola_53aa4eef recorded it as GBP 600K — USD per Glen supersedes) owed to Bob, Brian and partners. A repayment structure of 30-50% of net profit capped at 100K/quarter was proposed in that meeting; superseded by the stock-sale resolution. Retained here for audit trail only.

---

## Threshold Alerts

These thresholds should be checked at session start when loading financial context, and flagged in the intelligence brief if breached.

| Metric | Threshold | Current Status | Action if Breached |
|---|---|---|---|
| Monthly gross margin | Floor: GBP 10,000 | BELOW THRESHOLD (GBP 2,883) | Flag in intelligence brief. Review payroll commitments immediately |
| Single-client concentration | Cap: 50% of revenue | BREACHED (Couch Heroes at 54.5%) | Flag in intelligence brief. Prioritise pipeline conversion |
| Invoice aging | Alert: any invoice >30 days overdue | UNKNOWN - no tracking data available | Implement invoice tracking in WorkSage or ask Glen for status |
| Tom Rieger paycheck decision | Alert: if Tom starts drawing from NBI | NOT DRAWING (would like to, per Glen 2026-06-11) | ~GBP 200K/year impact on an effectively breakeven margin. Flag for explicit Glen decision before any payroll change |
| Monthly revenue vs operating target | Gap: >GBP 10K below GBP 75K target | BREACHED (GBP 20K gap) | Flag in intelligence brief. Review pipeline urgency |

---

## Key Risks Summary (ranked by severity)

1. **Client concentration** - Couch Heroes at 54.5% of revenue. Single point of failure.
2. **Margin fragility** - GBP 2,883/month gross margin before overheads. Effectively breakeven or negative.
3. **Tom Rieger paycheck pressure** - Tom would like to draw from NBI (~GBP 200K/year). Unfunded at current margin; needs HC practice revenue or explicit Glen decision.
4. **Revenue gap to target** - GBP 540K short of Year 2 target. Pipeline exists but conversion is unverified.
5. **Lighthouse political risk** - disengaged analytics manager could trigger contract review. Three NBI staff embedded.
6. **DR gaps** - off-site backups, restore procedures, tunnel recreation, and secret recovery are undocumented.

(Removed 2026-06-11: "NSI wind-down cliff", formerly risk #1 - dissolved by the NSI/NBI separation. See NSI Separation section.)

---

*This module consolidates financial data from NBI_Brain.md, brain/clients_detailed.md, brain/pending_actions.md, brain/playsage.md, and intelligence/banks/forecast_models.md. Cross-reference those sources for full context. Flag any figure marked UNVERIFIED to Glen for confirmation.*
