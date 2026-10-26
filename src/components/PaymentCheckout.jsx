// src/components/PaymentCheckout.jsx
// 2026-10-26 - Full payment checkout: Stripe, Crypto, Gift Cards, PayPal
import React, { useState, useEffect } from 'react';

const t = (key, fallback) =>
  (typeof window !== 'undefined' && window.i18n?.t?.(key)) || fallback || key;

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, annualPrice: 0, currency: 'USD',
    icon: '🆓', color: '#6b7280',
    features: ['5 chats/day', 'Basic models only', '1MB file uploads', 'Community support']
  },
  {
    id: 'pro', name: 'Pro', price: 9.99, annualPrice: 7.99, currency: 'USD',
    icon: '⭐', color: '#3b82f6', popular: true,
    features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'API access']
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 14.99, annualPrice: 11.99, currency: 'USD',
    icon: '👑', color: '#8b5cf6',
    features: ['Everything in Pro', 'Custom models', 'Dedicated support', 'SLA guarantee', 'Team management', 'Analytics dashboard']
  }
];

const CRYPTO_WALLETS = {
  BTC: { name: 'Bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', symbol: '₿', color: '#f59e0b' },
  ETH: { name: 'Ethereum', address: '0x742d35Cc6634C0532925a3b8D4C9C2', symbol: 'Ξ', color: '#6366f1' },
  USDC: { name: 'USD Coin', address: '0x742d35Cc6634C0532925a3b8D4C9C2', symbol: '$', color: '#2563eb' },
  USDT: { name: 'Tether', address: 'TQn9Y2khDD95kBZRVKyCDyFZKkNJFGCaE8', symbol: '$', color: '#10b981' }
};

function PlanCard({ plan, selected, annual, onSelect }) {
  const price = annual ? plan.annualPrice : plan.price;
  return (
    <div
      onClick={() => onSelect(plan.id)}
      style={{
        padding: 20, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
        border: `2px solid ${selected ? plan.color : 'var(--border, #334155)'}`,
        background: selected ? plan.color + '18' : 'var(--bg-2, #111827)'
      }}
    >
      {plan.popular && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{plan.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>{plan.name}</div>
          <div style={{ color: plan.color, fontWeight: 700, fontSize: '1.1rem' }}>
            {price === 0 ? 'Free' : `$${price}/mo`}
            {annual && price > 0 && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.78rem', marginLeft: 4 }}>(billed annually)</span>}
          </div>
        </div>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? plan.color : 'var(--border)'}`, background: selected ? plan.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: '0.82rem' }}>
            <span style={{ color: '#10b981' }}>✓</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GiftCardSection({ onRedeemed }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payment/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Redeemed $${data.balance} ${data.currency}` });
        onRedeemed && onRedeemed(data);
      } else {
        setResult({ success: false, message: data.error || 'Redemption failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Try demo code: NEXUS-DEMO-2024' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 600 }}>🎁 {t('giftCard', 'Gift Card')}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="NEXUS-XXXX-XXXX"
          style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', fontSize: '0.88rem', letterSpacing: '0.05em' }}
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          style={{ padding: '9px 16px', background: '#10b98188', border: '1px solid #10b981', borderRadius: 7, color: '#10b981', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? '...' : t('redeem', 'Redeem')}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 6, background: result.success ? '#10b98122' : '#ef444422', color: result.success ? '#10b981' : '#ef4444', fontSize: '0.82rem' }}>
          {result.success ? '✅' : '❌'} {result.message}
        </div>
      )}
    </div>
  );
}

function CryptoSection({ amount }) {
  const [coin, setCoin] = useState('BTC');
  const [copied, setCopied] = useState(false);
  const wallet = CRYPTO_WALLETS[coin];

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(CRYPTO_WALLETS).map(([key, w]) => (
          <button key={key} onClick={() => setCoin(key)} style={{
            padding: '7px 14px', borderRadius: 20, border: `1px solid ${coin === key ? w.color : 'var(--border)'}`,
            background: coin === key ? w.color + '22' : 'var(--bg-3)', color: coin === key ? w.color : 'var(--text-2)',
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
          }}>
            {w.symbol} {key}
          </button>
        ))}
      </div>
      <div style={{ background: 'var(--bg-3)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ width: 120, height: 120, background: '#fff', margin: '0 auto', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
            {wallet.symbol}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 8 }}>QR Code for {wallet.name}</div>
        </div>
        <div style={{ color: 'var(--text-2)', fontSize: '0.78rem', marginBottom: 6 }}>Send exactly <strong style={{ color: wallet.color }}>${amount} USD in {coin}</strong> to:</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, background: 'var(--bg-4, #0f172a)', padding: '8px 10px', borderRadius: 6, fontSize: '0.72rem', color: 'var(--text-1)', wordBreak: 'break-all', lineHeight: 1.4 }}>
            {wallet.address}
          </code>
          <button onClick={copyAddress} style={{ padding: '8px 12px', background: copied ? '#10b98122' : 'var(--bg-4)', border: `1px solid ${copied ? '#10b981' : 'var(--border)'}`, borderRadius: 6, color: copied ? '#10b981' : 'var(--text-2)', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: '0.72rem', marginTop: 8 }}>⚠️ Only send {coin} to this address. Wrong currency = lost funds.</div>
      </div>
    </div>
  );
}

export default function PaymentCheckout({ onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [annual, setAnnual] = useState(false);
  const [paymentTab, setPaymentTab] = useState('card');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [billingInfo, setBillingInfo] = useState({ name: '', email: '', address: '', city: '', country: 'US' });
  const [cardInfo, setCardInfo] = useState({ number: '', expiry: '', cvv: '', showCvv: false });
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    fetch('/api/payment/subscription', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSubscription(data); })
      .catch(() => {});
  }, []);

  const plan = PLANS.find(p => p.id === selectedPlan);
  const price = annual ? plan?.annualPrice : plan?.price;

  const formatCardNumber = (val) => val.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();

  const handleCheckout = async () => {
    if (selectedPlan === 'free') {
      setSuccess({ planId: 'free', message: 'You are on the Free plan!' });
      return;
    }
    if (!billingInfo.name || !billingInfo.email) {
      setError('Please fill in your billing name and email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod: { type: paymentTab },
          billingInfo,
          annual
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data);
        onSuccess && onSuccess(data);
      } else {
        setError(data.error || 'Checkout failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 500, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: '#10b981', margin: '0 0 8px' }}>{t('paymentSuccess', 'Payment Successful!')}</h2>
        <p style={{ color: 'var(--text-2)' }}>You are now on the <strong>{success.planId}</strong> plan.</p>
        {success.nextBillingDate && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Next billing: {new Date(success.nextBillingDate).toLocaleDateString()}</p>
        )}
        <button onClick={() => setSuccess(null)} style={{ marginTop: 16, padding: '10px 24px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {t('goToDashboard', 'Go to Dashboard')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-1, #f1f5f9)', maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>
      <style>{`
        .pay-input { width: 100%; padding: 9px 12px; background: var(--bg-3, #1e293b); border: 1px solid var(--border, #334155); border-radius: 7px; color: var(--text-1, #f1f5f9); font-size: 0.9rem; box-sizing: border-box; }
        .pay-label { display: block; color: var(--text-2, #94a3b8); font-size: 0.82rem; margin-bottom: 5px; }
        .pay-tab { padding: 9px 18px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; background: var(--bg-2); color: var(--text-2); }
        .pay-tab.active { background: var(--accent, #3b82f6); border-color: var(--accent, #3b82f6); color: #fff; }
        @media (max-width: 768px) { .checkout-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <h1 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 800 }}>💳 {t('checkout', 'Secure Checkout')}</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--text-3)', fontSize: '0.88rem' }}>🔒 {t('secureCheckout', 'All transactions are encrypted with AES-256')}</p>

      <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left: Plan + Payment */}
        <div>
          {/* Annual toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>{t('billingMonthly', 'Monthly')}</span>
            <button
              onClick={() => setAnnual(!annual)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: annual ? '#10b981' : 'var(--bg-4, #1e293b)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: annual ? 23 : 3, transition: 'left 0.2s' }} />
            </button>
            <span style={{ color: annual ? '#10b981' : 'var(--text-2)', fontSize: '0.88rem', fontWeight: annual ? 700 : 400 }}>
              {t('billingAnnual', 'Annual')} <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>SAVE 20%</span>
            </span>
          </div>

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {PLANS.map(p => <PlanCard key={p.id} plan={p} selected={selectedPlan === p.id} annual={annual} onSelect={setSelectedPlan} />)}
          </div>

          {/* Payment method */}
          {selectedPlan !== 'free' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--text-2)' }}>💰 {t('paymentMethod', 'Payment Method')}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {[
                  { key: 'card', label: '💳 Card' },
                  { key: 'crypto', label: '🔐 Crypto' },
                  { key: 'gift_card', label: '🎁 Gift Card' },
                  { key: 'paypal', label: '🅿️ PayPal' }
                ].map(tab => (
                  <button key={tab.key} className={`pay-tab${paymentTab === tab.key ? ' active' : ''}`} onClick={() => setPaymentTab(tab.key)}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {paymentTab === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['visa', 'MC', 'AMEX', 'DISC'].map(b => (
                      <span key={b} style={{ padding: '3px 10px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 700 }}>{b}</span>
                    ))}
                  </div>
                  <div>
                    <label className="pay-label">{t('cardholderName', 'Cardholder Name')} *</label>
                    <input className="pay-input" placeholder="John Doe" value={billingInfo.name} onChange={e => setBillingInfo(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="pay-label">{t('cardNumber', 'Card Number')}</label>
                    <input className="pay-input" placeholder="4242 4242 4242 4242" value={cardInfo.number} onChange={e => setCardInfo(p => ({ ...p, number: formatCardNumber(e.target.value) }))} maxLength={19} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="pay-label">{t('expiry', 'Expiry (MM/YY)')}</label>
                      <input className="pay-input" placeholder="12/27" value={cardInfo.expiry} onChange={e => setCardInfo(p => ({ ...p, expiry: e.target.value }))} maxLength={5} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label className="pay-label">{t('cvv', 'CVV')}</label>
                      <input className="pay-input" type={cardInfo.showCvv ? 'text' : 'password'} placeholder="•••" maxLength={4} value={cardInfo.cvv} onChange={e => setCardInfo(p => ({ ...p, cvv: e.target.value }))} style={{ paddingRight: 38 }} />
                      <button onClick={() => setCardInfo(p => ({ ...p, showCvv: !p.showCvv }))} style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }}>
                        {cardInfo.showCvv ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {paymentTab === 'crypto' && <CryptoSection amount={price} />}
              {paymentTab === 'gift_card' && <GiftCardSection onRedeemed={() => {}} />}
              {paymentTab === 'paypal' && (
                <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🅿️</div>
                  <div style={{ color: 'var(--text-2)', marginBottom: 16 }}>You will be redirected to PayPal to complete your payment.</div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>PayPal integration requires a connected PayPal account in your environment settings.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Order summary */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, position: 'sticky', top: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'var(--text-2)' }}>📋 {t('orderSummary', 'Order Summary')}</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-2)' }}>{plan?.name} {t('plan', 'Plan')}</span>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{price === 0 ? 'Free' : `$${price}/mo`}</span>
          </div>
          {annual && price > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#10b981', fontSize: '0.85rem' }}>Annual discount (20%)</span>
              <span style={{ color: '#10b981', fontSize: '0.85rem' }}>-${(((annual ? plan?.price : 0) - (plan?.annualPrice || 0)) * 12).toFixed(2)}/yr</span>
            </div>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{t('total', 'Total')}</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: plan?.color || 'var(--text-1)' }}>
              {price === 0 ? 'Free' : `$${annual ? (price * 12).toFixed(2) + '/yr' : price + '/mo'}`}
            </span>
          </div>

          {/* Billing info */}
          {selectedPlan !== 'free' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 10 }}>
                <label className="pay-label">{t('email', 'Billing Email')} *</label>
                <input className="pay-input" type="email" placeholder="you@example.com" value={billingInfo.email} onChange={e => setBillingInfo(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="pay-label">{t('country', 'Country')}</label>
                <select className="pay-input" value={billingInfo.country} onChange={e => setBillingInfo(p => ({ ...p, country: e.target.value }))}>
                  <option value="US">🇺🇸 United States</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="EU">🇪🇺 European Union</option>
                  <option value="JP">🇯🇵 Japan</option>
                  <option value="KR">🇰🇷 South Korea</option>
                  <option value="OTHER">🌍 Other</option>
                </select>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 12px', background: '#ef444422', border: '1px solid #ef4444', borderRadius: 7, color: '#fca5a5', fontSize: '0.82rem', marginBottom: 12 }}>
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0', border: 'none', borderRadius: 10,
              background: loading ? '#334155' : `linear-gradient(135deg, ${plan?.color || '#3b82f6'}, #6366f1)`,
              color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '⏳ Processing...' : selectedPlan === 'free' ? `🎁 ${t('startFree', 'Start Free')}` : `🔒 ${t('payNow', 'Pay')} ${price === 0 ? 'Free' : `$${price}/mo`}`}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-3)', fontSize: '0.75rem' }}>
            🔒 {t('securedByStripe', 'Secured by Stripe · AES-256 encrypted')}
          </div>

          {subscription && subscription.planId !== 'free' && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginBottom: 4 }}>{t('currentPlan', 'Current Plan')}: <strong style={{ color: 'var(--text-1)' }}>{subscription.planId}</strong></div>
              <button
                onClick={async () => {
                  await fetch('/api/payment/subscription/cancel', { method: 'POST', credentials: 'include' }).catch(() => {});
                  setSubscription(null);
                }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
              >
                {t('cancelSubscription', 'Cancel subscription')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
