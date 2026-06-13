// ================================================
// NEXUS AI PRO - Subscriptions & Payments API
// Updated: 2026-06-13
// ------------------------------------------------
// Stripe: Visa, MC, Amex, Discover, JCB, UnionPay
//         ACH, SEPA, Apple Pay, Google Pay
// Crypto: via Coinbase Commerce webhooks
// Gift cards: server-side balance codes
// ================================================

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

// ── Tier configuration ────────────────────────────
const TIERS = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: ['5 chats/day','Basic models','1 MB uploads'],
    modelTier: 'mini',
    limits: { chatsPerDay: 5, fileUploadMb: 1, apiCalls: 100 },
  },
  pro: {
    name: 'Pro',
    priceMonthly: 999,  // cents
    priceYearly: 9990,
    currency: 'usd',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: ['Unlimited chats','All models','100 MB uploads','Priority support'],
    modelTier: 'mid',
    limits: { chatsPerDay: -1, fileUploadMb: 100, apiCalls: 10000 },
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 1499,
    priceYearly: 14990,
    currency: 'usd',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENT_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ENT_YEARLY,
    features: ['Everything in Pro','Custom models','API access','SLA','Dedicated support'],
    modelTier: 'enterprise',
    limits: { chatsPerDay: -1, fileUploadMb: 5000, apiCalls: -1 },
  },
};

// In-memory stores (replace with DB in production)
const subscriptionStore = new Map(); // userId -> subscription
const giftCardStore     = new Map(); // code -> giftCard
const paymentStore      = new Map(); // paymentId -> payment

// ── Stripe lazy loader ────────────────────────────
let _stripe = null;
let _stripeLoading = false;

async function getStripe() {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (_stripeLoading) return null; // prevent concurrent init
  _stripeLoading = true;
  try {
    const { default: Stripe } = await import('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  } catch {
    _stripe = null;
  }
  _stripeLoading = false;
  return _stripe;
}

// ── Routes ────────────────────────────────────────

// GET /api/subscriptions/tiers
router.get('/tiers', (req, res) => {
  const tiers = Object.entries(TIERS).map(([id, tier]) => ({ id, ...tier }));
  res.json({ tiers });
});

// GET /api/subscriptions/current
router.get('/current', requireAuth, (req, res) => {
  const sub = subscriptionStore.get(req.user.sub) || {
    tier: 'free',
    status: 'active',
    paymentMethod: null,
    currentPeriodEnd: null,
  };
  res.json({ subscription: sub, tierDetails: TIERS[sub.tier] || TIERS.free });
});

// POST /api/subscriptions/create-payment-intent  — card/one-time
router.post('/create-payment-intent', requireAuth, async (req, res) => {
  const { tier, interval = 'monthly', paymentMethod = 'card' } = req.body;

  if (!TIERS[tier] || tier === 'free') {
    return res.status(400).json({ error: 'Invalid tier for payment' });
  }

  const amount = interval === 'yearly' ? TIERS[tier].priceYearly : TIERS[tier].priceMonthly;

  if (paymentMethod === 'card') {
    const stripe = getStripe();
    if (!stripe) {
      // Demo mode: return a mock client secret
      return res.json({
        clientSecret: `pi_demo_${uuidv4().replace(/-/g,'')}`,
        paymentIntentId: `pi_demo_${uuidv4()}`,
        amount,
        currency: 'usd',
        demo: true,
      });
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: { userId: req.user.sub, tier, interval },
        automatic_payment_methods: { enabled: true },
      });
      return res.json({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount,
        currency: 'usd',
      });
    } catch (err) {
      return res.status(500).json({ error: 'Payment initialization failed' });
    }
  }

  if (paymentMethod === 'crypto') {
    // Coinbase Commerce: create a charge
    const chargePayload = {
      id: uuidv4(),
      amount,
      currency: 'usd',
      tier,
      userId: req.user.sub,
      interval,
      type: 'crypto',
      status: 'pending',
      createdAt: new Date().toISOString(),
      // In production: call Coinbase Commerce API here
      cryptoAddresses: {
        bitcoin:   process.env.BTC_ADDRESS  || 'DEMO_BTC_ADDRESS',
        ethereum:  process.env.ETH_ADDRESS  || 'DEMO_ETH_ADDRESS',
        usdc:      process.env.USDC_ADDRESS || 'DEMO_USDC_ADDRESS',
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    paymentStore.set(chargePayload.id, chargePayload);
    return res.json({ charge: chargePayload });
  }

  res.status(400).json({ error: `Unsupported payment method: ${paymentMethod}` });
});

// POST /api/subscriptions/create-subscription  — recurring card
router.post('/create-subscription', requireAuth, async (req, res) => {
  const { tier, interval = 'monthly', paymentMethodId } = req.body;

  if (!TIERS[tier] || tier === 'free') {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  const priceId = interval === 'yearly'
    ? TIERS[tier].stripePriceIdYearly
    : TIERS[tier].stripePriceIdMonthly;

  if (!priceId) {
    // Demo mode
    const sub = {
      id: uuidv4(),
      userId: req.user.sub,
      tier,
      status: 'active',
      paymentMethod: 'card',
      interval,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 86400000).toISOString(),
      demo: true,
    };
    subscriptionStore.set(req.user.sub, sub);
    return res.json({ subscription: sub });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const customer = await stripe.customers.create({
      metadata: { userId: req.user.sub },
    });

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: req.user.sub, tier },
    });

    const sub = {
      id: uuidv4(),
      userId: req.user.sub,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
      tier,
      status: subscription.status,
      paymentMethod: 'card',
      interval,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    };
    subscriptionStore.set(req.user.sub, sub);
    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ error: 'Subscription creation failed' });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  const sub = subscriptionStore.get(req.user.sub);
  if (!sub) return res.status(404).json({ error: 'No active subscription' });

  if (sub.stripeSubscriptionId) {
    const stripe = getStripe();
    if (stripe) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  sub.cancelAtPeriodEnd = true;
  sub.status = 'canceling';
  subscriptionStore.set(req.user.sub, sub);

  res.json({ subscription: sub });
});

// GET /api/subscriptions/invoice-preview
router.get('/invoice-preview', requireAuth, (req, res) => {
  const { tier, interval = 'monthly' } = req.query;
  const tierData = TIERS[tier];
  if (!tierData) return res.status(400).json({ error: 'Invalid tier' });

  const amount = interval === 'yearly' ? tierData.priceYearly : tierData.priceMonthly;
  const tax = Math.round(amount * 0.08); // 8% tax estimate
  res.json({
    subtotal: amount,
    tax,
    total: amount + tax,
    currency: 'usd',
    tier,
    interval,
  });
});

// ── Gift Cards ────────────────────────────────────

// POST /api/subscriptions/gift-cards/generate  — admin only
router.post('/gift-cards/generate', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { amountCents = 999, count = 1 } = req.body;

  const cards = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g).join('-');
    const card = {
      id: uuidv4(),
      code,
      amountCents,
      currency: 'usd',
      redeemedBy: null,
      redeemedAt: null,
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    giftCardStore.set(code, card);
    cards.push(card);
  }

  res.status(201).json({ giftCards: cards });
});

// POST /api/subscriptions/gift-cards/redeem
router.post('/gift-cards/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });

  const card = giftCardStore.get(code.toUpperCase().replace(/\s/g, ''));
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.redeemedBy) return res.status(409).json({ error: 'Gift card already redeemed' });
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Gift card expired' });
  }

  card.redeemedBy = req.user.sub;
  card.redeemedAt = new Date().toISOString();
  giftCardStore.set(card.code, card);

  // Determine which tier the amount covers
  let targetTier = 'free';
  if (card.amountCents >= TIERS.enterprise.priceMonthly) targetTier = 'enterprise';
  else if (card.amountCents >= TIERS.pro.priceMonthly)   targetTier = 'pro';

  const sub = {
    id: uuidv4(),
    userId: req.user.sub,
    tier: targetTier,
    status: 'active',
    paymentMethod: 'gift_card',
    giftCardCode: code,
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
  subscriptionStore.set(req.user.sub, sub);

  res.json({ subscription: sub, amountApplied: card.amountCents });
});

// GET /api/subscriptions/gift-cards/balance/:code
router.get('/gift-cards/balance/:code', (req, res) => {
  const card = giftCardStore.get(req.params.code.toUpperCase());
  if (!card) return res.status(404).json({ error: 'Gift card not found' });
  res.json({
    code: card.code,
    balance: card.redeemedBy ? 0 : card.amountCents,
    currency: card.currency,
    expiresAt: card.expiresAt,
    redeemed: !!card.redeemedBy,
  });
});

// POST /api/subscriptions/webhook  — Stripe & Coinbase webhooks
router.post('/webhook', async (req, res) => {
  const sig  = req.headers['stripe-signature'];
  const body = req.rawBody || JSON.stringify(req.body);

  // Stripe
  if (sig && process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      const stripe = getStripe();
      const event  = stripe
        ? stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
        : JSON.parse(body);

      switch (event.type) {
        case 'customer.subscription.updated': {
          const s = event.data.object;
          const userId = s.metadata?.userId;
          if (userId) {
            const sub = subscriptionStore.get(userId) || {};
            sub.status = s.status;
            sub.currentPeriodEnd = new Date(s.current_period_end * 1000).toISOString();
            subscriptionStore.set(userId, sub);
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const s = event.data.object;
          const userId = s.metadata?.userId;
          if (userId) {
            const sub = subscriptionStore.get(userId) || {};
            sub.status = 'cancelled';
            sub.tier   = 'free';
            subscriptionStore.set(userId, sub);
          }
          break;
        }
      }

      return res.json({ received: true });
    } catch (err) {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  }

  // Coinbase Commerce
  const cbSig = req.headers['x-cc-webhook-signature'];
  if (cbSig && process.env.COINBASE_COMMERCE_WEBHOOK_SECRET) {
    const expected = crypto
      .createHmac('sha256', process.env.COINBASE_COMMERCE_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(cbSig), Buffer.from(expected))) {
      return res.status(400).json({ error: 'Invalid Coinbase webhook signature' });
    }

    const event = JSON.parse(body);
    if (event.event?.type === 'charge:confirmed') {
      const { userId, tier } = event.event.data?.metadata || {};
      if (userId && tier && TIERS[tier]) {
        const sub = {
          id: uuidv4(),
          userId,
          tier,
          status: 'active',
          paymentMethod: 'crypto',
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
        subscriptionStore.set(userId, sub);
      }
    }
    return res.json({ received: true });
  }

  res.json({ received: true });
});

export { TIERS };
export default router;
