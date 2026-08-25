/**
 * server/routes/payments.js
 * Nexus AI Pro — Payment Routes
 * Labeled: 2026-08-25
 *
 * POST /api/payments/intent              — create payment intent
 * POST /api/payments/subscribe           — create subscription
 * DELETE /api/payments/subscribe         — cancel subscription
 * GET  /api/payments/status              — subscription status
 * POST /api/payments/crypto/charge       — create crypto charge
 * POST /api/payments/gift/redeem         — redeem gift card
 * POST /api/payments/gift/issue          — issue gift cards (admin)
 * POST /api/payments/webhook             — Stripe webhook handler
 */

import express from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import {
  createPaymentIntent,
  createSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  createCryptoCharge,
  redeemGiftCard,
  issueGiftCard,
  handleStripeWebhook,
  PLANS
} from '../services/paymentService.js';

const router = express.Router();

// ── Plans ─────────────────────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  const publicPlans = Object.values(PLANS).map(({ id, name, priceUSD }) => ({
    id, name, priceUSD
  }));
  return res.json({ plans: publicPlans });
});

// ── Subscription status ───────────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
  const status = getSubscriptionStatus(req.user.sub);
  return res.json(status);
});

// ── Payment intent (one-time) ─────────────────────────────────────────────────
router.post('/intent', requireAuth, async (req, res) => {
  try {
    const { amountCents, currency, metadata } = req.body;

    if (!amountCents || typeof amountCents !== 'number' || amountCents < 50) {
      return res.status(400).json({ error: 'amountCents must be a number >= 50' });
    }

    const result = await createPaymentIntent(
      req.user.sub,
      amountCents,
      currency || 'usd',
      metadata || {}
    );

    if (!result.ok) return res.status(400).json({ error: result.error });
    // Return clientSecret to frontend — never log it
    return res.json({ clientSecret: result.clientSecret, intentId: result.intentId });
  } catch (err) {
    console.error('[PAYMENTS] intent error:', err.message);
    return res.status(500).json({ error: 'Payment processing error' });
  }
});

// ── Subscription ──────────────────────────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (planId === 'free') {
      return res.status(400).json({ error: 'Use /subscribe/cancel to downgrade to free' });
    }

    // Email comes from the decoded token (hashed) — in production, look up full email from DB
    const email = req.body.email; // client must supply email for Stripe customer creation
    if (!email) return res.status(400).json({ error: 'email required for subscription' });

    const result = await createSubscription(req.user.sub, email, planId);
    if (!result.ok) return res.status(400).json({ error: result.error });

    return res.json({
      subscriptionId: result.subscriptionId,
      clientSecret:   result.clientSecret  // frontend confirms payment with Stripe.js
    });
  } catch (err) {
    console.error('[PAYMENTS] subscribe error:', err.message);
    return res.status(500).json({ error: 'Subscription creation failed' });
  }
});

router.delete('/subscribe', requireAuth, async (req, res) => {
  try {
    const result = await cancelSubscription(req.user.sub);
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Subscription cancelled' });
  } catch (err) {
    console.error('[PAYMENTS] cancel error:', err.message);
    return res.status(500).json({ error: 'Cancellation failed' });
  }
});

// ── Crypto ────────────────────────────────────────────────────────────────────
router.post('/crypto/charge', requireAuth, async (req, res) => {
  try {
    const { planId, currency } = req.body;
    const result = await createCryptoCharge(req.user.sub, planId, currency || 'ETH');
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Crypto charge creation failed' });
  }
});

// ── Gift cards ────────────────────────────────────────────────────────────────
router.post('/gift/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const result = redeemGiftCard(req.user.sub, code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json(result);
});

router.post('/gift/issue', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { valueUSD, currency, count } = req.body;

  if (!valueUSD || typeof valueUSD !== 'number' || valueUSD <= 0) {
    return res.status(400).json({ error: 'valueUSD must be a positive number' });
  }

  const result = issueGiftCard(valueUSD, currency || 'USD', Math.min(count || 1, 100));
  return res.status(201).json(result);
});

// ── Stripe webhook ────────────────────────────────────────────────────────────
// IMPORTANT: This route needs raw body (not parsed JSON) for signature verification.
// Register BEFORE express.json() middleware, or use express.raw() here.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing Stripe signature' });

    const result = await handleStripeWebhook(req.body, signature);
    if (!result.ok) return res.status(400).json({ error: result.error });

    return res.json({ received: true, eventType: result.eventType });
  } catch (err) {
    console.error('[PAYMENTS] webhook error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
