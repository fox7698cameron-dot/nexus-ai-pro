/**
 * src/payments/PaymentService.js
 * Nexus AI Pro — Stripe subscription & payment processor
 * Supports: Visa, MC, Amex, Discover, Maestro, UnionPay, JCB, Elo,
 *           debit cards, crypto (via Stripe's crypto onramp),
 *           gift cards (Stripe Gift Cards or promo codes).
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 *
 * SECURITY NOTICE:
 *   • No secret keys are ever hard-coded; all read from process.env.
 *   • Card data never touches this server — Stripe.js tokenises client-side.
 *   • PCI DSS SAQ A compliance maintained.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import crypto from 'crypto';

// ── Stripe client (lazy-initialised to allow env to load first) ─────────
let _stripe = null;
function stripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is required');
  const Stripe = require('stripe');
  _stripe = new Stripe(key, { apiVersion: '2025-04-30', appInfo: { name: 'Nexus AI Pro', version: '2.0.0' } });
  return _stripe;
}

// ── Subscription plan IDs (set in Stripe dashboard; read from env) ──────
const PLAN_IDS = Object.freeze({
  free: null,
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  enterprise_annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
});

// ── Gift-card / promo code store (in-memory; swap for DB) ───────────────
const _giftCodes = new Map(); // code → { value, currency, redeemed, userId }

// ── PaymentService ───────────────────────────────────────────────────────

export class PaymentService {
  constructor() {
    this._customerCache = new Map(); // userId → stripeCustomerId
  }

  // ── Customers ────────────────────────────────────────────────────────

  async getOrCreateCustomer(userId, email, name) {
    if (this._customerCache.has(userId)) {
      return stripe().customers.retrieve(this._customerCache.get(userId));
    }
    const existing = await stripe().customers.list({ email, limit: 1 });
    if (existing.data.length) {
      this._customerCache.set(userId, existing.data[0].id);
      return existing.data[0];
    }
    const customer = await stripe().customers.create({
      email,
      name,
      metadata: { nexusUserId: userId },
    });
    this._customerCache.set(userId, customer.id);
    return customer;
  }

  // ── Setup intent (save card without charging) ─────────────────────────

  async createSetupIntent(userId, email, name) {
    const customer = await this.getOrCreateCustomer(userId, email, name);
    const intent = await stripe().setupIntents.create({
      customer: customer.id,
      payment_method_types: [
        'card',       // Visa, MC, Amex, Discover, Maestro, UnionPay, JCB, Elo, Diners
        'us_bank_account',
        'sepa_debit',
        'cashapp',
      ],
      usage: 'off_session',
    });
    return { clientSecret: intent.client_secret, customerId: customer.id };
  }

  // ── Subscriptions ──────────────────────────────────────────────────────

  async createSubscription(userId, planKey, paymentMethodId, email, name, couponCode) {
    const priceId = PLAN_IDS[planKey];
    if (!priceId) throw new Error(`Unknown or free plan: ${planKey}`);

    const customer = await this.getOrCreateCustomer(userId, email, name);

    // Attach the payment method to the customer
    await stripe().paymentMethods.attach(paymentMethodId, { customer: customer.id });
    await stripe().customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_types: ['card', 'us_bank_account', 'cashapp'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { nexusUserId: userId, planKey },
    };

    if (couponCode) {
      const coupon = await this._resolveCoupon(couponCode, userId);
      if (coupon) subParams.coupon = coupon;
    }

    const subscription = await stripe().subscriptions.create(subParams);
    return subscription;
  }

  async cancelSubscription(subscriptionId, immediately = false) {
    if (immediately) {
      return stripe().subscriptions.cancel(subscriptionId);
    }
    return stripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  async getSubscription(subscriptionId) {
    return stripe().subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });
  }

  async listCustomerSubscriptions(userId, email, name) {
    const customer = await this.getOrCreateCustomer(userId, email, name);
    const { data } = await stripe().subscriptions.list({ customer: customer.id, expand: ['data.latest_invoice'] });
    return data;
  }

  // ── One-time payment intent ───────────────────────────────────────────

  async createPaymentIntent(amountCents, currency = 'usd', userId, email, name, meta = {}) {
    const customer = await this.getOrCreateCustomer(userId, email, name);
    const intent = await stripe().paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customer.id,
      payment_method_types: ['card', 'us_bank_account', 'sepa_debit', 'cashapp'],
      metadata: { nexusUserId: userId, ...meta },
    });
    return { clientSecret: intent.client_secret };
  }

  // ── Crypto (Stripe Crypto Onramp) ─────────────────────────────────────
  // Requires Stripe onramp beta access. Returns a session for the client widget.

  async createCryptoOnrampSession(walletAddress, currency = 'eth', amountUSD) {
    // Crypto onramp is a Preview API — use `stripe.beta.` namespace
    // Stripe will redirect the user to complete the crypto purchase
    const session = await stripe().crypto.onrampSessions.create({
      transaction_details: {
        destination_currency: currency,
        destination_network: currency === 'eth' ? 'ethereum' : 'bitcoin',
        wallet_addresses: { [currency === 'eth' ? 'ethereum' : 'bitcoin']: walletAddress },
      },
      customer_ip_address: '0.0.0.0', // Pass real IP in handler
    });
    return { clientSecret: session.client_secret, id: session.id };
  }

  // ── Gift cards / Promo codes ──────────────────────────────────────────

  /** Create a gift code (called by admin). Returns the plain-text code once. */
  createGiftCode(valueUSD, currency = 'usd', adminUserId) {
    const code = crypto.randomBytes(12).toString('base64url').toUpperCase();
    _giftCodes.set(code, {
      value: valueUSD,
      currency,
      redeemed: false,
      createdBy: adminUserId,
      createdAt: new Date().toISOString(),
    });
    return { code, valueUSD, currency };
  }

  async redeemGiftCode(code, userId, email, name) {
    const entry = _giftCodes.get(code);
    if (!entry) throw new Error('Gift code not found');
    if (entry.redeemed) throw new Error('Gift code already redeemed');

    const customer = await this.getOrCreateCustomer(userId, email, name);
    // Apply as a Stripe customer balance credit
    await stripe().customers.createBalanceTransaction(customer.id, {
      amount: -Math.round(entry.value * 100), // negative = credit
      currency: entry.currency,
      description: `Gift code redemption: ${code}`,
    });

    entry.redeemed = true;
    entry.redeemedBy = userId;
    entry.redeemedAt = new Date().toISOString();
    _giftCodes.set(code, entry);
    return { success: true, creditApplied: entry.value };
  }

  // ── Stripe coupon (Stripe promo codes) ────────────────────────────────

  async _resolveCoupon(code, userId) {
    // Check if it's a gift code first
    if (_giftCodes.has(code) && !_giftCodes.get(code).redeemed) {
      // Handled separately above; return null so no Stripe coupon is applied
      return null;
    }
    try {
      const promo = await stripe().promotionCodes.list({ code, active: true, limit: 1 });
      if (promo.data.length) return promo.data[0].coupon.id;
    } catch {
      // ignore
    }
    return null;
  }

  // ── Webhooks ──────────────────────────────────────────────────────────

  /**
   * Verify and parse a Stripe webhook event.
   * rawBody must be the raw Buffer from express.raw().
   */
  parseWebhook(rawBody, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    return stripe().webhooks.constructEvent(rawBody, signature, secret);
  }

  /** Handle Stripe subscription lifecycle events */
  async handleWebhookEvent(event) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return { action: 'sync_subscription', data: event.data.object };
      case 'customer.subscription.deleted':
        return { action: 'cancel_subscription', data: event.data.object };
      case 'invoice.payment_succeeded':
        return { action: 'payment_success', data: event.data.object };
      case 'invoice.payment_failed':
        return { action: 'payment_failed', data: event.data.object };
      default:
        return { action: 'unhandled', type: event.type };
    }
  }

  // ── Billing portal ────────────────────────────────────────────────────

  async createPortalSession(userId, email, name, returnUrl) {
    const customer = await this.getOrCreateCustomer(userId, email, name);
    const session = await stripe().billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl || process.env.APP_URL || 'http://localhost:3001',
    });
    return { url: session.url };
  }
}

export default PaymentService;
