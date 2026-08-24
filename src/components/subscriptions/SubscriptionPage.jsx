/**
 * src/components/subscriptions/SubscriptionPage.jsx
 * Subscription & Billing Management
 * Updated: 2026-08-24
 *
 * Payment Methods:
 * - Stripe (credit/debit: Visa, Mastercard, Amex, Discover, etc.)
 * - Crypto (BTC, ETH, USDC, SOL)
 * - Gift Cards
 *
 * IMPORTANT: Stripe public key read from env via server-side session
 * No private keys or tokens are ever present in browser code
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AuthService from '../../auth/AuthService.js';

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    icon: '🆓',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
    features: [
      '5 AI chats/day',
      'Basic models (GPT-4, Claude Sonnet)',
      '1MB file uploads',
      'Standard response time',
      'Community support',
    ],
    limitations: ['No analytics dashboard', 'No game dev tools', 'No API access'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthly: 9.99,
    annual: 7.99,
    icon: '⭐',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    features: [
      'Unlimited AI chats',
      'All AI models (25+)',
      '100MB file uploads',
      'Analytics dashboard',
      'Game dev tracking',
      '2FA & biometrics',
      'Priority support',
      'Real-time metrics',
    ],
    badge: 'POPULAR',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 14.99,
    annual: 11.99,
    icon: '👑',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'Unlimited file uploads',
      'Security dashboard',
      'All platform connectors',
      'Multi-user admin',
      'API access (rate: 10k/min)',
      'SLA guarantee (99.9%)',
      'Dedicated support',
      'Compliance reports',
    ],
  },
};

const CRYPTO_COINS = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', icon: '₿', color: '#f7931a' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', color: '#627eea' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', icon: '$', color: '#2775ca' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', icon: '◎', color: '#9945ff' },
  { id: 'bnb', name: 'BNB', symbol: 'BNB', icon: '⬡', color: '#f3ba2f' },
  { id: 'matic', name: 'Polygon', symbol: 'MATIC', icon: '⬡', color: '#8247e5' },
];

const CARD_BRANDS = [
  { id: 'visa', name: 'Visa', icon: '💳' },
  { id: 'mastercard', name: 'Mastercard', icon: '💳' },
  { id: 'amex', name: 'Amex', icon: '💳' },
  { id: 'discover', name: 'Discover', icon: '💳' },
];

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, isAnnual, current, onSelect }) {
  const price = isAnnual ? plan.annual : plan.monthly;
  const isCurrent = current === plan.id;
  return (
    <div style={{
      background: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 24,
      border: `2px solid ${isCurrent ? plan.color : 'rgba(255,255,255,0.06)'}`,
      position: 'relative', transition: 'border-color 0.2s',
      display: 'flex', flexDirection: 'column',
    }}>
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: plan.gradient, color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 14px', borderRadius: 20, letterSpacing: '0.06em',
        }}>{plan.badge}</div>
      )}
      {isCurrent && (
        <div style={{
          position: 'absolute', top: -12, right: 16,
          background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20,
        }}>CURRENT</div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{plan.icon}</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 20 }}>{plan.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: plan.color, fontWeight: 700, fontSize: 36 }}>
            {price === 0 ? 'Free' : `$${price}`}
          </span>
          {price > 0 && (
            <span style={{ color: '#475569', fontSize: 14 }}>/{isAnnual ? 'mo, billed annually' : 'month'}</span>
          )}
        </div>
        {isAnnual && price > 0 && (
          <div style={{ color: '#22c55e', fontSize: 12, marginTop: 2 }}>
            Save ${((plan.monthly - plan.annual) * 12).toFixed(0)}/year
          </div>
        )}
      </div>

      <div style={{ flex: 1, marginBottom: 20 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', color: '#94a3b8', fontSize: 13 }}>
            <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
            {f}
          </div>
        ))}
        {plan.limitations?.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', color: '#475569', fontSize: 13 }}>
            <span style={{ flexShrink: 0 }}>✗</span>
            {f}
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || plan.id === 'free'}
        style={{
          width: '100%', padding: 12, borderRadius: 10, border: 'none',
          cursor: isCurrent || plan.id === 'free' ? 'default' : 'pointer',
          background: isCurrent ? 'rgba(34,197,94,0.15)' : plan.id === 'free' ? '#1e293b' : plan.gradient,
          color: isCurrent ? '#22c55e' : plan.id === 'free' ? '#475569' : '#fff',
          fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
        }}
      >
        {isCurrent ? '✓ Current Plan' : plan.id === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}

// ── Stripe card form (UI only — actual charge on server) ─────────────────────
function CardPaymentForm({ planId, isAnnual, onSuccess, onCancel }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExpiry = (v) => v.replace(/\D/g, '').slice(0, 4).replace(/(.{2})/, '$1/');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Server-side tokenization — Stripe.js handles the actual card data
      // We send a Stripe payment intent setup to the server
      const resp = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AuthService.authHeaders() },
        body: JSON.stringify({
          planId,
          interval: isAnnual ? 'year' : 'month',
          paymentMethod: 'card',
          // In production: use Stripe.js to tokenize card BEFORE sending to server
          // Never send raw card numbers to your own server
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Payment failed');

      // In production: Stripe.js handles redirect/confirmation
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1.5px solid #334155', background: '#0f172a',
    color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        {CARD_BRANDS.map(b => (
          <span key={b.id} style={{ fontSize: 11, color: '#475569', padding: '3px 8px', border: '1px solid #1e293b', borderRadius: 6 }}>
            {b.icon} {b.name}
          </span>
        ))}
      </div>

      <input
        placeholder="Cardholder name"
        value={card.name}
        onChange={e => setCard(p => ({ ...p, name: e.target.value }))}
        style={inp}
        autoComplete="cc-name"
        required
      />
      <input
        placeholder="1234 5678 9012 3456"
        value={card.number}
        onChange={e => setCard(p => ({ ...p, number: fmtCard(e.target.value) }))}
        style={inp}
        autoComplete="cc-number"
        inputMode="numeric"
        maxLength={19}
        required
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input
          placeholder="MM/YY"
          value={card.expiry}
          onChange={e => setCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
          style={inp}
          autoComplete="cc-exp"
          inputMode="numeric"
          maxLength={5}
          required
        />
        <input
          placeholder="CVV"
          value={card.cvc}
          onChange={e => setCard(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
          style={inp}
          type="password"
          autoComplete="cc-csc"
          maxLength={4}
          required
        />
      </div>
      {error && <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>⚠️ {error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{
          flex: 1, padding: 12, borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? '⏳ Processing...' : '🔒 Pay Securely'}
        </button>
        <button type="button" onClick={onCancel} style={{
          padding: '12px 16px', borderRadius: 8, border: '1px solid #334155',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer',
        }}>Cancel</button>
      </div>
      <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', margin: 0 }}>
        🔒 Payments secured by Stripe. We never store your card number.
      </p>
    </form>
  );
}

// ── Crypto payment ─────────────────────────────────────────────────────────────
function CryptoPaymentForm({ planId, isAnnual, onSuccess, onCancel }) {
  const [selectedCoin, setSelectedCoin] = useState('usdc');
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState('');

  const handleInitiate = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/subscriptions/crypto/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AuthService.authHeaders() },
        body: JSON.stringify({ planId, interval: isAnnual ? 'year' : 'month', coin: selectedCoin }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setPaymentDetails(data);
    } catch (err) {
      setError(err.message || 'Crypto payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {CRYPTO_COINS.map(coin => (
          <button
            key={coin.id}
            onClick={() => setSelectedCoin(coin.id)}
            style={{
              padding: '10px', borderRadius: 8,
              border: `1.5px solid ${selectedCoin === coin.id ? coin.color : '#334155'}`,
              background: selectedCoin === coin.id ? coin.color + '22' : 'transparent',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, color: coin.color }}>{coin.icon}</div>
            <div style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>{coin.symbol}</div>
            <div style={{ color: '#475569', fontSize: 10 }}>{coin.name}</div>
          </button>
        ))}
      </div>

      {paymentDetails ? (
        <div style={{
          background: 'rgba(15,23,42,0.8)', borderRadius: 10, padding: 16,
          border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px' }}>
            Send exactly <strong style={{ color: '#f1f5f9' }}>{paymentDetails.amount} {paymentDetails.coin.toUpperCase()}</strong> to:
          </p>
          <code style={{
            display: 'block', color: '#a5b4fc', fontSize: 12, wordBreak: 'break-all',
            background: '#0f172a', padding: '8px 12px', borderRadius: 6,
          }}>{paymentDetails.address}</code>
          <p style={{ color: '#475569', fontSize: 11, margin: '8px 0 0' }}>
            Payment expires in {paymentDetails.expiresIn || '30 minutes'}. Transaction confirmed in ~3 blocks.
          </p>
        </div>
      ) : (
        <>
          {error && <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>⚠️ {error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleInitiate}
              disabled={loading}
              style={{
                flex: 1, padding: 12, borderRadius: 8, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #f7931a, #f59e0b)',
                color: '#fff', fontWeight: 600, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '⏳ Generating address...' : `Generate ${selectedCoin.toUpperCase()} Address`}
            </button>
            <button type="button" onClick={onCancel} style={{
              padding: '12px 16px', borderRadius: 8, border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Gift card ──────────────────────────────────────────────────────────────────
function GiftCardForm({ planId, isAnnual, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmtCode = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    .replace(/(.{4})/g, '$1-').replace(/-$/, '');

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.replace(/-/g, '')) { setError('Enter your gift card code'); return; }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/subscriptions/giftcard/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AuthService.authHeaders() },
        body: JSON.stringify({ code: code.replace(/-/g, ''), planId, interval: isAnnual ? 'year' : 'month' }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Invalid code');
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRedeem} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
        Enter your Nexus AI Pro gift card code below.
      </p>
      <input
        placeholder="XXXX-XXXX-XXXX-XXXX"
        value={code}
        onChange={e => setCode(fmtCode(e.target.value))}
        style={{
          width: '100%', padding: '13px', borderRadius: 8,
          border: '1.5px solid #334155', background: '#0f172a',
          color: '#f1f5f9', fontSize: 16, outline: 'none', boxSizing: 'border-box',
          textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700,
        }}
      />
      {error && <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>⚠️ {error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{
          flex: 1, padding: 12, borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? '⏳ Redeeming...' : '🎁 Redeem Gift Card'}
        </button>
        <button type="button" onClick={onCancel} style={{
          padding: '12px 16px', borderRadius: 8, border: '1px solid #334155',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </form>
  );
}

// ── Main SubscriptionPage ──────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // card | crypto | giftcard
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/subscriptions/current', { headers: AuthService.authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.plan) setCurrentPlan(d.plan); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePlanSelect = (planId) => {
    if (planId === currentPlan || planId === 'free') return;
    setSelectedPlan(planId);
  };

  const handlePaymentSuccess = (data) => {
    setCurrentPlan(selectedPlan);
    setSelectedPlan(null);
    setSuccess(`Successfully upgraded to ${PLANS[selectedPlan]?.name}!`);
    setTimeout(() => setSuccess(''), 5000);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      padding: 24,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>
            {t('subscriptions.choosePlan')}
          </h1>
          <p style={{ color: '#475569', fontSize: 15, margin: 0 }}>
            All plans include unlimited access to core AI features
          </p>
          {/* Billing toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            <span style={{ color: isAnnual ? '#475569' : '#f1f5f9', fontSize: 14, fontWeight: 500 }}>Monthly</span>
            <div
              onClick={() => setIsAnnual(v => !v)}
              style={{
                width: 48, height: 26, borderRadius: 13, background: isAnnual ? '#6366f1' : '#334155',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: isAnnual ? 25 : 3,
                transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ color: isAnnual ? '#f1f5f9' : '#475569', fontSize: 14, fontWeight: 500 }}>
              Annual <span style={{ color: '#22c55e', fontSize: 12 }}>Save 20%</span>
            </span>
          </div>
        </div>

        {success && (
          <div style={{
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#86efac', textAlign: 'center',
          }}>
            🎉 {success}
          </div>
        )}

        {!selectedPlan ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {Object.values(PLANS).map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnual}
                current={currentPlan}
                onSelect={handlePlanSelect}
              />
            ))}
          </div>
        ) : (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{
              background: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 28,
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  Complete Payment
                </h2>
                <button
                  onClick={() => setSelectedPlan(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}
                >✕</button>
              </div>

              {/* Plan summary */}
              <div style={{
                background: PLANS[selectedPlan]?.gradient, borderRadius: 10, padding: '14px 16px', marginBottom: 20,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Selected plan</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{PLANS[selectedPlan]?.icon} {PLANS[selectedPlan]?.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>
                    ${isAnnual ? PLANS[selectedPlan]?.annual : PLANS[selectedPlan]?.monthly}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                    /{isAnnual ? 'mo, billed annually' : 'month'}
                  </div>
                </div>
              </div>

              {/* Payment method tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1e293b', borderRadius: 8, padding: 4 }}>
                {[
                  { id: 'card', label: '💳 Card' },
                  { id: 'crypto', label: '₿ Crypto' },
                  { id: 'giftcard', label: '🎁 Gift Card' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    style={{
                      flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: paymentMethod === id ? '#334155' : 'transparent',
                      color: paymentMethod === id ? '#f1f5f9' : '#64748b',
                      fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    }}
                  >{label}</button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <CardPaymentForm
                  planId={selectedPlan}
                  isAnnual={isAnnual}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setSelectedPlan(null)}
                />
              )}
              {paymentMethod === 'crypto' && (
                <CryptoPaymentForm
                  planId={selectedPlan}
                  isAnnual={isAnnual}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setSelectedPlan(null)}
                />
              )}
              {paymentMethod === 'giftcard' && (
                <GiftCardForm
                  planId={selectedPlan}
                  isAnnual={isAnnual}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setSelectedPlan(null)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
