// Created: 2026-07-28

import crypto from 'crypto';

export const SUBSCRIPTION_TIERS = {
  FREE: { id: 'FREE', pricePerMonth: 0 },
  PRO: { id: 'PRO', pricePerMonth: 999 },
  ENTERPRISE: { id: 'ENTERPRISE', pricePerMonth: 1499 },
};

const SUPPORTED_CRYPTO = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

const CARD_PATTERNS = [
  { type: 'Visa', pattern: /^4/ },
  { type: 'Mastercard', pattern: /^5[1-5]|^2(2[2-9][1-9]|[3-6]\d{2}|7([01]\d|20))/ },
  { type: 'American Express', pattern: /^3[47]/ },
  { type: 'Discover', pattern: /^6(?:011|22(?:1(?:2[6-9]|[3-9]\d)|[2-8]\d{2}|9(?:[01]\d|2[0-5]))|4[4-9]\d|5\d{2})/ },
  { type: 'Diners Club', pattern: /^3(?:0[0-5]|[68])/ },
  { type: 'JCB', pattern: /^35(?:2[89]|[3-8]\d)/ },
  { type: 'UnionPay', pattern: /^62/ },
];

function luhnCheck(number) {
  const digits = String(number).replace(/\D/g, '');
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function stripeRequest(method, path, body) {
  const key = process.env.STRIPE_SECRET_KEY;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (body) {
    options.body = new URLSearchParams(body).toString();
  }
  const response = await fetch(`https://api.stripe.com/v1${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe error ${response.status}`);
  }
  return data;
}

export default class PaymentService {
  #giftCards = new Map();
  #cryptoInvoices = new Map();
  #userSubscriptions = new Map();

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('[PaymentService] WARNING: STRIPE_SECRET_KEY is not set. Stripe calls will fail.');
    }
  }

  // ── Stripe ────────────────────────────────────────────────────────────────

  async createCustomer(email, metadata = {}) {
    const body = { email };
    for (const [k, v] of Object.entries(metadata)) {
      body[`metadata[${k}]`] = v;
    }
    return stripeRequest('POST', '/customers', body);
  }

  async createSubscription(customerId, priceId, options = {}) {
    const body = {
      customer: customerId,
      'items[0][price]': priceId,
      ...options,
    };
    return stripeRequest('POST', '/subscriptions', body);
  }

  async cancelSubscription(subscriptionId) {
    return stripeRequest('DELETE', `/subscriptions/${subscriptionId}`);
  }

  async createPaymentIntent(amount, currency, metadata = {}) {
    const body = { amount: String(amount), currency };
    for (const [k, v] of Object.entries(metadata)) {
      body[`metadata[${k}]`] = v;
    }
    return stripeRequest('POST', '/payment_intents', body);
  }

  async confirmPayment(paymentIntentId) {
    return stripeRequest('POST', `/payment_intents/${paymentIntentId}/confirm`);
  }

  async createCheckoutSession(lineItems, successUrl, cancelUrl, metadata = {}) {
    const body = {
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode: 'payment',
    };
    lineItems.forEach((item, i) => {
      if (item.price) body[`line_items[${i}][price]`] = item.price;
      if (item.quantity) body[`line_items[${i}][quantity]`] = String(item.quantity);
      if (item.amount) body[`line_items[${i}][price_data][unit_amount]`] = String(item.amount);
      if (item.currency) body[`line_items[${i}][price_data][currency]`] = item.currency;
      if (item.name) body[`line_items[${i}][price_data][product_data][name]`] = item.name;
    });
    for (const [k, v] of Object.entries(metadata)) {
      body[`metadata[${k}]`] = v;
    }
    return stripeRequest('POST', '/checkout/sessions', body);
  }

  // ── Crypto ────────────────────────────────────────────────────────────────

  createCryptoInvoice(amount, currency, userId) {
    if (!SUPPORTED_CRYPTO.includes(currency)) {
      throw new Error(`Unsupported crypto currency. Supported: ${SUPPORTED_CRYPTO.join(', ')}`);
    }
    const invoiceId = crypto.randomUUID();
    const walletAddress = process.env[`CRYPTO_WALLET_${currency}`] || 'configure_wallet';
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const invoice = { invoiceId, walletAddress, amount, currency, userId, expiresAt, paid: false };
    this.#cryptoInvoices.set(invoiceId, invoice);
    return { invoiceId, walletAddress, amount, currency, expiresAt };
  }

  verifyPayment(invoiceId) {
    const invoice = this.#cryptoInvoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found.');
    // Stub: on-chain verification would be implemented here
    return { verified: false, message: 'Manual verification required' };
  }

  // ── Gift cards ────────────────────────────────────────────────────────────

  createGiftCard(amount, currency) {
    const code = randomHex(8); // 16 hex chars
    const card = { code, amount, currency, createdAt: new Date().toISOString(), redeemedAt: null, redeemedBy: null };
    this.#giftCards.set(code, card);
    return { code, amount, currency, createdAt: card.createdAt, redeemedAt: null };
  }

  redeemGiftCard(code, userId) {
    const card = this.#giftCards.get(code);
    if (!card) throw new Error('Gift card not found.');
    if (card.redeemedAt) throw new Error('Gift card has already been redeemed.');
    card.redeemedAt = new Date().toISOString();
    card.redeemedBy = userId;
    return { code, balance: card.amount, currency: card.currency, redeemedAt: card.redeemedAt };
  }

  // ── Card validation ───────────────────────────────────────────────────────

  detectCardType(number) {
    const digits = String(number).replace(/\D/g, '');
    for (const { type, pattern } of CARD_PATTERNS) {
      if (pattern.test(digits)) return type;
    }
    return 'Unknown';
  }

  validateCard(number) {
    const digits = String(number).replace(/\D/g, '');
    const valid = luhnCheck(digits);
    const type = this.detectCardType(digits);
    return { valid, type };
  }

  // ── Subscriptions (in-memory) ─────────────────────────────────────────────

  getUserSubscription(userId) {
    return this.#userSubscriptions.get(userId) || { tier: 'FREE', ...SUBSCRIPTION_TIERS.FREE };
  }

  setUserSubscription(userId, tier) {
    if (!SUBSCRIPTION_TIERS[tier]) {
      throw new Error(`Unknown tier '${tier}'. Valid tiers: ${Object.keys(SUBSCRIPTION_TIERS).join(', ')}`);
    }
    const record = { tier, ...SUBSCRIPTION_TIERS[tier], updatedAt: new Date().toISOString() };
    this.#userSubscriptions.set(userId, record);
    return record;
  }
}
