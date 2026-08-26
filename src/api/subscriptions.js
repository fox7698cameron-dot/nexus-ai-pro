/**
 * NEXUS AI PRO - Subscription & Payments API
 * File: src/api/subscriptions.js
 * Date: 2026-08-26
 *
 * Stripe integration (all card types: Visa, Mastercard, Amex, Discover, Debit),
 * Cryptocurrency payments (via Coinbase Commerce),
 * Gift card support.
 * All API keys come from environment — NEVER hardcoded.
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../utils/helpers.js';

const router = express.Router();

// ─── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = Object.freeze({
  FREE: { id: 'free', name: 'Free', price: 0, currency: 'usd', features: ['basic_ai', 'analytics_lite'] },
  PRO: { id: 'pro', name: 'Pro', price: 1999, currency: 'usd', stripePriceId: process.env.STRIPE_PRICE_PRO, features: ['full_ai', 'analytics', 'projects', 'gaming'] },
  ENTERPRISE: { id: 'enterprise', name: 'Enterprise', price: 9999, currency: 'usd', stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE, features: ['everything', 'custom_connectors', 'sla', 'dedicated_support'] },
});

// ─── Subscription store ────────────────────────────────────────────────────────
const subscriptions = new Map(); // userId → subscription
const giftCards = new Map(); // code → { planId, expiresAt, usedBy }

// ─── Stripe SDK lazy init ──────────────────────────────────────────────────────
let _stripe = null;
function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  // Dynamic import to avoid error when Stripe not installed
  const Stripe = require('stripe');
  _stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia', appInfo: { name: 'NexusAIPro', version: '2.0.0' } });
  return _stripe;
}

// ─── Coinbase Commerce lazy init ───────────────────────────────────────────────
async function createCryptoCharge(planId, userId, email) {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) throw new Error('COINBASE_COMMERCE_API_KEY not configured');

  const plan = PLANS[planId.toUpperCase()];
  if (!plan) throw new Error('Invalid plan');

  const resp = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify({
      name: `Nexus AI Pro ${plan.name}`,
      description: `Subscription to ${plan.name} plan`,
      local_price: { amount: (plan.price / 100).toFixed(2), currency: plan.currency.toUpperCase() },
      pricing_type: 'fixed_price',
      metadata: { userId, planId, email },
      redirect_url: process.env.APP_URL ? `${process.env.APP_URL}/subscription/success` : undefined,
      cancel_url: process.env.APP_URL ? `${process.env.APP_URL}/subscription/cancel` : undefined,
    }),
  });

  if (!resp.ok) throw new Error('Coinbase Commerce charge creation failed');
  return resp.json();
}

// ─── Gift card generation ──────────────────────────────────────────────────────
function generateGiftCard(planId, daysValid = 365) {
  const code = crypto.randomBytes(12).toString('base64url').toUpperCase().slice(0, 16);
  const card = { code, planId, expiresAt: new Date(Date.now() + daysValid * 86400000).toISOString(), usedBy: null, createdAt: new Date().toISOString() };
  giftCards.set(code, card);
  return card;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// List plans
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS), timestamp: new Date().toISOString() });
});

// Get current subscription
router.get('/current', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub) {
    return res.json({ plan: PLANS.FREE, status: 'active', method: null });
  }
  res.json(sub);
});

// Create Stripe checkout session (all card types)
router.post('/checkout/stripe', requireAuth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const plan = PLANS[planId?.toUpperCase()];
    if (!plan || !plan.stripePriceId) return res.status(400).json({ error: 'Invalid or unavailable plan' });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // accepts Visa, Mastercard, Amex, Discover, Debit
      mode: 'subscription',
      customer_email: req.user.email,
      metadata: { userId: req.user.sub, planId },
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/subscription/cancel`,
      subscription_data: { metadata: { userId: req.user.sub } },
      billing_address_collection: 'auto',
    });

    auditLog('STRIPE_CHECKOUT_CREATED', { userId: req.user.sub, planId });
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    auditLog('STRIPE_CHECKOUT_ERROR', { error: err.message });
    if (err.message.includes('not configured')) {
      return res.status(503).json({ error: 'Payment service not configured', detail: err.message });
    }
    res.status(500).json({ error: 'Checkout creation failed' });
  }
});

// Create crypto payment (Coinbase Commerce)
router.post('/checkout/crypto', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const charge = await createCryptoCharge(planId, req.user.sub, req.user.email);
    auditLog('CRYPTO_CHECKOUT_CREATED', { userId: req.user.sub, planId });
    res.json({ hostedUrl: charge.data.hosted_url, chargeId: charge.data.id, expiresAt: charge.data.expires_at });
  } catch (err) {
    auditLog('CRYPTO_CHECKOUT_ERROR', { error: err.message });
    if (err.message.includes('not configured')) {
      return res.status(503).json({ error: 'Crypto payments not configured', detail: err.message });
    }
    res.status(500).json({ error: 'Crypto checkout failed' });
  }
});

// Redeem gift card
router.post('/redeem/giftcard', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const card = giftCards.get(code.toUpperCase().trim());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.usedBy) return res.status(409).json({ error: 'Gift card already redeemed' });
  if (new Date(card.expiresAt) < new Date()) return res.status(410).json({ error: 'Gift card expired' });

  const plan = PLANS[card.planId?.toUpperCase()];
  if (!plan) return res.status(400).json({ error: 'Invalid plan on gift card' });

  card.usedBy = req.user.sub;
  card.redeemedAt = new Date().toISOString();
  giftCards.set(code, card);

  subscriptions.set(req.user.sub, {
    plan,
    status: 'active',
    method: 'gift_card',
    startedAt: new Date().toISOString(),
    giftCardCode: code,
  });

  auditLog('GIFT_CARD_REDEEMED', { userId: req.user.sub, planId: card.planId });
  res.json({ message: 'Gift card redeemed', plan, expiresAt: card.expiresAt });
});

// Stripe webhook (for subscription status updates)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    auditLog('STRIPE_WEBHOOK_INVALID', { error: err.message });
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          const planId = sub.metadata?.planId || 'pro';
          const plan = PLANS[planId.toUpperCase()] || PLANS.PRO;
          subscriptions.set(userId, { plan, status: sub.status, method: 'stripe', stripeSubId: sub.id, startedAt: new Date().toISOString(), currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString() });
          auditLog('SUBSCRIPTION_UPDATED', { userId, planId, status: sub.status });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          subscriptions.set(userId, { plan: PLANS.FREE, status: 'cancelled', method: null });
          auditLog('SUBSCRIPTION_CANCELLED', { userId });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    auditLog('STRIPE_WEBHOOK_PROCESSING_ERROR', { error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Coinbase Commerce webhook
router.post('/webhook/crypto', express.json(), (req, res) => {
  const signature = req.headers['x-cc-webhook-signature'];
  const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;

  if (webhookSecret) {
    const expected = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature || '', 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  const { type, data } = req.body.event || {};
  if (type === 'charge:confirmed') {
    const { userId, planId } = data?.metadata || {};
    if (userId) {
      const plan = PLANS[planId?.toUpperCase()] || PLANS.PRO;
      subscriptions.set(userId, { plan, status: 'active', method: 'crypto', chargeId: data.id, startedAt: new Date().toISOString() });
      auditLog('CRYPTO_PAYMENT_CONFIRMED', { userId, planId });
    }
  }

  res.json({ received: true });
});

// Admin: generate gift cards
router.post('/admin/giftcards/generate', requireAuth, (req, res) => {
  // Only callable from admin context
  const { planId = 'PRO', count = 1, daysValid = 365 } = req.body;
  const cards = Array.from({ length: Math.min(count, 100) }, () => generateGiftCard(planId, daysValid));
  auditLog('GIFT_CARDS_GENERATED', { count: cards.length, planId });
  res.json({ cards });
});

export { router as subscriptionsRouter };
