// src/payments/stripe-service.js
// 2026-06-12 | Nexus AI Pro Payment Service
// Stripe subscriptions + crypto stubs + gift-card redemption

import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key, { apiVersion: '2025-05-28.basil' });
}

// ---- plans -----------------------------------------------------------
// Prices are created in the Stripe dashboard; only IDs are referenced here.

export const PLANS = Object.freeze({
  free:       { id: 'free',       name: 'Free',       priceId: null,                       amount: 0 },
  pro:        { id: 'pro',        name: 'Pro',         priceId: process.env.STRIPE_PRICE_PRO,        amount: 999  },
  enterprise: { id: 'enterprise', name: 'Enterprise',  priceId: process.env.STRIPE_PRICE_ENTERPRISE, amount: 1499 }
});

// ---- gift cards (in-memory; persist to DB in production) -------------

const giftCards = new Map();

function generateGiftCode() {
  return crypto.randomBytes(10).toString('hex').toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1);
}

export function createGiftCard(planId, credits) {
  const code = generateGiftCode();
  giftCards.set(code, { code, planId, credits, used: false, createdAt: Date.now() });
  return code;
}

export function redeemGiftCard(code) {
  const card = giftCards.get(code?.toUpperCase().replace(/\s/g, ''));
  if (!card) return { error: 'Gift card not found.' };
  if (card.used) return { error: 'Gift card already redeemed.' };
  card.used = true;
  return { success: true, planId: card.planId, credits: card.credits };
}

// ---- Stripe helpers --------------------------------------------------

export const StripeService = {
  async createCustomer({ email, name, userId }) {
    const stripe = getStripe();
    return stripe.customers.create({
      email, name,
      metadata: { nexusUserId: userId }
    });
  },

  async createSetupIntent(customerId) {
    const stripe = getStripe();
    return stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });
  },

  async createCheckoutSession({ customerId, planId, successUrl, cancelUrl, userId }) {
    const stripe = getStripe();
    const plan = PLANS[planId];
    if (!plan || !plan.priceId) throw new Error('Invalid plan or free plan has no price.');

    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { nexusUserId: userId, planId }
    });
  },

  async createPaymentIntent({ customerId, planId, currency = 'usd' }) {
    const stripe = getStripe();
    const plan = PLANS[planId];
    if (!plan) throw new Error('Invalid plan.');
    if (plan.amount === 0) return { amount: 0, plan };

    const intent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency,
      customer: customerId,
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true }
    });
    return { clientSecret: intent.client_secret, amount: plan.amount };
  },

  async cancelSubscription(subscriptionId) {
    const stripe = getStripe();
    return stripe.subscriptions.cancel(subscriptionId);
  },

  async getSubscription(subscriptionId) {
    const stripe = getStripe();
    return stripe.subscriptions.retrieve(subscriptionId);
  },

  async listPaymentMethods(customerId) {
    const stripe = getStripe();
    return stripe.paymentMethods.list({ customer: customerId, type: 'card' });
  },

  // Validate webhook from Stripe to prevent spoofed events
  constructWebhookEvent(rawBody, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  },

  handleWebhookEvent(event) {
    switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return { action: 'update_subscription', data: event.data.object };
    case 'customer.subscription.deleted':
      return { action: 'cancel_subscription', data: event.data.object };
    case 'invoice.payment_succeeded':
      return { action: 'payment_succeeded', data: event.data.object };
    case 'invoice.payment_failed':
      return { action: 'payment_failed', data: event.data.object };
    default:
      return { action: 'unknown', type: event.type };
    }
  },

  // Crypto payment stub — integrate with Coinbase Commerce or NOWPayments
  createCryptoPaymentRequest({ planId, userId, currency = 'BTC' }) {
    const plan = PLANS[planId];
    if (!plan) throw new Error('Invalid plan.');
    return {
      id: uuidv4(),
      planId, userId, currency,
      amountUSD: plan.amount / 100,
      walletAddress: process.env.CRYPTO_WALLET_ADDRESS || 'configure_CRYPTO_WALLET_ADDRESS',
      instructions: `Send ${currency} equivalent of $${plan.amount / 100} to the address above. Include your user ID ${userId} in the memo.`,
      expiresAt: Date.now() + 30 * 60 * 1000
    };
  }
};
