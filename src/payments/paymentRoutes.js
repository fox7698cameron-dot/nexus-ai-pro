// Created: 2026-09-30
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import express from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Stripe client — key loaded exclusively from environment
// ---------------------------------------------------------------------------
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

// ---------------------------------------------------------------------------
// Price ID map — amounts never hardcoded; all from env with sensible fallbacks
// ---------------------------------------------------------------------------
const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  enterprise_plus: process.env.STRIPE_PRICE_ENTERPRISE_PLUS,
};

// Lookup price ID and throw clearly if it is missing
function requirePriceId(tierId) {
  const id = PRICE_IDS[tierId];
  if (!id) throw new Error(`No Stripe price ID configured for tier: ${tierId}. Set STRIPE_PRICE_${tierId.toUpperCase()} in your environment.`);
  return id;
}

// ---------------------------------------------------------------------------
// JWT auth middleware
// ---------------------------------------------------------------------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// Rate limiters (configurable via env, sane defaults)
// ---------------------------------------------------------------------------
const defaultLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 200, // Stripe can send many events
  standardHeaders: true,
  legacyHeaders: false,
});

const cryptoLimiter = rateLimit({
  windowMs: 60_000,
  max: parseInt(process.env.CRYPTO_RATE_LIMIT_MAX ?? '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// Simulated crypto payment store (replace with a proper DB in production)
// ---------------------------------------------------------------------------
const cryptoPayments = new Map();

// Deterministic dummy addresses — production would use a custody provider API
function generateCryptoAddress(coin, userId, paymentId) {
  const seeds = {
    BTC: 'bc1q',
    ETH: '0x',
    USDC: '0x',
    USDT: '0x',
  };
  const prefix = seeds[coin] ?? '0x';
  // Pseudo-random but reproducible suffix for demo; replace with real custody API
  const hash = Buffer.from(`${userId}:${paymentId}:${coin}`).toString('hex').slice(0, 40);
  return `${prefix}${hash}`;
}

// ---------------------------------------------------------------------------
// Simulated gift card store (replace with a proper DB in production)
// ---------------------------------------------------------------------------
const giftCards = new Map([
  ['NEXUS-DEMO-GIFT-1234', { value: 999, currency: 'usd', tierId: 'pro', used: false }],
  ['NEXUS-DEMO-GIFT-5678', { value: 4999, currency: 'usd', tierId: 'enterprise', used: false }],
]);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = express.Router();

// Apply default rate limiter to all payment routes
router.use(defaultLimiter);

// ---------------------------------------------------------------------------
// POST /api/payments/create-intent
// Create a Stripe PaymentIntent for a one-time charge
// ---------------------------------------------------------------------------
router.post('/create-intent', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { tierId, priceId, currency = 'usd' } = req.body;

    if (!tierId) return res.status(400).json({ error: 'tierId is required' });

    // Fetch the price from Stripe to get the actual amount — never accept amount from client
    const stripePriceId = priceId ?? requirePriceId(tierId);
    const price = await stripe.prices.retrieve(stripePriceId);

    if (!price.unit_amount) {
      return res.status(400).json({ error: 'Price does not have a fixed unit amount' });
    }

    const intent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency ?? currency,
      metadata: {
        userId: req.user.id ?? req.user.sub,
        tierId,
        priceId: stripePriceId,
      },
      automatic_payment_methods: { enabled: true },
    });

    return res.json({ clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) {
    console.error('[payments] create-intent error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/create-subscription
// Create a Stripe Subscription (recurring billing)
// ---------------------------------------------------------------------------
router.post('/create-subscription', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { tierId, paymentMethodId } = req.body;

    if (!tierId || !paymentMethodId) {
      return res.status(400).json({ error: 'tierId and paymentMethodId are required' });
    }

    const userId = req.user.id ?? req.user.sub;
    const userEmail = req.user.email;
    const stripePriceId = requirePriceId(tierId);

    // Retrieve or create Stripe customer
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, tierId },
    });

    const invoice = subscription.latest_invoice;
    const clientSecret = invoice?.payment_intent?.client_secret ?? null;

    return res.json({
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
      customerId,
    });
  } catch (err) {
    console.error('[payments] create-subscription error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/webhook
// Handle Stripe webhook events — signature verified before any processing
// ---------------------------------------------------------------------------
router.post(
  '/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }), // raw body required for signature verification
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[payments] STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('[payments] Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Process verified events
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          console.info('[payments] PaymentIntent succeeded:', pi.id, 'user:', pi.metadata?.userId);
          // TODO: update user subscription status in database
          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          console.warn('[payments] PaymentIntent failed:', pi.id, 'reason:', pi.last_payment_error?.message);
          // TODO: notify user of failed payment
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          console.info('[payments] Subscription updated:', sub.id, 'status:', sub.status);
          // TODO: sync subscription status to database
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          console.info('[payments] Subscription cancelled:', sub.id, 'user:', sub.metadata?.userId);
          // TODO: downgrade user to free tier in database
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          console.info('[payments] Invoice paid:', invoice.id, 'amount:', invoice.amount_paid);
          // TODO: record invoice in database, send receipt email
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          console.warn('[payments] Invoice payment failed:', invoice.id, 'next attempt:', invoice.next_payment_attempt);
          // TODO: notify user, handle dunning logic
          break;
        }

        default:
          console.debug('[payments] Unhandled webhook event:', event.type);
      }

      return res.json({ received: true, type: event.type });
    } catch (err) {
      console.error('[payments] Webhook handler error:', err.message);
      return res.status(500).json({ error: 'Internal webhook handler error' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/payments/cancel-subscription
// Cancel a Stripe Subscription (at period end)
// ---------------------------------------------------------------------------
router.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { subscriptionId } = req.body;

    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required' });

    // Verify the subscription belongs to the requesting user before cancelling
    const existing = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = req.user.id ?? req.user.sub;
    if (existing.metadata?.userId && existing.metadata.userId !== String(userId)) {
      return res.status(403).json({ error: 'You do not have permission to cancel this subscription' });
    }

    const cancelled = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return res.json({
      subscriptionId: cancelled.id,
      cancelAtPeriodEnd: cancelled.cancel_at_period_end,
      currentPeriodEnd: new Date(cancelled.current_period_end * 1000).toISOString(),
      status: cancelled.status,
    });
  } catch (err) {
    console.error('[payments] cancel-subscription error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/change-plan
// Upgrade or downgrade a Stripe Subscription
// ---------------------------------------------------------------------------
router.post('/change-plan', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { subscriptionId, newTierId, newPriceId } = req.body;

    if (!subscriptionId || !newTierId) {
      return res.status(400).json({ error: 'subscriptionId and newTierId are required' });
    }

    const stripePriceId = newPriceId ?? requirePriceId(newTierId);

    // Verify ownership
    const existing = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = req.user.id ?? req.user.sub;
    if (existing.metadata?.userId && existing.metadata.userId !== String(userId)) {
      return res.status(403).json({ error: 'You do not have permission to modify this subscription' });
    }

    const subscriptionItemId = existing.items.data[0]?.id;
    if (!subscriptionItemId) return res.status(400).json({ error: 'Subscription has no items' });

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: subscriptionItemId, price: stripePriceId }],
      proration_behavior: 'create_prorations',
      metadata: { ...existing.metadata, tierId: newTierId },
    });

    return res.json({
      subscriptionId: updated.id,
      status: updated.status,
      newTierId,
      currentPeriodEnd: new Date(updated.current_period_end * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[payments] change-plan error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payments/history
// Retrieve payment history for the authenticated user
// ---------------------------------------------------------------------------
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const userId = req.user.id ?? req.user.sub;
    const customerId = req.user.stripeCustomerId;

    if (!customerId) {
      return res.json({ payments: [] });
    }

    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    const startingAfter = req.query.starting_after;

    const params = { customer: customerId, limit };
    if (startingAfter) params.starting_after = startingAfter;

    const charges = await stripe.charges.list(params);

    const payments = charges.data.map((charge) => ({
      id: charge.id,
      date: new Date(charge.created * 1000).toISOString(),
      description: charge.description ?? charge.metadata?.tierId ?? 'Nexus AI Pro',
      amount: charge.amount,
      currency: charge.currency,
      method: charge.payment_method_details?.card
        ? `${charge.payment_method_details.card.brand} ····${charge.payment_method_details.card.last4}`
        : charge.payment_method_details?.type ?? 'unknown',
      status: charge.status,
      receiptUrl: charge.receipt_url,
    }));

    return res.json({
      payments,
      hasMore: charges.has_more,
      lastId: charges.data[charges.data.length - 1]?.id ?? null,
    });
  } catch (err) {
    console.error('[payments] history error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/redeem-giftcard
// Redeem a gift card code
// ---------------------------------------------------------------------------
router.post('/redeem-giftcard', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'code is required' });

    const normalized = code.toUpperCase().trim();
    const card = giftCards.get(normalized);

    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    if (card.used) return res.status(409).json({ error: 'Gift card has already been redeemed' });

    // Mark as used
    giftCards.set(normalized, { ...card, used: true, usedBy: req.user.id ?? req.user.sub, usedAt: new Date().toISOString() });

    // TODO: apply credit to user account / activate subscription in database

    return res.json({
      success: true,
      message: `Gift card redeemed! ${card.value / 100} ${card.currency.toUpperCase()} credit applied to your account.`,
      tierId: card.tierId,
      value: card.value,
      currency: card.currency,
    });
  } catch (err) {
    console.error('[payments] redeem-giftcard error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/crypto/generate-address
// Generate a crypto payment address for the requested coin
// ---------------------------------------------------------------------------
router.post('/crypto/generate-address', authMiddleware, cryptoLimiter, async (req, res) => {
  try {
    const { coin, tierId, amount } = req.body;

    const supportedCoins = ['BTC', 'ETH', 'USDC', 'USDT'];
    if (!coin || !supportedCoins.includes(coin)) {
      return res.status(400).json({ error: `coin must be one of: ${supportedCoins.join(', ')}` });
    }
    if (!tierId) return res.status(400).json({ error: 'tierId is required' });
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number (USD)' });
    }

    const userId = req.user.id ?? req.user.sub;
    const paymentId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30-minute window

    // In production: call a crypto payment processor (e.g. BitPay, Coinbase Commerce, NOWPayments)
    // and store real addresses from their API
    const address = generateCryptoAddress(coin, userId, paymentId);

    // Approximate fiat→crypto conversion rates (production: use live rate from exchange API)
    const approxRates = { BTC: 65000, ETH: 3200, USDC: 1, USDT: 1 };
    const rate = approxRates[coin] ?? 1;
    const cryptoAmount = (amount / rate).toFixed(coin === 'BTC' ? 8 : coin === 'ETH' ? 6 : 2);

    const record = {
      paymentId,
      userId,
      coin,
      tierId,
      fiatAmount: amount,
      cryptoAmount,
      address,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    cryptoPayments.set(paymentId, record);

    return res.json({
      paymentId,
      coin,
      address,
      cryptoAmount,
      fiatAmount: amount,
      expiresAt,
      status: 'pending',
    });
  } catch (err) {
    console.error('[payments] crypto/generate-address error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payments/crypto/check/:paymentId
// Poll the status of a crypto payment
// ---------------------------------------------------------------------------
router.get('/crypto/check/:paymentId', authMiddleware, cryptoLimiter, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const record = cryptoPayments.get(paymentId);

    if (!record) return res.status(404).json({ error: 'Payment not found' });

    // Ownership check
    const userId = req.user.id ?? req.user.sub;
    if (String(record.userId) !== String(userId)) {
      return res.status(403).json({ error: 'You do not have permission to view this payment' });
    }

    // Check expiry
    const expired = new Date() > new Date(record.expiresAt);
    if (expired && record.status === 'pending') {
      cryptoPayments.set(paymentId, { ...record, status: 'expired' });
      record.status = 'expired';
    }

    // In production: query your crypto payment processor's API for real confirmation status
    // e.g. Coinbase Commerce, NOWPayments, BitPay webhooks

    return res.json({
      paymentId,
      status: record.status, // 'pending' | 'confirmed' | 'expired' | 'failed'
      coin: record.coin,
      cryptoAmount: record.cryptoAmount,
      fiatAmount: record.fiatAmount,
      address: record.address,
      expiresAt: record.expiresAt,
      tierId: record.tierId,
    });
  } catch (err) {
    console.error('[payments] crypto/check error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

// ---------------------------------------------------------------------------
// Mount helper — import this in server.js:
//   import paymentRoutes from './src/payments/paymentRoutes.js';
//   app.use('/api/payments', paymentRoutes);
//
// Webhook note: /api/payments/webhook must be mounted BEFORE express.json()
// so the raw body buffer reaches the Stripe signature check.  Example:
//   app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes);
//   app.use(express.json());
//   app.use('/api/payments', paymentRoutes);
// ---------------------------------------------------------------------------
