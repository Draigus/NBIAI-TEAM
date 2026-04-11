# IP and Trademark Lawyer -- Tier 2 Knowledge

## UK Intellectual Property Framework

NBI Analytics Ltd is a UK-registered company. UK IP law is the primary framework. Where NBI operates internationally (US market for Playsage, international clients), the relevant foreign law is flagged but detailed foreign law advice must be obtained from qualified local counsel.

### Key UK IP Legislation

| Area | Primary Legislation | Key Provisions |
|---|---|---|
| Trademarks | Trade Marks Act 1994 (TMA 1994) | Registration, infringement, passing off |
| Copyright | Copyright, Designs and Patents Act 1988 (CDPA 1988) | Software copyright, moral rights, employer ownership |
| Patents | Patents Act 1977 | Patentability criteria, software exclusion, employee inventions |
| Trade Secrets | Trade Secrets (Enforcement, etc.) Regulations 2018 (SI 2018/597) | Definition, misappropriation, remedies |
| Database Rights | Copyright and Rights in Databases Regulations 1997 (SI 1997/3032) | Sui generis database right (separate from copyright) |
| Designs | Registered Designs Act 1949; CDPA 1988 Part III | UI design protection (registered and unregistered) |

---

## Trademark Law and Registration

### UK Trademark Registration Process (UK IPO)

**Registrable marks (s1 TMA 1994):** Any sign capable of being represented graphically that is capable of distinguishing goods or services of one undertaking from those of other undertakings. This includes words, logos, shapes, colours, sounds, and combinations.

**Absolute grounds for refusal (s3 TMA 1994):**
- s3(1)(a): Signs that do not satisfy the requirements of s1
- s3(1)(b): Trade marks devoid of distinctive character
- s3(1)(c): Trade marks consisting exclusively of signs that designate the kind, quality, intended purpose, value, geographical origin, or time of production of the goods/services
- s3(1)(d): Trade marks consisting exclusively of signs that have become customary in the current language or trade practices

**Relative grounds for refusal (s5 TMA 1994):**
- s5(1): Identical mark for identical goods/services
- s5(2): Identical or similar mark for identical or similar goods/services where there exists a likelihood of confusion
- s5(3): Identical or similar mark where the earlier mark has a reputation and use of the later mark would take unfair advantage of, or be detrimental to, the distinctive character or repute of the earlier mark

**NBI-specific Nice Classification classes:**
- **Class 9:** Computer software; downloadable software applications; data processing software; software for data analytics and business intelligence (covers the Playsage software product)
- **Class 35:** Business management consultancy; business data analysis; advisory services relating to business management; market research and analysis (covers NBI's consulting services)
- **Class 42:** Software as a service (SaaS); computer software design; IT consultancy services; hosting of software as a service; data analytics services provided via SaaS (covers the Playsage SaaS delivery model)
- **Class 41:** Education and training services (potentially relevant if NBI offers training as a service)

**UK IPO timeline:**
1. Filing: application submitted online (TM3 form equivalent). Fee: GBP 170 for one class + GBP 50 per additional class (standard online filing). Check current fee schedule at time of filing
2. Examination: typically 2-3 months. The examiner checks absolute grounds and searches for conflicting earlier marks
3. Publication: if no objections or objections overcome, the mark is published in the Trade Marks Journal for a 2-month opposition period
4. Opposition: any third party can oppose within 2 months of publication (extendable by 1 month on request). If opposed, a formal opposition proceeding begins
5. Registration: if no opposition or opposition defeated, the mark is registered. Certificate issued
6. Duration: 10 years from filing date. Renewable in perpetuity for further 10-year periods. Renewal fee applies

### Madrid Protocol (International Filing)

The Madrid Protocol allows a UK trademark application or registration to be extended to other countries through a single international application filed via WIPO. This is potentially relevant for PlaySage given the US target market.

**Key considerations for NBI:**
- The UK application or registration must exist as the "basic mark" before filing an international application
- The "central attack" vulnerability: if the basic UK mark fails or is cancelled within 5 years of the international registration date, the international registration falls too. This can be converted to national applications, but at additional cost
- The US can be designated through Madrid, but the USPTO applies its own examination standards. US trademark law differs significantly from UK law (e.g. use requirements, specimens of use, Supplemental Register)
- Alternative: file directly at the USPTO rather than through Madrid. More expensive upfront but avoids the central attack risk and allows US-specific strategy from the outset
- **Recommendation for PlaySage:** File the UK application first. Assess whether Madrid Protocol designation for the US or direct USPTO filing is more appropriate based on timeline, cost, and strategic factors. The human solicitor should advise on the specific filing strategy

### Passing Off (Unregistered Trademark Protection)

Even without registration, NBI may have rights through the tort of passing off. The three elements (from Reckitt & Colman Products Ltd v Borden Inc [1990], the "Jif Lemon" case):
1. **Goodwill:** NBI has goodwill attached to its name and trading style, built through 200+ projects over 20 years
2. **Misrepresentation:** A third party's use of a similar name or mark leads or is likely to lead the public to believe that their goods/services are those of NBI
3. **Damage:** NBI suffers or is likely to suffer damage as a result

Passing off is harder to prove than registered trademark infringement and should not be relied upon as the primary protection strategy. Registration is always preferable where available.

---

## Software IP in the UK

### Copyright Protection for Software

Under the CDPA 1988, computer programs are protected as literary works (s3(1)(b)). This is the primary form of IP protection for NBI's software products.

**What is protected:**
- Source code and object code
- The structure and organisation of the code (to the extent it reflects the author's intellectual creation -- SAS Institute Inc v World Programming Ltd [2013])
- Database schemas (as literary works and potentially as databases with sui generis rights)
- Software documentation
- UI designs (as artistic works or as part of the software compilation)

**What is not protected by copyright:**
- Programming languages, protocols, and data formats
- The functionality or behaviour of the software (ideas/expression dichotomy)
- Algorithms in the abstract (though their specific expression in code is protected)

**Ownership (s11 CDPA 1988):**
- Works created by employees in the course of employment belong to the employer (s11(2))
- Works created by contractors belong to the contractor unless assigned by contract
- **Critical for NBI:** All contractor agreements must include an express IP assignment clause. The default position without an assignment clause is that the contractor owns the copyright. The Commercial/DP Lawyer handles contractor agreements; the IP Lawyer advises on the IP assignment clauses

**Duration:** Copyright in software lasts for the life of the author plus 70 years (s12 CDPA 1988). For works of unknown authorship (which AI-generated code may be), 70 years from creation or first making available to the public (s12(3))

**Moral rights:** Authors of literary works (including software) have moral rights including the right to be identified as the author (s77) and the right to object to derogatory treatment (s80). These can be waived but not assigned. Employment contracts should include a waiver of moral rights for work product

### AI-Generated Code Considerations

NBI uses AI tools (Claude) in its software development process. This raises questions about copyright ownership of AI-generated or AI-assisted code.

**UK position (as of knowledge cutoff):**
- s9(3) CDPA 1988 provides that the author of a computer-generated work is "the person by whom the arrangements necessary for the creation of the work are made"
- This provision is unique to UK law and was originally drafted for earlier forms of computer-generated output. Its application to modern generative AI is legally uncertain
- The UK Government consulted on AI and IP in 2022 but has not yet enacted specific reforms
- **Practical approach for NBI:** Treat AI-assisted code as owned by NBI (on the basis that NBI's employees/contractors made the arrangements necessary for its creation), but maintain clear records of human involvement in the development process. The human solicitor should advise on any significant AI-generated components that may be commercially sensitive

### Database Rights

Under the Copyright and Rights in Databases Regulations 1997, NBI may have sui generis database rights in its databases where there has been a substantial investment in obtaining, verifying, or presenting the contents. This is distinct from copyright in the database structure.

**Relevant for NBI:**
- Playsage aggregates studio client data -- the compiled databases may attract sui generis rights
- NBI's benchmarking data from 200+ projects -- if compiled with substantial investment, this may be protectable
- Duration: 15 years from completion of the database, or 15 years from first making available to the public. Renews if a substantial change is made to the contents

---

## Open Source Licensing

### Licence Categories Relevant to NBI

**Permissive licences (compatible with proprietary use):**

| Licence | Key Obligations | NBI Dependencies Using This |
|---|---|---|
| MIT | Include copyright notice and licence text in distributions | Next.js, React, Tailwind CSS, shadcn/ui, many npm packages |
| Apache 2.0 | Include copyright notice, licence text, NOTICE file. Express patent grant | Supabase client libraries |
| ISC | Include copyright notice and licence text | Many npm packages |
| BSD 2-Clause | Include copyright notice and licence text | Various npm packages |
| BSD 3-Clause | Include copyright notice and licence text. No use of contributor names for endorsement | Various npm packages |

**Copyleft licences (potentially incompatible with proprietary use):**

| Licence | Risk Level for Playsage | Key Concern |
|---|---|---|
| GPL 2.0 / 3.0 | High | Derivative works must be distributed under GPL. If a GPL dependency is linked into Playsage in a way that creates a derivative work, Playsage itself may need to be GPL-licensed |
| LGPL 2.1 / 3.0 | Medium | Allows proprietary use if the LGPL library is dynamically linked. Static linking or modification may trigger copyleft |
| AGPL 3.0 | Critical | Network copyleft: if NBI uses AGPL code in a SaaS product accessible over a network, users must be given access to the complete source code. This is fundamentally incompatible with Playsage as a proprietary SaaS |
| MPL 2.0 | Low-Medium | File-level copyleft: modifications to MPL files must be shared, but other files in the project are unaffected |

**Compliance requirements for NBI's deployed products:**
1. Maintain a complete inventory of all third-party dependencies and their licences
2. Include appropriate attribution in the deployed product (a NOTICES or THIRD_PARTY_LICENCES file, accessible to users)
3. Do not use AGPL-licensed code in any NBI SaaS product
4. Carefully assess any GPL or LGPL dependencies for copyleft trigger conditions
5. When in doubt about a specific licence, err on the side of caution and flag to the General Counsel

---

## NBI's Specific IP Assets

### Trademarks (Current and Proposed)

| Mark | Status | Classes | Notes |
|---|---|---|---|
| NBI / NBI Consulting / NBI Gaming | Unregistered (to verify) | Trading names in use | Check whether any NBI marks are currently registered. If not, assess whether registration is warranted given the PlaySage rename |
| PlaySage / Playsage | Proposed, pending trademark and domain checks | 9, 35, 42 (proposed) | URGENT: clearance search and filing preparation needed. Glen must confirm before filing |
| SalarySage | In use | 9, 42 (proposed) | Gaming salary intelligence tool. Will become a Playsage module. Assess whether standalone registration is needed |
| The Sage | Product feature name | Potentially 9, 42 | The AI recommendation engine within Playsage. Assess registrability (may be too descriptive) |
| Cascade Engine | Product feature name | Potentially 9, 42 | Cross-module intelligence layer. Assess registrability |

### Copyright-Protected Works

| Work | Author/Creator | Notes |
|---|---|---|
| Playsage platform codebase | NBI (employer work product) | Next.js/Supabase/Vercel stack. Ensure all contributor agreements include IP assignment |
| SalarySage codebase | NBI | Same as above |
| NBIAI App codebase | NBI | Internal tool, not client-facing |
| "Breaking the Fear Barrier" (2011) | Tom Rieger | Published book. Copyright owned by Tom (or publisher -- verify). NBI should have a licence for internal use of frameworks |
| "Curing Organizational Blindness" (2020) | Tom Rieger | Same as above |
| NBI consulting reports and deliverables | NBI (unless assigned to client) | Standard IP clause should retain NBI copyright with client licence |
| Website content (nbi-consulting.com) | NBI | Marketing copy, case studies, service descriptions |
| Playsage documentation | NBI | Product documentation, user guides, API docs |

### Trade Secrets

| Secret | Classification | Protection Status |
|---|---|---|
| Cascade Engine architecture | Confidential/Restricted | Assess current access controls and NDA coverage |
| The Sage recommendation methodology | Confidential/Restricted | Assess current access controls and NDA coverage |
| NBI consulting frameworks and methodologies | Confidential | 20 years of proprietary approaches to studio assessment, production auditing, monetisation analysis |
| Tom Rieger's unpublished analytical frameworks | Confidential | Implementation detail behind published books -- distinct from the published content |
| Client benchmarking data (aggregated, anonymised) | Confidential | Insights from 200+ projects that inform advisory work |
| Playsage pricing and commercial model | Confidential | Tier structure, margin model, enterprise pricing strategy |

### Domain Names

| Domain | Owner | Notes |
|---|---|---|
| nbi-consulting.com | NBI (verify registrant) | Current primary domain. Framer-hosted website |
| playsage.com (or similar) | TBC -- domain check pending | Critical for the PlaySage rename. Acquisition status unknown |
| salarysage.com (or similar) | TBC -- verify | SalarySage product domain |

---

## Patent Considerations for NBI

### The Software Patent Question in the UK

The Patents Act 1977 s1(2)(c) excludes "a program for a computer" from patentability "as such". However, the UKIPO and UK courts have developed case law that permits patents for software inventions that produce a "technical effect" or make a "technical contribution".

**The Aerotel/Macrossan Test (Court of Appeal, [2006] EWCA Civ 1371):**
1. Properly construe the claim
2. Identify the actual contribution
3. Ask whether it falls solely within the excluded subject matter
4. Check whether the actual or alleged contribution is actually technical in nature

**What this means for NBI:**
- A patent for "software that analyses gaming data" is almost certainly too abstract to be patentable in the UK
- A patent for a specific technical method of cross-correlating data streams from multiple heterogeneous sources to generate real-time predictive signals (if that is what the Cascade Engine does) might have a better chance, provided the technical contribution can be articulated clearly
- The Sage's recommendation methodology faces similar challenges -- if it is essentially a business method implemented in software, it is likely excluded. If it involves a novel technical approach to data processing, there may be an argument

**Practical assessment needed:**
- The CTO must provide detailed technical descriptions of what the Cascade Engine and The Sage actually do at a technical level
- The IP Lawyer must then assess whether the technical contribution passes the Aerotel/Macrossan test
- The human solicitor (ideally a patent attorney) should review any positive assessment before NBI invests in filing

### Cost Considerations

Patent costs for a UK company seeking multi-jurisdictional protection (rough ranges -- exact quotes from the solicitor/patent attorney are essential):
- UK patent application and prosecution: GBP 5,000-10,000 (including professional fees)
- PCT (Patent Cooperation Treaty) international application: GBP 3,000-5,000 (buys time before national phase entry)
- US national phase entry: USD 10,000-20,000 (examination and prosecution)
- European Patent Office filing: EUR 5,000-15,000 (plus national validation costs)
- Annual renewal fees: accumulate over the 20-year patent term

For a company raising $10M, a patent portfolio could be a valuable signal to investors. For a company of NBI's current size, the cost-benefit must be carefully assessed.

---

## IP in Client Relationships

### Standard IP Positions for NBI Engagement Types

**Consulting engagements (the majority of NBI's 200+ past projects):**
- NBI retains all pre-existing IP (methodologies, frameworks, tools, templates)
- Client receives a perpetual, non-exclusive, non-transferable licence to use the deliverables (reports, analyses, recommendations) for their internal business purposes
- NBI retains the right to use general knowledge, skills, and non-confidential techniques gained during the engagement (the "residuals" clause -- critical for a consultancy that applies learnings across clients)
- Client confidential information remains confidential regardless of IP ownership

**Playsage SaaS subscriptions:**
- NBI retains all IP in the Playsage platform, including all software, algorithms, designs, and documentation
- Client owns their data at all times. NBI processes it under the DPA as a data processor
- Client receives a non-exclusive, non-transferable subscription licence for the term of the agreement
- NBI may use anonymised, aggregated data derived from client usage to improve the platform and generate benchmarking insights (must be disclosed in the terms and DPA)

**Embedded team placements (e.g. Lighthouse Studios 3-year contract):**
- IP created by NBI team members during the placement, using client resources and directed by client management, is typically assigned to the client (analogous to the employment rule in s11(2) CDPA 1988)
- NBI's pre-existing IP (tools, methodologies, frameworks brought into the engagement) remains NBI's property
- A clear schedule of NBI pre-existing IP should be attached to the agreement
- NBI receives a licence-back for any general-purpose tools or techniques developed during the engagement that are not client-specific

**Bespoke development (if NBI builds a custom tool or system for a client):**
- Client receives assignment of the bespoke elements
- NBI retains pre-existing IP and receives a licence-back for general-purpose components
- Open source components used in the bespoke work remain subject to their original licences

### Tom Rieger's IP -- Special Considerations

Tom Rieger is associated with NBI through National Business Innovations LLC (US entity). His published books and unpublished frameworks represent significant IP that NBI uses in its Human Capital / Studio Health practice.

**Key questions to resolve (with General Counsel):**
- What IP does Tom personally own versus what NBI / National Business Innovations LLC owns?
- Is there a formal IP assignment or licence agreement between Tom and NBI/NBILLC?
- If Tom's engagement with NBI changes, what happens to the IP?
- Are the unpublished frameworks documented and classified as trade secrets?
- Do client engagement agreements for Studio Health work properly attribute and protect Tom's IP?

These questions should be addressed as a priority. If the IP arrangements are informal or undocumented, this is a risk for both the $10M raise (due diligence will ask) and for NBI's ongoing ability to deliver the Studio Health practice.
