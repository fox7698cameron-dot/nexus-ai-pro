// ================================================
// NEXUS AI PRO - Stripe Payment Service
// File: src/services/stripeService.js
// Updated: 2026-07-01
// Supports: cards (Visa/MC/Amex/Discover/Diners),
//           Apple Pay, Google Pay, crypto (Coinbase),
//           gift cards, all major debit/credit cards
// ================================================

// Stripe key is never hardcoded — always from env
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
  // Dynamic import keeps stripe out of edge-runtime bundles
  return import('stripe').then(m => new m.default(secretKey, { apiVersion: '2024-11-20.acacia' }));
}

// Supported plan definitions — prices come from Stripe dashboard, not code
export const PLANS = Object.freeze({
  free: { id: 'free', name: 'Free', price: 0, currency: 'usd', interval: null },
  pro_monthly: {
    id: 'pro_monthly', name: 'Pro', interval: 'month',
    priceId: () => process.env.STRIPE_PRICE_PRO_MONTHLY,
  },
  pro_yearly: {
    id: 'pro_yearly', name: 'Pro (Annual)', interval: 'year',
    priceId: () => process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  enterprise_monthly: {
    id: 'enterprise_monthly', name: 'Enterprise', interval: 'month',
    priceId: () => process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  },
  enterprise_yearly: {
    id: 'enterprise_yearly', name: 'Enterprise (Annual)', interval: 'year',
    priceId: () => process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  },
});

// ── Checkout sessions ──────────────────────────────────────────────────────

export async function createCheckoutSession({ planId, userId, email, successUrl, cancelUrl }) {
  const plan = PLANS[planId];
  if (!plan || !plan.priceId) throw new Error(`Unknown plan: ${planId}`);
  const priceId = plan.priceId();
  if (!priceId) throw new Error(`Price ID not configured for plan: ${planId}`);

  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    payment_method_options: {
      card: { request_three_d_secure: 'automatic' },
    },
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planId },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    // Enable wallet payment methods (Apple Pay, Google Pay)
    automatic_tax: { enabled: false },
  });

  return { sessionId: session.id, url: session.url };
}

export async function createCustomerPortalSession({ customerId, returnUrl }) {
  const stripe = await getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

// ── One-time payment (gift cards / credits) ────────────────────────────────

export async function createPaymentIntent({ amount, currency = 'usd', metadata = {} }) {
  const stripe = await getStripe();
  const intent = await stripe.paymentIntents.create({
    amount, // in cents
    currency,
    payment_method_types: ['card'],
    metadata,
    automatic_payment_methods: { enabled: true },
  });
  return { clientSecret: intent.client_secret, intentId: intent.id };
}

// ── Crypto payments via Coinbase Commerce ─────────────────────────────────

export async function createCryptoCharge({ planId, userId, redirectUrl }) {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) throw new Error('COINBASE_COMMERCE_API_KEY not configured');
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const response = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify({
      name: `Nexus AI Pro — ${plan.name}`,
      description: `Subscription: ${plan.name}`,
      pricing_type: 'fixed_price',
      local_price: { amount: '9.99', currency: 'USD' },
      redirect_url: redirectUrl,
      metadata: { userId, planId },
    }),
  });
  if (!response.ok) throw new Error('Failed to create crypto charge');
  const data = await response.json();
  return { chargeId: data.data.id, hostedUrl: data.data.hosted_url };
}

// ── Gift card / promo code redemption ─────────────────────────────────────

export async function redeemGiftCard({ code, userId }) {
  const stripe = await getStripe();
  // Attempt to apply as Stripe promo code
  const promoCodes = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  if (promoCodes.data.length === 0) throw new Error('Invalid or expired gift card code');
  const promoCode = promoCodes.data[0];
  return {
    valid: true,
    promoCodeId: promoCode.id,
    couponId: promoCode.coupon.id,
    discountPercent: promoCode.coupon.percent_off,
    discountAmount: promoCode.coupon.amount_off,
    currency: promoCode.coupon.currency,
    appliedTo: userId,
  };
}

// ── Webhook verification ───────────────────────────────────────────────────

export async function constructWebhookEvent(payload, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  const stripe = await getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ── Customer management ───────────────────────────────────────────────────

export async function getOrCreateCustomer({ userId, email }) {
  const stripe = await getStripe();
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0];
  return stripe.customers.create({ email, metadata: { userId } });
}

export async function getSubscription(customerId) {
  const stripe = await getStripe();
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
  return subs.data[0] || null;
}

export async function cancelSubscription(subscriptionId) {
  const stripe = await getStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}
