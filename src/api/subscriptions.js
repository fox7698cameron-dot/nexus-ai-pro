// src/api/subscriptions.js
// Date: 2026-10-19
// Subscription API: Stripe, crypto, gift cards, plan management

import { v4 as uuidv4 } from 'uuid';

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'USD',
    features: ['5 chats/day', 'Basic models'],
    interval: null,
  },
  pro: {
    name: 'Pro',
    priceMonthly: 9.99,
    priceYearly: 89.99,
    currency: 'USD',
    features: ['Unlimited chats', 'All models', 'Priority support'],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || null,
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 49.99,
    priceYearly: 499.99,
    currency: 'USD',
    features: ['Everything in Pro', 'Custom integrations', 'SLA guarantee'],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || null,
  },
};

// In-memory stores — replace with database in production
const subscriptions = new Map();    // userId -> subscriptionRecord
const pendingPayments = new Map();  // referenceId -> paymentRecord
const redeemedGiftCards = new Set();

const GIFT_CARD_CODES = new Set(
  (process.env.GIFT_CARD_CODES || '').split(',').filter(Boolean)
);

const SUPPORTED_CRYPTO = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

// Lazy Stripe loader — never throws at startup, only fails at call time if unconfigured
let _stripe = null;
async function getStripe() {
  if (_stripe) return _stripe;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const { default: Stripe } = await import('stripe');
    _stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    return _stripe;
  } catch {
    return null;
  }
}

export function createSubscriptionRoutes(app, io, authenticateToken) {

  // GET /api/subscription/plans
  app.get('/api/subscription/plans', (req, res) => {
    res.json({ plans: PLANS, supportedCrypto: SUPPORTED_CRYPTO });
  });

  // GET /api/subscription/status
  app.get('/api/subscription/status', authenticateToken, (req, res) => {
    const sub = subscriptions.get(req.user.userId) || {
      plan: 'free',
      status: 'active',
      renewsAt: null,
      paymentMethod: null,
    };
    res.json({ subscription: sub });
  });

  // POST /api/subscription/checkout
  app.post('/api/subscription/checkout', authenticateToken, async (req, res) => {
    const { plan, interval = 'monthly', successUrl, cancelUrl } = req.body;

    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ error: 'Invalid plan for checkout' });
    }

    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({
        error: 'Payment processing not configured. Set STRIPE_SECRET_KEY environment variable.',
      });
    }

    try {
      const priceId = interval === 'yearly'
        ? PLANS[plan].stripePriceIdYearly
        : PLANS[plan].stripePriceIdMonthly;

      if (!priceId) {
        return res.status(503).json({ error: `Stripe price ID not configured for ${plan}/${interval}` });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3001'}/subscription/success`,
        cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3001'}/subscription/cancel`,
        metadata: { userId: req.user.userId, plan, interval },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // POST /api/subscription/webhook
  app.post('/api/subscription/webhook', async (req, res) => {
    const stripe = await getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = webhookSecret
        ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
        : JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, plan, interval } = session.metadata || {};
        if (userId && plan) {
          subscriptions.set(userId, {
            plan,
            interval,
            status: 'active',
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            activatedAt: new Date().toISOString(),
            renewsAt: null,
          });
          io?.emit?.('subscription:updated', { userId, plan });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        for (const [uid, record] of subscriptions.entries()) {
          if (record.stripeSubscriptionId === sub.id) {
            subscriptions.set(uid, { ...record, plan: 'free', status: 'cancelled' });
            break;
          }
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  });

  // POST /api/subscription/crypto/checkout
  app.post('/api/subscription/crypto/checkout', authenticateToken, (req, res) => {
    const { plan, currency, interval = 'monthly' } = req.body;

    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!SUPPORTED_CRYPTO.includes(currency?.toUpperCase())) {
      return res.status(400).json({ error: `Unsupported currency. Supported: ${SUPPORTED_CRYPTO.join(', ')}` });
    }

    const priceUSD = interval === 'yearly'
      ? PLANS[plan].priceYearly
      : PLANS[plan].priceMonthly;

    const referenceId = uuidv4();

    // Wallet addresses must be configured via environment variables — never hardcoded
    const wallets = {
      BTC: process.env.WALLET_BTC,
      ETH: process.env.WALLET_ETH,
      USDC: process.env.WALLET_USDC,
      USDT: process.env.WALLET_USDT,
      SOL: process.env.WALLET_SOL,
    };

    const walletAddress = wallets[currency.toUpperCase()];
    if (!walletAddress) {
      return res.status(503).json({ error: `${currency} wallet not configured` });
    }

    pendingPayments.set(referenceId, {
      referenceId,
      userId: req.user.userId,
      plan,
      interval,
      currency: currency.toUpperCase(),
      amountUSD: priceUSD,
      walletAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    });

    res.json({
      referenceId,
      walletAddress,
      currency: currency.toUpperCase(),
      amountUSD: priceUSD,
      expiresAt: pendingPayments.get(referenceId).expiresAt,
      memo: `NEXUS-${referenceId.slice(0, 8).toUpperCase()}`,
    });
  });

  // GET /api/subscription/crypto/status/:referenceId
  app.get('/api/subscription/crypto/status/:referenceId', authenticateToken, (req, res) => {
    const payment = pendingPayments.get(req.params.referenceId);
    if (!payment || payment.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ payment });
  });

  // POST /api/subscription/giftcard/redeem
  app.post('/api/subscription/giftcard/redeem', authenticateToken, (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Gift card code required' });
    }

    const normalizedCode = code.trim().toUpperCase();

    if (redeemedGiftCards.has(normalizedCode)) {
      return res.status(409).json({ error: 'Gift card already redeemed' });
    }

    if (!GIFT_CARD_CODES.has(normalizedCode)) {
      return res.status(404).json({ error: 'Invalid gift card code' });
    }

    redeemedGiftCards.add(normalizedCode);

    subscriptions.set(req.user.userId, {
      plan: 'pro',
      interval: 'monthly',
      status: 'active',
      paymentMethod: 'giftcard',
      activatedAt: new Date().toISOString(),
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    io?.emit?.('subscription:updated', { userId: req.user.userId, plan: 'pro' });

    res.json({ success: true, plan: 'pro', message: 'Gift card redeemed. Pro plan activated for 30 days.' });
  });

  // GET /api/subscription/billing-history
  app.get('/api/subscription/billing-history', authenticateToken, async (req, res) => {
    const stripe = await getStripe();
    const sub = subscriptions.get(req.user.userId);

    if (!stripe || !sub?.stripeCustomerId) {
      return res.json({ history: [] });
    }

    try {
      const invoices = await stripe.invoices.list({ customer: sub.stripeCustomerId, limit: 24 });
      const history = invoices.data.map(inv => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.amount_paid / 100,
        currency: inv.currency.toUpperCase(),
        status: inv.status,
        pdf: inv.invoice_pdf,
      }));
      res.json({ history });
    } catch {
      res.json({ history: [] });
    }
  });

  // POST /api/subscription/cancel
  app.post('/api/subscription/cancel', authenticateToken, async (req, res) => {
    const sub = subscriptions.get(req.user.userId);
    if (!sub || sub.plan === 'free') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    const stripe = await getStripe();
    if (stripe && sub.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
      } catch {
        // Log but don't block the response
      }
    }

    subscriptions.set(req.user.userId, { ...sub, status: 'cancelling' });
    res.json({ success: true, message: 'Subscription will cancel at period end.' });
  });
}
