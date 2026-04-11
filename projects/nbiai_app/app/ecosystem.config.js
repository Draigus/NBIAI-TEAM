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
 *   pm2 start ecosystem.config.js
 *   pm2 stop nbiai-api
 *   pm2 logs nbiai-api
 *   pm2 status
 *
 * The app must be built first: npm run build
 * PM2 expects the compiled output at dist/index.js
 */

module.exports = {
  apps: [
    {
      name: 'nbiai-api',
      script: 'dist/index.js',
      interpreter: 'node',

      // Load environment variables from .env file
      env_file: '.env',

      // Node.js flags -- use ESM loader for the compiled output
      node_args: [],

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

      // Instance count: 1 (single instance, no clustering needed for local use)
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
