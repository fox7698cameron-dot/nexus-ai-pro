/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Nexus AI Pro — Stripe Payment Module
 *
 * Provides: customer management, subscriptions, one-time payment intents,
 * hosted checkout sessions, webhook signature validation, subscription
 * cancellation, payment method updates, gift code generation & redemption,
 * and crypto payment validation.
 *
 * Supported payment surfaces (via Stripe):
 *   - Credit / debit cards: Visa, Mastercard, Amex, Discover, Diners, UnionPay
 *   - Wallets: Apple Pay, Google Pay (automatic when card type is enabled)
 *   - Crypto: Stripe fiat-crypto link (PaymentIntent with crypto metadata)
 *   - Gift codes: custom in-memory store backed by Stripe promo codes
 *
 * All secrets sourced exclusively from process.env — nothing is hardcoded.
 */

import Stripe from 'stripe';
import express from 'express';
import crypto from 'node:crypto';
import { authMiddleware } from '../auth/index.js';

// ============================================================
// Stripe client
// ============================================================

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    '[payments] WARNING: STRIPE_SECRET_KEY is not set. ' +
    'Stripe calls will fail until it is provided in the environment.'
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', {
  // Let the installed stripe package supply its bundled API version.
  // Override here only when pinning to a specific API version is required.
  maxNetworkRetries: 2,
  timeout: 15_000,
});

// ============================================================
// Tier configuration
// ============================================================

/**
 * Static metadata for each subscription tier.
 * Prices (in cents) are informational only — the authoritative amounts
 * live in Stripe via the environment-sourced priceIds.
 */
export const TIER_META = Object.freeze({
  free:       { name: 'Free',       amountCents: 0,    currency: 'usd' },
  pro:        { name: 'Pro',        amountCents: 999,  currency: 'usd' },
  enterprise: { name: 'Enterprise', amountCents: 1499, currency: 'usd' },
});

/**
 * Return the mapping of tier → Stripe priceId sourced from environment variables.
 * Throws in production if either price variable is absent.
 *
 * @returns {{ pro: string, enterprise: string }}
 */
export function createPriceIds() {
  const pro        = process.env.STRIPE_PRICE_PRO;
  const enterprise = process.env.STRIPE_PRICE_ENTERPRISE;

  if (process.env.NODE_ENV === 'production') {
    if (!pro)        throw new Error('[payments] STRIPE_PRICE_PRO env var is required in production.');
    if (!enterprise) throw new Error('[payments] STRIPE_PRICE_ENTERPRISE env var is required in production.');
  }

  return { pro: pro ?? '', enterprise: enterprise ?? '' };
}

// ============================================================
// In-memory gift code store
//
// Swap the Map for a Redis / database adapter to persist codes
// across restarts. The public API (redeemGiftCode, generateGiftCodes)
// does not need to change.
// ============================================================

/**
 * @typedef {{ tier: 'pro'|'enterprise', durationMonths: number, redeemed: boolean,
 *             redeemedBy: string|null, redeemedAt: string|null, createdAt: string }} GiftCodeRecord
 */

/** @type {Map<string, GiftCodeRecord>} */
const giftCodeStore = new Map();

// ============================================================
// Audit logging
// ============================================================

/**
 * Structured console audit entry for all payment events.
 * In production, pipe stdout to your log aggregator (e.g. Datadog, Splunk).
 *
 * @param {string} action
 * @param {Record<string, unknown>} [meta]
 */
function audit(action, meta = {}) {
  console.log(
    JSON.stringify({
      ts:      new Date().toISOString(),
      service: 'payments',
      action,
      ...meta,
    })
  );
}

// ============================================================
// Customer management
// ============================================================

/**
 * Create a Stripe Customer and tag it with the application userId.
 *
 * @param {string} email
 * @param {string} name
 * @param {string} userId
 * @returns {Promise<import('stripe').Stripe.Customer>}
 */
export async function createCustomer(email, name, userId) {
  audit('customer.create', { email, userId });

  return stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });
}

// ============================================================
// Subscriptions
// ============================================================

/**
 * Attach a payment method to a customer, set it as the invoice default,
 * and create a subscription on the given price.
 *
 * @param {string} customerId
 * @param {string} priceId
 * @param {string} paymentMethodId
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
export async function createSubscription(customerId, priceId, paymentMethodId) {
  audit('subscription.create', { customerId, priceId });

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return stripe.subscriptions.create({
    customer:               customerId,
    items:                  [{ price: priceId }],
    default_payment_method: paymentMethodId,
    expand:                 ['latest_invoice.payment_intent'],
  });
}

/**
 * Cancel a subscription at the end of the current billing period.
 * To cancel immediately, replace `cancel_at_period_end: true` with
 * `stripe.subscriptions.cancel(subscriptionId)`.
 *
 * @param {string} subscriptionId
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
export async function cancelSubscription(subscriptionId) {
  audit('subscription.cancel', { subscriptionId });

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Retrieve the active subscription tier and billing status for a customer.
 *
 * @param {string} customerId
 * @returns {Promise<{ tier: 'free'|'pro'|'enterprise', status: string,
 *                    currentPeriodEnd: string|null, cancelAtPeriodEnd: boolean }>}
 */
export async function getSubscriptionStatus(customerId) {
  audit('subscription.status_check', { customerId });

  const { data: subs } = await stripe.subscriptions.list({
    customer: customerId,
    status:   'active',
    limit:    1,
    expand:   ['data.items.data.price'],
  });

  if (subs.length === 0) {
    return { tier: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  const sub     = subs[0];
  const priceId = sub.items.data[0]?.price?.id;
  const { pro, enterprise } = createPriceIds();

  let tier = 'free';
  if (priceId && priceId === pro)        tier = 'pro';
  else if (priceId && priceId === enterprise) tier = 'enterprise';

  return {
    tier,
    status:            sub.status,
    currentPeriodEnd:  new Date(sub.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

// ============================================================
// Payment intent (one-time charges)
// ============================================================

/**
 * Create a PaymentIntent for a one-time charge.
 * `automatic_payment_methods` covers all eligible payment methods enabled in your
 * Stripe dashboard — including cards (Visa/Mastercard/Amex/Discover/Diners/UnionPay),
 * Apple Pay, and Google Pay without additional configuration.
 *
 * @param {number}  amount     - amount in the smallest currency unit (e.g. cents)
 * @param {string}  currency   - ISO 4217 code, e.g. 'usd'
 * @param {string}  customerId
 * @param {Record<string, string>} [metadata]
 * @returns {Promise<import('stripe').Stripe.PaymentIntent>}
 */
export async function createPaymentIntent(amount, currency, customerId, metadata = {}) {
  audit('payment_intent.create', { amount, currency, customerId });

  return stripe.paymentIntents.create({
    amount,
    currency:                 currency || 'usd',
    customer:                 customerId,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
}

// ============================================================
// Hosted Checkout Session
// ============================================================

/**
 * Create a Stripe-hosted Checkout Session for a subscription upgrade.
 *
 * Apple Pay and Google Pay appear automatically when the user's browser/device
 * supports them — Stripe enables them for sessions that include 'card' type.
 *
 * Coupon / promo codes can be entered by the customer via `allow_promotion_codes`.
 *
 * @param {string} userId
 * @param {'pro'|'enterprise'} tier
 * @param {string} successUrl - must include {CHECKOUT_SESSION_ID} query param
 * @param {string} cancelUrl
 * @returns {Promise<string>} Hosted checkout URL
 */
export async function createCheckoutSession(userId, tier, successUrl, cancelUrl) {
  if (!TIER_META[tier] || tier === 'free') {
    throw new Error(`Invalid tier for checkout: "${tier}". Expected "pro" or "enterprise".`);
  }

  const priceIds = createPriceIds();
  const priceId  = priceIds[tier];

  if (!priceId) {
    throw new Error(
      `Price ID for tier "${tier}" is not configured. ` +
      `Set STRIPE_PRICE_${tier.toUpperCase()} in the environment.`
    );
  }

  audit('checkout.create', { userId, tier });

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],          // card covers Visa/MC/Amex/Discover/Diners/UnionPay
                                              // Apple Pay & Google Pay activate automatically
    line_items: [{ price: priceId, quantity: 1 }],
    success_url:          successUrl,
    cancel_url:           cancelUrl,
    allow_promotion_codes: true,             // enables gift/promo code field in Stripe UI
    metadata:             { userId, tier },
    subscription_data:    { metadata: { userId, tier } },
  });

  audit('checkout.created', { userId, tier, sessionId: session.id });
  return session.url;
}

// ============================================================
// Webhook handler
// ============================================================

/**
 * Verify the Stripe webhook signature and return a structured event object.
 *
 * Usage in Express:
 *   app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
 *     const event = await handleWebhook(req.body, req.headers['stripe-signature']);
 *   });
 *
 * @param {Buffer|string} payload   - raw request body (do NOT parse as JSON first)
 * @param {string}        signature - value of the `stripe-signature` header
 * @returns {Promise<{ type: string, id: string, data: import('stripe').Stripe.Event['data'] }>}
 * @throws {Error} if signature verification fails
 */
export async function handleWebhook(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      '[payments] STRIPE_WEBHOOK_SECRET env var is required to validate webhooks.'
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    audit('webhook.signature_failure', { error: err.message });
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  audit('webhook.received', { type: event.type, id: event.id });

  // ------------------------------------------------------------------
  // Event dispatch
  // Wire each case to your database / notification layer as needed.
  // ------------------------------------------------------------------
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object);
      audit('webhook.subscription_change', {
        subscriptionId: sub.id,
        status:         sub.status,
        userId:         sub.metadata?.userId,
      });
      // TODO: update user tier in your database
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object);
      audit('webhook.subscription_deleted', {
        subscriptionId: sub.id,
        userId:         sub.metadata?.userId,
      });
      // TODO: downgrade user to free tier in your database
      break;
    }

    case 'invoice.payment_succeeded': {
      const inv = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object);
      audit('webhook.payment_succeeded', { invoiceId: inv.id, customerId: inv.customer });
      // TODO: record successful payment, renew subscription access
      break;
    }

    case 'invoice.payment_failed': {
      const inv = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object);
      audit('webhook.payment_failed', {
        invoiceId:  inv.id,
        customerId: inv.customer,
        attempt:    inv.attempt_count,
      });
      // TODO: notify user, potentially suspend access after N failures
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = /** @type {import('stripe').Stripe.PaymentIntent} */ (event.data.object);
      if (pi.metadata?.paymentType === 'crypto') {
        audit('webhook.crypto_payment_confirmed', { paymentIntentId: pi.id });
        // TODO: grant access based on crypto payment amount & userId in metadata
      }
      break;
    }

    case 'checkout.session.completed': {
      const session = /** @type {import('stripe').Stripe.Checkout.Session} */ (event.data.object);
      audit('webhook.checkout_completed', {
        sessionId: session.id,
        userId:    session.metadata?.userId,
        tier:      session.metadata?.tier,
      });
      // TODO: provision subscription access in your database
      break;
    }

    default:
      audit('webhook.unhandled', { type: event.type });
  }

  return { type: event.type, id: event.id, data: event.data };
}

// ============================================================
// Payment method management
// ============================================================

/**
 * Attach a new payment method to a customer and set it as the invoice default.
 * The old default is not detached — call stripe.paymentMethods.detach() if needed.
 *
 * @param {string} customerId
 * @param {string} paymentMethodId
 * @returns {Promise<void>}
 */
export async function updatePaymentMethod(customerId, paymentMethodId) {
  audit('payment_method.update', { customerId, paymentMethodId });

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

// ============================================================
// Crypto payment validation
// ============================================================

/**
 * Validate that a PaymentIntent both succeeded and was created with
 * the `paymentType: 'crypto'` metadata flag set by the application.
 *
 * This is a lightweight check — for production use, also verify the
 * amount matches the expected tier price and the userId matches the
 * authenticated user.
 *
 * @param {string} paymentIntentId
 * @returns {Promise<boolean>}
 */
export async function validateCryptoPayment(paymentIntentId) {
  try {
    const intent   = await stripe.paymentIntents.retrieve(paymentIntentId);
    const isCrypto = intent.metadata?.paymentType === 'crypto';
    const success  = intent.status === 'succeeded';

    audit('crypto.validate', { paymentIntentId, isCrypto, success });
    return isCrypto && success;
  } catch (err) {
    audit('crypto.validate_error', { paymentIntentId, error: err.message });
    return false;
  }
}

// ============================================================
// Gift code management
// ============================================================

/**
 * Attempt to redeem a gift code for a user.
 *
 * @param {string} code   - case-insensitive; whitespace is stripped
 * @param {string} userId
 * @returns {{ success: boolean, tier?: 'pro'|'enterprise',
 *             durationMonths?: number, error?: string }}
 */
export function redeemGiftCode(code, userId) {
  const key  = code.toUpperCase().replace(/\s/g, '');
  const gift = giftCodeStore.get(key);

  if (!gift) {
    audit('gift_code.invalid', { userId });
    return { success: false, error: 'Invalid gift code.' };
  }

  if (gift.redeemed) {
    audit('gift_code.already_redeemed', { userId });
    return { success: false, error: 'This gift code has already been redeemed.' };
  }

  const now = new Date().toISOString();
  giftCodeStore.set(key, { ...gift, redeemed: true, redeemedBy: userId, redeemedAt: now });

  audit('gift_code.redeemed', { code: key, userId, tier: gift.tier });

  return { success: true, tier: gift.tier, durationMonths: gift.durationMonths };
}

/**
 * Generate and register a batch of gift codes for a given tier.
 * Intended for admin / internal tooling only — do not expose this
 * function on a public route.
 *
 * Code format: NEXUS-{TIER}-{8 hex chars}  e.g. NEXUS-PRO-3F9A1B2C
 *
 * @param {'pro'|'enterprise'} tier
 * @param {number}              count          - number of codes to generate
 * @param {number}             [durationMonths=1]
 * @returns {string[]} the generated codes (store securely — they cannot be recovered)
 */
export function generateGiftCodes(tier, count, durationMonths = 1) {
  if (!TIER_META[tier] || tier === 'free') {
    throw new Error(`Invalid tier for gift codes: "${tier}". Use "pro" or "enterprise".`);
  }
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error('count must be an integer between 1 and 500.');
  }

  const codes = [];
  const now   = new Date().toISOString();

  for (let i = 0; i < count; i++) {
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code   = `NEXUS-${tier.toUpperCase()}-${suffix}`;

    giftCodeStore.set(code, {
      tier,
      durationMonths,
      redeemed:    false,
      redeemedBy:  null,
      redeemedAt:  null,
      createdAt:   now,
    });

    codes.push(code);
  }

  audit('gift_codes.generated', { tier, count, durationMonths });
  return codes;
}

// ============================================================
// Express Router
// ============================================================

export const paymentsRouter = express.Router();

// ── POST /api/payments/create-checkout ──────────────────────────────────────
paymentsRouter.post('/create-checkout', authMiddleware, async (req, res) => {
  try {
    const { tier, successUrl, cancelUrl } = req.body ?? {};
    const userId = req.user?.userId;

    if (!tier || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: tier, successUrl, cancelUrl.',
      });
    }

    const url = await createCheckoutSession(userId, tier, successUrl, cancelUrl);
    res.json({ url });
  } catch (err) {
    audit('route.create-checkout.error', { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/payments/webhook ───────────────────────────────────────────────
// IMPORTANT: must receive the raw request body. Mount this route BEFORE any
// global express.json() middleware, or configure express.json() to skip this path.
paymentsRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header.' });
    }

    try {
      const event = await handleWebhook(req.body, signature);
      res.json({ received: true, type: event.type });
    } catch (err) {
      audit('route.webhook.error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  }
);

// ── GET /api/payments/status/:userId ────────────────────────────────────────
paymentsRouter.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Look up customer by userId stored in metadata
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.json({
        tier:              'free',
        status:            'active',
        currentPeriodEnd:  null,
        cancelAtPeriodEnd: false,
      });
    }

    const status = await getSubscriptionStatus(customers.data[0].id);
    res.json(status);
  } catch (err) {
    audit('route.status.error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve subscription status.' });
  }
});

// ── POST /api/payments/cancel ────────────────────────────────────────────────
paymentsRouter.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body ?? {};

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required.' });
    }

    const updated = await cancelSubscription(subscriptionId);

    res.json({
      success:           true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd:  new Date(updated.current_period_end * 1000).toISOString(),
    });
  } catch (err) {
    audit('route.cancel.error', { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/payments/redeem-gift ───────────────────────────────────────────
paymentsRouter.post('/redeem-gift', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body ?? {};
    const userId   = req.user?.userId;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Gift code is required.' });
    }

    const result = redeemGiftCode(code, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    audit('route.redeem-gift.error', { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/payments/update-method ─────────────────────────────────────────
paymentsRouter.post('/update-method', authMiddleware, async (req, res) => {
  try {
    const { customerId, paymentMethodId } = req.body ?? {};

    if (!customerId || !paymentMethodId) {
      return res.status(400).json({
        error: 'customerId and paymentMethodId are required.',
      });
    }

    await updatePaymentMethod(customerId, paymentMethodId);
    res.json({ success: true });
  } catch (err) {
    audit('route.update-method.error', { error: err.message });
    res.status(400).json({ error: err.message });
  }
});
