// src/routes/payments.js
// Date: 2026-10-03
// Stripe payment routes: subscriptions, one-time, crypto, gift cards

import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

// Gift card store (production: use DB)
const giftCards = new Map();

// Subscription price IDs (configure in Stripe dashboard, reference via env)
const PLANS = {
  pro: {
    name: 'Pro',
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
    amount: 999
  },
  enterprise: {
    name: 'Enterprise',
    monthly: process.env.STRIPE_ENT_MONTHLY_PRICE_ID || 'price_ent_monthly',
    annual: process.env.STRIPE_ENT_ANNUAL_PRICE_ID || 'price_ent_annual',
    amount: 1499
  }
};

// POST /api/payments/create-checkout  — card/subscription
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { plan, interval = 'monthly', successUrl, cancelUrl } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const priceId = PLANS[plan][interval];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3001'}/success`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3001'}/cancel`,
      metadata: { userId: req.user.sub, plan }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/create-payment-intent  — one-time payment
router.post('/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'usd', description } = req.body;
    if (!amount || amount < 50) return res.status(400).json({ error: 'Invalid amount' });

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      description,
      metadata: { userId: req.user.sub },
      automatic_payment_methods: { enabled: true }
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/crypto-checkout  — crypto payment info
router.post('/crypto-checkout', requireAuth, async (req, res) => {
  try {
    const { plan, cryptoCurrency = 'BTC' } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    // In production, integrate with Coinbase Commerce or BitPay
    // This provides the structure without hardcoded addresses
    const paymentId = uuidv4();
    const supportedCrypto = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'LTC', 'XRP'];
    if (!supportedCrypto.includes(cryptoCurrency)) {
      return res.status(400).json({ error: 'Unsupported cryptocurrency', supported: supportedCrypto });
    }

    res.json({
      paymentId,
      plan,
      cryptoCurrency,
      status: 'pending',
      expiresAt: Date.now() + 30 * 60 * 1000,
      instructions: `Send payment to the address provided by your crypto wallet integration. Payment ID: ${paymentId}`,
      note: 'Configure CRYPTO_PAYMENT_GATEWAY_KEY in environment to enable live crypto payments.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/gift-card/create  — admin: generate gift card
router.post('/gift-card/create', requireAuth, async (req, res) => {
  try {
    const { amount, plan, expiryDays = 365 } = req.body;
    const code = `NEXUS-${crypto.randomUUID().split('-')[0].toUpperCase()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const card = {
      code,
      amount: amount || 0,
      plan: plan || null,
      expiresAt: Date.now() + expiryDays * 86400000,
      used: false,
      createdAt: Date.now(),
      createdBy: req.user.sub
    };
    giftCards.set(code, card);
    res.status(201).json({ code, expiresAt: card.expiresAt, plan, amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/gift-card/redeem
router.post('/gift-card/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const card = giftCards.get(code.toUpperCase().trim());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.used) return res.status(409).json({ error: 'Gift card already used' });
  if (card.expiresAt < Date.now()) return res.status(410).json({ error: 'Gift card expired' });

  card.used = true;
  card.usedBy = req.user.sub;
  card.usedAt = Date.now();
  giftCards.set(code, card);

  res.json({ success: true, plan: card.plan, amount: card.amount, message: 'Gift card redeemed successfully' });
});

// POST /api/payments/webhook  — Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
  case 'checkout.session.completed':
    // Update user subscription status in production
    break;
  case 'invoice.payment_succeeded':
    // Renew subscription
    break;
  case 'customer.subscription.deleted':
    // Downgrade user
    break;
  }

  res.json({ received: true });
});

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([id, p]) => ({
      id,
      name: p.name,
      monthlyAmount: p.amount,
      annualAmount: Math.round(p.amount * 10),
      currency: 'usd'
    })),
    supportedMethods: ['card', 'crypto', 'gift-card'],
    supportedCards: ['visa', 'mastercard', 'amex', 'discover', 'unionpay', 'jcb'],
    supportedCrypto: ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'LTC', 'XRP']
  });
});

export default router;
