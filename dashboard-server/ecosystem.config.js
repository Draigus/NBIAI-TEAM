module.exports = {
  apps: [{
    name: 'nbi-dashboard',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: { NODE_ENV: 'production', LOG_LEVEL: 'info', REPO_ROOT: require('path').resolve(__dirname, '..') },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true
  }, {
    name: 'nbi-dashboard-staging',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'staging',
      LOG_LEVEL: 'info',
      PORT: 8887,
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_DATABASE_URL: process.env.ADMIN_DATABASE_URL,
      APP_URL: 'http://localhost:8887',
      AZURE_TENANT_ID: '',
      AZURE_CLIENT_ID: '',
      AZURE_CLIENT_SECRET: '',
      EMAIL_FROM: 'staging@example.invalid',
      REPO_ROOT: require('path').resolve(__dirname, '..')
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/staging-error.log',
    out_file: './logs/staging-out.log',
    merge_logs: true
  }]
};
