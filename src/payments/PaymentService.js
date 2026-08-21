/**
 * PaymentService.js
 * Nexus AI Pro — Payment Service
 * Providers: Stripe (Visa, MC, Amex, Discover, Maestro, Amex, Diners, JCB, UnionPay,
 *            Apple Pay, Google Pay, Cash App Pay), Crypto (ETH, BTC, USDC, SOL, etc.),
 *            Gift Cards
 * PCI DSS: No raw card data handled client-side — all card data flows through Stripe.js
 * Security: No secrets/API keys hardcoded — all via server-side env vars
 * Updated: 2026-08-21
 */

'use strict';

// ─── Subscription plans ───────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'usd',
    features: ['5 chats/day', 'Basic AI models', '1 MB uploads', 'Community support'],
    stripePriceMonthly: null,
    stripePriceAnnual: null,
    badge: '🆓',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 999, // cents
    priceAnnual: 8990, // cents/year ≈ $89.90
    currency: 'usd',
    features: ['Unlimited chats', 'All AI models', '100 MB uploads', 'Priority support', 'Analytics dashboard'],
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    badge: '⭐',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 1499,
    priceAnnual: 13990,
    currency: 'usd',
    features: ['Everything in Pro', 'Custom AI models', 'API access', 'Dedicated support', 'SLA guarantee', 'SSO'],
    stripePriceMonthly: process.env.STRIPE_PRICE_ENT_MONTHLY,
    stripePriceAnnual: process.env.STRIPE_PRICE_ENT_ANNUAL,
    badge: '👑',
  },
};

// ─── Supported payment methods ────────────────────────────────────────────────
export const PAYMENT_METHODS = {
  // Cards
  visa: { label: 'Visa', icon: '💳', category: 'card' },
  mastercard: { label: 'Mastercard', icon: '🟠', category: 'card' },
  amex: { label: 'American Express', icon: '🟦', category: 'card' },
  discover: { label: 'Discover', icon: '🔵', category: 'card' },
  jcb: { label: 'JCB', icon: '💳', category: 'card' },
  unionpay: { label: 'UnionPay', icon: '💳', category: 'card' },
  maestro: { label: 'Maestro', icon: '💳', category: 'card' },
  dinersclub: { label: "Diners Club", icon: '💳', category: 'card' },
  // Digital wallets
  apple_pay: { label: 'Apple Pay', icon: '🍎', category: 'wallet' },
  google_pay: { label: 'Google Pay', icon: '🟢', category: 'wallet' },
  cash_app: { label: 'Cash App Pay', icon: '💚', category: 'wallet' },
  // Crypto
  bitcoin: { label: 'Bitcoin (BTC)', icon: '₿', category: 'crypto', network: 'bitcoin' },
  ethereum: { label: 'Ethereum (ETH)', icon: '⧫', category: 'crypto', network: 'ethereum' },
  usdc: { label: 'USD Coin (USDC)', icon: '🔵', category: 'crypto', network: 'ethereum' },
  usdt: { label: 'Tether (USDT)', icon: '💵', category: 'crypto', network: 'ethereum' },
  solana: { label: 'Solana (SOL)', icon: '◎', category: 'crypto', network: 'solana' },
  // Gift cards
  gift_card: { label: 'Gift Card', icon: '🎁', category: 'gift' },
};

// ─── Payment client ───────────────────────────────────────────────────────────
export class PaymentClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async _fetch(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || 'Payment request failed'), { status: res.status });
    }
    return res.json();
  }

  /**
   * Create a Stripe Payment Intent (server-side).
   * No card data is sent — Stripe.js collects it in the browser.
   */
  async createPaymentIntent({ planId, billingCycle = 'monthly', currency = 'usd' }) {
    return this._fetch('/api/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, currency }),
    });
  }

  /**
   * Create a Stripe Checkout Session (server redirect flow).
   */
  async createCheckoutSession({ planId, billingCycle = 'monthly', successUrl, cancelUrl }) {
    return this._fetch('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, successUrl, cancelUrl }),
    });
  }

  /**
   * Subscribe to a plan (Stripe Subscription).
   */
  async subscribe({ planId, billingCycle = 'monthly', paymentMethodId }) {
    return this._fetch('/api/payments/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, paymentMethodId }),
    });
  }

  /**
   * Initialize a crypto payment.
   * Returns a wallet address and amount to send.
   */
  async initCryptoPayment({ planId, currency = 'usdc', billingCycle = 'monthly' }) {
    return this._fetch('/api/payments/crypto/init', {
      method: 'POST',
      body: JSON.stringify({ planId, currency, billingCycle }),
    });
  }

  /**
   * Redeem a gift card.
   */
  async redeemGiftCard({ code }) {
    if (!code || typeof code !== 'string') throw new Error('Gift card code is required');
    const sanitized = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return this._fetch('/api/payments/gift-card/redeem', {
      method: 'POST',
      body: JSON.stringify({ code: sanitized }),
    });
  }

  /**
   * Cancel subscription.
   */
  async cancelSubscription({ immediate = false } = {}) {
    return this._fetch('/api/payments/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ immediate }),
    });
  }

  /**
   * Get current subscription info.
   */
  async getSubscription() {
    return this._fetch('/api/payments/subscription');
  }

  /**
   * Get billing portal session URL (Stripe Customer Portal).
   */
  async getBillingPortal({ returnUrl }) {
    return this._fetch('/api/payments/billing-portal', {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    });
  }

  /**
   * Get invoices.
   */
  async getInvoices({ limit = 10 } = {}) {
    return this._fetch(`/api/payments/invoices?limit=${limit}`);
  }
}

// ─── Card type detector ───────────────────────────────────────────────────────
export class CardTypeDetector {
  static patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]|^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/,
    amex: /^3[47]/,
    discover: /^6(?:011|5\d{2})/,
    jcb: /^35(?:2[89]|[3-8]\d)/,
    unionpay: /^62/,
    dinersclub: /^3(?:0[0-5]|[68])/,
    maestro: /^(5018|5020|5038|5893|6304|6759|6761|6762|6763)/,
  };

  static detect(number) {
    const clean = String(number).replace(/\D/g, '');
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(clean)) return type;
    }
    return 'unknown';
  }

  static formatDisplay(number) {
    const clean = String(number).replace(/\D/g, '');
    const type = this.detect(clean);
    if (type === 'amex') {
      return clean.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    }
    return clean.replace(/(\d{4})/g, '$1 ').trim();
  }

  /** Luhn algorithm check */
  static isValidLuhn(number) {
    const digits = String(number).replace(/\D/g, '').split('').reverse().map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = digits[i];
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  }
}

// ─── Gift card validator ──────────────────────────────────────────────────────
export class GiftCardValidator {
  /** Validates gift card code format: XXXX-XXXX-XXXX-XXXX (alphanumeric) */
  static validate(code) {
    if (!code || typeof code !== 'string') return { valid: false, error: 'Code is required' };
    const clean = code.trim().toUpperCase().replace(/\s/g, '');
    // Allow XXXX-XXXX-XXXX-XXXX or XXXXXXXXXXXXXXXX
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$|^[A-Z0-9]{16}$/;
    if (!pattern.test(clean)) {
      return { valid: false, error: 'Invalid gift card format. Use XXXX-XXXX-XXXX-XXXX' };
    }
    return { valid: true };
  }

  static format(code) {
    const clean = code.replace(/\W/g, '').toUpperCase();
    return clean.match(/.{1,4}/g)?.join('-') || clean;
  }
}

// ─── Crypto payment helper ────────────────────────────────────────────────────
export class CryptoPaymentHelper {
  static SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

  static formatAddress(address, currency) {
    if (!address) return '';
    // Show first 6 and last 4 chars
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  static getExplorerUrl(txHash, network = 'ethereum') {
    const explorers = {
      ethereum: `https://etherscan.io/tx/${txHash}`,
      bitcoin: `https://mempool.space/tx/${txHash}`,
      solana: `https://solscan.io/tx/${txHash}`,
    };
    return explorers[network] || '#';
  }
}

// ─── Singleton instance ───────────────────────────────────────────────────────
export const paymentClient = new PaymentClient();
