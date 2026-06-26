/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Payment dashboard: real Stripe Checkout sessions. Stays "not configured"
 * until the operator sets STRIPE_SECRET_KEY server-side. A payment only ever
 * shows as "paid" once Stripe's signed webhook confirms it (pushed live over
 * the payment:event socket channel) — never from the client-side redirect.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { paymentService } from '../payment-service.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePaymentSocket } from '../payments/usePaymentSocket.js';

const STATUS_COLORS = {
  pending: 'var(--text-3)',
  paid: '#10b981',
  failed: '#ef4444',
  canceled: 'var(--text-3)',
  refunded: '#f59e0b'
};

function formatAmount(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() })
    .format((cents || 0) / 100);
}

export function PaymentDashboard() {
  const { token } = useAuth();
  const [configured, setConfigured] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusData, historyData] = await Promise.all([
        paymentService.getStatus(),
        paymentService.listPayments()
      ]);
      setConfigured(statusData.configured);
      setPayments(historyData.payments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      setNotice('Payment submitted. It will show as paid once Stripe confirms it.');
      load();
    } else if (payment === 'canceled') {
      setNotice('Checkout was canceled.');
    }
    if (payment) {
      params.delete('payment');
      params.delete('session_id');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [load]);

  usePaymentSocket(token, useCallback((event) => {
    if (event.payment) {
      setPayments((prev) => {
        const exists = prev.some((p) => p.sessionId === event.payment.sessionId);
        return exists
          ? prev.map((p) => (p.sessionId === event.payment.sessionId ? event.payment : p))
          : [event.payment, ...prev];
      });
    }
  }, []));

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await paymentService.createCheckout({ amount: parsedAmount, currency, description });
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="tool-content">
      <div className="panel-header">
        <CreditCard size={18} />
        <h3>Payments</h3>
      </div>

      {notice && <div className="empty-state" style={{ color: '#10b981' }}>{notice}</div>}
      {error && <div className="empty-state" style={{ color: '#ef4444' }}>{error}</div>}

      {loading ? (
        <div className="empty-state"><Loader2 size={16} className="spin" /> Loading payments…</div>
      ) : configured === false ? (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Payments are not configured on this server. The operator must set STRIPE_SECRET_KEY.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                style={{
                  background: 'var(--bg-3)', color: 'var(--text-1)',
                  border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  style={{
                    flex: 1, background: 'var(--bg-3)', color: 'var(--text-1)',
                    border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px'
                  }}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    background: 'var(--bg-3)', color: 'var(--text-1)',
                    border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px'
                  }}
                >
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                {submitting ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />}
                Pay with Stripe
              </button>
            </form>
          </div>

          <div style={{ flex: '2 1 320px', minWidth: '280px' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Payment history</h4>
            {payments.length === 0 ? (
              <div className="empty-state">No payments yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {payments.map((p) => (
                  <div
                    key={p.sessionId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: '6px',
                      background: 'var(--bg-3)', border: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem' }}>{p.description || 'Payment'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                        {formatAmount(p.amount, p.currency)} · {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: STATUS_COLORS[p.status] || 'var(--text-3)' }}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
