const express = require('express');
const axios = require('axios');

const router = express.Router();
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://search-service:5000';

// GET /api/search/products - proxy to search-service
router.get('/products', async (req, res) => {
  try {
    const response = await axios.get(`${SEARCH_SERVICE_URL}/api/search/products`, {
      params: req.query
    });
    res.json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    res.status(503).json({ error: 'Search service unavailable' });
  }
});

// GET /api/search/suggest - proxy to search-service
router.get('/suggest', async (req, res) => {
  try {
    const response = await axios.get(`${SEARCH_SERVICE_URL}/api/search/suggest`, {
      params: req.query
    });
    res.json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    res.status(503).json({ error: 'Search service unavailable' });
  }
});

module.exports = router;
