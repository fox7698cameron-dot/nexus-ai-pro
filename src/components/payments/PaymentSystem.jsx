/**
 * src/components/payments/PaymentSystem.jsx
 * Nexus AI Pro — Payment & Subscription System
 * Labeled: 2026-08-25
 *
 * Supports:
 *   - Stripe (Visa, Mastercard, Amex, Discover, Diners, debit, prepaid)
 *   - Cryptocurrency (BTC, ETH, USDC, SOL, DOGE, LTC)
 *   - Gift cards
 *
 * PCI compliance: card details are tokenized by Stripe.js in the browser.
 * This component NEVER touches raw card numbers.
 * Stripe publishable key is the only key safe for frontend use.
 */

import React, { useState, useEffect } from 'react';

async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('nexus:accessToken');
  const res   = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Plan cards ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    badge: '🆓',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
    features: [
      '5 AI chats/day',
      'Basic models',
      '1MB file uploads',
      'Community support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    badge: '⭐',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    features: [
      'Unlimited AI chats',
      'All models (GPT-5, Claude 5, Gemini)',
      '100MB file uploads',
      'Analytics dashboard',
      'Game dev tracking',
      'Priority support'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$14.99',
    period: '/month',
    badge: '👑',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'API access',
      'Security dashboard',
      'White-label options',
      'SLA guarantee',
      'Dedicated support'
    ]
  }
];

const CRYPTO_OPTIONS = [
  { id: 'BTC',  name: 'Bitcoin',   emoji: '₿' },
  { id: 'ETH',  name: 'Ethereum',  emoji: 'Ξ' },
  { id: 'USDC', name: 'USD Coin',  emoji: '$' },
  { id: 'SOL',  name: 'Solana',    emoji: '◎' },
  { id: 'DOGE', name: 'Dogecoin',  emoji: '🐕' },
  { id: 'LTC',  name: 'Litecoin',  emoji: 'Ł' }
];

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, current, onSelect }) {
  return (
    <div style={{
      background:   plan.gradient,
      border:       `2px solid ${current === plan.id ? plan.color : 'transparent'}`,
      borderRadius: 16, padding: '24px 20px',
      display:      'flex', flexDirection: 'column', gap: 16,
      position:     'relative', cursor: 'pointer',
      transition:   'border-color 0.15s, box-shadow 0.15s',
      boxShadow:    current === plan.id ? `0 0 0 3px ${plan.color}30` : 'none'
    }}
      onClick={() => onSelect(plan.id)}
    >
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -12, right: 20,
          background: '#3b82f6', color: '#fff',
          padding: '4px 14px', borderRadius: 20,
          fontSize: 11, fontWeight: 700
        }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }} aria-hidden="true">{plan.badge}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{plan.name}</div>
          <div style={{ color: plan.color, fontWeight: 800, fontSize: 22 }}>
            {plan.price}<span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>{plan.period}</span>
          </div>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: plan.color, fontWeight: 700 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      {current === plan.id ? (
        <div style={{
          padding: '10px', borderRadius: 10, textAlign: 'center',
          background: plan.color, color: '#fff', fontWeight: 700, fontSize: 14
        }}>
          Current Plan
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onSelect(plan.id); }}
          style={{
            padding: '10px', borderRadius: 10, textAlign: 'center',
            border: `2px solid ${plan.color}`, background: 'transparent',
            color: plan.color, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s'
          }}
          onMouseEnter={e => { e.target.style.background = plan.color; e.target.style.color = '#fff'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = plan.color; }}
        >
          {plan.id === 'free' ? 'Downgrade' : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  );
}

// ── Checkout modal ────────────────────────────────────────────────────────────
function CheckoutModal({ plan, onClose, onSuccess }) {
  const [method, setMethod]     = useState('card'); // card | crypto | gift
  const [email, setEmail]       = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('ETH');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [cryptoCharge, setCryptoCharge] = useState(null);

  async function handleCardCheckout() {
    if (!email.trim()) { setError('Email required for billing'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/payments/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id, email: email.trim() })
      });
      // In production: initialize Stripe.js PaymentElement with data.clientSecret
      // For MVP: show success message
      onSuccess({ plan, method: 'card', subscriptionId: data.subscriptionId });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCryptoCheckout() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/payments/crypto/charge', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id, currency: cryptoCurrency })
      });
      if (data.ok) {
        setCryptoCharge(data);
      } else {
        setError(data.error || 'Crypto payment unavailable');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGiftCard() {
    if (!giftCode.trim()) { setError('Enter gift card code'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/payments/gift/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: giftCode.trim() })
      });
      onSuccess({ plan, method: 'gift', credit: data.value });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--input-bg)',
    color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box'
  };

  if (cryptoCharge) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}>
        <div style={{
          background: 'var(--card-bg)', borderRadius: 20, padding: 32,
          maxWidth: 400, width: '100%', textAlign: 'center',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 48 }}>₿</div>
          <h3 style={{ margin: '12px 0 8px', fontSize: 18 }}>Crypto Payment Ready</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 16px' }}>
            Send {cryptoCurrency} to complete your subscription
          </p>
          {cryptoCharge.hostedUrl && (
            <a
              href={cryptoCharge.hostedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 20px', borderRadius: 10,
                background: '#f7931a', color: '#fff', textDecoration: 'none',
                fontWeight: 700, fontSize: 14, marginBottom: 12
              }}
            >
              Open Payment Page ↗
            </a>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>
            Charge code: <code>{cryptoCharge.code}</code>
          </p>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 20, padding: 32,
        maxWidth: 480, width: '100%', border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {plan.badge} Upgrade to {plan.name}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1
          }}>×</button>
        </div>

        {/* Payment method tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {['card', 'crypto', 'gift'].map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: method === m ? 700 : 500,
              color: method === m ? '#6366f1' : 'var(--text-muted)',
              borderBottom: method === m ? '2px solid #6366f1' : '2px solid transparent',
              textTransform: 'capitalize', marginBottom: -1
            }}>
              {m === 'card' ? '💳 Card' : m === 'crypto' ? '₿ Crypto' : '🎁 Gift Card'}
            </button>
          ))}
        </div>

        {method === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Billing email" type="email" style={inputStyle} />
            <div style={{
              padding: '16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--input-bg)', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center'
            }}>
              🔒 Stripe payment form loads here in production.<br />
              Card details are tokenized by Stripe.js — never touch our servers.<br />
              <span style={{ fontSize: 11 }}>Visa, Mastercard, Amex, Discover, Diners, debit & prepaid cards accepted.</span>
            </div>
            {error && <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button onClick={handleCardCheckout} disabled={loading} style={{
              padding: '13px', borderRadius: 10, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Processing…' : `Subscribe — ${plan.price}${plan.period}`}
            </button>
          </div>
        )}

        {method === 'crypto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Select Cryptocurrency
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CRYPTO_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setCryptoCurrency(c.id)} style={{
                    padding: '8px 14px', borderRadius: 10,
                    border: `2px solid ${cryptoCurrency === c.id ? '#f7931a' : 'var(--border)'}`,
                    background: cryptoCurrency === c.id ? '#fff7ed' : 'transparent',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: cryptoCurrency === c.id ? '#f7931a' : 'var(--text-muted)'
                  }}>
                    {c.emoji} {c.id}
                  </button>
                ))}
              </div>
            </div>
            {error && <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button onClick={handleCryptoCheckout} disabled={loading} style={{
              padding: '13px', borderRadius: 10, border: 'none',
              background: '#f7931a', color: '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Creating charge…' : `Pay with ${cryptoCurrency}`}
            </button>
          </div>
        )}

        {method === 'gift' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Gift Card Code
              </label>
              <input
                value={giftCode}
                onChange={e => setGiftCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                style={{ ...inputStyle, letterSpacing: '0.1em', textTransform: 'uppercase' }}
              />
            </div>
            {error && <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button onClick={handleGiftCard} disabled={loading} style={{
              padding: '13px', borderRadius: 10, border: 'none',
              background: '#16a34a', color: '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Redeeming…' : 'Redeem Gift Card'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main payment system ───────────────────────────────────────────────────────
export default function PaymentSystem() {
  const [plans,       setPlans]       = useState(PLANS);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selected,    setSelected]    = useState(null);
  const [success,     setSuccess]     = useState(null);

  useEffect(() => {
    apiFetch('/payments/status')
      .then(data => setCurrentPlan(data.planId || 'free'))
      .catch(() => {});
  }, []);

  function handleSuccess(data) {
    setSelected(null);
    setSuccess(data);
    setCurrentPlan(data.plan?.id || currentPlan);
    setTimeout(() => setSuccess(null), 5_000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '0 4px' }}>

      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💳 Subscription & Billing</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Manage your plan. Card, crypto & gift card payments accepted.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          color: '#15803d', fontWeight: 600, fontSize: 14
        }}>
          ✅ Payment successful! You're now on the {success.plan?.name} plan.
          {success.credit && ` $${success.credit} credit applied.`}
        </div>
      )}

      {/* Current plan badge */}
      <div style={{
        padding: '14px 18px', borderRadius: 12,
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <span style={{ fontSize: 22 }}>
          {PLANS.find(p => p.id === currentPlan)?.badge || '🆓'}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Current Plan: {PLANS.find(p => p.id === currentPlan)?.name || 'Free'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {PLANS.find(p => p.id === currentPlan)?.price} {PLANS.find(p => p.id === currentPlan)?.period}
          </div>
        </div>
      </div>

      {/* Plan grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={currentPlan}
            onSelect={id => {
              if (id !== currentPlan && id !== 'free') setSelected(PLANS.find(p => p.id === id));
            }}
          />
        ))}
      </div>

      {/* Payment logos */}
      <div style={{
        padding: '14px 18px', borderRadius: 10,
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Accepted:</span>
        {['Visa', 'Mastercard', 'Amex', 'Discover', 'Diners', 'Maestro', 'Debit'].map(card => (
          <span key={card} style={{
            padding: '3px 10px', borderRadius: 6,
            border: '1px solid var(--border)', fontSize: 12, fontWeight: 600
          }}>{card}</span>
        ))}
        <span style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: '#f7931a' }}>₿ BTC</span>
        <span style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: '#627eea' }}>Ξ ETH</span>
        <span style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: '#2775ca' }}>$ USDC</span>
        <span style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>🎁 Gift Cards</span>
      </div>

      {selected && (
        <CheckoutModal
          plan={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
