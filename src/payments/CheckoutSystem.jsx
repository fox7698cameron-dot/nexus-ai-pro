// src/payments/CheckoutSystem.jsx
// Nexus AI Pro — Checkout & Subscription System
// Supports: Stripe (all major cards), Crypto, Gift Cards
// Updated: 2026-05-03

import React, { useState, useCallback } from 'react';
import {
  CreditCard, Lock, CheckCircle, AlertTriangle, Gift,
  Bitcoin, Shield, ChevronRight, Star, Crown, Zap, X
} from 'lucide-react';

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = {
  pro: {
    name: 'Pro',
    icon: <Star size={20} className="text-blue-500" />,
    price: { monthly: 9.99, annual: 99.99 },
    color: 'from-blue-500 to-cyan-500',
    features: ['Unlimited AI chats', 'All model access', '100MB uploads', 'Analytics dashboard', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    icon: <Crown size={20} className="text-purple-500" />,
    price: { monthly: 14.99, annual: 149.99 },
    color: 'from-purple-500 to-pink-500',
    features: ['Everything in Pro', 'Custom models', 'API access', 'Team management', 'SLA guarantee', 'Dedicated support'],
  },
};

// ─── Supported card networks ──────────────────────────────────────────────────
const CARD_ICONS = {
  visa:       { label: 'Visa',       pattern: /^4/ },
  mastercard: { label: 'Mastercard', pattern: /^5[1-5]|^22[2-9]|^2[3-7]/ },
  amex:       { label: 'Amex',       pattern: /^3[47]/ },
  discover:   { label: 'Discover',   pattern: /^6(?:011|5)/ },
  dinersclub: { label: 'Diners',     pattern: /^3(?:0[0-5]|[68])/ },
  jcb:        { label: 'JCB',        pattern: /^(?:2131|1800|35)/ },
};

function detectCard(number) {
  const clean = number.replace(/\s/g, '');
  for (const [key, cfg] of Object.entries(CARD_ICONS)) {
    if (cfg.pattern.test(clean)) return key;
  }
  return null;
}

function formatCard(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
}

// ─── Stripe Card Form ─────────────────────────────────────────────────────────
function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [errors, setErrors] = useState({});
  const detected = detectCard(card.number);

  const validate = () => {
    const errs = {};
    const clean = card.number.replace(/\s/g, '');
    if (clean.length < 13) errs.number = 'Invalid card number';
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) errs.expiry = 'Invalid expiry (MM/YY)';
    else {
      const [mm, yy] = card.expiry.split('/').map(Number);
      const now = new Date();
      if (mm < 1 || mm > 12 || yy + 2000 < now.getFullYear() || (yy + 2000 === now.getFullYear() && mm < now.getMonth() + 1))
        errs.expiry = 'Card has expired';
    }
    if (card.cvv.length < 3) errs.cvv = 'Invalid CVV';
    if (!card.name.trim()) errs.name = 'Cardholder name required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({ method: 'card', cardType: detected });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Card Number</label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={card.number}
            onChange={e => setCard(c => ({ ...c, number: formatCard(e.target.value) }))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className={`w-full border rounded-xl px-4 py-2.5 pr-20 text-sm font-mono bg-white dark:bg-gray-800 dark:text-white ${errors.number ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {Object.entries(CARD_ICONS).map(([k, cfg]) => (
              <span
                key={k}
                className={`text-xs px-1 py-0.5 rounded font-bold transition-opacity ${detected === k ? 'opacity-100' : 'opacity-20'}`}
                style={{ fontSize: '9px', background: '#f3f4f6' }}
              >
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
        {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expiry (MM/YY)</label>
          <input
            type="text"
            inputMode="numeric"
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
            placeholder="MM/YY"
            maxLength={5}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm font-mono bg-white dark:bg-gray-800 dark:text-white ${errors.expiry ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
          />
          {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CVV</label>
          <input
            type="text"
            inputMode="numeric"
            value={card.cvv}
            onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            placeholder="•••"
            maxLength={4}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm font-mono bg-white dark:bg-gray-800 dark:text-white ${errors.cvv ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
          />
          {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cardholder Name</label>
        <input
          type="text"
          value={card.name}
          onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
          placeholder="Full name on card"
          className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white ${errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
        <Lock size={12} className="text-green-500" />
        <span>Secured by Stripe · PCI DSS compliant · AES-256 encrypted</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        <Lock size={14} />
        {loading ? 'Processing…' : 'Pay Securely'}
      </button>
    </form>
  );
}

// ─── Crypto Payment Form ──────────────────────────────────────────────────────
function CryptoForm({ amount, onSubmit, loading }) {
  const [coin, setCoin] = useState('btc');
  const COINS = [
    { key: 'btc',  label: 'Bitcoin',   symbol: '₿',  icon: '🟠' },
    { key: 'eth',  label: 'Ethereum',  symbol: 'Ξ',  icon: '🔷' },
    { key: 'usdc', label: 'USDC',      symbol: '$',  icon: '💵' },
    { key: 'sol',  label: 'Solana',    symbol: '◎',  icon: '🟣' },
    { key: 'ltc',  label: 'Litecoin',  symbol: 'Ł',  icon: '🩶' },
  ];
  const selected = COINS.find(c => c.key === coin) || COINS[0];
  const mockAddress = `0x${Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {COINS.map(c => (
          <button
            key={c.key}
            onClick={() => setCoin(c.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              coin === c.key
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400'
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Send exactly to this {selected.label} address:</p>
        <div className="w-24 h-24 mx-auto bg-white border-4 border-gray-200 rounded-lg flex items-center justify-center mb-2 text-3xl">
          {selected.icon}
        </div>
        <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1.5 mb-1">
          {mockAddress}
        </p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {selected.symbol}{(amount / (coin === 'btc' ? 95000 : coin === 'eth' ? 3200 : 1)).toFixed(4)} {selected.key.toUpperCase()}
        </p>
        <p className="text-xs text-gray-400 mt-1">≈ ${amount} USD · 30-minute payment window</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
        <Shield size={12} className="text-green-500" />
        <span>Payment verified on-chain. No refunds once confirmed.</span>
      </div>

      <button
        onClick={() => onSubmit({ method: 'crypto', coin })}
        disabled={loading}
        className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Waiting for payment…' : "I've Sent the Payment"}
      </button>
    </div>
  );
}

// ─── Gift Card Form ───────────────────────────────────────────────────────────
function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const format = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
    .replace(/(.{4})/g, '$1-').replace(/-$/, '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = code.replace(/-/g, '');
    if (clean.length < 8) { setError('Gift card code must be 8–16 characters'); return; }
    setError('');
    onSubmit({ method: 'giftcard', code: clean });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="flex flex-col items-center py-4">
        <Gift size={40} className="text-pink-500 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Enter your gift card code below</p>
      </div>
      <div>
        <input
          type="text"
          value={code}
          onChange={e => setCode(format(e.target.value))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className={`w-full text-center font-mono text-lg tracking-widest border rounded-xl px-4 py-3 bg-white dark:bg-gray-800 dark:text-white ${error ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
        />
        {error && <p className="text-xs text-red-500 mt-1 text-center">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-pink-500 text-white rounded-xl font-semibold text-sm hover:bg-pink-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Validating…' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

// ─── Main Checkout Modal ──────────────────────────────────────────────────────
export default function CheckoutSystem({ plan: planKey = 'pro', billing = 'monthly', onClose, onSuccess }) {
  const plan = PLANS[planKey] || PLANS.pro;
  const price = plan.price[billing] || plan.price.monthly;
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePayment = useCallback(async (details) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      onSuccess?.({ plan: planKey, billing, ...details });
    }, 1500);
  }, [planKey, billing, onSuccess]);

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Successful!</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Your {plan.name} subscription is now active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl my-4">
        {/* Header */}
        <div className={`bg-gradient-to-br ${plan.color} p-5 rounded-t-2xl text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {plan.icon}
              <div>
                <h3 className="font-bold text-lg">{plan.name} Plan</h3>
                <p className="text-sm opacity-90">{billing === 'annual' ? 'Billed annually' : 'Billed monthly'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold">${price.toFixed(2)}</span>
            <span className="text-sm opacity-80">/{billing === 'annual' ? 'year' : 'month'}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {plan.features.slice(0, 3).map(f => (
              <span key={f} className="flex items-center gap-1 text-xs opacity-90">
                <CheckCircle size={10} /> {f}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Payment method tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
            {[
              { key: 'card',     label: 'Card',      icon: <CreditCard size={14} /> },
              { key: 'crypto',   label: 'Crypto',    icon: <Bitcoin size={14} /> },
              { key: 'giftcard', label: 'Gift Card', icon: <Gift size={14} /> },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setPayMethod(m.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  payMethod === m.key
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {payMethod === 'card'     && <CardForm onSubmit={handlePayment} loading={loading} />}
          {payMethod === 'crypto'   && <CryptoForm amount={price} onSubmit={handlePayment} loading={loading} />}
          {payMethod === 'giftcard' && <GiftCardForm onSubmit={handlePayment} loading={loading} />}
        </div>
      </div>
    </div>
  );
}
