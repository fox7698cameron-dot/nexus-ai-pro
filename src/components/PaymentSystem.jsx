/**
 * PaymentSystem.jsx
 * Nexus AI Pro — Subscription & Payment UI
 * Stripe, crypto, gift cards; Visa/MC/Amex/Discover support
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Plan definitions (prices fetched from API; these are display-only) ────────
const PLAN_DISPLAY = {
  free:       { name: 'Free',       badge: '🆓', color: '#718096', features: ['5 chats/day', 'Basic AI models', '1 MB uploads', 'Community support'] },
  pro:        { name: 'Pro',        badge: '⭐', color: '#3182ce', features: ['Unlimited chats', 'All AI models', '100 MB uploads', 'Priority support', 'Analytics dashboard'] },
  enterprise: { name: 'Enterprise', badge: '🏢', color: '#805ad5', features: ['Everything in Pro', 'Custom integrations', '10 GB uploads', 'SLA guarantee', 'Dedicated manager', 'Game dev connectors'] },
};

// ── Card type detection ───────────────────────────────────────────────────────
/** @param {string} num */
function detectCardType(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n))               return 'visa';
  if (/^5[1-5]/.test(n))         return 'mastercard';
  if (/^3[47]/.test(n))          return 'amex';
  if (/^6(?:011|5)/.test(n))     return 'discover';
  return null;
}

const CARD_ICONS = { visa: '💳 Visa', mastercard: '💳 MC', amex: '💳 Amex', discover: '💳 Discover' };

// ── Luhn check display ────────────────────────────────────────────────────────
function luhn(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
}

// ── Format card number ────────────────────────────────────────────────────────
function formatCard(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

// ── Components ────────────────────────────────────────────────────────────────
function PlanCard({ planId, plan, price, currentPlan, onSelect, selected }) {
  const isActive = currentPlan === planId;
  return (
    <div className={`plan-card${selected === planId ? ' plan-selected' : ''}${isActive ? ' plan-active' : ''}`}
      style={{ borderColor: selected === planId ? plan.color : undefined }}
      onClick={() => !isActive && onSelect(planId)}
    >
      <div className="plan-header">
        <span className="plan-badge">{plan.badge}</span>
        <span className="plan-name">{plan.name}</span>
        {isActive && <span className="plan-current-tag">Current</span>}
      </div>
      <div className="plan-price">{price ?? '—'}<span className="plan-period">/mo</span></div>
      <ul className="plan-features">
        {plan.features.map(f => <li key={f}>✓ {f}</li>)}
      </ul>
      {!isActive && (
        <button className="plan-select-btn" style={{ background: plan.color }} onClick={() => onSelect(planId)}>
          {selected === planId ? '✓ Selected' : 'Select'}
        </button>
      )}
    </div>
  );
}

function CardPaymentForm({ onSubmit, loading }) {
  const [card, setCard]   = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [valid, setValid] = useState(null);
  const cardType = detectCardType(card.number);

  const setField = (k, v) => setCard(f => ({ ...f, [k]: v }));

  const checkValid = (num) => {
    const clean = num.replace(/\s/g, '');
    if (clean.length === 16) setValid(luhn(clean));
  };

  const handleCardNum = (e) => {
    const fmt = formatCard(e.target.value);
    setField('number', fmt);
    checkValid(fmt);
  };

  const handleExpiry = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    setField('expiry', v);
  };

  const submit = (e) => {
    e.preventDefault();
    // NOTE: In production this MUST go through Stripe Elements
    // Never send raw card data to your own server
    onSubmit({ method: 'card', cardType });
  };

  return (
    <form className="card-form" onSubmit={submit}>
      {/* Stripe Elements would inject here in production */}
      {/* <!-- stripe.elements().create('card') mounts here --> */}
      <label>Cardholder Name
        <input required value={card.name} onChange={e => setField('name', e.target.value)} autoComplete="cc-name" placeholder="Cameron Fox" />
      </label>
      <label>Card Number
        <div className="card-num-wrap">
          <input required value={card.number} onChange={handleCardNum} inputMode="numeric"
            autoComplete="cc-number" placeholder="1234 5678 9012 3456" maxLength={19} />
          {cardType && <span className="card-type-badge">{CARD_ICONS[cardType]}</span>}
          {valid === true  && <span className="card-valid">✓</span>}
          {valid === false && <span className="card-invalid">✗ Invalid</span>}
        </div>
      </label>
      <div className="card-row">
        <label>Expiry
          <input required value={card.expiry} onChange={handleExpiry} inputMode="numeric"
            autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} />
        </label>
        <label>CVV
          <input required value={card.cvv} onChange={e => setField('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} type="password" />
        </label>
      </div>
      <button type="submit" className="pay-btn" disabled={loading}>
        {loading ? 'Processing…' : '🔒 Pay Securely'}
      </button>
    </form>
  );
}

function CryptoPaymentForm({ plan }) {
  // Wallet addresses served from env — never hardcoded
  const [wallets, setWallets] = useState(null);

  useEffect(() => {
    fetch('/api/payments/crypto/wallets')
      .then(r => r.json())
      .then(setWallets)
      .catch(() => {});
  }, []);

  return (
    <div className="crypto-form">
      <p className="crypto-note">Send the exact amount to one of the addresses below. Payment is verified automatically.</p>
      {wallets ? ['BTC', 'ETH', 'USDC'].map(coin => (
        <div key={coin} className="crypto-row">
          <span className="crypto-coin">{coin}</span>
          <div className="qr-stub" title="QR code generated server-side">[ QR ]</div>
          <code className="crypto-addr">{wallets[coin] ?? '—'}</code>
        </div>
      )) : <p style={{ color: 'var(--muted)' }}>Loading wallet addresses…</p>}
    </div>
  );
}

function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ method: 'giftcard', code });
  };

  return (
    <form className="gift-form" onSubmit={submit}>
      <label>Gift Card Code
        <input required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={24} />
      </label>
      <button type="submit" className="pay-btn" disabled={loading || code.length < 8}>
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
/** @param {{ authToken: string }} props */
export default function PaymentSystem({ authToken }) {
  const [plans,       setPlans]       = useState({});
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selectedPlan,setSelectedPlan]= useState(null);
  const [payMethod,   setPayMethod]   = useState('card');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [usage,       setUsage]       = useState(null);

  const hdrs = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    Promise.all([
      fetch('/api/payments/plans', { headers: hdrs }).then(r => r.json()),
      fetch('/api/payments/subscription', { headers: hdrs }).then(r => r.json()),
    ]).then(([p, s]) => {
      setPlans(p);
      setCurrentPlan(s.plan ?? 'free');
      setUsage(s.usage ?? null);
    }).catch(() => {});
  }, [authToken]);

  const handleCheckout = async (paymentDetails) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ plan: selectedPlan, ...paymentDetails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payment failed');
      if (data.url) { window.location.href = data.url; return; } // Stripe redirect
      setSuccess('Payment successful! Your plan has been upgraded.');
      setCurrentPlan(selectedPlan);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleGiftCard = async ({ code }) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invalid gift card');
      setSuccess('Gift card redeemed! Credit applied to your account.');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will keep Pro features until the end of the billing period.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/subscription/cancel', { method: 'POST', headers: hdrs });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess('Subscription cancelled. You will retain access until ' + d.endsAt);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="payment-root">
      <style>{PAYMENT_CSS}</style>
      <div className="payment-layout">
        {/* Left: Plans + Payment */}
        <div className="payment-main">
          <h2>Choose Your Plan</h2>

          {error   && <div className="pay-error">⚠ {error}</div>}
          {success && <div className="pay-success">✓ {success}</div>}

          <div className="plans-grid">
            {Object.entries(PLAN_DISPLAY).map(([id, plan]) => (
              <PlanCard key={id} planId={id} plan={plan}
                price={plans[id]?.price ?? (id === 'free' ? '$0' : id === 'pro' ? '$9.99' : '$49.99')}
                currentPlan={currentPlan}
                selected={selectedPlan}
                onSelect={setSelectedPlan} />
            ))}
          </div>

          {selectedPlan && selectedPlan !== currentPlan && (
            <div className="payment-form-section">
              <h3>Payment Method</h3>
              <div className="pay-method-tabs">
                {[['card','💳 Card'],['crypto','₿ Crypto'],['giftcard','🎁 Gift Card']].map(([id, label]) => (
                  <button key={id} className={`pay-method-tab${payMethod === id ? ' active' : ''}`}
                    onClick={() => setPayMethod(id)}>{label}</button>
                ))}
              </div>
              {payMethod === 'card'     && <CardPaymentForm onSubmit={handleCheckout} loading={loading} />}
              {payMethod === 'crypto'   && <CryptoPaymentForm plan={selectedPlan} />}
              {payMethod === 'giftcard' && <GiftCardForm onSubmit={handleGiftCard} loading={loading} />}
            </div>
          )}

          {currentPlan !== 'free' && (
            <div className="cancel-section">
              <button className="cancel-link" onClick={handleCancel} disabled={loading}>
                Cancel subscription
              </button>
            </div>
          )}
        </div>

        {/* Right: Order summary */}
        {selectedPlan && selectedPlan !== currentPlan && (
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>{PLAN_DISPLAY[selectedPlan]?.name} Plan</span>
              <span>{plans[selectedPlan]?.price ?? '—'}/mo</span>
            </div>
            {currentPlan !== 'free' && (
              <div className="summary-row proration">
                <span>Proration credit</span>
                <span style={{ color: '#48bb78' }}>-{plans[currentPlan]?.proratedCredit ?? '—'}</span>
              </div>
            )}
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Due today</span>
              <span>{plans[selectedPlan]?.price ?? '—'}</span>
            </div>
            {usage && (
              <div className="usage-section">
                <h4>Current Usage</h4>
                {Object.entries(usage).map(([k, v]) => (
                  <div key={k} className="usage-row">
                    <span>{k}</span>
                    <div className="usage-bar-wrap"><div className="usage-bar-fill" style={{ width: `${v}%` }} /></div>
                    <span>{v}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PAYMENT_CSS = `
:root{--bg:#0f1117;--surface:#1a1d27;--border:#2a2d3a;--text:#e2e8f0;--muted:#718096;--radius:10px;}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#f7f8fc;--surface:#fff;--border:#e2e8f0;--text:#1a202c;--muted:#4a5568;}}
.payment-root{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;padding:16px;min-height:100vh;}
.payment-layout{display:flex;gap:24px;flex-wrap:wrap;}
.payment-main{flex:1;min-width:280px;}
.payment-main h2{margin:0 0 20px;font-size:1.4rem;}
.pay-error{background:rgba(245,101,101,.15);color:#fc8181;border:1px solid #fc8181;border-radius:var(--radius);padding:10px;margin-bottom:12px;}
.pay-success{background:rgba(72,187,120,.15);color:#48bb78;border:1px solid #48bb78;border-radius:var(--radius);padding:10px;margin-bottom:12px;}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:24px;}
.plan-card{background:var(--surface);border:2px solid var(--border);border-radius:var(--radius);padding:18px;cursor:pointer;transition:border-color .2s,box-shadow .2s;}
.plan-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.3);}
.plan-selected{box-shadow:0 0 0 2px #3182ce;}
.plan-active{border-style:dashed;}
.plan-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.plan-badge{font-size:1.2rem;}
.plan-name{font-weight:700;font-size:1rem;}
.plan-current-tag{margin-left:auto;font-size:.7rem;background:rgba(72,187,120,.2);color:#48bb78;border-radius:9999px;padding:1px 8px;}
.plan-price{font-size:1.8rem;font-weight:700;margin-bottom:10px;}
.plan-period{font-size:.9rem;color:var(--muted);font-weight:400;}
.plan-features{list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:5px;font-size:.85rem;color:var(--muted);}
.plan-select-btn{width:100%;border:none;color:#fff;border-radius:8px;padding:8px;cursor:pointer;font-weight:600;}
.payment-form-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:20px;}
.pay-method-tabs{display:flex;gap:4px;margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:12px;}
.pay-method-tab{background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:7px 16px;cursor:pointer;font-size:.88rem;}
.pay-method-tab.active{background:#3182ce;color:#fff;border-color:#3182ce;}
.card-form,.gift-form,.crypto-form{display:flex;flex-direction:column;gap:14px;}
.card-form label,.gift-form label{display:flex;flex-direction:column;gap:4px;font-size:.88rem;color:var(--muted);}
.card-form input,.gift-form input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;font-size:.95rem;}
.card-num-wrap{position:relative;display:flex;align-items:center;}
.card-num-wrap input{flex:1;padding-right:120px;}
.card-type-badge{position:absolute;right:70px;font-size:.75rem;color:var(--muted);}
.card-valid{position:absolute;right:8px;color:#48bb78;}
.card-invalid{position:absolute;right:8px;color:#f56565;font-size:.75rem;}
.card-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.pay-btn{background:#3182ce;color:#fff;border:none;border-radius:8px;padding:12px;font-size:1rem;cursor:pointer;font-weight:600;}
.pay-btn:hover:not(:disabled){background:#2b6cb0;}
.pay-btn:disabled{opacity:.6;cursor:not-allowed;}
.crypto-note{color:var(--muted);font-size:.85rem;margin:0 0 12px;}
.crypto-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
.crypto-coin{font-weight:700;width:48px;}
.qr-stub{background:var(--border);width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:.7rem;color:var(--muted);}
.crypto-addr{font-size:.7rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--bg);padding:4px 8px;border-radius:4px;}
.order-summary{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;width:260px;align-self:flex-start;}
.order-summary h3{margin:0 0 16px;}
.summary-row{display:flex;justify-content:space-between;font-size:.9rem;padding:6px 0;}
.summary-row.proration{color:var(--muted);}
.summary-row.total{font-weight:700;font-size:1rem;}
.summary-divider{border-top:1px solid var(--border);margin:8px 0;}
.usage-section{margin-top:16px;}
.usage-section h4{font-size:.85rem;color:var(--muted);margin:0 0 10px;}
.usage-row{display:flex;align-items:center;gap:8px;font-size:.8rem;margin-bottom:6px;}
.usage-row span:first-child{width:80px;color:var(--muted);}
.usage-bar-wrap{flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;}
.usage-bar-fill{height:100%;background:#3182ce;border-radius:3px;}
.cancel-section{text-align:right;margin-top:8px;}
.cancel-link{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.85rem;text-decoration:underline;}
`;
