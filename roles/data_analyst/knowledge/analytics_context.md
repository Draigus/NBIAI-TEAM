# Data Analyst — Analytics Context

## NBI's Analytics Heritage

NBI is not a generic analytics firm. Glen Pryer built analytics teams at Blizzard (DAU/MAU, multi-title live ops), EA/DICE (Apex Legends, Battlefield, revenue model restructuring for Star Wars Battlefront 2), Jagex (OSRS feature prioritisation, retention improvement), Microsoft/Xbox (ML forecasting, recommendation engines for Halo and Minecraft), and Build a Rocket Boy (280-person studio analytics from scratch).

The Lighthouse Studios engagement has three NBI-embedded analytics specialists: Amir Didar (Senior Analyst), Ruan (Data Engineer), and Stavros (Lead Data Scientist). They are building the full data and analytics system for Lighthouse's title under a 3-year contract. The Data Analyst operates independently from this embedded team but should understand what they are doing.

The analytical work NBI delivers to clients is not template-level consulting output. It is practitioner-grade, studio-native analytics work that Glen would have done himself at Blizzard or Jagex. Quality and accuracy are non-negotiable.

---

## Internal NBI Financial Data

### Contracted Revenue (as of March 2026)
| Client | Revenue | Contract Type |
|---|---|---|
| Lighthouse Studios | £350,000/year | 3-year embedded contract |
| Couch Heroes | £300,000/year | Fractional Studio Head retainer |
| Goals Studio (Jonas Rundberg) | £15,000-£50,000 expected | Pending scoped engagement |
| Sarge Universe | £0 (pre-funding) | Revenue triggered by successful funding round |
| Blizzard Entertainment | TBD | Tom-managed; report delivery |

**Revenue target:** Year 2 (2026) — break £1.2M. Year 3 (2027) — exceed £2M.

### Payroll Costs
| Scope | Monthly | Annual |
|---|---|---|
| UK payroll (current — 7 staff) | £52,117 | £625,407 |
| Projected post-NSI transition | ~£103,867 | ~£1,245,407 |

**Key cost lines:**
- Glen Pryer: £18,000/month (£216,000/year)
- Amir Didar, Ruan, Stavros (Lighthouse embedded): £10,000/month each (£120,000/year each — allocated to Lighthouse contract revenue)
- Devin Rieger (Analyst): £5,617/month (£67,407/year)
- Magnus (Kali) Pryer (Producer): £4,500/month (£54,000/year)
- Patrice (HR/Admin): £4,000/month (£48,000/year)

**NSI transition projections (not yet budgeted):**
- Tom Rieger: ~£200,000/year
- Bryan Rasmussen (CFO): ~£200,000/year
- Jeff Day (if moved FT): £150,000/year
- Jessica (if moved FT): £70,000/year
- **Total additional:** ~£620,000/year

### Engagement Pricing
| Size | Range |
|---|---|
| Small | £30,000 - £70,000 |
| Medium | ~£150,000 |
| Large | £300,000 - £400,000/year |

### Tools for Financial Data
- **QuickBooks:** NBI's accounting tool — primary source for actuals
- **Excel:** Used for financial models and projections

---

## Pipeline Tracking

### Active Leads and Pipeline (as of March 2026)
| Lead / Client | Stage | Contact | Notes |
|---|---|---|---|
| Goals Studio | Active — scoped | Jonas Rundberg (jonas@playgoals.com) | Follow-up overdue post-GDC. Specific scope: HC pricing review (7 items) + in-game store review |
| Mike Palan | TBD | TBD | In client leads tracker |
| James Clark | TBD | Creative Assembly | TBD context |
| James Dabrowski | Considering outreach | Jagex | Glen considering reaching out |
| Jakub Rabinski | Needs follow-up | CD Projekt Red | Previously expressed interest in data help |
| Jen MacLean | Unread emails since 19 March | Dragon Snacks Games | Two emails: BD referral offer + Dragon Snacks own seed round |
| Dragon Snacks Games | Potential engagement | Jen MacLean (CEO) | Studio building Farhaven (sandbox RPG), $4M seed round |

### Pipeline Analytics Priorities
- Goals Studio follow-up is the most time-sensitive active lead — revenue potential £15-50K
- Jen MacLean emails are unread and unanswered as of 28 March 2026
- No formal CRM exists beyond Glen's HTML client tracker app (built in Claude Cowork)

---

## Playsage Financial Projections

These projections are relevant context for the Data Analyst when supporting financial modelling for the Playsage product.

**Pricing tiers:**
- Starter: $1,500/month ($18K/year)
- Professional: $5,000/month ($60K/year)
- Enterprise: $12,000-20,000/month custom (annual)

**Upside case projections:**
| Year | Customers | ARR | Monthly Burn |
|---|---|---|---|
| Y1 | 14 | $780K | $254K |
| Y2 | 58 | $4.59M | Approaching breakeven |
| Y3 | 130 | $11.4M | +$1.6M cash flow positive |

**Conservative base case:**
| Year | Customers | ARR |
|---|---|---|
| Y1 | 7 | ~$390K |
| Y3 | ~50-70 | $4.6M (Series A required) |

**Structure:** USA LLC, bootstrapped from NBI revenue, clean cap table. $10M raise target.

**TAM:** $2.12B game analytics market (Growth Market Reports 2025). Note: this is the B2B analytics TAM, not the total $188.8B gaming market.

---

## Gaming Analytics Methodologies — NBI's Core Competencies

### DAU/MAU Forecasting
Dynamic rolling window forecasts using engagement data. Key inputs: historical DAU/MAU, seasonal adjustment (event cadence, major updates, competitive launches), regression against content release schedule. NBI has delivered this at Blizzard, Jagex, EA/DICE.

### Player Segmentation
Behavioural clustering based on session frequency, session length, purchase behaviour, and content interaction. Common segment archetypes in live-service games:
- Whales (high spenders, low churn risk)
- Dolphins / Mid-tier spenders
- Engaged F2P (high activity, no spend)
- Churned / lapsing (early warning signals)
- New players (conversion funnel cohort)

Segmentation is used for IAP targeting, event design, and retention intervention.

### Churn Prediction
Survival analysis or binary classification (churned vs retained at N-day horizon). Key features: recency of last session, frequency decay, event engagement drop, social graph changes. Early warning churn prediction triggers retention messaging. NBI increased OSRS retention 18% at Jagex partly through this work.

### IAP and Monetisation Analysis
- **IAP pricing review:** Hard currency price point analysis against regional purchasing power, competitor pricing, platform fee structures (Apple 30%, Google 30% standard, reduced for small businesses in some markets)
- **Revenue proxy modelling:** Using Playsage data sources to estimate competitor revenue from public signals
- **Economy modelling:** Currency sink/source balance in virtual economies. Bad economy balance = player frustration or inflation. NBI has case study: Z2 economy modelling increased revenue 22%

Specific to Goals Studio scope: review of 7 hard currency items + implementation recommendations for regional pricing.

### Sentiment Analysis
NLP topic clustering from app store reviews and Steam reviews. Key outputs:
- Cluster maps of top discussed topics (progression, monetisation, performance, content, bugs)
- Period-over-period sentiment trend (positive/negative/neutral volume and ratio)
- "Since last update" view: how sentiment changed after a specific release
- Spike event identification: when sentiment volume spikes, what was driving it?

Playsage Module 3 (Sentiment Analysis) is built to deliver this at scale. For bespoke client work, the same methodology applies with client-specific data.

### Social Buzz / Influencer Tracking
Monitoring Twitch, YouTube, Reddit, Twitter/X for title-level engagement signals. Useful for:
- GTM timing (avoiding launch collision with large influencer peaks for competitors)
- Community sentiment early warning (influencer negative commentary precedes review bombing)
- Marketing attribution (correlating influencer activity with DAU spikes)

---

## SalarySage Data Context

SalarySage is a global gaming industry salary intelligence database. It will become a module within Playsage.

**Dataset:** 5MB+ CSV of gaming salaries by country, position, grade (seniority level), and location type (hub vs non-hub).

**Data quality status:** Jeff Day completed a full automated QA assessment (March 2026). 80 records were flagged for small-market countries (Armenia, Republic of Georgia). **Resolution: add caution flags, do not remove records.**

**Key design parameter:** Hub vs non-hub location differentials — salary ranges vary within a country or state by whether the worker is in a major hub city (e.g. London, LA, Seattle) or a regional location (e.g. Norwich, Dundee, Austin).

---

## Data Tools and Infrastructure

| Tool | Use |
|---|---|
| QuickBooks | NBI financial actuals — source for P&L, payroll, invoicing |
| Excel / Google Sheets | Financial modelling, ad hoc analysis, data manipulation |
| HTML client tracker app | Glen's pipeline/lead tracking tool (built in Claude Cowork) |
| ClickUp | Project management — source for delivery tracking data |
| Supabase (PostgreSQL) | Playsage backend — product analytics data |
| Python | Larger analytical tasks, ML models (churn prediction, segmentation clustering) |
| SQL | Supabase queries, any relational database analytical work |
| Microsoft Teams | Internal NBI communication |

---

## Key Stakeholders the Data Analyst Supports

| Stakeholder | What They Need |
|---|---|
| COO | Delivery tracking dashboards, project health summaries, resource utilisation |
| CFO (Bryan Rasmussen) | Financial models, revenue forecasting, payroll projections, NSI transition cost modelling |
| CMO / Head of BD | Pipeline analytics, lead conversion rates, deal velocity, marketing performance |
| Glen Pryer (MD) | Ad hoc strategic analysis, Playsage financial projections, investor-grade data |
| Clients (Lighthouse, Couch Heroes, Goals Studio, others) | Gaming-specific analytics: player segmentation, forecasting, churn, monetisation, sentiment |
| Devin Rieger (Analyst) | May produce data the Data Analyst uses; may need analytical support on SalarySage data |
