'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const uploadDir = path.join(__dirname, '..', 'uploads');
const jdDir = path.resolve(__dirname, '..', '..', 'Clients', 'Couch Heroes', 'Job Descriptions');

// Explicit mapping: JD filename base (without _JD*.docx) → position title in DB
// Built by comparing 28 JD files against 30 Couch Heroes positions in prod DB
const TITLE_MAP = {
  'Art_Producer': 'Art Producer',
  'Associate_Producer': 'Assoc Producer',
  'Audio_Lead': 'Audio Lead',
  'DevOps_Engineer': null, // No DevOps position in DB
  'Game_Design_Lead': 'Game Design Lead',
  'Game_Designer': null, // No exact match in DB
  'Head_of_Finance': 'Head of Finance',
  'HR_Operations': 'HR Operations',
  'IT_Lead': 'IT Lead',
  'JIRA_Admin_Contractor': 'Jira Admin Contractor',
  'Lead_Animator': 'Lead Animator',
  'Lead_Concept_Artist': 'Lead Concept Artist',
  'Lead_Full_Stack_Developer': 'Lead Full Stack Developer',
  'Lead_Gameplay_Developer': 'Lead Gameplay Developer',
  'QA_Specialist': 'Mid QA Tester',
  'Senior_Character_Modeller': 'Sr Character Modeler',
  'Senior_Environment_Artist': 'Snr Environment Artist',
  'Senior_Level_Designer': 'Senior Level Designer',
  'Senior_Lighting_Artist': 'Snr Lighting Artist',
  'Senior_Network_Engineer': 'Snr Network Engineer',
  'Senior_Technical_Artist': 'Snr Technical Artist',
  'Senior_UI_UX_Designer': 'UI/UX Lead (New Role)',
  'Senior_VFX_Artist': 'Sr VFX Artist',
  'Tech_Producer': 'Tech Producer',
  'Technical_Animator': 'Technical Animator',
};

async function main() {
  if (!fs.existsSync(jdDir)) {
    console.error('JD directory not found:', jdDir);
    process.exit(1);
  }

  const { rows: clients } = await pool.query("SELECT id FROM clients WHERE name ILIKE '%couch%' LIMIT 1");
  if (clients.length === 0) { console.error('Couch Heroes client not found'); process.exit(1); }
  const clientId = clients[0].id;

  const { rows: positions } = await pool.query('SELECT id, title FROM hiring_positions WHERE client_id = $1', [clientId]);
  const positionByTitle = {};
  positions.forEach(p => { positionByTitle[p.title] = p.id; });

  const files = fs.readdirSync(jdDir).filter(f =>
    f.endsWith('.docx') && !f.startsWith('Copy of') && !f.startsWith('HANDOFF')
  );

  let attached = 0;
  let skipped = 0;
  const unmatched = [];

  for (const file of files) {
    let key = file
      .replace(/_JD_v\d+\.docx$/i, '')
      .replace(/_JD\.docx$/i, '')
      .replace(/\.docx$/i, '');

    const positionTitle = TITLE_MAP[key];
    if (positionTitle === undefined) {
      const directTitle = key.replace(/_/g, ' ');
      const posId = positionByTitle[directTitle];
      if (!posId) {
        unmatched.push(`${file} -> no mapping for key "${key}"`);
        skipped++;
        continue;
      }
      await attachFile(posId, file);
      attached++;
      console.log(`  + ${file} -> ${directTitle}`);
      continue;
    }
    if (positionTitle === null) {
      console.log(`  - ${file} -> skipped (no matching position)`);
      skipped++;
      continue;
    }
    const posId = positionByTitle[positionTitle];
    if (!posId) {
      unmatched.push(`${file} -> mapped to "${positionTitle}" but position not found in DB`);
      skipped++;
      continue;
    }
    await attachFile(posId, file);
    attached++;
    console.log(`  + ${file} -> ${positionTitle}`);
  }

  console.log(`\nDone: ${attached} attached, ${skipped} skipped`);
  if (unmatched.length > 0) {
    console.log('Unmatched:');
    unmatched.forEach(u => console.log(`  ! ${u}`));
  }
  await pool.end();
}

async function attachFile(positionId, originalFilename) {
  const src = path.join(jdDir, originalFilename);
  const ext = path.extname(originalFilename);
  const storedName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
  const dest = path.join(uploadDir, storedName);
  fs.copyFileSync(src, dest);
  await pool.query(
    'UPDATE hiring_positions SET jd_filename = $1, jd_original_name = $2, updated_at = NOW() WHERE id = $3',
    [storedName, originalFilename, positionId]
  );
}

main().catch(e => { console.error(e); process.exit(1); });
