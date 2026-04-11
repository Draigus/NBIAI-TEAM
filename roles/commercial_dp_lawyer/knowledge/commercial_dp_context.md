# Commercial and Data Protection Lawyer -- Tier 2 Knowledge

## UK Contract Law Basics

NBI's commercial agreements are governed by English law (law of England and Wales). The following principles underpin all contract drafting and review.

### Formation and Key Principles

**Essential elements of a valid contract:**
- Offer and acceptance
- Consideration (something of value exchanged)
- Intention to create legal relations (presumed in commercial contexts)
- Certainty of terms (the essential terms must be sufficiently clear)
- Capacity (the parties must have legal capacity to contract)

**Key legislation affecting commercial contracts:**
- **Unfair Contract Terms Act 1977 (UCTA):** Controls the use of exclusion and limitation clauses. Particularly relevant for NBI's liability caps in client agreements. s2(1) prohibits exclusion of liability for death or personal injury caused by negligence. s2(2) subjects other exclusion clauses to a "reasonableness" test
- **Supply of Goods and Services Act 1982 (SGSA):** Implies terms into contracts for the supply of services, including that services will be carried out with reasonable care and skill (s13). NBI's consulting services fall under this Act
- **Late Payment of Commercial Debts (Interest) Act 1998:** Gives NBI the right to charge statutory interest on late payments (currently 8% + Bank of England base rate)
- **Contracts (Rights of Third Parties) Act 1999:** Allows third parties to enforce contract terms in certain circumstances. NBI's standard agreements should include a clause excluding third-party rights unless specifically intended

**NBI's standard governing law and jurisdiction:**
- Governing law: Laws of England and Wales
- Jurisdiction: Exclusive jurisdiction of the courts of England and Wales
- Deviation from this requires General Counsel approval. Some clients (particularly US studios) may request New York law or Delaware law -- this is a significant departure that changes the legal risk profile and must be assessed case by case

### Standard Commercial Positions for NBI

**Liability:**
- NBI's standard liability cap: aggregate liability under the agreement capped at the total fees paid (or payable) in the 12 months preceding the claim, or 100% of the contract value for fixed-fee engagements
- Carve-outs from the cap: liability for death or personal injury (cannot be excluded under UCTA s2(1)), fraud, breaches of confidentiality, and data protection breaches (these may have a separate, higher cap)
- Consequential loss: NBI's standard position excludes liability for indirect, consequential, and special damages (loss of profit, loss of revenue, loss of data, loss of business opportunity). This exclusion must be mutual
- **Warning:** Data protection liability is harder to cap. Under UK GDPR, data subjects can claim compensation for material and non-material damage (Article 82). Contractual liability caps between controller and processor do not limit data subject claims. The DPA should address the allocation of data protection liability between NBI and the client, but this is a negotiation point

**Payment terms:**
- Standard: invoiced monthly in arrears, payable within 30 days of invoice date
- For Playsage subscriptions: invoiced in advance (monthly or annually depending on the plan), payable within 30 days
- Late payment: NBI reserves the right to charge interest under the Late Payment of Commercial Debts (Interest) Act 1998

**Termination:**
- Consulting engagements: either party may terminate on 30 days' written notice. Immediate termination for material breach (with opportunity to cure within 14 days for curable breaches)
- Playsage subscriptions: terminate at end of subscription term with 30 days' notice. Immediate termination for material breach. NBI may suspend access for non-payment
- Embedded placements: termination notice period matched to the engagement term (longer engagements warrant longer notice -- e.g. 90 days for the Lighthouse 3-year contract)

**Confidentiality:**
- Mutual confidentiality obligations
- Standard exceptions: information that is already public, independently developed, received from a third party without breach, or required by law to be disclosed
- Survival: confidentiality obligations survive termination for 3 years (standard) or perpetually for trade secrets
- Return/destruction of confidential information upon termination

**Non-solicitation:**
- NBI's standard includes a mutual non-solicitation of employees during the engagement and for 12 months after termination
- Does not restrict solicitation through general advertising
- Must be reasonable in scope to be enforceable

---

## UK GDPR Framework

### Legislative Structure

The UK's data protection framework consists of:

1. **UK GDPR:** The retained EU GDPR (Regulation (EU) 2016/679) as amended for the UK context by the Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019. This is the primary data protection law
2. **Data Protection Act 2018 (DPA 2018):** Supplements the UK GDPR with UK-specific provisions including: exemptions, law enforcement processing (Part 3), intelligence services processing (Part 4), and enforcement powers of the ICO
3. **Privacy and Electronic Communications Regulations 2003 (PECR):** Covers electronic marketing, cookies, and traffic data. Applies alongside the UK GDPR

### Key Definitions for NBI

| Term | Definition | NBI Context |
|---|---|---|
| **Personal data** | Any information relating to an identified or identifiable natural person (Article 4(1)) | Client contact details, employee data, potentially player data in Playsage (if players can be identified) |
| **Data controller** | The natural or legal person that determines the purposes and means of processing (Article 4(7)) | NBI is controller for: its own employee data, client contact data, website visitor data, marketing data |
| **Data processor** | A natural or legal person that processes personal data on behalf of the controller (Article 4(8)) | NBI is processor for: Playsage client data (studio inputs data, NBI processes it per their instructions) |
| **Processing** | Any operation performed on personal data (Article 4(2)) | Collection, storage, organisation, retrieval, use, disclosure, erasure -- essentially anything done with data |
| **Special category data** | Data revealing racial origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life or sexual orientation (Article 9) | NBI should not routinely process special category data. If any Playsage module could capture such data (e.g. health data in an employee wellness feature), a DPIA is mandatory |
| **Data Protection Officer (DPO)** | A designated individual overseeing data protection compliance (Articles 37-39) | DPO appointment is mandatory for: public authorities, organisations whose core activities require regular systematic monitoring of individuals at scale, or organisations processing special category data at scale. NBI likely does not meet these thresholds currently, but must reassess as Playsage scales |

### Lawful Bases for Processing (Article 6)

NBI must identify a lawful basis for each processing activity. The six lawful bases are:

| Basis | When Used by NBI |
|---|---|
| **(a) Consent** | Marketing emails to prospects who have opted in. Cookie consent for non-essential cookies |
| **(b) Contractual necessity** | Processing employee data to perform employment contracts. Processing client contact data to deliver services under engagement agreements |
| **(c) Legal obligation** | Processing employee data for tax/NI purposes (HMRC). Retaining financial records (Companies Act 2006) |
| **(d) Vital interests** | Emergency situations only. Not routinely applicable to NBI |
| **(e) Public task** | Not applicable to NBI (applies to public authorities) |
| **(f) Legitimate interests** | Client relationship management. Business analytics. Fraud prevention. Network and information security. The three-part test applies: (1) identify the legitimate interest, (2) show the processing is necessary for that interest, (3) balance against the individual's interests, rights, and freedoms |

**Consent under UK GDPR is:**
- Freely given (the individual has a genuine choice)
- Specific (separate consent for separate purposes)
- Informed (the individual knows what they are consenting to)
- An unambiguous indication of wishes (clear affirmative action -- no pre-ticked boxes)
- Withdrawable at any time (and withdrawal must be as easy as giving consent)

### NBI's Processing Activities Map

| Activity | NBI Role | Lawful Basis | Data Categories |
|---|---|---|---|
| Employee/contractor data management | Controller | Contractual necessity (b), Legal obligation (c) | Names, contact details, bank details, NI numbers, right to work docs |
| Client contact relationship management | Controller | Legitimate interest (f), Contractual necessity (b) | Names, email addresses, phone numbers, job titles, meeting notes |
| Website analytics (nbi-consulting.com) | Controller | Consent (a) for cookies; Legitimate interest (f) for aggregated analytics | IP addresses (anonymised), page views, device data |
| Marketing communications | Controller | Consent (a) for prospects; Legitimate interest (f) for existing clients (soft opt-in under PECR reg. 22) | Email addresses, names, engagement history |
| Playsage platform -- client data | Processor | Processing on behalf of client-controller under DPA | Varies by module: employee names, job titles, salaries, performance data, operational metrics. Potentially player data if player-facing modules are used |
| Playsage platform -- account data | Controller | Contractual necessity (b) | Client admin user names, email addresses, account credentials |
| NBIAI App -- internal agent management | Controller | Legitimate interest (f) | Agent execution data, task assignments (not personal data in the traditional sense, but if human users are logged, their data is personal data) |

---

## Data Processing Agreement (DPA) Requirements

### Article 28 UK GDPR -- Mandatory DPA Contents

The DPA between NBI (processor) and a Playsage client (controller) must include the following as a matter of law (Article 28(3)):

1. **Processing scope:** Subject matter, duration, nature, purpose, types of personal data, categories of data subjects
2. **Documented instructions:** NBI processes only on the controller's documented instructions (including regarding international transfers)
3. **Confidentiality:** NBI ensures persons authorised to process have committed to confidentiality
4. **Security measures:** NBI implements appropriate technical and organisational measures per Article 32
5. **Sub-processors:** NBI uses sub-processors only with prior written authorisation (general or specific). NBI imposes equivalent data protection obligations on sub-processors
6. **Data subject rights:** NBI assists the controller in responding to data subject rights requests
7. **Security and breach:** NBI assists the controller with security obligations, breach notification, DPIAs, and prior consultation
8. **Deletion/return:** At the end of processing, NBI deletes or returns all personal data (at the controller's choice) and deletes existing copies unless law requires retention
9. **Audit:** NBI makes available all information necessary to demonstrate compliance and allows audits by the controller or their mandated auditor

### NBI's Current Sub-Processors

These services process personal data on NBI's behalf and must be listed in every Playsage DPA:

| Sub-Processor | Processing Activity | Data Location | DPA Status |
|---|---|---|---|
| Supabase (via AWS) | Database hosting, authentication | Check Supabase's current hosting regions -- likely US (AWS us-east) or EU (AWS eu-central) | Review Supabase's DPA terms |
| Vercel | Application hosting, edge functions | Global CDN, compute typically US/EU | Review Vercel's DPA terms |
| Any email service provider | Transactional emails | Varies | Assess when adopted |
| Any analytics service | Product analytics | Varies | Assess when adopted |

**Critical action:** Verify the exact data processing locations for Supabase and Vercel. If personal data is transferred to the US, assess the adequacy mechanism (UK-US Data Bridge, or alternative transfer safeguards). This must be documented in the DPA.

### International Data Transfers

Under UK GDPR Articles 44-49, personal data cannot be transferred outside the UK unless adequate safeguards are in place.

**UK adequacy decisions (as of knowledge cutoff):**
- The UK has issued adequacy decisions for the EEA countries, and certain other countries
- The UK-US Data Bridge (the UK equivalent of the EU-US Data Privacy Framework) provides a transfer mechanism for transfers to US organisations that have self-certified
- **Verify:** Whether Supabase and Vercel (or their parent companies) have self-certified under the UK-US Data Bridge
- If a transfer mechanism is not available, NBI must use UK International Data Transfer Agreements (IDTAs) or the UK Addendum to the EU Standard Contractual Clauses

---

## ICO and Regulatory Obligations

### ICO Registration

NBI Analytics Ltd must be registered with the ICO as a data controller. Registration is required under s29 DPA 2018 (replacing the old notification system). Annual registration fee depends on turnover and staff:
- Tier 1 (micro organisation): GBP 40
- Tier 2 (small/medium organisation): GBP 60
- Tier 3 (large organisation): GBP 2,900

NBI likely falls into Tier 2. **Verify current registration status.**

### Breach Notification (Article 33 UK GDPR)

**The 72-hour rule:**
- NBI must notify the ICO within 72 hours of becoming "aware" of a personal data breach, unless the breach is unlikely to result in a risk to individuals' rights and freedoms
- "Aware" means when NBI has a reasonable degree of certainty that a breach has occurred
- If notification is not made within 72 hours, the notification must include the reasons for the delay
- Notification is made via the ICO's online reporting tool

**Information required in notification (Article 33(3)):**
- Nature of the breach (including, where possible, categories and approximate number of data subjects and records concerned)
- Name and contact details of NBI's data protection point of contact
- Description of likely consequences
- Description of measures taken or proposed to address the breach and mitigate effects

**NBI's internal breach notification chain (aligning with security policy):**
1. CTO becomes aware of breach (or is notified by a team member)
2. CTO notifies Glen within 1 hour (per security policy)
3. CTO notifies Commercial/DP Lawyer simultaneously
4. Commercial/DP Lawyer assesses ICO notification obligation
5. If notification required: drafts notification, submits to GC and Glen for approval
6. Notification filed within 72 hours of awareness
7. If client data affected: client notified per DPA terms
8. If high risk to individuals: individual notification under Article 34

### ICO Enforcement Powers

The ICO can:
- Issue information notices requiring NBI to provide information
- Issue assessment notices allowing the ICO to audit NBI's processing
- Issue enforcement notices requiring NBI to take or refrain from specific actions
- Issue penalty notices for infringements. Maximum fines:
  - Standard maximum: GBP 8,700,000 or 2% of total worldwide annual turnover (whichever is higher)
  - Higher maximum: GBP 17,500,000 or 4% of total worldwide annual turnover (whichever is higher)
  - The higher maximum applies to more serious infringements (breaches of data processing principles, conditions for consent, data subject rights, international transfer provisions)

For a company of NBI's size, fines would be proportionate, but any ICO investigation is disruptive and reputationally damaging. Prevention through robust compliance is the priority.

---

## NBI's Client Landscape -- Commercial Context

### Active Client Engagements (Contract Implications)

| Client | Engagement Type | Key Contract Considerations |
|---|---|---|
| **Couch Heroes** | Consulting engagement | Standard consulting agreement. Communication via Slack. Assess whether current agreement covers data protection adequately |
| **Lighthouse Studios** | 3-year embedded team contract | Long-term placement (Amir, Ruan, Stavros). Requires robust IP provisions for work created during placement. 90-day termination notice appropriate for a 3-year term. Data protection depends on whether NBI accesses Lighthouse's internal data |
| **Sarge Universe** | Contingent on funding | Work done unpaid pre-funding. Needs a clear agreement structure: pre-funding advisory (pro bono or deferred), post-funding team-building (commercial engagement). Milestone-based payment if contingent on funding |
| **Goals Studio** | Consulting engagement | Standard consulting agreement. Assess current contract status |

### Playsage-Specific Commercial Structure

Playsage pricing tiers affect contract structure:
- **Starter ($1,500/mo):** Standard subscription agreement. Minimal customisation. Click-through or low-touch sales process
- **Professional ($5,000/mo):** Standard subscription agreement with potentially some customised SOW elements. Medium-touch sales
- **Enterprise ($12-20K/mo):** Bespoke subscription agreement. Custom SLA, custom DPA provisions, dedicated support terms. High-touch sales with significant negotiation likely

The contract templates must scale across these tiers -- a single master subscription agreement with tier-specific schedules, rather than three entirely different agreements.

---

## Playsage Data Handling -- Technical Context

### Data Flow (Legal Perspective)

1. **Client inputs data:** Studio administrators upload or connect data sources. This is the client providing personal data to NBI for processing
2. **NBI processes data:** Playsage stores, organises, analyses, and presents the data. NBI acts as processor under the client's instructions (defined in the DPA)
3. **Client accesses insights:** The client's authorised users access dashboards, reports, and recommendations. This is the client retrieving their processed data
4. **NBI may generate aggregated insights:** Anonymised, aggregated data across clients could inform benchmarking. This is a separate processing purpose that must be disclosed in the DPA and may require separate consent or a distinct lawful basis

### Data Types in Playsage (Legal Classification)

| Playsage Module | Data Types | Personal Data? | Sensitivity |
|---|---|---|---|
| Executive Dashboard | Financial KPIs, operational metrics | Low -- primarily corporate data, not personal | Confidential (commercial) |
| Talent Intelligence | Employee names, roles, salaries, performance data | Yes -- directly identifying personal data | High |
| SalarySage (module) | Salary benchmarks, compensation data | Yes -- if linked to identifiable individuals | High |
| Studio Health | Team surveys, engagement scores | Potentially -- if responses are identifiable | Medium-High |
| Player Analytics | Player behaviour data, engagement metrics | Depends on whether players are identifiable. Pseudonymised player IDs may still be personal data if re-identification is possible | Medium-High |
| The Sage (recommendations) | Derived insights from all modules | Depends on underlying data. Recommendations based on personal data are themselves personal data | Varies |
| Cascade Engine | Cross-module data flows | Processes personal data from source modules | Varies by source |

### Technical Security Measures (Article 32 Context)

The CTO and DevOps Agent implement these; the Commercial/DP Lawyer documents them in DPAs and privacy policies:

- **Encryption at rest:** Supabase/PostgreSQL encryption (verify current implementation)
- **Encryption in transit:** TLS/HTTPS for all data transmission
- **Access controls:** Role-based access control (RBAC) within Playsage; tenant isolation between client data
- **Authentication:** JWT tokens, configurable expiry
- **Pseudonymisation:** Where appropriate (e.g. player data)
- **Backup and disaster recovery:** Verify current approach with DevOps
- **Incident detection and response:** Per the security policy

### Tenant Isolation

The security policy mandates logical tenant isolation: each client's data must be isolated from other clients' data with no cross-tenant data leakage. From a legal perspective, this is a fundamental DPA requirement -- NBI's sub-processing of Client A's data must never expose it to Client B.

**Technical implementation to verify with CTO:**
- Database-level isolation (separate schemas, row-level security, or separate databases)
- Application-level access controls preventing cross-tenant queries
- Audit logging of all data access with tenant context

---

## Cookie Consent and PECR

### Legal Requirements

The Privacy and Electronic Communications Regulations 2003 (PECR), reg. 6, require consent before storing or accessing information on a user's device (i.e. setting cookies), unless the cookie is "strictly necessary" for the provision of a service requested by the user.

**Cookie categories:**
- **Strictly necessary:** Required for the website/application to function (session cookies, authentication cookies, load balancing). Do not require consent. But must still be disclosed in the cookie policy
- **Functional:** Enhance functionality but are not strictly necessary (language preferences, user settings). Require consent
- **Analytics:** Track user behaviour (Google Analytics, Plausible, Mixpanel). Require consent
- **Marketing/advertising:** Track users for targeted advertising. Require consent

**Consent mechanism requirements (ICO guidance):**
- Consent must be obtained before non-essential cookies are set
- Pre-ticked boxes or implied consent (e.g. "by continuing to use this site you consent") are not valid under UK GDPR
- Users must have a genuine ability to accept or reject each category
- The consent mechanism must not use dark patterns (making "accept" prominent and "reject" hidden)
- Users must be able to withdraw consent as easily as they gave it
- Records of consent must be maintained

### NBI's Cookie Landscape

| Property | Cookie Types Expected | Priority |
|---|---|---|
| nbi-consulting.com | Analytics (if using tracking), functional (Framer platform cookies), potentially marketing | Medium -- relatively low data risk |
| Playsage platform | Strictly necessary (authentication, session), analytics (product usage), functional | High -- enterprise clients will expect compliant cookie handling |

---

## Records of Processing Activities (ROPA)

Article 30 UK GDPR requires NBI to maintain records of processing activities. This applies to NBI as both controller and processor.

### Controller ROPA (Article 30(1))

For each processing activity where NBI is controller, record:
- Name and contact details of the controller (NBI Analytics Ltd)
- Purposes of processing
- Categories of data subjects
- Categories of personal data
- Categories of recipients (including processors and international recipients)
- International transfers and safeguards
- Retention periods
- Description of technical and organisational security measures

### Processor ROPA (Article 30(2))

For each processing activity where NBI is processor (Playsage), record:
- Name and contact details of the processor (NBI Analytics Ltd)
- Name and contact details of each controller (each Playsage client)
- Categories of processing carried out on behalf of each controller
- International transfers and safeguards
- Description of technical and organisational security measures

The ROPA must be maintained in writing (including electronic form) and made available to the ICO on request.
