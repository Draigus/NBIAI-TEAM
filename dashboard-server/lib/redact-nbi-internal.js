// dashboard-server/lib/redact-nbi-internal.js
//
// Strip every `nbiInternalBlock` node from a ProseMirror JSON document.
// Used server-side before sending a doc body to a client portal user so
// the redacted content never leaves the server. Pure, no I/O.

/**
 * Recursively walk a ProseMirror node and remove any nbiInternalBlock
 * children. Containers (bulletList, listItem, etc.) are kept even if
 * their nbi-only child was removed — the server doesn't try to "tidy"
 * empty parents because that can change list numbering.
 *
 * Returns a NEW object — input is never mutated.
 *
 * @param {object|null|undefined} node
 * @returns {object|null|undefined}
 */
function redactNbiInternal(node) {
  if (node == null) return node;
  if (!Array.isArray(node.content)) return { ...node };
  const filtered = node.content
    .filter(child => child && child.type !== 'nbiInternalBlock')
    .map(child => redactNbiInternal(child));
  return { ...node, content: filtered };
}

// Block-level node types that get a newline separator in the flat output.
const BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'
]);

/**
 * Walk a ProseMirror node and return its content as a plain string.
 *
 * Block nodes are separated by '\n'. Inline text nodes are concatenated
 * directly. Each block's text is trimmed and internal whitespace runs
 * are collapsed to a single space.
 *
 * opts.dropNbiInternal === true  → skip nbiInternalBlock subtrees entirely.
 * Default (false) keeps them, so write-time indexing captures all content.
 *
 * Returns '' for null/undefined/missing-content nodes. Never mutates input.
 *
 * @param {object|null|undefined} node
 * @param {{ dropNbiInternal?: boolean }} [opts]
 * @returns {string}
 */
function extractPlainText(node, opts) {
  if (node == null) return '';
  const drop = opts && opts.dropNbiInternal === true;
  return _extractNode(node, drop).trim();
}

function _extractNode(node, drop) {
  if (!node || typeof node !== 'object') return '';

  // Optionally skip NBI-internal subtrees
  if (drop && node.type === 'nbiInternalBlock') return '';

  // Leaf text node
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  if (!Array.isArray(node.content) || node.content.length === 0) return '';

  if (BLOCK_TYPES.has(node.type)) {
    // Collect the inline content of this block, then trim + collapse spaces
    const inner = node.content
      .map(child => _extractNode(child, drop))
      .join('');
    return inner.trim().replace(/\s+/g, ' ');
  }

  // Container nodes (doc, bulletList, orderedList, etc.) — join children
  // with newlines, filtering empty strings so we don't produce blank lines
  // for containers that had all content redacted.
  const parts = node.content
    .map(child => _extractNode(child, drop))
    .filter(s => s !== '');
  return parts.join('\n');
}

module.exports = { redactNbiInternal, extractPlainText };
