// lib/metrics.js — Prometheus metrics setup, counters, timing middleware
const { log } = require('./logger');

let promClient;
try { promClient = require('prom-client'); } catch(e) { log('warn', 'Metrics', 'prom-client not installed, /metrics disabled'); }

function setupMetrics(app, pool) {
  if (!promClient) return { syncConflicts: null, authFailures: null, ocrRequests: null, emailSends: null };

  promClient.collectDefaultMetrics({ prefix: 'nbi_' });

  const httpDuration = new promClient.Histogram({
    name: 'nbi_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
  });

  const httpRequests = new promClient.Counter({
    name: 'nbi_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  });

  const dbPoolGauge = new promClient.Gauge({
    name: 'nbi_db_pool_connections',
    help: 'Database connection pool stats',
    labelNames: ['state']
  });

  app.use((req, res, next) => {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path || req.path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
      end({ method: req.method, route, status: res.statusCode });
      httpRequests.inc({ method: req.method, route, status: res.statusCode });
    });
    next();
  });

  setInterval(() => {
    dbPoolGauge.set({ state: 'total' }, pool.totalCount);
    dbPoolGauge.set({ state: 'idle' }, pool.idleCount);
    dbPoolGauge.set({ state: 'waiting' }, pool.waitingCount);
  }, 15000).unref();

  app.get('/metrics', async (req, res) => {
    const ip = req.socket.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
      return res.status(403).json({ error: 'Metrics available from localhost only' });
    }
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });

  const syncConflicts = new promClient.Counter({ name: 'nbi_sync_conflicts_total', help: 'Sync conflict count' });
  const authFailures = new promClient.Counter({ name: 'nbi_auth_failures_total', help: 'Auth failure count' });
  const ocrRequests = new promClient.Counter({ name: 'nbi_ocr_requests_total', help: 'OCR request count', labelNames: ['status'] });
  const emailSends = new promClient.Counter({ name: 'nbi_email_sends_total', help: 'Email send count', labelNames: ['status'] });
  const granolaImported = new promClient.Counter({ name: 'nbi_granola_sync_imported_total', help: 'Granola meetings imported' });
  const granolaLastSuccess = new promClient.Gauge({ name: 'nbi_granola_sync_last_success', help: 'Timestamp of last successful Granola sync' });
  const granolaErrors = new promClient.Counter({ name: 'nbi_granola_sync_errors_total', help: 'Granola sync errors' });

  return { syncConflicts, authFailures, ocrRequests, emailSends, granolaImported, granolaLastSuccess, granolaErrors };
}

module.exports = { setupMetrics };
