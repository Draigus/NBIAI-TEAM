// ui.js — UI component functions extracted from the monolith
// Toast notifications, confirm/prompt dialogs, focus trap, button loading,
// form validation, and textarea auto-resize.

// ==================== TOAST NOTIFICATIONS ====================

/** Show a temporary toast notification that auto-dismisses after 4 seconds */
export function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
window.toast = toast;

// Alias: a handful of call-sites (finance 409 conflict, system broadcast,
// attachment confirm/move/download failure) were wired up calling
// `showToast` which was never defined and threw ReferenceError. This
// keeps both names working so no call site is silently broken.
export const showToast = toast;
window.showToast = showToast;

// ==================== THEMED CONFIRMATION DIALOG ====================

// Internal state — module-private closure, not exposed on window
let _confirmResolve = null;

/** Themed replacement for window.confirm(). Returns a Promise<boolean>. */
export function themedConfirm(message, title = 'Confirm', dangerLabel = 'Confirm') {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = dangerLabel;
    const modal = document.getElementById('confirmModal');
    modal.classList.add('open');
    // Focus the cancel button for safety
    modal.querySelector('.btn').focus();
    // Trap focus inside the dialog
    _trapFocus(modal);
  });
}
window.themedConfirm = themedConfirm;

/** Themed replacement for window.prompt(). Returns Promise<string|null>. */
export function themedPrompt(message, defaultValue = '', title = 'Input') {
  return new Promise(resolve => {
    _confirmResolve = (ok) => ok ? (document.getElementById('confirmInput').value || null) : null;
    const realResolve = resolve;
    _confirmResolve = (ok) => {
      const val = ok ? (document.getElementById('confirmInput').value || null) : null;
      realResolve(val);
    };
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = 'OK';
    const input = document.getElementById('confirmInput');
    input.style.display = 'block';
    input.value = defaultValue;
    const modal = document.getElementById('confirmModal');
    modal.classList.add('open');
    _trapFocus(modal);
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}
window.themedPrompt = themedPrompt;

/** Close the confirm modal and resolve the pending promise with the user's choice */
export function _resolveConfirm(result) {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('open');
  _releaseFocusTrap(modal);
  const input = document.getElementById('confirmInput');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
  input.style.display = 'none';
  input.value = '';
}
// Must be on window — confirm dialog buttons call it via data-action="_resolveConfirm"
window._resolveConfirm = _resolveConfirm;

// ==================== FOCUS TRAP (ACCESSIBILITY) ====================

const _focusTrapMap = new WeakMap();

/** Trap keyboard focus inside a modal container (Tab cycling and Escape to close) */
export function _trapFocus(container) {
  const handler = (e) => {
    if (e.key === 'Escape') {
      // Close the modal on Escape
      if (container.id === 'confirmModal') { _resolveConfirm(false); return; }
      if (container.id === 'importModal') { window.closeImportModal(); return; }
      if (container.classList.contains('detail-overlay') || container.id === 'detailPanel') { window.closeDetail(); return; }
      container.classList.remove('open');
      _releaseFocusTrap(container);
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]');
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  _focusTrapMap.set(container, handler);
  container.addEventListener('keydown', handler);
}
window._trapFocus = _trapFocus;

/** Remove the focus trap from a container and clean up the keydown handler */
export function _releaseFocusTrap(container) {
  const handler = _focusTrapMap.get(container);
  if (handler) { container.removeEventListener('keydown', handler); _focusTrapMap.delete(container); }
}
window._releaseFocusTrap = _releaseFocusTrap;

/** Activate focus management on a dynamically inserted modal overlay.
 *  Saves the previously focused element, traps Tab/Escape, and restores focus on close. */
export function _activateDynamicModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const prevFocus = document.activeElement;
  _trapFocus(modal);
  // Patch .remove() to restore focus when the modal is dismissed
  const origRemove = modal.remove.bind(modal);
  modal.remove = function() { _releaseFocusTrap(modal); origRemove(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
  // Focus the first focusable element inside the modal
  const first = modal.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]');
  if (first) setTimeout(() => first.focus(), 50);
}
window._activateDynamicModal = _activateDynamicModal;

// ==================== ASYNC BUTTON HELPER ====================

/** Disable a button during an async operation, show spinner, re-enable on completion. */
export async function withButtonLoading(btn, asyncFn) {
  if (!btn || btn.disabled) return;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span> ' + btn.textContent.trim();
  try { return await asyncFn(); }
  finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}
window.withButtonLoading = withButtonLoading;

// ==================== INLINE FORM VALIDATION ====================

/** Show an inline validation error beneath an input element */
export function showFieldError(input, message) {
  if (!input) return;
  input.classList.add('is-invalid');
  let errEl = input.parentElement.querySelector('.detail-field__error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'detail-field__error';
    input.parentElement.appendChild(errEl);
  }
  errEl.textContent = message;
}
window.showFieldError = showFieldError;

/** Clear all inline validation errors within a container */
export function clearFieldErrors(container) {
  if (!container) return;
  container.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  container.querySelectorAll('.detail-field__error').forEach(el => el.remove());
}
window.clearFieldErrors = clearFieldErrors;

// ==================== TEXTAREA AUTO-RESIZE FALLBACK ====================

/** Auto-resize textareas to fit their content (fallback for browsers without field-sizing: content) */
export function initTextareaAutoResize(container) {
  if (CSS.supports && CSS.supports('field-sizing', 'content')) return;
  (container || document).querySelectorAll('textarea').forEach(ta => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    if (!ta._autoResizeBound) {
      ta.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
      ta._autoResizeBound = true;
    }
  });
}
window.initTextareaAutoResize = initTextareaAutoResize;
