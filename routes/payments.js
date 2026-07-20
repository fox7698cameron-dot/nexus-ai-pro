// Date: 2026-07-20
import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

// Stripe secret key from env only — never hardcoded
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// In-memory gift card store (replace with DB in production)
const giftCards = new Map([
  ['NEXUS-DEMO-1234', { value: 10, used: false }],
  ['NEXUS-PROMO-2026', { value: 20, used: false, discount: 20 }],
]);

// Plan definitions
const PLANS = {
  free: { name: 'Free', monthly: 0, annual: 0, stripePriceId: null },
  pro: {
    name: 'Pro',
    monthly: 1900,       // cents
    annual: 18240,       // cents ($15.20 * 12)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  business: {
    name: 'Business',
    monthly: 4900,
    annual: 47040,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
  },
  enterprise: { name: 'Enterprise', monthly: null, annual: null, stripePriceId: null },
};

// Simple auth check — reads userId from session or JWT header
function getUserId(req) {
  return req.user?.id || req.session?.userId || req.headers['x-user-id'] || 'anonymous';
}

// ──────────────────────────────────────────────
// GET /api/config/stripe — publishable key only
// ──────────────────────────────────────────────
router.get('/config/stripe', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

// ──────────────────────────────────────────────
// GET /api/payments/plans
// ──────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// ──────────────────────────────────────────────
// POST /api/payments/create-payment-intent
// ──────────────────────────────────────────────
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { planId, amount, annual, promoCode, paymentType, cryptoCoin } = req.body;

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = PLANS[planId];
    let amountCents = annual ? plan.annual : plan.monthly;

    // Apply gift card / promo discount
    if (promoCode) {
      const card = giftCards.get(promoCode.toUpperCase());
      if (card && !card.used) {
        if (card.discount) {
          amountCents = Math.round(amountCents * (1 - card.discount / 100));
        } else if (card.value) {
          amountCents = Math.max(0, amountCents - card.value * 100);
        }
      }
    }

    if (amountCents === 0) {
      return res.json({ clientSecret: null, free: true });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      // Dev fallback when Stripe not configured
      if (paymentType === 'crypto') {
        return res.json({
          cryptoAddress: '0xDEMO_ADDRESS_NOT_REAL',
          cryptoAmount: (amountCents / 100).toFixed(6),
          cryptoCoin: cryptoCoin || 'bitcoin',
        });
      }
      return res.json({ clientSecret: 'pi_demo_secret_not_real', demo: true });
    }

    if (paymentType === 'crypto') {
      // Crypto payment — return a placeholder address (real impl uses Coinbase Commerce API)
      return res.json({
        cryptoAddress: process.env.CRYPTO_WALLET_BTC || '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf1E',
        cryptoAmount: (amountCents / 100 / 30000).toFixed(8),  // rough BTC placeholder
        cryptoCoin: cryptoCoin || 'bitcoin',
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { planId, annual: String(annual), userId: getUserId(req) },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[payments] create-payment-intent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/payments/create-subscription
// ──────────────────────────────────────────────
router.post('/create-subscription', async (req, res) => {
  try {
    const { planId, annual, customerId, paymentMethodId } = req.body;

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = PLANS[planId];
    const priceId = annual ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;

    if (!priceId) {
      return res.status(400).json({ error: 'Stripe price ID not configured for this plan' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({ subscriptionId: 'sub_demo_not_real', clientSecret: null, demo: true });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: getUserId(req) },
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: subscription.status,
    });
  } catch (err) {
    console.error('[payments] create-subscription error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/payments/webhook — Stripe signature verified
// ──────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[payments] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    return res.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[payments] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('[payments] PaymentIntent succeeded:', event.data.object.id);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      console.log('[payments] Subscription updated:', event.data.object.id, event.data.object.status);
      break;
    case 'customer.subscription.deleted':
      console.log('[payments] Subscription canceled:', event.data.object.id);
      break;
    case 'invoice.payment_succeeded':
      console.log('[payments] Invoice paid:', event.data.object.id);
      break;
    case 'invoice.payment_failed':
      console.warn('[payments] Invoice payment failed:', event.data.object.id);
      break;
    default:
      console.log('[payments] Unhandled webhook event:', event.type);
  }

  res.json({ received: true });
});

// ──────────────────────────────────────────────
// GET /api/payments/subscription
// ──────────────────────────────────────────────
router.get('/subscription', async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({
        subscription: {
          plan: 'Pro',
          status: 'active',
          currentPeriodEnd: Math.floor(Date.now() / 1000) + 86400 * 30,
          cancelAtPeriodEnd: false,
          paymentMethods: [{ id: 'pm_demo', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2028, isDefault: true }],
          usage: { apiCalls: 1203, storage: 2048, teamMembers: 1 },
          limits: { apiCalls: 5000, storage: 51200, teamMembers: -1 },
        },
      });
    }

    // In production: look up customer ID from DB by userId then fetch from Stripe
    res.json({ subscription: { plan: 'Free', status: 'active', usage: {}, limits: {} } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/payments/cancel-subscription
// ──────────────────────────────────────────────
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({ success: true, cancelAtPeriodEnd: true, demo: true });
    }

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId required' });
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/payments/invoices
// ──────────────────────────────────────────────
router.get('/invoices', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({
        invoices: [
          {
            id: 'in_demo_001',
            created: Math.floor(Date.now() / 1000) - 86400 * 30,
            description: 'Nexus AI Pro — Pro Plan',
            amount_paid: 1900,
            status: 'paid',
            invoice_pdf: null,
          },
        ],
      });
    }

    // In production: look up customer ID from DB then fetch from Stripe
    res.json({ invoices: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/payments/gift-card/redeem
// ──────────────────────────────────────────────
router.post('/gift-card/redeem', (req, res) => {
  const { code, check } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'No code provided' });
  }

  const key = code.trim().toUpperCase();
  const card = giftCards.get(key);

  if (!card) {
    return res.json({ success: false, error: 'Invalid gift card or promo code' });
  }

  if (card.used && !check) {
    return res.json({ success: false, error: 'This code has already been redeemed' });
  }

  // check=true means just validate, don't mark used
  if (!check) {
    giftCards.set(key, { ...card, used: true });
  }

  res.json({
    success: true,
    creditsAdded: card.value || null,
    discount: card.discount || null,
    message: card.discount ? `${card.discount}% discount applied` : `$${card.value} credit added`,
  });
});

export default router;
