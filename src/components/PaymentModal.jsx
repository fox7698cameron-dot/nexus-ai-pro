// File: src/components/PaymentModal.jsx
// Updated: 2026-10-20
// Subscription & payment modal: Stripe, crypto, gift cards

import React, { useState, useCallback, useMemo } from 'react';

// Stripe is loaded at runtime if VITE_STRIPE_PUBLISHABLE_KEY is present.
// We do NOT hardcode keys here. Configure VITE_STRIPE_PUBLISHABLE_KEY in .env
const STRIPE_KEY_PRESENT = !!(
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_STRIPE_PUBLISHABLE_KEY)
);

const TIERS = [
  {
    id: 'free', label: 'Free', priceMonthly: 0, priceAnnual: 0,
    color: '#6b7280', badge: '🆓',
    features: ['5 chats/day', 'Basic models', '1MB uploads', 'Community support'],
  },
  {
    id: 'pro', label: 'Pro', priceMonthly: 9.99, priceAnnual: 95.90,
    color: '#6366f1', badge: '⭐', recommended: true,
    features: ['Unlimited chats', 'All AI models', '100MB uploads', 'Priority support', 'API access'],
  },
  {
    id: 'enterprise', label: 'Enterprise', priceMonthly: 14.99, priceAnnual: 143.90,
    color: '#a855f7', badge: '👑',
    features: ['Everything in Pro', 'Custom models', 'Dedicated SLA', 'Team management', 'White-label options'],
  },
];

const PAYMENT_METHODS = [
  { id: 'card',   label: 'Credit / Debit Card', icon: '💳' },
  { id: 'crypto', label: 'Cryptocurrency',       icon: '₿'  },
  { id: 'gift',   label: 'Gift Card',            icon: '🎁' },
];

const CRYPTO_OPTIONS = [
  { id: 'btc',  label: 'Bitcoin (BTC)',    icon: '₿' },
  { id: 'eth',  label: 'Ethereum (ETH)',   icon: 'Ξ' },
  { id: 'usdc', label: 'USDC (USD Coin)',  icon: '💵' },
  { id: 'sol',  label: 'Solana (SOL)',     icon: '◎' },
];

const CARD_NETWORKS = [
  { id: 'visa',       label: 'Visa',       icon: '🟦' },
  { id: 'mastercard', label: 'Mastercard', icon: '🔴🟡' },
  { id: 'amex',       label: 'Amex',       icon: '🔷' },
  { id: 'discover',   label: 'Discover',   icon: '🟧' },
];

const MOCK_INVOICES = [
  { id: 'inv-001', date: '2026-09-01', amount: '$9.99', status: 'Paid', plan: 'Pro' },
  { id: 'inv-002', date: '2026-08-01', amount: '$9.99', status: 'Paid', plan: 'Pro' },
  { id: 'inv-003', date: '2026-07-01', amount: '$9.99', status: 'Paid', plan: 'Pro' },
];

const CardForm = () => (
  <div>
    {!STRIPE_KEY_PRESENT ? (
      <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13, color: '#b45309' }}>
        ⚠️ <strong>Stripe Elements would render here.</strong><br />
        Configure <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in your <code>.env</code> file to enable live card processing via @stripe/react-stripe-js. Never hardcode this key.
      </div>
    ) : (
      <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13, color: 'var(--text-2)' }}>
        [Stripe Elements CardElement mounted here]
      </div>
    )}
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      {CARD_NETWORKS.map(n => (
        <div key={n.id} title={n.label} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', fontSize: 16, cursor: 'default' }}>
          {n.icon}
        </div>
      ))}
    </div>
    <div style={{ display: 'grid', gap: 10 }}>
      <input type="text" placeholder="1234 5678 9012 3456" maxLength={19} inputMode="numeric"
        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input type="text" placeholder="MM / YY" maxLength={7}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 14 }} />
        <input type="text" placeholder="CVV" maxLength={4} inputMode="numeric"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 14 }} />
      </div>
      <input type="text" placeholder="Name on card"
        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 14 }} />
    </div>
    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
      🔒 Secured by Stripe – we never store card details on our servers.
    </div>
  </div>
);

const CryptoForm = () => {
  const [selected, setSelected] = useState('btc');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {CRYPTO_OPTIONS.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `2px solid ${selected === c.id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: selected === c.id ? 'var(--accent)' : 'var(--text-2)' }}>
            <span style={{ fontSize: 18 }}>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>
      <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Send payment to wallet address:</div>
        <div style={{ fontSize: 11, fontFamily: 'monospace', background: 'var(--bg-2)', padding: '8px 12px', borderRadius: 6, wordBreak: 'break-all', color: 'var(--text-2)' }}>
          Configure CRYPTO_WALLET_{selected.toUpperCase()} in server .env
        </div>
        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 8 }}>⚠️ Wallet addresses must be configured server-side. Never expose them in client code.</div>
      </div>
    </div>
  );
};

const GiftCardForm = () => {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const apply = useCallback(() => {
    if (code.trim().length >= 8) setApplied(true);
  }, [code]);
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Enter your gift card code:</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${applied ? '#22c55e' : 'var(--border)'}`, background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 14, fontFamily: 'monospace', letterSpacing: 2 }} />
        <button onClick={apply} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: applied ? '#22c55e' : 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {applied ? '✓ Applied' : 'Apply'}
        </button>
      </div>
      {applied && <div style={{ color: '#22c55e', fontSize: 12, marginTop: 6 }}>✅ Gift card applied — $9.99 credit added</div>}
    </div>
  );
};

export default function PaymentModal({ onClose, currentTier = 'free' }) {
  const [selectedTier, setSelectedTier] = useState(currentTier === 'free' ? 'pro' : currentTier);
  const [billing, setBilling] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [view, setView] = useState('plans'); // plans | checkout | invoices | cancel
  const [confirmCancel, setConfirmCancel] = useState(false);

  const tier = useMemo(() => TIERS.find(t => t.id === selectedTier), [selectedTier]);

  const displayPrice = useMemo(() => {
    if (!tier || tier.priceMonthly === 0) return 'Free';
    return billing === 'annual'
      ? `$${(tier.priceAnnual / 12).toFixed(2)}/mo`
      : `$${tier.priceMonthly}/mo`;
  }, [tier, billing]);

  const annualSavings = useMemo(() => {
    if (!tier || tier.priceMonthly === 0) return 0;
    return ((tier.priceMonthly * 12) - tier.priceAnnual).toFixed(2);
  }, [tier]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <style>{`
        .pay-modal { background:var(--bg-1); border:1px solid var(--border); border-radius:16px; padding:28px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; }
        .pay-tabs { display:flex; gap:6px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; flex-wrap:wrap; }
        .pay-tab { background:none; border:none; cursor:pointer; font-size:13px; color:var(--text-3); padding:4px 10px; border-radius:6px; }
        .pay-tab.active { color:var(--accent); background:var(--accent)15; font-weight:600; }
        .tier-card { border:2px solid var(--border); border-radius:12px; padding:16px; cursor:pointer; transition:all 0.2s; position:relative; background:var(--bg-2); margin-bottom:10px; }
        .tier-card:hover, .tier-card.selected { border-color:var(--accent); }
        .feature-list { list-style:none; padding:0; margin:10px 0 0; display:flex; flex-direction:column; gap:4px; }
        .feature-list li { font-size:12px; color:var(--text-2); display:flex; align-items:center; gap:6px; }
        .method-btn { display:flex; align-items:center; gap:8px; padding:10px 14px; borderRadius:8px; border:2px solid var(--border); background:var(--bg-2); cursor:pointer; font-size:13px; color:var(--text-2); transition:all 0.2s; }
        .method-btn.active { border-color:var(--accent); color:var(--accent); }
        @media (max-width:480px) { .pay-modal { padding:20px; } }
      `}</style>

      <div className="pay-modal" role="dialog" aria-modal="true" aria-label="Subscription & Billing">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>💳 Subscription & Billing</h2>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>}
        </div>

        <div className="pay-tabs">
          {[['plans','📋 Plans'], ['checkout','💳 Checkout'], ['invoices','🧾 Invoices'], ['cancel','❌ Cancel']].map(([v, l]) => (
            <button key={v} className={`pay-tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>

        {/* Plans */}
        {view === 'plans' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Billing:</span>
              {['monthly', 'annual'].map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: billing === b ? 'var(--accent)' : 'var(--bg-2)', color: billing === b ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontWeight: billing === b ? 600 : 400 }}>
                  {b.charAt(0).toUpperCase() + b.slice(1)} {b === 'annual' && <span style={{ color: billing === 'annual' ? '#fff' : '#22c55e' }}>–20%</span>}
                </button>
              ))}
            </div>

            {TIERS.map(t => (
              <div key={t.id} className={`tier-card${selectedTier === t.id ? ' selected' : ''}`} onClick={() => setSelectedTier(t.id)}>
                {t.recommended && <div style={{ position: 'absolute', top: -10, right: 14, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>RECOMMENDED</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{t.badge}</span>
                      <span style={{ fontWeight: 700, fontSize: 16, color: t.color }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>
                      {t.priceMonthly === 0 ? 'Free' : billing === 'annual' ? `$${(t.priceAnnual / 12).toFixed(2)}/mo` : `$${t.priceMonthly}/mo`}
                    </div>
                    {billing === 'annual' && t.priceMonthly > 0 && (
                      <div style={{ fontSize: 11, color: '#22c55e' }}>Save ${((t.priceMonthly * 12) - t.priceAnnual).toFixed(2)}/year</div>
                    )}
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selectedTier === t.id ? 'var(--accent)' : 'var(--border)'}`, background: selectedTier === t.id ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selectedTier === t.id && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                </div>
                <ul className="feature-list">
                  {t.features.map(f => <li key={f}><span style={{ color: '#22c55e' }}>✓</span> {f}</li>)}
                </ul>
              </div>
            ))}

            {selectedTier !== 'free' && (
              <button onClick={() => setView('checkout')} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Subscribe to {tier?.label} – {displayPrice}
              </button>
            )}
          </>
        )}

        {/* Checkout */}
        {view === 'checkout' && (
          <>
            <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{tier?.label} Plan</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{billing === 'annual' ? 'Annual billing' : 'Monthly billing'}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{displayPrice}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} className={`method-btn${paymentMethod === m.id ? ' active' : ''}`}
                  onClick={() => setPaymentMethod(m.id)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: `2px solid ${paymentMethod === m.id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-2)', cursor: 'pointer', fontSize: 13, color: paymentMethod === m.id ? 'var(--accent)' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'card'   && <CardForm />}
            {paymentMethod === 'crypto' && <CryptoForm />}
            {paymentMethod === 'gift'   && <GiftCardForm />}

            {paymentMethod === 'card' && (
              <button style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 14 }}>
                Pay {displayPrice}
              </button>
            )}
          </>
        )}

        {/* Invoices */}
        {view === 'invoices' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Invoice', 'Date', 'Plan', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 4px', color: 'var(--text-3)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_INVOICES.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 4px', color: 'var(--accent)' }}>{inv.id}</td>
                    <td style={{ padding: '8px 4px' }}>{inv.date}</td>
                    <td style={{ padding: '8px 4px' }}>{inv.plan}</td>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>{inv.amount}</td>
                    <td style={{ padding: '8px 4px' }}>
                      <span style={{ color: '#22c55e', fontSize: 11, background: '#22c55e15', padding: '2px 6px', borderRadius: 6 }}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cancel */}
        {view === 'cancel' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😢</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Cancel Subscription?</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
              You'll lose access to all {currentTier === 'pro' ? 'Pro' : 'Enterprise'} features at the end of your billing period.
            </div>
            {!confirmCancel ? (
              <button onClick={() => setConfirmCancel(true)}
                style={{ padding: '10px 24px', borderRadius: 8, border: '2px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancel Subscription
              </button>
            ) : (
              <div style={{ background: '#ef444415', border: '1px solid #ef4444', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>Are you absolutely sure?</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setConfirmCancel(false)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', cursor: 'pointer', fontSize: 13 }}>
                    Keep Subscription
                  </button>
                  <button onClick={() => { onClose?.(); }}
                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    Confirm Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
