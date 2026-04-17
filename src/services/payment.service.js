// nexus-ai-pro/src/services/payment.service.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Stripe, crypto, gift-card, multi-card payment processing — no hardcoded keys

import crypto from 'crypto';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY env var is required');
  // Dynamic import so the module is tree-shakeable and the key is read at call-time
  const Stripe = (await import('stripe')).default;
  return new Stripe(key, { apiVersion: '2024-12-18.acacia', appInfo: { name: 'Nexus AI Pro', version: '2.1.0' } });
}

// ── Tier pricing (cents USD) ──────────────────────────────────
export const TIER_PRICES = Object.freeze({
  starter:    { monthly: 999,   annual: 9588 },
  pro:        { monthly: 2999,  annual: 28788 },
  enterprise: { monthly: 9999,  annual: 95988 },
});

export const TIER_STRIPE_PRICE_IDS = () => ({
  starter:    { monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL },
  pro:        { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,        annual: process.env.STRIPE_PRICE_PRO_ANNUAL },
  enterprise: { monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL },
});

// ── Customer management ───────────────────────────────────────
export async function createStripeCustomer({ email, name, userId }) {
  const stripe = await getStripe();
  return stripe.customers.create({
    email,
    name,
    metadata: { nexus_user_id: userId },
  });
}

export async function getOrCreateCustomer({ stripeCustomerId, email, name, userId }) {
  if (stripeCustomerId) {
    const stripe = await getStripe();
    return stripe.customers.retrieve(stripeCustomerId);
  }
  return createStripeCustomer({ email, name, userId });
}

// ── Setup Intent (for saving a card) ─────────────────────────
export async function createSetupIntent(customerId) {
  const stripe = await getStripe();
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });
}

// ── Subscription ──────────────────────────────────────────────
export async function createSubscription({ customerId, priceId, paymentMethodId, trialDays = 0 }) {
  const stripe = await getStripe();
  const params = {
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    expand: ['latest_invoice.payment_intent'],
  };
  if (trialDays > 0) params.trial_period_days = trialDays;
  return stripe.subscriptions.create(params);
}

export async function cancelSubscription(subscriptionId, atPeriodEnd = true) {
  const stripe = await getStripe();
  if (atPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function updateSubscriptionTier({ subscriptionId, newPriceId }) {
  const stripe = await getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: sub.items.data[0].id, price: newPriceId }],
    proration_behavior: 'create_prorations',
  });
}

// ── One-time Payment ──────────────────────────────────────────
export async function createPaymentIntent({ amountCents, currency = 'usd', customerId, paymentMethodId, metadata = {} }) {
  const stripe = await getStripe();
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata,
  });
}

// ── Supported card brands ─────────────────────────────────────
export const SUPPORTED_CARD_BRANDS = Object.freeze([
  'visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'maestro',
]);

// ── Webhooks ──────────────────────────────────────────────────
export function constructStripeEvent(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET env var is required');
  // Stripe constructor needed here — use dynamic import via getStripe
  const Stripe = require('stripe'); // resolved at runtime; stripe is a CJS module
  return Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

// ── Gift Cards ────────────────────────────────────────────────
export function hashGiftCardCode(code) {
  const salt = process.env.GIFT_CARD_SALT;
  if (!salt) throw new Error('GIFT_CARD_SALT env var is required');
  return crypto.createHmac('sha256', salt).update(code.toUpperCase().trim()).digest('hex');
}

// ── Crypto Payments (webhook/address-based, no SDK required) ──
export const SUPPORTED_CRYPTO = Object.freeze(['btc', 'eth', 'usdc', 'usdt', 'sol', 'matic']);

export function generateCryptoPaymentAddress() {
  // In production, integrate Coinbase Commerce or NOWPayments via env-configured API key.
  // This returns a structured request object; actual address provisioning is API-side.
  const apiKey = process.env.CRYPTO_PAYMENT_API_KEY;
  if (!apiKey) throw new Error('CRYPTO_PAYMENT_API_KEY env var is required');
  return { provider: 'configured', note: 'Address provisioned via payment provider API' };
}

// ── Invoice helpers ───────────────────────────────────────────
export async function listInvoices(customerId, limit = 10) {
  const stripe = await getStripe();
  return stripe.invoices.list({ customer: customerId, limit });
}

export async function retrieveInvoice(invoiceId) {
  const stripe = await getStripe();
  return stripe.invoices.retrieve(invoiceId);
}

// ── Refund ────────────────────────────────────────────────────
export async function createRefund({ paymentIntentId, amountCents }) {
  const stripe = await getStripe();
  const params = { payment_intent: paymentIntentId };
  if (amountCents) params.amount = amountCents;
  return stripe.refunds.create(params);
}
