/**
 * server/services/paymentService.js
 * Nexus AI Pro — Payment Processing Service
 * Labeled: 2026-08-25
 *
 * Supports:
 *   - Stripe (all major cards: Visa, Mastercard, Amex, Discover, Diners,
 *             debit cards, prepaid cards)
 *   - Cryptocurrency (via Coinbase Commerce or similar — env-configured)
 *   - Gift cards (internal gift card system with redemption codes)
 *
 * All API keys are loaded from environment variables only.
 * PCI compliance: card numbers are NEVER passed through this server —
 * Stripe.js tokenizes on the frontend, this server only handles
 * payment intent creation and webhook processing.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Stripe lazy-load ──────────────────────────────────────────────────────────
let _stripe = null;
let _stripeInitPromise = null;

async function getStripe() {
  if (_stripe) return _stripe;
  if (_stripeInitPromise) return _stripeInitPromise;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured in environment');

  _stripeInitPromise = (async () => {
    try {
      const { default: Stripe } = await import('stripe');
      _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
      return _stripe;
    } catch {
      throw new Error('stripe package not installed — run: npm install stripe');
    }
  })();

  return _stripeInitPromise;
}

// ── Plan pricing ──────────────────────────────────────────────────────────────
export const PLANS = Object.freeze({
  free: {
    id:       'free',
    name:     'Free',
    priceUSD: 0,
    stripePriceId: null
  },
  pro: {
    id:       'pro',
    name:     'Pro',
    priceUSD: 9.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || null
  },
  enterprise: {
    id:       'enterprise',
    name:     'Enterprise',
    priceUSD: 14.99,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || null
  }
});

// ── Gift card store (in-memory for MVP; use DB in production) ─────────────────
const giftCards = new Map(); // code → { value, currency, used, createdAt }

// ── Subscription record store ─────────────────────────────────────────────────
const subscriptions = new Map(); // userId → subscriptionRecord

// ── Stripe payment intents ────────────────────────────────────────────────────

/**
 * Create a Stripe PaymentIntent for a one-time charge.
 * Amount in cents. Currency default USD.
 */
export async function createPaymentIntent(userId, amountCents, currency = 'usd', metadata = {}) {
  const stripe = getStripe();

  const intent = await stripe.paymentIntents.create({
    amount:   amountCents,
    currency: currency.toLowerCase(),
    metadata: {
      userId,
      ...metadata
    },
    automatic_payment_methods: { enabled: true }
  });

  return {
    ok:           true,
    clientSecret: intent.client_secret,   // returned to frontend for Stripe.js
    intentId:     intent.id
  };
}

/**
 * Create or retrieve a Stripe Customer for a user.
 */
export async function getOrCreateStripeCustomer(userId, email) {
  const stripe = getStripe();
  const sub    = subscriptions.get(userId);

  if (sub?.stripeCustomerId) {
    return sub.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId }
  });

  const existing = subscriptions.get(userId) || {};
  subscriptions.set(userId, { ...existing, stripeCustomerId: customer.id });

  return customer.id;
}

/**
 * Create a Stripe Subscription.
 * Returns clientSecret for PaymentElement confirmation.
 */
export async function createSubscription(userId, email, planId) {
  const plan = PLANS[planId];
  if (!plan || !plan.stripePriceId) {
    return { ok: false, error: `Plan ${planId} not available or not configured` };
  }

  const stripe     = getStripe();
  const customerId = await getOrCreateStripeCustomer(userId, email);

  const subscription = await stripe.subscriptions.create({
    customer:          customerId,
    items:             [{ price: plan.stripePriceId }],
    payment_behavior:  'default_incomplete',
    expand:            ['latest_invoice.payment_intent'],
    metadata:          { userId, planId }
  });

  subscriptions.set(userId, {
    ...(subscriptions.get(userId) || {}),
    stripeSubscriptionId: subscription.id,
    planId,
    status:    subscription.status,
    updatedAt: Date.now()
  });

  return {
    ok:           true,
    subscriptionId: subscription.id,
    clientSecret:   subscription.latest_invoice?.payment_intent?.client_secret
  };
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(userId) {
  const sub = subscriptions.get(userId);
  if (!sub?.stripeSubscriptionId) {
    return { ok: false, error: 'No active subscription found' };
  }

  const stripe = getStripe();
  await stripe.subscriptions.cancel(sub.stripeSubscriptionId);

  subscriptions.set(userId, {
    ...sub,
    status:    'cancelled',
    planId:    'free',
    updatedAt: Date.now()
  });

  return { ok: true };
}

/**
 * Handle Stripe webhook events.
 * Call from POST /api/payments/webhook — raw body required.
 */
export async function handleStripeWebhook(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return { ok: false, error: `Webhook signature verification failed: ${err.message}` };
  }

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub    = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        subscriptions.set(userId, {
          ...(subscriptions.get(userId) || {}),
          status:    sub.status,
          planId:    sub.status === 'active' ? sub.metadata?.planId : 'free',
          updatedAt: Date.now()
        });
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const userId  = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
      if (userId) {
        const record = subscriptions.get(userId) || {};
        record.lastPayment = { amount: invoice.amount_paid, date: Date.now() };
        subscriptions.set(userId, record);
      }
      break;
    }
    default:
      // Unhandled event types are silently acknowledged
      break;
  }

  return { ok: true, eventType: event.type };
}

// ── Cryptocurrency payments ───────────────────────────────────────────────────

/**
 * Create a crypto charge via Coinbase Commerce.
 * Requires COINBASE_COMMERCE_API_KEY env var.
 * Supported currencies: BTC, ETH, USDC, DOGE, LTC, SOL
 */
export async function createCryptoCharge(userId, planId, currency = 'ETH') {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Crypto payments not configured (COINBASE_COMMERCE_API_KEY missing)' };
  }

  const plan = PLANS[planId];
  if (!plan) return { ok: false, error: 'Unknown plan' };

  try {
    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'X-CC-Api-Key':         apiKey,
        'X-CC-Version':         '2018-03-22'
      },
      body: JSON.stringify({
        name:        `Nexus AI Pro — ${plan.name}`,
        description: `Monthly subscription to ${plan.name} plan`,
        pricing_type: 'fixed_price',
        local_price:  { amount: String(plan.priceUSD), currency: 'USD' },
        metadata:     { userId, planId }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return { ok: false, error: err.error?.message || 'Crypto charge creation failed' };
    }

    const data = await response.json();
    return {
      ok:       true,
      chargeId: data.data.id,
      hostedUrl: data.data.hosted_url,
      code:     data.data.code,
      expiresAt: data.data.expires_at
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Gift card system ──────────────────────────────────────────────────────────

/**
 * Issue a new gift card (admin only).
 */
export function issueGiftCard(valueUSD, currency = 'USD', count = 1) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    const code = [
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase()
    ].join('-');

    giftCards.set(code, {
      code,
      value:     valueUSD,
      currency,
      used:      false,
      usedBy:    null,
      createdAt: Date.now()
    });
    cards.push({ code, value: valueUSD, currency });
  }
  return { ok: true, cards };
}

/**
 * Redeem a gift card for a user.
 */
export function redeemGiftCard(userId, code) {
  const card = giftCards.get(code?.toUpperCase());
  if (!card) return { ok: false, error: 'Invalid gift card code' };
  if (card.used) return { ok: false, error: 'Gift card already used' };

  card.used   = true;
  card.usedBy = userId;
  card.usedAt = Date.now();

  return {
    ok:       true,
    value:    card.value,
    currency: card.currency,
    message:  `$${card.value} credit applied to your account`
  };
}

/**
 * Get user subscription status.
 */
export function getSubscriptionStatus(userId) {
  const sub = subscriptions.get(userId);
  if (!sub) return { planId: 'free', status: 'active' };
  return {
    planId:              sub.planId || 'free',
    status:              sub.status || 'active',
    stripeSubscriptionId: sub.stripeSubscriptionId,
    lastPayment:         sub.lastPayment || null
  };
}
