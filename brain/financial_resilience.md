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

### NSI-Covered Staff (not currently on NBI payroll)

| Name | Role | Estimated Annual (GBP) |
|---|---|---|
| Tom Rieger | HC Practice Lead, Partner | ~200,000 |
| Bryan Rasmussen | CFO | ~200,000 |
| Jeff Day | Principal Data Scientist | Hourly/as-needed (reduced) |
| Jessica Williams | HC Researcher | Hourly/as-needed (reduced) |

### Monthly Margin Calculation

| Line | Monthly (GBP) | Annual (GBP) |
|---|---|---|
| Revenue (actual, Q2 2026) | 55,000 | 660,000 |
| UK payroll | 52,117 | 625,407 |
| **Gross margin** | **2,883** | **34,593** |

This does not account for: office costs, software subscriptions, travel, insurance, accounting, or any other overheads. **Actual net margin is likely negative or negligibly positive.**

Note: These are the last known figures from the Brain (last updated 2026-04-20) and forecast bank (source date 2026-05-04). They may be stale.

---

## NSI Wind-Down Cliff

NSI, Inc. (Tom Rieger's military/government research firm) is currently for sale and being wound down.

### What Happens When NSI Closes

- Tom Rieger, Bryan Rasmussen, Jeff Day, and Jessica Williams lose their NSI salary coverage
- If they remain with NBI, they move onto NBI payroll
- Jeff and Jessica are already on hourly/as-needed to reduce costs, but Tom and Bryan are full-time partners

### Additional Annual Cost

| Staff | Estimated Annual (GBP) |
|---|---|
| Tom Rieger | ~200,000 |
| Bryan Rasmussen | ~200,000 |
| Jeff Day | ~120,000 (UNVERIFIED - estimate based on principal data scientist role, currently hourly) |
| Jessica Williams | ~100,000 (UNVERIFIED - estimate based on HC researcher role, currently hourly) |
| **Total additional** | **~620,000** |

### Impact on Margin

- Current UK payroll: GBP 625K/year
- Post-NSI payroll: ~GBP 1.25M/year
- Current revenue: ~GBP 660K/year
- **Shortfall if all four transition: ~GBP 590K/year**

This is the single largest financial risk NBI faces. Without new revenue to cover the gap, NBI cannot absorb the full NSI team. Decisions needed:
1. Which NSI staff are essential to retain?
2. Can Tom's HC practice generate its own revenue to cover his cost?
3. Should Jeff and Jessica remain hourly/as-needed permanently?

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

## Investor Debt

**GBP 600K owed to Bob, Brian and partners** (first surfaced in Granola meeting 2026-05-04, source granola_53aa4eef; absent from this module until 2026-06-11 brain delta).

**Status (Glen, 2026-06-11): being resolved.** Tom is selling stock to negate the debt he incurred (Glen's wording: "selling a stock in an SI" — entity assumed to be NSI, to be confirmed). The repayment structure proposed in the May meeting (30-50% of net profit capped at GBP 100K/quarter) is presumed superseded by this resolution. Until the sale completes, treat the debt as extant but resolution-in-progress, not a cash-flow draw.

---

## Threshold Alerts

These thresholds should be checked at session start when loading financial context, and flagged in the intelligence brief if breached.

| Metric | Threshold | Current Status | Action if Breached |
|---|---|---|---|
| Monthly gross margin | Floor: GBP 10,000 | BELOW THRESHOLD (GBP 2,883) | Flag in intelligence brief. Review payroll commitments immediately |
| Single-client concentration | Cap: 50% of revenue | BREACHED (Couch Heroes at 54.5%) | Flag in intelligence brief. Prioritise pipeline conversion |
| Invoice aging | Alert: any invoice >30 days overdue | UNKNOWN - no tracking data available | Implement invoice tracking in WorkSage or ask Glen for status |
| NSI wind-down timeline | Alert: any formal closure notice | UNKNOWN - status is "for sale" | Flag immediately when closure date becomes known |
| Monthly revenue vs operating target | Gap: >GBP 10K below GBP 75K target | BREACHED (GBP 20K gap) | Flag in intelligence brief. Review pipeline urgency |

---

## Key Risks Summary (ranked by severity)

1. **NSI wind-down cliff** - if all four NSI staff transition to NBI, payroll nearly doubles with no matching revenue increase. GBP 590K annual shortfall.
2. **Client concentration** - Couch Heroes at 54.5% of revenue. Single point of failure.
3. **Margin fragility** - GBP 2,883/month gross margin before overheads. Effectively breakeven or negative.
4. **Revenue gap to target** - GBP 540K short of Year 2 target. Pipeline exists but conversion is unverified.
5. **Lighthouse political risk** - disengaged analytics manager could trigger contract review. Three NBI staff embedded.
6. **DR gaps** - off-site backups, restore procedures, tunnel recreation, and secret recovery are undocumented.

---

*This module consolidates financial data from NBI_Brain.md, brain/clients_detailed.md, brain/pending_actions.md, brain/playsage.md, and intelligence/banks/forecast_models.md. Cross-reference those sources for full context. Flag any figure marked UNVERIFIED to Glen for confirmation.*
