/* subscription.js
 * Nexus AI Pro - Subscription & Payments API Module
 * Date: 2026-10-27
 * Stripe (all major cards), crypto (ETH/BTC/USDC/SOL), gift cards
 * All keys loaded from environment — NEVER hardcoded
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Plan definitions ───────────────────────────────────────────────────────────

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    features: ['5 chats/day', 'Basic models', '1 MB uploads', 'Community support'],
    limits: { chatsPerDay: 5, uploadMB: 1, models: ['gpt-4o-mini', 'claude-haiku', 'gemini-flash'] },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    annualPrice: 95.88,
    currency: 'USD',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdAnnual:  process.env.STRIPE_PRICE_PRO_ANNUAL,
    features: ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support', 'Analytics'],
    limits: { chatsPerDay: Infinity, uploadMB: 100, models: ['*'] },
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyPrice: 29.99,
    annualPrice: 287.88,
    currency: 'USD',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    stripePriceIdAnnual:  process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
    features: ['Everything in Pro', '10 seats', '1 GB uploads', 'Dedicated support', 'Admin dashboard', 'SSO'],
    limits: { chatsPerDay: Infinity, uploadMB: 1024, models: ['*'], seats: 10 },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    currency: 'USD',
    features: ['Custom seats', 'Unlimited storage', 'On-premise option', 'SLA', 'Dedicated CSM', 'Custom models'],
    limits: { chatsPerDay: Infinity, uploadMB: Infinity, models: ['*'], seats: Infinity },
  },
};

// ── In-memory subscription store (replace with DB in production) ───────────────

const subscriptions = new Map();
const giftCodes = new Map();
const invoices = new Map();
const cryptoPayments = new Map();

// ── Gift code generation (admin only) ─────────────────────────────────────────

export function generateGiftCode(planId, months = 1) {
  const code = crypto.randomBytes(12).toString('hex').toUpperCase();
  giftCodes.set(code, { planId, months, used: false, createdAt: Date.now(), expiresAt: Date.now() + 365 * 24 * 3600 * 1000 });
  return code;
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export function registerSubscriptionRoutes(app, security, authenticateRequest, requireRole) {

  // Get all plans
  app.get('/api/plans', (req, res) => {
    const locale = req.query.locale || 'en-US';
    const plans = Object.values(PLANS).map(plan => ({
      ...plan,
      formattedMonthly: plan.monthlyPrice !== null
        ? new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency || 'USD' }).format(plan.monthlyPrice)
        : 'Custom',
      formattedAnnual: plan.annualPrice !== null
        ? new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency || 'USD' }).format(plan.annualPrice)
        : 'Custom',
      stripePriceIdMonthly: undefined,
      stripePriceIdAnnual: undefined,
    }));
    res.json({ plans });
  });

  // Get current subscription
  app.get('/api/subscriptions/me', authenticateRequest, (req, res) => {
    const sub = subscriptions.get(req.user.sub) || { planId: 'free', status: 'active', createdAt: Date.now() };
    const plan = PLANS[sub.planId] || PLANS.free;
    res.json({
      ...sub,
      plan: { id: plan.id, name: plan.name, features: plan.features, limits: plan.limits },
    });
  });

  // Create Stripe checkout session
  app.post('/api/subscriptions/checkout', authenticateRequest, async (req, res) => {
    const { planId, interval = 'monthly', successUrl, cancelUrl } = req.body;
    const plan = PLANS[planId];
    if (!plan || planId === 'free' || planId === 'enterprise') {
      return res.status(400).json({ error: 'Invalid plan for checkout' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({
        error: 'Stripe not configured',
        setup: 'Set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_ANNUAL, etc. in environment variables',
      });
    }

    const priceId = interval === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
    if (!priceId) {
      return res.status(503).json({ error: `Stripe price ID not configured for ${planId}/${interval}` });
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl || `${req.get('origin')}/dashboard?checkout=success`,
        cancel_url: cancelUrl || `${req.get('origin')}/pricing?checkout=cancelled`,
        metadata: { userId: req.user.sub, planId, interval },
        payment_method_types: ['card'],
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: { enabled: true },
      });
      res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
      security.logAudit('STRIPE_ERROR', { error: err.message, userId: req.user.sub });
      res.status(500).json({ error: 'Checkout session creation failed' });
    }
  });

  // Stripe webhook handler
  app.post('/api/subscriptions/webhook', (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !webhookSecret) return res.status(503).json({ error: 'Stripe not configured' });

    (async () => {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey);
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch {
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, planId } = session.metadata;
        if (userId && planId) {
          subscriptions.set(userId, {
            planId,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          security.logAudit('SUBSCRIPTION_CREATED', { userId, planId });
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const existing = [...subscriptions.entries()].find(([, s]) => s.stripeSubscriptionId === sub.id);
        if (existing) {
          existing[1].status = 'cancelled';
          existing[1].updatedAt = Date.now();
          subscriptions.set(existing[0], existing[1]);
          security.logAudit('SUBSCRIPTION_CANCELLED', { stripeSubId: sub.id });
        }
      }

      res.json({ received: true });
    })().catch(err => res.status(500).json({ error: err.message }));
  });

  // Crypto payment initiation
  app.post('/api/subscriptions/crypto', authenticateRequest, (req, res) => {
    const { planId, currency = 'ETH' } = req.body;
    const plan = PLANS[planId];
    if (!plan || !plan.monthlyPrice) return res.status(400).json({ error: 'Invalid plan' });

    const supportedCryptos = ['ETH', 'BTC', 'USDC', 'SOL'];
    if (!supportedCryptos.includes(currency)) {
      return res.status(400).json({ error: `Unsupported crypto. Supported: ${supportedCryptos.join(', ')}` });
    }

    const paymentId = uuidv4();
    const walletProviderUrl = process.env.CRYPTO_WALLET_PROVIDER_URL;
    if (!walletProviderUrl) {
      return res.status(503).json({
        error: 'Crypto payments not configured',
        setup: 'Set CRYPTO_WALLET_PROVIDER_URL environment variable',
      });
    }

    const payment = {
      id: paymentId,
      userId: req.user.sub,
      planId,
      currency,
      amountUSD: plan.monthlyPrice,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    cryptoPayments.set(paymentId, payment);

    res.json({
      paymentId,
      currency,
      amountUSD: plan.monthlyPrice,
      instructions: `Connect your ${currency} wallet via the wallet provider and complete payment`,
      walletProviderUrl,
      expiresAt: payment.expiresAt,
    });
  });

  // Redeem gift card
  app.post('/api/subscriptions/gift-card/redeem', authenticateRequest, (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Gift card code required' });

    const gift = giftCodes.get(code.toUpperCase().trim());
    if (!gift) return res.status(404).json({ error: 'Invalid gift card code' });
    if (gift.used) return res.status(409).json({ error: 'Gift card already redeemed' });
    if (gift.expiresAt < Date.now()) return res.status(410).json({ error: 'Gift card expired' });

    gift.used = true;
    gift.redeemedBy = req.user.sub;
    gift.redeemedAt = Date.now();
    giftCodes.set(code.toUpperCase().trim(), gift);

    const expiresAt = Date.now() + gift.months * 30 * 24 * 3600 * 1000;
    subscriptions.set(req.user.sub, {
      planId: gift.planId,
      status: 'active',
      source: 'gift_card',
      expiresAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    security.logAudit('GIFT_CARD_REDEEMED', { userId: req.user.sub, planId: gift.planId });
    res.json({ message: 'Gift card redeemed successfully', planId: gift.planId, expiresAt });
  });

  // Cancel subscription
  app.post('/api/subscriptions/cancel', authenticateRequest, async (req, res) => {
    const sub = subscriptions.get(req.user.sub);
    if (!sub) return res.status(404).json({ error: 'No active subscription' });

    if (sub.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
      } catch {
        // Log but don't fail - update local state anyway
      }
    }

    sub.status = 'cancelling';
    sub.updatedAt = Date.now();
    subscriptions.set(req.user.sub, sub);
    security.logAudit('SUBSCRIPTION_CANCEL_REQUESTED', { userId: req.user.sub });
    res.json({ message: 'Subscription will cancel at period end' });
  });

  // Get invoices
  app.get('/api/subscriptions/invoices', authenticateRequest, (req, res) => {
    const userInvoices = [...invoices.values()]
      .filter(inv => inv.userId === req.user.sub)
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ invoices: userInvoices });
  });

  // Admin: generate gift code
  app.post('/api/admin/gift-codes', authenticateRequest, requireRole('admin'), (req, res) => {
    const { planId, months = 1 } = req.body;
    if (!PLANS[planId]) return res.status(400).json({ error: 'Invalid plan' });
    const code = generateGiftCode(planId, months);
    res.json({ code, planId, months });
  });
}
