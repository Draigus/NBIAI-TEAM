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
