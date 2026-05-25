---
name: ingest-local
description: "Ingest local files from OneDrive and Downloads into the intelligence pipeline. Extracts knowledge from documents, presentations, spreadsheets, and research materials. Triggers: ingest local, ingest onedrive, ingest downloads, ingest files, harvest files, harvest documents."
category: intelligence
user-invocable: true
---

# Local File Ingestion

Ingests knowledge from OneDrive working files and Downloads into raw extracts for the intelligence pipeline.

## Arguments

- `path`: specific path to scan (default: all configured paths)
- `max_files`: maximum files to process per run (default: 30)

## Process

1. **Read config.** Load `intelligence/config/source_config.md` for paths, file types, and ignore rules.

2. **Glob for files.** Search configured paths for whitelisted file types (.md, .txt, .pdf, .docx, .pptx, .xlsx).

3. **Apply ignore rules.** Filter against the ignore patterns in source_config.md (node_modules, .git, .planning, session_logs, session_handoffs, binaries, images, lock files).

4. **Change detection.** Read `intelligence/pipeline_state.md` local file tracking section. Compare modification dates — only process new/changed files.

5. **Sort and batch.** Sort by modification date (newest first). Process maximum {max_files} per run.

6. **For Downloads specifically (first run):**
   - Only files modified within last 90 days
   - Skip anything > 50MB
   - Maximum 50 files on first run

7. **Extract knowledge.** For each file: read content, feed to ingestion agent with context:
   > "This is a document from Glen's local files. Path: [path]. Filename: [name]. File type: [type]. Extract any knowledge worth preserving — decisions, frameworks, research findings, data points. If this is purely operational (a script, a config file, a template with no filled content), output SKIP."
   
   Use prompt from `intelligence/prompts/ingestion_agent.md`.
   Agent can output "SKIP" for files with no extractable knowledge.

8. **Deposit extracts.** Write to `intelligence/raw/onedrive/` or `intelligence/raw/downloads/` based on source path.

9. **Update pipeline state.** Update local file tracking section with processed file paths and modification timestamps.

10. **Report compilation readiness.**

## Output

Report at end of run:
- Files scanned: {N}
- Files processed (not skipped): {M}
- Extracts produced: {K}
- Files skipped (no knowledge): {J}
- Extracts by bank candidate: {bank: count}
- Banks ready for compilation: {list}
