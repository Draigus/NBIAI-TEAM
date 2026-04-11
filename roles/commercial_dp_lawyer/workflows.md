# Commercial and Data Protection Lawyer -- Workflows

## Daily Operations

- Check for new contract requests from the CMO/Head of BD or other agents (new client engagements, renewals, amendments, vendor agreements)
- Review any pending data subject access requests (DSARs) for approaching deadlines (30-day statutory limit under Article 15 UK GDPR)
- Check for data protection notifications from the CTO or DevOps Agent (security incidents, infrastructure changes, new sub-processor adoptions)
- Monitor for any changes to ICO guidance or UK data protection law that affect NBI's compliance framework
- Review the DSAR log and vendor assessment register for items requiring action

## Standard Workflows

### Client Engagement Agreement Drafting

**Trigger:** The CMO/Head of BD or a C-suite agent requests a contract for a new client engagement, or an existing client engagement is being renewed or amended

**Steps:**
1. Receive the engagement brief from the requesting agent. Establish:
   - Client name and entity details
   - Engagement type: consulting, Playsage SaaS subscription, embedded team placement, training, or hybrid
   - Scope of work (high level -- detailed scope goes in the SOW)
   - Commercial terms: pricing model (time-and-materials, fixed fee, subscription), payment terms, estimated value, duration
   - Whether personal data will be processed (if yes, a DPA is required as an annex)
   - Any client-specific requirements or non-standard requests communicated during BD discussions

2. Select the appropriate standard template:
   - **Consulting master agreement + SOW:** For advisory engagements. Master agreement covers general terms (liability, IP, confidentiality, termination, dispute resolution). SOW covers project specifics
   - **Playsage subscription agreement + DPA:** For SaaS clients. Includes subscription terms, SLA, acceptable use, and DPA as a mandatory annex
   - **Embedded team agreement:** For long-term resource placements. Covers resource allocation, management authority, performance, IP, and confidentiality
   - **Training agreement:** For standalone training delivery. Simpler terms

3. Populate the template with engagement-specific details:
   - Parties and their registered addresses
   - Commencement date and term (fixed or rolling)
   - Fees and payment terms (NBI standard: invoiced monthly, payable within 30 days)
   - Scope summary (detailed in the SOW)
   - Applicable law: England and Wales (NBI standard)
   - Jurisdiction: English courts (NBI standard)

4. Request IP clause input from the IP and Trademark Lawyer:
   - Provide the engagement context (type, what NBI will produce, what pre-existing IP will be used)
   - Receive IP ownership clauses and pre-existing IP schedule
   - Incorporate into the agreement

5. If personal data processing is involved, attach the DPA:
   - Populate the DPA annex with: subject matter and duration, nature and purpose of processing, types of personal data, categories of data subjects
   - List NBI's current sub-processors (Supabase, Vercel, any others) with their processing activities and locations
   - Reference the technical and organisational measures (Article 32 compliance) -- these should be documented in a separate security measures schedule

6. Review the complete draft against NBI's standard positions:
   - **Liability:** Capped at the fees paid under the engagement (or a reasonable multiple). Never unlimited. Professional indemnity insurance coverage should be considered
   - **Indemnities:** Mutual and limited. NBI does not accept unlimited indemnity obligations
   - **Termination:** Reasonable notice period (30-60 days for consulting, per-contract term for SaaS). Termination for cause provisions
   - **Confidentiality:** Mutual. Surviving the termination of the agreement (typically 2-5 years, or perpetual for trade secrets)
   - **Force majeure:** Standard provision covering events beyond reasonable control
   - **Entire agreement:** The agreement and its schedules constitute the entire agreement

7. Submit the draft to the General Counsel for review
8. GC-approved draft goes to the human solicitor for validation
9. Once validated, the CMO/Head of BD sends to the client for negotiation

**Output:** Draft engagement agreement with all annexes (SOW template, DPA where applicable, IP schedule)
**Handoff:** General Counsel reviews. Human solicitor validates. CMO/Head of BD manages client negotiation. Glen approves before signature on strategically important deals

### Non-Standard Term Assessment

**Trigger:** A client requests contractual terms that deviate from NBI's standard positions, or the CMO/Head of BD flags a negotiation point that requires legal assessment

**Steps:**
1. Receive the non-standard term request. Document:
   - What the client is requesting (exact wording or commercial intent)
   - Which standard NBI position it deviates from
   - The commercial context (how important is this client, what is the engagement value, is this a one-off or a precedent)

2. Assess the risk:
   - **Legal risk:** Does accepting this term create a legal exposure? Quantify where possible (e.g. "accepting unlimited liability exposes NBI to uncapped financial risk in the event of a breach of contract claim")
   - **Commercial risk:** Does accepting this term set a precedent that other clients will request? Does it undermine NBI's standard position?
   - **Data protection risk:** If the non-standard term relates to data handling (e.g. client requesting that NBI store data in a specific jurisdiction, or client refusing standard audit rights), assess GDPR compliance implications
   - **IP risk:** If the non-standard term relates to IP ownership, request assessment from the IP and Trademark Lawyer

3. Produce a recommendation with one of four outcomes:
   - **Accept:** The risk is low and the commercial benefit justifies acceptance
   - **Accept with mitigation:** The risk is manageable if additional protective language is added (draft the mitigating language)
   - **Counter-propose:** The client's request is not acceptable as stated, but a compromise position exists that protects NBI while addressing the client's concern (draft the counter-proposal)
   - **Decline:** The risk is too high. Explain why and provide the reasoning the CMO/Head of BD can use with the client

4. If the recommendation is anything other than "Accept," escalate to the General Counsel with the full analysis before responding to the requesting agent

**Output:** Risk assessment with clear recommendation and any draft alternative language
**Handoff:** General Counsel approves the recommendation. CMO/Head of BD communicates to the client. If the client accepts NBI's counter-proposal, the contract is updated and re-submitted through the standard approval flow

### Data Processing Agreement (DPA) Drafting

**Trigger:** A new Playsage client is onboarded, or any NBI engagement involves processing personal data on behalf of a client

**Steps:**
1. Identify the data processing relationship:
   - **NBI as processor, client as controller:** The standard Playsage model. Client inputs data; NBI processes it per the client's instructions via the Playsage platform
   - **NBI as joint controller:** Rare, but possible if NBI and the client jointly determine the purposes and means of processing. Requires a different agreement structure (Article 26 UK GDPR)
   - **NBI as controller:** If NBI processes client contact data for its own purposes (relationship management, marketing). Governed by NBI's privacy policy, not a DPA

2. For the standard processor DPA (Article 28 UK GDPR), draft the following mandatory clauses:
   - **Subject matter and duration:** What processing NBI will perform and for how long
   - **Nature and purpose:** Why NBI is processing the data (to provide the Playsage service)
   - **Types of personal data:** Categories of data the client will input (employee names, email addresses, job titles, performance data, salary data -- depends on which Playsage modules the client uses)
   - **Categories of data subjects:** Whose data is being processed (client's employees, contractors, potentially players if player analytics modules are used)
   - **Processor obligations:**
     - Process only on documented instructions from the controller (Article 28(3)(a))
     - Ensure persons authorised to process have committed to confidentiality (Article 28(3)(b))
     - Implement appropriate technical and organisational measures (Article 28(3)(c), referencing Article 32)
     - Engage sub-processors only with prior written authorisation of the controller (Article 28(3)(d)) -- NBI's standard is general authorisation with notification of changes
     - Assist the controller with data subject rights requests (Article 28(3)(e))
     - Assist with security, breach notification, DPIAs, and prior consultation (Article 28(3)(f))
     - Delete or return all personal data at the end of the processing (Article 28(3)(g))
     - Make available all information necessary to demonstrate compliance and allow audits (Article 28(3)(h))
   - **Sub-processor list:** Current sub-processors with processing activities and locations. Mechanism for adding new sub-processors (notification with right to object)
   - **International transfers:** If data is transferred outside the UK, the transfer mechanism (UK adequacy decision, UK International Data Transfer Agreement, or UK Addendum to EU SCCs)
   - **Breach notification:** NBI notifies the client without undue delay (and in any event within 24-48 hours as a contractual commitment, inside the 72-hour regulatory window) after becoming aware of a personal data breach

3. Attach the technical and organisational measures schedule (Article 32):
   - Encryption at rest and in transit
   - Access controls (RBAC as implemented in Playsage)
   - Pseudonymisation where appropriate
   - Resilience and disaster recovery
   - Regular testing of security measures
   - Personnel training and confidentiality

4. Request review from the CTO to confirm that the technical measures described in the DPA accurately reflect what is implemented

5. Submit the complete DPA to the General Counsel for review

6. The DPA is attached to the client engagement agreement as an annex and follows the same approval and signature flow

**Output:** Complete DPA ready for attachment to the client engagement agreement
**Handoff:** Incorporated into the engagement agreement. General Counsel reviews. Human solicitor validates. Executed before any data processing begins

### Data Protection Impact Assessment (DPIA)

**Trigger:** A new processing activity is proposed that is likely to result in a high risk to the rights and freedoms of natural persons (Article 35(1) UK GDPR). Triggers include: systematic and extensive evaluation of personal aspects (profiling), large-scale processing of special category data, or systematic monitoring of publicly accessible areas. Also triggered by the CTO or VP Product proposing a new Playsage feature that involves new data processing

**Steps:**
1. Describe the proposed processing:
   - What personal data will be processed
   - For what purpose
   - By what means (technical systems, algorithms, manual processes)
   - Who will have access
   - How long the data will be retained

2. Assess necessity and proportionality:
   - Is the processing necessary for the stated purpose? Could the purpose be achieved with less data or less intrusive processing?
   - Is the processing proportionate to the aim? Does it process more data than needed?

3. Identify and assess risks to data subjects:
   - Unauthorised access or disclosure
   - Inaccurate data leading to harmful decisions
   - Excessive data collection
   - Lack of transparency about processing
   - Inability to exercise data subject rights
   - Discrimination through profiling or automated decision-making

4. For each identified risk, assess:
   - Likelihood: remote / possible / likely / almost certain
   - Severity: minimal / limited / significant / maximum
   - Overall risk level: low / medium / high / critical

5. Identify measures to mitigate each risk:
   - Technical measures (encryption, access controls, pseudonymisation, data minimisation)
   - Organisational measures (policies, training, audit procedures)
   - Contractual measures (DPA terms, sub-processor obligations)

6. Assess residual risk after mitigation. If residual risk remains high, Article 36 UK GDPR requires prior consultation with the ICO before the processing begins

7. Document the DPIA in a structured report

8. Submit to the General Counsel for review

9. If the DPIA concludes the processing can proceed (with or without additional measures), notify the CTO and VP Product of any required changes

10. If the DPIA concludes that residual risk is high and prior consultation with the ICO is required, escalate to the General Counsel and Glen

**Output:** DPIA report with risk assessment, mitigation measures, and conclusion (proceed / proceed with changes / do not proceed without ICO consultation)
**Handoff:** General Counsel reviews and approves. CTO implements required technical measures. VP Product adjusts product plans if needed. Glen approves if ICO consultation is required

### Data Subject Access Request (DSAR) Handling

**Trigger:** A data subject (individual) exercises any right under Articles 15-22 UK GDPR. Most commonly a Subject Access Request (Article 15) requesting a copy of their personal data

**Steps:**
1. Receive the request. It can arrive through any channel (email, letter, in-app request, verbal). There is no required format -- if someone asks for their data, it is a DSAR regardless of how they phrase it

2. Log the request in the DSAR register with:
   - Date received
   - Identity of the data subject (name, email, any identifiers)
   - Nature of the request (access, rectification, erasure, restriction, portability, objection)
   - Statutory deadline (30 calendar days from receipt for most requests; extendable by 2 months for complex or numerous requests, with notification to the data subject within the first 30 days)

3. Verify the identity of the data subject. Do not release personal data to someone who has not adequately identified themselves. Verification should be proportionate -- if the request comes from a known email address associated with an existing account, that may be sufficient. If there is doubt, request additional identification

4. Determine NBI's capacity:
   - **Controller data (NBI's own):** NBI handles the request directly. Search all NBI systems for the data subject's personal data (email, CRM, internal tools, Playsage admin data)
   - **Processor data (Playsage client data):** If the request relates to data NBI processes on behalf of a client, NBI must refer the data subject to the client (the controller) or forward the request to the client for their direction, depending on the DPA terms. NBI does not respond directly to DSARs about data it processes as a processor unless instructed by the controller

5. For controller DSARs, compile the response:
   - **Access request:** Provide a copy of all personal data held, the purposes of processing, categories of data, recipients, retention periods, information about rights, and the source of the data
   - **Rectification request:** Correct the data and confirm the correction
   - **Erasure request:** Assess whether erasure is required (no lawful basis for continued retention) or whether an exemption applies (legal obligation, defence of legal claims, etc.). If erasure is required, delete the data and confirm. If an exemption applies, explain the exemption
   - **Portability request:** Provide the data in a structured, commonly used, machine-readable format (JSON or CSV)

6. Send the response within the 30-day deadline. The response must be free of charge (unless the request is manifestly unfounded or excessive, in which case a reasonable fee may be charged or the request refused)

7. Update the DSAR log with the outcome and response date

**Output:** Completed DSAR response within the statutory deadline
**Handoff:** If escalation is needed (complex request, doubt about identity, request touching client data), escalate to General Counsel. CTO may need to assist with data extraction from technical systems

### Breach Notification Assessment and Response

**Trigger:** The CTO or any agent reports a confirmed or suspected personal data breach (as classified in the security policy). This workflow covers the legal assessment and notification obligations; the technical incident response is owned by the CTO

**Steps:**
1. Receive the breach report from the CTO. Establish the facts:
   - What happened (unauthorised access, data loss, data disclosure, system compromise)
   - What personal data is affected (categories and approximate volume)
   - How many individuals are affected
   - When the breach occurred and when it was discovered
   - Current containment status
   - Whether the data was encrypted or otherwise protected

2. Start the 72-hour clock. Under Article 33 UK GDPR, the clock starts when NBI "becomes aware" of the breach. Document the exact time of awareness

3. Assess whether ICO notification is required (Article 33(1)):
   - Notification is required unless the breach is "unlikely to result in a risk to the rights and freedoms of natural persons"
   - Use the ICO's risk assessment framework: consider the type of breach, the nature and sensitivity of the data, the number of individuals affected, the severity of consequences, and any mitigating factors (e.g. encryption)
   - Document the assessment reasoning regardless of the conclusion

4. If ICO notification IS required:
   - Use the pre-drafted ICO notification template
   - Populate with: nature of the breach, categories and approximate number of individuals affected, categories and approximate number of records affected, name and contact details of NBI's point of contact, description of likely consequences, description of measures taken or proposed
   - Submit to General Counsel for urgent review
   - Glen must approve before submission to the ICO
   - Submit via the ICO's online notification portal within 72 hours of awareness
   - If full information is not available within 72 hours, make an initial notification and provide supplementary information as it becomes available (Article 33(4) permits phased notification)

5. Assess whether data subject notification is required (Article 34(1)):
   - Required when the breach is "likely to result in a high risk to the rights and freedoms of natural persons"
   - Higher threshold than ICO notification -- not every ICO-notifiable breach requires individual notification
   - Notification is not required if: the data was encrypted and the key was not compromised, subsequent measures ensure the high risk is no longer likely to materialise, or individual notification would involve disproportionate effort (in which case a public communication is sufficient)

6. If data subject notification IS required:
   - Use the pre-drafted individual notification template
   - Describe the breach in clear, plain English
   - Explain the likely consequences
   - Describe the measures taken
   - Provide advice on protective steps the individual can take
   - Submit to General Counsel and Glen for approval before sending

7. If the breach affects client data (Playsage):
   - Notify the affected client as required under the DPA terms (typically within 24-48 hours contractually)
   - The client, as controller, decides whether to notify their own data subjects
   - Provide the client with all information needed to make that decision and to comply with their own notification obligations

8. Document the entire breach response: timeline, decisions, notifications sent, ICO reference number (if applicable), and lessons learned

9. Conduct a post-incident review with the CTO to identify root causes and preventive measures

**Output:** Breach assessment, ICO notification (if required), data subject notification (if required), client notification (if required), post-incident report
**Handoff:** General Counsel approves all external notifications. Glen approves ICO and client notifications. CTO implements technical remediation. COO coordinates operational response

### Privacy Policy Drafting and Update

**Trigger:** Initial drafting for a new NBI product or website, or update required due to a change in processing activities, a new sub-processor, or a change in law

**Steps:**
1. Map the processing activities for the relevant product/website:
   - What personal data is collected (directly and indirectly)
   - Why it is collected (purposes of processing)
   - What the lawful basis is for each purpose (Article 6 UK GDPR)
   - Who the data is shared with (internal recipients, sub-processors, third parties)
   - Whether data is transferred internationally
   - How long data is retained
   - What data subject rights apply

2. Draft the privacy policy covering all mandatory information under Article 13 UK GDPR (for data collected directly from data subjects):
   - Identity and contact details of the controller (NBI Analytics Ltd)
   - Contact details of the data protection point of contact (NBI does not have a mandatory DPO -- assess whether one is needed; currently unlikely given NBI's size and processing activities, but monitor)
   - Purposes and lawful bases for processing
   - Legitimate interests pursued (where legitimate interest is the lawful basis)
   - Recipients or categories of recipients
   - International transfer details and safeguards
   - Retention periods (or criteria for determining retention)
   - Data subject rights
   - Right to complain to the ICO
   - Whether provision of data is a statutory or contractual requirement
   - Information about automated decision-making (if applicable)

3. Ensure the language is clear, concise, and accessible -- the ICO expects privacy policies to be understandable to the general public, not written in legalese

4. Submit to General Counsel for review

5. Once approved, coordinate with the relevant technical agent (DevOps for website, CTO for Playsage) to publish the policy in the correct location

6. Set a review date (at minimum annually, or sooner if processing changes)

**Output:** Draft privacy policy compliant with UK GDPR Articles 13-14
**Handoff:** General Counsel reviews. Human solicitor validates. Technical team publishes. Policy is linked from all relevant data collection points

### Vendor Data Protection Assessment

**Trigger:** NBI proposes to adopt a new third-party service that will process personal data (e.g. a new SaaS tool, a new hosting provider, a new analytics service), or a periodic review of existing vendors is due

**Steps:**
1. Identify what personal data the vendor will process:
   - Data categories (names, emails, usage data, etc.)
   - Data subjects (NBI employees, clients, Playsage end users)
   - Processing activities (storage, analytics, communication, hosting)

2. Review the vendor's data protection posture:
   - Does the vendor have a published privacy policy and DPA/data processing terms?
   - Where does the vendor process and store data? (UK, EEA, US, other)
   - If data is transferred outside the UK, what transfer mechanism is in place? (UK adequacy decision covers EEA and certain countries; US transfers require assessment of the UK-US Data Bridge or alternative mechanism)
   - What security certifications does the vendor hold? (SOC 2, ISO 27001, etc.)
   - Does the vendor's DPA comply with Article 28 UK GDPR?
   - Does the vendor use sub-processors, and if so, does the DPA include a sub-processor notification mechanism?

3. Assess the risk:
   - **Low risk:** Vendor processes minimal personal data, is UK/EEA-based, has adequate DPA terms and security certifications
   - **Medium risk:** Vendor processes personal data at scale or in a sensitive context, or is based outside the UK/EEA with an adequate transfer mechanism in place
   - **High risk:** Vendor processes sensitive data, lacks adequate DPA terms, transfers data to jurisdictions without adequate protection, or lacks security certifications

4. Produce a recommendation:
   - **Approve:** Vendor meets NBI's data protection requirements
   - **Approve with conditions:** Vendor is acceptable subject to specific contractual or technical requirements being met
   - **Do not approve:** Vendor does not meet NBI's data protection requirements and the gaps cannot be remediated

5. If approved, add the vendor to the sub-processor list in NBI's DPA templates and notify Playsage clients of the new sub-processor (per the DPA notification mechanism)

6. Log the assessment in the vendor assessment register

**Output:** Vendor data protection assessment with recommendation
**Handoff:** General Counsel approves new vendor engagements involving personal data. CTO and DevOps implement the vendor integration. Playsage clients notified of new sub-processors

## Escalation Triggers

- **Confirmed personal data breach:** Immediately escalate to General Counsel and CTO. The 72-hour ICO notification clock is running. Every hour matters
- **ICO correspondence:** Any communication from the ICO (enquiry, audit notification, enforcement action, complaint referral) is escalated to General Counsel and Glen immediately
- **Client refusing to sign DPA:** Escalate to General Counsel. NBI cannot process personal data without a DPA in place. This may require commercial negotiation or, in extremis, declining the engagement
- **Non-standard liability or indemnity request:** Escalate to General Counsel. Unlimited liability or uncapped indemnities are never acceptable without GC and Glen approval
- **Data subject complaint:** If a data subject complains about NBI's data handling (directly or via the ICO), escalate to General Counsel for assessment
- **DPIA concluding high residual risk:** Escalate to General Counsel and Glen. Prior consultation with the ICO may be required under Article 36 UK GDPR
- **International data transfer without adequate safeguards:** If a vendor or client arrangement involves transferring personal data to a country without a UK adequacy decision and without an alternative transfer mechanism, escalate immediately. This is a compliance gap that must be resolved before the transfer occurs
- **Vendor security breach:** If a sub-processor (Supabase, Vercel, etc.) notifies NBI of a security breach, assess whether NBI's data is affected and trigger the breach notification workflow if so
