// server/routes/payments.js
// 2026-06-06 | Stripe checkout: cards, debit, Amex, Visa, crypto, gift cards
// Subscriptions: Free, Pro, Enterprise | Webhook handler

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Lazily initialize Stripe to avoid crash when key is missing in dev
let stripe = null;
function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  }
  return stripe;
}

// Price IDs from Stripe dashboard (set via env vars — never hardcode)
const PLANS = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  enterprise_monthly: process.env.STRIPE_PRICE_ENT_MONTHLY,
  enterprise_annual: process.env.STRIPE_PRICE_ENT_ANNUAL
};

// Gift card redemption store (in-memory; use DB in production)
const giftCards = new Map([
  // Seed a test code: NEXUS-DEMO-2026
  ['NEXUS-DEMO-2026', { plan: 'pro_monthly', credits: 1, used: false }]
]);

// POST /api/payments/create-checkout — Stripe Hosted Checkout session
router.post('/create-checkout', authenticate, async (req, res) => {
  const { plan, successUrl, cancelUrl } = req.body;
  const priceId = PLANS[plan];
  if (!priceId) return res.status(400).json({ error: `Invalid plan: ${plan}` });

  try {
    const s = getStripe();
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'link'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/pricing`,
      client_reference_id: req.user.id,
      customer_email: req.user.email,
      subscription_data: {
        metadata: { userId: req.user.id, plan }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/create-portal — Customer portal for subscription management
router.post('/create-portal', authenticate, async (req, res) => {
  const { customerId, returnUrl } = req.body;
  if (!customerId) return res.status(400).json({ error: 'customerId required' });

  try {
    const s = getStripe();
    const session = await s.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.APP_URL}/settings`
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/gift-card/redeem
router.post('/gift-card/redeem', authenticate, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Gift card code required' });

  const card = giftCards.get(code.toUpperCase().trim());
  if (!card) return res.status(404).json({ error: 'Gift card not found or invalid' });
  if (card.used) return res.status(410).json({ error: 'Gift card already redeemed' });

  card.used = true;
  card.redeemedBy = req.user.id;
  card.redeemedAt = Date.now();

  res.json({
    message: 'Gift card redeemed successfully',
    plan: card.plan,
    credits: card.credits,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  });
});

// POST /api/payments/webhook — Stripe webhook (raw body required)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[payments] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    return res.json({ received: true });
  }

  let event;
  try {
    const s = getStripe();
    event = s.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`[payments] Subscription activated for user ${session.client_reference_id}`);
      // TODO: update user subscription in DB
      break;
    }
    case 'customer.subscription.updated': {
      console.log(`[payments] Subscription updated: ${event.data.object.id}`);
      break;
    }
    case 'customer.subscription.deleted': {
      console.log(`[payments] Subscription cancelled: ${event.data.object.id}`);
      // TODO: downgrade user to free tier
      break;
    }
    case 'invoice.payment_failed': {
      console.log(`[payments] Payment failed for ${event.data.object.customer}`);
      break;
    }
  }

  res.json({ received: true });
});

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'usd',
        interval: null,
        features: ['5 AI chats/day', 'Basic models', '1MB uploads', 'Community support'],
        badge: 'FREE'
      },
      {
        id: 'pro_monthly',
        name: 'Pro',
        price: 999,
        currency: 'usd',
        interval: 'month',
        features: ['Unlimited chats', 'All 25+ AI models', '100MB uploads', 'Priority support', 'Analytics dashboard'],
        badge: 'POPULAR'
      },
      {
        id: 'pro_annual',
        name: 'Pro (Annual)',
        price: 8999,
        currency: 'usd',
        interval: 'year',
        features: ['Everything in Pro', '2 months free'],
        badge: 'SAVE 25%'
      },
      {
        id: 'enterprise_monthly',
        name: 'Enterprise',
        price: 1499,
        currency: 'usd',
        interval: 'month',
        features: ['Everything in Pro', 'Custom models', 'API access', 'SLA', 'Dedicated support', 'All connectors'],
        badge: 'ENTERPRISE'
      }
    ],
    paymentMethods: ['visa', 'mastercard', 'amex', 'discover', 'debit', 'apple_pay', 'google_pay', 'link', 'crypto', 'gift_card'],
    cryptoNote: 'Crypto payments via Stripe Link (USDC, ETH supported on checkout)'
  });
});

// GET /api/payments/subscription
router.get('/subscription', authenticate, async (req, res) => {
  const customerId = req.query.customerId;
  if (!customerId) return res.json({ subscription: null, plan: 'free' });

  try {
    const s = getStripe();
    const subscriptions = await s.subscriptions.list({ customer: customerId, limit: 1 });
    const sub = subscriptions.data[0];
    if (!sub) return res.json({ subscription: null, plan: 'free' });

    res.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end
      },
      plan: sub.metadata?.plan || 'pro_monthly'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
