const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/payments';
    await mongoose.connect(uri);
    console.log(`[payment-service] MongoDB connected: ${uri}`);
  } catch (err) {
    console.error('[payment-service] MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
