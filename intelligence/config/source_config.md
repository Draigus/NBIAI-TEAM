# Source Configuration

## Local Filesystem Paths

### OneDrive (primary working files)
- Path: D:\OneDrive\Claude_code\
- Path: D:\OneDrive\Documents\
- File types: .md, .txt, .pdf, .docx, .pptx, .xlsx

### Downloads
- Path: C:\Users\gpbea\Downloads\
- File types: .md, .txt, .pdf, .docx, .pptx, .xlsx
- Age filter: last 90 days only (first run), then track changes
- Size filter: skip > 50MB

### ChatGPT Export
- Path: TBD — ask Glen for exact location on OneDrive
- Format: conversations.json (OpenAI export format)

## MCP Sources

### Granola
- Tools: mcp__claude_ai_Granola__list_meetings, mcp__claude_ai_Granola__get_meeting_transcript
- Filter: business meetings only (cross-ref people_directory.md and clients_detailed.md)
- Batch: since last ingestion date

### Gmail
- Tools: mcp__claude_ai_Gmail__search_threads, mcp__claude_ai_Gmail__get_thread
- Search queries:
  - from:vardis@couchheroes.com newer_than:14d
  - from:aris@couchheroes.com newer_than:14d
  - label:nbi newer_than:14d
  - subject:(pitch OR investment OR forecast OR production OR hiring) newer_than:14d -category:promotions -category:social -category:updates
- Exclusions: noreply@, notifications@, calendar invites, newsletters (unless industry data)

### Slack
- Tools: mcp__claude_ai_Slack__slack_read_channel, mcp__claude_ai_Slack__slack_search_public_and_private
- Channels: TBD — configure on first run (list channels, ask Glen which to monitor)
- Filter: substantive exchanges only (>50 words, threaded discussions 3+ replies, shared links with context)

## Ignore Rules (Local Files)

```text
**/node_modules/**
**/.git/**
**/.planning/**
**/session_logs/**
**/session_handoffs/**
**/*.exe
**/*.msi
**/*.dll
**/*.zip
**/*.7z
**/*.rar
**/*.png
**/*.jpg
**/*.gif
**/*.svg
**/*.mp4
**/*.mp3
**/*.wav
**/*.mov
**/package-lock.json
**/yarn.lock
```
