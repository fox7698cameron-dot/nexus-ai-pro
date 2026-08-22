/**
 * filename: src/payments/PaymentSystem.jsx
 * purpose:  Enterprise payment system for Nexus AI Pro.
 *           Integrates Stripe for cards, digital wallets, and cryptocurrency,
 *           supports gift card redemption, subscription tier management,
 *           billing history, and invoice generation.
 * date:     2026-08-22
 * copyright: Copyright (c) 2026 Nexus AI Pro. All rights reserved.
 *
 * SECURITY / PCI COMPLIANCE NOTES
 * - The Stripe publishable key is read from the environment variable
 *   VITE_STRIPE_PUBLISHABLE_KEY at build time. It is NEVER hardcoded here.
 * - Card numbers, CVVs, and expiry dates are handled exclusively by Stripe
 *   Elements — they are rendered in Stripe-hosted iframes and never touch
 *   the application JavaScript runtime or logs.
 * - Only Stripe PaymentMethod IDs and PaymentIntent client secrets (both
 *   non-sensitive) are passed through this component.
 * - Gift card codes are one-time-use tokens managed server-side.
 * - No payment credentials are stored in localStorage, sessionStorage, or
 *   any browser storage.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Subscription tiers available on the platform. */
export const SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Free',
    priceUSD: 0,
    priceEUR: 0,
    priceGBP: 0,
    priceCAD: 0,
    priceAUD: 0,
    description: 'Get started with core features at no cost.',
    features: ['5 projects', '1 GB storage', 'Community support'],
    stripePriceId: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUSD: 19,
    priceEUR: 17,
    priceGBP: 15,
    priceCAD: 26,
    priceAUD: 29,
    description: 'For individual creators and small teams.',
    features: ['Unlimited projects', '100 GB storage', 'Priority support', 'API access'],
    stripePriceId: import.meta?.env?.VITE_STRIPE_PRICE_PRO ?? null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceUSD: 99,
    priceEUR: 89,
    priceGBP: 79,
    priceCAD: 134,
    priceAUD: 149,
    description: 'Scalable plans for large organizations.',
    features: ['Everything in Pro', '1 TB storage', 'Dedicated support', 'SLA', 'SSO/SAML'],
    stripePriceId: import.meta?.env?.VITE_STRIPE_PRICE_ENTERPRISE ?? null,
  },
  {
    id: 'gamedev',
    name: 'Game Dev',
    priceUSD: 49,
    priceEUR: 44,
    priceGBP: 39,
    priceCAD: 66,
    priceAUD: 74,
    description: 'Purpose-built for indie and studio game developers.',
    features: ['Game asset pipeline', '500 GB storage', 'Dev Discord access', 'Beta SDK'],
    stripePriceId: import.meta?.env?.VITE_STRIPE_PRICE_GAMEDEV ?? null,
  },
  {
    id: 'studio',
    name: 'Studio',
    priceUSD: 199,
    priceEUR: 179,
    priceGBP: 159,
    priceCAD: 269,
    priceAUD: 299,
    description: 'Full-suite plan for professional studios and agencies.',
    features: ['Unlimited everything', 'White-label option', 'Custom integrations', 'Account manager'],
    stripePriceId: import.meta?.env?.VITE_STRIPE_PRICE_STUDIO ?? null,
  },
];

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'BTC', symbol: '₿', label: 'Bitcoin', crypto: true },
  { code: 'ETH', symbol: 'Ξ', label: 'Ethereum', crypto: true },
  { code: 'USDC', symbol: 'USDC', label: 'USD Coin', crypto: true },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg, #0f1117)',
    color: 'var(--color-text, #e2e8f0)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '2rem 1rem',
  },
  inner: {
    maxWidth: '960px',
    margin: '0 auto',
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    color: 'var(--color-accent, #7c3aed)',
  },
  subheading: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: 'var(--color-text, #e2e8f0)',
  },
  card: {
    backgroundColor: 'var(--color-surface, #1a1f2e)',
    borderRadius: '0.875rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  tierCard: (selected) => ({
    border: `2px solid ${selected ? 'var(--color-accent, #7c3aed)' : 'var(--color-border, #2d3748)'}`,
    borderRadius: '0.75rem',
    padding: '1.25rem 1rem',
    cursor: 'pointer',
    backgroundColor: selected ? 'rgba(124,58,237,0.12)' : 'transparent',
    transition: 'border-color 0.15s, background-color 0.15s',
  }),
  tierName: {
    fontWeight: 700,
    fontSize: '1rem',
    marginBottom: '0.25rem',
  },
  tierPrice: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--color-accent, #7c3aed)',
  },
  tierDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.5rem',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0.75rem 0 0',
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  field: { marginBottom: '1rem' },
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.875rem',
    borderRadius: '0.5rem',
    border: '1.5px solid var(--color-border, #2d3748)',
    backgroundColor: 'var(--color-input-bg, #0f1117)',
    color: 'var(--color-text, #e2e8f0)',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.65rem 0.875rem',
    borderRadius: '0.5rem',
    border: '1.5px solid var(--color-border, #2d3748)',
    backgroundColor: 'var(--color-input-bg, #0f1117)',
    color: 'var(--color-text, #e2e8f0)',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  btn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: 'var(--color-accent, #7c3aed)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnFull: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: 'var(--color-accent, #7c3aed)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.75rem',
  },
  btnSecondary: {
    padding: '0.65rem 1.25rem',
    borderRadius: '0.5rem',
    border: '1.5px solid var(--color-border, #2d3748)',
    backgroundColor: 'transparent',
    color: 'var(--color-text, #e2e8f0)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
  nav: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  navBtn: (active) => ({
    padding: '0.5rem 1.25rem',
    borderRadius: '2rem',
    border: 'none',
    backgroundColor: active ? 'var(--color-accent, #7c3aed)' : 'var(--color-surface, #1a1f2e)',
    color: active ? '#fff' : '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: active ? 600 : 400,
    transition: 'background-color 0.15s',
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
    overflowX: 'auto',
  },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid var(--color-border, #2d3748)',
    color: '#64748b',
    fontWeight: 600,
  },
  td: {
    padding: '0.7rem 0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  pciNote: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '0.5rem',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    color: '#4ade80',
    marginTop: '1rem',
  },
  error: {
    color: '#f87171',
    fontSize: '0.825rem',
    marginTop: '0.4rem',
  },
  success: {
    color: '#22c55e',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
  stripeElementWrapper: {
    border: '1.5px solid var(--color-border, #2d3748)',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'var(--color-input-bg, #0f1117)',
    marginBottom: '0.75rem',
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '2rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginLeft: '0.5rem',
  },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  col: { flex: 1, minWidth: '200px' },
};

// ---------------------------------------------------------------------------
// Stripe loader (loads Stripe.js dynamically — never from hardcoded URL with key)
// ---------------------------------------------------------------------------

let stripeInstance = null;
let stripeLoadPromise = null;

/**
 * Lazily loads Stripe.js from the official CDN and initialises it with the
 * publishable key from the environment. The key is NEVER hardcoded.
 *
 * @returns {Promise<import('@stripe/stripe-js').Stripe>}
 */
function loadStripe() {
  if (stripeInstance) return Promise.resolve(stripeInstance);

  if (stripeLoadPromise) return stripeLoadPromise;

  const publishableKey = typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY
    : (typeof process !== 'undefined' ? process.env?.VITE_STRIPE_PUBLISHABLE_KEY : undefined);

  if (!publishableKey) {
    return Promise.reject(
      new Error(
        'Stripe publishable key is not set. ' +
        'Define VITE_STRIPE_PUBLISHABLE_KEY in your .env file.'
      )
    );
  }

  stripeLoadPromise = new Promise((resolve, reject) => {
    // Avoid duplicate script tags
    if (document.querySelector('script[src="https://js.stripe.com/v3/"]')) {
      const existing = window.Stripe;
      if (existing) {
        stripeInstance = existing(publishableKey);
        resolve(stripeInstance);
        return;
      }
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      stripeInstance = window.Stripe(publishableKey);
      resolve(stripeInstance);
    };
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });

  return stripeLoadPromise;
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function paymentApiFetch(path, options = {}) {
  const res = await fetch(`/api/payments${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ---------------------------------------------------------------------------
// PaymentContext
// ---------------------------------------------------------------------------

const PaymentContext = createContext(null);

export function usePayment() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayment must be used inside <PaymentProvider>.');
  return ctx;
}

export function PaymentProvider({ children }) {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current subscription on mount
    paymentApiFetch('/subscription')
      .then((data) => setCurrentSubscription(data.subscription))
      .catch(() => {}); // Unauthenticated — ignore

    paymentApiFetch('/billing-history')
      .then((data) => setBillingHistory(data.invoices || []))
      .catch(() => {});
  }, []);

  const createPaymentIntent = useCallback(async ({ tierId, currency: cur, paymentMethod }) => {
    return paymentApiFetch('/create-intent', {
      method: 'POST',
      body: JSON.stringify({ tierId, currency: cur, paymentMethod }),
    });
  }, []);

  const redeemGiftCard = useCallback(async (code) => {
    return paymentApiFetch('/gift-card/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }, []);

  const downloadInvoice = useCallback(async (invoiceId) => {
    const res = await fetch(`/api/payments/invoice/${invoiceId}/pdf`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download invoice.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <PaymentContext.Provider
      value={{
        currentSubscription,
        billingHistory,
        currency,
        setCurrency,
        loading,
        setLoading,
        createPaymentIntent,
        redeemGiftCard,
        downloadInvoice,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// TierSelector
// ---------------------------------------------------------------------------

function TierSelector({ selectedTierId, onSelect, currency }) {
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  const priceKey = `price${currency}`;

  return (
    <div>
      <h2 style={s.subheading}>Choose a Plan</h2>
      <div style={s.tierGrid}>
        {SUBSCRIPTION_TIERS.map((tier) => {
          const price = tier[priceKey];
          const displayPrice =
            currencyInfo?.crypto
              ? `Contact us`
              : price === 0
              ? 'Free'
              : `${currencyInfo?.symbol ?? '$'}${price}/mo`;

          return (
            <div
              key={tier.id}
              style={s.tierCard(selectedTierId === tier.id)}
              onClick={() => onSelect(tier.id)}
              role="radio"
              aria-checked={selectedTierId === tier.id}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(tier.id)}
              aria-label={`${tier.name} plan, ${displayPrice}`}
            >
              <div style={s.tierName}>{tier.name}</div>
              <div style={s.tierPrice}>{displayPrice}</div>
              <div style={s.tierDesc}>{tier.description}</div>
              <ul style={s.featureList}>
                {tier.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddressForm
// ---------------------------------------------------------------------------

function AddressForm({ address, onChange }) {
  const set = (key) => (e) => onChange({ ...address, [key]: e.target.value });

  return (
    <div>
      <h2 style={{ ...s.subheading, marginTop: '1rem' }}>Billing Address</h2>
      <div style={s.row}>
        <div style={{ ...s.field, ...s.col }}>
          <label style={s.label} htmlFor="addr-name">Full name</label>
          <input id="addr-name" type="text" autoComplete="name" style={s.input} value={address.name || ''} onChange={set('name')} />
        </div>
        <div style={{ ...s.field, ...s.col }}>
          <label style={s.label} htmlFor="addr-email">Email</label>
          <input id="addr-email" type="email" autoComplete="email" style={s.input} value={address.email || ''} onChange={set('email')} />
        </div>
      </div>
      <div style={s.field}>
        <label style={s.label} htmlFor="addr-line1">Street address</label>
        <input id="addr-line1" type="text" autoComplete="address-line1" style={s.input} value={address.line1 || ''} onChange={set('line1')} />
      </div>
      <div style={s.row}>
        <div style={{ ...s.field, ...s.col }}>
          <label style={s.label} htmlFor="addr-city">City</label>
          <input id="addr-city" type="text" autoComplete="address-level2" style={s.input} value={address.city || ''} onChange={set('city')} />
        </div>
        <div style={{ ...s.field, ...s.col }}>
          <label style={s.label} htmlFor="addr-state">State / Province</label>
          <input id="addr-state" type="text" autoComplete="address-level1" style={s.input} value={address.state || ''} onChange={set('state')} />
        </div>
        <div style={{ ...s.field, ...s.col }}>
          <label style={s.label} htmlFor="addr-zip">Postal code</label>
          <input id="addr-zip" type="text" autoComplete="postal-code" style={s.input} value={address.zip || ''} onChange={set('zip')} />
        </div>
      </div>
      <div style={s.field}>
        <label style={s.label} htmlFor="addr-country">Country</label>
        <input id="addr-country" type="text" autoComplete="country-name" style={s.input} value={address.country || ''} onChange={set('country')} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaymentMethodSelector
// ---------------------------------------------------------------------------

function PaymentMethodSelector({ selected, onSelect }) {
  const methods = [
    { id: 'card', label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, Amex, Discover' },
    { id: 'apple_pay', label: 'Apple Pay', icon: '🍎', desc: 'Pay with Touch ID or Face ID' },
    { id: 'google_pay', label: 'Google Pay', icon: '🔵', desc: 'Pay with Google Pay' },
    { id: 'crypto', label: 'Cryptocurrency', icon: '₿', desc: 'Bitcoin, Ethereum, USDC' },
    { id: 'gift_card', label: 'Gift Card', icon: '🎁', desc: 'Redeem a Nexus gift card' },
  ];

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={s.subheading}>Payment Method</h2>
      <div role="radiogroup" aria-label="Payment method" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {methods.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={selected === m.id}
            onClick={() => onSelect(m.id)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.625rem',
              border: `2px solid ${selected === m.id ? 'var(--color-accent, #7c3aed)' : 'var(--color-border, #2d3748)'}`,
              backgroundColor: selected === m.id ? 'rgba(124,58,237,0.12)' : 'transparent',
              color: 'var(--color-text, #e2e8f0)',
              cursor: 'pointer',
              textAlign: 'left',
              minWidth: '140px',
              transition: 'border-color 0.15s',
            }}
            aria-label={`${m.label}: ${m.desc}`}
          >
            <div style={{ fontSize: '1.25rem' }}>{m.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.25rem' }}>{m.label}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardPaymentPanel (Stripe Elements mount point)
// ---------------------------------------------------------------------------

function CardPaymentPanel({ stripe, onPaymentMethodId }) {
  const mountRef = useRef(null);
  const elementsRef = useRef(null);
  const cardRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!stripe || !mountRef.current) return;

    const elements = stripe.elements({
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: '#0f1117',
          colorText: '#e2e8f0',
          colorDanger: '#f87171',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '8px',
        },
      },
    });

    elementsRef.current = elements;

    // Stripe Card Element renders in an iframe — card numbers never touch JS
    const card = elements.create('card', {
      hidePostalCode: false,
      style: {
        base: {
          fontSize: '16px',
          color: '#e2e8f0',
          '::placeholder': { color: '#64748b' },
        },
      },
    });

    cardRef.current = card;
    card.mount(mountRef.current);
    card.on('ready', () => setReady(true));
    card.on('change', (event) => {
      setError(event.error ? event.error.message : '');
    });

    return () => {
      card.unmount();
    };
  }, [stripe]);

  const handleConfirm = async () => {
    if (!stripe || !cardRef.current) return;
    setError('');

    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardRef.current,
    });

    if (pmError) {
      setError(pmError.message);
    } else {
      // Pass only the PaymentMethod ID — never card numbers
      onPaymentMethodId?.(paymentMethod.id);
    }
  };

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
        Card details are entered in a secure, PCI-compliant Stripe iframe.
        Nexus AI Pro never sees or stores your card number.
      </p>
      <div style={s.stripeElementWrapper} aria-label="Card details (Stripe secure iframe)">
        <div ref={mountRef} id="stripe-card-element" />
        {!ready && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Loading secure card input…</span>}
      </div>
      {error && <p style={s.error} role="alert">{error}</p>}
      <button type="button" style={s.btnFull} onClick={handleConfirm} disabled={!ready}>
        Save Card
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CryptoPaymentPanel
// ---------------------------------------------------------------------------

function CryptoPaymentPanel({ currency, tierId, onSuccess }) {
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cryptoCurrencies = SUPPORTED_CURRENCIES.filter((c) => c.crypto);

  const initiateCryptoPayment = async () => {
    setLoading(true);
    setError('');
    try {
      // Server creates a Stripe PaymentIntent or crypto-specific charge
      const data = await paymentApiFetch('/crypto/initiate', {
        method: 'POST',
        body: JSON.stringify({ tierId, cryptoCurrency: selectedCrypto }),
      });
      setPaymentData(data);
    } catch (err) {
      setError(err.message || 'Failed to initiate crypto payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
        Crypto payments are processed via our payment processor. You will be
        given a wallet address and amount to send. Payments are confirmed
        after the required number of on-chain confirmations.
      </p>
      <div style={s.field}>
        <label style={s.label} htmlFor="crypto-select">Select cryptocurrency</label>
        <select
          id="crypto-select"
          value={selectedCrypto}
          onChange={(e) => setSelectedCrypto(e.target.value)}
          style={s.select}
        >
          {cryptoCurrencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.label}
            </option>
          ))}
        </select>
      </div>

      {paymentData ? (
        <div style={{ ...s.card, backgroundColor: 'rgba(124,58,237,0.08)', marginTop: '1rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Send Payment</h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Send exactly <strong>{paymentData.amount} {selectedCrypto}</strong> to:
          </p>
          <code style={{ display: 'block', wordBreak: 'break-all', backgroundColor: '#0f1117', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            {paymentData.address}
          </code>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Payment expires at: {new Date(paymentData.expiresAt).toLocaleString()}
          </p>
          {paymentData.qrCodeUrl && (
            <img src={paymentData.qrCodeUrl} alt="Payment QR code" style={{ maxWidth: '160px', marginTop: '0.75rem' }} />
          )}
        </div>
      ) : (
        <button
          type="button"
          style={s.btnFull}
          onClick={initiateCryptoPayment}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Generating address…' : `Pay with ${selectedCrypto}`}
        </button>
      )}

      {error && <p style={s.error} role="alert">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GiftCardPanel
// ---------------------------------------------------------------------------

function GiftCardPanel({ onSuccess }) {
  const { redeemGiftCard } = usePayment();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleRedeem = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Enter a gift card code.');
      return;
    }
    setLoading(true);
    try {
      const data = await redeemGiftCard(trimmedCode);
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message || 'Invalid or already redeemed gift card code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRedeem}>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
        Enter your gift card code to apply credit to your account or upgrade your
        subscription. Codes are case-insensitive and single-use.
      </p>
      <div style={s.field}>
        <label style={s.label} htmlFor="gift-code">Gift card code</label>
        <input
          id="gift-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={32}
          style={s.input}
          aria-required="true"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {error && <p style={s.error} role="alert">{error}</p>}
      {result && (
        <p style={s.success}>
          Gift card applied! Credit: {result.amountFormatted}. {result.message}
        </p>
      )}
      <button type="submit" style={s.btnFull} disabled={loading} aria-busy={loading}>
        {loading ? 'Redeeming…' : 'Redeem Gift Card'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// WalletPaymentPanel (Apple Pay / Google Pay via Stripe Payment Request Button)
// ---------------------------------------------------------------------------

function WalletPaymentPanel({ stripe, walletType, tierId, amount, currency, onSuccess }) {
  const mountRef = useRef(null);
  const [available, setAvailable] = useState(null); // null=checking, true, false
  const [error, setError] = useState('');

  useEffect(() => {
    if (!stripe || !mountRef.current) return;

    const paymentRequest = stripe.paymentRequest({
      country: 'US',
      currency: currency.toLowerCase(),
      total: {
        label: 'Nexus AI Pro Subscription',
        amount: amount * 100, // cents
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    paymentRequest.canMakePayment().then((result) => {
      const canUse =
        walletType === 'apple_pay' ? result?.applePay :
        walletType === 'google_pay' ? result?.googlePay :
        !!result;

      setAvailable(!!canUse);

      if (canUse) {
        const elements = stripe.elements();
        const prButton = elements.create('paymentRequestButton', {
          paymentRequest,
          style: {
            paymentRequestButton: {
              theme: 'dark',
              height: '48px',
            },
          },
        });
        prButton.mount(mountRef.current);
      }
    });

    paymentRequest.on('paymentmethod', async (ev) => {
      try {
        const { clientSecret } = await paymentApiFetch('/create-intent', {
          method: 'POST',
          body: JSON.stringify({ tierId, currency, paymentMethod: 'wallet' }),
        });

        const { error: confirmError } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete('fail');
          setError(confirmError.message);
        } else {
          ev.complete('success');
          onSuccess?.();
        }
      } catch (err) {
        ev.complete('fail');
        setError(err.message || 'Payment failed.');
      }
    });

    return () => {
      paymentRequest.off('paymentmethod');
    };
  }, [stripe, walletType, tierId, amount, currency, onSuccess]);

  if (available === false) {
    return (
      <p style={{ color: '#f97316', fontSize: '0.875rem' }}>
        {walletType === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} is not available on this
        device or browser. Please use a card or another payment method.
      </p>
    );
  }

  return (
    <div>
      {available === null && (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Checking {walletType === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} availability…
        </p>
      )}
      <div ref={mountRef} id="payment-request-button" />
      {error && <p style={s.error} role="alert">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheckoutFlow
// ---------------------------------------------------------------------------

function CheckoutFlow() {
  const { currency, createPaymentIntent } = usePayment();

  const [selectedTierId, setSelectedTierId] = useState('pro');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [address, setAddress] = useState({});
  const [stripe, setStripe] = useState(null);
  const [stripeError, setStripeError] = useState('');
  const [status, setStatus] = useState('idle');
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const selectedTier = SUBSCRIPTION_TIERS.find((t) => t.id === selectedTierId);
  const priceKey = `price${currency}`;
  const amount = selectedTier?.[priceKey] ?? 0;

  useEffect(() => {
    loadStripe()
      .then(setStripe)
      .catch((err) => setStripeError(err.message));
  }, []);

  const handleCardPaymentMethodId = useCallback((id) => {
    setPaymentMethodId(id);
  }, []);

  const submitPayment = async () => {
    if (!selectedTier || selectedTier.priceUSD === 0) {
      // Free tier — no payment needed
      setSuccessMsg('You\'re on the Free plan. No payment required.');
      return;
    }

    if (paymentMethod === 'card' && !paymentMethodId) {
      setError('Please complete the card details first.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const { clientSecret } = await createPaymentIntent({
        tierId: selectedTierId,
        currency: currency,
        paymentMethod,
      });

      if (paymentMethod === 'card' && stripe && clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethodId,
          receipt_email: address.email,
          shipping: {
            name: address.name,
            address: {
              line1: address.line1,
              city: address.city,
              state: address.state,
              postal_code: address.zip,
              country: address.country,
            },
          },
        });

        if (confirmError) {
          setError(confirmError.message);
          setStatus('error');
          return;
        }
      }

      setSuccessMsg(`You're now subscribed to ${selectedTier.name}. Thank you!`);
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div>
      {stripeError && (
        <div style={{ ...s.pciNote, backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>
          {stripeError}
        </div>
      )}

      <TierSelector
        selectedTierId={selectedTierId}
        onSelect={setSelectedTierId}
        currency={currency}
      />

      {selectedTier && selectedTier.priceUSD > 0 && (
        <>
          <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />

          <div style={s.card}>
            {paymentMethod === 'card' && stripe && (
              <CardPaymentPanel stripe={stripe} onPaymentMethodId={handleCardPaymentMethodId} />
            )}
            {paymentMethod === 'card' && !stripe && !stripeError && (
              <p style={{ color: '#64748b' }}>Loading Stripe…</p>
            )}
            {(paymentMethod === 'apple_pay' || paymentMethod === 'google_pay') && stripe && (
              <WalletPaymentPanel
                stripe={stripe}
                walletType={paymentMethod}
                tierId={selectedTierId}
                amount={amount}
                currency={currency}
                onSuccess={() => setSuccessMsg(`Subscribed to ${selectedTier.name}!`)}
              />
            )}
            {paymentMethod === 'crypto' && (
              <CryptoPaymentPanel
                currency={currency}
                tierId={selectedTierId}
                onSuccess={() => setSuccessMsg(`Subscribed to ${selectedTier.name}!`)}
              />
            )}
            {paymentMethod === 'gift_card' && (
              <GiftCardPanel onSuccess={() => setSuccessMsg('Gift card applied!')} />
            )}
          </div>

          <AddressForm address={address} onChange={setAddress} />

          <div style={s.pciNote}>
            🔒 Your payment is secured by Stripe, a PCI-DSS Level 1 certified payment
            processor. Nexus AI Pro never stores or logs card numbers, CVVs, or full
            PANs. SSL/TLS encryption is enforced for all connections.
          </div>

          {error && <p style={s.error} role="alert">{error}</p>}

          {['card'].includes(paymentMethod) && (
            <button
              type="button"
              style={{ ...s.btnFull, marginTop: '1rem' }}
              onClick={submitPayment}
              disabled={status === 'loading'}
              aria-busy={status === 'loading'}
            >
              {status === 'loading'
                ? 'Processing…'
                : `Subscribe to ${selectedTier?.name} — ${
                    SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? ''
                  }${amount}/mo`}
            </button>
          )}
        </>
      )}

      {selectedTier && selectedTier.priceUSD === 0 && (
        <button type="button" style={s.btnFull} onClick={submitPayment}>
          Continue with Free Plan
        </button>
      )}

      {successMsg && (
        <p style={{ ...s.success, textAlign: 'center', marginTop: '1rem', fontSize: '1rem' }}>
          {successMsg}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BillingHistory
// ---------------------------------------------------------------------------

function BillingHistory() {
  const { billingHistory, downloadInvoice } = usePayment();
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (invoiceId) => {
    setDownloading(invoiceId);
    try {
      await downloadInvoice(invoiceId);
    } catch (err) {
      // Non-blocking: user will see the button become available again
    } finally {
      setDownloading(null);
    }
  };

  if (billingHistory.length === 0) {
    return <p style={{ color: '#64748b' }}>No billing history found.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.table} aria-label="Billing history">
        <thead>
          <tr>
            <th style={s.th}>Date</th>
            <th style={s.th}>Description</th>
            <th style={s.th}>Amount</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>Invoice</th>
          </tr>
        </thead>
        <tbody>
          {billingHistory.map((inv) => (
            <tr key={inv.id}>
              <td style={s.td}>{new Date(inv.date).toLocaleDateString()}</td>
              <td style={s.td}>{inv.description}</td>
              <td style={s.td}>{inv.amountFormatted}</td>
              <td style={s.td}>
                <span
                  style={{
                    ...s.badge,
                    backgroundColor: inv.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: inv.status === 'paid' ? '#4ade80' : '#f87171',
                  }}
                >
                  {inv.status}
                </span>
              </td>
              <td style={s.td}>
                <button
                  type="button"
                  style={s.btnSecondary}
                  onClick={() => handleDownload(inv.id)}
                  disabled={downloading === inv.id}
                  aria-busy={downloading === inv.id}
                  aria-label={`Download invoice ${inv.id}`}
                >
                  {downloading === inv.id ? 'Downloading…' : 'PDF'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CurrentSubscription
// ---------------------------------------------------------------------------

function CurrentSubscriptionPanel() {
  const { currentSubscription } = usePayment();

  if (!currentSubscription) {
    return <p style={{ color: '#64748b' }}>No active subscription.</p>;
  }

  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === currentSubscription.tierId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Current plan</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent, #7c3aed)' }}>
            {tier?.name ?? currentSubscription.tierId}
          </p>
        </div>
        <div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Status</p>
          <p style={{ fontWeight: 600, color: '#4ade80' }}>{currentSubscription.status}</p>
        </div>
        <div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Next billing date</p>
          <p style={{ fontWeight: 600 }}>
            {currentSubscription.nextBillingDate
              ? new Date(currentSubscription.nextBillingDate).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaymentSystem — top-level export
// ---------------------------------------------------------------------------

/**
 * PaymentSystem — the main payment UI.
 * Wrap in <PaymentProvider> before use, or use the wrapped export below.
 *
 * @param {{ defaultTab?: string }} props
 */
export function PaymentSystem({ defaultTab = 'checkout' }) {
  const { currency, setCurrency, currentSubscription } = usePayment();
  const [tab, setTab] = useState(defaultTab);

  const tabs = [
    { id: 'checkout', label: 'Upgrade / Subscribe' },
    { id: 'subscription', label: 'My Subscription' },
    { id: 'billing', label: 'Billing History' },
  ];

  return (
    <main style={s.container} aria-label="Payment & Billing">
      <div style={s.inner}>
        <h1 style={s.heading}>Billing & Payments</h1>

        {/* Currency selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="currency-select" style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Currency:
          </label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ ...s.select, width: 'auto' }}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation tabs */}
        <nav style={s.nav} aria-label="Payment sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={s.navBtn(tab === t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab panels */}
        <div style={s.card}>
          {tab === 'checkout' && <CheckoutFlow />}
          {tab === 'subscription' && (
            <>
              <h2 style={s.subheading}>Current Subscription</h2>
              <CurrentSubscriptionPanel />
            </>
          )}
          {tab === 'billing' && (
            <>
              <h2 style={s.subheading}>Billing History</h2>
              <BillingHistory />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * PaymentSystemWithProvider — convenience wrapper that includes PaymentProvider.
 * Use this when mounting PaymentSystem at the page/route level.
 */
export function PaymentSystemWithProvider(props) {
  return (
    <PaymentProvider>
      <PaymentSystem {...props} />
    </PaymentProvider>
  );
}
