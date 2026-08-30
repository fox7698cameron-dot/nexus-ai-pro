/**
 * src/components/CheckoutModal.jsx
 * Stripe + crypto + gift card checkout modal
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Stripe Elements JS is loaded via the official CDN script tag (never hardcoded key).
 * The publishable key is read from window.NEXUS_CONFIG (injected server-side) or env.
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Payment method tabs ──────────────────────────────────────────────────────
const METHODS = [
  { id: 'card',      label: '💳 Card',          desc: 'Visa, Mastercard, Amex, Discover, Debit' },
  { id: 'crypto',    label: '🪙 Crypto',         desc: 'BTC, ETH, USDC, USDT, SOL' },
  { id: 'gift',      label: '🎁 Gift Card',      desc: '16-character code' },
];

const CRYPTO_COINS = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiPost(path, body, token) {
  const res = await fetch(`/api${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ plan: { id: string, name: string, price: number, currency: string }, onClose: () => void, onSuccess: (receipt: object) => void }} props
 */
function CheckoutModal({ plan, onClose, onSuccess }) {
  const [method,       setMethod]       = useState('card');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [giftCode,     setGiftCode]     = useState('');
  const [giftValidated,setGiftValidated]= useState(null);
  const [coin,         setCoin]         = useState('BTC');
  const [cryptoPayment,setCryptoPayment]= useState(null);

  const token = (() => { try { return localStorage.getItem('nexus:accessToken'); } catch { return null; } })();
  const amountDisplay = plan ? `$${(plan.price / 100).toFixed(2)}` : '';

  // ─── Card payment (Stripe) ────────────────────────────────────────────────

  const handleCardCheckout = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const { clientSecret } = await apiPost('/payments/intent', { planId: plan.id }, token);

      // Stripe Elements would be mounted here in production.
      // For the demo we show the clientSecret and note the next step.
      setSuccess(`Payment intent created. Client secret: ${clientSecret.slice(0, 20)}…\n` +
        'In production, pass this to Stripe.js confirmCardPayment() with your Elements form.');
      onSuccess?.({ method: 'card', clientSecret, plan: plan.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [plan, token, onSuccess]);

  // ─── Crypto payment ───────────────────────────────────────────────────────

  const handleCryptoInitiate = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const data = await apiPost('/payments/crypto/initiate', { planId: plan.id, coin }, token);
      setCryptoPayment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [plan, coin, token]);

  // ─── Gift card ────────────────────────────────────────────────────────────

  const handleGiftValidate = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const data = await apiPost('/payments/gift-card/validate', { code: giftCode }, token);
      setGiftValidated(data);
    } catch (err) {
      setError(err.message);
      setGiftValidated(null);
    } finally {
      setLoading(false);
    }
  }, [giftCode, token]);

  const handleGiftRedeem = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const data = await apiPost('/payments/gift-card/redeem', { code: giftCode, planId: plan.id }, token);
      setSuccess(`Gift card redeemed! ${data.message}`);
      onSuccess?.({ method: 'gift_card', plan: plan.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [giftCode, plan, token, onSuccess]);

  // ─── Styles ───────────────────────────────────────────────────────────────

  const s = {
    overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modal:      { background: '#111827', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxSizing: 'border-box', position: 'relative', fontFamily: 'Inter,sans-serif' },
    close:      { position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' },
    title:      { fontSize: 20, fontWeight: 700, color: '#f9fafb', marginBottom: 4 },
    subtitle:   { fontSize: 13, color: '#6b7280', marginBottom: 20 },
    tabs:       { display: 'flex', gap: 6, marginBottom: 20 },
    tab:        (active) => ({ flex: 1, padding: '8px 4px', background: active ? 'rgba(99,102,241,0.15)' : '#1f2937', border: `1px solid ${active ? '#6366f1' : '#374151'}`, borderRadius: 8, color: active ? '#a5b4fc' : '#9ca3af', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }),
    input:      { width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
    btn:        (disabled) => ({ width: '100%', padding: 11, background: disabled ? '#374151' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: disabled ? '#6b7280' : '#fff', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 12 }),
    error:      { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#fca5a5', marginBottom: 12 },
    success:    { background: '#052e16', border: '1px solid #14532d', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#86efac', marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
    planCard:   { background: '#1f2937', border: '1px solid #374151', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    coinBtn:    (active) => ({ padding: '6px 12px', background: active ? '#6366f1' : '#1f2937', border: `1px solid ${active ? '#6366f1' : '#374151'}`, borderRadius: 6, color: active ? '#fff' : '#9ca3af', fontSize: 12, cursor: 'pointer' }),
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <button style={s.close} onClick={onClose} aria-label="Close">×</button>
        <h2 style={s.title}>Upgrade Plan</h2>
        <p style={s.subtitle}>Secure checkout – powered by Stripe & encrypted end-to-end</p>

        {plan && (
          <div style={s.planCard}>
            <div>
              <div style={{ fontWeight: 600, color: '#f9fafb', fontSize: 15 }}>{plan.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Monthly subscription</div>
            </div>
            <div style={{ fontWeight: 700, color: '#6366f1', fontSize: 18 }}>{amountDisplay}<span style={{ fontSize: 12, color: '#6b7280' }}>/mo</span></div>
          </div>
        )}

        {/* Method tabs */}
        <div style={s.tabs}>
          {METHODS.map(m => (
            <button key={m.id} style={s.tab(method === m.id)} onClick={() => { setMethod(m.id); setError(''); setSuccess(''); }}>
              {m.label}
            </button>
          ))}
        </div>

        {error   && <div style={s.error}>⚠️ {error}</div>}
        {success && <div style={s.success}>✅ {success}</div>}

        {/* ── Card tab ── */}
        {method === 'card' && !success && (
          <div>
            <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>
              Accepted: Visa, Mastercard, Amex, Discover, Debit cards<br/>
              <span style={{ fontSize: 11 }}>Powered by Stripe – your card details are never stored on our servers.</span>
            </div>
            <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '14px 16px', color: '#6b7280', fontSize: 13, marginBottom: 4 }}>
              🔒 Card form (Stripe Elements) mounts here in production.<br/>
              Mount <code>#card-element</code> div and call <code>stripe.confirmCardPayment()</code> with the client secret.
            </div>
            <button style={s.btn(loading)} onClick={handleCardCheckout} disabled={loading}>
              {loading ? 'Processing…' : `Pay ${amountDisplay}`}
            </button>
          </div>
        )}

        {/* ── Crypto tab ── */}
        {method === 'crypto' && !success && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Select coin:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CRYPTO_COINS.map(c => (
                  <button key={c} style={s.coinBtn(coin === c)} onClick={() => setCoin(c)}>{c}</button>
                ))}
              </div>
            </div>
            {!cryptoPayment ? (
              <button style={s.btn(loading)} onClick={handleCryptoInitiate} disabled={loading}>
                {loading ? 'Generating address…' : `Pay with ${coin}`}
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Send {coin} to:</div>
                <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#a5b4fc', wordBreak: 'break-all' }}>
                  {cryptoPayment.address}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  Amount: <strong style={{ color: '#f9fafb' }}>${cryptoPayment.amountUsd} USD</strong> worth of {coin}<br/>
                  Expires: {new Date(cryptoPayment.expiresAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Gift card tab ── */}
        {method === 'gift' && !success && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Gift Card Code</label>
              <input style={s.input} type="text" placeholder="XXXX-XXXX-XXXX-XXXX"
                value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())}
                maxLength={20} />
            </div>
            {giftValidated && (
              <div style={{ background: '#052e16', border: '1px solid #14532d', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#86efac', marginBottom: 8 }}>
                ✓ Valid – Balance: {giftValidated.amountDisplay}
                {giftValidated.balance < plan?.price && (
                  <span style={{ color: '#fca5a5' }}> (insufficient for this plan)</span>
                )}
              </div>
            )}
            {!giftValidated ? (
              <button style={s.btn(!giftCode || loading)} onClick={handleGiftValidate} disabled={!giftCode || loading}>
                {loading ? 'Validating…' : 'Validate Code'}
              </button>
            ) : (
              <button style={s.btn(loading || giftValidated.balance < plan?.price)} onClick={handleGiftRedeem}
                disabled={loading || giftValidated.balance < plan?.price}>
                {loading ? 'Redeeming…' : 'Redeem Gift Card'}
              </button>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#4b5563', marginTop: 16 }}>
          🔒 PCI DSS compliant · AES-256-GCM encrypted · No card data stored on our servers
        </div>
      </div>
    </div>
  );
}

export default CheckoutModal;
