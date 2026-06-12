// src/components/PaymentSystem.jsx
// 2026-06-12 | Subscription & payments: Stripe cards, crypto, gift cards
import React, { useState, useEffect } from 'react';
import {
  CreditCard, Wallet, Gift, Check, Crown, Star, Zap,
  Lock, Shield, AlertTriangle, Loader2, ChevronRight,
  Bitcoin, ExternalLink, Copy
} from 'lucide-react';

const PLAN_ICONS = { free: Zap, pro: Star, enterprise: Crown };
const PLAN_COLORS = {
  free: { border: 'border-gray-700', bg: 'bg-gray-900', accent: 'text-gray-300', button: 'bg-gray-700 hover:bg-gray-600' },
  pro: { border: 'border-blue-500', bg: 'bg-blue-500/5', accent: 'text-blue-400', button: 'bg-blue-600 hover:bg-blue-500' },
  enterprise: { border: 'border-purple-500', bg: 'bg-purple-500/5', accent: 'text-purple-400', button: 'bg-purple-600 hover:bg-purple-500' }
};

const CRYPTO_ICONS = {
  BTC: '₿', ETH: 'Ξ', USDC: '$', USDT: '₮', SOL: '◎', LTC: 'Ł', MATIC: '⬟'
};

const CARD_NETWORKS = [
  { name: 'Visa', icon: '💳' },
  { name: 'Mastercard', icon: '💳' },
  { name: 'Amex', icon: '💳' },
  { name: 'Discover', icon: '💳' },
  { name: 'JCB', icon: '💳' },
  { name: 'Diners', icon: '💳' },
  { name: 'UnionPay', icon: '💳' }
];

function PlanCard({ plan, current, onSelect }) {
  const Icon = PLAN_ICONS[plan.id] || Zap;
  const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.free;
  const isCurrent = current?.planId === plan.id;

  return (
    <div className={`relative rounded-2xl border p-5 transition-all ${colors.border} ${colors.bg} ${!isCurrent ? 'hover:scale-105' : ''}`}>
      {plan.id === 'pro' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">
          Most Popular
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.button}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-white">{plan.name}</p>
          <p className={`text-sm font-medium ${colors.accent}`}>
            {plan.priceUsd === 0 ? 'Free forever' : `$${(plan.priceUsd / 100).toFixed(2)}/mo`}
          </p>
        </div>
        {isCurrent && (
          <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
            Current
          </span>
        )}
      </div>

      {plan.id !== 'free' && (
        <button
          onClick={() => onSelect(plan)}
          disabled={isCurrent}
          className={`w-full py-2.5 rounded-xl text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${colors.button}`}
        >
          {isCurrent ? 'Active Plan' : 'Upgrade'} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function CryptoPaymentView({ plan, onBack }) {
  const [currency, setCurrency] = useState('BTC');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const cryptos = Object.keys(CRYPTO_ICONS);

  async function inititateCrypto() {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/crypto-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, currency })
      });
      if (res.ok) setPaymentInfo(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function copyAddress() {
    if (paymentInfo?.address) {
      navigator.clipboard.writeText(paymentInfo.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
        ← Back
      </button>
      <h3 className="font-semibold text-white">Pay with Cryptocurrency</h3>
      <div className="grid grid-cols-4 gap-2">
        {cryptos.map(c => (
          <button
            key={c}
            onClick={() => { setCurrency(c); setPaymentInfo(null); }}
            className={`p-2 rounded-xl border text-center text-sm font-mono transition ${
              currency === c ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <span className="text-lg block">{CRYPTO_ICONS[c]}</span>
            {c}
          </button>
        ))}
      </div>

      {!paymentInfo ? (
        <button
          onClick={inititateCrypto}
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
          Generate Payment Address
        </button>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Send {currency} to:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-yellow-400 font-mono break-all">{paymentInfo.address}</code>
              <button onClick={copyAddress} className="text-gray-400 hover:text-white">
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">{paymentInfo.instructions}</p>
          <p className="text-xs text-gray-500">
            Expires: {new Date(paymentInfo.expiresAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

function GiftCardView({ onBack, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function redeem() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/payments/redeem-gift-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase().trim() })
      });
      const data = await res.json();
      if (res.ok) { onSuccess(data); }
      else { setError(data.error || 'Invalid gift card code'); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
        ← Back
      </button>
      <h3 className="font-semibold text-white">Redeem Gift Card</h3>
      <input
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-center text-lg tracking-widest uppercase placeholder-gray-600 focus:border-green-500 focus:outline-none"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        value={code}
        onChange={e => setCode(e.target.value)}
        maxLength={24}
      />
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      <button
        onClick={redeem}
        disabled={loading || code.length < 8}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        Redeem
      </button>
    </div>
  );
}

export default function PaymentSystem({ token, currentUser }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [view, setView] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    async function load() {
      const [plansRes, subRes] = await Promise.all([
        fetch('/api/payments/plans'),
        token ? fetch('/api/payments/subscription', { headers }) : Promise.resolve(null)
      ]);
      if (plansRes.ok) setPlans((await plansRes.json()).plans || []);
      if (subRes?.ok) setSubscription(await subRes.json());
      setLoading(false);
    }
    load();
  }, [token]);

  async function startCardCheckout(plan) {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId: plan.id, method: 'card' })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  function handlePlanSelect(plan) {
    setSelectedPlan(plan);
    setView('checkout');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600/20 border border-green-500/30 rounded-lg flex items-center justify-center">
            <CreditCard size={16} className="text-green-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">Subscription</h1>
            {subscription && (
              <p className="text-xs text-gray-400">
                Current plan: <span className="text-white capitalize">{subscription.planId}</span>
              </p>
            )}
          </div>
        </div>

        {view === 'plans' && (
          <>
            <div className="grid gap-4">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} current={subscription} onSelect={handlePlanSelect} />
              ))}
            </div>

            {/* Accepted payment methods */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Accepted Payment Methods</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-blue-400" />
                  <div>
                    <p className="text-sm text-white font-medium">Credit & Debit Cards</p>
                    <p className="text-xs text-gray-500">{CARD_NETWORKS.map(n => n.name).join(' · ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Wallet size={16} className="text-yellow-400" />
                  <div>
                    <p className="text-sm text-white font-medium">Cryptocurrency</p>
                    <p className="text-xs text-gray-500">{Object.keys(CRYPTO_ICONS).join(' · ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Gift size={16} className="text-green-400" />
                  <div>
                    <p className="text-sm text-white font-medium">Gift Cards</p>
                    <p className="text-xs text-gray-500">Redeem Nexus AI Pro gift cards</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <Lock size={10} />
              <span>All payments secured by Stripe · SSL encrypted · PCI-DSS compliant</span>
            </div>
          </>
        )}

        {view === 'checkout' && selectedPlan && (
          <div className="space-y-4">
            <button onClick={() => setView('plans')} className="text-sm text-gray-400 hover:text-white">
              ← Back to plans
            </button>
            <h3 className="font-semibold text-white">Choose Payment Method — {selectedPlan.name}</h3>
            <div className="grid gap-3">
              <button
                onClick={() => startCardCheckout(selectedPlan)}
                className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition"
              >
                <CreditCard size={20} className="text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">Credit / Debit Card</p>
                  <p className="text-xs text-gray-400">Visa, Mastercard, Amex, and more</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-gray-500" />
              </button>
              <button
                onClick={() => setView('crypto')}
                className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-700 hover:border-yellow-500 rounded-xl text-left transition"
              >
                <Wallet size={20} className="text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-white">Cryptocurrency</p>
                  <p className="text-xs text-gray-400">BTC, ETH, USDC, SOL, and more</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-gray-500" />
              </button>
              <button
                onClick={() => setView('gift_card')}
                className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-700 hover:border-green-500 rounded-xl text-left transition"
              >
                <Gift size={20} className="text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">Gift Card</p>
                  <p className="text-xs text-gray-400">Redeem a Nexus AI Pro gift card</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {view === 'crypto' && selectedPlan && (
          <CryptoPaymentView plan={selectedPlan} onBack={() => setView('checkout')} />
        )}

        {view === 'gift_card' && (
          <GiftCardView
            onBack={() => setView('checkout')}
            onSuccess={(data) => {
              setSubscription(prev => ({ ...prev, planId: data.planId }));
              setView('plans');
            }}
          />
        )}
      </div>
    </div>
  );
}
