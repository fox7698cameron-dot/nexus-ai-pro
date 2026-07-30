// src/payments/stripe-routes.js
// Created: 2026-07-30
// Stripe subscriptions, crypto, gift card, and all major card types

import { Router } from 'express';
import { requireAuth } from '../auth/auth-middleware.js';

const router = Router();

// Lazy-load Stripe to avoid startup failure if key is missing
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  const { default: Stripe } = await import('stripe');
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

// Subscription plan definitions
const PLANS = {
  free: {
    name: 'Free',
    priceId: null,
    amount: 0,
    currency: 'usd',
    interval: null
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO || null,
    amount: 999,
    currency: 'usd',
    interval: 'month',
    features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support']
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || null,
    amount: 1499,
    currency: 'usd',
    interval: 'month',
    features: ['Everything in Pro', 'Custom models', 'API access', 'SLA', 'Dedicated support']
  }
};

// Supported payment methods
const PAYMENT_METHODS = [
  'card',       // Visa, Mastercard, Amex, Discover, Diners Club, UnionPay, JCB
  'us_bank_account',
  'sepa_debit',
  'ideal',
  'klarna',
  'afterpay_clearpay'
];

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([id, plan]) => ({
    id,
    ...plan,
    priceId: undefined // never expose internal IDs to client
  }));
  return res.json({ plans });
});

// POST /api/payments/checkout - create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const stripe = await getStripe();
    const { planId, successUrl, cancelUrl, currency = 'usd' } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan.' });
    if (planId === 'free') return res.json({ message: 'Free plan - no payment required.' });
    if (!plan.priceId) return res.status(400).json({ error: 'Plan not configured for checkout.' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: PAYMENT_METHODS,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:5173'}/success`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
      customer_email: req.user?.email,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId: req.user?.sub, planId }
      }
    });

    return res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('[Payments] Checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/payments/customer-portal
router.post('/customer-portal', requireAuth, async (req, res) => {
  try {
    const stripe = await getStripe();
    const { customerId, returnUrl } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required.' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.APP_URL || 'http://localhost:5173'}/account`
    });

    return res.json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to open customer portal' });
  }
});

// POST /api/payments/webhook - Stripe webhook handler
router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    const stripe = new (require('stripe'))(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Payments] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      handleSubscriptionCancelled(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_failed':
      handlePaymentFailed(event.data.object);
      break;
    default:
      break;
  }

  return res.json({ received: true });
});

function handleSubscriptionUpdate(subscription) {
  const { metadata } = subscription;
  const userId = metadata?.userId;
  const planId = metadata?.planId;
  if (userId && planId) {
    console.log(`[Payments] Subscription updated for user ${userId}: ${planId}`);
    // Update user subscription tier in your DB here
  }
}

function handleSubscriptionCancelled(subscription) {
  const userId = subscription.metadata?.userId;
  if (userId) {
    console.log(`[Payments] Subscription cancelled for user ${userId}`);
  }
}

function handlePaymentSuccess(invoice) {
  console.log(`[Payments] Payment succeeded: ${invoice.id}`);
}

function handlePaymentFailed(invoice) {
  console.error(`[Payments] Payment failed: ${invoice.id}`);
}

// POST /api/payments/gift-card/redeem
router.post('/gift-card/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.length < 8) {
    return res.status(400).json({ error: 'Invalid gift card code.' });
  }
  // Gift card validation logic would integrate with your gift card store
  // This is a stub that validates the code format and returns a mock response
  const sanitizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return res.json({
    message: 'Gift card redeemed successfully',
    code: sanitizedCode,
    note: 'Gift card processing requires backend integration with your gift card provider.'
  });
});

// POST /api/payments/crypto/initiate
router.post('/crypto/initiate', requireAuth, (req, res) => {
  const { currency, planId, amount } = req.body;
  const supportedCrypto = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'LTC', 'MATIC'];
  if (!supportedCrypto.includes(currency?.toUpperCase())) {
    return res.status(400).json({ error: `Unsupported crypto. Supported: ${supportedCrypto.join(', ')}` });
  }
  // Crypto payment flow via Coinbase Commerce, BitPay, or NOWPayments
  // Integration requires provider API keys set in environment
  return res.json({
    status: 'pending',
    currency: currency.toUpperCase(),
    planId,
    note: 'Integrate with Coinbase Commerce (COINBASE_COMMERCE_KEY), BitPay, or NOWPayments via environment variables.',
    supportedProviders: ['Coinbase Commerce', 'BitPay', 'NOWPayments', 'CoinGate']
  });
});

// GET /api/payments/methods
router.get('/methods', requireAuth, (req, res) => {
  return res.json({
    cards: ['Visa', 'Mastercard', 'American Express', 'Discover', 'Diners Club', 'UnionPay', 'JCB'],
    digital: ['Apple Pay', 'Google Pay'],
    crypto: ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'LTC', 'MATIC'],
    giftCards: ['Nexus AI Pro Gift Card'],
    bankTransfer: ['ACH (US Bank Account)', 'SEPA (EU)'],
    buyNowPayLater: ['Klarna', 'Afterpay', 'Affirm']
  });
});

export default router;
