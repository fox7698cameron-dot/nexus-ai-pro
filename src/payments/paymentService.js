/**
 * Nexus AI Pro — Payment Service
 * Stripe (cards: Visa, MC, Amex, Discover, debit), crypto (Coinbase Commerce webhook pattern),
 * gift-card redemption, subscription management.
 * date: 2026-06-08
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Gift-card store (replace with DB / Redis in production)
const giftCards = new Map();
const transactions = new Map();
const subscriptions = new Map();

// ── Stripe helper (lazy init so the module loads without STRIPE_SECRET_KEY) ───

let _stripe = null;
async function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY env var required');
  const { default: Stripe } = await import('stripe');
  _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  return _stripe;
}

// ── Subscription plans ────────────────────────────────────────────────────────

export const Plans = Object.freeze({
  FREE: { id: 'free', name: 'Free', price: 0, currency: 'usd', interval: null },
  PRO: { id: 'pro', name: 'Pro', price: 999, currency: 'usd', interval: 'month' },         // $9.99/mo
  ENTERPRISE: { id: 'enterprise', name: 'Enterprise', price: 4999, currency: 'usd', interval: 'month' }, // $49.99/mo
  LIFETIME: { id: 'lifetime', name: 'Lifetime', price: 29900, currency: 'usd', interval: null },          // $299 one-time
});

// ── PaymentService ────────────────────────────────────────────────────────────

export class PaymentService {
  // ── Stripe checkout session ──

  async createCheckoutSession(userId, planId, options = {}) {
    const plan = Object.values(Plans).find(p => p.id === planId);
    if (!plan) throw new Error('Unknown plan');
    if (plan.price === 0) return { type: 'free', planId };

    const stripe = getStripe();
    const lineItem = {
      price_data: {
        currency: plan.currency,
        product_data: { name: `Nexus AI Pro — ${plan.name}`, metadata: { planId } },
        unit_amount: plan.price,
        ...(plan.interval ? { recurring: { interval: plan.interval } } : {}),
      },
      quantity: 1,
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],  // Visa, MC, Amex, Discover, debit all go through 'card'
      line_items: [lineItem],
      mode: plan.interval ? 'subscription' : 'payment',
      success_url: `${process.env.APP_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/checkout/cancel`,
      metadata: { userId, planId },
      customer_email: options.email,
    });

    return { type: 'stripe', sessionId: session.id, url: session.url };
  }

  // ── Stripe webhook handler ──

  async handleStripeWebhook(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET env var required');
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, planId } = session.metadata || {};
        if (userId) {
          subscriptions.set(userId, {
            planId,
            status: 'active',
            stripeSessionId: session.id,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            activatedAt: Date.now(),
          });
          this._logTransaction(userId, 'SUBSCRIPTION_ACTIVATED', { planId, sessionId: session.id });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        for (const [uid, s] of subscriptions.entries()) {
          if (s.stripeSubscriptionId === sub.id) {
            s.status = 'cancelled';
            s.cancelledAt = Date.now();
            this._logTransaction(uid, 'SUBSCRIPTION_CANCELLED', { subId: sub.id });
            break;
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        const customerId = inv.customer;
        for (const [uid, s] of subscriptions.entries()) {
          if (s.stripeCustomerId === customerId) {
            s.status = 'payment_failed';
            this._logTransaction(uid, 'PAYMENT_FAILED', { invoiceId: inv.id });
            break;
          }
        }
        break;
      }
    }

    return { received: true, type: event.type };
  }

  // ── Crypto payments (Coinbase Commerce webhook pattern) ──

  async createCryptoPayment(userId, planId, currency = 'ETH') {
    const plan = Object.values(Plans).find(p => p.id === planId);
    if (!plan) throw new Error('Unknown plan');

    const paymentId = uuidv4();
    const supportedCoins = ['BTC', 'ETH', 'USDC', 'SOL', 'LTC'];
    if (!supportedCoins.includes(currency)) throw new Error('Unsupported crypto currency');

    const payment = {
      id: paymentId,
      userId,
      planId,
      currency,
      amountUsd: plan.price / 100,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };
    transactions.set(paymentId, payment);

    return {
      paymentId,
      currency,
      amountUsd: payment.amountUsd,
      walletAddress: process.env[`CRYPTO_WALLET_${currency}`] || null,
      expiresAt: payment.expiresAt,
      note: 'Send the equivalent amount of crypto to the wallet address. Payment confirmed via webhook.',
    };
  }

  handleCryptoWebhook(rawBody, signature) {
    const secret = process.env.COINBASE_WEBHOOK_SECRET;
    if (!secret) throw new Error('COINBASE_WEBHOOK_SECRET env var required');
    const computedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(signature))) {
      throw new Error('Invalid signature');
    }
    const event = JSON.parse(rawBody);
    if (event.type === 'charge:confirmed') {
      const { metadata } = event.data;
      if (metadata?.paymentId) {
        const tx = transactions.get(metadata.paymentId);
        if (tx) {
          tx.status = 'confirmed';
          tx.confirmedAt = Date.now();
          subscriptions.set(tx.userId, {
            planId: tx.planId,
            status: 'active',
            activatedAt: Date.now(),
            paymentMethod: 'crypto',
            currency: tx.currency,
          });
          this._logTransaction(tx.userId, 'CRYPTO_PAYMENT_CONFIRMED', { paymentId: tx.id });
        }
      }
    }
    return { received: true };
  }

  // ── Gift cards ──

  issueGiftCard(createdBy, valueUsd, code = null) {
    const giftCode = code || crypto.randomBytes(8).toString('hex').toUpperCase();
    if (giftCards.has(giftCode)) throw new Error('Gift card code collision');
    giftCards.set(giftCode, {
      code: giftCode,
      valueUsd,
      remaining: valueUsd,
      createdBy,
      createdAt: Date.now(),
      redeemedBy: null,
      redeemedAt: null,
    });
    return giftCode;
  }

  redeemGiftCard(userId, code) {
    const card = giftCards.get(code?.toUpperCase());
    if (!card) return { ok: false, reason: 'Invalid gift card code' };
    if (card.redeemedBy) return { ok: false, reason: 'Gift card already redeemed' };
    if (card.remaining <= 0) return { ok: false, reason: 'Gift card has no remaining balance' };
    card.redeemedBy = userId;
    card.redeemedAt = Date.now();
    card.remaining = 0;
    this._logTransaction(userId, 'GIFT_CARD_REDEEMED', { code, valueUsd: card.valueUsd });
    return { ok: true, valueUsd: card.valueUsd };
  }

  // ── Subscriptions ──

  getSubscription(userId) {
    return subscriptions.get(userId) || { planId: 'free', status: 'active' };
  }

  cancelSubscription(userId) {
    const sub = subscriptions.get(userId);
    if (!sub) return { ok: false, reason: 'No subscription found' };
    sub.status = 'cancelled';
    sub.cancelledAt = Date.now();
    return { ok: true };
  }

  // ── Internal helpers ──

  _logTransaction(userId, event, details) {
    const id = uuidv4();
    transactions.set(id, { id, userId, event, details, ts: Date.now() });
  }

  getTransactions(userId, limit = 50) {
    return Array.from(transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
