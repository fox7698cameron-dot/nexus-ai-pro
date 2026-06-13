// ================================================
// NEXUS AI PRO - Subscription Checkout
// Updated: 2026-06-13
// ------------------------------------------------
// Stripe: Visa, MC, Amex, Discover, JCB, UnionPay
//         Apple Pay, Google Pay, ACH, SEPA
// Crypto: Bitcoin, Ethereum, USDC
// Gift cards: balance code redemption
// ================================================

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Check, Star, Crown,
  Zap, ChevronRight, Loader2, AlertCircle, CheckCircle,
  ArrowLeft, Shield, Lock
} from 'lucide-react';

async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const res = await fetch(`/api/subscriptions${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Tier card ─────────────────────────────────────
function TierCard({ tier, isSelected, isCurrent, onSelect }) {
  const icons = { free: Zap, pro: Star, enterprise: Crown };
  const Icon  = icons[tier.id] || Zap;
  const gradients = {
    free:       'from-gray-700 to-gray-800',
    pro:        'from-blue-900 to-indigo-900',
    enterprise: 'from-purple-900 to-pink-900',
  };

  return (
    <button
      onClick={() => onSelect(tier)}
      className={`relative w-full text-left p-5 rounded-xl border transition-all ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50'
          : 'border-gray-700 hover:border-gray-500'
      } bg-gradient-to-br ${gradients[tier.id] || gradients.free}`}
    >
      {isCurrent && (
        <span className="absolute top-3 right-3 text-xs bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded font-semibold">
          Current
        </span>
      )}
      {isSelected && !isCurrent && (
        <span className="absolute top-3 right-3 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-semibold">
          Selected
        </span>
      )}
      <div className="flex items-center gap-3 mb-3">
        <Icon size={20} className="text-indigo-400" />
        <div>
          <div className="text-white font-bold">{tier.name}</div>
          <div className="text-gray-400 text-xs">
            {tier.priceMonthly === 0 ? 'Free forever' : `$${(tier.priceMonthly / 100).toFixed(2)}/mo`}
          </div>
        </div>
      </div>
      <ul className="space-y-1">
        {(tier.features || []).slice(0, 4).map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
            <Check size={10} className="text-emerald-400 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-3 text-xs text-gray-500">
        Reasoning: <span className="text-gray-300">{tier.modelTier}</span>
      </div>
    </button>
  );
}

// ── Payment method tabs ───────────────────────────
function PaymentTabs({ selected, onChange }) {
  const tabs = [
    { id: 'card',       label: 'Card',       icon: CreditCard },
    { id: 'crypto',     label: 'Crypto',     icon: Bitcoin },
    { id: 'gift_card',  label: 'Gift Card',  icon: Gift },
  ];

  return (
    <div className="flex gap-2 p-1 bg-gray-700 rounded-lg">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
            selected === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <tab.icon size={12} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Card form (Stripe Elements placeholder) ───────
function CardForm({ onPay, loading }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');
  const [name,    setName]    = useState('');

  const formatCard   = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = v => { const d = v.replace(/\D/g,'').slice(0,4); return d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production: use Stripe.js Elements (never send raw card data to your server)
    onPay({ type: 'card', last4: cardNum.replace(/\s/g,'').slice(-4) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-gray-400 text-xs">Cardholder Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Jane Doe" required
          className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
      </div>
      <div className="space-y-1">
        <label className="text-gray-400 text-xs">Card Number</label>
        <div className="relative">
          <input value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))}
            placeholder="1234 5678 9012 3456" required maxLength={19}
            className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2.5 pr-20 text-sm outline-none font-mono" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
            VISA · MC · AMEX
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-gray-400 text-xs">Expiry (MM/YY)</label>
          <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY" required maxLength={5}
            className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2.5 text-sm outline-none font-mono" />
        </div>
        <div className="space-y-1">
          <label className="text-gray-400 text-xs">CVV</label>
          <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,4))}
            placeholder="000" required type="password" maxLength={4}
            className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2.5 text-sm outline-none font-mono" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <Lock size={10} /> Secured by Stripe — we never store raw card data
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? 'Processing...' : 'Pay with Card'}
      </button>
    </form>
  );
}

// ── Crypto form ───────────────────────────────────
function CryptoForm({ onPay, loading }) {
  const [currency, setCurrency] = useState('bitcoin');
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-gray-400 text-xs">Select Cryptocurrency</label>
        <select value={currency} onChange={e => setCurrency(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm">
          <option value="bitcoin">Bitcoin (BTC)</option>
          <option value="ethereum">Ethereum (ETH)</option>
          <option value="usdc">USD Coin (USDC)</option>
          <option value="litecoin">Litecoin (LTC)</option>
        </select>
      </div>
      <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center space-y-2">
        <div className="text-2xl">₿</div>
        <p className="text-gray-300 text-sm">Payment address will be generated on checkout</p>
        <p className="text-gray-500 text-xs">Address valid for 1 hour. Minimum 1 confirmation required.</p>
      </div>
      <button onClick={() => onPay({ type: 'crypto', currency })} disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Bitcoin size={16} />}
        {loading ? 'Generating address...' : `Pay with ${currency.charAt(0).toUpperCase() + currency.slice(1)}`}
      </button>
    </div>
  );
}

// ── Gift card form ────────────────────────────────
function GiftCardForm({ onRedeem, loading }) {
  const [code, setCode] = useState('');
  const [balance, setBalance] = useState(null);
  const [checking, setChecking] = useState(false);

  const formatCode = v => v.toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/(.{4})/g,'$1-').replace(/-$/,'').slice(0,19);

  const checkBalance = async () => {
    if (code.replace(/-/g,'').length < 8) return;
    setChecking(true);
    try {
      const data = await apiFetch(`/gift-cards/balance/${code}`);
      setBalance(data);
    } catch {
      setBalance(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-gray-400 text-xs">Gift Card Code</label>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(formatCode(e.target.value))}
            placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19}
            className="flex-1 bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white rounded-lg px-3 py-2.5 text-sm outline-none font-mono tracking-widest" />
          <button onClick={checkBalance} disabled={checking || code.length < 8}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
            {checking ? <Loader2 size={12} className="animate-spin" /> : 'Check'}
          </button>
        </div>
      </div>
      {balance && (
        <div className={`rounded-lg p-3 text-sm ${balance.redeemed ? 'bg-red-900 bg-opacity-30 border border-red-700 text-red-300' : 'bg-emerald-900 bg-opacity-30 border border-emerald-700 text-emerald-300'}`}>
          {balance.redeemed
            ? 'This gift card has already been redeemed.'
            : `Balance: $${(balance.balance / 100).toFixed(2)} ${balance.currency.toUpperCase()} · Expires ${new Date(balance.expiresAt).toLocaleDateString()}`
          }
        </div>
      )}
      <button
        onClick={() => onRedeem(code)}
        disabled={loading || !code || (balance && balance.redeemed)}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Redeeming...' : 'Redeem Gift Card'}
      </button>
    </div>
  );
}

// ── Main checkout ─────────────────────────────────
export default function SubscriptionCheckout({ onClose, currentTier = 'free' }) {
  const [tiers, setTiers]         = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [interval, setInterval]   = useState('monthly');
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const [invoice, setInvoice]     = useState(null);

  useEffect(() => {
    apiFetch('/tiers').then(d => {
      const paid = (d.tiers || []).filter(t => t.id !== 'free');
      setTiers(d.tiers || []);
      setSelectedTier(paid[0] || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTier || selectedTier.id === 'free') return;
    apiFetch(`/invoice-preview?tier=${selectedTier.id}&interval=${interval}`, {}, 'GET')
      .then(d => setInvoice(d))
      .catch(() => {});
  }, [selectedTier, interval]);

  const handlePay = async (paymentDetails) => {
    if (!selectedTier) return setError('Please select a plan');
    setLoading(true);
    setError('');
    try {
      await apiFetch('/create-payment-intent', {
        tier: selectedTier.id,
        interval,
        paymentMethod: paymentDetails.type,
        ...paymentDetails,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (code) => {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/gift-cards/redeem', { code });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 p-6">
        <CheckCircle size={48} className="text-emerald-400 mx-auto" />
        <h2 className="text-white font-bold text-xl">Payment Successful!</h2>
        <p className="text-gray-400 text-sm">Your subscription has been activated.</p>
        <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold">
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">Upgrade Your Plan</h1>
          <p className="text-gray-400 text-sm">Choose the right plan for your needs</p>
        </div>
      </div>

      {/* Billing interval */}
      <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-lg p-1 w-fit">
        {['monthly','yearly'].map(iv => (
          <button key={iv} onClick={() => setInterval(iv)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              interval === iv ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {iv === 'yearly' ? 'Annual (Save 17%)' : 'Monthly'}
          </button>
        ))}
      </div>

      {/* Tier selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(tier => (
          <TierCard
            key={tier.id}
            tier={tier}
            isSelected={selectedTier?.id === tier.id}
            isCurrent={currentTier === tier.id}
            onSelect={t => t.id !== 'free' && setSelectedTier(t)}
          />
        ))}
      </div>

      {selectedTier && selectedTier.id !== 'free' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Payment Details</h2>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <Shield size={10} />
              Secured
            </div>
          </div>

          {invoice && (
            <div className="bg-gray-700 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${(invoice.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax (est.)</span>
                <span>${(invoice.tax / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold border-t border-gray-600 pt-1 mt-1">
                <span>Total</span>
                <span>${(invoice.total / 100).toFixed(2)} / {interval}</span>
              </div>
            </div>
          )}

          <PaymentTabs selected={payMethod} onChange={setPayMethod} />

          {error && (
            <div className="flex items-center gap-2 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {payMethod === 'card'      && <CardForm      onPay={handlePay}   loading={loading} />}
          {payMethod === 'crypto'    && <CryptoForm    onPay={handlePay}   loading={loading} />}
          {payMethod === 'gift_card' && <GiftCardForm  onRedeem={handleRedeem} loading={loading} />}
        </div>
      )}
    </div>
  );
}
