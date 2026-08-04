/**
 * @file payments.js  (routes)
 * @description Express router for payment processing: Stripe checkout,
 *   webhook handling, subscription management, crypto payments, and gift
 *   card redemption.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 */

import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// ---------------------------------------------------------------------------
// Environment-sourced Stripe config (never hardcode)
// ---------------------------------------------------------------------------

/**
 * Lazily resolves the Stripe secret key from environment.
 * Throws a structured error if missing rather than crashing at import time.
 * @returns {string}
 */
function getStripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error('Stripe is not configured.'), { status: 503 });
  return key;
}

/**
 * Lazily resolves the Stripe webhook signing secret.
 * @returns {string}
 */
function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw Object.assign(new Error('Stripe webhook secret not configured.'), { status: 503 });
  return secret;
}

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const giftCardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Plan
 * @property {string}  id
 * @property {string}  name
 * @property {number}  priceMonthlyUsd  - In USD cents
 * @property {number}  priceAnnualUsd   - In USD cents
 * @property {string[]} features
 * @property {string[]} supportedCards
 */

/** @type {string[]} */
const SUPPORTED_CARD_BRANDS = [
  'visa',
  'mastercard',
  'amex',
  'discover',
  'diners',
  'jcb',
  'unionpay',
];

/** @type {Plan[]} */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceMonthlyUsd: 0,
    priceAnnualUsd: 0,
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
    features: ['5 AI requests/day', 'Community support', 'Basic models'],
    supportedCards: SUPPORTED_CARD_BRANDS,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthlyUsd: 1900, // $19.00
    priceAnnualUsd: 18000, // $180.00 (~$15/mo)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? null,
    features: [
      'Unlimited AI requests',
      'Priority support',
      'All models including GPT-4, Claude 3',
      'MFA & biometric login',
      'Workflow automation (n8n)',
    ],
    supportedCards: SUPPORTED_CARD_BRANDS,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyUsd: 9900, // $99.00
    priceAnnualUsd: 95000, // $950.00
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENT_MONTHLY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_ENT_ANNUAL ?? null,
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'SSO / SAML',
      'Audit logs & compliance export',
      'SLA guarantee',
      'Custom model fine-tuning',
    ],
    supportedCards: SUPPORTED_CARD_BRANDS,
  },
];

// ---------------------------------------------------------------------------
// In-memory stores (replace with DB in production)
// ---------------------------------------------------------------------------

/**
 * Gift card store: code -> { value, redeemed, userId? }
 * @type {Map<string, { valueUsd: number, redeemed: boolean, userId?: string }>}
 */
const giftCards = new Map([
  // Seed a few demo codes; in production load from DB
  ['NEXUS-DEMO-1234', { valueUsd: 19, redeemed: false }],
  ['NEXUS-TEST-5678', { valueUsd: 99, redeemed: false }],
]);

/**
 * User subscription store: userId -> subscription object
 * @type {Map<string, object>}
 */
const subscriptions = new Map();

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createCheckoutSchema = z.object({
  planId: z.enum(['free', 'pro', 'enterprise']),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
  successUrl: z.string().url('successUrl must be a valid URL'),
  cancelUrl: z.string().url('cancelUrl must be a valid URL'),
});

const cryptoCreateSchema = z.object({
  planId: z.enum(['free', 'pro', 'enterprise']),
  currency: z.enum(['BTC', 'ETH', 'USDC']),
});

const giftCardRedeemSchema = z.object({
  code: z.string().min(1, 'Gift card code is required').max(64),
});

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Validates body with a Zod schema; sends 400 and returns null on failure.
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @returns {T | null}
 */
function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: result.error.flatten().fieldErrors,
    });
    return null;
  }
  return result.data;
}

/**
 * Dynamically imports stripe (avoids top-level await and keeps import lazy).
 * Falls back gracefully if the package is not installed.
 * @returns {Promise<import('stripe').Stripe>}
 */
async function getStripe() {
  try {
    const { default: Stripe } = await import('stripe');
    return new Stripe(getStripeSecret(), { apiVersion: '2024-06-20' });
  } catch {
    throw Object.assign(
      new Error('Stripe SDK not available. Run: npm install stripe'),
      { status: 503 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /plans
// ---------------------------------------------------------------------------

/**
 * @route  GET /payments/plans
 * @access Public
 * @returns { plans: Plan[] }
 */
router.get('/plans', (req, res) => {
  // Strip internal Stripe price IDs from public response
  const publicPlans = PLANS.map(({ stripePriceIdMonthly, stripePriceIdAnnual, ...rest }) => rest); // eslint-disable-line no-unused-vars
  return res.status(200).json({ plans: publicPlans });
});

// ---------------------------------------------------------------------------
// POST /create-checkout
// ---------------------------------------------------------------------------

/**
 * @route  POST /payments/create-checkout
 * @access Private (authenticated)
 * @body   { planId, interval, successUrl, cancelUrl }
 * @returns { url }  - Stripe hosted checkout URL
 */
router.post('/create-checkout', checkoutLimiter, authenticate, async (req, res) => {
  const data = parseBody(createCheckoutSchema, req, res);
  if (!data) return;

  const plan = PLANS.find(p => p.id === data.planId);
  if (!plan || data.planId === 'free') {
    return res.status(400).json({ error: 'Checkout not required for this plan.' });
  }

  const priceId =
    data.interval === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;

  if (!priceId) {
    return res.status(503).json({
      error: `Stripe price for plan "${data.planId}" (${data.interval}) is not configured.`,
    });
  }

  try {
    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      metadata: { userId: req.user.id, planId: data.planId },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const status = err.status ?? 500;
    console.error('[payments] create-checkout error:', err.message);
    return res.status(status).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /webhook
// ---------------------------------------------------------------------------

/**
 * @route  POST /payments/webhook
 * @access Public (Stripe-signed)
 *
 * IMPORTANT: mount this route BEFORE express.json() so that req.body is the
 * raw Buffer required for signature verification. In your main server file:
 *
 *   app.use('/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter);
 *   app.use(express.json());
 *   app.use('/payments', paymentsRouter);
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header.' });

  let event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, getWebhookSecret());
  } catch (err) {
    console.error('[payments] webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed.' });
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId) {
        subscriptions.set(userId, {
          stripeSubscriptionId: session.subscription,
          planId: session.metadata?.planId,
          status: 'active',
          currentPeriodEnd: null, // Populate from subscription.updated event
          updatedAt: new Date().toISOString(),
        });
        console.log(`[payments] subscription activated for user ${userId}`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        const existing = subscriptions.get(userId) ?? {};
        subscriptions.set(userId, {
          ...existing,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        const existing = subscriptions.get(userId) ?? {};
        subscriptions.set(userId, {
          ...existing,
          status: 'canceled',
          canceledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`[payments] subscription canceled for user ${userId}`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.warn(`[payments] payment failed for customer ${invoice.customer}`);
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  return res.status(200).json({ received: true });
});

// ---------------------------------------------------------------------------
// POST /crypto/create
// ---------------------------------------------------------------------------

/**
 * @route  POST /payments/crypto/create
 * @access Private (authenticated)
 * @body   { planId, currency: 'BTC' | 'ETH' | 'USDC' }
 * @returns { address, currency, amountUsd, expiresAt }
 *
 * NOTE: This is a mock placeholder. Integrate a real crypto payment
 * processor (e.g. Coinbase Commerce, BTCPay, NOWPayments) before production.
 */
router.post('/crypto/create', authenticate, (req, res) => {
  const data = parseBody(cryptoCreateSchema, req, res);
  if (!data) return;

  const plan = PLANS.find(p => p.id === data.planId);
  if (!plan || data.planId === 'free') {
    return res.status(400).json({ error: 'Crypto payment not required for this plan.' });
  }

  // Mock wallet addresses per currency (replace with dynamically generated addresses)
  const MOCK_ADDRESSES = {
    BTC: process.env.CRYPTO_BTC_ADDRESS ?? '1NexusAIProBTCAddressPlaceholder00',
    ETH: process.env.CRYPTO_ETH_ADDRESS ?? '0xNexusAIProETHAddressPlaceholder',
    USDC: process.env.CRYPTO_USDC_ADDRESS ?? '0xNexusAIProUSDCAddressPlaceholder',
  };

  const amountUsd = plan.priceMonthlyUsd / 100;
  const address = MOCK_ADDRESSES[data.currency];
  const paymentId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  return res.status(200).json({
    paymentId,
    address,
    currency: data.currency,
    amountUsd,
    planId: data.planId,
    expiresAt,
    note: 'Mock payment intent. Integrate a live crypto payment processor before production.',
  });
});

// ---------------------------------------------------------------------------
// POST /giftcard/redeem
// ---------------------------------------------------------------------------

/**
 * @route  POST /payments/giftcard/redeem
 * @access Private (authenticated)
 * @body   { code }
 * @returns { valueUsd, message }
 */
router.post('/giftcard/redeem', giftCardLimiter, authenticate, (req, res) => {
  const data = parseBody(giftCardRedeemSchema, req, res);
  if (!data) return;

  const code = data.code.trim().toUpperCase();
  const card = giftCards.get(code);

  if (!card) {
    // Enumeration-safe: same message for invalid and already-redeemed codes
    return res.status(400).json({ error: 'Invalid or already redeemed gift card code.' });
  }

  if (card.redeemed) {
    return res.status(400).json({ error: 'Invalid or already redeemed gift card code.' });
  }

  // Mark as redeemed
  giftCards.set(code, { ...card, redeemed: true, userId: req.user.id });

  // TODO: Apply credit to user account / extend subscription in production
  console.log(`[payments] gift card ${code} redeemed by user ${req.user.id} — $${card.valueUsd} credit`);

  return res.status(200).json({
    message: `Gift card redeemed successfully. $${card.valueUsd} credit applied to your account.`,
    valueUsd: card.valueUsd,
  });
});

// ---------------------------------------------------------------------------
// GET /subscription
// ---------------------------------------------------------------------------

/**
 * @route  GET /payments/subscription
 * @access Private (authenticated)
 * @returns { subscription }
 */
router.get('/subscription', authenticate, (req, res) => {
  const sub = subscriptions.get(req.user.id) ?? {
    planId: 'free',
    status: 'active',
    currentPeriodEnd: null,
  };
  return res.status(200).json({ subscription: sub });
});

// ---------------------------------------------------------------------------
// POST /subscription/cancel
// ---------------------------------------------------------------------------

/**
 * @route  POST /payments/subscription/cancel
 * @access Private (authenticated)
 * @returns { message }
 */
router.post('/subscription/cancel', authenticate, async (req, res) => {
  const sub = subscriptions.get(req.user.id);

  if (!sub || sub.planId === 'free' || sub.status === 'canceled') {
    return res.status(400).json({ error: 'No active paid subscription to cancel.' });
  }

  try {
    const stripe = await getStripe();
    // Cancel at period end (not immediately) for a better UX
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscriptions.set(req.user.id, {
      ...sub,
      cancelAtPeriodEnd: true,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      message: 'Subscription will be canceled at the end of the current billing period.',
      currentPeriodEnd: sub.currentPeriodEnd,
    });
  } catch (err) {
    console.error('[payments] subscription/cancel error:', err.message);
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
