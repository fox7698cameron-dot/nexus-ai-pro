/**
 * Nexus AI Pro — Checkout & Subscription Flow
 * Stripe (Visa, MC, Amex, Discover, debit), crypto (ETH/BTC/USDC/SOL/LTC), gift cards.
 * date: 2026-06-08
 */

import React, { useState } from 'react';
import { CreditCard, Bitcoin, Gift, CheckCircle, ArrowRight, Lock, Zap, Star, Infinity, RefreshCw, AlertCircle } from 'lucide-react';

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: null,
    color: 'from-white/10 to-white/5',
    badge: null,
    features: ['5 AI messages/day', '1 social platform', 'Basic security scan', 'Community support'],
    cta: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    interval: '/month',
    color: 'from-indigo-600/30 to-purple-600/20',
    badge: 'Most Popular',
    features: ['Unlimited AI messages', '8 social platforms', 'Real-time security', 'Game dev tracking', '5 platform connectors', 'Priority support'],
    cta: 'Get Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$49.99',
    interval: '/month',
    color: 'from-amber-600/20 to-orange-600/10',
    badge: 'Team & Business',
    features: ['Everything in Pro', 'Unlimited platforms', 'All integrations', 'Team management', 'Admin dashboard', 'SLA guarantee', 'Dedicated support'],
    cta: 'Get Enterprise',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$299',
    interval: ' one-time',
    color: 'from-emerald-600/20 to-teal-600/10',
    badge: 'Best Value',
    features: ['All Enterprise features', 'No recurring fees', 'Lifetime updates', 'Founder benefits'],
    cta: 'Buy Lifetime',
  },
];

const PAYMENT_METHODS = [
  { id: 'stripe', label: 'Card', icon: CreditCard, desc: 'Visa, Mastercard, Amex, Discover, Debit' },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin, desc: 'ETH, BTC, USDC, SOL, LTC' },
  { id: 'giftcard', label: 'Gift Card', icon: Gift, desc: 'Redeem a gift card code' },
];

const CRYPTO_COINS = ['ETH', 'BTC', 'USDC', 'SOL', 'LTC'];

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, isSelected, onSelect, currentPlanId }) {
  const isCurrent = plan.id === currentPlanId;
  return (
    <div
      onClick={() => !isCurrent && plan.price !== '$0' && onSelect(plan.id)}
      className={`relative rounded-2xl p-5 border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 scale-[1.02]' : 'border-white/10 hover:border-white/20'} ${isCurrent ? 'opacity-60 cursor-default' : ''}`}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${plan.color} opacity-80`} />
      <div className="relative z-10">
        {plan.badge && (
          <div className="inline-block text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/70 mb-2">{plan.badge}</div>
        )}
        <div className="flex items-end gap-1 mb-3">
          <span className="text-2xl font-bold text-white">{plan.price}</span>
          {plan.interval && <span className="text-xs text-white/50 mb-1">{plan.interval}</span>}
        </div>
        <h3 className="text-base font-semibold text-white mb-3">{plan.name}</h3>
        <ul className="space-y-1.5">
          {plan.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-xs text-white/70">
              <CheckCircle size={10} className="text-emerald-400 shrink-0" /> {f}
            </li>
          ))}
        </ul>
        {isCurrent && <div className="mt-3 text-xs text-white/40">Current plan</div>}
      </div>
    </div>
  );
}

// ── Main Checkout Flow ────────────────────────────────────────────────────────

export default function CheckoutFlow({ currentPlanId = 'free', onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [cryptoCoin, setCryptoCoin] = useState('ETH');
  const [giftCode, setGiftCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState('plan'); // plan | payment | processing | success

  const auth = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  const handleProceed = () => {
    if (!selectedPlan) { setError('Please select a plan'); return; }
    setError('');
    setStep('payment');
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');
    setStep('processing');
    try {
      if (paymentMethod === 'stripe') {
        const res = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        if (data.url) { window.location.href = data.url; return; }
        if (data.type === 'free') { setSuccess({ planId: selectedPlan, method: 'free' }); setStep('success'); }
      } else if (paymentMethod === 'crypto') {
        const res = await fetch('/api/payments/crypto', {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan, currency: cryptoCoin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Crypto payment init failed');
        setSuccess(data);
        setStep('success');
      } else if (paymentMethod === 'giftcard') {
        if (!giftCode.trim()) { setError('Enter a gift card code'); setStep('payment'); return; }
        const res = await fetch('/api/payments/giftcard/redeem', {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: giftCode.trim().toUpperCase() }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.reason || 'Invalid gift card');
        setSuccess({ method: 'giftcard', valueUsd: data.valueUsd });
        setStep('success');
      }
    } catch (e) { setError(e.message); setStep('payment'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-4 flex items-start justify-center pt-10">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="text-indigo-400" size={20} /> Upgrade Plan</h1>
          {onClose && <button onClick={onClose} className="text-white/40 hover:text-white/70 text-2xl leading-none">×</button>}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* ── Plan selection ── */}
        {step === 'plan' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {PLANS.map(p => (
                <PlanCard key={p.id} plan={p} isSelected={selectedPlan === p.id} onSelect={setSelectedPlan} currentPlanId={currentPlanId} />
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={handleProceed} disabled={!selectedPlan}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2 transition-colors">
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* ── Payment method ── */}
        {step === 'payment' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
            <h2 className="text-base font-semibold text-white mb-4">Choose Payment Method</h2>
            <div className="space-y-2 mb-5">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${paymentMethod === m.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20'}`}>
                  <m.icon size={18} className={paymentMethod === m.id ? 'text-indigo-400' : 'text-white/40'} />
                  <div>
                    <div className="text-sm font-medium text-white">{m.label}</div>
                    <div className="text-xs text-white/40">{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {paymentMethod === 'crypto' && (
              <div className="mb-4">
                <label className="block text-xs text-white/50 mb-2">Select Cryptocurrency</label>
                <div className="grid grid-cols-5 gap-2">
                  {CRYPTO_COINS.map(c => (
                    <button key={c} onClick={() => setCryptoCoin(c)}
                      className={`py-2 rounded-lg text-xs border transition-colors ${cryptoCoin === c ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/50 hover:border-white/20'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paymentMethod === 'giftcard' && (
              <div className="mb-4">
                <label className="block text-xs text-white/50 mb-1">Gift Card Code</label>
                <input value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
                  placeholder="XXXX-XXXX-XXXX" maxLength={19} />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('plan')} className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm text-white/60 hover:bg-white/5">Back</button>
              <button onClick={handleCheckout} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center gap-2">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                {paymentMethod === 'stripe' ? 'Pay Securely' : paymentMethod === 'crypto' ? 'Pay with Crypto' : 'Redeem'}
              </button>
            </div>
            <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-white/25">
              <Lock size={9} /> Secured with AES-256-GCM encryption
            </div>
          </div>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div className="text-center py-16">
            <RefreshCw size={36} className="mx-auto text-indigo-400 animate-spin mb-4" />
            <p className="text-white/60 text-sm">Processing your payment...</p>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && success && (
          <div className="text-center py-10 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {success.method === 'crypto' ? 'Payment Initiated!' : success.method === 'giftcard' ? 'Gift Card Redeemed!' : 'Subscription Active!'}
            </h2>
            {success.method === 'crypto' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4 text-left">
                <div className="text-xs text-white/50 mb-2">Send payment to:</div>
                <div className="font-mono text-xs text-white/80 break-all">{success.walletAddress || 'Wallet address will be emailed'}</div>
                <div className="text-xs text-white/40 mt-2">Amount: ~${success.amountUsd} USD in {cryptoCoin}</div>
                <div className="text-xs text-yellow-400 mt-2">⚠️ Complete within 1 hour</div>
              </div>
            )}
            {success.method === 'giftcard' && (
              <p className="text-sm text-white/50">${success.valueUsd} credit applied to your account.</p>
            )}
            <button onClick={onClose || (() => window.location.href = '/')}
              className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white">
              Continue to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
