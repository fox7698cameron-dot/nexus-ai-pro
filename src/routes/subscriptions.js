// File: subscriptions.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import express from 'express';
import paymentService from '../services/paymentService.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import auditLogger from '../utils/audit.js';

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
    }
    req.validated = result.data;
    next();
  };
}

// GET /plans — public
router.get('/plans', async (req, res) => {
  try {
    const prices = await paymentService.listPrices();
    res.json({ prices });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// POST /subscribe — authenticated
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      priceId: z.string().min(1, 'Price ID is required'),
      paymentMethodId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const subscription = await paymentService.createSubscription(
      req.user.id,
      parsed.data.priceId,
      parsed.data.paymentMethodId
    );
    res.status(201).json({ subscription });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /current — authenticated
router.get('/current', authenticate, async (req, res) => {
  try {
    const subscription = await paymentService.getUserSubscription(req.user.id);
    if (!subscription) return res.status(404).json({ error: 'No active subscription found' });
    res.json({ subscription });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /current — authenticated
router.put('/current', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      subscriptionId: z.string().min(1),
      newPriceId: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const subscription = await paymentService.updateSubscription(parsed.data.subscriptionId, parsed.data.newPriceId);
    res.json({ subscription });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /current — authenticated
router.delete('/current', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      subscriptionId: z.string().min(1),
      immediately: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const result = await paymentService.cancelSubscription(parsed.data.subscriptionId, parsed.data.immediately);
    res.json({ subscription: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /payment-intent — authenticated
router.post('/payment-intent', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      amount: z.number().int().min(50, 'Minimum amount is 50 cents'),
      currency: z.string().length(3).default('usd'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const intent = await paymentService.createPaymentIntent(parsed.data.amount, parsed.data.currency, req.user.id);
    res.json({ clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /setup-intent — authenticated
router.post('/setup-intent', authenticate, async (req, res) => {
  try {
    const intent = await paymentService.createSetupIntent(req.user.id);
    res.json({ clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /gift-card/create — admin only
router.post('/gift-card/create', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const schema = z.object({
      amount: z.number().int().min(100, 'Minimum gift card value is $1'),
      currency: z.string().length(3).default('usd'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const card = await paymentService.createGiftCard(parsed.data.amount, parsed.data.currency);
    res.status(201).json({ giftCard: card });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /gift-card/redeem — authenticated
router.post('/gift-card/redeem', authenticate, async (req, res) => {
  try {
    const schema = z.object({ code: z.string().min(1, 'Gift card code is required') });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const result = await paymentService.redeemGiftCard(req.user.id, parsed.data.code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /crypto — authenticated
router.post('/crypto', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      cryptoCurrency: z.string().min(2).max(10),
      amount: z.number().positive(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const result = await paymentService.processCryptoPayment(
      req.user.id,
      parsed.data.cryptoCurrency,
      parsed.data.amount
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /invoices — authenticated
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const invoices = await paymentService.getInvoices(req.user.id);
    res.json({ invoices });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /portal — authenticated
router.post('/portal', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      customerId: z.string().min(1),
      returnUrl: z.string().url(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const session = await paymentService.createPortalSession(parsed.data.customerId, parsed.data.returnUrl);
    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /webhook — no auth, raw body, verify Stripe signature
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret && sig) {
      // Dynamically import stripe to verify signature
      try {
        const { default: Stripe } = await import('stripe');
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
        event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (sigErr) {
        auditLogger.log('payment.webhook.invalid_signature', null, { error: sigErr.message }, 'error');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } else {
      // Dev mode: parse body directly
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const result = await paymentService.handleWebhook(event);
    res.json(result);
  } catch (err) {
    auditLogger.log('payment.webhook.error', null, { error: err.message }, 'error');
    res.status(400).json({ error: err.message });
  }
});

export default router;
