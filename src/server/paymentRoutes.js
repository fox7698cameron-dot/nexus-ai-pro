/**
 * src/server/paymentRoutes.js
 * Stripe subscription payments, crypto (Coinbase Commerce), gift cards.
 * All API keys from environment variables — never hard-coded.
 * Date: 2026-08-15
 */

import { Router } from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './authRoutes.js';

const router = Router();

// ─── Stripe client ─────────────────────────────────────────────────────────
// Lazily initialised so missing STRIPE_SECRET_KEY doesn't crash startup
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// ─── Subscription price IDs (set in Stripe dashboard; stored in env) ──────
const PRICE_IDS = {
  pro:        process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

// ─── In-memory gift card store (use DB in production) ─────────────────────
// Format: { code (hash) -> { tierId, usedBy, createdAt } }
const giftCards = new Map();

// Pre-populate a few demo cards for development
function seedDemoGiftCards() {
  const demos = [
    { plainCode: 'DEMO1111DEMO2222', tierId: 'pro' },
    { plainCode: 'DEMO3333DEMO4444', tierId: 'enterprise' },
  ];
  for (const { plainCode, tierId } of demos) {
    const hash = crypto.createHash('sha256').update(plainCode).digest('hex');
    if (!giftCards.has(hash)) {
      giftCards.set(hash, { tierId, usedBy: null, createdAt: Date.now() });
    }
  }
}
seedDemoGiftCards();

// ─── POST /api/payments/stripe/checkout ───────────────────────────────────
/**
 * Create a Stripe Checkout session.
 * Body: { tierId: 'pro' | 'enterprise', successUrl, cancelUrl }
 */
router.post('/stripe/checkout', requireAuth, async (req, res) => {
  try {
    const { tierId, successUrl, cancelUrl } = req.body;
    if (!PRICE_IDS[tierId]) {
      return res.status(400).json({ error: `Unknown or unconfigured tier: ${tierId}` });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{ price: PRICE_IDS[tierId], quantity: 1 }],
      metadata: { userId: req.user.userId, tierId },
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3001'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3001'}/plans`,
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[payments/stripe/checkout]', err.message);
    return res.status(err.message.includes('environment variable') ? 503 : 500).json({
      error: err.message.includes('environment variable')
        ? 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment.'
        : 'Failed to create checkout session.',
    });
  }
});

// ─── POST /api/payments/stripe/portal ─────────────────────────────────────
/**
 * Create a Stripe Customer Portal session for subscription management.
 */
router.post('/stripe/portal', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required.' });

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.APP_URL || 'http://localhost:3001',
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('[payments/stripe/portal]', err.message);
    return res.status(500).json({ error: 'Failed to create portal session.' });
  }
});

// ─── POST /api/payments/stripe/webhook ────────────────────────────────────
/**
 * Stripe webhook handler — signature verified via STRIPE_WEBHOOK_SECRET.
 * Must be mounted with raw body parser.
 */
router.post('/stripe/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification');
    return res.json({ received: true });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed.' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`[stripe] checkout completed for user ${session.metadata?.userId}`);
      // In production: update user subscription status in DB
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`[stripe] subscription cancelled: ${sub.id}`);
      // In production: downgrade user to free tier
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      console.log(`[stripe] payment failed for customer: ${inv.customer}`);
      // In production: notify user and/or retry
      break;
    }
    default:
      break;
  }

  return res.json({ received: true });
});

// ─── POST /api/payments/crypto/initiate ───────────────────────────────────
/**
 * Create a Coinbase Commerce charge.
 * Requires COINBASE_COMMERCE_API_KEY in environment.
 */
router.post('/crypto/initiate', requireAuth, async (req, res) => {
  try {
    const { tierId, currency = 'usdc' } = req.body;
    const TIER_PRICES_USD = { pro: 9.99, enterprise: 14.99 };
    const usd = TIER_PRICES_USD[tierId];
    if (!usd) return res.status(400).json({ error: `Unknown tier: ${tierId}` });

    const coinbaseKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!coinbaseKey) {
      return res.status(503).json({
        error: 'Crypto payments not configured. Please set COINBASE_COMMERCE_API_KEY.',
      });
    }

    const charge = {
      name: `Nexus AI Pro — ${tierId} subscription`,
      description: `Monthly subscription for ${tierId} tier`,
      local_price: { amount: usd.toFixed(2), currency: 'USD' },
      pricing_type: 'fixed_price',
      metadata: { userId: req.user.userId, tierId },
    };

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': coinbaseKey,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify(charge),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: err.error?.message ?? 'Coinbase Commerce error.' });
    }

    const data = await response.json();
    return res.json({ checkoutUrl: data.data?.hosted_url, chargeId: data.data?.id });
  } catch (err) {
    console.error('[payments/crypto/initiate]', err.message);
    return res.status(500).json({ error: 'Failed to create crypto payment.' });
  }
});

// ─── POST /api/payments/giftcard/redeem ───────────────────────────────────
/**
 * Redeem a gift card code.
 * Body: { code: '16-char alphanumeric' }
 */
router.post('/giftcard/redeem', requireAuth, (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Gift card code is required.' });
    }

    const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length !== 16) {
      return res.status(400).json({ error: 'Gift card codes must be 16 characters.' });
    }

    const hash = crypto.createHash('sha256').update(clean).digest('hex');
    const card = giftCards.get(hash);

    if (!card) {
      return res.status(404).json({ error: 'Gift card not found.' });
    }
    if (card.usedBy) {
      return res.status(409).json({ error: 'Gift card has already been redeemed.' });
    }

    // Mark as used
    card.usedBy = req.user.userId;
    card.redeemedAt = Date.now();
    giftCards.set(hash, card);

    // In production: upgrade user to card.tierId in DB

    return res.json({ success: true, tierId: card.tierId });
  } catch (err) {
    console.error('[payments/giftcard/redeem]', err.message);
    return res.status(500).json({ error: 'Failed to redeem gift card.' });
  }
});

// ─── POST /api/payments/giftcard/create (admin only) ─────────────────────
/**
 * Create gift cards (admin endpoint).
 * Body: { tierId, count }
 * Returns plain-text codes (shown once; store hashes only).
 */
router.post('/giftcard/create', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { tierId = 'pro', count = 1 } = req.body;
  const VALID_TIERS = ['pro', 'enterprise'];
  if (!VALID_TIERS.includes(tierId)) {
    return res.status(400).json({ error: 'Invalid tier.' });
  }

  const n = Math.min(Number(count) || 1, 100);
  const codes = [];

  for (let i = 0; i < n; i++) {
    const plain = crypto.randomBytes(8).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(plain).digest('hex');
    giftCards.set(hash, { tierId, usedBy: null, createdAt: Date.now() });
    codes.push(plain);
  }

  return res.json({ codes, tierId, count: codes.length });
});

// ─── GET /api/payments/status ─────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
  // In production: fetch user's active subscription from Stripe/DB
  return res.json({
    tierId: 'free',
    tier: 'Free',
    status: 'active',
    nextBillingDate: null,
    paymentMethod: null,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    cryptoConfigured: !!process.env.COINBASE_COMMERCE_API_KEY,
  });
});

export default router;
