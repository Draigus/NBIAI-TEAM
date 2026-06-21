const fs = require('fs');

const content = fs.readFileSync('d:/tmp/question_review/questions_Art.md', 'utf8');
const blocks = content.split('\n---\n').filter(b => b.includes('ID:'));
const header = content.split('\n---\n')[0];

const batchSize = Math.ceil(blocks.length / 3);
for (let i = 0; i < 3; i++) {
  const batch = blocks.slice(i * batchSize, (i + 1) * batchSize);
  const start = i * batchSize + 1;
  const end = Math.min((i + 1) * batchSize, blocks.length);
  let out = `# Art Interview Question Bank -- Batch ${i + 1}\n`;
  out += `# Questions ${start}-${end} of ${blocks.length}\n`;
  out += `# Extracted: 2026-06-21\n\n`;
  out += batch.map(b => '---\n' + b).join('\n');
  fs.writeFileSync(`d:/tmp/question_review/questions_Art_batch${i + 1}.md`, out);
  console.log(`Batch ${i + 1}: ${batch.length} questions (${start}-${end})`);
}
