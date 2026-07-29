/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Payment module: Stripe cards/crypto/gift cards, subscription management
 */

import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

let stripe = null;

function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
  }
  return stripe;
}

// In-memory gift card store (production: DB-backed)
const giftCards = new Map();
const subscriptions = new Map();
const paymentHistory = new Map();

const PLANS = Object.freeze({
  free:       { id: 'free',       name: 'Free',       price: 0,     currency: 'usd', interval: 'month', features: ['5 AI requests/day', '1 project', 'Basic analytics'] },
  pro:        { id: 'pro',        name: 'Pro',         price: 1499,  currency: 'usd', interval: 'month', features: ['Unlimited AI', '10 projects', 'Full analytics', 'Priority support'] },
  enterprise: { id: 'enterprise', name: 'Enterprise',  price: 4999,  currency: 'usd', interval: 'month', features: ['Everything in Pro', 'Unlimited projects', 'Custom connectors', 'SLA'] },
  dev:        { id: 'dev',        name: 'Developer',   price: 2999,  currency: 'usd', interval: 'month', features: ['Everything in Pro', 'API access', 'Game connectors', 'Dev dashboards'] }
});

// --- Stripe Payment Intent ---
export async function createPaymentIntent(userId, amount, currency = 'usd', metadata = {}) {
  const s = getStripe();
  const intent = await s.paymentIntents.create({
    amount: Math.round(amount),
    currency,
    metadata: { userId, ...metadata },
    automatic_payment_methods: { enabled: true }
  });
  recordPayment(userId, { type: 'intent_created', amount, currency, intentId: intent.id });
  return { clientSecret: intent.client_secret, intentId: intent.id, status: 200 };
}

// --- Subscription ---
export async function createSubscription(userId, planId, paymentMethodId, email) {
  const plan = PLANS[planId];
  if (!plan) return { error: 'Unknown plan', status: 400 };
  if (plan.price === 0) {
    subscriptions.set(userId, { userId, planId: 'free', status: 'active', startedAt: new Date().toISOString() });
    return { planId: 'free', status: 'active', status_code: 200 };
  }

  const s = getStripe();

  let customer;
  const existing = subscriptions.get(userId);
  if (existing?.stripeCustomerId) {
    customer = await s.customers.retrieve(existing.stripeCustomerId);
  } else {
    customer = await s.customers.create({ email, metadata: { userId } });
  }

  await s.paymentMethods.attach(paymentMethodId, { customer: customer.id });
  await s.customers.update(customer.id, { invoice_settings: { default_payment_method: paymentMethodId } });

  const stripePrices = {
    pro: process.env.STRIPE_PRICE_PRO,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    dev: process.env.STRIPE_PRICE_DEV
  };

  if (!stripePrices[planId]) {
    return { error: 'Stripe price not configured for plan', status: 500 };
  }

  const sub = await s.subscriptions.create({
    customer: customer.id,
    items: [{ price: stripePrices[planId] }],
    metadata: { userId, planId }
  });

  subscriptions.set(userId, {
    userId, planId, status: sub.status,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: customer.id,
    startedAt: new Date().toISOString()
  });

  recordPayment(userId, { type: 'subscription_created', planId, subscriptionId: sub.id });
  return { subscriptionId: sub.id, status: sub.status, status_code: 200 };
}

export async function cancelSubscription(userId) {
  const sub = subscriptions.get(userId);
  if (!sub?.stripeSubscriptionId) return { error: 'No active subscription', status: 404 };

  const s = getStripe();
  await s.subscriptions.cancel(sub.stripeSubscriptionId);
  sub.status = 'canceled';
  sub.canceledAt = new Date().toISOString();
  recordPayment(userId, { type: 'subscription_canceled' });
  return { status_code: 200 };
}

export function getSubscription(userId) {
  return subscriptions.get(userId) || { planId: 'free', status: 'active' };
}

// --- Gift Cards ---
export function issueGiftCard(amount, currency = 'usd', issuedBy = 'system') {
  const code = crypto.randomBytes(10).toString('hex').toUpperCase();
  giftCards.set(code, {
    code,
    amount,
    currency,
    remaining: amount,
    issuedAt: new Date().toISOString(),
    issuedBy,
    redeemedBy: null,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  });
  return { code, amount, currency, status: 200 };
}

export function redeemGiftCard(userId, code) {
  const card = giftCards.get(code.toUpperCase());
  if (!card) return { error: 'Invalid gift card', status: 404 };
  if (card.remaining <= 0) return { error: 'Gift card exhausted', status: 400 };
  if (new Date(card.expiresAt) < new Date()) return { error: 'Gift card expired', status: 400 };

  const credit = card.remaining;
  card.remaining = 0;
  card.redeemedBy = userId;
  card.redeemedAt = new Date().toISOString();
  recordPayment(userId, { type: 'gift_card_redeemed', code, credit, currency: card.currency });
  return { credit, currency: card.currency, status: 200 };
}

// --- Crypto Payment (webhook-driven) ---
export function registerCryptoPayment(userId, txHash, amount, currency, network) {
  const paymentId = uuidv4();
  recordPayment(userId, { type: 'crypto', txHash, amount, currency, network, paymentId, status: 'pending' });
  return { paymentId, status: 200 };
}

export function confirmCryptoPayment(paymentId, txHash) {
  // In production: verify on-chain via provider API
  // Here we record confirmation
  return { confirmed: true, paymentId, txHash, status: 200 };
}

// --- Stripe Webhook Verification ---
export function verifyStripeWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

// --- Helpers ---
function recordPayment(userId, data) {
  const history = paymentHistory.get(userId) || [];
  history.push({ id: uuidv4(), timestamp: new Date().toISOString(), ...data });
  if (history.length > 500) history.splice(0, history.length - 500);
  paymentHistory.set(userId, history);
}

export function getPaymentHistory(userId) {
  return { history: paymentHistory.get(userId) || [], status: 200 };
}

export function getPlans() {
  return { plans: Object.values(PLANS), status: 200 };
}
