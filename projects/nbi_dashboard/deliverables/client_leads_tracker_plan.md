# Client Leads Tracker — Implementation Plan

**Date:** 2026-04-05
**Status:** AWAITING GLEN'S FINAL SIGN-OFF — no code until confirmed
**Design Principle:** Everything data-driven. Zero hardcoded values. All configuration lives in the database.

---

## Glen's Decisions (incorporated)

| # | Decision | Detail |
|---|---|---|
| D3 | Data-driven architecture | No fragile code. All config from DB. |
| D4 | Segment tabs | All Clients / Gaming / Human Capital |
| D5 | Deal owner | Glen or Tom only |
| D6 | Win probability | Always manual. No auto-set from stage. |
| D7 | Multi-currency | GBP (UK), USD (US), SEK billed in GBP (Sweden), EUR (rest of Europe) |
| D8 | Closed deals | Always visible. No toggle/collapse. |
| D9 | No Excel import | Old data. Manual entry only. |
| D10 | Follow-up reminders | Yes. Notify when next_followup_date is due/overdue. |

---

## 1. Core Design Principles

### Data-Driven Architecture
Every dropdown, pipeline stage, field option, column visibility, and status label is stored in the database and served via API. The frontend renders whatever the API returns. To add a new pipeline stage or resource type, you update a settings row - not code.

This means:
- Pipeline stages (Lead - Won/Lost) are rows in a `lead_pipeline_stages` table
- Resource/staffing role types come from a `lead_resource_types` table
- Service lines, lead sources, work types, sectors, and other picklists come from a `lead_field_options` table
- Column visibility and ordering are user preferences stored in `settings`
- No `if (status === 'Signed')` anywhere in the frontend - it reads stage metadata

### Integration with Existing Dashboard
- New navigation item "Leads" in the sidebar (same routing pattern as tasks/finances/etc.)
- Reuses existing auth, audit logging, client/contact tables, notification system
- Same CSS token system, same detail panel pattern, same filter bar pattern
- Leads link to existing clients (FK to clients table) - no duplicate client data

---

## 2. Database Schema

### 2.1 `lead_pipeline_stages` - Configurable pipeline

```sql
CREATE TABLE lead_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  colour TEXT DEFAULT '#666666',
  is_closed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Note: `default_win_pct` removed per D6 - win probability is always manual.

**Seed data:**

| name | sort_order | colour | is_closed | is_won |
|---|---|---|---|---|
| Lead | 1 | #6b7280 | false | false |
| First Contact | 2 | #3b82f6 | false | false |
| Discovery | 3 | #8b5cf6 | false | false |
| Proposal | 4 | #f59e0b | false | false |
| Negotiation | 5 | #f97316 | false | false |
| Won | 6 | #22c55e | true | true |
| Holding | 7 | #94a3b8 | true | false |
| Lost | 8 | #ef4444 | true | false |

### 2.2 `lead_resource_types` - Staffing roles

```sql
CREATE TABLE lead_resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed data:** UXR Lead, Researcher, Data Analyst, Snr Data Analyst, Analytics Manager, Data Scientist, Data Engineer, Snr Data Engineer, Data Architect, Financial Analyst, Process Analyst, Economist, Producer, AI Implementor, Telemetry Eng, GTM Specialist, Application Engineer, Designer, Process Engineering, SME

### 2.3 `lead_field_options` - All other picklists

```sql
CREATE TABLE lead_field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_name, value)
);
```

**Seed data:**

| field_name | values |
|---|---|
| service_line | Data & Analytics, UXR, AI, Production Consulting, Process Engineering |
| lead_source | Referral, Conference, Inbound, Existing Client, LinkedIn, Cold Outreach |
| work_type | Playtesting, Data Library Blueprint, Analytics Audit, Player Research, Economy Design, LiveOps Review, AI Implementation, Process Consulting |
| client_sector | Gaming, Human Capital |
| currency | GBP, USD, EUR |
| deal_owner | Glen, Tom |

Deal owners stored here (not pulled from users table) per D5 - only Glen and Tom.

### 2.4 `clients` table modification

```sql
ALTER TABLE clients ADD COLUMN sector TEXT;
```

Drives the segment tabs. Values come from `lead_field_options` where `field_name = 'client_sector'`. All leads for a client inherit its sector. Tabs filter by `clients.sector`.

### 2.5 `leads` - The main leads table

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core deal info
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  work_type TEXT,
  service_line TEXT,

  -- Pipeline
  stage_id UUID NOT NULL REFERENCES lead_pipeline_stages(id),
  priority INT,                            -- 1-5 (nullable)

  -- Value (multi-currency per D7)
  currency TEXT NOT NULL DEFAULT 'GBP',    -- 'GBP', 'USD', 'EUR'
  rom_min NUMERIC,                         -- low end in currency minor units (pence/cents)
  rom_max NUMERIC,                         -- high end in currency minor units
  rom_text TEXT,                           -- free-text if not a clean number ("TBD")
  win_probability INT,                     -- 0-100, always manual per D6
  weighted_value NUMERIC GENERATED ALWAYS AS (
    COALESCE(rom_max, rom_min, 0) * COALESCE(win_probability, 0) / 100
  ) STORED,

  -- Contacts & ownership
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_owner TEXT,                          -- 'Glen' or 'Tom' per D5
  lead_source TEXT,

  -- Dates
  est_start_date DATE,
  expected_close_date DATE,
  last_contacted DATE,
  next_followup_date DATE,
  next_action TEXT,

  -- Location & notes
  location TEXT,
  notes TEXT,
  time_estimate TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_client ON leads(client_id);
CREATE INDEX idx_leads_stage ON leads(stage_id);
CREATE INDEX idx_leads_owner ON leads(deal_owner);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_followup ON leads(next_followup_date);
```

### 2.6 `lead_resources` - Staffing requirements per lead

```sql
CREATE TABLE lead_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  resource_type_id UUID NOT NULL REFERENCES lead_resource_types(id),
  quantity INT DEFAULT 1,
  notes TEXT,
  UNIQUE(lead_id, resource_type_id)
);
```

Many-to-many. Each lead can require any combination of resource types with quantities.

### 2.7 `lead_activities` - Interaction history / activity log

```sql
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_date ON lead_activities(created_at DESC);
```

Auto-entries on: stage changes, priority changes, creation. Manual entries for: notes, emails, calls, meetings.

---

## 3. API Endpoints

All under `/api/leads/` namespace. All require auth. Audit log entries for all mutations.

### 3.1 Configuration endpoints (admin only for writes)

```
GET    /api/leads/config           - returns { stages, resourceTypes, fieldOptions }
POST   /api/leads/stages           - create pipeline stage
PATCH  /api/leads/stages/:id       - update stage (name, sort_order, colour)
DELETE /api/leads/stages/:id       - block if leads exist in this stage

POST   /api/leads/resource-types   - create resource type
PATCH  /api/leads/resource-types/:id
DELETE /api/leads/resource-types/:id

POST   /api/leads/field-options    - create field option { field_name, value }
DELETE /api/leads/field-options/:id
```

### 3.2 Leads CRUD

```
GET    /api/leads                  - list leads with filters:
                                     ?stage_id=, ?client_id=, ?owner=, ?priority=,
                                     ?sector= (for tab filtering), ?search=
                                     Joins: client name + sector, stage name, primary contact name
                                     Includes: resource requirements (aggregated)

GET    /api/leads/:id              - full lead detail with resources, activities

POST   /api/leads                  - create lead
                                     Body: all lead fields + resources array
                                     Win probability NOT auto-set (per D6)
                                     Creates 'create' activity entry

PATCH  /api/leads/:id              - update lead fields
                                     Detects stage changes -> creates activity entry
                                     Updates updated_at

DELETE /api/leads/:id              - delete lead (admin only, cascades)
```

### 3.3 Lead resources

```
PUT    /api/leads/:id/resources    - replace all resources for a lead
                                     Body: [{ resource_type_id, quantity, notes }]
```

### 3.4 Lead activities

```
GET    /api/leads/:id/activities   - list activities (newest first)
POST   /api/leads/:id/activities   - add manual activity { activity_type, description }
```

### 3.5 Pipeline analytics

```
GET    /api/leads/pipeline/summary - per stage: count, total ROM (by currency), weighted value
                                     Totals for active pipeline
                                     Includes FX-converted grand total in GBP

GET    /api/leads/pipeline/forecast - groups by expected_close_date month
                                      Returns weighted pipeline value per month per currency
```

### 3.6 Follow-up reminders

```
GET    /api/leads/reminders        - leads where next_followup_date <= today
                                     Used by notification system + dashboard widget
```

No Excel import endpoint (removed per D9).

---

## 4. Frontend Views

### 4.1 Navigation

Add "Leads" to the sidebar, between "Tasks" and "Finances". Route: `#leads`.

### 4.2 Client Segment Tabs

Top-level tabs above the filter bar, rendered from `lead_field_options` where `field_name = 'client_sector'`:
- **All Clients** - shows all leads (always present, hardcoded as first tab)
- **Gaming** - filtered to `clients.sector = 'Gaming'`
- **Human Capital** - filtered to `clients.sector = 'Human Capital'`

Data-driven: adding a third sector (e.g. "FinTech") = one DB row, not a code change. The "All" tab is always first; sector tabs rendered dynamically after it.

Active tab applies as a pre-filter before any filter bar selections.

### 4.3 Sub-views (toggle buttons in filter bar, same pattern as tasks)

**Four views:**

#### A. Kanban Board (default)
- One lane per pipeline stage (from API)
- Lanes ordered by `sort_order`
- Lane headers: stage name (coloured), deal count, total ROM (with currency symbols)
- All stages always visible, including Won/Holding/Lost (per D8)
- Cards show: client badge, deal title, ROM + currency, win %, deal owner, next follow-up (highlighted if overdue)
- **Drag-and-drop** cards between lanes - updates stage, creates stage_change activity
- Dragging does NOT auto-set win probability (per D6)

#### B. Table View
- Sortable columns: Priority, Client, Title, Work Type, Stage, Currency, ROM, Win %, Weighted Value, Deal Owner, Next Follow-up, Location
- Column visibility configurable (stored in settings)
- Click column header to sort
- Inline editing for: priority, stage, owner, win probability
- Row click opens detail panel
- Currency symbol shown alongside ROM values

#### C. Pipeline Summary / Funnel
- Visual funnel showing deal flow through stages
- Per stage: deal count, total ROM (grouped by currency), total weighted value
- Key metrics at top: total pipeline value (per currency + GBP equivalent), weighted total, average deal size, number of active deals
- Forecast: weighted pipeline by expected close month (next 6 months), broken down by currency
- FX conversion rates configurable in settings (for GBP equivalent totals)

#### D. Client View
- Grouped by client (alphabetical)
- Client cards show: sector badge, all leads, total pipeline value, primary contacts
- Expandable cards
- Links to existing client detail pages

### 4.4 Filter Bar

Same pattern as tasks filter bar:
- **Search:** across client name, title, work type, notes, location, deal owner
- **Stage filter:** dropdown from API (all stages, including closed per D8)
- **Client filter:** dropdown from existing clients
- **Owner filter:** dropdown showing Glen and Tom only (per D5, from config)
- **Priority filter:** dropdown (1-5)
- **Service line filter:** dropdown from config
- **Currency filter:** dropdown from config (GBP/USD/EUR)
- **Sort:** priority, ROM, weighted value, next follow-up, last contacted, created date

### 4.5 Lead Detail Panel

520px slide-in overlay (same pattern as task detail). Sections:

**Header:** Client badge + deal title + stage badge (coloured) + currency flag

**Deal Info:**
- Client (dropdown from clients table, with sector shown)
- Work type (dropdown from config)
- Service line (dropdown from config)
- Stage (dropdown from config, change logs to activity)
- Priority (1-5 dropdown)
- Deal owner (dropdown: Glen, Tom - from config per D5)
- Lead source (dropdown from config)

**Value:**
- Currency selector (GBP / USD / EUR from config per D7)
- ROM range (two inputs: min and max, formatted with currency symbol)
- ROM free text (for "TBD" or notes)
- Win probability (manual input 0-100, per D6 - no auto-set)
- Weighted value (calculated, read-only)

**Dates:**
- Estimated start date (date picker)
- Expected close date (date picker)
- Last contacted (date picker)
- Next follow-up (date picker) - highlighted amber/red if overdue
- Next action (text input)

**Location:** text input

**Resource Requirements:**
- List of resource type + quantity rows
- Add button: dropdown of resource types from config (excludes already-assigned)
- Each row: name, quantity input, notes, delete button

**Notes:** textarea

**Activity Log:**
- Newest first
- Auto-entries: stage changes, priority changes, creation
- Manual entry: type dropdown (Note, Email, Call, Meeting) + description textarea
- Each entry: type icon, description, who, when

### 4.6 Quick-Add Modal

"+ New Lead" button. Modal with:
- Client (required - dropdown, or type to create new)
- Title (required)
- Work type (optional, from config)
- Stage (required, defaults to first active stage)
- Currency (defaults to GBP)
- ROM (optional)
- Deal owner (optional, dropdown: Glen/Tom)
- Win probability (optional, manual)

### 4.7 Settings Integration

New "Leads Configuration" section in Settings (admin only):

- **Pipeline Stages:** reorderable list, add/edit/archive, set colour
- **Resource Types:** add/edit/archive, reorder
- **Service Lines:** add/edit/archive
- **Lead Sources:** add/edit/archive
- **Work Types:** add/edit/archive
- **Client Sectors:** add/edit/archive (drives the segment tabs)
- **Deal Owners:** add/remove names
- **Currencies:** add/remove supported currencies
- **FX Rates:** set conversion rates to GBP (for pipeline totals)
- **Column Visibility:** toggle which columns appear in table view

### 4.8 Follow-Up Reminders

Per D10:
- On page load, check `/api/leads/reminders` for leads with `next_followup_date <= today`
- Show notification badges on the Leads nav item (count of overdue follow-ups)
- In-app notification entries (using existing notifications table)
- Overdue follow-ups highlighted in red in kanban cards and table rows
- Today's follow-ups highlighted in amber
- Dashboard widget: "Follow-ups due today" list (if leads exist)

---

## 5. Multi-Currency Handling (D7)

### Storage
- Each lead stores its own `currency` code (GBP, USD, EUR)
- ROM values stored in minor units of that currency (pence, cents, euro-cents)
- `weighted_value` is in the same currency as the lead

### Display
- Currency symbol shown next to all monetary values
- Pipeline summary shows totals grouped by currency
- Grand total converted to GBP using configurable FX rates stored in settings
- FX rates: `settings` table, key `fx_rates`, value `{ "USD": 0.79, "EUR": 0.86 }` (rate to GBP)

### Sweden Office Rule (D7)
- Swedish contracts billed in SEK but tracked in GBP in the system
- User selects GBP as currency when creating the lead
- No SEK currency needed in the system - it's an invoicing detail, not a pipeline tracking concern

---

## 6. Access Control

Reuses existing auth:
- **Admin (Glen, Tom):** full CRUD on leads, config management, delete leads
- **Member (Magnus):** view leads, create leads, update lead fields (stage, notes, activities), cannot delete leads or modify config

Server-side enforcement on:
- Config endpoints - admin only
- Lead deletion - admin only
- Lead create/update - all authenticated users

---

## 7. Audit Trail

All lead mutations logged to existing `audit_log` table:
- `entity_type: 'lead'`
- `action: 'create' | 'update' | 'delete' | 'stage_change'`
- `changes` JSONB captures before/after for updates
- Stage changes also create a `lead_activities` entry

---

## 8. Implementation Order

### Phase 1: Database + API
1. Create all new tables
2. Seed pipeline stages, resource types, field options (including sectors, currencies, deal owners)
3. Add `sector` column to existing clients table
4. Build config API endpoints
5. Build leads CRUD endpoints
6. Build resources, activities, reminders endpoints
7. Build pipeline analytics endpoints

### Phase 2: Frontend - Kanban + Core
1. Add "Leads" to sidebar navigation
2. Load config from API on page init
3. Build segment tabs (All / Gaming / Human Capital from config)
4. Build filter bar with data-driven dropdowns
5. Build kanban board (lanes from API, drag-and-drop)
6. Build lead detail panel
7. Build quick-add modal

### Phase 3: Frontend - Table + Analytics
1. Build table view with sortable columns and inline editing
2. Build pipeline summary/funnel view with multi-currency totals
3. Build client view (grouped by client)
4. Build forecast section

### Phase 4: Settings + Reminders
1. Build Settings > Leads Configuration section
2. Build FX rates configuration
3. Build follow-up reminder system (notifications, badges, highlights)
4. Keyboard shortcuts (N for new lead)
5. Mobile responsiveness

---

## 9. Out of Scope

- ~~Excel import~~ (removed per D9)
- Email integration (sending from leads page)
- Calendar integration (syncing follow-ups to Google Calendar)
- Automated lead scoring
- PDF/Excel export (can add later)
- Duplicate detection (can add later)
