const { Client } = require('@elastic/elasticsearch');

const ES_NODE = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';

const esClient = new Client({ node: ES_NODE });

const PRODUCTS_INDEX = 'products';

async function ensureIndex() {
  const exists = await esClient.indices.exists({ index: PRODUCTS_INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: PRODUCTS_INDEX,
      mappings: {
        properties: {
          name: { type: 'text' },
          description: { type: 'text' },
          category: { type: 'keyword' },
          price: { type: 'float' },
          stock: { type: 'integer' },
          sku: { type: 'keyword' },
          isActive: { type: 'boolean' }
        }
      }
    });
    console.log(`[search-service] Created index "${PRODUCTS_INDEX}"`);
  }
}

module.exports = { esClient, PRODUCTS_INDEX, ensureIndex };
