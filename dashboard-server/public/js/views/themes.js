// ==================== THEMES ====================
// Extracted from nbi_project_dashboard.html (lines 15605-15689)

const THEMES = [
  { id: 'dark',      label: 'Dark',      group: 'default', swatches: ['#0a0a0a','#e8e8e8','#0066FF','#2a2a2a'] },
  { id: 'light',     label: 'Light',     group: 'default', swatches: ['#f5f5f7','#1a1a1a','#0055dd','#d1d1d6'] },
  { id: 'midnight',  label: 'Midnight',  group: 'extra',   swatches: ['#0f172a','#e2e8f0','#38bdf8','#2d4a6f'] },
  { id: 'nord',      label: 'Nord',      group: 'extra',   swatches: ['#2e3440','#eceff4','#88c0d0','#4c566a'] },
  { id: 'solarized', label: 'Solarized', group: 'extra',   swatches: ['#002b36','#fdf6e3','#b58900','#1a5c6e'] },
  { id: 'dracula',   label: 'Dracula',   group: 'extra',   swatches: ['#282a36','#f8f8f2','#bd93f9','#44475a'] },
  { id: 'emerald',   label: 'Emerald',   group: 'extra',   swatches: ['#0c1a0f','#e0f0e4','#34d399','#264d33'] },
];
window.THEMES = THEMES;

/** Get the currently active theme name from the HTML element's data attribute */
export function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
window.currentTheme = currentTheme;

/** Render the theme selector dropdown with colour preview dots */
export function renderThemeDropdown() {
  const dd = document.getElementById('themeDropdown');
  if (!dd) return;
  const cur = currentTheme();
  let html = '<div class="theme-picker__label">Standard</div>';
  THEMES.filter(t => t.group === 'default').forEach(t => {
    html += `<div class="theme-picker__item ${cur===t.id?'active':''}" data-action="setTheme" data-arg0="${t.id}">
      <span>${t.label}</span>
      <span class="theme-picker__swatches">${t.swatches.map(c => `<span class="theme-picker__swatch" style="background:${c}"></span>`).join('')}</span>
    </div>`;
  });
  html += '<div class="theme-picker__sep"></div><div class="theme-picker__label">Colour Themes</div>';
  THEMES.filter(t => t.group === 'extra').forEach(t => {
    html += `<div class="theme-picker__item ${cur===t.id?'active':''}" data-action="setTheme" data-arg0="${t.id}">
      <span>${t.label}</span>
      <span class="theme-picker__swatches">${t.swatches.map(c => `<span class="theme-picker__swatch" style="background:${c}"></span>`).join('')}</span>
    </div>`;
  });
  dd.innerHTML = html;
}
window.renderThemeDropdown = renderThemeDropdown;

/** Toggle the theme dropdown open/closed */
export function toggleThemeDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('themeDropdown');
  const isOpen = dd.classList.contains('open');
  // Close all other panels first
  const _np = document.getElementById('notifPanel'); if (_np) _np.style.display = 'none';
  if (isOpen) { dd.classList.remove('open'); }
  else { renderThemeDropdown(); dd.classList.add('open'); }
}
window.toggleThemeDropdown = toggleThemeDropdown;

/** Apply a theme by name and persist the choice to localStorage */
export function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('nbi_dashboard_theme', name);
  document.getElementById('themeDropdown').classList.remove('open');
  renderThemeDropdown();
}
window.setTheme = setTheme;

// Close theme dropdown on outside click
document.addEventListener('click', function(e) {
  const picker = document.getElementById('themePicker');
  if (picker && !picker.contains(e.target)) {
    document.getElementById('themeDropdown').classList.remove('open');
  }
});

// Apply saved theme on load
const saved = localStorage.getItem('nbi_dashboard_theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);
