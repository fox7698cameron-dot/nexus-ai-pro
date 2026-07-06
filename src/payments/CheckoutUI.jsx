/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Nexus AI Pro — Checkout UI
 *
 * Subscription checkout with tier selection, billing cycle toggle,
 * multi-method payment form (card, Apple Pay, Google Pay, crypto, gift card),
 * order summary sidebar, and crypto payment modal.
 *
 * Props:
 *   theme        {string}   'light' | 'dark' — matches the app's active theme
 *   currentTier  {string}   'free' | 'pro' | 'enterprise'
 *   onSuccess    {Function} (tier, paymentMethod) → void
 *   onCancel     {Function} () → void
 */

import { useState, useCallback, useRef } from 'react';

// ============================================================
// Static Data
// ============================================================

const TIERS = {
  free: {
    id:           'free',
    name:         'Free',
    monthlyPrice: 0,
    color:        '#6b7280',
    features: [
      '5 AI messages per day',
      '1 active project',
      '100 MB storage',
      'Community support',
      'Basic AI models',
      'Web access only',
    ],
  },
  pro: {
    id:           'pro',
    name:         'Pro',
    monthlyPrice: 9.99,
    popular:      true,
    color:        '#6366f1',
    features: [
      'Unlimited AI messages',
      '10 active projects',
      '10 GB storage',
      'Priority email support',
      'Advanced AI models (GPT-4, Claude)',
      'API access',
      'Mobile & desktop apps',
    ],
  },
  enterprise: {
    id:           'enterprise',
    name:         'Enterprise',
    monthlyPrice: 14.99,
    color:        '#8b5cf6',
    features: [
      'Everything in Pro',
      'Unlimited projects',
      '1 TB storage',
      'Dedicated 24/7 support',
      'Custom model integrations',
      'Admin dashboard & analytics',
      'SSO / SAML',
      'Custom data retention',
    ],
  },
};

const PAYMENT_METHODS = [
  { id: 'card',       label: 'Card' },
  { id: 'apple_pay',  label: 'Apple Pay' },
  { id: 'google_pay', label: 'Google Pay' },
  { id: 'crypto',     label: 'Crypto' },
  { id: 'gift_card',  label: 'Gift Card' },
];

// ============================================================
// Inline SVG Icons
// ============================================================

const VisaIcon = () => (
  <svg viewBox="0 0 60 38" width="38" height="24" role="img" aria-label="Visa" style={{ display: 'block' }}>
    <rect width="60" height="38" rx="5" fill="#1A1F71" />
    <text x="30" y="25" textAnchor="middle" fill="#FFFFFF" fontSize="14"
          fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="2">
      VISA
    </text>
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 60 38" width="38" height="24" role="img" aria-label="Mastercard" style={{ display: 'block' }}>
    <rect width="60" height="38" rx="5" fill="#1a1a1a" />
    <circle cx="23" cy="19" r="11" fill="#EB001B" />
    <circle cx="37" cy="19" r="11" fill="#F79E1B" />
    {/* Overlap: lens shape centred at x=30 */}
    <path
      d="M30 10.2a11 11 0 0 1 0 17.6A11 11 0 0 1 30 10.2z"
      fill="#FF5F00"
    />
  </svg>
);

const AmexIcon = () => (
  <svg viewBox="0 0 60 38" width="38" height="24" role="img" aria-label="American Express" style={{ display: 'block' }}>
    <rect width="60" height="38" rx="5" fill="#007BC1" />
    <text x="30" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="9"
          fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="1.5">
      AMEX
    </text>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const BitcoinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#F7931A" aria-hidden="true">
    <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
  </svg>
);

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================
// Mock QR Code SVG (deterministic geometric pattern)
// ============================================================

const MockQRCode = ({ address }) => {
  // Build a fixed-pattern 21×21 QR-code-style grid from the address hash
  const seed = address.split('').reduce((acc, c) => acc ^ c.charCodeAt(0), 0);

  const SIZE = 21;
  const CELL = 8;
  const PAD  = 4;

  const deterministic = (r, c) => {
    // Position detection squares (corners)
    if ((r < 7 && c < 7) || (r < 7 && c >= SIZE - 7) || (r >= SIZE - 7 && c < 7)) {
      const lr = r < 7 ? r : r - (SIZE - 7);
      const lc = c < 7 ? c : c < 7 ? c : c - (SIZE - 7);
      // outer ring
      if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
      // inner square
      if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
      return false;
    }
    // Timing patterns
    if (r === 6 || c === 6) return (r + c) % 2 === 0;
    // Data modules — pseudo-random but stable
    const h = ((r * 31 + c * 17 + seed) * 2654435761) >>> 0;
    return (h & 1) === 1;
  };

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (deterministic(r, c)) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={PAD + c * CELL}
            y={PAD + r * CELL}
            width={CELL}
            height={CELL}
            fill="#111827"
          />
        );
      }
    }
  }

  const totalSize = SIZE * CELL + PAD * 2;
  return (
    <svg
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={totalSize}
      height={totalSize}
      style={{ borderRadius: 8, background: '#ffffff', display: 'block' }}
      role="img"
      aria-label="Crypto payment QR code"
    >
      <rect width={totalSize} height={totalSize} fill="#ffffff" />
      {cells}
    </svg>
  );
};

// ============================================================
// Helpers
// ============================================================

function formatCardNumber(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function tierPrice(tier, cycle) {
  const base = TIERS[tier].monthlyPrice;
  if (base === 0) return 0;
  return cycle === 'annual' ? +(base * 0.8).toFixed(2) : base;
}

function tierAnnualTotal(tier) {
  return +(tierPrice(tier, 'annual') * 12).toFixed(2);
}

// ============================================================
// CSS (injected as a <style> tag for responsive media queries)
// ============================================================

const STYLES = `
  .cho-root * { box-sizing: border-box; }
  .cho-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .cho-layout {
    display: flex;
    gap: 28px;
    align-items: flex-start;
  }

  .cho-main { flex: 1; min-width: 0; }
  .cho-sidebar { width: 300px; flex-shrink: 0; }

  .cho-tier-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .cho-method-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  @media (max-width: 900px) {
    .cho-layout { flex-direction: column; }
    .cho-sidebar { width: 100%; }
    .cho-tier-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 600px) {
    .cho-method-tabs { gap: 6px; }
    .cho-method-tabs button { font-size: 12px; padding: 7px 10px; }
  }

  @media (min-width: 601px) and (max-width: 900px) {
    .cho-tier-grid { grid-template-columns: repeat(3, 1fr); }
  }

  .cho-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .cho-input.cho-input-error { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important; }

  .cho-btn-primary {
    transition: opacity 0.15s, transform 0.1s;
  }
  .cho-btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .cho-btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .cho-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

  .cho-tier-card {
    transition: box-shadow 0.2s, transform 0.15s;
    cursor: pointer;
  }
  .cho-tier-card:hover { transform: translateY(-2px); }

  .cho-method-tab {
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .cho-crypto-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  @keyframes cho-modal-in {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to   { opacity: 1; transform: scale(1)   translateY(0); }
  }
  .cho-modal-box { animation: cho-modal-in 0.2s ease-out; }

  @keyframes cho-spin {
    to { transform: rotate(360deg); }
  }
  .cho-spinner {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: cho-spin 0.6s linear infinite;
    display: inline-block;
    vertical-align: middle;
    margin-right: 8px;
  }

  .cho-success-checkmark {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: #22c55e;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
`;

// ============================================================
// CheckoutUI Component
// ============================================================

export default function CheckoutUI({
  theme       = 'light',
  currentTier = 'free',
  onSuccess,
  onCancel,
}) {
  const isDark = theme === 'dark';

  // ── Tier & billing ──────────────────────────────────────────
  const [selectedTier, setSelectedTier]   = useState(
    currentTier !== 'free' ? currentTier : 'pro'
  );
  const [billingCycle, setBillingCycle]   = useState('monthly');

  // ── Payment method ──────────────────────────────────────────
  const [payMethod, setPayMethod]         = useState('card');

  // ── Card fields ─────────────────────────────────────────────
  const [cardNumber, setCardNumber]       = useState('');
  const [cardExpiry, setCardExpiry]       = useState('');
  const [cardCvv,    setCardCvv]          = useState('');
  const [cardName,   setCardName]         = useState('');
  const [addrLine1,  setAddrLine1]        = useState('');
  const [addrCity,   setAddrCity]         = useState('');
  const [addrState,  setAddrState]        = useState('');
  const [addrZip,    setAddrZip]          = useState('');
  const [addrCountry,setAddrCountry]      = useState('US');

  // ── Gift / promo ─────────────────────────────────────────────
  const [giftCode,      setGiftCode]      = useState('');
  const [giftMsg,       setGiftMsg]       = useState(null); // { success, text }
  const [promoCode,     setPromoCode]     = useState('');
  const [promoApplied,  setPromoApplied]  = useState(false);

  // ── UI state ─────────────────────────────────────────────────
  const [showCrypto, setShowCrypto]       = useState(false);
  const [cryptoCopied, setCryptoCopied]   = useState(false);
  const [fieldErrors,  setFieldErrors]    = useState({});
  const [loading,      setLoading]        = useState(false);
  const [apiError,     setApiError]       = useState('');
  const [submitted,    setSubmitted]      = useState(false);

  const cryptoAddress = '0x742d35Cc6634C0532925a3b8D4C9E3Ea7f3a1b2f';
  const abortRef = useRef(null);

  // ── Derived ──────────────────────────────────────────────────
  const tier    = TIERS[selectedTier];
  const price   = tierPrice(selectedTier, billingCycle);
  const annualTotal = tierAnnualTotal(selectedTier);
  const isFree  = price === 0;

  const displayPrice = isFree
    ? 'Free'
    : billingCycle === 'annual'
      ? `$${price}/mo`
      : `$${price.toFixed(2)}/mo`;

  // ── Colours (theme-aware) ────────────────────────────────────
  const C = {
    bg:         isDark ? '#0f172a' : '#f8fafc',
    surface:    isDark ? '#1e293b' : '#ffffff',
    surfaceAlt: isDark ? '#273245' : '#f1f5f9',
    border:     isDark ? '#334155' : '#e2e8f0',
    borderFocus:'#6366f1',
    text:       isDark ? '#f1f5f9' : '#1e293b',
    textMuted:  isDark ? '#94a3b8' : '#64748b',
    textFaint:  isDark ? '#64748b' : '#94a3b8',
    accent:     '#6366f1',
    accentHover:'#4f46e5',
    success:    '#22c55e',
    error:      '#ef4444',
    warning:    '#f59e0b',
  };

  // ── Input base style ─────────────────────────────────────────
  const inputStyle = (name) => ({
    width:        '100%',
    padding:      '10px 12px',
    borderRadius: 8,
    border:       `1.5px solid ${fieldErrors[name] ? C.error : C.border}`,
    background:   isDark ? '#0f172a' : '#ffffff',
    color:        C.text,
    fontSize:     14,
    lineHeight:   '1.4',
    boxShadow:    fieldErrors[name]
      ? `0 0 0 3px rgba(239,68,68,0.15)`
      : 'none',
  });

  const labelStyle = {
    display:      'block',
    fontSize:     12,
    fontWeight:   600,
    color:        C.textMuted,
    marginBottom: 5,
    letterSpacing:'0.04em',
    textTransform:'uppercase',
  };

  // ── Validation ───────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (payMethod === 'card') {
      const digits = cardNumber.replace(/\s/g, '');
      if (digits.length < 15 || digits.length > 16) errs.cardNumber = 'Enter a valid card number.';
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry))        errs.cardExpiry = 'Enter MM/YY format.';
      if (cardCvv.length < 3)                         errs.cardCvv    = 'CVV must be 3–4 digits.';
      if (!cardName.trim())                           errs.cardName   = 'Name is required.';
      if (!addrLine1.trim())                          errs.addrLine1  = 'Address is required.';
      if (!addrCity.trim())                           errs.addrCity   = 'City is required.';
      if (!addrZip.trim())                            errs.addrZip    = 'Postal code is required.';
    }
    return errs;
  }

  // ── Handlers ─────────────────────────────────────────────────

  const handleGiftApply = useCallback(() => {
    if (!giftCode.trim()) return;
    // Client-side optimistic check; real validation happens server-side on submit
    const upper = giftCode.toUpperCase().trim();
    if (upper.startsWith('NEXUS-PRO-') || upper.startsWith('NEXUS-ENTERPRISE-')) {
      setGiftMsg({ success: true, text: 'Gift code accepted. Upgrade will be applied on checkout.' });
    } else {
      setGiftMsg({ success: false, text: 'Unrecognised gift code format.' });
    }
  }, [giftCode]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(cryptoAddress).then(() => {
      setCryptoCopied(true);
      setTimeout(() => setCryptoCopied(false), 2000);
    });
  }, [cryptoAddress]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setApiError('');

    if (payMethod === 'crypto') {
      setShowCrypto(true);
      return;
    }

    if (payMethod === 'apple_pay' || payMethod === 'google_pay') {
      // In production, these would trigger the Payment Request API.
      // Here we proceed as a simulated confirmation.
    }

    if (payMethod === 'gift_card') {
      if (!giftCode.trim()) {
        setApiError('Enter a gift code before redeeming.');
        return;
      }
    }

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    const controller   = new AbortController();
    abortRef.current   = controller;

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const res = await fetch('/api/payments/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tier:       selectedTier,
          successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl:  `${origin}/checkout/cancel`,
          paymentMethod: payMethod,
          giftCode:   giftCode.trim() || undefined,
          promoCode:  promoApplied ? promoCode.trim() : undefined,
          billingCycle,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      // Redirect to Stripe-hosted checkout
      if (data.url) {
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        }
        return;
      }

      // Non-redirect success (e.g. gift code redemption)
      setSubmitted(true);
      onSuccess?.(selectedTier, payMethod);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setApiError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [
    payMethod, selectedTier, billingCycle, giftCode, promoCode, promoApplied,
    cardNumber, cardExpiry, cardCvv, cardName, addrLine1, addrCity, addrState, addrZip, addrCountry,
    onSuccess,
  ]);

  // ── Success screen ────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="cho-root" style={{
          background: C.bg, minHeight: '100vh', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: C.surface, borderRadius: 16, padding: '48px 40px',
            textAlign: 'center', maxWidth: 420, width: '100%',
            boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.08)',
            border: `1px solid ${C.border}`,
          }}>
            <div className="cho-success-checkmark">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                   stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ color: C.text, margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
              You're all set!
            </h2>
            <p style={{ color: C.textMuted, margin: '0 0 24px', fontSize: 15 }}>
              Your <strong style={{ color: C.text }}>{tier.name}</strong> plan is now active.
            </p>
            <button
              onClick={() => onSuccess?.(selectedTier, payMethod)}
              style={{
                background: C.accent, color: '#fff', border: 'none',
                borderRadius: 8, padding: '12px 28px', fontSize: 15,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>

      {/* Crypto modal */}
      {showCrypto && (
        <div className="cho-crypto-modal-overlay" onClick={() => setShowCrypto(false)}>
          <div
            className="cho-modal-box"
            style={{
              background: C.surface, borderRadius: 16, padding: 32,
              maxWidth: 440, width: '100%', position: 'relative',
              border: `1px solid ${C.border}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCrypto(false)}
              aria-label="Close"
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textMuted, padding: 4, borderRadius: 6,
              }}
            >
              <XIcon />
            </button>

            <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
              Pay with Crypto
            </h3>
            <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 20px' }}>
              Send the exact amount to the address below. Payment is confirmed automatically
              via Stripe's fiat-crypto link after network confirmation.
            </p>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <MockQRCode address={cryptoAddress} />
            </div>

            <div style={{
              background: C.surfaceAlt, borderRadius: 8, padding: '10px 14px',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>
                Wallet Address (USDC / ETH)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <code style={{
                  flex: 1, fontSize: 12, color: C.text,
                  wordBreak: 'break-all', fontFamily: 'monospace',
                }}>
                  {cryptoAddress}
                </code>
                <button
                  onClick={handleCopyAddress}
                  style={{
                    flexShrink: 0, background: cryptoCopied ? C.success : C.accent,
                    color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                  }}
                >
                  {cryptoCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20,
            }}>
              {[
                ['Amount Due', `$${price.toFixed(2)} USD`],
                ['Network',    'Ethereum / Polygon'],
                ['Token',      'USDC or ETH'],
                ['Confirmations', '12 required'],
              ].map(([label, val]) => (
                <div key={label} style={{
                  background: C.surfaceAlt, borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: C.textFaint, margin: 0, textAlign: 'center' }}>
              Do not close this window. Your access will be provisioned automatically
              once the transaction is confirmed on-chain.
            </p>
          </div>
        </div>
      )}

      {/* Page container */}
      <div className="cho-root" style={{ background: C.bg, minHeight: '100vh', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ color: C.text, margin: '0 0 4px', fontSize: 26, fontWeight: 700 }}>
                Upgrade your plan
              </h1>
              <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>
                Unlock full access to Nexus AI Pro — cancel any time.
              </p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                style={{
                  background: 'none', border: `1px solid ${C.border}`,
                  color: C.textMuted, borderRadius: 8, padding: '8px 16px',
                  fontSize: 13, cursor: 'pointer', fontWeight: 500,
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Billing cycle toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: C.textMuted }}>Billing:</span>
            <div style={{
              display: 'inline-flex', background: C.surfaceAlt,
              borderRadius: 8, padding: 3, gap: 2,
              border: `1px solid ${C.border}`,
            }}>
              {['monthly', 'annual'].map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  style={{
                    background:   billingCycle === cycle ? C.accent : 'transparent',
                    color:        billingCycle === cycle ? '#fff' : C.textMuted,
                    border:       'none',
                    borderRadius: 6,
                    padding:      '6px 14px',
                    fontSize:     13,
                    fontWeight:   600,
                    cursor:       'pointer',
                    transition:   'background 0.15s, color 0.15s',
                  }}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                </button>
              ))}
            </div>
            {billingCycle === 'annual' && (
              <span style={{
                background: '#dcfce7', color: '#16a34a',
                fontSize: 12, fontWeight: 700, padding: '3px 8px',
                borderRadius: 20, letterSpacing: '0.03em',
              }}>
                Save 20%
              </span>
            )}
          </div>

          <div className="cho-layout">
            {/* ── Left: tier cards + payment form ── */}
            <div className="cho-main">

              {/* Tier cards */}
              <div className="cho-tier-grid">
                {Object.values(TIERS).map((t) => {
                  const isSelected = selectedTier === t.id;
                  const tPrice     = tierPrice(t.id, billingCycle);

                  return (
                    <div
                      key={t.id}
                      className="cho-tier-card"
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => { setSelectedTier(t.id); if (t.id === 'free') return; }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedTier(t.id); }}
                      style={{
                        background:   C.surface,
                        borderRadius: 12,
                        padding:      '20px 18px',
                        border:       isSelected
                          ? `2px solid ${t.color}`
                          : `1.5px solid ${C.border}`,
                        boxShadow: isSelected
                          ? `0 0 0 3px ${t.color}22, 0 4px 16px rgba(0,0,0,${isDark ? 0.3 : 0.07})`
                          : `0 2px 8px rgba(0,0,0,${isDark ? 0.2 : 0.04})`,
                        position: 'relative',
                        outline: 'none',
                      }}
                    >
                      {t.popular && (
                        <div style={{
                          position:   'absolute', top: -11, left: '50%',
                          transform:  'translateX(-50%)',
                          background: t.color, color: '#fff',
                          fontSize: 10, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 20,
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}>
                          Most Popular
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.name}</span>
                        {isSelected && (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: t.color, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                                 stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
                          {tPrice === 0 ? 'Free' : `$${tPrice.toFixed(2)}`}
                        </span>
                        {tPrice > 0 && (
                          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 3 }}>
                            /mo
                          </span>
                        )}
                        {billingCycle === 'annual' && tPrice > 0 && (
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                            ${tierAnnualTotal(t.id)}/yr billed annually
                          </div>
                        )}
                      </div>

                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {t.features.map((f) => (
                          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: C.textMuted }}>
                            <span style={{
                              flexShrink: 0, marginTop: 1,
                              color: isSelected ? t.color : C.textFaint,
                            }}>
                              <CheckIcon />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Payment section — hidden for free tier */}
              {!isFree && (
                <div style={{
                  background: C.surface, borderRadius: 12, padding: '24px 22px',
                  border: `1.5px solid ${C.border}`,
                  boxShadow: `0 2px 10px rgba(0,0,0,${isDark ? 0.2 : 0.05})`,
                }}>
                  <h2 style={{ color: C.text, margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                    Payment Method
                  </h2>

                  {/* Method tabs */}
                  <div className="cho-method-tabs" role="tablist" aria-label="Payment methods">
                    {PAYMENT_METHODS.map((m) => {
                      const active = payMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          role="tab"
                          aria-selected={active}
                          className="cho-method-tab"
                          onClick={() => { setPayMethod(m.id); setFieldErrors({}); setApiError(''); }}
                          style={{
                            display:    'flex',
                            alignItems: 'center',
                            gap:        6,
                            padding:    '8px 14px',
                            borderRadius: 8,
                            border:     `1.5px solid ${active ? C.accent : C.border}`,
                            background: active ? (isDark ? '#3730a320' : '#eef2ff') : C.surface,
                            color:      active ? C.accent : C.textMuted,
                            fontSize:   13,
                            fontWeight: active ? 700 : 500,
                            cursor:     'pointer',
                          }}
                        >
                          {m.id === 'card'       && <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
                          {m.id === 'apple_pay'  && <AppleIcon />}
                          {m.id === 'google_pay' && <GoogleIcon />}
                          {m.id === 'crypto'     && <BitcoinIcon />}
                          {m.id === 'gift_card'  && <GiftIcon />}
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Card form ── */}
                  {payMethod === 'card' && (
                    <div role="tabpanel">
                      {/* Accepted card logos */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <span style={{ fontSize: 11, color: C.textFaint, marginRight: 4 }}>Accepted:</span>
                        <VisaIcon />
                        <MastercardIcon />
                        <AmexIcon />
                        {['Discover', 'Diners', 'UnionPay'].map((brand) => (
                          <span key={brand} style={{
                            padding: '2px 7px', border: `1px solid ${C.border}`,
                            borderRadius: 4, fontSize: 10, color: C.textMuted,
                            background: C.surfaceAlt, fontWeight: 600,
                          }}>
                            {brand}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Card number */}
                        <div>
                          <label style={labelStyle} htmlFor="cho-card-number">Card Number</label>
                          <input
                            id="cho-card-number"
                            className="cho-input"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            maxLength={19}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            style={inputStyle('cardNumber')}
                          />
                          {fieldErrors.cardNumber && (
                            <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.cardNumber}</p>
                          )}
                        </div>

                        {/* Expiry + CVV */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={labelStyle} htmlFor="cho-expiry">Expiry</label>
                            <input
                              id="cho-expiry"
                              className="cho-input"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              maxLength={5}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              style={inputStyle('cardExpiry')}
                            />
                            {fieldErrors.cardExpiry && (
                              <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.cardExpiry}</p>
                            )}
                          </div>
                          <div>
                            <label style={labelStyle} htmlFor="cho-cvv">CVV</label>
                            <input
                              id="cho-cvv"
                              className="cho-input"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              placeholder="123"
                              value={cardCvv}
                              maxLength={4}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              style={inputStyle('cardCvv')}
                            />
                            {fieldErrors.cardCvv && (
                              <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.cardCvv}</p>
                            )}
                          </div>
                        </div>

                        {/* Name on card */}
                        <div>
                          <label style={labelStyle} htmlFor="cho-card-name">Name on Card</label>
                          <input
                            id="cho-card-name"
                            className="cho-input"
                            type="text"
                            autoComplete="cc-name"
                            placeholder="Jane Smith"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            style={inputStyle('cardName')}
                          />
                          {fieldErrors.cardName && (
                            <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.cardName}</p>
                          )}
                        </div>

                        {/* Billing address */}
                        <div style={{
                          borderTop: `1px solid ${C.border}`,
                          paddingTop: 14,
                        }}>
                          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: C.textMuted }}>
                            Billing Address
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                              <label style={labelStyle} htmlFor="cho-addr-line1">Street Address</label>
                              <input
                                id="cho-addr-line1"
                                className="cho-input"
                                type="text"
                                autoComplete="street-address"
                                placeholder="123 Main St"
                                value={addrLine1}
                                onChange={(e) => setAddrLine1(e.target.value)}
                                style={inputStyle('addrLine1')}
                              />
                              {fieldErrors.addrLine1 && (
                                <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.addrLine1}</p>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                              <div>
                                <label style={labelStyle} htmlFor="cho-city">City</label>
                                <input
                                  id="cho-city"
                                  className="cho-input"
                                  type="text"
                                  autoComplete="address-level2"
                                  placeholder="New York"
                                  value={addrCity}
                                  onChange={(e) => setAddrCity(e.target.value)}
                                  style={inputStyle('addrCity')}
                                />
                                {fieldErrors.addrCity && (
                                  <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.addrCity}</p>
                                )}
                              </div>
                              <div>
                                <label style={labelStyle} htmlFor="cho-state">State</label>
                                <input
                                  id="cho-state"
                                  className="cho-input"
                                  type="text"
                                  autoComplete="address-level1"
                                  placeholder="NY"
                                  value={addrState}
                                  maxLength={10}
                                  onChange={(e) => setAddrState(e.target.value)}
                                  style={inputStyle('addrState')}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              <div>
                                <label style={labelStyle} htmlFor="cho-zip">Postal Code</label>
                                <input
                                  id="cho-zip"
                                  className="cho-input"
                                  type="text"
                                  autoComplete="postal-code"
                                  placeholder="10001"
                                  value={addrZip}
                                  maxLength={12}
                                  onChange={(e) => setAddrZip(e.target.value)}
                                  style={inputStyle('addrZip')}
                                />
                                {fieldErrors.addrZip && (
                                  <p style={{ color: C.error, fontSize: 11, margin: '4px 0 0' }}>{fieldErrors.addrZip}</p>
                                )}
                              </div>
                              <div>
                                <label style={labelStyle} htmlFor="cho-country">Country</label>
                                <select
                                  id="cho-country"
                                  className="cho-input"
                                  value={addrCountry}
                                  onChange={(e) => setAddrCountry(e.target.value)}
                                  style={{ ...inputStyle('addrCountry'), appearance: 'none' }}
                                >
                                  {[
                                    ['US', 'United States'],
                                    ['GB', 'United Kingdom'],
                                    ['CA', 'Canada'],
                                    ['AU', 'Australia'],
                                    ['DE', 'Germany'],
                                    ['FR', 'France'],
                                    ['JP', 'Japan'],
                                    ['SG', 'Singapore'],
                                  ].map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Apple Pay ── */}
                  {payMethod === 'apple_pay' && (
                    <div role="tabpanel" style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
                        Click the button below to complete payment using Apple Pay.
                        Your Touch ID or Face ID will be used to confirm.
                      </p>
                      <button
                        style={{
                          background: isDark ? '#ffffff' : '#000000',
                          color:      isDark ? '#000000' : '#ffffff',
                          border:     'none', borderRadius: 8, padding: '14px 40px',
                          fontSize: 15, fontWeight: 600, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <AppleIcon />
                        Pay with Apple Pay
                      </button>
                      <p style={{ color: C.textFaint, fontSize: 11, marginTop: 12 }}>
                        Apple Pay is processed securely through Stripe.
                        No card details are shared with Nexus AI Pro.
                      </p>
                    </div>
                  )}

                  {/* ── Google Pay ── */}
                  {payMethod === 'google_pay' && (
                    <div role="tabpanel" style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
                        Click the button below to complete payment using Google Pay.
                      </p>
                      <button
                        style={{
                          background: '#ffffff', border: '1.5px solid #dadce0',
                          borderRadius: 8, padding: '12px 32px',
                          fontSize: 15, fontWeight: 600, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 10,
                          color: '#3c4043', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        <GoogleIcon />
                        G Pay
                      </button>
                      <p style={{ color: C.textFaint, fontSize: 11, marginTop: 12 }}>
                        Google Pay is processed securely through Stripe.
                      </p>
                    </div>
                  )}

                  {/* ── Crypto ── */}
                  {payMethod === 'crypto' && (
                    <div role="tabpanel" style={{ padding: '12px 0' }}>
                      <div style={{
                        background: isDark ? '#1a1000' : '#fffbeb',
                        border: `1px solid ${isDark ? '#78350f40' : '#fde68a'}`,
                        borderRadius: 8, padding: '12px 14px', marginBottom: 18,
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                      }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                        <p style={{ margin: 0, fontSize: 12, color: isDark ? '#fde68a' : '#92400e', lineHeight: 1.5 }}>
                          Crypto payments go through Stripe's fiat-to-crypto ramp.
                          You pay in USD via a crypto gateway — your funds are converted on-chain.
                          Requires an Ethereum or Polygon wallet.
                        </p>
                      </div>

                      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
                        Clicking "Continue to Crypto Payment" will show you a wallet address and QR code.
                        Your plan is activated after on-chain confirmation.
                      </p>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {['USDC', 'ETH', 'USDT', 'DAI'].map((tok) => (
                          <span key={tok} style={{
                            padding: '4px 10px', borderRadius: 6,
                            background: C.surfaceAlt,
                            border: `1px solid ${C.border}`,
                            fontSize: 12, color: C.textMuted, fontWeight: 600,
                          }}>
                            {tok}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Gift card ── */}
                  {payMethod === 'gift_card' && (
                    <div role="tabpanel" style={{ padding: '12px 0' }}>
                      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
                        Enter your gift code to redeem a free subscription period.
                        Codes are in the format NEXUS-PRO-XXXXXXXX.
                      </p>

                      <label style={labelStyle} htmlFor="cho-gift-code">Gift Code</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          id="cho-gift-code"
                          className="cho-input"
                          type="text"
                          placeholder="NEXUS-PRO-3F9A1B2C"
                          value={giftCode}
                          onChange={(e) => { setGiftCode(e.target.value.toUpperCase()); setGiftMsg(null); }}
                          style={{ ...inputStyle('giftCode'), flex: 1, fontFamily: 'monospace' }}
                        />
                        <button
                          type="button"
                          onClick={handleGiftApply}
                          style={{
                            background: C.accent, color: '#fff', border: 'none',
                            borderRadius: 8, padding: '0 18px',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Apply
                        </button>
                      </div>

                      {giftMsg && (
                        <p style={{
                          marginTop: 8, fontSize: 12,
                          color: giftMsg.success ? C.success : C.error,
                          fontWeight: 500,
                        }}>
                          {giftMsg.success ? '✓ ' : '✗ '}{giftMsg.text}
                        </p>
                      )}

                      <p style={{ color: C.textFaint, fontSize: 11, marginTop: 14 }}>
                        Gift codes are single-use and non-transferable. The subscription period
                        begins immediately upon redemption.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: order summary sidebar ── */}
            <div className="cho-sidebar">
              <div style={{
                background: C.surface, borderRadius: 12, padding: '22px 20px',
                border: `1.5px solid ${C.border}`,
                boxShadow: `0 2px 10px rgba(0,0,0,${isDark ? 0.2 : 0.05})`,
                position: 'sticky', top: 24,
              }}>
                <h2 style={{ color: C.text, margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                  Order Summary
                </h2>

                {/* Selected plan */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: C.surfaceAlt, borderRadius: 8, padding: '12px 14px',
                  marginBottom: 14,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{tier.name} Plan</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      {billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                      {isFree ? 'Free' : `$${price.toFixed(2)}`}
                    </div>
                    {!isFree && (
                      <div style={{ fontSize: 11, color: C.textMuted }}>/mo</div>
                    )}
                  </div>
                </div>

                {/* Annual savings callout */}
                {billingCycle === 'annual' && !isFree && (
                  <div style={{
                    background: isDark ? '#052e16' : '#f0fdf4',
                    border: `1px solid ${isDark ? '#166534' : '#bbf7d0'}`,
                    borderRadius: 8, padding: '9px 12px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 14 }}>🎉</span>
                    <p style={{ margin: 0, fontSize: 12, color: isDark ? '#86efac' : '#15803d', fontWeight: 500 }}>
                      You save <strong>${(tierPrice(selectedTier, 'monthly') * 12 - annualTotal).toFixed(2)}</strong> vs. monthly billing.
                    </p>
                  </div>
                )}

                {/* Promo code */}
                {!isFree && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle} htmlFor="cho-promo">Promo Code</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        id="cho-promo"
                        className="cho-input"
                        type="text"
                        placeholder="SAVE10"
                        value={promoCode}
                        disabled={promoApplied}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        style={{
                          ...inputStyle('promoCode'),
                          flex: 1,
                          opacity: promoApplied ? 0.7 : 1,
                        }}
                      />
                      <button
                        type="button"
                        disabled={promoApplied || !promoCode.trim()}
                        onClick={() => setPromoApplied(true)}
                        style={{
                          background: promoApplied ? C.success : C.surfaceAlt,
                          color:      promoApplied ? '#fff' : C.textMuted,
                          border:     `1.5px solid ${promoApplied ? C.success : C.border}`,
                          borderRadius: 7, padding: '0 12px',
                          fontSize: 12, fontWeight: 600, cursor: promoApplied ? 'default' : 'pointer',
                          flexShrink: 0, transition: 'background 0.2s',
                        }}
                      >
                        {promoApplied ? '✓' : 'Apply'}
                      </button>
                    </div>
                    {promoApplied && (
                      <p style={{ color: C.success, fontSize: 11, margin: '4px 0 0', fontWeight: 500 }}>
                        Promo code applied. Discount reflected at checkout.
                      </p>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: `1px solid ${C.border}`, margin: '14px 0' }} />

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Total</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
                      {isFree ? '$0.00' : billingCycle === 'annual'
                        ? `$${annualTotal.toFixed(2)}/yr`
                        : `$${price.toFixed(2)}/mo`}
                    </div>
                    {billingCycle === 'annual' && !isFree && (
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        (${price.toFixed(2)}/mo × 12)
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA button */}
                <form onSubmit={handleSubmit}>
                  {apiError && (
                    <div style={{
                      background: isDark ? '#1a0000' : '#fef2f2',
                      border: `1px solid ${isDark ? '#7f1d1d50' : '#fecaca'}`,
                      borderRadius: 8, padding: '10px 12px', marginBottom: 12,
                    }}>
                      <p style={{ margin: 0, fontSize: 12, color: C.error, fontWeight: 500 }}>
                        {apiError}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="cho-btn-primary"
                    disabled={loading}
                    style={{
                      width:        '100%',
                      background:   isFree
                        ? C.surfaceAlt
                        : `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
                      color:        isFree ? C.textMuted : '#ffffff',
                      border:       'none',
                      borderRadius: 9,
                      padding:      '13px 20px',
                      fontSize:     15,
                      fontWeight:   700,
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      gap:          8,
                    }}
                  >
                    {loading && <span className="cho-spinner" />}
                    {loading
                      ? 'Processing…'
                      : isFree
                        ? 'Continue with Free Plan'
                        : payMethod === 'crypto'
                          ? 'Continue to Crypto Payment'
                          : payMethod === 'gift_card'
                            ? 'Redeem Gift Code'
                            : `Subscribe to ${tier.name}`
                    }
                    {!loading && !isFree && <ChevronRightIcon />}
                  </button>
                </form>

                {/* Security badge */}
                <div style={{
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap:         6,
                  marginTop:  14,
                  padding:    '8px 0',
                  borderTop:  `1px solid ${C.border}`,
                }}>
                  <span style={{ color: C.textFaint }}>
                    <LockIcon />
                  </span>
                  <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>
                    256-bit SSL encrypted · Powered by Stripe
                  </span>
                </div>

                {/* Accepted payment logos strip */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, marginTop: 10, flexWrap: 'wrap',
                }}>
                  <VisaIcon />
                  <MastercardIcon />
                  <AmexIcon />
                  <AppleIcon />
                  <GoogleIcon />
                </div>

                {/* Fine print */}
                <p style={{ fontSize: 10, color: C.textFaint, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
                  By subscribing you agree to our{' '}
                  <a href="/terms" style={{ color: C.accent, textDecoration: 'none' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" style={{ color: C.accent, textDecoration: 'none' }}>Privacy Policy</a>.
                  {' '}Subscriptions auto-renew. Cancel any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
