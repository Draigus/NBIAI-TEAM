# SharePoint Embed Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightbox preview modal for SharePoint document links attached to tasks.

**Architecture:** Detect SharePoint URLs in the existing link attachment renderer, add a Preview button, open a modal with an Office Online iframe embed on click. Single file change — all CSS, utility functions, and modal logic added to the monolithic HTML.

**Tech Stack:** Vanilla JS, CSS, Office Online embed viewer (iframe)

---

### Task 1: CSS for Preview Modal

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS section, after `.cal__dep-banner a` rule around line 1102)

- [ ] **Step 1: Add preview modal CSS**

Insert after line 1102 (`.cal__dep-banner a { ... }`):

```css
.sp-preview { width: 90vw; height: 85vh; background: var(--bg-raised); border: 1px solid var(--border-default); border-radius: var(--radius-lg); display: flex; flex-direction: column; margin: auto; margin-top: 5vh; overflow: hidden; }
.sp-preview__header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-default); flex-shrink: 0; }
.sp-preview__title { font-weight: 600; font-size: 0.9rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
.sp-preview__open { font-size: 0.78rem; color: var(--accent-text); text-decoration: none; white-space: nowrap; }
.sp-preview__open:hover { text-decoration: underline; }
.sp-preview__close { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted); padding: 0 4px; line-height: 1; }
.sp-preview__close:hover { color: var(--text-primary); }
.sp-preview__frame { flex: 1; width: 100%; border: none; }
```

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(sp): add CSS for SharePoint preview modal"
```

---

### Task 2: Utility Functions and Modal Logic

**Files:**
- Modify: `nbi_project_dashboard.html` (add functions near the attachments section, before `loadEntityFiles` around line 18710)

- [ ] **Step 1: Add utility and modal functions**

Insert immediately before the `async function loadEntityFiles(entityType, entityId, containerId)` line:

```javascript
function isSharePointUrl(url) {
  return /sharepoint\.com|office\.com/i.test(url || '');
}

function getSharePointEmbedUrl(url) {
  if (!url) return '';
  if (/action=embedview|embed\.aspx/i.test(url)) return url;
  if (/\/:([wxpb]):\//.test(url)) {
    return url.split('?')[0] + '?action=embedview';
  }
  return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url);
}

function openSpPreview(embedUrl, title, originalUrl) {
  const html = `<div class="modal-overlay open" id="spPreviewModal" onclick="if(event.target===this)closeSpPreview()" style="z-index:500">
    <div class="sp-preview">
      <div class="sp-preview__header">
        <span class="sp-preview__title">${esc(title)}</span>
        <a href="${safeUrl(originalUrl)}" target="_blank" rel="noopener noreferrer" class="sp-preview__open">Open in SharePoint &#8599;</a>
        <button class="sp-preview__close" onclick="closeSpPreview()">&times;</button>
      </div>
      <iframe class="sp-preview__frame" src="${esc(embedUrl)}" frameborder="0" allowfullscreen></iframe>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeSpPreview() {
  const modal = document.getElementById('spPreviewModal');
  if (modal) modal.remove();
}
```

- [ ] **Step 2: Add Escape key handler**

Find the existing keydown listener that handles Escape for other modals. Search for `document.addEventListener('keydown'` near the bottom of the file. Add the SharePoint check. If no suitable existing handler, add standalone after `closeSpPreview`:

```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('spPreviewModal')) closeSpPreview();
});
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(sp): add SharePoint embed utility functions and modal"
```

---

### Task 3: Modify Link Attachment Render

**Files:**
- Modify: `nbi_project_dashboard.html:~18726-18734` (inside `loadEntityFiles`, the link attachment rendering block)

- [ ] **Step 1: Add Preview button to SharePoint link rows**

Find this block inside `loadEntityFiles` (the link attachment render path):

```javascript
        if (f.link_url) {
          const display = f.link_title || f.link_url;
          return `<div class="attachment-row">
            <span class="attachment-row__icon" title="Link">&#128279;</span>
            <a href="${safeUrl(f.link_url)}" target="_blank" rel="noopener noreferrer" class="attachment-row__name" title="${esc(f.link_url)}">${esc(display)}</a>
            ${verifyBadge}
            <span class="attachment-row__size" style="font-size:0.62rem;color:var(--text-muted)">link</span>
            <button class="attachment-row__delete" data-action="deleteEntityFile" data-arg0="${f.id}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}" title="Delete">&times;</button>
          </div>`;
        }
```

Replace with:

```javascript
        if (f.link_url) {
          const display = f.link_title || f.link_url;
          const isSP = isSharePointUrl(f.link_url);
          const spBtn = isSP ? `<button class="btn btn--ghost btn--sm" onclick="openSpPreview('${escAttrJs(getSharePointEmbedUrl(f.link_url))}','${escAttrJs(display)}','${escAttrJs(f.link_url)}')" title="Preview document" style="font-size:0.65rem;padding:1px 5px">&#128065; Preview</button>` : '';
          return `<div class="attachment-row">
            <span class="attachment-row__icon" title="${isSP ? 'SharePoint' : 'Link'}">${isSP ? '&#128196;' : '&#128279;'}</span>
            <a href="${safeUrl(f.link_url)}" target="_blank" rel="noopener noreferrer" class="attachment-row__name" title="${esc(f.link_url)}">${esc(display)}</a>
            ${spBtn}
            ${verifyBadge}
            <span class="attachment-row__size" style="font-size:0.62rem;color:var(--text-muted)">${isSP ? 'SharePoint' : 'link'}</span>
            <button class="attachment-row__delete" data-action="deleteEntityFile" data-arg0="${f.id}" data-arg1="${entityType}" data-arg2="${entityId}" data-arg3="${containerId}" title="Delete">&times;</button>
          </div>`;
        }
```

- [ ] **Step 2: Run tests**

```bash
cd dashboard-server && npx vitest run
```

Expected: 340 tests pass (no server changes).

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(sp): add Preview button to SharePoint link attachments"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd dashboard-server && npm run test:all
```

Expected: All vitest + playwright tests pass.

- [ ] **Step 2: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 3: Manual verification at worksage.nbi-consulting.com**

1. Open any task that has a SharePoint link attachment (or add one via "Add Link" with a SharePoint URL)
2. Confirm the link row shows a document icon (📄) instead of chain icon, label says "SharePoint" instead of "link"
3. Confirm "👁 Preview" button appears next to the link
4. Click Preview — modal opens with full-screen iframe showing the document
5. Click "Open in SharePoint ↗" — opens original URL in new tab
6. Press Escape — modal closes
7. Click outside modal — modal closes
8. Verify non-SharePoint links still render as before (chain icon, no Preview button)
