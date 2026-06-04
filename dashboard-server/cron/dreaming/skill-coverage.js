'use strict';

async function analyse(ctx) {
  const { fs, path } = ctx;
  const insights = [];
  const skillsWithoutLearnings = [];
  const rolesWithoutKnowledge = [];

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../..');
  const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
  const ROLES_DIR = path.join(REPO_ROOT, 'roles');
  const SESSION_LOGS_DIR = path.join(REPO_ROOT, 'projects', 'nbi_dashboard', 'session_logs');

  if (fs.existsSync(SKILLS_DIR)) {
    try {
      const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(e => e.isDirectory());
      entries.forEach(e => {
        const learningsPath = path.join(SKILLS_DIR, e.name, 'learnings.md');
        if (!fs.existsSync(learningsPath)) skillsWithoutLearnings.push(e.name);
      });
    } catch {}
  }

  if (fs.existsSync(ROLES_DIR)) {
    try {
      const roleDirs = fs.readdirSync(ROLES_DIR, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== '_template');
      roleDirs.forEach(rd => {
        const knowledgeDir = path.join(ROLES_DIR, rd.name, 'knowledge');
        if (!fs.existsSync(knowledgeDir)) { rolesWithoutKnowledge.push(rd.name); }
        else { try { if (fs.readdirSync(knowledgeDir).length === 0) rolesWithoutKnowledge.push(rd.name); } catch {} }
      });
    } catch {}
  }

  if (skillsWithoutLearnings.length > 5) {
    insights.push({
      category: 'gap', severity: 'info',
      title: skillsWithoutLearnings.length + ' skills have no learnings captured',
      body: 'Skills without learnings cannot improve over time.',
      evidence: skillsWithoutLearnings.slice(0, 5).map(s => 'skill:' + s),
      action: 'Run evals or capture learnings for active skills.', related_4c: 'capabilities',
    });
  }

  if (rolesWithoutKnowledge.length > 3) {
    insights.push({
      category: 'gap', severity: 'info',
      title: rolesWithoutKnowledge.length + ' roles have no knowledge banks',
      body: rolesWithoutKnowledge.slice(0, 5).join(', '),
      evidence: rolesWithoutKnowledge.slice(0, 5).map(r => 'role:' + r),
      action: 'Add AGENT.md knowledge to active roles.', related_4c: 'capabilities',
    });
  }

  return { insights, stale_report: { skills_without_learnings: skillsWithoutLearnings, roles_without_knowledge: rolesWithoutKnowledge } };
}

module.exports = { analyse };
