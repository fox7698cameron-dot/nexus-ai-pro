// /home/user/nexus-ai-pro/src/routes/payments.routes.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import { Router } from 'express';
import express from 'express';
import { z } from 'zod';

import {
  PLANS,
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
  listInvoices,
  redeemGiftCode,
  handleWebhook,
  requirePlan
} from '../lib/payments.js';

import { authenticate } from './auth.routes.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a Zod schema against `data`.
 * On failure, sends a 400 response with structured error details.
 * Returns { ok: true, data } on success or { ok: false } on failure.
 *
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} data
 * @param {import('express').Response} res
 * @returns {{ ok: true, data: T } | { ok: false }}
 */
function parseZod(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error:   'Invalid input',
      details: result.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message
      }))
    });
    return { ok: false };
  }
  return { ok: true, data: result.data };
}

/**
 * Wraps an async route handler to forward unexpected errors to Express.
 * @param {import('express').RequestHandler} fn
 * @returns {import('express').RequestHandler}
 */
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const checkoutBodySchema = z.object({
  planId:        z.enum(['pro', 'enterprise']),
  successUrl:    z.string().url(),
  cancelUrl:     z.string().url(),
  promoCode:     z.string().max(64).optional(),
  cryptoEnabled: z.boolean().optional().default(false)
});

const cancelBodySchema = z.object({
  subscriptionId: z.string().min(1),
  immediately:    z.boolean().optional().default(false)
});

const invoicesQuerySchema = z.object({
  limit:         z.coerce.number().int().min(1).max(100).optional().default(20),
  startingAfter: z.string().optional()
});

const giftCodeBodySchema = z.object({
  code: z.string().min(1).max(64)
});

// ─── POST /api/payments/checkout ─────────────────────────────────────────────
// Creates a Stripe Checkout session for the authenticated user.
// Supports all major cards (Visa/MC/Amex/Discover), debit, crypto, promo codes.

router.post(
  '/checkout',
  authenticate,
  asyncRoute(async (req, res) => {
    const parsed = parseZod(checkoutBodySchema, req.body, res);
    if (!parsed.ok) return;

    const { planId, successUrl, cancelUrl, promoCode, cryptoEnabled } = parsed.data;
    const user = req.auth;

    const session = await createCheckoutSession({
      planId,
      userId:  user.sub,
      email:   user.eml,
      successUrl,
      cancelUrl,
      promoCode,
      cryptoEnabled
    });

    return res.status(201).json({
      sessionId:   session.id,
      sessionUrl:  session.url,
      plan:        PLANS[planId]
    });
  })
);

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Stripe webhook endpoint — requires raw body (NOT parsed JSON).
// Mount this BEFORE any global express.json() middleware, or configure the
// router to use express.raw() only for this path (done below via router-level
// middleware applied per-route with a special mount pattern in server.js).
//
// When registering this router in server.js, ensure the /webhook route receives
// the raw buffer, e.g.:
//   app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter)
// This file exports the rawBodyMiddleware helper for that purpose.

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  asyncRoute(async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let result;
    try {
      // Extend callbacks here to persist subscription state to your database.
      result = await handleWebhook(req.body, signature, {
        onPaymentSucceeded:    (data) => { /* TODO: update payment records */ },
        onSubscriptionCreated: (data) => { /* TODO: activate subscription in DB */ },
        onSubscriptionUpdated: (data) => { /* TODO: sync subscription status in DB */ },
        onSubscriptionDeleted: (data) => { /* TODO: downgrade user to free tier */ },
        onInvoicePaid:         (data) => { /* TODO: send receipt email */ },
        onInvoicePaymentFailed:(data) => { /* TODO: send dunning email */ }
      });
    } catch (err) {
      // Stripe signature mismatch or malformed event
      return res.status(400).json({ error: err.message });
    }

    return res.status(200).json({ received: true, handled: result.handled, type: result.event.type });
  })
);

// ─── GET /api/payments/subscription ──────────────────────────────────────────
// Returns the current subscription status for the authenticated user.

router.get(
  '/subscription',
  authenticate,
  asyncRoute(async (req, res) => {
    const user   = req.auth;
    const status = await getSubscriptionStatus(user.sub, user.eml);

    return res.status(200).json({
      plan:              status.plan,
      status:            status.status,
      paymentMethod:     status.paymentMethod,
      currentPeriodEnd:  status.currentPeriodEnd,
      cancelAtPeriodEnd: status.cancelAtPeriodEnd,
      planDetails:       PLANS[status.plan] ?? PLANS.free,
      customerId:        status.customer?.id ?? null,
      subscriptionId:    status.subscription?.id ?? null
    });
  })
);

// ─── POST /api/payments/cancel ────────────────────────────────────────────────
// Cancels the current subscription (at period end by default).

router.post(
  '/cancel',
  authenticate,
  asyncRoute(async (req, res) => {
    const parsed = parseZod(cancelBodySchema, req.body, res);
    if (!parsed.ok) return;

    const { subscriptionId, immediately } = parsed.data;
    const user = req.auth;

    const updated = await cancelSubscription({
      subscriptionId,
      userId:      user.sub,
      immediately
    });

    const message = immediately
      ? 'Subscription cancelled immediately.'
      : 'Subscription will cancel at the end of the current billing period.';

    return res.status(200).json({
      message,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      status:            updated.status
    });
  })
);

// ─── GET /api/payments/invoices ───────────────────────────────────────────────
// Lists invoices for the authenticated user.

router.get(
  '/invoices',
  authenticate,
  asyncRoute(async (req, res) => {
    const parsed = parseZod(invoicesQuerySchema, req.query, res);
    if (!parsed.ok) return;

    const { limit, startingAfter } = parsed.data;

    // We need the Stripe customer ID; derive it from subscription status.
    const subStatus = await getSubscriptionStatus(req.auth.sub, req.auth.eml);

    if (!subStatus.customer) {
      return res.status(200).json({ invoices: [], hasMore: false });
    }

    const result = await listInvoices(subStatus.customer.id, { limit, startingAfter });

    const invoices = result.data.map((inv) => ({
      id:           inv.id,
      number:       inv.number,
      status:       inv.status,
      amountPaid:   inv.amount_paid,
      amountDue:    inv.amount_due,
      currency:     inv.currency,
      created:      new Date(inv.created * 1000).toISOString(),
      periodStart:  new Date(inv.period_start * 1000).toISOString(),
      periodEnd:    new Date(inv.period_end   * 1000).toISOString(),
      hostedUrl:    inv.hosted_invoice_url,
      pdfUrl:       inv.invoice_pdf
    }));

    return res.status(200).json({ invoices, hasMore: result.has_more });
  })
);

// ─── POST /api/payments/gift-code ─────────────────────────────────────────────
// Redeems a gift card or promo code for the authenticated user.

router.post(
  '/gift-code',
  authenticate,
  asyncRoute(async (req, res) => {
    const parsed = parseZod(giftCodeBodySchema, req.body, res);
    if (!parsed.ok) return;

    const { code } = parsed.data;

    // Get the Stripe customer ID.
    const subStatus = await getSubscriptionStatus(req.auth.sub, req.auth.eml);

    if (!subStatus.customer) {
      return res.status(400).json({
        error: 'No billing account found. Please start a subscription first.'
      });
    }

    const result = await redeemGiftCode({
      code,
      userId:     req.auth.sub,
      customerId: subStatus.customer.id
    });

    if (!result.applied) {
      return res.status(422).json({ error: result.message });
    }

    return res.status(200).json({
      message: result.message,
      applied: result.applied
    });
  })
);

// ─── Export ───────────────────────────────────────────────────────────────────

export { requirePlan };
export default router;
