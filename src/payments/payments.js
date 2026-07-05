/**
 * src/payments/payments.js
 * Nexus AI Pro — Payments Backend
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Stripe (Visa, MC, Amex, Discover, Debit)
 * Crypto (ETH, BTC, USDC via webhook-style confirmation)
 * Gift card redemption
 * Subscription tier management
 */

import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ─── Stripe client (lazy init — requires STRIPE_SECRET_KEY env var) ───────────

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw Object.assign(new Error('STRIPE_SECRET_KEY not configured'), { status: 500 });
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

// ─── Subscription tiers ───────────────────────────────────────────────────────

export const TIERS = Object.freeze({
  free:       { id: 'free',       name: 'Free',       priceMonthly: 0,     priceYearly: 0      },
  pro:        { id: 'pro',        name: 'Pro',        priceMonthly: 999,   priceYearly: 9990   },
  enterprise: { id: 'enterprise', name: 'Enterprise', priceMonthly: 1499,  priceYearly: 14990  },
});

// In-memory stores (replace with DB in production)
const subscriptions = new Map();  // userId → subscription record
const giftCards     = new Map();  // code → { value, usedBy, usedAt }
const cryptoOrders  = new Map();  // orderId → crypto payment order

// ─── Stripe: create checkout session ─────────────────────────────────────────

export async function createCheckoutSession({ userId, tierId, billingPeriod = 'monthly', successUrl, cancelUrl }) {
  const tier = TIERS[tierId];
  if (!tier || tier.id === 'free') {
    throw Object.assign(new Error('Invalid or free tier'), { status: 400 });
  }

  const amount = billingPeriod === 'yearly' ? tier.priceYearly : tier.priceMonthly;
  if (!amount) throw Object.assign(new Error('Amount must be non-zero'), { status: 400 });

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: amount,
        recurring: { interval: billingPeriod === 'yearly' ? 'year' : 'month' },
        product_data: {
          name: `Nexus AI Pro — ${tier.name}`,
          description: `${tier.name} subscription (${billingPeriod})`,
        },
      },
      quantity: 1,
    }],
    metadata: { userId, tierId, billingPeriod },
    success_url: successUrl,
    cancel_url:  cancelUrl,
  });

  return { sessionId: session.id, url: session.url };
}

// ─── Stripe: customer portal ──────────────────────────────────────────────────

export async function createPortalSession({ userId, returnUrl }) {
  const sub = subscriptions.get(userId);
  if (!sub?.stripeCustomerId) {
    throw Object.assign(new Error('No active Stripe subscription'), { status: 404 });
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.stripeCustomerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

// ─── Stripe: webhook handler ──────────────────────────────────────────────────

export function handleStripeWebhook(rawBody, sig) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw Object.assign(new Error('STRIPE_WEBHOOK_SECRET not configured'), { status: 500 });

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    throw Object.assign(new Error(`Webhook signature invalid: ${err.message}`), { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, tierId, billingPeriod } = session.metadata || {};
      if (userId && tierId) {
        subscriptions.set(userId, {
          userId,
          tierId,
          billingPeriod,
          stripeCustomerId:     session.customer,
          stripeSubscriptionId: session.subscription,
          status:    'active',
          startedAt: Date.now(),
          renewsAt:  Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      for (const [uid, sub] of subscriptions) {
        if (sub.stripeSubscriptionId === stripeSub.id) {
          sub.status = 'cancelled';
          sub.cancelledAt = Date.now();
          break;
        }
      }
      break;
    }
  }

  return { received: true };
}

// ─── Crypto payments ──────────────────────────────────────────────────────────

const SUPPORTED_CRYPTO = ['ETH', 'BTC', 'USDC', 'SOL'];

export function createCryptoOrder({ userId, tierId, currency, billingPeriod = 'monthly' }) {
  if (!SUPPORTED_CRYPTO.includes(currency)) {
    throw Object.assign(new Error(`Unsupported crypto: ${currency}`), { status: 400 });
  }

  const tier = TIERS[tierId];
  if (!tier || tier.id === 'free') {
    throw Object.assign(new Error('Invalid or free tier'), { status: 400 });
  }

  const orderId   = uuidv4();
  const amountUsd = billingPeriod === 'yearly' ? tier.priceYearly / 100 : tier.priceMonthly / 100;

  // In production: fetch real-time exchange rates and generate deposit address
  const cryptoRates = { ETH: 3200, BTC: 65000, USDC: 1, SOL: 150 };
  const rate         = cryptoRates[currency] || 1;
  const cryptoAmount = (amountUsd / rate).toFixed(8);

  const order = {
    orderId,
    userId,
    tierId,
    billingPeriod,
    currency,
    amountUsd,
    cryptoAmount,
    depositAddress: generateDepositAddress(currency, orderId),
    status:    'pending',
    expiresAt: Date.now() + 30 * 60 * 1000,
    createdAt: Date.now(),
  };

  cryptoOrders.set(orderId, order);
  return order;
}

export function confirmCryptoOrder(orderId, txHash) {
  const order = cryptoOrders.get(orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.status !== 'pending') throw Object.assign(new Error('Order already processed'), { status: 400 });
  if (order.expiresAt < Date.now()) throw Object.assign(new Error('Order expired'), { status: 410 });

  if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/.test(txHash)) {
    throw Object.assign(new Error('Invalid transaction hash'), { status: 400 });
  }

  order.status  = 'confirmed';
  order.txHash  = txHash;
  order.confirmedAt = Date.now();

  // Activate subscription
  subscriptions.set(order.userId, {
    userId:       order.userId,
    tierId:       order.tierId,
    billingPeriod: order.billingPeriod,
    paymentMethod: 'crypto',
    currency:     order.currency,
    txHash,
    status:    'active',
    startedAt: Date.now(),
    renewsAt:  Date.now() + (order.billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000,
  });

  return { success: true, subscription: subscriptions.get(order.userId) };
}

function generateDepositAddress(currency, seed) {
  const hash = crypto.createHash('sha256').update(`${currency}:${seed}`).digest('hex');
  if (currency === 'BTC') return `bc1q${hash.slice(0, 38)}`;
  if (currency === 'ETH' || currency === 'USDC') return `0x${hash.slice(0, 40)}`;
  if (currency === 'SOL') return hash.slice(0, 44);
  return hash.slice(0, 40);
}

// ─── Gift cards ───────────────────────────────────────────────────────────────

export function createGiftCard({ valueUsd, note = '' }) {
  const code  = crypto.randomBytes(8).toString('hex').toUpperCase();
  const card  = { code, valueUsd, note, usedBy: null, usedAt: null, createdAt: Date.now() };
  giftCards.set(code, card);
  return { code, valueUsd };
}

export function redeemGiftCard(code, userId) {
  const card = giftCards.get(code?.toUpperCase());
  if (!card)      throw Object.assign(new Error('Invalid gift card code'), { status: 400 });
  if (card.usedBy) throw Object.assign(new Error('Gift card already used'), { status: 409 });

  card.usedBy = userId;
  card.usedAt = Date.now();

  // Credit the subscription (apply value toward upgrade)
  const sub = subscriptions.get(userId) || { userId, tierId: 'free', creditUsd: 0 };
  sub.creditUsd = (sub.creditUsd || 0) + card.valueUsd;
  subscriptions.set(userId, sub);

  return { success: true, creditUsd: card.valueUsd, totalCreditUsd: sub.creditUsd };
}

// ─── Subscription queries ─────────────────────────────────────────────────────

export function getSubscription(userId) {
  return subscriptions.get(userId) || { userId, tierId: 'free', status: 'active' };
}

export function listSubscriptions() {
  return Array.from(subscriptions.values());
}
