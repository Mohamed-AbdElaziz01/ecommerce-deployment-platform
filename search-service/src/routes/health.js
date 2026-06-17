const express = require('express');
const { esClient } = require('../config/elasticsearch');

const router = express.Router();

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (req, res) => {
  try {
    const health = await esClient.cluster.health();
    if (health.status === 'red') {
      return res.status(503).json({ status: 'not_ready', elasticsearch: health.status });
    }
    res.status(200).json({ status: 'ready', elasticsearch: health.status });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: err.message });
  }
});

module.exports = router;
