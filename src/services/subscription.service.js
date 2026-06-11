// src/services/subscription.service.js
// Stripe, crypto (Coinbase Commerce), and gift card subscriptions
// No API keys hardcoded — all from env via config/env.js
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import Stripe from 'stripe';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { SUBSCRIPTION_PLANS, AUDIT_EVENTS } from '../config/constants.js';
import { logAuditEvent } from './audit.service.js';

// Stripe client — only instantiated if key is present
const stripeClient = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia', typescript: false })
  : null;

// Stripe price IDs — stored in env, never hardcoded
const STRIPE_PRICES = {
  [SUBSCRIPTION_PLANS.PRO]: process.env.STRIPE_PRICE_PRO,
  [SUBSCRIPTION_PLANS.ENTERPRISE]: process.env.STRIPE_PRICE_ENTERPRISE,
};

// ─── Stripe ────────────────────────────────────────────────────────────────

export async function createStripeCustomer(user) {
  if (!stripeClient) throw new Error('Stripe not configured');
  return stripeClient.customers.create({
    email: user.email,
    name: user.displayName ?? user.username,
    metadata: { userId: user.id },
  });
}

export async function createStripeSubscription(customerId, plan, paymentMethodId) {
  if (!stripeClient) throw new Error('Stripe not configured');
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) throw new Error(`No Stripe price configured for plan: ${plan}`);

  await stripeClient.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripeClient.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return stripeClient.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
}

export async function cancelStripeSubscription(stripeSubscriptionId) {
  if (!stripeClient) throw new Error('Stripe not configured');
  return stripeClient.subscriptions.cancel(stripeSubscriptionId);
}

export function verifyStripeWebhook(payload, signature) {
  if (!stripeClient || !env.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhook not configured');
  return stripeClient.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

// ─── Crypto Payments (Coinbase Commerce) ──────────────────────────────────

export async function createCryptoCharge(userId, plan, amountUsd) {
  if (!env.COINBASE_COMMERCE_API_KEY) throw new Error('Crypto payments not configured');
  const response = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': env.COINBASE_COMMERCE_API_KEY,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify({
      name: `Nexus AI Pro — ${plan}`,
      description: `${plan} subscription`,
      pricing_type: 'fixed_price',
      local_price: { amount: String(amountUsd), currency: 'USD' },
      metadata: { userId, plan },
    }),
  });
  if (!response.ok) throw new Error(`Coinbase Commerce error: ${response.status}`);
  return response.json();
}

export function verifyCoinbaseWebhook(rawBody, signature) {
  if (!env.COINBASE_COMMERCE_WEBHOOK_SECRET) throw new Error('Coinbase webhook not configured');
  const expected = crypto
    .createHmac('sha256', env.COINBASE_COMMERCE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid Coinbase webhook signature');
  }
}

// ─── Gift Cards ────────────────────────────────────────────────────────────

// Gift card codes are stored hashed; never store plaintext
export function hashGiftCardCode(code) {
  return crypto.createHmac('sha256', env.ENCRYPTION_SECRET).update(code.toUpperCase().trim()).digest('hex');
}

// Validate a submitted gift card code against a known hash
export function validateGiftCard(submittedCode, storedHash) {
  const submitted = hashGiftCardCode(submittedCode);
  if (submitted.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(storedHash));
}

// Generate a new gift card code for admin issuance
export function generateGiftCardCode() {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(3).toString('hex').toUpperCase()
  );
  return segments.join('-'); // e.g. A1B2C3-D4E5F6-789ABC-DEF012
}
