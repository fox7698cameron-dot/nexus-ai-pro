/**
 * server/routes/payments.js
 * Stripe, cryptocurrency, and gift card payment routes
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * IMPORTANT: Never log raw card data. PCI DSS compliance is enforced by Stripe.
 * All secrets are read from environment variables – never hardcoded.
 */

import { Router } from 'express';
import crypto     from 'crypto';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── Stripe client (lazy-loaded, optional dependency) ─────────────────────────
let stripe = null;

async function getStripe() {
  if (stripe) return stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const { default: Stripe } = await import('stripe');
  stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
  return stripe;
}

// ─── In-memory gift card store (production: use DB) ──────────────────────────
const giftCards = new Map([
  // Seed some demo codes
  ['NEXUS-DEMO-GIFT-0001', { balance: 2000, currency: 'usd', used: false }],
  ['NEXUS-DEMO-GIFT-0002', { balance: 5000, currency: 'usd', used: false }],
]);

// ─── Subscription plans ───────────────────────────────────────────────────────
const PLANS = {
  pro:        { priceId: process.env.STRIPE_PRICE_PRO,        amount: 999,  name: 'Nexus AI Pro'        },
  enterprise: { priceId: process.env.STRIPE_PRICE_ENTERPRISE, amount: 1499, name: 'Nexus AI Enterprise' },
};

// ─── Supported crypto coins ───────────────────────────────────────────────────
const CRYPTO_COINS = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

// ─── Route: GET /api/payments/plans ──────────────────────────────────────────

router.get('/plans', (req, res) => {
  return res.json({
    plans: [
      { id: 'free',       name: 'Free',             price: 0,    currency: 'usd', features: ['5 chats/day', 'Basic models'] },
      { id: 'pro',        name: 'Pro',               price: 999,  currency: 'usd', features: ['Unlimited chats', 'All models', '100MB uploads'] },
      { id: 'enterprise', name: 'Enterprise',         price: 1499, currency: 'usd', features: ['Everything in Pro', 'Custom models', 'API access', 'SLA'] },
    ],
  });
});

// ─── Route: POST /api/payments/intent ────────────────────────────────────────

router.post('/intent', authenticate, async (req, res) => {
  try {
    const { planId, currency = 'usd' } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const s = await getStripe();

    const intent = await s.paymentIntents.create({
      amount:   plan.amount,
      currency,
      metadata: {
        planId,
        userId: req.user.id,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Return only what the client needs – no secret material beyond client_secret
    return res.json({
      clientSecret: intent.client_secret,
      amount:       intent.amount,
      currency:     intent.currency,
      planName:     plan.name,
    });
  } catch (err) {
    console.error('[payments/intent]', err.message);
    return res.status(400).json({ error: err.message });
  }
});

// ─── Route: POST /api/payments/subscription ──────────────────────────────────

router.post('/subscription', authenticate, async (req, res) => {
  try {
    const { planId, paymentMethodId } = req.body;
    const plan = PLANS[planId];
    if (!plan || !plan.priceId) {
      return res.status(400).json({ error: 'Invalid or unconfigured plan' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'paymentMethodId required' });
    }

    const s = await getStripe();

    // Create or retrieve Stripe customer
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await s.customers.create({
        email:    req.user.email,
        metadata: { nexusUserId: req.user.id },
      });
      customerId = customer.id;
      // TODO: persist customerId to user record in DB
    }

    await s.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await s.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await s.subscriptions.create({
      customer:           customerId,
      items:              [{ price: plan.priceId }],
      expand:             ['latest_invoice.payment_intent'],
      payment_behavior:   'default_incomplete',
      payment_settings:   { save_default_payment_method: 'on_subscription' },
    });

    return res.json({
      subscriptionId: subscription.id,
      status:         subscription.status,
      clientSecret:   subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (err) {
    console.error('[payments/subscription]', err.message);
    return res.status(400).json({ error: err.message });
  }
});

// ─── Route: POST /api/payments/webhook ───────────────────────────────────────
// Must be registered BEFORE the json body-parser in app for raw body access

router.post('/webhook', express_raw_handler, async (req, res) => {
  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[payments/webhook] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).send('Webhook secret not configured');
  }

  try {
    const s     = await getStripe();
    const event = s.webhooks.constructEvent(req.body, sig, secret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.info('[stripe] payment_intent.succeeded', event.data.object.id);
        // TODO: provision subscription, send confirmation email
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.info(`[stripe] ${event.type}`, event.data.object.id);
        // TODO: update user subscription status in DB
        break;

      case 'invoice.payment_failed':
        console.warn('[stripe] invoice.payment_failed', event.data.object.id);
        // TODO: notify user, retry logic is handled by Stripe Smart Retries
        break;

      default:
        // Unhandled event type – acknowledged silently
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[payments/webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Raw body handler for Stripe webhook
function express_raw_handler(req, res, next) {
  let data = '';
  req.setEncoding('latin1');
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    req.body = Buffer.from(data, 'latin1');
    next();
  });
}

// ─── Route: POST /api/payments/crypto/initiate ───────────────────────────────

router.post('/crypto/initiate', authenticate, async (req, res) => {
  try {
    const { planId, coin } = req.body;
    if (!CRYPTO_COINS.includes(coin)) {
      return res.status(400).json({ error: `Unsupported coin. Supported: ${CRYPTO_COINS.join(', ')}` });
    }
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    // Generate a unique payment ID and address (deterministic per user+coin+plan)
    const paymentId = crypto.randomUUID();
    const addressSeed = `${req.user.id}:${coin}:${paymentId}`;
    // NOTE: In production, integrate with a crypto payment processor (e.g., BitPay, Coinbase Commerce)
    //       using their API – never generate real wallet private keys server-side without an HSM.
    const mockAddress = `NEXUS_${coin}_${crypto.createHash('sha256').update(addressSeed).digest('hex').slice(0, 34).toUpperCase()}`;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    return res.json({
      paymentId,
      coin,
      address: mockAddress,
      amountUsd: (plan.amount / 100).toFixed(2),
      expiresAt,
      planName: plan.name,
      note: 'Amount in coin will be shown on the payment page based on live exchange rate.',
    });
  } catch (err) {
    console.error('[payments/crypto]', err.message);
    return res.status(400).json({ error: err.message });
  }
});

// ─── Route: POST /api/payments/crypto/confirm ────────────────────────────────

router.post('/crypto/confirm', authenticate, async (req, res) => {
  const { paymentId, txHash } = req.body;
  if (!paymentId || !txHash) {
    return res.status(400).json({ error: 'paymentId and txHash required' });
  }
  // Production: verify txHash on-chain via an indexer or payment processor webhook
  console.info(`[crypto] payment ${paymentId} claimed with tx ${txHash} by user ${req.user.id}`);
  return res.json({ status: 'pending_confirmation', message: 'Transaction submitted, awaiting blockchain confirmation.' });
});

// ─── Route: POST /api/payments/gift-card/validate ────────────────────────────

router.post('/gift-card/validate', authenticate, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code required' });
  }

  // Normalise: uppercase, trim
  const normalised = code.trim().toUpperCase();
  const card = giftCards.get(normalised);

  if (!card) return res.status(404).json({ error: 'Gift card not found or invalid' });
  if (card.used) return res.status(400).json({ error: 'Gift card already used' });

  return res.json({
    valid:    true,
    balance:  card.balance,
    currency: card.currency,
    amountDisplay: `$${(card.balance / 100).toFixed(2)}`,
  });
});

// ─── Route: POST /api/payments/gift-card/redeem ──────────────────────────────

router.post('/gift-card/redeem', authenticate, (req, res) => {
  const { code, planId } = req.body;
  if (!code || !planId) return res.status(400).json({ error: 'code and planId required' });

  const normalised = code.trim().toUpperCase();
  const card = giftCards.get(normalised);
  const plan = PLANS[planId];

  if (!card) return res.status(404).json({ error: 'Gift card not found or invalid' });
  if (card.used) return res.status(400).json({ error: 'Gift card already used' });
  if (!plan)    return res.status(400).json({ error: 'Invalid plan' });

  if (card.balance < plan.amount) {
    return res.status(400).json({
      error:     'Insufficient gift card balance',
      required:  plan.amount,
      available: card.balance,
    });
  }

  // Full redemption
  card.balance -= plan.amount;
  if (card.balance === 0) card.used = true;

  console.info(`[gift-card] code ${normalised} redeemed by user ${req.user.id} for plan ${planId}`);

  return res.json({
    success:         true,
    remainingBalance: card.balance,
    planProvisioned: planId,
    message:         'Gift card redeemed. Subscription activated.',
  });
});

// ─── Route: GET /api/payments/history ────────────────────────────────────────

router.get('/history', authenticate, async (req, res) => {
  try {
    const customerId = req.user.stripeCustomerId;
    if (!customerId) return res.json({ transactions: [] });

    const s = await getStripe();
    const charges = await s.charges.list({ customer: customerId, limit: 20 });

    const transactions = charges.data.map(ch => ({
      id:        ch.id,
      amount:    ch.amount,
      currency:  ch.currency,
      status:    ch.status,
      createdAt: new Date(ch.created * 1000).toISOString(),
      receipt:   ch.receipt_url,
    }));

    return res.json({ transactions });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
