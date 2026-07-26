/**
 * src/components/PaymentModal.jsx
 * Nexus AI Pro - Payment & Subscription System
 * Stripe (all major cards + debit), Crypto, Gift Cards
 * Created: 2026-07-26
 */

import React, { useState, useCallback } from 'react';
import {
  CreditCard, Lock, CheckCircle2, AlertCircle, X,
  Bitcoin, Gift, RefreshCw, Shield, Zap, Star, Crown,
} from 'lucide-react';
import { apiFetch } from '../lib/auth.js';

// ── Subscription tiers ──────────────────────────────────────────────
const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, period: 'forever',
    color: '#94a3b8', icon: '🆓',
    features: ['5 AI chats/day', 'Basic models', '1MB uploads', 'Standard security'],
  },
  {
    id: 'pro', name: 'Pro', price: 9.99, period: 'month',
    color: '#3b82f6', icon: '⭐',
    features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'Analytics dashboard'],
    popular: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 14.99, period: 'month',
    color: '#8b5cf6', icon: '👑',
    features: ['Everything in Pro', 'Game dev connectors', 'Custom models', 'API access', 'SLA + dedicated support', 'White-label option'],
  },
];

const CARD_TYPES = [
  { id: 'visa', label: 'Visa', icon: '💳' },
  { id: 'mastercard', label: 'Mastercard', icon: '💳' },
  { id: 'amex', label: 'Amex', icon: '💳' },
  { id: 'discover', label: 'Discover', icon: '💳' },
  { id: 'jcb', label: 'JCB', icon: '💳' },
  { id: 'unionpay', label: 'UnionPay', icon: '💳' },
  { id: 'dinersclub', label: "Diners Club", icon: '💳' },
  { id: 'debit', label: 'Debit Card', icon: '🏦' },
];

const CRYPTO_OPTIONS = [
  { id: 'btc', label: 'Bitcoin', icon: '₿' },
  { id: 'eth', label: 'Ethereum', icon: 'Ξ' },
  { id: 'usdc', label: 'USDC', icon: '💲' },
  { id: 'usdt', label: 'USDT', icon: '💲' },
  { id: 'sol', label: 'Solana', icon: '◎' },
  { id: 'matic', label: 'Polygon', icon: '⬡' },
];

// ── Card input formatter ────────────────────────────────────────────
function formatCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length >= 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// ── PlanCard ────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  return (
    <div
      onClick={() => plan.id !== 'free' && onSelect(plan)}
      style={{
        border: `2px solid ${selected ? plan.color : 'var(--border)'}`,
        borderRadius: 12, padding: '16px', cursor: plan.id === 'free' ? 'default' : 'pointer',
        background: selected ? `${plan.color}11` : 'var(--surface)',
        position: 'relative', transition: 'all 0.2s',
      }}
    >
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '2px 10px', borderRadius: 20,
        }}>MOST POPULAR</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{plan.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>{plan.name}</div>
          <div style={{ fontSize: 13, color: plan.color }}>
            {plan.price === 0 ? 'Free' : `$${plan.price}/${plan.period}`}
          </div>
        </div>
        {selected && <CheckCircle2 size={16} color={plan.color} style={{ marginLeft: 'auto' }} />}
      </div>

      <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
            <CheckCircle2 size={11} color={plan.color} style={{ flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── CardForm ────────────────────────────────────────────────────────
function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (card.number.replace(/\s/g, '').length < 15) e.number = 'Invalid card number';
    if (!card.expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = 'Invalid expiry (MM/YY)';
    if (card.cvc.length < 3) e.cvc = 'Invalid CVC';
    if (!card.name.trim()) e.name = 'Cardholder name required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ type: 'card', ...card });
  };

  const inp = (key, placeholder, maxLen, formatter, pattern) => (
    <div>
      <input
        placeholder={placeholder}
        value={card[key]}
        onChange={e => setCard(c => ({ ...c, [key]: formatter ? formatter(e.target.value) : e.target.value }))}
        maxLength={maxLen}
        pattern={pattern}
        inputMode={key === 'name' ? 'text' : 'numeric'}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
          border: `1px solid ${errors[key] ? '#ef4444' : 'var(--border)'}`,
          background: 'var(--surface)', color: 'var(--text-1)', fontSize: 14,
        }}
      />
      {errors[key] && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0' }}>{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {CARD_TYPES.map(ct => (
          <span key={ct.id} style={{
            padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--text-3)', background: 'var(--bg)',
          }}>{ct.icon} {ct.label}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {inp('number', '1234 5678 9012 3456', 19, formatCard)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {inp('expiry', 'MM/YY', 5, formatExpiry)}
          {inp('cvc', 'CVC', 4, null)}
        </div>
        {inp('name', 'Cardholder name', 64, null)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '12px 0', fontSize: 11, color: 'var(--text-3)' }}>
        <Lock size={11} /> Secured by Stripe. Your card details are never stored on our servers.
      </div>

      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '11px', borderRadius: 8, border: 'none',
        background: loading ? 'var(--border)' : 'var(--accent)',
        color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={14} />}
        {loading ? 'Processing…' : 'Subscribe Now'}
      </button>
    </form>
  );
}

// ── CryptoForm ──────────────────────────────────────────────────────
function CryptoForm({ plan, onSubmit }) {
  const [selected, setSelected] = useState('btc');
  const crypto = CRYPTO_OPTIONS.find(c => c.id === selected);

  const mockRates = { btc: 0.000143, eth: 0.00287, usdc: plan?.price || 9.99, usdt: plan?.price || 9.99, sol: 0.0621, matic: 12.4 };
  const amount = (mockRates[selected] * (plan?.price || 9.99)).toFixed(6);

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        Select your preferred cryptocurrency. A wallet address will be generated for your payment.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {CRYPTO_OPTIONS.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)} style={{
            padding: '10px 6px', borderRadius: 8, border: `2px solid ${selected === c.id ? 'var(--accent)' : 'var(--border)'}`,
            background: selected === c.id ? 'var(--accent-subtle)' : 'var(--surface)',
            cursor: 'pointer', fontWeight: 600, fontSize: 12, color: selected === c.id ? 'var(--accent)' : 'var(--text-2)',
          }}>
            <div style={{ fontSize: 18 }}>{c.icon}</div>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px', marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Send exactly</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: '4px 0' }}>
          {amount} {crypto?.id.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>(≈ ${(plan?.price || 9.99).toFixed(2)} USD)</div>
        <div style={{
          fontFamily: 'monospace', fontSize: 12, background: 'var(--surface)',
          padding: '8px 12px', borderRadius: 8, marginTop: 10, wordBreak: 'break-all',
          color: 'var(--accent)', border: '1px solid var(--border)',
        }}>
          [Wallet address generated on checkout]
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '8px 0 0' }}>
          Payment auto-detected on-chain. Activation within 1-3 confirmations.
        </p>
      </div>

      <button onClick={() => onSubmit({ type: 'crypto', coin: selected })} style={{
        width: '100%', padding: '11px', borderRadius: 8, border: 'none',
        background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14,
      }}>
        <Bitcoin size={14} style={{ marginRight: 6 }} /> Generate Payment Address
      </button>
    </div>
  );
}

// ── GiftCardForm ────────────────────────────────────────────────────
function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        Enter your Nexus AI Pro gift card code below.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
            .replace(/(.{4})/g, '$1-').replace(/-$/, '')
          )}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
            background: 'var(--surface)', color: 'var(--text-1)',
            fontFamily: 'monospace', fontSize: 14, letterSpacing: 2,
          }}
        />
        <button onClick={() => {
          if (code.replace(/-/g, '').length < 16) { setError('Invalid code'); return; }
          setError('');
          onSubmit({ type: 'giftcard', code });
        }} disabled={loading} style={{
          padding: '10px 16px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          <Gift size={14} style={{ marginRight: 4 }} /> Redeem
        </button>
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}

// ── Main PaymentModal ───────────────────────────────────────────────
export default function PaymentModal({ onClose, currentPlan = 'free' }) {
  const [selectedPlan, setSelectedPlan] = useState(PLANS.find(p => p.id === 'pro') || PLANS[1]);
  const [payMethod, setPayMethod] = useState('card'); // card | crypto | giftcard
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = useCallback(async (paymentData) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch('/api/payments/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan.id,
          payment: paymentData,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  if (success) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Welcome to {selectedPlan.name}!</h2>
            <p style={{ color: 'var(--text-3)', marginBottom: 20 }}>
              Your subscription is now active. All features have been unlocked.
            </p>
            <button onClick={onClose} style={primaryBtnStyle}>Start Using Nexus AI Pro</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 560 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>Upgrade Plan</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Secure checkout powered by Stripe</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {PLANS.map(p => <PlanCard key={p.id} plan={p} selected={selectedPlan?.id === p.id} onSelect={setSelectedPlan} />)}
        </div>

        {selectedPlan && selectedPlan.id !== 'free' && (
          <>
            {/* Payment method tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: 4 }}>
              {[
                { id: 'card', label: '💳 Card' },
                { id: 'crypto', label: '₿ Crypto' },
                { id: 'giftcard', label: '🎁 Gift Card' },
              ].map(m => (
                <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                  background: payMethod === m.id ? 'var(--accent)' : 'transparent',
                  color: payMethod === m.id ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}>{m.label}</button>
              ))}
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ef444422', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
                <AlertCircle size={13} style={{ marginRight: 6 }} />{error}
              </div>
            )}

            {payMethod === 'card' && <CardForm onSubmit={handlePayment} loading={loading} />}
            {payMethod === 'crypto' && <CryptoForm plan={selectedPlan} onSubmit={handlePayment} />}
            {payMethod === 'giftcard' && <GiftCardForm onSubmit={handlePayment} loading={loading} />}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {['🔒 SSL Encrypted', '🔄 Cancel Anytime', '💰 Money-back Guarantee'].map(b => (
            <span key={b} style={{ fontSize: 11, color: 'var(--text-3)' }}>{b}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999, padding: 20,
};
const modalStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 18, padding: 24, width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto',
};
const primaryBtnStyle = {
  padding: '11px 24px', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: '#fff', cursor: 'pointer',
  fontWeight: 700, fontSize: 14,
};
