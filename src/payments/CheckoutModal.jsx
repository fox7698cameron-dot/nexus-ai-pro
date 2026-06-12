// src/payments/CheckoutModal.jsx
// 2026-06-12 | Nexus AI Pro — Checkout Modal
// Stripe (all major cards) · Crypto · Gift Cards · Free tier
// Uses Stripe.js hosted checkout — no raw card numbers touch our server

import React, { useState, useEffect } from 'react';

const PLANS = [
  { id: 'free',       name: 'Free',       price: '$0',       period: '/mo', features: ['5 AI chats/day','1 project','Community support'], highlight: false },
  { id: 'pro',        name: 'Pro',         price: '$9.99',    period: '/mo', features: ['Unlimited chats','10 projects','Analytics','Priority support','All platforms'], highlight: true },
  { id: 'enterprise', name: 'Enterprise',  price: '$14.99',   period: '/mo', features: ['Everything in Pro','50 projects','Custom connectors','Dedicated support','SLA'], highlight: false }
];

const PAYMENT_METHODS = [
  { id: 'card',   label: '💳 Credit / Debit Card', sub: 'Visa · Mastercard · Amex · Discover · JCB · UnionPay' },
  { id: 'crypto', label: '🪙 Cryptocurrency',       sub: 'BTC · ETH · USDC · and more' },
  { id: 'gift',   label: '🎁 Gift Card',             sub: 'Redeem a Nexus AI Pro gift code' }
];

// ---- PlanCard --------------------------------------------------------

function PlanCard({ plan, selected, onSelect }) {
  return (
    <div
      onClick={() => plan.id !== 'free' && onSelect(plan.id)}
      style={{
        background: selected ? '#1f3a5f' : 'rgba(255,255,255,0.04)',
        border: `2px solid ${selected ? '#58a6ff' : plan.highlight ? '#8957e5' : '#30363d'}`,
        borderRadius: 12, padding: 20, cursor: plan.id === 'free' ? 'default' : 'pointer',
        position: 'relative', transition: 'all .2s', flex: 1, minWidth: 140
      }}
    >
      {plan.highlight && (
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: '#8957e5', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '2px 10px', borderRadius: 10 }}>POPULAR</div>
      )}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{plan.name}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#58a6ff' }}>{plan.price}<span style={{ fontSize: 13, color: '#8b949e' }}>{plan.period}</span></div>
      <ul style={{ margin: '12px 0 0', padding: '0 0 0 16px', fontSize: 12, color: '#8b949e', lineHeight: 1.7 }}>
        {plan.features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}

// ---- main component -------------------------------------------------

export default function CheckoutModal({ currentPlan = 'free', userId, onClose, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [method, setMethod] = useState('card');
  const [giftCode, setGiftCode] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [loading, setLoading] = useState(false);
  const [cryptoRequest, setCryptoRequest] = useState(null);
  const [giftResult, setGiftResult] = useState(null);
  const [error, setError] = useState('');

  const handleCardCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/payments/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}`
        },
        body: JSON.stringify({
          planId: selectedPlan,
          successUrl: `${window.location.origin}?upgraded=1`,
          cancelUrl: window.location.href
        })
      });
      const data = await r.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      // Redirect to Stripe Checkout
      if (data.url) window.location.href = data.url;
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const handleCrypto = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/payments/crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}`
        },
        body: JSON.stringify({ planId: selectedPlan, currency: cryptoCurrency })
      });
      const data = await r.json();
      if (data.error) { setError(data.error); } else { setCryptoRequest(data); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const handleGift = async () => {
    setError('');
    if (!giftCode.trim()) { setError('Enter a gift code.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/payments/redeem-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('nexus_token') || ''}`
        },
        body: JSON.stringify({ code: giftCode })
      });
      const data = await r.json();
      if (data.error) { setError(data.error); } else { setGiftResult(data); onSuccess?.(data); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Upgrade Nexus AI Pro</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {PLANS.map(p => (
            <PlanCard key={p.id} plan={p} selected={selectedPlan === p.id} onSelect={setSelectedPlan} />
          ))}
        </div>

        {selectedPlan !== 'free' && (
          <>
            {/* Payment method tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid #30363d' }}>
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id} onClick={() => setMethod(pm.id)} style={{
                  flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
                  background: method === pm.id ? '#1f3a5f' : 'transparent',
                  color: method === pm.id ? '#58a6ff' : '#8b949e',
                  fontSize: 12, fontWeight: method === pm.id ? 700 : 400,
                  borderRight: '1px solid #30363d', transition: 'all .2s'
                }}>
                  {pm.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>
              {PAYMENT_METHODS.find(p => p.id === method)?.sub}
            </div>

            {error && <div style={{ background: '#2d0000', color: '#ff4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

            {/* Card payment */}
            {method === 'card' && (
              <div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 13, color: '#8b949e' }}>
                  You'll be redirected to Stripe's secure checkout page. We never store or see your card number.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {['VISA', 'MC', 'AMEX', 'DISCOVER', 'JCB', 'UNIONPAY'].map(brand => (
                    <span key={brand} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#e6edf3' }}>{brand}</span>
                  ))}
                </div>
                <button onClick={handleCardCheckout} disabled={loading} style={{
                  width: '100%', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer'
                }}>
                  {loading ? 'Redirecting…' : `Subscribe to ${PLANS.find(p => p.id === selectedPlan)?.name} — ${PLANS.find(p => p.id === selectedPlan)?.price}/mo`}
                </button>
              </div>
            )}

            {/* Crypto payment */}
            {method === 'crypto' && !cryptoRequest && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#8b949e', marginBottom: 6 }}>Currency</label>
                  <select value={cryptoCurrency} onChange={e => setCryptoCurrency(e.target.value)} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '8px 12px', fontSize: 13, width: '100%' }}>
                    {['BTC', 'ETH', 'USDC', 'SOL', 'DOGE', 'LTC'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={handleCrypto} disabled={loading} style={{ width: '100%', background: '#8957e5', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? 'Generating…' : `Pay with ${cryptoCurrency}`}
                </button>
              </div>
            )}

            {method === 'crypto' && cryptoRequest && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 12 }}>
                  Send <strong style={{ color: '#e6edf3' }}>{cryptoCurrency}</strong> equivalent of <strong style={{ color: '#4ade80' }}>${cryptoRequest.amountUSD}</strong> to:
                </div>
                <div style={{ background: '#0d1117', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', border: '1px solid #30363d', marginBottom: 12 }}>
                  {cryptoRequest.walletAddress}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e' }}>{cryptoRequest.instructions}</div>
                <div style={{ fontSize: 11, color: '#ff8c00', marginTop: 8 }}>
                  Expires in 30 minutes · Include your User ID in the memo field
                </div>
              </div>
            )}

            {/* Gift card */}
            {method === 'gift' && !giftResult && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#8b949e', marginBottom: 6 }}>Gift Code</label>
                  <input
                    value={giftCode}
                    onChange={e => setGiftCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '10px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box', letterSpacing: 2 }}
                  />
                </div>
                <button onClick={handleGift} disabled={loading} style={{ width: '100%', background: '#e3b341', color: '#000', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? 'Redeeming…' : 'Redeem Gift Card'}
                </button>
              </div>
            )}

            {method === 'gift' && giftResult && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Gift card redeemed!</div>
                <div style={{ fontSize: 14, color: '#8b949e' }}>
                  Plan: <strong style={{ color: '#e6edf3' }}>{giftResult.planId}</strong> · {giftResult.credits} credits
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: '#8b949e', textAlign: 'center' }}>
          🔒 All payments secured by Stripe · SOC 2 compliant · Cancel anytime
        </div>
      </div>
    </div>
  );
}
