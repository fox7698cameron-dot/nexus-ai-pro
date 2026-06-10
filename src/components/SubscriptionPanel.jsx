// /home/user/nexus-ai-pro/src/components/SubscriptionPanel.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Check, X, CreditCard, Zap, Building2, Gift, Bitcoin,
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Receipt,
  ExternalLink, Shield, Star, Sparkles, Clock
} from 'lucide-react';

// ─── Stripe publishable key (never hard-coded) ────────────────────────────────

function getStripePk() {
  if (typeof window !== 'undefined' && window.__STRIPE_PK__) return window.__STRIPE_PK__;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PK) {
    return import.meta.env.VITE_STRIPE_PK;
  }
  return null;
}

// ─── Plan definitions (mirrors server-side PLANS) ─────────────────────────────

const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    '$0',
    interval: '',
    icon:     Shield,
    color:    'blue',
    features: [
      '10 AI requests / day',
      '1 active workflow',
      'Community support',
      'Basic encryption'
    ],
    cta:       'Current Plan',
    disabled:  true
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    '$9.99',
    interval: '/mo',
    icon:     Sparkles,
    color:    'violet',
    popular:  true,
    features: [
      'Unlimited AI requests',
      '10 active workflows',
      'Priority support',
      'Military-grade encryption',
      'All AI models + image generation',
      'Crypto payments accepted',
      'Gift card / promo codes',
      'Custom avatars & API access'
    ],
    cta: 'Upgrade to Pro'
  },
  {
    id:       'enterprise',
    name:     'Enterprise',
    price:    '$49.99',
    interval: '/mo',
    icon:     Building2,
    color:    'amber',
    features: [
      'Everything in Pro',
      'Unlimited workflows',
      'Dedicated support channel',
      'SSO / SAML',
      'SLA guarantee',
      'Custom AI fine-tuning',
      'Audit logs export',
      'Team management'
    ],
    cta: 'Upgrade to Enterprise'
  }
];

// ─── Theme token maps ─────────────────────────────────────────────────────────

const THEME = {
  dark: {
    bg:          'bg-gray-950',
    card:        'bg-gray-900 border-gray-800',
    cardHover:   'hover:border-gray-600',
    text:        'text-gray-100',
    textMuted:   'text-gray-400',
    input:       'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-violet-500',
    badge:       'bg-gray-800 text-gray-300',
    divider:     'border-gray-800',
    tableRow:    'border-gray-800 hover:bg-gray-800/50',
    tableHeader: 'bg-gray-800/70 text-gray-400',
    btnGhost:    'bg-gray-800 hover:bg-gray-700 text-gray-300',
    btnDanger:   'bg-red-900/40 hover:bg-red-900/70 text-red-400 border border-red-800'
  },
  light: {
    bg:          'bg-gray-50',
    card:        'bg-white border-gray-200',
    cardHover:   'hover:border-gray-400',
    text:        'text-gray-900',
    textMuted:   'text-gray-500',
    input:       'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500',
    badge:       'bg-gray-100 text-gray-600',
    divider:     'border-gray-200',
    tableRow:    'border-gray-200 hover:bg-gray-50',
    tableHeader: 'bg-gray-100 text-gray-500',
    btnGhost:    'bg-gray-100 hover:bg-gray-200 text-gray-700',
    btnDanger:   'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
  }
};

const PLAN_ACCENT = {
  free:       { ring: 'ring-blue-500',   badge: 'bg-blue-500/10 text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  pro:        { ring: 'ring-violet-500', badge: 'bg-violet-500/10 text-violet-400', btn: 'bg-violet-600 hover:bg-violet-700 text-white' },
  enterprise: { ring: 'ring-amber-500',  badge: 'bg-amber-500/10 text-amber-400',  btn: 'bg-amber-500 hover:bg-amber-600 text-white' }
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatCurrency(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency.toUpperCase()
  }).format(cents / 100);
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(isoString));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 4 }) {
  return <Loader2 className={`w-${size} h-${size} animate-spin`} />;
}

function StatusBadge({ status }) {
  const map = {
    active:    'bg-green-500/10 text-green-400 border border-green-500/20',
    trialing:  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    past_due:  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    canceled:  'bg-red-500/10 text-red-400 border border-red-500/20',
    none:      'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  };
  const cls = map[status] ?? map.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status ?? 'none'}
    </span>
  );
}

function Alert({ type = 'info', children }) {
  const styles = {
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    error:   'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
  };
  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, currentPlan, theme, onUpgrade, loading }) {
  const t       = THEME[theme];
  const accent  = PLAN_ACCENT[plan.id];
  const Icon    = plan.icon;
  const isActive = currentPlan === plan.id;
  const isUpgradable = !isActive && plan.id !== 'free';

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl border p-6 transition-all duration-200
        ${t.card} ${t.cardHover}
        ${isActive ? `ring-2 ${accent.ring}` : ''}
        ${plan.popular ? 'scale-[1.02]' : ''}
      `}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold">
            <Star className="w-3 h-3" /> Most Popular
          </span>
        </div>
      )}

      {isActive && (
        <div className="absolute top-4 right-4">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent.badge}`}>
            Current Plan
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${accent.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`font-bold text-lg ${t.text}`}>{plan.name}</h3>
        </div>
      </div>

      <div className="mb-6">
        <span className={`text-4xl font-extrabold ${t.text}`}>{plan.price}</span>
        <span className={`text-sm ${t.textMuted}`}>{plan.interval}</span>
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((feat) => (
          <li key={feat} className={`flex items-start gap-2 text-sm ${t.textMuted}`}>
            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={isActive || loading}
        onClick={() => isUpgradable && onUpgrade(plan.id)}
        className={`
          w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isActive ? t.btnGhost : accent.btn}
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size={4} /> Redirecting…
          </span>
        ) : (
          isActive ? 'Current Plan' : plan.cta
        )}
      </button>
    </div>
  );
}

// ─── PaymentMethodCard ────────────────────────────────────────────────────────

function PaymentMethodCard({ paymentMethod, theme }) {
  const t = THEME[theme];

  if (!paymentMethod) {
    return (
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${t.card}`}>
        <CreditCard className={`w-5 h-5 ${t.textMuted}`} />
        <span className={`text-sm ${t.textMuted}`}>No payment method on file</span>
      </div>
    );
  }

  const brandLabel = paymentMethod.brand
    ? paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)
    : 'Card';

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${t.card}`}>
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-violet-400" />
        <div>
          <p className={`text-sm font-medium ${t.text}`}>
            {brandLabel} •••• {paymentMethod.last4}
          </p>
          <p className={`text-xs ${t.textMuted}`}>
            Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
          </p>
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${t.badge}`}>
        {paymentMethod.type ?? 'card'}
      </span>
    </div>
  );
}

// ─── CryptoPaymentNotice ──────────────────────────────────────────────────────

function CryptoPaymentNotice({ theme, onEnableCrypto, cryptoEnabled }) {
  const t = THEME[theme];
  return (
    <div className={`p-4 rounded-xl border ${t.card}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bitcoin className="w-5 h-5 text-amber-400" />
          <div>
            <p className={`text-sm font-medium ${t.text}`}>Crypto Payments</p>
            <p className={`text-xs ${t.textMuted}`}>Pay with crypto via Stripe's on-ramp</p>
          </div>
        </div>
        <button
          onClick={onEnableCrypto}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
            ${cryptoEnabled ? 'bg-amber-500' : 'bg-gray-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
              ${cryptoEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      {cryptoEnabled && (
        <p className={`mt-2 text-xs ${t.textMuted}`}>
          Crypto option will be shown at checkout. Availability depends on your region.
        </p>
      )}
    </div>
  );
}

// ─── GiftCodeForm ─────────────────────────────────────────────────────────────

function GiftCodeForm({ theme, onRedeem, loading }) {
  const t = THEME[theme];
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) onRedeem(code.trim());
  };

  return (
    <form onSubmit={handleSubmit} className={`p-4 rounded-xl border ${t.card}`}>
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-pink-400" />
        <p className={`text-sm font-medium ${t.text}`}>Gift Card / Promo Code</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          maxLength={64}
          className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${t.input}`}
        />
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading ? <Spinner size={4} /> : 'Apply'}
        </button>
      </div>
    </form>
  );
}

// ─── InvoiceTable ─────────────────────────────────────────────────────────────

function InvoiceTable({ invoices, hasMore, onLoadMore, loading, theme }) {
  const t = THEME[theme];

  if (!invoices || invoices.length === 0) {
    return (
      <div className={`p-6 text-center rounded-xl border ${t.card}`}>
        <Receipt className={`w-8 h-8 mx-auto mb-2 ${t.textMuted}`} />
        <p className={`text-sm ${t.textMuted}`}>No invoices yet</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${t.card}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={t.tableHeader}>
            <th className="text-left px-4 py-3 font-medium">Invoice</th>
            <th className="text-left px-4 py-3 font-medium">Date</th>
            <th className="text-left px-4 py-3 font-medium">Amount</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className={`border-t ${t.tableRow} transition-colors`}>
              <td className={`px-4 py-3 font-mono text-xs ${t.textMuted}`}>
                {inv.number ?? inv.id.slice(-8).toUpperCase()}
              </td>
              <td className={`px-4 py-3 ${t.textMuted}`}>{formatDate(inv.created)}</td>
              <td className={`px-4 py-3 font-medium ${t.text}`}>
                {formatCurrency(inv.amountPaid ?? inv.amountDue, inv.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {inv.hostedUrl && (
                    <a
                      href={inv.hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                      title="View invoice"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                      title="Download PDF"
                    >
                      <Receipt className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <div className={`px-4 py-3 border-t ${t.divider}`}>
          <button
            onClick={onLoadMore}
            disabled={loading}
            className={`text-sm ${t.textMuted} hover:text-violet-400 transition-colors flex items-center gap-1 disabled:opacity-50`}
          >
            {loading ? <Spinner size={3} /> : <ChevronDown className="w-4 h-4" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CancelConfirmDialog ──────────────────────────────────────────────────────

function CancelConfirmDialog({ theme, onConfirm, onDismiss, loading }) {
  const t = THEME[theme];
  const [immediately, setImmediately] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${t.card}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${t.text}`}>Cancel Subscription?</h3>
            <p className={`text-sm mt-1 ${t.textMuted}`}>
              You will lose access to Pro features. This action cannot be undone.
            </p>
          </div>
        </div>

        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-4 ${t.card}`}>
          <input
            type="checkbox"
            checked={immediately}
            onChange={(e) => setImmediately(e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          <span className={`text-sm ${t.textMuted}`}>
            Cancel immediately (lose access now, not at period end)
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${t.btnGhost}`}
          >
            Keep Subscription
          </button>
          <button
            onClick={() => onConfirm(immediately)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size={4} /> : null}
            {immediately ? 'Cancel Now' : 'Cancel at Period End'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, theme }) {
  const t = THEME[theme];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${t.textMuted}`} />}
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${t.textMuted}`}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component: SubscriptionPanel ───────────────────────────────────────

/**
 * SubscriptionPanel
 *
 * Props:
 *   theme         'dark' | 'light'  — visual theme (default: 'dark')
 *   userId        string            — authenticated user ID
 *   userEmail     string            — authenticated user email
 *   apiBase       string            — base URL for API calls (default: '/api/payments')
 *   onUpgraded    () => void        — callback after successful redirect to Stripe
 */
export default function SubscriptionPanel({
  theme     = 'dark',
  userId,
  userEmail,
  apiBase   = '/api/payments',
  onUpgraded
}) {
  const t = THEME[theme];

  // ─── State ──────────────────────────────────────────────────────────────────

  const [subscription,    setSubscription]    = useState(null);
  const [invoices,        setInvoices]        = useState([]);
  const [invoiceHasMore,  setInvoiceHasMore]  = useState(false);
  const [loadingInit,     setLoadingInit]     = useState(true);
  const [loadingUpgrade,  setLoadingUpgrade]  = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingCancel,   setLoadingCancel]   = useState(false);
  const [loadingGift,     setLoadingGift]     = useState(false);
  const [cryptoEnabled,   setCryptoEnabled]   = useState(false);
  const [showCancel,      setShowCancel]      = useState(false);
  const [error,           setError]           = useState(null);
  const [successMsg,      setSuccessMsg]      = useState(null);

  const stripeRef       = useRef(null);
  const lastInvoiceId   = useRef(null);

  // ─── Stripe instance ────────────────────────────────────────────────────────

  useEffect(() => {
    const pk = getStripePk();
    if (pk && !stripeRef.current) {
      loadStripe(pk).then((s) => { stripeRef.current = s; });
    }
  }, []);

  // ─── Fetch subscription status ──────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    setLoadingInit(true);
    setError(null);
    try {
      const res  = await fetch(`${apiBase}/subscription`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load subscription');
      setSubscription(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInit(false);
    }
  }, [apiBase]);

  // ─── Fetch invoices ──────────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async (startingAfter) => {
    setLoadingInvoices(true);
    try {
      const params = new URLSearchParams({ limit: '10' });
      if (startingAfter) params.set('startingAfter', startingAfter);

      const res  = await fetch(`${apiBase}/invoices?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load invoices');

      setInvoices((prev) => startingAfter ? [...prev, ...data.invoices] : data.invoices);
      setInvoiceHasMore(data.hasMore);

      const lastInv = data.invoices.at(-1);
      if (lastInv) lastInvoiceId.current = lastInv.id;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInvoices(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchSubscription();
    fetchInvoices();
  }, [fetchSubscription, fetchInvoices]);

  // ─── Upgrade / checkout ──────────────────────────────────────────────────────

  const handleUpgrade = useCallback(async (planId) => {
    setLoadingUpgrade(true);
    setError(null);
    try {
      const res  = await fetch(`${apiBase}/checkout`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          successUrl:    `${window.location.origin}/settings/billing?success=1`,
          cancelUrl:     `${window.location.origin}/settings/billing?cancelled=1`,
          cryptoEnabled
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

      onUpgraded?.();
      window.location.href = data.sessionUrl;
    } catch (err) {
      setError(err.message);
      setLoadingUpgrade(false);
    }
  }, [apiBase, cryptoEnabled, onUpgraded]);

  // ─── Cancel subscription ─────────────────────────────────────────────────────

  const handleCancel = useCallback(async (immediately) => {
    if (!subscription?.subscriptionId) return;

    setLoadingCancel(true);
    setError(null);
    try {
      const res  = await fetch(`${apiBase}/cancel`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.subscriptionId, immediately })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cancellation failed');

      setSuccessMsg(data.message);
      setShowCancel(false);
      await fetchSubscription();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCancel(false);
    }
  }, [apiBase, subscription, fetchSubscription]);

  // ─── Redeem gift code ────────────────────────────────────────────────────────

  const handleGiftCode = useCallback(async (code) => {
    setLoadingGift(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res  = await fetch(`${apiBase}/gift-code`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to redeem code');

      setSuccessMsg(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingGift(false);
    }
  }, [apiBase]);

  // ─── Clear notices after delay ───────────────────────────────────────────────

  useEffect(() => {
    if (!successMsg) return;
    const id = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(id);
  }, [successMsg]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loadingInit) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center rounded-2xl ${t.bg}`}>
        <Spinner size={8} />
      </div>
    );
  }

  const currentPlan = subscription?.plan ?? 'free';

  return (
    <div className={`min-h-screen ${t.bg} p-6 space-y-10`}>

      {/* ── Notices ─────────────────────────────────────────────────── */}
      {error      && <Alert type="error">   {error}      </Alert>}
      {successMsg && <Alert type="success"> {successMsg} </Alert>}

      {/* ── Current subscription status ──────────────────────────────── */}
      {subscription && subscription.plan !== 'free' && (
        <Section title="Current Subscription" icon={Zap} theme={theme}>
          <div className={`p-5 rounded-2xl border ${t.card} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`text-xl font-bold ${t.text}`}>
                  {subscription.planDetails?.name ?? subscription.plan}
                </span>
                <StatusBadge status={subscription.status} />
                {subscription.cancelAtPeriodEnd && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                    <Clock className="w-3 h-3" /> Cancels at period end
                  </span>
                )}
              </div>
              {subscription.currentPeriodEnd && (
                <span className={`text-sm ${t.textMuted}`}>
                  Renews {formatDate(subscription.currentPeriodEnd)}
                </span>
              )}
            </div>

            <PaymentMethodCard paymentMethod={subscription.paymentMethod} theme={theme} />

            {subscription.subscriptionId && !subscription.cancelAtPeriodEnd && (
              <div className="pt-2">
                <button
                  onClick={() => setShowCancel(true)}
                  className={`text-sm py-2 px-4 rounded-lg transition-colors ${t.btnDanger}`}
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Plan cards ───────────────────────────────────────────────── */}
      <Section title="Plans" icon={Sparkles} theme={theme}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              theme={theme}
              onUpgrade={handleUpgrade}
              loading={loadingUpgrade}
            />
          ))}
        </div>
      </Section>

      {/* ── Payment options ───────────────────────────────────────────── */}
      <Section title="Payment Options" icon={CreditCard} theme={theme}>
        <div className="space-y-3">
          <div className={`p-4 rounded-xl border ${t.card}`}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-violet-400" />
              <p className={`text-sm font-medium ${t.text}`}>Accepted Cards</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Visa', 'Mastercard', 'Amex', 'Discover', 'Debit'].map((brand) => (
                <span key={brand} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${t.badge}`}>
                  {brand}
                </span>
              ))}
            </div>
          </div>

          <CryptoPaymentNotice
            theme={theme}
            cryptoEnabled={cryptoEnabled}
            onEnableCrypto={() => setCryptoEnabled((v) => !v)}
          />
        </div>
      </Section>

      {/* ── Gift card / promo code ─────────────────────────────────────── */}
      <Section title="Gift Card / Promo Code" icon={Gift} theme={theme}>
        <GiftCodeForm theme={theme} onRedeem={handleGiftCode} loading={loadingGift} />
      </Section>

      {/* ── Invoice history ───────────────────────────────────────────── */}
      <Section title="Invoice History" icon={Receipt} theme={theme}>
        <InvoiceTable
          invoices={invoices}
          hasMore={invoiceHasMore}
          loading={loadingInvoices}
          theme={theme}
          onLoadMore={() => fetchInvoices(lastInvoiceId.current)}
        />
      </Section>

      {/* ── Cancel confirmation dialog ────────────────────────────────── */}
      {showCancel && (
        <CancelConfirmDialog
          theme={theme}
          loading={loadingCancel}
          onConfirm={handleCancel}
          onDismiss={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
