/**
 * PM2 process configuration for the NBIAI Team App.
 *
 * Usage:
 *   npm run pm2:start    -- start in background
 *   npm run pm2:stop     -- stop
 *   npm run pm2:restart  -- restart
 *   npm run pm2:logs     -- tail logs
 *
 * Or directly:
 *   pm2 start ecosystem.config.cjs
 *   pm2 stop nbiai-api
 *   pm2 logs nbiai-api
 *   pm2 status
 *
 * The app must be built first: npm run build
 * PM2 expects the compiled output at dist/index.js
 */

const path = require('path')
const appDir = path.resolve(__dirname)

module.exports = {
  apps: [
    {
      name: 'nbiai-api',
      script: 'dist/index.js',
      cwd: appDir,
      interpreter: 'node',

      // Node.js flags
      node_args: ['--env-file=.env'],

      // Restart policy: restart on crash, max 5 attempts before marking as errored
      autorestart: true,
      max_restarts: 5,
      restart_delay: 3000,

      // Watch mode: disabled in production (use pm2:restart after deployment)
      watch: false,

      // Log files
      out_file: 'logs/api.log',
      error_file: 'logs/api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Environment-specific configuration
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: '3001',
      },

      // Fork mode required for ESM output; single instance for local use
      exec_mode: 'fork',
      instances: 1,

      // Graceful shutdown: give the process 5 seconds to clean up
      kill_timeout: 5000,

      // Wait for the process to be ready before marking as online
      // The server logs "NBIAI Team App listening on port {PORT}" when ready
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
}
