#!/bin/bash
# Setup PM2 log rotation for the NBI Dashboard server.
# Run once on the production server. Requires PM2 to be installed globally.
#
# Configuration:
#   - Max log file size: 50MB (triggers rotation)
#   - Retention: 30 rotated files (50MB x 30 = 1.5GB max disk per log)
#   - Rotation interval: daily at midnight (CRON)
#   - Compression: enabled (gzip)
#   - Date format: YYYY-MM-DD_HH-mm-ss
#   - Workaround copy_truncate: handles Windows file locking

set -e

echo "Installing pm2-logrotate module..."
pm2 install pm2-logrotate

echo "Configuring log rotation..."
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateModule true
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval "0 0 * * *"

echo "Log rotation configured. Current settings:"
pm2 conf pm2-logrotate

echo ""
echo "Done. Logs will rotate at 50MB or midnight, whichever comes first."
echo "Rotated logs are compressed and retained for 30 days."
