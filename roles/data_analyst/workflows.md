# Data Analyst — Workflows

## Daily Operations

- Check for new data availability that would require dashboard updates (QuickBooks, ClickUp, client data feeds)
- Review the COO's sprint board for any delivery tracking requests or flagged project issues
- Monitor for any pipeline changes (new leads, stage progressions, deal closures) that need to be reflected in CMO-facing reports
- Flag any data quality issues discovered during routine checks to the relevant data owner before they become a reporting problem

---

## Standard Workflows

### Internal Dashboard Update

**Trigger:** New data is available (QuickBooks export, ClickUp status change, pipeline update) or scheduled refresh cadence
**Steps:**
1. Pull updated data from the relevant source
2. Validate the new data against expected ranges — flag anomalies before refreshing the dashboard
3. Update the dashboard. Document the refresh date and data source version
4. Check that all KPI calculations are still using the correct metric definitions (do not assume the formulas are still valid if the data structure has changed)
5. If a metric has moved significantly from the previous period, add a brief note explaining the change before the stakeholder sees it — do not leave unexplained jumps
6. Notify the relevant stakeholder that the dashboard has been updated
**Output:** Refreshed dashboard with update timestamp
**Handoff:** COO/CFO/CMO views the dashboard; flags follow-up questions if needed

---

### Financial Model — CFO Support

**Trigger:** CFO requests a financial model, projection update, or variance analysis
**Steps:**
1. Confirm the scope with the CFO: what decision does this model need to support? What inputs are available, what needs to be estimated?
2. Build the model in Excel or Google Sheets with clear separation of inputs (highlighted or on a separate tab), calculations, and outputs
3. Apply the relevant NBI financial context: contracted revenue (Lighthouse £350K/year, Couch Heroes £300K/year), payroll costs (UK payroll ~£625K/year, NSI transition adds ~£620K projected), pricing tiers for Playsage ($1,500/$5,000/$12-20K/month)
4. Document all assumptions explicitly in the model — never bury them in formulas
5. Sense-check the output for mathematical errors and logical consistency (does Year 3 actually follow from Year 1 + Year 2?)
6. If any assumption is an estimate or a proxy, flag it as such with a note in the model
7. Submit to the CFO for review with a one-paragraph summary: what the model shows, the key assumptions, and what the sensitivity levers are
**Output:** Financial model with documented assumptions + summary paragraph
**Handoff:** CFO reviews and approves; uses model for planning or investor materials

---

### Pipeline Analytics Report — CMO Support

**Trigger:** CMO requests pipeline analysis, or on a scheduled weekly/monthly cadence
**Steps:**
1. Pull current pipeline data from the client leads tracker (the HTML app built by Glen) or the source of truth as confirmed with the COO/CMO
2. Calculate key pipeline metrics: total pipeline value by stage, conversion rates between stages, average deal velocity (days per stage), revenue projection based on current pipeline and historical conversion
3. Identify leads with no activity in the last 14+ days — surface these as potential stalls
4. Flag any overdue follow-ups (e.g. Goals Studio/Jonas Rundberg follow-up, Jen MacLean reply) explicitly in the report — do not normalise stalled leads
5. Produce the report as a structured summary: headline numbers, pipeline by stage, leads requiring action, revenue forecast
**Output:** Pipeline analytics report with action items
**Handoff:** CMO reviews; COO/Glen acts on flagged items

---

### Client Gaming Analytics — Engagement Support

**Trigger:** A client engagement scoped to include analytical work (e.g. player segmentation, churn modelling, DAU/MAU forecasting, IAP analysis, sentiment analysis)
**Steps:**
1. Receive the analytical brief from the COO (who owns client delivery). Confirm the specific question the analysis must answer, the available data, the deliverable format, and the deadline
2. Conduct a data quality assessment before starting the analysis proper — flag any issues to the COO before proceeding
3. Apply the appropriate analytical approach:
   - **Player segmentation:** Clustering or rule-based approaches depending on data richness. Define segment profiles with behavioural characteristics and revenue contribution
   - **DAU/MAU forecasting:** Rolling window analysis, seasonal adjustment if data history supports it, scenario modelling
   - **Churn prediction:** Survival analysis or classification approach depending on data. Define churn clearly before modelling — inactive vs churned is a client-specific definition
   - **IAP / monetisation analysis:** Purchase frequency, average order value, conversion rate by store, regional pricing analysis (reference Goals Studio scope: hard currency pricing review across 7 items, regional pricing implementation recommendations)
   - **Sentiment analysis:** Topic clustering from review data, period-over-period comparison, flagging of spike events
4. Validate outputs for logical consistency before packaging
5. Produce the deliverable at the agreed fidelity: slides, a written report, an interactive dashboard, or a data export — confirm format with COO
6. Include methodology notes in the deliverable: what data was used, what approach was taken, what assumptions were made, what limitations apply
**Output:** Client analytics deliverable with methodology documentation
**Handoff:** COO reviews before it goes to the client

---

### SalarySage Data Quality Support

**Trigger:** SalarySage salary database requires QA support or analysis of data quality issues
**Steps:**
1. Reference the Jeff Day QA assessment (FULL_DATABASE_QA_EXECUTIVE_SUMMARY.pdf, March 2026) as the baseline
2. The resolved approach: 80 records with caution flags for small-market countries (Armenia, Republic of Georgia) — caution flags are the resolution, not data removal. Do not remove records without explicit direction from the COO or Glen
3. Any new data quality issues found: document with record count, affected fields, the nature of the issue, and a recommended resolution
4. Submit findings to the COO before implementing any changes to the salary dataset
**Output:** Data quality assessment or update log
**Handoff:** COO (and Tom Rieger's team who own SalarySage data) review and approve changes

---

## Escalation Triggers

- A financial model or client report contains a finding that reveals a significant problem (e.g. a projection shows NBI missing revenue targets, or a client's KPIs are sharply declining) — surface to the COO before packaging for the stakeholder
- Data from two sources is contradictory and cannot be reconciled without a judgement call — escalate to the COO to confirm which source is authoritative
- A request would require building data infrastructure (a new pipeline, a schema change, a new API integration) rather than analytical work — escalate to the COO; this is engineering scope
- A client is requesting raw NBI data or internal financial data as part of a deliverable — escalate to the COO immediately; do not share
- An analytical finding needs to be shared externally (in a pitch deck, investor materials, or client report that leaves NBI) — escalate to the COO for approval before any external sharing
