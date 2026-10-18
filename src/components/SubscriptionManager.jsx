// src/components/SubscriptionManager.jsx
// Created: 2026-10-18
// Subscription management: Stripe checkout, plans, crypto, gift cards

import React, { useState, useEffect, useCallback } from 'react';

const PLAN_ICONS = { free: '🆓', pro: '⚡', team: '👥', enterprise: '🏢' };
const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳', note: 'Visa, Mastercard, Amex, Discover & more' },
  { id: 'crypto', label: 'Cryptocurrency', icon: '₿', note: 'BTC, ETH, USDC, USDT and more' },
  { id: 'giftcard', label: 'Gift Card', icon: '🎁', note: 'Redeem a Nexus AI Pro gift card' },
];

function PlanCard({ plan, current, onSelect }) {
  const isCurrent = current?.plan === plan.id;
  return (
    <div style={{ ...styles.planCard, ...(isCurrent ? styles.planCardActive : {}) }}>
      <div style={styles.planIcon}>{PLAN_ICONS[plan.id] || '📦'}</div>
      <div style={styles.planName}>{plan.name}</div>
      <div style={styles.planPrice}>
        {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)} / ${plan.interval}`}
      </div>
      {isCurrent ? (
        <div style={styles.currentBadge}>✅ Current Plan</div>
      ) : (
        <button
          style={{ ...styles.selectBtn, ...(plan.price === 0 ? styles.downgradBtn : {}) }}
          onClick={() => onSelect(plan)}
        >
          {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
        </button>
      )}
    </div>
  );
}

function GiftCardRedeemer({ token, onRedeem }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const redeem = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setStatus(res.ok ? 'success' : 'error');
      setMessage(data.message || data.error);
      if (res.ok) { setCode(''); onRedeem?.(data); }
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
  };

  return (
    <div style={styles.giftCardBox}>
      <div style={styles.sectionTitle}>🎁 Redeem Gift Card</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <input
          style={{ ...styles.input, flex: 1 }}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={20}
        />
        <button style={styles.primaryBtn} onClick={redeem} disabled={status === 'loading' || !code}>
          {status === 'loading' ? '…' : 'Redeem'}
        </button>
      </div>
      {message && (
        <div style={{ ...styles.msgBox, borderColor: status === 'success' ? '#22c55e' : '#ef4444', color: status === 'success' ? '#22c55e' : '#ef4444' }}>
          {message}
        </div>
      )}
    </div>
  );
}

function CryptoCheckout({ token, plans }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [currency, setCurrency] = useState('BTC');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const initiate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/crypto/initiate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan, currency }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Failed to initiate payment' });
    } finally {
      setLoading(false);
    }
  };

  const CURRENCIES = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'XRP'];

  return (
    <div style={styles.cryptoBox}>
      <div style={styles.sectionTitle}>₿ Pay with Crypto</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={styles.input} value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
          {plans?.filter(p => p.price > 0).map(p => <option key={p.id} value={p.id}>{p.name} — ${(p.price / 100).toFixed(2)}/mo</option>)}
        </select>
        <select style={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={styles.primaryBtn} onClick={initiate} disabled={loading}>{loading ? '…' : 'Get Address'}</button>
      </div>
      {result && (
        <div style={{ ...styles.msgBox, borderColor: result.error ? '#ef4444' : '#22c55e', color: result.error ? '#ef4444' : '#94a3b8' }}>
          {result.error || `Invoice ${result.invoiceId} — ${result.message}`}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionManager({ token }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [activeMethod, setActiveMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [token]);

  useEffect(() => {
    Promise.allSettled([apiFetch('/api/payments/plans'), apiFetch('/api/payments/subscription')])
      .then(([plansRes, subRes]) => {
        if (plansRes.status === 'fulfilled') setPlans(plansRes.value);
        if (subRes.status === 'fulfilled') setSubscription(subRes.value);
      });
  }, [apiFetch]);

  const handleSelectPlan = async (plan) => {
    if (plan.price === 0) { setMessage('Downgrade to free plan — contact support or cancel your subscription from the portal.'); return; }
    setLoading(true);
    try {
      const data = await apiFetch('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id }),
      });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setMessage(`Checkout failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/payments/portal', { method: 'POST' });
      if (data.url) window.location.href = data.url;
    } catch {
      setMessage('Unable to open billing portal. Ensure you have an active Stripe subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 Subscription & Billing</h1>
        {subscription && (
          <div style={styles.currentPlanBanner}>
            <span>Current plan: <strong style={{ color: '#f8fafc' }}>{subscription.plan?.toUpperCase()}</strong></span>
            <span style={{ color: subscription.status === 'active' ? '#22c55e' : '#f97316', fontWeight: 600 }}>{subscription.status}</span>
          </div>
        )}
      </div>

      {message && <div style={styles.infoBox}>{message}</div>}

      {/* Plans */}
      <div style={styles.sectionTitle}>Choose a Plan</div>
      <div style={styles.plansGrid}>
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} current={subscription} onSelect={handleSelectPlan} />
        ))}
      </div>

      {subscription?.plan !== 'free' && (
        <button style={{ ...styles.outlineBtn, marginTop: 16 }} onClick={openPortal} disabled={loading}>
          ⚙️ Manage Billing / Cancel
        </button>
      )}

      {/* Payment method tabs */}
      <div style={styles.sectionTitle}>Payment Methods</div>
      <div style={styles.methodTabs}>
        {PAYMENT_METHODS.map(m => (
          <button
            key={m.id}
            style={{ ...styles.methodTab, ...(activeMethod === m.id ? styles.methodTabActive : {}) }}
            onClick={() => setActiveMethod(m.id)}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {activeMethod === 'card' && (
        <div style={styles.methodPanel}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Powered by Stripe. Supports Visa, Mastercard, American Express, Discover, UnionPay, JCB, Diners Club, and major debit cards.
          </p>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Select a plan above to proceed to secure Stripe checkout. Your payment is processed by Stripe — we never store card details.
          </p>
        </div>
      )}

      {activeMethod === 'crypto' && <CryptoCheckout token={token} plans={plans} />}
      {activeMethod === 'giftcard' && <GiftCardRedeemer token={token} />}
    </div>
  );
}

const styles = {
  container: { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' },
  header: { marginBottom: 24 },
  title: { margin: '0 0 12px', fontSize: 28, fontWeight: 700, color: '#f8fafc' },
  currentPlanBanner: { background: '#1e293b', borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', fontSize: 14, color: '#94a3b8' },
  sectionTitle: { fontWeight: 700, fontSize: 18, color: '#f1f5f9', margin: '24px 0 14px' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  planCard: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', textAlign: 'center', transition: 'border-color 0.2s' },
  planCardActive: { borderColor: '#6366f1', boxShadow: '0 0 0 2px #6366f140' },
  planIcon: { fontSize: 32, marginBottom: 8 },
  planName: { fontWeight: 700, fontSize: 18, color: '#f8fafc', marginBottom: 6 },
  planPrice: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  currentBadge: { color: '#22c55e', fontWeight: 600, fontSize: 13 },
  selectBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  downgradBtn: { background: '#334155', color: '#94a3b8' },
  methodTabs: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  methodTab: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  methodTabActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  methodPanel: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  giftCardBox: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  cryptoBox: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  input: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 14 },
  primaryBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  outlineBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 },
  msgBox: { background: 'transparent', border: '1px solid', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 12 },
  infoBox: { background: '#6366f120', border: '1px solid #6366f1', borderRadius: 8, padding: '10px 16px', color: '#a5b4fc', fontSize: 14, marginBottom: 20 },
};
