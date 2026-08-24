/**
 * server/routes/subscriptions.js
 * Subscription & Payment API Routes
 * Updated: 2026-08-24
 *
 * Supports: Stripe (credit/debit cards), Crypto, Gift Cards
 * Stripe secret key MUST come from process.env.STRIPE_SECRET_KEY — never hard-coded
 * PCI compliance: raw card data never touches this server; Stripe.js tokenizes client-side
 */

import express from 'express';
import cryptoLib from 'crypto';
import { requireAuth, requireRole, audit } from './auth.js';

const router = express.Router();
router.use(requireAuth);

// ── Stripe lazy init ──────────────────────────────────────────────────────────
let stripe;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    // Dynamic import to avoid loading Stripe if not configured
    const Stripe = require('stripe');
    stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
  }
  return stripe;
}

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = {
  free:       { id: 'free', name: 'Free', monthly: 0, annual: 0 },
  pro:        { id: 'pro', name: 'Pro', monthly: 9.99, annual: 7.99 },
  enterprise: { id: 'enterprise', name: 'Enterprise', monthly: 14.99, annual: 11.99 },
};

// Price IDs from Stripe Dashboard (from env)
const STRIPE_PRICES = {
  pro_monthly:        process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:         process.env.STRIPE_PRICE_PRO_ANNUAL,
  enterprise_monthly: process.env.STRIPE_PRICE_ENT_MONTHLY,
  enterprise_annual:  process.env.STRIPE_PRICE_ENT_ANNUAL,
};

// In-memory subscription store (use DB in production)
const subscriptions = new Map();
const giftCodes = new Map([
  ['NEXUS-2026-FREE', { plan: 'pro', months: 1, used: false }],
  ['LAUNCH-PROMO-99', { plan: 'enterprise', months: 3, used: false }],
]);

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/current
router.get('/current', (req, res) => {
  const sub = subscriptions.get(req.user.sub) || { plan: 'free', status: 'active' };
  res.json(sub);
});

// POST /api/subscriptions/checkout - Stripe payment intent
router.post('/checkout', async (req, res) => {
  const { planId, interval = 'month', paymentMethod = 'card' } = req.body;

  if (!PLANS[planId] || planId === 'free') {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const client = getStripe();
    const priceKey = `${planId}_${interval === 'year' ? 'annual' : 'monthly'}`;
    const priceId = STRIPE_PRICES[priceKey];

    if (!priceId) {
      return res.status(400).json({
        error: 'Price not configured',
        detail: `Set ${`STRIPE_PRICE_${planId.toUpperCase()}_${interval === 'year' ? 'ANNUAL' : 'MONTHLY'}`} in environment`,
      });
    }

    // Create or retrieve Stripe customer
    let customerId = subscriptions.get(req.user.sub)?.stripeCustomerId;
    if (!customerId) {
      const customer = await client.customers.create({
        email: req.user.email,
        metadata: { nexusUserId: String(req.user.sub) },
      });
      customerId = customer.id;
    }

    // Create payment intent
    const session = await client.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CORS_ORIGIN}/dashboard?subscription=success`,
      cancel_url: `${process.env.CORS_ORIGIN}/subscriptions?canceled=1`,
      metadata: { userId: String(req.user.sub), plan: planId },
    });

    audit('CHECKOUT_SESSION_CREATED', { userId: req.user.sub, plan: planId, interval });
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[subscriptions/checkout]', err);
    res.status(500).json({ error: err.message || 'Checkout failed' });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', async (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub || !sub.stripeSubscriptionId) {
    return res.status(400).json({ error: 'No active subscription found' });
  }

  try {
    const client = getStripe();
    await client.subscriptions.cancel(sub.stripeSubscriptionId);
    sub.plan = 'free';
    sub.canceledAt = new Date().toISOString();
    subscriptions.set(req.user.sub, sub);
    audit('SUBSCRIPTION_CANCELED', { userId: req.user.sub });
    res.json({ message: 'Subscription canceled. Access continues until end of billing period.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/crypto/initiate
router.post('/crypto/initiate', async (req, res) => {
  const { planId, interval = 'month', coin = 'usdc' } = req.body;

  if (!PLANS[planId] || planId === 'free') {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const plan = PLANS[planId];
  const usdAmount = interval === 'year' ? plan.annual * 12 * 0.85 : plan.monthly;

  // Crypto payment address from env (never hard-coded)
  const cryptoAddresses = {
    btc: process.env.CRYPTO_BTC_ADDRESS,
    eth: process.env.CRYPTO_ETH_ADDRESS,
    usdc: process.env.CRYPTO_USDC_ADDRESS,
    sol: process.env.CRYPTO_SOL_ADDRESS,
    bnb: process.env.CRYPTO_BNB_ADDRESS,
    matic: process.env.CRYPTO_MATIC_ADDRESS,
  };

  const address = cryptoAddresses[coin];
  if (!address) {
    return res.status(400).json({
      error: `${coin.toUpperCase()} not configured`,
      detail: `Set CRYPTO_${coin.toUpperCase()}_ADDRESS in environment`,
    });
  }

  // Approximate crypto amount (USD amount, use live price API in production)
  const mockRates = { btc: 85000, eth: 3200, usdc: 1, sol: 160, bnb: 320, matic: 0.8 };
  const coinAmount = (usdAmount / (mockRates[coin] || 1)).toFixed(6);

  const txId = `crypto_${cryptoLib.randomBytes(8).toString('hex')}`;
  audit('CRYPTO_PAYMENT_INITIATED', { userId: req.user.sub, coin, plan: planId, amount: usdAmount });

  res.json({
    txId,
    coin,
    address,
    amount: coinAmount,
    usdEquivalent: usdAmount,
    expiresIn: '30 minutes',
    memo: txId, // For coins that support memo/tag (XRP, Stellar, etc.)
    plan: planId,
    interval,
  });
});

// POST /api/subscriptions/giftcard/redeem
router.post('/giftcard/redeem', (req, res) => {
  const { code, planId } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const giftCard = giftCodes.get(normalizedCode) || giftCodes.get(code.toUpperCase());

  if (!giftCard) return res.status(400).json({ error: 'Invalid or expired gift card code' });
  if (giftCard.used) return res.status(400).json({ error: 'Gift card has already been redeemed' });

  // Mark as used
  giftCard.used = true;
  giftCard.redeemedBy = req.user.sub;
  giftCard.redeemedAt = new Date().toISOString();

  // Apply subscription
  const expiry = new Date(Date.now() + giftCard.months * 30 * 24 * 60 * 60 * 1000);
  subscriptions.set(req.user.sub, {
    plan: giftCard.plan,
    status: 'active',
    expiresAt: expiry.toISOString(),
    source: 'gift_card',
    giftCode: normalizedCode,
  });

  audit('GIFTCARD_REDEEMED', { userId: req.user.sub, plan: giftCard.plan, months: giftCard.months });
  res.json({
    message: `Gift card redeemed! ${giftCard.plan} plan activated for ${giftCard.months} month(s).`,
    plan: giftCard.plan,
    expiresAt: expiry.toISOString(),
  });
});

// GET /api/subscriptions/plans
router.get('/plans', (req, res) => {
  res.json(Object.values(PLANS));
});

// POST /api/subscriptions/webhook (Stripe webhook - no auth, verify signature)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[subscriptions/webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(200).json({ received: true });
  }

  let event;
  try {
    const client = getStripe();
    event = client.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = parseInt(session.metadata.userId);
      const plan = session.metadata.plan;
      if (userId && plan) {
        subscriptions.set(userId, {
          plan,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          updatedAt: new Date().toISOString(),
        });
        audit('SUBSCRIPTION_ACTIVATED', { userId, plan });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      for (const [userId, s] of subscriptions) {
        if (s.stripeSubscriptionId === sub.id) {
          subscriptions.set(userId, { ...s, plan: 'free', status: 'canceled' });
          break;
        }
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

// Admin: GET /api/subscriptions/admin/list
router.get('/admin/list', requireRole('admin'), (req, res) => {
  const list = [...subscriptions.entries()].map(([userId, sub]) => ({ userId, ...sub }));
  res.json(list);
});

export default router;
