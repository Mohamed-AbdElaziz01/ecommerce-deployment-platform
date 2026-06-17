const client = require('prom-client');

// Collect default Node.js process metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ prefix: 'web_service_' });

// HTTP request duration histogram, labeled by method/route/status
const httpRequestDuration = new client.Histogram({
  name: 'web_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

// Total HTTP requests counter
const httpRequestsTotal = new client.Counter({
  name: 'web_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

/**
 * Express middleware that records request duration and count.
 * Uses req.route?.path when available for low-cardinality labels.
 */
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationSeconds = Number(durationNs) / 1e9;

    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode
    };

    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
}

/**
 * Express route handler exposing metrics in Prometheus text format.
 */
async function metricsHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler, register: client.register };
