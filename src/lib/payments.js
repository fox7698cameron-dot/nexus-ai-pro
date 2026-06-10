// /home/user/nexus-ai-pro/src/lib/payments.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import Stripe from 'stripe';
import { z } from 'zod';
import crypto from 'crypto';

// ─── Stripe client (lazy singleton) ──────────────────────────────────────────
// Re-uses one instance per process; never instantiated during module load so
// tests can import without requiring env vars to be set.

let _stripe = null;

function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  return _stripe;
}

// ─── Plan catalogue ───────────────────────────────────────────────────────────
// Prices are in cents (USD).  stripePriceId is populated from environment
// variables so no IDs are ever hard-coded.

export const PLANS = Object.freeze({
  free: {
    id:            'free',
    name:          'Free',
    price:         0,
    currency:      'usd',
    interval:      null,
    stripePriceId: null,
    features: [
      '10 AI requests / day',
      '1 active workflow',
      'Community support',
      'Basic encryption'
    ]
  },
  pro: {
    id:            'pro',
    name:          'Pro',
    price:         999,     // $9.99
    currency:      'usd',
    interval:      'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features: [
      'Unlimited AI requests',
      '10 active workflows',
      'Priority support',
      'Military-grade encryption',
      'All AI models + image generation',
      'Crypto payments accepted',
      'Gift card / promo codes',
      'Custom avatars & API access'
    ]
  },
  enterprise: {
    id:            'enterprise',
    name:          'Enterprise',
    price:         4999,    // $49.99
    currency:      'usd',
    interval:      'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: [
      'Everything in Pro',
      'Unlimited workflows',
      'Dedicated support channel',
      'SSO / SAML',
      'SLA guarantee',
      'Custom AI fine-tuning',
      'Audit logs export',
      'Team management'
    ]
  }
});

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const customerSchema = z.object({
  userId: z.string().min(1),
  email:  z.string().email(),
  name:   z.string().max(256).optional()
});

export const checkoutSchema = z.object({
  planId:        z.enum(['pro', 'enterprise']),
  userId:        z.string().min(1),
  email:         z.string().email(),
  successUrl:    z.string().url(),
  cancelUrl:     z.string().url(),
  promoCode:     z.string().max(64).optional(),
  cryptoEnabled: z.boolean().optional().default(false)
});

export const cancelSchema = z.object({
  subscriptionId: z.string().min(1),
  userId:         z.string().min(1),
  immediately:    z.boolean().optional().default(false)
});

export const giftCodeSchema = z.object({
  code:       z.string().min(1).max(64),
  userId:     z.string().min(1),
  customerId: z.string().min(1)
});

// ─── Idempotency key helper ───────────────────────────────────────────────────

function idempotencyKey(...parts) {
  return crypto
    .createHash('sha256')
    .update(parts.join(':'))
    .digest('hex')
    .slice(0, 64);
}

// ─── Customer management ──────────────────────────────────────────────────────

/**
 * Creates or retrieves a Stripe customer for the given user.
 * Idempotent: uses metadata search to avoid duplicate customers.
 *
 * @param {{ userId: string, email: string, name?: string }} opts
 * @returns {Promise<import('stripe').Stripe.Customer>}
 */
export async function createOrRetrieveCustomer({ userId, email, name }) {
  customerSchema.parse({ userId, email, name });

  const stripe = getStripe();

  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1
  });

  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create(
    { email, name: name ?? undefined, metadata: { userId } },
    { idempotencyKey: idempotencyKey('create-customer', userId, email) }
  );
}

// ─── Checkout session ─────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout Session for a subscription plan.
 *
 * Payment methods supported:
 *   - All major cards: Visa, Mastercard, Amex, Discover (+ debit variants)
 *   - Crypto via Stripe's crypto on-ramp (opt-in via cryptoEnabled)
 *   - Gift cards and promo codes (allow_promotion_codes or server-supplied code)
 *
 * @param {z.infer<typeof checkoutSchema>} opts
 * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
 */
export async function createCheckoutSession(opts) {
  const parsed = checkoutSchema.parse(opts);
  const { planId, userId, email, successUrl, cancelUrl, promoCode, cryptoEnabled } = parsed;

  const plan = PLANS[planId];
  if (!plan.stripePriceId) {
    throw new Error(
      `No Stripe price configured for plan "${planId}". ` +
      `Set STRIPE_PRICE_${planId.toUpperCase()} in your environment.`
    );
  }

  const stripe   = getStripe();
  const customer = await createOrRetrieveCustomer({ userId, email });

  const paymentMethodTypes = ['card'];
  if (cryptoEnabled) paymentMethodTypes.push('crypto');

  const sessionParams = {
    customer:             customer.id,
    mode:                 'subscription',
    payment_method_types: paymentMethodTypes,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url:          successUrl,
    cancel_url:           cancelUrl,
    // Allows users to enter gift/promo codes in the Stripe-hosted page
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId, planId }
    },
    metadata: { userId, planId }
  };

  // A server-supplied promo code takes precedence over the UI picker.
  // Note: allow_promotion_codes and discounts[] are mutually exclusive in Stripe.
  if (promoCode) {
    const promos = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
    if (promos.data.length > 0) {
      sessionParams.discounts            = [{ promotion_code: promos.data[0].id }];
      delete sessionParams.allow_promotion_codes;
    }
  }

  return stripe.checkout.sessions.create(
    sessionParams,
    { idempotencyKey: idempotencyKey('checkout', userId, planId, email) }
  );
}

// ─── Subscription status ──────────────────────────────────────────────────────

/**
 * Returns the current subscription status for a user, including payment method
 * details when available.
 *
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<{
 *   plan: string,
 *   status: string,
 *   subscription: import('stripe').Stripe.Subscription | null,
 *   customer: import('stripe').Stripe.Customer | null,
 *   paymentMethod: object | null,
 *   currentPeriodEnd: string | null,
 *   cancelAtPeriodEnd: boolean
 * }>}
 */
export async function getSubscriptionStatus(userId, email) {
  if (!userId || !email) throw new Error('userId and email are required');

  const stripe   = getStripe();
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1
  });

  if (existing.data.length === 0) {
    return { plan: 'free', status: 'none', subscription: null, customer: null, paymentMethod: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  const customer      = existing.data[0];
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status:   'all',
    limit:    1,
    expand:   ['data.default_payment_method']
  });

  if (subscriptions.data.length === 0) {
    return { plan: 'free', status: 'none', subscription: null, customer, paymentMethod: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  const sub = subscriptions.data[0];
  const planId = sub.metadata?.planId ?? 'free';
  const pm     = sub.default_payment_method;

  const paymentMethod = pm
    ? {
      type:     pm.type,
      last4:    pm.card?.last4    ?? null,
      brand:    pm.card?.brand    ?? null,
      expMonth: pm.card?.exp_month ?? null,
      expYear:  pm.card?.exp_year  ?? null
    }
    : null;

  return {
    plan:             planId,
    status:           sub.status,
    subscription:     sub,
    customer,
    paymentMethod,
    currentPeriodEnd: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end
  };
}

// ─── Cancel subscription ──────────────────────────────────────────────────────

/**
 * Cancels a subscription immediately or at the end of the billing period.
 *
 * @param {z.infer<typeof cancelSchema>} opts
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
export async function cancelSubscription(opts) {
  const { subscriptionId, immediately } = cancelSchema.parse(opts);
  const stripe = getStripe();

  if (immediately) return stripe.subscriptions.cancel(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

// ─── Invoice list ─────────────────────────────────────────────────────────────

/**
 * Lists invoices for a Stripe customer.
 *
 * @param {string} customerId
 * @param {{ limit?: number, startingAfter?: string }} opts
 * @returns {Promise<import('stripe').Stripe.ApiList<import('stripe').Stripe.Invoice>>}
 */
export async function listInvoices(customerId, { limit = 20, startingAfter } = {}) {
  if (!customerId) throw new Error('customerId is required');

  const stripe = getStripe();
  const params = {
    customer: customerId,
    limit:    Math.min(Math.max(1, limit), 100),
    expand:   ['data.payment_intent']
  };

  if (startingAfter) params.starting_after = startingAfter;

  return stripe.invoices.list(params);
}

// ─── Redeem gift card / promo code ────────────────────────────────────────────

/**
 * Validates and applies a Stripe promotion/coupon code.
 * If no active subscription exists, the coupon is stored on the customer
 * record and will apply on the next checkout.
 *
 * @param {z.infer<typeof giftCodeSchema>} opts
 * @returns {Promise<{ applied: boolean, message: string, subscription?: import('stripe').Stripe.Subscription }>}
 */
export async function redeemGiftCode(opts) {
  const { code, customerId } = giftCodeSchema.parse(opts);
  const stripe = getStripe();

  const promos = await stripe.promotionCodes.list({ code, active: true, limit: 1 });

  if (promos.data.length === 0) {
    return { applied: false, message: 'Invalid or expired promotion code' };
  }

  const promoCode = promos.data[0];

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status:   'active',
    limit:    1
  });

  if (subscriptions.data.length === 0) {
    await stripe.customers.update(
      customerId,
      { coupon: promoCode.coupon.id },
      { idempotencyKey: idempotencyKey('apply-coupon', customerId, code) }
    );
    return { applied: true, message: 'Promo code saved — will apply on next charge' };
  }

  const sub     = subscriptions.data[0];
  const updated = await stripe.subscriptions.update(
    sub.id,
    { coupon: promoCode.coupon.id },
    { idempotencyKey: idempotencyKey('redeem-gift', customerId, sub.id, code) }
  );

  return { applied: true, message: 'Promo code applied successfully', subscription: updated };
}

// ─── Webhook handling ─────────────────────────────────────────────────────────

/**
 * Verifies the Stripe webhook signature, constructs the event, and dispatches
 * to the appropriate handler.
 *
 * Handled events:
 *   payment_intent.succeeded
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.paid
 *   invoice.payment_failed
 *
 * @param {Buffer} rawBody    Raw request body buffer — must NOT be JSON-parsed.
 * @param {string} signature  Value of the stripe-signature header.
 * @param {object} [callbacks]
 *   Optional per-event async callbacks:
 *     onPaymentSucceeded, onSubscriptionCreated, onSubscriptionUpdated,
 *     onSubscriptionDeleted, onInvoicePaid, onInvoicePaymentFailed
 * @returns {Promise<{ handled: boolean, event: import('stripe').Stripe.Event }>}
 */
export async function handleWebhook(rawBody, signature, callbacks = {}) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  const dispatchMap = {
    'payment_intent.succeeded':      _onPaymentIntentSucceeded,
    'customer.subscription.created': _onSubscriptionCreated,
    'customer.subscription.updated': _onSubscriptionUpdated,
    'customer.subscription.deleted': _onSubscriptionDeleted,
    'invoice.paid':                  _onInvoicePaid,
    'invoice.payment_failed':        _onInvoicePaymentFailed
  };

  const handler = dispatchMap[event.type];
  if (handler) await handler(event.data.object, callbacks);

  return { handled: !!handler, event };
}

// ─── Webhook event sub-handlers ───────────────────────────────────────────────

async function _onPaymentIntentSucceeded(pi, cbs) {
  if (typeof cbs.onPaymentSucceeded !== 'function') return;
  await cbs.onPaymentSucceeded({
    paymentIntentId: pi.id,
    amount:          pi.amount,
    currency:        pi.currency,
    customerId:      pi.customer,
    metadata:        pi.metadata
  });
}

async function _onSubscriptionCreated(sub, cbs) {
  if (typeof cbs.onSubscriptionCreated !== 'function') return;
  await cbs.onSubscriptionCreated({
    subscriptionId:  sub.id,
    customerId:      sub.customer,
    status:          sub.status,
    planId:          sub.metadata?.planId,
    currentPeriodEnd: sub.current_period_end
  });
}

async function _onSubscriptionUpdated(sub, cbs) {
  if (typeof cbs.onSubscriptionUpdated !== 'function') return;
  await cbs.onSubscriptionUpdated({
    subscriptionId:    sub.id,
    customerId:        sub.customer,
    status:            sub.status,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    planId:            sub.metadata?.planId,
    currentPeriodEnd:  sub.current_period_end
  });
}

async function _onSubscriptionDeleted(sub, cbs) {
  if (typeof cbs.onSubscriptionDeleted !== 'function') return;
  await cbs.onSubscriptionDeleted({
    subscriptionId: sub.id,
    customerId:     sub.customer,
    planId:         sub.metadata?.planId
  });
}

async function _onInvoicePaid(inv, cbs) {
  if (typeof cbs.onInvoicePaid !== 'function') return;
  await cbs.onInvoicePaid({
    invoiceId:      inv.id,
    customerId:     inv.customer,
    amountPaid:     inv.amount_paid,
    currency:       inv.currency,
    subscriptionId: inv.subscription,
    hostedUrl:      inv.hosted_invoice_url,
    pdfUrl:         inv.invoice_pdf
  });
}

async function _onInvoicePaymentFailed(inv, cbs) {
  if (typeof cbs.onInvoicePaymentFailed !== 'function') return;
  await cbs.onInvoicePaymentFailed({
    invoiceId:          inv.id,
    customerId:         inv.customer,
    amountDue:          inv.amount_due,
    currency:           inv.currency,
    subscriptionId:     inv.subscription,
    attemptCount:       inv.attempt_count,
    nextPaymentAttempt: inv.next_payment_attempt
  });
}

// ─── Subscription status middleware ──────────────────────────────────────────

/**
 * Express middleware factory. Gates routes to users with a minimum plan level.
 *
 * Prerequisite: req.user = { userId, email } must be set by upstream auth
 * middleware (e.g. the JWT authenticate() from auth.routes.js).
 *
 * Attaches req.subscription = { plan, status } on success.
 *
 * Usage:
 *   router.get('/premium-feature', requirePlan('pro'), handler)
 *   router.get('/enterprise-only', requirePlan('enterprise'), handler)
 *
 * @param {'free'|'pro'|'enterprise'} minimumPlan
 * @returns {import('express').RequestHandler}
 */
export function requirePlan(minimumPlan = 'pro') {
  const planRank = { free: 0, pro: 1, enterprise: 2 };
  const required = planRank[minimumPlan] ?? 1;

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.userId || !user?.email) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { plan, status } = await getSubscriptionStatus(user.userId, user.email);
      const userRank = planRank[plan] ?? 0;
      const isActive = status === 'active' || status === 'trialing' || plan === 'free';

      if (!isActive || userRank < required) {
        return res.status(403).json({
          error:    'Subscription required',
          required: minimumPlan,
          current:  plan
        });
      }

      req.subscription = { plan, status };
      return next();
    } catch (_err) {
      return res.status(500).json({ error: 'Failed to verify subscription status' });
    }
  };
}
