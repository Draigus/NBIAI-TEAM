# Per-Client Hiring Stages

## Summary

Each client gets its own hiring pipeline stages on the kanban board. When no custom stages are configured, the global default applies. NBI admins configure stages per client via a gear icon on the hiring page. When an NBI user switches clients in the dropdown, the kanban columns re-render to match that client's stages.

## Data Model

New column on `clients` table:

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hiring_stages JSONB DEFAULT NULL;
```

Value is an array of stage objects:

```json
[
  { "key": "cv_review", "label": "CV Review" },
  { "key": "first_interview", "label": "First Interview" },
  { "key": "technical", "label": "Technical" },
  { "key": "offer", "label": "Offer" },
  { "key": "hired", "label": "Hired" },
  { "key": "onboarded", "label": "Onboarded" }
]
```

- `key`: kebab-case slug stored in `candidates.stage` column
- `label`: display name shown in the UI
- When `hiring_stages` is NULL, fall back to the global default: sourcing, interviews, offer, onboarding, hired (keeping current stages as the default, with onboarded appended as the new terminal stage)

## Global Default Update

The current global default stages are: sourcing, interviews, offer, onboarding, hired.

Add `onboarded` as the new terminal stage after `hired`. This applies globally and to all clients that haven't set custom stages.

## Server

### Endpoints

**GET /api/clients/:id/hiring-stages**
- Returns the client's custom stages if set, otherwise the global default
- Accessible to all authenticated users (client users can only access their own client)
- Response: `{ stages: [{ key, label }, ...], isCustom: boolean }`

**PUT /api/clients/:id/hiring-stages**
- Saves custom stages for a client
- NBI admin only
- Validation:
  - Array must have at least 2 entries
  - Last entry must have key `onboarded` (terminal stage)
  - Keys must be unique, non-empty, valid slug format (lowercase alphanumeric + hyphens)
  - Labels must be non-empty
- When a stage key is removed that has candidates sitting in it, those candidates are moved to the first stage

**DELETE /api/clients/:id/hiring-stages**
- Resets client to global default (sets column to NULL)
- NBI admin only

### Server-Side Stage Validation

The PATCH /api/candidates/:id endpoint currently validates `stage` against the hardcoded `HIRING_STAGES` array. This must change to validate against the candidate's client's configured stages (or global default if none set).

Similarly, POST /api/candidates must validate the stage against the target client's stages.

## Frontend

### Stage Resolution

A helper function `getHiringStagesForClient(clientId)` resolves stages:
1. Check if the client has custom stages cached from the API
2. If not, return the global default
3. Cache the result per client to avoid repeated API calls

When the client dropdown changes, re-fetch stages and re-render.

### Configure Stages UI

- Gear icon next to the kanban header, visible to NBI admins only (not client users)
- Opens an inline editor panel:
  - Sortable list of current stages (drag to reorder)
  - Each row: key input, label input, delete button
  - "Add stage" button at the bottom (above the locked terminal stage)
  - `onboarded` row is locked in last position (cannot be deleted or moved)
  - Save and Cancel buttons
- On save: PUT to the API, re-render the kanban

### Kanban Rendering

The `renderHiringView` function currently uses the hardcoded `HIRING_STAGES` array. Change to:
1. Determine the active client (from dropdown filter or client user's scope)
2. Resolve stages for that client
3. Render kanban columns from those stages
4. Stage badges, lane headers, and the detail panel dropdown all use the resolved stages

### Detail Panel

The stage navigation arrows and dropdown in the candidate detail panel must use the resolved stages for the candidate's client, not the global constant.

## Migration

File: `migrations/NNN_per_client_hiring_stages.sql`

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hiring_stages JSONB DEFAULT NULL;
```

No data migration needed - NULL means "use global default".

## Constraints

- `onboarded` is always the terminal stage (last position, cannot be removed)
- Stage keys are immutable once candidates exist in them (renaming a key would orphan candidates - use the label for display changes)
- Minimum 2 stages per client
