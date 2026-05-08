// src/payments/stripeService.js
// Nexus AI Pro - Stripe Payment Service
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import Stripe from 'stripe';

// Subscription plan IDs (price IDs from Stripe dashboard, stored in env)
export const PLANS = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
});

// Supported crypto currencies
export const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

export class StripeService {
  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY must be set in environment');
    this.stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.priceIds = {
      pro: process.env.STRIPE_PRICE_PRO,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };
  }

  // ─── Customers ────────────────────────────────────────────────────────────

  async createOrRetrieveCustomer(userId, email) {
    const existingId = await this._getCustomerId(userId);
    if (existingId) {
      return this.stripe.customers.retrieve(existingId);
    }
    const customer = await this.stripe.customers.create({
      email,
      metadata: { nexusUserId: userId },
    });
    return customer;
  }

  async _getCustomerId(userId) {
    // In production: retrieve from your DB/KV store
    return null;
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async createSubscriptionCheckout({ userId, email, plan, successUrl, cancelUrl, locale = 'en' }) {
    const priceId = this.priceIds[plan];
    if (!priceId) throw new Error(`No price ID configured for plan: ${plan}`);

    const customer = await this.createOrRetrieveCustomer(userId, email);

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'us_bank_account', 'cashapp'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { nexusUserId: userId, plan },
      },
      metadata: { nexusUserId: userId, plan },
    });

    return { sessionId: session.id, url: session.url };
  }

  // ─── One-time payment (gift card purchase, etc.) ──────────────────────────

  async createOneTimeCheckout({ userId, email, items, successUrl, cancelUrl, locale = 'en' }) {
    const customer = await this.createOrRetrieveCustomer(userId, email);

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'cashapp', 'link'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name, description: item.description },
          unit_amount: item.amountCents,
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale,
      allow_promotion_codes: true,
    });

    return { sessionId: session.id, url: session.url };
  }

  // ─── Gift card redemption ─────────────────────────────────────────────────

  async redeemGiftCard({ code, customerId }) {
    // Apply a promotion code to the customer
    const promos = await this.stripe.promotionCodes.list({ code, limit: 1 });
    if (!promos.data.length) return { ok: false, error: 'Invalid gift card code' };
    const promo = promos.data[0];
    if (!promo.active) return { ok: false, error: 'Gift card already redeemed or expired' };

    return { ok: true, couponId: promo.coupon.id, amountOff: promo.coupon.amount_off, percentOff: promo.coupon.percent_off };
  }

  // ─── Crypto payment via Stripe (if configured) ───────────────────────────

  async createCryptoPaymentLink({ userId, email, plan, amountCents, currency = 'USD', successUrl, cancelUrl }) {
    // Stripe supports USDC/ETH via Stripe Crypto (requires beta access)
    // This creates a standard payment intent with crypto metadata
    const customer = await this.createOrRetrieveCustomer(userId, email);
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      customer: customer.id,
      metadata: { nexusUserId: userId, plan, paymentType: 'crypto' },
      automatic_payment_methods: { enabled: true },
    });
    return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
  }

  // ─── Billing portal ───────────────────────────────────────────────────────

  async createBillingPortalSession(customerId, returnUrl) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  // ─── Webhook verification ─────────────────────────────────────────────────

  constructEvent(rawBody, signature) {
    if (!this.webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  // ─── Get active subscription ──────────────────────────────────────────────

  async getActiveSubscription(customerId) {
    const subs = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    return subs.data[0] || null;
  }

  // ─── Cancel subscription ──────────────────────────────────────────────────

  async cancelSubscription(subscriptionId) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  // ─── Payment methods ──────────────────────────────────────────────────────

  async listPaymentMethods(customerId) {
    const methods = await this.stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    return methods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: false,
    }));
  }
}

let _instance = null;
export function getStripeService() {
  if (!_instance) _instance = new StripeService();
  return _instance;
}
