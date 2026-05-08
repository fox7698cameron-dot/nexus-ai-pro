// src/routes/payments.routes.js
// Nexus AI Pro - Payment API Routes
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import { Router } from 'express';
import { body, validationResult } from 'express-validator';

export function createPaymentsRouter(stripeService, authService) {
  const router = Router();
  const auth = authService.requireAuth();

  // ─── Create subscription checkout ────────────────────────────────────────────
  router.post('/checkout', auth, [
    body('plan').isIn(['pro', 'enterprise']),
    body('successUrl').isURL(),
    body('cancelUrl').isURL(),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid request' });
    const { plan, successUrl, cancelUrl } = req.body;
    const user = await authService.getUser(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    try {
      const result = await stripeService.createSubscriptionCheckout({
        userId: req.user.sub,
        email: user.emailHash, // send to stripe as-is; actual email lookup from DB in prod
        plan,
        successUrl,
        cancelUrl,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Crypto payment ───────────────────────────────────────────────────────────
  router.post('/crypto', auth, [
    body('plan').isIn(['pro', 'enterprise']),
    body('currency').isIn(['BTC', 'ETH', 'USDC', 'USDT', 'SOL']),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid request' });
    const { plan, currency } = req.body;
    const amounts = { pro: 999, enterprise: 1499 };
    try {
      const result = await stripeService.createCryptoPaymentLink({
        userId: req.user.sub,
        email: `${req.user.sub}@nexus`,
        plan,
        amountCents: amounts[plan],
        currency: 'usd',
        successUrl: `${req.headers.origin || ''}/?payment=success`,
        cancelUrl: `${req.headers.origin || ''}/?payment=cancelled`,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Gift card redemption ─────────────────────────────────────────────────────
  router.post('/gift-card/redeem', auth, [
    body('code').isString().notEmpty().trim(),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Gift card code required' });
    try {
      const result = await stripeService.redeemGiftCard({ code: req.body.code });
      if (!result.ok) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Billing portal ───────────────────────────────────────────────────────────
  router.post('/billing-portal', auth, async (req, res) => {
    const { customerId, returnUrl } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID required' });
    try {
      const url = await stripeService.createBillingPortalSession(customerId, returnUrl || req.headers.origin);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Billing history ──────────────────────────────────────────────────────────
  router.get('/billing', auth, async (req, res) => {
    // In production: fetch invoices from Stripe using stored customerId
    res.json({ invoices: [] });
  });

  // ─── Stripe webhook (no auth — validated by signature) ────────────────────────
  router.post('/webhook', (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).send('Missing signature');
    try {
      const event = stripeService.constructEvent(req.body, signature);
      // Handle relevant events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // Update user subscription status in KV store
          break;
        case 'invoice.payment_succeeded':
          break;
        default:
          break;
      }
      res.json({ received: true });
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // ─── Payment methods list ─────────────────────────────────────────────────────
  router.get('/methods', auth, async (req, res) => {
    const { customerId } = req.query;
    if (!customerId) return res.json({ methods: [] });
    try {
      const methods = await stripeService.listPaymentMethods(customerId);
      res.json({ methods });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
