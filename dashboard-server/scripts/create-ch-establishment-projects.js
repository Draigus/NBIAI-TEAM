#!/usr/bin/env node
/**
 * Create two Couch Heroes projects in WorkSage:
 *   1. UK Company Establishment (from CH_Artifacts_Project_Plan)
 *   2. Certificate of Sponsorship (from SRA Advisory email chain)
 *
 * Run: node scripts/create-ch-establishment-projects.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENT_ID = '21be0772-73e5-4cca-8795-8b1a66f89ec2'; // Couch Heroes

async function insert(item) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, due_date, documentation_link, practice_area, risks, mitigations, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id, title, item_type`,
    [
      item.title,
      item.parent_id || null,
      CLIENT_ID,
      item.item_type,
      item.status || 'Not started',
      item.priority || '',
      item.health || '',
      item.description || '',
      item.assignees || [],
      item.due_date || '',
      item.doc_link || '',
      'organisational_performance',
      item.risks || '',
      item.mitigations || '',
      'script'
    ]
  );
  return rows[0];
}

async function main() {
  console.log('Creating UK Company Establishment and Certificate of Sponsorship projects...\n');

  // ============================================================
  // PROJECT 1: UK Company Establishment
  // ============================================================
  const proj1 = await insert({
    title: 'UK Company Establishment',
    item_type: 'project',
    status: 'In progress',
    priority: 'High',
    description: `Full UK company establishment programme for CH Game Development UK Ltd. Covers employment law compliance (ERA 1996, ERA 2025, UK GDPR, Equality Act 2010), HR policies and documentation, operational templates, and corporate governance.\n\nSource: CH_Artifacts_Project_Plan_FINAL.xlsx\nGoogle Drive: https://drive.google.com/file/d/1Z8H2bWY1JVhdvPkF_1u2-UY8B5_bpkOq/view\nLive tracker: https://docs.google.com/spreadsheets/d/1qhyxEe62-vC56axGU_-Wrd4IXTnTUdF9LePSvcph3Ew/edit?gid=155036316\n\nKey compliance deadlines:\n- 6 April 2026: SSP changes, paternity day-one rights, bereaved partner's paternity leave\n- October 2026: Sexual harassment 'all reasonable steps' duty, trade union rights communication, tribunal time limits extended to 6 months\n- January 2027: Unfair dismissal qualifying period drops to 6 months, compensation cap removed`,
    assignees: ['Lorenza Menna'],
  });
  console.log(`Created project: ${proj1.title} (${proj1.id})`);

  // --- Feature 1: Pre-Hire Legal Requirements (P1) ---
  const f1 = await insert({
    title: 'Pre-Hire Legal Requirements',
    parent_id: proj1.id,
    item_type: 'feature',
    status: 'In progress',
    priority: 'Urgent',
    description: 'Priority 1: Legally required before first UK hire. All items in this feature must be completed before CH Game Development UK Ltd can lawfully employ its first person in the UK.',
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f1.title}`);

  // 1.1 Employment Contract
  await insert({
    title: '1.1 Employment Contract (Section 1 Statement)',
    parent_id: f1.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `Written statement of employment particulars. Must include all mandatory items per s.1 ERA 1996 as amended. Must incorporate SSP day-one changes, paternity/parental leave day-one rights, flexible working reference, IP assignment clause, moral rights waiver (CDPA 1988 s.87), restrictive covenants, and reference ERA 2025.\n\nLegal basis: Employment Rights Act 1996 s.1; Employment Rights Act 2025\nDeadline: Before first employee starts\n\nNotes: The existing Appendix Two template requires 11 mandatory corrections identified in the revised guide. Build from scratch recommended.\nLorenza's note: Pension may not be sufficient — it should be specified that NEST is our Provider.\nAction: Create a clause to add Nest as pension provider in the contract.\n\nRef: https://www.legislation.gov.uk/ukpga/1996/18/section/1`,
    assignees: ['Lorenza Menna'],
    doc_link: 'https://docs.google.com/document/d/1XCWALv3G2Ct1idEibBgs3m_2N1pOKsbq/edit',
  });

  // 1.2 Offer Letter Template
  await insert({
    title: '1.2 Offer Letter Template',
    parent_id: f1.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `Conditional offer letter including salary, start date, conditions (references, right to work), pension reference, Section 1 statement timing, acceptance deadline.\n\nLegal basis: Best practice; supports contractual clarity\nDeadline: Before first employee starts\nDependency: Contract template (1.1) must be finalised first\nNotes: Existing Appendix One needs corrections per revised guide.`,
    assignees: ['Lorenza Menna'],
    doc_link: 'https://docs.google.com/document/d/1CTaE93VqWhhlAlZlOOrj4UbY3IPGNErp/edit',
  });

  // 1.3 Employee Privacy Notice
  await insert({
    title: '1.3 Employee Privacy Notice (UK GDPR)',
    parent_id: f1.id, item_type: 'story', status: 'In Review', priority: 'Urgent',
    description: `Mandatory privacy notice for all employees. Must detail: categories of personal data collected, lawful bases, retention periods, recipients, data subject rights, cross-border transfers (to US parent NBI LLC), DPO contact if appointed.\n\nLegal basis: UK GDPR Articles 13-14; Data Protection Act 2018\nDeadline: Before first employee starts\nDependency: Cross-border data transfer agreement (2.6) must be planned in parallel\n\nStatus notes: GDPR Letter to check with Dino. Letter ready to be sent with employment contract. Glen having the policy reviewed.\nRisk: Required to be provided to every employee. Non-compliance is an ICO enforcement risk.`,
    assignees: ['Lorenza Menna'],
    due_date: '2026-04-14',
    doc_link: 'https://drive.google.com/file/d/1PwL8hJR9n3zPpMPQhif1vqBcPxQSHQB4/view',
    risks: 'Non-compliance is an ICO enforcement risk. Must be provided to every employee.',
  });

  // 1.4 Right to Work Checks Procedure
  await insert({
    title: '1.4 Right to Work Checks Procedure',
    parent_id: f1.id, item_type: 'story', status: 'In Review', priority: 'Urgent',
    description: `Step-by-step procedure for verifying right to work. Must cover: manual checks, online checks (share codes/eVisa), Employer Checking Service, record-keeping requirements, anti-discrimination safeguards (must check everyone equally). For UK citizens use the IDVT method.\n\nLegal basis: Immigration, Asylum and Nationality Act 2006; Home Office Employer Right to Work Checklist\nDeadline: Before first employee starts\n\nCivil penalty: up to £45,000 first breach / £60,000 repeat breach.\nCriminal offence to knowingly employ an illegal worker. Also a sponsor licence compliance requirement.\n\nLorenza's note: Flow chart for Right to Work check needed.\nArtifact: Summary document and workflow tutorial (Lorenza Menna)`,
    assignees: ['Lorenza Menna'],
    due_date: '2026-04-15',
    risks: 'Civil penalty up to £45,000 first breach / £60,000 repeat. Criminal offence to knowingly employ illegal worker.',
  });

  // 1.5 Health and Safety Policy
  await insert({
    title: '1.5 Health and Safety Policy',
    parent_id: f1.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Written H&S policy mandatory for 5+ employees. Must include: general statement of intent, organisation and arrangements, risk assessment procedures, DSE assessments for remote/hybrid workers, fire safety, first aid, lone working, accident/incident reporting.\n\nLegal basis: Health and Safety at Work etc. Act 1974; Management of Health and Safety at Work Regulations 1999; Health and Safety (Display Screen Equipment) Regulations 1992\nDeadline: Before 5th employee starts (best practice: before first hire)\n\nDependency: Risk assessments must be completed for each workplace/role\nNotes: A gaming studio has specific DSE risks. Remote workers require individual DSE assessments.\nStatus: Follow up with Glen. Glen to upload document to shared Drive folder.`,
    assignees: ['Lorenza Menna'],
    due_date: '2026-04-16',
    doc_link: 'https://drive.google.com/drive/u/0/folders/14vYrPChhwqt9TK2EbxMOcLXMfVbhXdxm',
    risks: 'Gaming studio has specific DSE risks for screen workers. Remote workers require individual assessments.',
  });

  // 1.5.1 H&S Leaflet
  await insert({
    title: '1.5.1 Health and Safety Leaflet',
    parent_id: f1.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: 'Health and Safety leaflet for employees. Companion document to the main H&S Policy (1.5).',
    assignees: ['Lorenza Menna'],
  });

  // 1.6 Pension Auto-Enrolment
  await insert({
    title: '1.6 Pension Auto-Enrolment Communication Letter',
    parent_id: f1.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Template letter to each employee within 6 weeks of assessment explaining pension rights, scheme details, contribution rates, opt-out rights.\n\nLegal basis: Pensions Act 2008; The Pensions Regulator guidance\nDeadline: Within 6 weeks of first eligible employee's start date\nDependency: Pension scheme must be chosen and set up first\n\nRequired deliverables:\n- Pension Letter for employee to know they are auto-enrolled\n- Pension Scheme Policy (for Handbook)\n- Letter for employees who want to opt out\n- Onboarding workflow to check the 6 weeks deadline\n\nLorenza's notes:\n- NEST Pension Scheme 5% employer + 3% employee\n- Auto-enrol people at the beginning, no postponement\n- Find template on NEST website\n- Set up link between NEST and PAYE\n- Set up link with HiBob\n- Access NEST to check if contributions are properly set and if NEST is auto-enrolling`,
    assignees: ['Lorenza Menna'],
    risks: 'Must be sent within 6 weeks of eligible employee start date. Pension scheme must be set up first.',
  });

  // 1.7 EL Insurance
  await insert({
    title: '1.7 Employers Liability Insurance Certificate Display',
    parent_id: f1.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `Obtain Employers' Liability Insurance (£5m minimum). Display certificate physically or electronically where employees can access it.\n\nLegal basis: Employers' Liability (Compulsory Insurance) Act 1969\nDeadline: Before first employee starts\n\nFine of £2,500 per day without cover. Home Office requires sight of this for sponsor licence.`,
    assignees: ['Lorenza Menna'],
    doc_link: 'https://drive.google.com/file/d/1bkCVdij9nYXPoHj31va8FlV6mg1mxu0X/view',
    risks: 'Fine of £2,500 per day without cover.',
  });

  // 1.8 New Starter Form
  await insert({
    title: '1.8 New Starter Form',
    parent_id: f1.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: 'New starter form for collecting employee details on first day. Part of the onboarding workflow.',
    assignees: ['Lorenza Menna'],
  });

  // --- Feature 2: Employee Handbook & Employment Documentation (P2) ---
  const f2 = await insert({
    title: 'Employee Handbook & Employment Documentation',
    parent_id: proj1.id,
    item_type: 'feature',
    status: 'Not started',
    priority: 'High',
    description: 'Priority 2: Required within first months or before scaling. Comprehensive handbook, standalone legal agreements, data protection documents, and compliance assessments.',
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f2.title}`);

  // 2.1 Employee Handbook (story with sub-tasks)
  const s21 = await insert({
    title: '2.1 Employee Handbook / Staff Handbook',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Comprehensive handbook containing all workplace policies. See sub-tasks for each required policy section (2.1a-2.1q).\n\nLegal basis: Various statutes; ACAS Code of Practice; best practice\nDeadline: Within first 3 months of first hire\nDependency: Contract template (1.1) must be finalised first\n\nSingle document or modular policy set. Must be reviewed annually.\n\nCurrent drafts:\n- Short version: https://docs.google.com/document/d/1-mPTnXfYyHtZV5K8Q2S30yNlB4lCmxPd/edit\n- Long version: https://docs.google.com/document/d/1N78tUcIctM6UnSXC-5zTqlh4zg7w155T/edit\n\nGlen to review.`,
    assignees: ['Lorenza Menna'],
    doc_link: 'https://docs.google.com/document/d/1-mPTnXfYyHtZV5K8Q2S30yNlB4lCmxPd/edit',
  });

  // Handbook sub-policies as tasks
  const handbookPolicies = [
    { ref: '2.1a', title: 'Disciplinary Policy and Procedure', desc: 'Aligned with ACAS Code of Practice on Disciplinary and Grievance Procedures. Must cover investigation, hearing, appeal stages, right to be accompanied.\n\nLegal basis: ACAS Code of Practice; ERA 1996 s.98\nRisk: Tribunals can increase awards by 25% for failure to follow ACAS Code.' },
    { ref: '2.1b', title: 'Grievance Policy and Procedure', desc: 'Aligned with ACAS Code. Must cover informal resolution, formal grievance, investigation, hearing, appeal.\n\nLegal basis: ACAS Code of Practice; ERA 1996' },
    { ref: '2.1c', title: 'Sickness Absence Policy', desc: 'URGENT: Must reflect 6 April 2026 changes. Updated for SSP changes: no waiting days, no LEL, 80%-of-AWE rate. Cover self-certification (7 days), fit notes, return to work interviews, long-term absence management.\n\nLegal basis: ERA 2025; SSP Regulations\nAction: Remove any reference to 3-day waiting period or earnings threshold.' },
    { ref: '2.1d', title: 'Holiday and Leave Policy', desc: 'Statutory minimum 5.6 weeks (28 days for 5-day week). Carry-over rules (including statutory right to carry over up to 20 days for sick workers for 18 months). Sickness during holiday conversion. Holiday accrual for irregular hours workers (12.07% method from April 2024).\n\nLegal basis: Working Time Regulations 1998 (as amended)' },
    { ref: '2.1e', title: 'Family Leave Policies', desc: 'URGENT: Day-one rights from 6 April 2026. Maternity, Paternity (day-one right from 6 April 2026), Adoption, Shared Parental, Unpaid Parental Leave (day-one right from 6 April 2026), Parental Bereavement, Neonatal Care Leave (from April 2025), Bereaved Partner\'s Paternity Leave (from 6 April 2026).\n\nLegal basis: ERA 1996; ERA 2025; Maternity and Parental Leave etc. Regulations 1999; Bereaved Partner\'s Paternity Leave Regulations 2026\nAction: Must remove old qualifying period references for paternity and unpaid parental leave.' },
    { ref: '2.1f', title: 'Flexible Working Policy', desc: 'Day-one right to request since 6 April 2024. 2 requests per year. Employer must decide within 2 months. Must consult before refusing. ERA 2025 will further require structured reasoning if refusing.\n\nLegal basis: ERA 1996 s.80F-80I (as amended); ERA 2025' },
    { ref: '2.1g', title: 'Anti-Harassment and Bullying Policy', desc: 'Must cover all protected characteristics (Equality Act 2010). Include sexual harassment specifically. Reference the preventative duty (reasonable steps from Oct 2024; all reasonable steps from Oct 2026). Include third-party harassment. Clear reporting routes.\n\nLegal basis: Equality Act 2010; Worker Protection (Amendment of Equality Act 2010) Act 2023; ERA 2025\nDependency: Sexual Harassment Risk Assessment (2.8)\nRisk: Compensation can be uplifted by 25% if employer cannot demonstrate preventative steps.' },
    { ref: '2.1h', title: 'Equal Opportunities Policy', desc: 'Cover all protected characteristics under Equality Act 2010. Apply to recruitment, promotion, training, pay, and termination.\n\nLegal basis: Equality Act 2010' },
    { ref: '2.1i', title: 'Whistleblowing Policy', desc: 'Public Interest Disclosure Act 1998 protections. Explain qualifying disclosures, how to raise concerns, protection from detriment. From April 2026, sexual harassment disclosures are qualifying disclosures.\n\nLegal basis: PIDA 1998; ERA 2025' },
    { ref: '2.1j', title: 'Data Protection Policy', desc: 'UK GDPR and DPA 2018 compliance. Cover data handling, subject access requests, breach reporting, acceptable use of employee data.\n\nLegal basis: UK GDPR; DPA 2018\nDependency: Privacy notice (1.3)' },
    { ref: '2.1k', title: 'IT Acceptable Use and Social Media Policy', desc: 'Cover use of company systems, personal devices, social media, email monitoring. Include reference to UK GDPR for monitoring.\n\nLegal basis: Best practice; supports disciplinary framework' },
    { ref: '2.1l', title: 'Expenses Policy', desc: 'Cover what is reimbursable, approval process, receipts, HMRC-approved mileage rates.\n\nLegal basis: Best practice; supports payroll and tax compliance' },
    { ref: '2.1m', title: 'Probationary Period Policy', desc: 'Define probation length, review process, extension mechanism, confirmation/termination. Note: from January 2027, UFD qualifying period drops to 6 months. Probation must be designed with this in mind.\n\nLegal basis: Contractual; informed by ERA 2025 UFD changes\nDependency: Contract template (1.1)\nNote: There is no statutory concept of probation. It is a contractual mechanism. ACAS Code compliance applies throughout.' },
    { ref: '2.1n', title: 'Redundancy Policy', desc: 'Cover consultation obligations (20+ redundancies: collective consultation with 45-day minimum period). Protective award now up to 180 days\' pay from April 2026. From 2027, organisation-wide threshold may apply.\n\nLegal basis: Trade Union and Labour Relations (Consolidation) Act 1992; ERA 2025' },
    { ref: '2.1o', title: 'Working Time and 48-Hour Week Policy', desc: 'Explain 48-hour average week limit, opt-out mechanism, rest breaks (20 min per 6 hours), daily rest (11 hours), weekly rest (24 hours). Address crunch periods specifically for gaming studio context.\n\nLegal basis: Working Time Regulations 1998\nNote: Gaming industry is notorious for crunch. Policy must proactively manage this risk.' },
    { ref: '2.1p', title: 'Alcohol and Drugs Policy', desc: 'Testing, support, disciplinary implications.\n\nLegal basis: Best practice; H&S obligations' },
    { ref: '2.1q', title: 'Training and Development Policy', desc: 'Mandatory and optional training, time off for study, payment during training.\n\nLegal basis: ERA 1996 s.1 (mandatory particular); best practice' },
  ];

  for (const p of handbookPolicies) {
    await insert({
      title: `${p.ref} ${p.title}`,
      parent_id: s21.id, item_type: 'task', status: 'Not started',
      description: p.desc + '\n\nLorenza to check if this section exists in the lean version of the handbook.',
      assignees: ['Lorenza Menna'],
    });
  }

  // Standalone P2 stories
  await insert({
    title: '2.2 IP Assignment Agreement',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Standalone deed or contract clause assigning all IP created during employment (code, artwork, game design, sound, trade secrets) to the company. Must include: moral rights waiver under CDPA 1988 s.87, future IP, work-for-hire provisions, obligations on termination.\n\nLegal basis: Copyright, Designs and Patents Act 1988; Patents Act 1977; common law\nDeadline: Before first creative/technical hire starts\nDependency: Contract template (1.1)\n\nCRITICAL for a gaming studio. Without this, default UK law may not vest all IP in the employer.`,
    assignees: ['Lorenza Menna'],
    risks: 'CRITICAL: Without this, default UK law may not vest all IP in the employer.',
  });

  await insert({
    title: '2.3 Confidentiality / NDA (Standalone)',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'Medium',
    description: `Project-level NDA for contractors, partners, and specific projects beyond the general contractual confidentiality clause.\n\nLegal basis: Common law; contractual\nDeadline: As needed per project\nDependency: Contract template (1.1) has a general clause\nNote: Current contract has a confidentiality clause but may need strengthening for project-level use.`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: '2.4 Post-Termination Restrictive Covenants',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'Medium',
    description: `Non-compete, non-solicitation, non-dealing clauses tailored to gaming industry roles. Must be reasonable in scope, duration, and geography to be enforceable.\n\nLegal basis: Common law; must be reasonable to be enforceable\nAction: Build into contract template (1.1)\nNote: Review in light of fire-and-rehire restrictions from October 2026.\nLorenza's note: Link to the contract needed.`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: '2.5 DPIA Template',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'Medium',
    description: `Data Protection Impact Assessment template for high-risk processing activities (e.g. employee monitoring, CCTV, biometric data).\n\nLegal basis: UK GDPR Article 35\nDeadline: Before any high-risk processing begins\nDeliverables: Link to a document + Handbook section + Contract clause`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: '2.6 Cross-Border Data Transfer Agreement',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `UK International Data Transfer Agreement (IDTA) or UK Addendum to EU Standard Contractual Clauses. Required for any transfer of employee personal data to NBI LLC (US parent).\n\nLegal basis: UK GDPR Chapter V; ICO guidance\nDeadline: Before any data is shared with US parent\nDependency: Privacy notice (1.3) must reference transfers\nNote: ICO has published templates. Must be completed and signed before transfers begin.\nDeliverable: Statement to put in the handbook.`,
    assignees: ['Lorenza Menna'],
    risks: 'Must be in place before any employee personal data is shared with US parent entity.',
  });

  await insert({
    title: '2.7 Record Retention Policy',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Comprehensive policy covering: payroll/wage records (6 years), PAYE records (3 years), SSP records (3 years), maternity records (3 years), working time records (duration of employment + 2 years), pension records (6 years), recruitment records (6 months post-decision minimum), dismissal records (minimum 6 months to match new tribunal time limit from October 2026), accident reports (3 years), right to work records (2 years after termination).\n\nLegal basis: Various: Taxes Management Act 1970; WTR 1998; RIDDOR 2013; UK GDPR; ERA 2025\nDeadline: Within first 3 months\nAction: Must be updated when tribunal time limits extend to 6 months in October 2026.\n\nDeliverables:\n- Statement in the handbook\n- Trackers/document summarising where each spreadsheet/HiBob record is stored`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: '2.8 Sexual Harassment Risk Assessment',
    parent_id: f2.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Documented risk assessment identifying risks of sexual harassment in the workplace (including from third parties such as clients, players, online interactions). Must assess risks and document preventative steps.\n\nLegal basis: Worker Protection (Amendment of Equality Act 2010) Act 2023; ERA 2025 (October 2026: 'all reasonable steps')\nDeadline: Before October 2026 (best practice: immediately)\nDependency: Anti-harassment policy (2.1g)\n\nWithout this, employer cannot demonstrate compliance with the preventative duty. 25% compensation uplift risk.\nDeliverable: Assessment document (internal confidential)`,
    assignees: ['Lorenza Menna'],
    due_date: '2026-10-01',
    risks: 'Without documented risk assessment, cannot demonstrate compliance. 25% compensation uplift risk.',
  });

  // --- Feature 3: Operational Templates (P4) ---
  const f3 = await insert({
    title: 'Operational Templates & Best Practice',
    parent_id: proj1.id,
    item_type: 'feature',
    status: 'Not started',
    priority: 'Medium',
    description: 'Priority 4: Operational and best-practice documents. Templates, processes, and systems needed for day-to-day HR operations.',
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f3.title}`);

  const p4Items = [
    { ref: '4.1', title: 'Job Description Templates', desc: 'Standardised templates for all roles. Must include SOC 2020 occupation codes (for sponsor licence use) and salary benchmarking.\n\nDeadline: Before first recruitment round', priority: 'High' },
    { ref: '4.2', title: 'Interview Scoring Matrix', desc: 'Structured scoring template for fair, consistent candidate evaluation. Aligned with Equality Act 2010 requirements.\n\nDeadline: Before first recruitment round', priority: 'Medium' },
    { ref: '4.3', title: 'Onboarding Checklist', desc: 'Comprehensive checklist: contract signing, right to work check, pension enrolment, IT setup, policy acknowledgements, training, DSE assessment, emergency contacts.\n\nDependencies: Contract (1.1), RTW procedure (1.4), pension letter (1.6), H&S policy (1.5)\nDeadline: Before first employee starts', priority: 'High' },
    { ref: '4.4', title: 'Probation Review Template', desc: 'Structured template for probation reviews: objectives, performance criteria, development areas, confirmation/extension/termination decision.\n\nCritical for managing early-stage performance given 6-month UFD from January 2027.\nDependency: Probation policy (2.1m)\nDeadline: Before first probation review', priority: 'Medium' },
    { ref: '4.5', title: 'Performance Review Template', desc: 'Annual/bi-annual performance review template.\n\nDeadline: Within first year', priority: 'Low' },
    { ref: '4.6', title: 'Exit Interview Template', desc: 'Standardised questions for departing employees.\n\nDeadline: Before first leaver', priority: 'Low' },
    { ref: '4.7', title: 'Leaver Checklist', desc: 'Final pay, pension cessation, return of property, revocation of IT access, IP confirmation, Home Office notification (if sponsored worker), reference policy.\n\nDeadline: Before first leaver', priority: 'Medium' },
    { ref: '4.8', title: 'HRIS Platform Selection and Implementation', desc: 'Requirements spec for system integrating: personnel records, payroll, pension, recruitment, absence management, document storage, visa/sponsor tracking.\n\nDependency: Payroll provider and pension provider must be selected first\nDeadline: Within first 3 months\nNote: HiBob is currently in use/consideration.', priority: 'High' },
    { ref: '4.9', title: 'Bribery Act Compliance Policy', desc: 'Adequate procedures to prevent bribery under Bribery Act 2010 s.7. Cover gifts, hospitality, facilitation payments, third-party due diligence.\n\nLegal basis: Bribery Act 2010\nDeadline: Within first 6 months\nNote: Defence of \'adequate procedures\' requires documented policy.\nAction: Check with Aris', priority: 'Low' },
    { ref: '4.10', title: 'Modern Slavery Statement (OPTIONAL)', desc: 'Statement of steps taken to prevent modern slavery in business and supply chains. Required if turnover exceeds £36m; good practice regardless.\n\nLegal basis: Modern Slavery Act 2015\nNote: Only legally required if turnover exceeds £36 million. Not applicable at current scale.\nAction: Check with Aris', priority: 'Low' },
    { ref: '4.12', title: 'EMI Share Scheme Documentation (OPTIONAL)', desc: 'Enterprise Management Incentives scheme: option agreement, scheme rules, HMRC notification, board resolutions, company valuation. Highly tax-efficient for UK tech startups.\n\nLegal basis: Income Tax (Earnings and Pensions) Act 2003; HMRC EMI guidance\nDependency: Company valuation required\nNote: Hiring competitiveness tool, not a legal requirement. Build when ready to offer equity incentives.\nAction: Check with Aris', priority: 'Low' },
    { ref: '4.13', title: 'DSE Assessment Template', desc: 'Display Screen Equipment assessment form for each employee (office and remote). Must cover workstation setup, screen position, chair, lighting, breaks.\n\nLegal basis: Health and Safety (Display Screen Equipment) Regulations 1992\nDeadline: Before each employee starts working at a screen\nDependency: H&S Policy (1.5)\nNote: Particularly important for a studio where all staff use screens.', priority: 'Medium' },
    { ref: '4.14', title: 'Trade Union Rights Communication Template', desc: 'Template all-staff communication informing workers of their right to join a trade union and the protections that apply to union membership and activities.\n\nLegal basis: ERA 2025 (from October 2026)\nDeadline: Before October 2026\nNote: New mandatory duty from October 2026.', priority: 'Medium', due_date: '2026-10-01' },
  ];

  for (const item of p4Items) {
    await insert({
      title: `${item.ref} ${item.title}`,
      parent_id: f3.id, item_type: 'story', status: 'Not started',
      priority: item.priority || 'Medium',
      description: item.desc,
      assignees: ['Lorenza Menna'],
      due_date: item.due_date || '',
    });
  }

  // --- Feature 4: Corporate Governance (P5) ---
  const f4 = await insert({
    title: 'Corporate Governance',
    parent_id: proj1.id,
    item_type: 'feature',
    status: 'Done',
    priority: 'High',
    description: 'Priority 5: Companies House and corporate governance. Most items already completed at incorporation.',
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f4.title}`);

  const p5Items = [
    { ref: '5.1', title: 'Companies House Filing Calendar', status: 'Done', desc: 'Schedule for: confirmation statement (annual), annual accounts, PSC register maintenance, filing of any changes to directors/registered office/share capital.\n\nLegal basis: Companies Act 2006\nNote: Late filing penalties apply.' },
    { ref: '5.2', title: 'PSC Register', status: 'Done', desc: 'Register of People with Significant Control. Must be kept up to date and filed with Companies House.\n\nLegal basis: Companies Act 2006 Part 21A' },
    { ref: '5.3', title: 'Director Identity Verification', status: 'Done', desc: 'Required under Economic Crime and Corporate Transparency Act 2023. Directors must verify their identity with Companies House.\n\nLegal basis: ECCTA 2023\nNote: Check Companies House for current implementation status (phased 2025/2026).' },
    { ref: '5.4', title: 'Corporation Tax Registration', status: 'Done', desc: 'Register with HMRC for Corporation Tax within 3 months of starting business activity.\n\nLegal basis: Corporation Tax Act 2009' },
    { ref: '5.5', title: 'VAT Registration Assessment', status: 'Done', desc: 'Assess whether turnover exceeds the £90,000 threshold (from April 2024). Register if required. Consider voluntary registration for input tax recovery.\n\nLegal basis: Value Added Tax Act 1994\nNote: Gaming studio may benefit from voluntary registration for input VAT recovery on equipment/services.' },
    { ref: '5.6', title: 'R&D Tax Relief Assessment', status: 'In progress', desc: 'Assess eligibility for R&D tax relief (SME scheme or RDEC). Game development typically qualifies. Can be worth 10-33% of qualifying R&D expenditure.\n\nLegal basis: Corporation Tax Act 2009 Part 13; Finance Act 2024\nDeadline: First Corporation Tax return\nNote: Tax optimisation, not a compliance requirement. Pursue with tax advisor at first CT return.\nAction: Check with Aris' },
  ];

  for (const item of p5Items) {
    await insert({
      title: `${item.ref} ${item.title}`,
      parent_id: f4.id, item_type: 'story',
      status: item.status,
      description: item.desc,
      assignees: ['Lorenza Menna'],
    });
  }

  console.log(`\nProject 1 complete: ${proj1.title}\n`);

  // ============================================================
  // PROJECT 2: Certificate of Sponsorship
  // ============================================================
  const proj2 = await insert({
    title: 'Certificate of Sponsorship',
    item_type: 'project',
    status: 'In progress',
    priority: 'High',
    description: `Sponsor Licence application and Skilled Worker visa sponsorship for CH Game Development UK Ltd.\n\nManaged by SRA Advisory:\n- Saud R. Alvi, Director\n- SRA Advisory, 91 Wimpole Street, London W1G 0EF\n- Phone: +44 (0) 20 3687 0346 / Mobile: +44 (0) 7729 896593\n- Email: s.alvi@sraa.co.uk\n- Website: www.sraa.co.uk\n- Regulated by IAA, Registration No: F201900092\n\nFirst sponsored worker: Leon (Shouxun)\n- Current role: Programmer/Software Developer\n- SOC Code: 2134 (Programmers and software development professionals)\n- Current salary: £37,200\n- Minimum required salary for sponsorship: £54,700\n\nSource: Email thread "Fwd: CH Game Development UK Ltd (CHG) - Sponsor Licence" (forwarded by Lorenza Menna to Glen Pryer, 23 June 2026)\n\nIMPORTANT: Do NOT use Revolut for bank statements — applications rejected as recently as February 2026. Use HSBC, Barclays, Lloyds, Santander, NatWest, Bank of Scotland, Monzo, or Starling Bank.`,
    assignees: ['Lorenza Menna'],
    risks: 'Revolut bank statements rejected by Home Office (Feb 2026). Must use FCA/PRA-authorised traditional bank.',
  });
  console.log(`Created project: ${proj2.title} (${proj2.id})`);

  // --- Feature 1: Sponsor Licence Application Documents ---
  const f5 = await insert({
    title: 'Sponsor Licence Application Documents',
    parent_id: proj2.id,
    item_type: 'feature',
    status: 'In progress',
    priority: 'Urgent',
    description: `Required documents for the Sponsor Licence application as specified by SRA Advisory (email 11 December 2025). 5 of 7 items received; 2 outstanding.\n\nSRA Advisory is preparing the sponsor licence application form for review.`,
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f5.title}`);

  await insert({
    title: 'Employers Liability Insurance Certificate (£5m min)',
    parent_id: f5.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `Employers' liability insurance certificate showing cover of at least £5m from an insurer authorised by the FCA.\n\nMandatory for sponsor licence application.\nStatus: RECEIVED by SRA Advisory\nConfirmed by Saud (11 Dec 2025): "certificate looks correct and we will use this for the application"`,
    assignees: ['Lorenza Menna'],
    doc_link: 'https://drive.google.com/file/d/1bkCVdij9nYXPoHj31va8FlV6mg1mxu0X/view',
  });

  await insert({
    title: 'HMRC PAYE Registration (Welcome Letter)',
    parent_id: f5.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `Evidence of HMRC registration as employer to pay PAYE and National Insurance. Must be the original HMRC document showing both PAYE Reference Number and Accounts Office Reference Number (the "Welcome Letter").\n\nMandatory for sponsor licence application.\nStatus: RECEIVED by SRA Advisory\nConfirmed by Saud (8 Dec 2025): "the PAYE document you have shared is the correct one for the application"`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: 'HMRC VAT Registration Certificate',
    parent_id: f5.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `HMRC VAT registration certificate confirming VAT registration number and effective date of registration.\n\nStatus: RECEIVED by SRA Advisory`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: 'Proof of Business Premises (Lease/Licence)',
    parent_id: f5.id, item_type: 'story', status: 'Done', priority: 'Urgent',
    description: `Proof of ownership or lease/licence of business premises, signed by all parties.\n\nStatus: RECEIVED by SRA Advisory`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: 'Corporate Bank Statement',
    parent_id: f5.id, item_type: 'story', status: 'In progress', priority: 'Urgent',
    health: 'Blocked',
    description: `Latest corporate/business bank statement. Mandatory for sponsor licence application.\n\nStatus: OUTSTANDING\nAction: HSBC account being opened (Dino confirmed 11 Dec 2025: "We're opening our bank account with HSBC")\n\nACCEPTABLE BANKS (confirmed by SRA Advisory, accepted by Home Office):\n- HSBC\n- Barclays\n- Lloyds\n- Santander\n- NatWest\n- Bank of Scotland\n- Monzo\n- Starling Bank\n\nWARNING: DO NOT USE REVOLUT. SRA Advisory strongly advises against Revolut — clients who used Revolut had applications rejected in February 2026. If application is rejected, must re-apply afresh once new bank account set up.\n\nSaud (11 March 2026): "applying with Revolut as your bank will be highly risky. Thus it is safer to go with one of the banks that I had listed"`,
    assignees: ['Lorenza Menna'],
    risks: 'BLOCKER: Cannot submit sponsor licence without bank statement. Revolut will cause rejection. HSBC account setup in progress.',
  });

  await insert({
    title: 'Hierarchy / Organisation Chart',
    parent_id: f5.id, item_type: 'story', status: 'In progress', priority: 'Urgent',
    description: `Up-to-date hierarchy chart detailing owners, directors and board members in the UK and any overseas linked/group entity.\n\nRequirements (SRA Advisory, 12 Dec 2025):\n- Show who is the owner (shareholder) and director of the UK entity\n- List all employees (company has <50 UK staff)\n- Include names and titles of all staff\n- Include the name of the individual to be sponsored (Leon/Shouxun) and their position\n- If any contracted workers in the UK, include them clearly labelled as 'contracted workers'\n- Include the overseas associated company structure (owners, directors, employees)\n- Does NOT need to show ultimate beneficial owners\n\nSaud suggested using something similar to the CHG website Teams page, adding the UK team as a first page to show company size.\n\nStatus: OUTSTANDING — Dino was working on this (8 Jan 2026). Needs follow-up.`,
    assignees: ['Lorenza Menna'],
    risks: 'Outstanding since January 2026. Blocks sponsor licence submission.',
  });

  await insert({
    title: 'Sponsor Licence Application Form (SRA Draft)',
    parent_id: f5.id, item_type: 'story', status: 'In progress', priority: 'Urgent',
    description: `SRA Advisory has been preparing the sponsor licence application form.\n\nSaud (12 Jan 2026): "We have been preparing the sponsor licence application form and I will send you the draft template for your review soon."\n\nStatus: Awaiting draft from SRA Advisory for review. Follow up required.\n\nNote: Once bank statement and hierarchy chart are received, application can be submitted.`,
    assignees: ['Lorenza Menna'],
  });

  // --- Feature 2: Sponsor Licence HR Compliance (P3) ---
  const f6 = await insert({
    title: 'Sponsor Licence HR Compliance',
    parent_id: proj2.id,
    item_type: 'feature',
    status: 'Not started',
    priority: 'High',
    description: `Priority 3 from Artifacts Plan: HR systems and procedures required for sponsor licence compliance. Must be in place before first Certificate of Sponsorship is assigned.\n\nSRA Advisory provided a memo on HR policies/procedures (8 Dec 2025) with Home Office policy links, plus an HR file template document for maintaining each employee\'s HR file.\n\nNote: Each time CHG sponsors a foreign worker, SRA Advisory will provide a specific document with guidelines for what HR should keep on that individual's file.`,
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f6.title}`);

  await insert({
    title: '3.1 Sponsor Licence HR Compliance Pack',
    parent_id: f6.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Documented systems for: tracking attendance, visa expiry monitoring, passport/visa copy storage, Home Office reporting procedures. Must satisfy Home Office audit requirements.\n\nLegal basis: Immigration Rules; Sponsor Guidance Part 1 (version 03/26)\nDependency: HRIS platform selection (4.8)\n\nWeak HR systems are the biggest reason for licence rejection.\n\nSRA Advisory provided HR file template document (8 Dec 2025) — usable for both sponsored workers and settled UK workers to ensure consistency.`,
    assignees: ['Lorenza Menna'],
    risks: 'Weak HR systems are the biggest reason for sponsor licence rejection.',
  });

  await insert({
    title: '3.2 Sponsored Worker File Template',
    parent_id: f6.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Standardised personnel file structure per sponsored worker: CoS details, visa copy, passport copy, right to work check record, attendance records, salary details, role description matching SOC code.\n\nLegal basis: Sponsor Guidance Part 2 (version 03/26)\nDependency: Sponsor licence must be granted first\n\nNote: SRA Advisory will provide worker-specific guidance each time CHG sponsors a new foreign worker.`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: '3.3 Absence Reporting Procedure (Sponsored Workers)',
    parent_id: f6.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Procedure for reporting unauthorised absences of 10+ consecutive working days to the Home Office via SMS (Sponsorship Management System).\n\nLegal basis: Sponsor Guidance; Immigration Rules\nDependency: Sponsor licence must be granted first\n\nFailure to report can result in licence downgrade or revocation.`,
    assignees: ['Lorenza Menna'],
    risks: 'Failure to report 10+ day unauthorised absences can result in licence downgrade or revocation.',
  });

  await insert({
    title: '3.4 Salary and Role Change Reporting Procedure',
    parent_id: f6.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Procedure for notifying the Home Office of changes to sponsored workers' salary, role, job title, or working location.\n\nLegal basis: Sponsor Guidance; Immigration Rules\nDependency: Sponsor licence must be granted first`,
    assignees: ['Lorenza Menna'],
  });

  // --- Feature 3: Leon (Shouxun) Skilled Worker Visa ---
  const f7 = await insert({
    title: 'Leon (Shouxun) Skilled Worker Visa',
    parent_id: proj2.id,
    item_type: 'feature',
    status: 'In progress',
    priority: 'High',
    description: `First sponsored worker under CHG's sponsor licence. Leon (Shouxun) is currently overseas contracting for a non-UK group entity.\n\nRole: Programmer / Software Developer\nSOC Code: 2134 (Programmers and software development professionals)\nCurrent salary: £37,200\nRequired minimum for sponsorship: £54,700 gross annual\n\nKey immigration rules (SRA Advisory, 4 March 2026):\n- While overseas and application pending: Leon can continue contracting for non-UK entity until he arrives in the UK on his Skilled Worker visa\n- Once in UK on Skilled Worker visa: Must work full-time for Couch Heroes UK. May work up to 20 hours/week for another entity (evenings/weekends only, after sponsored work obligations met). Does not need to be reported to Home Office but NI records can be checked.\n- No restrictions on overseas work activity before entering the UK — Home Office does not question overseas work history`,
    assignees: ['Lorenza Menna'],
  });
  console.log(`  Feature: ${f7.title}`);

  await insert({
    title: 'Salary Increase to £54,700 (SOC 2134 Minimum)',
    parent_id: f7.id, item_type: 'story', status: 'In progress', priority: 'Urgent',
    description: `Leon's salary must be increased from £37,200 to at least £54,700 gross annual before sponsorship under SOC Code 2134.\n\nSRA Advisory confirmed (17 Feb 2026): CHG can increase to £45,000 now as interim, but salary MUST be at least £54,700 when he is sponsored as a Skilled Worker.\n\nSaud: "Based on the Job Description showing the role Shouxun will be doing in the UK, CHG must pay him a gross annual salary of at least £54,700 in order for him to be eligible for a Skilled Worker sponsorship."\n\nHome Office extract attached for Code 2134.\n\nAction: Confirm interim increase to £45,000 has been implemented. Plan timeline for increase to £54,700.`,
    assignees: ['Lorenza Menna'],
    risks: 'Sponsorship application will be rejected if salary is below £54,700 at time of CoS assignment.',
  });

  await insert({
    title: 'Certificate of Sponsorship (CoS) Assignment',
    parent_id: f7.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Assign a Certificate of Sponsorship to Leon via the Sponsorship Management System (SMS) once sponsor licence is granted.\n\nPrerequisites:\n- Sponsor licence granted\n- Leon's salary at minimum £54,700\n- Sponsored worker HR file set up (3.2)\n- Job description matching SOC Code 2134\n\nSRA Advisory will guide through the CoS assignment process.`,
    assignees: ['Lorenza Menna'],
  });

  await insert({
    title: 'Skilled Worker Visa Application',
    parent_id: f7.id, item_type: 'story', status: 'Not started', priority: 'High',
    description: `Leon's Skilled Worker visa application to be submitted once CoS is assigned.\n\nNote on immigration fees (from compliance timeline): Immigration fee increases of ~6-7% effective 8 April 2026.\n\nPrerequisites:\n- CoS assigned\n- Application form completed\n- Supporting documents gathered\n\nSRA Advisory will manage/advise on the visa application process.\n\nTimeline: Leon can continue overseas contracting until his Skilled Worker visa is approved and he enters the UK. No work stoppage restrictions while overseas.`,
    assignees: ['Lorenza Menna'],
  });

  console.log(`\nProject 2 complete: ${proj2.title}\n`);
  console.log('=== DONE ===');
  console.log(`Project 1 ID: ${proj1.id}`);
  console.log(`Project 2 ID: ${proj2.id}`);

  await pool.end();
}

main().catch(err => {
  console.error('FATAL:', err);
  pool.end();
  process.exit(1);
});
