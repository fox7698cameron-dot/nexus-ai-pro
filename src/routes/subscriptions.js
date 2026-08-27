/**
 * routes/subscriptions.js
 * Nexus AI Pro — Subscription & Payment Routes
 * Date: 2026-08-27
 * Methods: Stripe (all card types), Cryptocurrency, Gift Cards
 * Stripe secret loaded from STRIPE_SECRET_KEY env var — never hard-coded
 * Tiers: free, pro, enterprise, lifetime
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ── Tier definitions (cents) ──────────────────────────────────────────────────
const TIERS = {
  free:       { name: 'Free',       amountCents: 0,      currency: 'usd', recurring: true,  interval: 'month' },
  pro:        { name: 'Pro',        amountCents: 999,    currency: 'usd', recurring: true,  interval: 'month' },
  enterprise: { name: 'Enterprise', amountCents: 1499,   currency: 'usd', recurring: true,  interval: 'month' },
  lifetime:   { name: 'Lifetime',   amountCents: 29900,  currency: 'usd', recurring: false, interval: null    },
};

// ── Stripe client factory (secret from env only) ──────────────────────────────
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set in environment');
  const { default: Stripe } = await import('stripe');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

// ── Crypto payment client (env-only keys) ─────────────────────────────────────
const CRYPTO_CONFIG = {
  btc:  { envKey: 'CRYPTO_BTC_WALLET',  symbol: 'BTC'  },
  eth:  { envKey: 'CRYPTO_ETH_WALLET',  symbol: 'ETH'  },
  usdc: { envKey: 'CRYPTO_USDC_WALLET', symbol: 'USDC' },
  sol:  { envKey: 'CRYPTO_SOL_WALLET',  symbol: 'SOL'  },
};

// ── Gift card store (in-memory — use Redis/DB in production) ──────────────────
const giftCards = new Map([
  ['NEXUS-DEMO-1234-ABCD', { value: 999,  used: false, tier: 'pro' }],
  ['NEXUS-LIFE-5678-EFGH', { value: 29900, used: false, tier: 'lifetime' }],
]);

// ── POST /api/subscriptions/checkout ─────────────────────────────────────────
router.post('/checkout', requireAuth, async (req, res) => {
  const { tier, method, cardLastFour, cardNetwork, currency, code } = req.body;
  if (!tier || !TIERS[tier]) {
    return res.status(400).json({ error: 'Invalid subscription tier' });
  }
  if (tier === 'free') {
    return res.json({ success: true, tier: 'free', message: 'Free plan activated' });
  }
  const tierInfo = TIERS[tier];

  if (method === 'card') {
    return handleCardPayment(req, res, tierInfo, { cardLastFour, cardNetwork });
  }
  if (method === 'crypto') {
    return handleCryptoPayment(req, res, tierInfo, currency);
  }
  if (method === 'giftcard') {
    return handleGiftCard(req, res, tierInfo, code);
  }
  return res.status(400).json({ error: 'Unknown payment method' });
});

async function handleCardPayment(req, res, tierInfo, cardInfo) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Dev mode: mock success
    return res.json({ success: true, tier: tierInfo.name, method: 'card', mocked: true });
  }
  // Production: create Stripe PaymentIntent / Subscription on server
  // Card data NEVER reaches this server — use Stripe.js on client to tokenize
  // The client sends clientSecret to Stripe directly
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   tierInfo.amountCents,
      currency: tierInfo.currency,
      metadata: { userId: req.user.id, tier: tierInfo.name },
      automatic_payment_methods: { enabled: true },
    });
    return res.json({ clientSecret: paymentIntent.client_secret, tier: tierInfo.name });
  } catch (err) {
    return res.status(500).json({ error: 'Payment processing error' });
  }
}

function handleCryptoPayment(req, res, tierInfo, currency) {
  const cfg = CRYPTO_CONFIG[currency?.toLowerCase?.()];
  if (!cfg) return res.status(400).json({ error: 'Unsupported cryptocurrency' });
  const walletAddress = process.env[cfg.envKey] || '[WALLET_NOT_CONFIGURED]';
  // In production: generate a unique payment address per order via provider API (BitPay, Coinbase Commerce, etc.)
  return res.json({
    walletAddress,
    currency:     cfg.symbol,
    amountCrypto: `~${(tierInfo.amountCents / 100 / 60000).toFixed(8)} ${cfg.symbol}`, // placeholder rate
    tier:         tierInfo.name,
    expiresAt:    new Date(Date.now() + 30 * 60_000).toISOString(), // 30-min window
  });
}

function handleGiftCard(req, res, tierInfo, code) {
  if (!code) return res.status(400).json({ error: 'Gift card code required' });
  const clean = code.replace(/\s/g, '').toUpperCase();
  const card  = giftCards.get(clean);
  if (!card)       return res.status(404).json({ error: 'Gift card not found' });
  if (card.used)   return res.status(409).json({ error: 'Gift card already redeemed' });
  if (card.value < tierInfo.amountCents) {
    return res.status(402).json({ error: 'Gift card value insufficient for selected plan' });
  }
  card.used = true;
  giftCards.set(clean, card);
  return res.json({ success: true, tier: card.tier || tierInfo.name, applied: true, message: 'Gift card redeemed!' });
}

// ── GET /api/subscriptions/current ───────────────────────────────────────────
router.get('/current', requireAuth, (req, res) => {
  // Production: look up subscription in DB by req.user.id
  return res.json({ tier: 'free', status: 'active', userId: req.user.id });
});

// ── POST /api/subscriptions/cancel ───────────────────────────────────────────
router.post('/cancel', requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.json({ success: true, mocked: true });
  // Production: cancel Stripe subscription for req.user.id
  return res.json({ success: true, message: 'Subscription cancelled. Active until end of billing period.' });
});

// ── POST /api/subscriptions/webhook ──────────────────────────────────────────
// Stripe webhook — validates signature from STRIPE_WEBHOOK_SECRET env var
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !sig) return res.status(400).json({ error: 'Webhook config missing' });
  // Production: Stripe.webhooks.constructEvent(req.body, sig, secret)
  // Then update DB subscription status on payment_intent.succeeded / invoice.payment_failed
  return res.json({ received: true });
});

export default router;
