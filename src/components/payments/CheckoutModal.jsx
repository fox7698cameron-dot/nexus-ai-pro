// src/components/payments/CheckoutModal.jsx
// 2026-07-22 | Stripe checkout modal — cards, crypto, gift codes; all major payment methods

import { useState } from 'react';

const PLANS = {
  pro: { name: 'Pro', price: '$19.99/mo', features: ['Unlimited AI', '10 projects', 'Full analytics', 'Priority support'] },
  enterprise: { name: 'Enterprise', price: '$79.99/mo', features: ['Everything in Pro', 'Unlimited projects', 'Dedicated support', 'Custom integrations', 'SLA'] },
};

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳', note: 'Visa, Mastercard, Amex, Discover, Diners, UnionPay' },
  { id: 'crypto', label: 'Crypto', icon: '🪙', note: 'Bitcoin, Ethereum, USDC and more via Stripe' },
  { id: 'gift_code', label: 'Gift Code', icon: '🎁', note: 'Redeem a gift code or voucher' },
];

export default function CheckoutModal({ token, planId, onClose, onSuccess }) {
  const plan = PLANS[planId];
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [giftCode, setGiftCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const checkout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId, paymentMethod, giftCode: giftCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Checkout failed');

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.success) {
        onSuccess?.({ planId, method: paymentMethod });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  const style = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modal: {
      background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20, padding: 36, width: '100%', maxWidth: 480,
      fontFamily: 'system-ui, sans-serif', color: '#f1f5f9',
    },
    methodBtn: (active) => ({
      width: '100%', background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
      color: '#f1f5f9', marginBottom: 8,
    }),
    input: {
      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, color: '#f1f5f9', padding: '12px 14px', fontSize: 14, outline: 'none',
      boxSizing: 'border-box', letterSpacing: 2,
    },
    btn: (primary) => ({
      width: '100%', background: primary ? '#6366f1' : 'rgba(255,255,255,0.06)',
      color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14,
      fontWeight: 700, cursor: 'pointer', marginTop: 8, opacity: loading ? 0.7 : 1,
    }),
  };

  return (
    <div style={style.overlay} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={style.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Upgrade to {plan.name}</div>
            <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 18, marginTop: 4 }}>{plan.price}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          {plan.features.map(f => (
            <div key={f} style={{ color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#4ade80', marginRight: 8 }}>✓</span>{f}
            </div>
          ))}
        </div>

        {/* Payment method selection */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Payment Method
          </div>
          {PAYMENT_METHODS.map(m => (
            <button key={m.id} style={style.methodBtn(paymentMethod === m.id)} onClick={() => setPaymentMethod(m.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div>
                  <div style={{ fontWeight: paymentMethod === m.id ? 700 : 400, fontSize: 13 }}>{m.label}</div>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>{m.note}</div>
                </div>
                {paymentMethod === m.id && (
                  <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: 16 }}>●</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Gift code input */}
        {paymentMethod === 'gift_code' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 8 }}>
              Gift Code
            </label>
            <input
              style={style.input}
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={giftCode}
              onChange={e => setGiftCode(e.target.value.toUpperCase())}
              maxLength={19}
            />
          </div>
        )}

        {/* Crypto notice */}
        {paymentMethod === 'crypto' && (
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ color: '#a5b4fc', fontSize: 12 }}>
              You'll be redirected to Stripe's crypto payment flow. Supported: BTC, ETH, USDC, and more.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button style={style.btn(true)} onClick={checkout} disabled={loading}>
          {loading ? 'Processing...' : paymentMethod === 'gift_code' ? 'Redeem Code' : `Subscribe — ${plan.price}`}
        </button>
        <button style={style.btn(false)} onClick={onClose}>Cancel</button>

        <div style={{ marginTop: 16, textAlign: 'center', color: '#4b5563', fontSize: 11 }}>
          🔒 Payments powered by Stripe · Cancel anytime · No hidden fees<br/>
          Visa · Mastercard · Amex · Discover · UnionPay · Crypto · Gift Codes
        </div>
      </div>
    </div>
  );
}
