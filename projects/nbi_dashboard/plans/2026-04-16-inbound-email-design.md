# Design: Inbound Email-to-Task System

**Date:** 2026-04-16
**Status:** Approved

---

## Overview

A cron job polls the `nbihub@nbi-consulting.com` inbox every 5 minutes via Microsoft Graph API. For each unread email, it parses the subject line to identify a client and task, then stores the email body (with preserved URL links) and any file attachments against the matched task in the dashboard.

---

## Inbound flow

1. **Poll inbox** - `GET /users/nbihub@nbi-consulting.com/mailFolders/Inbox/messages?$filter=isRead eq false&$select=id,subject,from,body,hasAttachments,receivedDateTime&$top=20`
2. **For each unread email:**
   a. Parse subject line to identify client and task (see matching logic below)
   b. Save email body as an HTML file in `uploads/`, preserving all URL links
   c. Create an `attachments` record: `entity_type='task'`, `entity_id=matched_task_id`, `original_name='Email from sender - Subject.html'`, `mime_type='text/html'`, `uploaded_by='nbihub (email)'`
   d. Extract URL links from the email body HTML and create `attachments` link records (`link_url` + `link_title` columns)
   e. If `hasAttachments=true`, fetch attachments via `GET /users/.../messages/{id}/attachments`, download each file to `uploads/`, create `attachments` records
   f. Mark email as read: `PATCH /users/.../messages/{id}` with `{ isRead: true }`
3. **Log every processed email** with structured logging: sender, subject, matched entity, confidence level

---

## Subject line parsing and matching

### Step 1: Client matching

Score every client name against the full subject using case-insensitive substring match.

```
Subject: "Lighthouse Games - character design feedback"
Clients: [..., "Lighthouse Games", "Lighthouse Studios", ...]
Match: "Lighthouse Games" (exact substring, high confidence)
```

Scoring rules:
- **Exact substring match** (case-insensitive): confidence = high
- **All words present** but not contiguous: confidence = medium
- **Partial word match** (>60% of client name words found): confidence = low
- **No match**: pick the highest-scoring candidate, flag as low confidence

### Step 2: Task hierarchy matching (depth-first)

After matching the client, strip the client name from the subject. Use the remainder to match against tasks under that client.

```
Remainder: "character design feedback"
Query: SELECT id, title, item_type FROM tasks WHERE client_id = $client_id AND status NOT IN ('Done', 'Cancelled')
```

Score task titles against the remainder using the same substring/word matching. Prefer deeper matches:
- If a feature called "Character Design" matches, use it
- If a story under that feature matches even better, use the story
- If no task matches, fall back to the most recently updated project for that client

### Step 3: Confidence tagging

Each attachment record gets `uploaded_by` set to:
- `'nbihub (email)'` for high confidence matches
- `'nbihub (email - verify match)'` for low confidence matches

A notification is created for low-confidence matches so Glen sees them in the dashboard.

---

## What gets stored

For each processed email, the universal `attachments` table receives:

| Record | entity_type | entity_id | Fields used |
|---|---|---|---|
| Email body | `'task'` | matched task ID | `filename`, `original_name`, `size_bytes`, `mime_type='text/html'` |
| Each file attachment | `'task'` | matched task ID | `filename`, `original_name`, `size_bytes`, `mime_type` |
| Each URL link from body | `'task'` | matched task ID | `link_url`, `link_title` |

- Email body saved as `.html` file in `uploads/` with all URL links preserved as-is
- File attachments downloaded from Graph API and saved to `uploads/` with original filenames (collision-safe naming)
- URL links extracted from `<a href="...">` tags in the email HTML body
- `uploaded_by` = `'nbihub (email)'` or `'nbihub (email - verify match)'`

### File size and type limits

- Same 25MB limit per attachment as existing upload system
- Same MIME type whitelist (images, PDFs, Office docs, CSV, plain text)
- Email attachments that exceed size or fail MIME check are skipped with a log warning
- The email body HTML file bypasses the MIME whitelist (it's always text/html)

---

## Azure AD permission changes

Add `Mail.Read` application permission to the existing "NBI Hub Dashboard" app registration in Microsoft Entra admin centre, then grant admin consent (same process as Mail.Send).

No new app registration needed. The existing MSAL client and `_getGraphToken()` function work as-is since we use the `.default` scope.

---

## Cron schedule

```javascript
cron.schedule('*/5 * * * *', async () => { ... });
```

Every 5 minutes, all days. The Graph API call is lightweight (just unread messages), and the DB work only triggers when emails exist.

---

## Edge cases

- **No client match at all**: Attach to a special "Unmatched Emails" project (create on first use), flag as low confidence, create notification
- **Empty subject line**: Use sender's email domain to guess client, flag as low confidence
- **Duplicate processing**: Mark as read immediately after processing. If the cron crashes mid-processing, the email stays unread and gets reprocessed next cycle (idempotent - check for duplicate `original_name` before inserting)
- **Very large emails**: Skip emails with body > 1MB, log warning
- **Inline images**: Stored as part of the HTML body file (base64 encoded), not extracted separately
- **Emails from nbihub itself**: Skip (prevent processing outbound notification emails that might bounce back)

---

## Database changes

**None.** Uses the existing universal `attachments` table with its `link_url`/`link_title` columns for URL links.

---

## What this does NOT include

- Reply-to-email (replying to an attachment email doesn't go back to the sender)
- Email forwarding rules
- Automatic task creation from emails (only attaches to existing tasks)
- Email thread grouping (each email processed independently)
- Spam/phishing filtering (relies on O365's built-in filtering before it hits the inbox)
