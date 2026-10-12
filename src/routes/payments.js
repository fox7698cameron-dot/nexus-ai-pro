// Nexus AI Pro - Payment Routes | 2026-10-12
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

const PLANS = {
  basic: { id: 'basic', name: 'Basic', monthlyPrice: 9, annualPrice: 86, features: ['5 AI models', '100 requests/day', '1GB storage', 'Community support'] },
  pro: { id: 'pro', name: 'Pro', monthlyPrice: 29, annualPrice: 278, features: ['All AI models', 'Unlimited requests', '10GB storage', 'Priority support', 'Analytics dashboard', 'API access'] },
  enterprise: { id: 'enterprise', name: 'Enterprise', monthlyPrice: 99, annualPrice: 950, features: ['All Pro features', 'Unlimited storage', 'Dedicated support', 'SLA guarantee', 'Custom integrations', 'SSO/SAML', 'Audit logs', 'Admin console'] },
  custom: { id: 'custom', name: 'Custom', monthlyPrice: null, annualPrice: null, features: ['Contact sales for pricing'] },
};

const SUPPORTED_CURRENCIES = ['ETH', 'BTC', 'USDC', 'USDT', 'SOL'];

// In-memory subscription store (production: database)
const subscriptions = new Map();
const giftCards = new Map();
const cryptoAddresses = new Map();

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// GET /api/payments/plans/:planId
router.get('/plans/:planId', (req, res) => {
  const plan = PLANS[req.params.planId];
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

// POST /api/payments/create-checkout-session
// Creates a Stripe Checkout Session on the server - card details never touch our code
router.post('/create-checkout-session', async (req, res) => {
  const { planId, billing = 'monthly', userId, locale = 'en-US' } = req.body;
  if (!planId || !PLANS[planId]) return res.status(400).json({ error: 'Valid plan required' });
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return res.status(503).json({ error: 'Payment service not configured' });

  const plan = PLANS[planId];
  const amount = billing === 'annual' ? (plan.annualPrice || 0) * 100 : (plan.monthlyPrice || 0) * 100;

  if (amount === 0) {
    return res.status(400).json({ error: 'Custom plans require contacting sales' });
  }

  try {
    // Dynamically import stripe to avoid import errors when not configured
    const { default: Stripe } = await import('stripe').catch(() => ({ default: null }));
    if (!Stripe) return res.status(503).json({ error: 'Stripe module not available' });

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Nexus AI Pro - ${plan.name} (${billing})`, description: plan.features.join(', ') },
          unit_amount: amount,
          recurring: { interval: billing === 'annual' ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:3001'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3001'}/payment/cancel`,
      metadata: { userId, planId, billing },
      locale,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/payments/webhook - Stripe webhook (must use raw body)
router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) return res.status(503).json({ error: 'Webhook not configured' });

  // Production: verify stripe signature with raw body
  // const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    if (session?.metadata?.userId) {
      subscriptions.set(session.metadata.userId, {
        planId: session.metadata.planId,
        billing: session.metadata.billing,
        status: 'active',
        startedAt: new Date().toISOString(),
        stripeSubscriptionId: session.subscription,
      });
    }
  }

  res.json({ received: true });
});

// GET /api/payments/subscription/:userId
router.get('/subscription/:userId', (req, res) => {
  const sub = subscriptions.get(req.params.userId);
  if (!sub) return res.json({ subscription: null, plan: 'free' });
  res.json({ subscription: sub, plan: sub.planId });
});

// POST /api/payments/crypto-address - get crypto payment address
router.post('/crypto-address', (req, res) => {
  const { currency, userId, planId } = req.body;
  if (!currency || !SUPPORTED_CURRENCIES.includes(currency))
    return res.status(400).json({ error: `Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}` });

  // Production: generate a deposit address from your crypto payment processor
  // (e.g., Coinbase Commerce, NOWPayments, BitPay)
  const processorConfigured = !!process.env.CRYPTO_PROCESSOR_API_KEY;
  if (!processorConfigured) {
    return res.status(503).json({ error: 'Crypto payments not configured' });
  }

  const addressKey = `${currency}-${userId}-${planId}`;
  let entry = cryptoAddresses.get(addressKey);
  if (!entry || Date.now() > entry.expiresAt) {
    // In production: call crypto processor API to get a new address
    entry = {
      currency,
      address: `[CRYPTO_PROCESSOR_ADDRESS_${currency}]`,
      amount: PLANS[planId]?.monthlyPrice || 0,
      expiresAt: Date.now() + 30 * 60 * 1000,
      paymentId: crypto.randomUUID(),
    };
    cryptoAddresses.set(addressKey, entry);
  }

  res.json({
    currency,
    address: entry.address,
    amount: entry.amount,
    paymentId: entry.paymentId,
    expiresAt: new Date(entry.expiresAt).toISOString(),
    qrData: `${currency.toLowerCase()}:${entry.address}?amount=${entry.amount}`,
  });
});

// POST /api/payments/crypto-confirm - confirm crypto payment (webhook from processor)
router.post('/crypto-confirm', (req, res) => {
  const { paymentId, userId, planId, currency, amount, txHash } = req.body;

  const processorSig = req.headers['x-processor-signature'];
  const processorSecret = process.env.CRYPTO_PROCESSOR_WEBHOOK_SECRET;
  if (processorSecret && processorSig) {
    const expected = crypto.createHmac('sha256', processorSecret)
      .update(JSON.stringify(req.body)).digest('hex');
    if (processorSig !== expected) return res.status(401).json({ error: 'Invalid signature' });
  }

  if (userId) {
    subscriptions.set(userId, {
      planId: planId || 'pro',
      billing: 'monthly',
      status: 'active',
      paymentMethod: 'crypto',
      currency,
      txHash,
      startedAt: new Date().toISOString(),
    });

    if (router.io) router.io.emit(`payment:confirmed:${userId}`, { paymentId, planId });
  }

  res.json({ confirmed: true });
});

// POST /api/payments/redeem-gift-card
router.post('/redeem-gift-card', (req, res) => {
  const { code, userId } = req.body;
  if (!code || !userId) return res.status(400).json({ error: 'Code and userId required' });

  const normalized = code.trim().toUpperCase().replace(/[\s-]/g, '');
  if (normalized.length < 8) return res.status(400).json({ error: 'Invalid gift card code format' });

  const card = giftCards.get(normalized);
  if (!card) return res.status(404).json({ error: 'Gift card not found or already redeemed' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
  if (card.expiresAt && new Date(card.expiresAt) < new Date())
    return res.status(410).json({ error: 'Gift card expired' });

  giftCards.set(normalized, { ...card, redeemed: true, redeemedBy: userId, redeemedAt: new Date().toISOString() });

  subscriptions.set(userId, {
    planId: card.planId || 'pro',
    billing: 'monthly',
    status: 'active',
    paymentMethod: 'giftcard',
    startedAt: new Date().toISOString(),
    expiresAt: card.validForDays
      ? new Date(Date.now() + card.validForDays * 24 * 60 * 60 * 1000).toISOString()
      : null,
  });

  res.json({ redeemed: true, planId: card.planId, validDays: card.validForDays });
});

// POST /api/payments/issue-gift-card (admin only - in production check admin role)
router.post('/issue-gift-card', (req, res) => {
  const { planId = 'pro', validForDays = 30, expiresAt } = req.body;
  const code = crypto.randomBytes(8).toString('hex').toUpperCase();
  giftCards.set(code, { code, planId, validForDays, expiresAt: expiresAt || null, redeemed: false, issuedAt: new Date().toISOString() });
  res.json({ code, planId, validForDays });
});

// POST /api/payments/cancel-subscription
router.post('/cancel-subscription', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sub = subscriptions.get(userId);
  if (!sub) return res.status(404).json({ error: 'No active subscription' });

  subscriptions.set(userId, { ...sub, status: 'cancelled', cancelledAt: new Date().toISOString() });
  res.json({ cancelled: true, effectiveDate: sub.expiresAt || 'end of billing period' });
});

export { router as paymentsRouter };
