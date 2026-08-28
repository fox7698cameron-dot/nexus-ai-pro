/**
 * src/payments/PaymentSystem.js
 * Nexus AI Pro — Payment & Subscription System
 * Supports: Stripe (card/debit/Amex/Visa/MC), Crypto, Gift Cards
 * Date: 2026-08-28
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Stripe integration (API calls via fetch, no hardcoded keys) ────────────
function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return key;
}

async function stripeRequest(method, path, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error');
  return data;
}

// Supported card brands
export const SUPPORTED_CARDS = [
  'visa', 'mastercard', 'amex', 'discover', 'jcb', 'unionpay', 'maestro', 'diners',
];

// ── Subscription plans ─────────────────────────────────────────────────────
export const PLANS = Object.freeze({
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    stripePriceId: { monthly: null, yearly: null },
    features: ['5 chats/day', 'Basic models', '1 MB uploads'],
    reasoningLevel: 'mini',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 999,   // cents
    priceYearly: 9999,
    currency: 'usd',
    stripePriceId: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      yearly:  process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
    features: ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support'],
    reasoningLevel: 'mid',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 1499,
    priceYearly: 14999,
    currency: 'usd',
    stripePriceId: {
      monthly: process.env.STRIPE_ENT_MONTHLY_PRICE_ID,
      yearly:  process.env.STRIPE_ENT_YEARLY_PRICE_ID,
    },
    features: ['Everything in Pro', 'Custom models', 'API access', 'Dedicated support', 'SLA'],
    reasoningLevel: 'enterprise',
  },
});

// ── Stripe: create payment intent ─────────────────────────────────────────
export async function createPaymentIntent({ amount, currency = 'usd', customerId, metadata = {} }) {
  return stripeRequest('POST', '/payment_intents', {
    amount: String(amount),
    currency,
    customer: customerId,
    automatic_payment_methods: JSON.stringify({ enabled: true }),
    metadata: JSON.stringify(metadata),
  });
}

// ── Stripe: create subscription ───────────────────────────────────────────
export async function createSubscription({ customerId, priceId, trialDays, metadata = {} }) {
  const body = {
    customer: customerId,
    'items[0][price]': priceId,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    metadata: JSON.stringify(metadata),
  };
  if (trialDays) body.trial_period_days = String(trialDays);
  return stripeRequest('POST', '/subscriptions', body);
}

// ── Stripe: customer management ───────────────────────────────────────────
export async function createStripeCustomer({ email, name, metadata = {} }) {
  return stripeRequest('POST', '/customers', {
    email,
    name,
    metadata: JSON.stringify(metadata),
  });
}

export async function cancelSubscription(subscriptionId) {
  return stripeRequest('DELETE', `/subscriptions/${subscriptionId}`, {});
}

// ── Stripe webhook verification ────────────────────────────────────────────
export function verifyStripeWebhook(payload, signature, secret) {
  const parts     = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).slice(2);
  const v1        = parts.find(p => p.startsWith('v1=')).slice(3);
  const signed    = `${timestamp}.${payload}`;
  const expected  = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new Error('Invalid webhook signature');
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new Error('Webhook timestamp too old');
  }
  return JSON.parse(payload);
}

// ── Crypto payments (generate address, detect payment) ────────────────────
export const CRYPTO_CURRENCIES = [
  { symbol: 'BTC',  name: 'Bitcoin',  network: 'bitcoin'   },
  { symbol: 'ETH',  name: 'Ethereum', network: 'ethereum'  },
  { symbol: 'USDT', name: 'Tether',   network: 'ethereum'  },
  { symbol: 'USDC', name: 'USD Coin', network: 'ethereum'  },
  { symbol: 'SOL',  name: 'Solana',   network: 'solana'    },
  { symbol: 'LTC',  name: 'Litecoin', network: 'litecoin'  },
  { symbol: 'DOGE', name: 'Dogecoin', network: 'dogecoin'  },
];

const cryptoPayments = new Map();

export function createCryptoPayment({ userId, planId, amount, currency, usdAmount }) {
  const id         = uuidv4();
  const expiresAt  = Date.now() + 60 * 60 * 1000; // 1 hour
  // In production: integrate CoinGate, NowPayments, or BitPay for real addresses
  const payment = {
    id,
    userId,
    planId,
    amount,
    currency,
    usdAmount,
    status: 'pending',
    address: `nexus_${crypto.randomBytes(16).toString('hex')}`, // real: from payment processor
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  cryptoPayments.set(id, payment);
  return payment;
}

export function getCryptoPayment(id) {
  return cryptoPayments.get(id) || null;
}

export function confirmCryptoPayment(id, txHash) {
  const p = cryptoPayments.get(id);
  if (!p) return null;
  p.status  = 'confirmed';
  p.txHash  = txHash;
  p.confirmedAt = new Date().toISOString();
  return p;
}

// ── Gift card system ────────────────────────────────────────────────────────
const giftCards = new Map();

export function generateGiftCard({ amount, currency = 'usd', createdBy, note = '' }) {
  const code = [
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  ].join('-');

  const card = {
    code,
    amount,
    currency,
    balance: amount,
    createdBy,
    note,
    status: 'active',
    createdAt: new Date().toISOString(),
    usedBy: null,
    usedAt: null,
  };
  giftCards.set(code, card);
  return card;
}

export function redeemGiftCard(code, userId) {
  const card = giftCards.get(code);
  if (!card) return { success: false, error: 'Invalid gift card code' };
  if (card.status !== 'active') return { success: false, error: 'Gift card already used or expired' };
  if (card.balance <= 0) return { success: false, error: 'Gift card has no balance' };

  card.status = 'redeemed';
  card.usedBy = userId;
  card.usedAt = new Date().toISOString();
  const balance = card.balance;
  card.balance  = 0;

  return { success: true, amount: balance, currency: card.currency };
}

export function checkGiftCard(code) {
  const card = giftCards.get(code);
  if (!card) return null;
  return { code: card.code, balance: card.balance, currency: card.currency, status: card.status };
}

// ── Order history ──────────────────────────────────────────────────────────
const orders = new Map();

export function createOrder({ userId, planId, method, amount, currency, metadata = {} }) {
  const id = uuidv4();
  const order = {
    id,
    userId,
    planId,
    method,       // 'stripe' | 'crypto' | 'gift_card'
    amount,
    currency,
    status: 'pending',
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.set(id, order);
  return order;
}

export function updateOrderStatus(id, status, metadata = {}) {
  const o = orders.get(id);
  if (!o) return null;
  o.status    = status;
  o.updatedAt = new Date().toISOString();
  Object.assign(o.metadata, metadata);
  return o;
}

export function getOrdersByUser(userId) {
  return [...orders.values()].filter(o => o.userId === userId);
}

export default {
  PLANS,
  SUPPORTED_CARDS,
  CRYPTO_CURRENCIES,
  createPaymentIntent,
  createSubscription,
  createStripeCustomer,
  cancelSubscription,
  verifyStripeWebhook,
  createCryptoPayment,
  getCryptoPayment,
  confirmCryptoPayment,
  generateGiftCard,
  redeemGiftCard,
  checkGiftCard,
  createOrder,
  updateOrderStatus,
  getOrdersByUser,
};
