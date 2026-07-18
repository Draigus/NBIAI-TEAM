// ==================== HELP & ONBOARDING ====================
// Foundation 4. Three layers: guided tour, setup wizard, help mode.

var _tourSteps = [
  { selector: '.sidebar', position: 'right', title: 'Navigation', text: 'This is your navigation. Your clients and sections live here.' },
  { selector: '#si_Portfolio', position: 'right', title: 'Dashboard', text: 'Your morning view. Blocked items, deadlines, and team standup.' },
  { selector: '#si_Projects', position: 'right', title: 'Projects', text: 'Trees, boards and timelines. Drag cards between columns to update status.' },
  { selector: '.g-header__actions', position: 'bottom', title: 'Quick actions', text: 'Create tasks, clients, and leads from here.' },
  { selector: '#themeBtn', position: 'bottom', title: 'Themes', text: 'Customise the look. 8 themes available.' },
  { selector: 'body', position: 'centre', title: 'Keyboard shortcuts', text: 'Press ? anytime to see keyboard shortcuts and help. Press F1 to click any element and learn what it does.' },
];

var _tourIdx = 0;
var _tourEls = null;

function tourStart() {
  _tourIdx = 0;
  _tourBuild();
  _tourShowStep();
}

function _tourBuild() {
  tourEnd();
  var overlay = document.createElement('div');
  overlay.id = 'tourOverlay';
  overlay.innerHTML = '<div class="tour-spotlight"></div>' +
    '<div class="tour-tip" role="dialog" aria-modal="true">' +
    '<div class="tour-tip__title"></div><div class="tour-tip__text"></div>' +
    '<div class="tour-tip__footer">' +
    '<span class="tour-tip__progress"></span>' +
    '<span class="tour-tip__counter"></span>' +
    '<button class="btn btn--ghost btn--sm" data-action="_actTourSkip">Skip tour</button>' +
    '<button class="btn btn--primary btn--sm" data-action="_actTourNext">Next</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  _tourEls = {
    overlay: overlay,
    spotlight: overlay.querySelector('.tour-spotlight'),
    tip: overlay.querySelector('.tour-tip'),
    title: overlay.querySelector('.tour-tip__title'),
    text: overlay.querySelector('.tour-tip__text'),
    progress: overlay.querySelector('.tour-tip__progress'),
    counter: overlay.querySelector('.tour-tip__counter'),
  };
}

function _tourShowStep() {
  var step = _tourSteps[_tourIdx];
  if (!step) { _tourFinish(); return; }
  var target = document.querySelector(step.selector);
  if (!target) { _tourIdx++; _tourShowStep(); return; }

  var r = target.getBoundingClientRect();
  var pad = 6;
  var s = _tourEls.spotlight.style;
  if (step.position === 'centre') {
    s.left = '50%'; s.top = '50%'; s.width = '0'; s.height = '0';
  } else {
    s.left = (r.left - pad) + 'px'; s.top = (r.top - pad) + 'px';
    s.width = (r.width + pad * 2) + 'px'; s.height = (r.height + pad * 2) + 'px';
  }

  _tourEls.title.textContent = step.title;
  _tourEls.text.textContent = step.text;
  _tourEls.counter.textContent = (_tourIdx + 1) + ' of ' + _tourSteps.length;
  _tourEls.progress.innerHTML = _tourSteps.map(function(_, i) {
    return '<span class="tour-dot' + (i === _tourIdx ? ' is-active' : '') + '"></span>';
  }).join('');

  var tip = _tourEls.tip;
  tip.style.visibility = 'hidden';
  requestAnimationFrame(function() {
    var tr = tip.getBoundingClientRect();
    var x, y;
    if (step.position === 'right') { x = r.right + 16; y = r.top; }
    else if (step.position === 'bottom') { x = r.left; y = r.bottom + 12; }
    else if (step.position === 'left') { x = r.left - tr.width - 16; y = r.top; }
    else if (step.position === 'top') { x = r.left; y = r.top - tr.height - 12; }
    else { x = (window.innerWidth - tr.width) / 2; y = (window.innerHeight - tr.height) / 2; }
    x = Math.max(8, Math.min(x, window.innerWidth - tr.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tr.height - 8));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.style.visibility = 'visible';
  });

  var isLast = _tourIdx === _tourSteps.length - 1;
  _tourEls.overlay.querySelector('[data-action="_actTourNext"]').textContent = isLast ? 'Finish' : 'Next';
}

function _actTourNext() { _tourIdx++; _tourShowStep(); }
function _actTourSkip() { _tourFinish(); }

function _tourFinish() {
  tourEnd();
  apiCall('/api/me/prefs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tour_completed: true })
  }).catch(function() {});
}

function tourEnd() {
  var el = document.getElementById('tourOverlay');
  if (el) el.remove();
  _tourEls = null;
}

// ---- Setup wizard: Company -> Team -> First client -> First project ----
var _wizState = null;
var _wizBusy = false;

function wizardStart() {
  _wizState = { step: 0, company: '', invites: [], client: null, project: null };
  _wizRender();
}

var _wizSteps = ['Company', 'Team', 'First client', 'First project', 'Done'];

function _wizRender() {
  var existing = document.getElementById('wizOverlay');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'wizOverlay';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';

  var stepsHtml = _wizSteps.slice(0, 4).map(function(s, i) {
    return '<span class="wiz__step' + (i === _wizState.step ? ' is-active' : i < _wizState.step ? ' is-done' : '') + '">' + esc(s) + '</span>';
  }).join('<span class="wiz__step-sep">&rarr;</span>');

  var body = '';
  if (_wizState.step === 0) {
    body = '<label class="wiz__label" for="wizCompany">Company name</label>' +
      '<input id="wizCompany" class="wiz__input" type="text" value="' + esc(_wizState.company) + '" placeholder="e.g. NBI Analytics">' +
      '<p class="wiz__hint">Shown in headers and report exports. You can change it later in Settings.</p>';
  } else if (_wizState.step === 1) {
    body = '<label class="wiz__label" for="wizInvites">Invite team members (one email per line)</label>' +
      '<textarea id="wizInvites" class="wiz__input" rows="4" placeholder="tom@example.com&#10;magnus@example.com">' + esc(_wizState.invites.join('\n')) + '</textarea>' +
      '<p class="wiz__hint">Each teammate gets an account with a temporary password shown to you at the end. Leave empty to skip.</p>';
  } else if (_wizState.step === 2) {
    body = '<label class="wiz__label" for="wizClient">First client name</label>' +
      '<input id="wizClient" class="wiz__input" type="text" value="' + esc(_wizState.client || '') + '" placeholder="e.g. Couch Heroes">' +
      '<p class="wiz__hint">Clients group your projects. Leave empty to skip.</p>';
  } else if (_wizState.step === 3) {
    body = '<label class="wiz__label" for="wizProject">First project name</label>' +
      '<input id="wizProject" class="wiz__input" type="text" value="' + esc(_wizState.project || '') + '" placeholder="e.g. Live Ops Q3">' +
      '<p class="wiz__hint">' + (_wizState.client ? 'Will be created under ' + esc(_wizState.client) + '.' : 'Created unassigned; you can attach it to a client later.') + '</p>';
  } else {
    body = '<div class="wiz__summary">' +
      '<p><strong>Company:</strong> ' + esc(_wizState.company || 'skipped') + '</p>' +
      '<p><strong>Invites:</strong> ' + (_wizState.invites.length ? esc(_wizState.invites.join(', ')) : 'skipped') + '</p>' +
      '<p><strong>Client:</strong> ' + esc(_wizState.client || 'skipped') + '</p>' +
      '<p><strong>Project:</strong> ' + esc(_wizState.project || 'skipped') + '</p>' +
      (_wizState.credentials && _wizState.credentials.length ? '<div class="wiz__creds"><strong>Temporary passwords (share securely, shown once):</strong><br>' + _wizState.credentials.map(function(c) { return esc(c.email) + ': <code>' + esc(c.password) + '</code>'; }).join('<br>') + '</div>' : '') +
      '</div>';
  }

  var isSummary = _wizState.step === 4;
  overlay.innerHTML = '<div class="modal wiz" style="max-width:480px">' +
    '<div class="wiz__steps">' + stepsHtml + '</div>' +
    '<div class="wiz__body">' + body + '</div>' +
    '<div class="wiz__footer">' +
    (!isSummary ? '<a href="#" class="wiz__skip" data-action="_actWizFinish" data-prevent>I\'ll set this up later</a>' : '') +
    (_wizState.step > 0 && !isSummary ? '<button class="btn btn--ghost btn--sm" data-action="_actWizBack">Back</button>' : '') +
    (isSummary
      ? '<button class="btn btn--primary" data-action="_actWizFinish">Get started</button>'
      : '<button class="btn btn--primary btn--sm" data-action="_actWizNext">Next</button>') +
    '</div></div>';
  document.body.appendChild(overlay);
  var firstInput = overlay.querySelector('.wiz__input');
  if (firstInput) firstInput.focus();
}

function _actWizBack() {
  if (_wizBusy) return;
  _wizCapture();
  _wizState.step--;
  _wizRender();
}

async function _actWizNext() {
  if (_wizBusy) return;
  _wizCapture();
  if (_wizState.step === 3) {
    _wizBusy = true;
    try {
      await _wizExecute();
    } finally {
      _wizBusy = false;
    }
    _wizState.step = 4;
  } else {
    _wizState.step++;
  }
  _wizRender();
}

function _wizCapture() {
  var company = document.getElementById('wizCompany');
  var invites = document.getElementById('wizInvites');
  var client = document.getElementById('wizClient');
  var project = document.getElementById('wizProject');
  if (company) _wizState.company = company.value.trim();
  if (invites) _wizState.invites = invites.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  if (client) _wizState.client = client.value.trim() || null;
  if (project) _wizState.project = project.value.trim() || null;
}

/**
 * Runs the setup calls against the verified admin endpoints. apiCall returns
 * null on non-OK responses (it toasts the server error itself), so failures
 * are detected by null checks, not try/catch. The outer try/catch only guards
 * against network-level rejections.
 */
async function _wizExecute() {
  _wizState.credentials = [];
  var anyFailed = false;
  try {
    if (_wizState.company) {
      var settingsRes = await apiCall('/api/settings/company_name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: _wizState.company })
      });
      if (settingsRes === null) anyFailed = true;
    }
    for (var i = 0; i < _wizState.invites.length; i++) {
      var email = _wizState.invites[i];
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      var username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      var tempPassword = 'Wz' + Math.random().toString(36).slice(2, 10) + '!7';
      var created = await apiCall('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, display_name: username, email: email, password: tempPassword, role: 'member' })
      });
      if (created) {
        _wizState.credentials.push({ email: email, password: tempPassword });
      } else {
        anyFailed = true;
        toast('Could not create ' + email, 'error');
      }
    }
    var clientRow = null;
    if (_wizState.client) {
      clientRow = await apiCall('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: _wizState.client, practice_area: 'gaming' })
      });
      if (clientRow === null) anyFailed = true;
    }
    if (_wizState.project) {
      var projectRow = await apiCall('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: _wizState.project, item_type: 'project', client_id: clientRow ? clientRow.id : null })
      });
      if (projectRow === null) anyFailed = true;
    }
  } catch (e) {
    anyFailed = true;
  }
  if (anyFailed) toast('Some setup steps failed; you can finish in Settings', 'error');
}

function _actWizFinish() {
  var el = document.getElementById('wizOverlay');
  if (el) el.remove();
  apiCall('/api/me/prefs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setup_completed: true })
  }).catch(function() {});
  if (typeof renderAll === 'function') renderAll();
}

// ---- On-demand help mode (F1 or ? icon): click any element for a help card ----
var _helpModeOn = false;

function helpModeToggle() {
  _helpModeOn = !_helpModeOn;
  document.body.classList.toggle('help-mode', _helpModeOn);
  if (_helpModeOn) {
    document.addEventListener('click', _helpModeClick, true);
    document.addEventListener('keydown', _helpModeEsc, true);
    toast('Help mode: click any element to learn about it. Esc to exit.');
  } else {
    document.removeEventListener('click', _helpModeClick, true);
    document.removeEventListener('keydown', _helpModeEsc, true);
    _helpCardClose();
  }
}

function _helpModeEsc(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); helpModeToggle(); }
}

function _helpModeClick(e) {
  // Clicks inside the help card itself (e.g. its close button) behave
  // normally; without this the capture-phase interceptor swallows them
  // before the button's own onclick can run.
  if (e.target.closest('#helpCard')) return;
  e.preventDefault();
  e.stopPropagation();
  var entry = _helpLookup(e.target);
  _helpCardShow(entry, e.target);
}

function _helpLookup(el) {
  // HELP_CONTENT is defined in nbi-help-content.js: array of
  // { selector, title, text, related, shortcut }
  for (var i = 0; i < HELP_CONTENT.length; i++) {
    if (el.closest(HELP_CONTENT[i].selector)) return HELP_CONTENT[i];
  }
  return { title: 'No help written yet', text: 'This element has no help entry yet. Press Escape to leave help mode.', related: [], shortcut: null };
}

function _helpCardShow(entry, target) {
  _helpCardClose();
  var card = document.createElement('div');
  card.id = 'helpCard';
  card.setAttribute('role', 'dialog');
  var related = (entry.related || []).map(function(r) { return '<span class="help-card__rel">' + esc(r) + '</span>'; }).join('');
  card.innerHTML = '<div class="help-card__title">' + esc(entry.title) + '</div>' +
    '<div class="help-card__text">' + esc(entry.text) + '</div>' +
    (entry.shortcut ? '<div class="help-card__shortcut">Shortcut: <kbd>' + esc(entry.shortcut) + '</kbd></div>' : '') +
    (related ? '<div class="help-card__related">See also: ' + related + '</div>' : '') +
    '<button class="btn btn--ghost btn--sm help-card__close" onclick="_helpCardClose()" aria-label="Close">&times;</button>';
  document.body.appendChild(card);
  var r = target.getBoundingClientRect();
  var cr = card.getBoundingClientRect();
  var x = Math.max(8, Math.min(r.left, window.innerWidth - cr.width - 8));
  var y = r.bottom + 8 + cr.height > window.innerHeight ? r.top - cr.height - 8 : r.bottom + 8;
  card.style.left = x + 'px';
  card.style.top = Math.max(8, y) + 'px';
}

function _helpCardClose() {
  var el = document.getElementById('helpCard');
  if (el) el.remove();
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F1') { e.preventDefault(); helpModeToggle(); }
  });
}

/** Called at app init (after login): starts tour once per user. */
async function helpOnboardingCheck() {
  try {
    var prefs = await apiCall('/api/me/prefs');
    if (!prefs.tour_completed) { tourStart(); return; }
    if (!prefs.setup_completed && typeof _currentUser !== 'undefined' && _currentUser && _currentUser.role === 'admin') {
      if (typeof wizardStart === 'function') wizardStart(); // Task 13
    }
  } catch (e) { /* onboarding must never block app load */ }
}
