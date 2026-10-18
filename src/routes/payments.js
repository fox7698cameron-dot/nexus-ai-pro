// src/routes/payments.js
// Created: 2026-10-18
// Stripe subscription + crypto + gift card payment routes

import express from 'express';
import { validateAuth } from '../middleware/auth.js';

const router = express.Router();

// Stripe is loaded lazily from environment at request time so the key never touches source code
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  // Dynamic import keeps stripe optional and key out of module scope
  const Stripe = require('stripe');
  return Stripe(key);
}

const PLANS = Object.freeze({
  free:       { id: 'free',       name: 'Free',         price: 0,    interval: null },
  pro:        { id: 'pro',        name: 'Pro',          price: 999,  interval: 'month' },
  team:       { id: 'team',       name: 'Team',         price: 2999, interval: 'month' },
  enterprise: { id: 'enterprise', name: 'Enterprise',   price: 9999, interval: 'month' },
});

// In-memory subscription store (replace with DB)
const subscriptions = new Map();
const giftCards = new Map();

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  return res.json(Object.values(PLANS));
});

// GET /api/payments/subscription
router.get('/subscription', validateAuth, (req, res) => {
  const sub = subscriptions.get(req.user.sub) || { plan: 'free', status: 'active', nextBillingDate: null };
  return res.json(sub);
});

// POST /api/payments/checkout — create Stripe Checkout session
router.post('/checkout', validateAuth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const plan = PLANS[planId];
    if (!plan || plan.price === 0) return res.status(400).json({ error: 'Invalid plan for checkout' });

    const stripe = getStripe();
    const priceId = process.env[`STRIPE_PRICE_${planId.toUpperCase()}`];
    if (!priceId) return res.status(400).json({ error: `Stripe price not configured for plan ${planId}` });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/pricing`,
      metadata: { userId: req.user.sub, planId },
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[payments/checkout]', err.message);
    return res.status(500).json({ error: 'Checkout session creation failed' });
  }
});

// POST /api/payments/portal — customer portal
router.post('/portal', validateAuth, async (req, res) => {
  try {
    const sub = subscriptions.get(req.user.sub);
    if (!sub?.stripeCustomerId) return res.status(400).json({ error: 'No active subscription found' });

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: req.body.returnUrl || `${process.env.APP_URL}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('[payments/portal]', err.message);
    return res.status(500).json({ error: 'Portal session failed' });
  }
});

// POST /api/payments/webhook — Stripe webhook (must be raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, planId } = session.metadata || {};
      if (userId) {
        subscriptions.set(userId, {
          plan: planId,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodEnd: null,
          updatedAt: Date.now(),
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      // downgrade user to free
      for (const [userId, userSub] of subscriptions.entries()) {
        if (userSub.stripeSubscriptionId === sub.id) {
          userSub.plan = 'free';
          userSub.status = 'canceled';
          userSub.updatedAt = Date.now();
        }
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      for (const [userId, userSub] of subscriptions.entries()) {
        if (userSub.stripeCustomerId === invoice.customer) {
          userSub.status = 'past_due';
          userSub.updatedAt = Date.now();
        }
      }
      break;
    }
  }

  return res.json({ received: true });
});

// POST /api/payments/gift-card/redeem
router.post('/gift-card/redeem', validateAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const card = giftCards.get(code.toUpperCase());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });

  card.redeemed = true;
  card.redeemedBy = req.user.sub;
  card.redeemedAt = Date.now();

  const current = subscriptions.get(req.user.sub) || { plan: 'free', credits: 0 };
  current.credits = (current.credits || 0) + card.value;
  subscriptions.set(req.user.sub, current);

  return res.json({ message: 'Gift card redeemed', credits: current.credits });
});

// POST /api/payments/crypto/initiate (webhook-based, no wallet key in server)
router.post('/crypto/initiate', validateAuth, (req, res) => {
  const { planId, currency = 'BTC' } = req.body;
  const plan = PLANS[planId];
  if (!plan || plan.price === 0) return res.status(400).json({ error: 'Invalid plan' });

  // In production integrate with NOWPayments, Coinbase Commerce, or BitPay
  // Return a payment address generated via their APIs — never generate wallet keys here
  const invoiceId = `CRYPTO-${Date.now()}-${req.user.sub.slice(0, 8)}`;
  return res.json({
    invoiceId,
    currency,
    status: 'pending',
    message: 'Configure NOWPAYMENTS_API_KEY or COINBASE_COMMERCE_API_KEY to enable crypto payments',
  });
});

export { router as paymentsRouter };
