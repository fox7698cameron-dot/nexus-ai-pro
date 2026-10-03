// src/components/CheckoutSystem.jsx
// Date: 2026-10-03
// Checkout: Stripe (Visa/Mastercard/Amex/Discover), crypto, gift cards

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Lock, Check, ArrowRight,
  AlertTriangle, Shield, Zap, Star, Crown
} from 'lucide-react';

const PLANS = [
  {
    id: 'pro', name: 'Pro', price: '$9.99', priceAnnual: '$99.90',
    icon: Star, color: 'blue',
    features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'Analytics dashboard']
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$14.99', priceAnnual: '$149.90',
    icon: Crown, color: 'purple',
    features: ['Everything in Pro', 'Custom AI models', 'API access', 'Game engine connectors', 'Dedicated SLA', 'Admin panel']
  }
];

const PAYMENT_METHODS = [
  { id: 'card',      label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, Amex, Discover, UnionPay, JCB' },
  { id: 'crypto',    label: 'Cryptocurrency',    icon: Bitcoin,    description: 'BTC, ETH, USDT, USDC, SOL, LTC, XRP' },
  { id: 'giftcard',  label: 'Gift Card',         icon: Gift,       description: 'Redeem a Nexus AI Pro gift card code' }
];

const CRYPTO_OPTIONS = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'LTC', 'XRP'];

function PlanCard({ plan, selected, onSelect, interval }) {
  const PlanIcon = plan.icon;
  const price = interval === 'monthly' ? plan.price : plan.priceAnnual;
  return (
    <button
      onClick={() => onSelect(plan.id)}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? `border-${plan.color}-500 bg-${plan.color}-50 dark:bg-${plan.color}-900/20`
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } bg-white dark:bg-gray-800`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlanIcon size={20} className={`text-${plan.color}-500`} />
          <span className="font-bold text-gray-900 dark:text-white">{plan.name}</span>
        </div>
        <div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{price}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
      </div>
      <ul className="space-y-1">
        {plan.features.map(f => (
          <li key={f} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Check size={12} className="text-green-500 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const handle = e => setCard(c => ({ ...c, [e.target.name]: e.target.value }));

  const formatCardNumber = v => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = v => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
  };

  const submit = e => {
    e.preventDefault();
    onSubmit({ type: 'card', ...card });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400 items-center">
        <span>Accepted:</span>
        {['Visa', 'Mastercard', 'Amex', 'Discover', 'UnionPay', 'JCB'].map(c => (
          <span key={c} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{c}</span>
        ))}
      </div>
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Cardholder Name</label>
        <input
          name="name" value={card.name} onChange={handle} required
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Name on card"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Card Number</label>
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="number" required
            value={card.number}
            onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none tracking-widest"
            placeholder="1234 5678 9012 3456"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Expiry</label>
          <input
            name="expiry" required
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="MM/YY"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">CVC</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="cvc" required maxLength={4}
              value={card.cvc}
              onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="123"
            />
          </div>
        </div>
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        <Lock size={16} />
        {loading ? 'Processing...' : 'Pay Securely'}
      </button>
    </form>
  );
}

function CryptoForm({ onSubmit, loading }) {
  const [coin, setCoin] = useState('BTC');
  const submit = e => { e.preventDefault(); onSubmit({ type: 'crypto', coin }); };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Select Cryptocurrency</label>
        <div className="grid grid-cols-4 gap-2">
          {CRYPTO_OPTIONS.map(c => (
            <button
              key={c} type="button" onClick={() => setCoin(c)}
              className={`py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                coin === c ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >{c}</button>
          ))}
        </div>
      </div>
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
        <strong>Note:</strong> Configure your crypto payment gateway (Coinbase Commerce, BitPay, etc.) via CRYPTO_PAYMENT_GATEWAY_KEY environment variable.
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors"
      >
        <Bitcoin size={16} />
        {loading ? 'Processing...' : `Pay with ${coin}`}
      </button>
    </form>
  );
}

function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const submit = e => { e.preventDefault(); onSubmit({ type: 'giftcard', code }); };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Gift Card Code</label>
        <input
          value={code} onChange={e => setCode(e.target.value.toUpperCase())} required
          className="w-full px-4 py-3 text-center font-mono tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="NEXUS-XXXX-XXXX"
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
      >
        <Gift size={16} />
        {loading ? 'Redeeming...' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

export default function CheckoutSystem({ onClose }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [interval, setInterval] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (paymentData) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('nexus:accessToken');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      if (paymentData.type === 'card') {
        const res = await fetch('/api/payments/create-checkout', {
          method: 'POST', headers,
          body: JSON.stringify({ plan: selectedPlan, interval })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.url) window.open(data.url, '_blank');
        setResult({ success: true, message: 'Redirecting to secure checkout...' });
      } else if (paymentData.type === 'crypto') {
        const res = await fetch('/api/payments/crypto-checkout', {
          method: 'POST', headers,
          body: JSON.stringify({ plan: selectedPlan, cryptoCurrency: paymentData.coin })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult({ success: true, ...data });
      } else if (paymentData.type === 'giftcard') {
        const res = await fetch('/api/payments/gift-card/redeem', {
          method: 'POST', headers,
          body: JSON.stringify({ code: paymentData.code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult({ success: true, message: data.message });
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result?.success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {result.message || 'Payment Successful!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your subscription is now active.</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-green-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upgrade Plan</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Billing interval */}
          <div className="flex items-center gap-2 justify-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit mx-auto">
            {['monthly', 'annual'].map(i => (
              <button
                key={i} onClick={() => setInterval(i)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                  interval === i ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >{i} {i === 'annual' && <span className="text-green-500 text-xs ml-1">Save 17%</span>}</button>
            ))}
          </div>

          {/* Plan selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANS.map(plan => (
              <PlanCard key={plan.id} plan={plan} selected={selectedPlan === plan.id} onSelect={setSelectedPlan} interval={interval} />
            ))}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm transition-all ${
                      paymentMethod === m.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={18} className={paymentMethod === m.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'} />
                    <span className={`font-medium text-xs ${paymentMethod === m.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.description}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {paymentMethod === 'card'     && <CardForm onSubmit={handleSubmit} loading={loading} />}
            {paymentMethod === 'crypto'   && <CryptoForm onSubmit={handleSubmit} loading={loading} />}
            {paymentMethod === 'giftcard' && <GiftCardForm onSubmit={handleSubmit} loading={loading} />}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 justify-center">
            <Lock size={12} />
            Payments processed securely via Stripe. Your data is encrypted.
          </div>
        </div>
      </div>
    </div>
  );
}
