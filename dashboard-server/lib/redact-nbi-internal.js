// dashboard-server/lib/redact-nbi-internal.js
//
// Strip every `nbiInternalBlock` node from a ProseMirror JSON document.
// Used server-side before sending a doc body to a client portal user so
// the redacted content never leaves the server. Pure, no I/O.

/**
 * Recursively walk a ProseMirror node and remove any nbiInternalBlock
 * children. Containers (bulletList, listItem, etc.) are kept even if
 * their nbi-only child was removed; the server doesn't try to "tidy"
 * empty parents because that can change list numbering.
 *
 * Returns a new top-level object on every call. Per-node attrs and
 * other nested non-content fields are shallow-copied, which is fine
 * for our usage (JSON-serialise then send) but callers must not
 * mutate `attrs` or other deep fields on the returned tree.
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

  // Container nodes (doc, bulletList, orderedList, etc.) join children
  // with newlines, filtering empty strings so we don't produce blank lines
  // for containers that had all content redacted.
  const parts = node.content
    .map(child => _extractNode(child, drop))
    .filter(s => s !== '');
  return parts.join('\n');
}

/**
 * Determine whether a given image filename is reachable by a portal user
 * after NBI-block redaction.
 *
 * Walks the ProseMirror JSON tree looking for image nodes whose `attrs.src`
 * ends with '/<filename>'. When dropNbiInternal is true, any subtree rooted
 * at an nbiInternalBlock is skipped before the search -- matching the same
 * redaction applied to body_json before it is sent to client users.
 *
 * Use endsWith('/' + filename) rather than includes(filename) to avoid false
 * positives where the filename appears as a substring of another attachment
 * name.
 *
 * @param {object|null|undefined} body      ProseMirror doc root
 * @param {string}                filename  Stored filename on disk (no path)
 * @param {{ dropNbiInternal?: boolean }} [opts]
 * @returns {boolean}  true if the image is reachable in the (possibly redacted) tree
 */
function imageInScope(body, filename, opts) {
  if (!body || typeof filename !== 'string' || !filename) return false;
  const drop = opts && opts.dropNbiInternal === true;
  return _imageInScopeNode(body, filename, drop);
}

function _imageInScopeNode(node, filename, drop) {
  if (!node || typeof node !== 'object') return false;

  // When redacting for client users, treat nbiInternalBlock as invisible
  if (drop && node.type === 'nbiInternalBlock') return false;

  // Image node -- check whether its src points to this filename
  if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
    if (node.attrs.src.endsWith('/' + filename)) return true;
  }

  // Recurse into content children
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (_imageInScopeNode(child, filename, drop)) return true;
    }
  }

  return false;
}

/**
 * Walk a ProseMirror body and collect the filename (basename of the src URL)
 * for every image node found anywhere in the tree.
 *
 * This is used by the G1 attachment orphan reconciliation in the PATCH handler:
 * filenames returned here are considered "referenced" and should NOT be orphaned.
 *
 * Intentionally does NOT skip nbiInternalBlock subtrees. Orphan accounting is
 * global -- an image inside an NBI-internal section is still embedded in the
 * document. The nbiInternalBlock skip is only applied when serving content to
 * client portal users (see imageInScope with dropNbiInternal: true).
 *
 * @param {object|null|undefined} body  ProseMirror doc root
 * @returns {Set<string>}  Set of stored filenames (basename only)
 */
function extractImageFilenames(body) {
  const out = new Set();
  _collectImageNames(body, out);
  return out;
}

function _collectImageNames(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
    const name = node.attrs.src.split('/').pop();
    if (name) out.add(name);
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) _collectImageNames(child, out);
  }
}

module.exports = { redactNbiInternal, extractPlainText, imageInScope, extractImageFilenames };
