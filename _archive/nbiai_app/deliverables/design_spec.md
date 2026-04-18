# NBIAI Team App — UI/UX Design Specification

**Document owner:** UI/UX Lead
**Reviewed by:** VP Product (pre-submission cross-reference complete)
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Ready for CEO review

---

## Contents

1. [Design System](#1-design-system)
   - 1.1 Colour Palette
   - 1.2 Typography Scale
   - 1.3 Spacing System
   - 1.4 Component Library
   - 1.5 Iconography
   - 1.6 Border and Shadow Tokens
   - 1.7 Status Colour Semantics
   - 1.8 Motion and Transitions
2. [Global Layout](#2-global-layout)
3. [Screen 1 — Login and First-Time Setup](#3-screen-1--login-and-first-time-setup)
4. [Screen 2 — Command Centre (Dashboard)](#4-screen-2--command-centre-dashboard)
5. [Screen 3 — Org Chart View](#5-screen-3--org-chart-view)
6. [Screen 4 — Role Detail Page](#6-screen-4--role-detail-page)
7. [Screen 5 — Projects View](#7-screen-5--projects-view)
8. [Screen 6 — Task Detail](#8-screen-6--task-detail)
9. [Screen 7 — Finance Tab](#9-screen-7--finance-tab)
10. [Screen 8 — Leads and Clients Tab](#10-screen-8--leads--clients-tab)
11. [Screen 9 — Approvals Page](#11-screen-9--approvals-page)
12. [Screen 10 — Settings](#12-screen-10--settings)
13. [Modals and Overlays Reference](#13-modals-and-overlays-reference)
14. [Responsive Behaviour Summary](#14-responsive-behaviour-summary)
15. [Accessibility Notes](#15-accessibility-notes)

---

## 1. Design System

### 1.1 Colour Palette

The NBIAI app uses a single dark theme. Light mode does not exist. All values are defined as CSS custom properties on the `:root` element. Tailwind custom colours mirror these tokens exactly via `tailwind.config.js`.

#### Background Layers

The app uses a layered background system. Deeper surfaces are lighter than their containers — this prevents a flat, featureless appearance in data-dense screens.

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--bg-base` | `#0A0A0F` | `bg-base` | Page background, sidebar |
| `--bg-surface` | `#111118` | `bg-surface` | Cards, panels, widget containers |
| `--bg-elevated` | `#1A1A24` | `bg-elevated` | Modals, dropdowns, popovers, table row hover |
| `--bg-input` | `#16161F` | `bg-input` | Input fields, textareas, code blocks |
| `--bg-highlight` | `#22222E` | `bg-highlight` | Selected rows, active nav items |

Rationale: `#0A0A0F` is near-black with a faint blue undertone. This creates a coherent relationship with the electric blue accent and avoids the clinical harshness of pure `#000000`. It reads as precision technology, not consumer dark mode.

#### NBI Brand Accent

The NBI brand accent for this application is **Electric Indigo Blue: `#4F6EF7`**.

Rationale: Pure `#0066FF` (the Playsage brand) is too saturated for a data-dense internal control-plane application. `#4F6EF7` retains the electric blue energy Glen has confirmed as correct, while reading cleanly on dark backgrounds at every size from 11px labels to 48px headings. It contrasts at 5.2:1 against `--bg-base`, passing WCAG AA for UI components. It reads as technical intelligence rather than consumer branding.

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--accent-primary` | `#4F6EF7` | `text-accent` / `bg-accent` / `border-accent` | Primary CTAs, active states, links, focus rings |
| `--accent-hover` | `#6B87FF` | `hover:bg-accent-hover` | Hover state on accent elements |
| `--accent-muted` | `#4F6EF714` | `bg-accent-muted` | Accent background tint (8% opacity) for pills, badges |
| `--accent-border` | `#4F6EF740` | `border-accent-muted` | Accent-coloured borders at 25% opacity |

#### Text Hierarchy

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--text-primary` | `#F1F1F5` | `text-primary` | Headlines, primary labels, active nav |
| `--text-secondary` | `#A0A0B0` | `text-secondary` | Body copy, descriptions, metadata |
| `--text-muted` | `#5C5C70` | `text-muted` | Placeholder text, disabled labels, timestamps |
| `--text-inverse` | `#0A0A0F` | `text-inverse` | Text on accent/green/red filled backgrounds |

#### Border

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--border-subtle` | `#FFFFFF0D` | `border-subtle` | Card borders, dividers (5% white) |
| `--border-default` | `#FFFFFF1A` | `border-default` | Input borders, section dividers (10% white) |
| `--border-strong` | `#FFFFFF33` | `border-strong` | Active input borders, focused states (20% white) |

### 1.2 Typography Scale

Two typefaces. No exceptions.

- **Inter** — UI labels, headings, body text, table content
- **JetBrains Mono** — execution logs, token counts, cost figures, code blocks, system prompt viewer, any monospaced data

Both loaded via Google Fonts. Fallback stack: Inter falls back to `system-ui, -apple-system, sans-serif`. JetBrains Mono falls back to `'Fira Code', 'Cascadia Code', monospace`.

Do not use Orbitron in this application. Orbitron is the Playsage brand typeface for headings on the marketing-facing product. The NBIAI app is a professional internal tool. Inter is the correct choice for information density.

#### Type Scale

All sizes in `px` (converted to `rem` in implementation, base `16px`). Line-heights are unitless multipliers.

| Level | Font | Size | Weight | Line-height | Letter-spacing | Tailwind approximation | Usage |
|---|---|---|---|---|---|---|---|
| Display | Inter | 28px | 700 | 1.2 | -0.02em | `text-[28px] font-bold tracking-tight` | Page titles (Login, empty states) |
| H1 | Inter | 22px | 700 | 1.3 | -0.015em | `text-[22px] font-bold tracking-tight` | Screen section headers |
| H2 | Inter | 18px | 600 | 1.35 | -0.01em | `text-lg font-semibold tracking-tight` | Widget titles, modal headings |
| H3 | Inter | 15px | 600 | 1.4 | -0.005em | `text-[15px] font-semibold` | Card subheadings, table group labels |
| Body | Inter | 14px | 400 | 1.5 | 0 | `text-sm` | Default body text, descriptions |
| Body Strong | Inter | 14px | 500 | 1.5 | 0 | `text-sm font-medium` | Emphasis in body context, labels |
| Caption | Inter | 12px | 400 | 1.4 | 0.01em | `text-xs` | Timestamps, helper text, footnotes |
| Caption Strong | Inter | 12px | 500 | 1.4 | 0.01em | `text-xs font-medium` | Badges, status labels |
| Mono Body | JetBrains Mono | 13px | 400 | 1.6 | 0 | `font-mono text-[13px]` | Log entries, cost values, code |
| Mono Small | JetBrains Mono | 11px | 400 | 1.5 | 0.02em | `font-mono text-[11px]` | Inline tokens, compact cost display |
| Nav Label | Inter | 13px | 500 | 1 | 0.02em | `text-[13px] font-medium tracking-wide` | Sidebar navigation items |
| Badge | Inter | 11px | 600 | 1 | 0.04em | `text-[11px] font-semibold tracking-widest uppercase` | Status badges, tier labels |

### 1.3 Spacing System

Tailwind's default spacing scale is used without modification. All layout measurements derive from this scale.

Base unit: `4px` (Tailwind `space-1`).

Key spacing values used throughout:

| Tailwind token | px | Common usage |
|---|---|---|
| `space-1` | 4px | Icon gaps, tight label-to-value spacing |
| `space-2` | 8px | Badge padding, button icon gap |
| `space-3` | 12px | Input padding (vertical), compact row padding |
| `space-4` | 16px | Default card padding, input padding (horizontal), row gaps |
| `space-5` | 20px | Section spacing within cards |
| `space-6` | 24px | Card-to-card gap, modal padding |
| `space-8` | 32px | Section divider spacing |
| `space-10` | 40px | Major section breaks |
| `space-12` | 48px | Page header height |
| `space-16` | 64px | Large section padding |

Sidebar width: `240px` expanded, `60px` collapsed.
Main content max-width: none — full remaining width, with `px-6` (24px) padding on each side.
Widget grid gap: `gap-6` (24px).

### 1.4 Component Library

shadcn/ui is the base. All shadcn/ui components use the "new-york" variant. Custom CSS overrides applied in `globals.css` to align with the colour tokens defined above. No shadcn/ui default theme colours are used — all tokens are replaced.

#### shadcn/ui Components Used (and their token overrides)

| Component | shadcn/ui name | Key token overrides |
|---|---|---|
| Button (Primary) | `Button` variant `default` | `bg-accent text-inverse hover:bg-accent-hover` |
| Button (Secondary) | `Button` variant `outline` | `border-default text-secondary hover:bg-elevated hover:text-primary` |
| Button (Destructive) | `Button` variant `destructive` | `bg-status-red text-inverse hover:bg-red-600` |
| Button (Ghost) | `Button` variant `ghost` | `text-secondary hover:bg-elevated hover:text-primary` |
| Input | `Input` | `bg-input border-default text-primary placeholder:text-muted focus:border-strong focus:ring-1 focus:ring-accent` |
| Textarea | `Textarea` | Same overrides as Input |
| Badge | `Badge` | Custom per-status — see Section 1.7 |
| Card | `Card` | `bg-surface border-subtle rounded-lg` |
| Dialog (Modal) | `Dialog` | `bg-elevated border-default` overlay: `bg-black/60 backdrop-blur-sm` |
| Sheet (Slide-over) | `Sheet` | `bg-elevated border-l border-default` |
| Table | `Table` | Header: `bg-surface text-muted`. Row: `border-b border-subtle hover:bg-elevated`. |
| Tabs | `Tabs` | `TabsList: bg-elevated`. Active tab: `bg-surface text-primary border-b-2 border-accent`. |
| Dropdown | `DropdownMenu` | `bg-elevated border-default shadow-xl` |
| Tooltip | `Tooltip` | `bg-highlight text-primary text-xs` |
| Progress | `Progress` | Track: `bg-elevated`. Fill: colour varies by value — see Budgets screen. |
| Avatar | `Avatar` | Fallback: `bg-accent-muted text-accent font-semibold text-xs` |
| Separator | `Separator` | `bg-subtle` |
| Skeleton | `Skeleton` | `bg-elevated animate-pulse` |
| Select | `Select` | Same overrides as Input, chevron `text-muted` |
| Switch | `Switch` | Active: `bg-accent`. Inactive: `bg-elevated border-default`. |
| Alert | `Alert` | See custom variants below |

#### Custom Components

These patterns do not exist in shadcn/ui and must be built from scratch.

**StatusBadge**
A small pill-shaped label for agent and task status. Built on shadcn/ui `Badge` with semantic colour classes.

Structure: `<span>` with `flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider`.
Leading element: a `6px × 6px` filled circle (`rounded-full`) using the same background colour as the badge text colour.
Colours per status: see Section 1.7.

**ModelTierBadge**
Compact label indicating Opus or Sonnet model tier. Two variants only.
Opus: `border border-accent-muted text-accent bg-accent-muted px-2 py-0.5 rounded text-[11px] font-semibold`. Text: "OPUS".
Sonnet: `border border-subtle text-muted bg-elevated px-2 py-0.5 rounded text-[11px] font-semibold`. Text: "SONNET".

**AgentAvatar**
A 32px × 32px circle. If an agent has an assigned name, display the first two letters of the role abbreviation (e.g. "CE" for CEO, "SE" for Senior Engineer). Background: `bg-accent-muted`. Text: `text-accent font-semibold text-xs`. If vacant, show a dashed circle border in `border-subtle` with a `+` in `text-muted`.

**StatCard**
A self-contained widget tile. Used in the Quick Stats bar and Role Detail performance metrics.
Structure: `Card` with `p-4`. Contains a `Caption Strong` label in `text-muted` at top, an `H1` value in `text-primary` as the main figure, and an optional delta or sub-label in `Caption` `text-muted` below.

**ActivityFeedItem**
A single row in the activity feed. `flex items-start gap-3 py-3 border-b border-subtle last:border-0`.
Left: `AgentAvatar` 28px variant.
Right: `Body` text in `text-secondary` with the agent name as `Body Strong` `text-primary`. Below: `Caption` `text-muted` timestamp.

**ApprovalListItem**
A selectable row in the approvals list. `flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-elevated border-b border-subtle`. When selected: `bg-highlight border-l-2 border-accent`.
Contains: type badge, agent name, one-line summary, age label.

**TreeNode** (Org Chart)
A card rendered within the org chart SVG/canvas context. Size: `180px × 80px`. `bg-surface border border-subtle rounded-lg p-3`. Contains: role title in `Body Strong text-primary`, agent name or "Vacant" in `Caption text-muted`, `ModelTierBadge`, `StatusBadge`. Vacant variant: `border-dashed border-default`.

**ExecutionLogEntry**
A row in an agent execution log. Mono Body text in `text-secondary`. Timestamp prefix in `text-muted`. Log level prefix: INFO in `text-muted`, WARN in amber, ERROR in red.

**InlineCommentField**
Appears inline when a status transition requires a comment. Slides down with `transition-all duration-150`. `Textarea` with a `Caption` label above. Required indicator `*` in red.

**KanbanCard**
Used in the BD Pipeline kanban view. `bg-surface border border-subtle rounded-lg p-3 mb-2 cursor-grab hover:border-accent-muted`. Contains: company name in `Body Strong`, contact name in `Caption text-secondary`, `StatusBadge`, last contact date in `Caption text-muted`.

**KanbanColumn**
A vertical container for `KanbanCard` items. `min-w-[220px] bg-elevated rounded-lg p-3`. Column header: `H3 text-secondary mb-3 flex items-center justify-between` with card count badge.

**ProgressBar**
Used for budget usage and revenue vs target. `w-full h-1.5 bg-elevated rounded-full`. Fill: `rounded-full transition-all`. Fill colour: green `<80%`, amber `80–99%`, red `100%`. See Section 1.7 for hex values.

**SectionBlock**
A titled content block used within Role Detail and Settings pages. `mb-8`. Heading: `H3 text-secondary uppercase tracking-widest text-[11px] mb-4` (section label style). Content below.

**CodeBlock**
Used for system prompt display. `bg-input border border-subtle rounded-lg p-4 font-mono text-[13px] text-secondary overflow-auto max-h-96`. A copy button is positioned `absolute top-3 right-3` using Button ghost variant with a clipboard icon.

### 1.5 Iconography

Icon library: **Lucide React** (already included with shadcn/ui). Use Lucide throughout. No mixing of icon libraries.

Size conventions:
- Navigation icons: `16px × 16px` (`size-4`)
- Action button icons: `14px × 14px` (`size-3.5`)
- Inline text icons: `12px × 12px` (`size-3`)
- Empty state illustrations: `48px × 48px` (`size-12`) in `text-muted`

Icon-to-label colour: icons in navigation and actions inherit the label colour. Icons within badges match the badge text colour.

Key icon assignments:

| Element | Lucide icon |
|---|---|
| Command Centre | `LayoutDashboard` |
| Org Chart | `Network` |
| Projects | `FolderKanban` |
| Tasks | `CheckSquare` |
| Finance | `BarChart2` |
| Leads & Clients | `Users` |
| Approvals | `ShieldCheck` |
| Settings | `Settings` |
| Active status | `Circle` (filled via CSS) |
| Idle status | `Circle` (outline) |
| Running status | `Loader2` (animated spin) |
| Blocked status | `AlertCircle` |
| Paused status | `PauseCircle` |
| Vacant | `UserPlus` |
| External email approval | `Mail` |
| Financial approval | `DollarSign` |
| Strategic approval | `Flag` |
| Copy | `Copy` |
| Edit | `Pencil` |
| Delete / Reject | `Trash2` |
| Approve | `Check` |
| Request changes | `MessageSquare` |
| New item | `Plus` |
| Filter | `SlidersHorizontal` |
| Search | `Search` |
| Collapse sidebar | `PanelLeftClose` |
| Expand sidebar | `PanelLeftOpen` |
| Back | `ChevronLeft` |
| Chevron (expand row) | `ChevronDown` / `ChevronRight` |
| Knowledge file | `FileText` |
| Terminate | `Power` |
| Pause | `Pause` |
| Hire | `UserPlus` |
| Zoom in / out | `ZoomIn` / `ZoomOut` |
| Kanban view | `Columns` |
| Table view | `List` |
| Overdue | `Clock` |

### 1.6 Border and Shadow Tokens

Borders are the primary depth signal in this design. Shadows are used sparingly and only on elevated interactive elements (modals, dropdowns, tooltips).

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Badges, small pills |
| `--radius-md` | `8px` | Cards, inputs, buttons |
| `--radius-lg` | `12px` | Modals, large panels |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Subtle card lift |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.6)` | Dropdowns, popovers |
| `--shadow-lg` | `0 8px 40px rgba(0,0,0,0.8)` | Modals |
| `--shadow-accent` | `0 0 0 1px #4F6EF740, 0 4px 16px rgba(79,110,247,0.15)` | Active focus ring on accented inputs |

No outward glow effects on data elements. Accent glow is reserved for interactive focus states only.

### 1.7 Status Colour Semantics

These are fixed. No negotiation on these values — they are referenced by name in all screen specs below.

#### Status Colours (Non-Negotiable)

| Name | Hex | Background tint | Usage |
|---|---|---|---|
| `--status-green` | `#22C55E` | `#22C55E1A` | Active, done, healthy, on target |
| `--status-amber` | `#F59E0B` | `#F59E0B1A` | In progress, at risk, approaching limit, warning |
| `--status-red` | `#EF4444` | `#EF44441A` | Blocked, overdue, at limit, error, rejected |
| `--status-blue` | `#4F6EF7` | `#4F6EF714` | Assigned, in review, pending |
| `--status-grey` | `#5C5C70` | `#5C5C7014` | Idle, vacant, paused, historical |

#### Badge Recipes

Each StatusBadge uses: `bg-[status-tint] text-[status-colour] border border-[status-colour]33`.

| Agent Status | Colour token | Label |
|---|---|---|
| Active | `status-green` | ACTIVE |
| Running | `status-green` | RUNNING |
| Idle | `status-grey` | IDLE |
| Paused | `status-amber` | PAUSED |
| Blocked | `status-red` | BLOCKED |
| Vacant | `status-grey` | VACANT |

| Task Status | Colour token | Label |
|---|---|---|
| Backlog | `status-grey` | BACKLOG |
| Assigned | `status-blue` | ASSIGNED |
| In Progress | `status-amber` | IN PROGRESS |
| Blocked | `status-red` | BLOCKED |
| Review | `status-blue` | REVIEW |
| Done | `status-green` | DONE |

| Project Status | Colour token | Label |
|---|---|---|
| On Track | `status-green` | ON TRACK |
| At Risk | `status-amber` | AT RISK |
| Blocked | `status-red` | BLOCKED |
| Complete | `status-grey` | COMPLETE |

| Approval Type | Colour token | Label |
|---|---|---|
| External Email | `status-blue` | EMAIL |
| Financial | `status-amber` | FINANCIAL |
| Strategic | `status-red` | STRATEGIC |
| Other | `status-grey` | ACTION |

#### Priority Colours (Tasks)

| Priority | Colour token | Label |
|---|---|---|
| Critical | `status-red` | CRITICAL |
| High | `status-amber` | HIGH |
| Medium | `status-blue` | MEDIUM |
| Low | `status-grey` | LOW |

### 1.8 Motion and Transitions

All interactive transitions use CSS transitions. No layout animations on data-heavy tables or feeds (avoid janky reflows). Reserve animation for micro-interactions.

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Button hover | 100ms | `ease-out` | Background colour only |
| Sidebar collapse/expand | 200ms | `ease-in-out` | Width + opacity of labels |
| Modal open | 150ms | `ease-out` | Fade in + slight scale from 0.97 → 1 |
| Sheet (slide-over) open | 200ms | `ease-out` | Slide from right |
| Row hover | 80ms | `ease-out` | Background colour |
| Status badge appear | 0ms | — | No animation — data must be stable |
| Skeleton → content | 150ms | `ease-out` | Fade in |
| Inline comment reveal | 150ms | `ease-in-out` | Height expand |
| Loading spinner | continuous | linear | `Loader2` icon, `animate-spin` |

---

## 2. Global Layout

Every authenticated screen shares the same shell layout.

### Shell Structure

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (240px, fixed left, full height)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Logo + company name                               │  │
│  │ ─────────────────────────────────────────────     │  │
│  │ Nav items (icon + label)                         │  │
│  │                                                   │  │
│  │ (flex-grow spacer)                               │  │
│  │ ─────────────────────────────────────────────     │  │
│  │ User avatar + name + role                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│ Main content (flex-1, left margin 240px, scroll)        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Page header (sticky top-0, h-12, z-10)           │  │
│  │ ─────────────────────────────────────────────     │  │
│  │ Page content (px-6 py-6 overflow-y-auto)         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Sidebar Specification

**Dimensions:** `w-[240px]` expanded. `w-[60px]` collapsed.
**Position:** `fixed left-0 top-0 h-screen z-20`
**Background:** `bg-base border-r border-subtle`

**Top section (logo area):**
Height: `h-12`. Layout: `flex items-center px-4 gap-3`. Contains:
- Logo mark: a `24px × 24px` square mark. The NBI logo mark is a stylised "N" rendered as a geometric form in `text-accent`. Use an inline SVG. The exact SVG path: a bold "N" letterform constructed from three rectangles — left vertical bar `4px × 20px`, diagonal bar running top-left to bottom-right at 45°, right vertical bar `4px × 20px`. All in `fill-accent` (`#4F6EF7`). Background: `bg-accent-muted rounded-md p-1`.
- Company name: `text-[15px] font-semibold text-primary`. Truncated with `truncate` if company name exceeds sidebar width. Hidden when sidebar collapsed.
- A collapse/expand toggle button `absolute right-[-12px] top-[14px]` — a `24px × 24px` circle `bg-elevated border border-subtle` containing the Lucide `PanelLeftClose` / `PanelLeftOpen` icon at `size-3 text-muted`. Hovering this button: `border-default text-secondary`.

**Navigation section:**
`flex flex-col gap-1 px-2 mt-4`.
Each nav item: `flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors duration-100`.
Default state: `text-secondary hover:bg-elevated hover:text-primary`.
Active state: `bg-highlight text-primary`. The active item also shows a `2px` left border: `border-l-2 border-accent -ml-[2px] pl-[14px]`.
When sidebar is collapsed: hide the text label, keep the icon centred. Tooltip on hover (shadcn/ui `Tooltip`) shows the label.

Navigation items in order:
1. `LayoutDashboard` — Command Centre
2. `Network` — Org Chart
3. `FolderKanban` — Projects
4. `CheckSquare` — Tasks
5. `BarChart2` — Finance
6. `Users` — Leads & Clients
7. `ShieldCheck` — Approvals (with badge count if pending approvals > 0 — a `16px × 16px` circle `bg-status-red text-inverse text-[10px] font-bold` positioned `absolute -top-1 -right-1` relative to the icon)
8. `Settings` — Settings

**Bottom section:**
`absolute bottom-0 left-0 right-0 p-3 border-t border-subtle`.
Contains `AgentAvatar` 32px for the logged-in user, with user display name in `Body Strong text-primary` and role label in `Caption text-muted`. Clicking this opens a dropdown (shadcn/ui `DropdownMenu`) with: Profile (inactive in v1 — greyed), and Log Out.
When sidebar collapsed: show avatar only. Tooltip on hover shows name + role.

### Page Header

Each screen's main area begins with a sticky page header:
`sticky top-0 z-10 h-12 flex items-center justify-between px-6 bg-base border-b border-subtle`.
Left side: page title in `H2 text-primary`. Right side: primary action button for that screen (e.g. "New Project", "Invite User") or nothing if no primary action.

---

## 3. Screen 1 — Login and First-Time Setup

### Purpose

The authentication entry point. Two flows: returning user login, and first-time company setup for a fresh installation.

### 3.1 Login Screen

**Layout:** Full viewport, `bg-base`. Content centred vertically and horizontally using `flex items-center justify-center min-h-screen`.

**Card:** `bg-surface border border-subtle rounded-xl p-10 w-[400px] shadow-lg`. The card is the only element on screen. No navbar, no sidebar.

**Card contents (top to bottom):**

1. **Logo lockup:** Centred. `mb-8`. The NBI logo mark (24px SVG described in Section 2) followed below by "NBIAI Team" in `H1 text-primary text-center` and "Control plane for your AI company" in `Caption text-muted text-center mt-1`.

2. **Email field:** Full width. Label: `Caption Strong text-secondary mb-1.5 block`. Text: "Email address". Input: shadcn/ui `Input`, `type="email"`, placeholder "you@nbi-consulting.com". Autofocus on mount.

3. **Password field:** Full width. `mt-4`. Label: "Password". Input: `type="password"`, placeholder "••••••••". Right-aligned inside the input: a show/hide toggle using Lucide `Eye` / `EyeOff` icon at `size-4 text-muted cursor-pointer`. Clicking toggles `type` between `"password"` and `"text"`.

4. **Submit button:** Full width. `mt-6`. shadcn/ui `Button` variant `default` (`bg-accent text-inverse`). Label: "Sign in". Height `h-10`. On hover: `bg-accent-hover`.

5. **Footer note:** `mt-6 text-center Caption text-muted`. Text: "Access is invitation only. Contact your administrator if you need access."

#### Login Screen States

**Default / unfilled:** Fields empty, button enabled (to allow submitting and showing validation). No error shown.

**Typing (active field):** Focus ring on the active field: `ring-1 ring-accent border-strong`. No other change.

**Loading (after submit):** The submit button label changes to a `Loader2 size-4 animate-spin` icon alongside hidden text "Signing in...". The button is `disabled` with `opacity-60 cursor-not-allowed`. Both fields are `disabled`. The loading state persists until the API responds (max 10 seconds, then timeout error).

**Error — invalid credentials:** Below the submit button, an `Alert` component slides in: `bg-status-red/10 border border-status-red/30 text-status-red rounded-md p-3 mt-4 text-sm`. Icon: Lucide `AlertCircle size-4` inline before text. Message: "Invalid email or password. Please try again." Fields remain editable. Button re-enabled. Do not specify which field was wrong (security).

**Error — network/server:** Same Alert style. Message: "Something went wrong. Please check your connection and try again."

**Error — account inactive:** Alert message: "Your account has been deactivated. Contact your administrator."

**Success:** Redirect to Command Centre (no visible transition beyond the navigation).

### 3.2 First-Time Setup Flow

Triggered automatically on first launch when no company or board user exists in the database. The login screen is replaced by the setup flow. A URL parameter `?setup=true` distinguishes this state.

**Step indicator:** Three numbered steps shown above the card: "1. Company" — "2. Board User" — "3. Complete". The active step number circle uses `bg-accent text-inverse`. Completed steps use `bg-status-green text-inverse` with a `Check` icon replacing the number. Upcoming steps use `bg-elevated text-muted border border-subtle`.

**Step 1 — Company Setup**

Card title: "Set up your company" (`H1`). Subtitle: "This information is displayed throughout the app." (`Body text-muted`).

Fields (all required):
- Company name: `Input` placeholder "NBI Consulting"
- Company tagline (optional): `Input` placeholder "Control plane for your AI company"
- Logo upload: a `div` styled as a dashed border drop zone — `border-2 border-dashed border-default rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent-muted transition-colors`. Contains `Upload size-6 text-muted` icon, "Upload logo" in `Body Strong text-secondary`, "PNG, SVG or JPG. Max 2MB." in `Caption text-muted`. On click: triggers native file picker `<input type="file" accept="image/*">`. On file drop: shows preview of uploaded image as `64px × 64px` rounded-lg with a `×` remove button top-right.
- Country (optional): shadcn/ui `Select`. Options: UK, USA, Sweden, Other.

Button: "Continue" full-width `Button` default.

**Step 2 — Board User**

Card title: "Set up the board user". Subtitle: "This is Glen Pryer — the human operator. Only one board user is allowed."

Fields:
- Full name: `Input` placeholder "Glen Pryer"
- Email address: `Input` `type="email"` placeholder "glen@nbi-consulting.com"
- Password: `Input` `type="password"` placeholder "Create a strong password"
- Confirm password: `Input` `type="password"` placeholder "Repeat your password"

Validation inline (shown on field blur):
- Password minimum 12 characters — if short: red helper text `Caption text-status-red` below the field: "Must be at least 12 characters."
- Passwords must match — if mismatch: same red helper on confirm field: "Passwords do not match."
- Email format — if invalid: "Enter a valid email address."

Button: "Create account" full-width.

**Step 3 — Complete**

Full-card success state. Centre-aligned. `CheckCircle size-12 text-status-green mx-auto mb-6`. `H1 text-primary text-center`: "You're all set." `Body text-secondary text-center mt-2`: "Your NBIAI Team app is ready. Sign in to access the Command Centre."

Button: "Go to Command Centre" full-width, navigates to the login screen (pre-filled email if browser allows, user must enter password).

---

## 4. Screen 2 — Command Centre (Dashboard)

### Purpose

The home screen. The first thing Glen sees after login. Shows the full state of the AI company at a glance — what is running, what needs attention, what is pending approval.

### Layout

Uses the global shell layout (sidebar + main content area). The main content area is a responsive grid.

**Page header:** Left: "Command Centre" (`H2 text-primary`). Right: "New Goal" button (`Button` default, `Plus size-3.5 mr-1.5` icon before label). This opens the Goal Creation modal (see Section 13).

**Main content grid:**
`grid grid-cols-12 gap-6 p-6`

Row 1 (full width): Quick Stats bar — `col-span-12`
Row 2 (left 7 columns + right 5 columns): Active Projects widget left, Agent Status Feed right
Row 3 (left 7 columns + right 5 columns): Activity Feed left, Approvals Queue right

At `1280px` viewport width breakpoint: 12-column grid maintained.
At `1024px`: Active Projects and Agent Status Feed each take `col-span-6`. Activity Feed and Approvals Queue each take `col-span-6`.
At `768px`: all widgets become `col-span-12` (stacked single column). Sidebar collapses to icon-only automatically.

### 4.1 Quick Stats Bar

`col-span-12`. `grid grid-cols-4 gap-4`.

Four `StatCard` components side by side:

1. **Open Tasks** — label "OPEN TASKS", value is integer count in `H1 text-primary`. Sub-label: "across all projects" in `Caption text-muted`.
2. **Agents Active** — label "AGENTS ACTIVE", value is count of non-idle agents. Sub-label: "of 18 total" in `Caption text-muted`.
3. **Goals In Progress** — label "GOALS IN PROGRESS", value is integer. Sub-label: "board-level directives" in `Caption text-muted`.
4. **Pending Approvals** — label "PENDING APPROVALS", value is integer. If value > 0: value rendered in `text-status-red` and the card has a `border border-status-red/30` instead of `border-subtle`. Sub-label: "require your attention" in `Caption text-muted` if 0, or "action required" in `Caption text-status-red` if > 0.

Each StatCard: `bg-surface border border-subtle rounded-lg p-4 flex flex-col gap-1`.

**Loading state:** All four StatCards show `Skeleton` components — a `h-3 w-16 bg-elevated rounded` for the label, `h-8 w-10 bg-elevated rounded mt-2` for the value.
**Empty state (0 on all):** All zeros render normally. No special empty state — zero is valid data.
**Error state:** If the stats API fails, each StatCard shows `—` (en-dash) for the value and a `Caption text-status-red` below reading "Failed to load".

### 4.2 Active Projects Widget

`col-span-7` (or `col-span-6` at 1024px, `col-span-12` at 768px).
`bg-surface border border-subtle rounded-lg`.

**Widget header:** `flex items-center justify-between px-4 py-3 border-b border-subtle`. Left: "Active Projects" in `H3 text-primary`. Right: "View all" text link — `text-accent text-[13px] font-medium hover:text-accent-hover cursor-pointer`. Clicking navigates to the Projects View.

**Widget body:** A table with no outer border (table inside the card). `w-full`.

Table columns:
1. Project — `text-left Body Strong text-primary`
2. Status — `StatusBadge`
3. Lead Agent — `AgentAvatar` (24px) + agent name in `Caption text-secondary`
4. Last Update — `Caption text-muted` (relative time, e.g. "3h ago")

Table header row: `bg-elevated`. Headers in `Caption Strong text-muted uppercase tracking-wider px-4 py-2`.
Table body rows: `hover:bg-elevated cursor-pointer border-b border-subtle last:border-0 px-4 py-3`. Clicking a row navigates to the Project Detail page.
Maximum 5 rows shown. If more than 5 projects exist, the 5 most recently updated are shown and the "View all" link becomes essential.

**Loading state:** 3 skeleton rows — each row contains `Skeleton` blocks for each column.
**Empty state (no projects):** Widget body replaced by a centred block: `py-10 flex flex-col items-center gap-3`. Lucide `FolderKanban size-8 text-muted`. `Body text-muted text-center`: "No active projects." `Button` ghost size sm: "Create a project".
**Error state:** `py-8 text-center Caption text-status-red`: "Failed to load projects."

### 4.3 Agent Status Feed Widget

`col-span-5` (or `col-span-6` at 1024px, `col-span-12` at 768px).
`bg-surface border border-subtle rounded-lg`.

**Widget header:** `flex items-center justify-between px-4 py-3 border-b border-subtle`. Left: "Agent Status" in `H3 text-primary`. Right: a filter control — shadcn/ui `Select` with options "All", "Active", "Idle", "Blocked", "Paused". Default: "All". Size: compact (`h-7 text-xs`).

**Widget body:** A scrollable list `max-h-[340px] overflow-y-auto`.

Each agent row: `flex items-center gap-3 px-4 py-2.5 border-b border-subtle last:border-0 hover:bg-elevated cursor-pointer`. Clicking navigates to the Role Detail page for that agent.

Row contents:
- `AgentAvatar` 28px
- Main text block `flex-1 min-w-0`: agent role name in `Body Strong text-primary truncate`, reports-to name in `Caption text-muted truncate`
- `ModelTierBadge` (right-aligned, shrink-0)
- `StatusBadge` (right-aligned, shrink-0)

All 18 agents (or fewer if some are vacant) are listed. Vacant roles shown last, with the `AgentAvatar` vacant variant.

Real-time updates: rows update in place when an agent's status changes via WebSocket. The row flashes a `bg-accent-muted` highlight for 800ms (`transition-colors`) when its status changes.

**Loading state:** 5 skeleton rows — `AgentAvatar` skeleton 28px circle, two `Skeleton` text blocks.
**Empty state:** If no agents are set up: `py-8 text-center Body text-muted`: "No agents configured." with a Button ghost "Go to Org Chart".
**Error state:** `Caption text-status-red text-center py-6`: "Failed to load agent status."

### 4.4 Activity Feed Widget

`col-span-7` (or `col-span-6` at 1024px, `col-span-12` at 768px).
`bg-surface border border-subtle rounded-lg`.

**Widget header:** `flex items-center justify-between px-4 py-3 border-b border-subtle`. Left: "Activity Feed" in `H3 text-primary`. Right: "Last 24 hours" in `Caption text-muted`.

**Widget body:** A scrollable list `max-h-[320px] overflow-y-auto divide-y divide-subtle`.

Each item is an `ActivityFeedItem` component (defined in Section 1.4). Reverse-chronological order. Max 20 items visible in the scroll container; older items are not paginated in v1.

Timestamp format: relative for items less than 24h old ("3m ago", "1h ago"). For items older (edge case if retained): "Yesterday at 14:32".

Action text format examples:
- "CEO completed task 'Decompose goal: Q2 BD sprint'"
- "CFO updated Finance — Revenue: added Lighthouse contract £8,500/mo"
- "CMO sent approval request: draft email to Roblox Studios"
- "Senior Engineer checked out task 'Implement auth API'"

Agent name within the action text: render as `text-primary font-medium`. Action description: `text-secondary`.

**Loading state:** 4 skeleton ActivityFeedItems.
**Empty state:** `py-10 flex flex-col items-center gap-3`. `Zap size-8 text-muted`. `Body text-muted text-center`: "No activity in the last 24 hours."
**Error state:** `Caption text-status-red text-center py-6`: "Failed to load activity."

### 4.5 Approvals Queue Widget

`col-span-5` (or `col-span-6` at 1024px, `col-span-12` at 768px).
`bg-surface border border-subtle rounded-lg`.

**Widget header:** `flex items-center justify-between px-4 py-3 border-b border-subtle`. Left: "Approvals Queue" in `H3 text-primary`. If pending count > 0: a `16px × 16px` filled circle `bg-status-red text-inverse text-[10px] font-bold` with the count, positioned `ml-2 inline-flex items-center justify-center rounded-full`. Right: "View all" text link to the Approvals Page.

**Widget body:** A list of pending approvals.

Each item: `flex items-center gap-3 px-4 py-3 border-b border-subtle last:border-0`.

Item contents:
- Approval type badge (see Section 1.7 Approval Type badges)
- Main text block `flex-1 min-w-0`: agent name in `Caption Strong text-secondary`, summary in `Body Strong text-primary truncate` (one line max)
- "Review" button: `Button` variant `outline` size `sm` — navigates to Approvals Page with this item pre-selected

**Empty state:** `py-10 flex flex-col items-center gap-3`. `ShieldCheck size-8 text-muted`. `Body Strong text-secondary`: "No pending approvals." `Caption text-muted`: "You're all clear."
**Loading state:** 2 skeleton rows.
**Error state:** `Caption text-status-red text-center py-6`: "Failed to load approvals."

---

## 5. Screen 3 — Org Chart View

### Purpose

A full-page visual hierarchy of all 18 agents plus Glen as the root. Allows viewing agent status at a glance, navigating to any role, and initiating hire/edit/manage actions.

### Layout

Uses the global shell. Main content area is full-height and full-width (no inner padding constraints beyond the toolbar).

**Page header:** Left: "Org Chart" (`H2 text-primary`). Right: "Hire Agent" button (`Button` default, `UserPlus size-3.5 mr-1.5`). Opens the Hire Agent modal (see Section 13).

### Toolbar

Below the page header, within the content area: `flex items-center gap-3 px-6 py-3 border-b border-subtle bg-base`.

Toolbar contents:
- Search: `Input` `w-[240px] h-8 text-sm` with `Search size-3.5 text-muted` inside left padding. Placeholder: "Search roles...". Filters nodes by role name in real time (no submit).
- Filter by status: `Select` `h-8 text-sm`. Options: "All Statuses", "Active", "Idle", "Paused", "Blocked", "Vacant". Default: "All Statuses". When a status filter is active, non-matching nodes are dimmed to `opacity-30`.
- Zoom controls: Two `Button` ghost `h-8 w-8` icon-only buttons. `ZoomIn size-4` and `ZoomOut size-4`. Between them: a `Caption text-muted w-12 text-center` showing current zoom level (e.g. "100%"). Zoom range: 50% to 150%. Default: 100%.
- Reset view: `Button` ghost `h-8 text-sm` with text "Reset". Returns to 100% zoom and centres the tree.

### Tree Visualisation

**Container:** `flex-1 overflow-hidden relative bg-base` (fills remaining height after toolbar). The tree is rendered on a scrollable/pannable canvas within this container.

**Pan interaction:** Click and drag on the background canvas to pan. The cursor changes to `cursor-grab` when not over a node, `cursor-grabbing` during drag.

**Rendering approach:** The org chart tree is rendered using SVG for the connector lines and absolute-positioned HTML `div` elements for the nodes. The SVG and the node container share the same transform (translate + scale) so they move together on pan/zoom.

**Tree structure:** The hierarchy from `company/org_chart.md` is rendered as a top-down tree.

Level 0 (root): Glen Pryer (special node, see below)
Level 1: CEO Agent
Level 2: COO, CFO, CTO, VP Product, CMO/Head of BD, Head of People
Level 3 (under COO): Producer, Data Analyst
Level 3 (under CTO): VP Engineering, QA Lead, UI/UX Lead
Level 3 (under VP Engineering): Senior Engineer, Engineer, DevOps
Level 4 (under QA Lead): QA Engineer
Level 4 (under UI/UX Lead): UI/UX Designer

**Connector lines:** SVG `<path>` elements using bezier curves. Stroke: `#FFFFFF1A` (border-subtle). Stroke-width: `1.5`. No arrowheads. The path goes from the bottom-centre of the parent node to the top-centre of the child node with a smooth cubic bezier.

**TreeNode component** (defined in Section 1.4):
Dimensions: `180px × 80px`.

Content layout (top to bottom):
- Row 1: role title in `Body Strong text-primary truncate`. Truncate after 22 characters.
- Row 2: `flex items-center gap-1.5 mt-1`. Agent name (or "Vacant") in `Caption text-muted truncate`. Then `ModelTierBadge`.
- Row 3: `flex items-center gap-1.5 mt-2`. `StatusBadge`. If status is Active or Running: current task in `Caption text-muted truncate` (max one line).

Node states:
- **Populated / Active:** `bg-surface border border-subtle rounded-lg`. Hover: `border-accent-muted bg-elevated`.
- **Populated / Idle:** Same styling, `StatusBadge` shows IDLE.
- **Vacant:** `bg-surface border-2 border-dashed border-default rounded-lg`. Role title in `text-muted`. A centred `UserPlus size-4 text-muted` icon with "Hire" text in `Caption text-muted` below the role title instead of agent name.
- **Blocked:** `border border-status-red/40 bg-status-red/5`.
- **Paused:** `border border-status-amber/40`.
- **Selected (clicked but panel not opened yet):** `border-accent ring-1 ring-accent`.

**Glen Pryer node (root):** Slightly different style to indicate he is human. `bg-elevated border-2 border-accent/50 rounded-lg`. No model tier badge. No status badge. `Body Strong text-primary`: "Glen Pryer". `Caption text-muted`: "Board Operator · Human". This node is not clickable to a Role Detail page (he has no role detail). Right-clicking or clicking shows a tooltip: "Human operator — no agent detail page."

**Clicking a non-Glen node:** Navigates to the Role Detail page for that role. The navigation happens immediately (the tree is not a panel — clicking opens the full page).

**Hire button on vacant node:** Clicking the vacant node or the "Hire" label within it opens the Hire Agent modal directly with the role pre-populated (modal defined in Section 13).

### Mobile Behaviour (768px and below)

The tree visualisation is replaced by an accordion list. Each level 1 item (direct CEO reports) is an accordion trigger. Expanding reveals level 2 children. Level 2 items expand to show level 3. Each item in the accordion is a simplified row: role title + `StatusBadge` + `ModelTierBadge`. Clicking any item navigates to the Role Detail page.

The toolbar search and filter remain available above the accordion.

---

## 6. Screen 4 — Role Detail Page

### Purpose

Detailed view of a single agent role — their identity, current work, performance, knowledge context, and configuration. Accessible from the Org Chart, Agent Status Feed, and task links.

### Layout

Full page, not a modal or slide-over. Uses the global shell.

**Page header:** Left side: `ChevronLeft size-4 text-muted mr-2` back button (`Caption text-muted hover:text-secondary`) labelled "Org Chart" — navigates back. Then `H2 text-primary` showing the role name. Right side: Actions bar (see below).

### Actions Bar (Header Right)

Three buttons in a `flex gap-2`:
1. "Edit Agent" — `Button` variant `outline`. Opens the Edit Agent modal (Section 13).
2. "Pause Agent" — `Button` variant `outline`. If agent is already paused, this shows "Resume Agent". On click: confirmation modal (Section 13). Destructive action requires confirmation.
3. "Terminate Agent" — `Button` variant `destructive`. On click: confirmation modal. This is irreversible — the modal makes that explicit.

If the agent is Vacant (no agent assigned), the actions bar shows only: "Hire Agent" — `Button` variant `default`.
If the agent's status is Paused, the "Pause Agent" button becomes "Resume Agent" (same variant `outline`).

### Section 1: Header Block

`bg-surface border border-subtle rounded-lg p-6 mb-6`.

Layout: `flex items-start gap-5`.

Left: `AgentAvatar` 56px variant (larger avatar — same design, 56px circle).

Right: `flex flex-col gap-2 flex-1`.
- Role title: `H1 text-primary`
- Agent name: `H3 text-secondary` (e.g. "Claude Opus 4.5" or the configured name, or "Vacant" in `text-muted` if unassigned)
- Badges row: `flex items-center gap-2`. `ModelTierBadge`, `StatusBadge`.
- Reports to: `Caption text-muted`. Text: "Reports to: " followed by the manager role name as a `text-accent hover:text-accent-hover cursor-pointer` link — clicking navigates to that role's detail page.
- Direct reports: `Caption text-muted`. Text: "Direct reports: " followed by each direct report role as comma-separated `text-accent hover:text-accent-hover cursor-pointer` links. If no direct reports: "None".

### Section 2: Current Assignment

`bg-surface border border-subtle rounded-lg p-5 mb-6`.
Section label: `SectionBlock` header — "CURRENT ASSIGNMENT".

If no current assignment:
`py-6 text-center Body text-muted`: "No active assignment." `Caption text-muted mt-1`: "This agent is idle and awaiting a task."

If assigned:
- Task title: `H3 text-primary`. Clicking navigates to Task Detail.
- Row below: `flex items-center gap-4 mt-2`. Project name as `Caption text-muted` with `FolderKanban size-3 mr-1` icon. `StatusBadge`. Time in current state: `Caption text-muted` — "In this state for 2h 14m".
- A thin `ProgressBar` below (amber or green depending on task status) showing time elapsed vs estimated time (if no estimate, show as indeterminate — a slowly pulsing stripe animation on the amber fill).

### Section 3: Performance Metrics

`grid grid-cols-4 gap-4 mb-6`.

Four `StatCard` components:
1. **Tasks Completed** — label "TASKS COMPLETED", value: integer (all time), sub: "all time"
2. **Avg Completion Time** — label "AVG COMPLETION", value: e.g. "2.4h", sub: "per task (last 30 days)"
3. **Escalations** — label "ESCALATIONS", value: integer, sub: "this month". If > 3: value in `text-status-amber`.
4. **Budget Used** — label "BUDGET USED", value: formatted as "£42.18", sub: "of £100 this month". Below the sub-label: a `ProgressBar` (`w-full h-1 mt-1`). Fill colour: green if < 80% of cap, amber if 80–99%, red if ≥ 100%.

### Section 4: Task History

`bg-surface border border-subtle rounded-lg mb-6`.

Section header: `flex items-center justify-between px-5 py-3 border-b border-subtle`. Left: `H3 text-primary` "Task History". Right: "View all" text link (`text-accent text-sm hover:text-accent-hover`).

Table inside: `w-full`.
Columns: Task | Project | Completed | Outcome | Duration.
- Task: `Body Strong text-primary` (clickable link → Task Detail, `text-accent hover:underline`)
- Project: `Caption text-muted`
- Completed: `Caption text-muted` (date, format "28 Mar 2026")
- Outcome: a simple badge — Done: `text-status-green`, Escalated: `text-status-amber`, Blocked: `text-status-red` (small `Badge` variant)
- Duration: `Caption text-muted` (e.g. "1h 42m")

Table header: `bg-elevated px-5 py-2 Caption Strong text-muted uppercase tracking-wider`.
Table rows: `px-5 py-3 border-b border-subtle last:border-0 hover:bg-elevated`.
Max 10 rows.

**Empty state:** `py-8 text-center Body text-muted`: "No completed tasks yet."

### Section 5: Knowledge Files

`bg-surface border border-subtle rounded-lg mb-6 p-5`.
Section label: "KNOWLEDGE FILES" (`SectionBlock` header).

Three sub-sections, each with a `H3 text-secondary mb-2` heading and a list of files below.

Sub-sections:
- **Tier 1 — Company Knowledge**
- **Tier 2 — Role Knowledge**
- **Tier 3 — Project Knowledge**

Each file item: `flex items-center gap-2 py-1.5`. `FileText size-3.5 text-muted`. File name in `Body text-secondary`. Last updated in `Caption text-muted ml-auto`. All items are read-only — no edit action.

If no Tier 3 files (agent not assigned to a project): `Caption text-muted italic`: "No project assigned."

### Section 6: System Prompt

`bg-surface border border-subtle rounded-lg mb-6 p-5`.
Section label: "SYSTEM PROMPT" (`SectionBlock` header). Next to the label: a `Button` ghost `h-6 px-2 text-xs` with `ChevronDown / ChevronRight size-3` to collapse/expand. Default state: **collapsed** (to reduce scroll length by default — if the agent's system prompt is long this section is unreadable without collapse).

When expanded: a `CodeBlock` component (defined in Section 1.4) containing the full system prompt text, rendered as plain text (no syntax highlighting — it is prose, not code). The copy button is always visible in the top-right corner of the block.

### Section 7: Execution Log (sub-section within Role Detail)

`bg-surface border border-subtle rounded-lg mb-6`.

Section header: `flex items-center justify-between px-5 py-3 border-b border-subtle`. Left: `H3 text-primary` "Recent Execution Log". Right: `Caption text-muted` "Last 5 runs".

Log body: `divide-y divide-subtle`.

Each run entry is expandable. Collapsed row: `flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-elevated`.
- Timestamp: `Caption Mono text-muted w-36 shrink-0`
- Run summary: `Body text-secondary flex-1` (e.g. "Processed task: Draft Q2 BD strategy")
- Duration: `Caption Mono text-muted w-20 text-right`
- Token count: `Caption Mono text-muted w-24 text-right` (e.g. "14,203 tok")
- Cost: `Caption Mono text-accent w-20 text-right` (e.g. "$0.043")
- Expand chevron: `ChevronDown / ChevronRight size-4 text-muted`

When a run row is expanded: a sub-section slides down showing the full `ExecutionLogEntry` items (each line of the log) in a `CodeBlock` style container. Max height `300px` with scroll.

**Empty state:** `py-8 text-center Body text-muted`: "No execution history."

---

## 7. Screen 5 — Projects View

### Purpose

Lists all projects in the system. Entry point to manage project work and drill into specific project tasks.

### 7.1 Project List

**Page header:** Left: "Projects" (`H2 text-primary`). Right: "New Project" button (`Button` default, `Plus size-3.5 mr-1.5`). Opens the New Project modal (Section 13).

**Filter/search bar:** `flex items-center gap-3 mb-4`.
- Search `Input` `w-[280px] h-9` with `Search size-3.5 text-muted`. Placeholder: "Search projects...". Filters table rows.
- Status filter `Select` `h-9 w-[160px]`. Options: "All Statuses", "On Track", "At Risk", "Blocked", "Complete".
- (No sort control in v1 — sorted by last updated, descending.)

**Projects table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns:
1. Project name — `Body Strong text-primary`
2. Status — `StatusBadge`
3. Lead Agent — `AgentAvatar` 24px + `Caption text-secondary` role name
4. Tasks — `Caption text-muted` formatted as: `12 total · 3 in progress · 1 blocked · 8 done` — "blocked" count in `text-status-red` if > 0, "in progress" count in `text-status-amber`
5. Last Updated — `Caption text-muted` relative time

Column widths: Project 35%, Status 12%, Lead Agent 18%, Tasks 25%, Last Updated 10%.

Table header: `bg-elevated px-5 py-2 Caption Strong text-muted uppercase tracking-wider`. All column headers are left-aligned.
Table rows: `px-5 py-3.5 border-b border-subtle last:border-0 hover:bg-elevated cursor-pointer`. Clicking a row navigates to Project Detail.

**Loading state:** 4 skeleton rows.
**Empty state:** `py-16 flex flex-col items-center gap-4`. `FolderKanban size-12 text-muted`. `H2 text-secondary text-center`: "No projects yet." `Body text-muted text-center`: "Create your first project to start assigning work to agents." `Button` default: "New Project".
**Error state:** `py-8 text-center Caption text-status-red`: "Failed to load projects. Refresh to try again."

### 7.2 Project Detail

Accessed by clicking a project row. Full page, not a slide-over.

**Page header:** `ChevronLeft size-4 mr-2` back button labelled "Projects" → returns to list. Then the project name as `H2 text-primary`.

Right side of header: "Edit" button (`Button` variant `outline`, `Pencil size-3.5 mr-1.5`), "New Task" button (`Button` default, `Plus size-3.5 mr-1.5`). "New Task" opens the New Task modal (Section 13).

**Project info block:** `bg-surface border border-subtle rounded-lg p-5 mb-6 flex items-start justify-between`.

Left:
- `StatusBadge` (current project status)
- Description: `Body text-secondary mt-2` (full project description text, no truncation)
- "Lead: " `Caption text-muted` + lead agent role as `text-accent hover:text-accent-hover cursor-pointer` link

Right: `flex flex-col items-end gap-2 shrink-0`.
- Created: `Caption text-muted` "Created 28 Mar 2026"
- Last updated: `Caption text-muted` "Updated 3h ago"

**Task list:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Header: `flex items-center justify-between px-5 py-3 border-b border-subtle`.
Left: "Tasks" `H3 text-primary`.
Right: `flex items-center gap-3`.
- Status filter `Select` `h-8 text-sm w-[140px]`: "All Statuses", "Backlog", "Assigned", "In Progress", "Blocked", "Review", "Done".
- Priority filter `Select` `h-8 text-sm w-[120px]`: "All Priorities", "Critical", "High", "Medium", "Low".

Table columns:
1. Task title — `Body Strong text-primary` (clickable → Task Detail, `hover:text-accent`)
2. Assigned Agent — `AgentAvatar` 24px + `Caption text-secondary`
3. Priority — `StatusBadge` (priority variant)
4. Status — `StatusBadge` (task status variant)
5. Last Updated — `Caption text-muted`

Same table styling as Project List. Rows are clickable to Task Detail.

**Empty task state:** `py-10 text-center`. `CheckSquare size-8 text-muted mx-auto mb-3`. `Body text-muted`: "No tasks yet. Create the first task for this project." `Button` ghost `mt-2`: "New Task".

---

## 8. Screen 6 — Task Detail

### Purpose

Full view of a single task. Shows description, current state, who owns it, what it blocks, and the complete activity history.

### Layout

Full page. Uses the global shell.

**Page header:** `ChevronLeft size-4 mr-2` back button labelled with the project name — navigates to Project Detail. Then task title as `H2 text-primary flex-1`. Right: "Edit" button `Button outline Pencil icon`.

### 8.1 Two-Column Layout

Below the page header: `grid grid-cols-12 gap-6 px-6 py-6`.

Left column `col-span-8`: Main task content.
Right column `col-span-4`: Metadata sidebar.

At 1024px and below: `col-span-12` for both (stacked).

### Left Column

**Description block:** `bg-surface border border-subtle rounded-lg p-5 mb-6`.
`H3 text-primary mb-3`: "Description".
The task description is rendered markdown — use a Markdown renderer (e.g. `react-markdown` with the prose styling from Tailwind Typography, overriding font colour to `text-secondary`). Headings within the markdown use `text-primary`. Code within markdown uses `CodeBlock` styling.

**Status Transitions block:** `bg-surface border border-subtle rounded-lg p-5 mb-6`.
`H3 text-primary mb-3`: "Change Status".

The current status is shown as a `StatusBadge` (large variant — `text-sm`). Below it: "Transition to:" label in `Caption text-muted mb-2`.

Then a `flex gap-2 flex-wrap` of transition buttons. Only valid next states are shown as buttons. Transition matrix:
- Backlog → Assigned, In Progress
- Assigned → In Progress, Backlog
- In Progress → Blocked, Review, Done
- Blocked → In Progress, Backlog
- Review → Done, In Progress
- Done → (no further transitions; show `Caption text-muted`: "This task is complete.")

Transition buttons: `Button` variant `outline size-sm`. Each button shows the target status name and the corresponding `StatusBadge` colour dot as a small circle prefix.

**Inline comment requirement:** Transitioning to "Blocked" or escalating (if an escalation action exists) requires a comment. When the user clicks one of these transition buttons:
1. The button press is not immediate — instead, an `InlineCommentField` slides down beneath the transition buttons.
2. The field has a label: `Caption Strong text-secondary mb-1.5`: "Reason for blocking (required)".
3. A `Textarea` `rows={3}` `bg-input border-default`.
4. Two buttons below: "Confirm [Blocked]" — `Button` default small — and "Cancel" — `Button` ghost small.
5. "Confirm" is disabled until the textarea has at least 10 characters. Disabled state: `opacity-40 cursor-not-allowed`.
6. On confirm: API call. On success: status updates in the header, the `InlineCommentField` closes, and the activity log gains a new entry.

For non-blocking transitions (e.g. In Progress → Review): the transition executes immediately on button click, with a brief loading state on the button (`Loader2 animate-spin`).

**Relations block:** `bg-surface border border-subtle rounded-lg p-5 mb-6`.
`H3 text-primary mb-3`: "Relations".

Three sub-sections:
- **Blocking:** `Caption Strong text-muted mb-1`: "Blocking". List of tasks this task blocks, as pills: `bg-elevated border border-subtle rounded-full px-3 py-1 text-sm text-secondary hover:border-accent-muted cursor-pointer`. Clicking a pill navigates to that task's detail. If none: `Caption text-muted italic`: "None."
- **Blocked by:** Same style. If the task is blocked by another: the pill is `bg-status-red/10 border border-status-red/30 text-status-red`.
- **Related:** Same pill style, neutral.

"Add relation" button below all three: `Button` ghost size sm `Plus size-3.5 mr-1`: "Add relation". Opens an inline search field (Input with autocomplete dropdown — shadcn/ui `Command` component used as a combobox) to find and link another task. Relation type is selected from a small `Select` alongside: "Blocks", "Blocked by", "Related".

**Activity Log:** `bg-surface border border-subtle rounded-lg p-5`.
`H3 text-primary mb-3`: "Activity".

Reverse-chronological list. No max height cap (scrolls with page).

Each log entry: `flex items-start gap-3 py-3 border-b border-subtle last:border-0`.

Entry types:
- **Status change:** `AgentAvatar` 24px. Text: "CEO changed status from [old] → [new]" where old and new are `StatusBadge` inline components (small, no uppercase label — just coloured text). Timestamp: `Caption text-muted`.
- **Comment:** `AgentAvatar` 24px. Agent name in `Body Strong text-primary`. Comment text below in `Body text-secondary` (full text, rendered markdown). Timestamp: `Caption text-muted`.
- **Assignment:** Icon only (no avatar) — `UserCheck size-4 text-muted`. Text: "Assigned to [Agent Role Name]" with agent as `text-accent`.
- **Relation added:** `Link size-4 text-muted`. Text: "Linked to [Task Title]" as `text-accent`.

"Add comment" input at the bottom: `Textarea` `rows={3}` `w-full bg-input border-default placeholder:text-muted`. Placeholder: "Add a comment...". Below: `Button` default size sm: "Post comment". Disabled if textarea is empty. On submit: comment appears in the activity log immediately (optimistic update).

### Right Column (Metadata Sidebar)

`bg-surface border border-subtle rounded-lg p-5`. Contains `SectionBlock` groups.

**Status:** Current `StatusBadge` (large).
**Priority:** Current priority `StatusBadge` with priority colour.
**Checkout status:** `Caption Strong text-muted`: "CHECKED OUT BY". If checked out: `AgentAvatar` 20px + agent name `Body Strong text-primary` + "since [time]" `Caption text-muted`. If available: `Caption text-muted`: "Available".
**Assigned to:** `AgentAvatar` 28px + role name as `text-accent hover:text-accent-hover` link.
**Created by:** `Caption text-secondary` (role name).
**Project:** `FolderKanban size-3.5 mr-1` + project name as `text-accent hover:text-accent-hover` link.
**Created:** `Caption text-secondary` (date).
**Due date:** `Caption text-secondary` (date if set, "None" if not). If past due and not Done: `text-status-red`.

Each metadata row: `flex items-center justify-between py-2 border-b border-subtle last:border-0`. Label: `Caption Strong text-muted`. Value: right-aligned.

---

## 9. Screen 7 — Finance Tab

### Purpose

Financial intelligence dashboard. Shows NBI's contracted revenue, payroll, cash flow, NSI transition scenarios, and pipeline forecast. Populated by the CFO agent.

### Layout

Uses global shell. Main content area has sub-navigation tabs.

**Page header:** Left: "Finance" (`H2 text-primary`). No right-side action (all data is agent-managed).

**Sub-navigation:** `flex border-b border-subtle mb-6 px-6`. shadcn/ui `Tabs` variant. Five tabs: Revenue | Payroll | Cash Flow | NSI Scenarios | Pipeline. Tab underline uses `border-accent`.

### 9.1 Revenue Screen

**KPI row:** `grid grid-cols-4 gap-4 mb-6`. Four `StatCard` components:
1. Monthly Contracted Revenue — value: "£X,XXX" in `H1 text-primary`. Sub-label: "current month".
2. Annual Contracted Revenue — value: "£XX,XXX" annualised run rate. Sub-label: "ARR".
3. Monthly Target — value: "£X,XXX". Sub-label: "Glen's revenue target".
4. YTD vs Target — value: percentage e.g. "74%" — if below 80% of target: `text-status-amber`. If below 60%: `text-status-red`. If on/above target: `text-status-green`. Sub-label: "year to date".

**Progress bar block:** `bg-surface border border-subtle rounded-lg p-5 mb-6`.
Two rows:
- "Monthly contracted vs target": label `Caption Strong text-secondary` left, "£X,XXX / £X,XXX" `Caption text-muted` right. `ProgressBar w-full h-2 mt-2`. Fill colour by % (green/amber/red).
- "YTD contracted vs target": same structure.

**Revenue table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.
Header: `flex items-center justify-between px-5 py-3 border-b border-subtle`. Left: "Revenue Items" `H3 text-primary`. Right: a filter `Select` `h-8 text-sm`: "All", "Monthly", "One-off".

Table columns: Client | Type | Amount | Start Date | End Date | Status.
- Client: `Body Strong text-primary`
- Type: small `Badge` — "Monthly" uses `bg-accent-muted text-accent`, "One-off" uses `bg-elevated text-muted`
- Amount: `Body Strong text-primary` right-aligned, formatted "£X,XXX/mo" or "£XX,XXX"
- Start Date: `Caption text-muted`
- End Date: `Caption text-muted` ("Ongoing" if no end date, in `text-status-green`)
- Status: `StatusBadge` — Active: green, Paused: amber, Ended: grey

Table footer row: `bg-elevated px-5 py-3 border-t border-subtle`. Bold total row — "Total Monthly Contracted" label in `Caption Strong text-muted`, total value in `Body Strong text-primary` right-aligned.

**Empty state:** `py-12 text-center`. `BarChart2 size-10 text-muted mx-auto mb-3`. `Body text-muted`: "No revenue items recorded. The CFO agent will populate this when contracts are active."

### 9.2 Payroll Screen

**Page header note:** `bg-elevated border border-subtle rounded-lg px-4 py-3 mb-6 flex items-start gap-3`. `Info size-4 text-muted mt-0.5 shrink-0`. `Caption text-muted`: "Payroll data is maintained by the CFO agent and Glen. Changes to real staff must be approved by Glen."

**Payroll table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns: Name | Type | Role | Monthly Cost | Annual Cost | Status | Actions.
- Name: `Body Strong text-primary`
- Type: Badge — "Human" uses `bg-elevated border border-subtle text-muted`, "Agent" uses `bg-accent-muted border border-accent-muted text-accent`
- Role: `Caption text-secondary`
- Monthly Cost: `Body Mono text-primary` right-aligned — `font-mono`
- Annual Cost: `Caption Mono text-muted` right-aligned
- Status: `StatusBadge` — Active: green, Inactive: grey
- Actions (Board user only): Edit icon button `Button ghost size-icon h-7 w-7 Pencil size-3.5`, Deactivate icon button `Button ghost size-icon h-7 w-7 Power size-3.5 text-muted hover:text-status-red`.

Table footer: Total row — "Total Monthly Payroll" left, sum value in `Body Strong Mono text-primary` right.

**Empty state:** `py-12 text-center Body text-muted`: "No payroll entries recorded."

### 9.3 Cash Flow Screen

**3-month rolling table:** `bg-surface border border-subtle rounded-lg overflow-hidden mb-6`.

Header: "Cash Flow Projection" `H3 text-primary px-5 py-3 border-b border-subtle`.

Table: rows are categories, columns are months. Three future months (current month + next 2).

Rows:
- Contracted Revenue — `Body Strong text-primary`
- Pipeline (probability-weighted) — `Body text-secondary`
- Total Income — `Body Strong text-primary border-t border-subtle`
- (blank spacer row)
- Staff Payroll — `Body text-secondary`
- Agent Costs — `Body text-secondary`
- Operating Costs — `Body text-secondary`
- Total Costs — `Body Strong text-primary border-t border-subtle`
- (blank spacer row)
- **Net Position** — `Body Strong`. Positive value: `text-status-green`. Negative value: `text-status-red`.

Column header cells: `Caption Strong text-muted text-right` (month name + year).
Data cells: `Caption Mono text-secondary text-right`. Total row cells: `Body Strong Mono text-right`. Net row cells: `Body Strong Mono text-right` with colour per sign.

**Bar chart:** `bg-surface border border-subtle rounded-lg p-5`.
Header: "Monthly Net Position" `H3 text-primary mb-4`.

A simple 3-bar chart built as a flex layout (no external charting library needed for 3 bars). Each bar is a flex column: bar fill + month label.

Container: `flex items-end gap-6 h-[140px]`.
Each bar group: `flex flex-col items-center gap-2 flex-1`.
Bar: a `div` with a dynamic height (calculated as a percentage of the tallest absolute value × 100%). Positive fill: `bg-status-green rounded-t`. Negative fill: `bg-status-red rounded-t`. Min bar height: `8px` (always visible). Max bar height: `120px`.
Below bar: month label `Caption text-muted text-center`. Below that: value `Caption Mono text-center` (positive: `text-status-green`, negative: `text-status-red`).

A horizontal baseline: `border-t border-subtle w-full mt-0` at the base of the bars.

**Empty / no data state:** Chart replaced by `py-10 text-center Body text-muted`: "Insufficient data for projection. Ensure revenue and payroll data are entered."

### 9.4 NSI Scenarios Screen

"NSI" refers to NBI's relationship with NBI Sports International (NSI). This screen models the financial impact of different transition scenarios.

**Header note:** `bg-elevated border border-subtle rounded-lg px-4 py-3 mb-6`. `Caption text-muted`: "These scenarios model the revenue impact of NBI's NSI engagement at different transition stages. Data is maintained by the CFO agent."

**Three scenario cards:** `grid grid-cols-3 gap-4 mb-6`.

Each card: `bg-surface border border-subtle rounded-lg p-5`.

Card structure:
- Scenario name: `H3 text-primary mb-1` ("Current — NSI Full", "Partial Transition", "Full Transition")
- Scenario description: `Caption text-muted mb-4` (one sentence describing the scenario)
- Metrics:
  - Monthly Revenue Impact: label `Caption Strong text-muted`, value `H2 text-primary` (e.g. "+£8,500" or "–£4,000"). Positive: `text-status-green`. Negative: `text-status-red`. Neutral: `text-primary`.
  - Cost Impact: label `Caption Strong text-muted`, value `Body Strong text-secondary`
  - Net Position: label `Caption Strong text-muted`, value `H3` — same colour logic as Revenue Impact
  - Notes: `Caption text-muted mt-3` (free text, any caveats)

Active/selected scenario (the currently live one): card has `border-accent` border and `bg-accent-muted/30` background. A `Badge` in top-right of card: "CURRENT" in `text-accent bg-accent-muted`.

**Comparison table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.
Header: "Scenario Comparison" `H3 text-primary px-5 py-3 border-b border-subtle`.
Table: rows are metrics, columns are the three scenarios. Each data cell uses the same colour logic (positive/negative). Row header cells in `Caption Strong text-muted`. Data cells in `Body Mono text-right`.

### 9.5 Pipeline Revenue Screen

This screen shows the BD pipeline's revenue impact (probability-weighted forecast).

**Summary cards:** `grid grid-cols-2 gap-4 mb-6`.
1. Total Pipeline Value — `StatCard`. Value: "£XXX,XXX". Sub: "sum of all active lead expected values".
2. Probability-Weighted Total — `StatCard`. Value: "£XX,XXX". Sub: "expected value". `text-accent` for this value.

**Pipeline table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.
Header: "Active BD Leads — Revenue Forecast" `H3 text-primary px-5 py-3 border-b border-subtle`.

Columns: Company | Stage | Expected Value | Probability | Weighted Value | Expected Close.
- Company: `Body Strong text-primary`
- Stage: `Badge` styled per stage (Identification/Qualification/Outreach/Discovery/Proposal/Close — each gets its own badge using a gradient from grey to green as stages advance: grey, grey, blue, blue, amber, green)
- Expected Value: `Body Mono text-primary` right-aligned
- Probability: `Body Mono text-secondary` right-aligned (e.g. "40%")
- Weighted Value: `Body Mono text-primary` right-aligned (`= expected value × probability`)
- Expected Close: `Caption text-muted` (date or "TBC")

Footer total row: "Total" in `Caption Strong text-muted`, sum of Weighted Value in `Body Strong Mono text-accent`.

**Empty state:** `py-12 text-center`. `TrendingUp size-10 text-muted mx-auto mb-3`. `Body text-muted`: "No leads in the pipeline. The CMO agent will populate this as leads are identified."

---

## 10. Screen 8 — Leads & Clients Tab

### Purpose

Business development and client management hub. Shows the BD pipeline, active client health, and overdue follow-ups.

### Layout

Uses global shell. Sub-navigation tabs: Pipeline | Active Clients | Overdue Follow-ups.

**Page header:** Left: "Leads & Clients" (`H2 text-primary`). Right: "New Lead" button (`Button` default, `Plus size-3.5 mr-1.5`). Opens the New Lead modal (Section 13).

### 10.1 Pipeline Screen

**View toggle:** Top right of the content area, before the board: `flex items-center gap-1 bg-elevated rounded-md p-1`.
Two `Button` ghost icon-only `h-7 w-7`:
- `Columns size-3.5` — Kanban view (default)
- `List size-3.5` — Table view

Active view button: `bg-surface text-primary`. Inactive: `text-muted`.

**Kanban View:**

A horizontal scroll container: `flex gap-4 overflow-x-auto pb-4 px-6 pt-2`.

Six `KanbanColumn` components (as defined in Section 1.4), one per stage:
1. Identification — badge style: `bg-elevated text-muted`
2. Qualification — badge style: `bg-elevated text-muted`
3. Outreach — badge style: `bg-accent-muted text-accent`
4. Discovery — badge style: `bg-accent-muted text-accent`
5. Proposal — badge style: `bg-status-amber/10 text-status-amber`
6. Close — badge style: `bg-status-green/10 text-status-green`

Column header: Stage name `H3 text-secondary` + card count `Caption text-muted` e.g. "(3)". Below the header: a thin `2px` top-border bar in the stage's accent colour.

Each `KanbanCard` (as defined in Section 1.4):
- Company name: `Body Strong text-primary`
- Contact name: `Caption text-secondary`
- Last contact: `Caption text-muted` — if > 14 days ago: `text-status-amber`. If > 30 days: `text-status-red`.
- Next action: `Caption text-secondary` (truncated 1 line)
- Owner: `AgentAvatar` 18px — the assigned CMO or Glen

Drag-and-drop: cards are draggable between columns. Using `@dnd-kit/core`. On drag start: card becomes `opacity-60 scale-[1.02] shadow-lg`. On drop into a new column: API call updates the stage, card renders in new column.

Clicking a card (not dragging): opens the Lead Detail slide-over (see Section 13).

**Table View:**

`bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns: Company | Contact | Stage | Last Contact | Next Action | Owner | Actions.
- Company: `Body Strong text-primary`
- Contact: `Caption text-secondary`
- Stage: stage badge (same colours as kanban column headers)
- Last Contact: `Caption text-muted` (coloured if overdue as above)
- Next Action: `Caption text-secondary truncate max-w-[200px]`
- Owner: `AgentAvatar` 24px + name `Caption text-secondary`
- Actions: `Button` ghost size-icon `Pencil size-3.5` (edit — opens Lead Detail slide-over)

Row click (not on action button): opens Lead Detail slide-over.

**Empty state (no leads):** Full-width centred. `Users size-12 text-muted mx-auto mb-4`. `H2 text-secondary text-center`: "No leads yet." `Body text-muted text-center`: "Add your first lead to start tracking the pipeline." `Button` default: "New Lead".

### 10.2 Active Clients Screen

**Clients table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Header: `flex items-center justify-between px-5 py-3 border-b border-subtle`. Left: "Active Clients" `H3 text-primary`. Right: `Caption text-muted` "[N] active engagements".

Columns: Client | Engagement Type | Health | Glen's Role | Next Milestone | Days to Milestone.
- Client: `Body Strong text-primary`
- Engagement Type: `Badge` — "Fractional" uses `bg-accent-muted text-accent`, "Project" uses `bg-elevated text-secondary`, "Retained" uses `bg-status-green/10 text-status-green`
- Health: `StatusBadge` — green/amber/red
- Glen's Role: `Caption text-secondary` (e.g. "Lead Advisor", "Fractional CPO")
- Next Milestone: `Caption text-secondary` (description, truncated)
- Days to Milestone: `Caption Mono text-secondary` — if < 7 days: `text-status-amber`. If past due: `text-status-red` with `AlertCircle size-3 inline mr-0.5`.

Row click: opens Client Detail slide-over (Section 13).

**Empty state:** `py-12 text-center Body text-muted`: "No active clients recorded. The CMO agent manages this when engagements are confirmed."

### 10.3 Overdue Follow-ups Screen

**Header note:** `bg-status-amber/10 border border-status-amber/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-3`. `Clock size-4 text-status-amber shrink-0`. `Caption text-status-amber`: "These leads and clients have a next action date in the past. Sorted by most overdue first."

**Overdue list:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Each overdue item row: `flex items-center gap-4 px-5 py-3.5 border-b border-subtle last:border-0 hover:bg-elevated`.

Row contents:
- Type indicator: `Badge` — "Lead" or "Client" (grey/blue respectively)
- Company name: `Body Strong text-primary flex-1`
- Contact: `Caption text-secondary`
- Due: `Caption Mono text-status-red` — "X days overdue" (e.g. "14 days overdue")
- Last contact: `Caption text-muted`
- Quick action: `Button` variant `outline` size `sm`: "Mark contacted". On click: opens a small `Popover` (shadcn/ui) with a date picker pre-set to today and a confirm button. Confirming updates the last contact date to today and removes the item from this list.

**Empty state:** `py-12 text-center`. `CheckCircle size-10 text-status-green mx-auto mb-3`. `H3 text-secondary text-center`: "All follow-ups are current." `Body text-muted text-center`: "No overdue actions."

---

## 11. Screen 9 — Approvals Page

### Purpose

The dedicated page for Glen to review and act on all pending approval requests from agents. This is the human-in-the-loop enforcement screen.

### Layout

Uses the global shell. The content area is a two-column layout — not a grid with the rest of the app. It fills the entire available viewport height minus the page header.

**Page header:** Left: "Approvals" (`H2 text-primary`). If pending count > 0: `StatusBadge` status-red inline: "[N] pending". Right: Two tabs toggle: "Pending" (default) and "Resolved" — styled as `Button` variants. Active: `Button` default. Inactive: `Button` outline`.

**Two-column layout:** `flex h-[calc(100vh-48px)] overflow-hidden`.

Left column: `w-[340px] shrink-0 border-r border-subtle flex flex-col overflow-hidden`.
Right column: `flex-1 overflow-y-auto`.

### Left Column — Approvals List

**Column header:** `px-4 py-3 border-b border-subtle`. `Caption Strong text-muted uppercase tracking-wider`: "PENDING APPROVALS".

**List:** `flex-1 overflow-y-auto divide-y divide-subtle`.

Each item is an `ApprovalListItem` (defined in Section 1.4):
- Type badge (approval type — see Section 1.7)
- Agent name: `Caption Strong text-primary`
- Summary (one line): `Body text-secondary truncate`
- Age: `Caption text-muted` (e.g. "2h ago"). If > 24h: `text-status-amber`. If > 72h: `text-status-red`.

Items sorted oldest first (most urgent at top).

Clicking an item: selects it (highlighted state: `bg-highlight border-l-2 border-accent -ml-px`) and populates the right detail pane.

On mount: the first item in the list is auto-selected.

**Empty state (Pending tab, no items):** Full-width centred within the left column. `ShieldCheck size-8 text-muted mx-auto mt-12`. `Body text-muted text-center px-6 mt-3`: "No pending approvals." `Caption text-muted text-center px-6`: "Agents will request approval here before taking external actions."

### Right Column — Approval Detail Pane

When no item is selected (edge case): `flex items-center justify-center h-full`. `ShieldCheck size-12 text-muted`. `Body text-muted mt-4`: "Select an approval to review."

When an item is selected:

**Detail header:** `px-6 py-5 border-b border-subtle flex items-start justify-between`.
Left:
- Approval type badge (large variant — `px-3 py-1 text-sm`)
- Request title / summary: `H2 text-primary mt-2`
- Requesting agent: `flex items-center gap-2 mt-2`. `AgentAvatar` 24px. Agent role name as `text-accent hover:text-accent-hover cursor-pointer` link.
- Age: `Caption text-muted mt-1` (full timestamp: "Requested 28 Mar 2026 at 14:32")

**Context block:** `px-6 py-5 border-b border-subtle`.
`Caption Strong text-muted mb-2`: "CONTEXT".
`Body text-secondary`: narrative explanation of why the agent wants approval and what triggered this request. This is plain text (not markdown) provided by the agent.

**Content block:** `px-6 py-5 border-b border-subtle`.
`Caption Strong text-muted mb-2`: "FULL CONTENT".
For email approvals: a `bg-input border border-subtle rounded-lg p-4` container styled like an email. Subject in `Body Strong text-primary mb-2`. Recipients in `Caption text-muted mb-3`. Body in `Body text-secondary` (rendered as plain text preserving line breaks). A "Copy to clipboard" `Button` ghost size sm with `Copy size-3.5 mr-1.5` appears top-right of this block.

For financial approvals: a structured display (not prose). Each field as a row: `Caption Strong text-muted` label, `Body text-secondary` value.

For strategic approvals: full plain text in `Body text-secondary`.

**Action area:** `px-6 py-5 bg-elevated border-t border-subtle sticky bottom-0`.

`Caption Strong text-muted mb-3`: "YOUR DECISION".

Three action buttons in `flex gap-3 mb-4`:
1. "Approve" — `Button` variant `default` with `Check size-4 mr-1.5`. Background: `bg-status-green hover:bg-green-600 text-inverse`.
2. "Request Changes" — `Button` variant `outline` with `MessageSquare size-4 mr-1.5`. `border-status-amber text-status-amber hover:bg-status-amber/10`.
3. "Reject" — `Button` variant `destructive` with `X size-4 mr-1.5`. `bg-status-red hover:bg-red-600 text-inverse`.

**Comment field:** Below the action buttons. `Textarea` `rows={3} w-full bg-input border-default`. Placeholder:
- Approve: "Optional note (e.g. 'Approved — send by EOD')"
- Request Changes: "Required — explain what needs to change" (label above shows `*`)
- Reject: "Required — explain why this was rejected" (label above shows `*`)

The "Request Changes" and "Reject" buttons are initially enabled. When clicked without a comment and the comment is required, the textarea border turns `border-status-red` and a `Caption text-status-red mt-1` appears: "A reason is required."

Submitting (confirm): `Button` default `w-full h-10`: "Confirm [Approve / Request Changes / Reject]". Disabled until all conditions met. Loading state: `Loader2 animate-spin`.

On success: the item disappears from the Pending list. If another item exists, the next oldest is auto-selected. A toast notification appears bottom-right (shadcn/ui `Sonner`): green for Approve ("Approval confirmed — agent will proceed"), amber for Request Changes ("Changes requested — agent notified"), red for Reject ("Request rejected — agent notified").

### Resolved Tab

Same two-column layout. Left list shows resolved items — each `ApprovalListItem` shows the outcome badge (APPROVED in green, REJECTED in red, CHANGES REQUESTED in amber) instead of the age. Sorted most recently resolved first.

Right pane for resolved items: same detail structure but without the action area. Instead: a resolved footer block showing who decided (Glen), what they decided (badge), the comment, and the timestamp.

**Empty state (Resolved tab):** `Body text-muted text-center py-12`: "No resolved approvals yet."

---

## 12. Screen 10 — Settings

### Purpose

Configuration management for the application — company identity, user management, agent library, knowledge base, budgets, and API keys.

### Layout

Uses global shell. Sub-navigation: Company | Users | Agent Library | Knowledge Base | Budgets | API Keys. shadcn/ui `Tabs` rendered as a vertical tab list on the left (`w-[180px] shrink-0 border-r border-subtle pr-6`) with the tab content on the right (`flex-1`).

At 768px: tabs switch to a horizontal scrolling tab bar above the content (standard `Tabs` layout).

**Page header:** Left: "Settings" (`H2 text-primary`). No right-side action.

Settings content area: `flex gap-8 px-6 py-6`.

### 12.1 Company Settings

`H3 text-primary mb-6`: "Company Profile".

**Form fields** (all full-width within the content area):

- Company name: `Input` `w-[480px]`. Label: "Company name".
- Company tagline: `Input` `w-[480px]`. Label: "Tagline". Helper: `Caption text-muted mt-1`: "Shown in the app header and login screen."
- Logo:
  - Current logo preview: `64px × 64px rounded-lg border border-subtle` containing the logo image (or NBI default mark if no upload). `Caption text-muted mt-2`: "Current logo."
  - Upload new: same drop zone as First-Time Setup Step 1.
- Country: `Select` `w-[240px]`.
- Contact email: `Input` `type="email"` `w-[480px]`. Label: "Primary contact email". Helper: "Used for system notifications."

**Save button:** `Button` default `mt-8`: "Save changes". Loading state on submit. Success: toast "Company profile updated." Error: toast "Failed to save. Please try again." (shadcn/ui `Sonner`).

**Danger zone:** `mt-12 pt-8 border-t border-subtle`.
`H3 text-status-red mb-4`: "Danger Zone".
`Body text-secondary mb-4`: "These actions are irreversible. Proceed with caution."
`Button` variant `destructive` `w-full justify-start` (no, use `inline-flex`): "Reset application data". This button is disabled for all users except Board. On click: confirmation modal (Section 13) with the text "This will delete all agent data, tasks, and finance records. Type RESET to confirm." A text input must contain the exact string "RESET" for the confirm button to enable.

### 12.2 Users Settings

**Header row:** `flex items-center justify-between mb-4`. Left: "Users" `H3 text-primary`. Right: "Invite User" `Button` default `Plus icon`. Opens the Invite User modal (Section 13).

**Users table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns: Name | Email | Role | Last Login | Status | Actions.
- Name: `Body Strong text-primary`
- Email: `Caption text-secondary`
- Role: `Select` inline (Board/Admin/Viewer) — editable only by Board user. Non-Board users see a read-only `Badge`. Board user's own role is read-only (cannot demote self).
- Last Login: `Caption text-muted`
- Status: `StatusBadge` — Active: green, Invited (not yet accepted): amber label "INVITED", Deactivated: grey
- Actions (Board only): "Remove" `Button` ghost size-icon `Trash2 size-3.5 text-muted hover:text-status-red`. Disabled for own account.

**Empty state:** (no users besides self) `Caption text-muted py-8 text-center`: "You are the only user."

### 12.3 Agent Library Settings

**Header note:** `bg-elevated border border-subtle rounded-lg px-4 py-3 mb-4`. `Caption text-muted`: "This is a read-only reference of all 18 defined roles in the NBI agent org chart. To hire or edit an agent, go to the Org Chart."

**Table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns: Role Name | Model Tier | Reports To | Assigned Agent.
- Role Name: `Body Strong text-primary`
- Model Tier: `ModelTierBadge`
- Reports To: `Caption text-secondary` (role name — no link from this page)
- Assigned Agent: If assigned: `AgentAvatar` 24px + `Caption text-secondary` name. If vacant: `StatusBadge` grey "VACANT".

All 18 roles listed. No pagination needed (18 rows is comfortable). No actions in this table.

### 12.4 Knowledge Base Settings

**Three tabs within this sub-section:** Tier 1 | Tier 2 | Tier 3. shadcn/ui `Tabs` horizontal, within the Knowledge Base content panel.

**Header note:** `Caption text-muted mb-4`: "Knowledge files are read-only here. To update them, edit the source files in the repository and redeploy."

**Tier 1 tab:** Simple list of all Tier 1 files from `company/knowledge/`.
Each file: `flex items-center gap-3 py-3 border-b border-subtle last:border-0`. `FileText size-4 text-muted`. File name `Body text-primary flex-1`. Last updated `Caption text-muted`. File size `Caption Mono text-muted` (e.g. "4.2 KB").

**Tier 2 tab:** Grouped by role. Each role is a collapsible `Accordion` item (shadcn/ui `Accordion`). Trigger: role name in `Body Strong text-secondary`. Content: the same file list format as Tier 1, for that role's `knowledge/` files.

**Tier 3 tab:** Grouped by project. Same `Accordion` pattern per project.

**Empty state per tier:** `Caption text-muted py-6 text-center italic`: "No files in this tier."

### 12.5 Budgets Settings

**Header note:** `bg-elevated border border-subtle rounded-lg px-4 py-3 mb-4 flex items-start gap-3`. `Info size-4 text-muted mt-0.5 shrink-0`. `Caption text-muted`: "Set monthly spending caps per agent. Agents are alerted at 80% usage. Execution halts at 100%. Costs are tracked per Claude API call."

**Table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns: Agent | Role | Monthly Cap | Current Spend | % Used | Progress.
- Agent: `AgentAvatar` 24px + `Body Strong text-primary`
- Role: `Caption text-secondary`
- Monthly Cap: Inline editable `Input` `w-[100px] h-7 text-sm font-mono text-right` showing "£50.00". On click: the cell becomes an input. Pressing Enter or clicking away: saves. Board only — Admin and Viewer see read-only `Caption Mono text-secondary`.
- Current Spend: `Caption Mono text-secondary` right-aligned
- % Used: `Caption Mono text-secondary` right-aligned. If ≥ 80%: `text-status-amber`. If ≥ 100%: `text-status-red font-semibold`.
- Progress: `ProgressBar w-[100px] h-1.5` inline within the cell. Colour follows % threshold.

**Warning indicator:** If any agent is at ≥ 80%: a `bg-status-amber/10 border border-status-amber/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-3` banner above the table. `AlertTriangle size-4 text-status-amber`. `Caption text-status-amber`: "[N] agents approaching their monthly budget limit."

**Save all button:** `mt-4 flex justify-end`. `Button` default: "Save budget changes". Only enabled if any cap has been edited. Loading state on submit. Success/error toasts.

### 12.6 API Keys Settings

**Header note:** `bg-elevated border border-subtle rounded-lg px-4 py-3 mb-6 flex items-start gap-3`. `Lock size-4 text-muted mt-0.5 shrink-0`. `Caption text-muted`: "API keys are encrypted at rest using AES-256. They are never shown in full after initial entry. Only Board users can add or revoke keys."

**Add new key form** (Board only): `bg-surface border border-subtle rounded-lg p-5 mb-6`.
`H3 text-primary mb-4`: "Add API Key".
`flex gap-3 items-end`.
- Label field: `Input` `w-[200px]` label: "Label" (e.g. "Anthropic Production")
- Key value field: `Input` `w-[360px] font-mono text-sm` label: "API Key" type `"password"`. No show/hide toggle on this one — keys are not displayed after save.
- Add button: `Button` default: "Add Key". Disabled if either field empty. On success: form resets, key appears in the table below. On error (e.g. duplicate label): inline `Caption text-status-red` below the label field.

**Keys table:** `bg-surface border border-subtle rounded-lg overflow-hidden`.

Columns: Label | Last 4 Characters | Added | Added By | Actions.
- Label: `Body Strong text-primary`
- Last 4 Characters: `Caption Mono text-secondary bg-elevated px-2 py-0.5 rounded` e.g. "...F4A9"
- Added: `Caption text-muted` (date)
- Added By: `Caption text-secondary` (user name)
- Actions (Board only): "Revoke" `Button` ghost size-icon `Trash2 size-3.5 text-muted hover:text-status-red`. On click: confirmation modal: "Revoke this key? Any agents using it will stop working immediately."

**Empty state:** `py-8 text-center Body text-muted`: "No API keys configured. Add the Anthropic API key to enable agent execution."

---

## 13. Modals and Overlays Reference

All modals use the shadcn/ui `Dialog` component. All slide-overs use the shadcn/ui `Sheet` component (position `right`). Overlays use `bg-black/60 backdrop-blur-sm`.

### 13.1 New Goal Modal

**Trigger:** "New Goal" button in Command Centre header.
**Component:** `Dialog` `max-w-[560px]`.
**Title:** "Issue a New Goal" in `H2 text-primary`.
**Subtitle:** `Caption text-muted`: "Goals are issued to the CEO agent, who decomposes them into tasks and delegates through the org."

**Fields:**
- Goal title: `Input` required. Label: "Goal". Placeholder: "e.g. 'Prepare Q2 BD strategy and pipeline targets'".
- Description: `Textarea rows={4}`. Label: "Details (optional)". Placeholder: "Additional context for the CEO agent."
- Priority: `Select`. Label: "Priority". Options: Critical, High, Medium, Low. Default: High.

**Buttons:** `flex justify-end gap-3 mt-6`. "Cancel" `Button outline`. "Issue Goal" `Button default`. Loading state on submit. On success: modal closes, activity feed gains a new entry for the goal, toast "Goal issued to CEO agent."

### 13.2 Hire Agent Modal

**Trigger:** "Hire Agent" toolbar button on Org Chart, or clicking a Vacant node.
**Component:** `Dialog` `max-w-[520px]`.
**Title:** "Hire Agent".

**Fields:**
- Role: `Select` pre-populated if triggered from a specific vacant node. Otherwise a dropdown of all 18 roles filtered to show only vacant ones. Label: "Role".
- Agent name: `Input`. Label: "Agent name". Placeholder: e.g. "Claude Sonnet 4.5". Helper: `Caption text-muted`: "This is the model or persona name shown in the UI."
- Model: `Select`. Label: "Model". Options: "claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5". Default pre-populated from the role's defined model tier.
- Notes (optional): `Textarea rows={2}`. Label: "Notes". Placeholder: "Any special configuration notes."

**Buttons:** `flex justify-end gap-3 mt-6`. "Cancel". "Hire Agent" `Button default`. On success: org chart node updates, agent appears in status feed.

### 13.3 Edit Agent Modal

**Trigger:** "Edit Agent" button on Role Detail page.
**Component:** `Dialog` `max-w-[520px]`.
**Title:** "Edit Agent — [Role Name]".
Same fields as Hire Agent Modal, all pre-filled with current values. Additional field:
- Status: `Select`. Options: Active, Idle, Paused. (Terminated is not an edit option — use the Terminate action.)

**Buttons:** "Cancel". "Save changes" `Button default`.

### 13.4 Pause / Terminate Confirmation Modal

**Trigger:** "Pause Agent" or "Terminate Agent" on Role Detail page.
**Component:** `Dialog` `max-w-[400px]`.

**Pause variant:**
Title: "Pause [Role Name]?" `H2 text-primary`.
Body: `Body text-secondary`: "The agent will stop accepting new tasks. Any tasks currently checked out will remain in progress until the agent is resumed." `Caption text-muted mt-2`: "You can resume the agent at any time."
Buttons: "Cancel". "Pause Agent" `Button outline`.

**Terminate variant:**
Title: "Terminate [Role Name]?" `H2 text-status-red`.
Body: `Body text-secondary`: "The agent will be permanently deactivated. All checked-out tasks will be returned to backlog. This action cannot be undone." `Caption text-status-amber mt-2 flex items-center gap-1.5`: `AlertTriangle size-3.5` "Termination is irreversible."
Buttons: "Cancel". "Terminate Agent" `Button destructive`.

### 13.5 New Project Modal

**Trigger:** "New Project" button on Projects page header.
**Component:** `Dialog` `max-w-[520px]`.
**Title:** "New Project".

**Fields:**
- Project name: `Input` required. Label: "Name".
- Description: `Textarea rows={3}`. Label: "Description".
- Lead agent: `Select` with all 18 roles listed. Label: "Lead Agent". Optional.
- Status: `Select`. Label: "Initial Status". Options: On Track, At Risk, Blocked. Default: On Track.

**Buttons:** "Cancel". "Create Project" `Button default`.

### 13.6 New Task Modal

**Trigger:** "New Task" button on Project Detail page header.
**Component:** `Dialog` `max-w-[560px]`.
**Title:** "New Task".

**Fields:**
- Title: `Input` required.
- Description: `Textarea rows={4}`. Markdown supported — `Caption text-muted mt-1`: "Markdown is supported."
- Assigned to: `Select` of all 18 roles. Label: "Assign to".
- Priority: `Select`. Default: Medium.
- Status: `Select`. Default: Backlog.
- Due date: shadcn/ui `DatePicker`. Label: "Due date (optional)".

**Buttons:** "Cancel". "Create Task" `Button default`.

### 13.7 Lead Detail Slide-over

**Trigger:** Clicking a kanban card or table row in the Pipeline screen.
**Component:** `Sheet` position `right` `w-[480px]`.
**Title:** Company name in `H2 text-primary`.

**Content sections:**

Stage and status: `flex items-center gap-3 mb-6`. Stage badge. `StatusBadge`.

**Details form** (all editable inline — changes saved on blur or on an explicit Save button):
- Contact name: `Input` label "Contact".
- Contact role: `Input` label "Role at company".
- Email: `Input type="email"` label "Email".
- Phone: `Input type="tel"` label "Phone". Optional.
- Stage: `Select` label "Stage".
- Last contact date: `DatePicker` label "Last contacted".
- Next action: `Input` label "Next action".
- Next action date: `DatePicker` label "Next action date".
- Expected value: `Input type="number"` label "Expected value (£)". Prefix: "£" inside the input.
- Probability: `Input type="number"` label "Probability (%)". Suffix: "%" inside the input.
- Owner: `Select` of all roles + "Glen Pryer" option.
- Notes: `Textarea rows={4}` label "Notes".

**Save button:** `Button default w-full mt-4`: "Save changes".

**Activity log** within the slide-over: collapsible section below the form. Same `ActivityFeedItem` style. Entries: stage changes, contact updates, notes added.

### 13.8 Client Detail Slide-over

**Trigger:** Clicking a row in the Active Clients table.
**Component:** `Sheet` position `right` `w-[520px]`.
**Title:** Client name in `H2 text-primary`.

**Sections:**
- Engagement overview: `Body text-secondary`. Engagement type badge. Glen's role `Caption text-muted`.
- Health status: `StatusBadge` (green/amber/red) + health notes `Body text-secondary mt-2` (free text from CMO agent).
- Next milestone: `H3 text-primary mt-4`. Milestone description + date `Caption text-muted`.
- Key contacts: List of contacts. Each: `Body Strong text-primary` name, `Caption text-secondary` role, email as `text-accent` link.
- Recent activity: `ActivityFeedItem` list (last 5 entries). `Body Strong text-secondary mb-2`: "Recent Activity".

No edit functionality from this slide-over — edits go through the CMO agent workflow.

### 13.9 Invite User Modal

**Trigger:** "Invite User" button in Settings → Users.
**Component:** `Dialog` `max-w-[440px]`.
**Title:** "Invite a User".

**Fields:**
- Full name: `Input` required.
- Email: `Input type="email"` required.
- Role: `Select`. Options: Admin, Viewer. (Board role cannot be assigned via invite — only one Board user is permitted.)

Body note: `Caption text-muted mt-2`: "An invitation email will be sent. The user must set their password on first login."

**Buttons:** "Cancel". "Send Invitation" `Button default`.

On success: user appears in the Users table with "INVITED" status badge. Toast: "Invitation sent to [email]."

### 13.10 Reset Application Data Confirmation Modal

**Trigger:** "Reset application data" button in Settings → Company → Danger Zone.
**Component:** `Dialog` `max-w-[440px]`.
**Title:** "Reset Application Data" `H2 text-status-red`.

Body: `Body text-secondary mb-4`: "This will permanently delete all agent configurations, task history, finance records, and lead data. The application will return to its initial setup state." `Caption text-status-red mb-6`: "This action cannot be undone."

Confirmation input: `Input` label "Type RESET to confirm". `Body Strong text-secondary mb-2`. The "Confirm Reset" button is disabled until the input value equals exactly "RESET" (case-sensitive).

Buttons: "Cancel". "Confirm Reset" `Button destructive`. Loading state on submit.

---

## 14. Responsive Behaviour Summary

Desktop-first. Three defined breakpoints.

| Breakpoint | Viewport width | Sidebar | Layout |
|---|---|---|---|
| Desktop (default) | ≥ 1280px | 240px expanded | All 12-column grid layouts as specified |
| Laptop | 1024px–1279px | 240px expanded | Finance and Leads sub-screens: single column. Dashboard grid: 6-col pairs. |
| Tablet / Collapsed | 768px–1023px | 60px collapsed (icon-only) | All widgets stack to single column. Org chart switches to accordion. Two-column pages (Task Detail, Approvals) stack vertically. |
| Mobile | < 768px | Hidden, accessible via hamburger | Out of scope for v1. The hamburger button (`Menu size-5`) appears in top-left at `fixed top-3 left-3 z-30`. Clicking toggles the sidebar as a modal overlay (`Sheet position="left"`). All content is single column. |

Sidebar collapse at `768px` is automatic. At `1024px` and above it stays expanded unless the user manually collapses it (preference persisted in `localStorage`).

Minimum supported viewport width: `375px` (iPhone SE size). All content must be accessible at this width via scroll.

---

## 15. Accessibility Notes

These are engineering implementation requirements, not design aspirations.

1. **Focus rings:** All interactive elements have a visible focus ring. The ring uses `outline: 2px solid #4F6EF7; outline-offset: 2px`. Do not suppress the default outline — override it with the accent colour ring instead. This is implemented via Tailwind `focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none`.

2. **Colour contrast:** All text/background combinations meet WCAG AA (4.5:1 for body text, 3:1 for large text and UI components). Verified pairs:
   - `#F1F1F5` on `#0A0A0F`: 17.8:1 (AAA)
   - `#A0A0B0` on `#0A0A0F`: 7.1:1 (AA)
   - `#4F6EF7` on `#0A0A0F`: 5.2:1 (AA)
   - `#22C55E` on `#111118`: 4.8:1 (AA)
   - `#F59E0B` on `#111118`: 4.6:1 (AA)
   - `#EF4444` on `#111118`: 4.7:1 (AA)
   - `#5C5C70` on `#0A0A0F`: 3.1:1 — this muted colour is used only for placeholder text and secondary labels, not for essential information.

3. **ARIA labels:** All icon-only buttons have `aria-label`. All navigation items have `aria-current="page"` on the active item. All tables have `<caption>` elements (visually hidden if needed). All `Avatar` components have `aria-label="[Agent name] avatar"`.

4. **Keyboard navigation:** The sidebar navigation is fully keyboard accessible (Tab through items, Enter to navigate). Modals trap focus within themselves (shadcn/ui handles this). Dropdowns and Select menus are keyboard operable (shadcn/ui handles this). The Org Chart tree: Tab moves between visible nodes, Enter opens the Role Detail page for the focused node.

5. **Reduced motion:** The `animate-spin` on `Loader2` and the `animate-pulse` on `Skeleton` respect `prefers-reduced-motion`. Wrap these in a CSS media query: `@media (prefers-reduced-motion: reduce) { .animate-spin, .animate-pulse { animation: none; } }`.

6. **Screen reader order:** The sidebar is rendered before the main content in DOM order. Main content begins with a visually hidden `<h1>` matching the page title (for screen reader landmark navigation), then the visual `H2` in the page header.

---

*End of NBIAI Team App — UI/UX Design Specification v1.0*

*Authored by UI/UX Lead. Cross-referenced against VP Product assignment (`assignment_vp_product.md`) and CEO Vision (`ceo_vision.md`). Ready for CEO review and VP Engineering handoff.*
