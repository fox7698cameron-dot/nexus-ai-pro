// Date: 2026-07-20
import React, { useState } from 'react';
import { Check, Zap, Star, Building2, Gift, CreditCard, Bitcoin } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Get started with AI-powered tools',
    color: 'border-gray-700',
    badge: null,
    crypto: false,
    features: [
      '10 API calls / day',
      '1 project',
      '100 MB storage',
      'Community support',
      'Basic AI models',
    ],
    missing: [
      'Advanced models',
      'Team collaboration',
      'Priority support',
      'Custom integrations',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 19,
    annualPrice: 15.2,
    description: 'For power users and creators',
    color: 'border-violet-500',
    badge: 'Most Popular',
    crypto: true,
    features: [
      '5,000 API calls / day',
      '25 projects',
      '50 GB storage',
      'Priority support',
      'All AI models',
      'Webhook integrations',
      'API key management',
    ],
    missing: [
      'Team management',
      'SSO / SAML',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 49,
    annualPrice: 39.2,
    description: 'For teams and organizations',
    color: 'border-cyan-500',
    badge: null,
    crypto: true,
    features: [
      'Unlimited API calls',
      'Unlimited projects',
      '1 TB storage',
      '24/7 dedicated support',
      'All AI models',
      'Team management (up to 50)',
      'Custom integrations',
      'Audit logs',
      'SSO / SAML',
      'SLA 99.9%',
    ],
    missing: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'Custom solutions for large organizations',
    color: 'border-amber-500',
    badge: null,
    crypto: true,
    features: [
      'Everything in Business',
      'Custom AI model training',
      'Dedicated infrastructure',
      'Unlimited team members',
      'Custom SLA',
      'On-premise deployment',
      'White-label options',
      'Executive support line',
    ],
    missing: [],
  },
];

const PAYMENT_ICONS = [
  { label: 'Visa', symbol: '💳' },
  { label: 'Mastercard', symbol: '🟠' },
  { label: 'Amex', symbol: '🔵' },
  { label: 'Discover', symbol: '🟡' },
  { label: 'Bitcoin', symbol: '₿' },
  { label: 'Ethereum', symbol: 'Ξ' },
  { label: 'USDC', symbol: '◎' },
];

export default function SubscriptionPlans({ onSelectPlan }) {
  const [annual, setAnnual] = useState(false);
  const [giftCode, setGiftCode] = useState('');
  const [giftStatus, setGiftStatus] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const handleRedeem = async () => {
    if (!giftCode.trim()) return;
    setRedeemLoading(true);
    setGiftStatus(null);
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const data = await res.json();
      setGiftStatus(data.success
        ? { ok: true, msg: `Gift card applied! ${data.creditsAdded ? `+$${data.creditsAdded} credit` : ''}` }
        : { ok: false, msg: data.error || 'Invalid or already used gift card.' });
    } catch {
      setGiftStatus({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-12">
      {/* Header */}
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Choose Your Plan
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Unlock the full power of Nexus AI Pro. Upgrade or downgrade at any time.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-4 bg-gray-900 rounded-full px-2 py-2 border border-gray-800">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              !annual ? 'bg-violet-600 text-white shadow-lg shadow-violet-900' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              annual ? 'bg-violet-600 text-white shadow-lg shadow-violet-900' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-green-600 text-white rounded-full px-2 py-0.5">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const isEnterprise = plan.id === 'enterprise';
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-gray-900 border-2 ${plan.color} rounded-2xl p-6 transition-transform hover:-translate-y-1 hover:shadow-xl`}
            >
              {/* Most Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <Star size={10} />
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-100">{plan.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-5">
                {isEnterprise ? (
                  <div className="text-3xl font-bold text-amber-400">Custom</div>
                ) : price === 0 ? (
                  <div className="text-3xl font-bold text-gray-100">Free</div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-gray-100">${price.toFixed(2)}</span>
                    <span className="text-gray-500 text-sm mb-1">/mo</span>
                  </div>
                )}
                {annual && price > 0 && (
                  <p className="text-xs text-green-400 mt-1">Billed annually (${(price * 12).toFixed(2)}/yr)</p>
                )}
              </div>

              {/* Crypto badge */}
              {plan.crypto && (
                <div className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-950 border border-amber-800 rounded-full px-3 py-1 mb-4 w-fit">
                  <Bitcoin size={11} />
                  Crypto payment available
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={15} className="text-green-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 line-through">
                    <Check size={15} className="text-gray-700 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => onSelectPlan?.(plan, annual)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  plan.badge
                    ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900'
                    : isEnterprise
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : price === 0
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-cyan-700 hover:bg-cyan-600 text-white'
                }`}
              >
                {isEnterprise ? 'Contact Sales' : price === 0 ? 'Get Started Free' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="max-w-5xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-12">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Full Feature Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-semibold text-gray-300">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['API Calls / Day', '10', '5,000', 'Unlimited', 'Unlimited'],
                ['Projects', '1', '25', 'Unlimited', 'Unlimited'],
                ['Storage', '100 MB', '50 GB', '1 TB', 'Custom'],
                ['Team Members', '—', '—', '50', 'Unlimited'],
                ['All AI Models', '—', '✓', '✓', '✓'],
                ['Webhooks', '—', '✓', '✓', '✓'],
                ['Audit Logs', '—', '—', '✓', '✓'],
                ['SSO / SAML', '—', '—', '✓', '✓'],
                ['On-Premise', '—', '—', '—', '✓'],
                ['Crypto Payments', '—', '✓', '✓', '✓'],
              ].map(([feature, ...vals]) => (
                <tr key={feature} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3 text-gray-400">{feature}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center text-gray-300">
                      {v === '✓' ? <Check size={15} className="text-green-400 mx-auto" /> : v === '—' ? <span className="text-gray-700">—</span> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gift card redemption */}
      <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-violet-400" />
          <h3 className="font-semibold">Redeem Gift Card or Promo Code</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
            placeholder="Enter code (e.g. NEXUS-XXXX-XXXX)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleRedeem}
            disabled={redeemLoading || !giftCode.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-all"
          >
            {redeemLoading ? '...' : 'Apply'}
          </button>
        </div>
        {giftStatus && (
          <p className={`mt-2 text-sm ${giftStatus.ok ? 'text-green-400' : 'text-red-400'}`}>
            {giftStatus.msg}
          </p>
        )}
      </div>

      {/* Payment icons */}
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-gray-600 text-xs mb-3 uppercase tracking-widest">Accepted Payment Methods</p>
        <div className="flex flex-wrap justify-center gap-3">
          {PAYMENT_ICONS.map(({ label, symbol }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-400"
            >
              <span>{symbol}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-700 text-xs mt-4 flex items-center justify-center gap-1">
          <CreditCard size={12} />
          Secured by Stripe. We never store card details.
        </p>
      </div>
    </div>
  );
}
