# Pipeline State

Last updated: 2026-07-02 21:30 (cadence 21:30 -- bank recompilation; 4 banks compiled: production_methods, industry_current, client_couch_heroes, client_patterns)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 274 | 2026-07-02 | daily 19:00 local (intel-ingest task, Granola MCP) -- last checked 2026-07-02 (13 new; 8 meetings with content Jul 1-2 + 1 future-dated note with content processed; 2 had no summary skipped; restricted content not written per Pending Review below) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 134 | 2026-07-02 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-07-02 | 121 | 494 | 60d | current |
| industry_current | 2026-07-02 | 81 | 384 | 7d | current -- next recompile due 2026-07-09 |
| client_couch_heroes | 2026-07-02 | 106 | 501 | never expires | current -- SIZE FLAG: 501 lines (1 over 500-line cap; bank tightened from ~587 during compilation; split decision pending Glen review) |
| forecast_models | 2026-07-01 | 37 | ~650 | 30d | current -- SIZE FLAG: ~650 lines over 500-line cap; split decision pending Glen review |
| personal_insights | 2026-07-01 | 26 | ~210 | never expires | current -- 1 new extract (CEO founder priority framework) below 3-extract threshold |
| client_patterns | 2026-07-02 | 71 | 391 | 14d | current |
| games_pitch_decks | 2026-06-27 | 32 | 328 | 30d | current -- 0 new extracts; 5 days stale; below 14-day threshold |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision. New restricted extracts added 2026-06-17: 2026-06-17_ch-hr-terminations-june-17.md (Charlie/Alon/Ella termination decisions, Nicholas/Panos offboarding — named employees, active termination proceedings), 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments — Pair, Auto, Alex, Richard Watson). New restricted extracts added 2026-06-18: 2026-06-18_ch-hr-decisions-june-18.md (Charlie termination, Ella/Yorgos/Anthony Spain arrangements, Graham warning, hiring decisions), 2026-06-18_ch-team-capability-art-june-18.md (named art team performance assessments).
- Bank suggestions pending: 6 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch, games_design [NEW: 4 extracts from 2026-06-22 ingest -- entity/component emergence architecture, social design spectrum, quest taxonomy, corruption/PVP honey pot; requires Glen approval to create])
- Banks needing recompilation: none -- all 7 banks current as of 2026-07-02 cadence run.
- Restricted not written 2026-06-22: Charlie follow-up separation proceedings (Jun 19, named employee active HR matter), Glen full-time offer from Aris ~£250k+equity (Jun 22, contract terms), Glen Greece citizenship/tax plan (Jun 22, personal financial/legal)
- Restricted not written 2026-06-22 Production Meeting (7723024a): James being let go (named employee, active termination), Alon departure with trigger details (named employee, disciplinary circumstances), Glen full-time offer £280k+Greece relocation ~£400k equivalent (duplicate of above)
- Restricted not written 2026-06-23 Executive Meeting (d9fe54d4): PO (Pär), Otto, Chris Southall CTO candidate assessments with named individuals and salary expectations (~€350k flagged), David Art Director performance concerns (named employee, active HR -- habituating team to walk over him), Stefano underperformer situation (named employee, unaware of expectations)
- Restricted not written 2026-06-23 Work Work Work (ad9cc165): Dino termination (no-notice, military absence), Ella contract closure (performance output), Charlie final payment confirmation, Kyron removal from payroll, Matt contractor-to-FTE decision, Daniel onboarding/resignation deadline (all named employees, active HR/payroll matters)
- Restricted not written 2026-06-24 Hiring update (5106de07): Sean offer accepted (contract pending address), Johanna offer at 500 euros/day, Peter Hartman on hold (US relocation concern), Eric Fang assessment (job-hop pattern, side projects -- named candidates with outcome data)
- Restricted not written 2026-06-24 Game direction alignment (f181174b): Seth/Yorgos/Maria performance quadrant assessments, Ella/Maddalena HR authority delegation, Nick/Dim sibling policy, Stefano underperformance (named employees with active performance proceedings)
- Restricted not written 2026-06-24 Alexander Vasyliev VC (3cadc973): named CTO candidate with full technical assessment (GrindCraft, Naval Action background; Cyprus-based; 120-person team management history; outcome pending ~2 weeks)
- Restricted not written 2026-06-24 Richard Watson VC (5148908e): named CTO candidate with role assessment (10y Rare/Microsoft/343i/People Can Fly; TD vs CTO evaluation; Glen's read: natural TD fit, CTO is growth role; outcome: follow-up call to be scheduled)
- Restricted not written 2026-06-25 Studio leadership sync (d8d72702): Graham EP rated red -- too political, overcomplicates decisions, one-on-one scheduled 26th June (named employee, active HR coaching plan); David Art Director rated red on leadership -- weak command presence and direct feedback, two-hour one-on-one with anonymised staff feedback planned (named employee, active HR); EP candidate pipeline as Graham contingency (12y experience, 6y Xbox background -- named in meeting, details withheld)
- Restricted not written 2026-06-25 Staffing changes (d60bfb70): Karen/Samer/Daniel confirmed first departure wave (named employees, active HR); Nicholas level designer retention agreed -- returning under Gary's supervision (named employee, outcome reached); Mikhail flagged as high performer comparable to Sasha (named employee, positive assessment)
- Restricted not written 2026-06-25 1:1 Stefano (095b194e): Somwella in first departure wave (named employee); Andrea retained for now despite uncertainty (named employee); Colin incoming to team (named employee)
- Restricted not written 2026-06-26 Lorenza-Sean (e9c53cb4): Sean Samborski rate confirmed at €70K annual (named contractor + specific rate; competition clause: one-pager required for other MMO-adjacent engagements)
- Restricted not written 2026-06-26 Lorenza-Callan (6a045bfa): Callan (VFX contractor, melonadefx.com) rate change from €288 to €330/day (€85K annual); 2-month notice period; reports to David's team (named contractor + specific rate)
- Restricted not written 2026-06-26 1:1 David (fd9624ae): Jason Hayes (13y Blizzard composer, Warcraft) placed in Head of Audio hire pipeline -- Glen may know personally (named candidate with active pipeline); Kieran double IR35 violation -- offered vacation and medical leave as contractor, ~£120K exposure (named employee + specific financial risk); Dimitri and Nick (brothers, character modellers) save vs. release still under discussion -- David wants to keep both, Sasha's view: two Vuks outperform them for ~€2K more (named employees, active decision); lead animator pipeline opened confidential to Lorenza/David/Glen only
- Restricted not written 2026-06-26 Hiring Fatima (2cd1539e): Fatima Trevilla greenlit by Michael and David (9y experience), moving to offer by Monday before she accepts elsewhere; requires 2-week overlap before Ella's contract closes (named candidate, active offer); Pete Hartman World Builder candidate -- must be willing to relocate to Greece, meeting to be scheduled (named candidate, pending)
- Restricted not written 2026-06-30 Machine specs (739c6727): Samer first-wave exit decision (named employee, active HR); CTO candidate assessments for Pair Erikson, Chris Southall, Otto (named candidates with detailed background and multiplayer-fit assessments)
- Restricted not written 2026-06-30 VC Louise O'Connor (f553fd5e): Louise O'Connor's candid assessment of Simon Woodruff (named individual -- management weaknesses, Everwild reset history); Glen's full-time offer and Greece relocation consideration (personal/financial -- duplicate of prior restricted entries)
- Restricted not written 2026-06-30 Executive Meeting (99d69fb5): Robin/Mustafa/David leadership RAG ratings with specific numeric scores (named employees, active performance assessments); Simon operating contract assessment including "us vs them" private note (named employee, active HR coaching)
- Restricted not written 2026-06-29 Nick meeting (180c56f0): Nick's individual contract closure terms, rehire terms, and part-time schedule discussion (named employee, contract terms -- anonymised methodology extracted instead)
- Restricted not written 2026-07-01 Production Meeting (0c7760f1): CTO candidate Parola (PO) -- former Battlefield/Frostbite architect, cultural fit concern from art/design team after poor interview (named candidate with outcome data); animation lead (Alon) replacement pipeline opened -- Alon not informed, treat as confidential (named employee, active HR)
- Restricted not written 2026-07-01 Weekly Update Call (d1000df4): PO salary range in the $200s (named candidate + specific salary range); Louis (Head of Design candidate) withdrew citing Simon Woodruff -- named candidate with named existing employee interpersonal concern; Cam re-approach plan (named candidate); Nia ruled out -- AI business just received funding (named candidate with outcome)
- Restricted not written 2026-07-02 1:1 Stefano (67ce6094): David (Art Director) leadership failure -- no command presence, not enforcing direction with leads, not building culture (named employee, active HR coaching plan scheduled next week); Stefano (tech art lead) skill gap -- team unhappy, cannot teach technical skills (named employee, active coaching; 60/40 ratio correction agreed)
- Restricted not written 2026-07-02 1:1 Sasha (a340d3ea): Dimitri (character modeller) assessed as junior-mentality, single-task focused, not suited to small-team needs (named employee, active performance decision); David (Art Director) misrepresenting Sasha's position to Glen ("Sasha wants to keep Dimitri and Rebecca" vs Sasha's actual position: keep through VS then reassess) -- active management integrity concern (named employee)
- Restricted not written 2026-07-02 1:1 Lorenza (a8cca6f4): Ella exit proceedings ongoing (named employee, active HR); Nicholas re-engagement reversal by Vardy (named employee, HR outcome); Glen's Tencent negotiations -- £350k contract milestone, nightly calls 3-4am (commercial sensitivity)
- Restricted not written 2026-07-02 1:1 Valeria (adb29f1d): Samir exit plan (named employee, Mustafa wants swift action); Alon contract close with Fatima overlap (named employee, replacement pipeline active, confidential to Lorenza/David/Glen); Karen contract close for business/legal reasons (named employee); UK contractors for FTE conversion -- Hannah, Connor, Robin, Demetrios flagged (named individuals, active decisions); David structured coaching plan next week (5 observable expectations; brief Vardy/Ari first -- named employee, active HR); CTO candidates with assessments: Pär vague/unprepared at secondary interview, Otto single-player background concern for MMO, Chris management-oriented not cultural fit (named candidates with outcome data); certificate of sponsorship -- Ari owns bank process, UK relocation cap £8K low-tax (commercial/legal)
- Restricted not written 2026-07-02 1:1 Aris (75ded81c): Vardy's conflict-avoidance pattern -- agrees in room, reverses after one-on-one with subordinate (CEO personal development, sensitive); Nicholas re-engagement specifics (named employee, re-engagement terms and strike protocol set); CTO candidates Pär/Otto/Chris with detailed comparative assessments (named candidates with outcome data)
- Brain delta: last appended 2026-06-19 (intelligence/synthesis/brain_delta.md) -- 2026-06-11 through 2026-06-19 sections awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
