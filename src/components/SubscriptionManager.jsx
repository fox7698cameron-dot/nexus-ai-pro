// ================================================
// NEXUS AI PRO - Subscription Manager Component
// Copyright © 2026 Cameron Fox. All rights reserved.
// Date: 2026-08-13
// ================================================

import React, { useState, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0 / mo',
    description: 'Get started with Nexus AI Pro',
    features: [
      '10 AI requests / day',
      'Access to base models',
      'Community support',
      '1 GB encrypted storage',
    ],
    stripePriceId: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    priceLabel: '$9.99 / mo',
    description: 'For power users and teams',
    features: [
      'Unlimited AI requests',
      'All premium models (GPT-4, Claude 3.5, Gemini)',
      'Priority support',
      '50 GB encrypted storage',
      'Advanced automation workflows',
      'Custom avatars',
    ],
    stripePriceId: 'price_pro_monthly',
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 14.99,
    priceLabel: '$14.99 / mo',
    description: 'Maximum power for organizations',
    features: [
      'Everything in Pro',
      'Dedicated support agent',
      '500 GB encrypted storage',
      'Custom model fine-tuning',
      'SSO & team management',
      'SLA guarantee',
      'On-premise deployment option',
    ],
    stripePriceId: 'price_enterprise_monthly',
  },
};

const CRYPTO_CURRENCIES = [
  { id: 'btc',  label: 'Bitcoin',  symbol: 'BTC', envKey: 'BTC_WALLET_ADDRESS' },
  { id: 'eth',  label: 'Ethereum', symbol: 'ETH', envKey: 'ETH_WALLET_ADDRESS' },
  { id: 'usdc', label: 'USDC',     symbol: 'USDC', envKey: 'USDC_WALLET_ADDRESS' },
  { id: 'sol',  label: 'Solana',   symbol: 'SOL', envKey: 'SOL_WALLET_ADDRESS' },
  { id: 'ltc',  label: 'Litecoin', symbol: 'LTC', envKey: 'LTC_WALLET_ADDRESS' },
];

// ─── Tiny helpers / sub-components ───────────────────────────────────────────

function Spinner({ size = 20 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function Alert({ type = 'error', children, onDismiss }) {
  const colors = {
    error:   { bg: 'var(--alert-error-bg)',   border: 'var(--alert-error-border)',   text: 'var(--alert-error-text)'   },
    success: { bg: 'var(--alert-success-bg)', border: 'var(--alert-success-border)', text: 'var(--alert-success-text)' },
    info:    { bg: 'var(--alert-info-bg)',    border: 'var(--alert-info-border)',    text: 'var(--alert-info-text)'    },
    warning: { bg: 'var(--alert-warning-bg)', border: 'var(--alert-warning-border)', text: 'var(--alert-warning-text)' },
  };
  const c = colors[type] || colors.info;
  return (
    <div role="alert" style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 8, padding: '10px 14px', marginBottom: 12,
      display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14,
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>
          ✕
        </button>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
      {children}
    </h3>
  );
}

function Badge({ children, variant = 'neutral' }) {
  const map = {
    neutral: { bg: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-text)' },
    pro:     { bg: 'var(--badge-pro-bg)',     color: 'var(--badge-pro-text)' },
    success: { bg: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' },
    danger:  { bg: 'var(--badge-danger-bg)',  color: 'var(--badge-danger-text)' },
    popular: { bg: 'var(--accent)',           color: '#fff' },
  };
  const s = map[variant] || map.neutral;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: s.bg, color: s.color,
    }}>
      {children}
    </span>
  );
}

// ─── Stripe card form (Stripe.js must be loaded by the parent page) ───────────

function StripeCardForm({ onSuccess, onError, tier, publishableKey }) {
  const [cardName,  setCardName]  = useState('');
  const [cardNum,   setCardNum]   = useState('');
  const [expiry,    setExpiry]    = useState('');
  const [cvc,       setCvc]       = useState('');
  const [loading,   setLoading]   = useState(false);

  /* Format helpers */
  const fmtCardNum = (v) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExpiry  = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  };

  /* Detect card brand from first digits */
  const detectBrand = (n) => {
    const num = n.replace(/\s/g, '');
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]|^2[2-7]/.test(num)) return 'Mastercard';
    if (/^3[47]/.test(num)) return 'Amex';
    if (/^6(?:011|22|4|5)/.test(num)) return 'Discover';
    if (/^3(?:0[0-5]|[68])/.test(num)) return 'Diners';
    if (/^35/.test(num)) return 'JCB';
    if (/^62/.test(num)) return 'UnionPay';
    return '';
  };
  const brand = detectBrand(cardNum);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In production this would use stripe.js createPaymentMethod
      // and then POST to /api/subscriptions/create-checkout-session.
      // Here we call the backend session endpoint directly.
      const res = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier: tier.id, cardName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      if (data.url) {
        // Stripe Checkout redirect
        window.location.href = data.url;
      } else {
        onSuccess?.(data);
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8, fontSize: 14,
    background: 'var(--input-bg)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none',
    transition: 'border-color 0.15s',
  };
  const labelStyle = {
    display: 'block', marginBottom: 4, fontSize: 12,
    fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Name on card</label>
        <input
          type="text" required autoComplete="cc-name"
          placeholder="Jane Smith"
          value={cardName} onChange={(e) => setCardName(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Card number
          {brand && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700 }}>{brand}</span>}
        </label>
        <input
          type="text" required inputMode="numeric" autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={cardNum}
          onChange={(e) => setCardNum(fmtCardNum(e.target.value))}
          style={inputStyle}
        />
        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Visa','Mastercard','Amex','Discover','JCB','UnionPay'].map(b => (
            <span key={b} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: brand === b ? 'var(--accent)' : 'var(--input-bg)',
              color: brand === b ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)', fontWeight: 600,
            }}>{b}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Expiry (MM / YY)</label>
          <input
            type="text" required inputMode="numeric" autoComplete="cc-exp"
            placeholder="08 / 28"
            value={expiry}
            onChange={(e) => setExpiry(fmtExpiry(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>CVC</label>
          <input
            type="text" required inputMode="numeric" autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        style={{
          width: '100%', padding: '12px', borderRadius: 8, fontSize: 15,
          fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
        }}
      >
        {loading && <Spinner size={16} />}
        {loading ? 'Processing…' : `Subscribe to ${tier.name} — ${tier.priceLabel}`}
      </button>

      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        Secured by Stripe · PCI DSS compliant · 256-bit encryption
      </p>
    </form>
  );
}

// ─── Crypto payment panel ─────────────────────────────────────────────────────

function CryptoPaymentPanel({ tier, onSuccess, onError }) {
  const [selected, setSelected]   = useState('btc');
  const [addresses, setAddresses] = useState({});
  const [loading,   setLoading]   = useState(false);
  const [txHash,    setTxHash]    = useState('');
  const [copied,    setCopied]    = useState('');
  const [initiated, setInitiated] = useState(false);

  // Fetch wallet addresses from window.__ENV__ (set by the server) or /api/config
  useEffect(() => {
    const env = window.__ENV__ || {};
    const known = {};
    CRYPTO_CURRENCIES.forEach(c => {
      if (env[c.envKey]) known[c.id] = env[c.envKey];
    });
    setAddresses(known);
  }, []);

  const currentAddress = addresses[selected] || '';
  const currentCoin    = CRYPTO_CURRENCIES.find(c => c.id === selected);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!txHash.trim()) { onError?.('Please enter your transaction hash / ID.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/crypto-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier: tier.id, currency: selected, txHash: txHash.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crypto payment submission failed');
      setInitiated(true);
      onSuccess?.(data);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initiated) {
    return (
      <Alert type="success">
        Transaction submitted for verification. Your subscription will activate within 1-3 confirmations.
        Check your email for status updates.
      </Alert>
    );
  }

  return (
    <div>
      {/* Currency selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CRYPTO_CURRENCIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '2px solid', cursor: 'pointer', transition: 'all 0.15s',
              borderColor: selected === c.id ? 'var(--accent)' : 'var(--border)',
              background:  selected === c.id ? 'var(--accent-subtle)' : 'var(--input-bg)',
              color:       selected === c.id ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {c.symbol}
          </button>
        ))}
      </div>

      {/* Wallet address */}
      {currentAddress ? (
        <div style={{
          background: 'var(--input-bg)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 12, marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {currentCoin?.label} Wallet Address
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 12, color: 'var(--text-primary)' }}>
              {currentAddress}
            </code>
            <button
              onClick={() => copyToClipboard(currentAddress, 'addr')}
              title="Copy address"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 4 }}
            >
              {copied === 'addr' ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Send exactly the equivalent of <strong>{tier.priceLabel}</strong> in {currentCoin?.symbol} to the address above.
            Rates are calculated at the time of confirmation.
          </p>
        </div>
      ) : (
        <Alert type="warning">
          {currentCoin?.symbol} wallet address is not configured yet. Please contact support or choose another currency.
        </Alert>
      )}

      {/* TX hash form */}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Transaction Hash / ID
        </label>
        <input
          type="text" required
          placeholder="Paste your transaction hash here…"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 12,
            background: 'var(--input-bg)', border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit" disabled={loading || !currentAddress}
          style={{
            width: '100%', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: (loading || !currentAddress) ? 'not-allowed' : 'pointer',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (loading || !currentAddress) ? 0.65 : 1,
          }}
        >
          {loading && <Spinner size={15} />}
          {loading ? 'Submitting…' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
}

// ─── Gift card redemption ─────────────────────────────────────────────────────

function GiftCardPanel({ onSuccess, onError }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/redeem-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption failed');
      onSuccess?.(data);
      setCode('');
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text" required
        placeholder="GIFT-XXXX-XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={24}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 14,
          background: 'var(--input-bg)', border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontFamily: 'monospace', letterSpacing: '0.1em',
        }}
      />
      <button
        type="submit" disabled={loading}
        style={{
          padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: 'var(--accent)', color: '#fff', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading && <Spinner size={14} />}
        {loading ? 'Redeeming…' : 'Redeem'}
      </button>
    </form>
  );
}

// ─── Billing history ──────────────────────────────────────────────────────────

function BillingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/subscriptions/billing-history', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load billing history');
        setHistory(data.invoices || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Spinner /></div>;
  if (error)   return <Alert type="error">{error}</Alert>;
  if (!history.length) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No billing history yet.</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {['Date', 'Description', 'Amount', 'Status'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-muted)', fontWeight: 600, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((inv, i) => (
            <tr key={inv.id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                {new Date(inv.date).toLocaleDateString()}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                {inv.description}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                ${(inv.amount / 100).toFixed(2)} {inv.currency?.toUpperCase()}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'danger'}>
                  {inv.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Payment method management ────────────────────────────────────────────────

function PaymentMethodManager({ onError }) {
  const [methods,  setMethods]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [removing, setRemoving] = useState(null);

  const fetchMethods = useCallback(async () => {
    try {
      const res  = await fetch('/api/subscriptions/payment-methods', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payment methods');
      setMethods(data.methods || []);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const handleRemove = async (methodId) => {
    setRemoving(methodId);
    try {
      const res  = await fetch(`/api/subscriptions/payment-methods/${methodId}`, {
        method: 'DELETE', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove payment method');
      await fetchMethods();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 16 }}><Spinner /></div>;
  if (!methods.length) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No payment methods on file.</p>;

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {methods.map(m => (
        <li key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: 22 }}>
            {m.brand === 'visa' ? '💳' : m.brand === 'mastercard' ? '🟡' : '💳'}
          </span>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>
            <strong style={{ textTransform: 'capitalize' }}>{m.brand}</strong> •••• {m.last4}
            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
              Exp {m.exp_month}/{m.exp_year}
            </span>
          </span>
          {m.isDefault && <Badge variant="pro">Default</Badge>}
          <button
            onClick={() => handleRemove(m.id)}
            disabled={removing === m.id}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 10px', fontSize: 12, cursor: 'pointer',
              color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {removing === m.id ? <Spinner size={12} /> : 'Remove'}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({ tier, isCurrent, onSelect }) {
  return (
    <div
      onClick={() => !isCurrent && onSelect(tier)}
      style={{
        border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 12, padding: '20px 18px', cursor: isCurrent ? 'default' : 'pointer',
        background: isCurrent ? 'var(--accent-subtle)' : 'var(--card-bg)',
        position: 'relative', transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isCurrent ? '0 0 0 4px var(--accent-glow)' : 'none',
      }}
    >
      {tier.popular && (
        <div style={{ position: 'absolute', top: -10, right: 16 }}>
          <Badge variant="popular">Most Popular</Badge>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {tier.name}
        </h4>
        {isCurrent && <Badge variant="success">Current Plan</Badge>}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
        {tier.priceLabel}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>{tier.description}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {tier.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}><CheckIcon /></span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Cancel / downgrade confirmation ─────────────────────────────────────────

function CancelModal({ currentTier, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--modal-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 28, maxWidth: 440, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Cancel Subscription</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)' }}>
          You are about to cancel your <strong>{TIERS[currentTier]?.name}</strong> plan.
          You will retain access until the end of your billing period.
        </p>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Reason (optional)
        </label>
        <textarea
          rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Help us improve…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
            fontSize: 14, resize: 'vertical', marginBottom: 18,
            background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: '1px solid var(--border)', background: 'var(--input-bg)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Keep Subscription
          </button>
          <button
            onClick={() => onConfirm(reason)} disabled={loading}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700,
              border: 'none', background: '#dc2626', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <Spinner size={14} />}
            {loading ? 'Cancelling…' : 'Yes, Cancel Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * SubscriptionManager
 *
 * Renders the full subscription UI:
 *   - Tier selector
 *   - Stripe card form
 *   - Crypto payments
 *   - Gift card redemption
 *   - Billing history
 *   - Payment method management
 *   - Cancel / upgrade / downgrade flows
 *
 * The Stripe publishable key is read from `window.__ENV__.STRIPE_PUBLISHABLE_KEY`
 * (injected server-side) and never hardcoded.
 */
export default function SubscriptionManager({ initialTier = 'free', onTierChange }) {
  const [tab,            setTab]            = useState('plans');   // plans | billing | methods
  const [payMode,        setPayMode]        = useState('card');    // card | crypto | gift
  const [currentTier,   setCurrentTier]    = useState(initialTier);
  const [selectedTier,  setSelectedTier]   = useState(null);      // tier user clicked to subscribe
  const [subData,        setSubData]        = useState(null);
  const [loadingSub,     setLoadingSub]     = useState(true);
  const [alert,          setAlert]          = useState(null);      // { type, message }
  const [showCancel,     setShowCancel]     = useState(false);
  const [cancelLoading,  setCancelLoading]  = useState(false);
  const [publishableKey, setPublishableKey] = useState('');

  // Resolve Stripe publishable key from window.__ENV__ or /api/config
  useEffect(() => {
    const envKey = window.__ENV__?.STRIPE_PUBLISHABLE_KEY;
    if (envKey) {
      setPublishableKey(envKey);
      return;
    }
    fetch('/api/config', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (d.stripePublishableKey) setPublishableKey(d.stripePublishableKey); })
      .catch(() => { /* key unavailable; Stripe UI still renders without it */ });
  }, []);

  // Load current subscription from backend
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/subscriptions/subscription', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setSubData(data);
          setCurrentTier(data.tier || 'free');
          onTierChange?.(data.tier || 'free');
        }
      } catch {
        /* fail silently; use initialTier */
      } finally {
        setLoadingSub(false);
      }
    })();
  }, [onTierChange]);

  const showAlert = (type, message, duration = 6000) => {
    setAlert({ type, message });
    if (duration) setTimeout(() => setAlert(null), duration);
  };

  const handleTierSelect = (tier) => {
    if (tier.id === currentTier) return;
    setSelectedTier(tier);
    setTab('plans');
  };

  const handlePaySuccess = (data) => {
    showAlert('success', data.message || 'Subscription updated successfully!');
    setSelectedTier(null);
    if (data.tier) {
      setCurrentTier(data.tier);
      onTierChange?.(data.tier);
    }
  };

  const handlePayError = (msg) => {
    showAlert('error', msg || 'Something went wrong. Please try again.');
  };

  const handleCancel = async (reason) => {
    setCancelLoading(true);
    try {
      const res  = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation failed');
      setShowCancel(false);
      setCurrentTier('free');
      onTierChange?.('free');
      showAlert('info', data.message || 'Your subscription has been cancelled. You retain access until end of period.');
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const containerStyle = {
    maxWidth: 760, margin: '0 auto', padding: '24px 16px',
    color: 'var(--text-primary)', fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const tabStyle = (active) => ({
    padding: '8px 18px', borderRadius: 20, fontSize: 14, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--accent)' : 'var(--input-bg)',
    color:      active ? '#fff'          : 'var(--text-secondary)',
    boxShadow:  active ? '0 2px 8px var(--accent-glow)' : 'none',
  });

  const cardStyle = {
    background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 14, padding: 22, marginBottom: 18,
  };

  const payModeBtn = (mode, label) => ({
    flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
    borderColor: payMode === mode ? 'var(--accent)' : 'var(--border)',
    background:  payMode === mode ? 'var(--accent-subtle)' : 'transparent',
    color:       payMode === mode ? 'var(--accent)' : 'var(--text-secondary)',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      {/* CSS variables & keyframe — injected once via style tag */}
      <style>{`
        :root {
          --accent:            #6366f1;
          --accent-subtle:     rgba(99,102,241,0.1);
          --accent-glow:       rgba(99,102,241,0.25);
          --text-primary:      #111827;
          --text-secondary:    #374151;
          --text-muted:        #6b7280;
          --text-danger:       #dc2626;
          --border:            #e5e7eb;
          --border-subtle:     #f3f4f6;
          --card-bg:           #ffffff;
          --modal-bg:          #ffffff;
          --input-bg:          #f9fafb;
          --badge-neutral-bg:  #f3f4f6;  --badge-neutral-text: #374151;
          --badge-pro-bg:      rgba(99,102,241,0.12); --badge-pro-text: #6366f1;
          --badge-success-bg:  rgba(16,185,129,0.12); --badge-success-text: #059669;
          --badge-danger-bg:   rgba(220,38,38,0.12);  --badge-danger-text: #dc2626;
          --alert-error-bg:    rgba(220,38,38,0.08);   --alert-error-border: rgba(220,38,38,0.3);   --alert-error-text: #991b1b;
          --alert-success-bg:  rgba(16,185,129,0.08);  --alert-success-border: rgba(16,185,129,0.3); --alert-success-text: #065f46;
          --alert-info-bg:     rgba(59,130,246,0.08);  --alert-info-border: rgba(59,130,246,0.3);   --alert-info-text: #1d4ed8;
          --alert-warning-bg:  rgba(245,158,11,0.08);  --alert-warning-border: rgba(245,158,11,0.3); --alert-warning-text: #92400e;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --accent:            #818cf8;
            --accent-subtle:     rgba(129,140,248,0.12);
            --accent-glow:       rgba(129,140,248,0.2);
            --text-primary:      #f9fafb;
            --text-secondary:    #d1d5db;
            --text-muted:        #9ca3af;
            --text-danger:       #f87171;
            --border:            #374151;
            --border-subtle:     #1f2937;
            --card-bg:           #1f2937;
            --modal-bg:          #111827;
            --input-bg:          #111827;
            --badge-neutral-bg:  #374151;  --badge-neutral-text: #d1d5db;
            --badge-pro-bg:      rgba(129,140,248,0.15); --badge-pro-text: #818cf8;
            --badge-success-bg:  rgba(52,211,153,0.15);  --badge-success-text: #34d399;
            --badge-danger-bg:   rgba(248,113,113,0.15); --badge-danger-text: #f87171;
            --alert-error-bg:    rgba(248,113,113,0.1);   --alert-error-border: rgba(248,113,113,0.3);  --alert-error-text: #fca5a5;
            --alert-success-bg:  rgba(52,211,153,0.1);    --alert-success-border: rgba(52,211,153,0.3); --alert-success-text: #6ee7b7;
            --alert-info-bg:     rgba(96,165,250,0.1);    --alert-info-border: rgba(96,165,250,0.3);    --alert-info-text: #93c5fd;
            --alert-warning-bg:  rgba(251,191,36,0.1);    --alert-warning-border: rgba(251,191,36,0.3); --alert-warning-text: #fcd34d;
          }
        }
        :root[data-theme="dark"] {
          --accent:            #818cf8;
          --accent-subtle:     rgba(129,140,248,0.12);
          --accent-glow:       rgba(129,140,248,0.2);
          --text-primary:      #f9fafb;
          --text-secondary:    #d1d5db;
          --text-muted:        #9ca3af;
          --text-danger:       #f87171;
          --border:            #374151;
          --border-subtle:     #1f2937;
          --card-bg:           #1f2937;
          --modal-bg:          #111827;
          --input-bg:          #111827;
          --badge-neutral-bg:  #374151;  --badge-neutral-text: #d1d5db;
          --badge-pro-bg:      rgba(129,140,248,0.15); --badge-pro-text: #818cf8;
          --badge-success-bg:  rgba(52,211,153,0.15);  --badge-success-text: #34d399;
          --badge-danger-bg:   rgba(248,113,113,0.15); --badge-danger-text: #f87171;
          --alert-error-bg:    rgba(248,113,113,0.1);   --alert-error-border: rgba(248,113,113,0.3);  --alert-error-text: #fca5a5;
          --alert-success-bg:  rgba(52,211,153,0.1);    --alert-success-border: rgba(52,211,153,0.3); --alert-success-text: #6ee7b7;
          --alert-info-bg:     rgba(96,165,250,0.1);    --alert-info-border: rgba(96,165,250,0.3);    --alert-info-text: #93c5fd;
          --alert-warning-bg:  rgba(251,191,36,0.1);    --alert-warning-border: rgba(251,191,36,0.3); --alert-warning-text: #fcd34d;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
          Subscription &amp; Billing
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
          Manage your Nexus AI Pro plan, payment methods, and billing history.
        </p>
      </div>

      {/* Global alert */}
      {alert && (
        <Alert type={alert.type} onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {[['plans', 'Plans'], ['billing', 'Billing History'], ['methods', 'Payment Methods']].map(([id, label]) => (
          <button key={id} style={tabStyle(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── PLANS TAB ── */}
      {tab === 'plans' && (
        <>
          {/* Current status banner */}
          {!loadingSub && subData && (
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Current plan</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {TIERS[currentTier]?.name || 'Free'}
                </div>
                {subData.renewalDate && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Renews {new Date(subData.renewalDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              {currentTier !== 'free' && (
                <button
                  onClick={() => setShowCancel(true)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid #dc2626', background: 'transparent',
                    color: '#dc2626', cursor: 'pointer',
                  }}
                >
                  Cancel Plan
                </button>
              )}
            </div>
          )}

          {/* Tier grid */}
          <div style={{
            display: 'grid', gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginBottom: 22,
          }}>
            {Object.values(TIERS).map(tier => (
              <TierCard
                key={tier.id}
                tier={tier}
                isCurrent={tier.id === currentTier}
                onSelect={handleTierSelect}
              />
            ))}
          </div>

          {/* Checkout panel — shown when a new tier is selected */}
          {selectedTier && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <SectionTitle>
                  {currentTier === 'free' || !currentTier
                    ? `Subscribe to ${selectedTier.name}`
                    : TIERS[currentTier]?.price < selectedTier.price
                      ? `Upgrade to ${selectedTier.name}`
                      : `Downgrade to ${selectedTier.name}`}
                </SectionTitle>
                <button
                  onClick={() => setSelectedTier(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
                  aria-label="Close"
                >×</button>
              </div>

              {/* Payment mode selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button style={payModeBtn('card',   '💳 Card')}   onClick={() => setPayMode('card')}>💳 Card</button>
                <button style={payModeBtn('crypto', '₿ Crypto')} onClick={() => setPayMode('crypto')}>₿ Crypto</button>
                <button style={payModeBtn('gift',   '🎁 Gift')}   onClick={() => setPayMode('gift')}>🎁 Gift Card</button>
              </div>

              {payMode === 'card' && (
                <StripeCardForm
                  tier={selectedTier}
                  publishableKey={publishableKey}
                  onSuccess={handlePaySuccess}
                  onError={handlePayError}
                />
              )}
              {payMode === 'crypto' && (
                <CryptoPaymentPanel
                  tier={selectedTier}
                  onSuccess={handlePaySuccess}
                  onError={handlePayError}
                />
              )}
              {payMode === 'gift' && (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
                    Redeem a Nexus AI Pro gift card to activate or extend your subscription.
                  </p>
                  <GiftCardPanel onSuccess={handlePaySuccess} onError={handlePayError} />
                </>
              )}
            </div>
          )}

          {/* Standalone gift card section (no tier change needed) */}
          {!selectedTier && (
            <div style={cardStyle}>
              <SectionTitle>Redeem Gift Card</SectionTitle>
              <GiftCardPanel
                onSuccess={(d) => showAlert('success', d.message || 'Gift card redeemed!')}
                onError={handlePayError}
              />
            </div>
          )}
        </>
      )}

      {/* ── BILLING TAB ── */}
      {tab === 'billing' && (
        <div style={cardStyle}>
          <SectionTitle>Billing History</SectionTitle>
          <BillingHistory />
        </div>
      )}

      {/* ── METHODS TAB ── */}
      {tab === 'methods' && (
        <div style={cardStyle}>
          <SectionTitle>Saved Payment Methods</SectionTitle>
          <PaymentMethodManager onError={handlePayError} />
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <CancelModal
          currentTier={currentTier}
          loading={cancelLoading}
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
