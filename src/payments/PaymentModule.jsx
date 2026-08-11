/**
 * src/payments/PaymentModule.jsx
 * Nexus AI Pro — Payment Module
 * Stripe (all major cards: Visa, Mastercard, Amex, Discover, UnionPay, JCB, Diners)
 * Crypto payments (BTC, ETH, SOL, USDC, USDT)
 * Gift card redemption
 * All API keys from environment only — no hard-coded secrets.
 * Date: 2026-08-11
 */

import React, { useState, useEffect } from 'react';
import { t } from '../i18n/index.js';

// ─── Payment Types ────────────────────────────────────────────────────────────
export const PAYMENT_TYPES = {
  CARD:       'card',
  CRYPTO:     'crypto',
  GIFT_CARD:  'gift_card',
  PAYPAL:     'paypal',
  APPLE_PAY:  'apple_pay',
  GOOGLE_PAY: 'google_pay',
};

export const CRYPTO_CURRENCIES = {
  BTC:  { name: 'Bitcoin',      symbol: '₿', color: '#f7931a' },
  ETH:  { name: 'Ethereum',     symbol: 'Ξ', color: '#627eea' },
  SOL:  { name: 'Solana',       symbol: '◎', color: '#9945ff' },
  USDC: { name: 'USD Coin',     symbol: '$', color: '#2775ca' },
  USDT: { name: 'Tether',       symbol: '₮', color: '#26a17b' },
  MATIC:{ name: 'Polygon',      symbol: '⬡', color: '#8247e5' },
  BNB:  { name: 'BNB Chain',    symbol: 'B', color: '#f3ba2f' },
};

export const SUBSCRIPTION_PLANS = {
  starter:    { name: 'Starter',    price: 4.99,  interval: 'month', features: ['10 AI chats/day', '5 projects', 'Basic analytics'] },
  pro:        { name: 'Pro',        price: 9.99,  interval: 'month', features: ['Unlimited chats', '50 projects', 'Full analytics', 'Priority support'] },
  enterprise: { name: 'Enterprise', price: 29.99, interval: 'month', features: ['Unlimited everything', 'Custom connectors', 'SLA', 'Dedicated support', 'White-label'] },
  annual_pro: { name: 'Pro Annual', price: 99.99, interval: 'year',  features: ['Everything in Pro', '2 months free'] },
};

// ─── Payment API Client ───────────────────────────────────────────────────────
export const PaymentAPI = {
  /** Create a Stripe payment intent server-side */
  async createPaymentIntent(planId, currency = 'usd') {
    const res = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ planId, currency }),
    });
    return _handleResponse(res);
  },

  /** Confirm payment after Stripe client-side */
  async confirmPayment(paymentIntentId) {
    const res = await fetch('/api/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paymentIntentId }),
    });
    return _handleResponse(res);
  },

  /** Create crypto payment invoice */
  async createCryptoInvoice(planId, currency) {
    const res = await fetch('/api/payments/crypto/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ planId, currency }),
    });
    return _handleResponse(res);
  },

  /** Poll crypto payment status */
  async getCryptoStatus(invoiceId) {
    const res = await fetch(`/api/payments/crypto/status/${invoiceId}`, { credentials: 'include' });
    return _handleResponse(res);
  },

  /** Redeem a gift card */
  async redeemGiftCard(code) {
    const res = await fetch('/api/payments/gift-card/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });
    return _handleResponse(res);
  },

  /** Get current subscription */
  async getSubscription() {
    const res = await fetch('/api/payments/subscription', { credentials: 'include' });
    return _handleResponse(res);
  },

  /** Cancel subscription */
  async cancelSubscription() {
    const res = await fetch('/api/payments/subscription/cancel', {
      method: 'POST', credentials: 'include',
    });
    return _handleResponse(res);
  },

  /** Get billing history */
  async getBillingHistory() {
    const res = await fetch('/api/payments/billing/history', { credentials: 'include' });
    return _handleResponse(res);
  },
};

// ─── Checkout Component ───────────────────────────────────────────────────────
export function CheckoutModal({ planId, onSuccess, onCancel }) {
  const [paymentType, setType] = useState(PAYMENT_TYPES.CARD);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) return <div>Invalid plan</div>;

  return (
    <div className="checkout-modal-overlay" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="checkout-modal">
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h2 className="checkout-title">Subscribe to {plan.name}</h2>
        <p className="checkout-price">${plan.price}/{plan.interval}</p>
        <ul className="checkout-features">
          {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
        </ul>
        <div className="payment-tabs">
          {[
            { id: PAYMENT_TYPES.CARD,      label: '💳 Card'     },
            { id: PAYMENT_TYPES.CRYPTO,    label: '₿ Crypto'   },
            { id: PAYMENT_TYPES.GIFT_CARD, label: '🎁 Gift Card'},
          ].map(tab => (
            <button key={tab.id} className={`pay-tab ${paymentType === tab.id ? 'active' : ''}`}
              onClick={() => setType(tab.id)}>{tab.label}</button>
          ))}
        </div>
        {error && <p className="payment-error" role="alert">{error}</p>}
        {paymentType === PAYMENT_TYPES.CARD && (
          <CardPaymentForm planId={planId} onSuccess={onSuccess} onError={setError} />
        )}
        {paymentType === PAYMENT_TYPES.CRYPTO && (
          <CryptoPaymentForm planId={planId} onSuccess={onSuccess} onError={setError} />
        )}
        {paymentType === PAYMENT_TYPES.GIFT_CARD && (
          <GiftCardForm onSuccess={onSuccess} onError={setError} />
        )}
      </div>
    </div>
  );
}

// ─── Card Payment Form ────────────────────────────────────────────────────────
function CardPaymentForm({ planId, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setCS] = useState('');
  const [status, setStatus]   = useState('idle');

  useEffect(() => {
    PaymentAPI.createPaymentIntent(planId).then(r => setCS(r.clientSecret)).catch(e => onError(e.message));
  }, [planId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In production this would use Stripe.js confirmPayment with the element
      // Here we show the UX flow; Stripe Elements loads via /api/payments/stripe-key
      const result = await PaymentAPI.confirmPayment(clientSecret);
      if (result.status === 'succeeded') { setStatus('success'); onSuccess?.(result); }
      else onError('Payment did not complete. Please try again.');
    } catch (err) { onError(err.message); }
    finally { setLoading(false); }
  };

  if (status === 'success') return <p className="payment-success">✅ Payment successful! Subscription active.</p>;

  return (
    <form className="card-payment-form" onSubmit={handleSubmit} noValidate>
      <p className="card-note">
        Accepted: Visa, Mastercard, Amex, Discover, UnionPay, JCB, Diners Club<br/>
        <span style={{ fontSize: '0.8em', color: '#6b7280' }}>
          Card details processed securely by Stripe — never stored on our servers.
        </span>
      </p>
      {/* Stripe Elements would mount here — identified by id="stripe-payment-element" */}
      <div id="stripe-payment-element" className="stripe-element-mount"
        style={{ minHeight: 48, background: 'var(--input-bg)', borderRadius: 8, padding: 12, color: 'var(--text-primary)' }}>
        <span style={{ opacity: 0.5 }}>Stripe Elements loads here in production environment</span>
      </div>
      <button type="submit" className="pay-btn" disabled={loading || !clientSecret}>
        {loading ? 'Processing…' : `Pay $${SUBSCRIPTION_PLANS[planId]?.price}`}
      </button>
    </form>
  );
}

// ─── Crypto Payment Form ──────────────────────────────────────────────────────
function CryptoPaymentForm({ planId, onSuccess, onError }) {
  const [currency, setCurrency] = useState('ETH');
  const [invoice, setInvoice]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [polling, setPolling]   = useState(false);

  const createInvoice = async () => {
    setLoading(true);
    try {
      const inv = await PaymentAPI.createCryptoInvoice(planId, currency);
      setInvoice(inv);
      pollStatus(inv.id);
    } catch (err) { onError(err.message); }
    finally { setLoading(false); }
  };

  const pollStatus = (invoiceId) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const status = await PaymentAPI.getCryptoStatus(invoiceId);
        if (status.state === 'settled') {
          clearInterval(interval);
          setPolling(false);
          onSuccess?.(status);
        } else if (status.state === 'expired') {
          clearInterval(interval);
          setPolling(false);
          onError('Crypto invoice expired. Please try again.');
        }
      } catch { clearInterval(interval); setPolling(false); }
    }, 10000); // Poll every 10s — no exponential backoff, simple interval
  };

  return (
    <div className="crypto-payment-form">
      <div className="crypto-select">
        {Object.entries(CRYPTO_CURRENCIES).map(([symbol, info]) => (
          <button key={symbol} className={`crypto-btn ${currency === symbol ? 'active' : ''}`}
            onClick={() => setCurrency(symbol)} style={{ borderColor: info.color }}>
            <span style={{ color: info.color }}>{info.symbol}</span> {symbol}
          </button>
        ))}
      </div>
      {!invoice ? (
        <button className="pay-btn" onClick={createInvoice} disabled={loading}>
          {loading ? 'Creating invoice…' : `Pay with ${currency}`}
        </button>
      ) : (
        <div className="crypto-invoice">
          <p className="invoice-amount">Send exactly <strong>{invoice.amount} {currency}</strong></p>
          <div className="invoice-address">{invoice.address}</div>
          {invoice.qrCode && <img src={invoice.qrCode} alt="Payment QR" className="invoice-qr" />}
          <p className="invoice-expire">Expires: {new Date(invoice.expiresAt).toLocaleString()}</p>
          {polling && <p className="polling-status">⏳ Watching for payment…</p>}
        </div>
      )}
    </div>
  );
}

// ─── Gift Card Form ───────────────────────────────────────────────────────────
function GiftCardForm({ onSuccess, onError }) {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);

  const redeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) { onError('Enter a gift card code'); return; }
    setLoading(true);
    try {
      const result = await PaymentAPI.redeemGiftCard(code.trim().toUpperCase());
      onSuccess?.(result);
    } catch (err) { onError(err.message || 'Invalid or already used gift card'); }
    finally { setLoading(false); }
  };

  return (
    <form className="gift-card-form" onSubmit={redeem} noValidate>
      <label className="field-label">Gift Card Code</label>
      <input className="field-input" type="text" value={code} onChange={e => setCode(e.target.value)}
        placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={24} autoCapitalize="characters"
        autoComplete="off" spellCheck="false" />
      <button type="submit" className="pay-btn" disabled={loading || !code.trim()}>
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

// ─── Subscription Manager Component ──────────────────────────────────────────
export function SubscriptionManager() {
  const [sub, setSub]         = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setCheckout] = useState(false);
  const [targetPlan, setTarget] = useState(null);

  useEffect(() => {
    Promise.all([PaymentAPI.getSubscription(), PaymentAPI.getBillingHistory()])
      .then(([s, h]) => { setSub(s); setHistory(h.invoices || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner">Loading billing…</div>;

  return (
    <div className="subscription-manager">
      <h2>Subscription & Billing</h2>
      {sub && (
        <div className="current-plan">
          <h3>Current Plan: <strong>{SUBSCRIPTION_PLANS[sub.planId]?.name ?? sub.planId}</strong></h3>
          <p>Status: <span className={`status-badge ${sub.status}`}>{sub.status}</span></p>
          <p>Next billing: {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}</p>
          <button className="danger-btn" onClick={PaymentAPI.cancelSubscription}>Cancel Subscription</button>
        </div>
      )}
      <h3>Available Plans</h3>
      <div className="plans-grid">
        {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => (
          <div key={id} className={`plan-card ${sub?.planId === id ? 'current' : ''}`}>
            <h4>{plan.name}</h4>
            <p className="plan-price">${plan.price}/{plan.interval}</p>
            <ul>{plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
            {sub?.planId !== id && (
              <button className="upgrade-btn" onClick={() => { setTarget(id); setCheckout(true); }}>
                Select Plan
              </button>
            )}
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <div className="billing-history">
          <h3>Billing History</h3>
          <table className="billing-table">
            <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {history.map((inv, i) => (
                <tr key={i}>
                  <td>{new Date(inv.date).toLocaleDateString()}</td>
                  <td>{inv.plan}</td>
                  <td>${inv.amount}</td>
                  <td><span className={`status-badge ${inv.status}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCheckout && targetPlan && (
        <CheckoutModal planId={targetPlan}
          onSuccess={() => { setCheckout(false); window.location.reload(); }}
          onCancel={() => setCheckout(false)} />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function _handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}
