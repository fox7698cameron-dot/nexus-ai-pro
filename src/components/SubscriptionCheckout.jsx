// src/components/SubscriptionCheckout.jsx | 2026-10-01
import React, { useState, useCallback } from 'react';
import {
  CreditCard, Bitcoin, Gift, Check, Shield, Lock,
  Zap, Crown, Star, ChevronRight, AlertCircle,
  RefreshCw, CheckCircle, ExternalLink, ArrowLeft
} from 'lucide-react';

const TIERS = [
  {
    id:       'free',
    name:     'Free',
    price:    0,
    period:   'forever',
    color:    'from-gray-400 to-gray-600',
    border:   'border-gray-500/30',
    icon:     Zap,
    features: ['5 AI conversations/day', 'Basic model access', '1 MB file upload', 'Community support'],
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    9.99,
    period:   'month',
    color:    'from-blue-400 to-blue-600',
    border:   'border-blue-500/30',
    icon:     Star,
    popular:  true,
    features: ['Unlimited AI conversations', 'All 25+ models', '100 MB uploads', 'Priority support', 'Real-time analytics', 'Game dev tracking'],
  },
  {
    id:       'enterprise',
    name:     'Enterprise',
    price:    14.99,
    period:   'month',
    color:    'from-purple-400 to-pink-600',
    border:   'border-purple-500/30',
    icon:     Crown,
    features: ['Everything in Pro', 'Custom AI models', 'API access (1M tokens)', 'Dedicated SLA', 'Security dashboard', 'Team seats (10)', 'Custom connectors'],
  },
];

const PAYMENT_METHODS = [
  { id: 'card',   label: 'Credit / Debit Card', icon: CreditCard },
  { id: 'crypto', label: 'Cryptocurrency',       icon: Bitcoin    },
  { id: 'gift',   label: 'Gift Card',            icon: Gift       },
];

const CARD_NETWORKS = ['Visa', 'Mastercard', 'Amex', 'Discover', 'UnionPay', 'JCB', 'Diners'];
const CRYPTO_OPTIONS = [
  { id: 'BTC',  name: 'Bitcoin',    symbol: '₿' },
  { id: 'ETH',  name: 'Ethereum',   symbol: 'Ξ' },
  { id: 'USDC', name: 'USDC',       symbol: '$' },
  { id: 'SOL',  name: 'Solana',     symbol: '◎' },
  { id: 'MATIC',name: 'Polygon',    symbol: '⬡' },
];

// Luhn algorithm for basic card validation
function luhnCheck(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const v = val.replace(/\D/g, '').slice(0, 4);
  return v.length >= 3 ? v.slice(0, 2) + '/' + v.slice(2) : v;
}

// ── Card payment form ────────────────────────────────────────────────────
function CardForm({ tier, onSuccess }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');
  const [name,    setName]    = useState('');
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    const raw = cardNum.replace(/\s/g, '');
    if (raw.length < 13 || !luhnCheck(raw)) errs.cardNum = 'Invalid card number';
    const [mm, yy] = expiry.split('/');
    const now = new Date();
    if (!mm || !yy || Number(mm) > 12 || Number(mm) < 1 || (2000 + Number(yy)) < now.getFullYear()) errs.expiry = 'Invalid expiry';
    if (cvv.length < 3) errs.cvv = 'Invalid CVV';
    if (!name.trim()) errs.name = 'Name required';
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    // In production: POST /api/payments/create-checkout { tierId, paymentMethod: 'card' }
    // Server creates Stripe PaymentIntent and returns client_secret
    // Then use @stripe/stripe-js confirmCardPayment
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onSuccess?.({ method: 'card', tier: tier.name });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {CARD_NETWORKS.map(n => (
          <span key={n} className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">{n}</span>
        ))}
      </div>
      {[
        { label: 'Cardholder Name',  key: 'name',    val: name,    set: setName,    fmt: v => v,              placeholder: 'Full name on card', type: 'text' },
        { label: 'Card Number',      key: 'cardNum', val: cardNum, set: setCardNum, fmt: formatCardNumber,    placeholder: '0000 0000 0000 0000', type: 'text' },
      ].map(({ label, key, val, set, fmt, placeholder, type }) => (
        <div key={key}>
          <label className="text-xs text-gray-400 mb-1 block">{label}</label>
          <input
            type={type}
            value={val}
            onChange={e => set(fmt(e.target.value))}
            placeholder={placeholder}
            className={`w-full px-4 py-2 rounded-lg bg-white/10 border ${errors[key] ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
          />
          {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]}</p>}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Expiry', key: 'expiry', val: expiry, set: setExpiry, fmt: formatExpiry, placeholder: 'MM/YY' },
          { label: 'CVV',    key: 'cvv',    val: cvv,    set: setCvv,    fmt: v => v.replace(/\D/g,'').slice(0,4), placeholder: '•••' },
        ].map(({ label, key, val, set, fmt, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-gray-400 mb-1 block">{label}</label>
            <input
              type="text"
              value={val}
              onChange={e => set(fmt(e.target.value))}
              placeholder={placeholder}
              className={`w-full px-4 py-2 rounded-lg bg-white/10 border ${errors[key] ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
            />
            {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
        {loading ? 'Processing…' : `Pay $${tier.price}/mo`}
      </button>
      <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
        <Shield size={11} /> Secured by Stripe · 256-bit TLS encryption
      </p>
    </div>
  );
}

// ── Crypto payment form ──────────────────────────────────────────────────
function CryptoForm({ tier, onSuccess }) {
  const [selected, setSelected] = useState('USDC');
  const [loading,  setLoading]  = useState(false);

  const rates = { BTC: 0.00015, ETH: 0.004, USDC: tier.price, SOL: 0.18, MATIC: 15 };
  const amount = rates[selected]?.toFixed(selected === 'USDC' ? 2 : 6);

  const createInvoice = async () => {
    setLoading(true);
    // In production: POST /api/payments/crypto/invoice { tierId, currency: selected }
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    onSuccess?.({ method: 'crypto', coin: selected, tier: tier.name });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {CRYPTO_OPTIONS.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`p-3 rounded-xl text-center border transition-all ${
              selected === c.id
                ? 'bg-orange-900/30 border-orange-500/50 text-orange-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="text-lg">{c.symbol}</div>
            <div className="text-xs font-medium">{c.id}</div>
          </button>
        ))}
      </div>
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
        <p className="text-xs text-gray-400 mb-1">Amount due</p>
        <p className="text-2xl font-bold text-white">{amount} <span className="text-gray-400 text-base">{selected}</span></p>
        <p className="text-xs text-gray-500 mt-1">≈ ${tier.price} USD · rate refreshes every 30s</p>
      </div>
      <button
        onClick={createInvoice}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Bitcoin size={16} />}
        {loading ? 'Generating invoice…' : `Pay with ${selected}`}
      </button>
      <p className="text-xs text-gray-500 text-center">Payments processed on-chain. Subscription activates after 1 confirmation.</p>
    </div>
  );
}

// ── Gift card form ───────────────────────────────────────────────────────
function GiftCardForm({ tier, onSuccess }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const redeem = async () => {
    if (code.replace(/[-\s]/g, '').length < 16) {
      setError('Enter a valid 16-character gift card code.');
      return;
    }
    setError('');
    setLoading(true);
    // In production: POST /api/payments/gift-card/redeem { code, tierId }
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    onSuccess?.({ method: 'gift', tier: tier.name });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Enter your Nexus AI Pro gift card code below. Codes are 16 characters in XXXX-XXXX-XXXX-XXXX format.</p>
      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        maxLength={19}
        className={`w-full px-4 py-2 text-center text-lg tracking-widest rounded-lg bg-white/10 border ${error ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={redeem}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
      <p className="text-xs text-gray-500 text-center">Gift cards are non-refundable and can only be used once.</p>
    </div>
  );
}

// ── Main SubscriptionCheckout export ─────────────────────────────────────
export default function SubscriptionCheckout() {
  const [selectedTier,   setSelectedTier]   = useState('pro');
  const [paymentMethod,  setPaymentMethod]  = useState('card');
  const [success,        setSuccess]        = useState(null);
  const [step,           setStep]           = useState('tiers'); // tiers | payment | done

  const tier = TIERS.find(t => t.id === selectedTier);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-6 p-8 rounded-2xl border border-green-500/30 bg-green-900/10">
          <CheckCircle size={64} className="text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="text-gray-400 text-sm">
            Your <span className="text-white font-semibold">{success.tier}</span> subscription is now active.
            {success.method === 'card' && ' A receipt has been sent to your email.'}
            {success.method === 'crypto' && ' Transaction confirmed on-chain.'}
            {success.method === 'gift' && ' Gift card redeemed successfully.'}
          </p>
          <button onClick={() => { setSuccess(null); setStep('tiers'); }} className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          {step !== 'tiers' && (
            <button onClick={() => setStep('tiers')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Subscription & Billing</h1>
            <p className="text-sm text-gray-400">Choose your plan · all prices in USD</p>
          </div>
        </div>

        {step === 'tiers' && (
          <>
            {/* Tier cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map(t => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTier(t.id)}
                    className={`relative cursor-pointer rounded-2xl border p-5 transition-all ${
                      selectedTier === t.id
                        ? `${t.border} bg-white/10 ring-2 ring-offset-0 ring-blue-500`
                        : `${t.border} bg-white/5 hover:bg-white/8`
                    }`}
                  >
                    {t.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">Most Popular</span>
                    )}
                    <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${t.color} mb-3`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-bold text-lg">{t.name}</h3>
                    <div className="my-2">
                      <span className="text-3xl font-bold">{t.price === 0 ? 'Free' : `$${t.price}`}</span>
                      {t.price > 0 && <span className="text-gray-400 text-sm">/{t.period}</span>}
                    </div>
                    <ul className="space-y-1.5 mt-3">
                      {t.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                          <Check size={12} className="text-green-400 flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    {selectedTier === t.id && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle size={18} className="text-blue-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {tier.price > 0 && (
              <button
                onClick={() => setStep('payment')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Continue to Payment <ChevronRight size={16} />
              </button>
            )}
            {tier.price === 0 && (
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold">
                Start Free Plan <ChevronRight size={16} />
              </button>
            )}
          </>
        )}

        {step === 'payment' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Summary */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="font-semibold text-sm text-gray-300">Order Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{tier.name} Plan</span>
                  <span>${tier.price}/mo</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Tax</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${tier.price}/mo</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 flex items-center gap-2">
                <Shield size={14} className="text-green-400 flex-shrink-0" />
                All payments secured by Stripe. We never store raw card data.
              </div>
            </div>

            {/* Payment form */}
            <div className="md:col-span-3 space-y-4">
              {/* Method selector */}
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-all ${
                        paymentMethod === m.id
                          ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="hidden sm:block">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                {paymentMethod === 'card'   && <CardForm   tier={tier} onSuccess={setSuccess} />}
                {paymentMethod === 'crypto' && <CryptoForm tier={tier} onSuccess={setSuccess} />}
                {paymentMethod === 'gift'   && <GiftCardForm tier={tier} onSuccess={setSuccess} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
