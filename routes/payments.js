// routes/payments.js — 2026-07-26
// Stripe subscriptions, crypto payments, gift card redemption
import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = express.Router();

// Stripe client (key sourced from env — never hardcoded)
const stripeClient = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2024-06-20' });
};

// ── Subscription plans ─────────────────────────────────────────────────────────
const PLANS = {
  free: { id: 'free', name: 'Free', price: 0, currency: 'usd', interval: null, features: ['5 chats/day', '1MB uploads'] },
  pro: {
    id: 'pro', name: 'Pro', price: 999, currency: 'usd', interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['Unlimited chats', 'All models', '100MB uploads', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 1499, currency: 'usd', interval: 'month',
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: ['Everything in Pro', 'Custom models', 'API access', 'Dedicated support', 'SLA guarantee'],
  },
};

// ── Gift card store (in-memory, replace with DB) ──────────────────────────────
const giftCards = new Map();

// Seed a test gift card on startup
const testCode = 'NEXUS-DEMO-2026';
giftCards.set(testCode, { code: testCode, amount: 999, currency: 'usd', redeemed: false });

// ── Subscription record store ─────────────────────────────────────────────────
const subscriptions = new Map(); // userId → subscription record

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  res.json(Object.values(PLANS).map(({ stripePriceId, ...p }) => p));
});

// POST /api/payments/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const plan = PLANS[planId];
    if (!plan || plan.price === 0) {
      return res.status(400).json({ error: 'Invalid plan or free plan selected' });
    }
    if (!plan.stripePriceId) {
      return res.status(503).json({ error: 'Plan not yet configured in Stripe' });
    }

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl || `${process.env.CORS_ORIGIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl  || `${process.env.CORS_ORIGIN}/checkout/cancel`,
      metadata: { userId: req.user.sub, planId },
    });
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/checkout/one-time — one-time payment (legacy / gift)
router.post('/checkout/one-time', requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'usd', description } = req.body;
    if (!amount || amount < 50) return res.status(400).json({ error: 'Minimum amount is 50 cents' });

    const stripe = stripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.floor(amount),
      currency,
      metadata: { userId: req.user.sub, description: description || 'Nexus AI Pro' },
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook — Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(503).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const HANDLED = new Set(['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed']);
  if (HANDLED.has(event.type)) {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      const planId = session.metadata?.planId || 'pro';
      subscriptions.set(userId, {
        userId, planId, status: event.type === 'customer.subscription.deleted' ? 'cancelled' : 'active',
        updatedAt: new Date().toISOString(),
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      });
    }
  }
  res.json({ received: true });
});

// GET /api/payments/subscription — get current user subscription
router.get('/subscription', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.sub) || { planId: 'free', status: 'active' };
  const plan = PLANS[sub.planId] || PLANS.free;
  const { stripePriceId, ...planData } = plan;
  res.json({ ...sub, plan: planData });
});

// POST /api/payments/gift-card/redeem
router.post('/gift-card/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Code required' });
  const card = giftCards.get(code.toUpperCase().trim());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
  card.redeemed = true;
  card.redeemedBy = req.user.sub;
  card.redeemedAt = new Date().toISOString();
  res.json({ success: true, amount: card.amount, currency: card.currency });
});

// POST /api/payments/crypto/intent — generate crypto payment address / intent
router.post('/crypto/intent', requireAuth, (req, res) => {
  // Crypto payment integration hooks in here — partner with Coinbase Commerce / BitPay via their REST APIs
  // For now return a deterministic address stub (replace with real integration)
  const { planId, coin = 'BTC' } = req.body;
  const plan = PLANS[planId];
  if (!plan || plan.price === 0) return res.status(400).json({ error: 'Invalid plan' });
  const paymentId = uuidv4();
  const intentHash = crypto.createHmac('sha256', process.env.ENCRYPTION_SECRET || 'dev')
    .update(`${req.user.sub}:${planId}:${paymentId}`)
    .digest('hex');
  res.json({
    paymentId,
    coin,
    amount: (plan.price / 100).toFixed(2),
    intentHash,
    expiresAt: Date.now() + 30 * 60 * 1000,
    note: 'Integrate with Coinbase Commerce or BitPay for live addresses',
  });
});

// GET /api/payments/methods — list supported payment methods
router.get('/methods', (req, res) => {
  res.json({
    cards: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay'],
    digital: ['apple_pay', 'google_pay', 'paypal'],
    crypto: ['BTC', 'ETH', 'USDC', 'SOL'],
    giftCards: true,
  });
});

export default router;
