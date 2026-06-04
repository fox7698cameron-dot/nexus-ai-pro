// ================================================
// NEXUS AI PRO — Checkout & Billing UI
// Supports: Credit/debit cards (Stripe), Crypto,
//           Gift cards, Plan management
// No keys hard-coded — server-side only
// Created: 2026-06-04
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Bitcoin, Gift, Check, Zap, Shield, Star, Crown, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../auth/AuthPages.jsx';

const PLAN_ICONS = { free: Zap, pro: Star, enterprise: Crown };
const PLAN_COLORS = { free: '#888', pro: '#6366f1', enterprise: '#f59e0b' };

const CRYPTO_OPTIONS = [
  { id: 'BTC',  name: 'Bitcoin',       icon: '₿' },
  { id: 'ETH',  name: 'Ethereum',      icon: 'Ξ' },
  { id: 'USDC', name: 'USD Coin',      icon: '$' },
  { id: 'USDT', name: 'Tether',        icon: '₮' },
  { id: 'SOL',  name: 'Solana',        icon: '◎' }
];

function PlanCard({ plan, current, onSelect }) {
  const Icon = PLAN_ICONS[plan.id] || Zap;
  const color = PLAN_COLORS[plan.id] || '#888';
  const isCurrentPlan = current?.plan === plan.id;

  return (
    <div style={{
      background: isCurrentPlan ? color + '22' : '#16213e',
      border: `2px solid ${isCurrentPlan ? color : '#2d2d44'}`,
      borderRadius: 16,
      padding: 24,
      cursor: isCurrentPlan ? 'default' : 'pointer',
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}
      onMouseEnter={e => { if (!isCurrentPlan) e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { if (!isCurrentPlan) e.currentTarget.style.borderColor = '#2d2d44'; }}
      onClick={() => !isCurrentPlan && onSelect(plan)}
    >
      {isCurrentPlan && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: color, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
          CURRENT
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ background: color + '22', borderRadius: 10, padding: 10 }}><Icon size={22} color={color} /></div>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{plan.name}</div>
          <div style={{ color: color, fontWeight: 700, fontSize: 14 }}>
            {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}/${plan.interval}`}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 13 }}>
            <Check size={13} color={color} style={{ flexShrink: 0 }} />
            {f}
          </div>
        ))}
      </div>
      {!isCurrentPlan && (
        <div style={{ marginTop: 16, background: color, color: '#fff', borderRadius: 8, padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: 14 }}>
          {plan.price === 0 ? 'Get Started Free' : `Subscribe — $${(plan.price / 100).toFixed(2)}/${plan.interval}`}
        </div>
      )}
    </div>
  );
}

export default function Checkout() {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('plans');
  const [giftCode, setGiftCode] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDC');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [cryptoTx, setCryptoTx] = useState(null);

  const headers = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plRes, subRes, txRes] = await Promise.all([
        fetch('/api/payments/plans'),
        fetch('/api/payments/subscription', { headers: headers() }),
        fetch('/api/payments/transactions', { headers: headers() })
      ]);
      if (plRes.ok) { const d = await plRes.json(); setPlans(d.plans || []); }
      if (subRes.ok) setSubscription(await subRes.json());
      if (txRes.ok) { const d = await txRes.json(); setTransactions(d.transactions || []); }
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check for Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setMessage({ type: 'success', text: 'Payment successful! Your plan has been activated.' });
      window.history.replaceState({}, '', window.location.pathname);
      fetchData();
    }
  }, [fetchData]);

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    setMessage(null);
    if (plan.price === 0) {
      try {
        const res = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify({ planId: plan.id })
        });
        const data = await res.json();
        if (data.success) { setMessage({ type: 'success', text: 'Free plan activated!' }); fetchData(); }
      } catch {
        setMessage({ type: 'error', text: 'Failed to activate free plan.' });
      }
      return;
    }
    setTab('payment');
  };

  const handleCardCheckout = async () => {
    if (!selectedPlan) return;
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ planId: selectedPlan.id })
      });
      const data = await res.json();
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; }
      else setMessage({ type: 'error', text: data.error || 'Checkout unavailable. Configure STRIPE_SECRET_KEY.' });
    } catch {
      setMessage({ type: 'error', text: 'Payment service error.' });
    }
  };

  const handleCryptoCheckout = async () => {
    if (!selectedPlan) return;
    try {
      const res = await fetch('/api/payments/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ planId: selectedPlan.id, currency: cryptoCurrency })
      });
      const data = await res.json();
      if (res.ok) setCryptoTx(data);
      else setMessage({ type: 'error', text: data.error || 'Crypto checkout failed.' });
    } catch {
      setMessage({ type: 'error', text: 'Crypto payment error.' });
    }
  };

  const handleGiftCard = async () => {
    if (!giftCode.trim()) { setMessage({ type: 'error', text: 'Enter a gift card code.' }); return; }
    try {
      const res = await fetch('/api/payments/gift-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ code: giftCode.trim() })
      });
      const data = await res.json();
      if (res.ok) { setMessage({ type: 'success', text: `Gift card redeemed! $${(data.value / 100).toFixed(2)} added to your account.` }); setGiftCode(''); fetchData(); }
      else setMessage({ type: 'error', text: data.error || 'Invalid gift card.' });
    } catch {
      setMessage({ type: 'error', text: 'Redemption failed.' });
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>Loading billing…</div>;
  }

  return (
    <div style={{ background: '#0a0a1a', minHeight: '100%', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Billing & Plans
        </h1>
        {subscription && (
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            Current plan: <span style={{ color: PLAN_COLORS[subscription.plan] || '#fff', fontWeight: 600, textTransform: 'capitalize' }}>{subscription.plan}</span>
            {subscription.balance > 0 && ` · Credit: $${(subscription.balance / 100).toFixed(2)}`}
          </div>
        )}
      </div>

      {message && (
        <div style={{ background: message.type === 'success' ? '#10b98122' : '#ef444422', color: message.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${message.type === 'success' ? '#10b98144' : '#ef444444'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#16213e', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'plans', label: 'Plans', icon: Star },
          { id: 'payment', label: 'Payment', icon: CreditCard },
          { id: 'history', label: 'History', icon: Shield }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{ flex: 1, background: tab === id ? '#1a1a2e' : 'transparent', color: tab === id ? '#fff' : '#888', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Plans tab */}
      {tab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map(plan => <PlanCard key={plan.id} plan={plan} current={subscription} onSelect={handleSelectPlan} />)}
        </div>
      )}

      {/* Payment tab */}
      {tab === 'payment' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Card payment */}
          <div style={{ background: '#16213e', borderRadius: 16, padding: 24, border: '1px solid #2d2d44' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} color="#6366f1" /> Credit / Debit Card
            </h3>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              Accepts Visa, Mastercard, Amex, Discover, Debit cards.
            </div>
            {selectedPlan ? (
              <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ color: '#888', fontSize: 12 }}>Selected plan</div>
                <div style={{ color: '#fff', fontWeight: 700, marginTop: 4 }}>{selectedPlan.name} — ${(selectedPlan.price / 100).toFixed(2)}/{selectedPlan.interval}</div>
              </div>
            ) : (
              <div style={{ color: '#666', fontSize: 13, marginBottom: 14 }}>Select a plan first.</div>
            )}
            <button
              onClick={handleCardCheckout}
              disabled={!selectedPlan}
              style={{ width: '100%', background: selectedPlan ? '#6366f1' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: selectedPlan ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <CreditCard size={15} />
              Pay with Card
              <ExternalLink size={12} style={{ opacity: 0.6 }} />
            </button>
          </div>

          {/* Crypto payment */}
          <div style={{ background: '#16213e', borderRadius: 16, padding: 24, border: '1px solid #2d2d44' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bitcoin size={18} color="#f59e0b" /> Cryptocurrency
            </h3>
            {!cryptoTx ? (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {CRYPTO_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCryptoCurrency(c.id)}
                      style={{ background: cryptoCurrency === c.id ? '#f59e0b22' : '#0a0a1a', color: cryptoCurrency === c.id ? '#f59e0b' : '#888', border: `1px solid ${cryptoCurrency === c.id ? '#f59e0b44' : '#333'}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <span>{c.icon}</span>{c.id}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCryptoCheckout}
                  disabled={!selectedPlan}
                  style={{ width: '100%', background: selectedPlan ? '#f59e0b' : '#1a1a2e', color: selectedPlan ? '#000' : '#666', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: selectedPlan ? 'pointer' : 'default' }}
                >
                  Pay with {cryptoCurrency}
                </button>
              </>
            ) : (
              <div>
                <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 14 }}>
                  <div style={{ color: '#888', fontSize: 12 }}>Send {cryptoTx.currency} to:</div>
                  <div style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 13, margin: '6px 0', wordBreak: 'break-all' }}>{cryptoTx.depositAddress}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>Amount: ${cryptoTx.amountUsd.toFixed(2)} USD</div>
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Expires: {new Date(cryptoTx.expiresAt).toLocaleTimeString()}</div>
                </div>
                <button onClick={() => setCryptoTx(null)} style={{ marginTop: 12, background: '#1a1a2e', color: '#888', border: '1px solid #444', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Gift card */}
          <div style={{ background: '#16213e', borderRadius: 16, padding: 24, border: '1px solid #2d2d44' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={18} color="#10b981" /> Gift Card
            </h3>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 14 }}>Redeem a gift card code to add credit to your account.</div>
            <input
              type="text"
              value={giftCode}
              onChange={e => setGiftCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXXXXXXXXXX"
              style={{ width: '100%', background: '#0a0a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'monospace', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <button
              onClick={handleGiftCard}
              style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Gift size={15} /> Redeem Code
            </button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      {tab === 'history' && (
        <div style={{ background: '#16213e', borderRadius: 16, padding: 20, border: '1px solid #2d2d44' }}>
          <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 15 }}>Transaction History</h3>
          {transactions.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: 32 }}>No transactions yet.</div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a2e' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{tx.method} · {tx.planId}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>{new Date(tx.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontWeight: 700 }}>${tx.amountUsd?.toFixed(2) || '—'}</div>
                  <div style={{ color: tx.status === 'completed' ? '#10b981' : tx.status === 'pending' ? '#f59e0b' : '#888', fontSize: 11, textTransform: 'capitalize' }}>{tx.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
