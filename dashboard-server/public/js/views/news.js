import { registerView } from '../core/router.js';

// ===== NEWS ADMIN =====
async function loadNewsAdmin() {
  var fhEl = document.getElementById('newsAdminFeedHealth');
  if (fhEl) {
    try {
      var fhData = await apiCall('/api/news/admin/feed-health/sources');
      var sources = fhData.sources || [];
      var fhHtml = '<table class="news-admin-table"><thead><tr><th>Source</th><th>Tier</th><th>Status</th><th>7d Attempts</th><th>7d Failures</th><th>New Items</th><th>Last Success</th><th>Enabled</th></tr></thead><tbody>';
      sources.forEach(function(s) {
        var rate = s.attempts_7d > 0 ? Math.round((s.failures_7d / s.attempts_7d) * 100) : 0;
        var badge = rate === 0 ? 'ok' : rate < 50 ? 'warn' : 'err';
        var lastSuccess = s.last_success_at ? new Date(s.last_success_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';
        fhHtml += '<tr><td><strong>' + esc(s.name) + '</strong><br><span style="color:var(--text-muted);font-size:11px">' + esc(s.slug) + '</span></td>';
        fhHtml += '<td>' + esc(s.tier) + '</td>';
        fhHtml += '<td><span class="news-admin-badge news-admin-badge--' + badge + '">' + rate + '% fail</span></td>';
        fhHtml += '<td>' + (s.attempts_7d || 0) + '</td>';
        fhHtml += '<td>' + (s.failures_7d || 0) + '</td>';
        fhHtml += '<td>' + (s.new_items_7d || 0) + '</td>';
        fhHtml += '<td>' + lastSuccess + '</td>';
        fhHtml += '<td><span class="news-admin-toggle" data-action="newsAdminToggleSource" data-arg0="' + esc(s.id) + '" data-arg1="' + (s.enabled ? 'false' : 'true') + '">' + (s.enabled ? '\u2705' : '\u274c') + '</span></td>';
        fhHtml += '</tr>';
      });
      fhHtml += '</tbody></table>';
      fhEl.innerHTML = fhHtml;
    } catch (err) { fhEl.innerHTML = '<div style="color:var(--text-muted)">Failed to load feed health: ' + esc(err.message || '') + '</div>'; }
  }
  var prEl = document.getElementById('newsAdminPrompts');
  if (prEl) {
    try {
      var prData = await apiCall('/api/news/admin/prompts');
      var prompts = prData.prompts || [];
      var keys = {};
      prompts.forEach(function(p) { if (!keys[p.prompt_key]) keys[p.prompt_key] = []; keys[p.prompt_key].push(p); });
      var prHtml = '';
      Object.keys(keys).forEach(function(key) {
        var versions = keys[key];
        var active = versions.find(function(v) { return v.is_active; }) || versions[0];
        prHtml += '<div style="margin-bottom:16px;padding:12px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface)">';
        prHtml += '<div style="font-weight:600;margin-bottom:8px">' + esc(key) + ' <span style="color:var(--text-muted);font-size:11px">v' + active.version + ' (active)</span></div>';
        prHtml += '<textarea id="newsPrompt_' + esc(key) + '" style="width:100%;min-height:100px;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-family:monospace;font-size:12px;resize:vertical">' + esc(active.body || '') + '</textarea>';
        prHtml += '<button class="btn btn--sm" style="margin-top:6px" data-action="newsAdminSavePrompt" data-arg0="' + esc(key) + '">Save as new version</button>';
        if (versions.length > 1) {
          prHtml += '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">Version history (' + versions.length + ')</summary>';
          versions.forEach(function(v) {
            prHtml += '<div style="padding:4px 0;font-size:12px;border-bottom:1px solid var(--border-default)">';
            prHtml += 'v' + v.version + (v.is_active ? ' (active)' : '') + ' by ' + esc(v.created_by || 'unknown') + ' ';
            if (!v.is_active) prHtml += '<button class="btn btn--sm" data-action="newsAdminActivatePrompt" data-arg0="' + esc(v.id) + '">Activate</button>';
            prHtml += '</div>';
          });
          prHtml += '</details>';
        }
        prHtml += '</div>';
      });
      if (!prHtml) prHtml = '<div style="color:var(--text-muted)">No prompts configured.</div>';
      prEl.innerHTML = prHtml;
    } catch (err) { prEl.innerHTML = '<div style="color:var(--text-muted)">Failed to load prompts: ' + esc(err.message || '') + '</div>'; }
  }
  var stEl = document.getElementById('newsAdminStories');
  if (stEl) {
    try {
      var dgData = await apiCall('/api/news/digests/current');
      var stories = dgData.stories || [];
      if (!stories.length) { stEl.innerHTML = '<div style="color:var(--text-muted)">No stories in current digest.</div>'; }
      else {
        var stHtml = '<div style="margin-bottom:8px;font-size:12px;color:var(--text-muted)">Select stories to merge, or click Regenerate on individual stories.</div>';
        stHtml += '<form id="newsStoryForm">';
        stories.forEach(function(s) {
          stHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-default)">';
          stHtml += '<input type="checkbox" name="storyId" value="' + esc(s.id) + '">';
          stHtml += '<div style="flex:1"><strong>' + esc(s.headline) + '</strong> <span style="color:var(--text-muted);font-size:11px">' + esc(s.category || '') + '</span></div>';
          stHtml += '<button type="button" class="btn btn--sm" data-action="newsAdminRegenerateStory" data-arg0="' + esc(s.id) + '">Regenerate</button>';
          stHtml += '</div>';
        });
        stHtml += '</form>';
        stHtml += '<div style="margin-top:8px;display:flex;gap:8px">';
        stHtml += '<button class="btn btn--sm btn--primary" data-action="newsAdminMergeStories">Merge selected</button>';
        stHtml += '</div>';
        stEl.innerHTML = stHtml;
      }
    } catch (err) { stEl.innerHTML = '<div style="color:var(--text-muted)">Failed to load stories: ' + esc(err.message || '') + '</div>'; }
  }
}

async function newsAdminMergeStories() {
  var form = document.getElementById('newsStoryForm');
  if (!form) return;
  var checked = Array.from(form.querySelectorAll('input[name="storyId"]:checked')).map(function(cb) { return cb.value; });
  if (checked.length < 2) { toast('Select at least 2 stories to merge', 'warning'); return; }
  if (!confirm('Merge ' + checked.length + ' stories? This will regenerate the summary via LLM.')) return;
  try {
    await apiCall('/api/news/admin/stories/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyIds: checked }) });
    toast('Stories merged and regenerated', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Merge failed', 'error'); }
}

async function newsAdminRegenerateStory(id) {
  if (!confirm('Regenerate this story summary via LLM?')) return;
  try {
    await apiCall('/api/news/admin/regenerate/stories/' + id, { method: 'POST' });
    toast('Story regenerated', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Regeneration failed', 'error'); }
}

async function newsAdminToggleSource(id, enabled) {
  try {
    await apiCall('/api/news/admin/feed-health/sources/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: enabled === 'true' }) });
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to toggle source', 'error'); }
}

async function newsAdminSavePrompt(promptKey) {
  var ta = document.getElementById('newsPrompt_' + promptKey);
  if (!ta) return;
  try {
    await apiCall('/api/news/admin/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptKey: promptKey, body: ta.value }) });
    toast('Prompt saved as new version', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to save prompt', 'error'); }
}

async function newsAdminActivatePrompt(id) {
  try {
    await apiCall('/api/news/admin/prompts/' + id + '/activate', { method: 'POST' });
    toast('Prompt version activated', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to activate prompt', 'error'); }
}

async function newsAdminAddSource() {
  var slug = prompt('Source slug (e.g. ign):');
  if (!slug) return;
  var name = prompt('Display name:');
  if (!name) return;
  var feedUrl = prompt('RSS feed URL:');
  if (!feedUrl) return;
  var tier = prompt('Tier (t1/t2/t3):', 't2');
  try {
    await apiCall('/api/news/admin/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: slug, name: name, feedUrl: feedUrl, tier: tier || 't2' }) });
    toast('Source added', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to add source', 'error'); }
}

// ============================================================
// News aggregator module (Tasks 29-36, M3)
// ============================================================
let _newsModuleLoaded = false;
let _newsState = {
  digest: null,
  subView: 'today',
  archive: null,
  searchFilters: null,
};

const newsApi = {
  async loadCurrent() {
    const r = await authFetch('/api/news/digests/current');
    if (!r.ok) throw new Error('news service unavailable (HTTP ' + r.status + ')');
    return r.json();
  },
  async loadDigest(id) {
    const r = await authFetch('/api/news/digests/' + encodeURIComponent(id));
    if (!r.ok) throw new Error('digest not found (HTTP ' + r.status + ')');
    return r.json();
  },
  async loadArchive() {
    const r = await authFetch('/api/news/digests/archive?limit=48');
    if (!r.ok) throw new Error('archive unavailable (HTTP ' + r.status + ')');
    return r.json();
  },
  async loadMonthlySummary(id) {
    const r = await authFetch('/api/news/monthly-summaries/' + encodeURIComponent(id));
    if (!r.ok) throw new Error('monthly summary not found (HTTP ' + r.status + ')');
    return r.json();
  },
  mediaUrl(hash, variant) { return hash ? '/api/news/media/' + hash + '/' + variant : null; },
  async search(q, opts) {
    const params = new URLSearchParams({ q });
    if (opts.category) params.set('category', opts.category);
    if (opts.has_video) params.set('has_video', opts.has_video);
    const r = await authFetch('/api/news/search?' + params.toString());
    if (!r.ok) throw new Error('search failed (HTTP ' + r.status + ')');
    return r.json();
  },
};

function renderNewsOrLoad(el) {
  if (_newsModuleLoaded) { renderNewsView(); return; }
  el.innerHTML = '<div class="news-loading"><span class="news-loading__spinner"></span>Loading news\u2026</div>';
  loadNewsModule();
}

async function loadNewsModule() {
  try {
    _newsState.digest = await newsApi.loadCurrent();
    _newsModuleLoaded = true;
    renderNewsView();
  } catch (err) {
    if (window._nbiDebug) console.error('[news] initial load failed', err);
    const el = document.getElementById('mainContent');
    if (el) el.innerHTML = newsTemplates.errorBanner(err && err.message || 'Unknown error');
  }
}

function newsEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function newsFormatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}
function newsDigestTitle(d) {
  if (!d) return '';
  if (d.digestType === 'launch_30day' || d.digest_type === 'launch_30day') return 'Last 30 days in games';
  const ps = d.periodStart || d.period_start;
  const pe = d.periodEnd || d.period_end;
  if (!ps || !pe) return 'Games industry digest';
  const start = new Date(ps); const end = new Date(pe);
  return 'Week of ' + start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' to ' + end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function newsGroupStories(stories) {
  const order = ['studios', 'games', 'shifts', 'strategy'];
  const groups = new Map();
  for (const c of order) groups.set(c, []);
  for (const s of stories || []) {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category).push(s);
  }
  for (const arr of groups.values()) arr.sort((a, b) => (a.rank || 0) - (b.rank || 0));
  return groups;
}

const newsTemplates = {
  errorBanner(msg) {
    return '<div class="news-error"><span>News service error: ' + newsEsc(msg) + '</span>' +
           '<button data-action="loadNewsModule">Retry</button></div>';
  },
  empty() {
    return '<div class="news-empty">No published digest yet. Come back after Sunday evening.</div>';
  },
  hero(story) {
    if (!story) return '';
    const img = newsApi.mediaUrl(story.og_image_hash, 'hero');
    const isDynamic = !!story.is_dynamic_category;
    const pillClass = isDynamic ? 'news-pill--dynamic' : 'news-pill--' + newsEsc(story.category);
    const pillLabel = isDynamic ? (story.dynamic_category_label || story.category) : story.category;
    return '<section class="news-hero">' +
      (img ? '<div class="news-hero__image" style="background-image:url(\'' + img + '\')"></div>' : '<div class="news-hero__image"></div>') +
      '<div class="news-hero__body">' +
        '<span class="news-pill ' + pillClass + '">' + newsEsc(pillLabel) + '</span>' +
        '<h2 class="news-hero__headline">' + newsEsc(story.headline) + '</h2>' +
        '<p class="news-hero__summary">' + newsEsc(story.summary) + '</p>' +
        '<div class="news-hero__meta">' +
          newsTemplates.sourcesToggle(story) +
        '</div>' +
        newsTemplates.sourcesDrawer(story) +
      '</div>' +
    '</section>';
  },
  sourcesToggle(story) {
    const count = (story.source_count || (story.articles ? story.articles.length : 0));
    return '<button class="news-sources-toggle" data-action="toggleNewsSourceDrawer" data-arg0="' + newsEsc(story.id) + '">' +
      count + ' source' + (count === 1 ? '' : 's') + '</button>';
  },
  sourcesDrawer(story) {
    if (!story.articles || !story.articles.length) return '';
    return '<div class="news-sources-drawer" id="news-sources-' + newsEsc(story.id) + '">' +
      story.articles.map(a =>
        '<a class="news-source-link" href="' + safeUrl(a.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<strong>' + newsEsc(a.source) + '</strong>: ' + newsEsc(a.title) +
          '<span class="news-source-meta">' + (a.author ? newsEsc(a.author) + ' / ' : '') + newsEsc(newsFormatDate(a.published_at)) + '</span>' +
        '</a>'
      ).join('') +
    '</div>';
  },
  card(story) {
    const img = newsApi.mediaUrl(story.og_image_hash, 'card');
    return '<article class="news-card">' +
      (img ? '<div class="news-card__image" style="background-image:url(\'' + img + '\')"></div>' : '') +
      '<h3 class="news-card__headline">' + newsEsc(story.headline) + '</h3>' +
      '<p class="news-card__summary">' + newsEsc(story.summary) + '</p>' +
      '<div class="news-card__meta">' + newsTemplates.sourcesToggle(story) + '</div>' +
      newsTemplates.sourcesDrawer(story) +
    '</article>';
  },
  section(category, stories, isDynamic, dynamicLabel) {
    if (!stories || !stories.length) return '';
    const label = isDynamic ? (dynamicLabel || category) : category;
    const pillClass = isDynamic ? 'news-pill--dynamic' : 'news-pill--' + newsEsc(category);
    return '<section class="news-section">' +
      '<header class="news-section__header">' +
        '<span class="news-pill ' + pillClass + '">' + newsEsc(label) + '</span>' +
        '<h2 class="news-section__title">' + newsEsc(label) + '</h2>' +
        '<span class="news-section__count">' + stories.length + ' stor' + (stories.length === 1 ? 'y' : 'ies') + '</span>' +
      '</header>' +
      '<div class="news-cards">' + stories.map(newsTemplates.card).join('') + '</div>' +
      '<button class="news-section__show-all" data-action="_actDismissNewsCompact" data-pass-el>Show all ' + stories.length + '</button>' +
    '</section>';
  },
  monthlyBlock(ms) {
    if (!ms) return '';
    const body = ms.body_markdown || '';
    const excerpt = body.split(/\n\s*\n/)[0].slice(0, 280);
    return '<section class="news-monthly">' +
      '<p class="news-monthly__kicker">State of the Industry</p>' +
      '<h2 class="news-monthly__title">' + newsEsc(ms.title) + '</h2>' +
      '<p class="news-monthly__excerpt">' + newsEsc(excerpt) + (body.length > excerpt.length ? '\u2026' : '') + '</p>' +
      '<button class="news-monthly__read-more" data-action="toggleNewsMonthly" data-pass-el>Read the essay</button>' +
      '<div class="news-monthly__body" data-md="' + newsEsc(body) + '"></div>' +
    '</section>';
  },
};

function newsMarkdownLite(md) {
  if (!md) return '';
  return newsEsc(md)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\*])\*([^\*][^\*]*?)\*/g, '$1<em>$2</em>')
    .split(/\n\s*\n/)
    .map(p => /^<h[1-6]>/.test(p) ? p : '<p>' + p.replace(/\n/g, '<br>') + '</p>')
    .join('\n');
}

function toggleNewsMonthly(btn) {
  const body = btn.parentElement.querySelector('.news-monthly__body');
  if (!body) return;
  const isOpen = body.classList.contains('open');
  if (isOpen) { body.classList.remove('open'); btn.textContent = 'Read the essay'; return; }
  if (!body.firstChild) {
    const raw = body.getAttribute('data-md') || '';
    const tmp = document.createElement('textarea');
    tmp.innerHTML = raw;
    const md = tmp.value;
    body.innerHTML = newsMarkdownLite(md);
  }
  body.classList.add('open');
  btn.textContent = 'Hide essay';
}

function toggleNewsSourceDrawer(storyId) {
  const el = document.getElementById('news-sources-' + storyId);
  if (el) el.classList.toggle('open');
}

function renderNewsView() {
  const root = document.getElementById('mainContent');
  if (!root) return;
  if (_newsState.subView === 'archive') { renderArchiveView(root); return; }
  if (_newsState.subView === 'search') { renderSearchView(root); return; }

  const payload = _newsState.digest;
  if (!payload || !payload.digest) { root.innerHTML = newsTemplates.empty(); return; }

  const { digest, hero, stories, monthly_summary } = payload;
  const groups = newsGroupStories(stories);
  const sourceCount = new Set((stories || []).flatMap(s => (s.articles || []).map(a => a.source))).size;
  const totalStories = (stories || []).length;

  root.innerHTML =
    '<div class="news-page">' +
      '<header class="news-page__header">' +
        '<h1>' + newsEsc(newsDigestTitle(digest)) + '</h1>' +
        '<p class="news-page__meta">' + totalStories + ' stor' + (totalStories === 1 ? 'y' : 'ies') + ' from ' + sourceCount + ' source' + (sourceCount === 1 ? '' : 's') + '</p>' +
        '<div class="news-page__subtabs">' +
          '<span class="news-page__subtab ' + (_newsState.subView === 'today' ? 'active' : '') + '" data-action="newsSwitchSubView" data-arg0="today">Today</span>' +
          '<span class="news-page__subtab ' + (_newsState.subView === 'archive' ? 'active' : '') + '" data-action="newsSwitchSubView" data-arg0="archive">Archive</span>' +
          '<span class="news-page__subtab ' + (_newsState.subView === 'search' ? 'active' : '') + '" data-action="newsSwitchSubView" data-arg0="search">Search</span>' +
        '</div>' +
      '</header>' +
      (monthly_summary ? newsTemplates.monthlyBlock(monthly_summary) : '') +
      newsTemplates.hero(hero) +
      '<div id="news-sections">' + renderNewsSectionsHtml(groups, digest) + '</div>' +
    '</div>';
}

function renderNewsSectionsHtml(groups, digest) {
  let html = '';
  const canonical = ['studios', 'games', 'shifts', 'strategy'];
  for (const c of canonical) {
    html += newsTemplates.section(c, groups.get(c), false);
  }
  for (const [cat, arr] of groups) {
    if (canonical.includes(cat)) continue;
    if (!arr || !arr.length) continue;
    const dynamicLabel = arr[0].dynamic_category_label || cat;
    html += newsTemplates.section(cat, arr, true, dynamicLabel);
  }
  return html;
}

async function newsSwitchSubView(which) {
  _newsState.subView = which;
  if (which === 'archive' && !_newsState.archive) {
    try {
      _newsState.archive = await newsApi.loadArchive();
    } catch (err) {
      const root = document.getElementById('mainContent');
      if (root) root.innerHTML = newsTemplates.errorBanner(err && err.message || 'Could not load archive');
      return;
    }
  }
  renderNewsView();
}

function renderArchiveView(root) {
  const arch = _newsState.archive || { digests: [], monthly_summaries: [] };
  const digests = arch.digests || [];
  const monthlies = arch.monthly_summaries || [];
  let html = '<div class="news-page">' +
    '<header class="news-page__header">' +
      '<h1>News archive</h1>' +
      '<p class="news-page__meta">' + digests.length + ' digest' + (digests.length === 1 ? '' : 's') + ' \u00b7 ' + monthlies.length + ' monthly essay' + (monthlies.length === 1 ? '' : 's') + '</p>' +
      '<div class="news-page__subtabs">' +
        '<span class="news-page__subtab" data-action="newsSwitchSubView" data-arg0="today">Today</span>' +
        '<span class="news-page__subtab active" data-action="newsSwitchSubView" data-arg0="archive">Archive</span>' +
        '<span class="news-page__subtab" data-action="newsSwitchSubView" data-arg0="search">Search</span>' +
      '</div>' +
    '</header>' +
    '<div class="news-archive">';
  if (!digests.length) html += '<div class="news-empty">No prior digests yet.</div>';
  for (const d of digests) {
    const label = d.digest_type === 'launch_30day'
      ? 'Launch edition (last 30 days)'
      : 'Week of ' + new Date(d.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' to ' + new Date(d.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const published = d.published_at ? new Date(d.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    html += '<div class="news-archive__row" data-action="newsOpenDigest" data-arg0="' + newsEsc(d.id) + '">' +
      '<div class="news-archive__row-label">' +
        '<span class="news-archive__row-title">' + newsEsc(label) + '</span>' +
        '<span class="news-archive__row-sub">Published ' + newsEsc(published) + '</span>' +
      '</div>' +
      '<span class="news-archive__row-chev">\u203a</span>' +
    '</div>';
  }
  for (const ms of monthlies) {
    const monthLabel = new Date(ms.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    html += '<div class="news-archive__row" data-action="toast" data-arg0="Monthly essay deep-link coming soon" data-arg1="info">' +
      '<div class="news-archive__row-label">' +
        '<span class="news-archive__row-title">' + newsEsc(ms.title || (monthLabel + ' synthesis')) + '</span>' +
        '<span class="news-archive__row-sub">State of the Industry \u00b7 ' + newsEsc(monthLabel) + '</span>' +
      '</div>' +
      '<span class="news-archive__row-chev">\u203a</span>' +
    '</div>';
  }
  html += '</div></div>';
  root.innerHTML = html;
}

async function newsOpenDigest(id) {
  const root = document.getElementById('mainContent');
  if (root) root.innerHTML = '<div class="news-loading"><span class="news-loading__spinner"></span>Loading digest\u2026</div>';
  try {
    _newsState.digest = await newsApi.loadDigest(id);
    _newsState.subView = 'today';
    renderNewsView();
  } catch (err) {
    if (root) root.innerHTML = newsTemplates.errorBanner(err && err.message || 'Could not load digest');
  }
}

function renderSearchView(root) {
  if (!_newsState.searchFilters) _newsState.searchFilters = { q: '', source: '', category: '', has_video: '' };
  const f = _newsState.searchFilters;
  root.innerHTML =
    '<div class="news-page">' +
      '<header class="news-page__header">' +
        '<h1>Search the archive</h1>' +
        '<div class="news-page__subtabs">' +
          '<span class="news-page__subtab" data-action="newsSwitchSubView" data-arg0="today">Today</span>' +
          '<span class="news-page__subtab" data-action="newsSwitchSubView" data-arg0="archive">Archive</span>' +
          '<span class="news-page__subtab active" data-action="newsSwitchSubView" data-arg0="search">Search</span>' +
        '</div>' +
      '</header>' +
      '<div class="news-search">' +
        '<input type="search" id="newsSearchQuery" placeholder="Search stories and articles..." value="' + newsEsc(f.q) + '">' +
        '<div class="news-search__filters">' +
          '<select id="newsSearchCategory">' +
            '<option value="">All categories</option>' +
            '<option value="studios"' + (f.category === 'studios' ? ' selected' : '') + '>Studios</option>' +
            '<option value="games"' + (f.category === 'games' ? ' selected' : '') + '>Games</option>' +
            '<option value="shifts"' + (f.category === 'shifts' ? ' selected' : '') + '>Shifts</option>' +
            '<option value="strategy"' + (f.category === 'strategy' ? ' selected' : '') + '>Strategy</option>' +
          '</select>' +
          '<label><input type="checkbox" id="newsSearchVideo"' + (f.has_video ? ' checked' : '') + '> Has video</label>' +
        '</div>' +
        '<button id="newsSearchBtn" data-action="executeNewsSearch">Search</button>' +
        '<div id="newsSearchResults"></div>' +
      '</div>' +
    '</div>';
  var qi = document.getElementById('newsSearchQuery');
  if (qi) { qi.addEventListener('keydown', function(e) { if (e.key === 'Enter') executeNewsSearch(); }); qi.focus(); }
}

async function executeNewsSearch() {
  var q = (document.getElementById('newsSearchQuery') || {}).value || '';
  q = q.trim();
  var category = (document.getElementById('newsSearchCategory') || {}).value || '';
  var hasVideo = (document.getElementById('newsSearchVideo') || {}).checked ? 'true' : '';
  _newsState.searchFilters = { q: q, category: category, has_video: hasVideo };
  var results = document.getElementById('newsSearchResults');
  if (!q) { if (results) results.innerHTML = ''; return; }
  if (results) results.innerHTML = '<div class="news-loading"><span class="news-loading__spinner"></span>Searching\u2026</div>';
  try {
    var data = await newsApi.search(q, { category: category, has_video: hasVideo });
    var html = '<h3>Stories (' + data.stories.length + ')</h3>';
    if (data.stories.length) {
      html += data.stories.map(function(s) {
        return '<div class="news-search-result"><h4>' + newsEsc(s.headline) + '</h4><p>' + (s.snippet || '') + '</p>' +
          '<span class="news-search-result__meta">' + newsEsc(s.category || '') + ' \u00b7 ' + (s.period_end ? new Date(s.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + '</span></div>';
      }).join('');
    } else { html += '<p class="news-empty">No story matches</p>'; }
    html += '<h3>Articles (' + data.articles.length + ')</h3>';
    if (data.articles.length) {
      html += data.articles.map(function(a) {
        return '<div class="news-search-result"><h4><a href="' + newsEsc(a.url || '') + '" target="_blank" rel="noopener noreferrer">' + newsEsc(a.title) + '</a></h4><p>' + (a.snippet || '') + '</p>' +
          '<span class="news-search-result__meta">' + newsEsc(a.source || '') + ' \u00b7 ' + (a.published_at ? new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + '</span></div>';
      }).join('');
    } else { html += '<p class="news-empty">No article matches</p>'; }
    if (results) results.innerHTML = html;
  } catch (err) {
    if (results) results.innerHTML = newsTemplates.errorBanner(err && err.message || 'Search failed');
  }
}

function _actDismissNewsCompact(el) { document.body.classList.remove('news-mobile-compact'); el.remove(); }

// --- Window registrations for event delegation ---
window.loadNewsAdmin = loadNewsAdmin;
window.newsAdminMergeStories = newsAdminMergeStories;
window.newsAdminRegenerateStory = newsAdminRegenerateStory;
window.newsAdminToggleSource = newsAdminToggleSource;
window.newsAdminSavePrompt = newsAdminSavePrompt;
window.newsAdminActivatePrompt = newsAdminActivatePrompt;
window.newsAdminAddSource = newsAdminAddSource;
window.loadNewsModule = loadNewsModule;
window.renderNewsOrLoad = renderNewsOrLoad;
window.toggleNewsMonthly = toggleNewsMonthly;
window.toggleNewsSourceDrawer = toggleNewsSourceDrawer;
window.newsSwitchSubView = newsSwitchSubView;
window.newsOpenDigest = newsOpenDigest;
window.executeNewsSearch = executeNewsSearch;
window._actDismissNewsCompact = _actDismissNewsCompact;

registerView('news', renderNewsOrLoad);
