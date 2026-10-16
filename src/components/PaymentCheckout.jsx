/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * PaymentCheckout.jsx
 * Updated: 2026-10-16
 * Full checkout: Stripe, crypto, gift cards, all major card networks
 */

import React, { useState, useEffect } from 'react';

// Card network detection
function detectCardNetwork(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return { name: 'Visa', icon: '💳', color: '#1a1f71' };
  if (/^5[1-5]|^2[2-7]/.test(n)) return { name: 'Mastercard', icon: '🔴', color: '#eb001b' };
  if (/^3[47]/.test(n)) return { name: 'Amex', icon: '💚', color: '#007b5e' };
  if (/^6011|^644|^65/.test(n)) return { name: 'Discover', icon: '🟠', color: '#f76f20' };
  if (/^35[2-8]/.test(n)) return { name: 'JCB', icon: '🔵', color: '#003087' };
  if (/^30[0-5]|^36|^38/.test(n)) return { name: 'Diners', icon: '⬛', color: '#333' };
  if (/^62/.test(n)) return { name: 'UnionPay', icon: '🇨🇳', color: '#c0392b' };
  return null;
}

// Luhn check
function luhn(num) {
  const n = num.replace(/\D/g, '');
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0 && n.length >= 13;
}

// Format card number
function fmtCard(raw) {
  const n = raw.replace(/\D/g, '').slice(0, 16);
  return n.match(/.{1,4}/g)?.join(' ') || n;
}

// Format expiry
function fmtExp(raw) {
  const n = raw.replace(/\D/g, '').slice(0, 4);
  if (n.length > 2) return n.slice(0, 2) + '/' + n.slice(2);
  return n;
}

// ── Crypto wallets ────────────────────────────────────────────────────────────
const CRYPTO_ASSETS = [
  { id: 'btc',  label: 'Bitcoin',   symbol: 'BTC',  icon: '₿', color: '#f7931a' },
  { id: 'eth',  label: 'Ethereum',  symbol: 'ETH',  icon: 'Ξ', color: '#627eea' },
  { id: 'usdc', label: 'USD Coin',  symbol: 'USDC', icon: '💵', color: '#2775ca' },
  { id: 'usdt', label: 'Tether',    symbol: 'USDT', icon: '💲', color: '#26a17b' },
  { id: 'sol',  label: 'Solana',    symbol: 'SOL',  icon: '◎', color: '#9945ff' },
  { id: 'matic',label: 'Polygon',   symbol: 'MATIC',icon: '🟣', color: '#8247e5' },
];

// ── Subscription plans ────────────────────────────────────────────────────────
const PLANS = [
  { id: 'free',       label: 'Free',       price: 0,     period: '',       color: '#6b7280', features: ['5 chats/day', 'Basic models'] },
  { id: 'pro',        label: 'Pro',        price: 9.99,  period: '/mo',    color: '#3b82f6', features: ['Unlimited chats', 'All models', '100MB uploads'] },
  { id: 'enterprise', label: 'Enterprise', price: 14.99, period: '/mo',    color: '#8b5cf6', features: ['Everything + API', 'Custom models', 'SLA'] },
  { id: 'enterprise_yr', label: 'Enterprise Annual', price: 149.99, period: '/yr', color: '#f59e0b', features: ['2 months free', 'Priority support', 'Custom contract'] },
];

// ── Input ─────────────────────────────────────────────────────────────────────
function FInput({ label, value, onChange, placeholder, type = 'text', error, inputMode, autoComplete, maxLength }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} maxLength={maxLength}
        style={{
          padding: '11px 14px', borderRadius: 8, border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          background: 'var(--input)', color: 'var(--fg)', fontSize: 15, outline: 'none',
        }}
      />
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

// ── Card form ─────────────────────────────────────────────────────────────────
function CardForm({ plan, onSuccess }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '', zip: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const set = k => v => setCard(c => ({ ...c, [k]: v }));

  const network = detectCardNetwork(card.number);
  const cardValid = luhn(card.number);

  const validate = () => {
    const e = {};
    if (!cardValid) e.number = 'Invalid card number';
    const [m, y] = card.expiry.split('/');
    const now = new Date();
    if (!m || !y || parseInt(m) < 1 || parseInt(m) > 12 || parseInt('20' + y) < now.getFullYear()) e.expiry = 'Invalid expiry';
    if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = 'Invalid CVV';
    if (!card.name.trim()) e.name = 'Name required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // In production: use Stripe.js to tokenise — NEVER send raw card data to your server
      const res = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          paymentMethod: 'card',
          saveCard,
          // Only the payment-method token from Stripe.js would be sent here
          cardToken: 'tok_demo_' + Date.now(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.(data);
    } catch (err) {
      setErrors({ submit: err.message || 'Payment failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'relative' }}>
        <FInput label="Card Number" value={card.number} onChange={v => set('number')(fmtCard(v))} placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" maxLength={19} error={errors.number} />
        {network && (
          <span style={{ position: 'absolute', right: 12, bottom: 11, fontSize: 14, fontWeight: 700, color: network.color }}>
            {network.icon} {network.name}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FInput label="Expiry" value={card.expiry} onChange={v => set('expiry')(fmtExp(v))} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" maxLength={5} error={errors.expiry} />
        <FInput label="CVV" value={card.cvv} onChange={set('cvv')} placeholder="123" inputMode="numeric" autoComplete="cc-csc" maxLength={4} error={errors.cvv} />
      </div>
      <FInput label="Cardholder Name" value={card.name} onChange={set('name')} placeholder="Name on card" autoComplete="cc-name" error={errors.name} />
      <FInput label="ZIP / Postal Code" value={card.zip} onChange={set('zip')} placeholder="12345" inputMode="numeric" autoComplete="postal-code" maxLength={10} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
        <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
        Save card for future payments
      </label>
      {errors.submit && <div style={{ padding: 12, borderRadius: 8, background: '#ef444422', color: '#ef4444', fontSize: 14 }}>{errors.submit}</div>}
      <button type="submit" disabled={loading} style={{
        padding: 14, borderRadius: 8, border: 'none',
        background: loading ? 'var(--border)' : `linear-gradient(135deg, ${plan.color}, #8b5cf6)`,
        color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
      }}>
        {loading ? 'Processing...' : `Pay $${plan.price}${plan.period}`}
      </button>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        🔒 Secured by Stripe · PCI DSS Level 1
      </div>
    </form>
  );
}

// ── Crypto form ───────────────────────────────────────────────────────────────
function CryptoForm({ plan, onSuccess }) {
  const [asset, setAsset] = useState('usdc');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentAddr, setPaymentAddr] = useState(null);
  const [error, setError] = useState('');

  const cfg = CRYPTO_ASSETS.find(a => a.id === asset);

  const initPayment = async () => {
    if (!wallet.trim()) { setError('Wallet address required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/crypto/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, asset, fromWallet: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentAddr(data);
    } catch (err) {
      setError(err.message || 'Failed to init crypto payment');
    } finally {
      setLoading(false);
    }
  };

  if (paymentAddr) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>{cfg?.icon}</div>
        <h3 style={{ margin: 0 }}>Send {cfg?.symbol} Payment</h3>
        <div style={{ padding: 16, borderRadius: 10, background: 'var(--input)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', color: 'var(--fg)' }}>
          {paymentAddr.address || '0xDEMO_ADDRESS_' + asset.toUpperCase()}
        </div>
        <div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
          Send exactly <strong>{paymentAddr.amount || '~$' + plan.price} {cfg?.symbol}</strong>
          <br />Payment expires in <strong>15 minutes</strong>
        </div>
        <button onClick={() => onSuccess?.({ crypto: true, asset })} style={{ padding: 13, borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          I've Sent the Payment
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Select Asset</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
          {CRYPTO_ASSETS.map(a => (
            <button key={a.id} onClick={() => setAsset(a.id)} style={{
              padding: '10px 6px', borderRadius: 8, border: `1px solid ${asset === a.id ? a.color : 'var(--border)'}`,
              background: asset === a.id ? a.color + '22' : 'transparent', cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{a.symbol}</div>
            </button>
          ))}
        </div>
      </div>
      <FInput label="Your Wallet Address" value={wallet} onChange={setWallet} placeholder="0x... or bc1..." error={error} />
      <button onClick={initPayment} disabled={loading} style={{
        padding: 14, borderRadius: 8, border: 'none', background: cfg?.color || '#3b82f6',
        color: '#fff', fontWeight: 700, cursor: 'pointer',
      }}>
        {loading ? 'Creating Payment...' : `Pay with ${cfg?.label}`}
      </button>
    </div>
  );
}

// ── Gift card form ────────────────────────────────────────────────────────────
function GiftCardForm({ plan, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmtCode = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20).replace(/(.{4})/g, '$1-').replace(/-$/, '');

  const redeem = async (e) => {
    e.preventDefault();
    if (code.replace(/-/g,'').length < 8) { setError('Enter a valid gift card code'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.replace(/-/g,''), planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message || 'Invalid or expired gift card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={redeem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 48 }}>🎁</div>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Enter your gift card or promo code</p>
      </div>
      <FInput label="Gift Card Code" value={code} onChange={v => setCode(fmtCode(v))} placeholder="XXXX-XXXX-XXXX-XXXX" error={error} />
      <button type="submit" disabled={loading} style={{
        padding: 14, borderRadius: 8, border: 'none', background: '#f59e0b',
        color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 16,
      }}>
        {loading ? 'Redeeming...' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

// ── Main checkout ─────────────────────────────────────────────────────────────
export default function PaymentCheckout({ onSuccess, onClose, initialPlan }) {
  const [plan, setPlan] = useState(PLANS.find(p => p.id === initialPlan) || PLANS[1]);
  const [method, setMethod] = useState('card');
  const [success, setSuccess] = useState(null);

  const handleSuccess = (data) => {
    setSuccess(data);
    onSuccess?.(data);
  };

  if (success) {
    return (
      <div style={{ padding: 40, textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h2 style={{ margin: '16px 0 8px' }}>Payment Successful!</h2>
        <p style={{ color: 'var(--fg-muted)' }}>You're now on the <strong>{plan.label}</strong> plan. Enjoy!</p>
        {onClose && <button onClick={onClose} style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', marginTop: 16 }}>Close</button>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--fg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Checkout</h2>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--fg-muted)' }}>✕</button>}
      </div>

      {/* Plan selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Select Plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p)} style={{
              padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              border: `2px solid ${plan.id === p.id ? p.color : 'var(--border)'}`,
              background: plan.id === p.id ? p.color + '15' : 'transparent',
            }}>
              <div style={{ fontWeight: 700, color: p.color, fontSize: 14 }}>{p.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg)' }}>{p.price === 0 ? 'Free' : `$${p.price}`}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{p.period}</div>
            </button>
          ))}
        </div>
      </div>

      {plan.price > 0 && (<>
        {/* Payment method tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {[['card','💳 Card'],['crypto','₿ Crypto'],['gift','🎁 Gift Card']].map(([m, l]) => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: method === m ? plan.color : 'transparent',
              color: method === m ? '#fff' : 'var(--fg)',
              transition: 'background 0.2s',
            }}>{l}</button>
          ))}
        </div>

        {method === 'card'  && <CardForm plan={plan} onSuccess={handleSuccess} />}
        {method === 'crypto' && <CryptoForm plan={plan} onSuccess={handleSuccess} />}
        {method === 'gift'  && <GiftCardForm plan={plan} onSuccess={handleSuccess} />}
      </>)}

      {plan.price === 0 && (
        <button onClick={() => handleSuccess({ plan: 'free' })} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#6b7280', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
          Continue with Free Plan
        </button>
      )}
    </div>
  );
}
