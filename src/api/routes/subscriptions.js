// ================================================
// NEXUS AI PRO - Subscription & Payment Routes
// Copyright © 2026 Cameron Fox. All rights reserved.
// Date: 2026-08-13
// ================================================

/**
 * All Stripe credentials are read exclusively from environment variables:
 *   process.env.STRIPE_SECRET_KEY
 *   process.env.STRIPE_WEBHOOK_SECRET
 *
 * The publishable key is served to the client via GET /api/config (in server.js),
 * never embedded here.
 */

import express from 'express';
import { z } from 'zod';

const router = express.Router();

// ─── Lazy-load stripe so the module is usable even if stripe isn't installed
// ─── until production configuration is complete. ────────────────────────────

let _stripe = null;
function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  // Dynamic import to avoid startup crash when package is absent
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    _stripe = typeof Stripe === 'function' ? Stripe(key) : Stripe.default(key);
    return _stripe;
  } catch {
    throw new Error('stripe package is not installed. Run: npm install stripe');
  }
}

// ─── Tier configuration (mirrors front-end TIERS) ────────────────────────────

const TIER_CONFIG = {
  free: {
    name: 'Free',
    amount: 0,
    currency: 'usd',
    stripePriceId: null,
  },
  pro: {
    name: 'Pro',
    amount: 999,          // cents
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO || 'price_pro_monthly',
  },
  enterprise: {
    name: 'Enterprise',
    amount: 1499,         // cents
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_monthly',
  },
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const TierSchema = z.enum(['free', 'pro', 'enterprise']);

const CheckoutSchema = z.object({
  tier:            TierSchema,
  successUrl:      z.string().url().optional(),
  cancelUrl:       z.string().url().optional(),
  cardName:        z.string().max(120).optional(),
  couponCode:      z.string().max(64).optional(),
});

const CancelSchema = z.object({
  reason:          z.string().max(500).optional(),
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

const GiftRedeemSchema = z.object({
  code: z
    .string()
    .min(8)
    .max(32)
    .regex(/^[A-Z0-9\-]+$/, 'Gift card code must contain only uppercase letters, numbers, and hyphens'),
});

const CryptoPaymentSchema = z.object({
  tier:     TierSchema,
  currency: z.enum(['btc', 'eth', 'usdc', 'sol', 'ltc']),
  txHash:   z
    .string()
    .min(10)
    .max(128)
    .regex(/^[a-fA-F0-9x]+$/, 'Transaction hash must be a valid hex string'),
});

const UpgradeDowngradeSchema = z.object({
  tier: TierSchema,
});

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Parse and validate a Zod schema from req.body.
 * On failure, responds 400 with structured error list.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map(e => ({
          field:   e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.validated = result.data;
    return next();
  };
}

/**
 * Minimal auth guard — expects a userId on req (set by your auth middleware).
 * Replace or extend to match your session / JWT strategy.
 */
function requireAuth(req, res, next) {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = userId;
  return next();
}

/**
 * Central error handler for route async functions.
 */
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Route helpers ────────────────────────────────────────────────────────────

/**
 * Retrieve the stored Stripe customer ID for the authenticated user.
 * In production this queries your database; this stub returns a placeholder
 * so routes remain functional during development.
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getStripeCustomerId(userId) {
  // TODO: replace with a real DB query, e.g.:
  // const user = await db.users.findById(userId);
  // return user?.stripeCustomerId ?? null;
  return null;
}

/**
 * Persist a Stripe customer ID for a user.
 *
 * @param {string} userId
 * @param {string} customerId
 */
async function saveStripeCustomerId(userId, _customerId) {
  // TODO: await db.users.update({ stripeCustomerId: customerId }, { where: { id: userId } });
  void userId;
}

/**
 * Persist subscription data after a Stripe event.
 *
 * @param {string} userId
 * @param {object} subscriptionData
 */
async function saveSubscription(userId, subscriptionData) {
  // TODO: await db.subscriptions.upsert({ userId, ...subscriptionData });
  void userId; void subscriptionData;
}

/**
 * Map a Stripe price ID back to one of our tier identifiers.
 *
 * @param {string} priceId
 * @returns {'free'|'pro'|'enterprise'}
 */
function tierFromPriceId(priceId) {
  for (const [key, cfg] of Object.entries(TIER_CONFIG)) {
    if (cfg.stripePriceId === priceId) return key;
  }
  return 'free';
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// ── POST /create-checkout-session ────────────────────────────────────────────
/**
 * Creates a Stripe Checkout session for the given tier.
 * Returns { url } — the client should redirect the browser there.
 */
router.post(
  '/create-checkout-session',
  requireAuth,
  validate(CheckoutSchema),
  asyncRoute(async (req, res) => {
    const { tier, successUrl, cancelUrl, couponCode } = req.validated;
    const tierCfg = TIER_CONFIG[tier];

    if (!tierCfg.stripePriceId) {
      return res.status(400).json({ error: 'The Free tier does not require a payment session.' });
    }

    const stripe     = getStripe();
    const baseUrl    = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    let customerId   = await getStripeCustomerId(req.userId);

    // Create a Stripe customer on first payment
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { nexusUserId: req.userId },
      });
      customerId = customer.id;
      await saveStripeCustomerId(req.userId, customerId);
    }

    const sessionParams = {
      customer:              customerId,
      mode:                  'subscription',
      payment_method_types:  ['card'],
      line_items: [{
        price:    tierCfg.stripePriceId,
        quantity: 1,
      }],
      success_url: successUrl || `${baseUrl}/subscription?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url:  cancelUrl  || `${baseUrl}/subscription?status=cancelled`,
      metadata: {
        nexusUserId: req.userId,
        tier,
      },
      subscription_data: {
        metadata: { nexusUserId: req.userId, tier },
      },
    };

    if (couponCode) {
      sessionParams.discounts = [{ coupon: couponCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url, sessionId: session.id });
  }),
);

// ── POST /webhook ─────────────────────────────────────────────────────────────
/**
 * Stripe webhook endpoint.
 * Requires raw body — mount BEFORE express.json() in your server, or use
 * express.raw() on this path specifically.
 *
 * Handles:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_failed
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  asyncRoute(async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Subscriptions] STRIPE_WEBHOOK_SECRET is not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('[Subscriptions] Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    console.log(`[Subscriptions] Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.nexusUserId;
        const tier    = session.metadata?.tier;
        if (userId && tier) {
          await saveSubscription(userId, {
            stripeSubscriptionId: session.subscription,
            stripeCustomerId:     session.customer,
            tier,
            status:               'active',
            activatedAt:          new Date().toISOString(),
          });
          console.log(`[Subscriptions] Activated ${tier} for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object;
        const userId = sub.metadata?.nexusUserId;
        if (userId) {
          const priceId = sub.items?.data?.[0]?.price?.id;
          const tier    = tierFromPriceId(priceId);
          await saveSubscription(userId, {
            stripeSubscriptionId: sub.id,
            tier,
            status:               sub.status,
            currentPeriodEnd:     new Date(sub.current_period_end * 1000).toISOString(),
          });
          console.log(`[Subscriptions] Updated subscription for user ${userId}: ${tier} (${sub.status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object;
        const userId = sub.metadata?.nexusUserId;
        if (userId) {
          await saveSubscription(userId, {
            stripeSubscriptionId: sub.id,
            tier:                 'free',
            status:               'cancelled',
            cancelledAt:          new Date().toISOString(),
          });
          console.log(`[Subscriptions] Cancelled subscription for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userId  = invoice.subscription_details?.metadata?.nexusUserId;
        if (userId) {
          // TODO: notify the user via email / in-app notification
          console.warn(`[Subscriptions] Payment failed for user ${userId}, invoice ${invoice.id}`);
        }
        break;
      }

      default:
        // Unhandled event type — ignore gracefully
        break;
    }

    return res.json({ received: true });
  }),
);

// ── GET /subscription ─────────────────────────────────────────────────────────
/**
 * Returns the current subscription for the authenticated user.
 */
router.get(
  '/subscription',
  requireAuth,
  asyncRoute(async (req, res) => {
    // TODO: fetch from database
    // const record = await db.subscriptions.findOne({ where: { userId: req.userId } });
    const record = null; // stub

    if (!record) {
      return res.json({
        tier:        'free',
        status:      'active',
        renewalDate: null,
        features:    [],
      });
    }

    return res.json({
      tier:                 record.tier,
      status:               record.status,
      renewalDate:          record.currentPeriodEnd,
      stripeSubscriptionId: record.stripeSubscriptionId,
    });
  }),
);

// ── POST /cancel ──────────────────────────────────────────────────────────────
/**
 * Cancels the user's active Stripe subscription.
 * By default cancels at the end of the billing period (cancelAtPeriodEnd=true).
 */
router.post(
  '/cancel',
  requireAuth,
  validate(CancelSchema),
  asyncRoute(async (req, res) => {
    const { reason, cancelAtPeriodEnd } = req.validated;

    // TODO: fetch stripeSubscriptionId from database
    // const record = await db.subscriptions.findOne({ where: { userId: req.userId } });
    const record = null; // stub

    if (!record?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }

    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(record.stripeSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
      metadata:             { cancellationReason: reason || '' },
    });

    const periodEnd = new Date(updated.current_period_end * 1000);

    return res.json({
      success:    true,
      message:    cancelAtPeriodEnd
        ? `Subscription cancelled. You retain access until ${periodEnd.toLocaleDateString()}.`
        : 'Subscription cancelled immediately.',
      accessUntil: periodEnd.toISOString(),
    });
  }),
);

// ── POST /redeem-gift ─────────────────────────────────────────────────────────
/**
 * Redeems a gift card code and activates or extends a subscription.
 */
router.post(
  '/redeem-gift',
  requireAuth,
  validate(GiftRedeemSchema),
  asyncRoute(async (req, res) => {
    const { code } = req.validated;

    // TODO: look up the gift card in your database
    // const giftCard = await db.giftCards.findOne({ where: { code, redeemedAt: null } });
    const giftCard = null; // stub

    if (!giftCard) {
      return res.status(400).json({ error: 'Invalid or already-redeemed gift card code.' });
    }

    // TODO: mark as redeemed and activate the associated tier
    // await db.giftCards.update({ redeemedAt: new Date(), redeemedBy: req.userId }, { where: { code } });
    // await saveSubscription(req.userId, { tier: giftCard.tier, status: 'active', ... });

    return res.json({
      success: true,
      message: `Gift card redeemed! Your ${giftCard.tier} plan is now active.`,
      tier:    giftCard.tier,
    });
  }),
);

// ── POST /crypto-payment ──────────────────────────────────────────────────────
/**
 * Records a crypto payment intent for manual or automated verification.
 * The transaction hash is stored pending on-chain confirmation.
 */
router.post(
  '/crypto-payment',
  requireAuth,
  validate(CryptoPaymentSchema),
  asyncRoute(async (req, res) => {
    const { tier, currency, txHash } = req.validated;
    const tierCfg = TIER_CONFIG[tier];

    // Validate currency wallet is configured
    const envKeyMap = {
      btc:  'BTC_WALLET_ADDRESS',
      eth:  'ETH_WALLET_ADDRESS',
      usdc: 'USDC_WALLET_ADDRESS',
      sol:  'SOL_WALLET_ADDRESS',
      ltc:  'LTC_WALLET_ADDRESS',
    };
    const walletAddress = process.env[envKeyMap[currency]];
    if (!walletAddress) {
      return res.status(400).json({
        error: `${currency.toUpperCase()} wallet address is not configured. Please contact support.`,
      });
    }

    // TODO: persist the payment record to your database
    // await db.cryptoPayments.create({
    //   userId:        req.userId,
    //   tier,
    //   currency,
    //   txHash,
    //   amountUsd:     tierCfg.amount / 100,
    //   walletAddress,
    //   status:        'pending',
    //   createdAt:     new Date(),
    // });

    // TODO: optionally enqueue a background job to poll the blockchain for confirmation
    // await cryptoVerificationQueue.add({ userId: req.userId, currency, txHash, tier });

    console.log(
      `[Subscriptions] Crypto payment submitted: user=${req.userId} tier=${tier} ` +
      `currency=${currency.toUpperCase()} txHash=${txHash}`,
    );

    return res.json({
      success: true,
      message: `Your ${currency.toUpperCase()} payment for the ${tierCfg.name} plan has been submitted for verification. ` +
               `Activation typically takes 1-3 block confirmations.`,
      status:  'pending',
    });
  }),
);

// ── GET /billing-history ──────────────────────────────────────────────────────
/**
 * Returns a list of past invoices from Stripe for the authenticated user.
 */
router.get(
  '/billing-history',
  requireAuth,
  asyncRoute(async (req, res) => {
    const customerId = await getStripeCustomerId(req.userId);
    if (!customerId) {
      return res.json({ invoices: [] });
    }

    const stripe   = getStripe();
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit:    50,
    });

    const formatted = invoices.data.map(inv => ({
      id:          inv.id,
      date:        inv.created * 1000,           // ms timestamp
      description: inv.lines?.data?.[0]?.description || inv.description || 'Nexus AI Pro subscription',
      amount:      inv.amount_paid,              // cents
      currency:    inv.currency,
      status:      inv.status,
      invoicePdf:  inv.invoice_pdf,
      hostedUrl:   inv.hosted_invoice_url,
    }));

    return res.json({ invoices: formatted });
  }),
);

// ── GET /payment-methods ──────────────────────────────────────────────────────
/**
 * Returns saved payment methods for the authenticated user.
 */
router.get(
  '/payment-methods',
  requireAuth,
  asyncRoute(async (req, res) => {
    const customerId = await getStripeCustomerId(req.userId);
    if (!customerId) {
      return res.json({ methods: [] });
    }

    const stripe  = getStripe();
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type:     'card',
    });

    // Retrieve the default payment method from the customer object
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPmId = customer.invoice_settings?.default_payment_method;

    const formatted = methods.data.map(pm => ({
      id:        pm.id,
      brand:     pm.card.brand,
      last4:     pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year:  pm.card.exp_year,
      isDefault: pm.id === defaultPmId,
    }));

    return res.json({ methods: formatted });
  }),
);

// ── DELETE /payment-methods/:methodId ─────────────────────────────────────────
/**
 * Detaches (removes) a saved payment method.
 */
router.delete(
  '/payment-methods/:methodId',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { methodId } = req.params;

    const idSchema = z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID');
    const parsed   = idSchema.safeParse(methodId);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payment method ID format.' });
    }

    const stripe = getStripe();

    // Verify the payment method belongs to the authenticated user's customer
    const customerId = await getStripeCustomerId(req.userId);
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer associated with this account.' });
    }

    const pm = await stripe.paymentMethods.retrieve(methodId);
    if (pm.customer !== customerId) {
      return res.status(403).json({ error: 'Payment method does not belong to your account.' });
    }

    await stripe.paymentMethods.detach(methodId);
    return res.json({ success: true, message: 'Payment method removed.' });
  }),
);

// ── POST /upgrade-downgrade ───────────────────────────────────────────────────
/**
 * Immediately switches the user's subscription to a new tier
 * by updating the Stripe subscription's price item.
 */
router.post(
  '/upgrade-downgrade',
  requireAuth,
  validate(UpgradeDowngradeSchema),
  asyncRoute(async (req, res) => {
    const { tier } = req.validated;
    const tierCfg  = TIER_CONFIG[tier];

    // TODO: fetch stripeSubscriptionId from database
    // const record = await db.subscriptions.findOne({ where: { userId: req.userId } });
    const record = null; // stub

    if (!record?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to modify. Please subscribe first.' });
    }

    if (!tierCfg.stripePriceId) {
      // Downgrading to Free — cancel subscription
      const stripe  = getStripe();
      await stripe.subscriptions.cancel(record.stripeSubscriptionId);
      await saveSubscription(req.userId, { tier: 'free', status: 'cancelled' });
      return res.json({ success: true, message: 'Subscription downgraded to Free plan.', tier: 'free' });
    }

    const stripe = getStripe();
    const sub    = await stripe.subscriptions.retrieve(record.stripeSubscriptionId);
    const itemId = sub.items.data[0].id;

    await stripe.subscriptions.update(record.stripeSubscriptionId, {
      items: [{ id: itemId, price: tierCfg.stripePriceId }],
      proration_behavior: 'always_invoice',
      metadata: { tier },
    });

    await saveSubscription(req.userId, { tier, status: 'active' });

    return res.json({
      success: true,
      message: `Subscription updated to ${tierCfg.name}.`,
      tier,
    });
  }),
);

// ─── Express error handler (catches anything thrown in asyncRoute) ─────────────

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;

  // Stripe errors have a 'type' field
  if (err.type?.startsWith('Stripe')) {
    console.error('[Subscriptions] Stripe error:', err.message);
    return res.status(402).json({
      error: 'Payment provider error',
      detail: err.message,
    });
  }

  console.error('[Subscriptions] Unhandled error:', err);
  return res.status(status).json({
    error: status >= 500 ? 'An unexpected error occurred. Please try again.' : err.message,
  });
});

export default router;
