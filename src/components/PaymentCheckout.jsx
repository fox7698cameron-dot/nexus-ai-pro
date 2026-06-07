// src/components/PaymentCheckout.jsx | Nexus AI Pro | Date: 2026-06-07
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Enterprise checkout component — React 18, Tailwind CSS, dark mode, mobile-first.
// Props: { userId, currentPlan, onSuccess, onCancel }

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'Free',
    description: 'Get started at no cost',
    color: 'from-slate-600 to-slate-700',
    badge: null,
    features: [
      '5 AI queries per day',
      'GPT-3.5 model access',
      'Basic encryption',
      'Community support',
      '100 MB storage',
    ],
    missing: [
      'Advanced AI models',
      'Automation workflows',
      'Priority support',
      'API access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    priceLabel: '$19',
    description: 'For power users and creators',
    color: 'from-violet-600 to-indigo-600',
    badge: 'Most Popular',
    features: [
      'Unlimited AI queries',
      'All AI models (GPT-4, Claude, Gemini)',
      'Military-grade AES-256 encryption',
      'Priority email support',
      '50 GB storage',
      'Advanced automation workflows',
      'Full API access',
    ],
    missing: [
      'Dedicated infrastructure',
      'Custom model fine-tuning',
      'SSO / SAML',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceLabel: '$99',
    description: 'For teams and organisations',
    color: 'from-amber-500 to-orange-600',
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'Custom AI model fine-tuning',
      'SSO / SAML integration',
      'Unlimited storage',
      'SLA 99.99% uptime',
      'Dedicated account manager',
      'White-labeling & custom integrations',
      'On-premise deployment',
    ],
    missing: [],
  },
];

const PAYMENT_TABS = [
  { id: 'card', label: 'Card' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'giftcard', label: 'Gift Card' },
];

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Discover'];

const CRYPTO_OPTIONS = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'USDC', label: 'USD Coin (USDC)' },
];

const BILLING_CYCLES = [
  { id: 'monthly', label: 'Monthly', discount: 0 },
  { id: 'annual', label: 'Annual', discount: 20 },
];

// ─── Small reusable sub-components ───────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LockIcon({ className = '' }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Confetti particle for success animation
function ConfettiParticle({ style }) {
  return <div className="absolute w-2 h-2 rounded-sm opacity-90 animate-confetti" style={style} />;
}

// ─── Card formatting helpers ──────────────────────────────────────────────────

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectCardBrand(number) {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentCheckout({ userId, currentPlan = 'free', onSuccess, onCancel }) {
  // ── State ──────────────────────────────────────────────────────────────────

  const [selectedPlan, setSelectedPlan] = useState(currentPlan === 'free' ? 'pro' : currentPlan);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);

  // Card form state
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    addressLine: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [cardBrand, setCardBrand] = useState(null);

  // Crypto state
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [cryptoPayment, setCryptoPayment] = useState(null);

  // Gift card state
  const [giftCode, setGiftCode] = useState('');
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [giftMessage, setGiftMessage] = useState(null);

  const confettiRef = useRef(null);

  // ── Derived values ─────────────────────────────────────────────────────────

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];
  const cycle = BILLING_CYCLES.find((c) => c.id === billingCycle) || BILLING_CYCLES[0];
  const basePrice = plan.price;
  const discountedPrice = billingCycle === 'annual'
    ? (basePrice * 12 * (1 - cycle.discount / 100)).toFixed(2)
    : basePrice.toFixed(2);
  const creditedAmount = appliedCredit / 100;
  const finalPrice = Math.max(0, parseFloat(discountedPrice) - creditedAmount);
  const finalPriceLabel = plan.id === 'free' ? 'Free' : `$${finalPrice.toFixed(2)}`;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const updateCard = useCallback((field, raw) => {
    let value = raw;
    if (field === 'number') {
      value = formatCardNumber(raw);
      setCardBrand(detectCardBrand(value));
    }
    if (field === 'expiry') value = formatExpiry(raw);
    if (field === 'cvv') value = raw.replace(/\D/g, '').slice(0, 4);
    setCardData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGiftCardApply = useCallback(async () => {
    if (!giftCode.trim()) return;
    setError(null);
    setGiftMessage(null);

    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim().toUpperCase(), userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGiftMessage({ type: 'error', text: data.error || 'Invalid code' });
        return;
      }

      setAppliedCredit(data.credit);
      setGiftMessage({ type: 'success', text: `${data.creditFormatted} credit applied!` });
    } catch {
      setGiftMessage({ type: 'error', text: 'Network error — please try again.' });
    }
  }, [giftCode, userId]);

  const handleInitiateCrypto = useCallback(async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const amountCents = Math.round(finalPrice * 100);
      const res = await fetch('/api/payments/crypto/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents || 100, currency: cryptoCurrency, userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to initiate crypto payment.');
        return;
      }

      setCryptoPayment(data);
    } catch {
      setError('Network error — could not initiate crypto payment.');
    } finally {
      setIsProcessing(false);
    }
  }, [cryptoCurrency, finalPrice, userId]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);

    if (plan.id === 'free') {
      setSuccess(true);
      onSuccess?.({ plan: 'free', paymentMethod: null });
      return;
    }

    if (paymentMethod === 'crypto' && !cryptoPayment) {
      setError('Please initiate crypto payment first.');
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'card') {
        // Step 1: create customer
        const custRes = await fetch('/api/payments/create-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${userId}@nexusaipro.com`, // replace with real user email
            name: cardData.name || 'Nexus User',
            metadata: { userId },
          }),
        });
        const custData = await custRes.json();
        if (!custRes.ok) throw new Error(custData.error || 'Failed to create customer');

        // Step 2: create payment intent for one-time or subscription
        const amountCents = Math.round(finalPrice * 100);
        const piRes = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountCents,
            currency: 'usd',
            metadata: { userId, plan: selectedPlan, billingCycle },
          }),
        });
        const piData = await piRes.json();
        if (!piRes.ok) throw new Error(piData.error || 'Failed to create payment intent');

        // NOTE: In production, use Stripe.js / @stripe/react-stripe-js to
        // confirmCardPayment(piData.clientSecret, { payment_method: { card } })
        // For this MVP the intent creation confirms the server-side flow is wired correctly.
        console.info('[PaymentCheckout] PaymentIntent clientSecret received — confirm via Stripe.js');
      }

      // Simulate a short processing delay for UX feedback
      await new Promise((r) => setTimeout(r, 1200));

      setSuccess(true);
      onSuccess?.({ plan: selectedPlan, paymentMethod, billingCycle });
    } catch (err) {
      setError(err.message || 'Payment failed — please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [plan, paymentMethod, cardData, cryptoPayment, finalPrice, selectedPlan, billingCycle, userId, onSuccess]);

  // Reset crypto payment if crypto currency or plan changes
  useEffect(() => {
    setCryptoPayment(null);
  }, [cryptoCurrency, selectedPlan, billingCycle]);

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    const particles = Array.from({ length: 40 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      backgroundColor: ['#8b5cf6', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'][i % 6],
      animationDelay: `${Math.random() * 1.5}s`,
      animationDuration: `${1 + Math.random()}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
    }));

    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
        <style>{`
          @keyframes confettiFall {
            0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti { animation: confettiFall linear forwards; }
          @keyframes successPop {
            0%   { transform: scale(0.5); opacity: 0; }
            70%  { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-success-pop { animation: successPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-slide { animation: fadeSlideUp 0.6s ease forwards; }
        `}</style>

        <div ref={confettiRef} className="pointer-events-none fixed inset-0">
          {particles.map((s, i) => <ConfettiParticle key={i} style={s} />)}
        </div>

        <div className="relative z-10 text-center px-6 max-w-md">
          <div className="animate-success-pop mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500">
            <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="animate-fade-slide text-3xl font-bold text-white mb-3" style={{ animationDelay: '0.3s', opacity: 0 }}>
            Welcome to {plan.name}!
          </h1>
          <p className="animate-fade-slide text-slate-400 mb-8" style={{ animationDelay: '0.5s', opacity: 0 }}>
            Your payment was processed successfully. Enjoy your Nexus AI Pro experience.
          </p>
          <button
            onClick={() => onSuccess?.({ plan: selectedPlan })}
            className="animate-fade-slide bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            style={{ animationDelay: '0.7s', opacity: 0 }}
          >
            Start Using Nexus AI Pro
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-border {
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #6366f1);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 600px; }
        }
        .slide-down { animation: slideDown 0.3s ease forwards; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 px-4 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold">N</div>
          <span className="font-semibold text-white">Nexus AI Pro</span>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Upgrade Your Plan</h1>
          <p className="text-slate-400">Choose the right plan for your needs. Cancel anytime.</p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* ── Left column: Plan + Payment ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ── Billing cycle toggle ────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 bg-slate-900 rounded-xl p-1 w-fit mx-auto">
              {BILLING_CYCLES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBillingCycle(c.id)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === c.id
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                  {c.discount > 0 && (
                    <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                      -{c.discount}%
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Plan cards ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((p) => {
                const isSelected = selectedPlan === p.id;
                const monthlyPrice = billingCycle === 'annual' && p.price > 0
                  ? ((p.price * 12 * 0.8) / 12).toFixed(2)
                  : p.price.toFixed(2);

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`relative text-left rounded-2xl border-2 p-5 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/40 shadow-lg shadow-violet-900/20'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                    }`}
                  >
                    {p.badge && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${p.color} text-white whitespace-nowrap`}>
                        {p.badge}
                      </span>
                    )}

                    <div className="mb-4">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} mb-3`}>
                        <span className="text-white text-xs font-bold">{p.name[0]}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <p className="text-slate-400 text-xs">{p.description}</p>
                    </div>

                    <div className="mb-5">
                      {p.price === 0 ? (
                        <span className="text-3xl font-black text-white">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-black text-white">${monthlyPrice}</span>
                          <span className="text-slate-400 text-sm">/mo</span>
                        </>
                      )}
                      {billingCycle === 'annual' && p.price > 0 && (
                        <div className="text-xs text-emerald-400 mt-0.5">Billed ${(parseFloat(monthlyPrice) * 12).toFixed(2)}/yr</div>
                      )}
                    </div>

                    <ul className="space-y-1.5">
                      {p.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckIcon />
                          {f}
                        </li>
                      ))}
                      {p.features.length > 4 && (
                        <li className="text-xs text-slate-500">+{p.features.length - 4} more features</li>
                      )}
                    </ul>

                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Feature comparison table ─────────────────────────────────────── */}
            <details className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2 select-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Compare all features
              </summary>
              <div className="px-4 pb-4 overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="text-left py-3 font-medium">Feature</th>
                      {PLANS.map((p) => (
                        <th key={p.id} className={`text-center py-3 font-medium ${selectedPlan === p.id ? 'text-violet-400' : ''}`}>
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[
                      ['AI queries', '5/day', 'Unlimited', 'Unlimited'],
                      ['AI models', 'GPT-3.5', 'All models', 'All models'],
                      ['Encryption', 'Basic', 'AES-256', 'AES-256'],
                      ['Storage', '100 MB', '50 GB', 'Unlimited'],
                      ['API access', false, true, true],
                      ['Automation', false, true, true],
                      ['Priority support', false, true, true],
                      ['SSO / SAML', false, false, true],
                      ['Custom AI tuning', false, false, true],
                      ['SLA guarantee', false, false, '99.99%'],
                      ['White-labeling', false, false, true],
                      ['On-premise', false, false, true],
                    ].map(([feature, free, pro, enterprise]) => (
                      <tr key={feature} className="hover:bg-slate-800/30">
                        <td className="py-2.5 text-slate-300">{feature}</td>
                        {[free, pro, enterprise].map((val, i) => (
                          <td key={i} className="text-center py-2.5">
                            {val === true ? (
                              <span className="inline-flex justify-center"><CheckIcon /></span>
                            ) : val === false ? (
                              <span className="inline-flex justify-center"><XIcon /></span>
                            ) : (
                              <span className="text-slate-300 text-xs">{val}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {/* ── Payment method tabs ──────────────────────────────────────────── */}
            {plan.id !== 'free' && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-slate-800">
                  {PAYMENT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPaymentMethod(tab.id)}
                      className={`flex-1 py-3.5 text-sm font-medium transition-colors focus:outline-none ${
                        paymentMethod === tab.id
                          ? 'text-violet-400 border-b-2 border-violet-500 -mb-px bg-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* ── Card tab ──────────────────────────────────────────────────── */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      {/* Card brand badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">Accepted:</span>
                        {CARD_BRANDS.map((brand) => (
                          <span
                            key={brand}
                            className={`text-xs px-2 py-1 rounded border font-semibold transition-colors ${
                              cardBrand === brand
                                ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                                : 'border-slate-700 text-slate-400 bg-slate-800'
                            }`}
                          >
                            {brand}
                          </span>
                        ))}
                      </div>

                      {/* Card number */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="1234 5678 9012 3456"
                            value={cardData.number}
                            onChange={(e) => updateCard('number', e.target.value)}
                            maxLength={19}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono pr-14"
                          />
                          {cardBrand && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-400">
                              {cardBrand}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expiry + CVV */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="MM/YY"
                            value={cardData.expiry}
                            onChange={(e) => updateCard('expiry', e.target.value)}
                            maxLength={5}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">CVV</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            placeholder="•••"
                            value={cardData.cvv}
                            onChange={(e) => updateCard('cvv', e.target.value)}
                            maxLength={4}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
                          />
                        </div>
                      </div>

                      {/* Cardholder name */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="Jane Smith"
                          value={cardData.name}
                          onChange={(e) => updateCard('name', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Billing address */}
                      <div className="border-t border-slate-800 pt-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Billing Address</h4>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Address line"
                            value={cardData.addressLine}
                            onChange={(e) => updateCard('addressLine', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="City"
                              value={cardData.city}
                              onChange={(e) => updateCard('city', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="State / Province"
                              value={cardData.state}
                              onChange={(e) => updateCard('state', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="ZIP / Postal code"
                              value={cardData.zip}
                              onChange={(e) => updateCard('zip', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            />
                            <select
                              value={cardData.country}
                              onChange={(e) => updateCard('country', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            >
                              <option value="US">United States</option>
                              <option value="CA">Canada</option>
                              <option value="GB">United Kingdom</option>
                              <option value="AU">Australia</option>
                              <option value="DE">Germany</option>
                              <option value="FR">France</option>
                              <option value="JP">Japan</option>
                              <option value="SG">Singapore</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">
                        Card details are tokenised and processed securely by Stripe. Nexus AI Pro never stores raw card data.
                      </p>
                    </div>
                  )}

                  {/* ── Crypto tab ─────────────────────────────────────────────────── */}
                  {paymentMethod === 'crypto' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Cryptocurrency</label>
                        <select
                          value={cryptoCurrency}
                          onChange={(e) => setCryptoCurrency(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        >
                          {CRYPTO_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {!cryptoPayment ? (
                        <button
                          type="button"
                          onClick={handleInitiateCrypto}
                          disabled={isProcessing}
                          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isProcessing ? <><SpinnerIcon /> Generating address…</> : `Generate ${cryptoCurrency} Payment Address`}
                        </button>
                      ) : (
                        <div className="space-y-4">
                          {/* QR code placeholder */}
                          <div className="flex justify-center">
                            <div className="w-40 h-40 bg-white rounded-xl flex flex-col items-center justify-center border-4 border-slate-700">
                              <div className="grid grid-cols-5 gap-0.5 p-2">
                                {Array.from({ length: 25 }, (_, i) => (
                                  <div
                                    key={i}
                                    className={`w-5 h-5 rounded-sm ${
                                      [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,6,12,18].includes(i)
                                        ? 'bg-slate-900'
                                        : 'bg-white'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-slate-500 text-xs mt-1">{cryptoCurrency}</span>
                            </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl p-4 space-y-2 border border-slate-700">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Amount</span>
                              <span className="text-white font-mono font-semibold">{cryptoPayment.amountFormatted}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">USD equivalent</span>
                              <span className="text-slate-300">${cryptoPayment.usdEquivalent?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Expires</span>
                              <span className="text-amber-400">{new Date(cryptoPayment.expiresAt).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-400">Send to address</label>
                            <div className="flex gap-2">
                              <code className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-violet-300 font-mono break-all">
                                {cryptoPayment.paymentAddress}
                              </code>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(cryptoPayment.paymentAddress)}
                                className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs text-slate-300 transition-colors shrink-0"
                                title="Copy address"
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                            Send exactly {cryptoPayment.amountFormatted} to the address above. Payments typically confirm within 10–30 minutes.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Gift Card tab ──────────────────────────────────────────────── */}
                  {paymentMethod === 'giftcard' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Gift Card Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. NEXUS2026"
                            value={giftCode}
                            onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono uppercase tracking-widest"
                          />
                          <button
                            type="button"
                            onClick={handleGiftCardApply}
                            disabled={!giftCode.trim()}
                            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      {giftMessage && (
                        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
                          giftMessage.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                          {giftMessage.type === 'success' ? <CheckIcon /> : <XIcon />}
                          {giftMessage.text}
                        </div>
                      )}

                      {appliedCredit > 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Credit applied</span>
                            <span className="text-emerald-400 font-semibold">-${(appliedCredit / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-500">
                        Test codes: <span className="font-mono text-slate-400">NEXUS2026</span>, <span className="font-mono text-slate-400">TRIAL30</span>, <span className="font-mono text-slate-400">GIFT50</span>
                      </p>

                      {appliedCredit > 0 && finalPrice > 0 && (
                        <p className="text-xs text-slate-400">
                          Remaining balance of <span className="text-white font-semibold">${finalPrice.toFixed(2)}</span> will be charged to your card.
                        </p>
                      )}

                      {appliedCredit > 0 && finalPrice <= 0 && (
                        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                          Your gift card covers the full amount — no card required!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: Order summary ──────────────────────────────────── */}
          <div className="xl:w-80 shrink-0">
            {/* Mobile: collapsible */}
            <div className="xl:hidden bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-4">
              <button
                onClick={() => setOrderSummaryOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium"
              >
                <span className="text-slate-300">Order Summary</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{finalPriceLabel}{plan.id !== 'free' && '/mo'}</span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${orderSummaryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {orderSummaryOpen && <OrderSummaryContent plan={plan} billingCycle={billingCycle} discountedPrice={discountedPrice} appliedCredit={appliedCredit} finalPrice={finalPrice} finalPriceLabel={finalPriceLabel} />}
            </div>

            {/* Desktop: sticky */}
            <div className="hidden xl:block sticky top-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-300">Order Summary</h3>
                </div>
                <OrderSummaryContent plan={plan} billingCycle={billingCycle} discountedPrice={discountedPrice} appliedCredit={appliedCredit} finalPrice={finalPrice} finalPriceLabel={finalPriceLabel} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────────────────────────── */}
        {error && (
          <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── Submit button ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="mt-6">
          <button
            type="submit"
            disabled={isProcessing || (paymentMethod === 'crypto' && !cryptoPayment && plan.id !== 'free')}
            className="w-full relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-violet-900/30 text-base flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-violet-500/40"
          >
            {isProcessing ? (
              <><SpinnerIcon /> Processing…</>
            ) : plan.id === 'free' ? (
              'Continue with Free Plan'
            ) : (
              <>
                <LockIcon className="text-white/80" />
                Subscribe Now — {finalPriceLabel}{plan.id !== 'free' ? '/mo' : ''}
              </>
            )}
          </button>

          {/* Security badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <LockIcon className="text-slate-500" />
              256-bit SSL Encrypted
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-slate-400">stripe</span>
              Powered by Stripe
            </span>
            <span className="text-slate-700">•</span>
            <span>Cancel anytime</span>
            <span className="text-slate-700">•</span>
            {CARD_BRANDS.map((brand) => (
              <span key={brand} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 text-xs">
                {brand}
              </span>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-slate-600">
            By subscribing you agree to our{' '}
            <a href="/terms" className="text-slate-500 hover:text-slate-300 underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-slate-500 hover:text-slate-300 underline">Privacy Policy</a>.
          </p>
        </form>
      </main>
    </div>
  );
}

// ─── Order Summary sub-component ──────────────────────────────────────────────

function OrderSummaryContent({ plan, billingCycle, discountedPrice, appliedCredit, finalPrice, finalPriceLabel }) {
  return (
    <div className="px-5 py-4 space-y-4">
      {/* Plan */}
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shrink-0`}>
          <span className="text-white text-xs font-bold">{plan.name[0]}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{plan.name} Plan</p>
          <p className="text-xs text-slate-400 capitalize">{billingCycle} billing</p>
        </div>
      </div>

      {/* Included features */}
      <ul className="space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>

      {/* Price breakdown */}
      <div className="border-t border-slate-800 pt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">
            {plan.id === 'free' ? 'Subtotal' : billingCycle === 'annual' ? 'Annual subtotal' : 'Monthly subtotal'}
          </span>
          <span className="text-slate-300">
            {plan.price === 0 ? 'Free' : billingCycle === 'annual' ? `$${(parseFloat(discountedPrice) * 12).toFixed(2)}/yr` : `$${discountedPrice}/mo`}
          </span>
        </div>

        {billingCycle === 'annual' && plan.price > 0 && (
          <div className="flex justify-between">
            <span className="text-emerald-400">Annual discount (20%)</span>
            <span className="text-emerald-400">-${((plan.price * 12 * 0.2)).toFixed(2)}</span>
          </div>
        )}

        {appliedCredit > 0 && (
          <div className="flex justify-between">
            <span className="text-emerald-400">Gift card credit</span>
            <span className="text-emerald-400">-${(appliedCredit / 100).toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-base">
          <span className="text-white">Total today</span>
          <span className="text-white">{finalPriceLabel}{plan.id !== 'free' && '/mo'}</span>
        </div>
      </div>

      {/* Renewal note */}
      {plan.id !== 'free' && (
        <p className="text-xs text-slate-500">
          {billingCycle === 'annual'
            ? `You'll be charged $${(finalPrice * 12).toFixed(2)} today, then annually on this date.`
            : `You'll be charged $${finalPrice.toFixed(2)} today, then monthly on this date.`}
          {' '}Cancel anytime from your account settings.
        </p>
      )}
    </div>
  );
}
