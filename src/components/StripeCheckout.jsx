/**
 * StripeCheckout.jsx
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Full Subscription Checkout:
 *   - Stripe card payments (Visa, Mastercard, Amex, Discover, Diners, JCB)
 *   - Cryptocurrency payments (ETH, BTC, SOL, USDC)
 *   - Gift card redemption
 *   - Subscription plan management
 * Updated: 2026-08-14
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Check, Star, Crown, Zap,
  Lock, Shield, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowLeft, X, Info
} from 'lucide-react';

// ─── Plan Data ────────────────────────────────────────────────────────────────
const PLANS = {
  free: {
    id: 'free', name: 'Free', price: 0, yearlyPrice: 0, color: '#64748b',
    badge: '🆓', icon: Zap, features: ['5 AI requests/day', 'Basic models (GPT-4, Claude Sonnet, Gemini Flash)', '1 MB file uploads', '3 chat histories', 'Community support']
  },
  pro: {
    id: 'pro', name: 'Pro', price: 9.99, yearlyPrice: 7.99, color: '#6366f1',
    badge: '⭐', icon: Star, popular: true,
    features: ['Unlimited AI requests', 'All 25+ AI models', '100 MB file uploads', 'Unlimited chat history', 'Analytics dashboard', 'Game dev tracking', 'Priority support', 'Multi-language support']
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 14.99, yearlyPrice: 11.99, color: '#a855f7',
    badge: '👑', icon: Crown,
    features: ['Everything in Pro', 'Custom AI model access', 'API key access', 'Dedicated support & SLA', 'All platform connectors', 'Advanced security dashboard', 'Biometric auth', 'White-label options', 'Custom integrations']
  }
};

const CRYPTO_CURRENCIES = [
  { id: 'eth',  name: 'Ethereum',  symbol: 'ETH',  icon: '⟠', color: '#627eea' },
  { id: 'btc',  name: 'Bitcoin',   symbol: 'BTC',  icon: '₿', color: '#f7931a' },
  { id: 'sol',  name: 'Solana',    symbol: 'SOL',  icon: '◎', color: '#9945ff' },
  { id: 'usdc', name: 'USD Coin',  symbol: 'USDC', icon: '$', color: '#2775ca' },
];

const CARD_NETWORKS = [
  { name: 'Visa',       icon: '💳' },
  { name: 'Mastercard', icon: '💳' },
  { name: 'Amex',       icon: '💳' },
  { name: 'Discover',   icon: '💳' },
  { name: 'Diners',     icon: '💳' },
  { name: 'JCB',        icon: '💳' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtPrice = (price, interval = 'month') => price === 0 ? 'Free' : `$${price.toFixed(2)}/${interval}`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect, billingCycle }) {
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
  const Icon = plan.icon;
  return (
    <div
      onClick={() => plan.id !== 'free' && onSelect(plan.id)}
      style={{
        border: `2px solid ${selected ? plan.color : 'var(--border)'}`,
        background: selected ? `${plan.color}10` : 'var(--card-bg)',
        borderRadius: 14, padding: 20, cursor: plan.id === 'free' ? 'default' : 'pointer',
        position: 'relative', transition: 'all 0.2s'
      }}
    >
      {plan.popular && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', padding: '2px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{plan.badge}</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</span>
        </div>
        {selected && <CheckCircle2 size={18} color={plan.color} />}
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: plan.color }}>${price === 0 ? '0' : price.toFixed(2)}</span>
        {price > 0 && <span style={{ fontSize: 13, opacity: 0.5 }}>/{billingCycle === 'yearly' ? 'mo' : 'month'}</span>}
        {billingCycle === 'yearly' && price > 0 && (
          <span style={{ fontSize: 11, background: '#22c55e20', color: '#22c55e', padding: '1px 7px', borderRadius: 10, marginLeft: 6, fontWeight: 600 }}>Save 20%</span>
        )}
      </div>
      <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12 }}>
            <Check size={12} color={plan.color} style={{ flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardPaymentForm({ plan, onSuccess, onBack }) {
  const [form, setForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === 'number') v = v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    if (k === 'expiry') v = v.replace(/\D/g, '').slice(0, 4).replace(/(.{2})/, '$1/');
    if (k === 'cvc') v = v.replace(/\D/g, '').slice(0, 4);
    setForm(f => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.number.replace(/\s/g, '').length < 13) return setError('Invalid card number');
    if (!form.expiry.match(/\d{2}\/\d{2}/)) return setError('Invalid expiry (MM/YY)');
    if (form.cvc.length < 3) return setError('Invalid CVC');
    if (!form.name.trim()) return setError('Name required');

    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('nexus_token') || '';
      const res = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: plan.id, paymentMethod: 'card' })
      });
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
      else onSuccess({ plan, method: 'card', sessionId: data.sessionId });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { fontSize: 12, fontWeight: 600, opacity: 0.7, display: 'block', marginBottom: 5 };

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {CARD_NETWORKS.map(n => (
          <span key={n.name} style={{ fontSize: 11, background: 'var(--border)', padding: '2px 8px', borderRadius: 8, opacity: 0.7 }}>{n.name}</span>
        ))}
      </div>

      {error && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>{error}</div>}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Card Number</label>
        <input value={form.number} onChange={set('number')} placeholder="1234 5678 9012 3456" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><label style={labelStyle}>Expiry (MM/YY)</label><input value={form.expiry} onChange={set('expiry')} placeholder="12/27" style={inputStyle} /></div>
        <div style={{ width: 90 }}><label style={labelStyle}>CVC</label><input value={form.cvc} onChange={set('cvc')} placeholder="123" style={inputStyle} type="password" /></div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Cardholder Name</label>
        <input value={form.name} onChange={set('name')} placeholder="Cameron Fox" style={inputStyle} />
      </div>

      <div style={{ background: '#22c55e10', border: '1px solid #22c55e30', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#22c55e', display: 'flex', gap: 6 }}>
        <Lock size={12} style={{ flexShrink: 0, marginTop: 1 }} />
        Secured by Stripe. Your card details are never stored on our servers.
      </div>

      <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? '#888' : PLANS[plan.id]?.color || '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Processing…' : `Subscribe — ${fmtPrice(plan.price)}`}
      </button>
    </form>
  );
}

function CryptoPaymentForm({ plan, onSuccess, onBack }) {
  const [currency, setCurrency] = useState('eth');
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState('');

  const initiate = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('nexus_token') || '';
      const res = await fetch('/api/payments/crypto', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: plan.id, cryptoCurrency: currency.toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPaymentInfo(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const crypto = CRYPTO_CURRENCIES.find(c => c.id === currency);

  return (
    <div>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>Select your preferred cryptocurrency:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        {CRYPTO_CURRENCIES.map(c => (
          <button key={c.id} onClick={() => setCurrency(c.id)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${currency === c.id ? c.color : 'var(--border)'}`, background: currency === c.id ? `${c.color}15` : 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
            <span style={{ fontSize: 18, color: c.color }}>{c.icon}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{c.symbol}</div>
            </div>
            {currency === c.id && <Check size={13} color={c.color} style={{ marginLeft: 'auto' }} />}
          </button>
        ))}
      </div>

      {error && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>{error}</div>}

      {paymentInfo ? (
        <div style={{ background: 'var(--card-bg)', border: `1px solid ${crypto?.color || 'var(--border)'}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>Send payment to:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--border)', padding: 10, borderRadius: 8, wordBreak: 'break-all', marginBottom: 10 }}>{paymentInfo.walletAddress}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>Amount (USD):</span><span style={{ fontWeight: 700 }}>${(paymentInfo.amountUsd || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
            <span>Currency:</span><span style={{ fontWeight: 700, color: crypto?.color }}>{paymentInfo.cryptoCurrency}</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, display: 'flex', gap: 4 }}>
            <Info size={11} /> Payment expires {paymentInfo.expiresAt ? new Date(paymentInfo.expiresAt).toLocaleTimeString() : 'in 1 hour'}
          </div>
        </div>
      ) : (
        <button onClick={initiate} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? '#888' : (crypto?.color || '#6366f1'), color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Generating Address…' : `Pay with ${crypto?.name || 'Crypto'}`}
        </button>
      )}
    </div>
  );
}

function GiftCardForm({ plan, onSuccess, onBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const clean = code.replace(/[\s-]/g, '').toUpperCase();
    if (clean.length !== 16) return setError('Gift card code must be 16 characters');
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('nexus_token') || '';
      const res = await fetch('/api/payments/gift-card', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: clean, planId: plan.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid gift card');
      setMessage('Gift card applied successfully! 🎉');
      onSuccess({ plan, method: 'giftcard' });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const formatCode = (v) => v.replace(/\W/g, '').toUpperCase().slice(0, 16).replace(/(.{4})/g, '$1-').replace(/-$/, '');

  return (
    <form onSubmit={submit}>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 14 }}>Enter your 16-character gift card code:</div>
      {error && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>{error}</div>}
      {message && <div style={{ background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#22c55e' }}>{message}</div>}
      <input
        value={formatCode(code)} onChange={e => setCode(e.target.value)}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 16, letterSpacing: 2, textAlign: 'center', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 14 }}
      />
      <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? '#888' : '#22c55e', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Redeeming…' : 'Redeem Gift Card 🎁'}
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StripeCheckout({ onClose, initialPlan = 'pro' }) {
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState(null); // null | 'card' | 'crypto' | 'giftcard'
  const [completed, setCompleted] = useState(false);
  const plan = PLANS[selectedPlan];

  if (completed) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ margin: '0 0 8px' }}>You're subscribed!</h2>
        <div style={{ opacity: 0.6, marginBottom: 24 }}>Welcome to {plan.name}. Your subscription is now active.</div>
        <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Get Started</button>
      </div>
    );
  }

  const s = {
    container: { padding: 24, color: 'var(--text)' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 22, fontWeight: 800, margin: 0 },
    methodBtn: (active, color) => ({
      flex: 1, padding: '10px 8px', borderRadius: 10, border: `1px solid ${active ? color || '#6366f1' : 'var(--border)'}`,
      background: active ? `${color || '#6366f1'}15` : 'var(--card-bg)', cursor: 'pointer', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: active ? 700 : 400
    }),
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: 0.6, color: 'var(--text)', fontSize: 13, padding: 0, marginBottom: 16 },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Choose Your Plan</h2>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, color: 'var(--text)', fontSize: 20 }}><X size={18} /></button>}
      </div>

      {/* Billing toggle */}
      <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content', gap: 2 }}>
        {['monthly', 'yearly'].map(c => (
          <button key={c} onClick={() => setBillingCycle(c)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: billingCycle === c ? '#6366f1' : 'transparent', color: billingCycle === c ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: billingCycle === c ? 700 : 400 }}>
            {c.charAt(0).toUpperCase() + c.slice(1)} {c === 'yearly' && <span style={{ fontSize: 10, opacity: 0.8 }}>(-20%)</span>}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      {!paymentMethod && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            {Object.values(PLANS).map(p => (
              <PlanCard key={p.id} plan={p} selected={selectedPlan === p.id} onSelect={setSelectedPlan} billingCycle={billingCycle} />
            ))}
          </div>

          {selectedPlan !== 'free' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Payment Method</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button style={s.methodBtn(paymentMethod === 'card', '#6366f1')} onClick={() => setPaymentMethod('card')}>
                  <CreditCard size={18} />Card
                </button>
                <button style={s.methodBtn(paymentMethod === 'crypto', '#f7931a')} onClick={() => setPaymentMethod('crypto')}>
                  <span style={{ fontSize: 18 }}>₿</span>Crypto
                </button>
                <button style={s.methodBtn(paymentMethod === 'giftcard', '#22c55e')} onClick={() => setPaymentMethod('giftcard')}>
                  <Gift size={18} />Gift Card
                </button>
              </div>

              {/* CTA */}
              <button
                onClick={() => setPaymentMethod('card')}
                style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: plan?.color || '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Continue to Payment <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Security trust badges */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['🔒', 'SSL Secured'], ['🛡️', 'PCI DSS Compliant'], ['🔄', 'Cancel Anytime'], ['🌍', '40+ Currencies']].map(([icon, label]) => (
              <div key={label} style={{ fontSize: 11, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{icon}</span>{label}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Payment forms */}
      {paymentMethod && (
        <>
          <button onClick={() => setPaymentMethod(null)} style={s.backBtn}>
            <ArrowLeft size={13} /> Back to plans
          </button>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Subscribing to:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{plan?.badge}</span>
              <span style={{ fontWeight: 700 }}>{plan?.name}</span>
              <span style={{ color: plan?.color, fontWeight: 700, marginLeft: 'auto' }}>{fmtPrice(billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.price)}</span>
            </div>
          </div>
          {paymentMethod === 'card' && <CardPaymentForm plan={plan} onSuccess={() => setCompleted(true)} onBack={() => setPaymentMethod(null)} />}
          {paymentMethod === 'crypto' && <CryptoPaymentForm plan={plan} onSuccess={() => setCompleted(true)} onBack={() => setPaymentMethod(null)} />}
          {paymentMethod === 'giftcard' && <GiftCardForm plan={plan} onSuccess={() => setCompleted(true)} onBack={() => setPaymentMethod(null)} />}
        </>
      )}
    </div>
  );
}
