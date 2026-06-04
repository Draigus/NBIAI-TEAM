#!/usr/bin/env node
// seed-role-questions.js
// Parses interview-questions-by-role.md and seeds interview_question_bank
// with role-specific questions tagged by position_titles.
//
// Usage: node scripts/seed-role-questions.js [--dry-run]

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const DRY_RUN = process.argv.includes('--dry-run');
const COUCH_HEROES_CLIENT_ID = '21be0772-73e5-4cca-8795-8b1a66f89ec2';

const MD_DIR = path.resolve(__dirname, '../../projects/nbi_dashboard/deliverables/interview-questions');
const MD_LEGACY = path.resolve(__dirname, '../../projects/nbi_dashboard/deliverables/interview-questions-by-role.md');

// Position title mappings for shared question sections
const SHARED_PRODUCER_TITLES = ['Art Producer', 'Assoc Producer', 'Tech Producer'];
const SHARED_QA_TITLES = ['Mid QA Tester', 'Mid QA Tester (Contract)'];

function parseMarkdown(text) {
  const lines = text.split('\n');
  const questions = [];
  let currentRole = null;
  let currentCategory = null;
  let isSharedProducer = false;

  for (const line of lines) {
    // Detect role headings (### Role Name)
    const roleMatch = line.match(/^### (.+)$/);
    if (roleMatch) {
      const title = roleMatch[1].trim();
      isSharedProducer = false;

      if (title === 'Shared Producer Questions (Art Producer, Assoc Producer, Tech Producer)') {
        currentRole = '__shared_producer__';
        isSharedProducer = true;
      } else if (title === 'Art Producer (additional questions)') {
        currentRole = 'Art Producer';
      } else if (title === 'Tech Producer (additional questions)') {
        currentRole = 'Tech Producer';
      } else if (title === 'Assoc Producer (additional questions)') {
        currentRole = 'Assoc Producer';
      } else if (title === 'Mid QA Tester / Mid QA Tester (Contract)') {
        currentRole = '__shared_qa__';
      } else {
        currentRole = title;
      }
      currentCategory = null;
      continue;
    }

    // Detect category headings (**Culture**, **Technical**, etc.)
    const catMatch = line.match(/^\*\*(\w+)\*\*\s*$/);
    if (catMatch) {
      currentCategory = catMatch[1].toLowerCase();
      continue;
    }

    // Detect question lines (numbered: 1. Question text)
    const qMatch = line.match(/^\d+\.\s+(.+)$/);
    if (qMatch && currentRole && currentCategory) {
      const questionText = qMatch[1].trim();
      let positionTitles;

      if (currentRole === '__shared_producer__') {
        positionTitles = SHARED_PRODUCER_TITLES;
      } else if (currentRole === '__shared_qa__') {
        positionTitles = SHARED_QA_TITLES;
      } else {
        positionTitles = [currentRole];
      }

      questions.push({
        position_titles: positionTitles,
        category: currentCategory,
        question_text: questionText,
        discipline: inferDiscipline(currentRole, positionTitles),
      });
    }
  }

  return questions;
}

function inferDiscipline(role, titles) {
  const r = (titles[0] || role).toLowerCase();
  if (['lead animator', 'lead concept artist', 'snr environment artist', 'snr lighting artist',
       'snr technical artist', 'sr character modeler', 'sr vfx artist', 'technical animator'].some(t => r === t))
    return 'Art';
  if (['lead full stack developer', 'lead gameplay developer', 'snr network engineer', 'tools engineer', 'it lead'].some(t => r === t))
    return 'Engineering';
  if (['game design lead', 'level design lead', 'senior level designer', 'mid general designer'].some(t => r === t))
    return 'Game Design';
  if (['art producer', 'assoc producer', 'tech producer', 'executive producer'].some(t => r === t))
    return 'Production';
  if (['audio lead', 'audio mentor (3-month contract)'].some(t => r === t))
    return 'Audio';
  if (['mid qa tester', 'mid qa tester (contract)'].some(t => r === t))
    return 'QA';
  if (r === 'cto') return 'Leadership';
  if (r === 'head of finance') return 'Leadership';
  if (r === 'hr operations') return 'HR/People';
  if (r === 'jira admin contractor') return 'Production';
  if (r === 'ui/ux lead (new role)') return 'Art';
  return 'General';
}

async function main() {
  let allText = '';
  if (fs.existsSync(MD_DIR)) {
    const files = fs.readdirSync(MD_DIR).filter(f => f.endsWith('.md')).sort();
    for (const f of files) {
      allText += fs.readFileSync(path.join(MD_DIR, f), 'utf-8') + '\n';
    }
    console.log(`Read ${files.length} files from ${MD_DIR}`);
  } else if (fs.existsSync(MD_LEGACY)) {
    allText = fs.readFileSync(MD_LEGACY, 'utf-8');
    console.log('Read legacy single file');
  } else {
    console.error('No question files found');
    process.exit(1);
  }
  const questions = parseMarkdown(allText);

  console.log(`Parsed ${questions.length} questions from markdown`);

  // Validate categories
  const validCats = new Set(['culture', 'technical', 'collaboration', 'leadership', 'depth']);
  const badCats = questions.filter(q => !validCats.has(q.category));
  if (badCats.length > 0) {
    console.error('Invalid categories found:', [...new Set(badCats.map(q => q.category))]);
    process.exit(1);
  }

  // Show summary
  const byRole = {};
  for (const q of questions) {
    for (const t of q.position_titles) {
      byRole[t] = (byRole[t] || 0) + 1;
    }
  }
  console.log('\nQuestions per role:');
  for (const [role, count] of Object.entries(byRole).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${role}: ${count}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: no database changes made');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete old generic questions (FK is ON DELETE SET NULL on interview_config_questions and interview_scores)
    const { rowCount: deleted } = await client.query('DELETE FROM interview_question_bank');
    console.log(`\nDeleted ${deleted} old questions`);

    // Insert new questions
    let inserted = 0;
    for (const q of questions) {
      await client.query(
        `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, position_titles, source)
         VALUES ($1, $2, $3, $4, $5, 'curated')`,
        [COUCH_HEROES_CLIENT_ID, q.discipline, q.category, q.question_text, q.position_titles]
      );
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`Inserted ${inserted} role-specific questions`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to seed questions:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
