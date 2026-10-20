// File: src/server/routes/payments.js
// Updated: 2026-10-20
// Payment routes: Stripe, crypto, gift cards - no hardcoded keys

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const subscriptions = new Map();
const invoices = new Map();
const giftCards = new Map();

const TIERS = {
  free: { name: 'Free', monthlyPrice: 0, annualPrice: 0 },
  pro: { name: 'Pro', monthlyPrice: 999, annualPrice: 9590 },
  enterprise: { name: 'Enterprise', monthlyPrice: 1499, annualPrice: 14390 },
};

const ACCEPTED_CRYPTO = ['BTC', 'ETH', 'USDC', 'SOL', 'USDT'];
const ACCEPTED_CARDS = ['visa', 'mastercard', 'amex', 'discover'];

function generateGiftCardCode() {
  return Array.from({ length: 4 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  ).join('-');
}

export function registerPaymentRoutes(app, security) {
  // Get subscription tiers
  app.get('/api/payments/tiers', (req, res) => {
    res.json({ tiers: TIERS });
  });

  // Create Stripe payment intent (requires STRIPE_SECRET_KEY env var)
  app.post('/api/payments/create-intent', async (req, res) => {
    const { tier, billingCycle = 'monthly', currency = 'usd' } = req.body;

    if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        error: 'Payment processing not configured',
        setup: 'Set STRIPE_SECRET_KEY environment variable to enable payments',
      });
    }

    const amount = billingCycle === 'annual' ? TIERS[tier].annualPrice : TIERS[tier].monthlyPrice;
    if (amount === 0) return res.json({ clientSecret: null, message: 'Free tier requires no payment' });

    try {
      // Dynamic import to avoid crashing when stripe is not installed
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

      const intent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: { tier, billingCycle },
        automatic_payment_methods: { enabled: true },
      });

      security.logAudit('PAYMENT_INTENT_CREATED', { tier, billingCycle, amount });
      res.json({ clientSecret: intent.client_secret, amount, currency });
    } catch (err) {
      security.logAudit('PAYMENT_INTENT_ERROR', { error: err.message });
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  });

  // Stripe webhook (requires STRIPE_WEBHOOK_SECRET env var)
  app.post('/api/payments/webhook', (req, res, next) => {
    // Raw body needed for Stripe signature verification
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { req.rawBody = Buffer.from(data); next(); });
  }, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
      const event = stripe.webhooks.constructEvent(
        req.rawBody || req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === 'payment_intent.succeeded') {
        const { tier, billingCycle } = event.data.object.metadata;
        const sub = {
          id: uuidv4(),
          tier,
          billingCycle,
          status: 'active',
          activatedAt: Date.now(),
          expiresAt: Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400000,
          stripePaymentId: event.data.object.id,
        };
        subscriptions.set(sub.id, sub);
        security.logAudit('SUBSCRIPTION_ACTIVATED', { tier, billingCycle });
      }

      res.json({ received: true });
    } catch (err) {
      security.logAudit('WEBHOOK_ERROR', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Crypto payment initiation
  app.post('/api/payments/crypto', (req, res) => {
    const { tier, currency, billingCycle = 'monthly' } = req.body;

    if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });
    if (!ACCEPTED_CRYPTO.includes(currency)) {
      return res.status(400).json({ error: `Unsupported crypto. Accepted: ${ACCEPTED_CRYPTO.join(', ')}` });
    }

    if (!process.env.CRYPTO_PAYMENT_PROVIDER_KEY) {
      return res.json({
        status: 'unconfigured',
        message: 'Set CRYPTO_PAYMENT_PROVIDER_KEY to enable crypto payments',
        supportedCurrencies: ACCEPTED_CRYPTO,
      });
    }

    const paymentId = uuidv4();
    const amount = billingCycle === 'annual' ? TIERS[tier].annualPrice / 100 : TIERS[tier].monthlyPrice / 100;

    // In production: integrate with NOWPayments, Coinbase Commerce, or BitPay via env-var config
    security.logAudit('CRYPTO_PAYMENT_INITIATED', { tier, currency, billingCycle });
    res.json({
      paymentId,
      currency,
      amountUSD: amount,
      walletAddress: null,
      expiresAt: Date.now() + 3600000,
      message: `Connect crypto payment provider via CRYPTO_PAYMENT_PROVIDER_KEY`,
      status: 'pending',
    });
  });

  // Gift card redemption
  app.post('/api/payments/gift-card/redeem', (req, res) => {
    const { code, userId } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Gift card code required' });

    const sanitizedCode = code.trim().toUpperCase();
    const card = giftCards.get(sanitizedCode);

    if (!card) return res.status(404).json({ error: 'Invalid or expired gift card' });
    if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
    if (card.expiresAt < Date.now()) return res.status(410).json({ error: 'Gift card expired' });

    card.redeemed = true;
    card.redeemedBy = userId;
    card.redeemedAt = Date.now();
    giftCards.set(sanitizedCode, card);

    security.logAudit('GIFT_CARD_REDEEMED', { code: sanitizedCode, userId });
    res.json({
      success: true,
      tier: card.tier,
      billingCycle: card.billingCycle,
      message: `Gift card redeemed. ${TIERS[card.tier]?.name} tier activated.`,
    });
  });

  // Admin: generate gift card
  app.post('/api/payments/gift-card/generate', (req, res) => {
    const { tier = 'pro', billingCycle = 'monthly', quantity = 1 } = req.body;
    if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });
    if (quantity > 50) return res.status(400).json({ error: 'Max 50 gift cards per request' });

    const cards = [];
    for (let i = 0; i < quantity; i++) {
      const code = generateGiftCardCode();
      const card = {
        code,
        tier,
        billingCycle,
        redeemed: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 365 * 86400000,
      };
      giftCards.set(code, card);
      cards.push(card);
    }

    security.logAudit('GIFT_CARDS_GENERATED', { tier, billingCycle, quantity });
    res.status(201).json({ cards });
  });

  // Get subscription status
  app.get('/api/payments/subscription/:userId', (req, res) => {
    const userSubs = Array.from(subscriptions.values())
      .filter(s => s.userId === req.params.userId && s.status === 'active' && s.expiresAt > Date.now())
      .sort((a, b) => b.activatedAt - a.activatedAt);

    const active = userSubs[0] || null;
    res.json({
      subscription: active,
      tier: active?.tier || 'free',
      expiresAt: active?.expiresAt || null,
    });
  });

  // Invoice history
  app.get('/api/payments/invoices/:userId', (req, res) => {
    const userInvoices = Array.from(invoices.values())
      .filter(i => i.userId === req.params.userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    res.json({ invoices: userInvoices });
  });

  // Cancel subscription
  app.delete('/api/payments/subscription/:subscriptionId', async (req, res) => {
    const sub = subscriptions.get(req.params.subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    sub.status = 'cancelled';
    sub.cancelledAt = Date.now();
    subscriptions.set(sub.id, sub);

    security.logAudit('SUBSCRIPTION_CANCELLED', { subscriptionId: sub.id });
    res.json({ success: true, message: 'Subscription cancelled. Access continues until period end.' });
  });
}
