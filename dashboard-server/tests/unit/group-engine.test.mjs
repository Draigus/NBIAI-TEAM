import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, '../../public/js/nbi-group.js'), 'utf8');
const groupItems = new Function(src + '; return groupItems;')();

describe('groupItems', () => {
  const items = [
    { id: 1, assignee: 'Glen', hours: 4, status: 'Done' },
    { id: 2, assignee: 'Tom', hours: 2, status: 'In progress' },
    { id: 3, assignee: 'Glen', hours: 6, status: 'In progress' },
    { id: 4, assignee: null, hours: 1, status: 'Done' },
  ];

  it('groups by field with counts', () => {
    const groups = groupItems(items, { field: 'assignee' });
    const glen = groups.find(g => g.key === 'Glen');
    expect(glen.items.length).toBe(2);
    expect(glen.stats.count).toBe(2);
  });

  it('puts empty values under emptyLabel', () => {
    const groups = groupItems(items, { field: 'assignee', emptyLabel: 'Unassigned' });
    const empty = groups.find(g => g.label === 'Unassigned');
    expect(empty.items.map(i => i.id)).toEqual([4]);
  });

  it('sorts groups by count-desc', () => {
    const groups = groupItems(items, { field: 'assignee', sort: 'count-desc' });
    expect(groups[0].key).toBe('Glen');
  });

  it('sorts groups alphabetically', () => {
    const groups = groupItems(items, { field: 'assignee', sort: 'alpha', emptyLabel: 'Unassigned' });
    expect(groups.map(g => g.label)).toEqual(['Glen', 'Tom', 'Unassigned']);
  });

  it('computes custom aggregates', () => {
    const groups = groupItems(items, {
      field: 'assignee',
      aggregate: (its) => ({ hours: its.reduce((s, i) => s + i.hours, 0), done: its.filter(i => i.status === 'Done').length })
    });
    const glen = groups.find(g => g.key === 'Glen');
    expect(glen.stats.hours).toBe(10);
    expect(glen.stats.done).toBe(1);
  });

  it('supports a getValue accessor for nested fields', () => {
    const nested = [{ meta: { team: 'A' } }, { meta: { team: 'B' } }, { meta: { team: 'A' } }];
    const groups = groupItems(nested, { getValue: i => i.meta.team, sort: 'count-desc' });
    expect(groups[0].key).toBe('A');
    expect(groups[0].stats.count).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(groupItems([], { field: 'x' })).toEqual([]);
  });
});
