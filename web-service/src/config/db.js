const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/ecommerce';
    await mongoose.connect(uri);
    console.log(`[web-service] MongoDB connected: ${uri}`);
  } catch (err) {
    console.error('[web-service] MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
