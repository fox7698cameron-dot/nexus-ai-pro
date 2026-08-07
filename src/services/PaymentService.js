/**
 * PaymentService.js
 * Nexus AI Pro — Payment & Subscription Service (Client-side)
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Supports: Stripe (all major cards, AMEX, Discover, UnionPay, etc.),
 *           Cryptocurrency (BTC, ETH, SOL, USDC), Gift Cards
 *
 * NOTE: No secrets are ever stored or transmitted client-side.
 *       All sensitive operations go through the secure backend.
 *
 * Updated: 2026-08-07
 */

/* ─── Payment Method Types ───────────────────────────────────────────── */
export const PAYMENT_METHODS = Object.freeze({
  CARD:       'card',       // Stripe — Visa, MC, AMEX, Discover, JCB, UnionPay
  CRYPTO_BTC: 'crypto_btc',
  CRYPTO_ETH: 'crypto_eth',
  CRYPTO_SOL: 'crypto_sol',
  CRYPTO_USDC:'crypto_usdc',
  GIFT_CARD:  'gift_card',
  APPLE_PAY:  'apple_pay',
  GOOGLE_PAY: 'google_pay',
});

/* ─── Subscription Plans ─────────────────────────────────────────────── */
export const PLANS = Object.freeze({
  free: {
    id: 'free',
    name: 'Free',
    price_usd: 0,
    stripe_price_id: null,
    features: ['5 AI queries/day', 'Basic models', '1 MB uploads', 'Community support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price_usd: 9.99,
    stripe_price_id: process?.env?.VITE_STRIPE_PRO_PRICE_ID || '',
    features: ['Unlimited queries', 'All AI models', '100 MB uploads', 'Priority support', 'Analytics dashboard'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price_usd: 14.99,
    stripe_price_id: process?.env?.VITE_STRIPE_ENT_PRICE_ID || '',
    features: ['Everything in Pro', 'Custom models', 'API access', 'Dedicated SLA', 'Game dev connectors', 'Admin dashboard'],
  },
});

/* ─── Card Brand Detection ───────────────────────────────────────────── */
export function detectCardBrand(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n))                            return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n))                        return 'AMEX';
  if (/^6(?:011|5)/.test(n))                   return 'Discover';
  if (/^35/.test(n))                           return 'JCB';
  if (/^62/.test(n))                           return 'UnionPay';
  if (/^(?:5[0678]|6304|6759|676[123])/.test(n)) return 'Maestro';
  return 'Unknown';
}

/* ─── Gift Card Validator ────────────────────────────────────────────── */
export function formatGiftCardCode(raw) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Format as XXXX-XXXX-XXXX-XXXX
  return clean.match(/.{1,4}/g)?.join('-') ?? clean;
}

/* ─── Payment Client ─────────────────────────────────────────────────── */
export class PaymentClient {
  constructor(baseUrl = '/api/payments') {
    this.baseUrl = baseUrl;
  }

  _authHeader() {
    const tok = sessionStorage.getItem('nexus:auth_token');
    return tok ? { 'Authorization': `Bearer ${tok}` } : {};
  }

  get _headers() {
    return { 'Content-Type': 'application/json', ...this._authHeader() };
  }

  /* ── Stripe ── */

  /** Create a Stripe checkout session for a subscription plan */
  async createCheckoutSession({ planId, successUrl, cancelUrl }) {
    const resp = await fetch(`${this.baseUrl}/stripe/checkout`, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ planId, successUrl, cancelUrl }),
    });
    return resp.json();
  }

  /** Create a Stripe payment intent for one-time payment */
  async createPaymentIntent({ amountCents, currency = 'usd', metadata = {} }) {
    const resp = await fetch(`${this.baseUrl}/stripe/intent`, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ amountCents, currency, metadata }),
    });
    return resp.json();
  }

  /** Get current subscription status */
  async getSubscription() {
    const resp = await fetch(`${this.baseUrl}/subscription`, {
      headers: this._headers,
    });
    return resp.json();
  }

  /** Cancel subscription */
  async cancelSubscription() {
    const resp = await fetch(`${this.baseUrl}/subscription/cancel`, {
      method: 'POST',
      headers: this._headers,
    });
    return resp.json();
  }

  /** Get payment history */
  async getHistory({ limit = 20, offset = 0 } = {}) {
    const resp = await fetch(`${this.baseUrl}/history?limit=${limit}&offset=${offset}`, {
      headers: this._headers,
    });
    return resp.json();
  }

  /* ── Cryptocurrency ── */

  /** Generate a crypto payment address */
  async createCryptoPayment({ currency, planId, amountUsd }) {
    const resp = await fetch(`${this.baseUrl}/crypto/create`, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ currency, planId, amountUsd }),
    });
    return resp.json();
  }

  /** Check crypto payment status */
  async checkCryptoPayment({ paymentId }) {
    const resp = await fetch(`${this.baseUrl}/crypto/status/${paymentId}`, {
      headers: this._headers,
    });
    return resp.json();
  }

  /* ── Gift Cards ── */

  /** Redeem a gift card */
  async redeemGiftCard({ code }) {
    const resp = await fetch(`${this.baseUrl}/giftcard/redeem`, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    return resp.json();
  }

  /** Check gift card balance */
  async checkGiftCardBalance({ code }) {
    const resp = await fetch(`${this.baseUrl}/giftcard/balance`, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    return resp.json();
  }

  /* ── Apple / Google Pay ── */

  /** Check if Apple Pay is available */
  isApplePayAvailable() {
    return !!(window.ApplePaySession?.canMakePayments?.());
  }

  /** Check if Google Pay is available */
  isGooglePayAvailable() {
    return typeof window.google?.payments?.api !== 'undefined';
  }
}

export const paymentClient = new PaymentClient();
