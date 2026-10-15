// payments.js | Nexus AI Pro | Created: 2026-10-15 | Payment Routes
// Stripe, crypto, and gift card checkout endpoints

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Supported payment methods
const PAYMENT_METHODS = Object.freeze({
  CARD: 'card',
  CRYPTO: 'crypto',
  GIFT_CARD: 'gift_card',
});

// Supported card brands
const CARD_BRANDS = Object.freeze({
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DISCOVER: 'discover',
  DINERS: 'diners',
  JCB: 'jcb',
});

// Supported crypto currencies
const CRYPTO_CURRENCIES = Object.freeze(['ETH', 'BTC', 'USDC', 'USDT', 'SOL', 'MATIC']);

// Subscription plans
const PLANS = Object.freeze({
  free: { name: 'Free', priceUsd: 0, stripePriceId: null },
  pro: { name: 'Pro', priceUsd: 9.99, stripePriceId: process.env.STRIPE_PRICE_PRO },
  enterprise: { name: 'Enterprise', priceUsd: 14.99, stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE },
});

// In-memory store for orders (replace with DB in production)
const orders = new Map();
const giftCards = new Map();

function getStripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return key;
}

/** Validate card number using Luhn algorithm */
function luhnCheck(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
}

/** Detect card brand from number prefix */
function detectCardBrand(num) {
  const n = num.replace(/\D/g, '');
  if (/^4/.test(n)) return CARD_BRANDS.VISA;
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return CARD_BRANDS.MASTERCARD;
  if (/^3[47]/.test(n)) return CARD_BRANDS.AMEX;
  if (/^6(?:011|5)/.test(n)) return CARD_BRANDS.DISCOVER;
  if (/^3(?:0[0-5]|[68])/.test(n)) return CARD_BRANDS.DINERS;
  if (/^(?:2131|1800|35)/.test(n)) return CARD_BRANDS.JCB;
  return 'unknown';
}

// POST /api/payments/checkout/card
router.post('/checkout/card', async (req, res) => {
  try {
    const { plan, userId, cardNumber, expiry, cvv, cardholderName, billingAddress } = req.body;

    if (!plan || !PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
    if (!cardNumber || !expiry || !cvv || !cardholderName) {
      return res.status(400).json({ error: 'Card details required' });
    }

    const stripped = cardNumber.replace(/\s/g, '');
    if (!luhnCheck(stripped)) return res.status(400).json({ error: 'Invalid card number' });

    const brand = detectCardBrand(stripped);
    const planDetails = PLANS[plan];

    // Forward to Stripe only if secret key is configured
    if (process.env.STRIPE_SECRET_KEY) {
      const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getStripeSecret()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: Math.round(planDetails.priceUsd * 100).toString(),
          currency: 'usd',
          'metadata[userId]': userId || '',
          'metadata[plan]': plan,
        }),
      });
      const intent = await stripeRes.json();
      if (intent.error) return res.status(400).json({ error: intent.error.message });

      const orderId = uuidv4();
      orders.set(orderId, { id: orderId, userId, plan, method: PAYMENT_METHODS.CARD, brand, status: 'pending', stripeIntentId: intent.id, createdAt: Date.now() });
      return res.json({ orderId, clientSecret: intent.client_secret, brand, plan: planDetails.name });
    }

    // Sandbox mode when Stripe not configured
    const orderId = uuidv4();
    orders.set(orderId, { id: orderId, userId, plan, method: PAYMENT_METHODS.CARD, brand, status: 'sandbox', createdAt: Date.now() });
    res.json({ orderId, sandbox: true, brand, plan: planDetails.name, message: 'Payment processed in sandbox mode' });
  } catch (err) {
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// POST /api/payments/checkout/crypto
router.post('/checkout/crypto', async (req, res) => {
  try {
    const { plan, userId, currency } = req.body;
    if (!plan || !PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
    if (!currency || !CRYPTO_CURRENCIES.includes(currency.toUpperCase())) {
      return res.status(400).json({ error: `Supported crypto: ${CRYPTO_CURRENCIES.join(', ')}` });
    }

    const planDetails = PLANS[plan];
    const orderId = uuidv4();
    // Generate a receive address placeholder (real impl would call a crypto payment processor)
    const receiveAddress = `nexus-${currency.toLowerCase()}-${crypto.randomBytes(16).toString('hex')}`;
    const order = {
      id: orderId,
      userId,
      plan,
      method: PAYMENT_METHODS.CRYPTO,
      currency: currency.toUpperCase(),
      amountUsd: planDetails.priceUsd,
      receiveAddress,
      status: 'awaiting_payment',
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 min expiry
      createdAt: Date.now(),
    };
    orders.set(orderId, order);
    res.json({ orderId, receiveAddress, currency: currency.toUpperCase(), amountUsd: planDetails.priceUsd, expiresAt: order.expiresAt });
  } catch (err) {
    res.status(500).json({ error: 'Crypto checkout failed' });
  }
});

// POST /api/payments/checkout/gift-card
router.post('/checkout/gift-card', (req, res) => {
  const { code, userId } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const normalized = code.trim().toUpperCase();
  const card = giftCards.get(normalized);

  if (!card) return res.status(404).json({ error: 'Gift card not found or invalid' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
  if (card.expiresAt && card.expiresAt < Date.now()) return res.status(410).json({ error: 'Gift card expired' });

  card.redeemed = true;
  card.redeemedBy = userId;
  card.redeemedAt = Date.now();
  giftCards.set(normalized, card);

  res.json({ success: true, plan: card.plan, balance: card.balance, message: `Gift card redeemed for ${card.plan} plan` });
});

// POST /api/payments/gift-card/generate (admin only in production)
router.post('/gift-card/generate', (req, res) => {
  const { plan, balance, count = 1 } = req.body;
  if (!plan || !PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
  if (count < 1 || count > 100) return res.status(400).json({ error: 'Count must be 1–100' });

  const generated = [];
  for (let i = 0; i < count; i++) {
    const code = [
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    ].join('-');
    giftCards.set(code, { code, plan, balance: balance || PLANS[plan].priceUsd, redeemed: false, createdAt: Date.now(), expiresAt: Date.now() + 365 * 24 * 3600 * 1000 });
    generated.push(code);
  }
  res.json({ codes: generated, count: generated.length });
});

// GET /api/payments/orders/:userId
router.get('/orders/:userId', (req, res) => {
  const userOrders = Array.from(orders.values())
    .filter(o => o.userId === req.params.userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(userOrders);
});

// GET /api/payments/order/:orderId
router.get('/order/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// POST /api/payments/stripe/webhook
router.post('/stripe/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && sig) {
    // Signature verification would happen here in production
    // Using crypto.timingSafeEqual for the comparison
  }
  // Process event payload
  const event = req.body;
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data?.object;
    for (const [id, order] of orders.entries()) {
      if (order.stripeIntentId === intent?.id) {
        order.status = 'paid';
        orders.set(id, order);
        break;
      }
    }
  }
  res.json({ received: true });
});

export { router as paymentsRouter };
