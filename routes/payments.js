// ================================================
// routes/payments.js
// Payment Processing API Routes
// Stripe, Crypto, Gift Cards, Multi-currency
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { requireAuth } from './auth.js';

const router = Router();

// ─── Stripe config from env (never hardcoded) ────────────────────────────────
function getStripe() {
  // Lazy-load Stripe to avoid crash when key not configured
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_placeholder')) {
    return null;
  }
  // Dynamic import of stripe in production
  return { key }; // Replace with: import('stripe').then(m => new m.default(key))
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SUBSCRIPTION_PLANS = {
  free: { id: 'free', name: 'Free', price: 0, currency: 'usd', features: ['5 AI requests/day', 'Basic analytics', '1 project'] },
  pro: { id: 'pro', name: 'Pro', price: 1999, currency: 'usd', stripePriceId: process.env.STRIPE_PRICE_PRO, features: ['Unlimited AI', 'Full analytics', '10 projects', 'Priority support'] },
  enterprise: { id: 'enterprise', name: 'Enterprise', price: 9999, currency: 'usd', stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE, features: ['Everything in Pro', 'White-label', 'SLA', 'Dedicated support', 'Custom integrations'] },
  gamedev: { id: 'gamedev', name: 'Game Dev', price: 4999, currency: 'usd', stripePriceId: process.env.STRIPE_PRICE_GAMEDEV, features: ['Game analytics', 'Platform connectors', 'Achievement tracking', 'Unreal/Unity/Sony/Xbox APIs'] },
  studio: { id: 'studio', name: 'Studio', price: 19999, currency: 'usd', stripePriceId: process.env.STRIPE_PRICE_STUDIO, features: ['Everything in Game Dev', 'AR/VR tools', 'Team seats (20)', 'Revenue sharing analytics'] },
};

const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'MATIC'];

// In-memory stores (use DB in production)
const payments = new Map();
const subscriptions = new Map();
const giftCards = new Map();
const cryptoPayments = new Map();

// ─── Gift card utilities ──────────────────────────────────────────────────────
function generateGiftCardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  );
  return parts.join('-');
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/payments/plans - List subscription plans
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(SUBSCRIPTION_PLANS) });
});

// POST /api/payments/intent - Create Stripe PaymentIntent
router.post('/intent', requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'usd', paymentMethod = 'card', planId, metadata = {} } = req.body;

    if (!amount || amount < 50) { // Stripe minimum 50 cents
      return res.status(400).json({ error: 'Amount must be at least 50 cents (in lowest denomination)' });
    }

    const stripe = getStripe();
    if (!stripe) {
      // Demo mode: return mock client secret
      const mockIntent = {
        id: `pi_demo_${uuidv4().replace(/-/g, '')}`,
        client_secret: `pi_demo_secret_${crypto.randomBytes(16).toString('hex')}`,
        amount,
        currency,
        status: 'requires_payment_method',
        demo: true,
      };
      return res.json(mockIntent);
    }

    // Real Stripe implementation:
    // const Stripe = (await import('stripe')).default;
    // const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const intent = await stripeClient.paymentIntents.create({ amount, currency, automatic_payment_methods: { enabled: true }, metadata: { userId: req.user.sub, planId, ...metadata } });
    // res.json({ clientSecret: intent.client_secret, id: intent.id });

    res.json({ error: 'Stripe not configured', configureAt: 'STRIPE_SECRET_KEY env var' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/subscription - Create/update subscription
router.post('/subscription', requireAuth, async (req, res) => {
  try {
    const { planId, paymentMethodId } = req.body;

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    if (plan.price === 0) {
      // Free plan - no payment needed
      const sub = {
        id: uuidv4(),
        userId: req.user.sub,
        plan: planId,
        status: 'active',
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      };
      subscriptions.set(sub.id, sub);
      return res.json(sub);
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.json({
        demo: true,
        message: 'Configure STRIPE_SECRET_KEY to enable real subscriptions',
        plan: planId,
        price: plan.price,
      });
    }

    res.status(501).json({ error: 'Stripe integration requires STRIPE_SECRET_KEY configuration' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/subscription - Get current subscription
router.get('/subscription', requireAuth, (req, res) => {
  let sub = null;
  for (const s of subscriptions.values()) {
    if (s.userId === req.user.sub) { sub = s; break; }
  }
  res.json(sub || { plan: 'free', status: 'active' });
});

// POST /api/payments/crypto/initiate - Initiate crypto payment
router.post('/crypto/initiate', requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'USDC', planId } = req.body;

    if (!CRYPTO_CURRENCIES.includes(currency)) {
      return res.status(400).json({ error: `Unsupported crypto currency. Supported: ${CRYPTO_CURRENCIES.join(', ')}` });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    // Generate payment address (in production: use Coinbase Commerce, NOWPayments, etc.)
    const walletAddress = process.env[`CRYPTO_${currency}_WALLET`] || `demo_${currency.toLowerCase()}_wallet_address`;
    const paymentId = uuidv4();
    const amountInCrypto = (plan.price / 100 / 3000).toFixed(8); // Rough demo conversion

    const payment = {
      id: paymentId,
      userId: req.user.sub,
      currency,
      amount: amountInCrypto,
      usdAmount: plan.price / 100,
      walletAddress,
      planId,
      status: 'pending',
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 min window
      createdAt: Date.now(),
      network: getCryptoNetwork(currency),
      confirmationsRequired: 1,
    };

    cryptoPayments.set(paymentId, payment);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getCryptoNetwork(currency) {
  const networks = { BTC: 'Bitcoin', ETH: 'Ethereum', USDC: 'Ethereum (ERC-20)', USDT: 'TRON (TRC-20)', SOL: 'Solana', MATIC: 'Polygon' };
  return networks[currency] || 'Unknown';
}

// GET /api/payments/crypto/:paymentId - Check crypto payment status
router.get('/crypto/:paymentId', requireAuth, (req, res) => {
  const payment = cryptoPayments.get(req.params.paymentId);
  if (!payment || payment.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json(payment);
});

// POST /api/payments/giftcard/redeem - Redeem a gift card
router.post('/giftcard/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const normalizedCode = code.toUpperCase().replace(/[\s-]/g, '');
  const card = giftCards.get(normalizedCode);

  if (!card) return res.status(404).json({ error: 'Gift card not found' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
  if (card.expiresAt && Date.now() > card.expiresAt) {
    return res.status(410).json({ error: 'Gift card expired' });
  }

  card.redeemed = true;
  card.redeemedBy = req.user.sub;
  card.redeemedAt = Date.now();

  res.json({
    success: true,
    value: card.value,
    currency: card.currency,
    plan: card.plan || null,
    message: `Gift card redeemed: ${card.value / 100} ${card.currency.toUpperCase()} credit applied`,
  });
});

// POST /api/payments/giftcard/generate (admin only)
router.post('/giftcard/generate', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { value, currency = 'usd', plan, quantity = 1, expiresInDays = 365 } = req.body;
  if (!value || value < 100) return res.status(400).json({ error: 'Value must be at least $1.00' });

  const codes = [];
  for (let i = 0; i < Math.min(quantity, 100); i++) {
    const code = generateGiftCardCode();
    const card = {
      code,
      value,
      currency,
      plan: plan || null,
      redeemed: false,
      createdBy: req.user.sub,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresInDays * 86400000,
    };
    giftCards.set(code, card);
    codes.push(code);
  }

  res.json({ codes, count: codes.length });
});

// GET /api/payments/history - Payment history
router.get('/history', requireAuth, (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const userPayments = [...payments.values()]
    .filter(p => p.userId === req.user.sub)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(Number(offset), Number(offset) + Number(limit));

  res.json({ payments: userPayments, total: userPayments.length });
});

// POST /api/payments/webhook/stripe - Stripe webhook endpoint
router.post('/webhook/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).json({ error: 'Stripe webhook secret not configured' });
  }

  // Verify webhook signature (in production use stripe.webhooks.constructEvent)
  // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  res.json({ received: true });
});

// GET /api/payments/currencies - Supported currencies
router.get('/currencies', (req, res) => {
  res.json({
    fiat: ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'nzd', 'sek', 'nok'],
    crypto: CRYPTO_CURRENCIES,
    giftCard: true,
    applePay: true,
    googlePay: true,
  });
});

export default router;
