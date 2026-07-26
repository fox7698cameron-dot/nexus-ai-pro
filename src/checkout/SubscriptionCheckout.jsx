// src/checkout/SubscriptionCheckout.jsx — 2026-07-26
// Stripe-powered subscription checkout with card, crypto, and gift card support
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Bitcoin, Gift, CheckCircle2, Loader2, AlertTriangle,
  Star, Zap, Crown, Shield, ArrowRight, Lock,
} from 'lucide-react';

const PLAN_META = {
  free:       { icon: Zap,    gradient: 'from-gray-400 to-gray-600', emoji: '🆓' },
  pro:        { icon: Star,   gradient: 'from-blue-500 to-purple-600', emoji: '⭐' },
  enterprise: { icon: Crown,  gradient: 'from-purple-500 to-pink-600', emoji: '👑' },
};

function PlanCard({ plan, current, onSelect }) {
  const meta = PLAN_META[plan.id] || {};
  const PlanIcon = meta.icon || Star;
  const isCurrentPlan = current === plan.id;

  return (
    <button onClick={() => onSelect(plan.id)}
      className={`w-full text-left rounded-2xl p-5 border-2 transition-all ${isCurrentPlan ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
            <PlanIcon size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white">{plan.name}</div>
            <div className="text-sm text-gray-500">{plan.price === 0 ? 'Free forever' : `$${(plan.price / 100).toFixed(2)}/month`}</div>
          </div>
        </div>
        {isCurrentPlan && <CheckCircle2 size={18} className="text-blue-500 shrink-0" />}
      </div>
      <ul className="space-y-1.5">
        {plan.features?.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 size={12} className="text-green-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function GiftCardInput({ token, onRedeemed }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onRedeemed?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-wider"
          onKeyDown={e => e.key === 'Enter' && redeem()} />
        <button onClick={redeem} disabled={loading || !code.trim()}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
          Redeem
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {result && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 size={14} /> Redeemed ${(result.amount / 100).toFixed(2)} credit!
        </div>
      )}
    </div>
  );
}

function CryptoCheckout({ selectedPlan, token }) {
  const [intent, setIntent] = useState(null);
  const [coin, setCoin] = useState('BTC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createIntent = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/payments/crypto/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: selectedPlan, coin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIntent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const coins = ['BTC', 'ETH', 'USDC', 'SOL'];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {coins.map(c => (
          <button key={c} onClick={() => setCoin(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${coin === c ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'}`}>
            {c}
          </button>
        ))}
      </div>

      {!intent ? (
        <button onClick={createIntent} disabled={loading || !selectedPlan}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Bitcoin size={16} />}
          Generate {coin} Address
        </button>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white">Send exactly:</div>
          <div className="text-2xl font-bold text-orange-500">{intent.amount} {intent.coin}</div>
          <div className="text-xs text-gray-500">Payment expires: {new Date(intent.expiresAt).toLocaleTimeString()}</div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
            Integration with Coinbase Commerce or BitPay required for live payment addresses.
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function SubscriptionCheckout({ token }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch('/api/payments/plans'),
        fetch('/api/payments/subscription', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const plansData = await plansRes.json();
      const subData = await subRes.json();
      setPlans(plansData);
      setSubscription(subData);
      setSelectedPlan(subData.planId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const checkout = async () => {
    if (!selectedPlan || selectedPlan === 'free') return;
    setCheckoutLoading(true); setError('');
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const payMethods = [
    { id: 'card',     label: 'Card',      icon: CreditCard },
    { id: 'crypto',   label: 'Crypto',    icon: Bitcoin },
    { id: 'giftcard', label: 'Gift Card', icon: Gift },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 gap-2 text-gray-500"><Loader2 size={20} className="animate-spin" /> Loading plans…</div>;

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const isUpgrade = selectedPlanData && selectedPlanData.price > 0 && selectedPlan !== subscription?.planId;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Crown size={24} className="text-purple-500" /> Subscription
        </h1>
        <p className="text-sm text-gray-500">Choose your plan and payment method</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Current plan badge */}
      {subscription && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Shield size={14} className="text-blue-500" />
          Current plan: <span className="font-semibold text-gray-900 dark:text-white capitalize">{subscription.planId}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{subscription.status}</span>
        </div>
      )}

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(p => <PlanCard key={p.id} plan={p} current={subscription?.planId} onSelect={setSelectedPlan} />)}
      </div>

      {/* Payment method selector */}
      {isUpgrade && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {payMethods.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPayMethod(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition ${payMethod === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {selectedPlanData?.name} — ${(selectedPlanData?.price / 100).toFixed(2)}/month
            </h3>

            {payMethod === 'card' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Lock size={11} /> Secured by Stripe. Supports Visa, Mastercard, Amex, Discover, UnionPay, JCB, and more.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                  {['Visa', 'Mastercard', 'Amex', 'Discover', 'UnionPay', 'JCB'].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">{c}</span>
                  ))}
                </div>
                <button onClick={checkout} disabled={checkoutLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 text-sm">
                  {checkoutLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {checkoutLoading ? 'Redirecting…' : `Subscribe to ${selectedPlanData?.name}`}
                </button>
              </div>
            )}

            {payMethod === 'crypto' && <CryptoCheckout selectedPlan={selectedPlan} token={token} />}

            {payMethod === 'giftcard' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Enter your gift card code to apply credit toward your subscription.</p>
                <GiftCardInput token={token} onRedeemed={load} />
              </div>
            )}
          </div>
        </div>
      )}

      {!isUpgrade && selectedPlan === subscription?.planId && (
        <div className="text-center py-4 text-sm text-gray-500">
          You're already on the <span className="font-semibold capitalize">{subscription?.planId}</span> plan.
        </div>
      )}
    </div>
  );
}
