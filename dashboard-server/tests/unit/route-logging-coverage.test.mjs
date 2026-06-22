// Verify every route file that performs mutations has log() calls.
// This is a static analysis test that reads source files and checks
// for the presence of structured logging.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../../routes');

function readRoute(name) {
  return fs.readFileSync(path.join(routesDir, name), 'utf8');
}

describe('route logging coverage', () => {
  const mutatingRoutes = [
    'auth.js', 'users.js', 'settings.js', 'contacts.js', 'client-notes.js',
    'milestones.js', 'queue.js', 'time-off.js', 'attachments.js',
    'hiring-templates.js', 'bugs.js', 'calendar.js', 'clients.js',
    'documents.js', 'expenses.js', 'finance.js', 'hiring.js',
    'interview.js', 'interview-rounds.js', 'leads.js', 'sows.js',
    'tasks.js', 'teams.js', 'sync.js', 'admin.js', 'chat.js',
    'command-centre.js', 'notifications.js', 'reports.js', 'templates.js',
    'candidate-comments.js', 'candidate-files.js', 'candidate-history.js',
    'hiring-metrics.js', 'slack.js',
  ];

  for (const route of mutatingRoutes) {
    it(`${route} has log() calls`, () => {
      const src = readRoute(route);
      const hasLog = /log\(['"](?:error|warn|info)['"]/.test(src);
      expect(hasLog, `${route} should have at least one log() call`).toBe(true);
    });
  }

  it('no route file uses log.error (pino-style) instead of log() function', () => {
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const src = readRoute(f);
      expect(src, `${f} should not contain log.error`).not.toContain('log.error');
    }
  });

  const newlyInstrumentedWithAudit = [
    'contacts.js', 'client-notes.js', 'milestones.js', 'time-off.js',
    'settings.js', 'users.js',
  ];

  for (const route of newlyInstrumentedWithAudit) {
    it(`${route} has auditLog() calls for mutations`, () => {
      const src = readRoute(route);
      expect(src).toContain('auditLog(');
    });
  }

  it('attachments.js has auditLog for file upload create', () => {
    const src = readRoute('attachments.js');
    const createAudit = src.match(/auditLog\('attachment'.*'create'/);
    expect(createAudit).not.toBeNull();
  });
});
