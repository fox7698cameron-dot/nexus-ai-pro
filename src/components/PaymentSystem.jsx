/**
 * src/components/PaymentSystem.jsx
 * Nexus AI Pro — Payment & Subscription System
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Stripe integration: all major credit/debit cards (Visa, Mastercard, Amex,
 * Discover, UnionPay, JCB), crypto (via Stripe), and gift card / promo codes.
 * No card numbers or keys are ever stored or hardcoded — Stripe handles PCI.
 */

import React, { useState, useEffect, useCallback } from 'react';
import AuthService from '../auth/AuthService.js';
import { t, formatCurrency, formatDate } from '../i18n/index.js';

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = {
  free: {
    id: 'free', name: 'Free', price: 0, currency: 'USD',
    interval: 'month', icon: '🆓',
    features: ['5 AI chats/day', 'Basic models', '1MB uploads', 'Community support'],
    color: '#6b7280', highlight: false,
  },
  pro: {
    id: 'pro', name: 'Pro', price: 9.99, currency: 'USD',
    interval: 'month', icon: '⭐',
    features: ['Unlimited chats', 'All 30+ models', '100MB uploads', 'Priority support', 'Analytics dashboard'],
    color: '#3b82f6', highlight: false,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 14.99, currency: 'USD',
    interval: 'month', icon: '👑',
    features: ['Everything in Pro', 'Custom models', 'API access', 'SLA guarantee', 'Security dashboard', 'Dedicated support'],
    color: '#a855f7', highlight: true,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
  },
};

// ─── Accepted payment method icons ───────────────────────────────────────────

const CARD_BRANDS = [
  { id: 'visa',       label: 'Visa',       icon: '💳' },
  { id: 'mastercard', label: 'Mastercard', icon: '💳' },
  { id: 'amex',       label: 'Amex',       icon: '💳' },
  { id: 'discover',   label: 'Discover',   icon: '💳' },
  { id: 'unionpay',   label: 'UnionPay',   icon: '💳' },
  { id: 'jcb',        label: 'JCB',        icon: '💳' },
  { id: 'dinersclub', label: 'Diners',     icon: '💳' },
  { id: 'maestro',    label: 'Maestro',    icon: '💳' },
];

const CRYPTO_OPTIONS = [
  { id: 'btc',  label: 'Bitcoin',   icon: '₿',  note: 'via Stripe Crypto' },
  { id: 'eth',  label: 'Ethereum',  icon: 'Ξ',  note: 'via Stripe Crypto' },
  { id: 'usdc', label: 'USD Coin',  icon: '💲', note: 'via Stripe Crypto' },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

function headers() {
  const token = AuthService.getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers ?? {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({ plan, currentPlan, onSelect, loading }) {
  const isCurrent = currentPlan === plan.id;
  return (
    <div style={{
      background: plan.highlight ? 'linear-gradient(135deg, #1e0a3c, #12121f)' : '#12121f',
      border: `2px solid ${isCurrent ? '#10b981' : plan.highlight ? plan.color : '#2d2d44'}`,
      borderRadius: 16, padding: '24px', position: 'relative',
      transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column',
    }}>
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: plan.color, color: '#fff', padding: '3px 14px', borderRadius: 12,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{plan.icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{plan.name}</div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>
          {plan.price === 0 ? 'Free' : formatCurrency(plan.price, plan.currency)}
        </span>
        {plan.price > 0 && <span style={{ color: '#555', fontSize: 13 }}>/{plan.interval}</span>}
      </div>
      <ul style={{ margin: '0 0 20px', padding: '0 0 0 0', listStyle: 'none', flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ color: '#888', fontSize: 13, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#10b981' }}>✓</span> {f}
          </li>
        ))}
      </ul>
      {isCurrent ? (
        <div style={{
          width: '100%', padding: '10px', background: 'rgba(16,185,129,0.15)',
          color: '#10b981', border: '1px solid #10b98130', borderRadius: 8,
          textAlign: 'center', fontSize: 14, fontWeight: 700,
        }}>
          ✅ Current Plan
        </div>
      ) : (
        <button onClick={() => onSelect(plan)} disabled={loading || plan.id === 'free'} style={{
          width: '100%', padding: '10px',
          background: plan.id === 'free' ? '#2d2d44' : `linear-gradient(135deg, ${plan.color}, #7c3aed)`,
          color: plan.id === 'free' ? '#555' : '#fff', border: 'none', borderRadius: 8,
          cursor: plan.id === 'free' ? 'default' : 'pointer', fontSize: 14, fontWeight: 700,
        }}>
          {plan.id === 'free' ? 'Free Forever' : loading ? 'Processing…' : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  );
}

function PaymentMethodSelector({ selected, onSelect }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>Payment Method</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { id: 'card',    label: 'Card',       icon: '💳' },
          { id: 'crypto',  label: 'Crypto',     icon: '₿' },
          { id: 'giftcard',label: 'Gift Card',  icon: '🎁' },
        ].map(m => (
          <button key={m.id} onClick={() => onSelect(m.id)} style={{
            padding: '8px 16px', border: `1px solid ${selected === m.id ? '#a855f7' : '#2d2d44'}`,
            borderRadius: 8, background: selected === m.id ? 'rgba(168,85,247,0.15)' : '#1a1a2e',
            color: selected === m.id ? '#a855f7' : '#888', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {selected === 'card' && (
        <div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Accepted cards</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {CARD_BRANDS.map(b => (
              <span key={b.id} style={{
                padding: '3px 10px', background: '#1a1a2e', border: '1px solid #2d2d44',
                borderRadius: 4, fontSize: 11, color: '#888',
              }}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
          <div style={{
            background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 10,
            padding: '16px', fontSize: 13, color: '#666',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            🔒 Card entry is handled securely by Stripe — your card details never touch our servers.
          </div>
        </div>
      )}

      {selected === 'crypto' && (
        <div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Supported cryptocurrencies</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CRYPTO_OPTIONS.map(c => (
              <div key={c.id} style={{
                padding: '8px 14px', background: '#1a1a2e', border: '1px solid #2d2d44',
                borderRadius: 8, fontSize: 13,
              }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>{' '}
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.label}</span>
                <span style={{ color: '#555', fontSize: 11, marginLeft: 6 }}>{c.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected === 'giftcard' && (
        <GiftCardRedeemer />
      )}
    </div>
  );
}

function GiftCardRedeemer() {
  const [code, setCode]     = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function redeem() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/payments/redeem-gift-card', {
        method: 'POST', body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      setResult({ success: true, message: data.message, credit: data.credit });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          style={{
            flex: 1, padding: '10px 12px', background: '#1a1a2e', border: '1px solid #2d2d44',
            borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none',
            fontFamily: 'monospace', letterSpacing: '0.1em',
          }}
        />
        <button onClick={redeem} disabled={loading || !code.trim()} style={{
          padding: '10px 20px', background: loading ? '#2d2d44' : '#a855f7',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
        }}>
          {loading ? '…' : 'Redeem'}
        </button>
      </div>
      {result && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: result.success ? '#10b981' : '#ef4444',
          border: `1px solid ${result.success ? '#10b98130' : '#ef444430'}`,
        }}>
          {result.success ? '🎉 ' : '❌ '}{result.message}
          {result.credit && <strong> +{formatCurrency(result.credit, 'USD')} credit</strong>}
        </div>
      )}
    </div>
  );
}

function PaymentHistory({ history = [] }) {
  return (
    <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d2d44', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
        Payment History
      </div>
      {history.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: 13 }}>No payments yet</div>
      ) : (
        history.map((h, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', borderBottom: i < history.length - 1 ? '1px solid #1f1f2e' : 'none',
          }}>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{h.description}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{formatDate(h.date)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#10b981', fontSize: 14, fontWeight: 700 }}>
                {formatCurrency(h.amount, h.currency ?? 'USD')}
              </div>
              <div style={{ fontSize: 11, color: h.status === 'paid' ? '#10b981' : '#f59e0b' }}>
                {h.status?.toUpperCase()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentSystem() {
  const [currentPlan, setCurrentPlan]   = useState('free');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/payments/subscription').then(d => setCurrentPlan(d.plan ?? 'free')).catch(() => null),
      apiFetch('/api/payments/history').then(d => setHistory(d.history ?? [])).catch(() => null),
    ]);
  }, []);

  async function handleUpgrade(plan) {
    if (plan.id === 'free') return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiFetch('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id, paymentMethod }),
      });
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        setCurrentPlan(plan.id);
        setMessage({ type: 'success', text: `Upgraded to ${plan.name}!` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function cancelSubscription() {
    if (!confirm('Cancel your subscription? You will keep access until the current period ends.')) return;
    try {
      await apiFetch('/api/payments/cancel', { method: 'POST', body: '{}' });
      setMessage({ type: 'success', text: 'Subscription cancelled. Access continues until period end.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Billing &amp; Subscriptions
      </h1>
      <p style={{ margin: '0 0 28px', color: '#555', fontSize: 13 }}>
        Secure payments via Stripe · Visa, Mastercard, Amex, Discover, UnionPay, JCB, Crypto &amp; Gift Cards
      </p>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 20,
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success' ? '#10b98130' : '#ef444430'}`,
          color: message.type === 'success' ? '#10b981' : '#ef4444',
        }}>
          {message.text}
        </div>
      )}

      {/* Payment method */}
      <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
        <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16, marginBottom: 28 }}>
        {Object.values(PLANS).map(plan => (
          <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan}
            onSelect={handleUpgrade} loading={loading} />
        ))}
      </div>

      {/* Cancel */}
      {currentPlan !== 'free' && (
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <button onClick={cancelSubscription} style={{
            background: 'none', border: '1px solid #ef44443e', color: '#ef4444',
            padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
          }}>
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Payment history */}
      <PaymentHistory history={history} />

      {/* Security note */}
      <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(59,130,246,0.08)', borderRadius: 10, border: '1px solid #3b82f630', fontSize: 12, color: '#555' }}>
        🔒 All payments are processed securely by Stripe. Nexus AI Pro never stores or has access to your card or banking details. PCI DSS Level 1 compliant.
      </div>
    </div>
  );
}
