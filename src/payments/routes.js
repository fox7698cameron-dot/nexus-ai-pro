/**
 * src/payments/routes.js
 * Nexus AI Pro — Payment API Routes
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Mount at: /api/payments
 */

import { Router } from 'express';
import {
  createCheckoutSession, createPortalSession, handleStripeWebhook,
  createCryptoOrder, confirmCryptoOrder,
  createGiftCard, redeemGiftCard,
  getSubscription, listSubscriptions, TIERS,
} from './payments.js';
import { requireAuth, requireAdmin, ROLES } from '../auth/auth.js';

const router = Router();

// ─── Tiers ─────────────────────────────────────────────────────────────────
router.get('/tiers', (req, res) => {
  res.json({ tiers: Object.values(TIERS) });
});

// ─── Stripe checkout ────────────────────────────────────────────────────────
router.post('/stripe/checkout', requireAuth(), async (req, res) => {
  try {
    const { tierId, billingPeriod, successUrl, cancelUrl } = req.body;
    const result = await createCheckoutSession({
      userId: req.user.sub, tierId, billingPeriod,
      successUrl: successUrl || `${process.env.APP_URL || 'http://localhost:3001'}/dashboard?checkout=success`,
      cancelUrl:  cancelUrl  || `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Stripe customer portal ─────────────────────────────────────────────────
router.post('/stripe/portal', requireAuth(), async (req, res) => {
  try {
    const { returnUrl } = req.body;
    const result = await createPortalSession({
      userId: req.user.sub,
      returnUrl: returnUrl || `${process.env.APP_URL || 'http://localhost:3001'}/dashboard`,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Stripe webhook (raw body required) ─────────────────────────────────────
router.post('/stripe/webhook',
  (req, res, next) => {
    // express.raw needed — attach before mounting if using global json parser
    next();
  },
  (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const result = handleStripeWebhook(req.body, sig);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  }
);

// ─── Crypto orders ───────────────────────────────────────────────────────────
router.post('/crypto/order', requireAuth(), (req, res) => {
  try {
    const { tierId, currency, billingPeriod } = req.body;
    const order = createCryptoOrder({ userId: req.user.sub, tierId, currency, billingPeriod });
    res.json(order);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/crypto/confirm', requireAuth(), (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    const result = confirmCryptoOrder(orderId, txHash);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ─── Gift cards ─────────────────────────────────────────────────────────────
router.post('/giftcard/create', requireAdmin, (req, res) => {
  try {
    const { valueUsd, note } = req.body;
    if (!valueUsd || valueUsd <= 0) return res.status(400).json({ error: 'valueUsd must be positive' });
    const card = createGiftCard({ valueUsd, note });
    res.json(card);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/giftcard/redeem', requireAuth(), (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const result = redeemGiftCard(code, req.user.sub);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ─── Subscription status ────────────────────────────────────────────────────
router.get('/subscription', requireAuth(), (req, res) => {
  const sub = getSubscription(req.user.sub);
  res.json({ subscription: sub, tier: TIERS[sub.tierId] });
});

router.get('/subscriptions', requireAdmin, (req, res) => {
  res.json({ subscriptions: listSubscriptions() });
});

export default router;
