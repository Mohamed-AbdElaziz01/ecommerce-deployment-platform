const express = require('express');
const Product = require('../models/Product');
const { indexProduct, removeProductFromIndex } = require('../utils/searchClient');

const router = express.Router();

// GET /api/products - list with pagination, filtering, search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, minPrice, maxPrice } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Product.countDocuments(filter)
    ]);

    res.json({
      data: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Invalid product id' });
  }
});

// POST /api/products - create
router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    indexProduct(product); // fire-and-forget sync to search-service
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/products/:id - update
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    indexProduct(product); // fire-and-forget sync to search-service
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id - soft delete
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    removeProductFromIndex(product._id); // fire-and-forget removal from search-service
    res.json({ message: 'Product deactivated', product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/products/:id/stock - update stock (used for order processing)
router.patch('/:id/stock', async (req, res) => {
  try {
    const { delta } = req.body; // e.g. -1 to decrement
    if (typeof delta !== 'number') {
      return res.status(400).json({ error: 'delta must be a number' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const newStock = product.stock + delta;
    if (newStock < 0) return res.status(409).json({ error: 'Insufficient stock' });

    product.stock = newStock;
    await product.save();
    indexProduct(product); // fire-and-forget sync to search-service
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
