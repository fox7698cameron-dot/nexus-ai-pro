// ================================================
// NEXUS AI PRO - Payment System
// Stripe | All Card Types | Crypto | Gift Cards
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useEffect, useCallback } from 'react';

// ── Plan definitions ─────────────────────────────
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    icon: '⚡',
    price: { monthly: 9, annual: 7 },
    priceEnvKey: 'STRIPE_PRICE_ID_BASIC',
    color: '#60a5fa',
    features: ['5 AI models', '50 projects', 'Basic analytics', 'Email support'],
    highlighted: false
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '🚀',
    price: { monthly: 29, annual: 23 },
    priceEnvKey: 'STRIPE_PRICE_ID_PRO',
    color: '#a78bfa',
    features: ['All AI models', 'Unlimited projects', 'Full analytics', 'Social connectors', 'Game studio integrations', 'Priority support'],
    highlighted: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: '🏢',
    price: { monthly: 99, annual: 79 },
    priceEnvKey: 'STRIPE_PRICE_ID_ENTERPRISE',
    color: '#f59e0b',
    features: ['Everything in Pro', 'White-label options', 'Custom AI training', 'Dedicated support', 'SLA guarantee', 'Advanced security', 'AR/VR studio tools', 'Multi-tenant'],
    highlighted: false
  }
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳', detail: 'Visa, Mastercard, Amex, Discover, JCB' },
  { id: 'apple_pay', label: 'Apple Pay', icon: '', detail: 'Touch ID / Face ID' },
  { id: 'google_pay', label: 'Google Pay', icon: '🔵', detail: 'Android / Chrome' },
  { id: 'crypto', label: 'Cryptocurrency', icon: '₿', detail: 'BTC, ETH, USDC + more' },
  { id: 'gift', label: 'Gift Card', icon: '🎁', detail: 'Redeem a Nexus gift card code' }
];

// ── Subscription badge ───────────────────────────
function SubscriptionBadge({ status }) {
  const config = {
    active:    { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', label: '✓ Active' },
    cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: '✗ Cancelled' },
    none:      { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'No subscription' }
  };
  const c = config[status] || config.none;
  return (
    <span style={{ fontSize: 12, color: c.color, background: c.bg, padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>
      {c.label}
    </span>
  );
}

// ── Plan card ────────────────────────────────────
function PlanCard({ plan, billing, selected, onSelect }) {
  const price = plan.price[billing];
  return (
    <div
      onClick={() => onSelect(plan.id)}
      style={{
        flex: '1 1 260px', background: selected ? `${plan.color}15` : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? plan.color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16, padding: '24px 20px', cursor: 'pointer', position: 'relative',
        transition: 'all .2s', boxShadow: plan.highlighted && !selected ? `0 0 30px ${plan.color}20` : 'none'
      }}
    >
      {plan.highlighted && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 12 }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{plan.icon}</div>
      <h3 style={{ margin: '0 0 4px', color: plan.color, fontSize: 18, fontWeight: 700 }}>{plan.name}</h3>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '10px 0' }}>
        ${price}<span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}>/mo</span>
      </div>
      {billing === 'annual' && (
        <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 10 }}>Save ${(plan.price.monthly - price) * 12}/yr</div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.features.map(f => (
          <li key={f} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Gift card input ──────────────────────────────
function GiftCardInput({ authToken, onApplied }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payments/gift-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      setResult(data);
      onApplied?.(data.promotionCode);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>🎁 Redeem gift card</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, letterSpacing: '0.05em' }}
          onKeyDown={e => e.key === 'Enter' && apply()}
        />
        <button onClick={apply} disabled={loading || !code.trim()}
          style={{ background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {loading ? '…' : 'Apply'}
        </button>
      </div>
      {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
      {result && <div style={{ color: '#4ade80', fontSize: 12, marginTop: 8 }}>✓ Gift card applied!</div>}
    </div>
  );
}

// ── Payment method selector ──────────────────────
function PaymentMethodSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>PAYMENT METHOD</div>
      {PAYMENT_METHODS.map(m => (
        <div
          key={m.id}
          onClick={() => onSelect(m.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            background: selected === m.id ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${selected === m.id ? '#4f46e5' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10, cursor: 'pointer', transition: 'all .15s'
          }}
        >
          <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{m.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: selected === m.id ? '#c7d2fe' : '#e2e8f0', fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 11, color: '#556' }}>{m.detail}</div>
          </div>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === m.id ? '#4f46e5' : '#374151'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selected === m.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4f46e5' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main PaymentSystem ───────────────────────────
export default function PaymentSystem({ authToken }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [billing, setBilling] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [giftCode, setGiftCode] = useState(null);

  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  const fetchSubscription = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/payments/subscription', { headers });
      if (res.ok) setSubscription(await res.json());
    } catch { /* ignore */ }
  }, [authToken]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const handleCheckout = async () => {
    setLoading(true); setError('');
    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) { setError('Select a plan'); return; }

      if (paymentMethod === 'gift') {
        setError('Apply your gift card above, then select a card payment method to complete.');
        return;
      }

      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId: `price_${selectedPlan}_${billing}`, // resolved by server from env
          paymentMethod: paymentMethod === 'crypto' ? 'crypto' : 'card',
          promotionCode: giftCode
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Checkout failed'); return; }

      if (data.url) window.location.href = data.url;
      else if (data.sessionId) {
        // Load Stripe.js dynamically — publishable key is NOT hardcoded
        const stripeKey = document.querySelector('meta[name="stripe-pk"]')?.content;
        if (stripeKey) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          document.head.appendChild(script);
          script.onload = async () => {
            const stripe = window.Stripe(stripeKey);
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
          };
        } else {
          setError('Stripe publishable key not configured. Add <meta name="stripe-pk" content="pk_..."> to index.html');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    wrap: { background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '32px 24px' },
    title: { fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 8, background: 'linear-gradient(135deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
  };

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>💳 Subscription & Payments</h2>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 32, fontSize: 14 }}>
        Cancel anytime · Secure payments powered by Stripe · All major cards accepted
      </p>

      {/* Current subscription status */}
      {subscription && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Current plan:</span>
            <SubscriptionBadge status={subscription.status} />
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
        {['monthly', 'annual'].map(b => (
          <button key={b} onClick={() => setBilling(b)}
            style={{ padding: '7px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: billing === b ? '#4f46e5' : 'rgba(255,255,255,0.07)', color: billing === b ? '#fff' : '#aaa', transition: 'all .2s' }}>
            {b === 'monthly' ? 'Monthly' : 'Annual (save ~20%)'}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {PLANS.map(p => <PlanCard key={p.id} plan={p} billing={billing} selected={selectedPlan === p.id} onSelect={setSelectedPlan} />)}
      </div>

      {/* Payment & checkout */}
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />

        {paymentMethod === 'gift' && (
          <div style={{ marginBottom: 16 }}>
            <GiftCardInput authToken={authToken} onApplied={code => { setGiftCode(code); setPaymentMethod('card'); }} />
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? '#374151' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity .2s'
          }}
        >
          {loading ? 'Redirecting to Stripe…' : `Subscribe to ${PLANS.find(p=>p.id===selectedPlan)?.name || 'Pro'} → $${PLANS.find(p=>p.id===selectedPlan)?.price[billing]}/mo`}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#3f4d5a', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>🔒 256-bit SSL</span>
          <span>💳 All major cards</span>
          <span>₿ Crypto accepted</span>
          <span>🔄 Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}
