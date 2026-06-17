const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Liveness probe - is the process alive
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe - is DB connection ready
router.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (dbState === 1) {
    return res.status(200).json({ status: 'ready', db: 'connected' });
  }
  return res.status(503).json({ status: 'not_ready', db: 'disconnected' });
});

module.exports = router;
