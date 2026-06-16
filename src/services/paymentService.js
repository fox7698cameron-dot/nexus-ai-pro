// File: paymentService.js | Date: 2026-06-16
import { v4 as uuidv4 } from 'uuid';
import cryptoService from './cryptoService.js';
import auditLogger from '../utils/audit.js';

let stripe = null;
try {
  const { default: Stripe } = await import('stripe');
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
    console.log('[PaymentService] Stripe initialized');
  } else {
    console.warn('[PaymentService] STRIPE_SECRET_KEY not set — Stripe disabled');
  }
} catch {
  console.warn('[PaymentService] stripe package not installed — payment features disabled');
}

// In-memory fallback stores
const customerMap = new Map();  // userId → stripeCustomerId
const giftCards = new Map();    // code → {amount, currency, redeemed, redeemedBy}
const subscriptions = new Map(); // userId → subscriptionData

export class PaymentService {
  _requireStripe() {
    if (!stripe) throw new Error('Payment processing is not available. Please configure STRIPE_SECRET_KEY.');
  }

  /**
   * Create a Stripe customer for a user.
   */
  async createCustomer(userId, email, name) {
    this._requireStripe();
    const customer = await stripe.customers.create({ email, name, metadata: { userId } });
    customerMap.set(userId, customer.id);
    auditLogger.log('payment.customer.created', userId, { customerId: customer.id }, 'info');
    return customer;
  }

  /**
   * Get existing customer or create a new one.
   */
  async getOrCreateCustomer(userId, email, name) {
    this._requireStripe();
    const existingId = customerMap.get(userId);
    if (existingId) {
      try { return await stripe.customers.retrieve(existingId); } catch { /* fall through */ }
    }
    return this.createCustomer(userId, email, name);
  }

  /**
   * Create a subscription for a user.
   */
  async createSubscription(userId, priceId, paymentMethodId) {
    this._requireStripe();
    const customer = await this.getOrCreateCustomer(userId, `user-${userId}@placeholder.com`, userId);

    const params = {
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId },
    };

    if (paymentMethodId) {
      params.default_payment_method = paymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(params);
    subscriptions.set(userId, subscription);

    auditLogger.log('payment.subscription.created', userId, {
      subscriptionId: subscription.id,
      priceId,
    }, 'info');

    return subscription;
  }

  /**
   * Cancel a subscription.
   */
  async cancelSubscription(subscriptionId, immediately = false) {
    this._requireStripe();

    let sub;
    if (immediately) {
      sub = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    }

    auditLogger.log('payment.subscription.cancelled', null, {
      subscriptionId,
      immediately,
    }, 'info');

    return sub;
  }

  /**
   * Update a subscription to a new price.
   */
  async updateSubscription(subscriptionId, newPriceId) {
    this._requireStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) throw new Error('No subscription item found');

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });

    auditLogger.log('payment.subscription.updated', null, { subscriptionId, newPriceId }, 'info');
    return updated;
  }

  /**
   * Retrieve a subscription by ID.
   */
  async getSubscription(subscriptionId) {
    this._requireStripe();
    return stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });
  }

  /**
   * Get the current subscription for a user.
   */
  async getUserSubscription(userId) {
    this._requireStripe();
    const cached = subscriptions.get(userId);
    if (cached?.id) {
      try { return await this.getSubscription(cached.id); } catch { /* fall through */ }
    }

    const customerId = customerMap.get(userId);
    if (!customerId) return null;

    const list = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'active' });
    if (list.data.length) {
      subscriptions.set(userId, list.data[0]);
      return list.data[0];
    }
    return null;
  }

  /**
   * List available prices.
   */
  async listPrices() {
    this._requireStripe();
    const prices = await stripe.prices.list({ active: true, expand: ['data.product'] });
    return prices.data;
  }

  /**
   * Create a payment intent.
   */
  async createPaymentIntent(amount, currency, userId) {
    this._requireStripe();
    if (!amount || amount < 50) throw new Error('Amount must be at least 50 cents');

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      metadata: { userId },
    });

    auditLogger.log('payment.intent.created', userId, { intentId: intent.id, amount, currency }, 'info');
    return intent;
  }

  /**
   * Create a setup intent for saving payment methods.
   */
  async createSetupIntent(userId) {
    this._requireStripe();
    const customer = await this.getOrCreateCustomer(userId, `user-${userId}@placeholder.com`, userId);

    const intent = await stripe.setupIntents.create({
      customer: customer.id,
      metadata: { userId },
    });

    return intent;
  }

  /**
   * Attach a payment method to a customer.
   */
  async attachPaymentMethod(customerId, paymentMethodId) {
    this._requireStripe();
    return stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }

  /**
   * Create a gift card with a random code.
   */
  async createGiftCard(amount, currency) {
    if (!amount || amount <= 0) throw new Error('Gift card amount must be positive');

    const code = cryptoService.generateToken(8).toUpperCase();
    const card = {
      id: uuidv4(),
      code,
      amount,
      currency: currency.toLowerCase(),
      redeemed: false,
      redeemedBy: null,
      createdAt: new Date().toISOString(),
    };

    giftCards.set(code, card);
    auditLogger.log('payment.giftcard.created', null, { code, amount, currency }, 'info');

    return card;
  }

  /**
   * Redeem a gift card for a user.
   */
  async redeemGiftCard(userId, code) {
    const card = giftCards.get(code.toUpperCase());
    if (!card) throw new Error('Gift card not found');
    if (card.redeemed) throw new Error('Gift card has already been redeemed');

    card.redeemed = true;
    card.redeemedBy = userId;
    card.redeemedAt = new Date().toISOString();

    giftCards.set(code.toUpperCase(), card);

    auditLogger.log('payment.giftcard.redeemed', userId, { code, amount: card.amount }, 'info');

    return { success: true, amount: card.amount, currency: card.currency };
  }

  /**
   * Process a crypto payment (stub — integrate with actual crypto gateway).
   */
  async processCryptoPayment(userId, cryptoCurrency, amount) {
    const supported = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];
    if (!supported.includes(cryptoCurrency.toUpperCase())) {
      throw new Error(`Unsupported cryptocurrency. Supported: ${supported.join(', ')}`);
    }

    // Stub: in production, integrate with Coinbase Commerce, NOWPayments, etc.
    const paymentId = uuidv4();
    auditLogger.log('payment.crypto.initiated', userId, {
      cryptoCurrency: cryptoCurrency.toUpperCase(),
      amount,
      paymentId,
    }, 'info');

    return {
      paymentId,
      status: 'pending',
      cryptoCurrency: cryptoCurrency.toUpperCase(),
      amount,
      walletAddress: null, // Filled by real gateway
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      note: 'Crypto payment gateway not configured. Integrate Coinbase Commerce or NOWPayments.',
    };
  }

  /**
   * Handle an incoming Stripe webhook event.
   */
  async handleWebhook(event) {
    const type = event.type;

    switch (type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        auditLogger.log('payment.checkout.completed', session.metadata?.userId || null, {
          sessionId: session.id,
          amount: session.amount_total,
        }, 'info');
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        auditLogger.log('payment.invoice.paid', null, {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
        }, 'info');
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        auditLogger.log('payment.invoice.failed', null, {
          invoiceId: invoice.id,
          customerId: invoice.customer,
        }, 'error');
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        auditLogger.log('payment.subscription.deleted', null, {
          subscriptionId: sub.id,
          customerId: sub.customer,
        }, 'warn');
        break;
      }
      default:
        break;
    }

    return { received: true, type };
  }

  /**
   * Get invoices for a user.
   */
  async getInvoices(userId) {
    this._requireStripe();
    const customerId = customerMap.get(userId);
    if (!customerId) return [];

    const invoices = await stripe.invoices.list({ customer: customerId, limit: 20 });
    return invoices.data;
  }

  /**
   * Create a Stripe customer portal session.
   */
  async createPortalSession(customerId, returnUrl) {
    this._requireStripe();
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}

export default new PaymentService();
