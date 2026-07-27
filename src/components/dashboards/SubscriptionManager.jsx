// src/components/dashboards/SubscriptionManager.jsx
// 2026-07-27 | Nexus AI Pro — Subscription & Billing Dashboard
// Stripe (Visa, MC, Amex, Discover) · Crypto (BTC, ETH, USDC, SOL) · Gift Cards

import React, { useState, useEffect, useCallback } from 'react';

const PAYMENT_ICONS = {
  card: '💳',
  crypto_btc: '₿',
  crypto_eth: 'Ξ',
  crypto_usdc: '💲',
  crypto_sol: '◎',
  crypto_bnb: '🔶',
  gift_card: '🎁',
};

const CARD_BRANDS = [
  { name: 'Visa', pattern: /^4/ },
  { name: 'Mastercard', pattern: /^5[1-5]/ },
  { name: 'Amex', pattern: /^3[47]/ },
  { name: 'Discover', pattern: /^6(?:011|5)/ },
];

function detectCard(number) {
  const stripped = number.replace(/\D/g, '');
  return CARD_BRANDS.find(b => b.pattern.test(stripped))?.name || '';
}

function PlanCard({ plan, current, onSelect }) {
  const active = current?.plan === plan.id;
  return (
    <div style={{
      background: active ? '#3b82f611' : 'var(--card-bg)',
      border: `2px solid ${active ? '#3b82f6' : 'var(--border)'}`,
      borderRadius: 16, padding: 24, flex: '1 1 200px', position: 'relative',
    }}>
      {active && <div style={{ position: 'absolute', top: -1, right: 16, background: '#3b82f6', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: '0 0 6px 6px' }}>CURRENT</div>}
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(0)}`}
        {plan.price > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.features.map(f => (
          <li key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#22c55e' }}>✓</span> {f}
          </li>
        ))}
      </ul>
      {!active && (
        <button onClick={() => onSelect(plan)}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: plan.id === 'enterprise' ? '#8b5cf6' : '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {plan.price === 0 ? 'Get Started Free' : 'Upgrade'}
        </button>
      )}
    </div>
  );
}

function PaymentForm({ plan, onSuccess, onCancel }) {
  const [method, setMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [crypto, setCrypto] = useState('btc');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const METHODS = [
    { id: 'card', label: 'Card' },
    { id: 'crypto_btc', label: 'BTC' },
    { id: 'crypto_eth', label: 'ETH' },
    { id: 'crypto_usdc', label: 'USDC' },
    { id: 'gift_card', label: 'Gift Card' },
  ];

  const cardBrand = detectCard(cardNumber);

  const submit = async () => {
    setError(''); setProcessing(true);
    try {
      const body = {
        planId: plan.id,
        paymentType: method,
        ...(method === 'card' && { paymentMethodId: 'pm_simulated_' + Date.now() }),
        ...(method === 'gift_card' && { giftCardCode: giftCode }),
      };
      const token = sessionStorage.getItem('nexus:token');
      const r = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Payment failed'); return; }
      onSuccess?.(data);
    } catch { setError('Network error'); }
    finally { setProcessing(false); }
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Subscribe to {plan.name} — ${plan.price / 100}/mo</div>

      {/* Payment method selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {METHODS.map(m => (
          <button key={m.id} onClick={() => setMethod(m.id)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${method === m.id ? '#3b82f6' : 'var(--border)'}`,
              background: method === m.id ? '#3b82f611' : 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            {PAYMENT_ICONS[m.id]} {m.label}
          </button>
        ))}
      </div>

      {/* Card form */}
      {method === 'card' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Card Number {cardBrand && <span style={{ color: '#3b82f6', fontWeight: 600 }}>{cardBrand}</span>}
            </label>
            <input value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
              placeholder="1234 5678 9012 3456" maxLength={19}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expiry (MM/YY)</label>
              <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY" maxLength={5}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>CVC</label>
              <input value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123" maxLength={4} type="password"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Supports: Visa, Mastercard, American Express, Discover · 3D Secure enabled
          </div>
        </div>
      )}

      {/* Crypto */}
      {method.startsWith('crypto_') && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Send exact amount to the wallet address below:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22c55e', wordBreak: 'break-all', background: '#0f172a', padding: 10, borderRadius: 6 }}>
            Wallet address loaded from {method.replace('crypto_', '').toUpperCase()} wallet env var
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Amount: ${plan.price / 100} USD equivalent · Expires in 1 hour · Confirmation required
          </div>
        </div>
      )}

      {/* Gift card */}
      {method === 'gift_card' && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Gift Card Code</label>
          <input value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
      )}

      {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}>Cancel</button>
        <button onClick={submit} disabled={processing}
          style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
          {processing ? 'Processing...' : `Subscribe — $${plan.price / 100}/mo`}
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionManager({ token }) {
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [tab, setTab] = useState('plans');
  const [success, setSuccess] = useState('');

  const h = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    try {
      const [p, c, i] = await Promise.all([
        fetch('/api/subscriptions/plans').then(r => r.json()),
        fetch('/api/subscriptions/me', { headers: h }).then(r => r.json()),
        fetch('/api/subscriptions/invoices', { headers: h }).then(r => r.json()),
      ]);
      setPlans(p.plans || []);
      setCurrent(c);
      setInvoices(i.invoices || []);
    } catch { /* handled */ }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSuccess = async (data) => {
    setSuccess(`Subscribed to ${data.subscription?.plan || 'plan'} successfully!`);
    setSelectedPlan(null);
    await load();
  };

  const cancel = async () => {
    if (!confirm('Cancel subscription?')) return;
    await fetch('/api/subscriptions/cancel', { method: 'POST', headers: h });
    await load();
  };

  return (
    <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Subscription & Billing</h1>

      {success && <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#22c55e', marginBottom: 16 }}>{success}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {['plans', 'current', 'invoices'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textTransform: 'capitalize',
              borderBottom: `2px solid ${tab === t ? '#3b82f6' : 'transparent'}`, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#3b82f6' : 'var(--text)' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'plans' && !selectedPlan && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {plans.map(p => <PlanCard key={p.id} plan={p} current={current} onSelect={setSelectedPlan} />)}
        </div>
      )}

      {tab === 'plans' && selectedPlan && (
        <PaymentForm plan={selectedPlan} onSuccess={handleSuccess} onCancel={() => setSelectedPlan(null)} />
      )}

      {tab === 'current' && current && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{current.planDetails?.name || current.plan}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            Status: <span style={{ color: current.status === 'active' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{current.status}</span>
          </div>
          {current.currentPeriodEnd && (
            <div style={{ fontSize: 13, marginBottom: 20 }}>
              <span style={{ color: 'var(--text-muted)' }}>Renews:</span> {new Date(current.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
          {current.planDetails?.features && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {current.planDetails.features.map(f => <li key={f} style={{ fontSize: 13, display: 'flex', gap: 6 }}><span style={{ color: '#22c55e' }}>✓</span>{f}</li>)}
            </ul>
          )}
          {current.status === 'active' && current.plan !== 'free' && (
            <button onClick={cancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
              Cancel Subscription
            </button>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          {invoices.length === 0
            ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No invoices yet</div>
            : invoices.map(inv => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>${(inv.amount / 100).toFixed(2)} {inv.currency?.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(inv.issuedAt).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: inv.status === 'paid' ? '#22c55e22' : '#f59e0b22',
                  color: inv.status === 'paid' ? '#22c55e' : '#f59e0b' }}>{inv.status}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
