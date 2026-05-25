---
source: chatgpt
source_id: chatgpt_69698081-cf20-8333-8644-24853aee23b6
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [salary-audit, compensation-data, data-quality, games-industry-salaries]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: [salary_benchmarks]
sensitivity_class: internal
extract_type: methodology
---

# Global Video Game Salary Spreadsheet Audit Methodology

## Key Content
Two-track audit methodology for games industry salary data: Track 1 (File structure) assesses encoding, consistency, and analysis readiness. Track 2 (Salary accuracy) validates values by role, grade, country, hub status, currency, and year. Common failure modes to detect: monthly values in annual columns, currency mismatches (USD marked as GBP), mixed year basis, duplicate roles under different names, hub vs non-hub pay reversed, grade progression broken (junior higher than mid), min/mid/max ordering broken, region definitions unclear (London vs UK average). Severity levels: Critical, High, Medium, Low. Each issue logged with: Issue_ID, Severity, Dimension, Symptom, Evidence, Proposed fix, Confidence score. Benchmarks must use multiple sources per region with citations, prefer 2025-2026 data, show spreads when sources disagree.

## Decisions / Insights
- Glen decided: salary audits must distinguish confirmed errors, likely errors, and uncertain items
- Glen decided: every external benchmark claim requires a citation; fabricated citations are unacceptable
- Glen observed: common data quality failures include monthly/annual confusion and currency mismatches

## Context
Created January 2026 as a reusable methodology for auditing SalarySage and client salary data files.

## Applicability
- Relevant when: auditing salary data for SalarySage product or client salary benchmarking work
- Relevant when: validating compensation data across multiple countries and currencies
- Relevant when: building quality assurance processes for salary research deliverables
