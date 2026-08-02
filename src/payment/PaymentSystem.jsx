// src/payment/PaymentSystem.jsx
// 2026-08-02 — Payment & Subscription System
// Supports: Stripe (all major cards), Crypto (BTC/ETH/USDC), Gift Cards
// Cards: Visa, Mastercard, AmEx, Discover, Amex, Maestro, debit cards

import React, { useState, useCallback } from 'react';
import {
  CreditCard, Shield, Lock, CheckCircle, Zap, Star,
  Bitcoin, Gift, X, AlertTriangle, Eye, EyeOff,
  ChevronDown, ArrowRight, Sparkles, Crown, Rocket
} from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    icon: '🆓',
    color: '#888',
    features: ['5 AI chats/day', 'Basic models', '1MB file upload', 'Community support'],
    limits: { chatsPerDay: 5, storage: '1MB', models: 3 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    icon: '⭐',
    color: '#00aaff',
    badge: 'Popular',
    features: ['Unlimited AI chats', 'All AI models', '100MB uploads', 'Analytics dashboard', 'Priority support', 'Project tracker'],
    limits: { chatsPerDay: Infinity, storage: '100MB', models: 'all' },
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 29.99,
    period: 'month',
    icon: '🚀',
    color: '#9146ff',
    badge: 'Best Value',
    features: ['Everything in Pro', 'Game dev connectors', 'AR/VR project tracking', 'Security dashboard', 'API access', 'Team collaboration (5 seats)'],
    limits: { chatsPerDay: Infinity, storage: '5GB', models: 'all', teamSeats: 5 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    period: 'month',
    icon: '👑',
    color: '#ffaa00',
    features: ['Everything in Studio', 'Unlimited team seats', 'Custom AI models', 'SLA 99.9%', 'Dedicated support', 'On-prem deployment', 'Custom integrations', 'Audit logs'],
    limits: { chatsPerDay: Infinity, storage: 'Unlimited', models: 'all', teamSeats: Infinity },
  },
];

const CRYPTO_CURRENCIES = [
  { id: 'btc',  symbol: 'BTC',  name: 'Bitcoin',  icon: '₿', color: '#f7931a' },
  { id: 'eth',  symbol: 'ETH',  name: 'Ethereum', icon: 'Ξ', color: '#627eea' },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '◎', color: '#2775ca' },
  { id: 'sol',  symbol: 'SOL',  name: 'Solana',   icon: '◎', color: '#9945ff' },
  { id: 'bnb',  symbol: 'BNB',  name: 'BNB',      icon: '⬡', color: '#f0b90b' },
];

const SUPPORTED_CARDS = [
  { name: 'Visa',       icon: '💳', pattern: /^4/ },
  { name: 'Mastercard', icon: '🔴', pattern: /^5[1-5]|^2[2-7]/ },
  { name: 'AmEx',       icon: '🟦', pattern: /^3[47]/ },
  { name: 'Discover',   icon: '🟠', pattern: /^6(?:011|5)/ },
  { name: 'Maestro',    icon: '🔵', pattern: /^(?:5018|5020|5038|56|57|58|6304|6759|676[1-3])/ },
];

function detectCardType(number) {
  const clean = number.replace(/\s/g, '');
  return SUPPORTED_CARDS.find(c => c.pattern.test(clean))?.name || 'Card';
}

function formatCardNumber(value) {
  const clean = value.replace(/\D/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value) {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 2) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return clean;
}

function PlanCard({ plan, current, onSelect }) {
  const isCurrentPlan = current === plan.id;
  return (
    <div style={{
      background: isCurrentPlan ? `${plan.color}15` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isCurrentPlan ? plan.color + '66' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 16, padding: 20,
      position: 'relative',
      boxShadow: isCurrentPlan ? `0 0 20px ${plan.color}15` : 'none',
    }}>
      {plan.badge && !isCurrentPlan && (
        <div style={{
          position: 'absolute', top: -10, right: 16,
          fontSize: 9, padding: '2px 10px', borderRadius: 10, fontWeight: 800,
          background: plan.color, color: '#000', letterSpacing: '0.05em',
        }}>{plan.badge.toUpperCase()}</div>
      )}
      {isCurrentPlan && (
        <div style={{
          position: 'absolute', top: -10, right: 16,
          fontSize: 9, padding: '2px 10px', borderRadius: 10, fontWeight: 800,
          background: plan.color, color: '#000', letterSpacing: '0.05em',
        }}>CURRENT</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{plan.icon}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{plan.name}</div>
          <div style={{ fontSize: 11, color: plan.color, fontWeight: 700 }}>
            {plan.price === 0 ? 'Free forever' : `$${plan.price}/${plan.period}`}
          </div>
        </div>
      </div>

      <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            <CheckCircle size={11} color={plan.color} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => !isCurrentPlan && onSelect(plan)}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 10, cursor: isCurrentPlan ? 'default' : 'pointer',
          fontSize: 12, fontWeight: 700,
          background: isCurrentPlan ? 'transparent' : `linear-gradient(135deg, ${plan.color}, ${plan.color}aa)`,
          border: isCurrentPlan ? `1px solid ${plan.color}44` : 'none',
          color: isCurrentPlan ? plan.color : '#000',
          opacity: isCurrentPlan ? 0.7 : 1,
        }}
      >
        {isCurrentPlan ? 'Your Plan' : plan.price === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}

function CardForm({ plan, onSuccess, onCancel }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [showCvc, setShowCvc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cardType = detectCardType(card.number);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation only — actual tokenization must go through Stripe.js
    const cleanNum = card.number.replace(/\s/g, '');
    if (cleanNum.length < 13 || cleanNum.length > 19) return setError('Invalid card number.');
    if (card.expiry.length < 4) return setError('Invalid expiry date.');
    if (card.cvc.length < 3) return setError('Invalid CVC.');
    if (!card.name.trim()) return setError('Cardholder name required.');

    setLoading(true);
    // Simulate Stripe tokenization — replace with actual Stripe.js createPaymentMethod
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onSuccess({ method: 'card', cardType, last4: cleanNum.slice(-4), plan: plan.id });
  }, [card, plan, cardType, onSuccess]);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
          CARD NUMBER <span style={{ color: '#aaa' }}>({cardType})</span>
        </label>
        <input
          type="text" inputMode="numeric" autoComplete="cc-number"
          value={card.number} placeholder="1234 5678 9012 3456"
          onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
          maxLength={19}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14,
            letterSpacing: '0.1em', fontFamily: 'monospace',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>EXPIRY</label>
          <input
            type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY"
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
            maxLength={5}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, fontFamily: 'monospace',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>CVC</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCvc ? 'text' : 'password'} inputMode="numeric" autoComplete="cc-csc" placeholder="•••"
              value={card.cvc}
              onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              maxLength={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '9px 36px 9px 12px', color: '#fff', fontSize: 14, fontFamily: 'monospace',
              }}
            />
            <button
              type="button" onClick={() => setShowCvc(v => !v)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}
            >
              {showCvc ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>CARDHOLDER NAME</label>
        <input
          type="text" autoComplete="cc-name" placeholder="Full name on card"
          value={card.name}
          onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14,
          }}
        />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8 }}>
          <AlertTriangle size={12} color="#ff6666" />
          <span style={{ fontSize: 11, color: '#ff6666' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
        <Lock size={10} />
        Secured by Stripe · PCI DSS Level 1 · Card data never touches our servers
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
        }}>Cancel</button>
        <button type="submit" disabled={loading} style={{
          flex: 2, padding: '10px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 700,
          background: loading ? 'rgba(0,170,255,0.3)' : 'linear-gradient(135deg, #00aaff, #0066cc)',
          border: 'none', color: '#fff', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Processing...' : `Pay $${plan.price}/month`}
        </button>
      </div>
    </form>
  );
}

function CryptoForm({ plan, onSuccess, onCancel }) {
  const [selected, setSelected] = useState(CRYPTO_CURRENCIES[0]);
  const [loading, setLoading] = useState(false);

  const handlePay = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onSuccess({ method: 'crypto', currency: selected.symbol, plan: plan.id });
  }, [selected, plan, onSuccess]);

  // Demo exchange rates
  const rates = { BTC: 0.000015, ETH: 0.0042, USDC: 1, SOL: 0.19, BNB: 0.033 };
  const cryptoAmount = (plan.price * (rates[selected.symbol] || 1)).toFixed(6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Select cryptocurrency</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CRYPTO_CURRENCIES.map(c => (
          <button key={c.id} onClick={() => setSelected(c)} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: selected.id === c.id ? `${c.color}22` : 'transparent',
            border: `1px solid ${selected.id === c.id ? c.color : 'rgba(255,255,255,0.1)'}`,
            color: selected.id === c.id ? c.color : 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ fontSize: 14 }}>{c.icon}</span> {c.symbol}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Amount due</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: selected.color }}>
          {cryptoAmount} <span style={{ fontSize: 16 }}>{selected.symbol}</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
          ≈ ${plan.price} USD · Rate updates every 60s
        </div>
      </div>

      <div style={{ padding: '8px 12px', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
        A wallet address will be generated after confirmation. Payment expires in 30 minutes.
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
        }}>Cancel</button>
        <button onClick={handlePay} disabled={loading} style={{
          flex: 2, padding: '10px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 700,
          background: loading ? `rgba(${selected.color},0.3)` : `linear-gradient(135deg, ${selected.color}, ${selected.color}aa)`,
          border: 'none', color: '#fff', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Generating address...' : `Pay with ${selected.symbol}`}
        </button>
      </div>
    </div>
  );
}

function GiftCardForm({ onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCode = (v) => {
    const clean = v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 16);
    return clean.match(/.{1,4}/g)?.join('-') || clean;
  };

  const handleRedeem = useCallback(async () => {
    const clean = code.replace(/-/g, '');
    if (clean.length < 8) return setError('Please enter a valid gift card code.');
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    // Demo: accept any code
    onSuccess({ method: 'giftcard', code: clean });
  }, [code, onSuccess]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: 20, background: 'linear-gradient(135deg, rgba(255,100,0,0.1), rgba(255,170,0,0.05))', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, textAlign: 'center' }}>
        <Gift size={32} color="#ffaa00" style={{ margin: '0 auto 8px', display: 'block' }} />
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>Redeem Gift Card</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Enter your 16-character gift card code</div>
      </div>

      <div>
        <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 4 }}>GIFT CARD CODE</label>
        <input
          type="text" placeholder="XXXX-XXXX-XXXX-XXXX"
          value={code}
          onChange={e => setCode(formatCode(e.target.value))}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 15,
            textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.15em',
          }}
        />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8 }}>
          <AlertTriangle size={12} color="#ff6666" />
          <span style={{ fontSize: 11, color: '#ff6666' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
        }}>Cancel</button>
        <button onClick={handleRedeem} disabled={loading} style={{
          flex: 2, padding: '10px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 700,
          background: loading ? 'rgba(255,170,0,0.3)' : 'linear-gradient(135deg, #ffaa00, #ff6600)',
          border: 'none', color: '#000', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Validating...' : 'Redeem Gift Card'}
        </button>
      </div>
    </div>
  );
}

export default function PaymentSystem({ currentPlan = 'free', onPlanChange }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [step, setStep] = useState('plans');
  const [success, setSuccess] = useState(null);

  const handleSelectPlan = useCallback((plan) => {
    if (plan.price === 0) {
      setSuccess({ method: 'free', plan: plan.id });
      setStep('success');
      return;
    }
    setSelectedPlan(plan);
    setStep('checkout');
  }, []);

  const handleSuccess = useCallback((result) => {
    setSuccess(result);
    setStep('success');
    onPlanChange && onPlanChange(result.plan || selectedPlan?.id);
  }, [selectedPlan, onPlanChange]);

  return (
    <div style={{ background: '#080b10', minHeight: '100vh', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={22} color="#00aaff" /> Subscription & Billing
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Secure payments via Stripe · Crypto · Gift Cards
        </p>
      </div>

      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        {step === 'plans' && (
          <>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {['Visa', 'Mastercard', 'AmEx', 'Discover', 'Maestro'].map(c => (
                <span key={c} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  {c}
                </span>
              ))}
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)', color: '#f7931a' }}>₿ Crypto</span>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.2)', color: '#ffaa00' }}>🎁 Gift Cards</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              {PLANS.map(plan => (
                <PlanCard key={plan.id} plan={plan} current={currentPlan} onSelect={handleSelectPlan} />
              ))}
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="#00ff88" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                All payments are secured by Stripe (PCI DSS Level 1). We never store card data. Cancel anytime.
              </span>
            </div>
          </>
        )}

        {step === 'checkout' && selectedPlan && (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <button onClick={() => setStep('plans')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0 }}>
              ← Back to plans
            </button>

            <div style={{ padding: '12px 16px', background: `${selectedPlan.color}11`, border: `1px solid ${selectedPlan.color}33`, borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 18 }}>{selectedPlan.icon}</span>
                <span style={{ marginLeft: 8, fontWeight: 700, color: '#fff' }}>{selectedPlan.name}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 18, color: selectedPlan.color }}>${selectedPlan.price}/mo</span>
            </div>

            {/* Payment method tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {[
                { id: 'card', label: 'Card', icon: <CreditCard size={12} /> },
                { id: 'crypto', label: 'Crypto', icon: <span style={{ fontSize: 12 }}>₿</span> },
                { id: 'giftcard', label: 'Gift Card', icon: <Gift size={12} /> },
              ].map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                  flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: paymentMethod === m.id ? 'rgba(0,170,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${paymentMethod === m.id ? '#00aaff44' : 'rgba(255,255,255,0.1)'}`,
                  color: paymentMethod === m.id ? '#00aaff' : 'rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'card' && <CardForm plan={selectedPlan} onSuccess={handleSuccess} onCancel={() => setStep('plans')} />}
            {paymentMethod === 'crypto' && <CryptoForm plan={selectedPlan} onSuccess={handleSuccess} onCancel={() => setStep('plans')} />}
            {paymentMethod === 'giftcard' && <GiftCardForm onSuccess={handleSuccess} onCancel={() => setStep('plans')} />}
          </div>
        )}

        {step === 'success' && success && (
          <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(0,255,136,0.15)', border: '2px solid rgba(0,255,136,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={36} color="#00ff88" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Payment Successful!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Your subscription has been activated.
              {success.method === 'card' && ` Card ending in ${success.last4}.`}
              {success.method === 'crypto' && ` Paid with ${success.currency}.`}
              {success.method === 'giftcard' && ' Gift card redeemed.'}
            </p>
            <button onClick={() => setStep('plans')} style={{
              marginTop: 20, padding: '10px 28px', borderRadius: 10, cursor: 'pointer',
              background: 'linear-gradient(135deg, #00ff88, #00aaff)', border: 'none', color: '#000',
              fontWeight: 700, fontSize: 13,
            }}>
              View Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
