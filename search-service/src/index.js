require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { ensureIndex } = require('./config/elasticsearch');
const healthRoutes = require('./routes/health');
const searchRoutes = require('./routes/search');
const { metricsMiddleware, metricsHandler } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(metricsMiddleware);

app.get('/metrics', metricsHandler);

app.use('/health', healthRoutes);
app.use('/api/search', searchRoutes);

app.get('/', (req, res) => {
  res.json({ service: 'search-service', status: 'running', version: '1.0.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Ensure the products index exists before accepting traffic
ensureIndex()
  .catch((err) => console.error('[search-service] Failed to ensure index:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[search-service] Server running on port ${PORT}`);
    });
  });

module.exports = app;
