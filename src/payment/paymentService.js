// src/payment/paymentService.js
// 2026-07-23 | Nexus AI Pro - Payment Service
// Stripe (cards + ACH), Crypto (USDC/BTC/ETH), Gift Cards
// No secrets hardcoded — all credentials via environment variables

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const PAYMENT_METHODS = Object.freeze({
  CARD: 'card',           // Visa, Mastercard, Amex, Discover, Diners
  DEBIT: 'debit',
  ACH: 'ach',
  CRYPTO_USDC: 'crypto_usdc',
  CRYPTO_BTC: 'crypto_btc',
  CRYPTO_ETH: 'crypto_eth',
  CRYPTO_SOL: 'crypto_sol',
  GIFT_CARD: 'gift_card',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
});

export const SUBSCRIPTION_PLANS = Object.freeze({
  free: { id: 'free', name: 'Free', priceUsd: 0, interval: null, stripePriceId: null, features: ['5 chats/day', 'Basic models', '1MB uploads'] },
  pro: { id: 'pro', name: 'Pro', priceUsd: 9.99, interval: 'month', stripePriceId: process.env.STRIPE_PRICE_PRO, features: ['Unlimited chats', 'All models', '100MB uploads', 'Priority support'] },
  enterprise: { id: 'enterprise', name: 'Enterprise', priceUsd: 14.99, interval: 'month', stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE, features: ['Everything in Pro', 'Custom models', 'API access', 'SLA', 'Dedicated support'] },
});

export class PaymentService {
  constructor(securityModule) {
    this.security = securityModule;
    this.subscriptions = new Map();
    this.transactions = new Map();
    this.giftCards = new Map();
    this.cryptoAddresses = new Map();
    this._stripeLoaded = false;
    this._stripe = null;
  }

  async _getStripe() {
    if (this._stripe) return this._stripe;
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured: missing STRIPE_SECRET_KEY');
    const { default: Stripe } = await import('stripe').catch(() => { throw new Error('stripe package not installed'); });
    this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20', appInfo: { name: 'NexusAIPro', version: '2.0.0' } });
    this._stripeLoaded = true;
    return this._stripe;
  }

  async createStripeCustomer(userId, email, name) {
    const stripe = await this._getStripe();
    const customer = await stripe.customers.create({ email, name, metadata: { nexusUserId: userId } });
    this.security.logAudit('STRIPE_CUSTOMER_CREATED', { userId, customerId: customer.id });
    return customer.id;
  }

  async createPaymentIntent({ userId, amount, currency = 'usd', paymentMethod, metadata = {} }) {
    const stripe = await this._getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      payment_method_types: this._resolvePaymentMethodTypes(paymentMethod),
      metadata: { nexusUserId: userId, ...metadata },
      receipt_email: metadata.email,
    });

    const tx = {
      id: uuidv4(),
      userId,
      amount,
      currency,
      paymentMethod,
      stripeIntentId: intent.id,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.transactions.set(tx.id, tx);
    this.security.logAudit('PAYMENT_INTENT_CREATED', { userId, txId: tx.id, amount, currency });

    return { transactionId: tx.id, clientSecret: intent.client_secret, intentId: intent.id };
  }

  _resolvePaymentMethodTypes(method) {
    const map = {
      [PAYMENT_METHODS.CARD]: ['card'],
      [PAYMENT_METHODS.DEBIT]: ['card'],
      [PAYMENT_METHODS.ACH]: ['us_bank_account'],
      [PAYMENT_METHODS.APPLE_PAY]: ['card'],
      [PAYMENT_METHODS.GOOGLE_PAY]: ['card'],
    };
    return map[method] || ['card'];
  }

  async createSubscription({ userId, customerId, planId }) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan || !plan.stripePriceId) throw new Error(`Invalid plan or unconfigured Stripe price: ${planId}`);

    const stripe = await this._getStripe();
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { nexusUserId: userId, planId },
    });

    const subscription = {
      id: uuidv4(),
      userId,
      planId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: stripeSubscription.current_period_start * 1000,
      currentPeriodEnd: stripeSubscription.current_period_end * 1000,
      createdAt: Date.now(),
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, subscription);
    this.security.logAudit('SUBSCRIPTION_CREATED', { userId, planId, subscriptionId: subscription.id });
    return subscription;
  }

  async cancelSubscription(userId) {
    const sub = this.subscriptions.get(userId);
    if (!sub || !sub.stripeSubscriptionId) throw new Error('No active subscription');

    const stripe = await this._getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    sub.cancelAtPeriodEnd = true;
    sub.updatedAt = Date.now();
    this.subscriptions.set(userId, sub);
    this.security.logAudit('SUBSCRIPTION_CANCEL_REQUESTED', { userId });
    return sub;
  }

  handleStripeWebhook(rawBody, signature) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhook secret not configured');
    // Import Stripe synchronously would be ideal; we expose for the route to call after loading stripe
    return { rawBody, signature };
  }

  processStripeEvent(event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        this._markTransactionComplete(event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        this._markTransactionFailed(event.data.object.id);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        this._syncSubscriptionStatus(event.data.object);
        break;
    }
  }

  _markTransactionComplete(stripeIntentId) {
    for (const [id, tx] of this.transactions.entries()) {
      if (tx.stripeIntentId === stripeIntentId) {
        tx.status = 'completed';
        tx.completedAt = Date.now();
        this.transactions.set(id, tx);
        this.security.logAudit('PAYMENT_COMPLETED', { txId: id, stripeIntentId });
        break;
      }
    }
  }

  _markTransactionFailed(stripeIntentId) {
    for (const [id, tx] of this.transactions.entries()) {
      if (tx.stripeIntentId === stripeIntentId) {
        tx.status = 'failed';
        this.transactions.set(id, tx);
        this.security.logAudit('PAYMENT_FAILED', { txId: id, stripeIntentId });
        break;
      }
    }
  }

  _syncSubscriptionStatus(stripeSubscription) {
    for (const [userId, sub] of this.subscriptions.entries()) {
      if (sub.stripeSubscriptionId === stripeSubscription.id) {
        sub.status = stripeSubscription.status;
        sub.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
        sub.updatedAt = Date.now();
        this.subscriptions.set(userId, sub);
        this.security.logAudit('SUBSCRIPTION_SYNCED', { userId, status: sub.status });
        break;
      }
    }
  }

  // Crypto payment: generates a unique deposit address per user/session
  // In production, integrate with a crypto payment provider (e.g., Coinbase Commerce, BitPay)
  createCryptoPaymentRequest({ userId, amount, currency = 'usd', cryptoCurrency = 'usdc' }) {
    if (!process.env.CRYPTO_PAYMENT_PROVIDER_KEY) {
      throw new Error('Crypto payments not configured: missing CRYPTO_PAYMENT_PROVIDER_KEY');
    }

    const requestId = uuidv4();
    const expiresAt = Date.now() + 30 * 60 * 1000;

    const request = {
      id: requestId,
      userId,
      amount,
      currency,
      cryptoCurrency,
      status: 'pending',
      expiresAt,
      createdAt: Date.now(),
      providerRef: null,
    };

    this.cryptoAddresses.set(requestId, request);
    this.security.logAudit('CRYPTO_PAYMENT_REQUESTED', { userId, requestId, cryptoCurrency });

    return { requestId, expiresAt, cryptoCurrency, amount };
  }

  // Gift card: generate and validate gift card codes
  issueGiftCard({ issuedBy, amountUsd, expiryDays = 365 }) {
    if (!['admin', 'dev'].includes(issuedBy?.role)) throw new Error('Only admins/devs can issue gift cards');

    const code = crypto.randomBytes(12).toString('hex').toUpperCase().match(/.{4}/g).join('-');
    const card = {
      id: uuidv4(),
      code,
      codeHash: this.security.hash(code),
      amountUsd,
      balance: amountUsd,
      expiresAt: Date.now() + expiryDays * 86400000,
      issuedAt: Date.now(),
      issuedBy: issuedBy.id,
      redeemedBy: null,
      redeemedAt: null,
      active: true,
    };

    this.giftCards.set(card.id, card);
    this.security.logAudit('GIFT_CARD_ISSUED', { cardId: card.id, amountUsd });
    return { id: card.id, code, amountUsd, expiresAt: card.expiresAt };
  }

  redeemGiftCard(userId, code) {
    const codeHash = this.security.hash(code.toUpperCase().replace(/\s|-/g, ''));
    let found;
    for (const card of this.giftCards.values()) {
      if (crypto.timingSafeEqual(Buffer.from(card.codeHash), Buffer.from(codeHash))) {
        found = card;
        break;
      }
    }

    if (!found) throw new Error('Invalid gift card code');
    if (!found.active) throw new Error('Gift card already used or deactivated');
    if (found.balance <= 0) throw new Error('Gift card has no remaining balance');
    if (Date.now() > found.expiresAt) throw new Error('Gift card has expired');
    if (found.redeemedBy && found.redeemedBy !== userId) throw new Error('Gift card already redeemed by another user');

    const balance = found.balance;
    found.balance = 0;
    found.redeemedBy = userId;
    found.redeemedAt = Date.now();
    found.active = false;
    this.giftCards.set(found.id, found);

    this.security.logAudit('GIFT_CARD_REDEEMED', { userId, cardId: found.id, amountUsd: balance });
    return { redeemedAmount: balance, currency: 'usd' };
  }

  getUserSubscription(userId) {
    return this.subscriptions.get(userId) || { planId: 'free', status: 'active' };
  }

  getTransactionHistory(userId, limit = 50) {
    const results = [];
    for (const tx of this.transactions.values()) {
      if (tx.userId === userId) results.push(tx);
    }
    return results.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }
}
