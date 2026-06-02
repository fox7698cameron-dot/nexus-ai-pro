// src/routes/subscriptions.js
// Date: 2026-06-02
// Stripe subscriptions, one-time payments, crypto, gift cards

import { Router } from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe not configured');
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

const PLANS = {
  free: { priceId: null, name: 'Free', amount: 0 },
  pro: { priceId: process.env.STRIPE_PRO_PRICE_ID, name: 'Pro', amount: 999 },
  enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, name: 'Enterprise', amount: 1499 },
};

// In-memory subscription store (production: use PostgreSQL)
const subscriptions = new Map();
const giftCards = new Map();

// GET /api/subscriptions/plans
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      amount: plan.amount,
      currency: 'usd',
      interval: key === 'free' ? null : 'month',
    })),
  });
});

// GET /api/subscriptions/current
router.get('/current', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.sub) || { plan: 'free', status: 'active', renewsAt: null };
  res.json(sub);
});

// POST /api/subscriptions/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { plan, successUrl, cancelUrl } = req.body;

    if (!PLANS[plan] || !PLANS[plan].priceId) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL}/dashboard?upgraded=1`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/pricing`,
      metadata: { userId: req.user.sub, plan },
      payment_method_types: ['card'],
      allow_promotion_codes: true,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: 'Checkout session creation failed' });
  }
});

// POST /api/subscriptions/portal — customer portal for managing billing
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const sub = subscriptions.get(req.user.sub);
    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: req.body.returnUrl || process.env.APP_URL,
    });
    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: 'Portal session failed' });
  }
});

// POST /api/subscriptions/webhook — Stripe webhook handler
router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch {
    return res.status(400).json({ error: 'Webhook signature invalid' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        subscriptions.set(userId, {
          plan,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          renewsAt: null,
          updatedAt: Date.now(),
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      for (const [uid, s] of subscriptions.entries()) {
        if (s.stripeSubscriptionId === sub.id) {
          subscriptions.set(uid, { ...s, plan: 'free', status: 'cancelled', updatedAt: Date.now() });
        }
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

// POST /api/subscriptions/gift-card/redeem
router.post('/gift-card/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const normalizedCode = code.trim().toUpperCase();
  const card = [...giftCards.values()].find(c => c.code === normalizedCode && !c.redeemedBy);
  if (!card) return res.status(404).json({ error: 'Invalid or already redeemed gift card' });

  card.redeemedBy = req.user.sub;
  card.redeemedAt = Date.now();

  const current = subscriptions.get(req.user.sub) || { plan: 'free', status: 'active' };
  const upgraded = card.plan || 'pro';
  subscriptions.set(req.user.sub, {
    ...current,
    plan: upgraded,
    status: 'active',
    giftCard: normalizedCode,
    expiresAt: Date.now() + card.durationDays * 86400000,
    updatedAt: Date.now(),
  });

  res.json({ success: true, plan: upgraded, expiresAt: Date.now() + card.durationDays * 86400000 });
});

// POST /api/subscriptions/gift-card/generate — admin only
router.post('/gift-card/generate', requireAuth, (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin required' });
  }
  const { plan = 'pro', durationDays = 30, count = 1 } = req.body;
  const codes = Array.from({ length: Math.min(Number(count), 100) }, () => {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
    const card = { id: uuidv4(), code, plan, durationDays, redeemedBy: null, createdAt: Date.now() };
    giftCards.set(card.id, card);
    return code;
  });
  res.json({ codes });
});

export default router;
