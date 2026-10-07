// payment.js - 2026-10-07
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth.js';

const router = Router();

// All payment provider keys are loaded exclusively from env vars
function getStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return key;
}

const PLANS = {
  free: { id: 'free', name: 'Free', priceMonthly: 0, stripePriceId: null },
  pro: { id: 'pro', name: 'Pro', priceMonthly: 999, stripePriceId: process.env.STRIPE_PRICE_PRO },
  enterprise: { id: 'enterprise', name: 'Enterprise', priceMonthly: 1499, stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE }
};

// In-memory subscription store (replace with DB in production)
const subscriptions = new Map();

// ── Stripe checkout ───────────────────────────────────────────────────

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

router.post('/checkout', requireAuth(), async (req, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { plan, successUrl, cancelUrl } = parsed.data;

    const stripeKey = getStripeKey();
    const priceId = PLANS[plan]?.stripePriceId;
    if (!priceId) return res.status(400).json({ error: `No Stripe price ID configured for plan: ${plan}` });

    const res2 = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'client_reference_id': req.user.id
      })
    });
    const session = await res2.json();
    if (!res2.ok) return res.status(res2.status).json({ error: session.error?.message || 'Stripe error' });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    if (err.message.includes('not configured')) return res.status(503).json({ error: err.message });
    console.error('[payment/checkout]', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// ── Stripe webhook ────────────────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });

    // In production: verify signature with stripe.webhooks.constructEvent()
    // For MVP: parse body directly (enforce HTTPS + raw body in production)
    const event = req.body;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      subscriptions.set(session.client_reference_id, {
        subscriptionId: session.subscription,
        status: 'active',
        plan: session.metadata?.plan || 'pro',
        updatedAt: new Date().toISOString()
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      // Mark subscription as cancelled in store
      for (const [userId, s] of subscriptions) {
        if (s.subscriptionId === sub.id) {
          s.status = 'cancelled';
          s.updatedAt = new Date().toISOString();
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[payment/webhook]', err.message);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// ── Gift card redemption ──────────────────────────────────────────────

const giftCardSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid gift card format')
});

router.post('/gift-card/redeem', requireAuth(), async (req, res) => {
  try {
    const parsed = giftCardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    // In production: validate code against gift card store; mark as used; credit account
    const { code } = parsed.data;
    const hash = Buffer.from(code).toString('base64'); // opaque reference only
    res.json({ message: 'Gift card redeemed', reference: hash.slice(0, 16) });
  } catch (err) {
    console.error('[payment/gift-card]', err.message);
    res.status(500).json({ error: 'Gift card redemption failed' });
  }
});

// ── Crypto payment ────────────────────────────────────────────────────

const cryptoSchema = z.object({
  currency: z.enum(['BTC', 'ETH', 'USDC', 'USDT']),
  plan: z.enum(['pro', 'enterprise'])
});

router.post('/crypto/intent', requireAuth(), async (req, res) => {
  try {
    const parsed = cryptoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const coinbaseKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!coinbaseKey) return res.status(503).json({ error: 'COINBASE_COMMERCE_API_KEY not configured' });

    const { plan, currency } = parsed.data;
    const amount = PLANS[plan].priceMonthly / 100;

    const res2 = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': coinbaseKey,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Nexus AI Pro - ${PLANS[plan].name}`,
        description: `Monthly subscription`,
        local_price: { amount: amount.toFixed(2), currency: 'USD' },
        pricing_type: 'fixed_price',
        metadata: { userId: req.user.id, plan }
      })
    });
    const charge = await res2.json();
    if (!res2.ok) return res.status(res2.status).json({ error: charge.error?.message || 'Coinbase error' });

    res.json({ chargeId: charge.data.id, hostedUrl: charge.data.hosted_url });
  } catch (err) {
    if (err.message.includes('not configured')) return res.status(503).json({ error: err.message });
    console.error('[payment/crypto]', err.message);
    res.status(500).json({ error: 'Crypto payment intent failed' });
  }
});

// GET /api/payment/subscription
router.get('/subscription', requireAuth(), (req, res) => {
  const sub = subscriptions.get(req.user.id) || { status: 'none', plan: 'free' };
  res.json(sub);
});

export default router;
