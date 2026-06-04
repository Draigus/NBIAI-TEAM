#!/usr/bin/env node
// Anti-AI-slop linter for generated HTML.
// Extracted from Open Design's lint-artifact.js and adapted as a
// standalone CLI for Claude Code hooks.
//
// Usage:  node anti-slop-linter.js <file.html>
//         cat file.html | node anti-slop-linter.js --stdin
//
// Exit 0 = clean or no findings.  Exit 1 = P0 findings (must fix).
// Outputs structured text for Claude Code hook consumption.

const fs = require('fs');
const path = require('path');

// ── Palettes ─────────────────────────────────────────────────────────

const PURPLE_HEXES = [
  '#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#581c87',
  '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe',
  '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
  '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#eef2ff',
];

const TRUST_GRADIENT_BLUE_HEXES = [
  '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
  '#60a5fa', '#93c5fd', '#bfdbfe',
  '#0ea5e9', '#0284c7', '#0369a1', '#38bdf8', '#7dd3fc',
];

const TRUST_GRADIENT_CYAN_HEXES = [
  '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63',
  '#22d3ee', '#67e8f9', '#a5f3fc',
];

const AI_DEFAULT_INDIGO = [
  '#6366f1', '#4f46e5', '#4338ca', '#3730a3',
  '#8b5cf6', '#7c3aed', '#a855f7',
];

const SLOP_EMOJI = [
  '✨', '🚀', '🎯', '⚡', '🔥', '💡', '📈', '🎨', '🛡️', '🌟',
  '💪', '🎉', '👋', '🙌', '✅', '⭐', '🏆',
];

const INVENTED_METRIC_PATTERNS = [
  /\b10×\s+(faster|better|easier)\b/i,
  /\b100×\s+(faster|better)\b/i,
  /\b99\.\d+%\s+uptime\b/i,
  /\bzero[- ]downtime\b/i,
  /\b3×\s+more\s+(productive|efficient)\b/i,
];

const FILLER_PATTERNS = [
  /\bfeature\s+(one|two|three|1|2|3)\b/i,
  /\blorem\s+ipsum\b/i,
  /\bdolor\s+sit\s+amet\b/i,
  /\bplaceholder\s+text\b/i,
  /\bsample\s+content\b/i,
];

const DISPLAY_SANS_RE = /(?:h1|h2|h3|\.h-?(?:hero|xl|lg|md))[^{}]*\{[^}]*font-family\s*:\s*["']?(?:Inter|Roboto|Arial|-apple-system|system-ui|SF\s+Pro)/i;

// ── Helpers ──────────────────────────────────────────────────────────

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clip(s) {
  if (!s) return '';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}

function detectBlueCyanTrustGradient(html) {
  const re = /linear-gradient\([^)]*\)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const grad = m[0].toLowerCase();
    const hasBlue = TRUST_GRADIENT_BLUE_HEXES.some(h => grad.includes(h.toLowerCase())) ||
      /\bblue\b/.test(grad);
    const hasCyan = TRUST_GRADIENT_CYAN_HEXES.some(h => grad.includes(h.toLowerCase())) ||
      /\bcyan\b/.test(grad);
    if (hasBlue && hasCyan) return m[0];
  }
  return null;
}

function stripTokenBlocks(input) {
  return input.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open, css, close) => {
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const stripped = cleaned.replace(/([^{}]*)\{([^{}]*)\}/g, (full, selector, body) => {
      const sel = (selector || '').trim();
      const parts = sel.split(',').map(s => s.trim()).filter(Boolean);
      const isGlobalScope = parts.length > 0 && parts.every(s =>
        /^(?::root|html|body)(?:\[(data-theme|data-color-scheme|data-mode)(?:[*^$|~]?=[^\]]*)?\])?$/.test(s) ||
        /^\[(data-theme|data-color-scheme|data-mode)(?:[*^$|~]?=[^\]]*)?\]$/.test(s)
      );
      if (!isGlobalScope) return full;
      const decls = (body || '').split(';').map(d => d.trim()).filter(Boolean);
      if (decls.length === 0) return full;
      const tokenShaped = decls.every(d => /^--[\w-]+\s*:/.test(d) || /^color-scheme\s*:/i.test(d));
      if (!tokenShaped) return full;
      const laundersIndigo = decls.some(d => {
        const dm = /^(--[\w-]+)\s*:\s*(.+)$/.exec(d);
        if (!dm) return false;
        if (dm[1].toLowerCase() === '--accent') return false;
        const val = dm[2].toLowerCase();
        return AI_DEFAULT_INDIGO.some(h => val.includes(h.toLowerCase()));
      });
      if (laundersIndigo) return full;
      return '';
    });
    return `${open}${stripped}${close}`;
  });
}

// ── Core linter ──────────────────────────────────────────────────────

function lintArtifact(rawHtml) {
  const out = [];
  if (typeof rawHtml !== 'string' || rawHtml.length === 0) return out;

  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '');

  // P0-1: purple gradient backgrounds
  let hasPurpleGradient = false;
  for (const hex of PURPLE_HEXES) {
    const re = new RegExp(`linear-gradient\\([^)]*${escapeRe(hex)}[^)]*\\)`, 'i');
    const m = re.exec(html);
    if (m) {
      out.push({ severity: 'P0', id: 'purple-gradient', message: `Violet/purple gradient using ${hex}`, fix: 'Replace with flat surface (var(--bg)) or single accent intensity, not a gradient.', snippet: clip(m[0]) });
      hasPurpleGradient = true;
      break;
    }
  }
  if (!hasPurpleGradient) {
    const m = /linear-gradient\([^)]*\b(purple|violet)\b[^)]*\)/i.exec(html);
    if (m) {
      out.push({ severity: 'P0', id: 'purple-gradient', message: `"${m[1]}" keyword inside a gradient`, fix: 'Remove gradient or swap to solid colour from design tokens.', snippet: clip(m[0]) });
      hasPurpleGradient = true;
    }
  }

  // P0-1c: blue-cyan trust gradient
  if (!hasPurpleGradient) {
    const tg = detectBlueCyanTrustGradient(html);
    if (tg) {
      out.push({ severity: 'P0', id: 'trust-gradient', message: 'Blue-to-cyan two-stop "trust" gradient', fix: 'Replace with flat surface or single design-token colour. Two-stop blue-cyan is a SaaS hero cliche.', snippet: clip(tg) });
    }
  }

  // P0-1b: solid AI-default indigo as accent
  if (!hasPurpleGradient) {
    const htmlForIndigo = stripTokenBlocks(html);
    for (const hex of AI_DEFAULT_INDIGO) {
      const re = new RegExp(escapeRe(hex), 'i');
      const m = re.exec(htmlForIndigo);
      if (m) {
        out.push({ severity: 'P0', id: 'ai-default-indigo', message: `Default LLM accent colour (${hex}) — most-reported AI design tell`, fix: 'Replace with var(--accent) from design system. If indigo is intentional, encode it as the design system accent.', snippet: clip(m[0]) });
        break;
      }
    }
  }

  // P0-2: emoji used as feature/UI icons
  for (const e of SLOP_EMOJI) {
    if (html.includes(e)) {
      const re = new RegExp(`<(?:h[1-6]|button|li|span class="[^"]*icon[^"]*")[^>]*>[^<]*${escapeRe(e)}`, 'i');
      const m = re.exec(html);
      if (m) {
        out.push({ severity: 'P0', id: 'emoji-icon', message: `Emoji "${e}" used as UI icon`, fix: 'Replace with small inline SVG icon (1.6-1.8px stroke, currentColor) or remove.', snippet: clip(m[0]) });
        break;
      }
    }
  }

  // P0-3: rounded card with left-border accent
  const leftAccentRe = /\.[a-z-]+\s*\{[^}]*border-left\s*:\s*\d+px\s+solid\s+[^;]+;[^}]*border-radius\s*:\s*[1-9]/i;
  const lam = leftAccentRe.exec(html);
  if (lam) {
    out.push({ severity: 'P0', id: 'left-accent-card', message: 'Rounded card with coloured left border — canonical AI-slop card pattern', fix: 'Drop either the border-radius (0px) or the border-left. Use hairline borders all-round.', snippet: clip(lam[0]) });
  }

  // P0-4: sans-serif display face
  const dm = DISPLAY_SANS_RE.exec(html);
  if (dm) {
    out.push({ severity: 'P0', id: 'sans-display', message: 'Heading uses Inter/Roboto/system-sans as display face', fix: 'Use font-family: var(--font-display) and let the design system pick the serif.', snippet: clip(dm[0]) });
  }

  // P0-5: invented metric phrasing
  for (const re of INVENTED_METRIC_PATTERNS) {
    const m = re.exec(html);
    if (m) {
      out.push({ severity: 'P0', id: 'invented-metric', message: `Suspected invented metric: "${m[0]}"`, fix: 'Remove the claim or replace with a labelled stub until real numbers are supplied.', snippet: clip(m[0]) });
      break;
    }
  }

  // P0-6: filler / lorem text
  for (const re of FILLER_PATTERNS) {
    const m = re.exec(html);
    if (m) {
      out.push({ severity: 'P0', id: 'filler-copy', message: `Filler copy: "${m[0]}"`, fix: 'Replace with brief-derived copy or delete the section entirely.', snippet: clip(m[0]) });
      break;
    }
  }

  // P0-7: scrollIntoView (breaks iframe preview)
  if (/\.scrollIntoView\s*\(/.test(html)) {
    out.push({ severity: 'P0', id: 'scroll-into-view', message: 'scrollIntoView() detected — breaks embedded previews', fix: 'Use scrollTo({ left, top, behavior: "smooth" }) on the actual scroller.' });
  }

  // P1-1: external placeholder image URLs
  const extImg = /<img[^>]+src=["']https?:\/\/(?:images\.unsplash\.com|placehold\.co|placekitten\.com|via\.placeholder\.com|picsum\.photos|loremflickr\.com)/i.exec(html);
  if (extImg) {
    out.push({ severity: 'P1', id: 'external-image', message: 'External placeholder image CDN — fragile, looks fake when it 404s', fix: 'Use local placeholder class or inline SVG instead.', snippet: clip(extImg[0]) });
  }

  // P1-2: raw hex outside :root
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/i;
  const styleMatch = styleRe.exec(html);
  if (styleMatch) {
    const css = styleMatch[1] || '';
    const cssWithoutRoot = css.replace(/:root\s*\{[^}]*\}/g, '');
    const hexes = cssWithoutRoot.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    if (hexes.length > 12) {
      out.push({ severity: 'P1', id: 'raw-hex', message: `${hexes.length} raw hex values outside :root — design tokens probably not honoured`, fix: 'Move colours into :root token block and reference via var().', snippet: hexes.slice(0, 6).join(' ') });
    }
  }

  // P1-3: accent overuse in body
  const styleStripped = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  const accentUses = (styleStripped.match(/var\(--accent\)/g) || []).length;
  if (accentUses > 6) {
    out.push({ severity: 'P1', id: 'accent-overuse', message: `var(--accent) used ${accentUses} times inline in body — likely overused`, fix: 'Cap at 2 visible uses per screen (one eyebrow + one CTA). Demote rest to var(--fg) or var(--muted).' });
  }

  // P1-4: uppercase without letter-spacing
  for (const styleBlock of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = (styleBlock[1] || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const upperRe = /([^{}]*)\{([^{}]*text-transform\s*:\s*uppercase[^{}]*)\}/gi;
    let m;
    while ((m = upperRe.exec(css)) !== null) {
      const selector = (m[1] || '').trim();
      const body = m[2] || '';
      if (!/letter-spacing/i.test(body)) {
        out.push({ severity: 'P1', id: 'all-caps-no-tracking', message: `"${selector.slice(0, 60)}" sets uppercase without letter-spacing`, fix: 'Add letter-spacing: 0.08em. ALL CAPS without tracking looks cramped.', snippet: clip(`${selector} { ${body.trim()} }`) });
        break;
      }
    }
  }

  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────

function formatFindings(findings, filePath) {
  if (findings.length === 0) return '';

  const p0 = findings.filter(f => f.severity === 'P0');
  const p1 = findings.filter(f => f.severity === 'P1');

  const lines = [
    `ANTI-SLOP LINT: ${filePath}`,
    `${p0.length} P0 (must fix), ${p1.length} P1 (should fix)`,
    '',
  ];

  const sorted = [...findings].sort((a, b) => {
    const sv = s => s === 'P0' ? 0 : s === 'P1' ? 1 : 2;
    return sv(a.severity) - sv(b.severity);
  });

  for (const f of sorted) {
    lines.push(`[${f.severity}] ${f.id}: ${f.message}`);
    lines.push(`  Fix: ${f.fix}`);
    if (f.snippet) lines.push(`  Snippet: ${f.snippet}`);
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);

  let html;
  let filePath;

  if (args.includes('--stdin')) {
    html = fs.readFileSync(0, 'utf8');
    filePath = '<stdin>';
  } else if (args.length > 0) {
    filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`File not found: ${filePath}\n`);
      process.exit(2);
    }
    html = fs.readFileSync(filePath, 'utf8');
  } else {
    process.stderr.write('Usage: anti-slop-linter.js <file.html> | --stdin\n');
    process.exit(2);
  }

  const findings = lintArtifact(html);
  const output = formatFindings(findings, filePath);

  if (output) {
    process.stdout.write(output);
  }

  const hasP0 = findings.some(f => f.severity === 'P0');
  process.exit(hasP0 ? 1 : 0);
}

main();
