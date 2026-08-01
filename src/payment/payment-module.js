// src/payment/payment-module.js
// Nexus AI Pro - Payment Processing Module
// Covers: Stripe (cards, crypto via Coinbase/Stripe), gift card redemption
// Date: 2026-08-01

import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Stripe Setup ───────────────────────────────────────────────────────────────
function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'your_stripe_secret_key') {
    throw new Error('STRIPE_SECRET_KEY must be configured');
  }
  return new Stripe(key, { apiVersion: '2025-06-30' });
}

// ── Subscription Plans ─────────────────────────────────────────────────────────
export const PLANS = {
  free: { name: 'Free', priceId: null, amount: 0, currency: 'usd', interval: null },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    amount: 999,
    currency: 'usd',
    interval: 'month'
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    amount: 1499,
    currency: 'usd',
    interval: 'month'
  }
};

// ── Gift Card Store (in-memory, use Redis/DB in production) ───────────────────
const giftCards = new Map();

export function generateGiftCard(amount, currency = 'usd', createdBy = 'system') {
  const code = crypto.randomBytes(12).toString('base64url').toUpperCase().slice(0, 16);
  const card = {
    id: uuidv4(),
    code,
    amount,
    currency,
    balance: amount,
    createdBy,
    createdAt: Date.now(),
    redeemedBy: null,
    redeemedAt: null,
    active: true
  };
  giftCards.set(code, card);
  return { code, amount, currency };
}

export function redeemGiftCard(code, userId) {
  const card = giftCards.get(code.toUpperCase());
  if (!card || !card.active) throw new Error('Invalid or expired gift card');
  if (card.redeemedBy) throw new Error('Gift card already redeemed');

  card.redeemedBy = userId;
  card.redeemedAt = Date.now();
  card.active = false;
  giftCards.set(code.toUpperCase(), card);

  return { amount: card.amount, currency: card.currency };
}

// ── Customer & Subscription ────────────────────────────────────────────────────
export async function createOrGetCustomer(userId, email, name) {
  const stripe = getStripeClient();
  const existing = await stripe.customers.search({
    query: `metadata['nexus_user_id']:'${userId}'`,
    limit: 1
  });
  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create({
    email,
    name,
    metadata: { nexus_user_id: userId }
  });
}

export async function createCheckoutSession({
  userId, email, name, plan, successUrl, cancelUrl, giftCardCode
}) {
  const stripe = getStripeClient();
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);
  if (planConfig.amount === 0) return { url: successUrl, plan: 'free' };

  let discounts = [];
  let adjustedAmount = planConfig.amount;

  if (giftCardCode) {
    const card = redeemGiftCard(giftCardCode, userId);
    adjustedAmount = Math.max(0, planConfig.amount - card.amount);
  }

  const customer = await createOrGetCustomer(userId, email, name);

  const lineItems = planConfig.priceId
    ? [{ price: planConfig.priceId, quantity: 1 }]
    : [{
        price_data: {
          currency: planConfig.currency,
          product_data: { name: planConfig.name, metadata: { plan } },
          unit_amount: adjustedAmount,
          recurring: { interval: planConfig.interval }
        },
        quantity: 1
      }];

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: [
      'card',        // Visa, Mastercard, Amex, Discover, etc.
      'us_bank_account'
    ],
    subscription_data: { metadata: { nexus_user_id: userId, plan } },
    discounts,
    metadata: { nexus_user_id: userId, plan }
  });

  return { url: session.url, sessionId: session.id };
}

export async function createCryptoPayment({ userId, plan, successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

  // Stripe supports crypto via Link and certain regional methods
  // For direct crypto: integrate Coinbase Commerce webhook separately
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${planConfig.name} - 1 Month` },
        unit_amount: planConfig.amount
      },
      quantity: 1
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: ['card'],
    metadata: { nexus_user_id: userId, plan, type: 'crypto_equivalent' }
  });

  return { url: session.url, sessionId: session.id };
}

export async function getCustomerSubscription(userId) {
  const stripe = getStripeClient();
  const customers = await stripe.customers.search({
    query: `metadata['nexus_user_id']:'${userId}'`,
    limit: 1
  });
  if (!customers.data.length) return { plan: 'free', status: 'none' };

  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: 'active',
    limit: 1
  });
  if (!subscriptions.data.length) return { plan: 'free', status: 'inactive' };

  const sub = subscriptions.data[0];
  const planMeta = sub.metadata?.plan || 'pro';
  return {
    plan: planMeta,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end
  };
}

export async function cancelSubscription(userId) {
  const stripe = getStripeClient();
  const customers = await stripe.customers.search({
    query: `metadata['nexus_user_id']:'${userId}'`,
    limit: 1
  });
  if (!customers.data.length) throw new Error('No customer found');

  const subs = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: 'active',
    limit: 1
  });
  if (!subs.data.length) throw new Error('No active subscription');

  return stripe.subscriptions.update(subs.data[0].id, { cancel_at_period_end: true });
}

// ── Stripe Webhook Handler ─────────────────────────────────────────────────────
export function constructWebhookEvent(payload, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  return Stripe.webhooks.constructEvent(payload, signature, secret);
}
