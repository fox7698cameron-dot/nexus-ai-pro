// src/routes/payments.js | Nexus AI Pro | Date: 2026-06-07
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Enterprise Stripe payment router — ESM, Express 4.x
//
// IMPORTANT: The webhook route (/api/payments/webhook) MUST be mounted BEFORE
// express.json() in your main server so it receives the raw body buffer.
// In server.js, register like:
//   import paymentsRouter from './src/routes/payments.js';
//   app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter);
//   app.use(express.json());
//   app.use('/api/payments', paymentsRouter);
//
// All other routes expect express.json() to have parsed the body.

import express from 'express';
import Stripe from 'stripe';
import { body, param, validationResult } from 'express-validator';

// ─── Stripe Client ────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Router ───────────────────────────────────────────────────────────────────

const router = express.Router();

// ─── Subscription Plan Catalog ────────────────────────────────────────────────

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    priceId: null,
    features: [
      '5 AI queries per day',
      'Access to GPT-3.5 model',
      'Basic encryption',
      'Community support',
      '100 MB storage',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1900, // cents
    currency: 'usd',
    interval: 'month',
    priceId: process.env.STRIPE_PRICE_ID_PRO || null,
    features: [
      'Unlimited AI queries',
      'Access to all AI models (GPT-4, Claude, Gemini)',
      'Military-grade AES-256 encryption',
      'Priority email support',
      '50 GB storage',
      'Advanced automation workflows',
      'API access',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9900, // cents
    currency: 'usd',
    interval: 'month',
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || null,
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'Custom AI model fine-tuning',
      'SSO / SAML integration',
      'Unlimited storage',
      'SLA 99.99% uptime guarantee',
      'Dedicated account manager',
      'Custom integrations & white-labeling',
      'On-premise deployment option',
    ],
  },
};

// ─── In-Memory Gift Card Store (MVP) ─────────────────────────────────────────
// Replace with a database-backed store in production.

const GIFT_CARDS = new Map([
  ['NEXUS2026', { value: 2000, currency: 'usd', redeemed: false, redeemedBy: null }],
  ['TRIAL30',  { value:  900, currency: 'usd', redeemed: false, redeemedBy: null }],
  ['GIFT50',   { value: 5000, currency: 'usd', redeemed: false, redeemedBy: null }],
]);

// ─── Mock Crypto Wallet Addresses (MVP) ───────────────────────────────────────

const CRYPTO_WALLETS = {
  BTC:  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ETH:  '0x742d35Cc6634C0532925a3b8D4C9b5E5f6E3dA21',
  USDC: '0x742d35Cc6634C0532925a3b8D4C9b5E5f6E3dA21',
};

// Rough exchange rates relative to USD (mock — use a live oracle in production)
const CRYPTO_RATES = {
  BTC:  65000,
  ETH:   3200,
  USDC:     1,
};

// ─── Validation Error Helper ──────────────────────────────────────────────────

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/payments/plans — list all subscription plans
router.get('/plans', (_req, res) => {
  const plans = Object.values(PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    priceFormatted: plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}/mo`,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features,
  }));
  res.json({ plans });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-payment-intent
// Creates a one-time PaymentIntent for card / Apple Pay / Google Pay.
// Body: { amount (cents, integer), currency?, metadata? }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/create-payment-intent',
  [
    body('amount')
      .isInt({ min: 50 })
      .withMessage('amount must be an integer ≥ 50 (cents)'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('currency must be a 3-letter ISO code'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('metadata must be an object'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { amount, currency = 'usd', metadata = {} } = req.body;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        metadata,
        // Enable card networks + Apple Pay / Google Pay via Stripe Elements
        automatic_payment_methods: { enabled: true },
      });

      res.status(201).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error('[payments] create-payment-intent error:', err.message);
      res.status(500).json({ error: 'Failed to create payment intent', details: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-customer
// Body: { email, name, metadata: { userId } }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/create-customer',
  [
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('name').notEmpty().trim().withMessage('name is required'),
    body('metadata.userId')
      .optional()
      .isString()
      .withMessage('metadata.userId must be a string'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { email, name, metadata = {} } = req.body;

    try {
      const customer = await stripe.customers.create({ email, name, metadata });
      res.status(201).json({ customerId: customer.id });
    } catch (err) {
      console.error('[payments] create-customer error:', err.message);
      res.status(500).json({ error: 'Failed to create customer', details: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/attach-payment-method
// Body: { customerId, paymentMethodId }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/attach-payment-method',
  [
    body('customerId').notEmpty().withMessage('customerId is required'),
    body('paymentMethodId').notEmpty().withMessage('paymentMethodId is required'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { customerId, paymentMethodId } = req.body;

    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method on the customer
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      res.json({
        success: true,
        paymentMethodId: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
      });
    } catch (err) {
      console.error('[payments] attach-payment-method error:', err.message);
      res.status(500).json({ error: 'Failed to attach payment method', details: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-subscription
// Body: { customerId, priceId, paymentMethodId }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/create-subscription',
  [
    body('customerId').notEmpty().withMessage('customerId is required'),
    body('priceId').notEmpty().withMessage('priceId is required'),
    body('paymentMethodId').notEmpty().withMessage('paymentMethodId is required'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { customerId, priceId, paymentMethodId } = req.body;

    try {
      // Attach & set default payment method first
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice?.payment_intent;

      res.status(201).json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret ?? null,
        status: subscription.status,
      });
    } catch (err) {
      console.error('[payments] create-subscription error:', err.message);
      res.status(500).json({ error: 'Failed to create subscription', details: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/customer/:customerId
// Returns the Stripe customer record + attached payment methods
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/customer/:customerId',
  [param('customerId').notEmpty().withMessage('customerId is required')],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { customerId } = req.params;

    try {
      const [customer, paymentMethods] = await Promise.all([
        stripe.customers.retrieve(customerId),
        stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
      ]);

      if (customer.deleted) {
        return res.status(404).json({ error: 'Customer has been deleted' });
      }

      res.json({
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: customer.created,
          metadata: customer.metadata,
          defaultPaymentMethod: customer.invoice_settings?.default_payment_method ?? null,
        },
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          country: pm.card?.country,
        })),
      });
    } catch (err) {
      console.error('[payments] get-customer error:', err.message);
      const statusCode = err.statusCode === 404 ? 404 : 500;
      res.status(statusCode).json({ error: 'Failed to retrieve customer', details: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/payments/subscription/:subscriptionId
// Cancels a Stripe subscription at period end (grace-period cancel)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/subscription/:subscriptionId',
  [param('subscriptionId').notEmpty().withMessage('subscriptionId is required')],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { subscriptionId } = req.params;

    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAt: subscription.cancel_at,
        currentPeriodEnd: subscription.current_period_end,
      });
    } catch (err) {
      console.error('[payments] cancel-subscription error:', err.message);
      const statusCode = err.statusCode === 404 ? 404 : 500;
      res.status(statusCode).json({ error: 'Failed to cancel subscription', details: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
//
// IMPORTANT: This route MUST receive the raw request body (Buffer), not
// express.json()-parsed JSON. Mount it BEFORE express.json() in server.js:
//
//   app.post(
//     '/api/payments/webhook',
//     express.raw({ type: 'application/json' }),
//     paymentsRouter
//   );
//
// Stripe signature verification requires the exact raw bytes sent by Stripe.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[payments] STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    // req.body must be a raw Buffer — ensure express.raw() is applied upstream
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[payments] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook verification failed: ${err.message}` });
  }

  try {
    switch (event.type) {
      // ── Payment Events ────────────────────────────────────────────────────

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.info('[payments] webhook: PaymentIntent succeeded', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
        });
        // TODO: fulfil order, update DB, send confirmation email
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const failureMessage = paymentIntent.last_payment_error?.message ?? 'Unknown error';
        console.warn('[payments] webhook: PaymentIntent failed', {
          id: paymentIntent.id,
          reason: failureMessage,
        });
        // TODO: notify user, log failure, potentially retry
        break;
      }

      // ── Subscription Events ───────────────────────────────────────────────

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.info('[payments] webhook: Subscription created', {
          id: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          priceId: subscription.items?.data?.[0]?.price?.id,
        });
        // TODO: update user tier in DB, provision features
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.info('[payments] webhook: Subscription cancelled/deleted', {
          id: subscription.id,
          customerId: subscription.customer,
          canceledAt: subscription.canceled_at,
        });
        // TODO: downgrade user to free tier in DB, revoke feature access
        break;
      }

      // ── Invoice Events ────────────────────────────────────────────────────

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.info('[payments] webhook: Invoice payment succeeded', {
          id: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          amountPaid: invoice.amount_paid,
          periodEnd: invoice.period_end,
        });
        // TODO: extend subscription access period in DB, send receipt
        break;
      }

      default:
        // Acknowledge but ignore unhandled events
        console.debug('[payments] webhook: Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[payments] webhook handler error:', err.message);
    res.status(500).json({ error: 'Webhook handler encountered an error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/gift-card/redeem
// Body: { code, userId }
// In-memory MVP gift card store (see GIFT_CARDS Map at top of file).
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/gift-card/redeem',
  [
    body('code')
      .notEmpty()
      .trim()
      .toUpperCase()
      .withMessage('Gift card code is required'),
    body('userId').notEmpty().withMessage('userId is required'),
  ],
  (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { code, userId } = req.body;
    const normalizedCode = code.trim().toUpperCase();
    const card = GIFT_CARDS.get(normalizedCode);

    if (!card) {
      return res.status(404).json({ error: 'Gift card code not found' });
    }

    if (card.redeemed) {
      return res.status(409).json({
        error: 'Gift card has already been redeemed',
        redeemedBy: card.redeemedBy,
      });
    }

    // Mark as redeemed (MVP: in-memory only — use DB + atomic transaction in production)
    card.redeemed = true;
    card.redeemedBy = userId;
    card.redeemedAt = new Date().toISOString();

    res.json({
      success: true,
      code: normalizedCode,
      credit: card.value,
      creditFormatted: `$${(card.value / 100).toFixed(2)}`,
      currency: card.currency,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/crypto/initiate
// Body: { amount (USD cents), currency: 'BTC'|'ETH'|'USDC', userId }
// MVP mock — integrate Coinbase Commerce or BitPay for production.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/crypto/initiate',
  [
    body('amount')
      .isInt({ min: 100 })
      .withMessage('amount must be an integer ≥ 100 (cents)'),
    body('currency')
      .isIn(['BTC', 'ETH', 'USDC'])
      .withMessage('currency must be one of: BTC, ETH, USDC'),
    body('userId').notEmpty().withMessage('userId is required'),
  ],
  (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError !== null) return;

    const { amount, currency, userId } = req.body;
    const usdAmount = amount / 100;
    const rate = CRYPTO_RATES[currency];
    const cryptoAmount = (usdAmount / rate).toFixed(currency === 'USDC' ? 2 : 8);
    const paymentAddress = CRYPTO_WALLETS[currency];

    // Payment expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    res.status(201).json({
      paymentAddress,
      currency,
      amount: parseFloat(cryptoAmount),
      amountFormatted: `${cryptoAmount} ${currency}`,
      usdEquivalent: usdAmount,
      expiresAt,
      userId,
      // MVP reference ID — replace with a real payment provider's charge ID in production
      referenceId: `CRYPTO-${Date.now()}-${userId.slice(0, 8)}`,
      note: 'Mock payment — integrate Coinbase Commerce for production',
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────

export default router;
