#!/usr/bin/env node
'use strict';
// memory-conflict.js — Phase 7: Memory conflict handling for the RHO harness.
// Detects when harness-generated memories conflict with Glen-explicit memories.
// Spec reference: §8 Memory Conflict Handling.
// Zero external dependencies — Node.js built-ins only.

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const DEFAULT_MEMORY_DIR = path.join(PROJECT_DIR, 'memory');

// --- Frontmatter parsing ---

function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') return null;
  var match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  var fm = {};
  var lines = match[1].split(/\r?\n/);
  var currentKey = null;
  var indent = 0;
  var parentKey = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    var leadingSpaces = line.length - line.trimStart().length;
    var kvMatch = trimmed.match(/^(\w[\w-]*):\s*(.*)/);

    if (kvMatch) {
      var key = kvMatch[1];
      var val = kvMatch[2].trim();

      if (leadingSpaces > 0 && parentKey) {
        if (typeof fm[parentKey] !== 'object' || fm[parentKey] === null) {
          fm[parentKey] = {};
        }
        fm[parentKey][key] = parseYamlValue(val);
      } else {
        parentKey = key;
        if (val) {
          fm[key] = parseYamlValue(val);
        } else {
          fm[key] = {};
        }
      }
    }
  }

  return fm;
}

function parseYamlValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '') return null;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
  return val.replace(/^["']|["']$/g, '');
}

// --- Memory file scanning ---

function listMemoryFiles(memoryDir) {
  memoryDir = memoryDir || DEFAULT_MEMORY_DIR;
  if (!fs.existsSync(memoryDir)) return [];

  try {
    return fs.readdirSync(memoryDir)
      .filter(function(f) {
        return f.endsWith('.md') && f !== 'MEMORY.md';
      })
      .map(function(f) {
        return path.join(memoryDir, f);
      });
  } catch {
    return [];
  }
}

function readMemoryFile(filePath) {
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    var fm = parseFrontmatter(content);
    return {
      path: filePath,
      filename: path.basename(filePath),
      content: content,
      frontmatter: fm,
      name: fm && fm.name || path.basename(filePath, '.md'),
      description: fm && fm.description || '',
      isHarnessGenerated: fm && fm.source === 'harness_rho' && fm.auto_generated === true
    };
  } catch {
    return null;
  }
}

function loadAllMemories(memoryDir) {
  var files = listMemoryFiles(memoryDir);
  var memories = [];
  for (var i = 0; i < files.length; i++) {
    var mem = readMemoryFile(files[i]);
    if (mem) memories.push(mem);
  }
  return memories;
}

// --- Conflict detection ---

function slugMatch(slug1, slug2) {
  if (!slug1 || !slug2) return false;
  var s1 = String(slug1).toLowerCase().trim();
  var s2 = String(slug2).toLowerCase().trim();
  return s1 === s2;
}

function descriptionOverlap(desc1, desc2) {
  if (!desc1 || !desc2) return false;
  var d1 = String(desc1).toLowerCase();
  var d2 = String(desc2).toLowerCase();

  var words1 = extractKeywords(d1);
  var words2 = extractKeywords(d2);
  if (words1.length === 0 || words2.length === 0) return false;

  var overlap = 0;
  for (var i = 0; i < words1.length; i++) {
    if (words2.indexOf(words1[i]) !== -1) overlap++;
  }

  var minLen = Math.min(words1.length, words2.length);
  return minLen > 0 && (overlap / minLen) >= 0.5;
}

var STOP_WORDS = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'and', 'or', 'not', 'for', 'with', 'from', 'to', 'in', 'on', 'at', 'of',
  'by', 'this', 'that', 'it', 'as', 'do', 'does', 'did', 'has', 'have', 'had',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'all',
  'any', 'each', 'every', 'some', 'no', 'more', 'most', 'other', 'such'];

function extractKeywords(text) {
  var words = text.replace(/[^a-z0-9_-]/g, ' ').split(/\s+/).filter(function(w) {
    return w.length >= 3 && STOP_WORDS.indexOf(w) === -1;
  });
  var unique = [];
  for (var i = 0; i < words.length; i++) {
    if (unique.indexOf(words[i]) === -1) unique.push(words[i]);
  }
  return unique;
}

function findConflicts(proposal, memoryDir) {
  if (!proposal) return [];
  memoryDir = memoryDir || DEFAULT_MEMORY_DIR;

  var proposalTarget = normalisePath(proposal.target_file || '');
  if (!isMemoryPath(proposalTarget)) return [];

  var proposalSlug = extractSlugFromPath(proposalTarget) ||
    (proposal.content && extractSlugFromContent(proposal.content)) || '';
  var proposalDesc = proposal.diagnosis || proposal.proposed_change || '';

  var memories = loadAllMemories(memoryDir);
  var conflicts = [];

  for (var i = 0; i < memories.length; i++) {
    var mem = memories[i];
    if (mem.isHarnessGenerated) continue;

    var matchType = null;
    var targetBasename = path.basename(proposalTarget);

    if (mem.filename === targetBasename) {
      matchType = 'same_file';
    } else if (slugMatch(proposalSlug, mem.name)) {
      matchType = 'slug_match';
    } else if (descriptionOverlap(proposalDesc, mem.description)) {
      matchType = 'description_overlap';
    }

    if (matchType) {
      conflicts.push({
        memory_name: mem.name,
        memory_file: mem.filename,
        match_type: matchType,
        memory_description: mem.description,
        is_glen_explicit: !mem.isHarnessGenerated
      });
    }
  }

  return conflicts;
}

// --- Path utilities ---

function normalisePath(p) {
  if (!p || typeof p !== 'string') return '';
  return p.replace(/\\/g, '/');
}

function isMemoryPath(p) {
  var norm = normalisePath(p);
  return /memory\//.test(norm) && norm.endsWith('.md');
}

function extractSlugFromPath(p) {
  var norm = normalisePath(p);
  var match = norm.match(/memory\/([^/]+)\.md$/);
  return match ? match[1] : null;
}

function extractSlugFromContent(content) {
  if (!content || typeof content !== 'string') return null;
  var match = content.match(/^name:\s*(.+)/m);
  return match ? match[1].trim() : null;
}

// --- Risk promotion ---

function promoteRisk(proposal, conflicts) {
  if (!conflicts || conflicts.length === 0) return proposal;

  var glenConflicts = conflicts.filter(function(c) { return c.is_glen_explicit; });
  if (glenConflicts.length === 0) return proposal;

  var promoted = Object.assign({}, proposal);
  if (promoted.risk === 'LOW') {
    promoted.risk = 'HIGH';
    promoted.promotion_reason = 'conflicts with Glen-explicit memory: ' +
      glenConflicts.map(function(c) { return c.memory_name; }).join(', ');
  }

  promoted.conflict_with = glenConflicts.map(function(c) { return c.memory_name; });

  return promoted;
}

// --- Full check (called by cadence) ---

function checkProposal(proposal, memoryDir) {
  var conflicts = findConflicts(proposal, memoryDir);
  if (conflicts.length === 0) {
    return { hasConflict: false, proposal: proposal, conflicts: [] };
  }

  var promoted = promoteRisk(proposal, conflicts);
  return {
    hasConflict: true,
    proposal: promoted,
    conflicts: conflicts
  };
}

module.exports = {
  parseFrontmatter,
  parseYamlValue,
  listMemoryFiles,
  readMemoryFile,
  loadAllMemories,
  slugMatch,
  descriptionOverlap,
  extractKeywords,
  findConflicts,
  normalisePath,
  isMemoryPath,
  extractSlugFromPath,
  extractSlugFromContent,
  promoteRisk,
  checkProposal,
  STOP_WORDS
};
