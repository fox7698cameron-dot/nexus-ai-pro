// src/components/SubscriptionDashboard.jsx
// Date: 2026-10-19
// Subscription management: Stripe, crypto, gift cards, plan comparison

import React, { useState, useEffect, useCallback } from 'react';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩' };
const CURRENCY_RATES = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, KRW: 1320 };

const CARD_PATTERNS = {
  Visa: /^4/,
  Mastercard: /^5[1-5]/,
  AmEx: /^3[47]/,
  Discover: /^6(?:011|5)/,
  Maestro: /^(?:5018|5020|5038|6304)/,
};

function detectCardType(num) {
  const stripped = num.replace(/\s/g, '');
  for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
    if (pattern.test(stripped)) return type;
  }
  return null;
}

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const PLANS_INFO = {
  free:       { label: 'Free',       badge: '🆓', color: 'gray',   monthly: 0,    yearly: 0 },
  pro:        { label: 'Pro',        badge: '⭐', color: 'blue',   monthly: 9.99,  yearly: 89.99 },
  enterprise: { label: 'Enterprise', badge: '🏆', color: 'purple', monthly: 49.99, yearly: 499.99 },
};

const PLAN_FEATURES = {
  free:       ['5 chats/day', 'Basic AI models', '1 MB uploads', 'Community support'],
  pro:        ['Unlimited chats', 'All AI models', '100 MB uploads', 'Priority support', '2FA', 'API access'],
  enterprise: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Custom models', 'White-label option'],
};

const CRYPTO_OPTIONS = [
  { symbol: 'BTC',  name: 'Bitcoin',       icon: '₿' },
  { symbol: 'ETH',  name: 'Ethereum',      icon: 'Ξ' },
  { symbol: 'USDC', name: 'USD Coin',      icon: '◎' },
  { symbol: 'USDT', name: 'Tether',        icon: '₮' },
  { symbol: 'SOL',  name: 'Solana',        icon: '◎' },
];

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('nexus:token');
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  return res.json();
}

// ---------- sub-components ----------

function PlanBadge({ plan, size = 'sm' }) {
  const info = PLANS_INFO[plan] || PLANS_INFO.free;
  const colors = {
    gray:   'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  };
  const sz = size === 'lg' ? 'text-base px-4 py-2' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sz} ${colors[info.color]}`}>
      {info.badge} {info.label}
    </span>
  );
}

function PriceDisplay({ amount, displayCurrency = 'USD', interval }) {
  const rate = CURRENCY_RATES[displayCurrency] || 1;
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || '$';
  const converted = (amount * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (amount === 0) return <span className="text-2xl font-bold text-gray-900 dark:text-white">Free</span>;
  return (
    <div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">{symbol}{converted}</span>
      {interval && <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/{interval}</span>}
    </div>
  );
}

function CancelConfirmModal({ plan, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="text-4xl text-center mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">Cancel Subscription?</h3>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          Your {PLANS_INFO[plan]?.label} plan will remain active until the end of the billing period.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Keep Plan
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
            Cancel Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- main component ----------

export default function SubscriptionDashboard({ user, socket }) {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview | payment | crypto | giftcard | history
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [interval, setInterval] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Card form state — NEVER logged, stored, or sent anywhere but the tokenization endpoint
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvv: '', name: '', zip: '' });
  const [cardType, setCardType] = useState(null);

  const [cryptoForm, setCryptoForm] = useState({ currency: 'ETH' });
  const [cryptoCheckout, setCryptoCheckout] = useState(null);
  const [giftCode, setGiftCode] = useState('');

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  useEffect(() => {
    const load = async () => {
      const [subData, planData, histData] = await Promise.all([
        apiFetch('/api/subscription/status'),
        apiFetch('/api/subscription/plans'),
        apiFetch('/api/subscription/billing-history'),
      ]);
      setSubscription(subData.subscription);
      setPlans(planData.plans);
      setBillingHistory(histData.history || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('subscription:updated', (data) => {
      if (data.userId === user?.userId) {
        setSubscription(s => ({ ...s, plan: data.plan, status: 'active' }));
        notify('success', `Plan upgraded to ${PLANS_INFO[data.plan]?.label}`);
      }
    });
    return () => socket.off('subscription:updated');
  }, [socket, user]);

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardForm(f => ({ ...f, number: formatted }));
    setCardType(detectCardType(formatted));
  };

  const handleCheckout = async (plan) => {
    if (plan === 'free') return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/subscription/checkout', {
        method: 'POST',
        body: { plan, interval },
      });
      if (data.error) { notify('error', data.error); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      notify('error', 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoCheckout = async () => {
    if (!subscription || subscription.plan === 'pro') return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/subscription/crypto/checkout', {
        method: 'POST',
        body: { plan: 'pro', currency: cryptoForm.currency, interval },
      });
      if (data.error) { notify('error', data.error); return; }
      setCryptoCheckout(data);
    } catch {
      notify('error', 'Failed to create crypto payment');
    } finally {
      setLoading(false);
    }
  };

  const handleGiftCardRedeem = async () => {
    if (!giftCode.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/subscription/giftcard/redeem', {
        method: 'POST',
        body: { code: giftCode.trim() },
      });
      if (data.error) { notify('error', data.error); return; }
      notify('success', data.message);
      setGiftCode('');
      setSubscription(s => ({ ...s, plan: 'pro', status: 'active' }));
    } catch {
      notify('error', 'Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setShowCancelModal(false);
    setLoading(true);
    try {
      const data = await apiFetch('/api/subscription/cancel', { method: 'POST', body: {} });
      if (data.error) { notify('error', data.error); return; }
      notify('success', data.message);
      setSubscription(s => ({ ...s, status: 'cancelling' }));
    } catch {
      notify('error', 'Cancellation failed');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = subscription?.plan || 'free';
  const tabs = ['overview', 'payment', 'crypto', 'giftcard', 'history'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your plan and billing</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={displayCurrency}
              onChange={e => setDisplayCurrency(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <PlanBadge plan={currentPlan} size="sm" />
          </div>
        </div>

        {/* Status message */}
        {message.text && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
            'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 mb-6 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {tab === 'giftcard' ? 'Gift Card' : tab}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h2>
                  <PlanBadge plan={currentPlan} size="lg" />
                </div>
                {subscription?.status === 'cancelling' && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">Cancelling</span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <PriceDisplay
                  amount={PLANS_INFO[currentPlan]?.[interval] || 0}
                  displayCurrency={displayCurrency}
                  interval={currentPlan !== 'free' ? interval : null}
                />
                <div className="flex gap-2">
                  {['monthly', 'yearly'].map(iv => (
                    <button key={iv} onClick={() => setInterval(iv)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        interval === iv ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {iv === 'yearly' ? 'Yearly (save 25%)' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
              {subscription?.renewsAt && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Renews {new Date(subscription.renewsAt).toLocaleDateString()}
                </p>
              )}
              {currentPlan !== 'free' && subscription?.status !== 'cancelling' && (
                <button onClick={() => setShowCancelModal(true)}
                  className="mt-4 text-sm text-red-500 hover:text-red-600 transition-colors">
                  Cancel subscription
                </button>
              )}
            </div>

            {/* Plan comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plans</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
                {Object.entries(PLANS_INFO).map(([planKey, info]) => (
                  <div key={planKey} className={`p-6 ${planKey === currentPlan ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{info.badge}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{info.label}</span>
                      {planKey === currentPlan && <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Current</span>}
                    </div>
                    <PriceDisplay
                      amount={info[interval] || 0}
                      displayCurrency={displayCurrency}
                      interval={planKey !== 'free' ? interval : null}
                    />
                    <ul className="mt-3 space-y-1.5">
                      {PLAN_FEATURES[planKey].map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    {planKey !== currentPlan && planKey !== 'free' && (
                      <button onClick={() => handleCheckout(planKey)} disabled={loading}
                        className="mt-4 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                        {loading ? 'Loading...' : `Upgrade to ${info.label}`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment tab */}
        {activeTab === 'payment' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Method</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
              🔒 Card details are sent directly to our payment processor (Stripe) and are never stored on our servers.
            </p>

            {/* Supported cards */}
            <div className="flex gap-2 mb-5">
              {['Visa', 'Mastercard', 'AmEx', 'Discover', 'Maestro'].map(brand => (
                <span key={brand}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    cardType === brand
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                  {brand}
                </span>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={cardForm.name}
                  onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  autoComplete="cc-name"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                {/* Card number is formatted client-side but never logged or persisted locally */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardForm.number}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  autoComplete="cc-number"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardForm.expiry}
                    onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/YY"
                    maxLength={5}
                    autoComplete="cc-exp"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardForm.cvv}
                    onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="123"
                    maxLength={4}
                    autoComplete="cc-csc"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing ZIP Code</label>
                <input
                  type="text"
                  value={cardForm.zip}
                  onChange={e => setCardForm(f => ({ ...f, zip: e.target.value.replace(/[^\dA-Za-z\s-]/g, '').slice(0, 10) }))}
                  placeholder="90210"
                  autoComplete="postal-code"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                onClick={() => handleCheckout('pro')}
                disabled={loading || !cardForm.number || !cardForm.expiry || !cardForm.cvv || !cardForm.name}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {loading ? 'Processing...' : 'Subscribe with Card'}
              </button>
            </div>
          </div>
        )}

        {/* Crypto tab */}
        {activeTab === 'crypto' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Crypto Payment</h2>

            {!cryptoCheckout ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pay with cryptocurrency. Select your preferred currency and we'll provide a wallet address.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CRYPTO_OPTIONS.map(({ symbol, name, icon }) => (
                    <button
                      key={symbol}
                      onClick={() => setCryptoForm({ currency: symbol })}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        cryptoForm.currency === symbol
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl font-bold">{icon}</div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white mt-1">{symbol}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{name}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCryptoCheckout}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {loading ? 'Loading...' : `Pay with ${cryptoForm.currency}`}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">Payment Address</h3>
                  <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                    Send exactly the amount shown to the address below. Include the memo to identify your payment.
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 font-mono text-xs break-all text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                    {cryptoCheckout.walletAddress}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Amount (USD)</span>
                      <div className="font-semibold text-gray-900 dark:text-white">${cryptoCheckout.amountUSD}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Currency</span>
                      <div className="font-semibold text-gray-900 dark:text-white">{cryptoCheckout.currency}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Reference/Memo</span>
                      <div className="font-semibold text-gray-900 dark:text-white font-mono">{cryptoCheckout.memo}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Expires</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {new Date(cryptoCheckout.expiresAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setCryptoCheckout(null)}
                  className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  Choose Different Currency
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gift Card tab */}
        {activeTab === 'giftcard' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Redeem Gift Card</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Enter your gift card code to activate Pro for 30 days.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={giftCode}
                onChange={e => setGiftCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                placeholder="NEXUS-XXXX-XXXX"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleGiftCardRedeem}
                disabled={loading || !giftCode.trim()}
                className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium transition-colors flex-shrink-0"
              >
                {loading ? '...' : 'Redeem'}
              </button>
            </div>
          </div>
        )}

        {/* Billing history tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing History</h2>
            </div>
            {billingHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500">No billing history yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      {['Date', 'Amount', 'Status', 'Invoice'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {billingHistory.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {CURRENCY_SYMBOLS[inv.currency] || ''}{inv.amount.toFixed(2)} {inv.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            inv.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {inv.pdf ? (
                            <a href={inv.pdf} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                              Download PDF
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {showCancelModal && (
        <CancelConfirmModal
          plan={currentPlan}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}
