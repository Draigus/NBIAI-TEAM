import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { mapRowsToTasks, detectImportFormat } = require('../../server.js');

// Headers and rows for nbi-csv format.
// mapRowsToTasks(format, headers, rows) — rows are positional arrays, not objects.
// Header order: task, status, priority, <due column>

describe('mapRowsToTasks — due date parsing in nbi-csv format', () => {
  it('parses DD/MM/YYYY due dates in nbi-csv format', () => {
    const headers = ['task', 'status', 'priority', 'due date'];
    // row: [task, status, priority, due date]
    const rows = [['Fix login', 'Not started', 'High', '15/06/2026']];
    const format = detectImportFormat(headers);
    expect(format.format).toBe('nbi-csv');
    const tasks = mapRowsToTasks(format.format, headers, rows);
    expect(tasks[0].dueDate).toBe('2026-06-15');
  });

  it('leaves ISO dates unchanged', () => {
    const headers = ['task', 'status', 'priority', 'due date'];
    const rows = [['Fix login', 'Not started', 'High', '2026-06-15']];
    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(format.format, headers, rows);
    expect(tasks[0].dueDate).toBe('2026-06-15');
  });

  it('matches due_date column name with underscore', () => {
    const headers = ['task', 'status', 'priority', 'due_date'];
    const rows = [['Fix login', 'Not started', 'High', '15/06/2026']];
    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(format.format, headers, rows);
    expect(tasks[0].dueDate).toBe('2026-06-15');
  });

  it('matches deadline column name', () => {
    const headers = ['task', 'status', 'priority', 'deadline'];
    const rows = [['Fix login', 'Not started', 'High', '2026-06-15']];
    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(format.format, headers, rows);
    expect(tasks[0].dueDate).toBe('2026-06-15');
  });
});
