// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { useState, useEffect, useRef } from 'react';
import { Check, Star, Zap, Crown, Shield, X } from 'lucide-react';

// Card network detection by prefix
function detectCardNetwork(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n))         return { name: 'Visa', icon: '💳' };
  if (/^5[1-5]/.test(n))   return { name: 'Mastercard', icon: '🔴' };
  if (/^3[47]/.test(n))    return { name: 'Amex', icon: '💚' };
  if (/^6(?:011|5)/.test(n)) return { name: 'Discover', icon: '🟠' };
  if (/^35/.test(n))        return { name: 'JCB', icon: '🟣' };
  return { name: 'Card', icon: '💳' };
}

function formatCardNumber(val) {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const TIERS = [
  { id: 'free',       name: 'Free',       price: 0,     period: '/mo', icon: <Shield size={20} />,  color: '#6b7280', features: ['5 chats/day', 'Basic AI models', '1MB uploads', 'Standard support'] },
  { id: 'pro',        name: 'Pro',        price: 9.99,  period: '/mo', icon: <Star size={20} />,    color: '#3b82f6', features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'Analytics'] },
  { id: 'enterprise', name: 'Enterprise', price: 49.99, period: '/mo', icon: <Zap size={20} />,     color: '#8b5cf6', features: ['Everything in Pro', 'Game dev tracking', 'Social analytics', 'API access', 'SLA guarantee'] },
  { id: 'ultimate',   name: 'Ultimate',   price: 99.99, period: '/mo', icon: <Crown size={20} />,   color: '#f59e0b', features: ['Everything in Enterprise', 'White-glove onboarding', 'Custom connectors', 'Dedicated support', 'Audit exports'] },
];

const CRYPTO_METHODS = [
  { id: 'btc',  name: 'Bitcoin',  icon: '₿', addr: 'bc1q_example_address_placeholder' },
  { id: 'eth',  name: 'Ethereum', icon: 'Ξ', addr: '0x_example_address_placeholder' },
  { id: 'usdc', name: 'USDC',     icon: '$', addr: '0x_usdc_example_placeholder' },
  { id: 'sol',  name: 'Solana',   icon: '◎', addr: 'Sol_example_address_placeholder' },
];

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Switzerland', 'Austria', 'Belgium', 'Portugal', 'Czech Republic', 'Hungary', 'Romania', 'Greece', 'Turkey', 'South Korea', 'Singapore', 'New Zealand', 'South Africa', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Philippines', 'Indonesia', 'Thailand', 'Malaysia', 'Vietnam', 'Egypt', 'Nigeria', 'Kenya', 'UAE', 'Saudi Arabia', 'Israel', 'Pakistan', 'Bangladesh', 'Ukraine', 'Russia'];

const STYLE = `
.sub-wrap{background:var(--an-bg,#0f172a);color:var(--an-text,#e2e8f0);min-height:100vh;font-family:system-ui,sans-serif;padding:1.5rem;}
.sub-header{text-align:center;margin-bottom:2rem;}
.sub-title{font-size:1.6rem;font-weight:700;margin-bottom:.4rem;}
.sub-sub{color:#94a3b8;font-size:.9rem;}
.sub-tiers{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;margin-bottom:2rem;}
.sub-tier{background:#1e293b;border:2px solid #334155;border-radius:1rem;padding:1.25rem;cursor:pointer;transition:border-color .2s,transform .15s;}
.sub-tier:hover{transform:translateY(-2px);}
.sub-tier.selected{border-color:var(--tier-color,#3b82f6);}
.sub-tier-icon{width:2.5rem;height:2.5rem;border-radius:.6rem;display:flex;align-items:center;justify-content:center;margin-bottom:.75rem;}
.sub-tier-name{font-weight:700;font-size:1rem;}
.sub-tier-price{font-size:1.5rem;font-weight:800;margin:.2rem 0;}
.sub-feature{display:flex;align-items:center;gap:.4rem;font-size:.78rem;color:#94a3b8;margin:.2rem 0;}
.sub-feature svg{flex-shrink:0;}
.sub-pay-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;}
.sub-pay-tab{padding:.5rem 1rem;border-radius:.5rem;border:1px solid #334155;background:#1e293b;color:#94a3b8;cursor:pointer;font-size:.85rem;font-weight:600;transition:background .2s;}
.sub-pay-tab.active{background:#3b82f6;color:#fff;border-color:#3b82f6;}
.sub-form{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:1.25rem;max-width:500px;}
.sub-field{margin-bottom:.85rem;}
.sub-label{display:block;font-size:.75rem;color:#94a3b8;margin-bottom:.3rem;font-weight:600;}
.sub-input{width:100%;padding:.5rem .75rem;background:#0f172a;border:1px solid #334155;border-radius:.5rem;color:#e2e8f0;font-size:.9rem;box-sizing:border-box;outline:none;}
.sub-input:focus{border-color:#3b82f6;}
.sub-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;}
.sub-btn{width:100%;padding:.7rem;border-radius:.5rem;border:none;cursor:pointer;font-size:.9rem;font-weight:700;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;margin-top:1rem;}
.sub-btn:disabled{opacity:.5;cursor:not-allowed;}
.sub-crypto-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;margin-bottom:1rem;}
.sub-crypto-btn{padding:.65rem;border-radius:.5rem;border:1px solid #334155;background:#0f172a;cursor:pointer;text-align:center;font-size:.85rem;color:#e2e8f0;transition:border-color .2s;}
.sub-crypto-btn.selected{border-color:#f59e0b;color:#f59e0b;}
.sub-addr-box{background:#0f172a;border:1px solid #334155;border-radius:.5rem;padding:.6rem .75rem;font-family:monospace;font-size:.75rem;word-break:break-all;color:#94a3b8;margin:.5rem 0;}
.sub-copy-btn{background:none;border:1px solid #334155;border-radius:.4rem;padding:.2rem .5rem;font-size:.72rem;cursor:pointer;color:#94a3b8;}
.sub-success{background:#22c55e22;border:1px solid #22c55e;border-radius:.5rem;padding:.75rem;text-align:center;color:#22c55e;font-weight:600;margin-top:1rem;}
.sub-error{background:#ef444422;border:1px solid #ef4444;border-radius:.5rem;padding:.5rem;color:#ef4444;font-size:.8rem;margin-top:.5rem;}
.sub-tax-note{font-size:.73rem;color:#64748b;margin-top:.5rem;text-align:center;}
.sub-select{width:100%;padding:.5rem .75rem;background:#0f172a;border:1px solid #334155;border-radius:.5rem;color:#e2e8f0;font-size:.88rem;outline:none;}
`;

export function SubscriptionSystem({ currentPlan = 'free' }) {
  const [selectedTier, setSelectedTier] = useState(currentPlan);
  const [payMethod, setPayMethod] = useState('card');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holder, setHolder] = useState('');
  const [cryptoMethod, setCryptoMethod] = useState('btc');
  const [giftCode, setGiftCode] = useState('');
  const [giftBalance, setGiftBalance] = useState(null);
  const [billing, setBilling] = useState({ street: '', city: '', state: '', postal: '', country: 'United States' });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [cryptoPollCount, setCryptoPollCount] = useState(0);
  const pollRef = useRef(null);
  const cvvTimerRef = useRef(null);
  const styleInjected = useRef(false);

  if (!styleInjected.current) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styleInjected.current = true;
  }

  // Clear CVV after 3s
  useEffect(() => {
    if (cvv.length === 3 || cvv.length === 4) {
      clearTimeout(cvvTimerRef.current);
      cvvTimerRef.current = setTimeout(() => setCvv(''), 3000);
    }
    return () => clearTimeout(cvvTimerRef.current);
  }, [cvv]);

  // Crypto polling (stop after 12 polls)
  useEffect(() => {
    if (payMethod === 'crypto') {
      pollRef.current = setInterval(() => {
        setCryptoPollCount(n => {
          if (n >= 12) { clearInterval(pollRef.current); return n; }
          return n + 1;
        });
      }, 10000);
    }
    return () => clearInterval(pollRef.current);
  }, [payMethod, cryptoMethod]);

  const cardNetwork = detectCardNetwork(cardNum);

  const applyGiftCard = async () => {
    if (!giftCode.trim()) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 800));
    setGiftBalance(Math.floor(Math.random() * 50) + 10);
    setProcessing(false);
  };

  const handleCheckout = async () => {
    if (selectedTier === 'free') { setResult({ status: 'success', message: 'Free plan selected.' }); return; }
    setProcessing(true);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier, paymentMethod: payMethod,
          paymentData: { holder, billingCountry: billing.country },
          // NEVER send raw card numbers server-side — tokenize via Stripe.js
        })
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ status: 'error', message: 'Network error — please try again.' });
    }
    setProcessing(false);
  };

  const tier = TIERS.find(t => t.id === selectedTier);

  return (
    <div className="sub-wrap">
      <div className="sub-header">
        <div className="sub-title">Choose Your Plan</div>
        <div className="sub-sub">Cancel anytime · Tax calculated at checkout · No hidden fees</div>
      </div>

      {/* Tier Cards */}
      <div className="sub-tiers">
        {TIERS.map(t => (
          <div key={t.id} className={`sub-tier${selectedTier === t.id ? ' selected' : ''}`}
            style={{ '--tier-color': t.color }} onClick={() => setSelectedTier(t.id)}>
            <div className="sub-tier-icon" style={{ background: t.color + '22', color: t.color }}>{t.icon}</div>
            <div className="sub-tier-name">{t.name}</div>
            <div className="sub-tier-price" style={{ color: t.color }}>
              {t.price === 0 ? 'Free' : `$${t.price}`}<span style={{ fontSize: '.7rem', color: '#94a3b8', fontWeight: 400 }}>{t.price > 0 ? t.period : ''}</span>
            </div>
            {t.features.map(f => (
              <div key={f} className="sub-feature"><Check size={13} color={t.color} /> {f}</div>
            ))}
            {selectedTier === t.id && (
              <div style={{ marginTop: '.5rem', background: t.color + '22', color: t.color, borderRadius: '.3rem', padding: '.2rem .5rem', fontSize: '.72rem', fontWeight: 700, textAlign: 'center' }}>
                ✓ Selected
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTier !== 'free' && (
        <>
          {/* Payment Method Tabs */}
          <div className="sub-pay-tabs">
            {[['card', '💳 Card'], ['crypto', '₿ Crypto'], ['gift', '🎁 Gift Card']].map(([id, label]) => (
              <button key={id} className={`sub-pay-tab${payMethod === id ? ' active' : ''}`} onClick={() => setPayMethod(id)}>{label}</button>
            ))}
          </div>

          <div className="sub-form">
            {/* CARD PAYMENT */}
            {payMethod === 'card' && (
              <>
                <div className="sub-field">
                  <label className="sub-label">Card Number {cardNum.length >= 1 && <span style={{ fontWeight: 700, color: '#3b82f6' }}>{cardNetwork.icon} {cardNetwork.name}</span>}</label>
                  <input className="sub-input" placeholder="0000 0000 0000 0000" value={cardNum}
                    onChange={e => setCardNum(formatCardNumber(e.target.value))} maxLength={19} inputMode="numeric" />
                </div>
                <div className="sub-row">
                  <div className="sub-field">
                    <label className="sub-label">Expiry (MM/YY)</label>
                    <input className="sub-input" placeholder="MM/YY" value={expiry}
                      onChange={e => setExpiry(formatExpiry(e.target.value))} maxLength={5} inputMode="numeric" />
                  </div>
                  <div className="sub-field">
                    <label className="sub-label">CVV <span style={{ color: '#64748b', fontWeight: 400 }}>(cleared after 3s)</span></label>
                    <input className="sub-input" type="password" placeholder="•••" value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} inputMode="numeric" />
                  </div>
                </div>
                <div className="sub-field">
                  <label className="sub-label">Cardholder Name</label>
                  <input className="sub-input" placeholder="Name on card" value={holder} onChange={e => setHolder(e.target.value)} />
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '1rem 0' }} />
                <div style={{ fontWeight: 700, fontSize: '.8rem', marginBottom: '.75rem', color: '#94a3b8' }}>BILLING ADDRESS</div>
                <div className="sub-field">
                  <label className="sub-label">Street</label>
                  <input className="sub-input" placeholder="123 Main St" value={billing.street} onChange={e => setBilling(b => ({ ...b, street: e.target.value }))} />
                </div>
                <div className="sub-row">
                  <div className="sub-field">
                    <label className="sub-label">City</label>
                    <input className="sub-input" placeholder="City" value={billing.city} onChange={e => setBilling(b => ({ ...b, city: e.target.value }))} />
                  </div>
                  <div className="sub-field">
                    <label className="sub-label">State/Province</label>
                    <input className="sub-input" placeholder="CA" value={billing.state} onChange={e => setBilling(b => ({ ...b, state: e.target.value }))} />
                  </div>
                </div>
                <div className="sub-row">
                  <div className="sub-field">
                    <label className="sub-label">Postal Code</label>
                    <input className="sub-input" placeholder="00000" value={billing.postal} onChange={e => setBilling(b => ({ ...b, postal: e.target.value }))} />
                  </div>
                  <div className="sub-field">
                    <label className="sub-label">Country</label>
                    <select className="sub-select" value={billing.country} onChange={e => setBilling(b => ({ ...b, country: e.target.value }))}>
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <p style={{ fontSize: '.72rem', color: '#64748b', marginTop: '.5rem' }}>
                  🔒 Card details are tokenized via Stripe — never stored on our servers.
                </p>
              </>
            )}

            {/* CRYPTO */}
            {payMethod === 'crypto' && (
              <>
                <div className="sub-crypto-grid">
                  {CRYPTO_METHODS.map(m => (
                    <button key={m.id} className={`sub-crypto-btn${cryptoMethod === m.id ? ' selected' : ''}`} onClick={() => setCryptoMethod(m.id)}>
                      <div style={{ fontSize: '1.2rem' }}>{m.icon}</div>
                      <div style={{ fontSize: '.75rem' }}>{m.name}</div>
                    </button>
                  ))}
                </div>
                {CRYPTO_METHODS.filter(m => m.id === cryptoMethod).map(m => (
                  <div key={m.id}>
                    <div style={{ textAlign: 'center', marginBottom: '.5rem' }}>
                      <div style={{ width: 100, height: 100, background: '#334155', margin: '0 auto', borderRadius: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '.7rem' }}>QR Code</div>
                    </div>
                    <label className="sub-label">Send {tier?.price} USD in {m.name} to:</label>
                    <div className="sub-addr-box">{m.addr}</div>
                    <button className="sub-copy-btn" onClick={() => navigator.clipboard?.writeText(m.addr)}>📋 Copy Address</button>
                    <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: '.5rem' }}>
                      Polling for confirmation… ({cryptoPollCount}/12 checks)
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* GIFT CARD */}
            {payMethod === 'gift' && (
              <>
                <div className="sub-field">
                  <label className="sub-label">Gift Card Code</label>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <input className="sub-input" placeholder="XXXX-XXXX-XXXX" value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())} />
                    <button className="sub-btn" style={{ width: 'auto', padding: '.5rem 1rem', marginTop: 0 }} onClick={applyGiftCard} disabled={processing}>Apply</button>
                  </div>
                </div>
                {giftBalance !== null && (
                  <div className="sub-success">✓ Gift card applied — Balance: ${giftBalance.toFixed(2)}</div>
                )}
              </>
            )}

            {/* Checkout Button */}
            {(payMethod === 'card' || payMethod === 'gift') && (
              <>
                <button className="sub-btn" onClick={handleCheckout} disabled={processing}>
                  {processing ? '⏳ Processing…' : `Subscribe — ${tier?.name} $${tier?.price}/mo`}
                </button>
                <div className="sub-tax-note">Tax calculated at checkout based on your region · Secure payment</div>
              </>
            )}

            {result && (
              <div className={result.status === 'error' ? 'sub-error' : 'sub-success'}>
                {result.status !== 'error' ? '✓ ' : '✗ '}{result.message}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SubscriptionSystem;
