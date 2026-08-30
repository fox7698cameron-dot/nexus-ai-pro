/**
 * @file PaymentService.js
 * @description Comprehensive payment service for Nexus AI Pro. Supports Stripe (cards,
 *   subscriptions, webhooks, 3DS), cryptocurrency (BTC, ETH, USDC, USDT, SOL),
 *   gift cards, invoices, refunds, and multi-currency operations.
 *
 *   PCI DSS NOTICE: Raw card numbers, CVVs, and full PANs are NEVER logged,
 *   stored, or transmitted through this service. All card data is tokenized
 *   by Stripe.js / Stripe Elements on the client before reaching this server.
 *
 * @author Cameron Fox <contact@nexusai.pro>
 * @date 2026-08-30
 * @module payments/PaymentService
 */

// ---------------------------------------------------------------------------
// Environment — all secrets come from process.env, never hardcoded
// ---------------------------------------------------------------------------
const STRIPE_SECRET_KEY     = () => process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = () => process.env.STRIPE_WEBHOOK_SECRET;
const EXCHANGE_RATE_ENDPOINT = () =>
  process.env.EXCHANGE_RATE_ENDPOINT || 'https://api.exchangerate-api.com/v4/latest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Supported currencies. */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

/** Supported card networks. */
export const SUPPORTED_CARD_NETWORKS = [
  'visa',
  'mastercard',
  'amex',
  'discover',
  'visa_debit',
  'mastercard_debit',
];

/** Supported cryptocurrencies. */
export const SUPPORTED_CRYPTO = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

/** Subscription tier definitions. */
export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    priceUSD: 0,
    interval: null,
    stripePriceId: null,
    features: ['Basic AI access', '10 messages/day'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUSD: 9.99,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features: ['Unlimited AI access', 'Multi-model support', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceUSD: 14.99,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: ['All Pro features', 'Team management', 'Custom integrations', 'SLA'],
  },
};

/** Payment error codes. */
export const PAYMENT_ERROR_CODES = {
  INVALID_AMOUNT:           'PAYMENT_ERR_001',
  INVALID_CURRENCY:         'PAYMENT_ERR_002',
  STRIPE_INIT_FAILED:       'PAYMENT_ERR_003',
  PAYMENT_INTENT_FAILED:    'PAYMENT_ERR_004',
  SUBSCRIPTION_FAILED:      'PAYMENT_ERR_005',
  WEBHOOK_SIGNATURE_FAILED: 'PAYMENT_ERR_006',
  CRYPTO_ADDRESS_FAILED:    'PAYMENT_ERR_007',
  CRYPTO_VERIFY_FAILED:     'PAYMENT_ERR_008',
  GIFT_CARD_INVALID:        'PAYMENT_ERR_009',
  GIFT_CARD_INSUFFICIENT:   'PAYMENT_ERR_010',
  GIFT_CARD_REDEEMED:       'PAYMENT_ERR_011',
  REFUND_FAILED:            'PAYMENT_ERR_012',
  CUSTOMER_CREATE_FAILED:   'PAYMENT_ERR_013',
  INVOICE_FAILED:           'PAYMENT_ERR_014',
  UNSUPPORTED_CRYPTO:       'PAYMENT_ERR_015',
  EXCHANGE_RATE_FAILED:     'PAYMENT_ERR_016',
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Creates a payment-specific error with a structured code.
 * @param {string} code - One of PAYMENT_ERROR_CODES values.
 * @param {string} message - Human-readable message.
 * @param {unknown} [cause] - Underlying error.
 * @returns {Error}
 */
function paymentError(code, message, cause) {
  const err = new Error(message);
  err.code = code;
  err.isPaymentError = true;
  if (cause) err.cause = cause;
  return err;
}

/**
 * Audit log helper. Never logs raw card data.
 * @param {string} event - Event name.
 * @param {Record<string, unknown>} data - Safe, non-PCI metadata.
 */
function auditLog(event, data) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    // Strip any accidental PCI fields before logging
    data: sanitizeForAudit(data),
  };
  // In production, pipe to your SIEM / audit log aggregator
  console.log('[AUDIT]', JSON.stringify(entry));
}

/**
 * Removes PCI-sensitive fields from an object before audit logging.
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function sanitizeForAudit(obj) {
  const forbidden = new Set([
    'card_number', 'cardNumber', 'pan', 'cvv', 'cvc', 'cvc2',
    'expiry', 'expiration', 'exp_month', 'exp_year',
    'card', 'raw_card', 'rawCard',
  ]);
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !forbidden.has(k))
  );
}

/**
 * Validates that amount is a positive integer (cents).
 * @param {number} amount
 */
function validateAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw paymentError(
      PAYMENT_ERROR_CODES.INVALID_AMOUNT,
      `Invalid amount: ${amount}. Must be a positive integer (smallest currency unit).`
    );
  }
}

/**
 * Validates currency against the supported list.
 * @param {string} currency
 */
function validateCurrency(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency?.toUpperCase())) {
    throw paymentError(
      PAYMENT_ERROR_CODES.INVALID_CURRENCY,
      `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Stripe lazy loader — avoids import error if stripe package not installed yet
// ---------------------------------------------------------------------------

let _stripe = null;

/**
 * Returns a lazily-initialised Stripe client.
 * @returns {import('stripe').Stripe}
 */
function getStripe() {
  if (_stripe) return _stripe;
  const key = STRIPE_SECRET_KEY();
  if (!key) {
    throw paymentError(
      PAYMENT_ERROR_CODES.STRIPE_INIT_FAILED,
      'STRIPE_SECRET_KEY environment variable is not set.'
    );
  }
  try {
    // Dynamic import keeps the module loadable even before `stripe` is installed
    const { default: Stripe } = await import('stripe').catch(() => {
      throw new Error('stripe package not installed. Run: npm install stripe');
    });
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    return _stripe;
  } catch (err) {
    throw paymentError(PAYMENT_ERROR_CODES.STRIPE_INIT_FAILED, err.message, err);
  }
}

// Synchronous wrapper (requires stripe to already be initialised or throws)
function stripeSync() {
  if (!_stripe) {
    const key = STRIPE_SECRET_KEY();
    if (!key) {
      throw paymentError(
        PAYMENT_ERROR_CODES.STRIPE_INIT_FAILED,
        'STRIPE_SECRET_KEY environment variable is not set.'
      );
    }
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Stripe: Customer management
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Customer record.
 * @param {object} opts
 * @param {string} opts.email
 * @param {string} [opts.name]
 * @param {Record<string, string>} [opts.metadata]
 * @returns {Promise<import('stripe').Stripe.Customer>}
 */
export async function createStripeCustomer({ email, name, metadata = {} }) {
  const stripe = await initStripe();
  try {
    const customer = await stripe.customers.create({ email, name, metadata });
    auditLog('stripe.customer.created', { customerId: customer.id, email });
    return customer;
  } catch (err) {
    auditLog('stripe.customer.create.failed', { email, error: err.message });
    throw paymentError(PAYMENT_ERROR_CODES.CUSTOMER_CREATE_FAILED, err.message, err);
  }
}

/**
 * Retrieves a Stripe Customer by ID.
 * @param {string} customerId
 * @returns {Promise<import('stripe').Stripe.Customer>}
 */
export async function getStripeCustomer(customerId) {
  const stripe = await initStripe();
  return stripe.customers.retrieve(customerId);
}

/**
 * Updates metadata on a Stripe Customer.
 * @param {string} customerId
 * @param {Record<string, string>} metadata
 * @returns {Promise<import('stripe').Stripe.Customer>}
 */
export async function updateStripeCustomer(customerId, metadata) {
  const stripe = await initStripe();
  const customer = await stripe.customers.update(customerId, { metadata });
  auditLog('stripe.customer.updated', { customerId });
  return customer;
}

// ---------------------------------------------------------------------------
// Stripe: Payment Intents
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe PaymentIntent.
 *
 * Supports 3D Secure automatically — Stripe will trigger 3DS when required
 * by the card issuer or when `payment_method_options.card.request_three_d_secure`
 * is set to 'automatic' (the default).
 *
 * @param {object} opts
 * @param {number}  opts.amount          - Amount in smallest currency unit (e.g. cents).
 * @param {string}  opts.currency        - ISO 4217 currency code (e.g. 'usd').
 * @param {string}  [opts.customerId]    - Stripe Customer ID.
 * @param {string}  [opts.paymentMethod] - Stripe PaymentMethod ID.
 * @param {Record<string, string>} [opts.metadata]
 * @param {boolean} [opts.confirm]       - Confirm immediately (requires paymentMethod).
 * @param {string}  [opts.returnUrl]     - Required when confirm=true for 3DS redirect.
 * @param {'automatic'|'any'|'challenge'} [opts.threeDSecure='automatic']
 * @returns {Promise<import('stripe').Stripe.PaymentIntent>}
 */
export async function createPaymentIntent({
  amount,
  currency,
  customerId,
  paymentMethod,
  metadata = {},
  confirm = false,
  returnUrl,
  threeDSecure = 'automatic',
}) {
  validateAmount(amount);
  validateCurrency(currency);

  const stripe = await initStripe();

  const params = {
    amount,
    currency: currency.toLowerCase(),
    // Accepted card networks (Stripe filters at the payment method level)
    payment_method_types: ['card'],
    metadata,
    payment_method_options: {
      card: {
        request_three_d_secure: threeDSecure,
      },
    },
  };

  if (customerId)    params.customer = customerId;
  if (paymentMethod) params.payment_method = paymentMethod;
  if (confirm)       params.confirm = true;
  if (returnUrl)     params.return_url = returnUrl;

  try {
    const intent = await stripe.paymentIntents.create(params);
    auditLog('stripe.payment_intent.created', {
      intentId: intent.id,
      amount,
      currency,
      customerId,
      status: intent.status,
    });
    return intent;
  } catch (err) {
    auditLog('stripe.payment_intent.failed', { amount, currency, error: err.message });
    throw paymentError(PAYMENT_ERROR_CODES.PAYMENT_INTENT_FAILED, err.message, err);
  }
}

/**
 * Confirms an existing PaymentIntent.
 * @param {string} paymentIntentId
 * @param {string} paymentMethodId
 * @param {string} [returnUrl] - Required for 3DS redirects.
 * @returns {Promise<import('stripe').Stripe.PaymentIntent>}
 */
export async function confirmPaymentIntent(paymentIntentId, paymentMethodId, returnUrl) {
  const stripe = await initStripe();
  const params = { payment_method: paymentMethodId };
  if (returnUrl) params.return_url = returnUrl;

  const intent = await stripe.paymentIntents.confirm(paymentIntentId, params);
  auditLog('stripe.payment_intent.confirmed', {
    intentId: paymentIntentId,
    status: intent.status,
  });
  return intent;
}

// ---------------------------------------------------------------------------
// Stripe: Subscriptions
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Subscription for a customer.
 *
 * @param {object} opts
 * @param {string} opts.customerId    - Stripe Customer ID.
 * @param {string} opts.tierId        - One of 'pro' | 'enterprise'.
 * @param {string} [opts.paymentMethodId] - Payment method to attach & use.
 * @param {Record<string, string>} [opts.metadata]
 * @param {number} [opts.trialDays]   - Number of trial days (0 = no trial).
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
export async function createSubscription({
  customerId,
  tierId,
  paymentMethodId,
  metadata = {},
  trialDays = 0,
}) {
  const tier = SUBSCRIPTION_TIERS[tierId];
  if (!tier || tier.id === 'free') {
    throw paymentError(
      PAYMENT_ERROR_CODES.SUBSCRIPTION_FAILED,
      `Invalid subscription tier: ${tierId}. Choose 'pro' or 'enterprise'.`
    );
  }
  if (!tier.stripePriceId) {
    throw paymentError(
      PAYMENT_ERROR_CODES.SUBSCRIPTION_FAILED,
      `Stripe Price ID not configured for tier '${tierId}'. Set STRIPE_PRICE_${tierId.toUpperCase()}.`
    );
  }

  const stripe = await initStripe();

  // Attach & set default payment method before creating subscription
  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  const subParams = {
    customer: customerId,
    items: [{ price: tier.stripePriceId }],
    metadata,
    expand: ['latest_invoice.payment_intent'],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
  };

  if (trialDays > 0) {
    subParams.trial_period_days = trialDays;
  }

  try {
    const subscription = await stripe.subscriptions.create(subParams);
    auditLog('stripe.subscription.created', {
      subscriptionId: subscription.id,
      customerId,
      tierId,
      status: subscription.status,
    });
    return subscription;
  } catch (err) {
    auditLog('stripe.subscription.failed', { customerId, tierId, error: err.message });
    throw paymentError(PAYMENT_ERROR_CODES.SUBSCRIPTION_FAILED, err.message, err);
  }
}

/**
 * Cancels a Stripe Subscription (at period end by default).
 * @param {string} subscriptionId
 * @param {boolean} [immediately=false]
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
export async function cancelSubscription(subscriptionId, immediately = false) {
  const stripe = await initStripe();
  const sub = immediately
    ? await stripe.subscriptions.cancel(subscriptionId)
    : await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  auditLog('stripe.subscription.cancelled', { subscriptionId, immediately });
  return sub;
}

/**
 * Changes a subscription's tier.
 * @param {string} subscriptionId
 * @param {string} newTierId
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
export async function changeTier(subscriptionId, newTierId) {
  const tier = SUBSCRIPTION_TIERS[newTierId];
  if (!tier || !tier.stripePriceId) {
    throw paymentError(
      PAYMENT_ERROR_CODES.SUBSCRIPTION_FAILED,
      `Invalid or unconfigured tier: ${newTierId}`
    );
  }
  const stripe = await initStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: sub.items.data[0].id, price: tier.stripePriceId }],
    proration_behavior: 'always_invoice',
  });
  auditLog('stripe.subscription.tier_changed', { subscriptionId, newTierId });
  return updated;
}

// ---------------------------------------------------------------------------
// Stripe: Webhooks
// ---------------------------------------------------------------------------

/**
 * Verifies and parses a Stripe webhook event.
 *
 * IMPORTANT: Pass the raw request body (Buffer/string), not parsed JSON.
 *
 * @param {Buffer|string} rawBody   - Raw HTTP request body.
 * @param {string}        signature - Value of the `stripe-signature` header.
 * @returns {import('stripe').Stripe.Event}
 */
export async function verifyWebhook(rawBody, signature) {
  const secret = STRIPE_WEBHOOK_SECRET();
  if (!secret) {
    throw paymentError(
      PAYMENT_ERROR_CODES.WEBHOOK_SIGNATURE_FAILED,
      'STRIPE_WEBHOOK_SECRET environment variable is not set.'
    );
  }
  const stripe = await initStripe();
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    throw paymentError(
      PAYMENT_ERROR_CODES.WEBHOOK_SIGNATURE_FAILED,
      `Webhook signature verification failed: ${err.message}`,
      err
    );
  }
}

/**
 * Handles incoming Stripe webhook events.
 *
 * @param {import('stripe').Stripe.Event} event
 * @param {object} [handlers]              - Optional override handlers keyed by event type.
 * @returns {Promise<{handled: boolean, type: string}>}
 */
export async function handleWebhookEvent(event, handlers = {}) {
  const dispatch = (fn) => (typeof fn === 'function' ? fn(event) : defaultHandle(event));

  switch (event.type) {
    // ---- Payment Intent ----
    case 'payment_intent.succeeded':
      await dispatch(handlers['payment_intent.succeeded']);
      auditLog('webhook.payment_intent.succeeded', {
        intentId: event.data.object.id,
        amount: event.data.object.amount,
        currency: event.data.object.currency,
      });
      break;

    case 'payment_intent.payment_failed':
      await dispatch(handlers['payment_intent.payment_failed']);
      auditLog('webhook.payment_intent.failed', {
        intentId: event.data.object.id,
        lastError: event.data.object.last_payment_error?.code,
      });
      break;

    case 'payment_intent.requires_action':
      await dispatch(handlers['payment_intent.requires_action']);
      auditLog('webhook.payment_intent.requires_action', {
        intentId: event.data.object.id,
      });
      break;

    // ---- Subscription lifecycle ----
    case 'customer.subscription.created':
      await dispatch(handlers['customer.subscription.created']);
      auditLog('webhook.subscription.created', {
        subscriptionId: event.data.object.id,
        customerId: event.data.object.customer,
        status: event.data.object.status,
      });
      break;

    case 'customer.subscription.updated':
      await dispatch(handlers['customer.subscription.updated']);
      auditLog('webhook.subscription.updated', {
        subscriptionId: event.data.object.id,
        status: event.data.object.status,
        cancelAtPeriodEnd: event.data.object.cancel_at_period_end,
      });
      break;

    case 'customer.subscription.deleted':
      await dispatch(handlers['customer.subscription.deleted']);
      auditLog('webhook.subscription.deleted', {
        subscriptionId: event.data.object.id,
        customerId: event.data.object.customer,
      });
      break;

    case 'customer.subscription.trial_will_end':
      await dispatch(handlers['customer.subscription.trial_will_end']);
      auditLog('webhook.subscription.trial_will_end', {
        subscriptionId: event.data.object.id,
        trialEnd: event.data.object.trial_end,
      });
      break;

    // ---- Invoice ----
    case 'invoice.payment_succeeded':
      await dispatch(handlers['invoice.payment_succeeded']);
      auditLog('webhook.invoice.payment_succeeded', {
        invoiceId: event.data.object.id,
        customerId: event.data.object.customer,
        total: event.data.object.total,
      });
      break;

    case 'invoice.payment_failed':
      await dispatch(handlers['invoice.payment_failed']);
      auditLog('webhook.invoice.payment_failed', {
        invoiceId: event.data.object.id,
        customerId: event.data.object.customer,
      });
      break;

    default:
      auditLog('webhook.unhandled', { type: event.type, id: event.id });
      return { handled: false, type: event.type };
  }

  return { handled: true, type: event.type };
}

/** No-op default handler for unregistered webhook sub-types. */
async function defaultHandle(_event) {}

// ---------------------------------------------------------------------------
// Stripe: Refunds
// ---------------------------------------------------------------------------

/**
 * Issues a full or partial refund on a PaymentIntent.
 *
 * @param {object} opts
 * @param {string} opts.paymentIntentId
 * @param {number} [opts.amount]  - Amount in cents. Omit for full refund.
 * @param {string} [opts.reason]  - 'duplicate' | 'fraudulent' | 'requested_by_customer'
 * @returns {Promise<import('stripe').Stripe.Refund>}
 */
export async function createRefund({ paymentIntentId, amount, reason }) {
  const stripe = await initStripe();
  const params = { payment_intent: paymentIntentId };
  if (amount)  params.amount = amount;
  if (reason)  params.reason = reason;

  try {
    const refund = await stripe.refunds.create(params);
    auditLog('stripe.refund.created', {
      refundId: refund.id,
      paymentIntentId,
      amount: refund.amount,
      reason,
      status: refund.status,
    });
    return refund;
  } catch (err) {
    auditLog('stripe.refund.failed', { paymentIntentId, error: err.message });
    throw paymentError(PAYMENT_ERROR_CODES.REFUND_FAILED, err.message, err);
  }
}

// ---------------------------------------------------------------------------
// Stripe: Invoices
// ---------------------------------------------------------------------------

/**
 * Creates and finalises a Stripe Invoice for a customer.
 *
 * @param {object} opts
 * @param {string} opts.customerId
 * @param {Array<{description: string, amount: number, currency: string}>} opts.lineItems
 * @param {Record<string, string>} [opts.metadata]
 * @param {boolean} [opts.autoAdvance=true]
 * @returns {Promise<import('stripe').Stripe.Invoice>}
 */
export async function createInvoice({ customerId, lineItems, metadata = {}, autoAdvance = true }) {
  const stripe = await initStripe();
  try {
    // Add individual line items as InvoiceItems
    for (const item of lineItems) {
      validateAmount(item.amount);
      validateCurrency(item.currency);
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: item.amount,
        currency: item.currency.toLowerCase(),
        description: item.description,
      });
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      metadata,
      auto_advance: autoAdvance,
    });

    // Finalise so it gets a number and PDF
    const finalised = await stripe.invoices.finalizeInvoice(invoice.id);
    auditLog('stripe.invoice.created', {
      invoiceId: finalised.id,
      customerId,
      total: finalised.total,
      status: finalised.status,
    });
    return finalised;
  } catch (err) {
    if (err.isPaymentError) throw err;
    auditLog('stripe.invoice.failed', { customerId, error: err.message });
    throw paymentError(PAYMENT_ERROR_CODES.INVOICE_FAILED, err.message, err);
  }
}

// ---------------------------------------------------------------------------
// Stripe: Payment method storage (tokenized)
// ---------------------------------------------------------------------------

/**
 * Attaches a tokenized payment method to a customer and optionally sets it as default.
 *
 * NEVER pass raw card data here — only Stripe PaymentMethod IDs produced by
 * Stripe.js / Stripe Elements running in the browser.
 *
 * @param {string} customerId
 * @param {string} paymentMethodId - Stripe PM token (e.g. pm_xxx)
 * @param {boolean} [setDefault=false]
 * @returns {Promise<import('stripe').Stripe.PaymentMethod>}
 */
export async function attachPaymentMethod(customerId, paymentMethodId, setDefault = false) {
  const stripe = await initStripe();
  const pm = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  if (setDefault) {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }
  auditLog('stripe.payment_method.attached', {
    customerId,
    pmId: paymentMethodId,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    setDefault,
  });
  return pm;
}

/**
 * Detaches (removes) a payment method from its customer.
 * @param {string} paymentMethodId
 * @returns {Promise<import('stripe').Stripe.PaymentMethod>}
 */
export async function detachPaymentMethod(paymentMethodId) {
  const stripe = await initStripe();
  const pm = await stripe.paymentMethods.detach(paymentMethodId);
  auditLog('stripe.payment_method.detached', { pmId: paymentMethodId });
  return pm;
}

/**
 * Lists all payment methods stored for a customer.
 * @param {string} customerId
 * @returns {Promise<import('stripe').Stripe.PaymentMethod[]>}
 */
export async function listPaymentMethods(customerId) {
  const stripe = await initStripe();
  const result = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
  return result.data;
}

// ---------------------------------------------------------------------------
// Internal Stripe initialiser (async-safe)
// ---------------------------------------------------------------------------

let _stripeInitPromise = null;

async function initStripe() {
  if (_stripe) return _stripe;
  if (_stripeInitPromise) return _stripeInitPromise;

  _stripeInitPromise = (async () => {
    const key = STRIPE_SECRET_KEY();
    if (!key) {
      throw paymentError(
        PAYMENT_ERROR_CODES.STRIPE_INIT_FAILED,
        'STRIPE_SECRET_KEY environment variable is not set.'
      );
    }
    let Stripe;
    try {
      ({ default: Stripe } = await import('stripe'));
    } catch {
      throw paymentError(
        PAYMENT_ERROR_CODES.STRIPE_INIT_FAILED,
        'The `stripe` npm package is not installed. Run: npm install stripe'
      );
    }
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    return _stripe;
  })();

  return _stripeInitPromise;
}

// ---------------------------------------------------------------------------
// Cryptocurrency payments
// ---------------------------------------------------------------------------

/**
 * Wallet address validation patterns per coin.
 * These are surface-level format checks — not full cryptographic validation.
 */
const CRYPTO_ADDRESS_PATTERNS = {
  BTC:  /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  ETH:  /^0x[a-fA-F0-9]{40}$/,
  USDC: /^0x[a-fA-F0-9]{40}$/,   // ERC-20 on Ethereum
  USDT: /^0x[a-fA-F0-9]{40}$/,   // ERC-20 on Ethereum (Tron variant omitted for mock)
  SOL:  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

/**
 * Validates a cryptocurrency wallet address format.
 * @param {string} coin     - One of SUPPORTED_CRYPTO.
 * @param {string} address  - The address to validate.
 * @returns {boolean}
 */
export function validateCryptoAddress(coin, address) {
  const pattern = CRYPTO_ADDRESS_PATTERNS[coin];
  if (!pattern) return false;
  return pattern.test(address);
}

/**
 * Generates a mock deposit address for a given cryptocurrency.
 *
 * In production, replace this with calls to a custody/wallet provider
 * (e.g. BitGo, Fireblocks, Coinbase Commerce, or your own HD wallet derivation).
 *
 * @param {object} opts
 * @param {string} opts.coin    - One of SUPPORTED_CRYPTO.
 * @param {string} opts.orderId - Internal order/payment ID for correlation.
 * @param {number} opts.amountUSD - Amount in USD to compute crypto equivalent.
 * @returns {Promise<{coin: string, address: string, amountCrypto: string, amountUSD: number, expiresAt: string, orderId: string}>}
 */
export async function generateCryptoPaymentAddress({ coin, orderId, amountUSD }) {
  if (!SUPPORTED_CRYPTO.includes(coin)) {
    throw paymentError(
      PAYMENT_ERROR_CODES.UNSUPPORTED_CRYPTO,
      `Unsupported cryptocurrency: ${coin}. Supported: ${SUPPORTED_CRYPTO.join(', ')}`
    );
  }

  // Fetch live exchange rate
  const rate = await fetchExchangeRate('USD', coin);
  const amountCrypto = (amountUSD / rate).toFixed(8);

  // Mock address generation — replace with HD wallet derivation in production
  const mockAddresses = {
    BTC:  `bc1q${orderId.slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, 'x')}mock0000000000000000000000000`,
    ETH:  `0x${Buffer.from(orderId).toString('hex').padEnd(40, '0').slice(0, 40)}`,
    USDC: `0x${Buffer.from(`usdc${orderId}`).toString('hex').padEnd(40, '0').slice(0, 40)}`,
    USDT: `0x${Buffer.from(`usdt${orderId}`).toString('hex').padEnd(40, '0').slice(0, 40)}`,
    SOL:  `${Buffer.from(`sol${orderId}`).toString('base64').replace(/[^1-9A-HJ-NP-Za-km-z]/g, '1').slice(0, 44)}`,
  };

  const address = mockAddresses[coin];
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  auditLog('crypto.address.generated', { coin, orderId, amountUSD, expiresAt });

  return { coin, address, amountCrypto, amountUSD, expiresAt, orderId };
}

/**
 * Verifies a cryptocurrency payment by checking blockchain confirmations.
 *
 * In production, replace the mock with calls to a blockchain API
 * (e.g. Blockstream for BTC, Alchemy/Infura for ETH, Solana RPC for SOL).
 *
 * @param {object} opts
 * @param {string} opts.coin          - Cryptocurrency symbol.
 * @param {string} opts.txHash        - Transaction hash / signature.
 * @param {string} opts.expectedAddress - Deposit address that should receive funds.
 * @param {string} opts.expectedAmount  - Expected amount in crypto (string).
 * @param {number} [opts.requiredConfirmations] - Minimum confirmations (defaults by coin).
 * @returns {Promise<{verified: boolean, confirmations: number, txHash: string}>}
 */
export async function verifyCryptoPayment({
  coin,
  txHash,
  expectedAddress,
  expectedAmount,
  requiredConfirmations,
}) {
  if (!SUPPORTED_CRYPTO.includes(coin)) {
    throw paymentError(
      PAYMENT_ERROR_CODES.UNSUPPORTED_CRYPTO,
      `Unsupported cryptocurrency: ${coin}`
    );
  }

  const defaults = { BTC: 3, ETH: 12, USDC: 12, USDT: 12, SOL: 32 };
  const needed = requiredConfirmations ?? defaults[coin];

  // MOCK: In production call your blockchain provider's API
  // This stub simulates a confirmed transaction for integration testing
  const mockConfirmations = needed + 1; // Always "confirmed" in mock mode
  const verified = mockConfirmations >= needed;

  auditLog('crypto.payment.verified', {
    coin,
    txHash,
    expectedAddress,
    confirmations: mockConfirmations,
    required: needed,
    verified,
  });

  if (!verified) {
    throw paymentError(
      PAYMENT_ERROR_CODES.CRYPTO_VERIFY_FAILED,
      `Transaction has ${mockConfirmations} confirmations but requires ${needed}.`
    );
  }

  return { verified, confirmations: mockConfirmations, txHash };
}

/**
 * Fetches the exchange rate between two currencies/coins.
 *
 * Uses the endpoint from EXCHANGE_RATE_ENDPOINT environment variable.
 * No API keys are hardcoded.
 *
 * @param {string} from - Base currency (e.g. 'USD').
 * @param {string} to   - Target currency or coin symbol.
 * @returns {Promise<number>} Exchange rate (1 `from` = N `to`).
 */
export async function fetchExchangeRate(from, to) {
  const endpoint = EXCHANGE_RATE_ENDPOINT();
  const url = `${endpoint}/${from}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }
    const data = await response.json();
    const rate = data?.rates?.[to];
    if (!rate) {
      throw new Error(`No rate for ${to} in response`);
    }
    return rate;
  } catch (err) {
    throw paymentError(
      PAYMENT_ERROR_CODES.EXCHANGE_RATE_FAILED,
      `Failed to fetch ${from}→${to} rate: ${err.message}`,
      err
    );
  }
}

// ---------------------------------------------------------------------------
// Gift Cards
// ---------------------------------------------------------------------------

/**
 * In-memory gift card store (replace with database in production).
 * Each record: { code, balance, currency, isRedeemed, transactions[] }
 * @type {Map<string, object>}
 */
const _giftCardStore = new Map();

/** Gift card code pattern: 16 uppercase alphanumeric characters. */
const GIFT_CARD_PATTERN = /^[A-Z0-9]{16}$/;

/**
 * Registers a new gift card (called during issuance/sale).
 * @param {object} opts
 * @param {string} opts.code     - 16-char alphanumeric code.
 * @param {number} opts.balance  - Initial balance in cents.
 * @param {string} opts.currency - ISO currency code.
 * @returns {{ code: string, balance: number, currency: string }}
 */
export function issueGiftCard({ code, balance, currency }) {
  validateAmount(balance);
  validateCurrency(currency);

  const normCode = code.toUpperCase().replace(/\s/g, '');
  if (!GIFT_CARD_PATTERN.test(normCode)) {
    throw paymentError(
      PAYMENT_ERROR_CODES.GIFT_CARD_INVALID,
      'Gift card code must be exactly 16 uppercase alphanumeric characters.'
    );
  }
  if (_giftCardStore.has(normCode)) {
    throw paymentError(PAYMENT_ERROR_CODES.GIFT_CARD_INVALID, 'Gift card code already exists.');
  }

  const card = { code: normCode, balance, currency: currency.toUpperCase(), isRedeemed: false, transactions: [] };
  _giftCardStore.set(normCode, card);
  auditLog('giftcard.issued', { code: normCode, balance, currency });
  return { code: normCode, balance, currency: card.currency };
}

/**
 * Validates a gift card code and returns current balance info.
 * @param {string} code
 * @returns {{ valid: boolean, balance: number, currency: string, isRedeemed: boolean }}
 */
export function validateGiftCard(code) {
  const normCode = code.toUpperCase().replace(/\s/g, '');
  if (!GIFT_CARD_PATTERN.test(normCode)) {
    return { valid: false, balance: 0, currency: null, isRedeemed: false };
  }
  const card = _giftCardStore.get(normCode);
  if (!card) {
    return { valid: false, balance: 0, currency: null, isRedeemed: false };
  }
  return {
    valid: !card.isRedeemed || card.balance > 0,
    balance: card.balance,
    currency: card.currency,
    isRedeemed: card.isRedeemed,
  };
}

/**
 * Redeems (partially or fully) a gift card.
 *
 * Supports partial use — if the order total exceeds the card balance,
 * only the available balance is applied and the remainder is returned.
 *
 * @param {object} opts
 * @param {string} opts.code          - Gift card code.
 * @param {number} opts.amountToUse   - Amount to apply (in cents).
 * @param {string} opts.orderId       - Reference order ID.
 * @returns {{ applied: number, remainingBalance: number, currency: string }}
 */
export function redeemGiftCard({ code, amountToUse, orderId }) {
  const normCode = code.toUpperCase().replace(/\s/g, '');
  const card = _giftCardStore.get(normCode);

  if (!card) {
    throw paymentError(PAYMENT_ERROR_CODES.GIFT_CARD_INVALID, `Gift card not found: ${normCode}`);
  }
  if (card.balance <= 0) {
    throw paymentError(
      PAYMENT_ERROR_CODES.GIFT_CARD_REDEEMED,
      'Gift card has zero remaining balance.'
    );
  }

  const applied = Math.min(amountToUse, card.balance);
  card.balance -= applied;
  if (card.balance === 0) card.isRedeemed = true;

  card.transactions.push({ orderId, applied, ts: new Date().toISOString() });
  auditLog('giftcard.redeemed', { code: normCode, applied, remainingBalance: card.balance, orderId });

  return { applied, remainingBalance: card.balance, currency: card.currency };
}

/**
 * Checks the remaining balance on a gift card (read-only).
 * @param {string} code
 * @returns {{ balance: number, currency: string }}
 */
export function checkGiftCardBalance(code) {
  const info = validateGiftCard(code);
  if (!info.valid && info.balance === 0) {
    throw paymentError(PAYMENT_ERROR_CODES.GIFT_CARD_INVALID, `Gift card not found or invalid: ${code}`);
  }
  return { balance: info.balance, currency: info.currency };
}

// ---------------------------------------------------------------------------
// Default export: PaymentService facade
// ---------------------------------------------------------------------------

/**
 * PaymentService — centralised facade for all payment operations.
 *
 * Usage:
 * ```js
 * import PaymentService from './payments/PaymentService.js';
 * const intent = await PaymentService.stripe.createPaymentIntent({ amount: 999, currency: 'USD' });
 * ```
 */
const PaymentService = {
  stripe: {
    createCustomer:       createStripeCustomer,
    getCustomer:          getStripeCustomer,
    updateCustomer:       updateStripeCustomer,
    createPaymentIntent,
    confirmPaymentIntent,
    createSubscription,
    cancelSubscription,
    changeTier,
    createRefund,
    createInvoice,
    attachPaymentMethod,
    detachPaymentMethod,
    listPaymentMethods,
    verifyWebhook,
    handleWebhookEvent,
  },
  crypto: {
    generateAddress:    generateCryptoPaymentAddress,
    verifyPayment:      verifyCryptoPayment,
    validateAddress:    validateCryptoAddress,
    fetchExchangeRate,
  },
  giftCards: {
    issue:          issueGiftCard,
    validate:       validateGiftCard,
    redeem:         redeemGiftCard,
    checkBalance:   checkGiftCardBalance,
  },
  tiers:      SUBSCRIPTION_TIERS,
  currencies: SUPPORTED_CURRENCIES,
  cards:      SUPPORTED_CARD_NETWORKS,
  cryptos:    SUPPORTED_CRYPTO,
  errors:     PAYMENT_ERROR_CODES,
};

export default PaymentService;
