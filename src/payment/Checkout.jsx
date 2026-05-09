/*
 * Copyright © 2025-2026 Cameron Fox
 * Licensed under the Apache License, Version 2.0
 * File: src/payment/Checkout.jsx
 * Last updated: 2026-05-09
 */

import React, { useState, useEffect, useCallback } from 'react';

const API = {
  plans: '/api/subscriptions/plans',
  checkout: '/api/subscriptions/checkout',
};

const CARD_ICONS = [
  { name: 'Visa', icon: '💳', label: 'VISA' },
  { name: 'Mastercard', icon: '🔴', label: 'MC' },
  { name: 'Amex', icon: '🟦', label: 'AMEX' },
  { name: 'Discover', icon: '🟠', label: 'DISC' },
];

const CRYPTO_OPTIONS = [
  { token: 'BTC', label: 'Bitcoin', symbol: '₿' },
  { token: 'ETH', label: 'Ethereum', symbol: 'Ξ' },
  { token: 'USDC', label: 'USDC', symbol: '$' },
];

const TABS = ['card', 'crypto', 'gift'];
const TAB_LABELS = { card: 'Credit / Debit Card', crypto: 'Cryptocurrency', gift: 'Gift Card' };

const PLAN_COLORS = { free: 'border-gray-600', pro: 'border-indigo-500', enterprise: 'border-yellow-500' };
const PLAN_BADGES = {
  free: null,
  pro: { text: 'Popular', cls: 'bg-indigo-600 text-white' },
  enterprise: { text: 'Best Value', cls: 'bg-yellow-500 text-gray-900' },
};

function authHeaders() {
  const token = localStorage.getItem('nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Checkout({ user, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelected] = useState(null);
  const [tab, setTab] = useState('card');
  const [cryptoToken, setCrypto] = useState('BTC');
  const [giftCode, setGiftCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(true);
  const [message, setMessage] = useState(null);
  const currentPlan = user?.role?.toLowerCase() ?? 'free';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API.plans, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to load plans');
        const data = await res.json();
        if (!cancelled) {
          setPlans(data);
          const match = data.find(p => p.id?.toLowerCase() === currentPlan) ?? data[0];
          if (match) setSelected(match.id);
        }
      } catch (err) {
        if (!cancelled) setMessage({ type: 'error', text: err.message });
      } finally {
        if (!cancelled) setFetchingPlans(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPlan]);

  const handleCheckout = useCallback(async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setMessage(null);
    try {
      const body = { planId: selectedPlan, paymentMethod: tab };
      if (tab === 'crypto') body.cryptoToken = cryptoToken;
      if (tab === 'gift')   body.giftCode    = giftCode.trim();

      const res = await fetch(API.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);

      if (tab === 'card' && data.url) {
        const stripeKey = window.STRIPE_KEY;
        if (stripeKey && window.Stripe) {
          await window.Stripe(stripeKey).redirectToCheckout({ sessionId: data.sessionId ?? data.id });
        } else {
          window.location.href = data.url;
        }
        return;
      }

      setMessage({ type: 'success', text: data.message || 'Subscription updated successfully!' });
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, tab, cryptoToken, giftCode, onSuccess]);

  const canSubmit = selectedPlan && !loading && (tab !== 'gift' || giftCode.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Choose Your Plan</h1>
          <p className="mt-2 text-gray-400">Upgrade anytime. Cancel anytime.</p>
        </div>
        {message && (
          <div className={`rounded-lg p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-900 border border-green-600 text-green-300'
              : 'bg-red-900 border border-red-600 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {fetchingPlans ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse h-52" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <p className="text-center text-gray-500">No plans available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => {
              const key    = plan.id?.toLowerCase();
              const active = plan.id === selectedPlan;
              const isCurrent = key === currentPlan;
              const border = PLAN_COLORS[key] ?? 'border-gray-600';
              const badge  = PLAN_BADGES[key];
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelected(plan.id)}
                  className={`relative text-left rounded-xl border-2 p-6 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${active ? `${border} bg-gray-800` : 'border-gray-700 bg-gray-850 hover:bg-gray-800'}
                  `}
                >
                  {badge && (
                    <span className={`absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.text}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      Current
                    </span>
                  )}
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {plan.price === 0 || plan.price === '0' ? 'Free' : `$${Number(plan.price).toFixed(2)}`}
                      {plan.price !== 0 && plan.price !== '0' && (
                        <span className="text-sm font-normal text-gray-400">/mo</span>
                      )}
                    </p>
                    {plan.description && (
                      <p className="mt-2 text-sm text-gray-400">{plan.description}</p>
                    )}
                    {Array.isArray(plan.features) && (
                      <ul className="mt-3 space-y-1">
                        {plan.features.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="text-green-400">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {active && (
                    <div className={`mt-4 h-0.5 rounded-full ${border.replace('border-', 'bg-')}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-700">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors focus:outline-none
                  ${tab === t
                    ? 'bg-gray-900 text-white border-b-2 border-indigo-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                  }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {tab === 'card' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Securely pay with your card. You will be redirected to Stripe.</p>
                <div className="flex flex-wrap gap-3">
                  {CARD_ICONS.map(c => (
                    <div key={c.name}
                      title={c.name}
                      className="flex items-center gap-1 bg-gray-700 rounded-md px-3 py-2 text-sm font-mono font-bold text-gray-200 select-none"
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'crypto' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Pay with cryptocurrency. Select your preferred token.</p>
                <div className="flex flex-wrap gap-3">
                  {CRYPTO_OPTIONS.map(c => (
                    <button
                      key={c.token}
                      onClick={() => setCrypto(c.token)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none
                        ${cryptoToken === c.token
                          ? 'border-indigo-500 bg-indigo-900 text-indigo-200'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <span className="text-lg">{c.symbol}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'gift' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Enter your gift card code to redeem your subscription.</p>
                <input
                  type="text"
                  value={giftCode}
                  onChange={e => setGiftCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                />
              </div>
            )}

          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl font-semibold text-base transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500
            ${canSubmit
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </span>
            : 'Continue to Payment'
          }
        </button>

      </div>
    </div>
  );
}
