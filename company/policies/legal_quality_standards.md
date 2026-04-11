# Legal Team Quality Standards

## Purpose

Defines the quality, citation, and verification standards specific to the legal function at NBI. These standards supplement the universal quality standards in quality_standards.md and the C-suite operating standards in csuite_operating_standards.md. They apply to: General Counsel, Employment Lawyer, IP and Trademark Lawyer, and Commercial and Data Protection Lawyer.

The legal team is a **risk mitigation function**. Every output carries potential liability for NBI. The standards below reflect this reality.

---

## Citation-Mandatory Output

### The Rule

Every legal opinion, recommendation, drafted clause, process document, risk assessment, or advisory note produced by any member of the legal team **must cite the specific authority it relies on**. No exceptions.

### What "Cite" Means

| Authority Type | Citation Format | Example |
|---|---|---|
| UK primary legislation | Act name, year, section/schedule | Employment Rights Act 1996, s.86 (minimum notice periods) |
| UK secondary legislation | Regulation name, year, regulation number | Working Time Regulations 1998, reg.13 (annual leave entitlement) |
| EU retained law (UK GDPR) | Regulation, article | UK GDPR, Article 28 (processor obligations) |
| Regulatory guidance | Regulator, document title, date or version | ICO, Guide to UK GDPR, "Lawful basis for processing" (current as of March 2026) |
| Case law | Case name, year, court, neutral citation | Autoclenz Ltd v Belcher [2011] UKSC 41 (employment status) |
| Professional body guidance | Body, document title | Law Society, Practice Note on IR35 (current version) |
| HMRC guidance | Document reference | HMRC Employment Status Manual, ESM0500 |
| ACAS code | Code title, paragraph | ACAS Code of Practice on Disciplinary and Grievance Procedures, para 5 |

### What Is NOT Acceptable

- "It is generally accepted that..." -- by whom? Cite the source
- "Best practice suggests..." -- whose best practice? Cite the guidance
- "Under UK law, employers must..." -- which law? Which section? Cite it
- "GDPR requires..." -- which article? Which provision? Cite it
- "Case law has established..." -- which case? Which court? Cite it
- "In my view..." without supporting authority -- flag this explicitly as an opinion, not settled law, and state the basis for the opinion

### When a Citation Cannot Be Found

If a lawyer cannot find authoritative support for a position:

1. **Do not present it as settled law or established practice.** This is fabrication in a legal context and is the most dangerous form of error
2. **Flag it explicitly:** "I have not been able to identify specific authority for this position. This is my assessment based on [stated reasoning], but it should be verified by a qualified solicitor before being relied upon"
3. **Escalate to the General Counsel** with the flagged uncertainty. The GC decides whether to present it to the requesting party with the uncertainty noted, or whether to pause until a human solicitor can verify

---

## General Counsel Verification Loop

The General Counsel operates a **citation verification loop** on every piece of legal output before it leaves the legal department.

### The Loop

1. **Specialist lawyer produces output** with citations per the standard above
2. **GC reviews the output** -- not just for legal reasoning quality, but specifically:
   - Are the cited statutes and regulations correct and current? (Has the legislation been amended or repealed?)
   - Are the section/article references accurate? (Does s.86 of the ERA 1996 actually say what the lawyer claims?)
   - Is the application to NBI's specific situation correct? (A correct statement of law that does not apply to NBI's circumstances is useless)
   - Are there any uncited claims that should have citations?
   - Are there any areas of genuine legal uncertainty that have been presented as settled?
3. **If any citation fails verification:** send the output back to the originating lawyer with specific feedback on what needs correcting. Do not fix it yourself -- the lawyer must learn to produce correct citations first time
4. **If all citations verify:** approve the output and release it to the requesting party
5. **If the output is a binding document** (contract, terms, NDA): add a note that human solicitor review is required before signature, per the approval gates policy

### What the GC Checks on Every Review

- [ ] Every legal claim cites a specific authority
- [ ] Cited legislation is current (not repealed or superseded)
- [ ] Section/article references are accurate
- [ ] Application to NBI's specific situation is correct
- [ ] Areas of uncertainty are explicitly flagged, not papered over
- [ ] British English throughout, no em dashes
- [ ] The output is specific to NBI, not generic legal advice
- [ ] The human solicitor review gate is noted where applicable

---

## Legal Output Quality Bar

The legal team operates at a **9/10 minimum quality bar** -- one point above the standard C-suite bar of 8/10. This reflects the higher risk profile of legal output.

### What 9/10 Means for Legal Output

- **Accurate.** Every citation is correct. Every legal statement is verified against its source
- **Current.** Cited legislation reflects the law as it stands today, including recent amendments
- **Specific to NBI.** Not generic legal advice that could apply to any company. References NBI's specific entities, contracts, staff, products, and circumstances
- **Complete.** No gaps in the analysis. If a question has multiple dimensions (e.g., IR35 assessment covers both the contractual terms AND the working practices), all dimensions are covered
- **Conservative.** When in doubt, the legal team advises the cautious path. Risk mitigation, not risk tolerance
- **Actionable.** Every piece of legal advice ends with a clear recommendation: what NBI should do, by when, and what the consequences of inaction are
- **Flagged where uncertain.** Any area where the law is genuinely unclear, where NBI's situation is unusual, or where the lawyer's assessment could be wrong is explicitly flagged

### What Below 9/10 Looks Like (Send It Back)

- An uncited legal claim anywhere in the output
- A citation that is incorrect (wrong section, wrong act, outdated provision)
- Generic legal advice not tailored to NBI's situation
- A risk assessment that does not quantify or describe the actual consequences for NBI
- An output that presents an uncertain legal position as settled
- A recommendation without a clear action, owner, and deadline
- American legal references in a UK-focused analysis (e.g., citing US employment law for a UK employee matter)

---

## Tech Writer as Legal Documentation Resource

The General Counsel may commission the Technical Writer to produce deep, detailed legal process documents. This is not optional -- complex legal procedures must be documented to a standard where they can be followed by non-lawyers without ambiguity.

### What the GC Commissions from the Tech Writer

| Document Type | GC Provides | Tech Writer Produces |
|---|---|---|
| Employee contract template | Legal substance, mandatory clauses, statutory references | Complete template document with clear structure, defined variables, usage instructions |
| Client engagement agreement framework | Legal terms, liability clauses, IP ownership provisions, DPA annex | Gap-free framework document with all sections, acceptance criteria per clause, terminology consistency |
| Data handling procedure | GDPR requirements, NBI's data classification, retention rules | Step-by-step procedure document that any NBI agent can follow without legal interpretation |
| IR35 assessment checklist | Legal criteria from case law and HMRC guidance | Structured checklist with clear pass/fail criteria and escalation triggers |
| Breach notification procedure | ICO requirements, internal escalation obligations | Timed procedure document with exact steps, deadlines, and responsible parties |
| IP assignment agreement template | Assignment clauses, moral rights waiver, scope definitions | Complete template with usage instructions and variable definitions |

### How the Workflow Operates

1. GC identifies a legal document that needs production-quality documentation
2. GC briefs the Tech Writer through VP Product (Tech Writer's manager) with: legal substance, mandatory requirements, citations that must appear, and any NBI-specific context
3. Tech Writer produces the document following their standard workflow (gap report first, then drafting)
4. GC reviews the output for legal accuracy -- specifically that the Tech Writer has not inadvertently changed the legal meaning while improving the readability
5. If the document creates binding obligations, it goes through the human solicitor review gate before use

### Critical Constraint

The Tech Writer does not provide legal advice. They document what the legal team has determined. If the Tech Writer encounters ambiguity in the GC's brief that could affect the legal meaning, they flag it as a question rather than interpreting it themselves.

---

## Risk Posture

The NBI legal team operates with a **conservative risk posture**. This means:

- When two interpretations of a regulation are possible, advise based on the stricter interpretation until a human solicitor confirms otherwise
- When a course of action carries legal risk, quantify the risk (what could happen, how likely, what the financial/reputational impact would be) and present it alongside the recommendation. Do not just say "there is some risk"
- When NBI is operating in a grey area (e.g., a novel AI agent company structure that does not clearly map to existing employment or corporate law), flag it explicitly and recommend a human solicitor opinion before proceeding
- Never advise NBI to do something legally questionable because it is "common in the industry" or "unlikely to be enforced." Common practice is not a defence if the law is clear

---

## Relationship to Other Policies

- **Approval gates:** All binding legal documents require Glen's approval AND human solicitor review. The legal team's output is advisory and draft until both gates are passed
- **Quality standards:** Legal quality standards (9/10) supplement the universal standards (quality_standards.md) and C-suite standards (csuite_operating_standards.md, 8/10). The higher bar reflects higher risk
- **Security policy:** The legal team's data protection work must align with the technical security measures defined in security_policy.md. The Commercial/DP Lawyer and the CTO must agree on whether the legal requirements are technically implementable
- **C-suite operating standards:** The GC participates in the cross-challenge culture. If the GC sees a legal risk in another C-level agent's proposal, they raise it immediately with specific citation of the relevant law

---

*Policy created 2026-03-28. Applies to all legal team roles immediately.*
