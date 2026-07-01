// ================================================
// NEXUS AI PRO - Subscription & Payment Routes
// File: src/routes/subscriptions.js
// Updated: 2026-07-01
// Supports: Stripe (all major cards + wallets),
//           Crypto (Coinbase Commerce), Gift Cards
// ================================================

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  PLANS, createCheckoutSession, createCustomerPortalSession,
  createCryptoCharge, redeemGiftCard, constructWebhookEvent,
  getOrCreateCustomer, getSubscription, cancelSubscription,
  createPaymentIntent,
} from '../services/stripeService.js';

const router = Router();

function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Validation failed', details: e.array() }); return false; }
  return true;
}

// ── GET /api/subscriptions/plans ──────────────────────────────────────────

router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free', name: 'Free', price: 0, currency: 'usd',
        features: ['5 chats/day', 'Basic AI models', '1 MB uploads'],
        badge: 'free',
      },
      {
        id: 'pro_monthly', name: 'Pro', price: 999, currency: 'usd', interval: 'month',
        features: ['Unlimited chats', 'All AI models', '100 MB uploads', 'Analytics dashboard', 'Priority support'],
        badge: 'pro',
      },
      {
        id: 'pro_yearly', name: 'Pro (Annual)', price: 9990, currency: 'usd', interval: 'year',
        features: ['Everything in Pro', '2 months free'],
        badge: 'pro',
      },
      {
        id: 'enterprise_monthly', name: 'Enterprise', price: 1499, currency: 'usd', interval: 'month',
        features: ['Everything in Pro', 'Custom models', 'API access', 'Gaming connectors', 'Dedicated support', 'SLA'],
        badge: 'enterprise',
      },
      {
        id: 'enterprise_yearly', name: 'Enterprise (Annual)', price: 14990, currency: 'usd', interval: 'year',
        features: ['Everything in Enterprise', '2 months free'],
        badge: 'enterprise',
      },
    ],
    paymentMethods: [
      { id: 'card', name: 'Credit / Debit Card', networks: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'unionpay', 'jcb'] },
      { id: 'apple_pay', name: 'Apple Pay' },
      { id: 'google_pay', name: 'Google Pay' },
      { id: 'crypto', name: 'Cryptocurrency', networks: ['bitcoin', 'ethereum', 'usdc', 'dai', 'litecoin'] },
      { id: 'gift_card', name: 'Gift Card / Promo Code' },
    ],
  });
});

// ── POST /api/subscriptions/checkout ─────────────────────────────────────

router.post(
  '/checkout',
  requireAuth,
  [body('planId').isIn(Object.keys(PLANS).filter(k => k !== 'free')), body('successUrl').isURL(), body('cancelUrl').isURL()],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { planId, successUrl, cancelUrl } = req.body;
    const db = req.app.locals.db;
    try {
      const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.sub]);
      if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const session = await createCheckoutSession({
        planId, userId: req.user.sub, email: userResult.rows[0].email, successUrl, cancelUrl,
      });
      return res.json(session);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/subscriptions/portal ───────────────────────────────────────

router.post('/portal', requireAuth, [body('returnUrl').isURL()], async (req, res) => {
  if (!ok(req, res)) return;
  const db = req.app.locals.db;
  const subResult = await db.query('SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1', [req.user.sub]);
  if (subResult.rows.length === 0 || !subResult.rows[0].stripe_customer_id) {
    return res.status(404).json({ error: 'No active subscription found' });
  }
  try {
    const session = await createCustomerPortalSession({
      customerId: subResult.rows[0].stripe_customer_id, returnUrl: req.body.returnUrl,
    });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/crypto ────────────────────────────────────────

router.post(
  '/crypto',
  requireAuth,
  [body('planId').isIn(Object.keys(PLANS).filter(k => k !== 'free')), body('redirectUrl').isURL()],
  async (req, res) => {
    if (!ok(req, res)) return;
    try {
      const charge = await createCryptoCharge({
        planId: req.body.planId, userId: req.user.sub, redirectUrl: req.body.redirectUrl,
      });
      return res.json(charge);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/subscriptions/gift-card ─────────────────────────────────────

router.post(
  '/gift-card',
  requireAuth,
  [body('code').trim().notEmpty()],
  async (req, res) => {
    if (!ok(req, res)) return;
    try {
      const result = await redeemGiftCard({ code: req.body.code, userId: req.user.sub });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// ── GET /api/subscriptions/current ────────────────────────────────────────

router.get('/current', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ($2,$3) ORDER BY created_at DESC LIMIT 1',
    [req.user.sub, 'active', 'trialing']
  );
  return res.json(result.rows[0] || { plan: 'free', status: 'active' });
});

// ── POST /api/subscriptions/cancel ────────────────────────────────────────

router.post('/cancel', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query('SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2', [req.user.sub, 'active']);
  if (result.rows.length === 0) return res.status(404).json({ error: 'No active subscription' });
  try {
    await cancelSubscription(result.rows[0].stripe_subscription_id);
    await db.query("UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1", [req.user.sub]);
    return res.json({ success: true, status: 'canceled' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/webhook ──────────────────────────────────────
// Raw body required — mount before express.json()

router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing signature' });
  let event;
  try {
    event = await constructWebhookEvent(req.rawBody || req.body, signature);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
  const db = req.app.locals.db;
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        if (userId && planId) {
          await db.query(
            `INSERT INTO subscriptions (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,'active',NOW(),NOW())
             ON CONFLICT (user_id) DO UPDATE SET plan_id=$3, stripe_subscription_id=$4, status='active', updated_at=NOW()`,
            [uuidv4(), userId, planId, session.subscription, session.customer]
          );
          await db.query("UPDATE users SET role = CASE WHEN $2 LIKE 'enterprise%' THEN 'developer' ELSE role END WHERE id = $1", [userId, planId]);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db.query("UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE stripe_subscription_id = $1", [sub.id]);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        await db.query("UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE stripe_customer_id = $1", [inv.customer]);
        break;
      }
    }
    return res.json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook]', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
