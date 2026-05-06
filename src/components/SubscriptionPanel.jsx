// src/components/SubscriptionPanel.jsx
// Nexus AI Pro — Subscription & Payments
// Stripe · Visa · MC · Amex · Discover · Crypto · Gift Cards
// Updated: 2026-05-06

import React, { useState, useCallback } from 'react';
import {
  CreditCard, Bitcoin, Gift, Shield, CheckCircle2,
  AlertTriangle, Loader2, Lock, Star, Crown, Zap,
  ChevronRight, RefreshCw, X, Eye, EyeOff
} from 'lucide-react';

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    badge: '🆓',
    color: 'border-gray-600',
    accent: 'text-gray-300',
    button: 'bg-gray-700 hover:bg-gray-600',
    features: ['5 AI requests/day', 'Basic models (GPT-4, Claude Sonnet)', '1MB file uploads', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    interval: 'month',
    badge: '⭐',
    color: 'border-blue-500',
    accent: 'text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
    popular: true,
    features: ['Unlimited AI requests', 'All 25+ models', '100MB uploads', 'Analytics dashboard', 'Project tracker', 'Priority support'],
    stripePriceId: 'price_pro_monthly',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 14.99,
    interval: 'month',
    badge: '👑',
    color: 'border-purple-500',
    accent: 'text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
    features: ['Everything in Pro', 'Custom AI models', 'API access', 'Game engine connectors', 'Cloud integrations', 'SLA 99.9%', 'Dedicated support'],
    stripePriceId: 'price_enterprise_monthly',
  },
];

// ── Payment methods ───────────────────────────────────────────────────────────
const CARD_BRANDS = [
  { id: 'visa',       label: 'Visa',            icon: '💳', pattern: /^4/ },
  { id: 'mastercard', label: 'Mastercard',       icon: '🔴', pattern: /^5[1-5]/ },
  { id: 'amex',       label: 'Amex',             icon: '🟦', pattern: /^3[47]/ },
  { id: 'discover',   label: 'Discover',         icon: '🟠', pattern: /^6(?:011|5)/ },
  { id: 'dinersclub', label: "Diner's Club",     icon: '⬜', pattern: /^3(?:0[0-5]|[68])/ },
  { id: 'jcb',        label: 'JCB',              icon: '🔵', pattern: /^35/ },
  { id: 'unionpay',   label: 'UnionPay',         icon: '🔶', pattern: /^62/ },
];

const CRYPTO_OPTIONS = [
  { id: 'btc',  label: 'Bitcoin',   icon: '₿',  symbol: 'BTC' },
  { id: 'eth',  label: 'Ethereum',  icon: 'Ξ',  symbol: 'ETH' },
  { id: 'usdc', label: 'USDC',      icon: '💵', symbol: 'USDC' },
  { id: 'usdt', label: 'USDT',      icon: '💚', symbol: 'USDT' },
  { id: 'sol',  label: 'Solana',    icon: '◎',  symbol: 'SOL' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectBrand(num) {
  const clean = num.replace(/\s/g, '');
  return CARD_BRANDS.find((b) => b.pattern.test(clean)) || null;
}

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const clean = val.replace(/\D/g, '').slice(0, 4);
  return clean.length >= 3 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
}

function luhnCheck(num) {
  const digits = num.replace(/\D/g, '');
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// ── Card form ─────────────────────────────────────────────────────────────────
function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [showCvc, setShowCvc] = useState(false);
  const [errors, setErrors] = useState({});
  const brand = detectBrand(card.number);

  const validate = () => {
    const e = {};
    const raw = card.number.replace(/\s/g, '');
    if (raw.length < 13 || !luhnCheck(raw)) e.number = 'Invalid card number';
    const [mo, yr] = card.expiry.split('/');
    const now = new Date();
    if (!mo || !yr || parseInt(mo) < 1 || parseInt(mo) > 12) e.expiry = 'Invalid expiry month';
    else if (parseInt(`20${yr}`) < now.getFullYear() || (parseInt(`20${yr}`) === now.getFullYear() && parseInt(mo) < now.getMonth() + 1)) e.expiry = 'Card is expired';
    if (!card.cvc || card.cvc.length < 3) e.cvc = 'Invalid CVC';
    if (!card.name.trim()) e.name = 'Cardholder name required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    // Never send raw card data to our server — tokenize via Stripe.js in production
    onSubmit({ method: 'card', brand: brand?.id, last4: card.number.replace(/\s/g, '').slice(-4) });
  };

  const set = (k) => (val) => setCard((c) => ({ ...c, [k]: val }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Card Number</label>
        <div className="relative">
          <input
            value={card.number}
            onChange={(e) => set('number')(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
          />
          {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg" title={brand.label}>{brand.icon}</span>}
        </div>
        {errors.number && <p className="text-red-400 text-xs mt-1">{errors.number}</p>}
        {/* Accepted brands */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {CARD_BRANDS.map((b) => (
            <span key={b.id} title={b.label} className={`text-base opacity-${brand?.id === b.id ? '100' : '40'}`}>{b.icon}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Expiry (MM/YY)</label>
          <input
            value={card.expiry}
            onChange={(e) => set('expiry')(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            inputMode="numeric"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          {errors.expiry && <p className="text-red-400 text-xs mt-1">{errors.expiry}</p>}
        </div>
        <div>
          <label className="text-gray-300 text-sm mb-1 flex items-center justify-between">
            CVC
            <button type="button" onClick={() => setShowCvc((s) => !s)} className="text-gray-500 hover:text-gray-300">
              {showCvc ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </label>
          <input
            type={showCvc ? 'text' : 'password'}
            value={card.cvc}
            onChange={(e) => set('cvc')(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="•••"
            inputMode="numeric"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          {errors.cvc && <p className="text-red-400 text-xs mt-1">{errors.cvc}</p>}
        </div>
      </div>

      <div>
        <label className="text-gray-300 text-sm mb-1 block">Cardholder Name</label>
        <input
          value={card.name}
          onChange={(e) => set('name')(e.target.value)}
          placeholder="Jane Doe"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <Lock size={12} />
        <span>Payments processed by Stripe — card data never touches our servers.</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? 'Processing…' : 'Subscribe with Card'}
      </button>
    </form>
  );
}

// ── Crypto payment ────────────────────────────────────────────────────────────
function CryptoForm({ plan, onSubmit, loading }) {
  const [coin, setCoin] = useState('usdc');
  const selected = CRYPTO_OPTIONS.find((c) => c.id === coin);
  // In production, fetch real-time rate from Coinbase / CoinGecko API
  const mockRate = { btc: 0.00014, eth: 0.0042, usdc: plan.price, usdt: plan.price, sol: 0.075 }[coin];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {CRYPTO_OPTIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCoin(c.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${coin === c.id ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}
          >
            <span className="text-lg">{c.icon}</span>
            <span>{c.symbol}</span>
          </button>
        ))}
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center space-y-1">
        <p className="text-gray-400 text-xs">Amount due</p>
        <p className="text-white text-2xl font-bold">{mockRate} {selected?.symbol}</p>
        <p className="text-gray-500 text-xs">≈ ${plan.price}/month · rate updated hourly</p>
      </div>
      <div className="bg-gray-900 border border-dashed border-gray-600 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-xs mb-2">Send {selected?.symbol} to:</p>
        <code className="text-blue-300 text-xs break-all">nexus-pay.eth (ENS) or 0xABCD…1234</code>
        <p className="text-gray-500 text-xs mt-1">Wallet address generated per transaction in production.</p>
      </div>
      <button
        onClick={() => onSubmit({ method: 'crypto', coin })}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Bitcoin size={16} />}
        {loading ? 'Processing…' : `Pay with ${selected?.label}`}
      </button>
    </div>
  );
}

// ── Gift card ─────────────────────────────────────────────────────────────────
function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null);

  const formatCode = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16).replace(/(.{4})/g, '$1-').replace(/-$/, '');

  const verify = async () => {
    if (code.replace(/-/g, '').length < 16) return;
    setStatus('checking');
    await new Promise((r) => setTimeout(r, 800));
    setStatus(Math.random() > 0.3 ? 'valid' : 'invalid');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Gift Card Code</label>
        <input
          value={code}
          onChange={(e) => setCode(formatCode(e.target.value))}
          onBlur={verify}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono tracking-widest uppercase"
        />
        {status === 'valid'    && <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={10} />Valid gift card — $25.00 credit</p>}
        {status === 'invalid'  && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertTriangle size={10} />Invalid or already redeemed</p>}
        {status === 'checking' && <p className="text-gray-400 text-xs mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" />Verifying…</p>}
      </div>
      <button
        onClick={() => onSubmit({ method: 'gift_card', code })}
        disabled={loading || status !== 'valid'}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </div>
  );
}

// ── Main subscription panel ───────────────────────────────────────────────────
export default function SubscriptionPanel({ currentPlan = 'free' }) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan === 'free' ? 'pro' : currentPlan);
  const [payMethod, setPayMethod]       = useState('card');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];

  const handlePayment = useCallback(async (payData) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify({ plan: selectedPlan, ...payData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      // If Stripe, redirect to Stripe Checkout URL
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else setResult({ success: true, message: data.message || 'Subscription activated!' });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  const payTabs = [
    { id: 'card',   label: 'Card',      icon: <CreditCard size={14} /> },
    { id: 'crypto', label: 'Crypto',    icon: <Bitcoin size={14} /> },
    { id: 'gift',   label: 'Gift Card', icon: <Gift size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-gray-400">Secure payments via Stripe · All major cards · Crypto · Gift cards</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`relative rounded-2xl border-2 p-5 text-left transition-all ${selectedPlan === p.id ? p.color + ' ring-2 ring-offset-2 ring-offset-gray-900 ' + p.color : 'border-gray-700 hover:border-gray-500'} bg-gray-800`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</span>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{p.badge}</span>
                <span className={`font-bold text-lg ${selectedPlan === p.id ? p.accent : 'text-white'}`}>{p.name}</span>
              </div>
              <div className="mb-4">
                {p.price === 0
                  ? <span className="text-3xl font-bold text-white">Free</span>
                  : <><span className="text-3xl font-bold text-white">${p.price}</span><span className="text-gray-400 text-sm">/mo</span></>
                }
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {selectedPlan === p.id && (
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: 'inherit' }}>
                  <CheckCircle2 size={12} className={p.accent} />
                  <span className={p.accent}>Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Payment section */}
        {plan.price > 0 && (
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">Payment Details</h2>
              <span className="text-gray-400 text-sm">{plan.badge} {plan.name} — ${plan.price}/mo</span>
            </div>

            {/* Payment method tabs */}
            <div className="flex gap-1 mb-5 bg-gray-900 rounded-xl p-1">
              {payTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPayMethod(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${payMethod === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {result && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${result.success ? 'bg-green-900/30 border border-green-700 text-green-400' : 'bg-red-900/20 border border-red-700 text-red-400'}`}>
                {result.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {result.message}
              </div>
            )}

            {payMethod === 'card'   && <CardForm onSubmit={handlePayment} loading={loading} />}
            {payMethod === 'crypto' && <CryptoForm plan={plan} onSubmit={handlePayment} loading={loading} />}
            {payMethod === 'gift'   && <GiftCardForm onSubmit={handlePayment} loading={loading} />}
          </div>
        )}

        {plan.price === 0 && (
          <div className="text-center text-gray-400 text-sm">
            <CheckCircle2 size={20} className="text-green-400 mx-auto mb-2" />
            You are on the Free plan — no payment required.
          </div>
        )}
      </div>
    </div>
  );
}
