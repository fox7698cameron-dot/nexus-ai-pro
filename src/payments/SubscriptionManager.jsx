// Date: 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Download, Trash2, Plus, AlertTriangle, Check, Loader2,
  ArrowUpCircle, ArrowDownCircle, X, RefreshCw, BarChart2, HardDrive, Users,
} from 'lucide-react';
import { format } from 'date-fns';

const PLAN_COLORS = {
  free: 'text-gray-400 bg-gray-800',
  pro: 'text-violet-300 bg-violet-950',
  business: 'text-cyan-300 bg-cyan-950',
  enterprise: 'text-amber-300 bg-amber-950',
};

export default function SubscriptionManager({ onUpgrade }) {
  const [sub, setSub] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [addCardModal, setAddCardModal] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/payments/subscription'),
        fetch('/api/payments/invoices'),
      ]);
      const subData = await subRes.json();
      const invData = await invRes.json();
      setSub(subData.subscription || subData);
      setInvoices(invData.invoices || invData || []);
    } catch (err) {
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/payments/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Cancel failed');
      setCancelModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const planKey = sub?.plan?.toLowerCase() || 'free';
  const planColor = PLAN_COLORS[planKey] || PLAN_COLORS.free;
  const nextBilling = sub?.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd * 1000), 'MMM d, yyyy') : '—';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Subscription & Billing</h1>
          <button onClick={fetchData} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-lg p-3 text-sm text-red-300">
            <AlertTriangle size={15} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Current plan */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-gray-500 text-sm mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${planColor}`}>
                  {sub?.plan || 'Free'}
                </span>
                {sub?.cancelAtPeriodEnd && (
                  <span className="text-xs text-red-400 border border-red-800 bg-red-950 rounded-full px-2 py-0.5">
                    Cancels {nextBilling}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-sm">Next billing</p>
              <p className="text-gray-300 font-semibold">{sub?.cancelAtPeriodEnd ? '—' : nextBilling}</p>
            </div>
          </div>

          {/* Usage metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[
              {
                icon: BarChart2, label: 'API Calls', used: sub?.usage?.apiCalls || 0,
                limit: sub?.limits?.apiCalls || 10, unit: '',
              },
              {
                icon: HardDrive, label: 'Storage', used: sub?.usage?.storage || 0,
                limit: sub?.limits?.storage || 100, unit: ' MB',
              },
              {
                icon: Users, label: 'Team Members', used: sub?.usage?.teamMembers || 1,
                limit: sub?.limits?.teamMembers || 1, unit: '',
              },
            ].map(({ icon: Icon, label, used, limit, unit }) => {
              const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
              return (
                <div key={label} className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={15} className="text-gray-500" />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  <p className="text-gray-200 font-semibold text-sm mb-2">
                    {used}{unit} / {limit === -1 ? '∞' : `${limit}${unit}`}
                  </p>
                  {limit !== -1 && (
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-violet-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Plan actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onUpgrade?.()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowUpCircle size={15} />
              Upgrade Plan
            </button>
            {planKey !== 'free' && (
              <button
                onClick={() => onUpgrade?.('downgrade')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowDownCircle size={15} />
                Downgrade
              </button>
            )}
            {planKey !== 'free' && !sub?.cancelAtPeriodEnd && (
              <button
                onClick={() => setCancelModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-800 text-red-400 hover:bg-red-950 rounded-lg text-sm font-medium transition-colors ml-auto"
              >
                <X size={15} />
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Payment Methods</h2>
            <button
              onClick={() => setAddCardModal(true)}
              className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus size={14} />
              Add Card
            </button>
          </div>

          {sub?.paymentMethods?.length ? (
            <div className="space-y-2">
              {sub.paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                  <CreditCard size={16} className="text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-200 font-medium capitalize">
                      {pm.brand} •••• {pm.last4}
                    </p>
                    <p className="text-xs text-gray-500">Expires {pm.expMonth}/{pm.expYear}</p>
                  </div>
                  {pm.isDefault && (
                    <span className="text-xs text-green-400 bg-green-950 border border-green-800 rounded-full px-2 py-0.5">Default</span>
                  )}
                  <button className="text-gray-600 hover:text-red-400 transition-colors ml-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No payment methods on file.</p>
          )}
        </div>

        {/* Billing history */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Billing History</h2>
          {invoices.length === 0 ? (
            <p className="text-gray-600 text-sm">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Description</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Amount</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 text-gray-400">
                        {inv.created ? format(new Date(inv.created * 1000), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 text-gray-300">{inv.description || inv.lines?.data?.[0]?.description || 'Subscription'}</td>
                      <td className="py-3 text-gray-300">${((inv.amount_paid || inv.total || 0) / 100).toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.status === 'paid' ? 'text-green-400 bg-green-950 border border-green-800' :
                          inv.status === 'open' ? 'text-amber-400 bg-amber-950 border border-amber-800' :
                          'text-gray-400 bg-gray-800 border border-gray-700'
                        }`}>
                          {inv.status || 'paid'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs"
                          >
                            <Download size={12} /> PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-amber-400" />
              <h3 className="font-bold text-lg">Cancel Subscription?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Your access will continue until <strong>{nextBilling}</strong>.
              After that, you will be downgraded to the Free plan and lose access to Pro features.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {cancelLoading && <Loader2 size={14} className="animate-spin" />}
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add card modal placeholder */}
      {addCardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard size={18} /> Add Payment Method</h3>
              <button onClick={() => setAddCardModal(false)}><X size={18} className="text-gray-500 hover:text-gray-300" /></button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              You will be redirected to Stripe's secure payment portal to add a new card.
            </p>
            <button
              onClick={() => setAddCardModal(false)}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Open Stripe Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
