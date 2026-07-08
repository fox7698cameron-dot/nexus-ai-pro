// src/services/subscription-service.js
// Date: 2026-07-08
// Stripe subscriptions, crypto payments, gift cards, multi-card support

import Stripe from 'stripe';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const PLANS = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
});

export const PLAN_CONFIG = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['5 AI chats/day', 'Basic models', '1MB file uploads', 'Standard security'],
    limits: { dailyChats: 5, uploadMB: 1, models: ['gpt4', 'claude-sonnet', 'gemini-flash'] }
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 999, // cents
    yearlyPrice: 9990,
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    features: ['Unlimited AI chats', 'All models', '100MB uploads', 'Priority support', 'Analytics dashboard'],
    limits: { dailyChats: -1, uploadMB: 100, models: 'all' }
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    features: ['Everything in Pro', 'Custom AI models', 'API access', 'SLA guarantee', 'Dedicated support', 'Game dev tools', 'AR/VR tracking'],
    limits: { dailyChats: -1, uploadMB: 1024, models: 'all' }
  }
};

export const SUPPORTED_CRYPTO = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'MATIC'];

export class SubscriptionService {
  constructor(dataStore) {
    this.store = dataStore;
    this.stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
      : null;
    this.giftCards = new Map();
    this.cryptoPayments = new Map();
  }

  // Create Stripe customer and setup subscription
  async createCheckoutSession(userId, plan, billingCycle = 'monthly', successUrl, cancelUrl) {
    if (!this.stripe) {
      return { success: false, error: 'Payment processing not configured' };
    }

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) return { success: false, error: 'Invalid plan' };
    if (plan === PLANS.FREE) return { success: false, error: 'Free plan requires no payment' };

    const user = this.store.findUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: { userId }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      this.store.saveUser(user);
    }

    const priceId = billingCycle === 'yearly'
      ? planConfig.stripePriceIdYearly
      : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      return { success: false, error: 'Price not configured for this plan' };
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { userId, plan, billingCycle }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { userId, plan }
    });

    this.store.auditLog('CHECKOUT_STARTED', { userId, plan, billingCycle });
    return { success: true, sessionId: session.id, url: session.url };
  }

  // Handle Stripe webhook
  async handleWebhook(payload, signature) {
    if (!this.stripe) return { success: false, error: 'Stripe not configured' };

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return { success: false, error: 'Webhook secret not configured' };

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      return { success: false, error: `Webhook signature verification failed: ${err.message}` };
    }

    switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await this.activateSubscription(session.metadata.userId, session.metadata.plan, session.subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) await this.deactivateSubscription(userId);
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      this.store.auditLog('PAYMENT_FAILED', { customerId: inv.customer });
      break;
    }
    }

    return { success: true, type: event.type };
  }

  async activateSubscription(userId, plan, stripeSubscriptionId) {
    const user = this.store.findUserById(userId);
    if (!user) return;
    user.subscription = {
      plan,
      stripeSubscriptionId,
      status: 'active',
      activatedAt: Date.now()
    };
    this.store.saveUser(user);
    this.store.auditLog('SUBSCRIPTION_ACTIVATED', { userId, plan });
  }

  async deactivateSubscription(userId) {
    const user = this.store.findUserById(userId);
    if (!user) return;
    user.subscription = { plan: PLANS.FREE, status: 'cancelled', cancelledAt: Date.now() };
    this.store.saveUser(user);
    this.store.auditLog('SUBSCRIPTION_CANCELLED', { userId });
  }

  // Crypto payment initiation
  async initiateCryptoPayment(userId, plan, currency, billingCycle = 'monthly') {
    if (!SUPPORTED_CRYPTO.includes(currency)) {
      return { success: false, error: `Unsupported cryptocurrency: ${currency}` };
    }

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) return { success: false, error: 'Invalid plan' };

    const basePrice = billingCycle === 'yearly' ? planConfig.yearlyPrice : planConfig.monthlyPrice;
    const exchangeRates = { BTC: 0.0000155, ETH: 0.00028, USDC: 1.0, USDT: 1.0, SOL: 0.0055, MATIC: 0.88 };
    const cryptoAmount = (basePrice / 100 * exchangeRates[currency]).toFixed(8);

    const paymentId = uuidv4();
    const walletAddresses = {
      BTC: process.env.CRYPTO_BTC_ADDRESS,
      ETH: process.env.CRYPTO_ETH_ADDRESS,
      USDC: process.env.CRYPTO_ETH_ADDRESS,
      USDT: process.env.CRYPTO_ETH_ADDRESS,
      SOL: process.env.CRYPTO_SOL_ADDRESS,
      MATIC: process.env.CRYPTO_MATIC_ADDRESS
    };

    const payment = {
      id: paymentId,
      userId,
      plan,
      billingCycle,
      currency,
      amount: cryptoAmount,
      usdAmount: basePrice / 100,
      walletAddress: walletAddresses[currency] || null,
      status: 'pending',
      expiresAt: Date.now() + 3600000, // 1 hour
      createdAt: Date.now()
    };

    this.cryptoPayments.set(paymentId, payment);
    this.store.auditLog('CRYPTO_PAYMENT_INITIATED', { userId, plan, currency, paymentId });

    return {
      success: true,
      paymentId,
      currency,
      amount: cryptoAmount,
      walletAddress: payment.walletAddress,
      expiresAt: payment.expiresAt,
      memo: `NEXUS-${paymentId.slice(0, 8).toUpperCase()}`
    };
  }

  // Gift card management
  generateGiftCard(adminUserId, plan, billingCycle = 'monthly', expiryDays = 365) {
    const code = Array.from({ length: 4 }, () =>
      crypto.randomBytes(3).toString('hex').toUpperCase()
    ).join('-');

    const giftCard = {
      code,
      plan,
      billingCycle,
      adminIssuedBy: adminUserId,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiryDays * 86400000,
      isRedeemed: false,
      redeemedBy: null,
      redeemedAt: null
    };

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    this.giftCards.set(codeHash, giftCard);
    this.store.auditLog('GIFT_CARD_CREATED', { adminUserId, plan, code: '***-' + code.slice(-4) });
    return { success: true, code, giftCard: { ...giftCard, code: undefined } };
  }

  redeemGiftCard(userId, code) {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Invalid gift card code' };
    }

    const codeHash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
    const giftCard = this.giftCards.get(codeHash);

    if (!giftCard) return { success: false, error: 'Gift card not found' };
    if (giftCard.isRedeemed) return { success: false, error: 'Gift card already redeemed' };
    if (Date.now() > giftCard.expiresAt) return { success: false, error: 'Gift card has expired' };

    giftCard.isRedeemed = true;
    giftCard.redeemedBy = userId;
    giftCard.redeemedAt = Date.now();
    this.giftCards.set(codeHash, giftCard);

    const user = this.store.findUserById(userId);
    if (user) {
      user.subscription = {
        plan: giftCard.plan,
        status: 'active',
        activatedAt: Date.now(),
        source: 'gift_card'
      };
      this.store.saveUser(user);
    }

    this.store.auditLog('GIFT_CARD_REDEEMED', { userId, plan: giftCard.plan });
    return { success: true, plan: giftCard.plan, billingCycle: giftCard.billingCycle };
  }

  getUserSubscription(userId) {
    const user = this.store.findUserById(userId);
    if (!user) return null;
    return user.subscription || { plan: PLANS.FREE, status: 'active' };
  }

  getPlanLimits(plan) {
    return PLAN_CONFIG[plan]?.limits || PLAN_CONFIG.free.limits;
  }
}
