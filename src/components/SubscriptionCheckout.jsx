// src/components/SubscriptionCheckout.jsx
// Date: 2026-06-02
// Stripe checkout, crypto (display), gift card redemption
// Supports all major cards (Visa, MC, Amex, Discover) via Stripe

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Gift, Bitcoin, Crown, Star, Zap,
  CheckCircle2, Loader2, Shield, ArrowRight, Tag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PLAN_DETAILS = {
  free: {
    icon: <Zap size={24} className="text-gray-400" />,
    name: 'Free',
    price: '$0',
    period: '/month',
    color: 'border-gray-700',
    badge: null,
    features: [
      '5 AI chats per day',
      'Basic models (GPT-4, Claude Sonnet)',
      '1MB file uploads',
      'Community support',
    ],
  },
  pro: {
    icon: <Star size={24} className="text-blue-400" />,
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    color: 'border-blue-500',
    badge: 'Most Popular',
    features: [
      'Unlimited AI chats',
      'All 25+ AI models',
      '100MB file uploads',
      'Priority support',
      'Analytics dashboard',
      'Project tracking',
    ],
  },
  enterprise: {
    icon: <Crown size={24} className="text-violet-400" />,
    name: 'Enterprise',
    price: '$14.99',
    period: '/month',
    color: 'border-violet-500',
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'API access',
      'Dedicated SLA',
      'Admin dashboard',
      'Security scanning',
      'Team collaboration',
    ],
  },
};

const PAYMENT_METHODS = [
  { id: 'card', icon: <CreditCard size={16} />, label: 'Card', sublabel: 'Visa, Mastercard, Amex, Discover' },
  { id: 'crypto', icon: <Bitcoin size={16} />, label: 'Crypto', sublabel: 'BTC, ETH, USDC' },
  { id: 'giftcard', icon: <Gift size={16} />, label: 'Gift Card', sublabel: 'Redeem a code' },
];

function PlanCard({ planId, plan, current, onSelect }) {
  const isCurrentPlan = current === planId;
  return (
    <div className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all ${isCurrentPlan ? 'border-green-500 bg-green-900/10' : `${plan.color} bg-gray-900 hover:bg-gray-800`}`}
      onClick={() => !isCurrentPlan && onSelect(planId)}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-pink-500 text-white">
          {plan.badge}
        </span>
      )}
      {isCurrentPlan && (
        <span className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
          Current Plan
        </span>
      )}
      <div className="flex items-center gap-3 mb-3">
        {plan.icon}
        <div>
          <div className="font-bold text-white text-lg">{plan.name}</div>
          <div className="text-gray-400 text-sm">{plan.price}<span className="text-xs">{plan.period}</span></div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GiftCardRedeemer({ token, onRedeemed }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      setResult(res.ok ? { success: true, plan: data.plan } : { success: false, error: data.error });
      if (res.ok && onRedeemed) onRedeemed(data.plan);
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">Gift Card Code</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 text-sm font-mono tracking-wider focus:border-violet-500 focus:outline-none"
        />
        <button
          onClick={redeem}
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />} Redeem
        </button>
      </div>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
          {result.success ? `✓ Gift card applied! Your plan has been upgraded to ${result.plan}.` : result.error}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionCheckout({ token, currentPlan = 'free' }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/subscriptions/current', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSubscription(d))
      .catch(() => {});
  }, [token]);

  const handleCheckout = async () => {
    if (paymentMethod === 'giftcard') return;
    if (selected === 'free') return;
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan: selected,
          successUrl: window.location.origin + '/?upgraded=1',
          cancelUrl: window.location.origin + '/pricing',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error
    }
  };

  const activePlan = subscription?.plan || currentPlan;

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">{t('subscriptions.title')}</h2>
        <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
          <Shield size={12} className="text-green-400" /> Powered by Stripe — PCI DSS compliant
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(PLAN_DETAILS).map(([id, plan]) => (
          <PlanCard key={id} planId={id} plan={plan} current={activePlan} onSelect={setSelected} />
        ))}
      </div>

      {/* Payment method selector */}
      {selected !== 'free' && selected !== activePlan && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Payment Method</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`p-3 rounded-xl border text-left transition-all ${paymentMethod === m.id ? 'border-violet-500 bg-violet-900/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
              >
                <div className="flex items-center gap-2 text-white mb-1">{m.icon} <span className="text-sm font-medium">{m.label}</span></div>
                <div className="text-xs text-gray-400">{m.sublabel}</div>
              </button>
            ))}
          </div>

          {paymentMethod === 'card' && (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Subscribe to {PLAN_DETAILS[selected]?.name} — {PLAN_DETAILS[selected]?.price}/mo
              <ArrowRight size={16} />
            </button>
          )}

          {paymentMethod === 'crypto' && (
            <div className="p-4 bg-gray-800 rounded-xl text-center">
              <Bitcoin size={32} className="mx-auto mb-2 text-orange-400" />
              <p className="text-sm text-gray-300">Crypto payments powered by Coinbase Commerce</p>
              <p className="text-xs text-gray-500 mt-1">BTC, ETH, USDC, DAI accepted</p>
              <button className="mt-3 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm">
                Pay with Crypto
              </button>
            </div>
          )}

          {paymentMethod === 'giftcard' && (
            <GiftCardRedeemer token={token} onRedeemed={() => {}} />
          )}
        </div>
      )}

      {/* Manage billing for existing subscribers */}
      {activePlan !== 'free' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('subscriptions.currentPlan')}: {PLAN_DETAILS[activePlan]?.name}</h3>
          <button
            onClick={handleManageBilling}
            className="px-4 py-2 rounded-lg border border-gray-600 hover:border-violet-500 text-gray-300 hover:text-white text-sm transition-colors"
          >
            {t('subscriptions.manageBilling')}
          </button>
        </div>
      )}
    </div>
  );
}
