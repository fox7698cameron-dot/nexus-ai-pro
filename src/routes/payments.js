// src/routes/payments.js — Updated: 2026-07-25
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Subscription plans (prices in cents USD)
const PLANS = {
  free: { name: 'Free', monthlyPrice: 0, yearlyPrice: 0, features: ['5 chats/day', 'Basic models'] },
  pro: { name: 'Pro', monthlyPrice: 999, yearlyPrice: 9590, features: ['Unlimited chats', 'All models', '100MB uploads'] },
  enterprise: { name: 'Enterprise', monthlyPrice: 1499, yearlyPrice: 14390, features: ['Everything in Pro', 'API access', 'SLA guarantee'] }
};

// In-memory stores (use Stripe webhooks + DB in production)
const subscriptions = new Map();
const paymentHistory = new Map();
const giftCards = new Map([
  ['NEXUS-2026-DEMO', { value: 1000, currency: 'usd', redeemed: false }],
  ['NEXUS-TEST-1234', { value: 500, currency: 'usd', redeemed: false }]
]);
const cryptoInvoices = new Map();
const coupons = new Map([
  ['LAUNCH20', { discount: 20, type: 'percent', expiresAt: Date.now() + 86400000 * 90 }],
  ['SAVE10', { discount: 10, type: 'percent', expiresAt: Date.now() + 86400000 * 30 }]
]);

function getStripeKey() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY env var is required');
  return process.env.STRIPE_SECRET_KEY;
}

// GET /api/payments/config — return Stripe publishable key (never the secret key)
router.get('/config', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return res.status(503).json({ error: 'Payment system not configured' });
  res.json({ publishableKey, supportedMethods: ['card', 'apple_pay', 'google_pay', 'crypto', 'gift_card'] });
});

// GET /api/payments/plans — list available plans
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// POST /api/payments/subscribe — create or update subscription
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { planId, interval = 'monthly', paymentMethodId } = req.body;
    if (!PLANS[planId]) return res.status(400).json({ error: 'Invalid plan' });
    if (planId === 'free') {
      subscriptions.set(req.user.userId, { planId: 'free', status: 'active', interval: 'monthly', createdAt: Date.now() });
      return res.json({ subscription: { planId: 'free', status: 'active' } });
    }

    // Validate Stripe secret exists before calling Stripe
    getStripeKey();

    // In production: use Stripe SDK to create/update subscription
    // const stripe = new Stripe(getStripeKey(), { apiVersion: '2024-12-18.acacia' });
    // const customer = await stripe.customers.create({ email: req.user.email });
    // const subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: priceId }] });

    const subscription = {
      id: uuidv4(),
      userId: req.user.userId,
      planId,
      interval,
      status: 'active',
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (interval === 'yearly' ? 365 : 30) * 86400000,
      createdAt: Date.now()
    };
    subscriptions.set(req.user.userId, subscription);

    const historyEntry = { id: uuidv4(), type: 'subscription', planId, amount: interval === 'yearly' ? PLANS[planId].yearlyPrice : PLANS[planId].monthlyPrice, status: 'succeeded', createdAt: Date.now() };
    const userHistory = paymentHistory.get(req.user.userId) || [];
    userHistory.unshift(historyEntry);
    paymentHistory.set(req.user.userId, userHistory);

    res.json({ subscription, message: 'Subscription created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/subscribe — cancel subscription
router.delete('/subscribe', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.userId);
  if (!sub) return res.status(404).json({ error: 'No active subscription' });
  sub.status = 'cancelled';
  sub.cancelledAt = Date.now();
  res.json({ message: 'Subscription cancelled. Access continues until end of billing period.', subscription: sub });
});

// GET /api/payments/subscription — get current subscription
router.get('/subscription', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.user.userId) || { planId: 'free', status: 'active' };
  res.json({ subscription: sub, plan: PLANS[sub.planId] });
});

// GET /api/payments/history — payment history
router.get('/history', requireAuth, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const history = paymentHistory.get(req.user.userId) || [];
  const start = (page - 1) * limit;
  res.json({ history: history.slice(start, start + Number(limit)), total: history.length });
});

// POST /api/payments/giftcard/validate — validate a gift card code
router.post('/giftcard/validate', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Gift card code required' });
  const card = giftCards.get(code.toUpperCase().trim());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
  res.json({ valid: true, value: card.value, currency: card.currency });
});

// POST /api/payments/giftcard/redeem
router.post('/giftcard/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  const card = giftCards.get(code?.toUpperCase().trim());
  if (!card) return res.status(404).json({ error: 'Invalid gift card code' });
  if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });

  card.redeemed = true;
  card.redeemedBy = req.user.userId;
  card.redeemedAt = Date.now();

  const entry = { id: uuidv4(), type: 'gift_card', amount: card.value, currency: card.currency, status: 'succeeded', createdAt: Date.now() };
  const userHistory = paymentHistory.get(req.user.userId) || [];
  userHistory.unshift(entry);
  paymentHistory.set(req.user.userId, userHistory);

  res.json({ message: 'Gift card redeemed', creditApplied: card.value, currency: card.currency });
});

// POST /api/payments/coupon/validate
router.post('/coupon/validate', (req, res) => {
  const { code } = req.body;
  const coupon = coupons.get(code?.toUpperCase().trim());
  if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
  if (coupon.expiresAt < Date.now()) return res.status(410).json({ error: 'Coupon has expired' });
  res.json({ valid: true, discount: coupon.discount, type: coupon.type });
});

// POST /api/payments/crypto/create-invoice
router.post('/crypto/create-invoice', requireAuth, (req, res) => {
  const { planId, currency = 'BTC', interval = 'monthly' } = req.body;
  if (!PLANS[planId] || planId === 'free') return res.status(400).json({ error: 'Invalid plan for crypto payment' });

  const amountUSD = (interval === 'yearly' ? PLANS[planId].yearlyPrice : PLANS[planId].monthlyPrice) / 100;
  const invoiceId = uuidv4();

  // In production: integrate with BTCPay Server, Coinbase Commerce, or NOWPayments
  // Using environment-configured payment processor endpoint
  const invoice = {
    id: invoiceId,
    currency,
    amountUSD,
    status: 'pending',
    expiresAt: Date.now() + 3600000,
    // Wallet address comes from your crypto payment processor, not hardcoded here
    paymentAddress: process.env.CRYPTO_PAYMENT_ADDRESS || '(configure CRYPTO_PAYMENT_ADDRESS env var)',
    createdAt: Date.now()
  };

  cryptoInvoices.set(invoiceId, { ...invoice, userId: req.user.userId, planId });
  res.json({ invoice });
});

// GET /api/payments/crypto/invoice/:id — check invoice status
router.get('/crypto/invoice/:id', requireAuth, (req, res) => {
  const invoice = cryptoInvoices.get(req.params.id);
  if (!invoice || invoice.userId !== req.user.userId) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice: { id: invoice.id, currency: invoice.currency, amountUSD: invoice.amountUSD, status: invoice.status, expiresAt: invoice.expiresAt } });
});

// POST /api/payments/paypal/create — initiate PayPal payment
router.post('/paypal/create', requireAuth, (req, res) => {
  const { planId, interval = 'monthly' } = req.body;
  if (!PLANS[planId]) return res.status(400).json({ error: 'Invalid plan' });
  if (!process.env.PAYPAL_CLIENT_ID) return res.status(503).json({ error: 'PayPal not configured. Set PAYPAL_CLIENT_ID env var.' });

  // In production: use PayPal SDK to create an order/subscription
  const orderId = uuidv4();
  res.json({ orderId, redirectUrl: `/api/payments/paypal/return/${orderId}` });
});

// GET /api/payments/address/lookup — billing address autocomplete
router.get('/address/lookup', requireAuth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  // In production: proxy to a geocoding/address API using environment-configured keys
  res.json({ results: [], message: 'Configure ADDRESS_API_KEY env var for address autocomplete' });
});

// Stripe webhook endpoint — verify signature using STRIPE_WEBHOOK_SECRET env var
router.post('/webhook/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(503).json({ error: 'Webhook secret not configured' });

  // In production: use stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  // Handle: payment_intent.succeeded, customer.subscription.deleted, invoice.payment_failed
  res.json({ received: true });
});

export { router as paymentsRouter };
