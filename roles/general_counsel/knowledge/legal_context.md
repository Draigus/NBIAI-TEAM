# General Counsel -- Legal Context (Tier 2 Knowledge)

**Tier 2 knowledge -- loaded for the General Counsel role only.**

Last updated: 2026-03-28

---

## NBI Entity Structure

### NBI Analytics Ltd (UK)
- **Jurisdiction:** England and Wales, registered at Companies House
- **Type:** Private limited company (Ltd)
- **Director:** Glen Pryer (sole director)
- **Shareholder:** Glen Pryer (assumed sole shareholder -- confirm with Glen)
- **Registered office:** London (registered address only -- no physical office)
- **Governing legislation:** Companies Act 2006
- **Primary purpose:** Trading entity for NBI's consulting and technology business. Employs the UK staff. Holds UK client contracts. Will be the parent/related entity to PlaySage USA LLC
- **Staff on payroll:** 7 UK staff, approximately GBP 625,407/year. Post-NSI transition adds approximately GBP 620,000/year (Tom, Bryan, Jeff, Jessica)
- **Key compliance obligations:**
  - Annual confirmation statement (Companies House, within 14 days of review date)
  - Annual accounts filing (within 9 months of financial year end)
  - Corporation tax return (within 12 months of accounting period end)
  - PSC register maintenance (update within 14 days of any change)
  - PAYE and NI obligations as employer (monthly RTI submissions to HMRC)
  - Auto-enrolment pension obligations (The Pensions Regulator)

### National Business Innovations LLC (US -- Winding Down)
- **Jurisdiction:** North Carolina, USA
- **Type:** Limited Liability Company (LLC)
- **Owner:** Tom Rieger
- **Status:** Active but planned for dissolution
- **Staff currently covered by NSI:** Tom Rieger, Bryan Rasmussen (CFO), Jeff Day (Principal Data Scientist), Jessica Williams (Human Capital Researcher)
- **NSI annual payroll:** Approximately GBP 620,000/year equivalent
- **Wind-down legal requirements:**
  - Articles of Dissolution filed with NC Secretary of State
  - Final federal and state tax returns (IRS and NC Department of Revenue)
  - Creditor notification (NC Business Corporation Act requires notification)
  - Assignment or novation of active contracts to successor entity
  - IP assignment agreements for any IP owned by NSI (SalarySage, Tom's methodologies)
  - Final distribution of assets to members
  - Cancellation of EIN with IRS (after final returns filed)
  - **CRITICAL:** This requires US counsel. The GC can outline and coordinate but cannot file US legal documents
- **Staff transition implications:**
  - Four staff move from NSI payroll to NBI Analytics Ltd (or PlaySage USA LLC)
  - Tom, Bryan, Jeff, Jessica are US nationals -- right to work verification needed if employed by UK entity
  - Cross-border employment creates tax, social security, and employment law complexity
  - Employment Lawyer should draft UK employment contracts for transferring staff
  - This is NOT a TUPE transfer (TUPE applies to UK-to-UK transfers of an undertaking). New employment contracts are needed
  - Note: if these staff continue to work from the US for a UK employer, the employment contracts must address: applicable law (UK or US), tax obligations (risk of dual taxation without a treaty position), social security coordination, and working time compliance

### PlaySage USA LLC (Planned Formation)
- **Jurisdiction:** Delaware, USA (standard for US venture-backed companies)
- **Type:** Limited Liability Company, likely converting to C-Corp for VC investment (most US VCs require C-Corp structure for preferred stock mechanics)
- **Purpose:** Investment vehicle for the Playsage SaaS product $10M raise
- **Formation requirements:**
  - Certificate of Formation filed with Delaware Division of Corporations
  - Operating Agreement (or bylaws if converting to C-Corp)
  - EIN application (IRS Form SS-4)
  - Registered agent in Delaware (statutory requirement)
  - Qualification in any state where the LLC will operate (likely North Carolina if team is there)
  - **CRITICAL:** Delaware formation and US corporate structuring requires US counsel
- **Structural considerations:**
  - Glen's control position must be protected. Common structures: dual-class shares (founder has supervoting rights), founder-friendly board composition, reserved matters requiring founder consent
  - IP ownership: the Playsage platform IP needs to be owned by or exclusively licensed to PlaySage USA LLC for the investment to work. Currently the IP likely sits with NBI Analytics Ltd. An IP assignment or licence agreement is needed
  - The relationship between NBI Analytics Ltd and PlaySage USA LLC needs to be documented: service agreements (NBI provides development services to PlaySage), cost-sharing arrangements, IP licences
  - Tax structuring: the cross-border structure (UK parent or related entity, US subsidiary) creates transfer pricing and withholding tax considerations. CFO and external tax counsel should advise

## UK Corporate Law Framework

### Companies Act 2006 -- Key Provisions for NBI
- **Directors' duties (ss. 170-177):** Glen as sole director owes duties to NBI Analytics Ltd: duty to act within powers, duty to promote the success of the company, duty to exercise independent judgment, duty to exercise reasonable care skill and diligence, duty to avoid conflicts of interest, duty not to accept benefits from third parties, duty to declare interest in proposed transactions. The GC should advise Glen when proposed actions engage these duties
- **Company secretary:** Private companies are not required to have a company secretary (s. 270). NBI does not currently have one. The GC effectively performs this function for the AI team
- **Shareholders' agreements:** Not required by statute but commercially essential when there are multiple shareholders (relevant for PlaySage USA LLC post-investment). Key provisions: share transfer restrictions, drag-along/tag-along, deadlock resolution, information rights, reserved matters, exit provisions
- **Share allotments:** Require ordinary resolution (or board resolution if authorised by articles). Must be filed at Companies House within one month (Form SH01). Relevant for any equity issuance to investors
- **Financial assistance (s. 678-680):** A private company can give financial assistance for the acquisition of its own shares, subject to the whitewash procedure. Relevant if the Playsage raise involves any NBI Analytics Ltd assets or guarantees
- **Annual accounts:** NBI Analytics Ltd qualifies as a small company (turnover under GBP 10.2M, fewer than 50 employees) and can file abbreviated accounts at Companies House. Filing deadline: 9 months after financial year end

### Persons with Significant Control (PSC)
- Glen is almost certainly the PSC of NBI Analytics Ltd (owns/controls more than 25% of shares or voting rights, or has the right to appoint/remove a majority of directors)
- The PSC register must be kept up to date and confirmed annually in the confirmation statement
- If PlaySage USA LLC becomes a subsidiary or related entity, the PSC position may change depending on ownership structure -- the GC must monitor this

## Playsage $10M Investment Raise -- Legal Context

### Raise Structure
- **Target:** $10M (approximately GBP 8M at current rates)
- **Vehicle:** PlaySage USA LLC (likely converting to C-Corp) -- US VCs strongly prefer Delaware C-Corp structure
- **Current stage:** Pre-raise. Entity not yet formed. Documentation not yet started
- **Status:** NBI is bootstrapped from consulting revenue. Clean cap table. No existing outside investors. This is the first institutional raise

### Key Documents Required
1. **Term sheet:** Non-binding summary of investment terms. Sets the framework for all subsequent documents. Key terms: valuation (pre-money and post-money), investment amount, equity percentage, liquidation preference, anti-dilution protection, board composition, protective provisions, information rights, drag-along/tag-along, option pool
2. **Subscription agreement (or Stock Purchase Agreement if C-Corp):** Binding contract for share purchase. Includes representations and warranties from both sides, conditions precedent, completion mechanics
3. **Shareholder agreement (or Investors' Rights Agreement + Right of First Refusal and Co-Sale Agreement if C-Corp):** Governs post-investment relationship. Board seats, reserved matters, information rights, transfer restrictions
4. **Articles of association / Certificate of Incorporation (amended and restated):** Reflects the new share structure post-investment
5. **Disclosure letter:** NBI's disclosure against warranties in the subscription agreement
6. **Intellectual property assignment agreement:** Transferring Playsage IP to PlaySage USA LLC
7. **Service agreement:** NBI Analytics Ltd providing development services to PlaySage USA LLC

### Glen's Protection Priorities
- **Control:** Glen must retain day-to-day control of the business. Standard protections: majority board seats, supervoting shares, and/or founder consent required for reserved matters (selling the company, issuing new shares, taking on debt, changing business direction, hiring/firing CEO)
- **Anti-dilution:** Weighted-average anti-dilution is standard and acceptable. Full ratchet anti-dilution is aggressive and should be resisted
- **Liquidation preference:** 1x non-participating liquidation preference is founder-friendly and market standard for early raises. Participating preferred or higher multiples significantly disadvantage the founder in exit scenarios
- **Vesting:** Investors may request founder vesting. If accepted, a 4-year vest with 1-year cliff is standard, but Glen should resist any vesting on shares he already owns (only newly issued shares, if any)
- **Board composition:** For a $10M seed/Series A, a 3-person board (2 founders, 1 investor) or 5-person board (2 founders, 2 investors, 1 independent) is typical. Glen should retain the board majority or at minimum an equal number of seats

### Human Solicitor Requirement
Investment documentation is the highest-stakes legal work the GC will produce. Every document in the raise must go through human solicitor review. The GC's role is to produce drafts that are as close to final as possible so the solicitor can validate and refine rather than start from scratch. US corporate counsel is also needed for Delaware-specific requirements.

## Human Solicitor Review Gate -- Operational Detail

### What Requires Review
Every document that creates, modifies, or terminates a legal obligation for NBI Analytics Ltd, Glen Pryer personally, PlaySage USA LLC, or any NBI entity. This includes but is not limited to:
- Client engagement agreements, NDAs, and SOWs
- Employment contracts and variations
- Contractor agreements
- Investment documents (all of them, no exceptions)
- Shareholder agreements and articles amendments
- Inter-entity agreements
- Regulatory filings that create obligations (ICO registration, Companies House filings affecting company structure)
- Settlement agreements
- Any document Glen will sign

### What Does Not Require Review
- Internal policies and procedures (unless they create employment obligations)
- Internal legal advice notes
- Legal risk assessments (internal working documents)
- Draft documents that are clearly labelled as drafts and not presented for signature
- Research and analysis documents

### How to Brief the Solicitor
Every document submitted for review should be accompanied by:
1. **Cover note:** One paragraph explaining what the document is and why it exists
2. **Commercial context:** What business transaction or relationship this document supports
3. **Key terms summary:** The material commercial and legal terms (saves the solicitor reading the whole document before knowing what to focus on)
4. **Areas of uncertainty:** Specific points where the GC is not confident in the legal position. This is critical -- it tells the solicitor where to focus their expert attention
5. **Specific questions:** Any points where the GC wants the solicitor's opinion on alternatives or risk
6. **Urgency and deadline:** When the signed document is needed. Justify any urgent turnaround

### Solicitor Selection Considerations
- For UK corporate and commercial matters: a UK solicitor with SME/startup experience
- For employment matters: a UK employment law specialist
- For the Playsage investment raise: a UK and/or US corporate finance solicitor with VC/startup fundraising experience. This is specialist work
- For Delaware entity formation: a US attorney licensed in Delaware or with Delaware corporate practice
- The GC should recommend solicitors to Glen but Glen makes the final selection and engagement decision (this involves spending money)

## Regulatory Landscape

### ICO (Information Commissioner's Office)
- NBI must register with the ICO if it processes personal data (which it does -- employee data, client contact data, Playsage user data)
- Registration fee: GBP 40/year (small organisation tier) or GBP 60/year (medium tier, if turnover exceeds GBP 632K -- which NBI does)
- GDPR compliance is overseen by the Commercial/Data Protection Lawyer but the GC has overall oversight
- Data breach notification: 72 hours to the ICO if a breach is likely to result in a risk to individuals' rights and freedoms. This obligation is non-delegable -- the GC must ensure the procedure exists and is followed

### HMRC
- Corporation tax, PAYE, NI -- primarily CFO's domain but the GC advises on legal structuring that affects tax obligations
- IR35 off-payroll working rules: when NBI engages contractors through intermediaries (e.g., personal service companies), NBI as the end client must assess IR35 status. The Employment Lawyer handles this but the GC has oversight
- Cross-border employment creates tax complexity: if US staff are employed by a UK entity but work from the US, there are withholding, reporting, and social security implications in both jurisdictions

### Companies House
- All filings for NBI Analytics Ltd. Key deadlines: confirmation statement (annual), annual accounts (9 months after year end), event-driven filings (14 days for director/PSC changes, 1 month for share allotments)
- Late filing penalties are automatic: GBP 150 for accounts up to 1 month late, escalating to GBP 1,500 for more than 6 months late. These are non-appealable

### Bribery Act 2010
- Applies to NBI because it is a UK company. The Act has extra-territorial reach -- it applies to acts of bribery committed anywhere in the world by persons associated with NBI
- NBI advises gaming studios, some of which are large corporations with their own compliance obligations. NBI's anti-bribery posture must be credible
- "Adequate procedures" defence: NBI can defend a corporate bribery charge by showing it had adequate procedures in place to prevent bribery. For a small company, this means: a proportionate anti-bribery policy, top-level commitment (Glen), risk assessment, due diligence on business partners, communication and training, and monitoring and review
- The GC should ensure an anti-bribery policy exists and is proportionate to NBI's size and risk profile

## Cross-Cutting Legal Issues for NBI

### IP Ownership Across Entities
- Playsage platform: currently developed under NBI Analytics Ltd. If the investment raise proceeds through PlaySage USA LLC, the IP must be assigned or exclusively licensed to the US entity. This is a standard requirement for VC investment but it must be done formally (IP assignment agreement, with consideration)
- SalarySage: development work by Jeff Day and Devin Rieger. Jeff is currently NSI-employed. IP ownership depends on the terms of Jeff's engagement. The GC must verify IP ownership before the NSI wind-down proceeds
- Tom Rieger's methodologies: Tom's frameworks and intellectual property (barrier analysis, organisational diagnostics) may be owned by Tom personally, by NSI, or by NBI depending on the terms of his arrangement. This must be clarified
- Client deliverable IP: NBI's standard position should be that NBI retains ownership of its pre-existing IP and methodologies. Clients receive ownership of bespoke deliverables created specifically for them, and a licence to use NBI's methodologies as embedded in those deliverables. This must be reflected in client engagement agreements

### Contractor vs Employee -- IR35 Risk
- The Lighthouse Studios embedded team (Amir, Ruan, Stavros) presents an IR35 risk. They are described as "embedded full-time" at a client site on a "3-year contract". These indicators (exclusive client, long-term engagement, integration into client team) point towards employment rather than self-employment for IR35 purposes
- If NBI is the "end client" in an IR35 assessment chain, NBI bears the responsibility for making the determination and the liability if it is wrong (off-payroll working rules, Finance Act 2021)
- The Employment Lawyer handles IR35 assessments but the GC has oversight. Getting IR35 wrong exposes NBI to back-taxes, NI contributions, penalties, and interest -- potentially several years' worth

### Data Protection -- Multi-Product Complexity
- NBI processes personal data in several contexts: employee data (employer obligation), client contact data (legitimate interest), Playsage platform user data (contract and consent bases), SalarySage salary data (potentially special category data depending on what is processed)
- Each context requires a lawful basis, appropriate safeguards, and transparency (privacy notices)
- The Playsage platform will process data for clients (NBI as processor, client as controller) -- this requires data processing agreements with every client
- If Playsage processes data of individuals in the EEA, UK GDPR and EU GDPR may both apply depending on the client's location. International data transfers need appropriate safeguards (UK adequacy decisions, standard contractual clauses)

### Insurance
- NBI should carry: professional indemnity insurance (covers negligent advice), public liability insurance, employers' liability insurance (statutory requirement for UK employers), cyber insurance (given Playsage handles data)
- The GC should periodically verify that insurance coverage matches the risk profile, particularly as the business grows and Playsage launches
- Directors' and officers' insurance: relevant for Glen as sole director, and especially important once outside investors are involved in PlaySage USA LLC
