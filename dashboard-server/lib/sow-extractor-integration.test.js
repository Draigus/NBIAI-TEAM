/**
 * Integration test: generate a synthetic SoW PDF, run it through the
 * extractor, verify pricing and legal sections are stripped while
 * work-package content is preserved.
 *
 * Run: node lib/sow-extractor-integration.test.js
 */

const PDFDocument = require('pdfkit');
const { extractWorkPackage } = require('./sow-extractor');

function generateSamplePdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(18).text('Statement of Work', { align: 'center' });
    doc.moveDown();

    // 1. Executive summary (SAFE)
    doc.fontSize(14).text('1. Executive Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'This engagement will deliver a new customer onboarding flow for the Lighthouse Studios platform. The work will span discovery, design, implementation, and handover across six weeks.'
    );
    doc.moveDown();

    // 2. Scope of work (SAFE)
    doc.fontSize(14).text('2. Scope of Work');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'NBI will lead the end-to-end design and build of the onboarding flow. Activities include stakeholder interviews, competitive analysis, wireframing, prototype testing, and production implementation.'
    );
    doc.moveDown();

    // 3. Deliverables (SAFE)
    doc.fontSize(14).text('3. Deliverables');
    doc.moveDown(0.5);
    doc.fontSize(11).text('The following deliverables will be produced:');
    doc.text('- Stakeholder interview summary');
    doc.text('- Competitive benchmark report');
    doc.text('- Interactive prototype in Figma');
    doc.text('- Production implementation with test coverage');
    doc.moveDown();

    // 4. Timeline (SAFE)
    doc.fontSize(14).text('4. Timeline');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'The project runs over six weeks with weekly checkpoints. Phase 1 (discovery) covers weeks 1 and 2, Phase 2 (design) covers weeks 3 and 4, Phase 3 (implementation) covers weeks 5 and 6.'
    );
    doc.moveDown();

    // 5. Fees and Payment (SHOULD BE STRIPPED)
    doc.fontSize(14).text('5. Fees and Payment');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'The total fee for this engagement is £45,000 plus VAT. Payment terms are net 30 from receipt of invoice. NBI will invoice £15,000 on commencement, £15,000 at Phase 2, and the balance on completion.'
    );
    doc.text('Day rate for additional work is £850 per consultant.');
    doc.moveDown();

    // 6. Confidentiality (SHOULD BE STRIPPED)
    doc.fontSize(14).text('6. Confidentiality');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'Each party shall treat as confidential all information disclosed by the other party. This obligation survives termination of this agreement.'
    );
    doc.moveDown();

    // 7. Intellectual Property (SHOULD BE STRIPPED)
    doc.fontSize(14).text('7. Intellectual Property');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'All intellectual property rights in deliverables produced under this SoW shall vest in the Client upon full payment. NBI retains rights to its pre-existing methodologies and frameworks.'
    );
    doc.moveDown();

    // 8. Limitation of Liability (SHOULD BE STRIPPED)
    doc.fontSize(14).text('8. Limitation of Liability');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'NBI\'s total liability under this agreement shall be limited to the fees paid. Neither party shall be liable for indirect or consequential loss.'
    );
    doc.moveDown();

    // 9. Assumptions (SAFE - should come back)
    doc.fontSize(14).text('9. Assumptions');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'This work assumes access to key stakeholders, existing design tokens, and production analytics. The Client will provide a dedicated product owner for the duration of the engagement.'
    );
    doc.moveDown();

    // 10. Team (SAFE)
    doc.fontSize(14).text('10. Team');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'The engagement team includes a Senior Product Strategist, a Senior UX Designer, and a Principal Engineer. Glen Pryer serves as engagement lead.'
    );

    doc.end();
  });
}

async function main() {
  console.log('Generating synthetic SoW PDF...');
  const pdfBuffer = await generateSamplePdf();
  console.log(`Generated PDF: ${pdfBuffer.length} bytes`);

  console.log('\nRunning extractor...\n');
  const { text, stats } = await extractWorkPackage(pdfBuffer);

  console.log('=== STATS ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log('\n=== EXTRACTED TEXT ===');
  console.log(text);
  console.log('\n=== VERIFICATION ===');

  const textLower = text.toLowerCase();
  const leakTests = [
    { name: 'No currency symbols', check: !/[£$€]/.test(text) },
    { name: 'No "fee" mentions', check: !/\bfee\b/i.test(text) },
    { name: 'No "payment" mentions', check: !/\bpayment\b/i.test(text) },
    { name: 'No "net 30"', check: !/net 30/i.test(text) },
    { name: 'No "confidential"', check: !/confidential/i.test(text) },
    { name: 'No "intellectual property"', check: !/intellectual property/i.test(text) },
    { name: 'No "liability"', check: !/liability/i.test(text) },
    { name: 'No "£45,000"', check: !text.includes('45,000') },
    { name: 'No "VAT"', check: !/\bVAT\b/.test(text) },
  ];

  const keepTests = [
    { name: 'Contains Executive Summary content', check: /onboarding flow/i.test(text) },
    { name: 'Contains deliverables', check: /deliverables/i.test(text) || /stakeholder interview summary/i.test(text) },
    { name: 'Contains timeline info', check: /six weeks/i.test(text) || /Phase 1/i.test(text) },
    { name: 'Contains team info', check: /product strategist/i.test(text) || /UX designer/i.test(text) },
    { name: 'Contains assumptions', check: /stakeholders/i.test(text) },
  ];

  let failures = 0;
  console.log('\nLeak checks (must all be true - nothing sensitive in output):');
  leakTests.forEach(t => {
    const icon = t.check ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${t.name}`);
    if (!t.check) failures++;
  });

  console.log('\nContent checks (work-package content should be kept):');
  keepTests.forEach(t => {
    const icon = t.check ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${t.name}`);
    if (!t.check) failures++;
  });

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch(e => { console.error(e); process.exit(1); });
