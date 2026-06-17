const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/Transaction');
const { paymentsTotal } = require('../utils/metrics');

const router = express.Router();

// Simulated processing delay (ms) - mimics calling a real payment gateway
const PROCESSING_DELAY_MS = Number(process.env.PROCESSING_DELAY_MS || 300);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/payments/charge
 * Mock charge endpoint. Simulates a real payment gateway:
 * - Card numbers ending in "0000" or amount <= 0 => declined
 * - Card numbers ending in "1111" => simulated gateway error
 * - Everything else => succeeded
 *
 * Body: { orderId, amount, currency, paymentMethod: { cardNumber, cardHolder, expiry, cvv } }
 */
router.post('/charge', async (req, res) => {
  try {
    const { orderId, amount, currency = 'USD', paymentMethod = {} } = req.body;

    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    await delay(PROCESSING_DELAY_MS);

    const cardNumber = paymentMethod.cardNumber || '4242424242424242';
    const cardLast4 = cardNumber.slice(-4);

    // Simulated gateway error (e.g. network/timeout)
    if (cardLast4 === '1111') {
      paymentsTotal.inc({ status: 'gateway_error' });
      return res.status(502).json({
        error: 'Payment gateway unavailable, please try again'
      });
    }

    // Simulated declined card
    if (cardLast4 === '0000') {
      const failedTx = await Transaction.create({
        transactionId: `txn_${uuidv4()}`,
        orderId,
        amount,
        currency,
        status: 'failed',
        paymentMethod: { type: 'card', cardLast4 },
        failureReason: 'card_declined'
      });
      paymentsTotal.inc({ status: 'declined' });
      return res.status(402).json({
        error: 'Card declined',
        transactionId: failedTx.transactionId
      });
    }

    // Successful charge
    const transaction = await Transaction.create({
      transactionId: `txn_${uuidv4()}`,
      orderId,
      amount,
      currency,
      status: 'succeeded',
      paymentMethod: { type: 'card', cardLast4 }
    });

    paymentsTotal.inc({ status: 'succeeded' });

    res.status(201).json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payments/:transactionId
 * Retrieve a transaction by id
 */
router.get('/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/:transactionId/refund
 * Mock refund endpoint
 */
router.post('/:transactionId/refund', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    if (transaction.status !== 'succeeded') {
      return res.status(409).json({ error: 'Only succeeded transactions can be refunded' });
    }

    await delay(PROCESSING_DELAY_MS);

    transaction.status = 'refunded';
    await transaction.save();

    res.json({ transactionId: transaction.transactionId, status: transaction.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
