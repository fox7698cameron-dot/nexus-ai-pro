// src/components/SubscriptionManager.jsx
// Nexus AI Pro — Subscription & Payment Management
// Stripe, Crypto (ETH/BTC/USDC/SOL), Gift Cards
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Bitcoin, Gift, Crown, Star, Zap,
  CheckCircle, X, Loader2, RefreshCw, ArrowRight,
  Shield, Lock, Clock, AlertTriangle, Copy
} from 'lucide-react';

const PLAN_CONFIG = {
  free: {
    icon: Zap,   gradient: 'from-gray-600 to-gray-700',
    highlight: false,
    paymentMethods: [],
  },
  pro: {
    icon: Star,  gradient: 'from-blue-600 to-indigo-600',
    highlight: true,
    paymentMethods: ['card', 'crypto', 'gift'],
  },
  enterprise: {
    icon: Crown, gradient: 'from-purple-600 to-pink-600',
    highlight: false,
    paymentMethods: ['card', 'crypto', 'gift'],
  },
};

const CRYPTO_CURRENCIES = [
  { id: 'USDC',  label: 'USDC',    emoji: '💲', note: 'Stablecoin — recommended' },
  { id: 'ETH',   label: 'ETH',     emoji: '⟠',  note: 'Ethereum'                 },
  { id: 'BTC',   label: 'Bitcoin', emoji: '₿',  note: 'Bitcoin'                  },
  { id: 'SOL',   label: 'SOL',     emoji: '◎',  note: 'Solana'                   },
  { id: 'LTC',   label: 'LTC',     emoji: 'Ł',  note: 'Litecoin'                 },
  { id: 'DOGE',  label: 'DOGE',    emoji: '🐶', note: 'Dogecoin'                 },
];

function apiHeaders() {
  const token = localStorage.getItem('nexus:accessToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function PlanCard({ plan, currentPlan, onSelect }) {
  const cfg   = PLAN_CONFIG[plan.id] || {};
  const Icon  = cfg.icon || Zap;
  const isCurrent = currentPlan === plan.id;

  return (
    <div className={`relative border rounded-2xl p-6 flex flex-col transition-all ${
      cfg.highlight
        ? 'border-indigo-500 bg-gradient-to-b from-indigo-900/30 to-gray-900 shadow-lg shadow-indigo-500/20'
        : 'border-gray-700 bg-gray-900 hover:border-gray-500'
    }`}>
      {cfg.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
        </div>
      )}

      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} mb-4`}>
        <Icon size={22} className="text-white" />
      </div>

      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
      <div className="text-3xl font-bold text-white mb-1">
        {plan.priceUsd === 0 ? 'Free' : `$${(plan.priceUsd / 100).toFixed(2)}`}
        {plan.interval && <span className="text-base font-normal text-gray-400">/{plan.interval}</span>}
      </div>

      <ul className="space-y-2 mt-4 mb-6 flex-1">
        {(plan.features || []).map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
            <CheckCircle size={15} className="text-green-400 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="w-full py-3 bg-gray-700 text-gray-300 rounded-xl text-center text-sm font-medium">
          Current Plan
        </div>
      ) : plan.id === 'free' ? (
        <div className="w-full py-3 border border-gray-600 text-gray-400 rounded-xl text-center text-sm">
          Always free
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan.id)}
          className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-all bg-gradient-to-r ${cfg.gradient} hover:opacity-90 flex items-center justify-center gap-2`}
        >
          Upgrade to {plan.name} <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function StripeCheckoutButton({ planId, onStarted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const successUrl = window.location.origin + '/subscription/success';
      const cancelUrl  = window.location.href;
      const resp = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ planId, successUrl, cancelUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      if (data.mode === 'demo') {
        onStarted?.({ demo: true, url: data.url });
      } else {
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? 'Redirecting to checkout…' : 'Pay with Card'}
      </button>
      <p className="text-gray-500 text-xs text-center flex items-center justify-center gap-1">
        <Lock size={10} /> Secured by Stripe · Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay
      </p>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}

function CryptoPaymentPanel({ planId }) {
  const [currency, setCurrency] = useState('USDC');
  const [payment,  setPayment]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(false);

  const initPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/subscriptions/crypto', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ planId, currency }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setPayment(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {CRYPTO_CURRENCIES.map(c => (
          <button
            key={c.id}
            onClick={() => { setCurrency(c.id); setPayment(null); }}
            className={`py-2 px-3 rounded-lg text-sm border transition-all ${
              currency === c.id ? 'border-indigo-500 bg-indigo-900/20 text-white' : 'border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            <span className="mr-1">{c.emoji}</span> {c.id}
          </button>
        ))}
      </div>

      {!payment ? (
        <button
          onClick={initPayment}
          disabled={loading}
          className="w-full py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Bitcoin size={16} />}
          {loading ? 'Generating address…' : `Pay with ${currency}`}
        </button>
      ) : (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle size={16} /> Payment address generated
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Send exactly <strong className="text-white">{payment.amount} {currency}</strong> to:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-indigo-300 bg-gray-900 px-3 py-2 rounded-lg font-mono break-all">
                {payment.address}
              </code>
              <button onClick={copyAddress} className="shrink-0 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <Clock size={12} />
            Expires {new Date(payment.expiresAt).toLocaleTimeString()}
          </div>
          {payment.mode === 'demo' && (
            <p className="text-yellow-400 text-xs bg-yellow-900/20 border border-yellow-700 rounded p-2">
              Demo mode — configure CRYPTO_GATEWAY_KEY for live payments
            </p>
          )}
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

function GiftCardPanel() {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const redeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch('/api/subscriptions/gift-card/redeem', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={redeem} className="space-y-3">
      <div className="relative">
        <Gift size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="NEXUS-XXXXXXXXXX" required
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm font-mono tracking-widest"
        />
      </div>

      {result && (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg p-3 text-green-400 text-sm">
          <CheckCircle size={16} /> {result.message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SubscriptionManager() {
  const [plans,        setPlans]        = useState([]);
  const [current,      setCurrent]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentTab,   setPaymentTab]   = useState('card');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansResp, currentResp] = await Promise.all([
        fetch('/api/subscriptions/plans'),
        fetch('/api/subscriptions/current', { headers: apiHeaders() }),
      ]);
      if (plansResp.ok)   { const d = await plansResp.json();   setPlans(d.plans || []); }
      if (currentResp.ok) { const d = await currentResp.json(); setCurrent(d.subscription); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You can continue using premium features until the period ends.')) return;
    const resp = await fetch('/api/subscriptions/cancel', { method: 'DELETE', headers: apiHeaders() });
    if (resp.ok) fetchData();
  };

  const currentPlanId = current?.planId || 'free';

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <RefreshCw size={32} className="text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown size={28} className="text-purple-400" />
          Subscription
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Current plan: <span className="text-white font-medium capitalize">{currentPlanId}</span>
          {current?.status && ` · ${current.status}`}
          {current?.renewsAt && ` · Renews ${new Date(current.renewsAt).toLocaleDateString()}`}
        </p>
      </div>

      {/* Plans */}
      {!selectedPlan ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlanId}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setSelectedPlan(null)}
            className="flex items-center gap-2 text-gray-400 text-sm hover:text-gray-200 mb-6 transition-colors"
          >
            <X size={16} /> Back to plans
          </button>

          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg capitalize">Upgrade to {selectedPlan}</h2>
              <span className="text-indigo-400 font-bold">
                ${((plans.find(p => p.id === selectedPlan)?.priceUsd || 0) / 100).toFixed(2)}/mo
              </span>
            </div>

            {/* Payment method tabs */}
            <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-4">
              {[
                { id: 'card',   label: 'Card',       icon: CreditCard },
                { id: 'crypto', label: 'Crypto',      icon: Bitcoin    },
                { id: 'gift',   label: 'Gift Card',   icon: Gift       },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    paymentTab === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {paymentTab === 'card'   && <StripeCheckoutButton planId={selectedPlan} />}
            {paymentTab === 'crypto' && <CryptoPaymentPanel   planId={selectedPlan} />}
            {paymentTab === 'gift'   && <GiftCardPanel />}
          </div>

          <div className="flex items-center justify-center gap-4 text-gray-600 text-xs">
            <div className="flex items-center gap-1"><Shield size={12} /> PCI DSS compliant</div>
            <div className="flex items-center gap-1"><Lock size={12} /> 256-bit SSL</div>
            <div className="flex items-center gap-1"><RefreshCw size={12} /> Cancel anytime</div>
          </div>
        </div>
      )}

      {/* Current sub management */}
      {currentPlanId !== 'free' && !selectedPlan && (
        <div className="mt-8 max-w-md">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <h3 className="text-gray-300 font-medium mb-3">Manage Subscription</h3>
            <button
              onClick={cancelSubscription}
              className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              <X size={14} /> Cancel subscription
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
