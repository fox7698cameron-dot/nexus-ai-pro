// src/checkout/CheckoutSystem.jsx
// Date: 2026-07-08
// Stripe checkout, crypto payments, gift card redemption - all major cards supported

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Zap, Gift, CheckCircle, AlertCircle,
  Loader2, Shield, Star, Crown, Sparkles, Bitcoin,
  ChevronRight, X, Globe
} from 'lucide-react';

const PLAN_DISPLAY = {
  free: { name: 'Free', price: '$0', icon: '🆓', color: 'from-gray-400 to-gray-600', border: 'border-gray-200 dark:border-gray-600' },
  pro: { name: 'Pro', price: '$9.99/mo', yearlyPrice: '$99.90/yr', icon: '⭐', color: 'from-blue-400 to-blue-600', border: 'border-blue-300 dark:border-blue-600' },
  enterprise: { name: 'Enterprise', price: '$14.99/mo', yearlyPrice: '$149.90/yr', icon: '👑', color: 'from-purple-400 to-pink-600', border: 'border-purple-300 dark:border-purple-600' }
};

const CRYPTO_CURRENCIES = [
  { code: 'BTC', name: 'Bitcoin', emoji: '₿' },
  { code: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
  { code: 'USDC', name: 'USD Coin', emoji: '💵' },
  { code: 'USDT', name: 'Tether', emoji: '₮' },
  { code: 'SOL', name: 'Solana', emoji: '◎' },
  { code: 'MATIC', name: 'Polygon', emoji: '⬡' }
];

const ACCEPTED_CARDS = ['Visa', 'Mastercard', 'American Express', 'Discover', 'Diners', 'JCB', 'UnionPay'];

function PlanCard({ plan, selected, onSelect, billingCycle }) {
  const cfg = PLAN_DISPLAY[plan.id] || {};
  const price = billingCycle === 'yearly' && cfg.yearlyPrice ? cfg.yearlyPrice : cfg.price;

  return (
    <button
      onClick={() => onSelect(plan.id)}
      className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all ${
        selected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : cfg.border || 'border-gray-200 dark:border-gray-600'
      } bg-white dark:bg-gray-800`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
          <CheckCircle size={12} className="text-white" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{cfg.icon}</span>
        <span className="font-bold text-gray-900 dark:text-white">{plan.name}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{price}</div>
      {billingCycle === 'yearly' && plan.id !== 'free' && (
        <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5">Save ~17%</span>
      )}
      <ul className="mt-3 space-y-1">
        {(plan.features || []).slice(0, 4).map((f, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function CryptoPayment({ plan, billingCycle, token }) {
  const [currency, setCurrency] = useState('USDC');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const initiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/subscriptions/crypto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, currency, billingCycle })
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setPayment(d);
    } catch {
      setError('Failed to initiate crypto payment');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (payment?.walletAddress) {
      navigator.clipboard.writeText(payment.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {CRYPTO_CURRENCIES.map(c => (
          <button
            key={c.code}
            onClick={() => { setCurrency(c.code); setPayment(null); }}
            className={`flex flex-col items-center p-2 rounded-xl border-2 transition-colors ${
              currency === c.code ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-lg">{c.emoji}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">{c.code}</span>
          </button>
        ))}
      </div>

      {!payment ? (
        <button onClick={initiate} disabled={loading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Bitcoin size={16} />}
          Get {currency} Payment Address
        </button>
      ) : (
        <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{payment.amount} {currency}</p>
            <p className="text-xs text-gray-500">≈ ${payment.usdAmount} USD</p>
          </div>
          {payment.walletAddress && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Send to:</p>
              <button onClick={copyAddress} className="w-full text-left font-mono text-xs bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600 break-all hover:bg-gray-50 dark:hover:bg-gray-600">
                {payment.walletAddress}
                <span className={`ml-2 text-blue-500 ${copied ? 'opacity-100' : 'opacity-50'}`}>{copied ? '✓ Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">
            Memo: <span className="font-mono font-bold">{payment.memo}</span>
            <br />Expires: {new Date(payment.expiresAt).toLocaleTimeString()}
          </p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} /> {error}</p>}
    </div>
  );
}

function GiftCardRedemption({ token, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const redeem = async () => {
    if (!code.trim()) { setError('Enter a gift card code'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/subscriptions/gift-card/redeem', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() })
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setSuccess(d);
      onSuccess?.(d);
    } catch {
      setError('Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-3 py-4">
        <CheckCircle size={40} className="mx-auto text-green-500" />
        <p className="font-bold text-gray-900 dark:text-white">Gift Card Redeemed!</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {PLAN_DISPLAY[success.plan]?.name} plan activated ({success.billingCycle})
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">Enter your gift card code (format: XXXX-XXXX-XXXX-XXXX)</p>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        maxLength={19}
        className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button onClick={redeem} disabled={loading || !code} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        Redeem Gift Card
      </button>
      {error && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} /> {error}</p>}
    </div>
  );
}

export default function CheckoutSystem({ token, currentPlan = 'free', onSuccess, onClose }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/subscriptions/plans')
      .then(r => r.json())
      .then(d => setPlans(d.plans || []))
      .catch(() => {});
  }, []);

  const handleStripeCheckout = async () => {
    if (!token) { setError('Please sign in to subscribe'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, billingCycle })
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      if (d.url) window.location.href = d.url;
    } catch {
      setError('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard size={24} className="text-blue-500" /> Upgrade Plan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Choose the right plan for your needs</p>
          </div>
          {onClose && <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={20} /></button>}
        </div>

        {/* Current plan */}
        {currentPlan && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            Current plan: <strong>{PLAN_DISPLAY[currentPlan]?.name || currentPlan}</strong>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {['monthly', 'yearly'].map(cycle => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                billingCycle === cycle ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {cycle === 'yearly' ? '🎉 Yearly (-17%)' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan === plan.id}
              onSelect={setSelectedPlan}
              billingCycle={billingCycle}
            />
          ))}
        </div>

        {selectedPlan !== 'free' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Method</h3>

            {/* Payment method tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'crypto', label: 'Crypto', icon: Bitcoin },
                { id: 'gift', label: 'Gift Card', icon: Gift }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    paymentMethod === id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {ACCEPTED_CARDS.map(card => (
                    <span key={card} className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5 text-gray-600 dark:text-gray-300">{card}</span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <Shield size={14} className="text-green-500" />
                  Secured by Stripe. We never store your card details.
                </p>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
                <button
                  onClick={handleStripeCheckout}
                  disabled={loading || !token}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Pay with Card
                </button>
                {!token && <p className="text-xs text-gray-400 text-center">Sign in required to subscribe</p>}
              </div>
            )}

            {paymentMethod === 'crypto' && (
              <CryptoPayment plan={selectedPlan} billingCycle={billingCycle} token={token} />
            )}

            {paymentMethod === 'gift' && (
              <GiftCardRedemption token={token} onSuccess={(d) => { onSuccess?.(d); }} />
            )}
          </div>
        )}

        {selectedPlan === 'free' && (
          <div className="text-center py-6">
            <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
            <p className="font-medium text-gray-900 dark:text-white">You're on the Free plan</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select Pro or Enterprise to upgrade</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
          <Globe size={12} /> All prices in USD · Multi-currency supported via crypto
        </p>
      </div>
    </div>
  );
}
