// src/server/routes/subscriptions.js
// Nexus AI Pro — Stripe Subscription Routes
// Stripe Checkout · Webhooks · Gift Card redemption · Crypto payment intent
// All keys from environment — never hardcoded
// Updated: 2026-05-06

import { Router } from 'express';
import Stripe from 'stripe';
import { authenticateToken } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// ── Price map (set in Stripe dashboard, referenced by env vars) ───────────────
const PRICE_IDS = {
  pro:        () => process.env.STRIPE_PRICE_PRO        || null,
  enterprise: () => process.env.STRIPE_PRICE_ENTERPRISE || null,
};

// ── In-memory gift card store (replace with DB) ───────────────────────────────
const giftCards = new Map([
  ['TEST-GIFT-CARD-001', { value: 25.00, used: false, currency: 'USD' }],
  ['TEST-GIFT-CARD-002', { value: 50.00, used: false, currency: 'USD' }],
]);

// ── Create Stripe Checkout session ────────────────────────────────────────────
router.post('/checkout', authenticateToken, async (req, res) => {
  const { plan, method } = req.body;
  if (!['pro', 'enterprise'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  if (method === 'gift_card') {
    // Handled separately
    return res.status(400).json({ error: 'Use /subscriptions/gift-card for gift card redemption' });
  }

  if (method === 'crypto') {
    // Return a crypto payment intent (real integration would use Coinbase Commerce or similar)
    return res.json({
      message: 'Crypto payment initiated',
      paymentId: uuidv4(),
      instructions: 'Send to wallet address provided — confirmation within 3 network confirmations.',
    });
  }

  try {
    const stripe   = getStripe();
    const priceId  = PRICE_IDS[plan]();
    if (!priceId) return res.status(500).json({ error: `Stripe price ID not configured for plan: ${plan}` });

    const baseUrl  = process.env.APP_URL || 'http://localhost:5173';
    const session  = await stripe.checkout.sessions.create({
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/subscription/cancel`,
      metadata:    { userId: req.user.userId, plan },
      customer_email: req.user.email,
      payment_method_types: ['card'],
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Stripe webhook (validates signature) ─────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object;
    // Activate subscription in DB (placeholder)
    console.log(`[Stripe] Subscription activated for user ${session.metadata?.userId}`);
    break;
  }
  case 'customer.subscription.deleted': {
    const sub = event.data.object;
    console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
    break;
  }
  case 'invoice.payment_failed': {
    const inv = event.data.object;
    console.log(`[Stripe] Payment failed for invoice: ${inv.id}`);
    break;
  }
  }

  return res.json({ received: true });
});

// ── Gift card redemption ──────────────────────────────────────────────────────
router.post('/gift-card', authenticateToken, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Gift card code required' });

  const normalised = code.replace(/[-\s]/g, '').toUpperCase();
  const card = giftCards.get(normalised) || giftCards.get(code.toUpperCase());

  if (!card)      return res.status(404).json({ error: 'Gift card not found or invalid' });
  if (card.used)  return res.status(409).json({ error: 'Gift card has already been redeemed' });

  card.used = true;
  return res.json({ success: true, credit: card.value, currency: card.currency, message: `$${card.value} credit applied to your account` });
});

// ── Get current subscription ──────────────────────────────────────────────────
router.get('/current', authenticateToken, async (req, res) => {
  // In production query DB for user's subscription record
  return res.json({
    plan:      'pro',
    status:    'active',
    renewsAt:  Date.now() + 30 * 86_400_000,
    cancelable: true,
  });
});

// ── Cancel subscription ───────────────────────────────────────────────────────
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const stripe       = getStripe();
    const subscriptionId = req.body.subscriptionId;
    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });

    const cancelled = await stripe.subscriptions.cancel(subscriptionId);
    return res.json({ success: true, status: cancelled.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
