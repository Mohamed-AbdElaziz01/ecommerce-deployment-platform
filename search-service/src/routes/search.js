const express = require('express');
const { esClient, PRODUCTS_INDEX } = require('../config/elasticsearch');

const router = express.Router();

/**
 * GET /api/search/products?q=keyword&category=electronics&minPrice=&maxPrice=&page=1&limit=20
 * Full-text search across product name and description, with optional filters.
 */
router.get('/products', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const from = (Number(page) - 1) * Number(limit);

    const must = [];
    const filter = [{ term: { isActive: true } }];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^2', 'description', 'category'],
          fuzziness: 'AUTO'
        }
      });
    }

    if (category) filter.push({ term: { category } });

    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) range.gte = Number(minPrice);
      if (maxPrice) range.lte = Number(maxPrice);
      filter.push({ range: { price: range } });
    }

    const query = {
      bool: {
        must: must.length ? must : [{ match_all: {} }],
        filter
      }
    };

    const result = await esClient.search({
      index: PRODUCTS_INDEX,
      from,
      size: Number(limit),
      query
    });

    const hits = result.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source
    }));

    res.json({
      data: hits,
      pagination: {
        total: result.hits.total.value,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(result.hits.total.value / Number(limit))
      }
    });
  } catch (err) {
    if (err.meta?.statusCode === 404) {
      return res.json({ data: [], pagination: { total: 0, page: 1, limit: Number(limit), pages: 0 } });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/suggest?q=keyword
 * Lightweight autocomplete based on product name prefix matching.
 */
router.get('/suggest', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ suggestions: [] });

    const result = await esClient.search({
      index: PRODUCTS_INDEX,
      size: 5,
      _source: ['name'],
      query: {
        match_phrase_prefix: {
          name: q
        }
      }
    });

    const suggestions = result.hits.hits.map((hit) => hit._source.name);
    res.json({ suggestions });
  } catch (err) {
    if (err.meta?.statusCode === 404) return res.json({ suggestions: [] });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/search/index
 * Index or update a single product document. Called by web-service whenever
 * a product is created/updated, keeping Elasticsearch in sync with MongoDB.
 * Body: { id, name, description, category, price, stock, sku, isActive }
 */
router.post('/index', async (req, res) => {
  try {
    const { id, ...doc } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    await esClient.index({
      index: PRODUCTS_INDEX,
      id,
      document: doc,
      refresh: true
    });

    res.status(201).json({ message: 'Indexed', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/search/index/:id
 * Remove a product document from the index.
 */
router.delete('/index/:id', async (req, res) => {
  try {
    await esClient.delete({
      index: PRODUCTS_INDEX,
      id: req.params.id,
      refresh: true
    });
    res.json({ message: 'Removed from index', id: req.params.id });
  } catch (err) {
    if (err.meta?.statusCode === 404) {
      return res.status(404).json({ error: 'Document not found in index' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
