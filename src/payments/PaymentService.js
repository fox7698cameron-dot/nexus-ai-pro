// src/payments/PaymentService.js
// Updated: 2026-10-25
// Stripe (all major cards), crypto (multi-chain), and gift card support

// ─── Supported payment methods ────────────────────────────────────────────
export const PAYMENT_METHODS = {
  // Credit/debit cards via Stripe
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DISCOVER: 'discover',
  DINERS: 'diners',
  JCB: 'jcb',
  UNIONPAY: 'unionpay',
  MAESTRO: 'maestro',

  // Crypto
  BITCOIN: 'bitcoin',
  ETHEREUM: 'ethereum',
  USDC: 'usdc',
  USDT: 'usdt',
  SOLANA: 'solana',
  POLYGON: 'polygon',

  // Gift cards
  GIFT_CARD: 'gift_card'
};

export const SUBSCRIPTION_PLANS = {
  free: { id: 'free', name: 'Free', priceUsd: 0, stripePriceId: null, interval: null },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 9.99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    interval: 'month'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceUsd: 14.99,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || null,
    interval: 'month'
  }
};

export class PaymentService {
  constructor() {
    this._stripeKey = process.env.STRIPE_SECRET_KEY;
    this._stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this._coinbaseApiKey = process.env.COINBASE_COMMERCE_API_KEY;
    this.giftCards = new Map();
    this.subscriptions = new Map();
    this.transactions = new Map();
  }

  get stripeAvailable() {
    return !!this._stripeKey;
  }

  get cryptoAvailable() {
    return !!this._coinbaseApiKey;
  }

  // ─── Stripe: create customer ──────────────────────────────────────────────
  async createStripeCustomer(userId, email, name) {
    if (!this.stripeAvailable) throw new Error('Stripe not configured');
    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ email, name, metadata: JSON.stringify({ userId }) }).toString()
    });
    if (!response.ok) throw new Error('Failed to create Stripe customer');
    return response.json();
  }

  // ─── Stripe: create subscription ─────────────────────────────────────────
  async createSubscription(customerId, planId, paymentMethodId) {
    if (!this.stripeAvailable) throw new Error('Stripe not configured');
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan?.stripePriceId) throw new Error('Invalid plan or plan has no price');

    const response = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        customer: customerId,
        'items[0][price]': plan.stripePriceId,
        default_payment_method: paymentMethodId,
        'expand[]': 'latest_invoice.payment_intent'
      }).toString()
    });
    if (!response.ok) throw new Error('Failed to create subscription');
    const sub = await response.json();
    this.subscriptions.set(sub.id, { ...sub, planId, userId: customerId });
    return sub;
  }

  // ─── Stripe: create payment intent (one-time) ────────────────────────────
  async createPaymentIntent(amountCents, currency = 'usd', customerId = null, metadata = {}) {
    if (!this.stripeAvailable) throw new Error('Stripe not configured');
    const body = new URLSearchParams({
      amount: amountCents.toString(),
      currency,
      'payment_method_types[]': 'card',
      ...metadata
    });
    if (customerId) body.set('customer', customerId);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    if (!response.ok) throw new Error('Failed to create payment intent');
    return response.json();
  }

  // ─── Stripe webhook signature verification ───────────────────────────────
  verifyWebhookSignature(rawBody, signature) {
    if (!this._stripeWebhookSecret) return false;
    const elements = signature.split(',');
    const ts = elements.find(e => e.startsWith('t=')).slice(2);
    const v1 = elements.find(e => e.startsWith('v1=')).slice(3);
    const payload = `${ts}.${rawBody}`;
    const expected = require('crypto').createHmac('sha256', this._stripeWebhookSecret)
      .update(payload).digest('hex');
    return require('crypto').timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'));
  }

  // ─── Crypto: create charge (Coinbase Commerce) ───────────────────────────
  async createCryptoCharge(userId, planId, currency = 'ETH') {
    if (!this.cryptoAvailable) throw new Error('Crypto payments not configured');
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error('Invalid plan');

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': this._coinbaseApiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify({
        name: `Nexus AI Pro - ${plan.name}`,
        description: `${plan.name} subscription`,
        pricing_type: 'fixed_price',
        local_price: { amount: plan.priceUsd.toString(), currency: 'USD' },
        metadata: { userId, planId }
      })
    });
    if (!response.ok) throw new Error('Failed to create crypto charge');
    return response.json();
  }

  // ─── Gift cards ───────────────────────────────────────────────────────────
  issueGiftCard(amountCents, issuedBy = 'system') {
    const code = crypto.randomBytes(12).toString('hex').toUpperCase().match(/.{4}/g).join('-');
    const card = {
      code,
      amountCents,
      remainingCents: amountCents,
      issuedBy,
      issuedAt: Date.now(),
      usedBy: null,
      usedAt: null,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
    };
    this.giftCards.set(code, card);
    return { code, amountCents, expiresAt: card.expiresAt };
  }

  redeemGiftCard(code, userId, amountCents) {
    const card = this.giftCards.get(code.toUpperCase().replace(/\s/g, ''));
    if (!card) return { success: false, error: 'Invalid gift card code' };
    if (Date.now() > card.expiresAt) return { success: false, error: 'Gift card has expired' };
    if (card.remainingCents <= 0) return { success: false, error: 'Gift card has no remaining balance' };
    if (amountCents > card.remainingCents) {
      return { success: false, error: 'Insufficient gift card balance' };
    }
    card.remainingCents -= amountCents;
    if (card.usedBy === null) {
      card.usedBy = userId;
      card.usedAt = Date.now();
    }
    return { success: true, redeemedCents: amountCents, remainingCents: card.remainingCents };
  }

  getGiftCardBalance(code) {
    const card = this.giftCards.get(code.toUpperCase().replace(/\s/g, ''));
    if (!card) return { valid: false };
    return {
      valid: true,
      remainingCents: card.remainingCents,
      expiresAt: card.expiresAt,
      expired: Date.now() > card.expiresAt
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
