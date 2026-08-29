/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * server/routes/subscription.js
 * Subscription & billing routes via Stripe.
 * Supports: Visa, Mastercard, Amex, Discover, Diners, UnionPay, JCB (major cards),
 *           Crypto (via Coinbase Commerce), Gift cards.
 * Date: 2026-08-29
 *
 * All Stripe / crypto keys sourced from process.env — never hardcoded.
 */

import { Router } from 'express';
import { z }      from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// ── Plan catalogue ─────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id:          'free',
    name:        'Free',
    price:       0,
    currency:    'usd',
    interval:    null,
    stripePriceId: null,
    features:    ['5 chats/day', 'Basic models', '1 MB uploads'],
    badge:       '🆓',
    reasoning:   'mini',
  },
  pro: {
    id:          'pro',
    name:        'Pro',
    price:       999,          // cents → $9.99
    currency:    'usd',
    interval:    'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features:    ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support'],
    badge:       '⭐',
    reasoning:   'mid',
  },
  enterprise: {
    id:          'enterprise',
    name:        'Enterprise',
    price:       1499,         // cents → $14.99
    currency:    'usd',
    interval:    'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features:    ['Everything in Pro', 'Custom models', 'API access', 'SLA', 'Dedicated support'],
    badge:       '👑',
    reasoning:   'max',
  },
};

// ── In-memory subscription store (production: Postgres + Stripe webhooks) ──
const subscriptions = new Map();   // userId → subscription record

function getOrCreate(userId) {
  if (!subscriptions.has(userId)) {
    subscriptions.set(userId, {
      userId,
      planId:          'free',
      status:          'active',
      stripeCustomerId: null,
      stripeSubId:     null,
      cryptoPaymentId: null,
      giftCardCode:    null,
      currentPeriodEnd: null,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    });
  }
  return subscriptions.get(userId);
}

// ── Stripe lazy loader (only import if key present) ───────────────────────
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  const { default: Stripe } = await import('stripe');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// ── Gift card store (production: DB) ──────────────────────────────────────
const giftCards = new Map([
  ['NEXUS-DEMO-2026', { planId: 'pro', months: 1, used: false }],
]);

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/billing/plans
router.get('/plans', requireAuth, (req, res) => {
  const list = Object.values(PLANS).map(p => ({
    ...p,
    stripePriceId: undefined,   // never expose Stripe price IDs to client
  }));
  return res.json({ plans: list });
});

// GET /api/billing/subscription
router.get('/subscription', requireAuth, (req, res) => {
  const sub = getOrCreate(req.user.sub);
  return res.json({
    ...sub,
    stripeCustomerId: undefined,
    stripeSubId:      undefined,
  });
});

// POST /api/billing/checkout — create Stripe Checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  const schema = z.object({
    planId:     z.enum(['pro', 'enterprise']),
    successUrl: z.string().url(),
    cancelUrl:  z.string().url(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const plan = PLANS[parsed.data.planId];
  if (!plan.stripePriceId) {
    return res.status(503).json({
      error: 'Stripe price not configured for this plan',
      code:  'STRIPE_NOT_CONFIGURED',
    });
  }

  try {
    const stripe = await getStripe();
    let sub = getOrCreate(req.user.sub);

    // Create or retrieve Stripe customer
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    req.user.email ?? undefined,
        metadata: { userId: req.user.sub },
      });
      customerId              = customer.id;
      sub.stripeCustomerId    = customerId;
      subscriptions.set(req.user.sub, sub);
    }

    const session = await stripe.checkout.sessions.create({
      mode:       'subscription',
      customer:   customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: parsed.data.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  parsed.data.cancelUrl,
      payment_method_types: ['card'],    // covers Visa, MC, Amex, Discover, etc.
      metadata: { userId: req.user.sub, planId: parsed.data.planId },
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    return res.status(502).json({ error: err.message, code: 'STRIPE_ERROR' });
  }
});

// POST /api/billing/portal — Stripe customer portal (manage subscription)
router.post('/portal', requireAuth, async (req, res) => {
  const schema = z.object({ returnUrl: z.string().url() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const sub = getOrCreate(req.user.sub);
  if (!sub.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer found', code: 'NO_CUSTOMER' });
  }

  try {
    const stripe  = await getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripeCustomerId,
      return_url: parsed.data.returnUrl,
    });
    return res.json({ portalUrl: session.url });
  } catch (err) {
    return res.status(502).json({ error: err.message, code: 'STRIPE_ERROR' });
  }
});

// POST /api/billing/webhook — Stripe webhook (signature-verified)
router.post('/webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(503).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    const stripe = await getStripe();
    event        = stripe.webhooks.constructEvent(req.rawBody ?? req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId  = session.metadata?.userId;
      const planId  = session.metadata?.planId;
      if (userId && planId) {
        const sub = getOrCreate(userId);
        sub.planId       = planId;
        sub.status       = 'active';
        sub.stripeSubId  = session.subscription;
        sub.updatedAt    = new Date().toISOString();
        subscriptions.set(userId, sub);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      for (const [userId, sub] of subscriptions.entries()) {
        if (sub.stripeSubId === stripeSub.id) {
          sub.planId    = 'free';
          sub.status    = 'cancelled';
          sub.updatedAt = new Date().toISOString();
          subscriptions.set(userId, sub);
          break;
        }
      }
      break;
    }
    case 'customer.subscription.updated': {
      const stripeSub = event.data.object;
      for (const [userId, sub] of subscriptions.entries()) {
        if (sub.stripeSubId === stripeSub.id) {
          sub.status           = stripeSub.status;
          sub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
          sub.updatedAt        = new Date().toISOString();
          subscriptions.set(userId, sub);
          break;
        }
      }
      break;
    }
  }

  return res.json({ received: true });
});

// POST /api/billing/gift-card — redeem a gift card
router.post('/gift-card', requireAuth, (req, res) => {
  const schema = z.object({ code: z.string().min(1).max(64) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const card = giftCards.get(parsed.data.code.toUpperCase());
  if (!card) {
    return res.status(404).json({ error: 'Gift card not found or invalid', code: 'INVALID_GIFT_CARD' });
  }
  if (card.used) {
    return res.status(409).json({ error: 'Gift card already redeemed', code: 'GIFT_CARD_USED' });
  }

  card.used = true;
  const sub = getOrCreate(req.user.sub);
  sub.planId       = card.planId;
  sub.status       = 'active';
  sub.giftCardCode = parsed.data.code;
  sub.updatedAt    = new Date().toISOString();
  subscriptions.set(req.user.sub, sub);

  return res.json({
    success: true,
    planId:  card.planId,
    months:  card.months,
    message: `Gift card applied — ${card.months} month(s) of ${PLANS[card.planId].name} activated`,
  });
});

// POST /api/billing/crypto — initiate crypto payment (Coinbase Commerce)
router.post('/crypto', requireAuth, async (req, res) => {
  const schema = z.object({
    planId:    z.enum(['pro', 'enterprise']),
    currency:  z.enum(['BTC', 'ETH', 'USDC', 'SOL', 'LTC']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const plan    = PLANS[parsed.data.planId];
  const cbKey   = process.env.COINBASE_COMMERCE_API_KEY;

  if (!cbKey) {
    return res.status(503).json({
      error: 'Crypto payment not configured',
      code:  'CRYPTO_NOT_CONFIGURED',
      hint:  'Set COINBASE_COMMERCE_API_KEY in environment',
    });
  }

  try {
    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-CC-Api-Key':    cbKey,
        'X-CC-Version':   '2018-03-22',
      },
      body: JSON.stringify({
        name:        `Nexus AI Pro — ${plan.name}`,
        description: `${plan.name} subscription (1 month)`,
        pricing_type: 'fixed_price',
        local_price:  { amount: (plan.price / 100).toFixed(2), currency: 'USD' },
        metadata:    { userId: req.user.sub, planId: parsed.data.planId },
        redirect_url: process.env.APP_URL ?? 'https://nexusai.pro/billing',
        cancel_url:   process.env.APP_URL ?? 'https://nexusai.pro/billing',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message ?? 'Coinbase Commerce error');

    return res.json({
      chargeId:   json.data.id,
      hostedUrl:  json.data.hosted_url,
      expiresAt:  json.data.expires_at,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message, code: 'CRYPTO_PAYMENT_ERROR' });
  }
});

// ── Admin: list all subscriptions ─────────────────────────────────────────
router.get('/admin/list', requireAuth, requireRole('admin'), (req, res) => {
  const list = [...subscriptions.values()].map(s => ({
    ...s,
    stripeCustomerId: undefined,
    stripeSubId:      undefined,
  }));
  return res.json({ subscriptions: list, total: list.length });
});

export default router;
