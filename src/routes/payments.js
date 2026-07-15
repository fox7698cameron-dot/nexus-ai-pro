/**
 * src/routes/payments.js
 * Nexus AI Pro — Payment Routes (Stripe)
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * POST /api/payments/checkout         — create Stripe checkout session
 * POST /api/payments/webhook          — Stripe webhook handler
 * POST /api/payments/redeem-gift-card — apply gift card credit
 * GET  /api/payments/history          — invoice history
 * POST /api/payments/cancel           — cancel subscription
 */

import { Router } from 'express';
import Stripe from 'stripe';
import express from 'express';
import crypto from 'crypto';
import { requireAuth } from './auth.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2025-06-30' });
}

const PLANS = {
  pro:        { priceId: process.env.STRIPE_PRO_PRICE_ID,        name: 'Pro',        amount: 999  },
  enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, name: 'Enterprise', amount: 1499 },
};

// ─── In-memory subscription/payment store ─────────────────────────────────────

const subscriptions = new Map(); // userId -> { planId, stripeCustomerId, stripeSubId, status, currentPeriodEnd }
const invoiceHistory = new Map(); // userId -> [invoice]
const giftCards      = new Map(); // code -> { credit, usedBy, createdAt }
const giftCardCredit = new Map(); // userId -> number (cents)

// Seed a few test gift card codes (in production these come from your DB)
const SEED_CODES = ['NEXUS-2025-ABCD', 'NEXUS-2025-EFGH', 'NEXUS-2025-IJKL'];
for (const code of SEED_CODES) {
  giftCards.set(code.replace(/-/g, '').toUpperCase(), { credit: 999, usedBy: null, createdAt: Date.now() });
}

// ─── POST /api/payments/checkout ──────────────────────────────────────────────

router.post('/checkout', requireAuth, async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body ?? {};
  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });
  if (!plan.priceId) return res.status(400).json({ error: `Stripe price ID for "${planId}" not configured` });

  const stripe = getStripe();
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3001';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: successUrl ?? `${baseUrl}/dashboard?checkout=success`,
    cancel_url:  cancelUrl  ?? `${baseUrl}/pricing`,
    metadata: { userId: req.user.sub, planId },
    payment_method_types: ['card'],
    allow_promotion_codes: true,
  });

  res.json({ url: session.url, sessionId: session.id });
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(400).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const { userId, planId } = obj.metadata ?? {};
      if (userId) {
        subscriptions.set(userId, {
          planId,
          stripeCustomerId: obj.customer,
          stripeSubId:      obj.subscription,
          status:           'active',
          currentPeriodEnd: null,
        });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      for (const [uid, sub] of subscriptions.entries()) {
        if (sub.stripeSubId === obj.id) {
          subscriptions.set(uid, { ...sub, status: obj.status, currentPeriodEnd: obj.current_period_end });
          break;
        }
      }
      break;
    }
    case 'invoice.paid': {
      for (const [uid, sub] of subscriptions.entries()) {
        if (sub.stripeCustomerId === obj.customer) {
          const history = invoiceHistory.get(uid) ?? [];
          history.unshift({ id: obj.id, amount: obj.amount_paid, currency: obj.currency, date: obj.created * 1000, status: 'paid', pdf: obj.invoice_pdf });
          invoiceHistory.set(uid, history);
          break;
        }
      }
      break;
    }
  }

  res.json({ received: true });
});

// ─── POST /api/payments/redeem-gift-card ──────────────────────────────────────

router.post('/redeem-gift-card', requireAuth, (req, res) => {
  const { code } = req.body ?? {};
  if (!code?.trim()) return res.status(400).json({ error: 'Gift card code required' });

  const normalized = code.trim().replace(/[-\s]/g, '').toUpperCase();
  const card = giftCards.get(normalized);

  if (!card) return res.status(400).json({ error: 'Invalid gift card code' });
  if (card.usedBy) return res.status(400).json({ error: 'Gift card already redeemed' });

  card.usedBy = req.user.sub;
  const prev = giftCardCredit.get(req.user.sub) ?? 0;
  giftCardCredit.set(req.user.sub, prev + card.credit);

  res.json({ success: true, credit: card.credit, totalCredit: giftCardCredit.get(req.user.sub), message: `$${(card.credit / 100).toFixed(2)} credit applied` });
});

// ─── GET /api/payments/history ────────────────────────────────────────────────

router.get('/history', requireAuth, (req, res) => {
  const history = invoiceHistory.get(req.user.sub) ?? [];
  const credit  = giftCardCredit.get(req.user.sub) ?? 0;
  const sub     = subscriptions.get(req.user.sub) ?? null;
  res.json({ invoices: history, giftCardCredit: credit, subscription: sub });
});

// ─── POST /api/payments/cancel ────────────────────────────────────────────────

router.post('/cancel', requireAuth, async (req, res) => {
  const sub = subscriptions.get(req.user.sub);
  if (!sub?.stripeSubId) return res.status(404).json({ error: 'No active subscription' });

  const stripe = getStripe();
  await stripe.subscriptions.cancel(sub.stripeSubId);
  subscriptions.set(req.user.sub, { ...sub, status: 'canceled' });
  res.json({ success: true, message: 'Subscription cancelled' });
});

export default router;
