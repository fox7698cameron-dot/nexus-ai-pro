// ================================================
// NEXUS AI PRO – SubscriptionManager Component
// Stripe · Coinbase Commerce · Gift Cards · History
// ================================================
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Bitcoin,
  Gift,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
  Copy,
  Clock,
  TrendingUp,
  Zap,
  Building2,
  Star,
} from 'lucide-react';

// ================================================
// STATIC PLAN DEFINITIONS
// ================================================
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    icon: Star,
    color: 'gray',
    features: ['5 AI messages/day', 'Basic analytics', '1 project'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    interval: 'month',
    icon: Zap,
    color: 'blue',
    features: ['100 messages/day', 'Analytics', '5 projects', 'Basic security'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    interval: 'month',
    icon: TrendingUp,
    color: 'indigo',
    popular: true,
    features: [
      'Unlimited messages',
      'Full analytics',
      'Unlimited projects',
      'Advanced security',
      'Game dev tracking',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    interval: 'month',
    icon: Building2,
    color: 'purple',
    features: [
      'Everything in Pro',
      'Custom connectors',
      'Priority support',
      'SLA',
      'White label',
    ],
  },
];

const COLOR_MAP = {
  gray: {
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    button: 'bg-gray-600 hover:bg-gray-700 text-white',
    ring: 'ring-gray-300 dark:ring-gray-700',
    icon: 'text-gray-500 dark:text-gray-400',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    ring: 'ring-blue-400 dark:ring-blue-600',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  indigo: {
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ring: 'ring-indigo-500 dark:ring-indigo-500',
    icon: 'text-indigo-500 dark:text-indigo-400',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    ring: 'ring-purple-500 dark:ring-purple-500',
    icon: 'text-purple-500 dark:text-purple-400',
  },
};

// ================================================
// UTILITY HELPERS
// ================================================
function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    canceled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    past_due: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <Badge className={map[status] || map.canceled}>{status?.replace('_', ' ')}</Badge>;
}

function Alert({ type, message }) {
  const styles = {
    error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  };
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Clock;
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${styles[type]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-gray-400 hover:text-indigo-500 transition" title="Copy">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ================================================
// PAYMENT METHOD SECTION
// ================================================
function PaymentMethods({ selectedMethod, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { id: 'card', label: 'Card', icon: CreditCard },
        { id: 'crypto', label: 'Crypto', icon: Bitcoin },
        { id: 'giftcard', label: 'Gift Card', icon: Gift },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition ${
            selectedMethod === id
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ================================================
// SUPPORTED PAYMENT BADGES
// ================================================
function PaymentBadges() {
  const cards = ['Visa', 'Mastercard', 'Amex', 'Discover'];
  const crypto = ['BTC', 'ETH', 'USDC', 'SOL', 'DOGE'];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
          Accepted cards
        </p>
        <div className="flex flex-wrap gap-2">
          {cards.map((c) => (
            <span key={c} className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {c}
            </span>
          ))}
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            Apple Pay
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            Google Pay
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
          Accepted crypto
        </p>
        <div className="flex flex-wrap gap-2">
          {crypto.map((c) => (
            <span key={c} className="px-2.5 py-1 text-xs font-semibold rounded bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================
// STRIPE CHECKOUT PANEL
// ================================================
function StripeCheckout({ plan, userId, userEmail, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, userId, userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      // Redirect to Stripe-hosted checkout
      window.location.href = data.url;
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You'll be redirected to Stripe's secure checkout to complete payment.
        </p>
        <PaymentBadges />
      </div>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        Pay ${plan.price}/mo with Card
      </button>
    </div>
  );
}

// ================================================
// CRYPTO CHECKOUT PANEL
// ================================================
function CryptoCheckout({ plan, userId, userEmail, onError }) {
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState(null);
  const [copied, setCopied] = useState(null);

  const startCrypto = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, userId, userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crypto checkout failed');
      setCharge(data);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyAddr = (currency, addr) => {
    navigator.clipboard.writeText(addr);
    setCopied(currency);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!charge) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Pay with cryptocurrency via Coinbase Commerce. Accepted currencies:
          </p>
          <div className="flex flex-wrap gap-2">
            {['BTC', 'ETH', 'USDC', 'SOL', 'DOGE'].map((c) => (
              <span key={c} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
                {c}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={startCrypto}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bitcoin className="w-4 h-4" />}
          Pay with Crypto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert type="info" message={`Charge expires: ${new Date(charge.expiresAt).toLocaleTimeString()}`} />

      <a
        href={charge.hostedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition"
      >
        <ExternalLink className="w-4 h-4" />
        Open Coinbase Commerce
      </a>

      {/* Wallet addresses */}
      {charge.addresses && Object.keys(charge.addresses).length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Wallet Addresses
            </p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.entries(charge.addresses).map(([currency, address]) => (
              <div key={currency} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold w-12 text-orange-600 dark:text-orange-400 shrink-0">
                  {currency}
                </span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate flex-1">
                  {address}
                </span>
                <button
                  onClick={() => copyAddr(currency, address)}
                  className="text-gray-400 hover:text-indigo-500 shrink-0"
                  title="Copy address"
                >
                  {copied === currency
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================
// GIFT CARD PANEL
// ================================================
function GiftCardPanel({ userId, onSuccess, onError }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const redeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/payments/giftcard/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption failed');
      setResult(data);
      setCode('');
      onSuccess?.(`Gift card applied! +$${data.value.toFixed(2)} credit`);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={redeem} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Gift card code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={19}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2.5 px-4 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl text-sm transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            Redeem
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Format: XXXX-XXXX-XXXX-XXXX
        </p>
      </div>

      {result && (
        <Alert type="success" message={`Gift card redeemed! +$${result.value.toFixed(2)} – Credit balance: $${result.creditBalance.toFixed(2)}`} />
      )}
    </form>
  );
}

// ================================================
// PAYMENT HISTORY TABLE
// ================================================
function PaymentHistory({ history, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
        No payment history yet.
      </div>
    );
  }

  const methodLabel = (m) => ({
    card: 'Card',
    crypto: 'Crypto',
    gift_card: 'Gift Card',
  }[m] || m);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Description</th>
            <th className="text-left px-4 py-3">Method</th>
            <th className="text-right px-4 py-3">Amount</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {history.map((entry, i) => (
            <tr key={entry.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {new Date(entry.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                {entry.description || '—'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  {entry.method === 'card' ? <CreditCard className="w-3.5 h-3.5" /> :
                   entry.method === 'crypto' ? <Bitcoin className="w-3.5 h-3.5" /> :
                   <Gift className="w-3.5 h-3.5" />}
                  {methodLabel(entry.method)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                ${entry.amount} {entry.currency || 'USD'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={entry.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================
// PLAN CARD
// ================================================
function PlanCard({ plan, isCurrentPlan, onSelect }) {
  const colors = COLOR_MAP[plan.color];
  const Icon = plan.icon;

  return (
    <div
      className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all ${
        isCurrentPlan
          ? `ring-2 ${colors.ring} border-transparent bg-white dark:bg-gray-900 shadow-lg`
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            Most popular
          </span>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Current plan
          </Badge>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <div className="flex items-baseline gap-1">
            {plan.price === 0 ? (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">Free</span>
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${plan.price}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
              </>
            )}
          </div>
        </div>
      </div>

      <ul className="space-y-1.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
          isCurrentPlan
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default'
            : `${colors.button} focus:ring-indigo-500`
        }`}
      >
        {isCurrentPlan ? 'Current plan' : plan.price === 0 ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}

// ================================================
// MAIN COMPONENT
// ================================================
export default function SubscriptionManager({ user }) {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'checkout' | 'history'

  const userId = user?.id || user?._id || 'anonymous';
  const userEmail = user?.email || '';

  // -----------------------------------------------
  // Fetch subscription
  // -----------------------------------------------
  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/subscription/${userId}`);
      const data = await res.json();
      if (data.success) setSubscription(data.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/payments/history/${userId}`);
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  // -----------------------------------------------
  // Cancel subscription
  // -----------------------------------------------
  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setCanceling(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/subscription/${userId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Subscription canceled. You will retain access until the end of the billing period.');
      fetchSubscription();
    } catch (err) {
      setError(err.message);
    } finally {
      setCanceling(false);
    }
  };

  // -----------------------------------------------
  // Open Stripe portal
  // -----------------------------------------------
  const openPortal = async () => {
    try {
      const res = await fetch('/api/payments/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    }
  };

  // -----------------------------------------------
  // Select plan handler
  // -----------------------------------------------
  const handlePlanSelect = (plan) => {
    if (plan.id === 'free') {
      handleCancel();
      return;
    }
    setSelectedPlan(plan);
    setActiveTab('checkout');
    setError('');
    setSuccess('');
  };

  const currentPlanId = subscription?.plan || 'free';

  // -----------------------------------------------
  // TAB: PLANS
  // -----------------------------------------------
  const PlansTab = () => (
    <div className="space-y-6">
      {/* Current subscription status */}
      {subscription && subscription.plan !== 'free' && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Current subscription
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-gray-900 dark:text-white capitalize">
                {subscription.plan}
              </span>
              <StatusBadge status={subscription.status} />
            </div>
            {subscription.endDate && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Renews / expires: {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {subscription.stripeCustomerId && (
              <button
                onClick={openPortal}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Manage <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {subscription.status === 'active' && (
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
              >
                {canceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Credit balance */}
      {subscription?.creditBalance > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">
            Gift card credit: <strong>${subscription.creditBalance.toFixed(2)}</strong>
          </span>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.id === currentPlanId}
            onSelect={handlePlanSelect}
          />
        ))}
      </div>
    </div>
  );

  // -----------------------------------------------
  // TAB: CHECKOUT
  // -----------------------------------------------
  const CheckoutTab = () => {
    if (!selectedPlan) {
      return (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          Select a plan above to continue.
          <button onClick={() => setActiveTab('plans')} className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline">
            View plans
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto space-y-6">
        {/* Selected plan summary */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide">
              Subscribing to
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
              {selectedPlan.name} — ${selectedPlan.price}/mo
            </p>
          </div>
          <button
            onClick={() => setActiveTab('plans')}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Change
          </button>
        </div>

        {/* Payment method selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Payment method
          </p>
          <PaymentMethods selectedMethod={paymentMethod} onSelect={setPaymentMethod} />
        </div>

        {/* Payment panel */}
        {paymentMethod === 'card' && (
          <StripeCheckout
            plan={selectedPlan}
            userId={userId}
            userEmail={userEmail}
            onSuccess={(msg) => { setSuccess(msg); setActiveTab('plans'); fetchSubscription(); }}
            onError={setError}
          />
        )}
        {paymentMethod === 'crypto' && (
          <CryptoCheckout
            plan={selectedPlan}
            userId={userId}
            userEmail={userEmail}
            onError={setError}
          />
        )}
        {paymentMethod === 'giftcard' && (
          <GiftCardPanel
            userId={userId}
            onSuccess={setSuccess}
            onError={setError}
          />
        )}
      </div>
    );
  };

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Subscription & Billing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your plan, payment methods, and billing history.
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
          {[
            { id: 'plans', label: 'Plans' },
            { id: 'checkout', label: selectedPlan ? `Checkout – ${selectedPlan.name}` : 'Checkout' },
            { id: 'history', label: 'Payment history' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {activeTab === 'plans' && <PlansTab />}
            {activeTab === 'checkout' && <CheckoutTab />}
            {activeTab === 'history' && (
              <PaymentHistory history={history} loading={historyLoading} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
