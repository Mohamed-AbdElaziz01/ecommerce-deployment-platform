require('dotenv').config();
const mongoose = require('mongoose');
const { esClient, PRODUCTS_INDEX, ensureIndex } = require('./config/elasticsearch');

// Minimal product schema, just enough to read existing documents
const Product = mongoose.model(
  'Product',
  new mongoose.Schema({}, { strict: false, collection: 'products' })
);

async function reindex() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/ecommerce';
  await mongoose.connect(mongoUri);
  console.log(`[search-service] Connected to MongoDB: ${mongoUri}`);

  await ensureIndex();

  const products = await Product.find({}).lean();
  console.log(`[search-service] Found ${products.length} products to index`);

  if (products.length === 0) {
    console.log('[search-service] Nothing to index.');
    return process.exit(0);
  }

  const operations = products.flatMap((p) => [
    { index: { _index: PRODUCTS_INDEX, _id: String(p._id) } },
    {
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      stock: p.stock,
      sku: p.sku,
      isActive: p.isActive
    }
  ]);

  const result = await esClient.bulk({ refresh: true, operations });

  if (result.errors) {
    const failed = result.items.filter((item) => item.index?.error);
    console.error(`[search-service] ${failed.length} documents failed to index`);
    console.error(JSON.stringify(failed.slice(0, 3), null, 2));
  } else {
    console.log(`[search-service] Successfully indexed ${products.length} products`);
  }

  process.exit(0);
}

reindex().catch((err) => {
  console.error('[search-service] Reindex failed:', err.message);
  process.exit(1);
});
