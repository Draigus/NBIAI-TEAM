// dashboard-server/tests/unit/redact-nbi-internal.test.mjs
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { redactNbiInternal, extractPlainText } = require('../../lib/redact-nbi-internal');

describe('redactNbiInternal', () => {
  it('returns the doc unchanged when no nbiInternalBlock nodes exist', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }
    ]};
    expect(redactNbiInternal(doc)).toEqual(doc);
  });

  it('drops a top-level nbiInternalBlock entirely (no placeholder)', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'visible' }] },
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'SECRET' }] }
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: 'after' }] }
    ]};
    const out = redactNbiInternal(doc);
    expect(out.content).toHaveLength(2);
    expect(out.content[0].content[0].text).toBe('visible');
    expect(out.content[1].content[0].text).toBe('after');
    expect(JSON.stringify(out)).not.toContain('SECRET');
  });

  it('drops nested nbiInternalBlock nodes anywhere in the tree', () => {
    const doc = { type: 'doc', content: [
      { type: 'bulletList', content: [
        { type: 'listItem', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'public' }] }
        ]},
        { type: 'listItem', content: [
          { type: 'nbiInternalBlock', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'PRIVATE' }] }
          ]}
        ]}
      ]}
    ]};
    const out = redactNbiInternal(doc);
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    // The list item that contained only the redacted block becomes empty;
    // we keep it so list numbering is preserved (mirrors how Confluence
    // handles redacted blocks).
    expect(out.content[0].content).toHaveLength(2);
    expect(out.content[0].content[1].content).toEqual([]);
  });

  it('returns null for null/undefined input without throwing', () => {
    expect(redactNbiInternal(null)).toBeNull();
    expect(redactNbiInternal(undefined)).toBeUndefined();
  });

  it('does not mutate the input doc', () => {
    const doc = { type: 'doc', content: [
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'x' }] }
      ]}
    ]};
    const before = JSON.stringify(doc);
    redactNbiInternal(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe('extractPlainText', () => {
  it('returns empty string for an empty doc', () => {
    const doc = { type: 'doc', content: [] };
    expect(extractPlainText(doc)).toBe('');
  });

  it('returns empty string for null input without throwing', () => {
    expect(extractPlainText(null)).toBe('');
    expect(extractPlainText(undefined)).toBe('');
  });

  it('extracts text from a single paragraph', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }
    ]};
    expect(extractPlainText(doc)).toBe('hello world');
  });

  it('joins two paragraphs with a newline', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'second' }] }
    ]};
    expect(extractPlainText(doc)).toBe('first\nsecond');
  });

  it('handles heading + paragraph + bullet list', () => {
    const doc = { type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Body text' }] },
      { type: 'bulletList', content: [
        { type: 'listItem', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'item one' }] }
        ]},
        { type: 'listItem', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'item two' }] }
        ]}
      ]}
    ]};
    const result = extractPlainText(doc);
    expect(result).toContain('Title');
    expect(result).toContain('Body text');
    expect(result).toContain('item one');
    expect(result).toContain('item two');
    // blocks separated by newlines
    expect(result.split('\n').length).toBeGreaterThan(2);
  });

  it('includes nbiInternalBlock content by default', () => {
    const doc = { type: 'doc', content: [
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'SECRET' }] }
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: 'public' }] }
    ]};
    const result = extractPlainText(doc, {});
    expect(result).toContain('SECRET');
    expect(result).toContain('public');
  });

  it('excludes nbiInternalBlock content when dropNbiInternal is true', () => {
    const doc = { type: 'doc', content: [
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'SECRET' }] }
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: 'public' }] }
    ]};
    const result = extractPlainText(doc, { dropNbiInternal: true });
    expect(result).not.toContain('SECRET');
    expect(result).toContain('public');
  });

  it('does not mutate the input doc', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }
    ]};
    const before = JSON.stringify(doc);
    extractPlainText(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// extractImageFilenames -- G1 lib tests
// ---------------------------------------------------------------------------

describe('extractImageFilenames', () => {
  const { extractImageFilenames } = require('../../lib/redact-nbi-internal');

  // Empty / null body returns empty Set
  it('returns an empty Set for null input', () => {
    expect(extractImageFilenames(null).size).toBe(0);
  });

  it('returns an empty Set for undefined input', () => {
    expect(extractImageFilenames(undefined).size).toBe(0);
  });

  it('returns an empty Set for a doc with no image nodes', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }
    ]};
    expect(extractImageFilenames(doc).size).toBe(0);
  });

  // Single image
  it('returns a Set containing the filename of a single image', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'image', attrs: { src: '/api/documents/abc/attachments/photo.jpg' } }
      ]}
    ]};
    const names = extractImageFilenames(doc);
    expect(names.size).toBe(1);
    expect(names.has('photo.jpg')).toBe(true);
  });

  // Multiple images, including duplicates: Set deduplicates
  it('returns unique filenames when the same image appears twice', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'image', attrs: { src: '/api/documents/abc/attachments/photo.jpg' } }
      ]},
      { type: 'paragraph', content: [
        { type: 'image', attrs: { src: '/api/documents/abc/attachments/photo.jpg' } },
        { type: 'image', attrs: { src: '/api/documents/abc/attachments/other.png' } }
      ]}
    ]};
    const names = extractImageFilenames(doc);
    expect(names.size).toBe(2);
    expect(names.has('photo.jpg')).toBe(true);
    expect(names.has('other.png')).toBe(true);
  });

  // Image inside an nbiInternalBlock IS included (orphan accounting is global)
  it('includes images inside nbiInternalBlock (not skipped for orphan accounting)', () => {
    const doc = { type: 'doc', content: [
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [
          { type: 'image', attrs: { src: '/api/documents/abc/attachments/secret.png' } }
        ]}
      ]}
    ]};
    const names = extractImageFilenames(doc);
    expect(names.size).toBe(1);
    expect(names.has('secret.png')).toBe(true);
  });

  // Deeply nested image is found
  it('finds an image deeply nested inside listItem > blockquote', () => {
    const doc = { type: 'doc', content: [
      { type: 'bulletList', content: [
        { type: 'listItem', content: [
          { type: 'blockquote', content: [
            { type: 'paragraph', content: [
              { type: 'image', attrs: { src: '/api/documents/abc/attachments/deep.png' } }
            ]}
          ]}
        ]}
      ]}
    ]};
    const names = extractImageFilenames(doc);
    expect(names.size).toBe(1);
    expect(names.has('deep.png')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// imageInScope -- H1 lib tests
// ---------------------------------------------------------------------------

describe('imageInScope', () => {
  const { imageInScope } = require('../../lib/redact-nbi-internal');

  // Helpers: build minimal ProseMirror bodies
  function paraWithImage(src) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'image', attrs: { src } }]
        }
      ]
    };
  }

  function nbiBlockWithImage(src) {
    return {
      type: 'doc',
      content: [
        {
          type: 'nbiInternalBlock',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'image', attrs: { src } }]
            }
          ]
        }
      ]
    };
  }

  const BASE = '/api/documents/abc/attachments/';

  // H1-Lib-1: image in a regular paragraph is in scope
  it('returns true when image is in a paragraph (dropNbiInternal: true)', () => {
    const body = paraWithImage(BASE + 'foo.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: true })).toBe(true);
  });

  // H1-Lib-2: image only inside nbiInternalBlock is out of scope when dropping
  it('returns false when image is only inside nbiInternalBlock (dropNbiInternal: true)', () => {
    const body = nbiBlockWithImage(BASE + 'foo.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: true })).toBe(false);
  });

  // H1-Lib-3: same nbiInternalBlock body is in scope when NOT dropping
  it('returns true when image is inside nbiInternalBlock (dropNbiInternal: false)', () => {
    const body = nbiBlockWithImage(BASE + 'foo.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: false })).toBe(true);
  });

  // H1-Lib-4: filename that does not appear anywhere returns false
  it('returns false when filename does not appear in the body', () => {
    const body = paraWithImage(BASE + 'other.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: true })).toBe(false);
  });

  // H1-Lib-5: deeply nested image (inside listItem > blockquote) is found
  it('returns true for a deeply nested image (listItem > blockquote)', () => {
    const body = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'blockquote',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'image', attrs: { src: BASE + 'deep.png' } }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    expect(imageInScope(body, 'deep.png', { dropNbiInternal: true })).toBe(true);
  });
});
