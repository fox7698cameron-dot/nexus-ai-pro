// Created: 2026-09-30
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0 / mo',
    features: ['5 AI requests / day', '1 GB storage', 'Basic models', 'Community support'],
    stripePriceId: null,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    priceLabel: '$9.99 / mo',
    features: ['Unlimited AI requests', '50 GB storage', 'All models', 'Priority support', 'API access'],
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_PRO ?? 'price_pro',
    badge: 'Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    priceLabel: '$49.99 / mo',
    features: ['Everything in Pro', '500 GB storage', 'Custom models', 'Dedicated support', 'SSO', 'Audit logs'],
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_ENTERPRISE ?? 'price_enterprise',
    badge: null,
  },
  {
    id: 'enterprise_plus',
    name: 'Enterprise+',
    price: 99.99,
    priceLabel: '$99.99 / mo',
    features: [
      'Everything in Enterprise',
      'Unlimited storage',
      'White-label',
      'SLA 99.99%',
      'On-prem option',
      'Custom contracts',
    ],
    stripePriceId: import.meta.env?.VITE_STRIPE_PRICE_ENTERPRISE_PLUS ?? 'price_enterprise_plus',
    badge: 'Best Value',
  },
];

const CRYPTO_COINS = [
  { id: 'BTC', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
  { id: 'USDC', name: 'USD Coin', symbol: 'USDC', icon: '$' },
  { id: 'USDT', name: 'Tether', symbol: 'USDT', icon: '₮' },
];

const CARD_BRANDS = [
  { name: 'Visa', pattern: /^4/ },
  { name: 'Mastercard', pattern: /^5[1-5]/ },
  { name: 'Amex', pattern: /^3[47]/ },
  { name: 'Discover', pattern: /^6(?:011|5)/ },
  { name: 'JCB', pattern: /^35/ },
];

const TABS = ['Plans', 'Payment', 'History', 'Manage'];

// ---------------------------------------------------------------------------
// Stripe singleton (loaded once)
// ---------------------------------------------------------------------------
let stripePromise = null;
function getStripe() {
  const key = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function detectBrand(number) {
  const cleaned = number.replace(/\D/g, '');
  return CARD_BRANDS.find((b) => b.pattern.test(cleaned))?.name ?? '';
}

// ---------------------------------------------------------------------------
// CSS-in-JS theme tokens (avoids Tailwind dependency for dark mode tokens)
// ---------------------------------------------------------------------------
function useThemeVars(darkMode) {
  return {
    bg: darkMode ? '#0f1117' : '#f9fafb',
    surface: darkMode ? '#1a1d27' : '#ffffff',
    border: darkMode ? '#2e3144' : '#e5e7eb',
    text: darkMode ? '#f1f5f9' : '#111827',
    muted: darkMode ? '#8892a4' : '#6b7280',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    cardBg: darkMode ? '#242840' : '#f3f4f6',
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ children, color = 'indigo' }) {
  const map = { indigo: '#6366f1', green: '#22c55e', amber: '#f59e0b' };
  return (
    <span
      style={{
        background: map[color] ?? map.indigo,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </span>
  );
}

function Spinner({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
    </svg>
  );
}

function Alert({ type = 'info', children }) {
  const colors = {
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  };
  const c = colors[type];
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 14,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QR code placeholder (renders wallet address as text + simple grid)
// ---------------------------------------------------------------------------
function QRPlaceholder({ address, coin, t }) {
  // Simple visual placeholder — a real app would use a QR library
  const cells = 13;
  const seed = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const grid = Array.from({ length: cells * cells }, (_, i) => {
    const rng = Math.sin(seed + i * 9301 + 49297) * 233280;
    return (rng - Math.floor(rng)) > 0.45;
  });

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${cells}, 10px)`,
          gap: 1,
          padding: 10,
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          marginBottom: 8,
        }}
      >
        {grid.map((filled, i) => (
          <div key={i} style={{ width: 10, height: 10, background: filled ? '#111' : '#fff' }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: t.muted, wordBreak: 'break-all', maxWidth: 260, margin: '0 auto' }}>
        {address}
      </p>
      <button
        onClick={() => navigator.clipboard?.writeText(address)}
        style={{
          marginTop: 6,
          fontSize: 12,
          color: t.accent,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Copy address
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan selector
// ---------------------------------------------------------------------------
function PlanSelector({ currentTier, onSelect, t }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}
    >
      {TIERS.map((tier) => {
        const active = currentTier === tier.id;
        return (
          <div
            key={tier.id}
            onClick={() => onSelect(tier)}
            style={{
              background: active ? t.accent : t.surface,
              border: `2px solid ${active ? t.accent : t.border}`,
              borderRadius: 12,
              padding: '20px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            {tier.badge && (
              <div style={{ position: 'absolute', top: -10, right: 12 }}>
                <Badge color="amber">{tier.badge}</Badge>
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: 18, color: active ? '#fff' : t.text, marginBottom: 4 }}>
              {tier.name}
            </div>
            <div style={{ fontWeight: 700, fontSize: 22, color: active ? '#e0e7ff' : t.accent, marginBottom: 12 }}>
              {tier.priceLabel}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tier.features.map((f) => (
                <li
                  key={f}
                  style={{ fontSize: 13, color: active ? '#e0e7ff' : t.muted, marginBottom: 4, paddingLeft: 16, position: 'relative' }}
                >
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card payment form (uses Stripe Elements)
// ---------------------------------------------------------------------------
function CardForm({ selectedTier, onSuccess, onError, t }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [brand, setBrand] = useState('');

  const elementStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: t.text,
        '::placeholder': { color: t.muted },
      },
    },
  };

  const fieldStyle = {
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: '12px 14px',
    background: t.surface,
    marginBottom: 12,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ tierId: selectedTier.id, priceId: selectedTier.stripePriceId }),
      });
      if (!res.ok) throw new Error('Failed to create payment intent');
      const { clientSecret } = await res.json();

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardNumberElement) },
      });

      if (result.error) throw new Error(result.error.message);
      onSuccess(result.paymentIntent);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label style={{ fontSize: 13, fontWeight: 600, color: t.muted, display: 'block', marginBottom: 4 }}>
        Card Number {brand && <span style={{ color: t.accent }}>({brand})</span>}
      </label>
      <div style={fieldStyle}>
        <CardNumberElement
          options={elementStyle}
          onChange={(e) => setBrand(e.brand ? e.brand.charAt(0).toUpperCase() + e.brand.slice(1) : '')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.muted, display: 'block', marginBottom: 4 }}>Expiry</label>
          <div style={fieldStyle}>
            <CardExpiryElement options={elementStyle} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.muted, display: 'block', marginBottom: 4 }}>CVC</label>
          <div style={fieldStyle}>
            <CardCvcElement options={elementStyle} />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: t.muted, marginBottom: 16 }}>
        Accepted: Visa · Mastercard · Amex · Discover · JCB
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%',
          padding: '12px 0',
          background: loading ? t.muted : t.accent,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading && <Spinner size={18} />}
        {loading ? 'Processing…' : `Pay ${selectedTier.priceLabel}`}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Crypto payment panel
// ---------------------------------------------------------------------------
function CryptoPanel({ selectedTier, t }) {
  const [coin, setCoin] = useState(CRYPTO_COINS[0]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const generateAddress = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/crypto/generate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ coin: coin.id, tierId: selectedTier.id, amount: selectedTier.price }),
      });
      if (!res.ok) throw new Error('Failed to generate address');
      const data = await res.json();
      setPaymentInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!paymentInfo?.paymentId) return;
    try {
      const res = await fetch(`/api/payments/crypto/check/${paymentInfo.paymentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setStatus(data.status);
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!paymentInfo) return;
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [paymentInfo]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CRYPTO_COINS.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCoin(c); setPaymentInfo(null); setStatus(null); }}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `2px solid ${coin.id === c.id ? t.accent : t.border}`,
              background: coin.id === c.id ? t.accent : t.surface,
              color: coin.id === c.id ? '#fff' : t.text,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {!paymentInfo ? (
        <button
          onClick={generateAddress}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 0',
            background: t.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading && <Spinner size={18} />}
          Generate {coin.name} Address
        </button>
      ) : (
        <div>
          <Alert type="info">
            Send exactly <strong>{paymentInfo.cryptoAmount} {coin.symbol}</strong> to the address below. Payment expires in 30 minutes.
          </Alert>
          <QRPlaceholder address={paymentInfo.address} coin={coin} t={t} />
          {status && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Badge color={status === 'confirmed' ? 'green' : status === 'pending' ? 'amber' : 'indigo'}>
                {status}
              </Badge>
            </div>
          )}
          <button
            onClick={checkStatus}
            style={{
              display: 'block',
              margin: '12px auto 0',
              fontSize: 13,
              color: t.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Refresh status
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gift card panel
// ---------------------------------------------------------------------------
function GiftCardPanel({ onSuccess, onError, t }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCode = (val) =>
    val
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 16)
      .replace(/(.{4})/g, '$1-')
      .replace(/-$/, '');

  const handleRedeem = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/payments/redeem-giftcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ code: code.replace(/-/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Redemption failed');
      onSuccess(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRedeem}>
      <label style={{ fontSize: 13, fontWeight: 600, color: t.muted, display: 'block', marginBottom: 6 }}>
        Gift Card Code
      </label>
      <input
        value={code}
        onChange={(e) => setCode(formatCode(e.target.value))}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        maxLength={19}
        style={{
          width: '100%',
          padding: '12px 14px',
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          background: t.surface,
          color: t.text,
          fontSize: 16,
          fontFamily: 'monospace',
          letterSpacing: 2,
          boxSizing: 'border-box',
          marginBottom: 14,
        }}
      />
      <button
        type="submit"
        disabled={code.replace(/-/g, '').length < 16 || loading}
        style={{
          width: '100%',
          padding: '12px 0',
          background: t.accent,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 15,
          cursor: code.length < 19 || loading ? 'not-allowed' : 'pointer',
          opacity: code.replace(/-/g, '').length < 16 ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading && <Spinner size={18} />}
        Redeem Code
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Billing history table
// ---------------------------------------------------------------------------
function BillingHistory({ t }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/payments/history', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((data) => setHistory(data.payments ?? []))
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: t.muted }}><Spinner /> Loading…</div>;
  if (error) return <Alert type="error">{error}</Alert>;
  if (history.length === 0) return <p style={{ color: t.muted, textAlign: 'center', padding: 24 }}>No payment history yet.</p>;

  const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: t.muted, borderBottom: `1px solid ${t.border}`, textTransform: 'uppercase', letterSpacing: 0.5 };
  const tdStyle = { padding: '12px 12px', fontSize: 14, color: t.text, borderBottom: `1px solid ${t.border}` };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>Method</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id}>
              <td style={tdStyle}>{fmtDate(item.date)}</td>
              <td style={tdStyle}>{item.description}</td>
              <td style={tdStyle}>{fmt(item.amount / 100)}</td>
              <td style={tdStyle}>{item.method ?? '—'}</td>
              <td style={tdStyle}>
                <Badge color={item.status === 'succeeded' ? 'green' : item.status === 'pending' ? 'amber' : 'indigo'}>
                  {item.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscription management panel
// ---------------------------------------------------------------------------
function ManageSubscription({ subscription, t }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const currentTier = TIERS.find((t) => t.id === subscription?.tierId) ?? TIERS[0];

  const handleChangePlan = async (newTier) => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/payments/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ newPriceId: newTier.stripePriceId, newTierId: newTier.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Plan change failed');
      setMsg({ type: 'success', text: `Plan updated to ${newTier.name}` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/payments/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ subscriptionId: subscription?.stripeSubscriptionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cancellation failed');
      setMsg({ type: 'success', text: 'Subscription cancelled. Access until end of billing period.' });
      setConfirmCancel(false);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      <div
        style={{
          background: t.cardBg,
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          border: `1px solid ${t.border}`,
        }}
      >
        <div style={{ fontSize: 13, color: t.muted, marginBottom: 4 }}>Current Plan</div>
        <div style={{ fontWeight: 700, fontSize: 20, color: t.text }}>{currentTier.name}</div>
        <div style={{ color: t.accent, fontWeight: 600 }}>{currentTier.priceLabel}</div>
        {subscription?.nextBillingDate && (
          <div style={{ fontSize: 13, color: t.muted, marginTop: 6 }}>
            Next billing: {fmtDate(subscription.nextBillingDate)}
          </div>
        )}
        {subscription?.status && (
          <div style={{ marginTop: 6 }}>
            <Badge color={subscription.status === 'active' ? 'green' : 'amber'}>{subscription.status}</Badge>
          </div>
        )}
      </div>

      <div style={{ fontWeight: 600, color: t.text, marginBottom: 10 }}>Switch Plan</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TIERS.filter((tier) => tier.id !== currentTier.id && tier.id !== 'free').map((tier) => (
          <button
            key={tier.id}
            onClick={() => handleChangePlan(tier)}
            disabled={loading}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              cursor: 'pointer',
              color: t.text,
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            <span>{tier.name}</span>
            <span style={{ color: t.accent, fontWeight: 700 }}>{tier.priceLabel}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
        {!confirmCancel ? (
          <button
            onClick={() => setConfirmCancel(true)}
            style={{
              color: t.danger,
              background: 'none',
              border: `1px solid ${t.danger}`,
              borderRadius: 8,
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Cancel Subscription
          </button>
        ) : (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: 12 }}>
              Are you sure? You will lose access at the end of your billing period.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: t.danger,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {loading && <Spinner size={14} />}
                Yes, Cancel
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Keep Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment tab — card / crypto / gift card switcher
// ---------------------------------------------------------------------------
function PaymentTab({ selectedTier, t }) {
  const [method, setMethod] = useState('card');
  const [alert, setAlert] = useState(null);

  const methods = ['card', 'crypto', 'giftcard'];
  const methodLabels = { card: 'Credit / Debit', crypto: 'Cryptocurrency', giftcard: 'Gift Card' };

  const stripeInstance = getStripe();

  return (
    <div>
      {!selectedTier || selectedTier.id === 'free' ? (
        <Alert type="info">Select a paid plan on the Plans tab to continue.</Alert>
      ) : (
        <>
          {alert && <Alert type={alert.type}>{alert.text}</Alert>}

          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: t.cardBg, borderRadius: 10, padding: 4 }}>
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 7,
                  border: 'none',
                  background: method === m ? t.accent : 'transparent',
                  color: method === m ? '#fff' : t.muted,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {methodLabels[m]}
              </button>
            ))}
          </div>

          {method === 'card' && (
            stripeInstance ? (
              <Elements stripe={stripeInstance}>
                <CardForm
                  selectedTier={selectedTier}
                  onSuccess={(pi) => setAlert({ type: 'success', text: `Payment confirmed! ID: ${pi.id}` })}
                  onError={(msg) => setAlert({ type: 'error', text: msg })}
                  t={t}
                />
              </Elements>
            ) : (
              <Alert type="warning">
                Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in your environment.
              </Alert>
            )
          )}
          {method === 'crypto' && (
            <CryptoPanel selectedTier={selectedTier} t={t} />
          )}
          {method === 'giftcard' && (
            <GiftCardPanel
              onSuccess={(data) => setAlert({ type: 'success', text: `Gift card redeemed! ${data.message ?? ''}` })}
              onError={(msg) => setAlert({ type: 'error', text: msg })}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export default function PaymentSystem({ darkMode = false, user = null, subscription = null }) {
  const t = useThemeVars(darkMode);
  const [activeTab, setActiveTab] = useState('Plans');
  const [selectedTier, setSelectedTier] = useState(
    () => TIERS.find((tier) => tier.id === (subscription?.tierId ?? 'free')) ?? TIERS[0]
  );

  const containerStyle = {
    background: t.bg,
    minHeight: '100vh',
    color: t.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '0 0 40px',
  };

  const headerStyle = {
    background: t.surface,
    borderBottom: `1px solid ${t.border}`,
    padding: '20px 24px',
    marginBottom: 24,
  };

  const tabBarStyle = {
    display: 'flex',
    gap: 0,
    background: t.cardBg,
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  };

  const cardStyle = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 14,
    padding: 24,
    maxWidth: 900,
    margin: '0 auto',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.text }}>Nexus AI Pro — Billing</h1>
            {user && (
              <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>
                {user.email} · {subscription?.tierId ? `${TIERS.find((t) => t.id === subscription.tierId)?.name ?? ''} plan` : 'Free plan'}
              </div>
            )}
          </div>
          {subscription?.status && (
            <Badge color={subscription.status === 'active' ? 'green' : 'amber'}>{subscription.status}</Badge>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
        <div style={tabBarStyle}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 7,
                border: 'none',
                background: activeTab === tab ? t.accent : 'transparent',
                color: activeTab === tab ? '#fff' : t.muted,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={cardStyle}>
          {activeTab === 'Plans' && (
            <>
              <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 20 }}>Choose Your Plan</h2>
              <PlanSelector currentTier={selectedTier.id} onSelect={setSelectedTier} t={t} />
              {selectedTier.id !== 'free' && (
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <button
                    onClick={() => setActiveTab('Payment')}
                    style={{
                      padding: '12px 32px',
                      background: t.accent,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    Continue with {selectedTier.name} →
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'Payment' && (
            <>
              <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 20 }}>
                Payment for {selectedTier.name} ({selectedTier.priceLabel})
              </h2>
              <PaymentTab selectedTier={selectedTier} t={t} />
            </>
          )}

          {activeTab === 'History' && (
            <>
              <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 20 }}>Billing History</h2>
              <BillingHistory t={t} />
            </>
          )}

          {activeTab === 'Manage' && (
            <>
              <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 20 }}>Manage Subscription</h2>
              <ManageSubscription subscription={subscription} t={t} />
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: t.muted }}>
          Payments are secured by Stripe · All transactions encrypted with TLS 1.3
        </div>
      </div>
    </div>
  );
}
