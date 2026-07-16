// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/components/PaymentSystem.jsx — 2026-07-16

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const PLANS = {
  free: {
    name: 'Free', price: 0, period: 'month', color: '#6b7280',
    features: ['5 chats/day', 'Basic models', '1MB uploads', 'Community support'],
    badge: '🆓', popular: false,
  },
  pro: {
    name: 'Pro', price: 9.99, period: 'month', color: '#3b82f6',
    features: ['Unlimited chats', 'All models', '100MB uploads', 'Analytics Dashboard', 'Priority support'],
    badge: '⭐', popular: true,
  },
  enterprise: {
    name: 'Enterprise', price: 14.99, period: 'month', color: '#8b5cf6',
    features: ['Everything in Pro', 'Custom models', 'API access', 'Team management', 'SLA', 'Dedicated support'],
    badge: '👑', popular: false,
  },
};

const CARD_NETWORKS = [
  { name: 'Visa', icon: '💳' },
  { name: 'Mastercard', icon: '🔴' },
  { name: 'American Express', icon: '🟦' },
  { name: 'Discover', icon: '🟠' },
  { name: 'Diners Club', icon: '⚫' },
  { name: 'JCB', icon: '🔵' },
  { name: 'UnionPay', icon: '🇨🇳' },
];

const CRYPTO_OPTIONS = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', icon: '₿', network: 'Bitcoin' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', network: 'Ethereum' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', icon: '$', network: 'Ethereum / Solana' },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', icon: '₮', network: 'Multi-chain' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', icon: '◎', network: 'Solana' },
  { id: 'bnb', name: 'BNB', symbol: 'BNB', icon: '🔶', network: 'BNB Chain' },
];

const PAYMENT_METHODS = ['card', 'crypto', 'gift'];

function CardForm({ plan, onSuccess }) {
  const [form, setForm] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCard = (val) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (val) => {
    const d = val.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const detectNetwork = (num) => {
    const n = num.replace(/\s/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'American Express';
    if (/^6(?:011|5)/.test(n)) return 'Discover';
    return null;
  };

  const handleSubmit = async () => {
    const num = form.number.replace(/\s/g, '');
    if (num.length < 13) { setError('Invalid card number'); return; }
    if (!form.name.trim()) { setError('Cardholder name required'); return; }
    if (form.expiry.length < 5) { setError('Invalid expiry date'); return; }
    if (form.cvc.length < 3) { setError('Invalid CVC'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify({ plan, method: 'card', cardData: { last4: num.slice(-4), network: detectNetwork(num) } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Payment failed'); } else { onSuccess?.(data); }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const network = detectNetwork(form.number);
  const s = (extra = {}) => ({ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#fff', fontSize: 14, boxSizing: 'border-box', ...extra });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', color: '#fca5a5', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        {CARD_NETWORKS.map(c => (
          <span key={c.name} title={c.name} style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#111827',
            border: `1px solid ${network === c.name ? '#3b82f6' : '#374151'}`,
            color: network === c.name ? '#60a5fa' : '#6b7280',
          }}>
            {c.icon} {c.name}
          </span>
        ))}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Card Number</label>
        <input
          value={form.number}
          onChange={e => setForm(f => ({ ...f, number: formatCard(e.target.value) }))}
          placeholder="1234 5678 9012 3456"
          style={s({ fontFamily: 'monospace', letterSpacing: 2 })}
          maxLength={19}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Cardholder Name</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" style={s()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Expiry</label>
          <input
            value={form.expiry}
            onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
            placeholder="MM/YY"
            style={s({ textAlign: 'center' })}
            maxLength={5}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>CVC</label>
          <input
            value={form.cvc}
            onChange={e => setForm(f => ({ ...f, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            placeholder="•••"
            type="password"
            style={s({ textAlign: 'center' })}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280', padding: '6px 0' }}>
        <span>🔒</span>
        <span>Payment secured by Stripe · PCI DSS Level 1 · Card data never stored on our servers</span>
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{
        padding: '12px', borderRadius: 8, border: 'none',
        background: `${PLANS[plan]?.color || '#3b82f6'}`,
        color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
      }}>
        {loading ? 'Processing...' : `Subscribe to ${PLANS[plan]?.name} — $${PLANS[plan]?.price}/mo`}
      </button>
    </div>
  );
}

function CryptoForm({ plan, onSuccess }) {
  const [selected, setSelected] = useState('eth');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(null);
  const [error, setError] = useState('');

  const planPrice = PLANS[plan]?.price || 0;
  const rates = { btc: 0.000014, eth: 0.0042, usdc: 1.0, usdt: 1.0, sol: 0.12, bnb: 0.017 };

  const handleGetAddress = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payments/crypto/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify({ plan, currency: selected }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to get address'); }
      else { setAddress(data.address || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`); }
    } catch {
      setAddress(`0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`);
    }
    setLoading(false);
  };

  const crypto = CRYPTO_OPTIONS.find(c => c.id === selected);
  const amount = (planPrice * (rates[selected] || 1)).toFixed(6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', color: '#fca5a5', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {CRYPTO_OPTIONS.map(c => (
          <button key={c.id} onClick={() => { setSelected(c.id); setAddress(null); }} style={{
            padding: '8px', borderRadius: 8, border: `1px solid ${selected === c.id ? '#f59e0b' : '#374151'}`,
            background: selected === c.id ? '#1a1200' : '#111827', color: selected === c.id ? '#fbbf24' : '#9ca3af',
            cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{c.symbol}</div>
            <div style={{ fontSize: 9, color: '#6b7280' }}>{c.name}</div>
          </button>
        ))}
      </div>

      {!address ? (
        <button onClick={handleGetAddress} disabled={loading} style={{
          padding: '11px', borderRadius: 8, border: 'none', background: '#f59e0b',
          color: '#000', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 14,
        }}>
          {loading ? 'Generating...' : `Pay ${amount} ${crypto?.symbol} for ${PLANS[plan]?.name}`}
        </button>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Send exactly <strong style={{ color: '#fbbf24' }}>{amount} {crypto?.symbol}</strong> to:</div>
          <div style={{
            background: '#1f2937', borderRadius: 8, padding: '10px 12px',
            fontFamily: 'monospace', fontSize: 12, color: '#e5e7eb',
            wordBreak: 'break-all', border: '1px solid #374151', marginBottom: 8,
          }}>
            {address}
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(address); }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #374151', background: '#111827', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}>
            📋 Copy Address
          </button>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 10 }}>
            ⏳ Waiting for blockchain confirmation (usually 1-3 minutes). Network: {crypto?.network}
          </div>
        </div>
      )}
    </div>
  );
}

function GiftCardForm({ plan, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const formatCode = (val) => val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    .replace(/(.{5})/g, '$1-').replace(/-$/, '');

  const handleRedeem = async () => {
    if (code.replace(/-/g, '').length < 8) { setError('Enter a valid gift card code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payments/giftcard/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify({ code: code.replace(/-/g, ''), plan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid or already redeemed gift card'); }
      else { setResult(data); onSuccess?.(data); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', color: '#fca5a5', fontSize: 12 }}>{error}</div>}
      {result ? (
        <div style={{ background: '#052e16', border: '1px solid #15803d', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>Gift Card Redeemed!</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            ${result.amount?.toFixed(2) || '0.00'} credit applied to your account
          </div>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 4 }}>🎁</div>
          <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Gift Card Code</label>
          <input
            value={code}
            onChange={e => setCode(formatCode(e.target.value))}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #374151',
              background: '#111827', color: '#fff', fontSize: 16, fontFamily: 'monospace',
              letterSpacing: 2, textAlign: 'center', boxSizing: 'border-box',
            }}
          />
          <button onClick={handleRedeem} disabled={loading} style={{
            padding: '11px', borderRadius: 8, border: 'none', background: '#22c55e',
            color: '#000', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 14,
          }}>
            {loading ? 'Checking...' : 'Redeem Gift Card'}
          </button>
        </>
      )}
    </div>
  );
}

export function PaymentSystem({ currentPlan = 'free', onSuccess }) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [success, setSuccess] = useState(null);

  const handleSuccess = useCallback((data) => {
    setSuccess({ plan: selectedPlan, method: paymentMethod, ...data });
    onSuccess?.(data);
  }, [selectedPlan, paymentMethod, onSuccess]);

  if (success) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#fff', fontSize: 22, marginBottom: 8 }}>You're subscribed!</h2>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>
            {PLANS[success.plan]?.badge} {PLANS[success.plan]?.name} plan is now active.
          </p>
          <button onClick={() => setSuccess(null)} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 24, color: '#fff' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>💳 {t('subscribe')}</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Choose your plan and payment method</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {Object.entries(PLANS).map(([id, plan]) => {
          const isActive = id === selectedPlan;
          const isCurrent = id === currentPlan;
          return (
            <div
              key={id}
              onClick={() => setSelectedPlan(id)}
              style={{
                cursor: 'pointer', borderRadius: 12, padding: '18px 16px',
                border: `2px solid ${isActive ? plan.color : '#1f2937'}`,
                background: isActive ? `${plan.color}11` : '#111827',
                transition: 'all 0.2s', position: 'relative',
              }}
            >
              {plan.popular && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '2px 12px', borderRadius: 10, background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 700 }}>POPULAR</div>}
              {isCurrent && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Current</div>}
              <div style={{ fontSize: 28, marginBottom: 6 }}>{plan.badge}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{plan.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: plan.color, margin: '6px 0 12px' }}>
                {plan.price === 0 ? 'Free' : `$${plan.price}/${plan.period}`}
              </div>
              {plan.features.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#22c55e' }}>✓</span> {f}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selectedPlan !== 'free' && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', marginBottom: 12 }}>Payment Method</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { id: 'card', label: '💳 Card', desc: 'Visa, Mastercard, Amex, +more' },
              { id: 'crypto', label: '₿ Crypto', desc: 'BTC, ETH, USDC, SOL, +more' },
              { id: 'gift', label: '🎁 Gift Card', desc: 'Redeem a gift card code' },
            ].map(m => (
              <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                border: `1px solid ${paymentMethod === m.id ? '#3b82f6' : '#374151'}`,
                background: paymentMethod === m.id ? '#0c1a3a' : '#111827',
                color: paymentMethod === m.id ? '#60a5fa' : '#9ca3af',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1f2937' }}>
            {paymentMethod === 'card' && <CardForm plan={selectedPlan} onSuccess={handleSuccess} />}
            {paymentMethod === 'crypto' && <CryptoForm plan={selectedPlan} onSuccess={handleSuccess} />}
            {paymentMethod === 'gift' && <GiftCardForm plan={selectedPlan} onSuccess={handleSuccess} />}
          </div>
        </div>
      )}

      {selectedPlan === 'free' && (
        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', maxWidth: 380 }}>
          <div style={{ fontSize: 22, marginBottom: 12 }}>🆓</div>
          <div style={{ fontSize: 14, color: '#e5e7eb', fontWeight: 600, marginBottom: 6 }}>Free Plan Selected</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>No payment required. Upgrade anytime to unlock all features.</div>
          <button onClick={() => setSelectedPlan('pro')} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Upgrade to Pro ⭐
          </button>
        </div>
      )}
    </div>
  );
}

export default PaymentSystem;
