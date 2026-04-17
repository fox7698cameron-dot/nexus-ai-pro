// nexus-ai-pro/src/routes/payments.routes.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Payments: Stripe subscriptions, crypto, gift cards — webhook handling

import { Router } from 'express';
import { authenticate, requireRole, ROLES } from '../services/auth.service.js';
import {
  TIER_PRICES, TIER_STRIPE_PRICE_IDS,
  createStripeCustomer, getOrCreateCustomer,
  createSetupIntent, createSubscription,
  cancelSubscription, updateSubscriptionTier,
  createPaymentIntent, hashGiftCardCode,
  generateCryptoPaymentAddress, SUPPORTED_CARD_BRANDS,
  constructStripeEvent, listInvoices,
} from '../services/payment.service.js';
import { audit } from '../services/audit.service.js';

const router = Router();

// In-memory stores (replace with DB in production)
const subscriptions = new Map();
const giftCards = new Map();

// ── GET /api/payments/tiers ───────────────────────────────────
router.get('/tiers', (req, res) => {
  res.json({ tiers: TIER_PRICES, cardBrands: SUPPORTED_CARD_BRANDS });
});

// ── POST /api/payments/setup-intent ──────────────────────────
router.post('/setup-intent', authenticate, async (req, res) => {
  try {
    const { stripeCustomerId } = subscriptions.get(req.user.id) ?? {};
    const customer = await getOrCreateCustomer({
      stripeCustomerId,
      email: req.user.email ?? '',
      name: req.user.username,
      userId: req.user.id,
    });
    const intent = await createSetupIntent(customer.id);
    res.json({ clientSecret: intent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/subscribe ─────────────────────────────
router.post('/subscribe', authenticate, async (req, res) => {
  const { tier, billing = 'monthly', method, coin, code } = req.body;

  if (!['starter', 'pro', 'enterprise'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  try {
    audit({ label: 'PAYMENT_ATTEMPT', actorId: req.user.id, detail: { tier, method }, result: 'ok' });

    if (method === 'gift_card') {
      if (!code) return res.status(400).json({ error: 'Gift card code required' });
      const hashed = hashGiftCardCode(code);
      const card = giftCards.get(hashed);
      if (!card) return res.status(400).json({ error: 'Invalid gift card' });
      if (card.balance_cents < TIER_PRICES[tier].monthly * 100) {
        return res.status(400).json({ error: 'Insufficient gift card balance' });
      }
      card.balance_cents -= TIER_PRICES[tier].monthly * 100;
      giftCards.set(hashed, card);
      subscriptions.set(req.user.id, { tier, status: 'active', method: 'gift_card' });
      audit({ label: 'PAYMENT_OK', actorId: req.user.id, detail: { tier, method }, result: 'ok' });
      return res.json({ ok: true, tier, method: 'gift_card' });
    }

    if (method === 'crypto') {
      const { provider } = generateCryptoPaymentAddress();
      return res.json({ ok: true, tier, method: 'crypto', provider, coin, note: 'Payment address generated via crypto provider API' });
    }

    if (method === 'card') {
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId required for card payments' });

      const priceIds = TIER_STRIPE_PRICE_IDS();
      const priceId = priceIds[tier]?.[billing];
      if (!priceId) return res.status(400).json({ error: `No price configured for ${tier}/${billing}` });

      const customer = await getOrCreateCustomer({
        stripeCustomerId: subscriptions.get(req.user.id)?.stripeCustomerId,
        email: req.user.email ?? '',
        name: req.user.username,
        userId: req.user.id,
      });

      const sub = await createSubscription({ customerId: customer.id, priceId, paymentMethodId });
      subscriptions.set(req.user.id, {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: sub.id,
        tier,
        status: sub.status,
        method: 'card',
      });

      audit({ label: 'PAYMENT_OK', actorId: req.user.id, detail: { tier, method }, result: 'ok' });
      return res.json({ ok: true, tier, status: sub.status });
    }

    return res.status(400).json({ error: 'Unsupported payment method' });

  } catch (e) {
    audit({ label: 'PAYMENT_ERROR', actorId: req.user.id, detail: { error: e.message }, result: 'error' });
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/cancel ─────────────────────────────────
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const sub = subscriptions.get(req.user.id);
    if (!sub?.stripeSubscriptionId) return res.status(404).json({ error: 'No active subscription' });
    await cancelSubscription(sub.stripeSubscriptionId, true);
    subscriptions.set(req.user.id, { ...sub, status: 'cancelled' });
    audit({ label: 'SUBSCRIPTION_CANCEL', actorId: req.user.id, result: 'ok' });
    res.json({ ok: true, cancelAtPeriodEnd: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/payments/invoices ────────────────────────────────
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const sub = subscriptions.get(req.user.id);
    if (!sub?.stripeCustomerId) return res.json({ invoices: [] });
    const { data } = await listInvoices(sub.stripeCustomerId);
    res.json({ invoices: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/payments/subscription ───────────────────────────
router.get('/subscription', authenticate, (req, res) => {
  const sub = subscriptions.get(req.user.id) ?? { tier: 'free', status: 'active' };
  res.json(sub);
});

// ── POST /api/payments/webhook (Stripe) ──────────────────────
// Note: rawBody middleware must be applied before this route in server.js
router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = constructStripeEvent(req.rawBody, sig);
  } catch (e) {
    return res.status(400).json({ error: `Webhook error: ${e.message}` });
  }

  switch (event.type) {
    case 'invoice.payment_succeeded':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Update subscription status in DB based on event.data.object
      break;
    default:
      break;
  }

  res.json({ received: true });
});

// ── Admin: create gift card ───────────────────────────────────
router.post('/gift-cards/create', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  const { amountCents, expiresAt } = req.body;
  if (!amountCents || amountCents < 100) return res.status(400).json({ error: 'amountCents must be ≥100' });

  const rawCode = Array.from({ length: 16 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
  const formatted = rawCode.replace(/(.{4})/g, '$1-').slice(0, 19);
  const hashed = hashGiftCardCode(rawCode);

  giftCards.set(hashed, { amount_cents: amountCents, balance_cents: amountCents, expiresAt });
  audit({ label: 'GIFT_CARD_CREATED', actorId: req.user.id, detail: { amountCents }, result: 'ok' });

  res.status(201).json({ code: formatted, amountCents });
});

export default router;
