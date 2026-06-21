require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

const OUT_DIR = 'd:/tmp/question_review';

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const r = await p.query(
    'SELECT id, discipline, category, depth_type, question_text FROM interview_question_bank ORDER BY discipline, category, id'
  );

  const byDiscipline = {};
  for (const row of r.rows) {
    const key = row.discipline.replace(/[/\\]/g, '_');
    if (!byDiscipline[key]) byDiscipline[key] = [];
    byDiscipline[key].push(row);
  }

  for (const [disc, questions] of Object.entries(byDiscipline)) {
    let content = `# ${disc} Interview Question Bank\n`;
    content += `# Total: ${questions.length} questions\n`;
    content += `# Extracted: ${new Date().toISOString().split('T')[0]}\n\n`;

    for (const q of questions) {
      content += `---\n`;
      content += `ID: ${q.id}\n`;
      content += `DISCIPLINE: ${q.discipline}\n`;
      content += `CATEGORY: ${q.category}\n`;
      content += `DEPTH: ${q.depth_type || 'N/A'}\n`;
      content += `QUESTION: ${q.question_text}\n\n`;
    }

    const filePath = path.join(OUT_DIR, `questions_${disc}.md`);
    fs.writeFileSync(filePath, content);
    console.log(`${disc}: ${questions.length} questions -> ${filePath}`);
  }

  console.log('\nTotal:', r.rows.length, 'questions across', Object.keys(byDiscipline).length, 'disciplines');
  await p.end();
})();
