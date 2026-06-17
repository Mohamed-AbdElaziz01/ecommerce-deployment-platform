require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleProducts = [
  {
    name: 'Wireless Headphones',
    description: 'Over-ear Bluetooth headphones with noise cancellation',
    price: 79.99,
    category: 'electronics',
    stock: 50,
    sku: 'ELEC-HEAD-001'
  },
  {
    name: 'Smart Watch',
    description: 'Fitness tracker with heart rate monitor',
    price: 129.99,
    category: 'electronics',
    stock: 30,
    sku: 'ELEC-WATCH-001'
  },
  {
    name: 'Cotton T-Shirt',
    description: 'Plain cotton t-shirt, available in multiple sizes',
    price: 14.99,
    category: 'clothing',
    stock: 200,
    sku: 'CLOTH-TSHIRT-001'
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: '1L insulated water bottle',
    price: 19.99,
    category: 'home',
    stock: 100,
    sku: 'HOME-BOTTLE-001'
  }
];

async function seed() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/ecommerce';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding...');

    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);

    console.log(`Seeded ${sampleProducts.length} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
