---
source: granola
source_id: granola_75160e95
source_path: granola://meeting/75160e95-88e4-4030-8616-241b5cc07e2e
ingested: 2026-06-12
topics_detected: [worksage, document-management, hub-architecture, legal-ops, integrations]
relevance_score: 10
novelty_score: 9
actionability_score: 9
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# WorkSage Hub: Document Architecture and Integration Onboarding (Dino, CH)

## Key Content

WorkSage Hub confirmed as primary document store for sensitive Couch Heroes business documents: termination letters, salary data, cash flow, marketing spend. Security model: two-factor hashing with obfuscated filenames (unreadable even if breached), row-level and file-level permissions rather than folder-level (unlike Google/OneDrive). Compliance docs flow Hub to Confluence to Jira task via sub-document copy with linked appendix.

File storage is non-translating: PDFs, .docx, Excel files retain their native format. Google/OneDrive translate files on upload and download, breaking legal document numbering (Dino's recurring pain point).

Slack integration live: `/worksage CH [Name] [task description]` auto-creates tasks in My Work without pre-filled priority, status, or date. Gmail integration built and tested on Glen's account; Dino's connection pending settings wizard.

Bugs identified during session: scope filter behaving unexpectedly; project rows disappearing on fold/unfold (resolves on refresh, tied to active code modularisation). Feature request: attachment count in parentheses on ticket attachment header.

## Decisions / Insights

- [Dino/Ari] confirmed: sensitive legal documents go in Hub only, not Google Drive
- [Glen] identified: scope filter bug and attachment count display as immediate dev tasks
- [Dino] committed: populate all legal tasks in Hub before first CH operations planning session
- [Glen] designed: row-level and file-level permissions preferred for legal document security

## Context

1:1 between Glen Pryer and Dino Kandiloros (Couch Heroes General Counsel), 11 June 2026. Walkthrough and onboarding of Dino onto WorkSage Hub. First confirmed use of Hub for legal document storage at Couch Heroes.

## Applicability

Relevant when: debugging scope filter or row-collapse behaviour in WorkSage frontend.
Relevant when: planning document security architecture for clients with legal and HR sensitivity requirements.
Relevant when: completing Dino's Gmail integration via the settings wizard.
Relevant when: prioritising the attachment count display feature in the Hub roadmap.
