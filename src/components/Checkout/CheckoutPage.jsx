// nexus-ai-pro/src/components/Checkout/CheckoutPage.jsx | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Checkout: Stripe cards, crypto, gift cards — all major brands supported

import { useState, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Check, AlertCircle,
  Lock, ChevronDown, Loader2, Shield,
} from 'lucide-react';

const TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    monthly: 9.99,
    annual: 79.99,
    features: ['5 AI models', '1,000 messages/mo', '1 social account', '1 project', 'Standard support'],
    color: 'border-gray-600',
    badge: null,
  },
  {
    id: 'pro',
    label: 'Pro',
    monthly: 29.99,
    annual: 239.99,
    features: ['All AI models', 'Unlimited messages', '10 social accounts', '20 projects', 'Analytics dashboard', '2FA / MFA', 'Priority support'],
    color: 'border-indigo-500',
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    monthly: 99.99,
    annual: 799.99,
    features: ['Everything in Pro', 'Custom AI models', 'Unlimited everything', 'Dedicated support', 'SLA guarantee', 'SSO / SAML', 'Custom integrations'],
    color: 'border-purple-500',
    badge: 'Best Value',
  },
];

const CARD_BRANDS = [
  { id: 'visa',       label: 'Visa',           emoji: '💳' },
  { id: 'mastercard', label: 'Mastercard',     emoji: '💳' },
  { id: 'amex',       label: 'Amex',           emoji: '💳' },
  { id: 'discover',   label: 'Discover',       emoji: '💳' },
  { id: 'diners',     label: 'Diners Club',    emoji: '💳' },
  { id: 'jcb',        label: 'JCB',            emoji: '💳' },
  { id: 'unionpay',   label: 'UnionPay',       emoji: '💳' },
  { id: 'maestro',    label: 'Maestro',        emoji: '💳' },
];

const CRYPTO_COINS = [
  { id: 'btc',  label: 'Bitcoin',  emoji: '₿' },
  { id: 'eth',  label: 'Ethereum', emoji: 'Ξ' },
  { id: 'usdc', label: 'USDC',     emoji: '🔵' },
  { id: 'usdt', label: 'USDT',     emoji: '💚' },
  { id: 'sol',  label: 'Solana',   emoji: '◎' },
];

function TierCard({ tier, selected, billing, onSelect }) {
  const price = billing === 'annual' ? tier.annual : tier.monthly;
  const isSelected = selected?.id === tier.id;
  return (
    <button
      onClick={() => onSelect(tier)}
      className={`w-full text-left p-4 rounded-xl border-2 transition ${isSelected ? tier.color + ' bg-indigo-500/5' : 'border-gray-800 bg-gray-900 hover:border-gray-600'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-bold text-white">{tier.label}</span>
        {tier.badge && (
          <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs rounded-full">{tier.badge}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-white">${price}</span>
        <span className="text-gray-400 text-sm">/{billing === 'annual' ? 'yr' : 'mo'}</span>
        {billing === 'annual' && (
          <span className="text-green-400 text-xs ml-1">Save {Math.round((1 - tier.annual / (tier.monthly * 12)) * 100)}%</span>
        )}
      </div>
      <ul className="space-y-1">
        {tier.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
            <Check size={10} className="text-green-400 flex-shrink-0" />{f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const set = (k, v) => setCard(c => ({ ...c, [k]: v }));

  const formatCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(card); }} className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Card Number</label>
        <input
          required
          value={card.number}
          onChange={e => set('number', formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
          inputMode="numeric"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Expiry</label>
          <input
            required
            value={card.expiry}
            onChange={e => set('expiry', formatExpiry(e.target.value))}
            placeholder="MM/YY"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">CVC</label>
          <input
            required
            value={card.cvc}
            onChange={e => set('cvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
            inputMode="numeric"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Cardholder Name</label>
        <input
          required
          value={card.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Full name on card"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          autoComplete="cc-name"
        />
      </div>
      <div className="flex flex-wrap gap-2 py-1">
        {CARD_BRANDS.map(b => (
          <span key={b.id} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">{b.emoji} {b.label}</span>
        ))}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
        {loading ? 'Processing…' : 'Pay Securely'}
      </button>
    </form>
  );
}

function CryptoForm({ onSubmit, loading }) {
  const [coin, setCoin] = useState('btc');
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Select Cryptocurrency</label>
        <div className="grid grid-cols-3 gap-2">
          {CRYPTO_COINS.map(c => (
            <button
              key={c.id}
              onClick={() => setCoin(c.id)}
              className={`py-2 rounded-lg border text-sm transition ${coin === c.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'}`}
            >
              <span className="text-base">{c.emoji}</span>
              <p className="text-xs mt-0.5">{c.label}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
        <p>After clicking Pay, you will receive a payment address and amount. Send the exact amount within 15 minutes to complete your purchase.</p>
      </div>
      <button
        onClick={() => onSubmit({ coin })}
        disabled={loading}
        className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Bitcoin size={16} />}
        {loading ? 'Generating address…' : `Pay with ${CRYPTO_COINS.find(c => c.id === coin)?.label}`}
      </button>
    </div>
  );
}

function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const format = (v) => v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16).replace(/(.{4})/g, '$1-').replace(/-$/, '');
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Gift Card Code</label>
        <input
          value={code}
          onChange={e => setCode(format(e.target.value))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-indigo-500"
        />
      </div>
      <button
        onClick={() => onSubmit({ code })}
        disabled={loading || code.replace(/-/g, '').length < 8}
        className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </div>
  );
}

export default function CheckoutPage({ onSuccess }) {
  const [billing, setBilling] = useState('monthly');
  const [tier, setTier] = useState(TIERS[1]);
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' });

  const processPayment = async (paymentData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          tier: tier.id,
          billing,
          method: payMethod,
          ...paymentData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payment failed');
      setSuccess(true);
      onSuccess?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">You're subscribed!</h2>
          <p className="text-gray-400">Your {tier.label} plan is now active.</p>
        </div>
      </div>
    );
  }

  const PAY_TABS = [
    { id: 'card',       label: 'Card',       icon: CreditCard },
    { id: 'crypto',     label: 'Crypto',     icon: Bitcoin },
    { id: 'gift_card',  label: 'Gift Card',  icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-gray-400 mt-2">Cancel anytime · Instant access · AES-256-GCM encrypted</p>
          <div className="flex items-center justify-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mt-4 w-fit mx-auto">
            <button onClick={() => setBilling('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billing === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Monthly</button>
            <button onClick={() => setBilling('annual')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billing === 'annual' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Annual <span className="text-green-400 text-xs">Save 33%</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TIERS.map(t => <TierCard key={t.id} tier={t} selected={tier} billing={billing} onSelect={setTier} />)}
        </div>

        {/* Payment section */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-green-400" />
            <span className="text-sm text-gray-300">Secure checkout · Powered by Stripe</span>
          </div>

          <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-5">
            {PAY_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setPayMethod(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition
                  ${payMethod === tab.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <tab.icon size={14} />{tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4 text-red-300 text-sm">
              <AlertCircle size={14} />{error}
            </div>
          )}

          {payMethod === 'card'      && <CardForm onSubmit={processPayment} loading={loading} />}
          {payMethod === 'crypto'    && <CryptoForm onSubmit={processPayment} loading={loading} />}
          {payMethod === 'gift_card' && <GiftCardForm onSubmit={processPayment} loading={loading} />}
        </div>
      </div>
    </div>
  );
}
