// src/payments/Checkout.jsx
// Nexus AI Pro - Subscription & Payment UI
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Zap, Crown, Star, CheckCircle, Shield, Lock,
  Gift, Bitcoin, ChevronRight, Loader2, AlertCircle, ExternalLink
} from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    color: 'from-gray-400 to-gray-600',
    border: 'border-gray-200 dark:border-gray-700',
    icon: Star,
    features: ['5 AI chats/day', 'Basic models (GPT-4, Claude Sonnet)', '1MB file uploads', 'Community support'],
    badge: null,
    cta: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    color: 'from-blue-500 to-purple-600',
    border: 'border-blue-300 dark:border-blue-700',
    icon: Zap,
    features: ['Unlimited AI chats', 'All 25+ models', '100MB file uploads', 'Priority support', 'Analytics dashboard', 'Project tracking'],
    badge: 'Popular',
    cta: 'Get Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$14.99',
    period: '/month',
    color: 'from-purple-500 to-pink-600',
    border: 'border-purple-300 dark:border-purple-700',
    icon: Crown,
    features: ['Everything in Pro', 'Custom AI models', 'Full API access', 'Dedicated support + SLA', 'Game engine connectors', 'All cloud integrations', 'Admin dashboard'],
    badge: 'Best Value',
    cta: 'Get Enterprise',
  },
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, detail: 'Visa, Mastercard, Amex, Discover, UnionPay' },
  { id: 'crypto', label: 'Cryptocurrency', icon: Bitcoin, detail: 'BTC, ETH, USDC, USDT, SOL' },
  { id: 'gift', label: 'Gift Card', icon: Gift, detail: 'Redeem a Nexus AI Pro gift card' },
];

function PlanCard({ plan, currentPlan, onSelect, loading }) {
  const Icon = plan.icon;
  const isCurrent = plan.id === currentPlan;
  return (
    <div className={`relative rounded-xl border-2 p-5 transition-all ${
      isCurrent ? 'border-purple-500 shadow-lg' : plan.border
    } bg-white dark:bg-gray-800`}>
      {plan.badge && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${plan.color} text-white shadow`}>
          {plan.badge}
        </span>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${plan.color} text-white`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
            <span className="text-sm text-gray-500">{plan.period}</span>
          </div>
        </div>
      </div>
      <ul className="space-y-2 mb-5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(plan)}
        disabled={loading || isCurrent || plan.id === 'free'}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          isCurrent
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default'
            : plan.id === 'free'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default'
            : `bg-gradient-to-r ${plan.color} text-white hover:shadow-md disabled:opacity-60`
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
        {isCurrent ? 'Current Plan' : plan.cta}
      </button>
    </div>
  );
}

function CryptoPayment({ plan, onCancel }) {
  const CRYPTOS = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: '#f7931a' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea' },
    { symbol: 'USDC', name: 'USD Coin', icon: '◎', color: '#2775ca' },
    { symbol: 'USDT', name: 'Tether', icon: '₮', color: '#26a17b' },
    { symbol: 'SOL', name: 'Solana', icon: '◎', color: '#9945ff' },
  ];
  const [selected, setSelected] = useState('USDC');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('nexus_access_token')}`,
        },
        body: JSON.stringify({ plan: plan.id, currency: selected }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pay with Crypto</h3>
      <div className="grid grid-cols-5 gap-2">
        {CRYPTOS.map(c => (
          <button
            key={c.symbol}
            onClick={() => setSelected(c.symbol)}
            className={`p-2.5 rounded-lg border text-center text-xs transition-colors ${
              selected === c.symbol ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="text-lg block" style={{ color: c.color }}>{c.icon}</span>
            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{c.symbol}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Payments processed securely via Stripe Crypto. Wallet address provided after selection.</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handlePay} disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
          Continue
        </button>
      </div>
    </div>
  );
}

function GiftCardForm({ onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('nexus_access_token')}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid gift card'); return; }
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Gift size={18} className="text-purple-600" /> Redeem Gift Card</h3>
      {result ? (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 text-center">
          <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
          <p className="font-semibold text-green-700 dark:text-green-300">Gift card applied!</p>
          {result.amountOff && <p className="text-sm text-green-600">${(result.amountOff / 100).toFixed(2)} off your next order</p>}
          {result.percentOff && <p className="text-sm text-green-600">{result.percentOff}% off your next order</p>}
        </div>
      ) : (
        <>
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-sm flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
          <form onSubmit={handleRedeem} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full py-2.5 px-3 font-mono border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading || !code.trim()} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                Redeem
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function Checkout({ currentPlan = 'free', userId, userEmail }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billingHistory, setBillingHistory] = useState([]);

  useEffect(() => {
    const fetchBilling = async () => {
      const token = sessionStorage.getItem('nexus_access_token');
      if (!token) return;
      try {
        const res = await fetch('/api/payments/billing', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setBillingHistory(data.invoices || []); }
      } catch { /* ignore */ }
    };
    fetchBilling();
  }, []);

  const handleSubscribe = async (plan) => {
    if (plan.id === 'free') return;
    setSelectedPlan(plan);
    if (paymentMethod === 'card') {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('nexus_access_token')}`,
          },
          body: JSON.stringify({
            plan: plan.id,
            successUrl: `${window.location.origin}/?payment=success`,
            cancelUrl: `${window.location.origin}/?payment=cancelled`,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Payment setup failed'); return; }
        if (data.url) window.location.href = data.url;
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription & Billing</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose the plan that fits your needs</p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-sm flex items-center gap-2"><AlertCircle size={14} />{error}</div>}

      {/* Payment method tabs */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl p-1.5 border border-gray-200 dark:border-gray-700 w-fit">
        {PAYMENT_METHODS.map(m => (
          <button
            key={m.id}
            onClick={() => setPaymentMethod(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              paymentMethod === m.id ? 'bg-purple-600 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
            }`}
          >
            <m.icon size={12} /> {m.label}
          </button>
        ))}
      </div>

      {paymentMethod === 'crypto' && selectedPlan ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 max-w-md">
          <CryptoPayment plan={selectedPlan} onCancel={() => setSelectedPlan(null)} />
        </div>
      ) : paymentMethod === 'gift' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 max-w-md">
          <GiftCardForm onCancel={() => setPaymentMethod('card')} />
        </div>
      ) : (
        <>
          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} onSelect={handleSubscribe} loading={loading} />
            ))}
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 max-w-lg">
            <Shield size={20} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">Secure payments via Stripe</p>
              <p className="text-xs">Visa · Mastercard · Amex · Discover · UnionPay · CashApp · ACH · Crypto</p>
            </div>
            <Lock size={16} className="text-gray-400 ml-auto flex-shrink-0" />
          </div>
        </>
      )}

      {/* Billing history */}
      {billingHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Billing History</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {['Date', 'Description', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {billingHistory.map((inv, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(inv.date * 1000).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{inv.description}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">${(inv.amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.status === 'paid' ? <CheckCircle size={10} /> : null}
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
