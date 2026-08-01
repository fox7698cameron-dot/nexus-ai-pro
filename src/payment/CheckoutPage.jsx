// src/payment/CheckoutPage.jsx
// Nexus AI Pro - Subscription Checkout
// Covers: Stripe (Visa/Mastercard/Amex/Discover/Debit), crypto, gift cards
// Responsive; no hardcoded secrets
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api/payments';

const PLANS = [
  {
    key: 'free', name: 'Free', price: '$0', period: '', badge: '🆓',
    color: '#64748b', highlight: false,
    features: ['5 chats/day', 'Basic models', '1 MB uploads', 'Community support']
  },
  {
    key: 'pro', name: 'Pro', price: '$9.99', period: '/month', badge: '⭐',
    color: '#6366f1', highlight: true,
    features: ['Unlimited chats', 'All 40+ models', '100 MB uploads', 'Priority support', 'Analytics dashboard', 'Project tracker']
  },
  {
    key: 'enterprise', name: 'Enterprise', price: '$14.99', period: '/month', badge: '👑',
    color: '#a855f7', highlight: false,
    features: ['Everything in Pro', 'Custom AI models', 'API access', 'Dedicated support', 'SLA guarantee', 'White-label options', 'Admin dashboard']
  }
];

const PAYMENT_METHODS = [
  { key: 'card', label: 'Credit / Debit Card', icon: '💳', desc: 'Visa · Mastercard · Amex · Discover · Debit' },
  { key: 'crypto', label: 'Cryptocurrency', icon: '₿', desc: 'BTC · ETH · USDC · USDT and more' },
  { key: 'gift', label: 'Gift Card', icon: '🎁', desc: 'Redeem a Nexus AI Pro gift card' }
];

function PlanCard({ plan, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(plan.key)}
      style={{
        flex: '1 1 220px', background: selected ? `${plan.color}18` : '#111827',
        border: `2px solid ${selected ? plan.color : '#1e293b'}`,
        borderRadius: 14, padding: 20, cursor: 'pointer',
        transition: 'all 0.2s', position: 'relative',
        boxShadow: plan.highlight && !selected ? '0 0 20px #6366f120' : 'none'
      }}
    >
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 12px', borderRadius: 20
        }}>Most Popular</div>
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{plan.badge}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>{plan.name}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: plan.color, margin: '8px 0 4px' }}>
        {plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}>{plan.period}</span>
      </div>
      <div style={{ borderTop: '1px solid #1e293b', margin: '12px 0' }} />
      {plan.features.map(f => (
        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ color: plan.color, fontSize: 13 }}>✓</span>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage({ token, currentPlan = 'free' }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [giftCode, setGiftCode] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/subscription`, { headers });
      if (res.ok) setSubscription(await res.json());
    } catch (_) { /* non-critical */ }
  }, [token]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const handleCheckout = async () => {
    if (!token) { setError('You must be signed in to subscribe'); return; }
    setLoading(true); setError(''); setInfo('');
    try {
      let res, data;
      if (paymentMethod === 'gift') {
        if (!giftCode.trim()) { setError('Please enter a gift card code'); return; }
        res = await fetch(`${API}/gift-card/redeem`, {
          method: 'POST', headers,
          body: JSON.stringify({ code: giftCode.trim().toUpperCase() })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid gift card');
        setInfo(`Gift card redeemed: $${(data.amount / 100).toFixed(2)} credit applied`);
      } else if (paymentMethod === 'crypto') {
        res = await fetch(`${API}/crypto`, {
          method: 'POST', headers,
          body: JSON.stringify({ plan: selectedPlan })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        if (data.url) window.location.href = data.url;
      } else {
        // Standard card checkout via Stripe
        res = await fetch(`${API}/checkout`, {
          method: 'POST', headers,
          body: JSON.stringify({
            plan: selectedPlan,
            giftCardCode: giftCode.trim() || undefined
          })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        if (data.url) {
          window.location.href = data.url;
        } else if (data.plan === 'free') {
          setInfo('You are on the free plan — no payment needed');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription at period end?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/cancel`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInfo('Subscription will cancel at the end of the billing period');
      fetchSubscription();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 24
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>Choose Your Plan</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Cancel anytime · Secure payments via Stripe
          </p>
          {subscription && subscription.plan !== 'free' && (
            <div style={{
              display: 'inline-block', marginTop: 8,
              background: '#0d2e1a', border: '1px solid #22c55e', borderRadius: 8,
              padding: '6px 14px', color: '#4ade80', fontSize: 13
            }}>
              Current plan: <strong>{subscription.plan}</strong> — {subscription.status}
            </div>
          )}
        </div>

        {error && <div style={{ background: '#2d0d0d', border: '1px solid #ef4444', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f87171' }}>{error}</div>}
        {info && <div style={{ background: '#0d2e1a', border: '1px solid #22c55e', borderRadius: 8, padding: 12, marginBottom: 16, color: '#4ade80' }}>{info}</div>}

        {/* Plan Cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {PLANS.map(plan => (
            <PlanCard key={plan.key} plan={plan} selected={selectedPlan === plan.key} onSelect={setSelectedPlan} />
          ))}
        </div>

        {selectedPlan !== 'free' && (
          <>
            {/* Payment Method Selector */}
            <div style={{ background: '#111827', borderRadius: 14, padding: 20, border: '1px solid #1e293b', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Payment Method</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PAYMENT_METHODS.map(m => (
                  <div
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    style={{
                      flex: '1 1 180px', background: paymentMethod === m.key ? '#6366f115' : '#0f172a',
                      border: `2px solid ${paymentMethod === m.key ? '#6366f1' : '#1e293b'}`,
                      borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{m.label}</div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gift Card Input */}
            {(paymentMethod === 'gift' || paymentMethod === 'card') && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                  {paymentMethod === 'gift' ? 'Gift Card Code *' : 'Apply Gift Card (optional)'}
                </label>
                <input
                  value={giftCode}
                  onChange={e => setGiftCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  style={{
                    width: '100%', background: '#0f172a', border: '1px solid #1e293b',
                    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
                    boxSizing: 'border-box', letterSpacing: 2, fontFamily: 'monospace'
                  }}
                />
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 16,
                fontWeight: 800, background: loading ? '#1e293b' : '#6366f1',
                color: loading ? '#475569' : '#fff', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                marginBottom: 12
              }}
            >
              {loading ? 'Processing…' : paymentMethod === 'gift'
                ? '🎁 Redeem Gift Card'
                : paymentMethod === 'crypto'
                  ? '₿ Pay with Crypto'
                  : `💳 Subscribe to ${PLANS.find(p => p.key === selectedPlan)?.name}`}
            </button>

            {/* Cancel button if subscribed */}
            {subscription?.plan !== 'free' && subscription?.status === 'active' && (
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 13,
                  background: '#2d0d0d', border: '1px solid #ef444422',
                  color: '#f87171', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel Subscription
              </button>
            )}
          </>
        )}

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          {['🔒 SSL Encrypted', '💳 PCI Compliant', '🔄 Cancel Anytime', '🌍 Multi-Currency'].map(b => (
            <span key={b} style={{ color: '#475569', fontSize: 12 }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
