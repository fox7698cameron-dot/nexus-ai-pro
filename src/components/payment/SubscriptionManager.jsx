/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Subscription Manager — Stripe, Crypto, Gift Cards
 * Supports: Visa, Mastercard, Amex, Discover + major debit cards,
 *           BTC, ETH, USDC, SOL, LTC + gift card codes
 * Date: 2026-08-09
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CreditCard, Bitcoin, Gift, CheckCircle, Loader2, AlertCircle, Zap, Shield } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    badge: '🆓',
    color: '#6b7280',
    features: ['5 chats/day', 'Basic AI models', '1MB file uploads', 'Community support'],
    reasoning: 'Fast (⚡)',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    badge: '⭐',
    color: '#667eea',
    features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'Analytics dashboard', 'Security dashboard'],
    reasoning: 'Mid (🧠)',
    popular: true,
  },
  {
    id: 'game_dev',
    name: 'Game Dev Pro',
    price: 1999,
    badge: '🎮',
    color: '#f43f5e',
    features: ['Everything in Pro', 'Game engine connectors', 'Achievement tracking', 'Game analytics', 'AR/VR/3D project tracking'],
    reasoning: 'Max (🚀)',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    badge: '🏢',
    color: '#f59e0b',
    features: ['Everything in Game Dev', 'Custom connectors', 'Dedicated support', 'SLA guarantee', 'White-label options', 'Azure/AWS/GCP integrations'],
    reasoning: 'Enterprise (💎)',
  },
];

const CRYPTO_OPTIONS = [
  { id: 'BTC', name: 'Bitcoin', icon: '₿', color: '#f7931a' },
  { id: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea' },
  { id: 'USDC', name: 'USD Coin', icon: '$', color: '#2775ca' },
  { id: 'SOL', name: 'Solana', icon: '◎', color: '#9945ff' },
  { id: 'LTC', name: 'Litecoin', icon: 'Ł', color: '#a6a9aa' },
];

const s = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { color: '#6b7280', fontSize: '0.9rem', marginBottom: '28px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: (active) => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: `1px solid ${active ? '#667eea' : 'rgba(255,255,255,0.08)'}`,
    background: active ? 'rgba(102,126,234,0.15)' : 'transparent',
    color: active ? '#fff' : '#6b7280',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? '600' : '400',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
  planCard: (color, selected, popular) => ({
    background: selected ? `${color}15` : 'rgba(255,255,255,0.03)',
    border: selected ? `2px solid ${color}` : popular ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '24px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  popularBadge: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '3px 12px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  },
  price: { fontSize: '2.2rem', fontWeight: '800', color: '#fff', marginBottom: '4px' },
  priceUnit: { fontSize: '0.85rem', color: '#6b7280' },
  featureList: { listStyle: 'none', padding: 0, margin: '16px 0' },
  feature: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.85rem', color: '#d1d5db' },
  selectBtn: (color, selected) => ({
    width: '100%',
    padding: '10px',
    background: selected ? color : `${color}15`,
    border: `1px solid ${color}`,
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    marginTop: '4px',
  }),
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', maxWidth: '460px' },
  label: { display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '14px',
  },
  btn: (color) => ({
    width: '100%',
    padding: '12px',
    background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }),
  cryptoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' },
  cryptoBtn: (selected, color) => ({
    padding: '12px',
    background: selected ? `${color}20` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  }),
  success: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '16px', color: '#86efac', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px', color: '#fca5a5', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' },
};

export default function SubscriptionManager() {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [giftCode, setGiftCode] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [cryptoSession, setCryptoSession] = useState(null);

  useEffect(() => {
    authFetch('/api/payments/subscription').then(r => r.ok && r.json()).then(d => d && setCurrentSub(d));
  }, [authFetch]);

  const upgradeWithCard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await authFetch('/api/payments/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? 'Payment failed');

      // In production: use Stripe.js to complete the payment using clientSecret
      // e.g. stripe.confirmCardPayment(data.clientSecret, { payment_method: {...} })
      setSuccess(`Payment intent created — integrate Stripe.js to complete checkout for ${data.planName} ($${data.amount / 100}/month)`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedPlan]);

  const initiateCryptoPayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await authFetch('/api/payments/crypto/initiate', {
        method: 'POST',
        body: JSON.stringify({ planId: selectedPlan, cryptoCurrency: selectedCrypto }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? 'Crypto payment setup failed');
      setCryptoSession(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedPlan, selectedCrypto]);

  const redeemGiftCard = useCallback(async () => {
    if (!giftCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await authFetch('/api/payments/redeem-gift-card', {
        method: 'POST',
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? 'Gift card redemption failed');
      setSuccess(`🎉 Gift card redeemed! ${data.plan} plan activated for ${data.durationDays} days`);
      setGiftCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, giftCode]);

  const plan = PLANS.find(p => p.id === selectedPlan);

  return (
    <div style={s.container}>
      <div style={s.title}><CreditCard size={22} color="#667eea" /> Subscription & Billing</div>
      <div style={s.subtitle}>
        Current plan: <strong style={{ color: '#fff' }}>{currentSub?.plan?.name ?? 'Free'}</strong>
        {currentSub?.subscription?.source === 'gift_card' && ' (Gift card)'}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(tab === 'plans')} onClick={() => setTab('plans')}>
          <Zap size={14} /> Plans
        </button>
        <button style={s.tab(tab === 'card')} onClick={() => setTab('card')}>
          <CreditCard size={14} /> Card Payment
        </button>
        <button style={s.tab(tab === 'crypto')} onClick={() => setTab('crypto')}>
          <Bitcoin size={14} /> Crypto
        </button>
        <button style={s.tab(tab === 'gift')} onClick={() => setTab('gift')}>
          <Gift size={14} /> Gift Card
        </button>
      </div>

      {success && <div style={s.success}><CheckCircle size={18} />{success}</div>}
      {error && <div style={s.error}><AlertCircle size={18} />{error}</div>}

      {/* Plans tab */}
      {tab === 'plans' && (
        <div style={s.planGrid}>
          {PLANS.map(p => (
            <div key={p.id} style={s.planCard(p.color, selectedPlan === p.id, p.popular)} onClick={() => setSelectedPlan(p.id)}>
              {p.popular && <div style={s.popularBadge}>⭐ Most Popular</div>}
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{p.badge}</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{p.name}</div>
              <div style={s.price}>
                {p.price === 0 ? 'Free' : `$${(p.price / 100).toFixed(2)}`}
                {p.price > 0 && <span style={s.priceUnit}>/mo</span>}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '12px' }}>Reasoning: {p.reasoning}</div>
              <ul style={s.featureList}>
                {p.features.map(f => (
                  <li key={f} style={s.feature}><CheckCircle size={14} color={p.color} />{f}</li>
                ))}
              </ul>
              <button style={s.selectBtn(p.color, selectedPlan === p.id)}>
                {selectedPlan === p.id ? '✓ Selected' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Card payment */}
      {tab === 'card' && (
        <div style={s.card}>
          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem' }}>
            💳 Pay with Card — {plan?.name}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['Visa', 'Mastercard', 'Amex', 'Discover', 'Diners', 'JCB', 'UnionPay'].map(brand => (
              <span key={brand} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>{brand}</span>
            ))}
            <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>+ all major debit cards</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '20px', marginBottom: '16px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
            🔒 Stripe secure payment form will load here
            <br />
            <span style={{ fontSize: '0.75rem' }}>Card details never touch our servers — processed by Stripe PCI-DSS Level 1</span>
          </div>
          <label style={s.label}>Cardholder Name</label>
          <input style={s.input} placeholder="Full name on card" />
          <button style={s.btn('#667eea')} onClick={upgradeWithCard} disabled={loading || selectedPlan === 'free'}>
            {loading ? <Loader2 size={16} /> : <Shield size={16} />}
            {selectedPlan === 'free' ? 'Free — No Payment Needed' : `Pay $${plan ? (plan.price / 100).toFixed(2) : '0.00'}/month`}
          </button>
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.72rem', color: '#4b5563' }}>
            <Shield size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Secured by Stripe · Cancel anytime
          </div>
        </div>
      )}

      {/* Crypto payment */}
      {tab === 'crypto' && (
        <div style={s.card}>
          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem' }}>₿ Crypto Payment — {plan?.name}</h3>
          <div style={s.cryptoGrid}>
            {CRYPTO_OPTIONS.map(c => (
              <div key={c.id} style={s.cryptoBtn(selectedCrypto === c.id, c.color)} onClick={() => setSelectedCrypto(c.id)}>
                <div style={{ fontSize: '1.5rem', color: c.color }}>{c.icon}</div>
                <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '600', marginTop: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{c.id}</div>
              </div>
            ))}
          </div>
          {cryptoSession ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>Send {selectedCrypto} to:</div>
              <div style={{ fontFamily: 'monospace', color: '#fff', fontSize: '0.85rem', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                {cryptoSession.paymentAddress}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#eab308' }}>
                ⚠ Session expires: {new Date(cryptoSession.expiresAt).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <button style={s.btn('#f7931a')} onClick={initiateCryptoPayment} disabled={loading || selectedPlan === 'free'}>
              {loading ? <Loader2 size={16} /> : <Bitcoin size={16} />}
              {selectedPlan === 'free' ? 'Free Plan — No Payment Needed' : `Pay with ${selectedCrypto}`}
            </button>
          )}
        </div>
      )}

      {/* Gift card */}
      {tab === 'gift' && (
        <div style={s.card}>
          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem' }}>🎁 Redeem Gift Card</h3>
          <label style={s.label}>Gift Card Code</label>
          <input
            style={s.input}
            value={giftCode}
            onChange={e => setGiftCode(e.target.value.toUpperCase())}
            placeholder="NEXUS-XXXX-XXXX"
            maxLength={50}
          />
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '16px' }}>
            Try demo code: <span style={{ color: '#667eea', cursor: 'pointer', fontFamily: 'monospace' }} onClick={() => setGiftCode('NEXUS-DEMO-2026')}>NEXUS-DEMO-2026</span>
          </div>
          <button style={s.btn('#22c55e')} onClick={redeemGiftCard} disabled={loading || !giftCode.trim()}>
            {loading ? <Loader2 size={16} /> : <Gift size={16} />}
            Redeem Code
          </button>
        </div>
      )}
    </div>
  );
}
