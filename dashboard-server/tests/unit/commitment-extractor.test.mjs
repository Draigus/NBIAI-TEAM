import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { extractCommitments, extractDecisions, extractActionItems, buildIdempotencyKey, parseRelativeDate } = require('../../lib/commitment-extractor');

describe('parseRelativeDate', () => {
  it('parses "by Friday" from a known Tuesday', () => {
    const result = parseRelativeDate('send it by Friday', '2026-06-30');
    expect(result).toBe('2026-07-03');
  });

  it('parses "tomorrow"', () => {
    const result = parseRelativeDate('do it tomorrow', '2026-06-30');
    expect(result).toBe('2026-07-01');
  });

  it('parses "end of week"', () => {
    const result = parseRelativeDate('finish by end of week', '2026-06-30');
    expect(result).toBe('2026-07-03');
  });

  it('returns null for no date reference', () => {
    const result = parseRelativeDate('send the proposal', '2026-06-30');
    expect(result).toBeNull();
  });

  it('handles null input gracefully', () => {
    expect(parseRelativeDate(null, '2026-06-30')).toBeNull();
  });

  it('handles undefined referenceDate gracefully', () => {
    expect(parseRelativeDate('by Friday', undefined)).toBeNull();
  });
});

describe('extractCommitments', () => {
  it('extracts "X will send Y by Friday" with correct owner case', () => {
    const text = 'Glen will send the proposal by Friday.';
    const results = extractCommitments(text, { meetingId: 'm1', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe('Glen');
    expect(results[0].commitment).toContain('send the proposal');
    expect(results[0].confidence).toBe('high');
  });

  it('extracts contractions', () => {
    const text = "I'll get the budget numbers to you by end of week.";
    const results = extractCommitments(text, { meetingId: 'm2', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe('high');
  });

  it('marks "we should probably" as low confidence', () => {
    const text = 'We should probably look at the analytics dashboard sometime.';
    const results = extractCommitments(text, { meetingId: 'm3', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe('low');
  });

  it('marks "we need to" as medium confidence', () => {
    const text = 'We need to review the SOW before next week.';
    const results = extractCommitments(text, { meetingId: 'm4', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe('medium');
  });

  it('returns empty for text with no commitments', () => {
    const text = 'The meeting discussed general progress and team morale.';
    const results = extractCommitments(text, { meetingId: 'm5', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(0);
  });

  it('does not produce duplicates from overlapping patterns', () => {
    const text = "Glen said he will send the proposal by Friday.";
    const results = extractCommitments(text, { meetingId: 'm6', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(1);
  });

  it('handles null text gracefully', () => {
    const results = extractCommitments(null, { meetingId: 'm7', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(0);
  });

  it('handles empty string', () => {
    const results = extractCommitments('', { meetingId: 'm8', meetingDate: '2026-06-30' });
    expect(results).toHaveLength(0);
  });

  it('handles undefined context', () => {
    const results = extractCommitments('Glen will send the report.', undefined);
    expect(results).toHaveLength(1);
  });

  it('caps sourceQuote length', () => {
    const longAction = 'Glen will ' + 'review the extremely detailed '.repeat(30) + 'document.';
    const results = extractCommitments(longAction, { meetingId: 'm9', meetingDate: '2026-06-30' });
    if (results.length > 0) {
      expect(results[0].sourceQuote.length).toBeLessThanOrEqual(500);
    }
  });
});

describe('extractDecisions', () => {
  it('extracts "decided to" pattern', () => {
    const results = extractDecisions('The team decided to postpone the launch to Q3.');
    expect(results).toHaveLength(1);
    expect(results[0]).toContain('postpone the launch');
  });

  it('extracts "agreed that" pattern', () => {
    const results = extractDecisions('We agreed that pricing should stay at current levels.');
    expect(results).toHaveLength(1);
  });

  it('handles null input', () => {
    expect(extractDecisions(null)).toHaveLength(0);
  });
});

describe('extractActionItems', () => {
  it('extracts bullet-pointed action items with "to" verb', () => {
    const text = '### Action items\n- Glen to review the SOW\n- Lorenza to schedule interviews\n- General discussion notes';
    const results = extractActionItems(text);
    expect(results).toHaveLength(2);
  });

  it('extracts "action:" prefix', () => {
    const results = extractActionItems('Action: Glen to prepare the Q3 forecast by next Monday.');
    expect(results).toHaveLength(1);
  });

  it('handles null input', () => {
    expect(extractActionItems(null)).toHaveLength(0);
  });
});

describe('buildIdempotencyKey', () => {
  it('produces deterministic key', () => {
    const key1 = buildIdempotencyKey('m-123', 'send the proposal');
    const key2 = buildIdempotencyKey('m-123', 'send the proposal');
    expect(key1).toBe(key2);
  });

  it('different inputs produce different keys', () => {
    expect(buildIdempotencyKey('m-1', 'send')).not.toBe(buildIdempotencyKey('m-1', 'review'));
  });

  it('key starts with granola: prefix', () => {
    expect(buildIdempotencyKey('m1', 'test')).toMatch(/^granola:/);
  });

  it('handles null meetingId', () => {
    const key = buildIdempotencyKey(null, 'test');
    expect(key).toMatch(/^granola:unknown:/);
  });
});
