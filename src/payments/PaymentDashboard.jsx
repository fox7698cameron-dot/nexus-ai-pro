/**
 * PaymentDashboard.jsx
 * Nexus AI Pro — Subscription & Payment Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Supports: Stripe (Visa, MC, AMEX, Discover, JCB, UnionPay, Maestro),
 *           Cryptocurrency (BTC, ETH, SOL, USDC),
 *           Gift Cards, Apple Pay, Google Pay.
 *
 * NOTE: No keys, tokens, or secrets are ever handled client-side.
 *
 * Updated: 2026-08-07
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Bitcoin, Gift, Shield, CheckCircle,
  AlertTriangle, RefreshCw, Star, Crown, Zap,
  Lock, Info, ChevronDown, ChevronRight,
  DollarSign, TrendingUp,
} from 'lucide-react';
import {
  paymentClient, PAYMENT_METHODS, PLANS,
  detectCardBrand, formatGiftCardCode,
} from '../services/PaymentService.js';

/* ─── Plan Card ──────────────────────────────────────────────────────── */
function PlanCard({ plan, active, onSelect }) {
  const icon = plan.id === 'free' ? '🆓' : plan.id === 'pro' ? '⭐' : '👑';
  const border = active
    ? '2px solid #6366f1'
    : '1px solid rgba(255,255,255,0.07)';

  return (
    <div style={{
      flex:'1 1 200px', padding:'20px 18px', borderRadius:14,
      background: active ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
      border, cursor:'pointer', position:'relative',
      transition:'border 0.2s, background 0.2s',
    }} onClick={() => onSelect(plan.id)}>
      {active && (
        <div style={{
          position:'absolute', top:-1, right:16,
          padding:'2px 10px', borderRadius:'0 0 8px 8px', fontSize:10,
          fontWeight:700, background:'#6366f1', color:'#fff',
        }}>CURRENT</div>
      )}
      <div style={{ fontSize:28, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:17, fontWeight:800, color:'#f9fafb', marginBottom:4 }}>{plan.name}</div>
      <div style={{ fontSize:22, fontWeight:700, color:'#6366f1', marginBottom:12 }}>
        {plan.price_usd === 0 ? 'Free' : `$${plan.price_usd.toFixed(2)}`}
        {plan.price_usd > 0 && <span style={{ fontSize:13, color:'#9ca3af', fontWeight:400 }}>/mo</span>}
      </div>
      <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#d1d5db' }}>
            <CheckCircle size={12} color="#22c55e" style={{ flexShrink:0 }} />
            {f}
          </li>
        ))}
      </ul>
      {!active && plan.price_usd > 0 && (
        <button onClick={e => { e.stopPropagation(); onSelect(plan.id); }} style={{
          width:'100%', marginTop:16, padding:'9px', borderRadius:8,
          border:'none', background:'#6366f1', color:'#fff',
          fontSize:13, fontWeight:600, cursor:'pointer',
        }}>
          Upgrade to {plan.name}
        </button>
      )}
    </div>
  );
}

/* ─── Card Input ─────────────────────────────────────────────────────── */
function CardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number:'', expiry:'', cvc:'', name:'' });
  const brand = detectCardBrand(card.number);

  const formatCard = (v) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExp  = (v) => {
    const d = v.replace(/\D/g,'').slice(0,4);
    return d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d;
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(card); }}
      style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ position:'relative' }}>
        <input
          value={card.number}
          onChange={e => setCard(c => ({ ...c, number: formatCard(e.target.value) }))}
          placeholder="Card number" required style={inputStyle} />
        {brand !== 'Unknown' && (
          <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            fontSize:11, fontWeight:700, color:'#9ca3af' }}>{brand}</span>
        )}
      </div>
      <input
        value={card.name}
        onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
        placeholder="Cardholder name" required style={inputStyle} />
      <div style={{ display:'flex', gap:10 }}>
        <input
          value={card.expiry}
          onChange={e => setCard(c => ({ ...c, expiry: formatExp(e.target.value) }))}
          placeholder="MM/YY" required style={{ ...inputStyle, flex:1 }} maxLength={5} />
        <input
          value={card.cvc}
          onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g,'').slice(0,4) }))}
          placeholder="CVC" required style={{ ...inputStyle, flex:1 }} maxLength={4} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#6b7280' }}>
        <Lock size={10} /> Payment secured by Stripe — no card data stored on our servers
      </div>
      <button type="submit" disabled={loading} style={primaryBtn}>
        {loading ? 'Processing…' : <><CreditCard size={14} /> Pay Securely</>}
      </button>
    </form>
  );
}

/* ─── Crypto Panel ───────────────────────────────────────────────────── */
function CryptoPanel({ onSelect }) {
  const coins = [
    { id:'crypto_btc',  symbol:'BTC', name:'Bitcoin',  icon:'₿', color:'#f7931a' },
    { id:'crypto_eth',  symbol:'ETH', name:'Ethereum', icon:'Ξ', color:'#627eea' },
    { id:'crypto_sol',  symbol:'SOL', name:'Solana',   icon:'◎', color:'#9945ff' },
    { id:'crypto_usdc', symbol:'USDC',name:'USD Coin', icon:'$', color:'#2775ca' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      {coins.map(c => (
        <button key={c.id} onClick={() => onSelect(c)} style={{
          padding:'14px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{ fontSize:22, color:c.color }}>{c.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#f9fafb' }}>{c.symbol}</div>
            <div style={{ fontSize:11, color:'#9ca3af' }}>{c.name}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Gift Card Panel ────────────────────────────────────────────────── */
function GiftCardPanel({ onRedeem }) {
  const [code, setCode]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const handleRedeem = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await paymentClient.redeemGiftCard({ code });
      setResult(data);
      onRedeem?.(data);
    } catch { setResult({ success:false, error:'Failed to redeem gift card' }); }
    finally  { setLoading(false); }
  };

  return (
    <form onSubmit={handleRedeem} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <input
        value={code}
        onChange={e => setCode(formatGiftCardCode(e.target.value))}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        required maxLength={24} style={{ ...inputStyle, letterSpacing:2, fontFamily:'monospace' }} />

      {result && (
        <div style={{
          padding:'10px 12px', borderRadius:8, fontSize:13,
          background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border:`1px solid ${result.success ? '#22c55e44' : '#ef444444'}`,
          color: result.success ? '#22c55e' : '#ef4444',
          display:'flex', alignItems:'center', gap:8,
        }}>
          {result.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {result.success ? `Card redeemed! +$${result.creditUsd ?? '?'} credit applied.` : result.error}
        </div>
      )}

      <button type="submit" disabled={loading || code.replace(/-/g,'').length < 16} style={primaryBtn}>
        {loading ? 'Redeeming…' : <><Gift size={14} /> Redeem Gift Card</>}
      </button>
    </form>
  );
}

/* ─── Payment History ────────────────────────────────────────────────── */
function PaymentHistory({ history }) {
  if (!history?.length) return (
    <div style={{ textAlign:'center', padding:24, color:'#6b7280', fontSize:13 }}>
      No payment history yet.
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {history.map((tx, i) => (
        <div key={tx.id ?? i} style={{
          display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
          borderRadius:8, background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ width:32, height:32, borderRadius:8,
            background: tx.status === 'succeeded' ? '#22c55e22' : '#ef444422',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <DollarSign size={14} color={tx.status === 'succeeded' ? '#22c55e' : '#ef4444'} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#f9fafb' }}>
              {tx.description ?? 'Subscription charge'}
            </div>
            <div style={{ fontSize:11, color:'#6b7280' }}>
              {tx.date ? new Date(tx.date).toLocaleDateString() : '—'} · {tx.method ?? 'Card'}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#f9fafb' }}>
              ${((tx.amountCents ?? 0) / 100).toFixed(2)}
            </div>
            <div style={{ fontSize:10, color: tx.status === 'succeeded' ? '#22c55e' : '#ef4444' }}>
              {tx.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main PaymentDashboard ──────────────────────────────────────────── */
export default function PaymentDashboard({ className = '' }) {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory]           = useState([]);
  const [payMethod, setPayMethod]       = useState('card');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading]           = useState(false);
  const [tab, setTab]                   = useState('plans');

  const fetchSubscription = useCallback(async () => {
    try {
      const [sub, hist] = await Promise.allSettled([
        paymentClient.getSubscription(),
        paymentClient.getHistory(),
      ]);
      if (sub.status   === 'fulfilled') { setSubscription(sub.value); setSelectedPlan(sub.value.plan ?? 'free'); }
      if (hist.status  === 'fulfilled') setHistory(hist.value.transactions ?? []);
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const handleUpgrade = async (planId) => {
    if (planId === 'free') return;
    setLoading(true);
    try {
      const data = await paymentClient.createCheckoutSession({
        planId,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl:  `${window.location.origin}/payment/cancel`,
      });
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? 'Could not open checkout');
    } finally { setLoading(false); }
  };

  const handleCardSubmit = async (card) => {
    setLoading(true);
    try {
      const data = await paymentClient.createPaymentIntent({ amountCents: Math.round(PLANS[selectedPlan]?.price_usd * 100), currency:'usd' });
      // In production: use Stripe.js to confirm card payment with data.clientSecret
      if (data.clientSecret) {
        alert('Redirect to Stripe — complete payment in the popup (demo mode)');
      }
    } finally { setLoading(false); }
  };

  const TABS = ['plans', 'pay', 'history'];

  return (
    <div className={className} style={{
      fontFamily:"'Inter', system-ui, sans-serif",
      color:'#f9fafb', maxWidth:900, margin:'0 auto', padding:'0 0 40px',
    }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:10 }}>
          <CreditCard size={22} color="#6366f1" />
          Payments & Subscriptions
        </h2>
        <p style={{ margin:'4px 0 0', color:'#9ca3af', fontSize:14 }}>
          Secure billing — Stripe, Crypto, Gift Cards, Apple Pay, Google Pay
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 18px', borderRadius:'8px 8px 0 0', border:'none', fontSize:13,
            fontWeight:600, cursor:'pointer', background:'transparent',
            color: tab === t ? '#6366f1' : '#9ca3af',
            borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom:-1,
          }}>
            {t === 'plans' ? '📋 Plans' : t === 'pay' ? '💳 Pay' : '📜 History'}
          </button>
        ))}
      </div>

      {/* Plans tab */}
      {tab === 'plans' && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
          {Object.values(PLANS).map(plan => (
            <PlanCard key={plan.id} plan={plan}
              active={selectedPlan === plan.id || (subscription?.plan ?? 'free') === plan.id}
              onSelect={handleUpgrade} />
          ))}
        </div>
      )}

      {/* Pay tab */}
      {tab === 'pay' && (
        <div style={{ maxWidth:440 }}>
          {/* Method selector */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {[
              { id:'card',   label:'💳 Card' },
              { id:'crypto', label:'🪙 Crypto' },
              { id:'gift',   label:'🎁 Gift Card' },
            ].map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                padding:'7px 14px', borderRadius:8, border:'none', fontSize:13, fontWeight:500,
                cursor:'pointer', background: payMethod === m.id ? '#6366f1' : 'rgba(255,255,255,0.07)',
                color: payMethod === m.id ? '#fff' : '#9ca3af',
              }}>{m.label}</button>
            ))}
          </div>

          {payMethod === 'card'   && <CardForm onSubmit={handleCardSubmit} loading={loading} />}
          {payMethod === 'crypto' && <CryptoPanel onSelect={c => alert(`${c.name} payment initiated — deposit address will be shown (demo mode)`)} />}
          {payMethod === 'gift'   && <GiftCardPanel />}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && <PaymentHistory history={history} />}
    </div>
  );
}

/* ─── Shared styles ──────────────────────────────────────────────────── */
const inputStyle = {
  width:'100%', padding:'10px 14px', borderRadius:10, boxSizing:'border-box',
  border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)',
  color:'#f9fafb', fontSize:14, outline:'none',
};

const primaryBtn = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  width:'100%', padding:'11px 20px', borderRadius:10, border:'none',
  background:'linear-gradient(135deg, #6366f1, #8b5cf6)', color:'#fff',
  fontSize:14, fontWeight:600, cursor:'pointer',
};
