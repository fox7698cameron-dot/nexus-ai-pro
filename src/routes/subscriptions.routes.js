// src/routes/subscriptions.routes.js
// Subscription management — Stripe, crypto, gift cards
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { SUBSCRIPTION_PLANS, AUDIT_EVENTS } from '../config/constants.js';
import { logAuditEvent } from '../services/audit.service.js';
import {
  createStripeCustomer, createStripeSubscription, cancelStripeSubscription, verifyStripeWebhook,
  createCryptoCharge, verifyCoinbaseWebhook,
  hashGiftCardCode, validateGiftCard, generateGiftCardCode,
} from '../services/subscription.service.js';

const router = Router();

// Webhook endpoints do NOT require auth — they use provider signatures
// All other endpoints require auth

// ─── GET /api/subscriptions/plans ─────────────────────────────────────────
router.get('/plans', (req, res) => {
  return res.json({
    plans: [
      { id: SUBSCRIPTION_PLANS.FREE, name: 'Free', price: 0, features: ['5 chats/day', 'Basic models', '10MB uploads'] },
      { id: SUBSCRIPTION_PLANS.PRO, name: 'Pro', price: 1299, currency: 'USD', interval: 'month', features: ['Unlimited chats', 'All models', '100MB uploads', 'Analytics'] },
      { id: SUBSCRIPTION_PLANS.ENTERPRISE, name: 'Enterprise', price: 9900, currency: 'USD', interval: 'month', features: ['Everything in Pro', 'Custom models', 'SLA', 'API access', '1GB uploads'] },
    ],
    paymentMethods: ['card', 'crypto', 'gift_card'],
    supportedCards: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay'],
    supportedCrypto: ['bitcoin', 'ethereum', 'usdc', 'usdt', 'solana'],
  });
});

// ─── POST /api/subscriptions/stripe/create ────────────────────────────────
router.post('/stripe/create', requireAuth, async (req, res) => {
  const { plan, paymentMethodId } = req.body;
  if (!plan || !paymentMethodId) return res.status(400).json({ error: 'plan and paymentMethodId required' });
  if (!Object.values(SUBSCRIPTION_PLANS).includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    const user = { id: req.user.sub, email: req.user.email, displayName: req.user.displayName };
    const customer = await createStripeCustomer(user);
    const subscription = await createStripeSubscription(customer.id, plan, paymentMethodId);
    logAuditEvent({ userId: req.user.sub, event: AUDIT_EVENTS.SUBSCRIPTION_CREATE, metadata: { plan } });
    return res.status(201).json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (err) {
    logAuditEvent({ userId: req.user.sub, event: AUDIT_EVENTS.PAYMENT_FAILED, metadata: { error: err.message } });
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/subscriptions/stripe/cancel ────────────────────────────────
router.post('/stripe/cancel', requireAuth, async (req, res) => {
  const { stripeSubscriptionId } = req.body;
  if (!stripeSubscriptionId) return res.status(400).json({ error: 'stripeSubscriptionId required' });
  try {
    const result = await cancelStripeSubscription(stripeSubscriptionId);
    logAuditEvent({ userId: req.user.sub, event: AUDIT_EVENTS.SUBSCRIPTION_CANCEL });
    return res.json({ status: result.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/subscriptions/stripe/webhook ───────────────────────────────
// Raw body required — mount BEFORE express.json() in server.js
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });
  try {
    const event = verifyStripeWebhook(req.body, sig);
    // Handle relevant events
    switch (event.type) {
      case 'invoice.payment_succeeded':
        logAuditEvent({ event: AUDIT_EVENTS.PAYMENT_SUCCESS, metadata: { stripeEvent: event.type } });
        break;
      case 'invoice.payment_failed':
        logAuditEvent({ event: AUDIT_EVENTS.PAYMENT_FAILED, metadata: { stripeEvent: event.type } });
        break;
      case 'customer.subscription.deleted':
        logAuditEvent({ event: AUDIT_EVENTS.SUBSCRIPTION_CANCEL, metadata: { stripeEvent: event.type } });
        break;
    }
    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/subscriptions/crypto/create ────────────────────────────────
router.post('/crypto/create', requireAuth, async (req, res) => {
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: 'plan required' });
  const prices = { pro: 12.99, enterprise: 99.00 };
  const amount = prices[plan];
  if (!amount) return res.status(400).json({ error: 'Invalid plan for crypto payment' });
  try {
    const charge = await createCryptoCharge(req.user.sub, plan, amount);
    logAuditEvent({ userId: req.user.sub, event: AUDIT_EVENTS.SUBSCRIPTION_CREATE, metadata: { plan, method: 'crypto' } });
    return res.status(201).json(charge);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/subscriptions/crypto/webhook ───────────────────────────────
router.post('/crypto/webhook', (req, res) => {
  const sig = req.headers['x-cc-webhook-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing webhook signature' });
  try {
    verifyCoinbaseWebhook(req.body, sig);
    const event = JSON.parse(req.body);
    if (event.event?.type === 'charge:confirmed') {
      logAuditEvent({ event: AUDIT_EVENTS.PAYMENT_SUCCESS, metadata: { provider: 'coinbase', chargeId: event.event.data?.id } });
    }
    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/subscriptions/gift-card/redeem ────────────────────────────
router.post('/gift-card/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  // In production: look up hashed code in DB, check not already redeemed
  // Here we demonstrate the verification pattern
  const submittedHash = hashGiftCardCode(code);
  // Placeholder: in production query DB for gift_cards WHERE code_hash = submittedHash
  return res.json({ message: 'Gift card validation initiated', codeHash: submittedHash.slice(0, 8) + '…' });
});

export default router;
