/**
 * SubscriptionDashboard — Plan management + payment method selection
 * Supports: Stripe cards, crypto, gift cards
 * @date 2026-08-03
 */
import { useState, useEffect } from 'react';
import { fetchPlans, initiateCheckout, formatPrice, PAYMENT_METHODS } from '../payments/index.js';

function PlanCard({ plan, current, onSelect }) {
  const isEnterprise = plan.price === null;
  return (
    <div style={{
      background: current ? '#6366f122' : '#1e293b',
      border: `1.5px solid ${current ? '#6366f1' : '#334155'}`,
      borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative'
    }}>
      {current && (
        <div style={{ position: 'absolute', top: -10, right: 16, background: '#6366f1', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#fff', fontWeight: 700 }}>
          Current Plan
        </div>
      )}
      <div>
        <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18 }}>{plan.name}</div>
        <div style={{ color: '#6366f1', fontWeight: 800, fontSize: 28, marginTop: 4 }}>
          {formatPrice(plan.price, plan.currency)}
          {plan.interval && <span style={{ fontSize: 14, color: '#64748b' }}>/{plan.interval}</span>}
        </div>
      </div>
      <ul style={{ padding: '0 0 0 16px', margin: 0, color: '#94a3b8', fontSize: 13 }}>
        {plan.features.map((f, i) => <li key={i} style={{ marginBottom: 4 }}>✓ {f}</li>)}
      </ul>
      <button
        onClick={() => onSelect(plan)}
        style={{
          padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: current ? '#334155' : '#6366f1',
          color: current ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14
        }}
        disabled={current}
      >
        {current ? 'Active' : isEnterprise ? 'Contact Sales' : 'Upgrade'}
      </button>
    </div>
  );
}

function PaymentMethodSelector({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(PAYMENT_METHODS).map(([key, { label, icon, providers }]) => (
        <div
          key={key}
          onClick={() => onChange(key)}
          style={{
            background: selected === key ? '#6366f122' : '#0f172a',
            border: `1.5px solid ${selected === key ? '#6366f1' : '#334155'}`,
            borderRadius: 10, padding: '12px 16px', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{label}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>{providers.join(' · ')}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SubscriptionDashboard() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [step, setStep] = useState('plans'); // plans | payment | confirm
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPlans()
      .then(p => { setPlans(p); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  async function handleCheckout() {
    setProcessing(true);
    setError('');
    try {
      const token = sessionStorage.getItem('nexus_access_token');
      const result = await initiateCheckout({ planId: selectedPlan.id, paymentMethod, token });
      setSuccess(true);
      setStep('confirm');
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>💎 Subscription Plans</h2>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>Upgrade your plan to unlock more features</p>

      {error && (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {step === 'plans' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading plans...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  current={false}
                  onSelect={plan => { setSelectedPlan(plan); setStep('payment'); }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {step === 'payment' && selectedPlan && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setStep('plans')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13 }}>
              ← Back to plans
            </button>
            <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 10, padding: 16, border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>Selected Plan</div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>{selectedPlan.name} — {formatPrice(selectedPlan.price, selectedPlan.currency)}{selectedPlan.interval ? `/${selectedPlan.interval}` : ''}</div>
            </div>
          </div>
          <h3 style={{ color: '#f1f5f9', fontSize: 16, marginBottom: 16 }}>Choose Payment Method</h3>
          <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />
          <button
            onClick={handleCheckout}
            disabled={processing}
            style={{ marginTop: 20, width: '100%', padding: '12px 16px', borderRadius: 8, background: processing ? '#334155' : '#6366f1', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: processing ? 'not-allowed' : 'pointer' }}
          >
            {processing ? 'Processing...' : `Checkout with ${PAYMENT_METHODS[paymentMethod]?.label}`}
          </button>
          <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
            🔒 Payments secured by Stripe · No card data stored on our servers
          </p>
        </div>
      )}

      {step === 'confirm' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ color: '#10b981', margin: '0 0 8px' }}>Checkout initiated!</h3>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Complete payment using the provider link.<br />
            Configure <code style={{ color: '#818cf8' }}>STRIPE_SECRET_KEY</code> and <code style={{ color: '#818cf8' }}>STRIPE_PUBLIC_KEY</code> env vars to enable live payments.
          </p>
          <button onClick={() => setStep('plans')} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            View Plans
          </button>
        </div>
      )}
    </div>
  );
}
