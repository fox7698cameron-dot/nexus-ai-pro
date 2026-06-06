// src/payments/CheckoutModal.jsx
// 2026-06-06 | Stripe checkout modal — cards, debit, Amex, Visa, crypto, gift cards

import React, { useState, useEffect } from 'react';
import { authFetch } from '../auth/AuthService.js';

const PLAN_ICONS = { free: '🆓', pro_monthly: '⭐', pro_annual: '🏆', enterprise_monthly: '👑' };
const PAYMENT_ICONS = { visa: '💳', mastercard: '💳', amex: '💳', debit: '💳', apple_pay: '🍎', google_pay: '🤖', link: '🔗', crypto: '₿', gift_card: '🎁' };

function PlanCard({ plan, selected, onClick }) {
  const isSelected = selected?.id === plan.id;
  return (
    <div onClick={onClick}
      style={{
        background: isSelected ? 'rgba(129,140,248,0.1)' : '#111',
        border: `2px solid ${isSelected ? '#818cf8' : '#222'}`,
        borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
      }}>
      {plan.badge && (
        <span style={{ position: 'absolute', top: '-10px', right: '12px', padding: '2px 10px', background: '#818cf8', borderRadius: '10px', color: '#fff', fontSize: '10px', fontWeight: '700' }}>
          {plan.badge}
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '15px', fontWeight: '700' }}>{PLAN_ICONS[plan.id]} {plan.name}</p>
          <p style={{ margin: 0, color: '#818cf8', fontSize: '18px', fontWeight: '700' }}>
            ${(plan.price / 100).toFixed(2)}{plan.interval ? `/${plan.interval}` : ''}
          </p>
        </div>
        {isSelected && <span style={{ fontSize: '18px' }}>✓</span>}
      </div>
      <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#888', fontSize: '12px' }}>
        {plan.features.map((f, i) => <li key={i} style={{ marginBottom: '4px' }}>{f}</li>)}
      </ul>
    </div>
  );
}

export default function CheckoutModal({ onClose, currentPlan = 'free' }) {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [giftCode, setGiftCode] = useState('');
  const [step, setStep] = useState('select'); // 'select' | 'payment' | 'gift' | 'success'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    authFetch('/api/payments/plans').then(async r => {
      if (r.ok) {
        const data = await r.json();
        const paid = data.plans.filter(p => p.id !== 'free');
        setPlans(paid);
      }
    });
  }, []);

  const handleCheckout = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: selected.id, successUrl: window.location.origin + '/dashboard', cancelUrl: window.location.origin + '/pricing' })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage(data.error || 'Checkout failed');
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGiftRedeem = async () => {
    if (!giftCode.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: giftCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`🎉 Gift card redeemed! ${data.plan} plan activated.`);
        setStep('success');
      } else {
        setMessage(data.error || 'Invalid gift card');
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' }}>
            {step === 'select' ? '🚀 Upgrade Your Plan' : step === 'gift' ? '🎁 Redeem Gift Card' : '✅ Success'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>✕</button>
        </div>

        {message && (
          <div style={{ padding: '10px 14px', background: step === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${step === 'success' ? '#22c55e' : '#ef4444'}`, borderRadius: '8px', color: step === 'success' ? '#86efac' : '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        {step === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🎉</p>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Your plan has been updated!</p>
            <button onClick={onClose} style={{ marginTop: '16px', padding: '10px 24px', background: '#818cf8', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Done</button>
          </div>
        ) : step === 'gift' ? (
          <div>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Enter your gift card code to redeem it:</p>
            <input value={giftCode} onChange={e => setGiftCode(e.target.value)} placeholder="NEXUS-XXXX-XXXX"
              style={{ width: '100%', padding: '12px 16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '16px', letterSpacing: '2px', textAlign: 'center', boxSizing: 'border-box', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#aaa', cursor: 'pointer' }}>Back</button>
              <button onClick={handleGiftRedeem} disabled={loading || !giftCode.trim()}
                style={{ flex: 2, padding: '11px', background: loading ? '#555' : '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                {loading ? 'Redeeming…' : '🎁 Redeem'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Plan selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {plans.map(p => <PlanCard key={p.id} plan={p} selected={selected} onClick={() => setSelected(p)} />)}
            </div>

            {/* Payment methods info */}
            <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ color: '#666', fontSize: '11px', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accepted Payment Methods</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#aaa' }}>
                {['💳 Visa', '💳 Mastercard', '💳 Amex', '💳 Discover', '💳 Debit', '🍎 Apple Pay', '🤖 Google Pay', '🔗 Stripe Link', '₿ Crypto (USDC)', '🎁 Gift Card'].map(m => (
                  <span key={m} style={{ padding: '3px 8px', background: '#1a1a1a', borderRadius: '6px' }}>{m}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleCheckout} disabled={loading || !selected}
                style={{ padding: '13px', background: selected ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#333', border: 'none', borderRadius: '10px', color: '#fff', cursor: selected ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '15px', transition: 'all 0.2s' }}>
                {loading ? 'Redirecting to Stripe…' : selected ? `Continue with ${selected.name} — $${(selected.price / 100).toFixed(2)}` : 'Select a plan'}
              </button>
              <button onClick={() => setStep('gift')} style={{ padding: '10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '10px', color: '#888', cursor: 'pointer', fontSize: '13px' }}>
                🎁 Redeem Gift Card
              </button>
            </div>

            <p style={{ color: '#444', fontSize: '11px', textAlign: 'center', marginTop: '14px' }}>
              Secured by Stripe · Cancel anytime · No hidden fees
            </p>
          </>
        )}
      </div>
    </div>
  );
}
