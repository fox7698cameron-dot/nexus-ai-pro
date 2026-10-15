// PaymentDashboard.jsx | Nexus AI Pro | Created: 2026-10-15 | Payment & Subscriptions

import React, { useState } from 'react';
import {
  CreditCard, Lock, Check, AlertCircle, RefreshCw,
  Download, Star, Zap, Crown, Gift, Globe,
  ChevronDown, CheckCircle, Shield
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

// Mirror of SUBSCRIPTION_TIERS from app.jsx (passed via props or used standalone)
const DEFAULT_TIERS = {
  free: {
    name: 'Free',
    price: '$0/month',
    color: 'from-gray-400 to-gray-600',
    features: ['5 chats/day', 'Basic models only', '1MB file uploads'],
    badge: '🆓',
    icon: '💰'
  },
  pro: {
    name: 'Pro',
    price: '$9.99/month',
    color: 'from-blue-400 to-blue-600',
    features: ['Unlimited chats', 'All models', '100MB uploads', 'Priority support'],
    badge: '⭐',
    icon: '🚀'
  },
  enterprise: {
    name: 'Enterprise',
    price: '$14.99/month',
    color: 'from-purple-400 to-pink-600',
    features: ['Everything in Pro', 'Custom models', 'API access', 'Dedicated support', 'SLA guarantee'],
    badge: '👑',
    icon: '💎'
  }
};

const CARD_TYPES = [
  { id: 'visa', label: 'Visa', prefix: /^4/ },
  { id: 'mastercard', label: 'Mastercard', prefix: /^5[1-5]/ },
  { id: 'amex', label: 'Amex', prefix: /^3[47]/ },
  { id: 'discover', label: 'Discover', prefix: /^6(?:011|5)/ }
];

const CRYPTO_OPTIONS = [
  { id: 'eth', label: 'Ethereum', symbol: 'ETH', icon: '⧫' },
  { id: 'btc', label: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  { id: 'usdc', label: 'USDC', symbol: 'USDC', icon: '$' }
];

const MOCK_INVOICES = [
  { id: 'INV-2026-010', date: '2026-10-01', amount: '$9.99', status: 'Paid', plan: 'Pro' },
  { id: 'INV-2026-009', date: '2026-09-01', amount: '$9.99', status: 'Paid', plan: 'Pro' },
  { id: 'INV-2026-008', date: '2026-08-01', amount: '$9.99', status: 'Paid', plan: 'Pro' },
  { id: 'INV-2026-007', date: '2026-07-01', amount: '$0.00', status: 'Free', plan: 'Free' }
];

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'Other'];

// ============================================
// HELPERS
// ============================================

function detectCardType(number) {
  const stripped = number.replace(/\s/g, '');
  return CARD_TYPES.find(t => t.prefix.test(stripped)) || null;
}

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * @param {{ tier: string, data: object, selected: boolean, onSelect: () => void }} props
 */
function TierCard({ tier, data, selected, onSelect }) {
  const tierIcon = tier === 'free' ? Star : tier === 'pro' ? Zap : Crown;
  const Icon = tierIcon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className={selected ? 'text-blue-500' : 'text-gray-500'} />
          <span className="font-semibold text-gray-900 dark:text-white">{data.name}</span>
          <span>{data.badge}</span>
        </div>
        <span className={`font-bold text-sm ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {data.price}
        </span>
      </div>
      <ul className="space-y-1">
        {data.features.slice(0, 3).map((f, i) => (
          <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Check size={10} className="text-green-500" /> {f}
          </li>
        ))}
      </ul>
      {selected && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
          <CheckCircle size={10} /> Selected
        </span>
      )}
    </button>
  );
}

/**
 * @param {{ onSuccess?: () => void }} props
 */
function StripeForm({ onSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cardType = detectCardType(cardNumber);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (cardNumber.replace(/\s/g, '').length < 16) { setError('Invalid card number'); return; }
    if (expiry.length < 5) { setError('Invalid expiry'); return; }
    if (cvv.length < 3) { setError('Invalid CVV'); return; }
    if (!name.trim()) { setError('Cardholder name required'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardLast4: cardNumber.slice(-4), expiry, name })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Payment failed');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Card Number
          {cardType && <span className="ml-2 text-xs text-blue-500 font-normal">{cardType.label}</span>}
        </label>
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
          />
        </div>
        <div className="flex gap-1 mt-1">
          {CARD_TYPES.map(t => (
            <span key={t.id} className={`text-xs px-1.5 py-0.5 rounded border ${
              cardType?.id === t.id
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-400'
            }`}>{t.label}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry</label>
          <input
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            maxLength={5}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
          <input
            type="password"
            inputMode="numeric"
            value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="•••"
            maxLength={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="JOHN DOE"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm uppercase"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
        Pay Securely
      </button>

      <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
        <Shield size={10} /> Protected by Stripe · AES-256 encrypted
      </p>
    </form>
  );
}

/**
 * @param {{ onSuccess?: () => void }} props
 */
function CryptoForm({ onSuccess }) {
  const [selected, setSelected] = useState('eth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/crypto/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: selected })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Payment failed');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {CRYPTO_OPTIONS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c.id)}
            className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
              selected === c.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <span className="text-xl">{c.icon}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.symbol}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />}
        Pay with {CRYPTO_OPTIONS.find(c => c.id === selected)?.label}
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * PaymentDashboard — subscription tiers, Stripe, crypto, gift cards, billing
 * @param {{ subscriptionTiers?: object, currentTier?: string, className?: string }} props
 */
export default function PaymentDashboard({ subscriptionTiers, currentTier = 'free', className = '' }) {
  const tiers = subscriptionTiers || DEFAULT_TIERS;
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [giftCode, setGiftCode] = useState('');
  const [giftMsg, setGiftMsg] = useState(null);
  const [billingAddress, setBillingAddress] = useState({ name: '', line1: '', city: '', country: 'United States', postal: '' });
  const [showBilling, setShowBilling] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  function handleGiftRedeem() {
    if (!giftCode.trim()) return;
    setGiftMsg({ type: 'info', text: 'Validating gift card…' });
    setTimeout(() => {
      if (giftCode.toUpperCase() === 'NEXUS25') {
        setGiftMsg({ type: 'success', text: '$25 credit applied!' });
      } else {
        setGiftMsg({ type: 'error', text: 'Invalid or expired gift card code.' });
      }
    }, 1000);
  }

  function updateBilling(field, value) {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
  }

  if (paySuccess) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 ${className}`}>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Successful!</h2>
          <p className="text-gray-500 dark:text-gray-400">Your {tiers[selectedTier]?.name} subscription is now active.</p>
          <button onClick={() => setPaySuccess(false)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-blue-500" size={24} />
            Subscription &amp; Payments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Current plan: <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{currentTier}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tier selector + gift card + billing */}
          <div className="space-y-6">
            {/* Tier selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Choose Plan</h2>
              <div className="space-y-3">
                {Object.entries(tiers).map(([key, data]) => (
                  <TierCard
                    key={key}
                    tier={key}
                    data={data}
                    selected={selectedTier === key}
                    onSelect={() => setSelectedTier(key)}
                  />
                ))}
              </div>
            </div>

            {/* Gift card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Gift size={16} className="text-pink-500" /> Gift Card / Promo
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={giftCode}
                  onChange={e => setGiftCode(e.target.value.toUpperCase())}
                  placeholder="NEXUS25"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleGiftRedeem}
                  className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Apply
                </button>
              </div>
              {giftMsg && (
                <p className={`text-xs mt-2 flex items-center gap-1 ${
                  giftMsg.type === 'success' ? 'text-green-500' : giftMsg.type === 'error' ? 'text-red-500' : 'text-blue-500'
                }`}>
                  {giftMsg.type === 'success' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                  {giftMsg.text}
                </p>
              )}
            </div>

            {/* Billing address */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <button
                type="button"
                onClick={() => setShowBilling(v => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe size={16} className="text-gray-500" /> Billing Address
                </h2>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showBilling ? 'rotate-180' : ''}`} />
              </button>

              {showBilling && (
                <div className="mt-4 space-y-3">
                  {[
                    { field: 'name', label: 'Full Name', placeholder: 'John Doe' },
                    { field: 'line1', label: 'Address', placeholder: '123 Main St' },
                    { field: 'city', label: 'City', placeholder: 'New York' },
                    { field: 'postal', label: 'Postal Code', placeholder: '10001' }
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                      <input
                        type="text"
                        value={billingAddress[field]}
                        onChange={e => updateBilling(field, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Country</label>
                    <select
                      value={billingAddress.country}
                      onChange={e => updateBilling('country', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment form + invoices */}
          <div className="space-y-6">
            {/* Payment method tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'card', label: 'Card' },
                  { id: 'crypto', label: 'Crypto' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      paymentMethod === m.id
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && <StripeForm onSuccess={() => setPaySuccess(true)} />}
              {paymentMethod === 'crypto' && <CryptoForm onSuccess={() => setPaySuccess(true)} />}
            </div>

            {/* Invoice history */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Invoice History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-2">Invoice</th>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Plan</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_INVOICES.map(inv => (
                      <tr key={inv.id} className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{inv.id}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{inv.date}</td>
                        <td className="py-2 capitalize text-gray-700 dark:text-gray-300">{inv.plan}</td>
                        <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{inv.amount}</td>
                        <td className="py-2 text-right">
                          <button className="text-blue-500 hover:text-blue-600 transition-colors">
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
