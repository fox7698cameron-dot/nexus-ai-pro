// src/components/CheckoutDashboard.jsx
// Subscription & Payment: Stripe, Crypto, Gift Cards — Multi-Platform
// Updated: 2026-10-13

import React, { useState } from 'react';
import { Lock, CreditCard, Check, X, Gift, Bitcoin, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    features: ['5 AI requests/day', 'Basic encryption', 'Web access', 'Community support'],
    color: '#6b7280'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 19, annual: 190 },
    features: ['Unlimited AI requests', 'Military-grade encryption', 'All platforms', 'Analytics dashboard', 'Priority support'],
    color: '#6366f1',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 99, annual: 990 },
    features: ['Everything in Pro', 'Custom connectors', 'SSO & SAML', 'SLA 99.99%', 'Dedicated support', 'On-premise option'],
    color: '#f59e0b'
  }
];

const PAYMENT_METHODS = {
  card: {
    label: 'Credit / Debit Card',
    icon: CreditCard,
    networks: ['visa', 'mastercard', 'amex', 'discover', 'unionpay'],
    description: 'Visa, Mastercard, American Express, Discover'
  },
  crypto: {
    label: 'Cryptocurrency',
    icon: Bitcoin,
    networks: ['btc', 'eth', 'usdc', 'usdt', 'sol'],
    description: 'Bitcoin, Ethereum, USDC, USDT, Solana'
  },
  gift: {
    label: 'Gift Card',
    icon: Gift,
    description: 'Enter your gift card or promo code'
  }
};

const CARD_NETWORK_ICONS = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  unionpay: '💳'
};

function CardNumberInput({ value, onChange }) {
  const formatted = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  return (
    <div style={{ position: 'relative' }}>
      <CreditCard size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
      <input
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={e => onChange(e.target.value.replace(/\s/g, ''))}
        placeholder="0000 0000 0000 0000"
        maxLength={19}
        autoComplete="cc-number"
        style={{ ...inputStyle, paddingLeft: 32 }}
      />
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8, padding: '8px 12px',
  color: '#fff', fontSize: 13, outline: 'none'
};

function CardForm() {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  const handleExpiry = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Cardholder Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full name on card"
          autoComplete="cc-name"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Card Number</label>
        <CardNumberInput value={number} onChange={setNumber} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Expiry</label>
          <input
            type="text"
            value={expiry}
            onChange={e => handleExpiry(e.target.value)}
            placeholder="MM/YY"
            maxLength={5}
            autoComplete="cc-exp"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>CVV</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCvv ? 'text' : 'password'}
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="•••"
              maxLength={4}
              autoComplete="cc-csc"
              style={{ ...inputStyle, paddingRight: 32 }}
            />
            <button
              type="button"
              onClick={() => setShowCvv(v => !v)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0 }}
            >
              {showCvv ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PAYMENT_METHODS.card.networks.map(n => (
          <span key={n} style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 8px', color: '#888' }}>
            {n.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function CryptoForm() {
  const [selected, setSelected] = useState('btc');
  const [address] = useState('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
  const amounts = { btc: '0.00028 BTC', eth: '0.0062 ETH', usdc: '$19.00 USDC', usdt: '$19.00 USDT', sol: '0.31 SOL' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PAYMENT_METHODS.crypto.networks.map(c => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            style={{
              background: selected === c ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${selected === c ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
              color: selected === c ? '#818cf8' : '#888', fontSize: 12
            }}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Send exactly</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{amounts[selected]}</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8, marginBottom: 4 }}>To address</div>
        <div style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '6px 10px', wordBreak: 'break-all', color: '#aaa', fontFamily: 'monospace' }}>
          {address}
        </div>
      </div>
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 8, fontSize: 11, color: '#d97706' }}>
        Payment is confirmed after 2 network confirmations (typically 10-30 minutes).
      </div>
    </div>
  );
}

function GiftCardForm() {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const formatted = code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 16).replace(/(.{4})/g, '$1-').replace(/-$/, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Gift Card / Promo Code</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={formatted}
            onChange={e => setCode(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', letterSpacing: 2 }}
          />
          <button
            onClick={() => setApplied(true)}
            style={{
              background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#818cf8', fontSize: 12, whiteSpace: 'nowrap'
            }}
          >
            Apply
          </button>
        </div>
      </div>
      {applied && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: 12, background: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: '8px 12px' }}>
          <Check size={13} /> Code applied — $19.00 discount
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, color: '#ccc', display: 'block', marginBottom: 6 };

export default function CheckoutDashboard() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [billing, setBilling] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [submitted, setSubmitted] = useState(false);

  const plan = PLANS.find(p => p.id === selectedPlan);
  const price = plan?.price[billing] || 0;

  if (submitted) {
    return (
      <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h3>Subscription Activated!</h3>
        <p style={{ color: '#888' }}>Welcome to Nexus AI Pro {plan?.name}. Your account has been upgraded.</p>
        <button onClick={() => setSubmitted(false)} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', borderRadius: 8, padding: '8px 20px', color: '#818cf8', cursor: 'pointer' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14, padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Subscription & Checkout</h2>
      <p style={{ margin: '0 0 16px', color: '#888', fontSize: 12 }}>Secure checkout powered by Stripe</p>

      {/* Billing Toggle */}
      <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
        {['monthly', 'annual'].map(b => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            style={{
              padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
              background: billing === b ? 'rgba(99,102,241,0.25)' : 'transparent',
              border: `1px solid ${billing === b ? '#6366f1' : 'transparent'}`,
              color: billing === b ? '#818cf8' : '#888'
            }}
          >
            {b.charAt(0).toUpperCase() + b.slice(1)}
            {b === 'annual' && <span style={{ marginLeft: 4, fontSize: 10, color: '#34d399' }}>Save 17%</span>}
          </button>
        ))}
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 20 }}>
        {PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlan(p.id)}
            style={{
              background: selectedPlan === p.id ? `${p.color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedPlan === p.id ? p.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, padding: 12, cursor: 'pointer', color: '#fff', textAlign: 'left',
              position: 'relative'
            }}
          >
            {p.popular && (
              <span style={{ position: 'absolute', top: -8, right: 8, background: p.color, borderRadius: 10, padding: '2px 8px', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                POPULAR
              </span>
            )}
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: p.color }}>
              ${p.price[billing]}
              <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>/{billing === 'annual' ? 'yr' : 'mo'}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {p.features.slice(0, 3).map((f, i) => (
                <div key={i} style={{ fontSize: 10, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={9} style={{ color: p.color, flexShrink: 0 }} /> {f}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Payment Method */}
      <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#ccc' }}>Payment Method</h4>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {Object.entries(PAYMENT_METHODS).map(([key, method]) => {
          const Icon = method.icon;
          return (
            <button
              key={key}
              onClick={() => setPaymentMethod(key)}
              style={{
                flex: 1, background: paymentMethod === key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${paymentMethod === key ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8, padding: '8px', cursor: 'pointer', color: paymentMethod === key ? '#818cf8' : '#888',
                fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <Icon size={16} />
              {method.label}
            </button>
          );
        })}
      </div>

      {/* Payment Form */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        {paymentMethod === 'card' && <CardForm />}
        {paymentMethod === 'crypto' && <CryptoForm />}
        {paymentMethod === 'gift' && <GiftCardForm />}
      </div>

      {/* Order Summary */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <h5 style={{ margin: '0 0 10px', fontSize: 13 }}>Order Summary</h5>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
          <span>Nexus AI Pro {plan?.name}</span>
          <span>${price}/{billing === 'annual' ? 'yr' : 'mo'}</span>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>Total</span>
          <span>${price}</span>
        </div>
      </div>

      {/* Security Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 11, marginBottom: 14 }}>
        <Lock size={11} style={{ color: '#34d399' }} />
        Secured by Stripe · TLS 1.3 · PCI DSS compliant · No card data stored
      </div>

      <button
        onClick={() => setSubmitted(true)}
        style={{
          width: '100%', background: plan?.color + 'cc', border: `1px solid ${plan?.color}`,
          borderRadius: 8, padding: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14
        }}
      >
        {price === 0 ? 'Start Free' : `Subscribe — $${price}/${billing === 'annual' ? 'yr' : 'mo'}`}
      </button>
    </div>
  );
}
