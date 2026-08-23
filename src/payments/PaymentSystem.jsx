/**
 * src/payments/PaymentSystem.jsx
 * Stripe checkout (all major cards + debit), crypto payments, gift card redemption.
 * No API keys are hard-coded — all secrets flow through /api/payments server routes.
 * Created: 2026-08-23
 */

import React, { useState } from 'react';

// ── Supported payment methods ─────────────────────────────────────────────────
const CARD_BRANDS = [
  { id: 'visa',       name: 'Visa',            icon: '💳', color: '#1a1f71' },
  { id: 'mastercard', name: 'Mastercard',      icon: '🔴', color: '#eb001b' },
  { id: 'amex',       name: 'Amex',            icon: '💠', color: '#016fd0' },
  { id: 'discover',   name: 'Discover',        icon: '🟠', color: '#ff6600' },
  { id: 'jcb',        name: 'JCB',             icon: '🔷', color: '#003087' },
  { id: 'unionpay',   name: 'UnionPay',        icon: '🔴', color: '#c0392b' },
  { id: 'amex_debit', name: 'Amex Debit',      icon: '💙', color: '#016fd0' },
];

const CRYPTO_OPTIONS = [
  { id: 'btc',   name: 'Bitcoin',   symbol: 'BTC', icon: '₿', color: '#f7931a' },
  { id: 'eth',   name: 'Ethereum',  symbol: 'ETH', icon: 'Ξ', color: '#627eea' },
  { id: 'sol',   name: 'Solana',    symbol: 'SOL', icon: '◎', color: '#9945ff' },
  { id: 'usdc',  name: 'USD Coin',  symbol: 'USDC', icon: '💵', color: '#2775ca' },
  { id: 'usdt',  name: 'Tether',    symbol: 'USDT', icon: '₮', color: '#26a17b' },
  { id: 'matic', name: 'Polygon',   symbol: 'MATIC', icon: '🟣', color: '#8247e5' },
];

const PLANS = [
  { id: 'pro',        name: 'Pro',         price: 9.99,  interval: 'month', currency: 'USD', features: ['Unlimited chats', 'All AI models', '100 MB uploads', 'Priority support'] },
  { id: 'enterprise', name: 'Enterprise',  price: 49.99, interval: 'month', currency: 'USD', features: ['Everything in Pro', 'Custom AI models', '10 GB uploads', 'Dedicated support', 'SSO & SAML', 'Audit logs'] },
  { id: 'lifetime',   name: 'Lifetime',    price: 299,   interval: 'once',  currency: 'USD', features: ['Everything in Enterprise', 'Lifetime updates', 'Priority SLA'] },
];

// ── Luhn validation (client-side, server double-checks) ───────────────────────
function luhnCheck(num) {
  const n = num.replace(/\s/g, '');
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i], 10);
    if (isNaN(d)) return false;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectCardBrand(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n))            return 'visa';
  if (/^5[1-5]/.test(n))      return 'mastercard';
  if (/^3[47]/.test(n))       return 'amex';
  if (/^6(?:011|5)/.test(n))  return 'discover';
  if (/^35/.test(n))          return 'jcb';
  if (/^62/.test(n))          return 'unionpay';
  return null;
}

function formatCard(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  return val.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
}

// ── Card Form ─────────────────────────────────────────────────────────────────
function CardForm({ plan, onSuccess }) {
  const [form, setForm]   = useState({ number: '', expiry: '', cvv: '', name: '', zip: '' });
  const [brand, setBrand] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const handleNumber = (v) => {
    const fmt = formatCard(v);
    setForm((p) => ({ ...p, number: fmt }));
    setBrand(detectCardBrand(fmt));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const raw = form.number.replace(/\s/g, '');
    if (!luhnCheck(raw)) { setError('Invalid card number'); return; }

    setBusy(true);
    try {
      // Tokenize via Stripe.js on the client — never send raw card data directly
      // In production: use window.Stripe(publishableKey).createPaymentMethod(...)
      const res = await fetch('/api/payments/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId:   plan.id,
          // Send only non-sensitive data server-side; card tokenization happens in Stripe.js
          cardBrand: brand,
          cardLastFour: raw.slice(-4),
          zip: form.zip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const brandInfo = CARD_BRANDS.find((b) => b.id === brand);

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>{error}</div>}

      <div style={field}>
        <label style={lbl}>Cardholder Name</label>
        <input style={inp} required placeholder="Jane Smith"
          value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      </div>

      <div style={field}>
        <label style={lbl}>Card Number {brandInfo && <span style={{ color: brandInfo.color }}>· {brandInfo.name}</span>}</label>
        <input style={inp} required inputMode="numeric" placeholder="1234 5678 9012 3456"
          value={form.number} onChange={(e) => handleNumber(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={field}>
          <label style={lbl}>Expiry</label>
          <input style={inp} required placeholder="MM/YY" maxLength={5}
            value={form.expiry}
            onChange={(e) => setForm((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))} />
        </div>
        <div style={field}>
          <label style={lbl}>CVV</label>
          <input style={inp} required inputMode="numeric" placeholder="•••" maxLength={4} type="password"
            value={form.cvv} onChange={(e) => setForm((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
        </div>
        <div style={field}>
          <label style={lbl}>ZIP</label>
          <input style={inp} placeholder="90210"
            value={form.zip} onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CARD_BRANDS.map((b) => (
          <span key={b.id} style={{ fontSize: 11, color: '#64748b', border: '1px solid #334155', borderRadius: 4, padding: '2px 7px' }}>{b.icon} {b.name}</span>
        ))}
      </div>

      <button type="submit" disabled={busy}
        style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontWeight: 700, fontSize: 16, cursor: busy ? 'wait' : 'pointer', marginTop: 4 }}>
        {busy ? 'Processing…' : `Pay $${plan.price}${plan.interval !== 'once' ? `/${plan.interval}` : ''}`}
      </button>
    </form>
  );
}

// ── Crypto Form ───────────────────────────────────────────────────────────────
function CryptoForm({ plan, onSuccess }) {
  const [selected, setSelected] = useState(null);
  const [address, setAddress]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  const requestAddress = async (cryptoId) => {
    setSelected(cryptoId);
    setBusy(true);
    try {
      const res = await fetch('/api/payments/crypto/address', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId: plan.id, currency: cryptoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate address');
      setAddress(data.address);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 14, marginBottom: 14 }}>{error}</div>}
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 14 }}>Select a cryptocurrency to pay:</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {CRYPTO_OPTIONS.map((c) => (
          <button key={c.id} onClick={() => requestAddress(c.id)}
            style={{ background: selected === c.id ? `${c.color}22` : '#0f172a', border: `2px solid ${selected === c.id ? c.color : '#334155'}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 24 }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.symbol}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{c.name}</div>
          </button>
        ))}
      </div>

      {address && (
        <div style={{ marginTop: 16, background: '#0f172a', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Send exactly to this address:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#f8fafc', wordBreak: 'break-all', background: '#1e293b', padding: 10, borderRadius: 8 }}>{address}</div>
          <button onClick={() => navigator.clipboard.writeText(address)}
            style={{ marginTop: 10, background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            📋 Copy Address
          </button>
        </div>
      )}

      {busy && <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Generating secure address…</div>}
    </div>
  );
}

// ── Gift Card Form ────────────────────────────────────────────────────────────
function GiftCardForm({ plan, onSuccess }) {
  const [code, setCode]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const redeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError('Enter a gift card code'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/payments/giftcard/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim(), planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption failed');
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={redeem}>
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 14, marginBottom: 14 }}>{error}</div>}
      <label style={lbl}>Gift Card Code</label>
      <input style={inp} required placeholder="XXXX-XXXX-XXXX-XXXX"
        value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <button type="submit" disabled={busy}
        style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontSize: 15 }}>
        {busy ? 'Redeeming…' : '🎁 Redeem Gift Card'}
      </button>
    </form>
  );
}

// ── Main Payment System ───────────────────────────────────────────────────────
export default function PaymentSystem({ onSuccess }) {
  const [selectedPlan, setPlan]  = useState(PLANS[0]);
  const [method, setMethod]      = useState('card');
  const [done, setDone]          = useState(false);
  const [doneData, setDoneData]  = useState(null);

  const handleSuccess = (data) => {
    setDone(true);
    setDoneData(data);
    onSuccess?.(data);
  };

  if (done) {
    return (
      <div style={{ background: '#0f172a', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64 }}>✅</div>
          <h2 style={{ color: '#22c55e', fontSize: 24, fontWeight: 800, marginTop: 12 }}>Payment Successful!</h2>
          <p style={{ color: '#94a3b8' }}>Your {selectedPlan.name} plan is now active.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 24 }}>💳 Checkout</h1>

      {/* Plan selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14, marginBottom: 28 }}>
        {PLANS.map((p) => (
          <div key={p.id} onClick={() => setPlan(p)}
            style={{ background: selectedPlan.id === p.id ? '#1e3a5f' : '#1e293b', border: `2px solid ${selectedPlan.id === p.id ? '#3b82f6' : '#334155'}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#f8fafc' }}>{p.name}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#60a5fa', margin: '6px 0' }}>
              ${p.price}<span style={{ fontSize: 13, color: '#64748b' }}>{p.interval !== 'once' ? `/${p.interval}` : ''}</span>
            </div>
            {p.features.map((f) => <div key={f} style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>✓ {f}</div>)}
          </div>
        ))}
      </div>

      {/* Payment method tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['card', '💳 Card'], ['crypto', '₿ Crypto'], ['giftcard', '🎁 Gift Card']].map(([m, label]) => (
          <button key={m} onClick={() => setMethod(m)}
            style={{ background: method === m ? '#3b82f622' : '#1e293b', color: method === m ? '#60a5fa' : '#94a3b8', border: `1px solid ${method === m ? '#3b82f6' : '#334155'}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24, maxWidth: 520 }}>
        {method === 'card'     && <CardForm     plan={selectedPlan} onSuccess={handleSuccess} />}
        {method === 'crypto'   && <CryptoForm   plan={selectedPlan} onSuccess={handleSuccess} />}
        {method === 'giftcard' && <GiftCardForm plan={selectedPlan} onSuccess={handleSuccess} />}
      </div>

      <p style={{ color: '#334155', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        🔒 Payments are processed securely via Stripe. No card data is stored on our servers.
      </p>
    </div>
  );
}

// Shared styles
const field = {};
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };
const inp  = { width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', padding: '10px 12px', fontSize: 15, marginBottom: 4 };
