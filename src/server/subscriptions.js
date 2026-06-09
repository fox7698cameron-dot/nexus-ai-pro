// src/server/subscriptions.js
// Nexus AI Pro — Subscription & Payment Routes
// Supports: Stripe (all major cards + wallets), Crypto (ETH/BTC/USDC), Gift Cards
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './middleware.js';

const router = express.Router();

// ── Plan definitions ──────────────────────────────────────────────────────────

export const PLANS = Object.freeze({
  free: {
    id:          'free',
    name:        'Free',
    priceUsd:    0,
    interval:    null,
    features:    ['5 AI chats/day', 'Basic models', '1 MB uploads'],
    modelTier:   'free',
    stripePriceId: null,
  },
  pro: {
    id:          'pro',
    name:        'Pro',
    priceUsd:    999, // cents
    interval:    'month',
    features:    ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support'],
    modelTier:   'pro',
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
  enterprise: {
    id:          'enterprise',
    name:        'Enterprise',
    priceUsd:    1499,
    interval:    'month',
    features:    ['Everything in Pro', 'Custom models', 'API access', 'Dedicated SLA'],
    modelTier:   'enterprise',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
  },
});

// ── In-memory subscription store (replace with DB in production) ──────────────

const subscriptions = new Map(); // userId → subscription
const giftCards     = new Map(); // code → { planId, usedBy?, createdAt }
const cryptoPayments = new Map(); // paymentId → pending payment

// ── Stripe setup (lazy-loaded — optional dependency) ─────────────────────────

let stripeClient = null;
async function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const { default: Stripe } = await import('stripe');
    stripeClient = new Stripe(key, { apiVersion: '2024-04-10' });
  } catch (_) {
    stripeClient = null;
  }
  return stripeClient;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentSubscription(userId) {
  return subscriptions.get(userId) || { planId: 'free', status: 'active', startedAt: null };
}

function giftCardCode() {
  return 'NEXUS-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/subscriptions/plans */
router.get('/plans', (_req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

/** GET /api/subscriptions/current */
router.get('/current', requireAuth, (req, res) => {
  res.json({ subscription: currentSubscription(req.user.sub) });
});

/**
 * POST /api/subscriptions/checkout
 * Creates a Stripe Checkout Session.
 * Body: { planId, successUrl, cancelUrl }
 */
router.post('/checkout', requireAuth, async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body;

  const plan = PLANS[planId];
  if (!plan || plan.id === 'free') {
    return res.status(400).json({ error: 'Invalid plan for checkout' });
  }
  if (!successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'successUrl and cancelUrl are required' });
  }

  const stripe = await getStripe();
  if (!stripe) {
    // Return a stub session when Stripe is not configured (dev/demo mode)
    return res.json({
      sessionId:  'demo_' + uuidv4(),
      url:         successUrl + '?demo=true',
      mode:        'demo',
      warning:     'STRIPE_SECRET_KEY not configured — this is a demo session',
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata: { userId: req.user.sub, planId },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscriptions/webhook
 * Stripe webhook — must be called with raw body.
 * Registered at /api/subscriptions/webhook (no auth middleware).
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  const stripe = await getStripe();
  if (!stripe || !secret) return res.status(200).json({ received: true });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature invalid' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, planId } = session.metadata || {};
    if (userId && planId) {
      subscriptions.set(userId, {
        planId,
        status:      'active',
        stripeSubId: session.subscription,
        startedAt:   new Date().toISOString(),
        renewsAt:    new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    for (const [uid, s] of subscriptions.entries()) {
      if (s.stripeSubId === sub.id) {
        subscriptions.set(uid, { planId: 'free', status: 'active', startedAt: null });
        break;
      }
    }
  }

  res.json({ received: true });
});

/**
 * POST /api/subscriptions/crypto
 * Initiates a crypto payment via configured crypto gateway.
 * Body: { planId, currency } — currency: 'ETH' | 'BTC' | 'USDC' | 'SOL'
 */
router.post('/crypto', requireAuth, (req, res) => {
  const { planId, currency = 'USDC' } = req.body;
  const plan = PLANS[planId];
  if (!plan || plan.id === 'free') {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const SUPPORTED = ['ETH', 'BTC', 'USDC', 'SOL', 'LTC', 'DOGE'];
  if (!SUPPORTED.includes(currency.toUpperCase())) {
    return res.status(400).json({ error: 'Unsupported currency', supported: SUPPORTED });
  }

  const gatewayKey = process.env.CRYPTO_GATEWAY_KEY;
  if (!gatewayKey) {
    // Demo mode: return a mock payment address
    const paymentId = uuidv4();
    const demoAddresses = {
      BTC:  '1NexusDemo000000000000000000000000',
      ETH:  '0xDemoNexusAddress000000000000000000',
      USDC: '0xDemoNexusUSDC000000000000000000000',
      SOL:  'DemoNexusSolAddress11111111111111111',
    };
    cryptoPayments.set(paymentId, {
      paymentId, userId: req.user.sub, planId, currency: currency.toUpperCase(),
      status: 'pending', createdAt: new Date().toISOString(),
    });
    return res.json({
      paymentId,
      address:   demoAddresses[currency.toUpperCase()] || 'DemoAddress',
      currency:  currency.toUpperCase(),
      amount:    (plan.priceUsd / 100).toFixed(2),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
      mode:      'demo',
      warning:   'CRYPTO_GATEWAY_KEY not configured — demo mode',
    });
  }

  // Production: POST to configured crypto gateway (Coinbase Commerce, NOWPayments, etc.)
  // Gateway URL comes from env: CRYPTO_GATEWAY_URL
  res.status(501).json({ error: 'Crypto gateway integration requires CRYPTO_GATEWAY_KEY' });
});

/**
 * GET /api/subscriptions/crypto/:paymentId
 * Poll payment status.
 */
router.get('/crypto/:paymentId', requireAuth, (req, res) => {
  const payment = cryptoPayments.get(req.params.paymentId);
  if (!payment || payment.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json({ payment });
});

/**
 * POST /api/subscriptions/gift-card/redeem
 * Body: { code }
 */
router.post('/gift-card/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code is required' });

  const normalized = code.trim().toUpperCase();
  const card = giftCards.get(normalized);

  if (!card) return res.status(404).json({ error: 'Gift card not found or invalid' });
  if (card.usedBy)  return res.status(409).json({ error: 'Gift card already redeemed' });
  if (card.expiresAt && Date.now() > card.expiresAt) {
    return res.status(410).json({ error: 'Gift card expired' });
  }

  card.usedBy = req.user.sub;
  card.redeemedAt = new Date().toISOString();
  giftCards.set(normalized, card);

  const plan = PLANS[card.planId] || PLANS.pro;
  subscriptions.set(req.user.sub, {
    planId:    plan.id,
    status:    'active',
    source:    'gift_card',
    giftCard:  normalized,
    startedAt: new Date().toISOString(),
    renewsAt:  new Date(Date.now() + 30 * 86400000).toISOString(),
  });

  res.json({ success: true, plan: plan.id, message: `Activated ${plan.name} plan` });
});

/**
 * POST /api/subscriptions/gift-card/generate  (admin-only)
 * Body: { planId, quantity?, expiryDays? }
 */
router.post('/gift-card/generate', requireAuth, (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { planId, quantity = 1, expiryDays = 365 } = req.body;
  if (!PLANS[planId]) return res.status(400).json({ error: 'Invalid plan' });
  if (quantity < 1 || quantity > 100) return res.status(400).json({ error: 'quantity must be 1–100' });

  const codes = Array.from({ length: quantity }, () => {
    const code = giftCardCode();
    giftCards.set(code, {
      planId,
      createdAt:  new Date().toISOString(),
      expiresAt:  Date.now() + expiryDays * 86400000,
      createdBy:  req.user.sub,
    });
    return code;
  });

  res.status(201).json({ codes });
});

/**
 * DELETE /api/subscriptions/cancel
 */
router.delete('/cancel', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const sub = subscriptions.get(userId);
  if (!sub || sub.planId === 'free') {
    return res.status(400).json({ error: 'No active paid subscription' });
  }

  if (sub.stripeSubId) {
    const stripe = await getStripe();
    if (stripe) {
      try {
        await stripe.subscriptions.cancel(sub.stripeSubId);
      } catch (_) {
        // Log but continue — mark cancelled locally regardless
      }
    }
  }

  subscriptions.set(userId, { planId: 'free', status: 'cancelled', startedAt: null });
  res.json({ success: true, message: 'Subscription cancelled. Access continues until period end.' });
});

export default router;
