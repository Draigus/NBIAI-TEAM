// dashboard-server/tests/unit/attachment-sweep.test.mjs
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { pickFilesToDelete, ORPHAN_GRACE_MS } = require('../../lib/attachment-sweep');

describe('pickFilesToDelete', () => {
  const NOW = new Date('2026-05-03T12:00:00.000Z');

  function att(id, orphaned_at) {
    return { id, stored_name: `file_${id}.png`, orphaned_at };
  }

  // Empty list returns empty array
  it('returns [] for an empty attachments list', () => {
    expect(pickFilesToDelete(NOW, [])).toEqual([]);
  });

  // All within grace window (orphaned 1 hour ago)
  it('returns [] when all attachments are within the grace window', () => {
    const recentOrphan = new Date(NOW.getTime() - 60 * 60 * 1000); // 1h ago
    expect(pickFilesToDelete(NOW, [att('a1', recentOrphan)])).toEqual([]);
  });

  // Just past the boundary (orphaned 25 hours ago)
  it('returns the row when orphaned_at is 25 hours ago', () => {
    const old = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);
    const result = pickFilesToDelete(NOW, [att('a2', old)]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a2');
    expect(result[0].stored_name).toBe('file_a2.png');
  });

  // Mix: one inside grace window, one outside
  it('returns only the row outside the grace window in a mixed list', () => {
    const recent = new Date(NOW.getTime() - 60 * 60 * 1000);     // 1h ago
    const old    = new Date(NOW.getTime() - 25 * 60 * 60 * 1000); // 25h ago
    const result = pickFilesToDelete(NOW, [att('b1', recent), att('b2', old)]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b2');
  });

  // orphaned_at null is never returned
  it('never returns a row with orphaned_at = null', () => {
    expect(pickFilesToDelete(NOW, [att('c1', null)])).toEqual([]);
  });

  // Grace boundary exactness: exactly 24h ago is NOT returned (< not <=)
  it('does not return a row orphaned exactly 24 hours ago (boundary is exclusive)', () => {
    const exactly24h = new Date(NOW.getTime() - ORPHAN_GRACE_MS);
    expect(pickFilesToDelete(NOW, [att('d1', exactly24h)])).toEqual([]);
  });

  // One millisecond past the boundary IS returned
  it('returns a row orphaned 24 hours and 1ms ago', () => {
    const justOver = new Date(NOW.getTime() - ORPHAN_GRACE_MS - 1);
    const result = pickFilesToDelete(NOW, [att('d2', justOver)]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d2');
  });

  // Non-Date now throws TypeError
  it('throws TypeError when now is not a Date', () => {
    expect(() => pickFilesToDelete('2026-05-03', [])).toThrow(TypeError);
    expect(() => pickFilesToDelete(null, [])).toThrow(TypeError);
    expect(() => pickFilesToDelete(Date.now(), [])).toThrow(TypeError);
  });

  // Non-array attachments returns []
  it('returns [] when attachments is not an array', () => {
    expect(pickFilesToDelete(NOW, null)).toEqual([]);
    expect(pickFilesToDelete(NOW, undefined)).toEqual([]);
    expect(pickFilesToDelete(NOW, {})).toEqual([]);
  });

  // orphaned_at as a non-Date value in the object (e.g. string) is ignored
  it('ignores rows where orphaned_at is a string rather than a Date', () => {
    const row = { id: 'e1', stored_name: 'e1.png', orphaned_at: '2020-01-01T00:00:00Z' };
    expect(pickFilesToDelete(NOW, [row])).toEqual([]);
  });
});
