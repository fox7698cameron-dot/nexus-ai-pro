// src/components/PaymentCheckout.jsx
// 2026-07-24 | Nexus AI Pro - Subscription & Payment UI
// Stripe cards, crypto, gift cards, all major card brands

import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, Gift, Crown, Star, CheckCircle2, Lock, Loader2 } from 'lucide-react';

const PLAN_ICONS = { free: '🆓', pro: '⭐', enterprise: '👑' };
const PLAN_COLORS = {
  free: 'border-gray-600',
  pro: 'border-blue-500 ring-1 ring-blue-500',
  enterprise: 'border-purple-500 ring-1 ring-purple-500',
};
const PLAN_BADGE_BG = {
  free: 'bg-gray-700',
  pro: 'bg-blue-600',
  enterprise: 'bg-purple-600',
};

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Discover', 'Diners', 'UnionPay', 'JCB'];
const CRYPTO_COINS = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'MATIC'];

function PlanCard({ plan, current, onSelect }) {
  const isCurrent = current?.planId === plan.id;
  const isFree = plan.priceMonthly === 0;

  return (
    <div className={`bg-gray-800 rounded-2xl border p-5 flex flex-col gap-3 ${PLAN_COLORS[plan.id]} ${isCurrent ? 'opacity-80' : 'hover:bg-gray-750 cursor-pointer'} transition-all`}
      onClick={() => !isCurrent && !isFree && onSelect(plan)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{PLAN_ICONS[plan.id]}</span>
          <span className="font-bold text-white">{plan.name}</span>
        </div>
        {isCurrent && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_BADGE_BG[plan.id]} text-white`}>
            Current
          </span>
        )}
      </div>

      <div className="text-2xl font-bold text-white">
        {isFree ? 'Free' : `$${(plan.priceMonthly / 100).toFixed(2)}/mo`}
      </div>

      <ul className="space-y-1.5">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
            <CheckCircle2 size={14} className="text-green-400 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {!isFree && !isCurrent && (
        <button className={`mt-2 py-2 rounded-lg text-sm font-medium text-white ${PLAN_BADGE_BG[plan.id]} hover:opacity-90 transition-opacity`}>
          Upgrade to {plan.name}
        </button>
      )}
    </div>
  );
}

function GiftCardRedemption({ onRedeem }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:accessToken')}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) onRedeem?.(data.planId);
    } catch {
      setResult({ success: false, error: 'Network error.' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-yellow-400" />
        <h3 className="font-semibold text-white">Redeem Gift Card</h3>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="NEXUS-XXXXXXXX"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500 uppercase tracking-wider font-mono"
        />
        <button
          onClick={handle}
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Redeem
        </button>
      </div>
      {result && (
        <p className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
          {result.success ? `✅ ${result.message}` : `❌ ${result.error}`}
        </p>
      )}
    </div>
  );
}

export function PaymentCheckout({ user }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [mode, setMode] = useState('plans'); // 'plans' | 'checkout' | 'crypto'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('nexus:accessToken');
    Promise.all([
      fetch('/api/payments/plans').then(r => r.json()),
      fetch('/api/payments/subscription', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([p, s]) => { setPlans(p); setSubscription(s); });
  }, []);

  const handleStripeCheckout = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:accessToken')}` },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      /* handle error */
    }
    setLoading(false);
  };

  const handleCryptoCheckout = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/crypto-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:accessToken')}` },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (data.hostedUrl) window.open(data.hostedUrl, '_blank');
    } catch {
      /* handle error */
    }
    setLoading(false);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setMode('checkout');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-2">
        <Crown size={22} className="text-yellow-400" />
        <div>
          <h2 className="text-xl font-bold text-white">Plans & Billing</h2>
          <p className="text-sm text-gray-400">
            Current plan: <span className="text-white font-medium capitalize">{subscription?.planId || 'Free'}</span>
          </p>
        </div>
      </div>

      {mode === 'plans' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} current={subscription} onSelect={handlePlanSelect} />
            ))}
          </div>
          <GiftCardRedemption onRedeem={(planId) => setSubscription(s => ({ ...s, planId }))} />
        </>
      )}

      {mode === 'checkout' && selectedPlan && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md mx-auto space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">{selectedPlan.name} Plan</h3>
            <p className="text-3xl font-bold text-white mt-1">
              ${(selectedPlan.priceMonthly / 100).toFixed(2)}<span className="text-sm text-gray-400">/month</span>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-400" />
              Pay with Card
            </p>
            <p className="text-xs text-gray-500">Accepts: {CARD_BRANDS.join(' · ')}</p>
            <button
              onClick={handleStripeCheckout}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Pay with Stripe
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-gray-800 text-xs text-gray-500">or</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              Pay with Crypto
            </p>
            <p className="text-xs text-gray-500">Accepts: {CRYPTO_COINS.join(' · ')}</p>
            <button
              onClick={handleCryptoCheckout}
              disabled={loading}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
            >
              Pay with Crypto (Coinbase Commerce)
            </button>
          </div>

          <button onClick={() => setMode('plans')} className="w-full text-gray-400 hover:text-white text-sm transition-colors py-2">
            ← Back to plans
          </button>

          <p className="text-center text-xs text-gray-600">
            <Lock size={10} className="inline mr-1" />
            Secured by Stripe · SSL encrypted
          </p>
        </div>
      )}
    </div>
  );
}

export default PaymentCheckout;
