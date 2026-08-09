/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Payments Routes — Stripe, Crypto, Gift Cards
 * Supports: Visa, Mastercard, Amex, Discover, Diners, JCB, UnionPay
 *           + major debit cards, crypto (BTC, ETH, USDC), gift card redemption
 * NO secrets hardcoded — all keys loaded from env
 * Date: 2026-08-09
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/security.js';

const router = Router();

// ─── Stripe client (lazy) ─────────────────────────────────────────────────────

let stripe = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    stripe = new Stripe(key, { apiVersion: '2024-06-20', appInfo: { name: 'nexus-ai-pro', version: '2.0.0' } });
  }
  return stripe;
}

// ─── Subscription Plans ───────────────────────────────────────────────────────

const PLANS = {
  free: { id: 'free', name: 'Free', priceId: null, amount: 0, currency: 'usd', interval: null },
  pro: { id: 'pro', name: 'Pro', priceId: process.env.STRIPE_PRICE_PRO, amount: 999, currency: 'usd', interval: 'month' },
  enterprise: { id: 'enterprise', name: 'Enterprise', priceId: process.env.STRIPE_PRICE_ENTERPRISE, amount: 4999, currency: 'usd', interval: 'month' },
  game_dev: { id: 'game_dev', name: 'Game Dev Pro', priceId: process.env.STRIPE_PRICE_GAMEDEV, amount: 1999, currency: 'usd', interval: 'month' },
};

// ─── In-memory order/subscription store (swap for DB in prod) ────────────────

const subscriptions = new Map();
const giftCodes = new Map();

// Seed a demo gift code for testing
giftCodes.set('NEXUS-DEMO-2026', { plan: 'pro', durationDays: 30, used: false });

// ─── POST /api/payments/create-payment-intent ─────────────────────────────────

router.post(
  '/create-payment-intent',
  requireAuth,
  [body('planId').isIn(Object.keys(PLANS)), body('currency').optional().isISO4217()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const { planId, currency = 'usd' } = req.body;
    const plan = PLANS[planId];

    if (!plan || plan.amount === 0) {
      return res.status(400).json({ error: 'Free plan requires no payment' });
    }

    try {
      const intent = await getStripe().paymentIntents.create({
        amount: plan.amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: req.user.sub,
          planId,
          userEmail: req.user.email,
        },
        // Payment method types — covers all major card networks + wallets
        // Stripe automatically handles Visa, MC, Amex, Discover, Diners, JCB, UnionPay
        receipt_email: req.user.email,
      });

      logAuditEvent('payment_intent_created', { userId: req.user.sub, planId, amount: plan.amount });

      return res.json({
        clientSecret: intent.client_secret,
        planName: plan.name,
        amount: plan.amount,
        currency,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
);

// ─── POST /api/payments/create-subscription ───────────────────────────────────

router.post(
  '/create-subscription',
  requireAuth,
  [body('planId').isIn(['pro', 'enterprise', 'game_dev'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const { planId, paymentMethodId } = req.body;
    const plan = PLANS[planId];
    if (!plan?.priceId) return res.status(400).json({ error: 'Plan not configured' });

    try {
      const s = getStripe();

      // Create or retrieve customer
      let customerId = subscriptions.get(`cust:${req.user.sub}`);
      if (!customerId) {
        const customer = await s.customers.create({
          email: req.user.email,
          metadata: { userId: req.user.sub },
        });
        customerId = customer.id;
        subscriptions.set(`cust:${req.user.sub}`, customerId);
      }

      if (paymentMethodId) {
        await s.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await s.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }

      const subscription = await s.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId: req.user.sub, planId },
      });

      subscriptions.set(req.user.sub, { planId, subscriptionId: subscription.id, status: subscription.status });
      logAuditEvent('subscription_created', { userId: req.user.sub, planId, subscriptionId: subscription.id });

      return res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        plan: plan.name,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create subscription' });
    }
  }
);

// ─── POST /api/payments/cancel-subscription ───────────────────────────────────

router.post('/cancel-subscription', requireAuth, async (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub) return res.status(404).json({ error: 'No active subscription' });

  try {
    await getStripe().subscriptions.cancel(sub.subscriptionId);
    subscriptions.delete(req.user.sub);
    logAuditEvent('subscription_cancelled', { userId: req.user.sub });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ─── POST /api/payments/redeem-gift-card ─────────────────────────────────────

router.post(
  '/redeem-gift-card',
  requireAuth,
  [body('code').isString().isLength({ min: 5, max: 50 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const code = String(req.body.code).toUpperCase().trim();
    const gift = giftCodes.get(code);

    if (!gift || gift.used) {
      return res.status(400).json({ error: 'Invalid or already-used gift code' });
    }

    gift.used = true;
    gift.redeemedBy = req.user.sub;
    gift.redeemedAt = new Date().toISOString();

    // Grant plan to user
    subscriptions.set(req.user.sub, {
      planId: gift.plan,
      source: 'gift_card',
      expiresAt: new Date(Date.now() + gift.durationDays * 86400000).toISOString(),
    });

    logAuditEvent('gift_card_redeemed', { userId: req.user.sub, code, plan: gift.plan });
    return res.json({ success: true, plan: gift.plan, durationDays: gift.durationDays });
  }
);

// ─── POST /api/payments/crypto/initiate ──────────────────────────────────────
// Cryptocurrency payment initiation (BTC, ETH, USDC via provider env config)

router.post(
  '/crypto/initiate',
  requireAuth,
  [
    body('planId').isIn(Object.keys(PLANS)),
    body('cryptoCurrency').isIn(['BTC', 'ETH', 'USDC', 'SOL', 'LTC']),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const { planId, cryptoCurrency } = req.body;
    const plan = PLANS[planId];
    if (!plan || plan.amount === 0) return res.status(400).json({ error: 'Invalid plan' });

    // In production: call Coinbase Commerce / BitPay / NOWPayments API using env keys
    // Here we generate a session reference without exposing any keys
    const sessionId = crypto.randomUUID();
    const paymentAddress = process.env[`CRYPTO_ADDRESS_${cryptoCurrency}`] || null;

    if (!paymentAddress) {
      return res.status(503).json({ error: `${cryptoCurrency} payments not configured` });
    }

    logAuditEvent('crypto_payment_initiated', { userId: req.user.sub, planId, cryptoCurrency, sessionId });

    return res.json({
      sessionId,
      cryptoCurrency,
      paymentAddress,
      amountUSD: plan.amount / 100,
      planName: plan.name,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      note: 'Send exact amount — price locked for 30 minutes',
    });
  }
);

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Stripe webhook endpoint — verifies signature, never logs payload secrets

router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      logAuditEvent('payment_succeeded', { intentId: event.data.object.id });
      break;
    case 'customer.subscription.deleted':
      logAuditEvent('subscription_deleted', { subscriptionId: event.data.object.id });
      break;
    case 'invoice.payment_failed':
      logAuditEvent('payment_failed', { invoiceId: event.data.object.id });
      break;
    default:
      break;
  }

  return res.json({ received: true });
});

// ─── GET /api/payments/subscription ──────────────────────────────────────────

router.get('/subscription', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  const plan = sub ? PLANS[sub.planId] : PLANS.free;
  return res.json({ subscription: sub ?? { planId: 'free' }, plan });
});

export default router;
