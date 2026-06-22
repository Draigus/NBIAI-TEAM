// Verify PM2 ecosystem config has log file paths and the
// log rotation setup script exists.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');

describe('PM2 log management', () => {
  it('ecosystem.config.js defines error_file and out_file for production', () => {
    const config = require('../../ecosystem.config.js');
    const prod = config.apps.find(a => a.name === 'nbi-dashboard');
    expect(prod).toBeTruthy();
    expect(prod.error_file).toBeTruthy();
    expect(prod.out_file).toBeTruthy();
    expect(prod.merge_logs).toBe(true);
    expect(prod.log_date_format).toBeTruthy();
  });

  it('ecosystem.config.js defines error_file and out_file for staging', () => {
    const config = require('../../ecosystem.config.js');
    const staging = config.apps.find(a => a.name === 'nbi-dashboard-staging');
    expect(staging).toBeTruthy();
    expect(staging.error_file).toBeTruthy();
    expect(staging.out_file).toBeTruthy();
    expect(staging.error_file).not.toBe(staging.out_file);
  });

  it('production and staging log to different files', () => {
    const config = require('../../ecosystem.config.js');
    const prod = config.apps.find(a => a.name === 'nbi-dashboard');
    const staging = config.apps.find(a => a.name === 'nbi-dashboard-staging');
    expect(prod.out_file).not.toBe(staging.out_file);
    expect(prod.error_file).not.toBe(staging.error_file);
  });

  it('log rotation setup script exists', () => {
    const scriptPath = path.join(__dirname, '../../scripts/setup-log-rotation.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('pm2 install pm2-logrotate');
    expect(content).toContain('max_size');
    expect(content).toContain('retain');
    expect(content).toContain('compress');
  });
});
