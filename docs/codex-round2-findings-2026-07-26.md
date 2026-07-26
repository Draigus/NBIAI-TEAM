# Codex adversarial review, round 2 -- 2026-07-26

Against the uncommitted Finance-view + defect-sweep working tree. Model gpt-5.6-sol, codex-cli 0.145.0, `codex exec --sandbox read-only`.

**7 findings, 3 of them P1. NONE fixed at time of writing.** See docs/HANDOFF.md Part 3.

## Findings

1. [dashboard-server/lib/hiring-export.js:53](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/lib/hiring-export.js:53)  
   **P1: The workbook still exports a day rate when currency is missing.**  
   `dayRateFor()` validates engagement, amount and basis, but not `compensation_currency`. I reproduced an annual contractor with `72000` and no currency exporting `333.33`, an `18/mo` basis and a blank Currency cell. The screen correctly suppresses the same figure.  
   **Fix:** Require a non-empty currency before returning a day rate. Make `dayRateBasisFor()` return `no currency recorded`, and add the missing-currency equivalent of the missing-basis export test.

2. [dashboard-server/public/js/domains/nbi-hiring-plan.js:518](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/public/js/domains/nbi-hiring-plan.js:518)  
   **P1: The KPI totals still count future and undated hires as current pay.**  
   The loop includes every `cr.state === 'hired'`, without checking `cr.start_month <= _hpCurrentMonthKey()`. A filled role starting later, or with no start date, is included in `approvedMonthly` and `combinedMonthly`; line 540 then says those roles are “being paid”. This contradicts the corrected Finance totals.  
   **Fix:** Reuse the Finance coverage partition, or apply the same start-month gate. Either show current spend from `startedPence`, or explicitly relabel these KPIs as filled-role run-rate.

3. [dashboard-server/public/js/domains/nbi-hiring-plan.js:523](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/public/js/domains/nbi-hiring-plan.js:523)  
   **P1: KPI warnings can conceal omitted roles and name the wrong base-only cause.**  
   When base-only and entirely uncosted roles coexist, lines 537–550 show only the base-only warning because of the `if/else if`; the uncosted roles contributing zero disappear from the disclosure. The approved KPI has no approved-uncosted counter at all. Additionally, any base-only row is described as an FTE missing its weighting percentage, including a row whose real cause is missing engagement type.  
   **Fix:** Track approved/combined uncosted roles independently, split base-only counts by FTE-default versus missing-engagement cause, and render every applicable warning rather than mutually exclusive messages.

4. [dashboard-server/public/js/domains/nbi-hiring-plan.js:2247](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/public/js/domains/nbi-hiring-plan.js:2247)  
   **P2: The sidebar still bypasses the refusal ladder.**  
   “Exact budget” falls back directly to `no salary on record`. A role with a real amount but missing basis or currency therefore reports the wrong cause in the sidebar, while Plan and Finance report it correctly.  
   **Fix:** Use `_fmtBudget(p) || _hpBudgetRefusal(p, p.compensation_basis)`.

5. [dashboard-server/public/js/domains/nbi-hiring-plan.js:582](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/public/js/domains/nbi-hiring-plan.js:582)  
   **P2: Current-month classification depends on the viewer’s browser timezone.**  
   `getFullYear()` and `getMonth()` use local browser time. Around a month boundary, a viewer outside the business timezone can place a role into a different “being paid now” bucket from a UK viewer. The lexical comparison itself is correct because both keys are zero-padded `YYYY-MM`.  
   **Fix:** Make the server return an authoritative `as_of_month`, preferably based on the application’s Europe/London financial calendar, and use that key in every current-cost calculation.

6. [dashboard-server/lib/hiring-export.js:254](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/lib/hiring-export.js:254)  
   **P2: The exported Day Rate Formula is false for monthly contracts.**  
   The workbook states `annual contract value / 12 / ...`, but `dayRateFor()` correctly calculates monthly contracts as `monthly amount / days`. A workbook containing a monthly contractor therefore provides the wrong reproduction formula.  
   **Fix:** State all branches: annual ÷ 12 ÷ days, monthly ÷ days, and recorded daily rate unchanged. Add a monthly-basis workbook test.

7. [dashboard-server/migrations/088_contractor_workdays_per_month.sql:66](D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server/migrations/088_contractor_workdays_per_month.sql:66)  
   **P3: A remaining migration comment contradicts the corrected ordered-run explanation.**  
   Lines 27–33 correctly say fresh databases run 087 and then rename its column. Line 66 still says the trailing `ADD COLUMN` covers the fresh-database case where 087’s column never existed.  
   **Fix:** Describe it as defensive handling for an abnormal database with neither column.

## Clean categories

- Finance coverage buckets are mutually exclusive. Every returned cost row lands in denied, started, starting later, no start date or planned. The full run-rate is exactly the sum of the four displayed monetary parts.
- `_fmtBudget()` cannot reach `.trim()` with a missing or non-string currency through its current role call sites.
- No new exploitable interpolation was found. New `title` and `aria-label` values are constructed from fixed text, normalised dates or numeric values.
- No current CSS cascade collision remains in the print properties reviewed.
- The advertised accessor correctly applies FX normalisation.
- The changed test assertions are not themselves wrong. They do not cover the export missing-currency path, KPI temporal classification, mixed KPI omission warnings or month-boundary timezone behaviour.

All six modified JavaScript and test files passed `node --check`. Vitest could not collect tests because the read-only environment denied creation of its temporary directory and results cache.

VERDICT: ISSUES FOUND.
