// ================================================
// NEXUS AI PRO — Payments API Module
// Stripe: cards (Visa, MC, Amex, Discover, Debit)
// Crypto: BTC, ETH, USDC via env-configured gateway
// Gift Cards: code redemption
// No secrets hard-coded — all from env vars
// Created: 2026-06-04
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { requireAuth } from './auth.js';

const router = Router();

// In-memory stores (production: PostgreSQL)
const subscriptionStore = new Map(); // userId -> subscription
const transactionStore = new Map();  // txId -> transaction
const giftCardStore = new Map();     // code -> { value, used, usedBy }

// ── Plan definitions ──────────────────────────────────────
const PLANS = Object.freeze({
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: null,
    features: ['5 AI requests/day', '1 project', 'Basic analytics']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    currency: 'usd',
    interval: 'month',
    features: ['Unlimited AI requests', '25 projects', 'Full analytics', 'Priority support']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999,
    currency: 'usd',
    interval: 'month',
    features: ['Everything in Pro', 'Unlimited projects', 'Custom AI models', 'SLA', 'Dedicated support']
  }
});

const CRYPTO_CURRENCIES = Object.freeze(['BTC', 'ETH', 'USDC', 'USDT', 'SOL']);

// ── Stripe lazy loader (avoids crash if key missing) ──────
let stripeClient = null;
function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_placeholder') || key === 'your_stripe_key') {
    return null;
  }
  try {
    const Stripe = require('stripe');
    stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
  } catch {
    stripeClient = null;
  }
  return stripeClient;
}

// ── HMAC webhook signature verification ───────────────────
function verifyStripeSignature(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const parts = signature.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts.t;
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    return parts.v1 === expected;
  } catch {
    return false;
  }
}

// ── GET /api/payments/plans ────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// ── POST /api/payments/checkout ───────────────────────────
router.post('/checkout', requireAuth, async (req, res) => {
  const { planId, successUrl, cancelUrl, currency = 'usd' } = req.body;

  if (!PLANS[planId]) return res.status(400).json({ error: `planId must be one of: ${Object.keys(PLANS).join(', ')}` });
  if (planId === 'free') {
    subscriptionStore.set(req.user.id, { plan: 'free', status: 'active', startedAt: new Date().toISOString() });
    return res.json({ success: true, plan: 'free', message: 'Free plan activated.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Payment processor not configured. Set STRIPE_SECRET_KEY in environment.' });
  }

  try {
    const plan = PLANS[planId];
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: plan.currency,
          product_data: { name: `Nexus AI Pro — ${plan.name}`, description: plan.features.join(' • ') },
          unit_amount: plan.price,
          recurring: { interval: plan.interval }
        },
        quantity: 1
      }],
      metadata: { userId: req.user.id, planId },
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:5173'}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:5173'}/pricing`
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: 'Checkout session creation failed.' });
  }
});

// ── POST /api/payments/crypto ─────────────────────────────
router.post('/crypto', requireAuth, async (req, res) => {
  const { planId, currency } = req.body;

  if (!PLANS[planId]) return res.status(400).json({ error: 'Invalid plan.' });
  if (!CRYPTO_CURRENCIES.includes(currency?.toUpperCase())) {
    return res.status(400).json({ error: `Supported crypto: ${CRYPTO_CURRENCIES.join(', ')}` });
  }

  const plan = PLANS[planId];
  const txId = uuidv4();
  const depositAddress = process.env[`CRYPTO_${currency.toUpperCase()}_ADDRESS`] || null;

  if (!depositAddress) {
    return res.status(503).json({ error: `Crypto address for ${currency} not configured. Set CRYPTO_${currency.toUpperCase()}_ADDRESS in environment.` });
  }

  const tx = {
    id: txId,
    userId: req.user.id,
    planId,
    method: 'crypto',
    currency: currency.toUpperCase(),
    amountUsd: plan.price / 100,
    depositAddress,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  };

  transactionStore.set(txId, tx);
  res.json({ txId, depositAddress, currency: tx.currency, amountUsd: tx.amountUsd, expiresAt: tx.expiresAt });
});

// ── POST /api/payments/gift-card ──────────────────────────
router.post('/gift-card', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Gift card code required.' });

  const card = giftCardStore.get(code.toUpperCase().trim());
  if (!card) return res.status(400).json({ error: 'Invalid gift card code.' });
  if (card.used) return res.status(409).json({ error: 'Gift card already redeemed.' });
  if (card.expiry && new Date(card.expiry) < new Date()) return res.status(410).json({ error: 'Gift card expired.' });

  card.used = true;
  card.usedBy = req.user.id;
  card.usedAt = new Date().toISOString();

  const current = subscriptionStore.get(req.user.id) || {};
  subscriptionStore.set(req.user.id, {
    ...current,
    balance: (current.balance || 0) + card.value,
    updatedAt: new Date().toISOString()
  });

  res.json({ success: true, value: card.value, newBalance: (current.balance || 0) + card.value });
});

// ── Admin: seed gift cards ─────────────────────────────────
router.post('/gift-card/create', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });

  const { value, count = 1, expiry } = req.body;
  if (!value || value <= 0) return res.status(400).json({ error: 'Positive value required.' });

  const codes = [];
  for (let i = 0; i < Math.min(Number(count), 100); i++) {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    giftCardStore.set(code, { code, value: Number(value), used: false, expiry: expiry || null, createdAt: new Date().toISOString() });
    codes.push(code);
  }

  res.status(201).json({ codes });
});

// ── GET /api/payments/subscription ────────────────────────
router.get('/subscription', requireAuth, (req, res) => {
  const sub = subscriptionStore.get(req.user.id) || { plan: 'free', status: 'active' };
  res.json(sub);
});

// ── POST /api/payments/webhook (Stripe raw body) ──────────
router.post('/webhook', (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.rawBody;

  if (!verifyStripeSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  try {
    const event = JSON.parse(rawBody);

    if (event.type === 'checkout.session.completed') {
      const { userId, planId } = event.data.object.metadata || {};
      if (userId && planId) {
        subscriptionStore.set(userId, {
          plan: planId,
          status: 'active',
          stripeCustomerId: event.data.object.customer,
          stripeSubscriptionId: event.data.object.subscription,
          startedAt: new Date().toISOString()
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const customerId = event.data.object.customer;
      for (const [userId, sub] of subscriptionStore.entries()) {
        if (sub.stripeCustomerId === customerId) {
          subscriptionStore.set(userId, { ...sub, plan: 'free', status: 'cancelled' });
        }
      }
    }

    res.json({ received: true });
  } catch {
    res.status(400).json({ error: 'Webhook processing failed.' });
  }
});

// ── GET /api/payments/transactions ────────────────────────
router.get('/transactions', requireAuth, (req, res) => {
  const txs = [...transactionStore.values()].filter(t => t.userId === req.user.id);
  res.json({ transactions: txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

export { router as paymentsRouter };
