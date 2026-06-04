'use strict';

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

async function analyse(ctx) {
  const { pool, fs, path } = ctx;
  const insights = [];
  const brainDbDrift = [];
  const brainModules = [];

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../..');
  const BRAIN_DIR = path.join(REPO_ROOT, 'brain');
  const STALE_DAYS = 30;

  try {
    const { rows: dbClients } = await pool.query('SELECT name FROM clients ORDER BY name');
    const dbNames = dbClients.map(c => c.name.toLowerCase());
    const clientsBrain = path.join(BRAIN_DIR, 'clients_detailed.md');
    if (fs.existsSync(clientsBrain)) {
      const content = fs.readFileSync(clientsBrain, 'utf8');
      const brainSections = (content.match(/^## (.+)/gm) || []).map(s => s.replace('## ', '').trim().toLowerCase());
      dbNames.forEach(name => {
        if (!brainSections.some(bs => bs.includes(name) || name.includes(bs))) {
          brainDbDrift.push({ type: 'client_mismatch', detail: name + ' exists in DB but not in brain/clients_detailed.md', source: 'clients table vs brain/clients_detailed.md' });
        }
      });
    }
  } catch (e) { /* skip client check on error */ }

  try {
    const { rows: dbUsers } = await pool.query('SELECT display_name FROM users WHERE display_name IS NOT NULL');
    const dbPeople = dbUsers.map(u => u.display_name.toLowerCase());
    const peopleBrain = path.join(BRAIN_DIR, 'people_directory.md');
    if (fs.existsSync(peopleBrain)) {
      const content = fs.readFileSync(peopleBrain, 'utf8');
      const brainPeople = (content.match(/^## (.+)/gm) || []).map(s => s.replace('## ', '').trim().toLowerCase());
      dbPeople.forEach(name => {
        if (!brainPeople.some(bp => bp.includes(name) || name.includes(bp))) {
          brainDbDrift.push({ type: 'team_mismatch', detail: name + ' exists in users table but not in brain/people_directory.md', source: 'users table vs brain/people_directory.md' });
        }
      });
    }
  } catch (e) { /* skip team check on error */ }

  if (fs.existsSync(BRAIN_DIR)) {
    try {
      const modules = fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.md'));
      modules.forEach(f => {
        try {
          const stat = fs.statSync(path.join(BRAIN_DIR, f));
          const age = daysSince(stat.mtime);
          if (age > STALE_DAYS) {
            brainModules.push({ name: f.replace('.md', ''), days_stale: age });
          }
        } catch {}
      });
    } catch {}
  }

  if (brainDbDrift.length > 0) {
    insights.push({
      category: 'drift', severity: brainDbDrift.length > 3 ? 'warning' : 'info',
      title: brainDbDrift.length + ' brain/DB mismatches detected',
      body: brainDbDrift.slice(0, 3).map(d => d.detail).join('; '),
      evidence: brainDbDrift.slice(0, 5).map(d => d.source),
      action: 'Reconcile brain modules with current database state.', related_4c: 'context',
    });
  }

  if (brainModules.length > 3) {
    insights.push({
      category: 'stale', severity: 'info',
      title: brainModules.length + ' brain modules not updated in ' + STALE_DAYS + '+ days',
      body: brainModules.slice(0, 5).map(m => m.name).join(', '),
      evidence: brainModules.slice(0, 5).map(m => 'brain:' + m.name),
      action: 'Verify brain modules are current.', related_4c: 'context',
    });
  }

  return { insights, stale_report: { brain_modules: brainModules }, cross_refs: { brain_db_drift: brainDbDrift } };
}

module.exports = { analyse };
