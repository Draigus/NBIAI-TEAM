// dashboard-server/tests/unit/hierarchy-helpers.test.mjs
//
// Tests for the item type hierarchy constants and active-level helpers
// in lib/helpers.js. Covers canonical order, descendant validation,
// type inference, and per-client configurable depth.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  ITEM_TYPES,
  CANONICAL_ORDER,
  VALID_CHILD_TYPE,
  VALID_PARENT_TYPE,
  getCanonicalIndex,
  isDescendantOrder,
  inferItemType,
  getActiveLevels,
  getActiveChildType,
  getActiveParentType,
} = require('../../lib/helpers.js');

describe('ITEM_TYPES and CANONICAL_ORDER', () => {
  it('CANONICAL_ORDER includes initiative as first type', () => {
    expect(CANONICAL_ORDER[0]).toBe('initiative');
  });

  it('CANONICAL_ORDER equals the full 5-level hierarchy', () => {
    expect(CANONICAL_ORDER).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });

  it('ITEM_TYPES is the same reference as CANONICAL_ORDER', () => {
    expect(ITEM_TYPES).toBe(CANONICAL_ORDER);
  });
});

describe('VALID_CHILD_TYPE / VALID_PARENT_TYPE', () => {
  it('initiative child is project', () => {
    expect(VALID_CHILD_TYPE.initiative).toBe('project');
  });

  it('project parent is initiative', () => {
    expect(VALID_PARENT_TYPE.project).toBe('initiative');
  });

  it('initiative parent is null (top of hierarchy)', () => {
    expect(VALID_PARENT_TYPE.initiative).toBeNull();
  });

  it('task child is null (bottom of hierarchy)', () => {
    expect(VALID_CHILD_TYPE.task).toBeNull();
  });
});

describe('getCanonicalIndex', () => {
  it('returns 0 for initiative', () => {
    expect(getCanonicalIndex('initiative')).toBe(0);
  });

  it('returns 1 for project', () => {
    expect(getCanonicalIndex('project')).toBe(1);
  });

  it('returns 4 for task', () => {
    expect(getCanonicalIndex('task')).toBe(4);
  });

  it('returns -1 for unknown type', () => {
    expect(getCanonicalIndex('epic')).toBe(-1);
  });
});

describe('isDescendantOrder', () => {
  it('returns true when parent is higher than child', () => {
    expect(isDescendantOrder('initiative', 'project')).toBe(true);
    expect(isDescendantOrder('project', 'task')).toBe(true);
    expect(isDescendantOrder('initiative', 'task')).toBe(true);
  });

  it('returns false when types are equal', () => {
    expect(isDescendantOrder('project', 'project')).toBe(false);
  });

  it('returns false when parent is lower than child (reversed)', () => {
    expect(isDescendantOrder('task', 'project')).toBe(false);
    expect(isDescendantOrder('story', 'initiative')).toBe(false);
  });

  it('returns false for unknown types', () => {
    expect(isDescendantOrder('epic', 'project')).toBe(false);
    expect(isDescendantOrder('project', 'epic')).toBe(false);
    expect(isDescendantOrder('epic', 'bogus')).toBe(false);
  });
});

describe('inferItemType', () => {
  it('returns initiative for null parent', () => {
    expect(inferItemType(null)).toBe('initiative');
  });

  it('returns initiative for undefined parent', () => {
    expect(inferItemType(undefined)).toBe('initiative');
  });

  it('returns project for initiative parent', () => {
    expect(inferItemType('initiative')).toBe('project');
  });

  it('returns feature for project parent', () => {
    expect(inferItemType('project')).toBe('feature');
  });

  it('returns task as fallback for unknown parent type', () => {
    expect(inferItemType('epic')).toBe('task');
  });
});

describe('getActiveLevels', () => {
  it('returns client.hierarchy_levels when present', () => {
    const client = { hierarchy_levels: ['project', 'feature', 'task'] };
    expect(getActiveLevels(client)).toEqual(['project', 'feature', 'task']);
  });

  it('returns full canonical order when client is null', () => {
    expect(getActiveLevels(null)).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });

  it('returns full canonical order when client has no hierarchy_levels', () => {
    expect(getActiveLevels({ name: 'Acme' })).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });

  it('returns full canonical order when hierarchy_levels is empty array', () => {
    expect(getActiveLevels({ hierarchy_levels: [] })).toEqual(['initiative', 'project', 'feature', 'story', 'task']);
  });

  it('returns a copy, not a reference to CANONICAL_ORDER', () => {
    const levels = getActiveLevels(null);
    levels.push('bogus');
    expect(CANONICAL_ORDER).toHaveLength(5);
  });
});

describe('getActiveChildType', () => {
  const fullLevels = ['initiative', 'project', 'feature', 'story', 'task'];

  it('returns the next level in full hierarchy', () => {
    expect(getActiveChildType('initiative', fullLevels)).toBe('project');
    expect(getActiveChildType('story', fullLevels)).toBe('task');
  });

  it('returns null at the bottom of the hierarchy', () => {
    expect(getActiveChildType('task', fullLevels)).toBeNull();
  });

  it('skips inactive levels', () => {
    const sparse = ['initiative', 'project', 'task'];
    expect(getActiveChildType('project', sparse)).toBe('task');
  });

  it('returns null for unknown type', () => {
    expect(getActiveChildType('epic', fullLevels)).toBeNull();
  });
});

describe('getActiveParentType', () => {
  const fullLevels = ['initiative', 'project', 'feature', 'story', 'task'];

  it('returns the next level above in full hierarchy', () => {
    expect(getActiveParentType('project', fullLevels)).toBe('initiative');
    expect(getActiveParentType('task', fullLevels)).toBe('story');
  });

  it('returns null at the top of the hierarchy', () => {
    expect(getActiveParentType('initiative', fullLevels)).toBeNull();
  });

  it('skips inactive levels', () => {
    const sparse = ['initiative', 'project', 'task'];
    expect(getActiveParentType('task', sparse)).toBe('project');
  });

  it('returns null for unknown type', () => {
    expect(getActiveParentType('epic', fullLevels)).toBeNull();
  });
});
