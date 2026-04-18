# NBIAI Team App -- Complete Feature Specification

**Author:** VP Product
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Submitted for CEO review
**Project:** NBIAI Team App
**Stack:** Node.js + PostgreSQL + React + Tailwind CSS + shadcn/ui

---

## Document Purpose

This specification defines every screen, data object, user action, state, validation rule, and error message for the NBIAI Team App. It is the single source of truth for engineering, design, and QA. A senior engineer should be able to implement any feature described herein without asking a single clarifying question.

This app is the operational control plane for NBI's AI agent company. Glen Pryer acts as the board operator. He issues directives to the CEO agent, and the AI company executes. The app makes all agent activity visible, manageable, and auditable in real time.

---

## Global Conventions

### Design System References

- **Theme:** Dark background, electric blue (#3B82F6) accent colour, white and grey text
- **Font:** Inter for body, Orbitron for headings and display text
- **Component library:** shadcn/ui with Tailwind CSS
- **Icons:** Lucide React
- **Date format:** DD MMM YYYY (e.g. 28 Mar 2026)
- **Time format:** HH:MM (24-hour, e.g. 14:30)
- **Timestamps:** Relative where under 24 hours ("3 minutes ago", "2 hours ago"), absolute date beyond that
- **Currency:** GBP as primary display, USD as secondary where relevant. Symbol prefix, two decimal places (e.g. £12,500.00)
- **Empty states:** Every list, table, and feed has a defined empty state with an illustration placeholder, a message explaining what the area is for, and a call-to-action button where applicable
- **Loading states:** Skeleton loaders matching the layout of the content being loaded. No spinners on primary content areas; spinners permitted only on inline actions (button submissions, small widget refreshes)
- **Error states:** Inline error banners with a red left border, error icon, descriptive message, and a "Retry" button where the action is retriable. Toast notifications for transient errors (network timeouts, 500s). Form validation errors appear below the offending field in red text
- **Confirmation dialogs:** All destructive actions (terminate agent, delete task, reject approval) require a confirmation dialog with the action described in plain English, a "Cancel" button (default focus), and the destructive action button in red
- **Toasts:** Bottom-right corner. Auto-dismiss after 5 seconds. Types: success (green), error (red), warning (amber), info (blue). Each has a close button
- **Pagination:** All lists with more than 25 items are paginated. Page size selector: 25, 50, 100. Current page indicator and total count shown. Keyboard navigation: left/right arrow for page switching
- **British English:** All UI copy uses British English spellings (organisation, colour, favour, analyse, etc.)

### User Roles

| Role | Slug | Description | Count |
|---|---|---|---|
| Board | `board` | Glen Pryer. Full access to everything. Can approve/reject actions. Can create/modify/delete all entities. Can manage users and settings. Only one board user exists | 1 |
| Admin | `admin` | NBI team members (Kali, Tom, Bryan, etc.). Can view all screens. Can create and manage tasks. Cannot approve external actions. Cannot manage API keys or budget caps. Cannot terminate agents | Multiple |
| Viewer | `viewer` | Read-only access to all screens except Settings (no access to API keys section). Cannot create, edit, or delete anything | Multiple |

### Navigation

The app uses a fixed left sidebar navigation with the following items:

| Order | Label | Icon | Route | Badge |
|---|---|---|---|---|
| 1 | Command Centre | LayoutDashboard | `/` | None |
| 2 | Org Chart | Network | `/org-chart` | None |
| 3 | Projects | FolderKanban | `/projects` | Active project count |
| 4 | Tasks | CheckSquare | `/tasks` | Open task count for current user's scope |
| 5 | Approvals | ShieldCheck | `/approvals` | Pending approval count (board only; hidden for other roles) |
| 6 | Finance | PoundSterling | `/finance` | None |
| 7 | Leads & Clients | Users | `/leads-clients` | Overdue follow-up count |
| 8 | Settings | Settings | `/settings` | None |

The sidebar is 256px wide, collapsible to 64px (icon-only mode). Collapse state persists in localStorage. The NBI logo sits at the top of the sidebar. The currently active route is highlighted with an electric blue left border and a subtle blue background tint.

A top bar spans the remaining width and contains:
- **Left:** Breadcrumb trail (e.g. Projects > NBIAI App > Task #42)
- **Centre:** Global search input (Cmd+K / Ctrl+K to focus)
- **Right:** Notification bell (unread count badge), user avatar with dropdown (Profile, Log Out)

---

## Section 1: Authentication and User Management

### 1.1 Data Objects

#### User

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key, auto-generated | Unique identifier |
| `email` | string | Unique, required, max 255 chars, must be valid email format | Login email |
| `password_hash` | string | Required, bcrypt hash | Stored password hash. Never returned by API |
| `display_name` | string | Required, 2-100 chars | Shown in UI |
| `role` | enum | One of: `board`, `admin`, `viewer`. Required | Access level |
| `avatar_url` | string | Nullable, valid URL or null | Profile image URL |
| `is_active` | boolean | Default: true | Soft-disable flag. Inactive users cannot log in |
| `last_login_at` | timestamp | Nullable | Updated on each successful login |
| `created_at` | timestamp | Auto-set on creation | Record creation time |
| `updated_at` | timestamp | Auto-set on update | Last modification time |

#### Session

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Session identifier |
| `user_id` | UUID | Foreign key to User | Owner of the session |
| `refresh_token` | string | Unique, 256 chars | Token for refreshing access |
| `expires_at` | timestamp | Required | When the refresh token expires |
| `created_at` | timestamp | Auto-set | Session creation time |
| `ip_address` | string | Required | IP at session creation |
| `user_agent` | string | Required | Browser user agent string |

#### Company

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key, singleton (only one row) | Company identifier |
| `name` | string | Required, 1-200 chars | Company display name |
| `logo_url` | string | Nullable | Company logo URL |
| `board_user_id` | UUID | Foreign key to User, required | The board operator |
| `anthropic_api_key_encrypted` | string | Nullable, AES-256 encrypted | Encrypted Anthropic API key |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

### 1.2 First-Time Setup Flow

**Trigger:** The app detects no Company record exists in the database.

**Screen: `/setup`**

This is a full-page wizard, no sidebar, no top bar. The NBI logo is centred at the top.

**Step 1 of 3: Create Company**

| Element | Type | Details |
|---|---|---|
| Heading | Text | "Set Up Your AI Company" |
| Subheading | Text | "This wizard runs once. It creates your company and board operator account." |
| Company Name | Text input | Label: "Company Name". Placeholder: "NBI". Required. Max 200 chars |
| Company Logo | File upload | Label: "Company Logo (optional)". Accepts PNG, JPG, SVG. Max 2MB. Preview shown after upload |
| Next button | Button | Label: "Next". Disabled until Company Name is filled |

**Validation:**
- Company Name: must be 1-200 characters. Error: "Company name is required" (empty) or "Company name must be under 200 characters" (too long)
- Logo: file type must be image/png, image/jpeg, or image/svg+xml. Error: "Logo must be a PNG, JPG, or SVG file". Size must be under 2MB. Error: "Logo must be under 2MB"

**Step 2 of 3: Create Board Operator Account**

| Element | Type | Details |
|---|---|---|
| Heading | Text | "Create Your Board Operator Account" |
| Subheading | Text | "The board operator has full control over the AI company. This is you." |
| Display Name | Text input | Label: "Your Name". Placeholder: "Glen Pryer". Required. 2-100 chars |
| Email | Email input | Label: "Email". Placeholder: "glen@nbi-consulting.com". Required. Valid email |
| Password | Password input | Label: "Password". Required. Min 12 chars, must contain uppercase, lowercase, number, and special character |
| Confirm Password | Password input | Label: "Confirm Password". Required. Must match Password |
| Next button | Button | Disabled until all fields valid |

**Validation:**
- Display Name: 2-100 chars. Error: "Name must be between 2 and 100 characters"
- Email: valid email format. Error: "Enter a valid email address"
- Password: min 12 chars. Error: "Password must be at least 12 characters". Must contain uppercase. Error: "Password must contain an uppercase letter". Must contain lowercase. Error: "Password must contain a lowercase letter". Must contain number. Error: "Password must contain a number". Must contain special character (!@#$%^&*). Error: "Password must contain a special character"
- Confirm Password: must match Password. Error: "Passwords do not match"

**Step 3 of 3: API Configuration**

| Element | Type | Details |
|---|---|---|
| Heading | Text | "Connect Your AI Provider" |
| Subheading | Text | "Agents need an Anthropic API key to operate. You can add this later in Settings." |
| Anthropic API Key | Password input | Label: "Anthropic API Key". Placeholder: "sk-ant-...". Optional. If provided, must start with "sk-ant-" |
| Skip for Now link | Text link | Label: "Skip for now". Proceeds to completion |
| Finish button | Button | Label: "Launch Your Company". Always enabled |

**Validation:**
- API Key (if provided): must start with "sk-ant-" and be 40-200 characters. Error: "API key format is invalid. It should start with sk-ant-"

**On completion:**
1. Company record created
2. Board user record created
3. Session created and access token issued
4. Redirect to `/` (Command Centre)
5. A welcome toast appears: "Welcome to [Company Name]. Your AI company is ready."

**If setup has already been completed** (Company record exists), navigating to `/setup` redirects to `/login`.

### 1.3 Login Screen

**Route:** `/login`

**Screen elements:**

| Element | Type | Details |
|---|---|---|
| NBI Logo | Image | Centred at top |
| Heading | Text | "Sign In" |
| Email | Email input | Label: "Email". Placeholder: "you@nbi-consulting.com". Required |
| Password | Password input | Label: "Password". Required |
| Remember Me | Checkbox | Label: "Keep me signed in for 30 days". Default: unchecked |
| Sign In button | Button | Primary. Full width. Label: "Sign In" |
| Error banner | Inline banner | Hidden by default. Shows on failed login |

**States:**

| State | Behaviour |
|---|---|
| Default | Form with empty fields |
| Loading | Sign In button shows spinner, fields disabled |
| Error (invalid credentials) | Banner: "Invalid email or password. Please try again." Fields remain populated (email), password cleared |
| Error (account inactive) | Banner: "Your account has been deactivated. Contact the board operator." |
| Error (server error) | Banner: "Something went wrong. Please try again." with Retry affordance |
| Success | Redirect to `/` (Command Centre) |

**Behaviour:**
- If user is already authenticated (valid access token in memory), `/login` redirects to `/`
- If no Company record exists, `/login` redirects to `/setup`
- Enter key in password field submits the form
- After 5 consecutive failed login attempts from the same IP within 15 minutes, all attempts from that IP are rate-limited to 1 per 30 seconds. Error: "Too many login attempts. Please wait before trying again."

### 1.4 Authentication Tokens

- **Access token:** JWT. Payload includes `user_id`, `role`, `email`. Expires in 15 minutes. Stored in memory (not localStorage). Sent as `Authorization: Bearer <token>` header
- **Refresh token:** Opaque 256-character string. Stored in an httpOnly, secure, sameSite=strict cookie. Expires in 7 days (or 30 days if "Keep me signed in" was checked). Stored in the Session table
- **Token refresh:** When the access token expires, the client automatically calls `POST /api/auth/refresh` with the refresh token cookie. If the refresh token is valid and not expired, a new access token and a new refresh token are issued (rotation). If the refresh token is invalid or expired, the user is redirected to `/login`
- **Logout:** `POST /api/auth/logout` invalidates the refresh token (deletes the Session record) and clears the cookie. Client clears the access token from memory and redirects to `/login`

### 1.5 User Management (Board Only)

**Accessed from:** Settings > User Management

**Screen elements:**

| Element | Type | Details |
|---|---|---|
| Heading | Text | "User Management" |
| Add User button | Button | Label: "+ Add User". Board only |
| User table | Table | Columns: Name, Email, Role, Last Login, Status, Actions |

**User table columns:**

| Column | Content | Sortable |
|---|---|---|
| Name | `display_name` | Yes (alphabetical) |
| Email | `email` | Yes (alphabetical) |
| Role | Badge showing `Board`, `Admin`, or `Viewer` | Yes |
| Last Login | Relative or absolute timestamp. "Never" if null | Yes |
| Status | Green dot + "Active" or grey dot + "Inactive" | Yes |
| Actions | Dropdown: Edit, Deactivate/Activate. No delete -- users are deactivated, not deleted | N/A |

**Add User dialog:**

| Element | Type | Details |
|---|---|---|
| Display Name | Text input | Required. 2-100 chars |
| Email | Email input | Required. Must not already exist |
| Role | Select | Options: Admin, Viewer. Board cannot be assigned (only one board user) |
| Temporary Password | Password input | Auto-generated and shown. Can be manually overridden. Same validation as setup |
| Create button | Button | Label: "Create User" |
| Cancel button | Button | Label: "Cancel" |

**Validation:**
- Email uniqueness: Error: "A user with this email already exists"
- All other field validations match the setup flow

**Edit User dialog:**
Same fields as Add User, except email is read-only and password is replaced by a "Reset Password" button that generates a new temporary password.

**Deactivate User:**
Confirmation dialog: "Deactivate [Name]? They will no longer be able to sign in. Their data and history will be preserved." Buttons: "Cancel" (default), "Deactivate" (red).

**Activate User:**
No confirmation needed. Instant toggle. Success toast: "[Name] has been reactivated."

### 1.6 Route Protection

| Route pattern | Access |
|---|---|
| `/setup` | Unauthenticated only. Redirects to `/login` if setup complete. Redirects to `/` if authenticated |
| `/login` | Unauthenticated only. Redirects to `/` if authenticated |
| `/approvals` | Board only. Admin and Viewer see the nav item greyed out. Direct URL access returns 403 page |
| `/settings` (API keys section) | Board only. Admin and Viewer see all other Settings sections |
| `/settings` (User Management) | Board only |
| `/settings` (Budget Management) | Board only |
| All other routes | Authenticated users (all roles) |

**403 Page:**
- Heading: "Access Denied"
- Message: "You do not have permission to view this page."
- Button: "Go to Command Centre" (links to `/`)

**404 Page:**
- Heading: "Page Not Found"
- Message: "The page you are looking for does not exist."
- Button: "Go to Command Centre" (links to `/`)

---

## Section 2: Command Centre (Dashboard)

### 2.1 Purpose

The Command Centre is the home screen. It provides Glen with a single-glance overview of everything happening in the AI company: active projects, agent statuses, recent activity, pending approvals, and key metrics. It loads at `/` after login.

### 2.2 Layout

The Command Centre uses a responsive grid layout:

- **Top row:** Quick Stats bar (full width)
- **Second row:** Active Projects widget (left, 60%) + Agent Status widget (right, 40%)
- **Third row:** Activity Feed (left, 60%) + Approvals Queue (right, 40%)

On screens narrower than 1024px, all widgets stack vertically at full width.

### 2.3 Quick Stats Bar

A horizontal bar of 5 stat cards, evenly spaced.

| Card | Label | Value | Colour Logic |
|---|---|---|---|
| 1 | Active Goals | Count of tasks with type `goal` and status not `done` or `cancelled` | White text |
| 2 | Tasks In Progress | Count of tasks with status `in_progress` | White text |
| 3 | Agents Active | Count of agents with status `active` (currently executing) | Green if > 0, grey if 0 |
| 4 | Pending Approvals | Count of approval items with status `pending` | Amber if > 0, grey if 0. Board role only; other roles see "Approvals: N/A" |
| 5 | Tasks Blocked | Count of tasks with status `blocked` | Red if > 0, green if 0 |

Each card is clickable and navigates to the relevant filtered view (e.g. clicking "Tasks In Progress" navigates to `/tasks?status=in_progress`).

**Empty state (no data at all -- fresh install):**
The Quick Stats bar shows all zeros with a banner above it: "Your AI company is set up. Start by adding agents in the Org Chart and creating your first project."

### 2.4 Active Projects Widget

**Heading:** "Active Projects" with a "View All" link to `/projects`

**Content:** A list of all projects with status `active`, sorted by last updated (most recent first). Maximum 5 shown; "View All" link if more exist.

**Each project row:**

| Element | Content |
|---|---|
| Status indicator | Coloured dot: Green (on track), Amber (at risk), Red (blocked) |
| Project name | Clickable, links to `/projects/:id` |
| Lead agent | Role name of the lead agent |
| Progress bar | Visual bar showing % of tasks in `done` status out of total tasks |
| Last update | Relative timestamp of the most recent task activity in this project |

**Empty state:**
- Icon: FolderKanban
- Message: "No active projects yet."
- Action button: "+ Create Project" (links to project creation flow)

**Loading state:** 5 skeleton rows matching the row layout.

**Error state:** Inline banner: "Could not load projects. [Retry]"

### 2.5 Agent Status Widget

**Heading:** "Agent Status" with a "View All" link to `/org-chart`

**Content:** A compact list of all agents, grouped by status.

**Status groups (in display order):**

| Status | Icon | Colour | Description |
|---|---|---|---|
| Active | Play circle | Green | Currently executing a task |
| Idle | Clock | Blue-grey | Online, no current task |
| Blocked | AlertTriangle | Amber | Has a task but is waiting on something |
| Paused | PauseCircle | Grey | Manually paused by the board or admin |
| Error | XCircle | Red | Last execution failed |
| Offline | MinusCircle | Dark grey | Not instantiated or terminated |

Each group shows a count badge and is collapsible. The Active group is expanded by default; others are collapsed.

**Each agent entry:**

| Element | Content |
|---|---|
| Role name | Clickable, links to `/org-chart/:agentId` |
| Model tier badge | "Opus" (purple) or "Sonnet" (blue) or "Haiku" (grey) |
| Current task | Truncated to 60 chars. "No task" if idle. Clickable, links to task detail |

**Empty state:**
- Message: "No agents configured. Add agents in the Org Chart."
- Action: "Go to Org Chart" link

**Loading state:** Skeleton list with 6 placeholder rows.

### 2.6 Activity Feed

**Heading:** "Recent Activity" with filter controls

**Filters (inline, horizontal):**

| Filter | Type | Options | Default |
|---|---|---|---|
| Time range | Select | Last hour, Last 6 hours, Last 24 hours, Last 7 days | Last 24 hours |
| Agent | Select (searchable) | "All Agents" + list of all agent role names | All Agents |
| Activity type | Multi-select | Task update, Approval request, Agent execution, Escalation, System event | All selected |

**Feed items:** Reverse chronological list. Each item:

| Element | Content |
|---|---|
| Timestamp | Relative timestamp |
| Agent avatar | Small coloured circle with initials (first letter of role name) |
| Agent name | Role name, clickable to role detail |
| Action description | Plain English description, e.g. "completed task 'Write feature spec'" or "requested approval for email to John Smith" |
| Linked entity | Clickable link to the task, approval, or project referenced |

**Pagination:** Infinite scroll. Load 25 items initially, load 25 more on scroll to bottom. "No more activity" message at the end.

**Empty state:**
- Message: "No activity recorded yet. Activity will appear here as agents begin working."

**Loading state:** 5 skeleton feed items.

### 2.7 Approvals Queue Widget (Board Role Only)

**Heading:** "Pending Approvals" with count badge and "View All" link to `/approvals`

**Visibility:** Only visible to users with `board` role. For `admin` and `viewer` roles, this widget space is replaced by an expanded Activity Feed (full width on the third row).

**Content:** List of pending approval items, sorted by created_at ascending (oldest first -- FIFO).

**Each approval item:**

| Element | Content |
|---|---|
| Type badge | Badge showing the category: "Email", "Client Deliverable", "Financial", "Strategic", "Publishing" |
| Title | Summary of what needs approval, e.g. "Email to John Smith at Lighthouse Games" |
| Requesting agent | Role name of the agent that created the request |
| Created | Relative timestamp |
| Quick actions | "Review" button (opens full approval view) |

Maximum 5 items shown. "View All ([count] pending)" link if more.

**Empty state:**
- Icon: ShieldCheck
- Message: "No pending approvals. All clear."

---

## Section 3: Org Chart View

### 3.1 Data Objects

#### Agent

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `role_name` | string | Required, unique, 2-100 chars | Display name of the role (e.g. "CEO", "Senior Engineer") |
| `role_slug` | string | Required, unique, lowercase kebab-case | URL-safe identifier (e.g. "ceo", "senior-engineer") |
| `model_tier` | enum | One of: `opus`, `sonnet`, `haiku` | Which Claude model this agent uses |
| `status` | enum | One of: `active`, `idle`, `blocked`, `paused`, `error`, `offline` | Current operational status |
| `reports_to` | UUID | Nullable, foreign key to Agent | Parent in hierarchy. Null for the top-level agent (CEO) |
| `persona_summary` | text | Required, max 5000 chars | Short persona description displayed on role detail |
| `system_prompt` | text | Required, max 50000 chars | The full system prompt loaded when this agent executes |
| `responsibilities` | text | Required, max 10000 chars | Markdown of the agent's responsibilities |
| `knowledge_tier_1` | text[] | Array of file paths | Tier 1 knowledge files loaded for this agent |
| `knowledge_tier_2` | text[] | Array of file paths | Tier 2 knowledge files for this role |
| `knowledge_tier_3` | text[] | Array of file paths | Tier 3 project-specific knowledge files |
| `monthly_budget_cap_usd` | decimal(10,2) | Nullable, min 0 | Maximum monthly spend for this agent in USD |
| `current_month_spend_usd` | decimal(10,2) | Default 0 | Spend so far this month |
| `current_task_id` | UUID | Nullable, foreign key to Task | Task currently being executed |
| `last_heartbeat_at` | timestamp | Nullable | Last time the agent checked in |
| `last_execution_at` | timestamp | Nullable | Last time the agent completed an action |
| `tasks_completed_count` | integer | Default 0 | Lifetime completed task count |
| `tasks_escalated_count` | integer | Default 0 | Lifetime escalation count |
| `average_task_duration_seconds` | integer | Nullable | Rolling average task completion time |
| `is_active` | boolean | Default true | Whether agent is enabled |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

### 3.2 Org Chart Screen

**Route:** `/org-chart`

**Layout:** Full-width canvas with a visual tree hierarchy rendered as connected nodes. The tree is horizontally centred and scrollable both horizontally and vertically if it overflows the viewport.

**Controls (top bar):**

| Element | Type | Details |
|---|---|---|
| Zoom controls | Button group | "+" (zoom in), "-" (zoom out), "Fit" (fit tree to viewport). Zoom range: 50% to 150% in 10% increments |
| View toggle | Segmented control | "Tree" (default, visual hierarchy) and "List" (flat table of all agents) |
| Hire Agent button | Button | Label: "+ Hire Agent". Board and Admin roles only. Opens the Hire Agent dialog |
| Search | Text input | Label: "Search agents...". Filters visible nodes by role name. Matching nodes are highlighted; non-matching nodes are dimmed to 30% opacity |

### 3.3 Tree View

Each agent is rendered as a card node connected to its parent by a line.

**Node card (each agent):**

| Element | Content |
|---|---|
| Status dot | Coloured circle matching agent status (see Section 2.5 status table) |
| Role name | Bold text. e.g. "CEO" |
| Model tier | Small badge: "Opus" / "Sonnet" / "Haiku" |
| Current task | Truncated to 40 chars or "Idle" if no current task. Greyed if idle |
| Quick actions (on hover) | Three icon buttons: View (eye icon, opens role detail), Edit (pencil icon, opens edit dialog), Pause/Resume (pause/play icon) |

**Node connections:**
- Lines connect each agent to their `reports_to` parent
- Lines are 2px, grey (#475569), with rounded corners at bends
- The CEO node (reports_to is null) sits at the top of the tree
- Glen Pryer is shown as a special node above the CEO labelled "Board Operator (Human)" with a distinct border (gold, #F59E0B)

**Click behaviour:**
- Single click on a node: selects it (blue border highlight). Shows a brief info tooltip to the right with: role name, status, current task, and "View Details" link
- Double click on a node: navigates to `/org-chart/:agentId` (Role Detail Page)

### 3.4 List View

A table showing all agents in a flat list.

| Column | Content | Sortable | Filterable |
|---|---|---|---|
| Role | `role_name` with status dot | Yes (alphabetical) | No |
| Model | `model_tier` badge | Yes | Yes (multi-select: Opus, Sonnet, Haiku) |
| Reports To | Parent agent's `role_name` or "Board (Glen)" for CEO | Yes | No |
| Status | Status badge with colour | Yes | Yes (multi-select from status enum) |
| Current Task | Task title, truncated to 60 chars, or "None" | No | No |
| Tasks Done | `tasks_completed_count` | Yes | No |
| Budget Used | "[current_month_spend] / [monthly_budget_cap]" or "No cap" | Yes | No |
| Actions | Dropdown: View, Edit, Pause/Resume, Terminate | N/A | N/A |

### 3.5 Hire Agent Dialog

**Trigger:** "+ Hire Agent" button

**Dialog title:** "Hire a New Agent"

**Fields:**

| Field | Type | Details |
|---|---|---|
| Role Name | Text input | Required. 2-100 chars. Must be unique across all agents. Placeholder: "e.g. Content Strategist" |
| Role Slug | Text input | Auto-generated from Role Name (lowercase, hyphens). Editable. Must be unique. Must be lowercase alphanumeric with hyphens only |
| Model Tier | Select | Options: Opus, Sonnet, Haiku. Required. Default: Sonnet |
| Reports To | Select (searchable) | List of all existing agents. Required. Default: CEO |
| Persona Summary | Textarea | Required. Max 5000 chars. Placeholder: "Describe this agent's identity, expertise, and communication style." |
| System Prompt | Textarea | Required. Max 50000 chars. Placeholder: "The full system prompt loaded when this agent runs." |
| Responsibilities | Textarea (markdown) | Required. Max 10000 chars. Placeholder: "List this agent's core responsibilities." |
| Monthly Budget Cap (USD) | Number input | Optional. Min 0, max 100000. Two decimal places. Placeholder: "e.g. 50.00". Leave blank for no cap |
| Knowledge Files (Tier 2) | Multi-select with file path input | Optional. Add file paths one at a time. Each path must be non-empty and under 500 chars |

**Buttons:** "Cancel", "Hire Agent" (primary)

**Validation:**
- Role Name uniqueness: "An agent with this role name already exists"
- Role Slug uniqueness: "An agent with this slug already exists"
- Role Slug format: "Slug must contain only lowercase letters, numbers, and hyphens"
- Persona Summary length: "Persona must be between 1 and 5,000 characters"
- System Prompt length: "System prompt must be between 1 and 50,000 characters"
- Budget cap: "Budget must be between 0 and 100,000"

**On success:**
- Agent created with status `idle`
- Org chart re-renders with the new node
- Success toast: "[Role Name] has been hired."
- Dialog closes

### 3.6 Edit Agent Dialog

Same fields as Hire Agent, except:
- Role Slug is read-only
- An additional "Tier 3 Knowledge Files" multi-select is shown (project-specific knowledge)
- The dialog title is "Edit [Role Name]"
- The save button label is "Save Changes"

### 3.7 Pause / Resume Agent

**Pause:**
- Confirmation dialog: "Pause [Role Name]? The agent will stop executing tasks. Any in-progress task will be moved to 'blocked' status."
- On confirm: agent status set to `paused`. If the agent had a current task, that task's status changes to `blocked` with a system comment: "Agent paused by [user name]"
- Toast: "[Role Name] has been paused."

**Resume:**
- No confirmation needed
- Agent status set to `idle`
- Toast: "[Role Name] has been resumed."

### 3.8 Terminate Agent (Board Only)

- Confirmation dialog (destructive): "Terminate [Role Name]? This agent will be permanently deactivated. All task history will be preserved, but the agent will no longer execute. This action cannot be easily undone."
- Buttons: "Cancel" (default), "Terminate" (red)
- On confirm: agent `is_active` set to false, status set to `offline`. Any in-progress task moved to `blocked` with comment: "Agent terminated by [user name]"
- Toast: "[Role Name] has been terminated."
- The agent remains in the org chart but is shown with a strikethrough name and dark grey node

---

## Section 4: Role Detail Page

### 4.1 Route

`/org-chart/:agentId`

### 4.2 Layout

A full-width page with a header section and a tabbed content area.

### 4.3 Header Section

| Element | Content |
|---|---|
| Back link | "< Org Chart" links to `/org-chart` |
| Status dot | Coloured dot matching agent status |
| Role name | Large heading text |
| Model tier badge | "Opus" / "Sonnet" / "Haiku" |
| Reports to | "Reports to: [Parent Role Name]" with clickable link to parent's role detail |
| Direct reports | "Direct reports: [Role1], [Role2]" with clickable links. "None" if no reports |
| Action buttons (right-aligned) | "Edit" (opens Edit Agent dialog), "Pause/Resume", "Assign Task" (opens task assignment dialog) |

### 4.4 Tabs

| Tab | Label | Content |
|---|---|---|
| 1 | Overview | Persona summary, current assignment, key stats |
| 2 | Task History | Paginated list of all tasks assigned to this agent |
| 3 | Performance | Metrics charts and tables |
| 4 | Knowledge | Knowledge files loaded for this agent |
| 5 | System Prompt | Read-only view of the agent's system prompt |
| 6 | Execution Log | Detailed log of agent executions |

### 4.5 Overview Tab

**Current Assignment panel:**

| Element | Content |
|---|---|
| Heading | "Current Assignment" |
| Task title | Title of the current task, clickable to task detail. "No active assignment" if null |
| Task status | Status badge |
| Project | Project name the task belongs to, clickable to project |
| Assigned | When the task was assigned to this agent |
| Duration so far | Time elapsed since task was assigned |

**Key Stats panel (4 stat cards in a row):**

| Stat | Value | Description |
|---|---|---|
| Tasks Completed | `tasks_completed_count` | Total tasks finished |
| Avg. Completion Time | Formatted duration from `average_task_duration_seconds` (e.g. "2h 15m") | Average time to complete a task |
| Escalations | `tasks_escalated_count` | Tasks escalated to a manager |
| Budget Used | "[current_month_spend] / [monthly_budget_cap]" with progress bar. "No cap set" if null | Monthly spend vs cap |

**Persona Summary panel:**
- Heading: "Persona"
- Content: Rendered markdown of `persona_summary`

### 4.6 Task History Tab

A paginated table of all tasks ever assigned to this agent.

| Column | Content | Sortable |
|---|---|---|
| Task | Title, clickable to task detail | No |
| Project | Project name | Yes |
| Status | Status badge | Yes (filterable) |
| Assigned | Date assigned to this agent | Yes |
| Completed | Date completed, or "-" if not done | Yes |
| Duration | Time from assigned to completed, or elapsed time if still active | Yes |
| Outcome | "Completed", "Escalated", "Blocked", or "In Progress" | Yes (filterable) |

Default sort: Assigned descending (most recent first).
Page size: 25.

**Empty state:** "No tasks have been assigned to this agent yet."

### 4.7 Performance Tab

**Metrics panel (time-range selector: Last 7 days, Last 30 days, Last 90 days, All Time):**

**Task Completion Chart:**
- Type: Bar chart
- X-axis: Week or day (depending on range)
- Y-axis: Number of tasks completed
- Colour: Electric blue

**Average Completion Time Chart:**
- Type: Line chart
- X-axis: Week or day
- Y-axis: Minutes
- Colour: Green

**Efficiency Table:**

| Metric | Value |
|---|---|
| Total tasks assigned | Count |
| Tasks completed | Count |
| Tasks escalated | Count |
| Tasks currently blocked | Count |
| Completion rate | (completed / assigned) * 100, formatted as percentage |
| Escalation rate | (escalated / assigned) * 100, formatted as percentage |
| Average completion time | Formatted duration |
| Fastest task | Duration of shortest completed task |
| Slowest task | Duration of longest completed task |
| Total tokens used (period) | Formatted number |
| Total cost (period) | USD formatted |

### 4.8 Knowledge Tab

Three collapsible sections:

**Tier 1 -- Company Knowledge:**
- List of file paths from `knowledge_tier_1`
- Each entry shows the file path and a "View" button that opens a read-only modal showing the file contents (rendered markdown)

**Tier 2 -- Role Knowledge:**
- List of file paths from `knowledge_tier_2`
- Same view/modal behaviour

**Tier 3 -- Project Knowledge:**
- List of file paths from `knowledge_tier_3`
- Same view/modal behaviour

**Empty state (per section):** "No [tier name] knowledge files configured."

### 4.9 System Prompt Tab

- A read-only code block (monospace font, dark background, with line numbers) displaying the full `system_prompt` text
- A "Copy to Clipboard" button in the top-right corner of the code block
- A character count shown below: "[X] characters"

### 4.10 Execution Log Tab

A reverse-chronological list of all executions by this agent.

**Each execution entry:**

| Element | Content |
|---|---|
| Timestamp | Absolute timestamp |
| Task | Task title, clickable |
| Duration | How long the execution ran (e.g. "45 seconds") |
| Input tokens | Number, formatted with commas |
| Output tokens | Number, formatted with commas |
| Cost | USD, 4 decimal places (e.g. $0.0342) |
| Status | "Completed", "Error", "Timed Out" |
| Detail toggle | Expandable section showing: what the agent read (input summary), what it produced (output summary, truncated to 500 chars with "Show Full" link), and any error messages |

**Pagination:** 25 per page.

**Empty state:** "No executions recorded for this agent yet."

---

## Section 5: Project Management View

### 5.1 Data Objects

#### Project

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `name` | string | Required, unique, 2-200 chars | Project display name |
| `slug` | string | Required, unique, lowercase kebab-case | URL-safe identifier |
| `description` | text | Required, max 5000 chars | What this project is and why it exists |
| `status` | enum | One of: `active`, `completed`, `on_hold`, `cancelled` | Project lifecycle status |
| `health` | enum | One of: `green`, `amber`, `red` | Current health assessment |
| `lead_agent_id` | UUID | Nullable, foreign key to Agent | The agent primarily responsible |
| `created_by_user_id` | UUID | Foreign key to User | Who created the project |
| `start_date` | date | Nullable | When the project began or will begin |
| `target_end_date` | date | Nullable | Target completion date |
| `actual_end_date` | date | Nullable | When the project was actually completed |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

### 5.2 Projects List Screen

**Route:** `/projects`

**Controls (top bar):**

| Element | Type | Details |
|---|---|---|
| Heading | Text | "Projects" |
| Create Project button | Button | Label: "+ New Project". Board and Admin only |
| Status filter | Multi-select | Active, Completed, On Hold, Cancelled. Default: Active selected |
| Health filter | Multi-select | Green, Amber, Red. Default: all |
| Sort | Select | "Last Updated" (default), "Name A-Z", "Name Z-A", "Start Date", "Target End Date" |

**Project cards:** Displayed as a grid of cards (3 per row on desktop, 2 on tablet, 1 on mobile).

**Each project card:**

| Element | Content |
|---|---|
| Health indicator | Coloured left border: green, amber, or red |
| Project name | Bold text, clickable to `/projects/:id` |
| Status badge | "Active", "Completed", "On Hold", "Cancelled" |
| Description | First 120 chars, truncated with ellipsis |
| Lead agent | Role name or "Unassigned" |
| Progress bar | % of tasks in `done` status |
| Task count | "X of Y tasks complete" |
| Target end date | Date or "No target set" |
| Last updated | Relative timestamp |

**Empty state:**
- Icon: FolderKanban
- Message: "No projects match your filters." (if filters applied) or "No projects created yet. Projects organise your agent team's work." (if no projects exist)
- Action: "+ Create Your First Project" button

### 5.3 Create Project Dialog

**Fields:**

| Field | Type | Details |
|---|---|---|
| Project Name | Text input | Required. 2-200 chars. Must be unique |
| Description | Textarea | Required. Max 5000 chars |
| Lead Agent | Select (searchable) | Optional. List of all active agents |
| Start Date | Date picker | Optional. Cannot be in the past |
| Target End Date | Date picker | Optional. Must be after Start Date if both are set |

**Validation:**
- Name uniqueness: "A project with this name already exists"
- End date before start: "Target end date must be after start date"

**On success:**
- Project created with status `active`, health `green`
- Navigate to `/projects/:id`
- Toast: "Project '[Name]' created."

### 5.4 Project Detail Screen

**Route:** `/projects/:id`

**Header:**

| Element | Content |
|---|---|
| Back link | "< Projects" |
| Health dot | Green/amber/red |
| Project name | Large heading |
| Status badge | Current status |
| Edit button | Opens Edit Project dialog (same fields as create, plus status and health selects) |

**Summary bar (4 cards):**

| Card | Value |
|---|---|
| Total Tasks | Count of all tasks in this project |
| In Progress | Count of tasks with status `in_progress` |
| Blocked | Count of tasks with status `blocked` |
| Completed | Count of tasks with status `done` |

**Task board:** A Kanban-style board with columns for each task status.

| Column | Status | Header Colour |
|---|---|---|
| Backlog | `backlog` | Grey |
| Assigned | `assigned` | Blue |
| In Progress | `in_progress` | Electric blue |
| Blocked | `blocked` | Red |
| Review | `review` | Amber |
| Done | `done` | Green |

Each task appears as a card in its column:

| Element | Content |
|---|---|
| Task title | Bold, clickable to `/tasks/:taskId` |
| Priority badge | Critical (red), High (orange), Medium (yellow), Low (grey) |
| Assigned agent | Role name or "Unassigned" |
| Age | How long since the task was created |

Cards are draggable between columns (Board and Admin only). Dragging a card to a new column updates the task status. Dragging to "Blocked" opens a required comment dialog: "What is blocking this task?" (min 10 chars). Dragging to "Done" triggers the PM review gate check if the task has `requires_review` set to true.

**Below the Kanban board:** A "+ Add Task" button that opens the Create Task dialog (Section 6) pre-populated with this project.

### 5.5 Project Health Updates

**Health is set manually** by Board or Admin users via the Edit Project dialog or by clicking the health dot in the project header, which shows a dropdown with Green/Amber/Red options and a required comment field (max 500 chars) explaining the health change.

Each health change is logged in the project's activity history:
- "[User] changed project health from [old] to [new]: [comment]"

---

## Section 6: Task System

### 6.1 Data Objects

#### Task

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `title` | string | Required, 5-500 chars | Task title |
| `description` | text | Required, max 20000 chars | Full task description (markdown) |
| `type` | enum | One of: `goal`, `task`, `subtask` | Hierarchy level |
| `status` | enum | One of: `backlog`, `assigned`, `in_progress`, `blocked`, `review`, `done`, `cancelled` | Current status |
| `priority` | enum | One of: `critical`, `high`, `medium`, `low` | Priority level |
| `project_id` | UUID | Nullable, foreign key to Project | Parent project |
| `parent_task_id` | UUID | Nullable, foreign key to Task | Parent task (for subtasks) |
| `assigned_agent_id` | UUID | Nullable, foreign key to Agent | Agent responsible |
| `created_by_user_id` | UUID | Nullable, foreign key to User | User who created it (if human-created) |
| `created_by_agent_id` | UUID | Nullable, foreign key to Agent | Agent who created it (if agent-created) |
| `requires_review` | boolean | Default: true | Whether PM review gate applies |
| `reviewed_by_user_id` | UUID | Nullable | User who reviewed and approved |
| `reviewed_at` | timestamp | Nullable | When review was completed |
| `checkout_agent_id` | UUID | Nullable, foreign key to Agent | Agent that has checked out (locked) this task |
| `checkout_at` | timestamp | Nullable | When checkout occurred |
| `started_at` | timestamp | Nullable | When status first moved to `in_progress` |
| `completed_at` | timestamp | Nullable | When status moved to `done` |
| `due_date` | date | Nullable | Optional due date |
| `estimated_hours` | decimal(5,1) | Nullable, min 0.1, max 9999.9 | Estimated effort |
| `actual_hours` | decimal(5,1) | Nullable | Actual effort (computed from execution logs) |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

#### TaskComment

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `task_id` | UUID | Foreign key to Task | Parent task |
| `author_user_id` | UUID | Nullable | Human author |
| `author_agent_id` | UUID | Nullable | Agent author |
| `content` | text | Required, 1-10000 chars | Comment body (markdown) |
| `comment_type` | enum | One of: `comment`, `status_change`, `system` | Type of entry |
| `created_at` | timestamp | Auto-set | When posted |

#### TaskRelation

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `source_task_id` | UUID | Foreign key to Task | The task this relation is from |
| `target_task_id` | UUID | Foreign key to Task | The task this relation is to |
| `relation_type` | enum | One of: `blocks`, `blocked_by`, `related` | How the tasks relate |
| `created_at` | timestamp | Auto-set | When created |

Constraint: `source_task_id` cannot equal `target_task_id`. The pair (`source_task_id`, `target_task_id`, `relation_type`) is unique.

### 6.2 Tasks List Screen

**Route:** `/tasks`

**Controls:**

| Element | Type | Details |
|---|---|---|
| Heading | Text | "Tasks" |
| Create Task button | Button | "+ New Task". Board and Admin only |
| View toggle | Segmented | "List" (default), "Board" (Kanban grouped by status) |
| Status filter | Multi-select | All statuses. Default: all except `done` and `cancelled` |
| Priority filter | Multi-select | All priorities. Default: all |
| Project filter | Select | "All Projects" + list of project names |
| Agent filter | Select | "All Agents" + list of agent names |
| Sort | Select | "Priority" (default), "Created", "Updated", "Due Date" |
| Search | Text input | Searches title and description |

**List view:** Table with columns:

| Column | Sortable | Filterable |
|---|---|---|
| Priority (icon) | Yes | Yes |
| Title (clickable) | No | No |
| Status (badge) | Yes | Yes |
| Project | Yes | Yes |
| Assigned Agent | Yes | Yes |
| Due Date | Yes | No |
| Updated | Yes | No |

### 6.3 Create Task Dialog

**Fields:**

| Field | Type | Details |
|---|---|---|
| Title | Text input | Required. 5-500 chars |
| Description | Textarea (markdown) | Required. Max 20000 chars |
| Type | Select | Goal, Task, Subtask. Default: Task |
| Priority | Select | Critical, High, Medium, Low. Default: Medium |
| Project | Select | Optional. List of active projects |
| Parent Task | Select (searchable) | Optional. Only shown if Type is "Subtask". Lists tasks from the selected project |
| Assigned Agent | Select (searchable) | Optional. List of all active agents |
| Due Date | Date picker | Optional |
| Estimated Hours | Number input | Optional. Min 0.1, max 9999.9. One decimal place |
| Requires PM Review | Checkbox | Default: checked |

**Validation:**
- Title: 5-500 chars. "Title must be between 5 and 500 characters"
- Description: required. "Description is required"
- Parent Task with no Project: "Select a project before choosing a parent task"
- Subtask without parent: Warning (not blocking): "Subtasks usually have a parent task. Continue without one?"
- Due date in the past: "Due date cannot be in the past"

**On success:**
- Task created with status `backlog` (if no agent assigned) or `assigned` (if agent assigned)
- Toast: "Task '[Title]' created."
- If created from a project's board, the task appears in the appropriate Kanban column

### 6.4 Task Detail Screen

**Route:** `/tasks/:taskId`

**Header:**

| Element | Content |
|---|---|
| Back link | Context-aware: "< [Project Name]" if navigated from project, "< Tasks" otherwise |
| Priority badge | Coloured priority indicator |
| Title | Large heading, editable inline by Board/Admin (click to edit, Enter to save, Escape to cancel) |
| Status badge | Current status with dropdown to change (permitted transitions only) |
| Actions | "Edit" button, "Delete" button (Board only, confirmation required) |

**Left panel (70% width):**

**Description:**
- Rendered markdown
- "Edit" button (Board and Admin) opens inline markdown editor

**Subtasks (if type is `goal` or `task`):**
- List of child tasks with title, status badge, assigned agent
- "+ Add Subtask" button

**Relations:**
- "Blocking:" list of tasks this task blocks (clickable)
- "Blocked by:" list of tasks blocking this one (clickable)
- "Related:" list of related tasks (clickable)
- "+ Add Relation" button opens a dialog with: relation type select (Blocks, Blocked By, Related) and a searchable task select

**Activity / Comments:**
- Reverse-chronological list of all TaskComment entries
- Status change entries are shown as system messages: "[Agent/User] changed status from [old] to [new]" with optional comment
- Comment entries show author, timestamp, and markdown-rendered content
- New comment textarea at the top with a "Post" button. Supports markdown

**Right panel (30% width):**

| Field | Value |
|---|---|
| Status | Badge with dropdown to change |
| Priority | Badge with dropdown to change |
| Assigned Agent | Name with link, or "Unassigned" + "Assign" button |
| Project | Name with link, or "None" |
| Parent Task | Title with link, or "None" |
| Type | Goal / Task / Subtask |
| Created By | User or agent name |
| Created | Timestamp |
| Started | Timestamp or "Not started" |
| Completed | Timestamp or "Not completed" |
| Due Date | Date or "No due date" + "Set" button |
| Estimated Hours | Number or "Not estimated" |
| Actual Hours | Computed number or "N/A" |
| Requires Review | Yes/No badge |
| Checked Out By | Agent name or "Not checked out" |

### 6.5 Status Transitions

| From | Permitted To | Condition |
|---|---|---|
| `backlog` | `assigned`, `cancelled` | `assigned` requires an agent to be assigned |
| `assigned` | `in_progress`, `backlog`, `cancelled` | `in_progress` sets `started_at` and `checkout_agent_id` |
| `in_progress` | `blocked`, `review`, `done`, `cancelled` | `blocked` requires a comment. `done` is only permitted if `requires_review` is false; otherwise must go through `review` first |
| `blocked` | `in_progress`, `assigned`, `cancelled` | Moving to `in_progress` re-checks out to the same agent |
| `review` | `done`, `in_progress` | `done` can only be set by Board or Admin (the PM review gate). `in_progress` means review rejected -- returns to the agent |
| `done` | None (terminal) | Cannot be changed. Task is complete |
| `cancelled` | `backlog` | Can only be un-cancelled by Board |

**Checkout model:**
- When a task moves to `in_progress`, `checkout_agent_id` is set to the assigned agent and `checkout_at` is set to now
- Only the checked-out agent (or Board/Admin users) can update a checked-out task
- When a task leaves `in_progress` for any reason, `checkout_agent_id` and `checkout_at` are cleared
- If an agent attempts to check out a task that is already checked out by another agent, the action fails with error: "This task is currently checked out by [Agent Name]"

### 6.6 Task Cascade (Goal Decomposition)

When Glen (Board) or the CEO agent creates a task of type `goal`:
1. The task is assigned to the CEO agent
2. The CEO agent reads the goal and decomposes it into child tasks of type `task`
3. Each child task is assigned to a direct report based on the responsibilities defined in the org chart
4. Those agents may further decompose into `subtask` entries assigned to their own reports

This cascade is not enforced by the UI but is documented here as the expected workflow. The UI supports it by:
- Allowing agents to create child tasks on any task they are assigned to
- Showing the full task hierarchy (goal > task > subtask) on the task detail page
- The Activity Feed on the Command Centre showing cascade events: "CEO decomposed goal '[Title]' into [N] tasks"

---

## Section 7: Agent Execution Layer (User-Facing)

### 7.1 Data Objects

#### AgentExecution

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `agent_id` | UUID | Foreign key to Agent | Which agent executed |
| `task_id` | UUID | Nullable, foreign key to Task | Which task this execution was for |
| `trigger` | enum | One of: `scheduled`, `task_assigned`, `manual`, `heartbeat` | What triggered the execution |
| `status` | enum | One of: `running`, `completed`, `error`, `timed_out` | Execution outcome |
| `started_at` | timestamp | Required | When execution began |
| `completed_at` | timestamp | Nullable | When execution ended |
| `duration_seconds` | integer | Nullable | Computed duration |
| `input_tokens` | integer | Default 0 | Tokens sent to Claude |
| `output_tokens` | integer | Default 0 | Tokens received from Claude |
| `cost_usd` | decimal(10,6) | Default 0 | Computed cost |
| `input_summary` | text | Nullable, max 5000 chars | Summary of what was sent to the agent |
| `output_summary` | text | Nullable, max 5000 chars | Summary of what the agent produced |
| `full_output` | text | Nullable | Complete agent output (stored for audit) |
| `error_message` | text | Nullable | Error details if status is `error` |
| `model_used` | string | Required | Specific model identifier used (e.g. "claude-sonnet-4-20250514") |
| `created_at` | timestamp | Auto-set | Record creation time |

#### AgentHeartbeat

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `agent_id` | UUID | Foreign key to Agent | Which agent |
| `timestamp` | timestamp | Required | When the heartbeat occurred |
| `status` | enum | One of: `alive`, `no_task`, `error` | Heartbeat result |
| `next_scheduled_at` | timestamp | Nullable | When the next heartbeat is expected |

### 7.2 Agent Heartbeat System

Agents operate on a heartbeat model:

1. Each active agent has a configurable heartbeat interval (default: 5 minutes)
2. On each heartbeat, the server checks if the agent has any assigned tasks
3. If a task is assigned and in `assigned` status, the agent checks it out and begins execution
4. If no tasks are assigned, the agent reports `no_task` and goes back to idle
5. If execution fails, the agent reports `error` and the task is marked `blocked`

The heartbeat system is managed server-side. The UI surfaces it through:
- The Agent Status widget on the Command Centre (real-time status updates via PostgreSQL LISTEN/NOTIFY pushed to the client via WebSocket)
- The "Last Heartbeat" timestamp on the Role Detail page
- A heartbeat indicator (pulsing green dot) on active agent nodes in the Org Chart

### 7.3 Execution Log Screen (on Role Detail Page)

Covered in Section 4.10. This section defines the additional detail available per execution.

**Expanded execution detail view:**

| Section | Content |
|---|---|
| Input | What was loaded into the agent's context: knowledge files listed, task description, any parent task context. Truncated to 2000 chars with "Show Full" toggle |
| Output | What the agent produced. Rendered markdown. Truncated to 2000 chars with "Show Full" toggle |
| Token Breakdown | Table: input tokens, output tokens, total tokens. Cost breakdown at the model's per-token rate |
| Error (if applicable) | Full error message and stack trace in a code block |

### 7.4 Cost Tracking

**Per-execution cost** is computed using the following rates (configurable in Settings):

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| claude-opus-4 | $15.00 | $75.00 |
| claude-sonnet-4 | $3.00 | $15.00 |
| claude-haiku-3.5 | $0.80 | $4.00 |

These rates are stored in the `model_pricing` table:

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `model_identifier` | string | e.g. "claude-opus-4" |
| `input_cost_per_million` | decimal(10,4) | Cost per million input tokens |
| `output_cost_per_million` | decimal(10,4) | Cost per million output tokens |
| `effective_from` | date | When this pricing took effect |
| `created_at` | timestamp | Record creation time |

Cost per execution = (input_tokens / 1,000,000 * input_cost_per_million) + (output_tokens / 1,000,000 * output_cost_per_million)

### 7.5 Budget Caps

Each agent has an optional `monthly_budget_cap_usd`. The system tracks `current_month_spend_usd` which resets to 0 on the first day of each calendar month (UTC).

**Alert at 80%:**
When an agent's `current_month_spend_usd` reaches 80% of `monthly_budget_cap_usd`:
- A system notification is created (visible in the notification bell): "[Agent Name] has used 80% of their monthly budget ($[spent] of $[cap])"
- The agent status widget on the Command Centre shows a warning icon next to the agent

**Hard stop at 100%:**
When an agent's `current_month_spend_usd` reaches or exceeds `monthly_budget_cap_usd`:
- The agent is automatically paused
- A system notification: "[Agent Name] has been paused: monthly budget cap of $[cap] reached"
- Any in-progress task is moved to `blocked` with system comment: "Agent paused due to budget cap"
- The agent can only be resumed by Board, and only after the budget cap is increased or the month resets

### 7.6 Manual Execution Trigger

Board users can manually trigger an agent execution:
- From the Role Detail page: "Run Now" button in the header
- This triggers an immediate heartbeat cycle for the agent, regardless of the scheduled interval
- If the agent has no assigned task, a dialog prompts: "This agent has no assigned task. Assign a task first, or enter a one-off prompt:" with a textarea for a free-form prompt
- If a free-form prompt is entered, a temporary task of type `task` is created, assigned to the agent, and execution begins

---

## Section 8: Finance Tab

### 8.1 Data Objects

#### RevenueEntry

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `source` | string | Required, max 200 chars | Where the revenue comes from (client name, product name) |
| `type` | enum | One of: `contracted`, `recurring`, `one_off`, `pipeline` | Revenue type |
| `amount_gbp` | decimal(12,2) | Required | Amount in GBP |
| `amount_usd` | decimal(12,2) | Nullable | Amount in USD (for US-based clients) |
| `period_start` | date | Required | Start of the revenue period |
| `period_end` | date | Required | End of the revenue period |
| `status` | enum | One of: `confirmed`, `invoiced`, `received`, `projected` | Payment status |
| `client_id` | UUID | Nullable, foreign key to Client | Associated client |
| `notes` | text | Nullable, max 2000 chars | Additional context |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

#### PayrollEntry

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `person_name` | string | Required, max 200 chars | Name of the person |
| `role` | string | Required, max 200 chars | Their role |
| `entity` | enum | One of: `nbi_analytics_uk`, `nbi_llc_us` | Which legal entity pays them |
| `monthly_cost_gbp` | decimal(10,2) | Required | Monthly cost in GBP |
| `annual_cost_gbp` | decimal(10,2) | Required | Annual cost in GBP |
| `employment_type` | enum | One of: `full_time`, `part_time`, `contractor`, `advisor` | Employment classification |
| `start_date` | date | Required | When they started |
| `end_date` | date | Nullable | When they left (null = current) |
| `notes` | text | Nullable, max 2000 chars | Additional context |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

#### FinancialTarget

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `metric` | enum | One of: `monthly_revenue`, `annual_revenue`, `monthly_payroll`, `annual_payroll` | What the target measures |
| `target_amount_gbp` | decimal(12,2) | Required | Target value |
| `period_start` | date | Required | Start of the target period |
| `period_end` | date | Required | End of the target period |
| `created_at` | timestamp | Auto-set | Record creation time |

#### CashFlowEntry

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `month` | date | Required (first of month) | The month this entry covers |
| `projected_income_gbp` | decimal(12,2) | Required | Expected income |
| `projected_expenses_gbp` | decimal(12,2) | Required | Expected expenses |
| `actual_income_gbp` | decimal(12,2) | Nullable | Actual income (filled in when known) |
| `actual_expenses_gbp` | decimal(12,2) | Nullable | Actual expenses |
| `notes` | text | Nullable | Context |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

#### TransitionScenario

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `name` | string | Required, max 200 chars | Scenario name (e.g. "Current", "Partial NSI Transition", "Full NSI Transition") |
| `description` | text | Nullable, max 2000 chars | What this scenario assumes |
| `monthly_revenue_gbp` | decimal(12,2) | Required | Monthly revenue under this scenario |
| `monthly_costs_gbp` | decimal(12,2) | Required | Monthly costs under this scenario |
| `monthly_net_gbp` | decimal(12,2) | Required | Net monthly position |
| `assumptions` | text | Nullable, max 5000 chars | Key assumptions (markdown) |
| `is_current` | boolean | Default false | Whether this is the current real scenario |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

### 8.2 Finance Screen

**Route:** `/finance`

**Layout:** Dashboard with multiple panels.

**Time range selector (top right):** Select for "Current Month", "Last 3 Months", "Year to Date", "Last 12 Months", "Custom Range" (date pickers appear for custom).

### 8.3 Revenue Dashboard Panel

**Heading:** "Revenue"

**Revenue vs Target chart:**
- Type: Bar chart with target line overlay
- X-axis: Months
- Y-axis: GBP
- Bars: Actual revenue (electric blue for confirmed/received, light blue for invoiced, dotted outline for projected)
- Line: Target revenue (amber dashed line)

**Revenue summary table:**

| Column | Content |
|---|---|
| Source | Client or product name |
| Type | Badge: Contracted, Recurring, One-off, Pipeline |
| Amount (GBP) | Formatted currency |
| Period | Start - End dates |
| Status | Badge: Confirmed, Invoiced, Received, Projected |
| Actions | Edit, Delete (Board only) |

**Total row at bottom:** Sum of all amounts by status.

**Add Revenue button:** Opens a form dialog with all RevenueEntry fields.

**Empty state:** "No revenue entries recorded. Add revenue data to track against targets."

### 8.4 Payroll Summary Panel

**Heading:** "Payroll"

**Payroll table:**

| Column | Content |
|---|---|
| Name | Person name |
| Role | Their role |
| Entity | "UK" or "US" badge |
| Type | Employment type badge |
| Monthly (GBP) | Formatted currency |
| Annual (GBP) | Formatted currency |
| Status | "Active" (green) or "Ended [date]" (grey) |
| Actions | Edit, End Employment (sets end_date, Board only) |

**Totals row:** Sum of monthly and annual costs for active staff, broken down by entity.

**Add Payroll Entry button:** Board only. Opens form dialog with all PayrollEntry fields.

**Empty state:** "No payroll data. Add team members to track costs."

### 8.5 Cash Flow Projection Panel

**Heading:** "Cash Flow (3-Month Rolling)"

**Chart:**
- Type: Grouped bar chart
- X-axis: Next 3 months
- Two bars per month: Projected Income (green), Projected Expenses (red)
- Overlaid line: Net position (income minus expenses). Green if positive, red if negative

**Table below chart:**

| Column | Content |
|---|---|
| Month | Month name and year |
| Projected Income | GBP |
| Projected Expenses | GBP |
| Net | GBP, colour-coded (green positive, red negative) |
| Actual Income | GBP or "Pending" |
| Actual Expenses | GBP or "Pending" |
| Actual Net | GBP or "Pending" |

**Edit:** Each row is editable inline (Board only). Click the value, type the new amount, press Enter to save.

### 8.6 NSI Transition Scenarios Panel

**Heading:** "Transition Scenarios"

**Content:** A set of scenario cards (one per TransitionScenario record), displayed in a horizontal row.

**Each scenario card:**

| Element | Content |
|---|---|
| Name | Scenario name. The current scenario has a green "Current" badge |
| Monthly Revenue | GBP |
| Monthly Costs | GBP |
| Monthly Net | GBP, colour-coded |
| Annual Net | Monthly Net * 12 |
| Assumptions | Truncated to 200 chars, "Show More" toggle |

**Actions:**
- "Add Scenario" button: Opens form dialog with all TransitionScenario fields. Board only
- "Edit" on each card: Board only
- "Set as Current": Marks this scenario as `is_current` and un-marks the previous one. Board only

**Empty state:** "No transition scenarios defined. Add scenarios to model different business outcomes."

### 8.7 Pipeline Revenue Panel

**Heading:** "Pipeline Revenue Forecast"

**Content:** Aggregated from the Leads & Clients data (Section 9). Shows all leads with a probability-weighted revenue figure.

| Column | Content |
|---|---|
| Lead / Company | Company name, clickable to lead detail |
| Stage | BD pipeline stage |
| Potential Value (GBP) | Unweighted deal value |
| Probability | Percentage based on stage (see Section 9) |
| Weighted Value (GBP) | Potential * Probability |

**Total row:** Sum of weighted values.

**This panel is read-only.** Data is managed in the Leads & Clients tab.

### 8.8 AI Agent Costs Panel

**Heading:** "AI Agent Costs"

**Time range:** Inherits from the page-level time range selector.

**Summary stats:**

| Stat | Value |
|---|---|
| Total Agent Spend | Sum of all AgentExecution costs in the period |
| Average Daily Spend | Total / number of days in period |
| Most Expensive Agent | Agent name with highest total cost |
| Total Executions | Count |

**Agent cost table:**

| Column | Content |
|---|---|
| Agent | Role name, clickable to role detail |
| Model | Tier badge |
| Executions | Count in period |
| Input Tokens | Formatted number |
| Output Tokens | Formatted number |
| Total Cost (USD) | Formatted currency |
| Budget Cap | Monthly cap or "No cap" |
| Budget Used (%) | Progress bar if cap set |

Sort by total cost descending.

---

## Section 9: Leads and Clients Tab

### 9.1 Data Objects

#### Client

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `company_name` | string | Required, unique, 2-200 chars | Company name |
| `industry` | string | Nullable, max 100 chars | Industry (e.g. "Gaming", "Technology") |
| `website` | string | Nullable, valid URL | Company website |
| `health` | enum | One of: `green`, `amber`, `red` | Current relationship health |
| `engagement_type` | enum | One of: `retainer`, `project`, `advisory`, `dormant` | Type of engagement |
| `glen_role` | string | Nullable, max 200 chars | Glen's specific role with this client (e.g. "Fractional CPO") |
| `contract_value_gbp` | decimal(12,2) | Nullable | Total contract value |
| `contract_start` | date | Nullable | Contract start date |
| `contract_end` | date | Nullable | Contract end date |
| `next_milestone` | string | Nullable, max 500 chars | Next key milestone or deliverable |
| `next_milestone_date` | date | Nullable | When the next milestone is due |
| `notes` | text | Nullable, max 5000 chars | Internal notes |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

#### Contact

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `client_id` | UUID | Nullable, foreign key to Client | Associated client |
| `lead_id` | UUID | Nullable, foreign key to Lead | Associated lead |
| `first_name` | string | Required, 1-100 chars | First name |
| `last_name` | string | Required, 1-100 chars | Last name |
| `email` | string | Nullable, valid email | Email address |
| `phone` | string | Nullable, max 30 chars | Phone number |
| `title` | string | Nullable, max 200 chars | Job title |
| `is_primary` | boolean | Default false | Whether this is the primary contact |
| `notes` | text | Nullable, max 2000 chars | Notes about this person |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

#### Lead

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `company_name` | string | Required, 2-200 chars | Company name |
| `stage` | enum | One of: `identification`, `qualification`, `outreach`, `discovery`, `proposal`, `negotiation`, `closed_won`, `closed_lost` | Pipeline stage |
| `source` | string | Nullable, max 200 chars | Where this lead came from (e.g. "LinkedIn", "Jen MacLean referral", "Website") |
| `potential_value_gbp` | decimal(12,2) | Nullable | Estimated deal value |
| `probability` | integer | 0-100, auto-set based on stage | Win probability percentage |
| `owner` | string | Required, max 200 chars | Who owns this lead (e.g. "Glen", "CMO Agent") |
| `last_contact_date` | date | Nullable | Date of last interaction |
| `next_action` | string | Nullable, max 500 chars | Next step to take |
| `next_action_date` | date | Nullable | When the next action is due |
| `notes` | text | Nullable, max 5000 chars | Internal notes |
| `converted_to_client_id` | UUID | Nullable, foreign key to Client | Set when stage moves to `closed_won` |
| `lost_reason` | string | Nullable, max 500 chars | Reason for loss (set when `closed_lost`) |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

**Stage probability mapping (auto-set when stage changes):**

| Stage | Probability |
|---|---|
| Identification | 5% |
| Qualification | 15% |
| Outreach | 25% |
| Discovery | 40% |
| Proposal | 60% |
| Negotiation | 80% |
| Closed Won | 100% |
| Closed Lost | 0% |

### 9.2 Leads & Clients Screen

**Route:** `/leads-clients`

**Layout:** Two tabs: "BD Pipeline" (default) and "Active Clients".

### 9.3 BD Pipeline Tab

**View toggle:** "Kanban" (default) and "List"

**Kanban view:**

Columns for each stage (left to right): Identification, Qualification, Outreach, Discovery, Proposal, Negotiation, Closed Won, Closed Lost.

Each column header shows the count of leads and the total potential value.

**Each lead card:**

| Element | Content |
|---|---|
| Company name | Bold, clickable to lead detail |
| Potential value | GBP formatted, or "Not estimated" |
| Owner | Name |
| Last contact | Relative timestamp or "Never" |
| Next action | Text, truncated to 50 chars. Red text if next_action_date is past |
| Primary contact | Name if available |

Cards are draggable between columns (Board and Admin only). Moving to "Closed Won" triggers a dialog: "Convert to Client? This will create a new client record for [Company Name]." with "Convert" (primary) and "Keep as Lead" buttons. Moving to "Closed Lost" opens a required comment dialog: "Why was this lead lost?" (min 10 chars, saved as `lost_reason`).

**List view:**

| Column | Sortable | Filterable |
|---|---|---|
| Company | Yes | No |
| Stage | Yes | Yes (multi-select) |
| Value (GBP) | Yes | No |
| Probability | Yes | No |
| Weighted Value | Yes | No |
| Owner | Yes | Yes |
| Last Contact | Yes | No |
| Next Action Date | Yes | No |
| Next Action | No | No |

**Add Lead button:** Board and Admin only. Opens form dialog:

| Field | Type | Details |
|---|---|---|
| Company Name | Text input | Required. 2-200 chars |
| Stage | Select | Default: Identification |
| Source | Text input | Optional |
| Potential Value (GBP) | Number input | Optional |
| Owner | Text input | Required. Default: "Glen" |
| Notes | Textarea | Optional |

On creation, a primary contact can optionally be added (first name, last name, email, title).

**Overdue follow-ups banner:**
If any leads have `next_action_date` in the past, a banner appears at the top: "[N] leads have overdue follow-ups" with a "View Overdue" link that filters the list to only overdue items.

**Empty state:** "No leads in the pipeline. Add your first lead to start tracking business development."

### 9.4 Lead Detail Screen

**Route:** `/leads-clients/leads/:leadId`

**Header:**

| Element | Content |
|---|---|
| Back link | "< Pipeline" |
| Company name | Large heading |
| Stage badge | Current stage with colour coding |
| Actions | "Edit", "Convert to Client" (if not closed), "Mark Lost" |

**Left panel (65%):**

**Activity timeline:**
- Chronological list of all changes to this lead
- Each entry: timestamp, what changed (e.g. "Stage changed from Outreach to Discovery"), who changed it
- Add note: textarea + "Add Note" button for manual entries

**Right panel (35%):**

| Field | Value |
|---|---|
| Stage | With dropdown to change |
| Source | Text |
| Potential Value | GBP |
| Weighted Value | Computed |
| Probability | Percentage |
| Owner | Text |
| Last Contact | Date + "Update" button (sets to today) |
| Next Action | Text, editable |
| Next Action Date | Date picker |
| Created | Timestamp |

**Contacts section (below right panel):**
- List of all contacts associated with this lead
- Each contact: name, title, email (clickable mailto), phone
- Primary contact marked with a star
- "+ Add Contact" button

### 9.5 Active Clients Tab

**Content:** A table of all clients.

| Column | Sortable | Filterable |
|---|---|---|
| Company | Yes | No |
| Health | Yes | Yes (Green, Amber, Red) |
| Engagement | Yes | Yes (Retainer, Project, Advisory, Dormant) |
| Glen's Role | No | No |
| Contract Value | Yes | No |
| Contract End | Yes | No |
| Next Milestone | No | No |
| Milestone Date | Yes | No |

**Health indicators:** Green dot (healthy), Amber dot (needs attention), Red dot (at risk).

Clicking a client row opens the Client Detail screen.

**Add Client button:** Board and Admin only. Opens form dialog with all Client fields.

**Empty state:** "No active clients. Convert a lead or add a client manually."

### 9.6 Client Detail Screen

**Route:** `/leads-clients/clients/:clientId`

**Header:**

| Element | Content |
|---|---|
| Back link | "< Clients" |
| Health dot | Coloured indicator |
| Company name | Large heading |
| Engagement badge | Current engagement type |
| Actions | "Edit", "Change Health" (dropdown with comment) |

**Left panel (65%):**

**Engagement summary:**
- Contract value, start/end dates
- Glen's role
- Next milestone and date

**Activity timeline:**
- Manual entries (notes, meeting summaries, deliverable tracking)
- Add note textarea + button

**Right panel (35%):**

All client fields displayed, editable via "Edit" button.

**Contacts section:**
- Same as Lead contacts
- "+ Add Contact" button

---

## Section 10: Approvals Workflow

### 10.1 Data Objects

#### ApprovalItem

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary key | Unique identifier |
| `category` | enum | One of: `external_email`, `client_deliverable`, `financial`, `strategic`, `publishing`, `other` | What kind of approval |
| `title` | string | Required, 5-500 chars | Summary of what needs approval |
| `description` | text | Required, max 20000 chars | Full context (markdown) |
| `content` | text | Nullable, max 50000 chars | The actual content being approved (e.g. full email draft, document text) |
| `requesting_agent_id` | UUID | Foreign key to Agent | Agent that created the request |
| `task_id` | UUID | Nullable, foreign key to Task | Associated task |
| `status` | enum | One of: `pending`, `approved`, `changes_requested`, `rejected` | Current approval status |
| `decided_by_user_id` | UUID | Nullable, foreign key to User | Who made the decision |
| `decided_at` | timestamp | Nullable | When the decision was made |
| `decision_comment` | text | Nullable, max 5000 chars | Comment from the reviewer |
| `metadata` | jsonb | Nullable | Additional structured data (e.g. {"recipient": "john@lighthouse.com", "subject": "Q1 Report"} for emails) |
| `created_at` | timestamp | Auto-set | Record creation time |
| `updated_at` | timestamp | Auto-set | Last modification time |

### 10.2 Approvals Screen

**Route:** `/approvals`

**Access:** Board only. Other roles see a 403 page.

**Layout:**

**Tab bar:** "Pending" (default, with count badge), "Approved", "Changes Requested", "Rejected", "All"

**Pending tab content:**

A list of pending approval items sorted by `created_at` ascending (oldest first -- FIFO).

**Each approval item in the list:**

| Element | Content |
|---|---|
| Category badge | Coloured badge: External Email (blue), Client Deliverable (purple), Financial (green), Strategic (amber), Publishing (cyan), Other (grey) |
| Title | Bold text, clickable to open detail view |
| Requesting agent | Role name |
| Task link | If task_id is set: "Related task: [Title]" clickable |
| Created | Relative timestamp with absolute tooltip on hover |
| Urgency indicator | If older than 24 hours: amber "Pending 24h+" badge. If older than 48 hours: red "Pending 48h+" badge |

### 10.3 Approval Detail View

**Opens as:** A slide-over panel from the right (60% screen width) or a full-page view depending on screen size (slide-over on screens >= 1280px, full page on smaller).

**Header:**

| Element | Content |
|---|---|
| Category badge | As above |
| Title | Large text |
| Status badge | Current status |
| Close button (X) | Returns to list (slide-over) or navigates back (full page) |

**Context section:**

| Element | Content |
|---|---|
| Requesting Agent | Role name, clickable to role detail |
| Related Task | Task title, clickable. "None" if not linked |
| Created | Absolute timestamp |
| Category | Full text (e.g. "External Email") |

**Content section:**

The main area displays the `content` field rendered appropriately:
- For emails: rendered in an email-preview format showing To, Subject, Body
- For documents: rendered markdown
- For financial items: structured data table
- For other: rendered markdown

The `description` field is shown above the content as context: "Why this needs approval: [description]"

**Metadata section (if present):**
A key-value table showing all metadata fields. For emails this includes: recipient, subject, CC, BCC.

**Decision section:**

| Element | Type | Details |
|---|---|---|
| Comment | Textarea | Optional for approve, required for changes requested and reject. Max 5000 chars. Placeholder: "Add a comment (required for changes or rejection)" |
| Approve button | Button | Green. Label: "Approve". Confirmation dialog: "Approve this [category]? It will be executed immediately." |
| Request Changes button | Button | Amber. Label: "Request Changes". Requires comment. Min 10 chars for comment |
| Reject button | Button | Red. Label: "Reject". Requires comment. Min 10 chars for comment. Confirmation dialog: "Reject this [category]? The requesting agent will be notified." |

**Validation:**
- Changes Requested without comment: "A comment is required when requesting changes"
- Reject without comment: "A comment is required when rejecting"
- Comment minimum: "Comment must be at least 10 characters"

**On Approve:**
1. Status set to `approved`
2. `decided_by_user_id` set to current user
3. `decided_at` set to now
4. The system triggers execution of the approved action (e.g. sends the email via the agent execution layer)
5. Activity feed entry: "[User] approved [category]: [title]"
6. Toast: "Approved. The action will be executed."

**On Request Changes:**
1. Status set to `changes_requested`
2. Comment saved as `decision_comment`
3. The requesting agent receives the feedback via a new task comment or a system notification
4. Activity feed entry: "[User] requested changes on [category]: [title]"
5. Toast: "Changes requested. The agent has been notified."
6. The agent is expected to revise and re-submit. Re-submission creates a new ApprovalItem linked to the same task

**On Reject:**
1. Status set to `rejected`
2. Comment saved as `decision_comment`
3. Activity feed entry: "[User] rejected [category]: [title]"
4. Toast: "Rejected. The agent has been notified."
5. The associated task (if any) is moved to `blocked` with a comment: "Approval rejected: [decision_comment]"

### 10.4 Approval Categories and Triggers

These map directly to the approval gates policy:

| Category | Triggered When |
|---|---|
| `external_email` | An agent drafts an email to anyone outside NBI |
| `client_deliverable` | An agent produces a report, deck, or analysis destined for a client |
| `financial` | An agent proposes a spending commitment, invoice, or budget change |
| `strategic` | An agent proposes a change to positioning, partnerships, or org structure |
| `publishing` | An agent produces content for public posting (website, social media, forums) |
| `other` | Any action the agent is uncertain about, per the policy: "If unsure, it needs approval" |

---

## Section 11: Settings

### 11.1 Route

`/settings`

### 11.2 Layout

A page with a left-side settings navigation and a right-side content area.

**Settings navigation:**

| Section | Access |
|---|---|
| Company Profile | Board, Admin (read-only for Admin) |
| Agent Library | Board, Admin (read-only for Admin) |
| Knowledge Base | All roles |
| User Management | Board only |
| Budget Management | Board only |
| API Keys | Board only |
| Model Pricing | Board only |
| Notifications | All roles (personal settings) |

### 11.3 Company Profile

**Route:** `/settings/company`

**Fields (editable by Board only, read-only for others):**

| Field | Type | Details |
|---|---|---|
| Company Name | Text input | Current company name. Required. 1-200 chars |
| Logo | File upload with preview | Current logo shown. Change by uploading new file. PNG, JPG, SVG. Max 2MB |
| Board Operator | Read-only text | Shows the board user's name and email. Cannot be changed through UI (database-level change only) |

**Save button:** "Save Changes". Board only. Disabled until changes are made.

**Validation:** Same as setup flow.

### 11.4 Agent Library

**Route:** `/settings/agents`

A read-only catalogue of all agents. Same data as the Org Chart list view, but presented as a reference library.

**Each agent card shows:**
- Role name
- Model tier badge
- Status badge
- Reports to
- Persona summary (first 200 chars)
- "View Full Details" link (opens Role Detail page)

**Actions (Board and Admin):**
- "Hire Agent" button (same dialog as Org Chart)
- Clicking an agent card navigates to the Role Detail page

### 11.5 Knowledge Base Viewer

**Route:** `/settings/knowledge`

Three sections corresponding to the three knowledge tiers.

**Tier 1 -- Company Knowledge:**
- Lists all files in `company/knowledge/`
- Each file shows: file path, last modified date (from database record), and a "View" button
- "View" opens a read-only modal showing the file contents rendered as markdown
- A character count and word count are shown at the bottom of the modal

**Tier 2 -- Role Knowledge:**
- Grouped by agent role
- Each role is a collapsible section showing its Tier 2 knowledge files
- Same view modal behaviour

**Tier 3 -- Project Knowledge:**
- Grouped by project
- Each project is a collapsible section showing its Tier 3 knowledge files
- Same view modal behaviour

All sections are read-only. Knowledge files are managed through the agent configuration (Edit Agent dialog) or directly in the repository.

**Empty state (per section):** "No knowledge files configured for this tier."

### 11.6 User Management

Covered in Section 1.5. The Settings navigation links to the same User Management screen.

### 11.7 Budget Management

**Route:** `/settings/budgets`

**Access:** Board only.

**Content:** A table of all agents with their budget settings.

| Column | Content | Editable |
|---|---|---|
| Agent | Role name | No |
| Model Tier | Badge | No |
| Monthly Cap (USD) | Number or "No cap" | Yes (inline edit) |
| Current Month Spend (USD) | Number with progress bar | No |
| % Used | Percentage | No |
| Status | "OK" (green), "Warning" (amber, >= 80%), "Capped" (red, >= 100%) | No |

**Inline edit:** Click the Monthly Cap cell, type a new value (or clear to remove cap), press Enter to save.

**Validation:**
- Cap must be 0 or greater: "Budget cap must be a positive number"
- Cap must not exceed 100,000: "Budget cap cannot exceed $100,000"

**Bulk actions:**
- "Set All Caps" button: Opens a dialog to set the same cap for all agents at once. Field: amount input. Board only

**Reset Monthly Spend:**
- "Reset All Spend Counters" button: Resets `current_month_spend_usd` to 0 for all agents. Board only. Confirmation dialog: "Reset all monthly spend counters to zero? This is normally done automatically on the 1st of each month." Buttons: "Cancel", "Reset" (red)

### 11.8 API Keys

**Route:** `/settings/api-keys`

**Access:** Board only.

**Content:**

| Element | Type | Details |
|---|---|---|
| Anthropic API Key | Masked input | Shows "sk-ant-...XXXX" (last 4 chars visible). "Update" button to enter a new key. "Test" button to verify the key works (makes a lightweight API call and reports success or failure) |

**Update API Key dialog:**
- Field: API Key (password input). Must start with "sk-ant-" and be 40-200 chars
- Buttons: "Cancel", "Save Key"
- On save: key is encrypted (AES-256) and stored. The old key is overwritten. Toast: "API key updated."

**Test API Key:**
- On click: makes a minimal API call (e.g. a short completion with haiku)
- Success: green toast "API key is valid and working"
- Failure: red toast "API key test failed: [error message]"

**Additional integrations (future-proofed):**
A section labelled "Other Integrations" with an empty state: "No additional integrations configured." This section is reserved for future API keys (e.g. QuickBooks, Slack, email providers). Each future integration would follow the same pattern: masked display, update dialog, test button.

### 11.9 Model Pricing

**Route:** `/settings/pricing`

**Access:** Board only.

**Content:** A table of model pricing rates.

| Column | Content | Editable |
|---|---|---|
| Model | Model identifier | No |
| Input (per 1M tokens) | USD amount | Yes (inline edit) |
| Output (per 1M tokens) | USD amount | Yes (inline edit) |
| Effective From | Date | No (auto-set to today on edit) |

**Add Model button:** Opens a dialog to add a new model pricing entry.

| Field | Type | Details |
|---|---|---|
| Model Identifier | Text input | Required. e.g. "claude-opus-4" |
| Input Cost (per 1M tokens) | Number input | Required. Min 0. Max 1000. 4 decimal places |
| Output Cost (per 1M tokens) | Number input | Required. Min 0. Max 1000. 4 decimal places |

**Validation:**
- Model identifier must be unique: "Pricing for this model already exists"
- Costs must be non-negative: "Cost must be zero or greater"

Editing an existing model's pricing creates a new row with the current date as `effective_from`. Historical pricing is preserved for accurate cost calculations on past executions.

### 11.10 Notifications

**Route:** `/settings/notifications`

**Access:** All authenticated users (personal settings).

**Content:**

| Setting | Type | Default | Description |
|---|---|---|---|
| Approval requests | Toggle | On (Board only; hidden for others) | Notify when a new approval is created |
| Task assignments | Toggle | On | Notify when a task is assigned in your scope |
| Agent alerts (budget, errors) | Toggle | On | Notify on agent budget warnings and execution errors |
| Daily summary | Toggle | Off | Receive a daily summary notification at 09:00 |

**Notification delivery:** In-app only (notification bell in top bar). No email notifications in v1.

**Notification item format:**

| Field | Content |
|---|---|
| Icon | Depends on type: ShieldCheck (approval), CheckSquare (task), AlertTriangle (agent alert), BarChart (summary) |
| Title | Short description (e.g. "New approval request") |
| Body | Detail (e.g. "CEO requested approval for email to John Smith") |
| Timestamp | Relative |
| Read/Unread | Blue dot for unread. Click to mark as read |
| Link | Clicking the notification navigates to the relevant screen |

**Notification bell:**
- Badge shows count of unread notifications
- Click opens a dropdown showing the 10 most recent notifications
- "Mark All as Read" link at the top
- "View All" link at the bottom navigates to a full notifications page (`/notifications`) showing all notifications with pagination (25 per page)

---

## Section 12: Global Search

### 12.1 Trigger

`Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux), or clicking the search input in the top bar.

### 12.2 Behaviour

Opens a centred modal overlay with a large search input at the top.

**Search scope:** Searches across all entities the user has access to.

**Results are grouped by type:**

| Group | Searches | Display |
|---|---|---|
| Agents | `role_name` | Role name + status badge |
| Projects | `name`, `description` | Project name + health dot |
| Tasks | `title`, `description` | Task title + status badge + project name |
| Leads | `company_name` | Company name + stage badge |
| Clients | `company_name` | Company name + health dot |
| Approvals | `title` | Title + category badge (Board only) |

**Result limit:** 5 per group, with a "View all [N] results" link per group.

**Keyboard navigation:**
- Arrow up/down to navigate results
- Enter to open the selected result
- Escape to close the search modal
- Type to search (debounced, 300ms delay before search fires)

**Empty state (no query):** Shows recent items: "Recent" section with the last 5 items the user viewed.

**Empty state (no results):** "No results for '[query]'. Try a different search term."

**Loading state:** Skeleton rows in each group while searching.

---

## Section 13: Real-Time Updates

### 13.1 Implementation

The app uses WebSocket connections to receive real-time updates from the server. The server pushes updates via PostgreSQL LISTEN/NOTIFY channels.

### 13.2 Channels

| Channel | Payload | Triggers UI Update On |
|---|---|---|
| `agent_status` | `{ agent_id, old_status, new_status }` | Org Chart nodes, Agent Status widget, Role Detail page |
| `task_update` | `{ task_id, field, old_value, new_value, agent_id }` | Task detail, Project board, Command Centre stats, Activity Feed |
| `approval_created` | `{ approval_id, category, title, agent_id }` | Approvals queue widget, notification bell, Approvals page |
| `approval_decided` | `{ approval_id, status, user_id }` | Approvals page, Activity Feed |
| `execution_started` | `{ execution_id, agent_id, task_id }` | Role Detail execution log, Agent Status widget |
| `execution_completed` | `{ execution_id, agent_id, cost_usd, duration_seconds }` | Role Detail execution log, Agent Status widget, Finance agent costs |
| `heartbeat` | `{ agent_id, status }` | Org Chart pulsing dot, Agent Status widget |

### 13.3 Reconnection

If the WebSocket connection drops:
1. A subtle amber banner appears at the top of the screen: "Connection lost. Reconnecting..."
2. The client attempts to reconnect with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
3. On reconnection: banner turns green "Reconnected" for 3 seconds, then disappears. Client fetches any missed updates since the disconnect timestamp
4. If reconnection fails after 2 minutes: banner turns red "Connection lost. Please refresh the page." with a "Refresh" button

---

## Section 14: Responsive Behaviour

### 14.1 Breakpoints

| Breakpoint | Width | Behaviour |
|---|---|---|
| Desktop | >= 1280px | Full layout with sidebar, all widgets side by side |
| Tablet | 768px - 1279px | Sidebar collapsed to icon-only by default. Widgets stack to 2 columns |
| Mobile | < 768px | Sidebar hidden (hamburger menu in top bar). All widgets single column. Kanban boards scroll horizontally |

### 14.2 Touch Support

- All drag-and-drop interactions (Kanban cards, pipeline cards) also work with touch (long press to pick up, drag, release to drop)
- All hover states have equivalent tap/click interactions on touch devices
- Minimum tap target size: 44x44px

---

## Section 15: Error Handling

### 15.1 API Error Responses

All API errors return a consistent JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "email",
        "message": "A user with this email already exists"
      }
    ]
  }
}
```

### 15.2 Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request data failed validation |
| `AUTHENTICATION_REQUIRED` | 401 | No valid access token |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Action conflicts with current state (e.g. task already checked out) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### 15.3 Client-Side Error Handling

| Scenario | UI Behaviour |
|---|---|
| 401 on any API call | Clear access token, attempt refresh. If refresh fails, redirect to `/login` |
| 403 on any API call | Show inline error: "You do not have permission to perform this action" |
| 404 on page load | Show 404 page |
| 409 conflict | Show inline error with the conflict reason (e.g. "This task is currently checked out by CEO") |
| 429 rate limit | Show toast: "Too many requests. Please wait a moment." |
| 500 server error | Show toast: "Something went wrong. Please try again." with Retry button where applicable |
| Network error (no connection) | Show amber banner: "You appear to be offline. Changes will not be saved." |

---

## Appendix A: Data Object Relationships

```
User --(1:many)--> Session
User --(1:1)--> Company.board_user_id

Agent --(many:1)--> Agent (reports_to)
Agent --(1:many)--> Task (assigned_agent)
Agent --(1:many)--> AgentExecution
Agent --(1:many)--> AgentHeartbeat
Agent --(1:many)--> ApprovalItem (requesting_agent)

Project --(1:many)--> Task
Project --(many:1)--> Agent (lead_agent)

Task --(many:1)--> Project
Task --(many:1)--> Agent (assigned_agent)
Task --(many:1)--> Agent (checkout_agent)
Task --(many:1)--> Task (parent_task)
Task --(1:many)--> TaskComment
Task --(many:many)--> Task (via TaskRelation)
Task --(1:many)--> ApprovalItem

Client --(1:many)--> Contact
Lead --(1:many)--> Contact
Lead --(0:1)--> Client (converted_to_client)

RevenueEntry --(many:1)--> Client
```

## Appendix B: Full Route Map

| Route | Page | Access |
|---|---|---|
| `/setup` | First-time setup wizard | Unauthenticated, only if no Company exists |
| `/login` | Login | Unauthenticated |
| `/` | Command Centre | All authenticated |
| `/org-chart` | Org Chart | All authenticated |
| `/org-chart/:agentId` | Role Detail | All authenticated |
| `/projects` | Projects List | All authenticated |
| `/projects/:id` | Project Detail | All authenticated |
| `/tasks` | Tasks List | All authenticated |
| `/tasks/:taskId` | Task Detail | All authenticated |
| `/approvals` | Approvals | Board only |
| `/finance` | Finance | All authenticated |
| `/leads-clients` | Leads & Clients | All authenticated |
| `/leads-clients/leads/:leadId` | Lead Detail | All authenticated |
| `/leads-clients/clients/:clientId` | Client Detail | All authenticated |
| `/settings` | Settings (redirects to first accessible section) | All authenticated |
| `/settings/company` | Company Profile | All authenticated (edit: Board only) |
| `/settings/agents` | Agent Library | All authenticated |
| `/settings/knowledge` | Knowledge Base | All authenticated |
| `/settings/users` | User Management | Board only |
| `/settings/budgets` | Budget Management | Board only |
| `/settings/api-keys` | API Keys | Board only |
| `/settings/pricing` | Model Pricing | Board only |
| `/settings/notifications` | Notification Preferences | All authenticated |
| `/notifications` | All Notifications | All authenticated |

---

## Appendix C: Acceptance Criteria Checklist

This checklist is for the VP Product PM review gate. Every item must be true before the spec is considered complete.

- [x] Every screen has a defined route
- [x] Every screen lists all visible elements
- [x] Every user action (click, hover, submit, drag, filter, sort) is specified
- [x] Every data object has all fields with types and constraints
- [x] Every state (empty, loading, error, populated) is defined
- [x] All validation rules are listed with exact error messages
- [x] All relationships between entities are documented
- [x] All user role permissions are defined for every action
- [x] Status transitions have defined rules and conditions
- [x] The approval workflow maps to the existing approval gates policy
- [x] Real-time update channels are defined
- [x] Error handling is consistent and complete
- [x] No TBDs, no placeholders, no "to be determined"
- [x] British English used throughout
- [x] A senior engineer could implement any feature without asking a clarifying question

---

**End of Feature Specification**

**Submitted to:** CEO for review
**Next step:** CEO reviews and flags gaps before passing to CTO (architecture) and UI/UX Lead (design)
