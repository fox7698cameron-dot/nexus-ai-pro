// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { useState, useEffect, useRef } from 'react';
import { X, Check, Copy, Shield, Lock, CreditCard, ChevronDown } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: '/mo',
    features: ['5 AI requests/day', '1 model', 'Basic support', 'Community access'],
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    priceLabel: '$9.99',
    period: '/mo',
    features: ['Unlimited requests', '10+ models', 'Priority support', 'Analytics', 'API access'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1499,
    priceLabel: '$14.99',
    period: '/mo',
    features: ['Unlimited requests', 'All models', '24/7 dedicated support', 'Advanced analytics', 'Custom integrations', 'SLA guarantee'],
    recommended: false,
  },
];

const COINS = [
  { id: 'BTC', label: 'Bitcoin', icon: '₿' },
  { id: 'ETH', label: 'Ethereum', icon: 'Ξ' },
  { id: 'USDC', label: 'USD Coin', icon: '🔵' },
  { id: 'USDT', label: 'Tether', icon: '💵' },
];

const CARD_BRANDS = [
  { label: 'Visa', color: 'bg-blue-700' },
  { label: 'MC', color: 'bg-red-700' },
  { label: 'Amex', color: 'bg-blue-500' },
  { label: 'Disc', color: 'bg-orange-600' },
  { label: 'Diners', color: 'bg-gray-600' },
  { label: 'UnionPay', color: 'bg-red-800' },
];

const PAYMENT_TABS = ['card', 'crypto', 'gift'];

function PlanCard({ plan, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(plan.id)}
      className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-purple-500 bg-gradient-to-b from-purple-900/40 to-gray-800'
          : 'border-gray-700 bg-gray-800 hover:border-gray-500'
      }`}
    >
      {plan.recommended && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          Recommended
        </span>
      )}
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold text-white">{plan.priceLabel}</span>
        {plan.price > 0 && <span className="text-gray-400 text-sm mb-0.5">{plan.period}</span>}
      </div>
      <span className="text-sm font-semibold text-gray-300 mb-2">{plan.name}</span>
      <ul className="flex flex-col gap-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-gray-400">
            <Check size={11} className="text-purple-400 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}
    </button>
  );
}

function CardPayment({ plan, onSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCardNumber = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    if (plan.price === 0) { onSuccess({ plan: plan.id }); return; }
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, currency: 'usd' }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Failed to create payment'); return; }

      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: {
            number: cardNumber.replace(/\s/g, ''),
            exp_month: parseInt(expiry.split('/')[0], 10),
            exp_year: parseInt(`20${expiry.split('/')[1]}`, 10),
            cvc,
          },
        },
      });

      if (result.error) { setError(result.error.message); return; }
      if (result.paymentIntent.status === 'succeeded') onSuccess({ plan: plan.id });
    } catch {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 flex-wrap">
        {CARD_BRANDS.map((b) => (
          <span key={b.label} className={`${b.color} text-white text-xs font-bold px-2 py-0.5 rounded`}>
            {b.label}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">Card Number</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Expiry</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">CVC</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123"
              value={cvc}
              maxLength={4}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading || (plan.price > 0 && (!cardNumber || !expiry || !cvc))}
        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? 'Processing…' : plan.price === 0 ? 'Continue with Free' : `Pay ${plan.priceLabel}`}
      </button>
    </div>
  );
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return [copied, copy];
}

function CryptoPayment({ plan, onSuccess }) {
  const [coin, setCoin] = useState('BTC');
  const [pending, setPending] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, copy] = useCopyToClipboard();

  const initiate = async () => {
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/payments/crypto/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coin, plan: plan.id }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Failed to initiate'); return; }
      setPending(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!pending) return;
    setError('');
    setVerifying(true);
    try {
      const resp = await fetch('/api/payments/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: pending.paymentId }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Verification failed'); return; }
      if (data.status === 'confirmed') { onSuccess({ plan: plan.id }); return; }
      setError(data.error || 'Payment not yet detected. Please wait a few minutes and try again.');
    } catch {
      setError('Network error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!pending ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Select Cryptocurrency</label>
            <div className="grid grid-cols-4 gap-2">
              {COINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCoin(c.id)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg border transition-colors ${
                    coin === c.id ? 'border-purple-500 bg-purple-900/30 text-white' : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-xs font-medium">{c.id}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={initiate}
            disabled={loading || plan.price === 0}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Generating address…' : 'Initiate Crypto Payment'}
          </button>
          {plan.price === 0 && <p className="text-xs text-gray-500 text-center">Crypto payment not required for free plan</p>}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Send exactly</span>
              <span className="text-white font-bold">{pending.cryptoAmount} {pending.coin}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Wallet address</span>
              <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
                <code className="text-xs text-gray-200 flex-1 break-all font-mono">{pending.address}</code>
                <button onClick={() => copy(pending.address)} className="text-gray-400 hover:text-white flex-shrink-0">
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center h-32 bg-gray-700 rounded-lg">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-1">📱</div>
                <div className="text-xs">QR Code</div>
                <div className="text-xs font-mono mt-1">{pending.address.slice(0, 8)}…</div>
              </div>
            </div>
            <p className="text-xs text-yellow-400 text-center">Payment expires in 60 minutes</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={verify}
            disabled={verifying}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {verifying ? 'Checking blockchain…' : "I've Sent Payment"}
          </button>
          <button onClick={() => setPending(null)} className="text-sm text-gray-500 hover:text-gray-300 text-center">
            Change coin
          </button>
        </div>
      )}
    </div>
  );
}

function GiftCardPayment({ onCreditsApplied }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/payments/gift/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Redemption failed'); return; }
      setApplied(data);
      onCreditsApplied(data.applied);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {applied ? (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-green-400">
            <Check size={18} />
            <span className="font-semibold">Gift Card Applied!</span>
          </div>
          <p className="text-sm text-gray-300">
            ${(applied.applied / 100).toFixed(2)} credit added
          </p>
          <p className="text-xs text-gray-500">
            Total credits: ${(applied.totalCredits / 100).toFixed(2)}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Gift Card Code</label>
            <input
              type="text"
              placeholder="NEXUS-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono tracking-wider"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={redeem}
            disabled={loading || !code.trim()}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Applying…' : 'Apply Gift Card'}
          </button>
        </>
      )}
    </div>
  );
}

function BillingSummary({ plan, credits }) {
  const discountCents = Math.min(credits, plan.price);
  const total = Math.max(0, plan.price - discountCents);

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-300">Billing Summary</h3>
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Plan</span>
          <span className="text-white">{plan.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Price</span>
          <span className="text-white">{plan.priceLabel}/mo</span>
        </div>
        {credits > 0 && (
          <div className="flex justify-between text-green-400">
            <span>Credits applied</span>
            <span>-${(discountCents / 100).toFixed(2)}</span>
          </div>
        )}
        <hr className="border-gray-700 my-1" />
        <div className="flex justify-between font-bold">
          <span className="text-white">Total</span>
          <span className="text-white">${(total / 100).toFixed(2)}/mo</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mt-2">
        {[
          { icon: <Lock size={13} />, label: 'SSL Secured' },
          { icon: <CreditCard size={13} />, label: 'Stripe Powered' },
          { icon: <Shield size={13} />, label: '256-bit Encryption' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-500">{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Checkout({ isOpen, onClose, onSuccess, currentPlan = 'free' }) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [paymentTab, setPaymentTab] = useState('card');
  const [credits, setCredits] = useState(0);
  const backdropRef = useRef(null);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];

  useEffect(() => {
    if (isOpen) setSelectedPlan(currentPlan);
  }, [isOpen, currentPlan]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSuccess = (data) => {
    onSuccess?.(data);
    onClose();
  };

  if (!isOpen) return null;

  const TAB_LABELS = { card: '💳 Card', crypto: '₿ Crypto', gift: '🎁 Gift Card' };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Upgrade Plan</h2>
            <p className="text-sm text-gray-400">Choose your plan and payment method</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Plan</h3>
              <div className="grid grid-cols-3 gap-3">
                {PLANS.map((p) => (
                  <PlanCard key={p.id} plan={p} selected={selectedPlan === p.id} onSelect={setSelectedPlan} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_200px] gap-4">
              <div className="flex flex-col gap-4">
                <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                  {PAYMENT_TABS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setPaymentTab(t)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        paymentTab === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {TAB_LABELS[t]}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4">
                  {paymentTab === 'card' && <CardPayment plan={plan} onSuccess={handleSuccess} />}
                  {paymentTab === 'crypto' && <CryptoPayment plan={plan} onSuccess={handleSuccess} />}
                  {paymentTab === 'gift' && <GiftCardPayment onCreditsApplied={(amt) => setCredits((c) => c + amt)} />}
                </div>
              </div>

              <BillingSummary plan={plan} credits={credits} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
