/**
 * PaymentManager.js
 * Created: 2026-10-24
 * Stripe, crypto, and gift card payment handling — no secrets hardcoded.
 * All keys are read from environment variables at runtime.
 */

export const PAYMENT_METHODS = Object.freeze({
  CARD: 'card',              // Visa, Mastercard, Amex, Discover, Maestro, etc.
  CRYPTO: 'crypto',          // BTC, ETH, USDC, SOL
  GIFT_CARD: 'gift_card',    // Nexus gift card redemption
});

export const CRYPTO_CURRENCIES = Object.freeze([
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', network: 'ERC-20' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', network: 'ERC-20' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', network: 'Solana' },
  { id: 'matic', name: 'Polygon', symbol: 'MATIC', network: 'Polygon' },
]);

export const SUBSCRIPTION_PLANS = Object.freeze([
  {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    interval: null,
    stripePriceId: null,
    features: ['5 messages/day', 'Basic models', '1 MB uploads'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUsd: 9.99,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    features: ['Unlimited messages', 'All standard models', '100 MB uploads', 'Analytics dashboard'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceUsd: 14.99,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || null,
    features: ['Everything in Pro', 'Enterprise models', 'API access', 'Dedicated support', 'SLA guarantee'],
  },
]);

// ---- Server-side PaymentService (Node.js / Express route handler helpers) ----
export class PaymentService {
  constructor(securityModule) {
    this.security = securityModule;
    this._stripeInstance = null;
    this.giftCards = new Map(); // code -> { value, currency, redeemedBy }
  }

  // Lazily initialise Stripe so the key comes from env, never from source
  _stripe() {
    if (!this._stripeInstance) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY environment variable not set.');
      // Dynamic import — Stripe npm package must be installed
      const Stripe = require('stripe');
      this._stripeInstance = Stripe(key, { apiVersion: '2024-06-20' });
    }
    return this._stripeInstance;
  }

  // -------- Stripe: create a checkout session --------
  async createCheckoutSession({ planId, userId, email, successUrl, cancelUrl }) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan || !plan.stripePriceId) throw new Error('Plan not found or not billable.');

    const stripe = this._stripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { userId, planId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    this.security?.logAudit('CHECKOUT_SESSION_CREATED', { userId, planId, sessionId: session.id });
    return { sessionId: session.id, url: session.url };
  }

  // -------- Stripe: handle webhook --------
  async handleWebhook(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set.');
    const stripe = this._stripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        this.security?.logAudit('PAYMENT_SUCCEEDED', {
          userId: s.metadata?.userId,
          planId: s.metadata?.planId,
          amount: s.amount_total,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        this.security?.logAudit('SUBSCRIPTION_CANCELLED', { subscriptionId: sub.id });
        break;
      }
    }
    return event;
  }

  // -------- Stripe: create billing portal --------
  async createBillingPortal({ customerId, returnUrl }) {
    const stripe = this._stripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  // -------- Crypto: generate payment address --------
  async createCryptoPayment({ planId, userId, currency }) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found.');
    const coin = CRYPTO_CURRENCIES.find(c => c.id === currency);
    if (!coin) throw new Error('Currency not supported.');

    // In production, integrate with NOWPayments, Coinbase Commerce, or BitPay via their API keys from env
    const apiKey = process.env.NOWPAYMENTS_API_KEY || process.env.COINBASE_COMMERCE_API_KEY;
    if (!apiKey) {
      // Return a placeholder to allow UI development without a live key
      return {
        orderId: `CRYPTO-${userId}-${Date.now()}`,
        currency: coin.symbol,
        amountUsd: plan.priceUsd,
        paymentAddress: 'CONFIGURE_NOWPAYMENTS_API_KEY_IN_ENV',
        expiresAt: Date.now() + 30 * 60 * 1000,
        status: 'pending',
      };
    }

    // Minimal NOWPayments integration
    const res = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: plan.priceUsd,
        price_currency: 'usd',
        pay_currency: coin.id,
        order_id: `${userId}-${planId}-${Date.now()}`,
        order_description: `Nexus AI Pro ${plan.name}`,
      }),
    });

    if (!res.ok) throw new Error(`Crypto payment provider error: ${res.status}`);
    const data = await res.json();

    this.security?.logAudit('CRYPTO_PAYMENT_CREATED', { userId, planId, currency });
    return {
      orderId: data.payment_id,
      currency: coin.symbol,
      amountUsd: plan.priceUsd,
      paymentAddress: data.pay_address,
      amountCrypto: data.pay_amount,
      expiresAt: Date.now() + 30 * 60 * 1000,
      status: data.payment_status,
    };
  }

  // -------- Gift cards --------
  issueGiftCard({ value = 10, currency = 'USD' }) {
    const code = this._generateGiftCode();
    this.giftCards.set(code, { value, currency, redeemedBy: null, issuedAt: Date.now() });
    return { code, value, currency };
  }

  redeemGiftCard({ code, userId }) {
    const card = this.giftCards.get(code);
    if (!card) return { ok: false, error: 'Invalid gift card code.' };
    if (card.redeemedBy) return { ok: false, error: 'Gift card already redeemed.' };
    card.redeemedBy = userId;
    this.security?.logAudit('GIFT_CARD_REDEEMED', { userId, code });
    return { ok: true, value: card.value, currency: card.currency };
  }

  _generateGiftCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = 4;
    const segLen = 4;
    return Array.from({ length: segments }, () =>
      Array.from(crypto.getRandomValues(new Uint8Array(segLen)),
        b => chars[b % chars.length]).join('')
    ).join('-');
  }
}

// ---- Browser-side helper: load Stripe.js dynamically ----
export async function loadStripeJs(publishableKey) {
  if (!publishableKey) throw new Error('Stripe publishable key required.');
  if (typeof window === 'undefined') throw new Error('loadStripeJs must run in a browser.');
  if (window.Stripe) return window.Stripe(publishableKey);

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });
  return window.Stripe(publishableKey);
}
