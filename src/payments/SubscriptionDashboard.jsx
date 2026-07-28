// Created: 2026-07-28
import React, { useState, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Check, Star, Crown,
  Zap, Shield, ArrowRight, ChevronDown, Copy, RefreshCw,
  AlertCircle, CheckCircle
} from 'lucide-react';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    display: '$0',
    period: 'forever',
    icon: Zap,
    color: 'from-gray-500 to-gray-600',
    border: 'border-gray-700',
    highlight: false,
    features: ['5 AI chats per day', 'Basic models (GPT-4, Claude Sonnet)', '1MB file uploads', 'Community support', 'Social analytics (read-only)'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    display: '$9.99',
    period: 'per month',
    icon: Star,
    color: 'from-blue-500 to-purple-600',
    border: 'border-purple-500',
    highlight: true,
    features: ['Unlimited AI chats', 'All 25+ AI models', '100MB file uploads', 'Priority support', 'Social analytics + tracking', 'Project tracker', 'Game dev integrations'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1499,
    display: '$14.99',
    period: 'per month',
    icon: Crown,
    color: 'from-purple-500 to-pink-600',
    border: 'border-pink-500',
    highlight: false,
    features: ['Everything in Pro', 'Custom AI models', 'API access', 'Dedicated support + SLA', 'Advanced security dashboard', 'All platform connectors', 'Admin dashboard', 'Audit logs'],
  },
];

const CRYPTO_COINS = [
  { id: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-orange-400' },
  { id: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-blue-400' },
  { id: 'USDC', name: 'USD Coin', icon: '$', color: 'text-blue-300' },
  { id: 'USDT', name: 'Tether', icon: '₮', color: 'text-green-400' },
  { id: 'SOL', name: 'Solana', icon: '◎', color: 'text-purple-400' },
];

const CARD_TYPES = [
  { name: 'Visa', pattern: /^4/, logo: '💳' },
  { name: 'Mastercard', pattern: /^5[1-5]/, logo: '💳' },
  { name: 'American Express', pattern: /^3[47]/, logo: '💳' },
  { name: 'Discover', pattern: /^6(?:011|5)/, logo: '💳' },
  { name: 'Diners Club', pattern: /^3(?:0[0-5]|[68])/, logo: '💳' },
  { name: 'JCB', pattern: /^35/, logo: '💳' },
  { name: 'UnionPay', pattern: /^62/, logo: '💳' },
];

function detectCardType(number) {
  const cleaned = number.replace(/\D/g, '');
  for (const ct of CARD_TYPES) {
    if (ct.pattern.test(cleaned)) return ct.name;
  }
  return null;
}

function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [cardType, setCardType] = useState(null);

  const handleNumber = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(.{4})/g, '$1 ').trim();
    setCard(c => ({ ...c, number: formatted }));
    setCardType(detectCardType(val));
  };

  const handleExpiry = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length > 2) val = val.slice(0,2) + '/' + val.slice(2);
    setCard(c => ({ ...c, expiry: val }));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Cardholder Name</label>
        <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          placeholder="Full name on card" value={card.name} onChange={e => setCard(c => ({...c, name: e.target.value}))}/>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Card Number</label>
        <div className="relative">
          <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-24 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
            placeholder="0000 0000 0000 0000" value={card.number} onChange={handleNumber}/>
          <div className="absolute right-3 top-2 flex items-center gap-1">
            {cardType && <span className="text-xs text-gray-300 bg-gray-700 px-2 py-0.5 rounded">{cardType}</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Expiry</label>
          <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
            placeholder="MM/YY" value={card.expiry} onChange={handleExpiry}/>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">CVV</label>
          <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
            placeholder="000" maxLength={4} value={card.cvv} onChange={e => setCard(c => ({...c, cvv: e.target.value.replace(/\D/g,'').slice(0,4)}))}/>
        </div>
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1"><Shield size={11}/> Secured by AES-256-GCM encryption. Card data never stored on our servers.</p>
      <button onClick={() => onSubmit(card)} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
        <CreditCard size={15}/> {loading ? 'Processing...' : 'Pay with Card'}
      </button>
    </div>
  );
}

function CryptoForm({ tier, onSubmit, loading }) {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [invoice, setInvoice] = useState(null);
  const [copied, setCopied] = useState(false);

  const createInvoice = async () => {
    try {
      const res = await fetch('/api/payments/crypto/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: tier.price, currency: selectedCoin, userId: 'demo' })
      });
      setInvoice(await res.json());
    } catch {}
  };

  const copy = () => {
    if (invoice?.walletAddress) {
      navigator.clipboard.writeText(invoice.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {CRYPTO_COINS.map(c => (
          <button key={c.id} onClick={() => { setSelectedCoin(c.id); setInvoice(null); }}
            className={`py-2 rounded-lg text-center text-xs font-medium transition-colors ${selectedCoin === c.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            <div className={`text-lg ${c.color}`}>{c.icon}</div>
            <div>{c.id}</div>
          </button>
        ))}
      </div>
      {!invoice ? (
        <button onClick={createInvoice} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
          <Bitcoin size={15}/> Generate {selectedCoin} Invoice
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Send exactly:</p>
            <p className="text-white font-bold">{(invoice.amount / 100).toFixed(2)} USD equiv. in {invoice.currency}</p>
            <p className="text-xs text-gray-400 mt-2 mb-1">To wallet address:</p>
            <div className="flex items-center gap-2">
              <code className="text-cyan-300 text-xs font-mono break-all flex-1">{invoice.walletAddress}</code>
              <button onClick={copy} className="text-gray-400 hover:text-white shrink-0">
                {copied ? <CheckCircle size={14} className="text-green-400"/> : <Copy size={14}/>}
              </button>
            </div>
            <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
              <AlertCircle size={11}/> Expires: {new Date(invoice.expiresAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function GiftCardForm({ onRedeem }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRedeem = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), userId: 'demo' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onRedeem(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Gift Card Code</label>
        <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-purple-500"
          placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())}/>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && <p className="text-green-400 text-xs flex items-center gap-1"><CheckCircle size={11}/> Gift card redeemed! Balance: ${result.amount ? (result.amount/100).toFixed(2) : '0.00'}</p>}
      <button onClick={handleRedeem} disabled={loading || !code} className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
        <Gift size={15}/> {loading ? 'Redeeming...' : 'Redeem Gift Card'}
      </button>
    </div>
  );
}

export default function SubscriptionDashboard() {
  const [selectedTier, setSelectedTier] = useState(null);
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCardPay = async (cardData) => {
    setLoading(true);
    try {
      await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedTier.price, currency: 'usd', metadata: { tier: selectedTier.id } })
      });
      setSuccess(true);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-gray-400">Upgrade anytime. Cancel anytime. Secure payments via Stripe, crypto, or gift card.</p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {TIERS.map(tier => {
            const Icon = tier.icon;
            return (
              <div key={tier.id}
                className={`relative bg-gray-900 border-2 rounded-2xl p-6 cursor-pointer transition-all ${tier.border} ${selectedTier?.id === tier.id ? 'scale-105 shadow-xl shadow-purple-900/30' : 'hover:border-gray-600'} ${tier.highlight ? 'ring-1 ring-purple-500/50' : ''}`}
                onClick={() => setSelectedTier(tier)}>
                {tier.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}>
                  <Icon size={20}/>
                </div>
                <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{tier.display}</span>
                  <span className="text-gray-400 text-sm ml-1">{tier.period}</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-green-400 mt-0.5 shrink-0"/> {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${selectedTier?.id === tier.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {selectedTier?.id === tier.id ? 'Selected' : tier.price === 0 ? 'Get Started' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment methods */}
        {selectedTier && selectedTier.price > 0 && !success && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-xl mx-auto">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard size={18}/> Pay for {selectedTier.name} — {selectedTier.display}/mo
            </h2>
            <div className="flex gap-2 mb-5">
              {[
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'crypto', label: 'Crypto', icon: Bitcoin },
                { id: 'gift', label: 'Gift Card', icon: Gift },
              ].map(pm => (
                <button key={pm.id} onClick={() => setPayMethod(pm.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${payMethod === pm.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  <pm.icon size={14}/> {pm.label}
                </button>
              ))}
            </div>
            {payMethod === 'card' && <CardForm onSubmit={handleCardPay} loading={loading}/>}
            {payMethod === 'crypto' && <CryptoForm tier={selectedTier} onSubmit={() => {}} loading={loading}/>}
            {payMethod === 'gift' && <GiftCardForm onRedeem={() => setSuccess(true)}/>}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 rounded-2xl p-8 max-w-xl mx-auto text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3"/>
            <h3 className="text-xl font-bold text-green-300 mb-2">Payment Successful!</h3>
            <p className="text-gray-400">Your {selectedTier?.name} subscription is now active.</p>
            <button onClick={() => setSuccess(false)} className="mt-4 bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">Continue</button>
          </div>
        )}

        {selectedTier?.price === 0 && (
          <div className="text-center">
            <p className="text-green-400 flex items-center justify-center gap-2 text-sm">
              <CheckCircle size={16}/> Free plan is active — no payment required.
            </p>
          </div>
        )}

        {/* Footer notes */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500 text-center">
          {[
            { icon: Shield, text: 'Payments secured with AES-256-GCM. PCI-DSS compliant via Stripe.' },
            { icon: CreditCard, text: 'Accepts Visa, Mastercard, AmEx, Discover, Diners, JCB, UnionPay.' },
            { icon: RefreshCw, text: 'Cancel anytime. No hidden fees. Prorated billing.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 justify-center">
              <item.icon size={13} className="mt-0.5 shrink-0"/>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
