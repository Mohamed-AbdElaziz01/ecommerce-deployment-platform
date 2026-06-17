require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const healthRoutes = require('./routes/health');
const paymentRoutes = require('./routes/payments');
const { metricsMiddleware, metricsHandler } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 4000;

connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(metricsMiddleware);

app.get('/metrics', metricsHandler);

app.use('/health', healthRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.json({ service: 'payment-service', status: 'running', version: '1.0.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[payment-service] Server running on port ${PORT}`);
});

module.exports = app;
