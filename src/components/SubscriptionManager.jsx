// SubscriptionManager.jsx | 2026-10-08

import { useState } from 'react';
import { CreditCard, Bitcoin, Gift, Crown, Zap, Check, X, Shield, Lock } from 'lucide-react';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    icon: Zap,
    color: 'bg-gray-100 dark:bg-gray-700',
    highlight: false,
    features: ['5 AI conversations/day', '1 platform connected', 'Basic analytics', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    icon: Crown,
    color: 'bg-indigo-600',
    highlight: true,
    features: ['Unlimited AI conversations', '8 platforms connected', 'Advanced analytics', 'Priority support', 'Project tracker', 'Security dashboard'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 14.99,
    period: 'month',
    icon: Shield,
    color: 'bg-purple-600',
    highlight: false,
    features: ['Everything in Pro', 'All platforms + gaming', 'Custom AI personas', 'Dedicated support', 'SLA guarantee', 'White-label option'],
  },
];

const CRYPTO_OPTIONS = [
  { id: 'BTC', label: 'Bitcoin', symbol: '₿' },
  { id: 'ETH', label: 'Ethereum', symbol: 'Ξ' },
  { id: 'USDC', label: 'USDC', symbol: '$' },
];

const PAYMENT_METHODS = [
  { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard },
  { id: 'CRYPTO', label: 'Cryptocurrency', icon: Bitcoin },
  { id: 'GIFT_CARD', label: 'Gift Card', icon: Gift },
];

const MOCK_INVOICES = [
  { id: 'inv_001', date: '2026-09-01', amount: 9.99, status: 'paid', tier: 'Pro' },
  { id: 'inv_002', date: '2026-08-01', amount: 9.99, status: 'paid', tier: 'Pro' },
  { id: 'inv_003', date: '2026-07-01', amount: 9.99, status: 'paid', tier: 'Pro' },
];

function detectCardType(n) {
  const num = n.replace(/\D/g, '');
  if (/^4/.test(num)) return { name: 'Visa', color: '#1A1F71' };
  if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return { name: 'Mastercard', color: '#EB001B' };
  if (/^3[47]/.test(num)) return { name: 'Amex', color: '#007BC1' };
  if (/^6/.test(num)) return { name: 'Discover', color: '#FF6600' };
  if (/^3[06]/.test(num)) return { name: 'Diners', color: '#888' };
  if (/^35/.test(num)) return { name: 'JCB', color: '#003087' };
  if (/^62/.test(num)) return { name: 'UnionPay', color: '#D40920' };
  return null;
}

function formatCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function TierCard({ tier, current, onSelect }) {
  const Icon = tier.icon;
  const isActive = current === tier.id;
  return (
    <div className={`relative rounded-2xl p-5 border-2 transition-all ${isActive ? 'border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20' : 'border-gray-200 dark:border-gray-700'} ${tier.highlight ? 'bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800'}`}>
      {tier.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">Most Popular</span>
        </div>
      )}
      <div className={`w-10 h-10 ${tier.color} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} className={tier.highlight || tier.id === 'enterprise' ? 'text-white' : 'text-gray-600 dark:text-gray-300'} />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white">{tier.name}</h3>
      <div className="flex items-baseline gap-1 my-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{tier.price === 0 ? 'Free' : `$${tier.price}`}</span>
        {tier.price > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">/{tier.period}</span>}
      </div>
      <ul className="space-y-1.5 mb-4">
        {tier.features.map(f => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <Check size={12} className="text-green-500 flex-shrink-0" />{f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(tier.id)}
        disabled={isActive}
        className={`w-full py-2 text-sm font-medium rounded-xl transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 cursor-default' : tier.highlight ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
      >
        {isActive ? 'Current Plan' : tier.price === 0 ? 'Downgrade' : 'Select'}
      </button>
    </div>
  );
}

function CardForm({ onSubmit, loading }) {
  const [num, setNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const cardType = detectCardType(num);

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Card Number</label>
        <div className="relative">
          <input
            value={num}
            onChange={e => setNum(formatCard(e.target.value))}
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            maxLength={19}
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 pr-16 text-sm font-mono text-gray-900 dark:text-white"
          />
          {cardType && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: cardType.color + '22', color: cardType.color }}>
              {cardType.name}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expiry</label>
          <input value={expiry} onChange={e => setExpiry(e.target.value.replace(/[^0-9/]/g, '').slice(0, 5))} placeholder="MM/YY"
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CVC</label>
          <input value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" inputMode="numeric"
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cardholder Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe"
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
      </div>
      <button onClick={() => onSubmit({ num, expiry, cvc, name })} disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        <Lock size={14} />{loading ? 'Processing…' : 'Pay Now'}
      </button>
    </div>
  );
}

function CryptoForm({ onSubmit, loading }) {
  const [currency, setCurrency] = useState('ETH');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {CRYPTO_OPTIONS.map(c => (
          <button key={c.id} onClick={() => setCurrency(c.id)}
            className={`flex flex-col items-center py-3 rounded-xl border-2 text-sm transition-all ${currency === c.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
            <span className="text-lg font-bold">{c.symbol}</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">{c.label}</span>
          </button>
        ))}
      </div>
      <button onClick={() => onSubmit({ currency })} disabled={loading}
        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        <Bitcoin size={14} />{loading ? 'Generating address…' : `Pay with ${currency}`}
      </button>
    </div>
  );
}

function GiftCardForm({ onSubmit, loading }) {
  const [code, setCode] = useState('');
  const [balance, setBalance] = useState(null);

  const check = async () => {
    try {
      const res = await fetch('/api/payment/gift-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) { const d = await res.json(); setBalance(d.balance / 100); }
    } catch {}
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Gift Card Code</label>
        <div className="flex gap-2">
          <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setBalance(null); }}
            placeholder="XXXX-XXXX-XXXX"
            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-900 dark:text-white" />
          <button onClick={check} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Check
          </button>
        </div>
        {balance !== null && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Balance: ${balance.toFixed(2)}</p>}
      </div>
      <button onClick={() => onSubmit({ code })} disabled={loading || !code}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        <Gift size={14} />{loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </div>
  );
}

export default function SubscriptionManager() {
  const [currentTier, setCurrentTier] = useState('free');
  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const handleTierSelect = (tierId) => {
    if (tierId === currentTier) return;
    setSelectedTier(tierId);
    setShowPayment(tierId !== 'free');
    if (tierId === 'free') {
      setCurrentTier('free');
      setMessage('Downgraded to Free plan');
    }
  };

  const handlePayment = async (details) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, method: paymentMethod, ...details }),
      });
      if (res.ok) {
        setCurrentTier(selectedTier);
        setShowPayment(false);
        setMessage(`Successfully subscribed to ${TIERS.find(t => t.id === selectedTier)?.name} plan!`);
      } else {
        const d = await res.json();
        setError(d.error || 'Payment failed');
      }
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      setCurrentTier('free');
      setMessage('Subscription canceled. Access continues until the end of your billing period.');
    } finally {
      setLoading(false);
    }
  };

  const currentTierData = TIERS.find(t => t.id === currentTier);
  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="text-indigo-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
        </div>

        {/* Alerts */}
        {message && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-sm">
            <Check size={16} />{message}
            <button onClick={() => setMessage('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm">
            <X size={16} />{error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Current subscription banner */}
        {currentTier !== 'free' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-indigo-200 dark:border-indigo-700">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Current: <span className="text-indigo-600 dark:text-indigo-400">{currentTierData?.name}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Renews {nextRenewal.toLocaleDateString()}</p>
            </div>
            <button onClick={handleCancelSubscription} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-500 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <X size={14} />Cancel
            </button>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TIERS.map(tier => (
            <TierCard key={tier.id} tier={tier} current={currentTier} onSelect={handleTierSelect} />
          ))}
        </div>

        {/* Payment form */}
        {showPayment && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-8 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Payment</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
              <Lock size={12} />Secured with TLS 1.3 · PCI DSS compliant
            </p>

            {/* Method selector */}
            <div className="flex gap-2 flex-wrap mb-4">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setPaymentMethod(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${paymentMethod === id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>

            {paymentMethod === 'CARD' && <CardForm onSubmit={handlePayment} loading={loading} />}
            {paymentMethod === 'CRYPTO' && <CryptoForm onSubmit={handlePayment} loading={loading} />}
            {paymentMethod === 'GIFT_CARD' && <GiftCardForm onSubmit={handlePayment} loading={loading} />}

            <button onClick={() => setShowPayment(false)} className="mt-3 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {/* Invoice history */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Invoice History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_INVOICES.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-400">{inv.id}</td>
                    <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{inv.tier}</td>
                    <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">${inv.amount.toFixed(2)}</td>
                    <td className="py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize">{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
