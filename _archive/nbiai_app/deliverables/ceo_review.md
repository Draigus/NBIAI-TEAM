# CEO Review -- NBIAI Team App Deliverables 1-3

**Reviewer:** CEO Agent
**Date:** 28 Mar 2026
**Review scope:** Three pre-sprint deliverables submitted for sign-off before VP Engineering begins Sprint 1

| Deliverable | Owner | Document |
|---|---|---|
| 1. Feature Specification | VP Product | `projects/nbiai_app/deliverables/feature_spec.md` |
| 2. Technical Architecture | CTO | `projects/nbiai_app/deliverables/technical_architecture.md` |
| 3. UI/UX Design Specification | UI/UX Lead | `projects/nbiai_app/deliverables/design_spec.md` |

---

## Overall Verdict: Approved with Notes

All three deliverables are approved for VP Engineering to begin Sprint 1. The quality across the board is strong. Each document achieves the standard I set: a senior engineer should be able to pick up any section and implement it without asking a clarifying question. The three documents demonstrate clear cross-referencing and the teams have evidently coordinated. The notes below are not blockers -- they are items VP Engineering must be aware of during implementation, and items I expect the relevant owners to clarify when engineering surfaces them.

---

## Deliverable 1: Feature Specification (VP Product)

### What is strong

- **Completeness.** Every screen, every data object, every field, every validation rule, every error state, every empty state. This is not a wireframe dressed up as a spec. It is an implementation manual. Exactly what I asked for.
- **Edge case coverage.** The checkout/checkin model, status transition matrix, task cascade documentation, and approval workflow are all specified with precision. The status transition table (Section 6.5) is particularly well done -- it eliminates ambiguity about what moves are legal.
- **User role separation.** The three-role model (Board, Admin, Viewer) is clearly mapped to every screen and every action. No grey areas.
- **British English.** Consistent throughout. Spellings correct (organisation, colour, etc.).

### Gaps and observations

1. **Agent status enum mismatch with CTO's schema.** The feature spec defines agent status options as `active`, `idle`, `blocked`, `paused`, `error`, `offline` (Section 3.1). The CTO's database schema defines the agent_status enum as `active`, `idle`, `running`, `paused`, `terminated`. "Blocked", "error", and "offline" do not exist in the database enum. "Running" and "terminated" do not appear in the feature spec's status list. VP Engineering must reconcile this before writing the first line of code. The CTO's enum is the source of truth for the database; the feature spec's status set is the source of truth for the UI. Either the database enum needs expanding or the UI must map display states from a smaller set of stored values. I expect CTO and VP Product to agree on the resolution and document it.

2. **Revenue currency inconsistency.** The feature spec's Finance section defines revenue entries with `amount_gbp` as the primary field and `amount_usd` as secondary (Section 8.1). The CTO's database schema uses `amount_usd` as the primary column with a `currency` varchar field (Section 1.17). The feature spec says "GBP as primary display, USD as secondary." The CTO says "USD" with a currency field. This must be resolved before the Finance APIs are built. Glen's business runs in GBP; the agent costs run in USD. Both need first-class support, but the primary currency for the UI and financial reporting must be settled. My recommendation: GBP primary for revenue and payroll display, USD for agent costs. The database should store amounts in their native currency with the currency code alongside.

3. **Pagination approach differs.** The feature spec specifies offset-based pagination with page size selectors (25, 50, 100) and page numbers. The CTO specifies cursor-based pagination with limit and cursor parameters. These are not interchangeable. Cursor-based is the correct choice for large data sets and real-time feeds (the CTO's approach), but offset-based is simpler for the UI and expected by users in tabular views. VP Engineering should use cursor-based pagination on the API layer and translate to page numbers in the frontend where the feature spec calls for numbered pages.

4. **Task `project_id` nullable vs required.** The feature spec defines `project_id` on Task as nullable (Section 6.1). The CTO's schema defines it as `NOT NULL` with a required foreign key (Section 1.9). The CTO's constraint is stricter. This matters because the feature spec allows creating tasks without a project (free-floating tasks). If the CTO's schema is followed, every task must belong to a project. I side with the CTO here -- every task should belong to a project. If Glen issues a goal without a specific project context, create a default "General" project to hold unassigned work.

5. **Quick Stats bar count differs.** The feature spec shows 5 stat cards (Section 2.3). The design spec shows 4 stat cards (Section 4.1). The design spec's 4-card layout (Open Tasks, Agents Active, Goals In Progress, Pending Approvals) is the cleaner set. VP Product should confirm whether the "Tasks Blocked" card was intentionally dropped by the design or if it needs reinstating.

---

## Deliverable 2: Technical Architecture (CTO)

### What is strong

- **Schema rigour.** 23 tables, 14 enum types, all with column types, constraints, indexes, and partial unique indexes where appropriate. The `task_checkouts` table with its partial unique index is a smart design for atomic checkout enforcement. The separation of `roles` (static config) from `agents` (instantiated roles) is correct and future-proof.
- **Agent execution flow.** The 13-step execution run (Section 3.2) is the beating heart of this application and it is specified with no gaps. The context loading hierarchy (Section 3.3) with explicit token budgets per tier and per model is exactly the level of detail I needed to see.
- **Fastify over Express.** Well-justified decision. The JSON Schema validation and TypeScript-first approach align with the codebase philosophy.
- **11 development phases.** Each phase has clear acceptance criteria with checkboxes. These are directly usable by VP Engineering for sprint planning.
- **Security model.** Argon2id, AES-256-GCM for API keys, JWT with refresh token rotation, replay detection, RBAC middleware. No shortcuts. This is production-grade.

### Gaps and observations

1. **Password hashing algorithm difference.** The feature spec says `bcrypt` for password hashing (Section 1.1). The CTO specifies `Argon2id` (Section 5.3). Argon2id is the stronger choice and I back the CTO's decision. VP Product should update the feature spec to reflect this. VP Engineering should implement Argon2id.

2. **Refresh token storage.** The feature spec says the refresh token is stored in a cookie and the raw token is stored in the Session table. The CTO says the token is hashed with SHA-256 before storage and the raw token is never persisted. The CTO's approach is more secure. VP Engineering follows the CTO's specification.

3. **First-time setup flow.** The feature spec describes a 3-step wizard where the board user creates the company, account, and optionally configures the API key, all through the UI. The CTO describes a seed script that runs on first deployment and creates the company, board user, all 18 roles, and default agents from environment variables. These are fundamentally different approaches. The CTO's seed script is faster for initial deployment but the feature spec's setup wizard provides a better user experience. My decision: implement both. The seed script runs on first deployment for the initial data. The setup wizard runs if no board user exists yet (i.e. the seed created the roles and agents but not the user account). The setup wizard creates the board user account and optionally configures the API key. This gives us the best of both.

4. **Companies table includes `slug`, `contact_email`, `website`, and `settings` columns.** The feature spec's Company object does not include these fields. They are not harmful and provide future flexibility. VP Engineering should include them in the schema but the UI does not need to expose them all in v1.

5. **No `avatar_url` on users table in CTO schema.** The feature spec includes `avatar_url` on the User data object. The CTO's users table does not have this column. It should be added. Avatars appear in the top bar, sidebar, and comment threads.

6. **Activity log retention.** The CTO specifies 90-day retention with weekly archival. This is not mentioned in the feature spec. It is a good operational decision but Glen should be aware that activity data older than 90 days will not be visible in the app unless we build an archive viewer (out of scope for v1).

---

## Deliverable 3: UI/UX Design Specification (UI/UX Lead)

### What is strong

- **Typography decision.** The UI/UX Lead has correctly overridden the company-level design convention. The CLAUDE.md file says "Orbitron for headings." The design spec explicitly states "Do not use Orbitron in this application" and uses Inter throughout, with JetBrains Mono for code/monospace contexts. The rationale is sound: Orbitron is the Playsage marketing typeface; this is a data-dense professional tool. Inter is the right choice. I approve this deviation from the company default.
- **Colour system.** The layered background system (base, surface, elevated, input, highlight) is thoughtful. Five layers of dark background prevent the flat, featureless look that plagues dark-mode dashboards. The accent colour shift from `#3B82F6` (mentioned in the feature spec) to `#4F6EF7` is justified with contrast ratios and readability reasoning.
- **Component catalogue.** Every custom component is defined with exact Tailwind classes, exact dimensions, exact colour tokens. StatusBadge, ModelTierBadge, AgentAvatar, StatCard, ActivityFeedItem, TreeNode, KanbanCard -- all specified to pixel precision.
- **Motion restraint.** The design spec is disciplined about animation: 80-200ms transitions for interactive elements, no animation on data-dense tables. This is the right call for a control-plane tool.
- **Status colour semantics.** Clearly defined, non-negotiable, and consistent across agent status, task status, project health, approval types, and priority levels.

### Gaps and observations

1. **Accent colour mismatch.** The feature spec references `#3B82F6` (Tailwind blue-500) as the electric blue accent. The design spec uses `#4F6EF7` (Electric Indigo Blue). The design spec provides a strong rationale for the change (better contrast, less consumer-looking). I accept the design spec's colour. VP Product should update the feature spec to reference `#4F6EF7`. VP Engineering uses `#4F6EF7`.

2. **Sidebar width differs.** The feature spec says 256px expanded, 64px collapsed. The design spec says 240px expanded, 60px collapsed. The design spec's values are correct (they align with the spacing system). VP Engineering uses 240px/60px.

3. **Quick Stats layout.** As noted above, the design spec shows 4 stat cards on the Command Centre; the feature spec shows 5. The design spec uses `grid-cols-4`. VP Product and UI/UX Lead should confirm which set is final. I lean towards the design spec's 4-card layout, as "Tasks Blocked" is already visible in the Active Projects widget and the Agent Status Feed.

4. **Finance navigation icon.** The feature spec uses `PoundSterling` for the Finance nav icon. The design spec uses `BarChart2`. The design spec's choice is better -- `PoundSterling` is too specific (the finance section covers more than just revenue) and `BarChart2` is more universal for a finance dashboard. VP Engineering uses `BarChart2`.

5. **Model tier badge colours.** The Agent Status Widget in the feature spec says Opus is "purple", Sonnet is "blue", Haiku is "grey". The design spec's ModelTierBadge defines Opus as accent-coloured (the electric indigo) and Sonnet as grey/muted. "Purple" does not exist in the design system's colour tokens. VP Engineering follows the design spec.

---

## Cross-Document Alignment Assessment

### Where the three documents align well

- **Data objects and field names.** With the minor exceptions noted above, the feature spec's data objects and the CTO's database tables are closely aligned. The naming conventions are consistent (snake_case in the database, camelCase implied in the API).
- **Navigation structure.** Both the feature spec and the design spec agree on the 8 navigation items, their order, their icons (with the Finance icon being the one exception), and the sidebar behaviour.
- **Approval workflow.** All three documents describe the same approval flow: agent requests approval, execution pauses, Glen reviews in the UI, Glen approves/rejects/requests changes, agent is notified. The CTO's architecture shows the technical implementation, the feature spec shows the UI states, and the design spec shows the visual treatment.
- **Real-time architecture.** The feature spec describes what the user sees (live status updates on the dashboard). The CTO specifies how it works (PostgreSQL LISTEN/NOTIFY to WebSocket). The design spec describes the visual feedback (row flash animation on status change). All three are compatible.
- **Sprint build order.** The CEO vision document specifies 6 sprints. The CTO's architecture specifies 11 development phases. The 11 phases map cleanly into the 6 sprints. Sprint 1 covers Phases 1-2 (database + auth). Sprint 2 covers Phases 3 and 8 (core APIs + Command Centre/Org Chart frontend). This is workable.

### Where the documents contradict each other

1. **Agent status enum** -- feature spec vs CTO schema (described above). Must be resolved.
2. **Currency handling** -- feature spec (GBP primary) vs CTO schema (USD primary). Must be resolved.
3. **Password hashing** -- feature spec (bcrypt) vs CTO (Argon2id). CTO wins. Feature spec to be updated.
4. **Accent colour** -- feature spec (#3B82F6) vs design spec (#4F6EF7). Design spec wins.
5. **Sidebar width** -- feature spec (256/64) vs design spec (240/60). Design spec wins.
6. **Quick Stats card count** -- feature spec (5) vs design spec (4). Needs confirmation; likely design spec wins.
7. **Task project_id** -- feature spec (nullable) vs CTO (NOT NULL). CTO wins; create a default project for orphan tasks.

None of these are show-stoppers. They are all resolvable and I have given direction on each one above.

---

## Risks and Concerns for Engineering

1. **Context window management is the highest technical risk.** The agent execution layer assembles Tier 1 + Tier 2 + Tier 3 knowledge plus task context for every execution. Token counting, truncation priority, and graceful degradation when context exceeds budgets must be tested rigorously. If this is wrong, agents produce hallucinated or context-poor output and the whole platform loses trust.

2. **WebSocket reliability in production.** The real-time layer depends on a persistent PostgreSQL listener connection and WebSocket connections to all clients. Railway's deployment model (container replacement) will terminate WebSocket connections on every deploy. The client reconnection logic must be bulletproof. Test this early and test it often.

3. **Agent execution concurrency.** The in-memory queue with a concurrency limit of 5 is fine for v1, but it means the queue state is lost on process crash. If 4 agents are mid-execution when the process restarts, those executions are lost. The heartbeat scheduler will re-trigger them, but the in-flight work is gone. VP Engineering should log execution start and recovery prominently so Glen can see if executions are being dropped.

4. **Budget enforcement race condition.** The pre-execution budget check and post-execution budget update are not atomic. If two executions for the same agent run concurrently (unlikely given the queue, but possible with manual triggers), the budget could be exceeded. The CTO's atomic SQL UPDATE mitigates this for the post-update, but the pre-check could still read stale data. VP Engineering should add a row-level lock (`SELECT ... FOR UPDATE`) on the budget check.

5. **Seed data vs setup wizard.** As noted above, the CTO's seed script and the feature spec's setup wizard need to coexist. VP Engineering must design the first-run flow to handle both: seed creates roles and agents; wizard creates the board user. If the seed has already created a board user (from the environment variable), the wizard should detect this and skip to API key configuration.

6. **No charting library specified in the feature spec.** The design spec does not specify a charting library either. The CTO's architecture lists `recharts` in the client dependencies. VP Engineering should use `recharts`. It integrates cleanly with React and Tailwind.

---

## Decisions Made in This Review

| Decision | Resolution | Binding On |
|---|---|---|
| Password hashing | Argon2id (CTO's spec) | VP Engineering, VP Product (update feature spec) |
| Accent colour | `#4F6EF7` (design spec) | VP Engineering, VP Product (update feature spec) |
| Sidebar dimensions | 240px/60px (design spec) | VP Engineering |
| Finance nav icon | `BarChart2` (design spec) | VP Engineering |
| Task project_id | NOT NULL (CTO's spec); create "General" project for orphan tasks | VP Engineering |
| Refresh token storage | SHA-256 hashed (CTO's spec) | VP Engineering |
| First-run flow | Seed script for roles/agents; setup wizard for board user account | VP Engineering, CTO |
| Currency handling | GBP primary display for revenue/payroll; USD for agent costs. Database stores native currency with code | VP Engineering, CTO, VP Product |
| Agent status enum | VP Engineering to reconcile. UI may map display states from a reduced stored set | VP Engineering, CTO, VP Product |
| Quick Stats card count | Confirm with VP Product and UI/UX Lead. Default to 4 (design spec) unless VP Product overrides | VP Product, UI/UX Lead |
| Charting library | recharts | VP Engineering |

---

## Sign-Off

I am satisfied that all three deliverables meet the quality bar required to unblock engineering. The gaps identified above are implementation-level details that VP Engineering can resolve during Sprint 1, with the direction I have given.

**Verdict: Approved with notes.**

VP Engineering is authorised to begin Sprint 1 immediately. The assignment follows in a separate document.

**CEO Agent**
28 Mar 2026
