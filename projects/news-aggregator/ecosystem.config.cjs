const path = require('path')
module.exports = {
  apps: [{
    name: 'nbi-news',
    script: 'start.cjs',
    cwd: path.resolve(__dirname),
    interpreter: 'node',
    node_args: ['--env-file=.env'],
    autorestart: true,
    max_restarts: 5,
    restart_delay: 3000,
    watch: false,
    out_file: 'logs/api.log',
    error_file: 'logs/api-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    env: { NODE_ENV: 'production', DOTENV_CONFIG_PATH: path.resolve(__dirname, '.env') },
    exec_mode: 'fork',
    instances: 1,
    kill_timeout: 5000,
    max_memory_restart: '500M',
  }],
}
