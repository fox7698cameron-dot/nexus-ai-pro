/**
 * PaymentSystem.jsx
 * Subscription & payment UI — Stripe, crypto, gift cards
 * All major credit/debit cards · Amex · Visa · Mastercard · Discover
 * Crypto: BTC, ETH, USDC, USDT, SOL
 * Updated: 2026-07-21
 */
import React, { useState, useCallback } from 'react';

const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', period: '/month', badge: '🆓',
    color: '#6b7280', features: ['5 chats/day', 'Basic AI models', '1MB file uploads', 'Standard support']
  },
  {
    id: 'pro', name: 'Pro', price: '$9.99', period: '/month', badge: '⭐', popular: true,
    color: '#3b82f6', features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'API access']
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$14.99', period: '/month', badge: '👑',
    color: '#7c3aed', features: ['Everything in Pro', 'Custom models', 'Dedicated support', 'SLA guarantee', 'Team management']
  }
];

const CRYPTO = [
  { id: 'BTC', name: 'Bitcoin', emoji: '₿', network: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum', emoji: '⟠', network: 'Ethereum' },
  { id: 'USDC', name: 'USD Coin', emoji: '💵', network: 'Ethereum / Solana' },
  { id: 'USDT', name: 'Tether', emoji: '💰', network: 'Ethereum / Tron' },
  { id: 'SOL', name: 'Solana', emoji: '◎', network: 'Solana' },
];

const CARD_NETWORKS = [
  { name: 'Visa', emoji: '💳' },
  { name: 'Mastercard', emoji: '💳' },
  { name: 'American Express', emoji: '💳' },
  { name: 'Discover', emoji: '💳' },
  { name: 'JCB', emoji: '💳' },
  { name: 'Diners Club', emoji: '💳' },
  { name: 'UnionPay', emoji: '💳' },
];

function PlanCard({ plan, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(plan.id)}
      style={{
        border: `2px solid ${selected ? plan.color : 'var(--border)'}`,
        borderRadius: 14, padding: 20, cursor: 'pointer', flex: '1 1 200px',
        background: selected ? plan.color + '11' : 'var(--card-bg)',
        transition: 'all 0.2s', position: 'relative'
      }}
    >
      {plan.popular && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: plan.color, color: '#fff', borderRadius: 20, padding: '2px 14px', fontSize: 12, fontWeight: 700 }}>
          Most Popular
        </div>
      )}
      <div style={{ fontSize: 22, marginBottom: 6 }}>{plan.badge}</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 2 }}>{plan.name}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: plan.color }}>
        {plan.price}
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{plan.period}</span>
      </div>
      <ul style={{ paddingLeft: 18, margin: '12px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        {plan.features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}

function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const formatCardNumber = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return digits;
  };

  const field = (k, formatter) => ({
    value: card[k],
    onChange: e => setCard(c => ({ ...c, [k]: formatter ? formatter(e.target.value) : e.target.value }))
  });

  const handleSubmit = () => {
    const digits = card.number.replace(/\s/g, '');
    if (digits.length < 13 || digits.length > 19) return;
    onSubmit({ type: 'card', last4: digits.slice(-4), expiry: card.expiry });
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box'
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Card Number
        </label>
        <input {...field('number', formatCardNumber)} placeholder="1234 5678 9012 3456"
          autoComplete="cc-number" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Expiry
          </label>
          <input {...field('expiry', formatExpiry)} placeholder="MM/YY" autoComplete="cc-exp" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            CVV
          </label>
          <input {...field('cvv')} placeholder="123" maxLength={4} type="password" autoComplete="cc-csc" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Cardholder Name
        </label>
        <input {...field('name')} placeholder="Full name" autoComplete="cc-name" style={inputStyle} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CARD_NETWORKS.map(n => (
          <span key={n.name} style={{ fontSize: 13 }} title={n.name}>{n.emoji} {n.name}</span>
        ))}
      </div>
      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer', background: '#3b82f6', color: '#fff',
          fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Processing...' : '🔒 Pay Securely'}
      </button>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        Payments processed by Stripe. Card data never touches our servers.
      </div>
    </div>
  );
}

function CryptoForm({ onSubmit, loading }) {
  const [selected, setSelected] = useState('ETH');
  const [txHash, setTxHash] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CRYPTO.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            style={{
              padding: '8px 14px', borderRadius: 10, border: `2px solid ${selected === c.id ? '#f59e0b' : 'var(--border)'}`,
              cursor: 'pointer', background: selected === c.id ? '#fef9c3' : 'var(--card-bg)',
              color: selected === c.id ? '#92400e' : 'var(--text)', fontSize: 14, fontWeight: selected === c.id ? 700 : 400
            }}>
            <div style={{ fontSize: 20 }}>{c.emoji}</div>
            <div style={{ fontSize: 12 }}>{c.id}</div>
          </button>
        ))}
      </div>
      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Send to {selected} address:</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
          [Wallet address configured in payment settings]
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Network: {CRYPTO.find(c => c.id === selected)?.network}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Transaction Hash
        </label>
        <input value={txHash} onChange={e => setTxHash(e.target.value)}
          placeholder="0x... or transaction ID"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }} />
      </div>
      <button onClick={() => onSubmit({ type: 'crypto', currency: selected, txHash })} disabled={loading || !txHash}
        style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
          cursor: loading || !txHash ? 'not-allowed' : 'pointer', background: '#f59e0b', color: '#fff',
          fontWeight: 700, fontSize: 15, opacity: loading || !txHash ? 0.7 : 1 }}>
        {loading ? 'Verifying...' : 'Submit Crypto Payment'}
      </button>
    </div>
  );
}

function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const formatCode = (v) => v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 20);
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        Enter your Nexus AI Pro gift card code to apply credit to your account.
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Gift Card Code
        </label>
        <input value={code} onChange={e => setCode(formatCode(e.target.value))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card-bg)', color: 'var(--text)', fontSize: 16, letterSpacing: 2,
            fontFamily: 'monospace', boxSizing: 'border-box' }} />
      </div>
      <button onClick={() => onSubmit({ type: 'giftcard', code })} disabled={loading || code.length < 8}
        style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
          cursor: loading || code.length < 8 ? 'not-allowed' : 'pointer', background: '#22c55e', color: '#fff',
          fontWeight: 700, fontSize: 15, opacity: loading || code.length < 8 ? 0.7 : 1 }}>
        {loading ? 'Redeeming...' : '🎁 Redeem Gift Card'}
      </button>
    </div>
  );
}

export default function PaymentSystem({ authToken, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  }), [authToken]);

  const handlePayment = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/api/payments/create-intent';
      let body = { planId: selectedPlan, amount: selectedPlan === 'pro' ? 999 : 1499, currency: 'usd', ...data };

      if (data.type === 'crypto') {
        endpoint = '/api/payments/crypto/verify';
        body = { txHash: data.txHash, network: data.currency, expectedAmount: selectedPlan === 'pro' ? 9.99 : 14.99 };
      } else if (data.type === 'giftcard') {
        endpoint = '/api/payments/giftcard/redeem';
        body = { code: data.code };
      }

      const res = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Payment failed');
      setSuccess(result);
      if (onSuccess) onSuccess(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, headers, onSuccess]);

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #111)' }}>
        <style>{`
          :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
          @media (prefers-color-scheme: dark) { :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; } }
          :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
          :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        `}</style>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: '0 0 8px' }}>Payment Received!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {success.status === 'pending_verification'
            ? 'Your crypto payment is being verified. Account will be upgraded shortly.'
            : success.status === 'verified'
            ? 'Gift card applied successfully!'
            : 'Your subscription is now active.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #111)' }}>
      <style>{`
        :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        @media (prefers-color-scheme: dark) { :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; } }
        :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
      `}</style>

      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Choose Your Plan</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        All plans include military-grade encryption. Cancel anytime.
      </p>

      {/* Plan selector */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {PLANS.map(plan => (
          <PlanCard key={plan.id} plan={plan} selected={selectedPlan === plan.id} onSelect={setSelectedPlan} />
        ))}
      </div>

      {selectedPlan !== 'free' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
            Payment Method
          </h3>

          {/* Method tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[
              { id: 'card', label: '💳 Card', },
              { id: 'crypto', label: '⟠ Crypto' },
              { id: 'giftcard', label: '🎁 Gift Card' }
            ].map(m => (
              <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                  background: paymentMethod === m.id ? '#0f172a' : 'var(--card-bg)',
                  color: paymentMethod === m.id ? '#fff' : 'var(--text)', fontSize: 14, fontWeight: paymentMethod === m.id ? 600 : 400
                }}>
                {m.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {paymentMethod === 'card' && <CardForm onSubmit={handlePayment} loading={loading} />}
          {paymentMethod === 'crypto' && <CryptoForm onSubmit={handlePayment} loading={loading} />}
          {paymentMethod === 'giftcard' && <GiftCardForm onSubmit={handlePayment} loading={loading} />}
        </div>
      )}

      {selectedPlan === 'free' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🆓</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Free Plan Selected</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No payment required. You can upgrade anytime.</div>
        </div>
      )}
    </div>
  );
}
