# SharePoint Embed Preview

## Summary

Add a lightbox preview for SharePoint document links. When a link attachment is a SharePoint/Office URL, a "Preview" button appears in the attachment row. Clicking it opens a full-screen modal with an iframe showing the document via Office Online's embed viewer.

## Design

### Detection

In `loadEntityFiles()`, when rendering link attachments (`f.link_url`), check if the URL matches a SharePoint/Office pattern:

```javascript
function isSharePointUrl(url) {
  return /sharepoint\.com|office\.com|\.sharepoint\.com/i.test(url || '');
}
```

If true, render an additional "Preview" button in the attachment row.

### Embed URL Construction

Transform the link URL to an embeddable format:

1. **Share links** (contain `/:w:/`, `/:x:/`, `/:p:/`, `/:b:/` segments) — append `?action=embedview` or replace `?e=` params with `?action=embedview`
2. **Direct file links** (end in `.docx`, `.xlsx`, `.pptx`, `.pdf`) — use `https://view.officeapps.live.com/op/embed.aspx?src=<encodeURIComponent(url)>`
3. **Already embeddable** (contain `action=embedview` or `embed.aspx`) — use as-is

```javascript
function getSharePointEmbedUrl(url) {
  if (/action=embedview|embed\.aspx/i.test(url)) return url;
  if (/\/:([wxpb]):\//.test(url)) {
    const base = url.split('?')[0];
    return base + '?action=embedview';
  }
  return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url);
}
```

### Modal

Reuse the existing modal overlay pattern (same as verify-attachment modal). Structure:

```html
<div class="modal-overlay open" id="spPreviewModal">
  <div class="sp-preview">
    <div class="sp-preview__header">
      <span class="sp-preview__title">{document title}</span>
      <a href="{original_url}" target="_blank" class="sp-preview__open">Open in SharePoint ↗</a>
      <button class="sp-preview__close" onclick="closeSpPreview()">&times;</button>
    </div>
    <iframe class="sp-preview__frame" src="{embed_url}" frameborder="0" allowfullscreen></iframe>
  </div>
</div>
```

### CSS

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

### Attachment Row Change

In the link attachment rendering (inside `loadEntityFiles`), when `isSharePointUrl(f.link_url)` is true, add a preview button after the link:

```html
<button class="btn btn--ghost btn--sm" onclick="openSpPreview('${embedUrl}', '${title}', '${originalUrl}')" title="Preview document" style="font-size:0.65rem;padding:1px 5px">&#128065; Preview</button>
```

### Functions

```javascript
function openSpPreview(embedUrl, title, originalUrl) {
  const html = `<div class="modal-overlay open" id="spPreviewModal" onclick="if(event.target===this)closeSpPreview()">
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

### Auth Handling

No special auth handling. Users are already authenticated to Microsoft 365 (NBI uses Azure MSAL). The Office Online viewer inside the iframe will use the browser's existing Microsoft session. If auth has expired, the viewer shows its own login prompt inside the iframe — no action needed from WorkSage.

### Escape key

Close on Escape press — add to the existing keydown handler or as a standalone:

```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('spPreviewModal')) closeSpPreview();
});
```

## Files Changed

- `nbi_project_dashboard.html` — CSS classes, `isSharePointUrl()`, `getSharePointEmbedUrl()`, `openSpPreview()`, `closeSpPreview()`, modified link attachment render in `loadEntityFiles()`

## Not In Scope

- Downloading files through WorkSage (use "Open in SharePoint" link)
- Caching/thumbnails for SharePoint docs
- Handling non-Microsoft cloud storage (Google Drive, Dropbox)
- Uploading files TO SharePoint from WorkSage
