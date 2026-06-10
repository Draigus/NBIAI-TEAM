// ============================================================
// News aggregator module (Tasks 29-36, M3)
// ============================================================
// Lazy-loaded on first click of the News tab. State + API client +
// templates + renderers all live in this block. Data flows:
//   renderContent() → renderNewsOrLoad(el) → loadNewsModule() on cold start
//     → newsApi.loadCurrent() → renderNewsView()
// Subsequent tab visits re-use the cached _newsState.digest.
// Archive sub-tab: newsApi.loadArchive() → renderArchiveView().

let _newsModuleLoaded = false;
let _newsState = {
  digest: null,            // current digest response { digest, hero, stories, monthly_summary }
  subView: 'today',        // 'today' | 'archive' | 'search'
  archive: null,           // archive list cache
  searchFilters: null,     // { q, source, category, has_video }
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

// renderIntelligenceView removed — consolidated into CC Intel tab

function renderNewsOrLoad(el) {
  if (_newsModuleLoaded) { renderNewsView(); return; }
  el.innerHTML = '<div class="news-loading"><span class="news-loading__spinner"></span>Loading news…</div>';
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

// Plain helpers (can't reuse any of the dashboard's existing `esc`/`formatDate`
// without risking global-name clashes — these are scoped to news rendering).
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

/** Order stories by category, canonical first, dynamic 5th last. Returns a
 *  Map<category, Story[]> so the renderer can output section bands. */
function newsGroupStories(stories) {
  const order = ['studios', 'games', 'shifts', 'strategy'];
  const groups = new Map();
  for (const c of order) groups.set(c, []);
  for (const s of stories || []) {
    if (!groups.has(s.category)) groups.set(s.category, []); // dynamic 5th appended at end
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
    // Simple excerpt: first paragraph.
    const excerpt = body.split(/\n\s*\n/)[0].slice(0, 280);
    // Store the raw markdown source on the body node (data-md). The
    // toggle handler re-runs newsMarkdownLite at toggle time and writes
    // via DOM APIs, so HTML is never round-tripped through an attribute
    // and innerHTML — which was the previous design and a latent XSS
    // (audit finding F-C3). newsEsc in an attribute is safe today, but
    // the attribute→innerHTML round-trip means any future markdown
    // extension (images, links, etc.) would turn into stored XSS on the
    // LLM's monthly essay content. The new flow keeps the output HTML
    // entirely server-side-equivalent with no live re-parse of attr text.
    return '<section class="news-monthly">' +
      '<p class="news-monthly__kicker">State of the Industry</p>' +
      '<h2 class="news-monthly__title">' + newsEsc(ms.title) + '</h2>' +
      '<p class="news-monthly__excerpt">' + newsEsc(excerpt) + (body.length > excerpt.length ? '…' : '') + '</p>' +
      '<button class="news-monthly__read-more" data-action="toggleNewsMonthly" data-pass-el>Read the essay</button>' +
      '<div class="news-monthly__body" data-md="' + newsEsc(body) + '"></div>' +
    '</section>';
  },
};

/** Tiny markdown-lite: paragraphs + # / ## headings + bold/italic. Not a full
 *  markdown parser; the monthly synthesis body is LLM-generated and
 *  intentionally simple. */
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
    // Render the markdown source to DOM nodes at toggle time rather than
    // round-tripping an HTML string through a data attribute and
    // innerHTML. data-md holds the escaped markdown source; we unescape
    // it and feed it through newsMarkdownLite which only produces a
    // fixed set of block tags (p, h1-h3, br, strong, em) from content
    // that newsEsc() has already entity-encoded. Any future markdown
    // extension stays bounded by this function rather than leaking
    // arbitrary HTML (audit finding F-C3).
    const raw = body.getAttribute('data-md') || '';
    const tmp = document.createElement('textarea');
    tmp.innerHTML = raw; // textarea decodes entities without executing anything
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

/** Main renderer: the "Today" / current-digest view. */
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
  // Dynamic 5th — any category in groups that isn't canonical and has at
  // least one story. The backend already enforces the >=4-stories threshold,
  // so we just render whatever comes through.
  for (const [cat, arr] of groups) {
    if (canonical.includes(cat)) continue;
    if (!arr || !arr.length) continue;
    // Use the first story's dynamic_category_label for display since all
    // stories in this band share it.
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
      '<p class="news-page__meta">' + digests.length + ' digest' + (digests.length === 1 ? '' : 's') + ' · ' + monthlies.length + ' monthly essay' + (monthlies.length === 1 ? '' : 's') + '</p>' +
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
      '<span class="news-archive__row-chev">›</span>' +
    '</div>';
  }
  for (const ms of monthlies) {
    const monthLabel = new Date(ms.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    html += '<div class="news-archive__row" data-action="toast" data-arg0="Monthly essay deep-link coming soon" data-arg1="info">' +
      '<div class="news-archive__row-label">' +
        '<span class="news-archive__row-title">' + newsEsc(ms.title || (monthLabel + ' synthesis')) + '</span>' +
        '<span class="news-archive__row-sub">State of the Industry · ' + newsEsc(monthLabel) + '</span>' +
      '</div>' +
      '<span class="news-archive__row-chev">›</span>' +
    '</div>';
  }
  html += '</div></div>';
  root.innerHTML = html;
}

async function newsOpenDigest(id) {
  const root = document.getElementById('mainContent');
  if (root) root.innerHTML = '<div class="news-loading"><span class="news-loading__spinner"></span>Loading digest…</div>';
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
        return '<div class="news-search-result"><h4>' + newsEsc(s.headline) + '</h4><p>' + newsEsc(s.snippet || '') + '</p>' +
          '<span class="news-search-result__meta">' + newsEsc(s.category || '') + ' \u00b7 ' + (s.period_end ? new Date(s.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + '</span></div>';
      }).join('');
    } else { html += '<p class="news-empty">No story matches</p>'; }
    html += '<h3>Articles (' + data.articles.length + ')</h3>';
    if (data.articles.length) {
      html += data.articles.map(function(a) {
        return '<div class="news-search-result"><h4><a href="' + newsEsc(a.url || '') + '" target="_blank" rel="noopener noreferrer">' + newsEsc(a.title) + '</a></h4><p>' + newsEsc(a.snippet || '') + '</p>' +
          '<span class="news-search-result__meta">' + newsEsc(a.source || '') + ' \u00b7 ' + (a.published_at ? new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + '</span></div>';
      }).join('');
    } else { html += '<p class="news-empty">No article matches</p>'; }
    if (results) results.innerHTML = html;
  } catch (err) {
    if (results) results.innerHTML = newsTemplates.errorBanner(err && err.message || 'Search failed');
  }
}
