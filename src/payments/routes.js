// src/payments/routes.js
// 2026-06-12 | Payment routes: Stripe (cards, crypto, gift cards), subscription management
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../auth/middleware.js';

const PLANS = Object.freeze({
  free: { id: 'free', name: 'Free', priceUsd: 0, interval: null },
  pro: { id: 'pro', name: 'Pro', priceUsd: 999, interval: 'month', stripePriceId: process.env.STRIPE_PRICE_PRO },
  enterprise: { id: 'enterprise', name: 'Enterprise', priceUsd: 1499, interval: 'month', stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE }
});

const CRYPTO_CURRENCIES = Object.freeze(['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'LTC', 'MATIC']);

const CheckoutSchema = z.object({
  planId: z.enum(['pro', 'enterprise']),
  method: z.enum(['card', 'crypto', 'gift_card']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

const GiftCardSchema = z.object({
  code: z.string().min(8).max(64).regex(/^[A-Z0-9\-]+$/, 'Invalid gift card format')
});

const CryptoPaySchema = z.object({
  planId: z.enum(['pro', 'enterprise']),
  currency: z.enum(CRYPTO_CURRENCIES)
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe not configured');
  const Stripe = require('stripe');
  return Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

export function createPaymentsRouter(subscriptionStore) {
  const router = Router();

  // GET /api/payments/plans
  router.get('/plans', (_req, res) => {
    res.json({ plans: Object.values(PLANS) });
  });

  // GET /api/payments/subscription
  router.get('/subscription', authMiddleware, (req, res) => {
    const sub = subscriptionStore.get(req.user.sub) || { planId: 'free', status: 'active' };
    res.json(sub);
  });

  // POST /api/payments/checkout - Create Stripe checkout session
  router.post('/checkout', authMiddleware, async (req, res) => {
    const parsed = CheckoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { planId, method, successUrl, cancelUrl } = parsed.data;
    const plan = PLANS[planId];

    if (method === 'gift_card') {
      return res.json({ checkoutType: 'gift_card', planId, message: 'Use /api/payments/redeem-gift-card' });
    }

    if (method === 'crypto') {
      return res.json({ checkoutType: 'crypto', planId, message: 'Use /api/payments/crypto-pay' });
    }

    // Stripe card checkout
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        metadata: { userId: req.user.sub, planId },
        success_url: successUrl || `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/payment-success`,
        cancel_url: cancelUrl || `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/payment-cancel`,
        customer_email: req.user.email,
        payment_method_types: ['card'],
        allow_promotion_codes: true
      });
      res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      res.status(500).json({ error: 'Stripe checkout failed', detail: process.env.NODE_ENV !== 'production' ? err.message : undefined });
    }
  });

  // POST /api/payments/crypto-pay
  router.post('/crypto-pay', authMiddleware, (req, res) => {
    const parsed = CryptoPaySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { planId, currency } = parsed.data;
    const plan = PLANS[planId];

    // In production: integrate with CoinPayments, NOWPayments, or similar
    const mockAddress = {
      BTC: process.env.CRYPTO_BTC_ADDRESS,
      ETH: process.env.CRYPTO_ETH_ADDRESS,
      USDC: process.env.CRYPTO_USDC_ADDRESS,
      USDT: process.env.CRYPTO_USDT_ADDRESS,
      SOL: process.env.CRYPTO_SOL_ADDRESS,
      LTC: process.env.CRYPTO_LTC_ADDRESS,
      MATIC: process.env.CRYPTO_MATIC_ADDRESS
    };

    if (!mockAddress[currency]) {
      return res.status(400).json({ error: `${currency} payments not configured` });
    }

    res.json({
      currency,
      planId,
      address: mockAddress[currency],
      amountUsd: plan.priceUsd / 100,
      expiresAt: Date.now() + 30 * 60 * 1000,
      instructions: `Send ${currency} equivalent of $${(plan.priceUsd / 100).toFixed(2)} USD to the address above. Your subscription activates within 3 confirmations.`
    });
  });

  // POST /api/payments/redeem-gift-card
  router.post('/redeem-gift-card', authMiddleware, (req, res) => {
    const parsed = GiftCardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { code } = parsed.data;

    const existing = subscriptionStore.getGiftCard(code);
    if (!existing) return res.status(400).json({ error: 'Invalid or expired gift card code' });
    if (existing.redeemedBy) return res.status(409).json({ error: 'Gift card already redeemed' });

    existing.redeemedBy = req.user.sub;
    existing.redeemedAt = Date.now();
    subscriptionStore.saveGiftCard(existing);

    const sub = {
      userId: req.user.sub,
      planId: existing.planId,
      status: 'active',
      method: 'gift_card',
      giftCardCode: code,
      activatedAt: Date.now(),
      expiresAt: Date.now() + existing.durationDays * 86400000
    };
    subscriptionStore.save(sub);

    res.json({ success: true, planId: existing.planId, expiresAt: sub.expiresAt });
  });

  // POST /api/payments/webhook - Stripe webhook
  router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(400).json({ error: 'Webhook not configured' });

    try {
      const stripe = getStripe();
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, planId } = session.metadata || {};
        if (userId && planId) {
          subscriptionStore.save({
            userId,
            planId,
            status: 'active',
            method: 'card',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            activatedAt: Date.now()
          });
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const stored = subscriptionStore.getByStripeSubId(sub.id);
        if (stored) {
          stored.status = 'cancelled';
          subscriptionStore.save(stored);
        }
      }

      res.json({ received: true });
    } catch (err) {
      res.status(400).json({ error: 'Webhook error' });
    }
  });

  return router;
}

export class InMemorySubscriptionStore {
  constructor() {
    this._subs = new Map();
    this._giftCards = new Map();
  }

  save(sub) { this._subs.set(sub.userId, { ...sub }); }
  get(userId) { return this._subs.has(userId) ? { ...this._subs.get(userId) } : null; }
  getByStripeSubId(subId) {
    return Array.from(this._subs.values()).find(s => s.stripeSubscriptionId === subId) || null;
  }
  saveGiftCard(card) { this._giftCards.set(card.code, { ...card }); }
  getGiftCard(code) { return this._giftCards.has(code) ? { ...this._giftCards.get(code) } : null; }
}
