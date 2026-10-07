// PaymentSystem - 2026-10-07
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Bitcoin,
  Gift,
  Shield,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  Star,
  Zap,
  Building2,
  Check,
  X,
  Clock,
  DollarSign,
  Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const COINBASE_COMMERCE_KEY = import.meta.env.VITE_COINBASE_COMMERCE_KEY;

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    icon: Star,
    color: 'text-slate-400',
    badge: null,
    features: [
      { label: 'AI messages per day', value: '20' },
      { label: 'Models', value: 'Basic (GPT-3.5)' },
      { label: 'File uploads', value: '5 MB/month' },
      { label: 'History retention', value: '7 days' },
      { label: 'API access', value: false },
      { label: 'Priority support', value: false },
      { label: 'Team collaboration', value: false },
      { label: 'Custom avatars', value: false },
      { label: 'Automation workflows', value: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    icon: Zap,
    color: 'text-violet-400',
    badge: 'Popular',
    features: [
      { label: 'AI messages per day', value: 'Unlimited' },
      { label: 'Models', value: 'All models incl. Claude 3.5, GPT-4o' },
      { label: 'File uploads', value: '5 GB/month' },
      { label: 'History retention', value: 'Unlimited' },
      { label: 'API access', value: true },
      { label: 'Priority support', value: true },
      { label: 'Team collaboration', value: false },
      { label: 'Custom avatars', value: true },
      { label: 'Automation workflows', value: '10 active' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 14.99,
    period: 'month',
    icon: Building2,
    color: 'text-amber-400',
    badge: 'Best Value',
    features: [
      { label: 'AI messages per day', value: 'Unlimited' },
      { label: 'Models', value: 'All models + early access' },
      { label: 'File uploads', value: 'Unlimited' },
      { label: 'History retention', value: 'Unlimited' },
      { label: 'API access', value: true },
      { label: 'Priority support', value: '24/7 dedicated' },
      { label: 'Team collaboration', value: 'Up to 25 seats' },
      { label: 'Custom avatars', value: 'Unlimited' },
      { label: 'Automation workflows', value: 'Unlimited' },
    ],
  },
];

const CARD_BRANDS = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex', label: 'Amex' },
  { id: 'discover', label: 'Discover' },
  { id: 'jcb', label: 'JCB' },
  { id: 'unionpay', label: 'UnionPay' },
];

const CRYPTO_OPTIONS = [
  { id: 'btc', label: 'Bitcoin', symbol: 'BTC', color: 'text-orange-400' },
  { id: 'eth', label: 'Ethereum', symbol: 'ETH', color: 'text-indigo-400' },
  { id: 'usdc', label: 'USD Coin', symbol: 'USDC', color: 'text-blue-400' },
  { id: 'usdt', label: 'Tether', symbol: 'USDT', color: 'text-emerald-400' },
];

const MOCK_BILLING_HISTORY = [
  { id: 'inv_001', date: '2026-09-07', amount: 9.99, plan: 'Pro', status: 'paid', method: 'Visa •••• 4242' },
  { id: 'inv_002', date: '2026-08-07', amount: 9.99, plan: 'Pro', status: 'paid', method: 'Visa •••• 4242' },
  { id: 'inv_003', date: '2026-07-07', amount: 9.99, plan: 'Pro', status: 'paid', method: 'Mastercard •••• 5555' },
  { id: 'inv_004', date: '2026-06-07', amount: 0.00, plan: 'Free', status: 'free', method: '—' },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount) {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const map = {
    paid: { icon: CheckCircle, className: 'text-emerald-400 bg-emerald-900/40', label: 'Paid' },
    pending: { icon: Clock, className: 'text-amber-400 bg-amber-900/40', label: 'Pending' },
    failed: { icon: XCircle, className: 'text-red-400 bg-red-900/40', label: 'Failed' },
    free: { icon: Star, className: 'text-slate-400 bg-slate-800', label: 'Free' },
  };
  const cfg = map[status] ?? map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function SecurityBadges() {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
        <Shield size={13} className="text-emerald-400" />
        PCI DSS Level 1
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
        <Lock size={13} className="text-blue-400" />
        256-bit SSL
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
        <CheckCircle size={13} className="text-violet-400" />
        SOC 2 Type II
      </div>
    </div>
  );
}

function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 hover:text-red-100 transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function SuccessAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm">
      <CheckCircle size={16} className="shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 hover:text-emerald-100 transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// Plan comparison table row
function FeatureRow({ label, free, pro, enterprise }) {
  const renderCell = (val) => {
    if (val === true) return <Check size={16} className="mx-auto text-emerald-400" />;
    if (val === false) return <X size={16} className="mx-auto text-slate-600" />;
    return <span className="text-slate-300 text-sm">{val}</span>;
  };
  return (
    <tr className="border-t border-slate-800">
      <td className="py-3 pr-4 text-sm text-slate-400">{label}</td>
      <td className="py-3 px-4 text-center">{renderCell(free)}</td>
      <td className="py-3 px-4 text-center bg-violet-900/10">{renderCell(pro)}</td>
      <td className="py-3 px-4 text-center">{renderCell(enterprise)}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Card payment form
// ---------------------------------------------------------------------------

function CardPaymentForm({ plan, onSuccess, onError, onCancel }) {
  const [form, setForm] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [loading, setLoading] = useState(false);
  const [detectedBrand, setDetectedBrand] = useState(null);

  const detectBrand = (num) => {
    const clean = num.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^5[1-5]/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6(?:011|5)/.test(clean)) return 'discover';
    if (/^35/.test(clean)) return 'jcb';
    if (/^62/.test(clean)) return 'unionpay';
    return null;
  };

  const formatCardNumber = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  };

  const handleChange = (field, value) => {
    let processed = value;
    if (field === 'number') {
      processed = formatCardNumber(value);
      setDetectedBrand(detectBrand(processed));
    }
    if (field === 'expiry') processed = formatExpiry(value);
    if (field === 'cvc') processed = value.replace(/\D/g, '').slice(0, 4);
    setForm((prev) => ({ ...prev, [field]: processed }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Cardholder name is required.';
    const cleanNum = form.number.replace(/\s/g, '');
    if (cleanNum.length < 13) return 'Card number is incomplete.';
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) return 'Expiry must be MM/YY.';
    const [mm, yy] = form.expiry.split('/').map(Number);
    const now = new Date();
    const expDate = new Date(2000 + yy, mm - 1, 1);
    if (mm < 1 || mm > 12 || expDate < new Date(now.getFullYear(), now.getMonth(), 1)) return 'Card is expired or expiry is invalid.';
    if (form.cvc.length < 3) return 'CVC is incomplete.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { onError(validationError); return; }

    if (!STRIPE_PUBLIC_KEY) {
      onError('Payment service is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      // In production: load Stripe.js, create a PaymentMethod, then call your backend
      // stripe.createPaymentMethod({ type: 'card', card: cardElement })
      // For now simulate a network round-trip
      await new Promise((r) => setTimeout(r, 1500));
      onSuccess({
        method: 'card',
        last4: form.number.replace(/\s/g, '').slice(-4),
        brand: detectedBrand ?? 'card',
        plan,
      });
    } catch (err) {
      onError(err.message ?? 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {CARD_BRANDS.map((brand) => (
          <span
            key={brand.id}
            className={`px-2 py-1 rounded text-xs font-medium border transition ${
              detectedBrand === brand.id
                ? 'border-violet-500 bg-violet-900/40 text-violet-300'
                : 'border-slate-700 bg-slate-800 text-slate-500'
            }`}
          >
            {brand.label}
          </span>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Cardholder Name</label>
        <input
          className={inputCls}
          type="text"
          placeholder="Jane Smith"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          autoComplete="cc-name"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Card Number</label>
        <input
          className={inputCls}
          type="text"
          inputMode="numeric"
          placeholder="1234 5678 9012 3456"
          value={form.number}
          onChange={(e) => handleChange('number', e.target.value)}
          autoComplete="cc-number"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Expiry</label>
          <input
            className={inputCls}
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={form.expiry}
            onChange={(e) => handleChange('expiry', e.target.value)}
            autoComplete="cc-exp"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">CVC</label>
          <input
            className={inputCls}
            type="text"
            inputMode="numeric"
            placeholder="•••"
            value={form.cvc}
            onChange={(e) => handleChange('cvc', e.target.value)}
            autoComplete="cc-csc"
          />
        </div>
      </div>

      <SecurityBadges />

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock size={14} />
              Pay {formatCurrency(plan.price)}/mo
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Crypto payment panel
// ---------------------------------------------------------------------------

function CryptoPaymentPanel({ plan, onSuccess, onError, onCancel }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chargeUrl, setChargeUrl] = useState(null);

  const handleCreate = async () => {
    if (!selected) { onError('Please select a cryptocurrency.'); return; }
    if (!COINBASE_COMMERCE_KEY) {
      onError('Crypto payments are not configured. Please contact support.');
      return;
    }
    setLoading(true);
    try {
      // In production: POST /api/payments/crypto/charge with { planId, currency: selected }
      // which calls the Coinbase Commerce API server-side (never expose COINBASE_COMMERCE_KEY client-side)
      await new Promise((r) => setTimeout(r, 1200));
      setChargeUrl(`https://commerce.coinbase.com/charges/DEMO_${selected.toUpperCase()}`);
    } catch (err) {
      onError(err.message ?? 'Failed to create charge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (chargeUrl) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 space-y-2">
          <p className="font-medium text-white">Complete your payment</p>
          <p>
            A Coinbase Commerce charge has been created. Click the button below to open the secure
            payment page and send <strong>{selected?.toUpperCase()}</strong> to pay for{' '}
            <strong>{plan.name}</strong>.
          </p>
          <p className="text-xs text-slate-500">
            The charge expires in 60 minutes. After payment, your subscription will activate within
            1–3 network confirmations.
          </p>
        </div>
        <a
          href={chargeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition"
        >
          Open Coinbase Commerce ↗
        </a>
        <button
          onClick={() => onSuccess({ method: 'crypto', currency: selected, plan })}
          className="block w-full text-center px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
        >
          I've completed the payment
        </button>
        <button onClick={onCancel} className="block w-full text-center text-xs text-slate-500 hover:text-slate-400 transition">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Select a cryptocurrency to pay with:</p>
      <div className="grid grid-cols-2 gap-3">
        {CRYPTO_OPTIONS.map((crypto) => (
          <button
            key={crypto.id}
            onClick={() => setSelected(crypto.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
              selected === crypto.id
                ? 'border-violet-500 bg-violet-900/20'
                : 'border-slate-700 bg-slate-800 hover:border-slate-600'
            }`}
          >
            <Bitcoin size={20} className={crypto.color} />
            <div>
              <p className="text-sm font-medium text-white">{crypto.label}</p>
              <p className="text-xs text-slate-500">{crypto.symbol}</p>
            </div>
          </button>
        ))}
      </div>

      <SecurityBadges />

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={loading || !selected}
          className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Bitcoin size={14} />}
          {loading ? 'Creating charge…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gift card redemption
// ---------------------------------------------------------------------------

function GiftCardPanel({ onSuccess, onError, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCode = (val) =>
    val
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 16)
      .replace(/(.{4})/g, '$1-')
      .replace(/-$/, '');

  const handleRedeem = async (e) => {
    e.preventDefault();
    const clean = code.replace(/-/g, '');
    if (clean.length < 8) { onError('Please enter a valid gift card code.'); return; }
    setLoading(true);
    try {
      // In production: POST /api/payments/gift-card/redeem with { code: clean }
      await new Promise((r) => setTimeout(r, 1000));
      if (clean === 'INVALID00000000') throw new Error('Gift card code is invalid or already redeemed.');
      onSuccess({ method: 'gift_card', code: clean });
    } catch (err) {
      onError(err.message ?? 'Failed to redeem gift card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRedeem} className="space-y-4">
      <p className="text-sm text-slate-400">Enter your gift card code below to apply it to your account.</p>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Gift Card Code</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition tracking-widest font-mono"
          type="text"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(formatCode(e.target.value))}
          autoComplete="off"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || code.replace(/-/g, '').length < 8}
          className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Redeeming…
            </>
          ) : (
            <>
              <Gift size={14} />
              Redeem
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Invoice modal
// ---------------------------------------------------------------------------

function InvoiceModal({ invoice, onClose }) {
  if (!invoice) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Receipt size={18} className="text-violet-400" />
            Invoice {invoice.id}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Date</p>
              <p className="text-white">{formatDate(invoice.date)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Status</p>
              <StatusBadge status={invoice.status} />
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Plan</p>
              <p className="text-white">{invoice.plan}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Payment Method</p>
              <p className="text-white">{invoice.method}</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">{invoice.plan} Subscription</span>
              <span className="text-white">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Tax</span>
              <span className="text-white">$0.00</span>
            </div>
            <div className="flex justify-between font-semibold text-white border-t border-slate-800 pt-2 mt-2">
              <span>Total</span>
              <span>{formatCurrency(invoice.amount)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition flex items-center justify-center gap-1.5"
            >
              <Download size={13} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cancel confirmation modal
// ---------------------------------------------------------------------------

function CancelModal({ currentPlan, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Cancel Subscription</p>
            <p className="text-xs text-slate-400">This action cannot be undone immediately.</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          You are about to cancel your <strong className="text-white">{currentPlan}</strong> plan.
          You will retain access until the end of your current billing period, then be downgraded to
          Free.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Keep Plan
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {loading ? 'Cancelling…' : 'Cancel Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main PaymentSystem component
// ---------------------------------------------------------------------------

export default function PaymentSystem() {
  const [activeTab, setActiveTab] = useState('plans');
  const [currentPlan, setCurrentPlan] = useState('pro');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'crypto' | 'gift'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [billingHistory, setBillingHistory] = useState(MOCK_BILLING_HISTORY);
  const [showComparison, setShowComparison] = useState(false);

  // Clear transient messages after 6 s
  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, 6000);
    return () => clearTimeout(t);
  }, [error, success]);

  const handlePaymentSuccess = useCallback(({ method, plan, ...rest }) => {
    const newInvoice = {
      id: `inv_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: plan.price,
      plan: plan.name,
      status: 'paid',
      method: method === 'card' ? `${rest.brand ?? 'Card'} •••• ${rest.last4}` : method === 'crypto' ? rest.currency?.toUpperCase() : 'Gift Card',
    };
    setBillingHistory((prev) => [newInvoice, ...prev]);
    setCurrentPlan(plan.id);
    setSelectedPlan(null);
    setSuccess(`Successfully subscribed to ${plan.name}! Your invoice has been added to billing history.`);
    setActiveTab('manage');
  }, []);

  const handleGiftCardSuccess = useCallback(({ code }) => {
    setSelectedPlan(null);
    setSuccess(`Gift card redeemed successfully! Credit has been applied to your account.`);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setCurrentPlan('free');
    setShowCancel(false);
    setSuccess('Your subscription has been cancelled. You will retain access until your billing period ends.');
  }, []);

  const currentPlanData = PLANS.find((p) => p.id === currentPlan);

  const tabs = [
    { id: 'plans', label: 'Plans', icon: Star },
    { id: 'checkout', label: 'Payment', icon: CreditCard },
    { id: 'manage', label: 'Manage', icon: RefreshCw },
    { id: 'history', label: 'History', icon: Receipt },
  ];

  // ---- PLANS TAB ----
  const PlansTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-5 transition ${
                plan.id === 'pro'
                  ? 'border-violet-500 bg-violet-900/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-violet-600 text-white">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className={plan.color} />
                <span className="font-semibold text-white">{plan.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                    Current
                  </span>
                )}
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold text-white">{formatCurrency(plan.price)}</span>
                {plan.price > 0 && <span className="text-slate-400 text-sm">/{plan.period}</span>}
              </div>
              <ul className="space-y-1.5 mb-4">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-xs text-slate-400">
                    {f.value === false ? (
                      <X size={12} className="text-slate-600 shrink-0" />
                    ) : (
                      <Check size={12} className="text-emerald-400 shrink-0" />
                    )}
                    {f.value === true ? f.label : `${f.label}: ${f.value}`}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || plan.id === 'free'}
                onClick={() => {
                  setSelectedPlan(plan);
                  setActiveTab('checkout');
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                  isCurrent
                    ? 'bg-slate-700 text-slate-500 cursor-default'
                    : plan.id === 'free'
                    ? 'bg-slate-700 text-slate-500 cursor-default'
                    : plan.id === 'pro'
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Downgrade (cancel)' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowComparison((v) => !v)}
        className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition mx-auto"
      >
        {showComparison ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showComparison ? 'Hide' : 'Show'} full comparison table
      </button>

      {showComparison && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="py-3 pr-4 text-left text-xs font-semibold text-slate-400 pl-4">Feature</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-slate-400">Free</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-violet-400 bg-violet-900/10">Pro</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-amber-400">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y-0 pl-4">
              {PLANS[0].features.map((_, i) => (
                <FeatureRow
                  key={PLANS[0].features[i].label}
                  label={PLANS[0].features[i].label}
                  free={PLANS[0].features[i].value}
                  pro={PLANS[1].features[i].value}
                  enterprise={PLANS[2].features[i].value}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ---- CHECKOUT TAB ----
  const CheckoutTab = () => {
    const plan = selectedPlan ?? PLANS.find((p) => p.id === 'pro');

    return (
      <div className="space-y-5 max-w-lg mx-auto">
        {/* Plan selector */}
        <div className="flex gap-2 flex-wrap">
          {PLANS.filter((p) => p.price > 0).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                plan.id === p.id
                  ? 'border-violet-500 bg-violet-900/20 text-violet-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <p.icon size={14} />
              {p.name} — {formatCurrency(p.price)}/mo
            </button>
          ))}
        </div>

        {/* Payment method selector */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Payment Method</p>
          <div className="flex gap-2">
            {[
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'crypto', label: 'Crypto', icon: Bitcoin },
              { id: 'gift', label: 'Gift Card', icon: Gift },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPaymentMethod(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  paymentMethod === id
                    ? 'border-violet-500 bg-violet-900/20 text-violet-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment form */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          {paymentMethod === 'card' && (
            <CardPaymentForm
              plan={plan}
              onSuccess={handlePaymentSuccess}
              onError={setError}
              onCancel={() => setActiveTab('plans')}
            />
          )}
          {paymentMethod === 'crypto' && (
            <CryptoPaymentPanel
              plan={plan}
              onSuccess={handlePaymentSuccess}
              onError={setError}
              onCancel={() => setActiveTab('plans')}
            />
          )}
          {paymentMethod === 'gift' && (
            <GiftCardPanel
              onSuccess={handleGiftCardSuccess}
              onError={setError}
              onCancel={() => setActiveTab('plans')}
            />
          )}
        </div>

        {!STRIPE_PUBLIC_KEY && paymentMethod === 'card' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/40 text-amber-400 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            Stripe public key (VITE_STRIPE_PUBLIC_KEY) is not set. Card payments will not process until this is configured.
          </div>
        )}
        {!COINBASE_COMMERCE_KEY && paymentMethod === 'crypto' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/40 text-amber-400 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            Coinbase Commerce key (VITE_COINBASE_COMMERCE_KEY) is not set. Crypto payments will not process until this is configured.
          </div>
        )}
      </div>
    );
  };

  // ---- MANAGE TAB ----
  const ManageTab = () => {
    const plan = currentPlanData;
    if (!plan) return null;
    const Icon = plan.icon;

    return (
      <div className="space-y-5 max-w-lg mx-auto">
        {/* Current plan card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center`}>
              <Icon size={20} className={plan.color} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{plan.name} Plan</p>
              <p className="text-sm text-slate-400">
                {plan.price === 0 ? 'Free forever' : `${formatCurrency(plan.price)} / month`}
              </p>
            </div>
            <StatusBadge status="paid" />
          </div>

          {plan.price > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 rounded-lg px-3 py-2">
              <Calendar size={14} className="text-slate-500" />
              Next billing date: <strong className="text-white ml-1">Nov 7, 2026</strong>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {plan.id !== 'enterprise' && (
              <button
                onClick={() => {
                  const next = plan.id === 'free' ? PLANS[1] : PLANS[2];
                  setSelectedPlan(next);
                  setPaymentMethod('card');
                  setActiveTab('checkout');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm transition"
              >
                <ArrowUpCircle size={14} />
                Upgrade
              </button>
            )}
            {plan.id !== 'free' && plan.id !== 'pro' && (
              <button
                onClick={() => {
                  setSelectedPlan(PLANS[1]);
                  setPaymentMethod('card');
                  setActiveTab('checkout');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
              >
                <ArrowDownCircle size={14} />
                Downgrade to Pro
              </button>
            )}
            {plan.id !== 'free' && (
              <button
                onClick={() => setShowCancel(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-800 text-red-400 text-sm hover:bg-red-900/20 transition ml-auto"
              >
                <Trash2 size={14} />
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Redeem gift card shortcut */}
        <button
          onClick={() => { setPaymentMethod('gift'); setActiveTab('checkout'); }}
          className="flex w-full items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-slate-600 transition text-left"
        >
          <Gift size={18} className="text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Redeem a Gift Card</p>
            <p className="text-xs text-slate-400">Apply a gift card code to your account</p>
          </div>
          <ChevronDown size={14} className="text-slate-500 ml-auto -rotate-90" />
        </button>

        <SecurityBadges />
      </div>
    );
  };

  // ---- HISTORY TAB ----
  const HistoryTab = () => (
    <div className="space-y-4">
      {billingHistory.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
          <p>No billing history yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-xs font-semibold text-slate-400">
                <th className="py-3 pl-4 pr-3 text-left">Invoice</th>
                <th className="py-3 px-3 text-left">Date</th>
                <th className="py-3 px-3 text-left">Plan</th>
                <th className="py-3 px-3 text-left">Method</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 pl-3 pr-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {billingHistory.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 pl-4 pr-3 font-mono text-xs text-slate-400">{inv.id}</td>
                  <td className="py-3 px-3 text-slate-300">{formatDate(inv.date)}</td>
                  <td className="py-3 px-3 text-slate-300">{inv.plan}</td>
                  <td className="py-3 px-3 text-slate-400 text-xs">{inv.method}</td>
                  <td className="py-3 px-3 text-right font-medium text-white">{formatCurrency(inv.amount)}</td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 pl-3 pr-4 text-center">
                    <button
                      onClick={() => setViewInvoice(inv)}
                      className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
                    >
                      <Receipt size={12} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ---- RENDER ----
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Subscription & Billing</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your Nexus AI Pro plan, payment methods, and billing history.
          </p>
        </div>

        {/* Alert banners */}
        {error && (
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        )}
        {success && (
          <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === id
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'plans' && <PlansTab />}
          {activeTab === 'checkout' && <CheckoutTab />}
          {activeTab === 'manage' && <ManageTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>

      {/* Modals */}
      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
      {showCancel && (
        <CancelModal
          currentPlan={currentPlanData?.name ?? 'Pro'}
          onConfirm={handleCancelConfirm}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
