// File: src/routes/payments.js | Created: 2026-08-31 | Nexus AI Pro
// Payment routes: Stripe subscriptions, crypto, gift cards
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be in .env - never hardcoded

import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─────────────────────────────────────────
// Subscription tiers
// ─────────────────────────────────────────

export const TIERS = {
  free: {
    id:         'free',
    name:       'Free',
    priceUsd:   0,
    stripePriceId: process.env.STRIPE_PRICE_FREE || null,
    features:   ['5 requests/day', 'Basic models', '1 MB uploads'],
    limits:     { dailyRequests: 5, uploadMbMax: 1 }
  },
  pro: {
    id:         'pro',
    name:       'Pro',
    priceUsd:   9.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    features:   ['Unlimited requests', 'All models', '100 MB uploads', 'Priority support'],
    limits:     { dailyRequests: Infinity, uploadMbMax: 100 }
  },
  enterprise: {
    id:         'enterprise',
    name:       'Enterprise',
    priceUsd:   14.99,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || null,
    features:   ['Everything in Pro', 'Custom models', 'API access', 'SLA', 'Dedicated support'],
    limits:     { dailyRequests: Infinity, uploadMbMax: 1024 }
  }
};

// ─────────────────────────────────────────
// In-memory order store (replace with DB)
// ─────────────────────────────────────────
const orders = new Map();
const subscriptions = new Map();
const giftCards = new Map([
  // Sample gift cards - in prod stored encrypted in DB
  ['NEXUS-DEMO-2026', { value: 9.99, used: false, currency: 'USD' }],
  ['NEXUS-ENT-2026',  { value: 14.99, used: false, currency: 'USD' }]
]);

// ─────────────────────────────────────────
// Stripe helper (dynamic import avoids crash if SDK not installed)
// ─────────────────────────────────────────

async function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured. Add it to .env');
  }
  try {
    const { default: Stripe } = await import('stripe');
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  } catch {
    throw new Error('Stripe SDK not installed. Run: npm install stripe');
  }
}

// ─────────────────────────────────────────
// Routes
// ─────────────────────────────────────────

/** GET /api/payments/tiers */
router.get('/tiers', (req, res) => {
  res.json({ tiers: Object.values(TIERS) });
});

/** POST /api/payments/checkout - create Stripe checkout session */
router.post('/checkout', requireAuth, async (req, res) => {
  const { tierId, successUrl, cancelUrl, coupon } = req.body;

  if (!TIERS[tierId]) {
    return res.status(400).json({ error: `Unknown tier. Options: ${Object.keys(TIERS).join(', ')}` });
  }

  const tier = TIERS[tierId];
  if (tier.priceUsd === 0) {
    // Activate free tier immediately
    subscriptions.set(req.user.id, { userId: req.user.id, tierId, status: 'active', startedAt: new Date().toISOString() });
    return res.json({ tier: 'free', status: 'activated' });
  }

  if (!tier.stripePriceId) {
    return res.status(503).json({ error: `Stripe price ID not configured for ${tierId}. Set STRIPE_PRICE_${tierId.toUpperCase()} in .env` });
  }

  try {
    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({
      mode:       'subscription',
      line_items: [{ price: tier.stripePriceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:5173'}/dashboard?payment=success`,
      cancel_url:  cancelUrl  || `${process.env.APP_URL || 'http://localhost:5173'}/pricing?payment=cancelled`,
      metadata:    { userId: req.user.id, tierId },
      allow_promotion_codes: true,
      ...(coupon ? { discounts: [{ coupon }] } : {})
    });

    orders.set(session.id, { sessionId: session.id, userId: req.user.id, tierId, status: 'pending', createdAt: new Date().toISOString() });
    res.json({ checkoutUrl: session.url, sessionId: session.id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/payments/crypto - initiate crypto payment */
router.post('/crypto', requireAuth, async (req, res) => {
  const { tierId, currency } = req.body;
  const supported = ['BTC', 'ETH', 'USDC', 'SOL'];

  if (!TIERS[tierId] || TIERS[tierId].priceUsd === 0) {
    return res.status(400).json({ error: 'Invalid tier for crypto payment' });
  }
  if (!supported.includes(currency)) {
    return res.status(400).json({ error: `Supported currencies: ${supported.join(', ')}` });
  }

  const orderId = uuidv4();
  const tier    = TIERS[tierId];

  // In production: use Coinbase Commerce or NOWPayments SDK with env-var API keys
  // CRYPTO_PAYMENT_API_KEY must be in .env
  const mockAddress = {
    BTC:  process.env.BTC_RECEIVE_ADDRESS  || 'Set BTC_RECEIVE_ADDRESS in .env',
    ETH:  process.env.ETH_RECEIVE_ADDRESS  || 'Set ETH_RECEIVE_ADDRESS in .env',
    USDC: process.env.USDC_RECEIVE_ADDRESS || 'Set USDC_RECEIVE_ADDRESS in .env',
    SOL:  process.env.SOL_RECEIVE_ADDRESS  || 'Set SOL_RECEIVE_ADDRESS in .env'
  };

  const order = {
    id:        orderId,
    userId:    req.user.id,
    tierId,
    currency,
    amountUsd: tier.priceUsd,
    address:   mockAddress[currency],
    status:    'awaiting_payment',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: new Date().toISOString()
  };

  orders.set(orderId, order);
  res.json(order);
});

/** POST /api/payments/gift-card - redeem gift card */
router.post('/gift-card', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Gift card code required' });

  const card = giftCards.get(code.trim().toUpperCase());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.used)  return res.status(409).json({ error: 'Gift card already used' });

  giftCards.set(code.trim().toUpperCase(), { ...card, used: true, usedBy: req.user.id, usedAt: new Date().toISOString() });

  // Determine which tier the card value covers
  const tierId = card.value >= 14.99 ? 'enterprise' : card.value >= 9.99 ? 'pro' : 'free';
  subscriptions.set(req.user.id, {
    userId:    req.user.id,
    tierId,
    status:    'active',
    source:    'gift_card',
    startedAt: new Date().toISOString()
  });

  res.json({ redeemed: true, value: card.value, currency: card.currency, tier: tierId });
});

/** GET /api/payments/subscription */
router.get('/subscription', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.id) || { tierId: 'free', status: 'active' };
  res.json({ subscription: sub, tier: TIERS[sub.tierId] || TIERS.free });
});

/** POST /api/payments/webhook - Stripe webhook handler */
router.post('/webhook', express_raw_body_middleware, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });
  }

  let event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object;
    const { userId, tierId } = session.metadata || {};
    if (userId && tierId) {
      subscriptions.set(userId, { userId, tierId, status: 'active', stripeSessionId: session.id, startedAt: new Date().toISOString() });
      const order = orders.get(session.id);
      if (order) orders.set(session.id, { ...order, status: 'completed' });
    }
    break;
  }
  case 'customer.subscription.deleted': {
    const sub = event.data.object;
    // Downgrade to free on cancellation
    const userId = sub.metadata?.userId;
    if (userId) subscriptions.set(userId, { userId, tierId: 'free', status: 'active', startedAt: new Date().toISOString() });
    break;
  }
  }

  res.json({ received: true });
});

// Raw body middleware for Stripe webhook signature verification
function express_raw_body_middleware(req, res, next) {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end',  () => { req.rawBody = raw; next(); });
}

export default router;
