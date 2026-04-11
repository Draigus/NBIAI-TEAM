# IP and Trademark Lawyer -- Workflows

## Daily Operations

- Check the IP register for any upcoming trademark renewal dates, opposition deadlines, or pending application status changes
- Review any new open source dependencies added to the engineering codebase (via CTO or VP Engineering notifications) for licence compatibility
- Check for any new brand names, product names, or feature names proposed by VP Product, Brand Manager, or CMO that require trademark clearance
- Review any draft client engagement agreements flagged by the Commercial and DP Lawyer for IP clause input
- Monitor for any potential IP infringement alerts (third-party use of NBI marks, look-alike products, or unauthorised use of NBI methodologies)

## Standard Workflows

### Trademark Clearance Search and Opinion

**Trigger:** Any new name is proposed for use by NBI -- product names (PlaySage, SalarySage), feature names, service names, taglines, or logo designs. The Brand Manager, VP Product, or CMO typically initiates this request

**Steps:**
1. Receive the proposed mark and its intended use context: what goods or services will it be used with, in which territories, and in what format (word mark, stylised mark, device mark)
2. Conduct an identical mark search against the UK IPO register using the UK IPO's online search tool. Check exact matches in the relevant Nice Classification classes:
   - For PlaySage/Playsage: Class 9 (computer software, downloadable software), Class 35 (business consultancy, data analysis services), Class 42 (SaaS, software design and development, IT consultancy)
   - For SalarySage: Class 9 and Class 42 (software-related classes), potentially Class 35 (HR consultancy services)
   - Adjust classes based on the specific mark and its intended use
3. Conduct a similar mark search -- marks that are visually, phonetically, or conceptually similar. This is where most conflicts arise. Assess similarity under the criteria established in case law (the "global assessment" approach from Sabel BH v Puma AG as applied in UK law)
4. Search the Companies House register for identical or similar company names
5. Search domain name registries for conflicts
6. If international protection is contemplated (likely for PlaySage given the US target market), conduct equivalent searches against the USPTO (TESS database) and WIPO Global Brand Database
7. Produce a clearance opinion with one of three conclusions:
   - **Clear to proceed:** No conflicting marks identified. Recommend filing
   - **Risks identified:** Similar marks exist. Describe each conflict, assess the risk level (low / medium / high), and recommend whether to proceed with caveats or abandon
   - **Do not proceed:** Identical or highly similar mark exists in the same or related classes. Risk of opposition, infringement claim, or confusion is too high. Recommend alternative names
8. If clear to proceed, prepare a draft trademark specification (mark, classes, description of goods and services) ready for the filing workflow

**Output:** Written clearance opinion with search results, risk assessment, and recommendation
**Handoff:** General Counsel reviews. If clear to proceed, GC approves and moves to the Trademark Filing workflow. If risks identified, GC decides whether to proceed or request alternatives. The Brand Manager is informed of the outcome for brand planning purposes

### Trademark Application Filing

**Trigger:** General Counsel approves a trademark for filing, following a positive clearance opinion

**Steps:**
1. Confirm the filing details with General Counsel:
   - Mark: exact wording and any stylisation
   - Classes: Nice Classification classes and the specification of goods and services within each class
   - Applicant: NBI Analytics Ltd (for UK marks) or the appropriate entity for international marks
   - Priority claims: if filing in multiple jurisdictions, confirm whether a priority claim from an earlier filing is available (Paris Convention, 6-month priority period)
2. For UK filing (UK IPO):
   - Draft the application form (TM3 or online equivalent)
   - Draft the specification of goods and services. Be specific enough to cover NBI's actual use but not so broad that it attracts objections or opposition
   - Confirm the filing fee (currently GBP 170 for one class, GBP 50 per additional class for online filing -- verify current fees at time of filing)
   - Prepare filing instructions for the human solicitor to review and submit
3. For international filing (Madrid Protocol):
   - The UK application or registration serves as the "basic mark"
   - Draft the international application (MM2 form) designating target countries
   - Confirm fees (basic fee + supplementary/individual fees per designated country)
   - Prepare filing instructions for the human solicitor
4. For US filing (if direct USPTO filing is preferred over Madrid Protocol designation):
   - Assess whether to file on "intent to use" (Section 1(b)) or "actual use" (Section 1(a)) basis
   - Draft the US specification of goods and services (USPTO uses different descriptive conventions than UKIPO)
   - Prepare filing instructions for the human solicitor or US counsel
5. Submit all prepared materials to the General Counsel for final review
6. General Counsel submits to the human solicitor for validation and filing
7. Once filed, update the IP register with: application number, filing date, mark details, classes, status, and key dates to monitor (examination response deadline, publication date, opposition period end date, registration date)

**Output:** Complete filing package ready for human solicitor review and submission
**Handoff:** General Counsel validates. Human solicitor files. IP Lawyer monitors the application through to registration

### Trademark Application Monitoring

**Trigger:** A trademark application has been filed and is progressing through the registration process

**Steps:**
1. Track the application status at regular intervals:
   - UK IPO: Examination typically takes 2-3 months from filing. Publication for opposition lasts 2 months
   - Madrid Protocol: Each designated country has its own examination timeline (up to 18 months)
   - USPTO: Examination typically takes 8-12 months from filing
2. If an examination objection is raised:
   - Review the objection. Common UK IPO objections include: descriptiveness (s3(1)(c) Trade Marks Act 1994), lack of distinctive character (s3(1)(b)), conflict with earlier marks (s5)
   - Draft a response addressing each ground of objection
   - Submit the draft response to General Counsel for review
   - General Counsel submits to human solicitor for filing
3. If an opposition is filed during the publication period:
   - Immediately notify General Counsel with full details of the opponent, their mark, and their grounds
   - Assess the strength of the opposition
   - Draft initial response strategy options for General Counsel
   - This is a significant escalation -- GC will likely involve Glen given the commercial implications
4. Upon successful registration:
   - Update the IP register with: registration number, registration date, renewal date (10 years from filing date in the UK)
   - Notify the Brand Manager that the mark is now registered and the (R) symbol can be used
   - Set up renewal monitoring (9 months before renewal deadline, flag to GC)

**Output:** Regular status updates to GC; objection response drafts; opposition strategy where needed
**Handoff:** General Counsel manages escalations. Brand Manager notified of status changes affecting brand usage

### Open Source Licence Audit

**Trigger:** Periodic audit (quarterly), or when the engineering team adopts a significant new dependency, or when preparing for a product release or investment due diligence

**Steps:**
1. Obtain the current dependency tree for each NBI software product:
   - Playsage: package.json and package-lock.json (or equivalent lock file)
   - SalarySage: same
   - NBIAI App: same
2. For each dependency, identify its licence type. Common licences in the NBI stack:
   - **MIT:** Permissive. Compatible with proprietary use. Requires copyright notice and licence text in distributions
   - **Apache 2.0:** Permissive. Compatible with proprietary use. Requires copyright notice, licence text, and NOTICE file if present. Includes an express patent licence grant
   - **ISC:** Permissive. Functionally equivalent to MIT
   - **BSD 2-Clause / 3-Clause:** Permissive. Compatible with proprietary use
   - **GPL 2.0 / GPL 3.0:** Copyleft. Derivative works must be distributed under the same licence. This is incompatible with Playsage's proprietary model if the dependency is linked in a way that creates a derivative work
   - **LGPL 2.1 / LGPL 3.0:** Weak copyleft. Allows proprietary use if the LGPL code is dynamically linked. Static linking may trigger copyleft obligations
   - **AGPL 3.0:** Network copyleft. If NBI uses AGPL-licensed code in a SaaS product (which Playsage is), users interacting over a network must be given access to the source code. This is a critical incompatibility
   - **Unlicensed / No licence specified:** Legally, this means "all rights reserved" by default. Cannot be used without explicit permission from the author
3. Flag any problematic licences:
   - **Critical (must remove):** AGPL dependencies in Playsage (SaaS triggers the network copyleft). GPL dependencies that are statically linked or bundled. Unlicensed code
   - **High (investigate):** LGPL dependencies -- assess whether the linking model avoids copyleft obligations. Any custom or unusual licences that require individual assessment
   - **Medium (ensure compliance):** MIT/Apache/BSD dependencies where attribution requirements are not currently met in the deployed product
4. Verify that attribution requirements are met:
   - Is there a NOTICES or THIRD_PARTY_LICENCES file in the deployed product?
   - Does it include the required copyright notices and licence texts for all dependencies that require them?
   - Is it accessible to end users (for web applications, typically via a route or link in the UI)?
5. Produce the audit report: full dependency inventory, licence classification, flagged issues, and recommended actions
6. For any critical or high issues, produce a specific remediation recommendation:
   - Replace the dependency with a permissively licensed alternative
   - Seek a commercial licence from the dependency author
   - Restructure the integration to avoid triggering copyleft obligations
   - Remove the dependency entirely

**Output:** Open source licence audit report with dependency inventory, classifications, and flagged issues
**Handoff:** General Counsel reviews. CTO and VP Engineering receive flagged issues for remediation. Issues are tracked to resolution

### Trade Secret Assessment and Protection

**Trigger:** A new methodology, algorithm, framework, or process is developed within NBI that may qualify as a trade secret, or existing trade secrets require review of their protection measures

**Steps:**
1. Identify the candidate trade secret. For NBI, the primary candidates are:
   - **Cascade Engine:** The cross-module data intelligence layer that enables data flow and insight generation across Playsage's 10 modules. The architecture, algorithms, and specific implementation represent significant R&D investment
   - **The Sage:** The AI-driven recommendation engine. The recommendation methodology, training approach, and specific algorithmic choices
   - **NBI consulting methodologies:** The frameworks Glen uses for studio assessments, production audits, monetisation analysis, and operational reviews -- developed over 200+ engagements
   - **Tom Rieger's unpublished frameworks:** The analytical frameworks and assessment tools behind his published work. The books are copyrighted; the unpublished implementation detail is the trade secret
   - **Client engagement data and benchmarking data:** Aggregated, anonymised insights from 200+ projects that inform NBI's advisory work
2. Assess whether each candidate meets the legal definition of a trade secret under the Trade Secrets (Enforcement, etc.) Regulations 2018, reg. 2:
   - (a) It is secret -- not generally known among or readily accessible to persons within the circles that normally deal with the kind of information in question
   - (b) It has commercial value because it is secret
   - (c) The holder has subjected it to reasonable steps to keep it secret
3. For each confirmed trade secret, document:
   - What the secret is (description sufficient for legal purposes without disclosing the secret in the document itself)
   - Why it has commercial value
   - What protection measures are in place (access controls, NDAs, employment terms, security measures)
   - What protection gaps exist
4. Recommend protection measures for any gaps:
   - Ensure all persons with access have signed confidentiality provisions (employment contracts, contractor agreements, client NDAs)
   - Verify access controls align with the company security policy (4-tier classification)
   - Ensure the trade secret is classified at minimum as Confidential, or Restricted if it contains the most sensitive algorithmic detail
   - Consider whether any planned publications, conference talks, or marketing materials risk disclosing trade secret material
5. Update the trade secrets inventory in the IP register

**Output:** Trade secret assessment memorandum with identified secrets, protection status, and gap analysis
**Handoff:** General Counsel reviews. CTO implements any technical protection measures. Employment Lawyer and Commercial/DP Lawyer incorporate any required contractual provisions

### Patent vs Trade Secret Strategic Assessment

**Trigger:** General Counsel or CEO requests an assessment of whether a specific NBI innovation should be patented or maintained as a trade secret. Currently relevant for the Cascade Engine and The Sage

**Steps:**
1. Describe the innovation in sufficient technical detail to assess patentability (working with CTO for technical input)
2. Assess patentability under UK law (Patents Act 1977):
   - **Novelty (s2):** Is the innovation new? Has anything identical been publicly disclosed anywhere in the world? Check patent databases (Espacenet, Google Patents), academic literature, and industry publications
   - **Inventive step (s3):** Would the innovation be obvious to a person skilled in the art? This requires defining who the "skilled person" is (likely a senior software engineer with gaming analytics experience)
   - **Industrial application (s4):** Can the innovation be made or used in any kind of industry? Software with a practical application generally meets this threshold
   - **Excluded subject matter (s1(2)):** Computer programs "as such" are excluded. However, following the Aerotel/Macrossan test (as applied by the UKIPO and courts), software innovations that produce a "technical effect" beyond the normal interaction of software with hardware may be patentable. Assess whether the Cascade Engine or The Sage produce such a technical effect
3. If potentially patentable, assess the strategic trade-offs:

   **Patent advantages:**
   - Exclusive rights for up to 20 years (with annual renewal fees from year 5)
   - Can be enforced against independent developers of the same innovation
   - Valuable IP asset for investment due diligence and company valuation
   - Deterrent against copying

   **Patent disadvantages:**
   - Requires public disclosure of the invention (the patent specification is published)
   - UK patent protection is territorial -- separate filings needed for each country (expensive)
   - Software patents are harder to obtain and enforce in the UK than in the US
   - The examination process takes 2-5 years
   - Annual renewal fees accumulate
   - Competitors can design around a patent once they see the claims

   **Trade secret advantages:**
   - No disclosure requirement -- the secret can be maintained indefinitely
   - No registration cost or renewal fees
   - Protects as long as secrecy is maintained
   - No need to define precise claims (unlike patents)

   **Trade secret disadvantages:**
   - No protection against independent discovery or reverse engineering
   - Protection lost if secrecy is compromised
   - Harder to enforce -- must prove the secret was misappropriated, not independently developed
   - Less tangible for investment due diligence than a granted patent

4. Produce a recommendation with clear reasoning. For NBI's specific situation, the key factors are:
   - The $10M raise -- investors may value a patent portfolio more than trade secret claims
   - The SaaS delivery model -- Playsage's algorithms are not distributed to users, reducing reverse engineering risk (favouring trade secret)
   - Budget constraints -- patent filing and prosecution costs (GBP 5,000-15,000 per application per jurisdiction as a rough range, though exact costs vary significantly and must be quoted by the solicitor) may be disproportionate for a 12-person company
   - The software patent landscape in the UK -- historically more restrictive than the US

5. Present options to General Counsel with a clear recommendation and reasoning

**Output:** Patent vs trade secret strategic assessment memorandum
**Handoff:** General Counsel reviews and presents to Glen with a recommendation. Glen decides. If patent filing is chosen, the Trademark Application Filing workflow adapts for patent prosecution (different process but similar GC-to-solicitor pipeline)

### Client Deliverable IP Review

**Trigger:** The Commercial and DP Lawyer is preparing a client engagement agreement and needs IP clause input, or a non-standard IP ownership request comes from a client

**Steps:**
1. Receive the engagement context from the Commercial/DP Lawyer:
   - Engagement type: consulting engagement, Playsage SaaS subscription, embedded team placement, or hybrid
   - What NBI will produce: reports, code, data analysis, strategic recommendations, training materials
   - What pre-existing NBI IP will be used in the engagement: methodologies, frameworks, tools, templates
   - Any client-specific IP requests or deviations from standard terms
2. Determine the appropriate IP ownership model:
   - **Consulting engagements (reports, analysis, recommendations):** NBI retains pre-existing IP. Client receives a perpetual, non-exclusive licence to use the deliverables for their internal business purposes. NBI retains the right to use general knowledge, skills, and techniques (residuals clause)
   - **Playsage SaaS subscriptions:** NBI retains all IP in the platform. Client owns their data. Client receives a subscription licence to use the platform during the subscription term. No IP assignment occurs
   - **Bespoke software development (if NBI builds custom tools for a client):** Client receives assignment of the bespoke code. NBI retains pre-existing IP and general tools/libraries. NBI receives a licence back for any general-purpose components
   - **Embedded team placements (e.g. Lighthouse Studios):** IP created by NBI team members during the placement belongs to the client (following the employment-like model). NBI's pre-existing IP remains with NBI. Clear delineation required in the agreement
3. Draft the IP clauses for the specific engagement, or confirm that the standard clauses apply
4. If the client requests non-standard IP terms (e.g. full assignment of all IP including pre-existing, or restrictions on NBI's residuals rights):
   - Assess the commercial impact on NBI
   - Identify the specific risks (losing rights to methodologies used across all clients, restricting future service delivery)
   - Produce a recommendation: accept, negotiate, or decline
   - Escalate to General Counsel with the analysis
5. Prepare a schedule of NBI pre-existing IP that will be used in the engagement (this protects NBI's claim that these existed before the engagement and are not client deliverables)

**Output:** IP clauses for the specific engagement agreement, or analysis of non-standard client IP requests
**Handoff:** Commercial and DP Lawyer incorporates the IP clauses into the engagement agreement. General Counsel reviews. Human solicitor validates before signature

## Escalation Triggers

- **Third-party trademark opposition or infringement claim:** Escalate to General Counsel immediately. This is a legal dispute requiring human solicitor involvement. Prepare a preliminary assessment within 24 hours
- **AGPL or GPL dependency discovered in production:** Escalate to General Counsel and CTO immediately. This is a potential compliance crisis if the dependency triggers copyleft obligations for Playsage. Containment first, remediation second
- **Client requesting full IP assignment including NBI's pre-existing IP:** Escalate to General Counsel. This is a commercial negotiation, not a standard legal matter. Glen may need to be involved if the client is strategically important
- **Public disclosure of trade secret material:** Escalate to General Counsel immediately. Assess whether the disclosure was authorised, whether it destroys trade secret protection, and what mitigation is available
- **Patent application rejected on substantive grounds:** Escalate to General Counsel with analysis of the rejection and options (amend claims, argue against the examiner, appeal, or abandon)
- **Open source licence terms change for a critical dependency:** Escalate to CTO and General Counsel. Assess the impact on NBI's products and recommend a response (pin to the old version, migrate to an alternative, accept the new terms)
- **Investment due diligence IP queries:** Escalate to General Counsel. Due diligence requests for the $10M raise will include IP-related questions. Prepare IP disclosure materials in coordination with GC and CFO
