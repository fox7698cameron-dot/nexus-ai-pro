// SubscriptionDashboard.jsx — 2026-05-07
// React subscription/payment UI for Nexus AI Pro.
// Supports credit/debit (Stripe Elements), crypto wallets, gift cards,
// billing address, transaction history, plan comparison, and cancel flow.

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Bitcoin, Gift, CheckCircle, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, X, Loader2,
  Receipt, MapPin, Crown, Star, Zap, RefreshCw,
  Copy, Check, ShieldCheck,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIERS = {
  free: {
    label: 'Free',
    price: '$0',
    period: '/month',
    icon: Zap,
    color: 'gray',
    gradient: 'from-gray-400 to-gray-600',
    features: [
      { text: '5 chats / day', included: true },
      { text: 'Basic models (GPT-4, Claude Sonnet)', included: true },
      { text: '1 MB file uploads', included: true },
      { text: 'Unlimited chats', included: false },
      { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
  },
  pro: {
    label: 'Pro',
    price: '$9.99',
    period: '/month',
    icon: Star,
    color: 'blue',
    gradient: 'from-blue-400 to-blue-600',
    features: [
      { text: '5 chats / day', included: true },
      { text: 'Basic models (GPT-4, Claude Sonnet)', included: true },
      { text: '1 MB file uploads', included: true },
      { text: 'Unlimited chats', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: false },
    ],
  },
  enterprise: {
    label: 'Enterprise',
    price: '$14.99',
    period: '/month',
    icon: Crown,
    color: 'purple',
    gradient: 'from-purple-400 to-pink-600',
    features: [
      { text: '5 chats / day', included: true },
      { text: 'Basic models (GPT-4, Claude Sonnet)', included: true },
      { text: '1 MB file uploads', included: true },
      { text: 'Unlimited chats', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: true },
    ],
  },
};

const CRYPTO_COINS = [
  { id: 'BTC',  label: 'Bitcoin',  symbol: '₿' },
  { id: 'ETH',  label: 'Ethereum', symbol: 'Ξ' },
  { id: 'USDC', label: 'USDC',     symbol: '$' },
];

const COLOR_MAP = {
  gray:   { badge: 'bg-gray-100 text-gray-700',   ring: 'ring-gray-400',   btn: 'bg-gray-600 hover:bg-gray-700'   },
  blue:   { badge: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-500',   btn: 'bg-blue-600 hover:bg-blue-700'   },
  purple: { badge: 'bg-purple-100 text-purple-700', ring: 'ring-purple-500', btn: 'bg-purple-600 hover:bg-purple-700' },
};

// ---------------------------------------------------------------------------
// Small reusable helpers (kept flat — no nesting beyond render return)
// ---------------------------------------------------------------------------
function SectionCard({ title, icon: Icon, children, darkMode }) {
  const bg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${bg}`}>
      {title && (
        <div className="flex items-center gap-2 mb-5">
          {Icon && <Icon size={18} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />}
          <h2 className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

function FeatureRow({ text, included, darkMode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {included
        ? <CheckCircle size={15} className="text-green-500 shrink-0" />
        : <XCircle   size={15} className={`shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />}
      <span className={included
        ? (darkMode ? 'text-gray-200' : 'text-gray-700')
        : (darkMode ? 'text-gray-500' : 'text-gray-400')}>
        {text}
      </span>
    </li>
  );
}

function StatusBadge({ status, darkMode }) {
  const map = {
    active:    'bg-green-100 text-green-700',
    trialing:  'bg-blue-100  text-blue-700',
    canceling: 'bg-yellow-100 text-yellow-700',
    inactive:  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
    canceled:  'bg-red-100   text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  );
}

function CopyButton({ text, darkMode }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`ml-2 p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

function CurrentPlanCard({ currentTier, subscriptionData, onCancel, darkMode }) {
  const tier = TIERS[currentTier] ?? TIERS.free;
  const TierIcon = tier.icon;
  const colors = COLOR_MAP[tier.color];
  const renewalDate = subscriptionData?.currentPeriodEnd
    ? new Date(subscriptionData.currentPeriodEnd * 1000).toLocaleDateString()
    : null;

  return (
    <SectionCard darkMode={darkMode}>
      <div className={`rounded-xl bg-gradient-to-r ${tier.gradient} p-5 text-white`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <TierIcon size={22} />
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Current Plan</p>
              <p className="text-2xl font-bold">{tier.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{tier.price}<span className="text-sm font-normal opacity-80">{tier.period}</span></p>
            {subscriptionData?.status && <StatusBadge status={subscriptionData.status} darkMode={false} />}
          </div>
        </div>

        {renewalDate && (
          <p className="mt-3 text-sm opacity-80">Renews on {renewalDate}</p>
        )}
      </div>

      {currentTier !== 'free' && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      )}
    </SectionCard>
  );
}

function PlanGrid({ currentTier, onUpgrade, darkMode }) {
  const base = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200';
  return (
    <SectionCard title="Plans" icon={Crown} darkMode={darkMode}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(TIERS).map(([key, tier]) => {
          const TierIcon = tier.icon;
          const colors = COLOR_MAP[tier.color];
          const isCurrent = key === currentTier;
          return (
            <div
              key={key}
              className={`rounded-xl border-2 p-4 transition-all ${base} ${isCurrent ? `${colors.ring} ring-2` : ''}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <TierIcon size={16} className={isCurrent ? `text-${tier.color}-500` : (darkMode ? 'text-gray-400' : 'text-gray-500')} />
                <span className={`font-semibold text-sm ${isCurrent ? colors.badge.split(' ')[1] : (darkMode ? 'text-gray-200' : 'text-gray-700')}`}>
                  {tier.label}
                </span>
                {isCurrent && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                    Current
                  </span>
                )}
              </div>
              <p className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {tier.price}<span className={`text-xs font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{tier.period}</span>
              </p>
              <ul className="space-y-1.5 mb-4">
                {tier.features.map((f, i) => (
                  <FeatureRow key={i} text={f.text} included={f.included} darkMode={darkMode} />
                ))}
              </ul>
              {!isCurrent && key !== 'free' && (
                <button
                  onClick={() => onUpgrade(key)}
                  className={`w-full text-sm font-medium text-white rounded-lg py-2 transition-colors ${colors.btn}`}
                >
                  Upgrade to {tier.label}
                </button>
              )}
              {!isCurrent && key === 'free' && (
                <button
                  onClick={() => onUpgrade(key)}
                  className={`w-full text-sm font-medium rounded-lg py-2 transition-colors ${
                    darkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Downgrade to Free
                </button>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function PaymentMethodSection({ onCardSubmit, onCryptoPayment, onGiftRedeem, darkMode, loading }) {
  const [activeTab, setActiveTab] = useState('card');
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [cryptoData, setCryptoData] = useState(null);
  const [giftCode, setGiftCode] = useState('');
  const [giftMessage, setGiftMessage] = useState(null);
  const [cardForm, setCardForm] = useState({ name: '', zip: '' });

  const input = `rounded-lg border px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;

  const tabs = [
    { id: 'card',   label: 'Card',       icon: CreditCard },
    { id: 'crypto', label: 'Crypto',     icon: Bitcoin    },
    { id: 'gift',   label: 'Gift Card',  icon: Gift       },
  ];

  const handleCryptoLoad = useCallback(async () => {
    const data = await onCryptoPayment(selectedCoin);
    setCryptoData(data);
  }, [selectedCoin, onCryptoPayment]);

  const handleGiftSubmit = useCallback(async (e) => {
    e.preventDefault();
    const result = await onGiftRedeem(giftCode.trim().toUpperCase());
    setGiftMessage(result);
    if (result.success) setGiftCode('');
  }, [giftCode, onGiftRedeem]);

  const handleCardSubmit = useCallback((e) => {
    e.preventDefault();
    onCardSubmit(cardForm);
  }, [cardForm, onCardSubmit]);

  const tabBase = `px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5`;
  const tabActive  = darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const tabInactive = darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100';

  return (
    <SectionCard title="Payment Method" icon={CreditCard} darkMode={darkMode}>
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`${tabBase} ${activeTab === id ? tabActive : tabInactive}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Credit / Debit Card */}
      {activeTab === 'card' && (
        <div>
          <div className={`mb-4 flex items-start gap-2 rounded-lg p-3 text-xs ${
            darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
          }`}>
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            <span>
              Card fields are powered by Stripe Elements and load securely using{' '}
              <code className="font-mono">STRIPE_PUBLISHABLE_KEY</code>. Nexus AI Pro never
              handles raw card numbers.
            </span>
          </div>

          <form onSubmit={handleCardSubmit} className="space-y-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={cardForm.name}
                onChange={(e) => setCardForm(f => ({ ...f, name: e.target.value }))}
                className={input}
              />
            </div>

            {/* Stripe Elements mount point */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Card Number
              </label>
              <div className={`rounded-lg border px-3 py-3 text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-400'
              }`}>
                {/* In production: <CardElement options={...} /> from @stripe/react-stripe-js */}
                <span className="font-mono tracking-widest">•••• •••• •••• ••••</span>
                <span className="ml-3 text-xs opacity-60">Stripe Elements</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Expiry (MM / YY)
                </label>
                <div className={`rounded-lg border px-3 py-3 text-sm font-mono ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-400'
                }`}>
                  MM / YY
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Billing ZIP
                </label>
                <input
                  type="text"
                  placeholder="10001"
                  maxLength={10}
                  value={cardForm.zip}
                  onChange={(e) => setCardForm(f => ({ ...f, zip: e.target.value }))}
                  className={input}
                />
              </div>
            </div>

            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Accepts Visa, Mastercard, Amex, Discover, and all major debit cards.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Save Payment Method
            </button>
          </form>
        </div>
      )}

      {/* Crypto */}
      {activeTab === 'crypto' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {CRYPTO_COINS.map(coin => (
              <button
                key={coin.id}
                onClick={() => { setSelectedCoin(coin.id); setCryptoData(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedCoin === coin.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {coin.symbol} {coin.label}
              </button>
            ))}
          </div>

          {!cryptoData ? (
            <button
              onClick={handleCryptoLoad}
              disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Generate {selectedCoin} Payment Address
            </button>
          ) : (
            <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
              {/* QR code placeholder */}
              <div className={`mx-auto w-32 h-32 rounded-lg flex items-center justify-center text-xs font-mono ${
                darkMode ? 'bg-gray-600 text-gray-300' : 'bg-white text-gray-500 border border-gray-200'
              }`}>
                QR Code
                <br />
                (use qrcode lib)
              </div>

              <div>
                <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Send {cryptoData.cryptoCoin} to:
                </p>
                <div className="flex items-center">
                  <code className={`text-xs break-all font-mono ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    {cryptoData.walletAddress === 'not_configured'
                      ? 'Wallet not configured — set CRYPTO_WALLET_' + cryptoData.cryptoCoin + ' env var'
                      : cryptoData.walletAddress}
                  </code>
                  {cryptoData.walletAddress !== 'not_configured' && (
                    <CopyButton text={cryptoData.walletAddress} darkMode={darkMode} />
                  )}
                </div>
              </div>

              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Address expires {new Date(cryptoData.expiry).toLocaleTimeString()}.
                Payment confirmed after 2 network confirmations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gift Card */}
      {activeTab === 'gift' && (
        <form onSubmit={handleGiftSubmit} className="space-y-3">
          <div>
            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Gift Card Code
            </label>
            <input
              type="text"
              placeholder="XXXX XXXX XXXX XXXX"
              value={giftCode}
              onChange={(e) => setGiftCode(e.target.value.replace(/\s/g, ''))}
              maxLength={16}
              className={`${input} font-mono tracking-widest uppercase`}
            />
          </div>

          {giftMessage && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
              giftMessage.success
                ? (darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700')
                : (darkMode ? 'bg-red-900/30 text-red-300'   : 'bg-red-50 text-red-700')
            }`}>
              {giftMessage.success
                ? <CheckCircle size={15} className="mt-0.5 shrink-0" />
                : <XCircle    size={15} className="mt-0.5 shrink-0" />}
              <span>
                {giftMessage.success
                  ? `Gift card applied! $${(giftMessage.credited / 100).toFixed(2)} credit added.`
                  : giftMessage.error ?? 'Redemption failed.'}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || giftCode.length < 16}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Redeem Gift Card
          </button>
        </form>
      )}
    </SectionCard>
  );
}

function BillingAddressForm({ initialAddress, onSave, darkMode, loading }) {
  const [form, setForm] = useState({
    line1:   initialAddress?.line1   ?? '',
    line2:   initialAddress?.line2   ?? '',
    city:    initialAddress?.city    ?? '',
    state:   initialAddress?.state   ?? '',
    zip:     initialAddress?.zip     ?? '',
    country: initialAddress?.country ?? 'US',
  });

  const input = `rounded-lg border px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSave(form);
  }, [form, onSave]);

  const field = (label, key, placeholder, extra = {}) => (
    <div>
      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={input}
        {...extra}
      />
    </div>
  );

  return (
    <SectionCard title="Billing Address" icon={MapPin} darkMode={darkMode}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {field('Address Line 1', 'line1', '123 Main St')}
        {field('Address Line 2', 'line2', 'Apt, Suite, etc. (optional)')}
        <div className="grid grid-cols-2 gap-3">
          {field('City', 'city', 'New York')}
          {field('State / Region', 'state', 'NY')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('ZIP / Postal Code', 'zip', '10001')}
          <div>
            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Country
            </label>
            <select
              value={form.country}
              onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
              className={input}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Save Billing Address
        </button>
      </form>
    </SectionCard>
  );
}

function TransactionHistory({ transactions, darkMode }) {
  const STATUS_STYLE = {
    succeeded: 'bg-green-100 text-green-700',
    failed:    'bg-red-100   text-red-700',
    pending:   'bg-yellow-100 text-yellow-700',
    refunded:  'bg-gray-100  text-gray-600',
  };

  const headerCls = `text-xs font-medium uppercase tracking-wide px-3 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const cellCls   = `px-3 py-3 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`;
  const rowBorder = darkMode ? 'border-gray-700' : 'border-gray-100';

  return (
    <SectionCard title="Transaction History" icon={Receipt} darkMode={darkMode}>
      {transactions.length === 0 ? (
        <p className={`text-sm text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No transactions yet.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className={`border-b ${rowBorder}`}>
                <th className={`${headerCls} text-left`}>Date</th>
                <th className={`${headerCls} text-left`}>Description</th>
                <th className={`${headerCls} text-left`}>Method</th>
                <th className={`${headerCls} text-right`}>Amount</th>
                <th className={`${headerCls} text-center`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className={`border-b ${rowBorder} last:border-0`}>
                  <td className={cellCls}>{new Date(tx.date).toLocaleDateString()}</td>
                  <td className={cellCls}>{tx.description}</td>
                  <td className={cellCls}>{tx.method}</td>
                  <td className={`${cellCls} text-right font-mono`}>
                    {tx.currency?.toUpperCase()} {(tx.amount / 100).toFixed(2)}
                  </td>
                  <td className={`${cellCls} text-center`}>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[tx.status] ?? STATUS_STYLE.pending}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function CancelModal({ currentTier, onConfirm, onClose, darkMode, loading }) {
  const overlay = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
  const box = `rounded-2xl p-6 w-full max-w-md shadow-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`;

  return (
    <div className={overlay} role="dialog" aria-modal="true">
      <div className={box}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h3 className="font-semibold text-base">Cancel Subscription</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={16} />
          </button>
        </div>

        <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          You are about to cancel your <strong>{TIERS[currentTier]?.label ?? currentTier}</strong> plan.
        </p>
        <ul className={`text-sm list-disc list-inside space-y-1 mb-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <li>Access continues until the end of the billing period.</li>
          <li>Your account will revert to the Free plan.</li>
          <li>You can re-subscribe at any time.</li>
        </ul>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Keep Plan
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * SubscriptionDashboard
 *
 * @param {object}  props
 * @param {string}  props.userId
 * @param {string}  props.authToken
 * @param {boolean} props.darkMode
 * @param {string}  props.userRole
 * @param {'free'|'pro'|'enterprise'} props.currentTier
 */
export default function SubscriptionDashboard({
  userId,
  authToken,
  darkMode = false,
  userRole = 'user',
  currentTier = 'free',
}) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [billingAddress, setBillingAddress] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);

  // Shared auth headers
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const apiCall = useCallback(async (path, opts = {}) => {
    const res = await fetch(`/api/payments${path}`, {
      headers,
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Request failed');
    }
    return res.json();
  }, [authToken]);

  // Load initial data
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      apiCall(`/status/${userId}`).catch(() => null),
      apiCall(`/transactions/${userId}`).catch(() => []),
      apiCall(`/billing-address/${userId}`).catch(() => null),
    ]).then(([status, txs, addr]) => {
      if (status)      setSubscriptionData(status);
      if (txs?.length) setTransactions(txs);
      if (addr)        setBillingAddress(addr);
    }).finally(() => setLoading(false));
  }, [userId]);

  const notify = useCallback((type, msg) => {
    if (type === 'success') { setGlobalSuccess(msg); setTimeout(() => setGlobalSuccess(null), 4000); }
    else                    { setGlobalError(msg);   setTimeout(() => setGlobalError(null),   5000); }
  }, []);

  const handleUpgrade = useCallback(async (targetTier) => {
    setLoading(true);
    try {
      await apiCall('/upgrade', { method: 'POST', body: { userId, targetTier } });
      notify('success', `Plan updated to ${TIERS[targetTier]?.label ?? targetTier}!`);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, apiCall, notify]);

  const handleCancel = useCallback(async () => {
    setLoading(true);
    try {
      const { subscriptionId } = subscriptionData ?? {};
      if (!subscriptionId) throw new Error('No active subscription found');
      await apiCall('/cancel', { method: 'POST', body: { subscriptionId } });
      setSubscriptionData(d => ({ ...d, status: 'canceling' }));
      setShowCancelModal(false);
      notify('success', 'Subscription will cancel at period end.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [subscriptionData, apiCall, notify]);

  const handleCardSubmit = useCallback(async (cardForm) => {
    setLoading(true);
    try {
      // In production: use Stripe.js createPaymentMethod(cardElement) here
      await apiCall('/payment-method', { method: 'POST', body: { userId, ...cardForm } });
      notify('success', 'Payment method saved.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, apiCall, notify]);

  const handleCryptoPayment = useCallback(async (cryptoCoin) => {
    setLoading(true);
    try {
      const data = await apiCall('/crypto', { method: 'POST', body: { userId, cryptoCoin, amount: 999, currency: 'usd' } });
      return data;
    } catch (err) {
      notify('error', err.message);
      return { walletAddress: 'not_configured', cryptoCoin, expiry: Date.now() + 1800000 };
    } finally {
      setLoading(false);
    }
  }, [userId, apiCall, notify]);

  const handleGiftRedeem = useCallback(async (code) => {
    setLoading(true);
    try {
      const result = await apiCall('/gift/redeem', { method: 'POST', body: { userId, code } });
      notify('success', 'Gift card redeemed!');
      return result;
    } catch (err) {
      notify('error', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, apiCall, notify]);

  const handleBillingAddressSave = useCallback(async (addr) => {
    setLoading(true);
    try {
      await apiCall('/billing-address', { method: 'POST', body: { userId, ...addr } });
      setBillingAddress(addr);
      notify('success', 'Billing address saved.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, apiCall, notify]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const pageBase = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const alertBase = 'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs flex items-center gap-2';

  return (
    <div className={`min-h-screen ${pageBase}`}>
      {/* Toast notifications */}
      {globalError && (
        <div className={`${alertBase} bg-red-600 text-white`}>
          <XCircle size={15} />
          {globalError}
        </div>
      )}
      {globalSuccess && (
        <div className={`${alertBase} bg-green-600 text-white`}>
          <CheckCircle size={15} />
          {globalSuccess}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Billing &amp; Subscription
            </h1>
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your plan, payment methods, and billing details.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-500">
              <RefreshCw size={14} className="animate-spin" />
              Loading…
            </div>
          )}
        </div>

        {/* Current plan */}
        <CurrentPlanCard
          currentTier={currentTier}
          subscriptionData={subscriptionData}
          onCancel={() => setShowCancelModal(true)}
          darkMode={darkMode}
        />

        {/* Plan comparison grid */}
        <PlanGrid
          currentTier={currentTier}
          onUpgrade={handleUpgrade}
          darkMode={darkMode}
        />

        {/* Payment methods */}
        <PaymentMethodSection
          onCardSubmit={handleCardSubmit}
          onCryptoPayment={handleCryptoPayment}
          onGiftRedeem={handleGiftRedeem}
          darkMode={darkMode}
          loading={loading}
        />

        {/* Billing address */}
        <BillingAddressForm
          initialAddress={billingAddress}
          onSave={handleBillingAddressSave}
          darkMode={darkMode}
          loading={loading}
        />

        {/* Transaction history */}
        <TransactionHistory transactions={transactions} darkMode={darkMode} />
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <CancelModal
          currentTier={currentTier}
          onConfirm={handleCancel}
          onClose={() => setShowCancelModal(false)}
          darkMode={darkMode}
          loading={loading}
        />
      )}
    </div>
  );
}
