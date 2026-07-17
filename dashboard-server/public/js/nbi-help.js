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
