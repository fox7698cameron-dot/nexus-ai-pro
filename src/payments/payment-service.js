// src/payments/payment-service.js
// 2026-07-24 | Nexus AI Pro - Payment & Subscription Service
// Supports: Stripe (all cards), crypto (Coinbase Commerce), gift cards

import Stripe from 'stripe';
import crypto from 'crypto';

// Lazy-init so startup doesn't fail without Stripe key
let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    stripeClient = new Stripe(key, { apiVersion: '2024-11-20.acacia' });
  }
  return stripeClient;
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    stripePriceId: null,
    features: ['5 AI chats/day', 'Basic models', '1 MB uploads', 'Community support'],
    reasoningLevel: 'fast',
    analyticsAccess: false,
    projectTracking: 1,
    connectors: 0,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 999, // cents
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features: ['Unlimited chats', 'All models', '100 MB uploads', 'Analytics dashboard', '5 projects', '10 connectors', 'Priority support'],
    reasoningLevel: 'mid',
    analyticsAccess: true,
    projectTracking: 5,
    connectors: 10,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 1499, // cents
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: ['Everything in Pro', 'Custom models', 'API access', 'Unlimited projects', 'All connectors', 'SLA', 'Dedicated support'],
    reasoningLevel: 'max',
    analyticsAccess: true,
    projectTracking: -1, // unlimited
    connectors: -1,
  },
};

export class PaymentService {
  constructor(dataService, securityModule) {
    this.data = dataService;
    this.security = securityModule;
    this.giftCards = new Map(); // code → { planId, usedBy, expiresAt }
  }

  // ── Stripe Checkout ────────────────────────────────────────────────────────
  async createCheckoutSession({ userId, planId, email, successUrl, cancelUrl, cryptoMode = false }) {
    const plan = PLANS[planId];
    if (!plan || plan.priceMonthly === 0) {
      return { success: false, error: 'Invalid plan for checkout.' };
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: cryptoMode ? ['card', 'us_bank_account'] : ['card'],
      customer_email: email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { userId, planId },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
    });

    this.security.logAudit('CHECKOUT_SESSION_CREATED', { userId, planId, sessionId: session.id });
    return { success: true, sessionId: session.id, url: session.url };
  }

  // ── Stripe Webhook ─────────────────────────────────────────────────────────
  handleWebhook(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');

    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      return { success: false, error: `Webhook signature failed: ${err.message}` };
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, planId } = session.metadata;
        this._activateSubscription(userId, planId, session.subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        this._renewSubscription(invoice.customer, invoice.subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        this._cancelSubscription(sub.customer);
        break;
      }
    }

    return { success: true, eventType: event.type };
  }

  // ── Crypto Payments ────────────────────────────────────────────────────────
  async createCryptoCharge({ userId, planId, currency = 'ETH' }) {
    const plan = PLANS[planId];
    if (!plan || plan.priceMonthly === 0) {
      return { success: false, error: 'Invalid plan.' };
    }

    const coinbaseApiKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!coinbaseApiKey) {
      return { success: false, error: 'Crypto payments not configured.' };
    }

    const priceUSD = (plan.priceMonthly / 100).toFixed(2);
    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': coinbaseApiKey,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify({
        name: `Nexus AI Pro ${plan.name}`,
        description: `${plan.name} subscription`,
        local_price: { amount: priceUSD, currency: 'USD' },
        pricing_type: 'fixed_price',
        metadata: { userId, planId },
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to create crypto charge.' };
    }

    const { data } = await response.json();
    this.security.logAudit('CRYPTO_CHARGE_CREATED', { userId, planId, chargeId: data.id });
    return { success: true, chargeId: data.id, hostedUrl: data.hosted_url, expiresAt: data.expires_at };
  }

  // ── Gift Cards ─────────────────────────────────────────────────────────────
  generateGiftCard(planId, daysValid = 30) {
    if (!PLANS[planId]) return { success: false, error: 'Invalid plan.' };
    const code = 'NEXUS-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    this.giftCards.set(code, {
      planId,
      usedBy: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + daysValid * 24 * 3600 * 1000,
    });
    return { success: true, code, planId, expiresAt: this.giftCards.get(code).expiresAt };
  }

  redeemGiftCard(code, userId) {
    const card = this.giftCards.get(code?.toUpperCase());
    if (!card) return { success: false, error: 'Invalid gift card code.' };
    if (card.usedBy) return { success: false, error: 'Gift card already redeemed.' };
    if (Date.now() > card.expiresAt) return { success: false, error: 'Gift card has expired.' };

    card.usedBy = userId;
    this._activateSubscription(userId, card.planId, null, 30);
    this.security.logAudit('GIFT_CARD_REDEEMED', { userId, planId: card.planId });
    return { success: true, planId: card.planId, message: 'Gift card redeemed successfully!' };
  }

  // ── Customer Portal ────────────────────────────────────────────────────────
  async createPortalSession(userId, returnUrl) {
    const sub = this.data.getSubscription(userId);
    if (!sub?.stripeCustomerId) {
      return { success: false, error: 'No billing account found.' };
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });
    return { success: true, url: session.url };
  }

  // ── Subscription helpers ───────────────────────────────────────────────────
  _activateSubscription(userId, planId, stripeSubId, durationDays = null) {
    const sub = {
      userId,
      planId,
      stripeSubId: stripeSubId || null,
      status: 'active',
      activatedAt: Date.now(),
      expiresAt: durationDays ? Date.now() + durationDays * 24 * 3600 * 1000 : null,
    };
    this.data.storeSubscription(userId, sub);
    this.security.logAudit('SUBSCRIPTION_ACTIVATED', { userId, planId });
  }

  _renewSubscription(stripeCustomerId, stripeSubId) {
    this.security.logAudit('SUBSCRIPTION_RENEWED', { stripeCustomerId, stripeSubId });
  }

  _cancelSubscription(stripeCustomerId) {
    this.security.logAudit('SUBSCRIPTION_CANCELLED', { stripeCustomerId });
  }

  getSubscription(userId) {
    return this.data.getSubscription(userId) || { planId: 'free', status: 'active' };
  }

  getPlanDetails() {
    return Object.values(PLANS).map(p => ({
      ...p,
      stripePriceId: undefined, // never expose price IDs to client
    }));
  }
}
