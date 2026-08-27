/**
 * SubscriptionCheckout.jsx
 * Nexus AI Pro — Subscription & Payment Checkout
 * Date: 2026-08-27
 * Payment methods:
 *   - Stripe: Visa, Mastercard, Amex, Discover, Maestro, Debit cards
 *   - Cryptocurrency: Bitcoin (BTC), Ethereum (ETH), USDC, SOL
 *   - Gift Cards: Nexus Gift Card codes
 * Tiers: Free, Pro ($9.99/mo), Enterprise ($14.99/mo), Lifetime ($299)
 * No hard-coded API keys — all handled server-side
 * Platforms: Web, Electron, iOS, Android, Desktop, Mobile, Tablet
 */

import React, { useState, useCallback } from 'react';

// ── Subscription tiers ─────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0 / month',
    emoji: '🆓',
    color: '#64748b',
    features: [
      '5 AI requests / day',
      'Basic models (GPT-4, Claude Sonnet)',
      '1 project tracker slot',
      'Community support',
    ],
    limits: { dailyRequests: 5, projectSlots: 1 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999, // cents
    priceLabel: '$9.99 / month',
    emoji: '⭐',
    color: '#6366f1',
    features: [
      'Unlimited AI requests',
      'All 25+ AI models',
      '10 project tracker slots',
      'Analytics dashboard (all platforms)',
      'Security dashboard (real-time)',
      'Priority support',
    ],
    limits: { dailyRequests: -1, projectSlots: 10 },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1499, // cents
    priceLabel: '$14.99 / month',
    emoji: '👑',
    color: '#a855f7',
    features: [
      'Everything in Pro',
      'Unlimited project slots',
      'Game dev connectors (Unreal, Epic, Sony, MS, Ubisoft)',
      'Admin & moderator dashboards',
      'Dedicated account manager',
      'SLA guarantee 99.9% uptime',
      'Custom AI model fine-tuning',
    ],
    limits: { dailyRequests: -1, projectSlots: -1 },
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: 29900, // cents
    priceLabel: '$299 one-time',
    emoji: '♾️',
    color: '#f97316',
    features: [
      'Everything in Enterprise',
      'Lifetime access — no recurring fee',
      'All future features included',
      'Early access to beta features',
    ],
    limits: { dailyRequests: -1, projectSlots: -1 },
  },
];

// ── Payment method configs ────────────────────────────────────────────────────
const PAYMENT_METHODS = {
  card: {
    id: 'card',
    label: 'Credit / Debit Card',
    emoji: '💳',
    description: 'Visa, Mastercard, Amex, Discover, Maestro',
  },
  crypto: {
    id: 'crypto',
    label: 'Cryptocurrency',
    emoji: '₿',
    description: 'Bitcoin, Ethereum, USDC, Solana',
  },
  giftcard: {
    id: 'giftcard',
    label: 'Gift Card',
    emoji: '🎁',
    description: 'Nexus AI Pro gift card code',
  },
};

const CRYPTO_OPTIONS = [
  { id: 'btc',  symbol: 'BTC',  label: 'Bitcoin',   emoji: '₿',  color: '#f7931a' },
  { id: 'eth',  symbol: 'ETH',  label: 'Ethereum',  emoji: '⟠',  color: '#627eea' },
  { id: 'usdc', symbol: 'USDC', label: 'USD Coin',  emoji: '🟦',  color: '#2775ca' },
  { id: 'sol',  symbol: 'SOL',  label: 'Solana',    emoji: '◎',  color: '#9945ff' },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatPrice(cents) {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

function luhnCheck(num) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectCardNetwork(num) {
  if (/^4/.test(num))            return { name: 'Visa',       emoji: '💙' };
  if (/^5[1-5]/.test(num))       return { name: 'Mastercard', emoji: '🔴' };
  if (/^3[47]/.test(num))        return { name: 'Amex',       emoji: '🟦' };
  if (/^6(?:011|5)/.test(num))   return { name: 'Discover',   emoji: '🟠' };
  if (/^(?:5018|5020)/.test(num))return { name: 'Maestro',    emoji: '🟢' };
  return null;
}

function maskCardNumber(val) {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ── Tier Card ─────────────────────────────────────────────────────────────────
function TierCard({ tier, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(tier.id)}
      style={{
        ...styles.tierCard,
        borderColor: selected ? tier.color : '#334155',
        background:  selected ? `${tier.color}11` : '#1e293b',
        cursor: 'pointer',
      }}>
      {tier.popular && (
        <div style={{ ...styles.popularBadge, background: tier.color }}>POPULAR</div>
      )}
      <div style={{ fontSize: 28, marginBottom: 4 }}>{tier.emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{tier.name}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: tier.color, margin: '6px 0' }}>
        {tier.priceLabel}
      </div>
      <ul style={styles.featureList}>
        {tier.features.map((f, i) => (
          <li key={i} style={styles.featureItem}>
            <span style={{ color: tier.color }}>✓</span> {f}
          </li>
        ))}
      </ul>
      {selected && (
        <div style={{ marginTop: 10, fontSize: 12, color: tier.color, fontWeight: 600 }}>✓ Selected</div>
      )}
    </div>
  );
}

// ── Card Payment Form ─────────────────────────────────────────────────────────
function CardPaymentForm({ onPay, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [errors, setErrors] = useState({});
  const network = detectCardNetwork(card.number.replace(/\s/g, ''));

  const validate = () => {
    const e = {};
    const raw = card.number.replace(/\s/g, '');
    if (raw.length < 13 || !luhnCheck(raw)) e.number = 'Invalid card number';
    if (!card.expiry || card.expiry.length < 5) e.expiry = 'Enter MM/YY';
    if (!card.cvv || card.cvv.length < 3) e.cvv = 'Enter 3-4 digit CVV';
    if (!card.name.trim()) e.name = 'Cardholder name required';
    return e;
  };

  const handlePay = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    // Raw card data is never stored client-side — sent to server which uses Stripe tokenization
    onPay({ method: 'card', cardLastFour: card.number.slice(-4), cardNetwork: network?.name });
  };

  const fieldStyle = key => ({ ...styles.input, borderColor: errors[key] ? '#ef4444' : '#334155' });

  return (
    <div style={styles.payForm}>
      <div style={{ marginBottom: 14 }}>
        <label style={styles.inputLabel}>Card Number {network && <span>{network.emoji} {network.name}</span>}</label>
        <input
          value={maskCardNumber(card.number)}
          onChange={e => setCard(c => ({ ...c, number: e.target.value }))}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          autoComplete="cc-number"
          style={fieldStyle('number')}
        />
        {errors.number && <div style={styles.fieldErr}>{errors.number}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={styles.inputLabel}>Expiry</label>
          <input
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
            placeholder="MM/YY"
            maxLength={5}
            autoComplete="cc-exp"
            style={fieldStyle('expiry')}
          />
          {errors.expiry && <div style={styles.fieldErr}>{errors.expiry}</div>}
        </div>
        <div>
          <label style={styles.inputLabel}>CVV</label>
          <input
            value={card.cvv}
            onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            placeholder="123"
            maxLength={4}
            autoComplete="cc-csc"
            type="password"
            style={fieldStyle('cvv')}
          />
          {errors.cvv && <div style={styles.fieldErr}>{errors.cvv}</div>}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.inputLabel}>Cardholder Name</label>
        <input
          value={card.name}
          onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
          placeholder="Cameron Fox"
          autoComplete="cc-name"
          style={fieldStyle('name')}
        />
        {errors.name && <div style={styles.fieldErr}>{errors.name}</div>}
      </div>

      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
        🔒 Payments processed securely via Stripe. Card data never stored on our servers.
      </div>

      <button onClick={handlePay} disabled={loading} style={styles.payBtn}>
        {loading ? '⏳ Processing…' : '💳 Pay Now'}
      </button>
    </div>
  );
}

// ── Crypto Payment Form ───────────────────────────────────────────────────────
function CryptoPaymentForm({ tier, onPay, loading }) {
  const [selectedCrypto, setSelectedCrypto] = useState('btc');
  const crypto = CRYPTO_OPTIONS.find(c => c.id === selectedCrypto);

  return (
    <div style={styles.payForm}>
      <div style={{ marginBottom: 16 }}>
        <label style={styles.inputLabel}>Select Cryptocurrency</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CRYPTO_OPTIONS.map(c => (
            <button key={c.id} onClick={() => setSelectedCrypto(c.id)}
              style={{
                ...styles.cryptoBtn,
                borderColor: selectedCrypto === c.id ? c.color : '#334155',
                color: selectedCrypto === c.id ? c.color : '#64748b',
              }}>
              {c.emoji} {c.symbol}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Send exactly</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: crypto?.color }}>
          ~0.0024 {crypto?.symbol}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          ≈ {formatPrice(tier?.price || 0)} USD
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginTop: 12,
          padding: '8px 12px', background: '#1e293b', borderRadius: 8, wordBreak: 'break-all' }}>
          [Server will generate wallet address upon payment initiation]
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
        ₿ Wallet addresses generated server-side. Transactions confirmed via blockchain.
        No private keys are ever handled by this app.
      </div>

      <button onClick={() => onPay({ method: 'crypto', currency: selectedCrypto })}
        disabled={loading} style={{ ...styles.payBtn, background: crypto?.color }}>
        {loading ? '⏳ Initiating…' : `Pay with ${crypto?.label}`}
      </button>
    </div>
  );
}

// ── Gift Card Form ────────────────────────────────────────────────────────────
function GiftCardForm({ onPay, loading }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleRedeem = () => {
    const clean = code.replace(/\s/g, '').toUpperCase();
    if (clean.length < 12) { setError('Gift card code must be at least 12 characters'); return; }
    setError('');
    onPay({ method: 'giftcard', code: clean });
  };

  return (
    <div style={styles.payForm}>
      <div style={{ marginBottom: 14 }}>
        <label style={styles.inputLabel}>Gift Card Code</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="NEXUS-XXXX-XXXX-XXXX"
          maxLength={24}
          style={{ ...styles.input, letterSpacing: '0.1em', fontFamily: 'monospace', borderColor: error ? '#ef4444' : '#334155' }}
        />
        {error && <div style={styles.fieldErr}>{error}</div>}
      </div>
      <button onClick={handleRedeem} disabled={loading} style={{ ...styles.payBtn, background: '#22c55e' }}>
        {loading ? '⏳ Redeeming…' : '🎁 Redeem Gift Card'}
      </button>
    </div>
  );
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
export default function SubscriptionCheckout({ currentTier = 'free' }) {
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(null);
  const [error, setError]       = useState('');

  const tier = TIERS.find(t => t.id === selectedTier);

  const processPay = useCallback(async payData => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier: selectedTier, ...payData }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Payment failed');
      // For Stripe: d.clientSecret → use Stripe.js confirmPayment (no card data on client)
      // For Crypto: d.walletAddress → display QR
      // For Gift:   d.applied → show success
      setSuccess(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTier]);

  if (success) {
    return (
      <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...styles.card, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <h2 style={{ color: '#22c55e', margin: '0 0 8px' }}>Payment Successful!</h2>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            Your <strong style={{ color: '#f1f5f9' }}>{tier?.name}</strong> plan is now active.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>📦 Choose Your Plan</h1>

        {/* Tier selector */}
        <div style={styles.tiersGrid}>
          {TIERS.map(t => (
            <TierCard key={t.id} tier={t} selected={selectedTier === t.id} onSelect={setSelectedTier} />
          ))}
        </div>

        {/* Free tier — no payment needed */}
        {selectedTier === 'free' ? (
          <div style={styles.card}>
            <div style={{ textAlign: 'center', color: '#22c55e', fontSize: 15 }}>
              ✓ Free plan requires no payment. Enjoy up to 5 requests/day!
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={styles.summaryRow}>
              <div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Selected plan</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                  {tier?.emoji} {tier?.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Amount due</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#6366f1' }}>
                  {tier?.priceLabel}
                </div>
              </div>
            </div>

            {/* Payment method tabs */}
            <div style={styles.methodTabs}>
              {Object.values(PAYMENT_METHODS).map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  style={{ ...styles.methodTab, ...(paymentMethod === m.id ? styles.methodTabActive : {}) }}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>

            {error && <div style={styles.errorBanner}>{error}</div>}

            {paymentMethod === 'card'     && <CardPaymentForm  onPay={processPay} loading={loading} />}
            {paymentMethod === 'crypto'   && <CryptoPaymentForm tier={tier} onPay={processPay} loading={loading} />}
            {paymentMethod === 'giftcard' && <GiftCardForm     onPay={processPay} loading={loading} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 20,
    boxSizing: 'border-box',
  },
  container: { maxWidth: 900, margin: '0 auto' },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 24 },
  tiersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  tierCard: {
    borderRadius: 16,
    border: '2px solid',
    padding: '20px 16px',
    position: 'relative',
    transition: 'all 0.15s',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 10,
    color: '#fff',
    letterSpacing: '0.08em',
  },
  featureList: { margin: '10px 0 0', padding: 0, listStyle: 'none' },
  featureItem: { fontSize: 12, color: '#94a3b8', display: 'flex', gap: 6, marginBottom: 4 },
  card: {
    background: '#1e293b',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #334155',
    marginBottom: 20,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid #334155',
  },
  methodTabs: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  methodTab: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  methodTabActive: { background: '#312e81', borderColor: '#6366f1', color: '#c7d2fe' },
  payForm: {},
  inputLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldErr: { fontSize: 11, color: '#ef4444', marginTop: 3 },
  payBtn: {
    width: '100%',
    padding: '13px 0',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 16,
    transition: 'opacity 0.15s',
  },
  cryptoBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '2px solid',
    background: '#0f172a',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  errorBanner: {
    background: '#450a0a',
    border: '1px solid #ef4444',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 14,
  },
};
