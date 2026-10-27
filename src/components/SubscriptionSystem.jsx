// SubscriptionSystem.jsx — 2026-10-27
// Full subscription & payment system: Stripe, crypto, gift cards, multi-currency

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Shield, Lock, Key, User, Check, X, ChevronDown,
  Bitcoin, Wallet, Gift, AlertTriangle, CheckCircle, Loader2,
  Download, TrendingUp, BarChart3, Users, Zap, Star, Crown,
  ArrowUpRight, ArrowDownRight, RefreshCw, Info
} from 'lucide-react';

// ─── Config (all via env, never hardcoded) ────────────────────────────────────

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const API_URL = import.meta.env.VITE_API_URL || '/api';

// ─── i18n & currency ──────────────────────────────────────────────────────────

const LOCALES = {
  en: { currency: 'USD', symbol: '$', label: 'English' },
  es: { currency: 'EUR', symbol: '€', label: 'Español' },
  fr: { currency: 'EUR', symbol: '€', label: 'Français' },
  de: { currency: 'EUR', symbol: '€', label: 'Deutsch' },
  ja: { currency: 'JPY', symbol: '¥', label: '日本語' },
  zh: { currency: 'CNY', symbol: '¥', label: '中文' },
  pt: { currency: 'BRL', symbol: 'R$', label: 'Português' },
  ar: { currency: 'SAR', symbol: '﷼', label: 'العربية' },
  ko: { currency: 'KRW', symbol: '₩', label: '한국어' },
  ru: { currency: 'RUB', symbol: '₽', label: 'Русский' },
  gb: { currency: 'GBP', symbol: '£', label: 'English (UK)' },
  in: { currency: 'INR', symbol: '₹', label: 'English (IN)' },
};

const I18N = {
  en: { upgrade: 'Upgrade', downgrade: 'Downgrade', current: 'Current Plan', monthly: 'Monthly', annual: 'Annual', save: 'Save', perSeat: '/seat/mo', features: 'Features', payment: 'Payment Method', billing: 'Billing History', usage: 'Usage', cancel: 'Cancel Plan', giftCard: 'Gift Card', redeem: 'Redeem', crypto: 'Cryptocurrency', selectCard: 'Select Card Type', invoiceDownload: 'Download Invoice', proration: 'Proration note', cancelOffer: 'Special offer for you', loading: 'Loading...', taxNote: 'Tax included based on region', team: 'Team Plan', perMonth: '/mo', perYear: '/yr' },
  es: { upgrade: 'Mejorar', downgrade: 'Bajar', current: 'Plan actual', monthly: 'Mensual', annual: 'Anual', save: 'Ahorra', perSeat: '/asiento/mes', features: 'Características', payment: 'Método de pago', billing: 'Historial de facturación', usage: 'Uso', cancel: 'Cancelar plan', giftCard: 'Tarjeta regalo', redeem: 'Canjear', crypto: 'Criptomoneda', selectCard: 'Seleccionar tipo de tarjeta', invoiceDownload: 'Descargar factura', proration: 'Nota de prorrateo', cancelOffer: 'Oferta especial para ti', loading: 'Cargando...', taxNote: 'Impuesto incluido', team: 'Plan equipo', perMonth: '/mes', perYear: '/año' },
};

function getT(lang) { return I18N[lang] || I18N.en; }

// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceUSD: 0,
    priceUSDYear: 0,
    color: 'from-gray-500 to-gray-700',
    border: 'border-gray-700',
    badge: null,
    icon: User,
    features: ['5 AI chats/day', 'Basic models', '1 MB uploads', 'Standard support'],
    limits: { apiCalls: 150, storageGB: 0.1, seats: 1 },
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUSD: 9.99,
    priceUSDYear: 7.99,
    color: 'from-indigo-500 to-blue-600',
    border: 'border-indigo-500/50',
    badge: 'Popular',
    icon: Star,
    features: ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support', 'Analytics dashboard', '2FA/Biometric auth'],
    limits: { apiCalls: 10000, storageGB: 10, seats: 1 },
  },
  {
    id: 'business',
    name: 'Business',
    priceUSD: 29.99,
    priceUSDYear: 23.99,
    color: 'from-purple-500 to-pink-600',
    border: 'border-purple-500/50',
    badge: 'Best Value',
    icon: Crown,
    features: ['Everything in Pro', 'Up to 10 seats', '1 GB uploads', 'API access', 'Game dev tracking', 'Security dashboard', 'Custom integrations'],
    limits: { apiCalls: 100000, storageGB: 100, seats: 10 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceUSD: null,
    priceUSDYear: null,
    color: 'from-yellow-500 to-orange-600',
    border: 'border-yellow-500/50',
    badge: 'Custom',
    icon: Shield,
    features: ['Unlimited everything', 'Unlimited seats', 'SLA guarantee', 'Dedicated support', 'On-premise option', 'Custom integrations', 'Audit logs', 'SSO/SAML'],
    limits: { apiCalls: Infinity, storageGB: Infinity, seats: Infinity },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(usd, locale) {
  if (usd === null) return 'Custom';
  if (usd === 0) return 'Free';
  const loc = LOCALES[locale] || LOCALES.en;
  const rate = { USD: 1, EUR: 0.92, JPY: 149, CNY: 7.2, BRL: 5.0, SAR: 3.75, KRW: 1320, RUB: 89, GBP: 0.79, INR: 83 }[loc.currency] || 1;
  const converted = usd * rate;
  return `${loc.symbol}${converted < 10 ? converted.toFixed(2) : Math.round(converted)}`;
}

function UsageBar({ label, used, max, color }) {
  const pct = max === Infinity ? 0 : Math.min(100, Math.round((used / max) * 100));
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : color;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{max === Infinity ? `${used.toLocaleString()} / ∞` : `${used.toLocaleString()} / ${max.toLocaleString()}`}</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Payment panels ───────────────────────────────────────────────────────────

function StripePanel({ planId, onSuccess, onError, t }) {
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [cardType, setCardType] = useState('visa');
  const [loading, setLoading] = useState(false);

  const cardTypes = ['visa', 'mastercard', 'amex', 'discover', 'unionpay'];

  function updateCard(field, value) {
    setCardData(d => ({ ...d, [field]: value }));
  }

  async function handlePay(e) {
    e.preventDefault();
    if (!STRIPE_PK) {
      onError('Configure VITE_STRIPE_PUBLIC_KEY in .env to enable payments');
      return;
    }
    setLoading(true);
    try {
      // In production: use Stripe.js to tokenize, never send raw card data
      const res = await fetch(`${API_URL}/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, paymentMethod: 'stripe', cardType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.clientSecret && window.Stripe) {
        const stripe = window.Stripe(STRIPE_PK);
        const { error } = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: { token: data.cardToken } },
        });
        if (error) throw new Error(error.message);
      }
      onSuccess(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      {!STRIPE_PK && (
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5 text-yellow-400 text-xs">
          <Info size={14} className="shrink-0 mt-0.5" />
          Add <code className="bg-yellow-500/20 px-1 rounded">VITE_STRIPE_PUBLIC_KEY</code> to .env to enable live payments.
        </div>
      )}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">{t.selectCard}</label>
        <div className="flex gap-2 flex-wrap">
          {cardTypes.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCardType(c)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${cardType === c ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Cardholder Name</label>
        <input
          type="text"
          required
          value={cardData.name}
          onChange={e => updateCard('name', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Full name"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Card Number</label>
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={19}
            value={cardData.number}
            onChange={e => updateCard('number', e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none tracking-widest"
            placeholder="0000 0000 0000 0000"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Expiry</label>
          <input
            type="text"
            required
            maxLength={5}
            value={cardData.expiry}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, '');
              if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
              updateCard('expiry', v);
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="MM/YY"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">CVC</label>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={4}
            value={cardData.cvc}
            onChange={e => updateCard('cvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="CVC"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Lock size={12} />
        {t.taxNote}
      </p>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? t.loading : 'Pay Securely'}
      </button>
    </form>
  );
}

function CryptoPanel({ planId, onSuccess, onError }) {
  const [coin, setCoin] = useState('ETH');
  const [walletAddr, setWalletAddr] = useState('');
  const [loading, setLoading] = useState(false);

  const coins = [
    { id: 'ETH', label: 'Ethereum', color: 'text-blue-400' },
    { id: 'BTC', label: 'Bitcoin', color: 'text-orange-400' },
    { id: 'USDC', label: 'USD Coin', color: 'text-blue-300' },
    { id: 'SOL', label: 'Solana', color: 'text-purple-400' },
  ];

  async function handleConnect() {
    setLoading(true);
    try {
      if (coin === 'ETH' || coin === 'USDC') {
        const provider = import.meta.env.VITE_CRYPTO_WALLET_PROVIDER;
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setWalletAddr(accounts[0]);
        } else if (provider) {
          window.open(provider, '_blank');
        } else {
          onError('Configure VITE_CRYPTO_WALLET_PROVIDER in .env or install MetaMask');
          return;
        }
      }
      const res = await fetch(`${API_URL}/subscription/crypto-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, coin, walletAddress: walletAddr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {coins.map(c => (
          <button
            key={c.id}
            onClick={() => setCoin(c.id)}
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${coin === c.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
          >
            <Bitcoin size={16} className={c.color} />
            {c.label}
          </button>
        ))}
      </div>
      {walletAddr && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-green-400 font-mono break-all">
          ✓ {walletAddr.slice(0, 8)}...{walletAddr.slice(-6)}
        </div>
      )}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
        {loading ? 'Connecting...' : walletAddr ? 'Confirm Payment' : `Connect ${coin} Wallet`}
      </button>
    </div>
  );
}

function GiftCardPanel({ onSuccess, onError }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRedeem() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscription/redeem-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired gift card');
      onSuccess(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Enter your gift card code to redeem.</p>
      <div className="relative">
        <Gift size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm font-mono tracking-widest focus:border-indigo-500 focus:outline-none uppercase"
          placeholder="XXXX-XXXX-XXXX-XXXX"
        />
      </div>
      <button
        onClick={handleRedeem}
        disabled={loading || !code.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Redeeming...' : 'Redeem Code'}
      </button>
    </div>
  );
}

// ─── Cancel flow ──────────────────────────────────────────────────────────────

function CancelFlow({ plan, onCancel, onKeep }) {
  const [step, setStep] = useState(0);
  const offers = [
    { title: '25% off for 3 months', desc: "We'd hate to lose you. Stay and save.", action: 'Apply Discount' },
    { title: 'Pause instead?', desc: 'Pause your plan for up to 3 months at no cost.', action: 'Pause Plan' },
  ];

  if (step < offers.length) {
    const offer = offers[step];
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto">
          <Star size={24} className="text-yellow-400" />
        </div>
        <h3 className="font-semibold text-white">{offer.title}</h3>
        <p className="text-sm text-gray-400">{offer.desc}</p>
        <div className="flex gap-3">
          <button onClick={() => { onKeep(); }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
            {offer.action}
          </button>
          <button onClick={() => setStep(s => s + 1)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg font-medium text-sm transition-colors border border-gray-700">
            No thanks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <AlertTriangle size={32} className="text-red-400 mx-auto" />
      <h3 className="font-semibold text-white">Cancel {plan.name}?</h3>
      <p className="text-sm text-gray-400">You will lose access to all {plan.name} features at the end of your billing cycle.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
          Yes, Cancel
        </button>
        <button onClick={onKeep} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg font-medium text-sm transition-colors border border-gray-700">
          Keep Plan
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SubscriptionSystem({ userId, currentPlan = 'free', onUpgrade }) {
  const [lang] = useState(() => navigator.language?.split('-')[0] || 'en');
  const t = getT(lang);
  const locale = LOCALES[lang] || LOCALES.en;
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'billing' | 'usage' | 'payment'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usage] = useState({ apiCalls: 2341, storageGB: 3.2, seats: 2 });
  const [billingHistory] = useState([
    { id: 'inv-001', date: '2026-10-01', amount: 9.99, status: 'paid', plan: 'Pro' },
    { id: 'inv-002', date: '2026-09-01', amount: 9.99, status: 'paid', plan: 'Pro' },
    { id: 'inv-003', date: '2026-08-01', amount: 9.99, status: 'paid', plan: 'Pro' },
  ]);

  const currentPlanData = PLANS.find(p => p.id === currentPlan) || PLANS[0];

  function handleUpgradeClick(plan) {
    setSelectedPlan(plan);
    setActiveTab('payment');
    setError('');
    setSuccess('');
  }

  function handlePaySuccess(data) {
    setSuccess(`Successfully subscribed to ${selectedPlan?.name}!`);
    if (onUpgrade) onUpgrade(selectedPlan?.id, data);
    setSelectedPlan(null);
    setActiveTab('plans');
  }

  function handleInvoiceDownload(invoice) {
    // In production: fetch signed PDF URL from API
    const blob = new Blob([`Invoice ${invoice.id}\n${invoice.date}\nAmount: $${invoice.amount}\nPlan: ${invoice.plan}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-invoice-${invoice.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs = ['plans', 'usage', 'billing', 'payment'];

  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Subscription</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Current: <span className="text-indigo-400 font-medium">{currentPlanData.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
            {['monthly', 'annual'].map(p => (
              <button
                key={p}
                onClick={() => setBillingPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${billingPeriod === p ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {t[p]}
                {p === 'annual' && <span className="ml-1.5 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">{t.save} 20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-full overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            <AlertTriangle size={15} />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
            <CheckCircle size={15} />
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Plans tab */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const price = billingPeriod === 'annual' ? plan.priceUSDYear : plan.priceUSD;
              const isCurrent = plan.id === currentPlan;
              const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan);
              return (
                <div key={plan.id} className={`relative bg-gray-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:scale-[1.01] ${isCurrent ? plan.border + ' border-2' : 'border-gray-800 hover:border-gray-700'}`}>
                  {plan.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r ${plan.color} text-white text-xs font-bold px-3 py-0.5 rounded-full`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{plan.name}</h3>
                      {isCurrent && <span className="text-xs text-indigo-400">{t.current}</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-white">{formatPrice(price, lang)}</span>
                    {price !== null && price !== 0 && <span className="text-gray-400 text-sm">{billingPeriod === 'annual' ? t.perYear : t.perMonth}</span>}
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check size={14} className="text-green-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      onClick={() => setShowCancel(true)}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
                    >
                      {t.cancel}
                    </button>
                  ) : plan.id === 'enterprise' ? (
                    <a
                      href={`mailto:enterprise@nexusai.pro?subject=Enterprise%20Plan%20Inquiry`}
                      className={`w-full bg-gradient-to-r ${plan.color} text-white py-2 rounded-lg text-sm font-semibold text-center block transition-opacity hover:opacity-90`}
                    >
                      Contact Sales
                    </a>
                  ) : (
                    <button
                      onClick={() => handleUpgradeClick(plan)}
                      className={`w-full bg-gradient-to-r ${plan.color} text-white py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5`}
                    >
                      {isDowngrade ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                      {isDowngrade ? t.downgrade : t.upgrade}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Usage tab */}
        {activeTab === 'usage' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
            <h2 className="font-semibold text-white flex items-center gap-2"><BarChart3 size={18} className="text-indigo-400" /> {t.usage}</h2>
            <div className="space-y-4">
              <UsageBar label="API Calls" used={usage.apiCalls} max={currentPlanData.limits.apiCalls} color="bg-indigo-500" />
              <UsageBar label="Storage" used={usage.storageGB} max={currentPlanData.limits.storageGB} color="bg-blue-500" />
              <UsageBar label="Team Seats" used={usage.seats} max={currentPlanData.limits.seats} color="bg-purple-500" />
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={12} /> Resets at the start of each billing cycle</p>
          </div>
        )}

        {/* Billing tab */}
        {activeTab === 'billing' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><CreditCard size={18} className="text-indigo-400" /> {t.billing}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                    <th className="px-6 py-3 text-left">Invoice</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Plan</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {billingHistory.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-300 font-mono text-xs">{inv.id}</td>
                      <td className="px-6 py-4 text-gray-300">{inv.date}</td>
                      <td className="px-6 py-4 text-gray-300">{inv.plan}</td>
                      <td className="px-6 py-4 text-right text-white font-medium">{formatPrice(inv.amount, lang)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-2 py-0.5 rounded-full">{inv.status}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleInvoiceDownload(inv)} className="text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 mx-auto text-xs">
                          <Download size={14} />
                          {t.invoiceDownload}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment tab */}
        {activeTab === 'payment' && (
          <div className="max-w-lg mx-auto">
            {selectedPlan ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">Subscribe to {selectedPlan.name}</h2>
                  <button onClick={() => { setSelectedPlan(null); setActiveTab('plans'); }} className="text-gray-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                {billingPeriod === 'annual' && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-indigo-400">
                    ℹ️ {t.proration}: Switching plans will prorate the remaining billing period.
                  </div>
                )}
                {/* Payment method selector */}
                <div className="flex gap-2">
                  {[['stripe', CreditCard, 'Card'], ['crypto', Bitcoin, 'Crypto'], ['gift', Gift, 'Gift Card']].map(([m, Icon, label]) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${paymentMethod === m ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'stripe' && <StripePanel planId={selectedPlan.id} onSuccess={handlePaySuccess} onError={setError} t={t} />}
                {paymentMethod === 'crypto' && <CryptoPanel planId={selectedPlan.id} onSuccess={handlePaySuccess} onError={setError} />}
                {paymentMethod === 'gift' && <GiftCardPanel onSuccess={handlePaySuccess} onError={setError} />}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-gray-400 space-y-3">
                <CreditCard size={32} className="mx-auto text-gray-600" />
                <p>Select a plan to manage payment</p>
                <button onClick={() => setActiveTab('plans')} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                  View Plans →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel modal */}
        {showCancel && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <CancelFlow
                plan={currentPlanData}
                onCancel={async () => {
                  await fetch(`${API_URL}/subscription/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
                  setSuccess('Plan cancelled. Access continues until end of billing period.');
                  setShowCancel(false);
                }}
                onKeep={() => setShowCancel(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
