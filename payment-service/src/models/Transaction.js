const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'refunded'],
      required: true
    },
    paymentMethod: {
      type: { type: String, default: 'card' },
      cardLast4: String
    },
    failureReason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
