// ================================================
// NEXUS AI PRO - Subscription Checkout
// File: src/components/SubscriptionCheckout.jsx
// Updated: 2026-07-01
// Supports: Visa, MC, Amex, Discover, Diners, JCB,
//           UnionPay, Apple Pay, Google Pay,
//           Crypto (BTC/ETH/USDC), Gift Cards
// ================================================

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Shield, Check, ChevronRight,
  Loader2, Star, Zap, Crown, X,
} from 'lucide-react';

const PLAN_META = {
  free:               { icon: '🆓', badge: null, color: 'from-gray-400 to-gray-600' },
  pro_monthly:        { icon: '⭐', badge: 'Popular', color: 'from-blue-400 to-blue-600' },
  pro_yearly:         { icon: '⭐', badge: '2 months free', color: 'from-blue-500 to-indigo-600' },
  enterprise_monthly: { icon: '👑', badge: 'Best Value', color: 'from-purple-500 to-pink-600' },
  enterprise_yearly:  { icon: '👑', badge: '2 months free', color: 'from-purple-600 to-pink-700' },
};

const CARD_NETWORKS = [
  { id: 'visa',      label: 'Visa',       logo: '💳' },
  { id: 'mastercard',label: 'Mastercard', logo: '💳' },
  { id: 'amex',      label: 'Amex',       logo: '💳' },
  { id: 'discover',  label: 'Discover',   logo: '💳' },
  { id: 'diners',    label: 'Diners',     logo: '💳' },
  { id: 'jcb',       label: 'JCB',        logo: '💳' },
  { id: 'unionpay',  label: 'UnionPay',   logo: '💳' },
];

const CRYPTO_NETS = [
  { id: 'bitcoin',  label: 'Bitcoin (BTC)',  symbol: '₿' },
  { id: 'ethereum', label: 'Ethereum (ETH)', symbol: 'Ξ' },
  { id: 'usdc',     label: 'USD Coin (USDC)',symbol: '$' },
  { id: 'dai',      label: 'DAI',            symbol: '◈' },
  { id: 'litecoin', label: 'Litecoin (LTC)', symbol: 'Ł' },
];

function PlanCard({ plan, selected, onSelect }) {
  const meta = PLAN_META[plan.id] || {};
  const isSelected = selected === plan.id;
  const priceLabel = plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}/${plan.interval === 'year' ? 'yr' : 'mo'}`;
  return (
    <button onClick={() => onSelect(plan.id)}
      className={`relative text-left p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
      {meta.badge && (
        <span className="absolute -top-2 left-4 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full font-medium">
          {meta.badge}
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xl mr-1">{meta.icon}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{plan.name}</span>
        </div>
        {isSelected && <Check size={18} className="text-blue-500 flex-shrink-0" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{priceLabel}</div>
      <ul className="mt-2 space-y-1">
        {(plan.features || []).slice(0, 3).map(f => (
          <li key={f} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Check size={10} className="text-green-500 flex-shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

export default function SubscriptionCheckout({ onClose, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('pro_monthly');
  const [paymentMethod, setPaymentMethod] = useState('card'); // card | crypto | gift_card
  const [giftCode, setGiftCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('plans'); // plans | payment | confirm

  useEffect(() => {
    fetch('/api/subscriptions/plans').then(r => r.json()).then(d => setPlans(d.plans || [])).catch(() => {});
  }, []);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('nexus_access_token')}` });

  const handleCheckout = async () => {
    if (selectedPlan === 'free') { onSuccess?.({ plan: 'free' }); return; }
    setLoading(true);
    setError('');
    try {
      if (paymentMethod === 'card') {
        const res = await fetch('/api/subscriptions/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({
            planId: selectedPlan,
            successUrl: `${window.location.origin}/subscribe/success`,
            cancelUrl: `${window.location.origin}/subscribe/cancel`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (paymentMethod === 'crypto') {
        const res = await fetch('/api/subscriptions/crypto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ planId: selectedPlan, redirectUrl: `${window.location.origin}/subscribe/success` }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.open(data.hostedUrl, '_blank');
      } else if (paymentMethod === 'gift_card') {
        const res = await fetch('/api/subscriptions/gift-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ code: giftCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSuccess?.({ plan: selectedPlan, promoCode: data.promoCodeId });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const visiblePlans = plans.filter(p => p.id !== 'free' || true);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upgrade Nexus AI Pro</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Unlock all features with a subscription</p>
          </div>
          {onClose && <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X size={18} /></button>}
        </div>

        <div className="p-6 space-y-6">
          {/* Plans */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Choose a plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visiblePlans.map(plan => (
                <PlanCard key={plan.id} plan={plan} selected={selectedPlan} onSelect={setSelectedPlan} />
              ))}
            </div>
          </div>

          {/* Payment method selector */}
          {selectedPlan !== 'free' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment method</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
                  { id: 'gift_card', label: 'Gift Card', icon: Gift },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setPaymentMethod(id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${paymentMethod === id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                    <Icon size={20} className={paymentMethod === id ? 'text-blue-500' : 'text-gray-400'} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  </button>
                ))}
              </div>

              {/* Card networks */}
              {paymentMethod === 'card' && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    {CARD_NETWORKS.map(n => (
                      <span key={n.id} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded">{n.label}</span>
                    ))}
                    <span className="text-xs text-gray-400">Apple Pay · Google Pay</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                    <Shield size={10} /> Secured by Stripe · PCI DSS Level 1 compliant
                  </p>
                </div>
              )}

              {/* Crypto options */}
              {paymentMethod === 'crypto' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {CRYPTO_NETS.map(n => (
                    <span key={n.id} className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-xs text-orange-700 dark:text-orange-300 rounded">
                      {n.symbol} {n.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Gift card input */}
              {paymentMethod === 'gift_card' && (
                <div className="mt-3">
                  <input type="text" value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())}
                    placeholder="Enter gift card / promo code"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {/* CTA */}
          <button onClick={handleCheckout} disabled={loading || (paymentMethod === 'gift_card' && !giftCode)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
            {selectedPlan === 'free' ? 'Continue Free' : paymentMethod === 'gift_card' ? 'Redeem Code' : 'Proceed to Payment'}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Cancel anytime · No hidden fees · 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
}
