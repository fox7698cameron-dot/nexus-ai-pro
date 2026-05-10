// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';
import { authenticate } from './middleware.js';
import { db } from './database.js';

const router = Router();

const PLANS = {
  free: { price: 0, name: 'Free', features: ['5 AI requests/day', '1 model', 'Basic support'] },
  pro: { price: 999, name: 'Pro', features: ['Unlimited requests', '10+ models', 'Priority support', 'Analytics'] },
  enterprise: { price: 1499, name: 'Enterprise', features: ['Unlimited requests', 'All models', '24/7 support', 'Analytics', 'Custom integrations'] },
};

const CRYPTO_ADDRESSES = {
  BTC: process.env.CRYPTO_BTC_ADDRESS,
  ETH: process.env.CRYPTO_ETH_ADDRESS,
  USDC: process.env.CRYPTO_USDC_ADDRESS,
  USDT: process.env.CRYPTO_USDT_ADDRESS,
};

const CRYPTO_RATES_USD = {
  BTC: Number(process.env.CRYPTO_RATE_USD_PER_BTC) || 50000,
  ETH: Number(process.env.CRYPTO_RATE_USD_PER_ETH) || 2500,
  USDC: 1,
  USDT: 1,
};

async function loadStripe() {
  const mod = await import('stripe');
  const Stripe = mod.default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function respond(res, code, data) {
  return res.status(code).json(data);
}

const createIntentSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  currency: z.string().length(3).default('usd'),
});

const cryptoInitSchema = z.object({
  coin: z.enum(['BTC', 'ETH', 'USDC', 'USDT']),
  plan: z.enum(['pro', 'enterprise']),
});

const cryptoVerifySchema = z.object({
  paymentId: z.string().min(1),
});

const giftRedeemSchema = z.object({
  code: z.string().min(4).max(32).regex(/^[A-Z0-9-]+$/),
});

// Public routes (no auth)

router.get('/payments/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({ id, ...p }));
  respond(res, 200, { plans });
});

router.post('/payments/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const stripe = await loadStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const handlers = {
    'payment_intent.succeeded': handlePaymentSucceeded,
    'customer.subscription.created': handleSubscriptionChange,
    'customer.subscription.updated': handleSubscriptionChange,
    'customer.subscription.deleted': handleSubscriptionDeleted,
  };

  const handler = handlers[event.type];
  if (handler) await handler(event.data.object);

  res.json({ received: true });
});

// Authenticated routes

router.use(authenticate);

router.post('/payments/create-intent', async (req, res) => {
  const parsed = createIntentSchema.safeParse(req.body);
  if (!parsed.success) return respond(res, 400, { error: parsed.error.flatten() });

  const { plan, currency } = parsed.data;
  const amount = PLANS[plan].price;
  if (amount === 0) return respond(res, 400, { error: 'Free plan does not require payment' });

  try {
    const stripe = await loadStripe();
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { userId: req.user.id, plan },
    });
    respond(res, 200, { clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) {
    respond(res, 500, { error: 'Failed to create payment intent' });
  }
});

router.post('/payments/crypto/initiate', async (req, res) => {
  const parsed = cryptoInitSchema.safeParse(req.body);
  if (!parsed.success) return respond(res, 400, { error: parsed.error.flatten() });

  const { coin, plan } = parsed.data;
  const address = CRYPTO_ADDRESSES[coin];
  if (!address) return respond(res, 400, { error: `${coin} address not configured` });

  const usdAmount = PLANS[plan].price / 100;
  const rate = CRYPTO_RATES_USD[coin];
  const cryptoAmount = (usdAmount / rate).toFixed(8);

  const paymentId = `crypto_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const payload = {
    paymentId,
    userId: req.user.id,
    plan,
    coin,
    address,
    cryptoAmount,
    usdAmount,
    status: 'pending',
    createdAt: Date.now(),
  };

  await db.redis.set(`cryptopay:${paymentId}`, JSON.stringify(payload), 'EX', 3600);
  respond(res, 200, { paymentId, address, cryptoAmount, coin, usdAmount, expiresIn: 3600 });
});

router.post('/payments/crypto/verify', async (req, res) => {
  const parsed = cryptoVerifySchema.safeParse(req.body);
  if (!parsed.success) return respond(res, 400, { error: parsed.error.flatten() });

  const { paymentId } = parsed.data;
  const raw = await db.redis.get(`cryptopay:${paymentId}`);
  if (!raw) return respond(res, 404, { error: 'Payment not found or expired' });

  const payment = JSON.parse(raw);
  if (payment.userId !== req.user.id) return respond(res, 403, { error: 'Forbidden' });
  if (payment.status === 'confirmed') return respond(res, 200, { status: 'confirmed' });

  let confirmed = false;
  try {
    if (payment.coin === 'BTC') {
      confirmed = await checkBTC(payment.address, payment.cryptoAmount);
    } else {
      confirmed = await checkEVM(payment.address, payment.cryptoAmount, payment.coin);
    }
  } catch {
    return respond(res, 200, { status: 'pending', error: 'Could not reach blockchain API' });
  }

  if (confirmed) {
    payment.status = 'confirmed';
    await db.redis.set(`cryptopay:${paymentId}`, JSON.stringify(payment), 'EX', 3600 * 24);
    await db.redis.set(`user:${payment.userId}:tier`, payment.plan, 'EX', 60 * 60 * 24 * 32);
    await recordPayment(payment.userId, {
      type: 'crypto', coin: payment.coin, plan: payment.plan,
      status: 'confirmed', id: paymentId, ts: Date.now(),
    });
  }

  respond(res, 200, { status: payment.status });
});

router.post('/payments/gift/redeem', async (req, res) => {
  const parsed = giftRedeemSchema.safeParse(req.body);
  if (!parsed.success) return respond(res, 400, { error: parsed.error.flatten() });

  const { code } = parsed.data;
  const raw = await db.redis.get(`giftcard:${code}`);
  if (!raw) return respond(res, 404, { error: 'Gift card not found or already redeemed' });

  let card;
  try { card = JSON.parse(raw); } catch { return respond(res, 500, { error: 'Invalid gift card data' }); }

  if (card.redeemed) return respond(res, 409, { error: 'Gift card already redeemed' });
  if (card.expiresAt && Date.now() > card.expiresAt) return respond(res, 410, { error: 'Gift card expired' });

  card.redeemed = true;
  card.redeemedBy = req.user.id;
  card.redeemedAt = Date.now();
  await db.redis.set(`giftcard:${code}`, JSON.stringify(card));

  const creditKey = `user:${req.user.id}:credits`;
  const current = Number(await db.redis.get(creditKey) || 0);
  await db.redis.set(creditKey, current + card.amount);

  await recordPayment(req.user.id, {
    type: 'gift', code, amount: card.amount,
    status: 'redeemed', id: `gift_${code}`, ts: Date.now(),
  });

  respond(res, 200, { applied: card.amount, totalCredits: current + card.amount });
});

router.get('/payments/history', async (req, res) => {
  const userId = req.user.id;
  const keys = await db.redis.keys(`payments:${userId}:*`);
  const history = [];
  for (const key of keys) {
    const raw = await db.redis.get(key);
    if (raw) {
      try { history.push(JSON.parse(raw)); } catch { /* skip malformed */ }
    }
  }
  history.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  respond(res, 200, { history });
});

router.get('/payments/subscription', async (req, res) => {
  const userId = req.user.id;
  const [tier, credits] = await Promise.all([
    db.redis.get(`user:${userId}:tier`),
    db.redis.get(`user:${userId}:credits`),
  ]);
  const plan = tier || 'free';
  respond(res, 200, {
    plan,
    details: PLANS[plan] || PLANS.free,
    credits: Number(credits || 0),
  });
});

// Helpers

async function handlePaymentSucceeded(intent) {
  const { userId, plan } = intent.metadata || {};
  if (!userId || !plan) return;
  await db.redis.set(`user:${userId}:tier`, plan, 'EX', 60 * 60 * 24 * 32);
  await recordPayment(userId, { type: 'stripe', plan, amount: intent.amount, status: 'succeeded', id: intent.id, ts: Date.now() });
}

async function handleSubscriptionChange(sub) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const plan = sub.items?.data?.[0]?.price?.nickname?.toLowerCase() || 'pro';
  await db.redis.set(`user:${userId}:tier`, plan, 'EX', 60 * 60 * 24 * 35);
}

async function handleSubscriptionDeleted(sub) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await db.redis.set(`user:${userId}:tier`, 'free');
}

async function recordPayment(userId, data) {
  const key = `payments:${userId}:${data.id || Date.now()}`;
  await db.redis.set(key, JSON.stringify(data), 'EX', 60 * 60 * 24 * 365);
}

async function checkBTC(address, expectedAmount) {
  const url = `https://api.blockchair.com/bitcoin/dashboards/address/${address}`;
  const resp = await fetch(url, { timeout: 8000 });
  if (!resp.ok) return false;
  const json = await resp.json();
  const data = json?.data?.[address];
  if (!data) return false;
  const received = (data.address?.received || 0) / 1e8;
  return received >= parseFloat(expectedAmount);
}

async function checkEVM(address, expectedAmount, coin) {
  const apiKey = process.env.ETHERSCAN_API_KEY || '';
  const lowerAddr = address.toLowerCase();

  if (coin === 'ETH') {
    const url = `https://api.etherscan.io/api?module=account&action=balance&address=${lowerAddr}&tag=latest&apikey=${apiKey}`;
    const resp = await fetch(url, { timeout: 8000 });
    if (!resp.ok) return false;
    const json = await resp.json();
    const balanceWei = BigInt(json?.result || '0');
    const expectedWei = BigInt(Math.floor(parseFloat(expectedAmount) * 1e18));
    return balanceWei >= expectedWei;
  }

  const CONTRACTS = {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  };
  const contract = CONTRACTS[coin];
  const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contract}&address=${lowerAddr}&tag=latest&apikey=${apiKey}`;
  const resp = await fetch(url, { timeout: 8000 });
  if (!resp.ok) return false;
  const json = await resp.json();
  const balance = Number(json?.result || '0') / 1e6;
  return balance >= parseFloat(expectedAmount);
}

export default router;
