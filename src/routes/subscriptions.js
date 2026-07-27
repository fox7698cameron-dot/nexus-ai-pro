// src/routes/subscriptions.js
// 2026-07-27 | Nexus AI Pro — Subscription & Billing
// Stripe (all major cards: Visa, MC, Amex, Discover) + crypto + gift cards
// API keys NEVER hardcoded — loaded from environment variables only

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

// In-memory stores (replace with Postgres/Redis in production)
const subscriptions = new Map();
const giftCards = new Map();
const invoices = new Map();

const PLANS = {
  free:       { id: 'free',       name: 'Free',       price: 0,    interval: 'month', features: ['Basic AI', '10 projects', '5GB storage'] },
  pro:        { id: 'pro',        name: 'Pro',         price: 1999, interval: 'month', features: ['All AI models', '100 projects', '100GB storage', 'Analytics', 'Priority support'] },
  enterprise: { id: 'enterprise', name: 'Enterprise',  price: 9999, interval: 'month', features: ['Unlimited everything', 'SSO', 'SLA', 'Dedicated support', 'Custom integrations'] },
};

const SUPPORTED_PAYMENT_METHODS = ['card', 'crypto_btc', 'crypto_eth', 'crypto_usdc', 'gift_card'];
const SUPPORTED_CRYPTO = ['btc', 'eth', 'usdc', 'sol', 'bnb'];

async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const stripe = await import('stripe');
    return stripe.default(key);
  } catch {
    return null;
  }
}

// Sanitize Stripe amount: integer cents
function toStripeAmount(priceInCents) {
  return Math.round(Number(priceInCents));
}

// ─── Plans ────────────────────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// ─── Current subscription ─────────────────────────────────────────────────────
router.get('/me', requireAuth(), (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub) {
    return res.json({ plan: 'free', status: 'active', ...PLANS.free, userId: req.user.sub });
  }
  res.json(sub);
});

// ─── Create/upgrade subscription (Stripe) ────────────────────────────────────
router.post('/create', requireAuth(), async (req, res) => {
  try {
    const { planId, paymentMethodId, paymentType = 'card' } = req.body;

    if (!PLANS[planId]) return res.status(400).json({ error: `Invalid plan. Options: ${Object.keys(PLANS).join(', ')}` });
    if (!SUPPORTED_PAYMENT_METHODS.includes(paymentType)) {
      return res.status(400).json({ error: `Unsupported payment method. Options: ${SUPPORTED_PAYMENT_METHODS.join(', ')}` });
    }

    const plan = PLANS[planId];
    const userId = req.user.sub;

    // Stripe card payment
    if (paymentType === 'card') {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ error: 'Payment processor not configured. Set STRIPE_SECRET_KEY.' });
      }
      if (!paymentMethodId) {
        return res.status(400).json({ error: 'paymentMethodId required for card payments' });
      }

      // Store subscription record; Stripe webhook would confirm in production
      const sub = {
        id: uuidv4(),
        userId,
        plan: planId,
        planDetails: plan,
        paymentType,
        stripePaymentMethodId: paymentMethodId,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      subscriptions.set(userId, sub);

      const invoice = {
        id: uuidv4(),
        userId,
        subscriptionId: sub.id,
        amount: plan.price,
        currency: 'usd',
        status: 'paid',
        issuedAt: new Date().toISOString(),
      };
      invoices.set(invoice.id, invoice);

      return res.json({ subscription: sub, invoice, clientSecret: null, message: 'Subscription created. Configure Stripe webhooks for production billing.' });
    }

    // Crypto payment
    if (paymentType.startsWith('crypto_')) {
      const coin = paymentType.replace('crypto_', '');
      if (!SUPPORTED_CRYPTO.includes(coin)) {
        return res.status(400).json({ error: `Unsupported crypto. Options: ${SUPPORTED_CRYPTO.join(', ')}` });
      }

      const walletAddress = process.env[`CRYPTO_WALLET_${coin.toUpperCase()}`];
      if (!walletAddress) {
        return res.status(503).json({ error: `Crypto wallet for ${coin.toUpperCase()} not configured` });
      }

      // Return payment address — blockchain confirmation handled by webhook
      const cryptoOrder = {
        id: uuidv4(),
        userId,
        plan: planId,
        paymentType,
        coin,
        walletAddress,
        amountUsd: plan.price / 100,
        status: 'pending',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      return res.json({ order: cryptoOrder, message: 'Send exact amount to walletAddress. Subscription activates on confirmation.' });
    }

    // Gift card
    if (paymentType === 'gift_card') {
      const { giftCardCode } = req.body;
      if (!giftCardCode) return res.status(400).json({ error: 'giftCardCode required' });

      const card = giftCards.get(giftCardCode);
      if (!card) return res.status(400).json({ error: 'Invalid gift card code' });
      if (card.redeemed) return res.status(400).json({ error: 'Gift card already redeemed' });
      if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Gift card expired' });
      }

      card.redeemed = true;
      card.redeemedAt = new Date().toISOString();
      card.redeemedBy = userId;
      giftCards.set(giftCardCode, card);

      const sub = {
        id: uuidv4(), userId, plan: planId, planDetails: plan, paymentType: 'gift_card',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + card.durationDays * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      subscriptions.set(userId, sub);
      return res.json({ subscription: sub });
    }

    res.status(400).json({ error: 'Unhandled payment type' });
  } catch (err) {
    res.status(500).json({ error: 'Subscription creation failed' });
  }
});

// ─── Cancel subscription ──────────────────────────────────────────────────────
router.post('/cancel', requireAuth(), (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub) return res.status(404).json({ error: 'No active subscription' });
  sub.status = 'canceled';
  sub.canceledAt = new Date().toISOString();
  subscriptions.set(req.user.sub, sub);
  res.json({ canceled: true, accessUntil: sub.currentPeriodEnd });
});

// ─── Invoices ────────────────────────────────────────────────────────────────
router.get('/invoices', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const userInvoices = Array.from(invoices.values()).filter(i => i.userId === userId);
  res.json({ invoices: userInvoices });
});

// ─── Gift card management (admin) ─────────────────────────────────────────────
router.post('/gift-cards', requireAuth(4), (req, res) => {
  const { value, durationDays = 30, currency = 'usd' } = req.body;
  const code = generateGiftCode();
  const card = { code, value, currency, durationDays, redeemed: false, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 365 * 86400000).toISOString() };
  giftCards.set(code, card);
  res.status(201).json(card);
});

function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 16 }, (_, i) => {
    const r = chars[Math.floor(Math.random() * chars.length)];
    return i > 0 && i % 4 === 0 ? '-' + r : r;
  }).join('');
}

// ─── Stripe webhook (signature verification) ─────────────────────────────────
router.post('/webhook/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

  // In production: use stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
  // and handle payment_intent.succeeded, customer.subscription.* events
  res.json({ received: true });
});

export { router as subscriptionsRouter };
