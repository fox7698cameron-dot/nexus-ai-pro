// payment-service.js | 2026-10-08

// ── Enums ──────────────────────────────────────────────────────────────────

export const PaymentMethod = Object.freeze({
  CARD: 'CARD',
  CRYPTO: 'CRYPTO',
  GIFT_CARD: 'GIFT_CARD',
});

export const CardType = Object.freeze({
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'Amex',
  DISCOVER: 'Discover',
  DINERS: 'Diners',
  JCB: 'JCB',
  UNIONPAY: 'UnionPay',
  UNKNOWN: 'Unknown',
});

export const CryptoCurrency = Object.freeze({
  BTC: 'BTC',
  ETH: 'ETH',
  USDC: 'USDC',
});

export const SubscriptionTier = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
});

// Prices in cents
const TIER_PRICES = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.PRO]: 999,
  [SubscriptionTier.ENTERPRISE]: 1499,
};

// ── Card detection ─────────────────────────────────────────────────────────

/**
 * Detect card type from card number (first digits).
 * @param {string} number
 * @returns {string} CardType value
 */
function detectCardType(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return CardType.VISA;
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01])/.test(n)) return CardType.MASTERCARD;
  if (/^3[47]/.test(n)) return CardType.AMEX;
  if (/^6(?:011|22(?:1(?:2[6-9]|[3-9]\d)|[2-8]\d{2}|9(?:[01]\d|2[0-5]))|4[4-9]\d|5\d{2})/.test(n)) return CardType.DISCOVER;
  if (/^3(?:0[0-5]|[68])/.test(n)) return CardType.DINERS;
  if (/^35/.test(n)) return CardType.JCB;
  if (/^62/.test(n)) return CardType.UNIONPAY;
  return CardType.UNKNOWN;
}

// ── Stripe helpers ─────────────────────────────────────────────────────────

function getStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  return key;
}

// ── PaymentService ─────────────────────────────────────────────────────────

class PaymentService {
  constructor() {
    this._subscriptions = new Map();
    this._giftCards = new Map();
  }

  /**
   * Create a Stripe payment intent for a subscription tier.
   * @param {string} tier - SubscriptionTier value
   * @param {string} customerId
   * @returns {Promise<{ clientSecret: string, amount: number, currency: string }>}
   */
  async createPaymentIntent(tier, customerId) {
    const amount = TIER_PRICES[tier];
    if (amount === undefined) throw new Error(`Unknown tier: ${tier}`);
    if (amount === 0) return { clientSecret: null, amount: 0, currency: 'usd' };

    // Stripe SDK integration point - uses STRIPE_SECRET_KEY from env
    getStripeKey(); // validates key is present

    // In production, call stripe.paymentIntents.create({ amount, currency: 'usd', customer: customerId })
    // Returning a placeholder to function without a live Stripe connection
    return {
      clientSecret: `pi_placeholder_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}_secret`,
      amount,
      currency: 'usd',
    };
  }

  /**
   * Create a subscription for a customer.
   * @param {string} customerId
   * @param {string} tier
   * @param {string} [paymentMethodId]
   * @returns {Promise<Object>}
   */
  async createSubscription(customerId, tier, paymentMethodId) {
    if (!Object.values(SubscriptionTier).includes(tier)) throw new Error(`Invalid tier: ${tier}`);
    const now = new Date();
    const renewsAt = new Date(now);
    renewsAt.setMonth(renewsAt.getMonth() + 1);

    const sub = {
      id: `sub_${Math.random().toString(36).slice(2)}`,
      customerId,
      tier,
      amount: TIER_PRICES[tier],
      currency: 'usd',
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: renewsAt.toISOString(),
      paymentMethodId: paymentMethodId || null,
      createdAt: now.toISOString(),
    };
    this._subscriptions.set(customerId, sub);
    return sub;
  }

  /**
   * Cancel a subscription.
   * @param {string} customerId
   * @returns {Promise<Object>}
   */
  async cancelSubscription(customerId) {
    const sub = this._subscriptions.get(customerId);
    if (!sub) throw new Error('No active subscription found');
    sub.status = 'canceled';
    sub.canceledAt = new Date().toISOString();
    this._subscriptions.set(customerId, sub);
    return sub;
  }

  /**
   * Upgrade or downgrade a subscription.
   * @param {string} customerId
   * @param {string} newTier
   * @returns {Promise<Object>}
   */
  async updateSubscription(customerId, newTier) {
    const sub = this._subscriptions.get(customerId);
    if (!sub) throw new Error('No active subscription found');
    sub.tier = newTier;
    sub.amount = TIER_PRICES[newTier];
    sub.updatedAt = new Date().toISOString();
    this._subscriptions.set(customerId, sub);
    return sub;
  }

  /**
   * Get the current subscription for a customer.
   * @param {string} customerId
   * @returns {Object|null}
   */
  getSubscription(customerId) {
    return this._subscriptions.get(customerId) || null;
  }

  /**
   * Validate a gift card code and return its balance.
   * @param {string} code
   * @returns {{ valid: boolean, balance: number, currency: string }}
   */
  validateGiftCard(code) {
    if (!code || code.trim().length < 8) return { valid: false, balance: 0, currency: 'usd' };
    const cached = this._giftCards.get(code.toUpperCase());
    if (cached) return cached;
    // Stub: accept any code of 8+ chars as valid with $10 balance
    const card = { valid: true, balance: 1000, currency: 'usd' };
    this._giftCards.set(code.toUpperCase(), card);
    return card;
  }

  /**
   * Redeem a gift card against an amount.
   * @param {string} code
   * @param {number} amount - in cents
   * @returns {{ success: boolean, remaining: number }}
   */
  redeemGiftCard(code, amount) {
    const card = this._giftCards.get(code.toUpperCase());
    if (!card || !card.valid) return { success: false, remaining: 0 };
    if (card.balance < amount) return { success: false, remaining: card.balance };
    card.balance -= amount;
    return { success: true, remaining: card.balance };
  }

  /**
   * Create a crypto payment request.
   * @param {string} currency - CryptoCurrency value
   * @param {number} amountUsd - amount in USD cents
   * @returns {Promise<{ address: string, currency: string, amount: number, expiresAt: number }>}
   */
  async createCryptoPayment(currency, amountUsd) {
    if (!Object.values(CryptoCurrency).includes(currency)) {
      throw new Error(`Unsupported cryptocurrency: ${currency}`);
    }
    const gatewayKey = process.env.CRYPTO_GATEWAY_KEY;
    if (!gatewayKey) throw new Error('CRYPTO_GATEWAY_KEY environment variable is not set');

    // Placeholder - integrate with crypto gateway in production
    return {
      address: `${currency.toLowerCase()}-address-placeholder`,
      currency,
      amount: amountUsd,
      expiresAt: Date.now() + 3_600_000, // 1 hour
    };
  }

  /**
   * Detect card type from number.
   * @param {string} number
   * @returns {string}
   */
  detectCardType(number) {
    return detectCardType(number);
  }
}

export default new PaymentService();
export { PaymentService, detectCardType, TIER_PRICES };
