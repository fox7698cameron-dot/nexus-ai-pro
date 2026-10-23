// src/api/payments.js
// 2026-10-23 - Payment API: Stripe subscriptions, crypto, gift cards
// All keys read from process.env - never hardcoded

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ─── Subscription tiers ───────────────────────────────────────────────────────
const TIERS = {
  free:       { name: 'Free',       price: 0,    priceId: process.env.STRIPE_PRICE_FREE       || null },
  pro:        { name: 'Pro',        price: 999,  priceId: process.env.STRIPE_PRICE_PRO        || null },
  enterprise: { name: 'Enterprise', price: 1499, priceId: process.env.STRIPE_PRICE_ENTERPRISE || null },
};

// ─── Lazy Stripe init (only when key is present) ──────────────────────────────
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const { default: Stripe } = await import('stripe');
    return new Stripe(key, { apiVersion: '2024-06-20' });
  } catch {
    return null;
  }
}

// ─── In-memory stores ─────────────────────────────────────────────────────────
/** @type {Map<string, object>} intentId → crypto payment intent */
const cryptoIntents = new Map();

/** @type {Map<string, { value: number, redeemed: boolean }>} code → gift card */
const giftCards = new Map([
  ['DEMO-GIFT-CARD-0001', { value: 999,  redeemed: false }],
  ['DEMO-GIFT-CARD-0002', { value: 1499, redeemed: false }],
]);

// Simulated BTC/ETH/SOL receive addresses (in production, generate via wallet API)
const CRYPTO_RECEIVE = {
  BTC: process.env.BTC_RECEIVE_ADDRESS || 'bc1q_demo_btc_address',
  ETH: process.env.ETH_RECEIVE_ADDRESS || '0x_demo_eth_address',
  SOL: process.env.SOL_RECEIVE_ADDRESS || 'demo_sol_address',
};

// ─── Stripe checkout ──────────────────────────────────────────────────────────

/** POST /api/payments/checkout */
router.post('/checkout', async (req, res) => {
  const { tier, successUrl, cancelUrl } = req.body || {};
  if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Payment provider not configured' });

  let stripe;
  try {
    const { default: Stripe } = await import('stripe');
    stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  } catch {
    return res.status(503).json({ error: 'Payment provider unavailable' });
  }

  const tierConfig = TIERS[tier];
  if (tier === 'free') {
    return res.json({ message: 'Free tier activated', tier: 'free' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: tierConfig.priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:5173'}/payment-success`,
      cancel_url:  cancelUrl  || `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
      metadata: { userId: req.user?.id || '', tier },
      billing_address_collection: 'auto',
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe session error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ─── Crypto payments ──────────────────────────────────────────────────────────

/** POST /api/payments/crypto/intent */
router.post('/crypto/intent', (req, res) => {
  const { currency, tier } = req.body || {};
  const supported = ['BTC', 'ETH', 'SOL'];
  if (!supported.includes(currency)) return res.status(400).json({ error: 'Unsupported currency' });
  if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });

  const intentId = uuidv4();
  const tierConfig = TIERS[tier];

  // Crypto amount approximations (demo values; use real rates from exchange API in production)
  const RATES = { BTC: 0.0000155, ETH: 0.00027, SOL: 0.011 };
  const amount = (tierConfig.price / 100 * RATES[currency]).toFixed(8);

  const intent = {
    id: intentId,
    userId: req.user?.id,
    currency,
    tier,
    amount,
    address: CRYPTO_RECEIVE[currency],
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 min
    confirmationNonce: crypto.randomBytes(8).toString('hex'),
  };

  cryptoIntents.set(intentId, intent);
  setTimeout(() => cryptoIntents.delete(intentId), 30 * 60 * 1000);

  res.json({ intentId, currency, amount, address: intent.address, expiresAt: intent.expiresAt });
});

/** GET /api/payments/crypto/status/:intentId */
router.get('/crypto/status/:intentId', (req, res) => {
  const intent = cryptoIntents.get(req.params.intentId);
  if (!intent) return res.status(404).json({ error: 'Intent not found or expired' });
  res.json({ status: intent.status, currency: intent.currency, amount: intent.amount });
});

// ─── Gift cards ───────────────────────────────────────────────────────────────

/** POST /api/payments/giftcard/redeem */
router.post('/giftcard/redeem', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  // Validate format: XXXX-XXXX-XXXX-XXXX (alphanumeric segments)
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid gift card format' });
  }

  const card = giftCards.get(code.toUpperCase());
  if (!card) return res.status(404).json({ error: 'Gift card not found' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });

  card.redeemed = true;
  card.redeemedBy = req.user?.id;
  card.redeemedAt = Date.now();

  res.json({ message: 'Gift card redeemed', value: card.value, currency: 'USD_CENTS' });
});

// ─── Stripe webhook ───────────────────────────────────────────────────────────

/** POST /api/payments/webhook */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(503).json({ error: 'Webhook not configured' });

  let event;
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // In production: update user tier in DB
      break;
    case 'customer.subscription.deleted':
      // In production: downgrade user to free
      break;
    case 'invoice.payment_failed':
      // In production: notify user
      break;
  }

  res.json({ received: true });
});

/** GET /api/payments/tiers */
router.get('/tiers', (req, res) => {
  const safe = Object.entries(TIERS).map(([key, t]) => ({
    id: key,
    name: t.name,
    price: t.price,
    currency: 'USD_CENTS',
  }));
  res.json(safe);
});

export default router;
