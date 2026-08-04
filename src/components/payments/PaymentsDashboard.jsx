/**
 * PaymentsDashboard.jsx — Subscription & Payments UI
 * Nexus AI Pro | 2026-08-04
 *
 * Supports: Stripe (Visa, Mastercard, Amex, Discover, Diners, JCB, UnionPay),
 *           Crypto (BTC, ETH, USDC), Gift cards
 * Features: Plan selection, checkout, subscription management
 */

import React, { useState, useCallback } from 'react';
import {
  CreditCard, Zap, Crown, Star, Check, X, Gift,
  Bitcoin, RefreshCw, Shield, Lock, ChevronDown,
  AlertCircle, CheckCircle, Clock, Download,
} from 'lucide-react';

// ─── Plan Definitions ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    icon: '🆓',
    color: 'from-gray-400 to-gray-600',
    borderColor: 'border-gray-200 dark:border-gray-700',
    features: [
      '5 AI chats per day',
      'Basic models (GPT-4, Claude Sonnet)',
      '1 MB file uploads',
      'Community support',
      'Web app access',
    ],
    notIncluded: [
      'Unlimited chats',
      'Advanced models',
      'Priority support',
      'API access',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    icon: '⭐',
    color: 'from-blue-500 to-blue-700',
    borderColor: 'border-blue-400',
    features: [
      'Unlimited AI chats',
      'All models including o1, GPT-5, Claude Opus',
      '100 MB file uploads',
      'Priority support',
      'Analytics dashboard',
      'Game dev tracking',
      'Desktop & mobile apps',
    ],
    notIncluded: [
      'Dedicated support',
      'Custom models',
      'SLA guarantee',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    period: 'month',
    icon: '👑',
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-400',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'API access',
      'Dedicated support manager',
      '99.9% SLA guarantee',
      'Custom integrations',
      'Team seats (up to 50)',
      'SAML SSO',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const CARD_BRANDS = [
  { name: 'Visa',       icon: '💳', code: 'visa' },
  { name: 'Mastercard', icon: '🟠', code: 'mastercard' },
  { name: 'Amex',       icon: '🔵', code: 'amex' },
  { name: 'Discover',   icon: '🟡', code: 'discover' },
  { name: 'Diners',     icon: '⬜', code: 'diners' },
  { name: 'JCB',        icon: '🟢', code: 'jcb' },
  { name: 'UnionPay',   icon: '🔴', code: 'unionpay' },
];

const CRYPTO_OPTIONS = [
  { name: 'Bitcoin',  symbol: 'BTC', icon: '₿', network: 'Bitcoin' },
  { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', network: 'Ethereum' },
  { name: 'USDC',     symbol: 'USDC', icon: '💵', network: 'Ethereum/Solana' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({ plan, currentPlan, onSelect }) {
  const isCurrentPlan = currentPlan === plan.id;

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all ${plan.borderColor} ${
      plan.highlight
        ? 'shadow-xl scale-105 bg-white dark:bg-gray-800'
        : 'bg-white dark:bg-gray-800 shadow-sm'
    }`}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</span>
        </div>
      )}

      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-2xl mb-4`}>
        {plan.icon}
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>

      <div className="mt-2 mb-4">
        {plan.price === 0 ? (
          <span className="text-3xl font-extrabold text-gray-900 dark:text-white">Free</span>
        ) : (
          <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
            ${plan.price}
            <span className="text-base font-normal text-gray-500">/{plan.period}</span>
          </span>
        )}
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
        {plan.notIncluded.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
            <X size={14} className="mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => !isCurrentPlan && onSelect(plan)}
        disabled={isCurrentPlan}
        className={`mt-6 w-full py-3 rounded-xl font-medium text-sm transition-all ${
          isCurrentPlan
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default'
            : plan.highlight
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
              : 'border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600'
        }`}>
        {isCurrentPlan ? '✓ Current Plan' : plan.cta}
      </button>
    </div>
  );
}

function CheckoutModal({ plan, onClose, onSuccess }) {
  const [method, setMethod] = useState('card');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [giftCode, setGiftCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handlePayment(e) {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      if (method === 'card') {
        // Initiate Stripe checkout session
        const res = await fetch('/api/payments/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          body: JSON.stringify({ planId: plan.id, successUrl: window.location.href, cancelUrl: window.location.href }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else setError(data.error ?? 'Checkout failed');

      } else if (method === 'crypto') {
        const res = await fetch('/api/payments/crypto/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          body: JSON.stringify({ planId: plan.id, currency: cryptoCurrency }),
        });
        const data = await res.json();
        if (data.address) {
          onSuccess({ method: 'crypto', currency: cryptoCurrency, address: data.address, amount: data.amount });
        } else setError(data.error ?? 'Crypto payment setup failed');

      } else if (method === 'giftcard') {
        if (!giftCode.trim()) { setError('Please enter a gift card code.'); setProcessing(false); return; }
        const res = await fetch('/api/payments/giftcard/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          body: JSON.stringify({ code: giftCode.trim(), planId: plan.id }),
        });
        const data = await res.json();
        if (data.success) onSuccess({ method: 'giftcard', plan: plan.id });
        else setError(data.error ?? 'Gift card redemption failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className={`h-2 rounded-t-3xl bg-gradient-to-r ${plan.color}`} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Upgrade to {plan.name}
              </h2>
              <p className="text-sm text-gray-500">
                ${plan.price}/{plan.period}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Payment Method Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {[
              { id: 'card',     icon: CreditCard, label: 'Card' },
              { id: 'crypto',   icon: Bitcoin,    label: 'Crypto' },
              { id: 'giftcard', icon: Gift,       label: 'Gift Card' },
            ].map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  method === m.id ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <m.icon size={14} /> {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handlePayment} className="space-y-4">
            {method === 'card' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {CARD_BRANDS.map((b) => (
                    <span key={b.code} className="text-lg" title={b.name}>{b.icon}</span>
                  ))}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                  <Shield size={16} className="mt-0.5 shrink-0" />
                  <span>You'll be redirected to Stripe's secure checkout. Card data is never stored on our servers.</span>
                </div>
              </div>
            )}

            {method === 'crypto' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {CRYPTO_OPTIONS.map((c) => (
                    <button key={c.symbol} type="button"
                      onClick={() => setCryptoCurrency(c.symbol)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        cryptoCurrency === c.symbol
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
                      }`}>
                      <div className="text-2xl">{c.icon}</div>
                      <div className="text-xs font-bold mt-1">{c.symbol}</div>
                      <div className="text-xs text-gray-500">{c.network}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  A payment address will be generated. Send the exact amount within 30 minutes to activate your plan.
                </p>
              </div>
            )}

            {method === 'giftcard' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gift Card Code</label>
                <input
                  type="text"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  maxLength={19}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500">
                  Gift cards can be purchased from our website or authorised resellers.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={processing}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {processing ? <><RefreshCw size={14} className="animate-spin" /> Processing…</> : <>
                  <Lock size={14} />
                  {method === 'card' ? 'Pay Securely' : method === 'crypto' ? 'Generate Address' : 'Redeem Code'}
                </>}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            🔒 Secured by 256-bit encryption · Cancel anytime · No hidden fees
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentsDashboard({ currentPlan = 'free', onUpgrade }) {
  const [selected, setSelected] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const handleSelect = useCallback((plan) => {
    if (plan.id === 'enterprise') {
      window.open('mailto:sales@nexusai.pro?subject=Enterprise Inquiry', '_blank');
      return;
    }
    setSelected(plan);
  }, []);

  const handleSuccess = useCallback((data) => {
    setSuccessData(data);
    setSelected(null);
    if (onUpgrade) onUpgrade(data);
  }, [onUpgrade]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
          Choose Your Plan
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Pay with card, crypto, or gift card · Cancel anytime
        </p>

        {/* Accepted payment methods */}
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          {CARD_BRANDS.map((b) => (
            <span key={b.code} className="text-2xl" title={b.name}>{b.icon}</span>
          ))}
          <span className="text-gray-300">|</span>
          <span className="text-2xl" title="Bitcoin">₿</span>
          <span className="text-2xl" title="Ethereum">Ξ</span>
          <span className="text-2xl" title="USDC">💵</span>
          <span className="text-gray-300">|</span>
          <span className="text-2xl" title="Gift Card">🎁</span>
        </div>
      </div>

      {/* Success Banner */}
      {successData && (
        <div className="max-w-2xl mx-auto mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">Payment Successful!</p>
            <p className="text-sm text-green-700 dark:text-green-400">
              {successData.method === 'crypto'
                ? `Send ${successData.amount} ${successData.currency} to ${successData.address}`
                : 'Your plan has been activated.'}
            </p>
          </div>
          <button onClick={() => setSuccessData(null)} className="ml-auto"><X size={16} className="text-green-500" /></button>
        </div>
      )}

      {/* Plan Cards */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Security Footer */}
      <div className="max-w-5xl mx-auto mt-10 grid sm:grid-cols-3 gap-4 text-center">
        {[
          { icon: '🔒', title: 'Bank-grade Security', desc: 'PCI-DSS compliant checkout via Stripe' },
          { icon: '🔄', title: 'Cancel Anytime',       desc: 'No commitments. Downgrade whenever.' },
          { icon: '🌍', title: 'Global Currencies',    desc: 'USD, EUR, GBP, JPY, and 135+ more' },
        ].map((f) => (
          <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">{f.title}</div>
            <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Checkout Modal */}
      {selected && (
        <CheckoutModal
          plan={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
