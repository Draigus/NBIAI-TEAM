# Document Preview + JD Attachments

## Summary

Remove the requirements field from hiring positions. Add job description file attachments to positions (DOCX + PDF). Add a reusable document preview modal that renders DOCX via mammoth.js and PDF via iframe, used by both position JDs and candidate CVs. Bulk-attach 28 existing Couch Heroes JD files.

## Schema

Migration 047:

```sql
-- Drop requirements column (added in 046, never populated, not needed)
ALTER TABLE hiring_positions DROP COLUMN IF EXISTS requirements;

-- JD attachment columns
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS jd_filename TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS jd_original_name TEXT;
```

## Server

### Remove requirements from API

- Remove `requirements` from POST `/api/hiring-positions` INSERT columns and parameter array
- Remove `requirements` from PATCH `/api/hiring-positions/:id` `buildPatchQuery` allowed fields
- Remove `requirements` from GET `/api/hiring-positions` SELECT

### JD upload endpoint

`POST /api/hiring-positions/:id/jd` — admin only (`requireNBI, requireAdmin`)

- Uses existing `upload.single('file')` multer middleware
- Accepts DOCX and PDF only. MIME check: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` or `application/pdf`. Extension check: `.docx` or `.pdf`.
- Max file size: 10MB (multer `limits.fileSize`)
- Deletes old JD file from disk if replacing
- Stores `jd_filename` (multer's generated name) and `jd_original_name` (original filename) on the position row
- Returns updated position with `jd_original_name` in response

### JD download endpoint

`GET /api/hiring-positions/:id/jd` — any authenticated user

- Client users scoped to their own client's positions
- Sets `Content-Disposition` with `jd_original_name` for a meaningful download filename
- Returns 404 if no JD attached

### JD preview endpoint

`GET /api/hiring-positions/:id/jd/preview` — any authenticated user

- Returns the raw file with correct `Content-Type` header
- Same file as download, but without `Content-Disposition: attachment` so the browser can render inline
- Client scoping same as download

### CV preview endpoint

`GET /api/candidates/:id/cv/preview` — any authenticated user

- Same as existing CV download but without `Content-Disposition: attachment`
- Client users scoped to their own candidates

## Frontend

### mammoth.js vendor script

- File: `dashboard-server/public/vendor/mammoth.browser.min.js`
- NOT loaded on page load. Lazy-loaded on first preview click via dynamic `<script>` injection.

### `openDocumentPreview(previewUrl, downloadUrl, filename)`

Reusable function. Creates a centered modal:

- Width: `min(800px, 90vw)`, height: `85vh`
- Header bar: filename on the left, download button + close button on the right
- Body: scrollable content area
- Overlay: uses `var(--bg-overlay)` (opaque, matches all other overlays)
- Escape and click-outside dismiss

Behaviour by file type (detected from `filename` extension):
- `.pdf`: renders `<iframe src="${previewUrl}" style="width:100%;height:100%;border:none">`
- `.docx`: fetches `previewUrl` as ArrayBuffer, runs `mammoth.convertToHtml()`, injects result HTML into a scrollable `<div>`. On error: shows "Preview unavailable for this document" with prominent download button.

### Position detail panel changes

- Remove requirements section entirely (field, input, add/remove buttons, helper functions)
- Add "Job Description" section:
  - If JD attached: show filename, Preview button, Download button, Replace button (admin), Remove button (admin)
  - If no JD: show "No job description attached" + Upload button (admin)
  - Non-admin users see Preview + Download only (no upload/replace/remove)

### Candidate detail panel changes

- CV section already has Download button. Add a Preview button next to it that calls `openDocumentPreview()` with the CV preview URL.

### Position card changes

- Show a small document icon on cards that have a JD attached (subtle indicator, not a button)

## Bulk Attach

Node script (or inline in a migration) that:

1. Reads `Clients/Couch Heroes/Job Descriptions/*.docx`
2. For each file, matches to a position by fuzzy title matching (e.g. `Technical_Animator_JD.docx` → position titled "Technical Animator")
3. Copies the file to `uploadDir` with a UUID-prefixed name
4. Updates the position row with `jd_filename` and `jd_original_name`
5. Logs matches and misses for manual review

Matching strategy: strip `_JD.docx` suffix, replace underscores with spaces, case-insensitive compare against position titles. Handle edge cases (e.g. `Senior_Environment_Artist_JD_v2.docx` → strip `_v2`).

## What this does NOT cover

- Editing DOCX files in-browser (download, edit in Word, re-upload)
- Version history of JD uploads
- OCR or text extraction from JDs for search
- Changing CV upload to accept DOCX (stays PDF-only)
