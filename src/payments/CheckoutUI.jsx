/**
 * src/payments/CheckoutUI.jsx
 * Nexus AI Pro — Checkout UI
 * Stripe (Visa, MC, Amex, Discover, Maestro, UnionPay, Diners, JCB),
 * Crypto (BTC, ETH, USDT, USDC, SOL, LTC, DOGE), Gift Cards
 * Date: 2026-08-28
 */
import React, { useState, useEffect } from 'react';

const PLANS = [
  {
    id: 'free', name: 'Free', monthly: 0, yearly: 0, badge: '🆓',
    color: 'border-gray-200', highlight: false,
    features: ['5 chats/day', 'Basic models', '1 MB uploads'],
  },
  {
    id: 'pro', name: 'Pro', monthly: 9.99, yearly: 99.99, badge: '⭐',
    color: 'border-blue-400', highlight: false,
    features: ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support'],
  },
  {
    id: 'enterprise', name: 'Enterprise', monthly: 14.99, yearly: 149.99, badge: '👑',
    color: 'border-purple-500', highlight: true,
    features: ['Everything in Pro', 'Custom models', 'API access', 'SLA guarantee'],
  },
];

const CRYPTO_CURRENCIES = [
  { symbol: 'BTC',  name: 'Bitcoin',   icon: '₿' },
  { symbol: 'ETH',  name: 'Ethereum',  icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether',    icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin',  icon: '💲' },
  { symbol: 'SOL',  name: 'Solana',    icon: '◎' },
  { symbol: 'LTC',  name: 'Litecoin',  icon: 'Ł' },
  { symbol: 'DOGE', name: 'Dogecoin',  icon: 'Ð' },
];

const CARD_ICONS = { visa: '💳', mastercard: '🔴🟡', amex: '💙', discover: '🟠', jcb: '🇯🇵', unionpay: '🇨🇳' };

// ── Plan selector ──────────────────────────────────────────────────────────
function PlanSelector({ selected, billing, onSelect, onBillingChange }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2 mb-4">
        {['monthly', 'yearly'].map(b => (
          <button
            key={b}
            onClick={() => onBillingChange(b)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              billing === b
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {b === 'yearly' ? 'Yearly (save 17%)' : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            onClick={() => onSelect(plan)}
            className={`relative border-2 rounded-2xl p-4 cursor-pointer transition ${
              selected?.id === plan.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : `${plan.color} hover:border-indigo-300 dark:border-gray-600 dark:hover:border-indigo-600`
            } ${plan.highlight ? 'ring-2 ring-purple-400 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                Most Popular
              </div>
            )}
            <div className="text-2xl mb-1">{plan.badge}</div>
            <h3 className="font-bold text-gray-900 dark:text-white">{plan.name}</h3>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {plan[billing] === 0 ? 'Free' : `$${plan[billing]}`}
              {plan[billing] > 0 && <span className="text-sm text-gray-400 font-normal">/{billing === 'yearly' ? 'yr' : 'mo'}</span>}
            </p>
            <ul className="mt-3 space-y-1">
              {plan.features.map(f => (
                <li key={f} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stripe card form ───────────────────────────────────────────────────────
function StripeCardForm({ plan, billing, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    if (!plan || plan.id === 'free') return;
    const amount = Math.round(plan[billing] * 100);
    fetch('/api/payments/stripe/create-intent', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${localStorage.getItem('nexus:token')}`,
      },
      body: JSON.stringify({ planId: plan.id, billing, amount }),
    })
      .then(r => r.json())
      .then(d => setClientSecret(d.clientSecret))
      .catch(e => onError(e.message));
  }, [plan, billing]);

  const submit = async () => {
    if (!clientSecret) return;
    setLoading(true);
    // In production: use Stripe.js Elements for card collection
    // This calls our server which uses Stripe's secure payment flow
    try {
      const res = await fetch('/api/payments/stripe/confirm', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${localStorage.getItem('nexus:token')}`,
        },
        body: JSON.stringify({ clientSecret, planId: plan.id, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Card details (secured by Stripe)</p>
        {/* Stripe Elements mount point — in production, mount here */}
        <div id="stripe-card-element" className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-400 text-sm text-center">
          🔒 Stripe card input mounts here (Stripe.js required)
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {Object.entries(CARD_ICONS).map(([brand, icon]) => (
            <span key={brand} className="text-sm" title={brand}>{icon}</span>
          ))}
        </div>
      </div>
      <button
        onClick={submit}
        disabled={loading || !clientSecret}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
      >
        {loading
          ? '⏳ Processing…'
          : `💳 Pay $${plan?.[billing]?.toFixed(2) || '0.00'}`}
      </button>
    </div>
  );
}

// ── Crypto payment form ────────────────────────────────────────────────────
function CryptoPaymentForm({ plan, billing, onSuccess, onError }) {
  const [currency,    setCurrency]    = useState('BTC');
  const [payment,     setPayment]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [polling,     setPolling]     = useState(false);

  const initPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/crypto/create', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${localStorage.getItem('nexus:token')}`,
        },
        body: JSON.stringify({ planId: plan.id, billing, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayment(data);
      setPolling(true);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!polling || !payment) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/crypto/status/${payment.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        });
        const data = await res.json();
        if (data.status === 'confirmed') {
          setPolling(false);
          onSuccess(data);
        }
      } catch (e) { console.error(e); }
    }, 10_000);
    return () => clearInterval(interval);
  }, [polling, payment, onSuccess]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {CRYPTO_CURRENCIES.map(c => (
          <button
            key={c.symbol}
            onClick={() => setCurrency(c.symbol)}
            className={`flex flex-col items-center py-2 rounded-xl border-2 text-sm transition ${
              currency === c.symbol
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-100 dark:border-gray-600 hover:border-indigo-200'
            }`}
          >
            <span className="text-lg">{c.icon}</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{c.symbol}</span>
          </button>
        ))}
      </div>

      {!payment ? (
        <button
          onClick={initPayment}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
        >
          {loading ? '⏳ Generating address…' : `₿ Pay with ${currency}`}
        </button>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Send {currency} to:</p>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 font-mono text-xs break-all text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
            {payment.address}
          </div>
          <p className="text-xs text-gray-500">
            Amount: <strong>{payment.amount} {currency}</strong>
            {' '}≈ <strong>${plan?.[billing]?.toFixed(2)}</strong>
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            ⏰ Expires: {new Date(payment.expiresAt).toLocaleTimeString()}
          </p>
          {polling && (
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Waiting for blockchain confirmation…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Gift card form ─────────────────────────────────────────────────────────
function GiftCardForm({ onSuccess, onError }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [info,    setInfo]    = useState(null);

  const checkBalance = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/gift-card/check?code=${encodeURIComponent(code.trim())}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInfo(data);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const redeem = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${localStorage.getItem('nexus:token')}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      onSuccess(data);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (raw) => {
    const clean = raw.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
    return [clean.slice(0,8), clean.slice(8,16), clean.slice(16,24), clean.slice(24,32)]
      .filter(Boolean).join('-');
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        value={code}
        onChange={e => setCode(formatCode(e.target.value))}
        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-center dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
      />

      {info && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm">
          <p className="text-green-700 dark:text-green-300 font-semibold">
            🎁 Balance: ${(info.balance / 100).toFixed(2)} {info.currency?.toUpperCase()}
          </p>
          <p className="text-green-600 dark:text-green-400 text-xs">Status: {info.status}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={checkBalance}
          disabled={loading || !code}
          className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl py-2.5 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Check Balance
        </button>
        <button
          onClick={redeem}
          disabled={loading || !code || (info && info.status !== 'active')}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-2.5 text-sm transition disabled:opacity-50"
        >
          {loading ? '⏳' : '🎁 Redeem'}
        </button>
      </div>
    </div>
  );
}

// ── Main Checkout UI ───────────────────────────────────────────────────────
export default function CheckoutUI({ onComplete }) {
  const [plan,    setPlan]    = useState(PLANS[1]);
  const [billing, setBilling] = useState('monthly');
  const [method,  setMethod]  = useState('card'); // 'card' | 'crypto' | 'gift'
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const handleSuccess = (data) => {
    setSuccess(true);
    onComplete?.(data);
  };

  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h2>
        <p className="text-gray-400">Your subscription is now active.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">💎 Upgrade Plan</h2>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      <PlanSelector
        selected={plan}
        billing={billing}
        onSelect={setPlan}
        onBillingChange={setBilling}
      />

      {plan?.id !== 'free' && (
        <>
          {/* Payment method tabs */}
          <div className="flex gap-2 border-b border-gray-100 dark:border-gray-700">
            {[['card','💳 Card'], ['crypto','₿ Crypto'], ['gift','🎁 Gift Card']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={`pb-2 border-b-2 text-sm font-medium transition ${
                  method === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {method === 'card'   && <StripeCardForm   plan={plan} billing={billing} onSuccess={handleSuccess} onError={setError} />}
          {method === 'crypto' && <CryptoPaymentForm plan={plan} billing={billing} onSuccess={handleSuccess} onError={setError} />}
          {method === 'gift'   && <GiftCardForm onSuccess={handleSuccess} onError={setError} />}

          <p className="text-xs text-center text-gray-400">
            🔒 Secured by Stripe &amp; 256-bit encryption. Cancel anytime.
          </p>
        </>
      )}

      {plan?.id === 'free' && (
        <button
          onClick={() => handleSuccess({ plan: 'free' })}
          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl py-3 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Continue with Free Plan
        </button>
      )}
    </div>
  );
}
