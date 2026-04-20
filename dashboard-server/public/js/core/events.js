// Listener registry
const _listenerRegistry = [];

export function addManagedListener(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  _listenerRegistry.push({ target, event, handler, options });
}

export function cleanupListeners() {
  _listenerRegistry.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  _listenerRegistry.length = 0;
}

// Register on window for backward compatibility during migration
window.addManagedListener = addManagedListener;
window.cleanupListeners = cleanupListeners;

// Event delegation
const _BOOL = { 'true': true, 'false': false, 'null': null };
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.hasAttribute('data-stop')) e.stopPropagation();
  if (el.hasAttribute('data-prevent')) e.preventDefault();
  const action = el.dataset.action;
  const fn = window[action];
  if (typeof fn !== 'function') return;
  const args = [];
  if (el.hasAttribute('data-pass-event')) args.push(e);
  for (let i = 0; el.dataset['arg' + i] !== undefined; i++) {
    const v = el.dataset['arg' + i];
    args.push(v in _BOOL ? _BOOL[v] : v);
  }
  if (el.hasAttribute('data-pass-el')) args.push(el);
  fn.apply(null, args);
});
