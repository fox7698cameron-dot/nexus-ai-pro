/**
 * nexus-ai-pro/src/routes/checkout.js
 * Subscription & checkout: Stripe (all major cards), crypto, gift cards
 * Date: 2026-08-16
 */

import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { validateCard, sanitizeHtml } from '../utils/validation.js';

const router = express.Router();

// Lazy-initialize Stripe (requires STRIPE_SECRET_KEY env var)
let stripe = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is required');
    stripe = new Stripe(key, { apiVersion: '2024-10-28', maxNetworkRetries: 0 });
  }
  return stripe;
}

// Supported cryptocurrencies
const CRYPTO_NETWORKS = {
  BTC:   { name: 'Bitcoin',          symbol: 'BTC',  decimals: 8 },
  ETH:   { name: 'Ethereum',         symbol: 'ETH',  decimals: 18 },
  USDT:  { name: 'Tether (ERC-20)',   symbol: 'USDT', decimals: 6 },
  USDC:  { name: 'USD Coin',          symbol: 'USDC', decimals: 6 },
  SOL:   { name: 'Solana',            symbol: 'SOL',  decimals: 9 },
  MATIC: { name: 'Polygon',           symbol: 'MATIC', decimals: 18 },
  BNB:   { name: 'BNB Chain',         symbol: 'BNB',  decimals: 18 },
  LTC:   { name: 'Litecoin',          symbol: 'LTC',  decimals: 8 },
  XRP:   { name: 'Ripple',            symbol: 'XRP',  decimals: 6 },
  DOGE:  { name: 'Dogecoin',          symbol: 'DOGE', decimals: 8 },
};

// Subscription tiers
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    features: ['5 AI chats/day', 'Basic models', '1MB uploads', '1 social platform'],
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 999,    // cents
    priceAnnual: 9999,
    features: ['Unlimited chats', 'All AI models', '100MB uploads', '10 social platforms', 'Priority support', '5 projects'],
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 4999,
    priceAnnual: 49999,
    features: ['Everything in Pro', 'Unlimited projects', 'All platforms', 'API access', 'Custom integrations', 'SLA 99.9%', 'Dedicated support'],
    stripePriceIdMonthly: process.env.STRIPE_ENT_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_ENT_ANNUAL_PRICE_ID,
  },
};

// In-memory gift card store (production: use DB)
const giftCards = new Map();    // code -> { balance, createdAt, usedBy }
const subscriptions = new Map(); // userId -> subscriptionData

// ─────────────────────────────────────────────
// GET /api/checkout/plans
// ─────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS });
});

// ─────────────────────────────────────────────
// POST /api/checkout/create-intent
// Create Stripe payment intent for one-time or subscription
// ─────────────────────────────────────────────
router.post('/create-intent', requireAuth, async (req, res) => {
  try {
    const { planId, billing = 'monthly', currency = 'usd' } = req.body || {};
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan', valid: Object.keys(SUBSCRIPTION_PLANS) });
    if (plan.priceMonthly === 0) return res.status(400).json({ error: 'Free plan does not require payment' });

    const amount = billing === 'annual' ? plan.priceAnnual : plan.priceMonthly;
    const s = getStripe();

    const intent = await s.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata: {
        userId: req.user.sub,
        planId,
        billing,
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: intent.client_secret,
      amount,
      currency,
      plan: plan.name,
    });
  } catch (err) {
    const msg = err.type?.startsWith('Stripe') ? err.message : 'Payment setup failed';
    res.status(500).json({ error: msg });
  }
});

// ─────────────────────────────────────────────
// POST /api/checkout/subscribe
// Create Stripe subscription
// ─────────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { planId, billing = 'monthly', paymentMethodId } = req.body || {};
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    if (!paymentMethodId) return res.status(400).json({ error: 'Payment method required' });

    const priceId = billing === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
    if (!priceId) return res.status(400).json({ error: 'Stripe price not configured for this plan' });

    const s = getStripe();

    // Create or retrieve Stripe customer
    const existingSub = subscriptions.get(req.user.sub);
    let customerId = existingSub?.stripeCustomerId;

    if (!customerId) {
      const customer = await s.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.sub },
      });
      customerId = customer.id;
    }

    await s.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await s.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

    const subscription = await s.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    subscriptions.set(req.user.sub, {
      userId: req.user.sub,
      planId,
      billing,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      createdAt: Date.now(),
    });

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      plan: plan.name,
      billing,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (err) {
    const msg = err.type?.startsWith('Stripe') ? err.message : 'Subscription failed';
    res.status(500).json({ error: msg });
  }
});

// ─────────────────────────────────────────────
// POST /api/checkout/cancel
// Cancel Stripe subscription
// ─────────────────────────────────────────────
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const sub = subscriptions.get(req.user.sub);
    if (!sub?.stripeSubscriptionId) return res.status(404).json({ error: 'No active subscription' });

    const s = getStripe();
    const cancelled = await s.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    sub.cancelAtPeriodEnd = true;
    sub.status = cancelled.status;

    res.json({ message: 'Subscription will cancel at period end', periodEnd: cancelled.current_period_end });
  } catch (err) {
    const msg = err.type?.startsWith('Stripe') ? err.message : 'Cancellation failed';
    res.status(500).json({ error: msg });
  }
});

// ─────────────────────────────────────────────
// GET /api/checkout/subscription
// Get current user subscription status
// ─────────────────────────────────────────────
router.get('/subscription', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.sub) || { planId: 'free', status: 'active' };
  const plan = SUBSCRIPTION_PLANS[sub.planId] || SUBSCRIPTION_PLANS.free;
  res.json({ subscription: sub, plan });
});

// ─────────────────────────────────────────────
// POST /api/checkout/crypto/initiate
// Initiate crypto payment (generates wallet address)
// ─────────────────────────────────────────────
router.post('/crypto/initiate', requireAuth, (req, res) => {
  const { currency, planId, billing = 'monthly' } = req.body || {};
  if (!CRYPTO_NETWORKS[currency]) {
    return res.status(400).json({ error: 'Unsupported cryptocurrency', supported: Object.keys(CRYPTO_NETWORKS) });
  }
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });

  // In production: use a crypto payment processor (CoinPayments, NOWPayments, BitPay, etc.)
  // Generate a payment session ID for tracking
  const sessionId = crypto.randomBytes(16).toString('hex');
  const amountUsd = (billing === 'annual' ? plan.priceAnnual : plan.priceMonthly) / 100;

  res.json({
    sessionId,
    currency,
    network: CRYPTO_NETWORKS[currency],
    amountUsd,
    // Placeholder wallet — production: get from payment processor API
    walletAddress: `nexus_${currency.toLowerCase()}_${sessionId.slice(0, 16)}`,
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    instructions: `Send exactly the requested amount to the wallet address above. Payment will be confirmed after network confirmation.`,
    plan: plan.name,
    note: 'Connect a crypto payment processor (CoinPayments, NOWPayments) to enable live crypto payments.',
  });
});

// ─────────────────────────────────────────────
// POST /api/checkout/gift-card/apply
// ─────────────────────────────────────────────
router.post('/gift-card/apply', requireAuth, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const normalized = String(code).trim().toUpperCase().replace(/[\s-]/g, '');
  const card = giftCards.get(normalized);

  if (!card) return res.status(404).json({ error: 'Gift card not found or already used' });
  if (card.usedBy) return res.status(400).json({ error: 'Gift card already redeemed' });
  if (card.expiresAt && Date.now() > card.expiresAt) return res.status(400).json({ error: 'Gift card expired' });

  card.usedBy = req.user.sub;
  card.redeemedAt = Date.now();

  res.json({
    balance: card.balance,
    currency: card.currency || 'USD',
    message: `Gift card applied: $${(card.balance / 100).toFixed(2)} credit added to your account`,
  });
});

// Admin: POST /api/checkout/gift-card/create
router.post('/gift-card/create', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { balance = 1000, currency = 'USD', expiresInDays } = req.body || {};

  const code = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString('hex').toUpperCase()
  ).join('-');

  const card = {
    code,
    balance: Number(balance),
    currency,
    createdAt: Date.now(),
    createdBy: req.user.sub,
    expiresAt: expiresInDays ? Date.now() + Number(expiresInDays) * 24 * 3600000 : null,
    usedBy: null,
  };

  giftCards.set(code, card);
  res.status(201).json({ code, balance, currency, expiresAt: card.expiresAt });
});

// ─────────────────────────────────────────────
// POST /api/checkout/webhook
// Stripe webhook handler
// ─────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });

  try {
    const s = getStripe();
    const event = s.webhooks.constructEvent(req.body, sig, secret);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const userId = pi.metadata?.userId;
        if (userId) {
          const existing = subscriptions.get(userId) || {};
          subscriptions.set(userId, { ...existing, planId: pi.metadata?.planId || existing.planId, status: 'active' });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // Handle subscription cancellation
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }
});

export default router;
