// src/routes/subscription-routes.js
// Date: 2026-07-08
// Subscription management: Stripe checkout, crypto, gift cards

import express from 'express';
import { createAuthMiddleware, requireRole } from '../middleware/auth-middleware.js';
import { PLANS, PLAN_CONFIG, SUPPORTED_CRYPTO } from '../services/subscription-service.js';
import { ROLES } from '../services/auth-service.js';

export function createSubscriptionRouter(subscriptionService, authService) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(authService);

  // GET /api/subscriptions/plans
  router.get('/plans', (req, res) => {
    const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      id: key,
      ...config,
      stripePriceIdMonthly: undefined,
      stripePriceIdYearly: undefined
    }));
    res.json({ plans, supportedCrypto: SUPPORTED_CRYPTO });
  });

  // GET /api/subscriptions/my
  router.get('/my', authenticate, (req, res) => {
    const sub = subscriptionService.getUserSubscription(req.user.id);
    const limits = subscriptionService.getPlanLimits(sub?.plan || PLANS.FREE);
    res.json({ subscription: sub, limits });
  });

  // POST /api/subscriptions/checkout
  router.post('/checkout', authenticate, async (req, res) => {
    try {
      const { plan, billingCycle = 'monthly' } = req.body;
      if (!plan || !Object.values(PLANS).includes(plan)) {
        return res.status(400).json({ error: 'Valid plan required' });
      }

      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const result = await subscriptionService.createCheckoutSession(
        req.user.id, plan, billingCycle,
        `${baseUrl}/success`,
        `${baseUrl}/cancel`
      );

      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/subscriptions/crypto
  router.post('/crypto', authenticate, async (req, res) => {
    try {
      const { plan, currency, billingCycle = 'monthly' } = req.body;
      if (!plan || !currency) return res.status(400).json({ error: 'plan and currency required' });
      const result = await subscriptionService.initiateCryptoPayment(req.user.id, plan, currency, billingCycle);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/subscriptions/gift-card/redeem
  router.post('/gift-card/redeem', authenticate, (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Gift card code required' });
    const result = subscriptionService.redeemGiftCard(req.user.id, code);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // POST /api/subscriptions/gift-card/generate (admin only)
  router.post('/gift-card/generate', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
    const { plan, billingCycle = 'monthly', expiryDays = 365 } = req.body;
    if (!plan) return res.status(400).json({ error: 'plan required' });
    const result = subscriptionService.generateGiftCard(req.user.id, plan, billingCycle, expiryDays);
    res.json(result);
  });

  // POST /api/subscriptions/webhook (Stripe webhook - no auth, raw body needed)
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing stripe signature' });
    const result = await subscriptionService.handleWebhook(req.body, signature);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ received: true });
  });

  return router;
}
