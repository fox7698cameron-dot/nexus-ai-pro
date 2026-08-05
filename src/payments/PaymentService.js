// src/payments/PaymentService.js
// Nexus AI Pro — Payment Service
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Covers: Stripe (cards: Visa, Mastercard, Amex, Discover, Diners, JCB, UnionPay,
//         Carte Bancaire), crypto payments (ETH, BTC, USDC, SOL, MATIC),
//         gift-card redemption, subscription management.
// NO hardcoded secrets — all keys read from process.env.

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// ENUMERATIONS
// ---------------------------------------------------------------------------
export const PaymentMethod = Object.freeze({
  CARD:       'CARD',       // Stripe-managed card (all major networks)
  CRYPTO:     'CRYPTO',
  GIFT_CARD:  'GIFT_CARD',
});

export const SubscriptionTier = Object.freeze({
  FREE:       'FREE',
  PRO:        'PRO',
  ENTERPRISE: 'ENTERPRISE',
});

export const PaymentStatus = Object.freeze({
  PENDING:   'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED:    'FAILED',
  REFUNDED:  'REFUNDED',
  CANCELLED: 'CANCELLED',
});

// ---------------------------------------------------------------------------
// PRICE TABLE (USD cents, easily overridden via env)
// ---------------------------------------------------------------------------
const PRICES = {
  [SubscriptionTier.FREE]:       0,
  [SubscriptionTier.PRO]:        999,    // $9.99
  [SubscriptionTier.ENTERPRISE]: 1499,   // $14.99
};

// ---------------------------------------------------------------------------
// PAYMENT SERVICE
// ---------------------------------------------------------------------------
export class PaymentService {
  constructor({ userStore, redisClient = null }) {
    this.users    = userStore;
    this.redis    = redisClient;

    // Stripe loaded lazily so the module can be imported without a valid key
    this._stripe = null;

    // In-memory ledger (replace with DB in production)
    this._payments   = new Map();
    this._gifts      = new Map();
    this._cryptoTxns = new Map();
  }

  _getStripe() {
    if (this._stripe) return this._stripe;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
    // Dynamic import keeps this ESM-compatible and avoids top-level await issues
    const Stripe = this._stripeConstructor();
    this._stripe = new Stripe(key, { apiVersion: '2025-05-28.basil' });
    return this._stripe;
  }

  _stripeConstructor() {
    // Wrapped so tests can inject a mock
    if (this._mockStripe) return this._mockStripe;
    // eslint-disable-next-line no-undef
    return require('stripe');  // CommonJS-style inside class; bundler handles it
  }

  // -------------------------------------------------------------------------
  // STRIPE — Subscription management
  // -------------------------------------------------------------------------

  /** Create a Stripe customer for a new user */
  async createStripeCustomer(userId) {
    const user = await this.users.get(userId);
    if (!user) throw new Error('User not found.');
    const stripe = this._getStripe();

    const customer = await stripe.customers.create({
      email: user.email,
      name:  user.username,
      metadata: { nexusUserId: userId },
    });

    user.stripeCustomerId = customer.id;
    await this.users.set(userId, user);
    return customer;
  }

  /** Create a Stripe checkout session — returns URL to redirect user */
  async createCheckoutSession({ userId, tier, successUrl, cancelUrl, currency = 'usd' }) {
    const stripe   = this._getStripe();
    const user     = await this.users.get(userId);
    if (!user) throw new Error('User not found.');

    if (!Object.values(SubscriptionTier).includes(tier)) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.createStripeCustomer(userId);
      customerId = customer.id;
    }

    const priceId = process.env[`STRIPE_PRICE_${tier.toUpperCase()}`];
    if (!priceId && tier !== SubscriptionTier.FREE) {
      throw new Error(`Stripe price ID not configured for tier ${tier}. Set STRIPE_PRICE_${tier.toUpperCase()}.`);
    }

    if (tier === SubscriptionTier.FREE) {
      // Downgrade — cancel current subscription instead
      return this.cancelSubscription(userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],  // Supports all major networks via Stripe
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      currency,
      metadata: { nexusUserId: userId, tier },
      // Enable promotion codes (gift cards, coupons)
      allow_promotion_codes: true,
    });

    return { url: session.url, sessionId: session.id };
  }

  /** Handle Stripe webhook — call from POST /api/payments/webhook */
  async handleStripeWebhook(payload, sigHeader) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set.');

    const stripe = this._getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sigHeader, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session  = event.data.object;
        const userId   = session.metadata?.nexusUserId;
        const tier     = session.metadata?.tier;
        if (userId && tier) await this._activateSubscription(userId, tier, session.subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub    = event.data.object;
        const userId = await this._userIdFromCustomer(sub.customer);
        if (userId) await this._deactivateSubscription(userId);
        break;
      }
      case 'invoice.payment_failed': {
        const inv    = event.data.object;
        const userId = await this._userIdFromCustomer(inv.customer);
        if (userId) await this._recordPaymentFailure(userId, inv.id);
        break;
      }
    }

    return { received: true };
  }

  async cancelSubscription(userId) {
    const user = await this.users.get(userId);
    if (!user?.stripeSubscriptionId) throw new Error('No active subscription found.');

    const stripe = this._getStripe();
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    user.subscription = SubscriptionTier.FREE;
    user.stripeSubscriptionId = null;
    await this.users.set(userId, user);
    return { cancelled: true };
  }

  // -------------------------------------------------------------------------
  // CRYPTO PAYMENTS
  // -------------------------------------------------------------------------

  /**
   * Initiate a crypto payment.
   * Returns a wallet address and expected amount for the UI to display.
   * Actual on-chain verification must be done via a webhook from your
   * crypto payment provider (e.g. Coinbase Commerce, NOWPayments).
   */
  async initiateCryptoPayment({ userId, tier, currency = 'ETH' }) {
    const supportedCurrencies = ['BTC', 'ETH', 'USDC', 'SOL', 'MATIC', 'USDT'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw new Error(`Unsupported crypto currency: ${currency}`);
    }

    const txnId  = uuidv4();
    const amount = PRICES[tier] / 100; // USD
    const walletEnvKey = `CRYPTO_WALLET_${currency.toUpperCase()}`;
    const walletAddress = process.env[walletEnvKey];
    if (!walletAddress) throw new Error(`${walletEnvKey} environment variable not set.`);

    const txn = {
      id:            txnId,
      userId,
      tier,
      currency:      currency.toUpperCase(),
      amountUsd:     amount,
      walletAddress,
      status:        PaymentStatus.PENDING,
      createdAt:     new Date().toISOString(),
      expiresAt:     new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };

    this._cryptoTxns.set(txnId, txn);

    // Store pending txn in Redis for webhook verification if available
    if (this.redis) {
      await this.redis.setex(`crypto:pending:${txnId}`, 3600, JSON.stringify(txn));
    }

    return {
      transactionId: txnId,
      walletAddress,
      currency:      txn.currency,
      amountUsd:     amount,
      expiresAt:     txn.expiresAt,
    };
  }

  /** Called by crypto payment provider webhook */
  async confirmCryptoPayment(transactionId, txHash) {
    const txn = this._cryptoTxns.get(transactionId)
      || (this.redis ? JSON.parse(await this.redis.get(`crypto:pending:${transactionId}`)) : null);

    if (!txn) throw new Error('Transaction not found.');
    if (txn.status !== PaymentStatus.PENDING) throw new Error('Transaction already processed.');

    txn.status   = PaymentStatus.SUCCEEDED;
    txn.txHash   = txHash;
    txn.confirmedAt = new Date().toISOString();
    this._cryptoTxns.set(transactionId, txn);

    await this._activateSubscription(txn.userId, txn.tier, `crypto:${transactionId}`);
    return { confirmed: true };
  }

  // -------------------------------------------------------------------------
  // GIFT CARDS
  // -------------------------------------------------------------------------

  /** Generate a gift card (admin use) */
  generateGiftCard({ value, currency = 'usd', expiryDays = 365 }) {
    const code     = crypto.randomBytes(12).toString('base64url').toUpperCase(); // 16-char URL-safe
    const id       = uuidv4();
    const giftCard = {
      id,
      code,
      value,    // In cents
      currency,
      status:    'ACTIVE',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryDays * 86400000).toISOString(),
      redeemedBy: null,
      redeemedAt: null,
    };
    this._gifts.set(code, giftCard);
    return giftCard;
  }

  /** Redeem a gift card against a user's account */
  async redeemGiftCard(userId, code) {
    const card = this._gifts.get(code.toUpperCase().trim());
    if (!card)                           throw new Error('Gift card not found.');
    if (card.status !== 'ACTIVE')        throw new Error('Gift card already redeemed or expired.');
    if (new Date(card.expiresAt) < new Date()) {
      card.status = 'EXPIRED';
      throw new Error('Gift card has expired.');
    }

    // Apply the credit via Stripe
    const stripe   = this._getStripe();
    const user     = await this.users.get(userId);
    if (!user) throw new Error('User not found.');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.createStripeCustomer(userId);
      customerId = customer.id;
    }

    await stripe.customers.createBalanceTransaction(customerId, {
      amount:   -(card.value),   // Negative = credit
      currency: card.currency,
      description: `Gift card ${code} redeemed`,
    });

    card.status     = 'REDEEMED';
    card.redeemedBy = userId;
    card.redeemedAt = new Date().toISOString();
    this._gifts.set(code.toUpperCase().trim(), card);

    return { redeemed: true, credit: card.value, currency: card.currency };
  }

  // -------------------------------------------------------------------------
  // SUBSCRIPTION STATUS
  // -------------------------------------------------------------------------
  async getSubscriptionStatus(userId) {
    const user = await this.users.get(userId);
    if (!user) throw new Error('User not found.');

    return {
      tier:              user.subscription || SubscriptionTier.FREE,
      stripeCustomerId:  user.stripeCustomerId || null,
      subscriptionId:    user.stripeSubscriptionId || null,
      activeUntil:       user.subscriptionActiveUntil || null,
      paymentMethod:     user.lastPaymentMethod || null,
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------------------------
  async _activateSubscription(userId, tier, subscriptionRef) {
    const user = await this.users.get(userId);
    if (!user) return;
    user.subscription            = tier;
    user.stripeSubscriptionId    = subscriptionRef;
    user.subscriptionActiveUntil = new Date(Date.now() + 30 * 86400000).toISOString();
    await this.users.set(userId, user);
  }

  async _deactivateSubscription(userId) {
    const user = await this.users.get(userId);
    if (!user) return;
    user.subscription         = SubscriptionTier.FREE;
    user.stripeSubscriptionId = null;
    await this.users.set(userId, user);
  }

  async _recordPaymentFailure(userId, invoiceId) {
    const record = {
      userId,
      invoiceId,
      failedAt: new Date().toISOString(),
    };
    this._payments.set(invoiceId, record);
  }

  async _userIdFromCustomer(stripeCustomerId) {
    // Walk users looking for this Stripe customer ID
    // In production replace with an indexed DB lookup
    const allUsers = await this.users.listAll?.() ?? [];
    const found = allUsers.find(u => u.stripeCustomerId === stripeCustomerId);
    return found?.id ?? null;
  }
}
