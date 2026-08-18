// server/routes/payments.js
// Nexus AI Pro — Payment API Routes
// Stripe integration · Crypto · Gift cards
// All keys read from environment variables — NEVER hard-coded
// Date: 2026-08-18

import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── Plan Registry ────────────────────────────────────────────────────────────
const PLANS = {
  free: { name: 'Free', price: { monthly: 0, annual: 0 } },
  pro: { name: 'Pro', price: { monthly: 9.99, annual: 99 } },
  enterprise: { name: 'Enterprise', price: { monthly: 14.99, annual: 149 } },
};

// ─── In-memory subscription store (replace with DB in production) ─────────────
const subscriptions = new Map();

// ─── Audit Log ────────────────────────────────────────────────────────────────
function audit(event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };
  delete entry.cardNumber;
  delete entry.cvc;
  delete entry.stripeKey;
  console.info(`[PAYMENT:${event}]`, JSON.stringify(entry));
}

// ─── POST /api/payments/create-session ───────────────────────────────────────
router.post('/create-session', authenticate, async (req, res) => {
  try {
    const { planId, billingCycle, paymentMethod, paymentDetails } = req.body;

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    const plan = PLANS[planId];
    const price = plan.price[billingCycle];

    if (price === 0) {
      // Free plan — no payment needed
      subscriptions.set(req.user.id, {
        userId: req.user.id,
        planId,
        billingCycle,
        status: 'active',
        startedAt: new Date().toISOString(),
        renewsAt: null,
      });
      audit('FREE_PLAN_ACTIVATED', { userId: req.user.id });
      return res.json({ success: true, planId, status: 'active' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    switch (paymentMethod) {
      case 'card': {
        // In production: use Stripe payment method ID from client-side Stripe.js
        // NEVER receive raw card data on the server
        const sessionId = uuidv4();
        audit('STRIPE_SESSION_CREATED', {
          userId: req.user.id,
          planId,
          billingCycle,
          amount: price,
          cardType: paymentDetails?.cardType,
          lastFour: paymentDetails?.lastFour,
        });

        // Stripe Checkout Session creation (production)
        const stripeSession = await createStripeSession({
          userId: req.user.id,
          planId,
          billingCycle,
          price,
          stripeKey: stripeSecretKey,
        });

        return res.json({
          sessionId: stripeSession.id || sessionId,
          redirectUrl: stripeSession.url || null,
          success: !stripeSession.url,
        });
      }

      case 'crypto': {
        const { coin } = paymentDetails || {};
        if (!coin) return res.status(400).json({ error: 'Crypto coin required' });

        const cryptoPaymentId = uuidv4();
        // In production: create order via crypto payment provider (Coinbase Commerce, etc.)
        audit('CRYPTO_PAYMENT_INITIATED', { userId: req.user.id, planId, coin, amount: price });

        const walletAddress = process.env[`CRYPTO_WALLET_${coin.toUpperCase()}`];
        if (!walletAddress) {
          return res.status(503).json({ error: `${coin.toUpperCase()} payments not configured` });
        }

        return res.json({
          success: false,
          cryptoPaymentId,
          coin: coin.toUpperCase(),
          amount: price,
          address: walletAddress,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          qrCode: `bitcoin:${walletAddress}?amount=${price}`, // placeholder
        });
      }

      case 'gift_card': {
        const { code } = paymentDetails || {};
        if (!code) return res.status(400).json({ error: 'Gift card code required' });

        const redeemed = await redeemGiftCard(code, req.user.id, price);
        if (!redeemed.valid) {
          return res.status(400).json({ error: redeemed.reason || 'Invalid gift card' });
        }

        subscriptions.set(req.user.id, {
          userId: req.user.id,
          planId,
          billingCycle,
          status: 'active',
          startedAt: new Date().toISOString(),
          renewsAt: new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400_000).toISOString(),
          paymentMethod: 'gift_card',
        });

        audit('GIFT_CARD_REDEEMED', { userId: req.user.id, planId });
        return res.json({ success: true, planId, status: 'active' });
      }

      case 'wallet': {
        const { wallet } = paymentDetails || {};
        // In production: handle Apple Pay/Google Pay via Stripe Payment Request Button
        audit('WALLET_PAYMENT_INITIATED', { userId: req.user.id, planId, wallet });
        return res.json({ success: true, planId, status: 'pending', wallet });
      }

      default:
        return res.status(400).json({ error: 'Unsupported payment method' });
    }
  } catch (err) {
    audit('PAYMENT_ERROR', { error: err.message, userId: req.user?.id });
    return res.status(500).json({ error: 'Payment processing failed' });
  }
});

// ─── GET /api/payments/subscription ──────────────────────────────────────────
router.get('/subscription', authenticate, (req, res) => {
  const sub = subscriptions.get(req.user.id);
  if (!sub) {
    return res.json({ planId: 'free', status: 'active', billingCycle: null });
  }
  return res.json(sub);
});

// ─── POST /api/payments/cancel ────────────────────────────────────────────────
router.post('/cancel', authenticate, async (req, res) => {
  const sub = subscriptions.get(req.user.id);
  if (!sub) return res.status(404).json({ error: 'No active subscription' });

  subscriptions.set(req.user.id, { ...sub, status: 'canceling', canceledAt: new Date().toISOString() });
  audit('SUBSCRIPTION_CANCELED', { userId: req.user.id, planId: sub.planId });

  return res.json({ message: 'Subscription will cancel at period end', endsAt: sub.renewsAt });
});

// ─── POST /api/payments/webhook (Stripe webhook) ─────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[PAYMENT] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  // In production: verify with Stripe SDK
  // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  // For now: process trusted events
  try {
    const event = JSON.parse(req.body.toString());
    handleStripeEvent(event);
    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: 'Webhook error' });
  }
});

// ─── GET /api/payments/invoices ───────────────────────────────────────────────
router.get('/invoices', authenticate, (req, res) => {
  // In production: fetch from Stripe
  return res.json({ invoices: [], message: 'Connect Stripe to view invoices' });
});

// ─── Helper: Create Stripe Session ───────────────────────────────────────────
async function createStripeSession({ userId, planId, billingCycle, price, stripeKey }) {
  try {
    // In production: use official Stripe SDK
    // const stripe = new Stripe(stripeKey);
    // const session = await stripe.checkout.sessions.create({ ... });
    // return session;

    // Placeholder for non-production
    return { id: uuidv4(), url: null };
  } catch (err) {
    audit('STRIPE_SESSION_ERROR', { error: err.message });
    throw err;
  }
}

// ─── Helper: Redeem Gift Card ─────────────────────────────────────────────────
async function redeemGiftCard(code, userId, requiredAmount) {
  // In production: validate against gift card DB
  // Codes must be validated server-side only
  if (!code || code.length !== 16) return { valid: false, reason: 'Invalid code format' };

  // Placeholder validation
  const isValid = code.startsWith('NEXUS') || process.env.NODE_ENV === 'development';
  return { valid: isValid, reason: isValid ? null : 'Gift card not found or already redeemed' };
}

// ─── Helper: Handle Stripe Events ─────────────────────────────────────────────
function handleStripeEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      audit('STRIPE_CHECKOUT_COMPLETED', {
        sessionId: session.id,
        customerId: session.customer,
        amount: session.amount_total,
      });
      break;
    }
    case 'invoice.payment_succeeded': {
      audit('STRIPE_PAYMENT_SUCCEEDED', { invoiceId: event.data.object.id });
      break;
    }
    case 'invoice.payment_failed': {
      audit('STRIPE_PAYMENT_FAILED', { invoiceId: event.data.object.id });
      break;
    }
    case 'customer.subscription.deleted': {
      audit('STRIPE_SUBSCRIPTION_DELETED', { subscriptionId: event.data.object.id });
      break;
    }
    default:
      break;
  }
}

export default router;
