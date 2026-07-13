// ================================================
// NEXUS AI PRO – Payment Routes
// Stripe · Coinbase Commerce · Gift Cards
// ================================================
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';

const router = Router();

// ================================================
// SUBSCRIPTION PLANS
// ================================================
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    interval: 'month',
    features: ['5 AI messages/day', 'Basic analytics', '1 project'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_STARTER || null,
    interval: 'month',
    features: ['100 messages/day', 'Analytics', '5 projects', 'Basic security'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    priceId: process.env.STRIPE_PRICE_PRO || null,
    interval: 'month',
    features: [
      'Unlimited messages',
      'Full analytics',
      'Unlimited projects',
      'Advanced security',
      'Game dev tracking',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || null,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Custom connectors',
      'Priority support',
      'SLA',
      'White label',
    ],
  },
};

// ================================================
// IN-MEMORY STORES
// ================================================

// userId -> { plan, status, startDate, endDate, stripeCustomerId, stripeSub, creditBalance, paymentMethod }
const subscriptions = new Map();

// code -> { value, redeemed, redeemedBy, redeemedAt, expiresAt }
const giftCards = new Map();

// Simple in-memory payment history per user
// userId -> [{ id, date, amount, currency, status, method, description }]
const paymentHistory = new Map();

// ================================================
// GIFT CARD UTILITIES
// ================================================
function generateGiftCardCode() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

function mintGiftCards(count, value, expiresInDays = 365) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Ensure uniqueness
    let code;
    do { code = generateGiftCardCode(); } while (giftCards.has(code));
    giftCards.set(code, {
      value: Number(value),
      redeemed: false,
      redeemedBy: null,
      redeemedAt: null,
      expiresAt: new Date(Date.now() + Number(expiresInDays) * 86_400_000).toISOString(),
    });
    codes.push(code);
  }
  return codes;
}

// Pre-generate 10 demo codes ($10 each) on module load
const demoCodes = mintGiftCards(10, 10);
if (process.env.NODE_ENV !== 'production') {
  console.log('[Payments] Demo gift card codes (dev only):');
  demoCodes.forEach((c) => console.log('  ', c));
}

// ================================================
// STRIPE LAZY INIT
// Loaded on first use so the module still imports
// without stripe in package.json during testing.
// ================================================
let _stripe = null;
async function getStripe() {
  if (!_stripe) {
    // stripe must be installed: npm i stripe
    const { default: Stripe } = await import('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return _stripe;
}

// ================================================
// HELPERS
// ================================================
function recordPayment(userId, entry) {
  const history = paymentHistory.get(userId) || [];
  history.unshift({ id: crypto.randomUUID(), ...entry });
  paymentHistory.set(userId, history.slice(0, 100)); // keep last 100
}

// ================================================
// ROUTES
// ================================================

// GET /api/payments/plans
router.get('/plans', (_req, res) => {
  res.json({ success: true, plans: PLANS });
});

// --------------------------------------------------
// POST /api/payments/checkout/stripe
// --------------------------------------------------
router.post('/checkout/stripe', async (req, res) => {
  try {
    const {
      planId,
      userId,
      userEmail,
      successUrl,
      cancelUrl,
    } = req.body;

    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    if (plan.price === 0) {
      return res.status(400).json({ error: 'Free plan does not require checkout' });
    }

    const stripe = await getStripe();
    const existingSub = subscriptions.get(String(userId)) || {};
    const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      // Supported cards: visa, mastercard, amex, discover
      // Google Pay / Apple Pay are enabled automatically when card is present
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Nexus AI Pro – ${plan.name}`,
              description: plan.features.join(' · '),
            },
            unit_amount: Math.round(plan.price * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${clientBase}/dashboard?payment=success&plan=${planId}`,
      cancel_url: cancelUrl || `${clientBase}/pricing?payment=cancelled`,
      customer_email: userEmail || undefined,
      customer: existingSub.stripeCustomerId || undefined,
      metadata: { userId: String(userId), planId },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error('[Stripe checkout]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// POST /api/payments/checkout/crypto  (Coinbase Commerce)
// --------------------------------------------------
router.post('/checkout/crypto', async (req, res) => {
  try {
    const { planId, userId, userEmail } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    if (plan.price === 0) {
      return res.status(400).json({ error: 'Free plan does not require payment' });
    }

    const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';

    const chargePayload = {
      name: `Nexus AI Pro – ${plan.name}`,
      description: `${plan.name} monthly subscription · ${plan.features.join(', ')}`,
      local_price: { amount: plan.price.toFixed(2), currency: 'USD' },
      pricing_type: 'fixed_price',
      metadata: {
        userId: String(userId),
        planId,
        userEmail: userEmail || '',
      },
      redirect_url: `${clientBase}/dashboard?payment=success&method=crypto&plan=${planId}`,
      cancel_url: `${clientBase}/pricing?payment=cancelled`,
    };

    const ccRes = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': process.env.COINBASE_API_KEY || '',
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify(chargePayload),
    });

    if (!ccRes.ok) {
      const errBody = await ccRes.text();
      throw new Error(`Coinbase Commerce ${ccRes.status}: ${errBody}`);
    }

    const { data } = await ccRes.json();

    res.json({
      success: true,
      chargeId: data.id,
      hostedUrl: data.hosted_url,
      expiresAt: data.expires_at,
      // Wallet addresses keyed by currency symbol
      addresses: data.addresses || {},
      pricing: data.pricing || {},
      acceptedCurrencies: ['BTC', 'ETH', 'USDC', 'SOL', 'DOGE'],
    });
  } catch (err) {
    console.error('[Coinbase checkout]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// POST /api/payments/giftcard/redeem
// --------------------------------------------------
router.post('/giftcard/redeem', (req, res) => {
  try {
    const { code, userId } = req.body;
    if (!code || !userId) {
      return res.status(400).json({ error: 'code and userId are required' });
    }

    const key = String(code).trim().toUpperCase();
    const card = giftCards.get(key);
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    if (card.redeemed) return res.status(409).json({ error: 'Gift card already redeemed' });
    if (new Date(card.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Gift card has expired' });
    }

    card.redeemed = true;
    card.redeemedBy = String(userId);
    card.redeemedAt = new Date().toISOString();
    giftCards.set(key, card);

    const uid = String(userId);
    const sub = subscriptions.get(uid) || {
      plan: 'free',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: null,
      stripeCustomerId: null,
      stripeSub: null,
      paymentMethod: null,
      creditBalance: 0,
    };
    sub.creditBalance = (sub.creditBalance || 0) + card.value;
    subscriptions.set(uid, sub);

    recordPayment(uid, {
      date: new Date().toISOString(),
      amount: card.value.toFixed(2),
      currency: 'USD',
      status: 'succeeded',
      method: 'gift_card',
      description: `Gift card redemption (${key})`,
    });

    res.json({ success: true, value: card.value, creditBalance: sub.creditBalance });
  } catch (err) {
    console.error('[Gift card redeem]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// POST /api/payments/giftcard/generate  (admin only)
// --------------------------------------------------
router.post('/giftcard/generate', (req, res) => {
  try {
    // Expects upstream auth middleware to attach req.user
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { count = 1, value = 10, expiresInDays = 365 } = req.body;
    const n = Math.min(Math.max(Number(count), 1), 100);
    const v = Math.max(Number(value), 0.01);
    const d = Math.max(Number(expiresInDays), 1);

    const codes = mintGiftCards(n, v, d);
    res.json({ success: true, codes, count: codes.length, value: v, expiresInDays: d });
  } catch (err) {
    console.error('[Gift card generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// POST /api/payments/webhooks/stripe
// IMPORTANT: mount the payments router in server.js BEFORE
// express.json() – or exclude this path from JSON parsing –
// so Stripe receives the raw body for signature verification.
// --------------------------------------------------
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const stripe = await getStripe();
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        console.error('[Stripe webhook] Signature mismatch:', err.message);
        return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const { userId, planId } = session.metadata || {};
          if (userId && planId) {
            const existing = subscriptions.get(userId) || {};
            subscriptions.set(userId, {
              ...existing,
              plan: planId,
              status: 'active',
              startDate: new Date().toISOString(),
              endDate: null,
              stripeCustomerId: session.customer,
              stripeSub: session.subscription,
              paymentMethod: 'card',
            });
            console.log(`[Stripe] Subscription activated: user=${userId} plan=${planId}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const stripeSub = event.data.object;
          for (const [uid, sub] of subscriptions.entries()) {
            if (sub.stripeCustomerId === stripeSub.customer) {
              sub.status = stripeSub.status;
              sub.endDate = stripeSub.cancel_at
                ? new Date(stripeSub.cancel_at * 1000).toISOString()
                : null;
              subscriptions.set(uid, sub);
              break;
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const deletedSub = event.data.object;
          for (const [uid, sub] of subscriptions.entries()) {
            if (sub.stripeCustomerId === deletedSub.customer) {
              sub.status = 'canceled';
              sub.plan = 'free';
              sub.stripeSub = null;
              subscriptions.set(uid, sub);
              break;
            }
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          for (const [uid, sub] of subscriptions.entries()) {
            if (sub.stripeCustomerId === invoice.customer) {
              recordPayment(uid, {
                date: new Date(invoice.created * 1000).toISOString(),
                amount: (invoice.amount_paid / 100).toFixed(2),
                currency: invoice.currency.toUpperCase(),
                status: 'succeeded',
                method: 'card',
                description: invoice.lines?.data?.[0]?.description || 'Subscription invoice',
                invoiceId: invoice.id,
                pdfUrl: invoice.invoice_pdf,
              });
              break;
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const failedInvoice = event.data.object;
          for (const [uid, sub] of subscriptions.entries()) {
            if (sub.stripeCustomerId === failedInvoice.customer) {
              sub.status = 'past_due';
              subscriptions.set(uid, sub);
              break;
            }
          }
          break;
        }

        default:
          console.log(`[Stripe webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Stripe webhook]', err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

// --------------------------------------------------
// POST /api/payments/webhooks/coinbase
// --------------------------------------------------
router.post('/webhooks/coinbase', (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-cc-webhook-signature'];
    const secret = process.env.COINBASE_WEBHOOK_SECRET;

    if (secret && signature) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      if (expected !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const { event } = req.body || {};
    if (!event) return res.status(400).json({ error: 'Missing event payload' });

    const { type, data } = event;
    const { userId, planId } = data?.metadata || {};

    if (type === 'charge:confirmed' && userId && planId) {
      const plan = PLANS[planId];
      subscriptions.set(userId, {
        plan: planId,
        status: 'active',
        startDate: new Date().toISOString(),
        // Crypto subscriptions are one-time monthly; set end 30 days out
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        stripeCustomerId: null,
        stripeSub: null,
        paymentMethod: 'crypto',
        chargeId: data.id,
        creditBalance: subscriptions.get(userId)?.creditBalance || 0,
      });
      recordPayment(userId, {
        date: new Date().toISOString(),
        amount: plan?.price?.toFixed(2) || '0.00',
        currency: 'USD',
        status: 'succeeded',
        method: 'crypto',
        description: `${planId} plan via Coinbase Commerce`,
        chargeId: data.id,
      });
      console.log(`[Coinbase] Payment confirmed: user=${userId} plan=${planId}`);
    }

    if (type === 'charge:failed' && userId) {
      const sub = subscriptions.get(userId);
      if (sub) { sub.status = 'past_due'; subscriptions.set(userId, sub); }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Coinbase webhook]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET /api/payments/subscription/:userId
// --------------------------------------------------
router.get('/subscription/:userId', (req, res) => {
  const uid = req.params.userId;
  const sub = subscriptions.get(uid) || {
    plan: 'free',
    status: 'active',
    startDate: null,
    endDate: null,
    stripeCustomerId: null,
    stripeSub: null,
    creditBalance: 0,
    paymentMethod: null,
  };
  res.json({
    success: true,
    subscription: sub,
    planDetails: PLANS[sub.plan] || PLANS.free,
  });
});

// --------------------------------------------------
// POST /api/payments/subscription/:userId/cancel
// --------------------------------------------------
router.post('/subscription/:userId/cancel', async (req, res) => {
  try {
    const uid = req.params.userId;
    const sub = subscriptions.get(uid);
    if (!sub) return res.status(404).json({ error: 'No subscription found for this user' });

    if (sub.stripeSub) {
      const stripe = await getStripe();
      // Cancel at period end (graceful)
      await stripe.subscriptions.update(sub.stripeSub, { cancel_at_period_end: true });
    }

    sub.status = 'canceled';
    sub.plan = 'free';
    sub.endDate = sub.endDate || new Date().toISOString();
    sub.stripeSub = null;
    subscriptions.set(uid, sub);

    res.json({ success: true, message: 'Subscription canceled', subscription: sub });
  } catch (err) {
    console.error('[Cancel subscription]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET /api/payments/history/:userId
// --------------------------------------------------
router.get('/history/:userId', async (req, res) => {
  try {
    const uid = req.params.userId;
    const sub = subscriptions.get(uid);
    const localHistory = paymentHistory.get(uid) || [];

    // Merge with Stripe invoice history when available
    let stripeHistory = [];
    if (sub?.stripeCustomerId) {
      try {
        const stripe = await getStripe();
        const invoices = await stripe.invoices.list({
          customer: sub.stripeCustomerId,
          limit: 24,
        });
        stripeHistory = invoices.data.map((inv) => ({
          id: inv.id,
          date: new Date(inv.created * 1000).toISOString(),
          amount: (inv.amount_paid / 100).toFixed(2),
          currency: inv.currency.toUpperCase(),
          status: inv.status,
          method: 'card',
          description: inv.lines?.data?.[0]?.description || 'Subscription',
          pdfUrl: inv.invoice_pdf,
        }));
      } catch (stripeErr) {
        console.warn('[Payment history] Stripe fetch failed:', stripeErr.message);
      }
    }

    // Deduplicate by invoiceId where present
    const seen = new Set();
    const combined = [...stripeHistory, ...localHistory].filter((e) => {
      const key = e.invoiceId || e.id || `${e.date}-${e.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ success: true, history: combined });
  } catch (err) {
    console.error('[Payment history]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// POST /api/payments/portal  (Stripe customer billing portal)
// --------------------------------------------------
router.post('/portal', async (req, res) => {
  try {
    const { userId, returnUrl } = req.body;
    const sub = subscriptions.get(String(userId));
    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer associated with this user' });
    }

    const stripe = await getStripe();
    const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl || `${clientBase}/dashboard`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('[Customer portal]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Export the in-memory stores for use by other routes (e.g. admin)
export { subscriptions, giftCards, PLANS };
export default router;
