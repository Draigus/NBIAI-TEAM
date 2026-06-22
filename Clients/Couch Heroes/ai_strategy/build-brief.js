const fs = require('fs');
const { marked } = require('marked');
const path = require('path');

const mdPath = path.join(__dirname, 'CH_AI_Tool_Strategy_v2.md');
const outPath = path.join(__dirname, 'CH_AI_Strategy_Brief.html');

const md = fs.readFileSync(mdPath, 'utf8');

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false,
});

const body = marked.parse(md);

const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Couch Heroes: AI Tool Strategy &amp; Decision Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;450;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ===================================================================
   CH AI TOOL STRATEGY — CONSULTING REPORT STYLESHEET
   NBI Analytics Ltd | Confidential
   =================================================================== */

:root {
  --ink: #0F172A;
  --body: #1E293B;
  --caption: #64748B;
  --rule: #CBD5E1;
  --rule-light: #E2E8F0;
  --bg: #FFFFFF;
  --tint: #F8FAFC;
  --adopt: #047857;
  --adopt-bg: #ECFDF5;
  --pilot: #1D4ED8;
  --pilot-bg: #EFF6FF;
  --watch: #A16207;
  --watch-bg: #FFFBEB;
  --avoid: #B91C1C;
  --avoid-bg: #FEF2F2;
  --link: #1D4ED8;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

body {
  font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 1.0625rem;
  line-height: 1.72;
  color: var(--body);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* === PAGE CONTAINER === */
.report {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 3rem 4rem;
}

/* === HEADINGS === */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
  color: var(--ink);
  line-height: 1.2;
}

h1 {
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  margin: 4rem 0 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 3px solid var(--ink);
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 3.5rem 0 1.25rem;
  padding-top: 2.5rem;
  border-top: 2px solid var(--ink);
}

h3 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 2.5rem 0 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
}

h4 {
  font-size: 1.0625rem;
  font-weight: 700;
  margin: 2rem 0 0.75rem;
  color: var(--ink);
}

h5, h6 {
  font-size: 1rem;
  font-weight: 600;
  margin: 1.5rem 0 0.5rem;
}

/* === BODY TEXT === */
p {
  margin-bottom: 1rem;
  max-width: 780px;
}

strong { color: var(--ink); font-weight: 600; }

a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }

/* === LISTS === */
ul, ol {
  margin: 0.75rem 0 1.25rem 1.5rem;
}

li {
  margin-bottom: 0.375rem;
  max-width: 780px;
}

li > p { margin-bottom: 0.375rem; }

/* === HORIZONTAL RULES (the ━━━ separators) === */
hr {
  border: none;
  border-top: 2px solid var(--ink);
  margin: 3rem 0;
}

/* === TABLES === */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.25rem 0 1.75rem;
  font-size: 0.9375rem;
  line-height: 1.45;
}

thead {
  background: var(--ink);
  color: #fff;
}

th {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.75rem 0.75rem;
  text-align: left;
  white-space: nowrap;
}

td {
  padding: 0.5625rem 0.75rem;
  border-bottom: 1px solid var(--rule-light);
  vertical-align: top;
}

/* Zebra striping */
tbody tr:nth-child(even) td { background: var(--tint); }

/* Numeric columns right-aligned */
td:last-child {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

/* === BOLD LABELS (Company profiles, etc.) === */
p > strong:first-child {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9375rem;
  letter-spacing: -0.005em;
}

/* === CODE / MONOSPACE (composite calculations) === */
code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  background: var(--tint);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  border: 1px solid var(--rule-light);
}

/* Italic lines (composite calcs) */
em {
  font-style: italic;
  font-size: 0.9375rem;
  color: var(--caption);
}

/* === BLOCKQUOTES (used for notes/callouts) === */
blockquote {
  border-left: 4px solid var(--pilot);
  margin: 1.25rem 0;
  padding: 0.75rem 1.25rem;
  background: var(--pilot-bg);
  font-size: 0.9375rem;
}

blockquote p { margin-bottom: 0.5rem; }
blockquote p:last-child { margin-bottom: 0; }

/* === VERDICT HIGHLIGHTING === */
/* Auto-colour verdict text in tables and body */

/* === SECTION DIVIDERS (the ━━━ lines from markdown) === */
/* Markdown converts ━━━ to <hr> which we've already styled */

/* === FIRST ELEMENT STYLING === */
.report > p:first-child {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--ink);
  margin-top: 4rem;
  margin-bottom: 1rem;
}

/* === HEADER AREA === */
.report-header {
  padding: 5rem 0 0;
  margin-bottom: 0;
}

.report-header .brand {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--caption);
  margin-bottom: 3rem;
}

.report-header .meta {
  display: flex;
  gap: 2.5rem;
  flex-wrap: wrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--caption);
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .report { padding: 0 1.5rem 3rem; }
  h1 { font-size: 1.75rem; }
  h2 { font-size: 1.375rem; }
  table { font-size: 0.8125rem; }
  th, td { padding: 0.4375rem 0.5rem; }
  .report-header .meta { flex-direction: column; gap: 0.5rem; }
}

/* === TABLE OVERFLOW === */
@media (max-width: 900px) {
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* === PRINT === */
@media print {
  body { font-size: 10pt; line-height: 1.5; }
  .report { max-width: none; padding: 0 1cm; }
  h1 { font-size: 22pt; margin-top: 2cm; }
  h2 { font-size: 16pt; break-before: auto; padding-top: 1cm; }
  h3 { break-after: avoid; }
  table { font-size: 8pt; break-inside: auto; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; background: var(--ink) !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  a { color: var(--ink); text-decoration: none; }
  a[href]::after { content: none; }
  hr { border-top: 2px solid var(--ink); }
}
</style>
</head>
<body>

<div class="report">
  <div class="report-header">
    <div class="brand">NBI Analytics</div>
  </div>
${body}
</div>

</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log('Built: ' + outPath);
console.log('Size: ' + (html.length / 1024).toFixed(0) + ' KB');
