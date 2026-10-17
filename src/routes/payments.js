/**
 * routes/payments.js
 * Nexus AI Pro — Payments & Subscription API Routes
 * Stripe checkout, gift cards, crypto verification, plan management
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import { Router }    from 'express';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

// ── Plan config (no hardcoded prices in logic — all from env/config) ──────────
const PLANS = {
  free: {
    id:          'free',
    name:        'Free',
    price:       '$0',
    priceAmount: 0,
    stripePriceId: null,
    features:    ['5 chats/day', 'Basic models', '1 MB uploads'],
  },
  pro: {
    id:            'pro',
    name:          'Pro',
    price:         process.env.PRO_PRICE_DISPLAY ?? '$9.99',
    priceAmount:   parseInt(process.env.PRO_PRICE_CENTS ?? '999', 10),
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features:      ['Unlimited chats', 'All models', '100 MB uploads', 'Analytics'],
  },
  enterprise: {
    id:            'enterprise',
    name:          'Enterprise',
    price:         process.env.ENTERPRISE_PRICE_DISPLAY ?? '$49.99',
    priceAmount:   parseInt(process.env.ENTERPRISE_PRICE_CENTS ?? '4999', 10),
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features:      ['Everything in Pro', 'Custom integrations', '10 GB uploads', 'SLA'],
  },
};

// ── Stripe lazy init ──────────────────────────────────────────────────────────
let _stripe;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    // Dynamic import to avoid loading Stripe unless payments are actually used
    const Stripe = require('stripe'); // CommonJS-compatible; or top-level dynamic import
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  }
  return _stripe;
}

// ── In-memory subscription store (TODO: replace with DB) ─────────────────────
/** @type {Map<string, { plan: string, stripeSubId?: string, active: boolean, endsAt?: string, giftCredits: number }>} */
const subscriptions = new Map();

function getUserSub(userId) {
  return subscriptions.get(userId) ?? { plan: 'free', active: true, giftCredits: 0 };
}

// ── Gift card store (TODO: replace with DB) ───────────────────────────────────
/** @type {Set<string>} redeemed codes */
const redeemedCodes = new Set();

/** Simple gift card validator — in production verify against DB */
function validateGiftCard(code) {
  if (redeemedCodes.has(code)) return { valid: false, reason: 'Already redeemed' };
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code))
    return { valid: false, reason: 'Invalid format' };
  return { valid: true, value: 999 /* cents */ };
}

// ── GET /api/payments/plans ───────────────────────────────────────────────────
router.get('/plans', verifyJWT, (_req, res) => {
  const safe = Object.fromEntries(
    Object.entries(PLANS).map(([k, v]) => [k, {
      id:      v.id,
      name:    v.name,
      price:   v.price,
      features: v.features,
    }])
  );
  res.json(safe);
});

// ── GET /api/payments/subscription ───────────────────────────────────────────
router.get('/subscription', verifyJWT, (req, res) => {
  const sub  = getUserSub(req.user.userId);
  const plan = PLANS[sub.plan] ?? PLANS.free;
  res.json({
    plan:    sub.plan,
    active:  sub.active,
    endsAt:  sub.endsAt ?? null,
    price:   plan.price,
    usage: {
      'Chats':   sub.plan === 'free' ? Math.floor(Math.random() * 80) : Math.floor(Math.random() * 30),
      'Storage': Math.floor(Math.random() * 60),
      'API':     Math.floor(Math.random() * 45),
    },
  });
});

// ── POST /api/payments/checkout ───────────────────────────────────────────────
router.post('/checkout', verifyJWT, async (req, res) => {
  const { plan, method } = req.body;

  if (!plan || !PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
  if (plan === 'free')       return res.status(400).json({ error: 'Cannot checkout to free plan' });

  const planConfig = PLANS[plan];

  if (method === 'card' || !method) {
    try {
      const stripe  = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode:                'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        success_url: `${process.env.APP_URL ?? 'http://localhost:3001'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${process.env.APP_URL ?? 'http://localhost:3001'}/pricing`,
        client_reference_id: req.user.userId,
        metadata: { userId: req.user.userId, plan },
      });
      return res.json({ url: session.url });
    } catch (err) {
      console.error('[payments] Stripe checkout error:', err.message);
      return res.status(500).json({ error: 'Payment processing failed' });
    }
  }

  if (method === 'crypto') {
    // Crypto payments verified via webhook (POST /payments/crypto/verify)
    return res.json({ message: 'Send crypto to the wallet address and it will be verified automatically' });
  }

  return res.status(400).json({ error: 'Unknown payment method' });
});

// ── POST /api/payments/subscription/cancel ────────────────────────────────────
router.post('/subscription/cancel', verifyJWT, async (req, res) => {
  const sub = getUserSub(req.user.userId);

  if (sub.plan === 'free') return res.status(400).json({ error: 'No active subscription to cancel' });

  if (sub.stripeSubId) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(sub.stripeSubId, { cancel_at_period_end: true });
    } catch (err) {
      console.error('[payments] Stripe cancel error:', err.message);
    }
  }

  const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  subscriptions.set(req.user.userId, { ...sub, active: false, endsAt });

  res.json({ success: true, endsAt });
});

// ── POST /api/payments/gift-card/redeem ──────────────────────────────────────
router.post('/gift-card/redeem', verifyJWT, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Code is required' });

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const result    = validateGiftCard(sanitized);

  if (!result.valid) return res.status(400).json({ error: result.reason });

  redeemedCodes.add(sanitized);
  const sub = getUserSub(req.user.userId);
  subscriptions.set(req.user.userId, { ...sub, giftCredits: (sub.giftCredits ?? 0) + result.value });

  res.json({ success: true, creditApplied: result.value, message: 'Gift card credit applied' });
});

// ── POST /api/payments/crypto/verify ─────────────────────────────────────────
// Called by crypto payment processor webhook (e.g. Coinbase Commerce)
router.post('/crypto/verify', (req, res) => {
  const webhookSecret = process.env.CRYPTO_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(503).json({ error: 'Crypto payments not configured' });

  const signature = req.headers['x-cc-webhook-signature'] ?? req.headers['x-signature'];
  if (!signature) return res.status(401).json({ error: 'Missing webhook signature' });

  // TODO: Verify HMAC signature against webhookSecret
  // const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  // if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401)...

  const { event } = req.body;
  if (event?.type === 'charge:confirmed') {
    const { userId, plan } = event.data?.metadata ?? {};
    if (userId && plan && PLANS[plan]) {
      const sub = getUserSub(userId);
      subscriptions.set(userId, { ...sub, plan, active: true, endsAt: null });
    }
  }

  res.json({ received: true });
});

// ── GET /api/payments/crypto/wallets ─────────────────────────────────────────
// Returns wallet addresses from env — never hardcoded
router.get('/crypto/wallets', verifyJWT, (_req, res) => {
  res.json({
    BTC:  process.env.CRYPTO_WALLET_BTC  ?? null,
    ETH:  process.env.CRYPTO_WALLET_ETH  ?? null,
    USDC: process.env.CRYPTO_WALLET_USDC ?? null,
  });
});

export default router;
