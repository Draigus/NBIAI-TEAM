'use strict';

const crypto = require('crypto');

const MAX_INPUT_LENGTH = 50000;
const MAX_QUOTE_LENGTH = 500;

const HIGH_CONFIDENCE_PATTERNS = [
  { re: /(\b[A-Z]\w+)\s+said\s+(?:he|she|they)(?:\s+will|'ll)\s+(.+?)(?:\.|$)/gi, ownerGroup: 1, textGroup: 2 },
  { re: /(\b[A-Z]\w+)\s+(?:will|shall)\s+(.+?)(?:\.|$)/gi, ownerGroup: 1, textGroup: 2 },
  { re: /I'?ll\s+(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
  { re: /(\b[A-Z]\w+)\s+committed to\s+(.+?)(?:\.|$)/gi, ownerGroup: 1, textGroup: 2 },
  { re: /(\b[A-Z]\w+)\s+promised to\s+(.+?)(?:\.|$)/gi, ownerGroup: 1, textGroup: 2 },
];

const MEDIUM_CONFIDENCE_PATTERNS = [
  { re: /(?:we|they) need to\s+(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
  { re: /(?:we|they) must\s+(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
  { re: /(?:we|they) have to\s+(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
];

const LOW_CONFIDENCE_PATTERNS = [
  { re: /(?:we|they) should (?:probably )?\s*(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
  { re: /(?:we|they) could\s+(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
  { re: /(?:we|they) might (?:want to )?\s*(.+?)(?:\.|$)/gi, ownerGroup: null, textGroup: 1 },
];

const DAY_NAMES = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };

function parseRelativeDate(text, referenceDate) {
  const input = String(text || '');
  const lower = input.toLowerCase();
  const ref = new Date(String(referenceDate || '') + 'T12:00:00Z');
  if (isNaN(ref.getTime())) return null;

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(ref);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  if (/\bend of (?:the )?week\b/.test(lower) || /\beow\b/.test(lower)) {
    const d = new Date(ref);
    const daysToFriday = (5 - d.getUTCDay() + 7) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysToFriday);
    return d.toISOString().slice(0, 10);
  }

  if (/\bnext week\b/.test(lower)) {
    const d = new Date(ref);
    const daysToNextMonday = (8 - d.getUTCDay()) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysToNextMonday);
    return d.toISOString().slice(0, 10);
  }

  for (const [name, dayNum] of Object.entries(DAY_NAMES)) {
    const re = new RegExp(`\\b(?:by\\s+)?${name}\\b`, 'i');
    if (re.test(input)) {
      const d = new Date(ref);
      const diff = (dayNum - d.getUTCDay() + 7) % 7 || 7;
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }

  const isoMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

function extractCommitments(text, ctx) {
  const input = String(text || '').slice(0, MAX_INPUT_LENGTH);
  const { meetingId, meetingDate } = ctx || {};
  const results = [];
  const seenTexts = new Set();

  function processPatterns(patterns, confidence) {
    for (const { re, ownerGroup, textGroup } of patterns) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(input)) !== null) {
        const commitmentText = (match[textGroup] || '').trim();
        if (!commitmentText || commitmentText.length < 5) continue;

        const normKey = commitmentText.toLowerCase().replace(/\s+/g, ' ');
        if (seenTexts.has(normKey)) continue;
        seenTexts.add(normKey);

        const owner = ownerGroup && match[ownerGroup] ? match[ownerGroup] : null;
        const dueDate = parseRelativeDate(match[0], meetingDate);

        results.push({
          owner,
          commitment: commitmentText,
          confidence,
          dueDate,
          sourceQuote: match[0].trim().slice(0, MAX_QUOTE_LENGTH),
          idempotencyKey: buildIdempotencyKey(meetingId, commitmentText),
        });
      }
    }
  }

  processPatterns(HIGH_CONFIDENCE_PATTERNS, 'high');
  processPatterns(MEDIUM_CONFIDENCE_PATTERNS, 'medium');
  processPatterns(LOW_CONFIDENCE_PATTERNS, 'low');

  return results;
}

function extractDecisions(text) {
  const input = String(text || '').slice(0, MAX_INPUT_LENGTH);
  const patterns = [
    /(?:decided|agreed|confirmed|resolved) (?:to |that )(.+?)(?:\.|$)/gi,
    /decision:\s*(.+?)(?:\.|$)/gi,
  ];
  const results = [];
  const seen = new Set();

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(input)) !== null) {
      const decision = (match[1] || '').trim();
      if (decision.length < 5 || seen.has(decision.toLowerCase())) continue;
      seen.add(decision.toLowerCase());
      results.push(decision);
    }
  }
  return results;
}

function extractActionItems(text) {
  const input = String(text || '').slice(0, MAX_INPUT_LENGTH);
  const results = [];
  const seen = new Set();

  const bulletPattern = /^[-*]\s+(.+?)$/gm;
  let match;
  while ((match = bulletPattern.exec(input)) !== null) {
    const item = match[1].trim();
    if (/\bto\b/.test(item) && item.length > 10 && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      results.push(item);
    }
  }

  const actionPrefix = /\baction:?\s+(.+?)(?:\.|$)/gi;
  while ((match = actionPrefix.exec(input)) !== null) {
    const item = match[1].trim();
    if (item.length > 5 && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      results.push(item);
    }
  }

  return results;
}

function buildIdempotencyKey(meetingId, commitmentText) {
  const normalised = String(commitmentText || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const hash = crypto.createHash('sha256').update(normalised).digest('hex').slice(0, 12);
  return `granola:${meetingId || 'unknown'}:${hash}`;
}

module.exports = { extractCommitments, extractDecisions, extractActionItems, buildIdempotencyKey, parseRelativeDate };
