// src/routes/payments.js
// 2026-07-22 | Stripe payments — cards, crypto, gift codes; subscription management

import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Stripe is initialized lazily so the server starts without STRIPE_SECRET_KEY in dev
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY env var is required');
  return new Stripe(key, { apiVersion: '2025-01-27.acacia' });
}

// ─── Subscription plans ───────────────────────────────────────────────────────

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: null,
    features: ['5 AI messages/day', '1 project', 'Basic analytics'],
    stripePriceId: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    currency: 'usd',
    interval: 'month',
    features: ['Unlimited AI', '10 projects', 'Full analytics', 'Priority support'],
    stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 7999,
    currency: 'usd',
    interval: 'month',
    features: ['Everything in Pro', 'Unlimited projects', 'Dedicated support', 'Custom integrations', 'SLA'],
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
  },
};

// In-memory subscription store (use DB in production)
const subscriptions = new Map(); // userId → subscription record
const giftCodes = new Map();     // code → { planId, used, createdAt }

// ─── GET /api/payments/plans ──────────────────────────────────────────────────

router.get('/plans', (req, res) => {
  return res.json({ plans: Object.values(PLANS) });
});

// ─── POST /api/payments/checkout ──────────────────────────────────────────────
// Creates a Stripe Checkout session supporting card, crypto, and gift code.

router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { planId, paymentMethod = 'card', giftCode, currency = 'usd' } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: `Unknown plan. Use: ${Object.keys(PLANS).join(', ')}` });
    if (plan.id === 'free') return res.status(400).json({ error: 'Free plan requires no payment' });

    // ── Gift code path ────────────────────────────────────────────────────────
    if (paymentMethod === 'gift_code') {
      if (!giftCode) return res.status(400).json({ error: 'giftCode required' });
      const gc = giftCodes.get(giftCode.trim().toUpperCase());
      if (!gc || gc.used) return res.status(400).json({ error: 'Invalid or used gift code' });
      if (gc.planId !== planId) return res.status(400).json({ error: 'Gift code is for a different plan' });

      gc.used = true;
      gc.usedBy = req.user.sub;
      gc.usedAt = new Date().toISOString();
      giftCodes.set(giftCode.trim().toUpperCase(), gc);

      subscriptions.set(req.user.sub, {
        userId: req.user.sub,
        planId,
        status: 'active',
        method: 'gift_code',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return res.json({ success: true, method: 'gift_code', planId });
    }

    const stripe = getStripe();
    const origin = process.env.APP_URL || 'https://nexusai.pro';

    // Determine payment method types
    const paymentMethodTypes = ['card'];
    if (paymentMethod === 'crypto') {
      paymentMethodTypes.push('crypto'); // Stripe Link + crypto on/off ramp
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: paymentMethodTypes,
      line_items: [{
        price: plan.stripePriceId,
        quantity: 1,
      }],
      metadata: { userId: req.user.sub, planId },
      success_url: `${origin}/dashboard?payment=success&plan=${planId}`,
      cancel_url: `${origin}/pricing?payment=cancelled`,
      currency,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    if (err.message.includes('STRIPE_SECRET_KEY')) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    return res.status(500).json({ error: 'Checkout session creation failed' });
  }
});

// ─── POST /api/payments/portal ────────────────────────────────────────────────
// Customer portal for managing subscriptions.

router.post('/portal', authenticate, async (req, res) => {
  try {
    const stripe = getStripe();
    const sub = subscriptions.get(req.user.sub);
    if (!sub?.stripeCustomerId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.APP_URL || 'https://nexusai.pro'}/dashboard`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: 'Portal session creation failed' });
  }
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Stripe webhook — must be registered with raw body parser (see server.js).

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook verification failed: ${err.message}` });
  }

  switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object;
    const { userId, planId } = session.metadata || {};
    if (userId && planId) {
      subscriptions.set(userId, {
        userId,
        planId,
        status: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        method: 'card',
        startedAt: new Date().toISOString(),
      });
    }
    break;
  }
  case 'customer.subscription.deleted': {
    const sub = event.data.object;
    for (const [userId, s] of subscriptions.entries()) {
      if (s.stripeSubscriptionId === sub.id) {
        s.status = 'cancelled';
        s.cancelledAt = new Date().toISOString();
        subscriptions.set(userId, s);
      }
    }
    break;
  }
  }

  return res.json({ received: true });
});

// ─── GET /api/payments/subscription ──────────────────────────────────────────

router.get('/subscription', authenticate, (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub) return res.json({ planId: 'free', status: 'active' });
  const { stripeCustomerId, stripeSubscriptionId, ...safe } = sub;
  return res.json(safe);
});

// ─── Admin: generate gift codes ───────────────────────────────────────────────

router.post('/gift-codes', authenticate, (req, res) => {
  if (!['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin/Dev only' });
  }
  const { planId, count = 1 } = req.body;
  if (!PLANS[planId] || planId === 'free') return res.status(400).json({ error: 'Invalid planId' });

  const codes = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    const code = generateGiftCode();
    giftCodes.set(code, { planId, used: false, createdAt: new Date().toISOString() });
    codes.push(code);
  }
  return res.status(201).json({ codes });
});

function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default router;
