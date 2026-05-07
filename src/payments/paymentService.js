// paymentService.js — 2026-05-07
// Server-side payment service: Stripe subscriptions, one-time payments,
// webhooks, gift cards, and crypto payment stubs for Nexus AI Pro.

import Stripe from 'stripe';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Internal in-memory stores (replace with a real DB in production)
// ---------------------------------------------------------------------------
const customerMap = new Map();   // userId -> stripeCustomerId
const subscriptionMap = new Map(); // userId -> { subscriptionId, tier, status, currentPeriodEnd }
const giftCardStore = new Map();   // code -> { amount, currency, balance, redeemedBy }
const userCreditMap = new Map();   // userId -> balance (in cents)

// ---------------------------------------------------------------------------
// Tier price IDs — populate from env in production
// ---------------------------------------------------------------------------
const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

// ---------------------------------------------------------------------------
// Helper: map Stripe price ID back to tier name
// ---------------------------------------------------------------------------
function tierFromPriceId(priceId) {
  for (const [tier, pid] of Object.entries(PRICE_IDS)) {
    if (pid && pid === priceId) return tier;
  }
  return 'pro'; // sensible fallback
}

// ---------------------------------------------------------------------------
export class PaymentService {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  // -------------------------------------------------------------------------
  // Customer management
  // -------------------------------------------------------------------------

  /**
   * Creates a Stripe customer and stores the userId → customerId mapping.
   * @param {string} userId
   * @param {string} email
   * @param {string} name
   * @returns {Promise<import('stripe').Stripe.Customer>}
   */
  async createCustomer(userId, email, name) {
    const existing = customerMap.get(userId);
    if (existing) {
      return this.stripe.customers.retrieve(existing);
    }

    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });

    customerMap.set(userId, customer.id);
    return customer;
  }

  /**
   * Resolves the Stripe customer ID for a user, creating one if absent.
   * @param {string} userId
   * @returns {Promise<string>} Stripe customer ID
   */
  async _getOrCreateCustomerId(userId) {
    if (customerMap.has(userId)) return customerMap.get(userId);
    throw new Error(`No Stripe customer found for userId ${userId}. Call createCustomer first.`);
  }

  // -------------------------------------------------------------------------
  // Subscriptions
  // -------------------------------------------------------------------------

  /**
   * Creates a Stripe subscription for the user.
   * @param {string} userId
   * @param {string} priceId  — Stripe price ID (e.g. STRIPE_PRICE_PRO env var)
   * @param {string} paymentMethodId — Stripe payment method ID from the client
   * @returns {Promise<import('stripe').Stripe.Subscription>}
   */
  async createSubscription(userId, priceId, paymentMethodId) {
    const customerId = await this._getOrCreateCustomerId(userId);

    // Attach and set as default payment method
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId },
    });

    subscriptionMap.set(userId, {
      subscriptionId: subscription.id,
      tier: tierFromPriceId(priceId),
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });

    return subscription;
  }

  /**
   * Cancels a subscription at period end.
   * @param {string} subscriptionId
   * @returns {Promise<import('stripe').Stripe.Subscription>}
   */
  async cancelSubscription(subscriptionId) {
    const cancelled = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local cache
    for (const [uid, record] of subscriptionMap.entries()) {
      if (record.subscriptionId === subscriptionId) {
        subscriptionMap.set(uid, { ...record, status: 'canceling' });
        break;
      }
    }

    return cancelled;
  }

  // -------------------------------------------------------------------------
  // One-time payments
  // -------------------------------------------------------------------------

  /**
   * Creates a PaymentIntent for a one-time charge.
   * @param {number} amount    — amount in smallest currency unit (e.g. cents)
   * @param {string} currency  — ISO 4217 lowercase (e.g. 'usd')
   * @param {object} metadata  — arbitrary key/value pairs
   * @returns {Promise<import('stripe').Stripe.PaymentIntent>}
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  // -------------------------------------------------------------------------
  // Webhook handling
  // -------------------------------------------------------------------------

  /**
   * Verifies and processes an incoming Stripe webhook.
   * @param {Buffer|string} rawBody   — raw request body (not parsed)
   * @param {string}        sig       — value of stripe-signature header
   * @returns {{ received: boolean, type: string }}
   */
  async handleWebhook(rawBody, sig) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    await this._processWebhookEvent(event);
    return { received: true, type: event.type };
  }

  /**
   * Routes a verified Stripe event to the appropriate handler.
   * @param {import('stripe').Stripe.Event} event
   */
  async _processWebhookEvent(event) {
    const handlers = {
      'customer.subscription.updated': (e) => this._onSubscriptionUpdated(e.data.object),
      'customer.subscription.deleted': (e) => this._onSubscriptionDeleted(e.data.object),
      'payment_intent.succeeded':      (e) => this._onPaymentIntentSucceeded(e.data.object),
      'payment_intent.payment_failed': (e) => this._onPaymentIntentFailed(e.data.object),
      'invoice.payment_failed':        (e) => this._onInvoicePaymentFailed(e.data.object),
    };

    const handler = handlers[event.type];
    if (handler) {
      await handler(event);
    }
  }

  _onSubscriptionUpdated(subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const priceId = subscription.items?.data?.[0]?.price?.id;
    subscriptionMap.set(userId, {
      subscriptionId: subscription.id,
      tier: tierFromPriceId(priceId),
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  }

  _onSubscriptionDeleted(subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    subscriptionMap.set(userId, {
      subscriptionId: null,
      tier: 'free',
      status: 'canceled',
      currentPeriodEnd: null,
    });
  }

  _onPaymentIntentSucceeded(paymentIntent) {
    // Extend as needed: fulfillment logic, sending receipts, etc.
    console.info(`[PaymentService] PaymentIntent succeeded: ${paymentIntent.id}`);
  }

  _onPaymentIntentFailed(paymentIntent) {
    console.warn(`[PaymentService] PaymentIntent failed: ${paymentIntent.id}`, paymentIntent.last_payment_error?.message);
  }

  _onInvoicePaymentFailed(invoice) {
    console.warn(`[PaymentService] Invoice payment failed: ${invoice.id} customer: ${invoice.customer}`);
  }

  // -------------------------------------------------------------------------
  // Gift cards
  // -------------------------------------------------------------------------

  /**
   * Generates a new gift card with the specified balance.
   * @param {number} amount    — value in smallest currency unit
   * @param {string} currency  — ISO 4217 lowercase
   * @returns {{ code: string, amount: number, currency: string }}
   */
  createGiftCard(amount, currency) {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16 hex chars
    giftCardStore.set(code, {
      amount,
      currency,
      balance: amount,
      redeemedBy: null,
      createdAt: Date.now(),
    });
    return { code, amount, currency };
  }

  /**
   * Redeems a gift card and credits the user account.
   * @param {string} code
   * @param {string} userId
   * @returns {{ success: boolean, credited: number, currency: string }}
   */
  redeemGiftCard(code, userId) {
    const card = giftCardStore.get(code);
    if (!card) throw new Error('Invalid gift card code');
    if (card.balance <= 0) throw new Error('Gift card has already been fully redeemed');
    if (card.redeemedBy && card.redeemedBy !== userId) {
      throw new Error('Gift card already redeemed by another account');
    }

    const credited = card.balance;
    const currentCredit = userCreditMap.get(userId) || 0;
    userCreditMap.set(userId, currentCredit + credited);

    giftCardStore.set(code, { ...card, balance: 0, redeemedBy: userId, redeemedAt: Date.now() });
    return { success: true, credited, currency: card.currency };
  }

  // -------------------------------------------------------------------------
  // Crypto payments (stub — connect Coinbase Commerce or BitPay in production)
  // -------------------------------------------------------------------------

  /**
   * Initialises a crypto payment session.
   * In production, connect to Coinbase Commerce (COINBASE_COMMERCE_API_KEY)
   * or BitPay (BITPAY_TOKEN) via their respective environment variables.
   *
   * @param {number} amount     — fiat-equivalent amount in smallest unit
   * @param {string} currency   — fiat currency (e.g. 'usd')
   * @param {string} cryptoCoin — coin symbol, e.g. 'BTC', 'ETH', 'USDC'
   * @returns {{ walletAddress: string, amount: number, currency: string, cryptoCoin: string, expiry: number }}
   */
  initCryptoPayment(amount, currency, cryptoCoin) {
    const coin = cryptoCoin.toUpperCase();
    const walletAddress =
      process.env[`CRYPTO_WALLET_${coin}`] || 'not_configured';
    const expiry = Date.now() + 30 * 60 * 1000; // 30-minute window
    return { walletAddress, amount, currency, cryptoCoin: coin, expiry };
  }

  // -------------------------------------------------------------------------
  // Subscription status
  // -------------------------------------------------------------------------

  /**
   * Returns the current subscription tier and status for a user.
   * @param {string} userId
   * @returns {{ tier: 'free'|'pro'|'enterprise', status: string, currentPeriodEnd: number|null, creditBalance: number }}
   */
  getSubscriptionStatus(userId) {
    const record = subscriptionMap.get(userId);
    const creditBalance = userCreditMap.get(userId) || 0;

    if (!record || record.status === 'canceled' || !record.subscriptionId) {
      return { tier: 'free', status: 'inactive', currentPeriodEnd: null, creditBalance };
    }

    return {
      tier: record.tier,
      status: record.status,
      currentPeriodEnd: record.currentPeriodEnd,
      creditBalance,
    };
  }
}
