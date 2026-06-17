const axios = require('axios');

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://search-service:5000';

/**
 * Push a product document to the search index.
 * Fire-and-forget: failures are logged but never block the caller,
 * so search-service downtime doesn't break product CRUD operations.
 */
async function indexProduct(product) {
  try {
    await axios.post(`${SEARCH_SERVICE_URL}/api/search/index`, {
      id: String(product._id),
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock,
      sku: product.sku,
      isActive: product.isActive
    });
  } catch (err) {
    console.error('[web-service] Failed to index product in search-service:', err.message);
  }
}

/**
 * Remove a product document from the search index.
 */
async function removeProductFromIndex(productId) {
  try {
    await axios.delete(`${SEARCH_SERVICE_URL}/api/search/index/${productId}`);
  } catch (err) {
    console.error('[web-service] Failed to remove product from search-service:', err.message);
  }
}

module.exports = { indexProduct, removeProductFromIndex };
