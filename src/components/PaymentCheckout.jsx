// src/components/PaymentCheckout.jsx — Updated: 2026-07-25

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CreditCard, Check, X, ChevronRight, ChevronLeft, ChevronDown,
  Shield, Lock, ShieldCheck, AlertTriangle, AlertCircle,
  Loader2, Download, Clock, Calendar, Star, Zap, Crown,
  User, Mail, MapPin, Globe, Building,
  RefreshCw, Copy, ExternalLink, CheckCircle2,
  History, Trash2, Tag, Percent, Wallet, Smartphone,
  Coins, QrCode, Gift, Package, CircleDollarSign, ArrowUpDown
} from 'lucide-react';

// ─────────────────────────────────────────────
// PLANS & CONSTANTS
// ─────────────────────────────────────────────
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    icon: Package,
    color: 'var(--pc-gray)',
    badge: null,
    trialDays: null,
    features: [
      '5 AI conversations/day',
      'Basic models only',
      '1 MB file uploads',
      'Community support',
      'Standard response speed'
    ],
    notIncluded: [
      'Advanced AI models',
      'Unlimited conversations',
      'Priority support',
      'API access'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    icon: Star,
    color: 'var(--pc-blue)',
    badge: 'Most Popular',
    trialDays: 7,
    features: [
      'Unlimited AI conversations',
      'All 40+ AI models',
      '100 MB file uploads',
      'Priority support (24h response)',
      'Faster response speed',
      'Export conversation history',
      'Custom AI personas'
    ],
    notIncluded: [
      'Custom model fine-tuning',
      'Dedicated account manager',
      'SLA guarantee'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 14.99,
    icon: Crown,
    color: 'var(--pc-purple)',
    badge: 'Best Value',
    trialDays: 14,
    features: [
      'Everything in Pro',
      'Custom model fine-tuning',
      'Full API access with high rate limits',
      'Dedicated account manager',
      '99.9% SLA guarantee',
      'Advanced analytics dashboard',
      'Team collaboration tools',
      'White-label options',
      'SSO / SAML support'
    ],
    notIncluded: []
  }
};

const CRYPTO_CURRENCIES = [
  { id: 'BTC',  name: 'Bitcoin',   symbol: '₿', color: '#f7931a' },
  { id: 'ETH',  name: 'Ethereum',  symbol: 'Ξ', color: '#627eea' },
  { id: 'USDC', name: 'USD Coin',  symbol: '$', color: '#2775ca' },
  { id: 'USDT', name: 'Tether',    symbol: '₮', color: '#26a17b' },
  { id: 'LTC',  name: 'Litecoin',  symbol: 'Ł', color: '#bfbbbb' },
  { id: 'SOL',  name: 'Solana',    symbol: '◎', color: '#9945ff' }
];

const CARD_DECLINE_ERRORS = {
  card_declined:        'Your card was declined. Please use a different payment method.',
  insufficient_funds:   'Insufficient funds on this card. Please use a different card.',
  incorrect_cvc:        'The security code (CVC) you entered is incorrect.',
  expired_card:         'This card has expired. Please use a different card.',
  incorrect_number:     'The card number entered is invalid.',
  processing_error:     'An error occurred while processing your card. Please try again.',
  do_not_honor:         'Your card issuer has declined this transaction. Please contact your bank.',
  card_velocity_exceeded: 'Too many transactions on this card. Please try again later.',
  invalid_expiry_year:  'The expiration year is in the past.',
  invalid_expiry_month: 'The expiration month is invalid.',
  lost_card:            'This card has been reported lost. Please use a different card.',
  stolen_card:          'This card has been reported stolen. Please use a different card.'
};

const PAYMENT_METHODS = [
  { id: 'card',      label: 'Credit / Debit Card', icon: CreditCard,  description: 'Visa, Mastercard, Amex & more' },
  { id: 'crypto',    label: 'Cryptocurrency',       icon: Coins,       description: 'BTC, ETH, USDC, USDT, LTC, SOL' },
  { id: 'giftcard',  label: 'Gift Card',             icon: Gift,        description: 'Redeem a Nexus AI gift card' },
  { id: 'paypal',    label: 'PayPal',                icon: Wallet,      description: 'Pay securely with PayPal' },
  { id: 'applepay',  label: 'Apple Pay',             icon: Smartphone,  description: 'Touch ID / Face ID checkout' },
  { id: 'googlepay', label: 'Google Pay',            icon: Globe,       description: 'Fast, secure checkout' }
];

const STEPS = ['Plan', 'Payment', 'Billing', 'Confirm'];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Japan', 'Singapore', 'Netherlands', 'Sweden', 'Other'
];

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

/** Luhn algorithm — validates card number without any library */
function luhnCheck(raw) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/** Detect card brand from leading digits */
function detectCardBrand(raw) {
  const num = raw.replace(/\D/g, '');
  if (!num) return null;
  const n4 = parseInt(num.substring(0, 4), 10);
  const n6 = parseInt(num.substring(0, 6), 10);
  if (num[0] === '4') return 'visa';
  if ((n4 >= 2221 && n4 <= 2720) || (n4 >= 5100 && n4 <= 5599)) return 'mastercard';
  if (num.startsWith('34') || num.startsWith('37')) return 'amex';
  if (num.startsWith('6011') || (n6 >= 622126 && n6 <= 622925) || (n4 >= 6440 && n4 <= 6499) || num.startsWith('65')) return 'discover';
  if (n4 >= 3528 && n4 <= 3589) return 'jcb';
  if (num.startsWith('62')) return 'unionpay';
  if ((n4 >= 3000 && n4 <= 3059) || num.startsWith('36') || num.startsWith('38')) return 'diners';
  if (['6304', '6759', '6761', '6762', '6763'].some(p => num.startsWith(p))) return 'maestro';
  return 'unknown';
}

function formatCardNumber(val) {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function getAnnualPrice(monthly) {
  return +(monthly * 10).toFixed(2); // 2 months free
}

function getAnnualMonthlyEquivalent(monthly) {
  return +((monthly * 10) / 12).toFixed(2);
}

function computeTotal(plan, billingCycle, couponDiscount) {
  if (plan.monthlyPrice === 0) return 0;
  const base = billingCycle === 'annual' ? getAnnualPrice(plan.monthlyPrice) : plan.monthlyPrice;
  if (couponDiscount > 0) return +(base * (1 - couponDiscount / 100)).toFixed(2);
  return base;
}

const CARD_BRAND_LABELS = {
  visa:       { label: 'Visa',       bg: '#1a1f71', fg: '#fff' },
  mastercard: { label: 'Mastercard', bg: '#eb001b', fg: '#fff' },
  amex:       { label: 'Amex',       bg: '#007bc1', fg: '#fff' },
  discover:   { label: 'Discover',   bg: '#ff6600', fg: '#fff' },
  jcb:        { label: 'JCB',        bg: '#003087', fg: '#fff' },
  unionpay:   { label: 'UnionPay',   bg: '#c0392b', fg: '#fff' },
  diners:     { label: 'Diners',     bg: '#004b87', fg: '#fff' },
  maestro:    { label: 'Maestro',    bg: '#6f2c91', fg: '#fff' }
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function PaymentCheckout({ currentPlan = 'free', onSuccess, onCancel }) {
  // ── Navigation ──
  const [step, setStep] = useState(1);
  const [mode, setMode]  = useState('checkout'); // 'checkout' | 'manage'

  // ── Plan ──
  const [selectedPlan, setSelectedPlan]     = useState(currentPlan === 'free' ? 'pro' : currentPlan);
  const [billingCycle, setBillingCycle]     = useState('monthly');

  // ── Payment method ──
  const [paymentMethod, setPaymentMethod]   = useState('card');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [giftCardCode, setGiftCardCode]     = useState('');
  const [giftCardState, setGiftCardState]   = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const [giftCardCredit, setGiftCardCredit] = useState(0);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  // ── Stripe ──
  const [stripe, setStripe]                 = useState(null);
  const [stripeElements, setStripeElements] = useState(null);
  const [cardElement, setCardElement]       = useState(null);
  const [cardState, setCardState]           = useState({ complete: false, error: null, brand: null });
  const stripeCardRef = useRef(null);
  const stripeInitialized = useRef(false);

  // ── Inline card preview (for brand detection / Luhn UX) ──
  const [cardPreview, setCardPreview] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [cardBrand, setCardBrand]     = useState(null);
  const [luhnValid, setLuhnValid]     = useState(null);

  // ── Billing info ──
  const [billing, setBilling] = useState({
    firstName: '', lastName: '', email: '',
    company: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'United States'
  });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const addressLookupRef = useRef(null);

  // ── Coupon ──
  const [couponCode, setCouponCode]           = useState('');
  const [couponState, setCouponState]         = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const [couponDiscount, setCouponDiscount]   = useState(0);
  const [couponDescription, setCouponDescription] = useState('');

  // ── Crypto invoice ──
  const [cryptoInvoice, setCryptoInvoice]   = useState(null);
  const [cryptoLoading, setCryptoLoading]   = useState(false);

  // ── Payment processing ──
  const [processing, setProcessing]         = useState(false);
  const [paymentError, setPaymentError]     = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms]   = useState(false);

  // ── Management ──
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [cancelReason, setCancelReason]     = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [downloadingId, setDownloadingId]   = useState(null);

  // ─── Load Stripe.js ───
  useEffect(() => {
    if (stripeInitialized.current) return;
    stripeInitialized.current = true;

    const loadStripe = async () => {
      // Load Stripe.js from CDN if not already loaded
      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      try {
        // Fetch publishable key from API (never hardcode)
        const res = await fetch('/api/payments/config');
        const { publishableKey } = await res.json();
        const stripeInstance = window.Stripe(publishableKey);
        setStripe(stripeInstance);

        // Check Apple/Google Pay availability
        const pr = stripeInstance.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Nexus AI Pro', amount: 999 },
          requestPayerName: true,
          requestPayerEmail: true
        });
        const canMake = await pr.canMakePayment();
        if (canMake) {
          setApplePayAvailable(!!canMake.applePay);
          setGooglePayAvailable(!!canMake.googlePay);
        }
      } catch (err) {
        console.warn('Stripe init failed:', err.message);
      }
    };

    loadStripe();
  }, []);

  // ─── Mount Stripe card element ───
  useEffect(() => {
    if (step !== 3 || paymentMethod !== 'card' || !stripe || !stripeCardRef.current) return;

    const elements = stripe.elements({
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#888888',
          colorBackground: '#1a1a1a',
          colorText: '#ffffff',
          colorDanger: '#ef4444',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '8px'
        }
      }
    });

    const card = elements.create('card', {
      style: {
        base: {
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          '::placeholder': { color: '#666666' },
          iconColor: '#888888'
        },
        invalid: { color: '#ef4444', iconColor: '#ef4444' }
      }
    });

    card.mount(stripeCardRef.current);
    card.on('change', (e) => {
      setCardState({
        complete: e.complete,
        error: e.error ? e.error.message : null,
        brand: e.brand
      });
    });

    setStripeElements(elements);
    setCardElement(card);

    return () => {
      card.unmount();
      setCardElement(null);
    };
  }, [step, paymentMethod, stripe]);

  // ─── Load payment history when entering manage mode ───
  useEffect(() => {
    if (mode !== 'manage') return;
    setHistoryLoading(true);
    fetch('/api/payments/history')
      .then(r => r.json())
      .then(data => setPaymentHistory(data.invoices || []))
      .catch(() => setPaymentHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [mode]);

  // ─── Address autocomplete ───
  const handleAddressChange = useCallback((val) => {
    setBilling(b => ({ ...b, address: val }));
    setAddressSuggestions([]);
    clearTimeout(addressLookupRef.current);
    if (val.length < 3) return;
    addressLookupRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/payments/address/lookup?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setAddressSuggestions(data.suggestions || []);
      } catch { /* silent */ }
    }, 400);
  }, []);

  // ─── Card preview handlers ───
  const handleCardNumberChange = (e) => {
    const raw = e.target.value;
    const formatted = formatCardNumber(raw);
    const digits = formatted.replace(/\s/g, '');
    setCardPreview(p => ({ ...p, number: formatted }));
    setCardBrand(detectCardBrand(digits));
    if (digits.length >= 13) {
      setLuhnValid(luhnCheck(digits));
    } else {
      setLuhnValid(null);
    }
  };

  // ─── Coupon validation ───
  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponState('validating');
    try {
      const res = await fetch('/api/payments/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() })
      });
      const data = await res.json();
      if (data.valid) {
        setCouponState('valid');
        setCouponDiscount(data.discountPercent || 0);
        setCouponDescription(data.description || `${data.discountPercent}% off`);
      } else {
        setCouponState('invalid');
        setCouponDiscount(0);
      }
    } catch {
      setCouponState('invalid');
    }
  };

  // ─── Gift card validation ───
  const validateGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    setGiftCardState('validating');
    try {
      const res = await fetch('/api/payments/giftcard/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode.trim() })
      });
      const data = await res.json();
      if (data.valid) {
        setGiftCardState('valid');
        setGiftCardCredit(data.balance || 0);
      } else {
        setGiftCardState('invalid');
        setGiftCardCredit(0);
      }
    } catch {
      setGiftCardState('invalid');
    }
  };

  // ─── Create crypto invoice ───
  const createCryptoInvoice = async () => {
    setCryptoLoading(true);
    setCryptoInvoice(null);
    const plan = PLANS[selectedPlan];
    const total = computeTotal(plan, billingCycle, couponDiscount);
    try {
      const res = await fetch('/api/payments/crypto/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: cryptoCurrency, amount: total, planId: selectedPlan, billingCycle })
      });
      const data = await res.json();
      setCryptoInvoice(data);
    } catch (err) {
      setPaymentError('Failed to create crypto invoice. Please try again.');
    } finally {
      setCryptoLoading(false);
    }
  };

  // ─── PayPal redirect ───
  const redirectToPayPal = async () => {
    setProcessing(true);
    const plan = PLANS[selectedPlan];
    const total = computeTotal(plan, billingCycle, couponDiscount);
    try {
      const res = await fetch('/api/payments/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan, billingCycle, amount: total, billing })
      });
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch {
      setPaymentError('Failed to initiate PayPal checkout. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Main payment submission ───
  const handlePayment = async () => {
    setPaymentError(null);
    setProcessing(true);

    try {
      const plan = PLANS[selectedPlan];
      const total = computeTotal(plan, billingCycle, couponDiscount);

      if (paymentMethod === 'card') {
        if (!stripe || !cardElement) throw new Error('Payment system not ready. Please refresh.');
        if (!cardState.complete) throw new Error('Please complete your card details.');

        // NEVER send raw card numbers — use stripe.createPaymentMethod()
        const { paymentMethod: pm, error } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: `${billing.firstName} ${billing.lastName}`.trim(),
            email: billing.email,
            address: {
              line1: billing.address,
              city: billing.city,
              state: billing.state,
              postal_code: billing.zip,
              country: billing.country === 'United States' ? 'US' : undefined
            }
          }
        });

        if (error) {
          const msg = CARD_DECLINE_ERRORS[error.code] || error.message;
          throw new Error(msg);
        }

        // Send payment method ID to our server (never raw card data)
        const res = await fetch('/api/payments/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: pm.id,
            planId: selectedPlan,
            billingCycle,
            amount: Math.round(total * 100),
            couponCode: couponState === 'valid' ? couponCode : null,
            billing
          })
        });

        const result = await res.json();
        if (!result.success) {
          const msg = CARD_DECLINE_ERRORS[result.errorCode] || result.error || 'Payment failed.';
          throw new Error(msg);
        }

        setPaymentSuccess(true);
        setTimeout(() => onSuccess?.({ plan: selectedPlan, billingCycle, invoiceId: result.invoiceId }), 1500);

      } else if (paymentMethod === 'paypal') {
        await redirectToPayPal();

      } else if (paymentMethod === 'giftcard') {
        if (giftCardState !== 'valid') throw new Error('Please enter a valid gift card code.');
        const res = await fetch('/api/payments/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentType: 'giftcard',
            giftCardCode: giftCardCode.trim(),
            planId: selectedPlan,
            billingCycle,
            billing
          })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Gift card payment failed.');
        setPaymentSuccess(true);
        setTimeout(() => onSuccess?.({ plan: selectedPlan, billingCycle, invoiceId: result.invoiceId }), 1500);

      } else if (paymentMethod === 'crypto') {
        // Crypto: invoice was already created — just verify and confirm
        if (!cryptoInvoice) throw new Error('Please generate a crypto invoice first.');
        const res = await fetch('/api/payments/crypto/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: cryptoInvoice.id, planId: selectedPlan, billing })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Crypto payment not confirmed yet.');
        setPaymentSuccess(true);
        setTimeout(() => onSuccess?.({ plan: selectedPlan, billingCycle, invoiceId: result.invoiceId }), 1500);
      }

    } catch (err) {
      setPaymentError(err.message || 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Download invoice PDF ───
  const downloadInvoice = async (invoiceId) => {
    setDownloadingId(invoiceId);
    try {
      const res = await fetch(`/api/payments/invoice/${invoiceId}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-invoice-${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Cancel subscription ───
  const handleCancelSubscription = async () => {
    if (!cancelReason.trim()) return;
    setCancelProcessing(true);
    try {
      await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });
      setCancelConfirmed(true);
    } catch {
      alert('Cancellation failed. Please contact support.');
    } finally {
      setCancelProcessing(false);
    }
  };

  // ─── Validation for step progression ───
  const canAdvance = () => {
    if (step === 1) return true;
    if (step === 2) {
      if (paymentMethod === 'applepay' && !applePayAvailable) return false;
      if (paymentMethod === 'googlepay' && !googlePayAvailable) return false;
      return true;
    }
    if (step === 3) {
      const b = billing;
      const hasBasic = b.firstName && b.lastName && b.email && b.address && b.city && b.zip;
      if (!hasBasic) return false;
      if (paymentMethod === 'card') return true; // Stripe element handles its own validation
      if (paymentMethod === 'giftcard') return giftCardState === 'valid';
      return true;
    }
    if (step === 4) return agreedToTerms;
    return true;
  };

  const advance = () => {
    if (step < 4) setStep(s => s + 1);
  };

  const back = () => {
    if (step > 1) setStep(s => s - 1);
  };

  // ─────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────

  const plan = PLANS[selectedPlan];
  const total = computeTotal(plan, billingCycle, couponDiscount);
  const annualSavings = plan.monthlyPrice > 0
    ? +(plan.monthlyPrice * 2).toFixed(2)
    : 0;

  // ── Step 1: Plan Selection ──
  const renderStep1 = () => (
    <div className="pc-step-content">
      <div className="pc-step-header">
        <h2 className="pc-step-title">Choose your plan</h2>
        <p className="pc-step-subtitle">Upgrade anytime. Cancel anytime. No hidden fees.</p>
      </div>

      {/* Billing cycle toggle */}
      <div className="pc-billing-toggle">
        <button
          className={`pc-toggle-btn ${billingCycle === 'monthly' ? 'pc-toggle-active' : ''}`}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </button>
        <button
          className={`pc-toggle-btn ${billingCycle === 'annual' ? 'pc-toggle-active' : ''}`}
          onClick={() => setBillingCycle('annual')}
        >
          Annual
          <span className="pc-savings-chip">2 months free</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="pc-plans-grid">
        {Object.values(PLANS).map(p => {
          const Icon = p.icon;
          const monthlyEquiv = billingCycle === 'annual' && p.monthlyPrice > 0
            ? getAnnualMonthlyEquivalent(p.monthlyPrice)
            : p.monthlyPrice;
          const annualTotal = getAnnualPrice(p.monthlyPrice);
          const isSelected = selectedPlan === p.id;
          const isCurrent = currentPlan === p.id;

          return (
            <div
              key={p.id}
              className={`pc-plan-card ${isSelected ? 'pc-plan-selected' : ''} ${isCurrent ? 'pc-plan-current' : ''}`}
              onClick={() => setSelectedPlan(p.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setSelectedPlan(p.id)}
            >
              {p.badge && (
                <span className="pc-plan-badge">{p.badge}</span>
              )}
              {isCurrent && (
                <span className="pc-current-badge">Current Plan</span>
              )}

              <div className="pc-plan-icon-row">
                <div className="pc-plan-icon">
                  <Icon size={22} />
                </div>
                <div>
                  <div className="pc-plan-name">{p.name}</div>
                  {p.trialDays && (
                    <div className="pc-trial-label">
                      <Clock size={11} /> {p.trialDays}-day free trial
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="pc-plan-check">
                    <Check size={16} />
                  </div>
                )}
              </div>

              <div className="pc-plan-price">
                {p.monthlyPrice === 0 ? (
                  <span className="pc-price-main">Free</span>
                ) : (
                  <>
                    <span className="pc-price-main">
                      ${monthlyEquiv.toFixed(2)}
                      <span className="pc-price-period">/mo</span>
                    </span>
                    {billingCycle === 'annual' && (
                      <span className="pc-price-annual">
                        ${annualTotal}/yr — saves ${annualSavings}
                      </span>
                    )}
                  </>
                )}
              </div>

              <ul className="pc-features-list">
                {p.features.map(f => (
                  <li key={f} className="pc-feature-item">
                    <Check size={13} className="pc-feature-check" /> {f}
                  </li>
                ))}
                {p.notIncluded.slice(0, 2).map(f => (
                  <li key={f} className="pc-feature-item pc-feature-missing">
                    <X size={13} className="pc-feature-x" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Step 2: Payment Method ──
  const renderStep2 = () => (
    <div className="pc-step-content">
      <div className="pc-step-header">
        <h2 className="pc-step-title">Payment method</h2>
        <p className="pc-step-subtitle">All transactions are secured and encrypted.</p>
      </div>

      <div className="pc-method-grid">
        {PAYMENT_METHODS.map(m => {
          const Icon = m.icon;
          const unavailable = (m.id === 'applepay' && !applePayAvailable) ||
                              (m.id === 'googlepay' && !googlePayAvailable);
          return (
            <button
              key={m.id}
              className={`pc-method-card ${paymentMethod === m.id ? 'pc-method-selected' : ''} ${unavailable ? 'pc-method-disabled' : ''}`}
              onClick={() => !unavailable && setPaymentMethod(m.id)}
              disabled={unavailable}
              aria-pressed={paymentMethod === m.id}
              aria-label={m.label + (unavailable ? ' (not available on this device)' : '')}
            >
              <div className="pc-method-icon">
                <Icon size={22} />
              </div>
              <div className="pc-method-info">
                <span className="pc-method-name">{m.label}</span>
                <span className="pc-method-desc">
                  {unavailable ? 'Not available on this device' : m.description}
                </span>
              </div>
              {paymentMethod === m.id && (
                <Check size={16} className="pc-method-check" />
              )}
            </button>
          );
        })}
      </div>

      {/* Card brand display */}
      {paymentMethod === 'card' && (
        <div className="pc-card-brands">
          <span className="pc-brands-label">Accepted cards:</span>
          <div className="pc-brand-tags">
            {Object.entries(CARD_BRAND_LABELS).map(([key, val]) => (
              <span
                key={key}
                className="pc-brand-tag"
                style={{ background: val.bg, color: val.fg }}
              >
                {val.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Crypto currency selector */}
      {paymentMethod === 'crypto' && (
        <div className="pc-crypto-grid">
          <div className="pc-section-label">Select cryptocurrency:</div>
          <div className="pc-crypto-options">
            {CRYPTO_CURRENCIES.map(c => (
              <button
                key={c.id}
                className={`pc-crypto-btn ${cryptoCurrency === c.id ? 'pc-crypto-selected' : ''}`}
                onClick={() => setCryptoCurrency(c.id)}
                aria-pressed={cryptoCurrency === c.id}
              >
                <span className="pc-crypto-symbol" style={{ color: c.color }}>{c.symbol}</span>
                <span className="pc-crypto-name">{c.name}</span>
                <span className="pc-crypto-id">{c.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pc-security-note">
        <ShieldCheck size={14} />
        <span>Your payment details are protected by 256-bit TLS encryption. PCI DSS Level 1 compliant.</span>
      </div>
    </div>
  );

  // ── Step 3: Billing Information ──
  const renderStep3 = () => (
    <div className="pc-step-content">
      <div className="pc-step-header">
        <h2 className="pc-step-title">Billing information</h2>
        <p className="pc-step-subtitle">Secure form — your data is encrypted in transit.</p>
      </div>

      {/* Name row */}
      <div className="pc-field-row">
        <div className="pc-field">
          <label htmlFor="pc-first-name" className="pc-label">First name *</label>
          <input
            id="pc-first-name"
            className="pc-input"
            type="text"
            placeholder="Jane"
            value={billing.firstName}
            onChange={e => setBilling(b => ({ ...b, firstName: e.target.value }))}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="pc-field">
          <label htmlFor="pc-last-name" className="pc-label">Last name *</label>
          <input
            id="pc-last-name"
            className="pc-input"
            type="text"
            placeholder="Smith"
            value={billing.lastName}
            onChange={e => setBilling(b => ({ ...b, lastName: e.target.value }))}
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="pc-field">
        <label htmlFor="pc-email" className="pc-label">Email address *</label>
        <div className="pc-input-icon-wrap">
          <Mail size={15} className="pc-input-icon" />
          <input
            id="pc-email"
            className="pc-input pc-input-with-icon"
            type="email"
            placeholder="jane@example.com"
            value={billing.email}
            onChange={e => setBilling(b => ({ ...b, email: e.target.value }))}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Company (optional) */}
      <div className="pc-field">
        <label htmlFor="pc-company" className="pc-label">
          Company <span className="pc-optional">(optional)</span>
        </label>
        <div className="pc-input-icon-wrap">
          <Building size={15} className="pc-input-icon" />
          <input
            id="pc-company"
            className="pc-input pc-input-with-icon"
            type="text"
            placeholder="Acme Corp"
            value={billing.company}
            onChange={e => setBilling(b => ({ ...b, company: e.target.value }))}
            autoComplete="organization"
          />
        </div>
      </div>

      {/* Address with autocomplete */}
      <div className="pc-field pc-address-wrap">
        <label htmlFor="pc-address" className="pc-label">Street address *</label>
        <div className="pc-input-icon-wrap">
          <MapPin size={15} className="pc-input-icon" />
          <input
            id="pc-address"
            className="pc-input pc-input-with-icon"
            type="text"
            placeholder="123 Main St"
            value={billing.address}
            onChange={e => handleAddressChange(e.target.value)}
            autoComplete="street-address"
            required
          />
        </div>
        {addressSuggestions.length > 0 && (
          <ul className="pc-address-dropdown" role="listbox" aria-label="Address suggestions">
            {addressSuggestions.map((s, i) => (
              <li
                key={i}
                className="pc-address-option"
                role="option"
                tabIndex={0}
                onClick={() => {
                  setBilling(b => ({ ...b, address: s.address, city: s.city || b.city, state: s.state || b.state, zip: s.zip || b.zip }));
                  setAddressSuggestions([]);
                }}
                onKeyDown={e => e.key === 'Enter' && (() => {
                  setBilling(b => ({ ...b, address: s.address }));
                  setAddressSuggestions([]);
                })()}
              >
                <MapPin size={12} /> {s.address}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* City / State / ZIP row */}
      <div className="pc-field-row pc-field-row-3">
        <div className="pc-field">
          <label htmlFor="pc-city" className="pc-label">City *</label>
          <input
            id="pc-city"
            className="pc-input"
            type="text"
            placeholder="New York"
            value={billing.city}
            onChange={e => setBilling(b => ({ ...b, city: e.target.value }))}
            autoComplete="address-level2"
            required
          />
        </div>
        <div className="pc-field">
          <label htmlFor="pc-state" className="pc-label">State / Province</label>
          <input
            id="pc-state"
            className="pc-input"
            type="text"
            placeholder="NY"
            value={billing.state}
            onChange={e => setBilling(b => ({ ...b, state: e.target.value }))}
            autoComplete="address-level1"
          />
        </div>
        <div className="pc-field">
          <label htmlFor="pc-zip" className="pc-label">ZIP / Postal *</label>
          <input
            id="pc-zip"
            className="pc-input"
            type="text"
            placeholder="10001"
            value={billing.zip}
            onChange={e => setBilling(b => ({ ...b, zip: e.target.value }))}
            autoComplete="postal-code"
            required
          />
        </div>
      </div>

      {/* Country */}
      <div className="pc-field">
        <label htmlFor="pc-country" className="pc-label">Country *</label>
        <div className="pc-input-icon-wrap">
          <Globe size={15} className="pc-input-icon" />
          <select
            id="pc-country"
            className="pc-input pc-select pc-input-with-icon"
            value={billing.country}
            onChange={e => setBilling(b => ({ ...b, country: e.target.value }))}
            autoComplete="country"
          >
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Payment-specific fields ── */}
      {paymentMethod === 'card' && (
        <div className="pc-card-section">
          <div className="pc-section-divider">
            <CreditCard size={14} />
            <span>Card details</span>
          </div>

          {/* PCI compliance notice */}
          <div className="pc-pci-notice">
            <ShieldCheck size={14} />
            <span>
              Card details are entered directly into Stripe's secure, PCI DSS Level 1 certified element.
              Your full card number is never transmitted through our servers.
            </span>
          </div>

          {/* Stripe card element mount point */}
          <div className="pc-field">
            <label className="pc-label">Card information</label>
            <div className="pc-stripe-wrapper">
              <div ref={stripeCardRef} className="pc-stripe-element" id="stripe-card-element" />
              {!stripe && (
                <div className="pc-stripe-loading">
                  <Loader2 size={16} className="pc-spin" /> Loading secure payment form…
                </div>
              )}
            </div>
            {cardState.error && (
              <div className="pc-field-error" role="alert">
                <AlertCircle size={13} /> {CARD_DECLINE_ERRORS[cardState.error] || cardState.error}
              </div>
            )}
            {cardState.brand && cardState.brand !== 'unknown' && (
              <div className="pc-card-brand-detected">
                <span
                  className="pc-brand-tag"
                  style={{ background: CARD_BRAND_LABELS[cardState.brand]?.bg || '#333', color: '#fff' }}
                >
                  {CARD_BRAND_LABELS[cardState.brand]?.label || cardState.brand}
                </span>
                <span className="pc-brand-detected-label">detected</span>
              </div>
            )}
          </div>

          {/* Card number preview with Luhn (for UX only — actual capture is via Stripe above) */}
          <details className="pc-luhn-demo">
            <summary className="pc-luhn-summary">
              <Shield size={13} /> Verify card number (Luhn check)
            </summary>
            <div className="pc-luhn-body">
              <p className="pc-luhn-note">
                Enter your card number below to run a local Luhn checksum — no network request is made.
                The actual card capture above (via Stripe) is the secure entry point.
              </p>
              <div className="pc-field">
                <label htmlFor="pc-luhn-input" className="pc-label">Card number (local check only)</label>
                <div className="pc-input-icon-wrap">
                  <CreditCard size={15} className="pc-input-icon" />
                  <input
                    id="pc-luhn-input"
                    className="pc-input pc-input-with-icon pc-card-number-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="•••• •••• •••• ••••"
                    value={cardPreview.number}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    aria-describedby="pc-luhn-status"
                  />
                </div>
                <div id="pc-luhn-status" className="pc-luhn-status">
                  {cardBrand && CARD_BRAND_LABELS[cardBrand] && (
                    <span
                      className="pc-brand-tag"
                      style={{ background: CARD_BRAND_LABELS[cardBrand].bg, color: '#fff' }}
                    >
                      {CARD_BRAND_LABELS[cardBrand].label}
                    </span>
                  )}
                  {luhnValid === true && (
                    <span className="pc-luhn-valid"><CheckCircle2 size={13} /> Valid card number</span>
                  )}
                  {luhnValid === false && (
                    <span className="pc-luhn-invalid"><AlertCircle size={13} /> Invalid card number</span>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {paymentMethod === 'giftcard' && (
        <div className="pc-card-section">
          <div className="pc-section-divider">
            <Gift size={14} />
            <span>Gift card</span>
          </div>
          <div className="pc-field">
            <label htmlFor="pc-giftcard" className="pc-label">Gift card code *</label>
            <div className="pc-coupon-row">
              <input
                id="pc-giftcard"
                className={`pc-input ${giftCardState === 'valid' ? 'pc-input-valid' : giftCardState === 'invalid' ? 'pc-input-error' : ''}`}
                type="text"
                placeholder="NEXUS-XXXX-XXXX-XXXX"
                value={giftCardCode}
                onChange={e => { setGiftCardCode(e.target.value.toUpperCase()); setGiftCardState(null); }}
                aria-describedby="pc-giftcard-status"
              />
              <button
                className="pc-apply-btn"
                onClick={validateGiftCard}
                disabled={giftCardState === 'validating' || !giftCardCode.trim()}
              >
                {giftCardState === 'validating' ? <Loader2 size={15} className="pc-spin" /> : 'Apply'}
              </button>
            </div>
            <div id="pc-giftcard-status">
              {giftCardState === 'valid' && (
                <div className="pc-success-msg" role="status">
                  <CheckCircle2 size={13} /> Gift card accepted — ${giftCardCredit.toFixed(2)} credit applied
                </div>
              )}
              {giftCardState === 'invalid' && (
                <div className="pc-field-error" role="alert">
                  <AlertCircle size={13} /> Invalid or expired gift card code
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {paymentMethod === 'crypto' && (
        <div className="pc-card-section">
          <div className="pc-section-divider">
            <Coins size={14} />
            <span>Cryptocurrency — {cryptoCurrency}</span>
          </div>
          <p className="pc-crypto-info">
            An invoice will be generated in step 4. Send the exact amount to the provided address before the invoice expires (30 minutes).
          </p>
        </div>
      )}

      {/* Coupon code */}
      {plan.monthlyPrice > 0 && (
        <div className="pc-field">
          <label htmlFor="pc-coupon" className="pc-label">
            <Tag size={13} /> Coupon / promo code{' '}
            <span className="pc-optional">(optional)</span>
          </label>
          <div className="pc-coupon-row">
            <input
              id="pc-coupon"
              className={`pc-input ${couponState === 'valid' ? 'pc-input-valid' : couponState === 'invalid' ? 'pc-input-error' : ''}`}
              type="text"
              placeholder="NEXUS20"
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponState(null); setCouponDiscount(0); }}
              aria-describedby="pc-coupon-status"
            />
            <button
              className="pc-apply-btn"
              onClick={validateCoupon}
              disabled={couponState === 'validating' || !couponCode.trim()}
            >
              {couponState === 'validating' ? <Loader2 size={15} className="pc-spin" /> : 'Apply'}
            </button>
          </div>
          <div id="pc-coupon-status">
            {couponState === 'valid' && (
              <div className="pc-success-msg" role="status">
                <CheckCircle2 size={13} /> {couponDescription} — {couponDiscount}% off applied
              </div>
            )}
            {couponState === 'invalid' && (
              <div className="pc-field-error" role="alert">
                <AlertCircle size={13} /> This coupon code is invalid or has expired
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 4: Confirmation ──
  const renderStep4 = () => {
    const planObj = PLANS[selectedPlan];
    const basePrice = billingCycle === 'annual' ? getAnnualPrice(planObj.monthlyPrice) : planObj.monthlyPrice;

    return (
      <div className="pc-step-content">
        <div className="pc-step-header">
          <h2 className="pc-step-title">Review & confirm</h2>
          <p className="pc-step-subtitle">Please review your order before completing payment.</p>
        </div>

        {/* Order summary */}
        <div className="pc-summary-card">
          <div className="pc-summary-row pc-summary-plan">
            <span className="pc-summary-label">Plan</span>
            <span className="pc-summary-value pc-plan-name-summary">{planObj.name}</span>
          </div>
          <div className="pc-summary-row">
            <span className="pc-summary-label">Billing</span>
            <span className="pc-summary-value">{billingCycle === 'annual' ? 'Annual (2 months free)' : 'Monthly'}</span>
          </div>
          {planObj.trialDays && (
            <div className="pc-summary-row pc-trial-row">
              <span className="pc-summary-label">
                <Clock size={13} /> Trial period
              </span>
              <span className="pc-summary-value pc-trial-value">{planObj.trialDays} days free</span>
            </div>
          )}
          <div className="pc-summary-row">
            <span className="pc-summary-label">Payment method</span>
            <span className="pc-summary-value pc-method-summary">
              {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
              {paymentMethod === 'crypto' && ` (${cryptoCurrency})`}
            </span>
          </div>
          <div className="pc-summary-row">
            <span className="pc-summary-label">Billed to</span>
            <span className="pc-summary-value">
              {billing.firstName} {billing.lastName}<br />
              <small>{billing.email}</small>
            </span>
          </div>
          {couponState === 'valid' && (
            <div className="pc-summary-row pc-discount-row">
              <span className="pc-summary-label">
                <Percent size={13} /> Discount ({couponDiscount}%)
              </span>
              <span className="pc-summary-value pc-discount-value">
                −${(basePrice * couponDiscount / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className="pc-summary-divider" />
          <div className="pc-summary-row pc-total-row">
            <span className="pc-total-label">
              {planObj.monthlyPrice === 0 ? 'Total' : billingCycle === 'annual' ? 'Total (billed annually)' : 'Total (billed monthly)'}
            </span>
            <span className="pc-total-value">
              {planObj.monthlyPrice === 0 ? 'Free' : `$${total.toFixed(2)}`}
            </span>
          </div>
          {billingCycle === 'annual' && planObj.monthlyPrice > 0 && (
            <div className="pc-summary-row pc-saving-row">
              <span className="pc-saving-note">
                <CheckCircle2 size={13} /> You save ${annualSavings}/year vs monthly billing
              </span>
            </div>
          )}
        </div>

        {/* Crypto invoice generation */}
        {paymentMethod === 'crypto' && (
          <div className="pc-crypto-invoice">
            {!cryptoInvoice && !cryptoLoading && (
              <button className="pc-generate-btn" onClick={createCryptoInvoice}>
                <QrCode size={16} /> Generate {cryptoCurrency} Invoice
              </button>
            )}
            {cryptoLoading && (
              <div className="pc-crypto-generating">
                <Loader2 size={18} className="pc-spin" /> Generating invoice…
              </div>
            )}
            {cryptoInvoice && (
              <div className="pc-invoice-panel">
                <div className="pc-invoice-header">
                  <QrCode size={16} />
                  <span>Send exactly to complete your payment</span>
                </div>
                {cryptoInvoice.qrCode && (
                  <img src={cryptoInvoice.qrCode} alt="Payment QR code" className="pc-qr-code" />
                )}
                <div className="pc-invoice-amount">
                  <span className="pc-invoice-label">Amount</span>
                  <div className="pc-invoice-value-row">
                    <span className="pc-invoice-amount-val">
                      {cryptoInvoice.cryptoAmount} {cryptoCurrency}
                    </span>
                    <button
                      className="pc-copy-btn"
                      onClick={() => navigator.clipboard.writeText(cryptoInvoice.cryptoAmount.toString())}
                      aria-label="Copy amount"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <div className="pc-invoice-address">
                  <span className="pc-invoice-label">Address</span>
                  <div className="pc-invoice-value-row">
                    <span className="pc-invoice-addr-val">{cryptoInvoice.address}</span>
                    <button
                      className="pc-copy-btn"
                      onClick={() => navigator.clipboard.writeText(cryptoInvoice.address)}
                      aria-label="Copy address"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                {cryptoInvoice.expiresAt && (
                  <div className="pc-invoice-expiry">
                    <Clock size={12} /> Expires at {new Date(cryptoInvoice.expiresAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Terms agreement */}
        <label className="pc-terms-check" htmlFor="pc-terms">
          <input
            id="pc-terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
          />
          <span>
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="pc-link">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="pc-link">Privacy Policy</a>.
            {planObj.trialDays && ` Your ${planObj.trialDays}-day free trial begins immediately. You will not be charged until the trial ends.`}
          </span>
        </label>

        {/* Error */}
        {paymentError && (
          <div className="pc-payment-error" role="alert" aria-live="assertive">
            <AlertTriangle size={16} />
            <div>
              <strong>Payment failed</strong>
              <p>{paymentError}</p>
            </div>
          </div>
        )}

        {/* Success */}
        {paymentSuccess && (
          <div className="pc-payment-success" role="status" aria-live="polite">
            <CheckCircle2 size={24} />
            <div>
              <strong>Payment successful!</strong>
              <p>Welcome to {planObj.name}. Activating your plan…</p>
            </div>
          </div>
        )}

        {/* Pay button */}
        {!paymentSuccess && (
          <button
            className={`pc-pay-btn ${processing ? 'pc-pay-loading' : ''}`}
            onClick={handlePayment}
            disabled={!agreedToTerms || processing || (paymentMethod === 'crypto' && !cryptoInvoice)}
            aria-busy={processing}
          >
            {processing ? (
              <><Loader2 size={18} className="pc-spin" /> Processing…</>
            ) : planObj.monthlyPrice === 0 ? (
              <><Zap size={18} /> Activate Free Plan</>
            ) : (
              <><Lock size={16} /> Pay ${total.toFixed(2)} securely</>
            )}
          </button>
        )}

        <div className="pc-security-row">
          <ShieldCheck size={13} />
          <span>Payments processed by Stripe — PCI DSS Level 1. We never store card numbers.</span>
        </div>
      </div>
    );
  };

  // ── Management Panel ──
  const renderManagePanel = () => (
    <div className="pc-manage-panel">
      <div className="pc-manage-header">
        <h2 className="pc-manage-title">Subscription management</h2>
        <div className="pc-current-plan-badge">
          <span>Current: </span>
          <strong>{PLANS[currentPlan]?.name}</strong>
        </div>
      </div>

      {/* Actions */}
      {!showCancelFlow && (
        <div className="pc-manage-actions">
          <button
            className="pc-manage-btn pc-manage-upgrade"
            onClick={() => { setMode('checkout'); setStep(1); }}
          >
            <ArrowUpDown size={16} /> Change plan
          </button>
          <button
            className="pc-manage-btn pc-manage-cancel"
            onClick={() => setShowCancelFlow(true)}
          >
            <Trash2 size={16} /> Cancel subscription
          </button>
        </div>
      )}

      {/* Cancel flow */}
      {showCancelFlow && !cancelConfirmed && (
        <div className="pc-cancel-flow">
          <div className="pc-cancel-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Cancel subscription</strong>
              <p>You will lose access to {PLANS[currentPlan]?.name} features at the end of your billing period.</p>
            </div>
          </div>
          <div className="pc-field">
            <label htmlFor="pc-cancel-reason" className="pc-label">
              Please tell us why you're leaving (required)
            </label>
            <select
              id="pc-cancel-reason"
              className="pc-input pc-select"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            >
              <option value="">— Select a reason —</option>
              <option value="too_expensive">Too expensive</option>
              <option value="not_using">Not using it enough</option>
              <option value="missing_features">Missing features I need</option>
              <option value="switching_competitor">Switching to a competitor</option>
              <option value="technical_issues">Technical issues</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="pc-cancel-actions">
            <button
              className="pc-manage-btn"
              onClick={() => setShowCancelFlow(false)}
            >
              Keep my plan
            </button>
            <button
              className="pc-manage-btn pc-manage-cancel-confirm"
              onClick={handleCancelSubscription}
              disabled={!cancelReason || cancelProcessing}
            >
              {cancelProcessing
                ? <><Loader2 size={15} className="pc-spin" /> Cancelling…</>
                : 'Confirm cancellation'}
            </button>
          </div>
        </div>
      )}

      {cancelConfirmed && (
        <div className="pc-cancel-confirmed">
          <CheckCircle2 size={20} />
          <div>
            <strong>Subscription cancelled</strong>
            <p>Your plan will remain active until the end of the current billing period. You won't be charged again.</p>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="pc-history-section">
        <div className="pc-history-header">
          <History size={16} />
          <h3>Payment history</h3>
        </div>

        {historyLoading && (
          <div className="pc-history-loading">
            <Loader2 size={16} className="pc-spin" /> Loading invoices…
          </div>
        )}

        {!historyLoading && paymentHistory.length === 0 && (
          <div className="pc-history-empty">No payment records found.</div>
        )}

        {!historyLoading && paymentHistory.length > 0 && (
          <div className="pc-history-table">
            <div className="pc-history-thead">
              <span>Date</span>
              <span>Description</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Invoice</span>
            </div>
            {paymentHistory.map(inv => (
              <div key={inv.id} className="pc-history-row">
                <span className="pc-history-date">
                  {new Date(inv.date).toLocaleDateString()}
                </span>
                <span className="pc-history-desc">{inv.description}</span>
                <span className="pc-history-amount">${(inv.amount / 100).toFixed(2)}</span>
                <span className={`pc-status-chip pc-status-${inv.status}`}>
                  {inv.status}
                </span>
                <button
                  className="pc-dl-btn"
                  onClick={() => downloadInvoice(inv.id)}
                  disabled={downloadingId === inv.id}
                  aria-label={`Download invoice ${inv.id}`}
                >
                  {downloadingId === inv.id
                    ? <Loader2 size={13} className="pc-spin" />
                    : <Download size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="pc-root">
      {/* Header */}
      <div className="pc-header">
        <div className="pc-header-left">
          <div className="pc-header-logo">
            <ShieldCheck size={18} />
            <span>Nexus AI</span>
          </div>
          {mode === 'checkout' && (
            <div className="pc-breadcrumb">
              {STEPS.map((label, i) => {
                const num = i + 1;
                const isActive = step === num;
                const isDone = step > num;
                return (
                  <React.Fragment key={label}>
                    <div className={`pc-step-bubble ${isActive ? 'pc-bubble-active' : isDone ? 'pc-bubble-done' : ''}`}>
                      {isDone ? <Check size={12} /> : num}
                    </div>
                    <span className={`pc-step-label ${isActive ? 'pc-label-active' : ''}`}>{label}</span>
                    {i < STEPS.length - 1 && <div className={`pc-step-line ${isDone ? 'pc-line-done' : ''}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
        <div className="pc-header-right">
          {currentPlan !== 'free' && (
            <button
              className="pc-mode-toggle"
              onClick={() => setMode(mode === 'checkout' ? 'manage' : 'checkout')}
            >
              {mode === 'checkout' ? <><History size={14} /> Manage</> : <><Package size={14} /> Checkout</>}
            </button>
          )}
          <div className="pc-secure-chip">
            <Lock size={11} />
            <span>Secure</span>
          </div>
          <button className="pc-close-btn" onClick={onCancel} aria-label="Close checkout">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="pc-body">
        {mode === 'manage' ? (
          renderManagePanel()
        ) : (
          <>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </>
        )}
      </div>

      {/* Footer navigation */}
      {mode === 'checkout' && !paymentSuccess && (
        <div className="pc-footer">
          <button
            className="pc-nav-btn pc-nav-back"
            onClick={step === 1 ? onCancel : back}
            disabled={processing}
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="pc-footer-summary">
            {plan.monthlyPrice > 0 && (
              <span className="pc-footer-price">
                {step >= 1 && `${plan.name} — $${total.toFixed(2)}/${billingCycle === 'annual' ? 'yr' : 'mo'}`}
              </span>
            )}
          </div>

          {step < 4 && (
            <button
              className="pc-nav-btn pc-nav-next"
              onClick={advance}
              disabled={!canAdvance()}
            >
              {step === 3 ? 'Review order' : 'Continue'}
              <ChevronRight size={16} />
            </button>
          )}
          {step === 4 && <div style={{ width: 120 }} />}
        </div>
      )}

      {/* ─────────── STYLES ─────────── */}
      <style>{`
        /* PaymentCheckout component styles — prefixed pc- */
        :root {
          --pc-blue:   #3b82f6;
          --pc-purple: #a855f7;
          --pc-green:  #10b981;
          --pc-red:    #ef4444;
          --pc-amber:  #f59e0b;
          --pc-gray:   #6b7280;
        }

        .pc-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 500px;
          background: var(--bg-1, #0a0a0a);
          color: var(--text-1, #ffffff);
          font-family: 'Inter', sans-serif;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border, #2a2a2a);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          max-width: 780px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .pc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: var(--bg-2, #111111);
          border-bottom: 1px solid var(--border, #2a2a2a);
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pc-header-left  { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .pc-header-right { display: flex; align-items: center; gap: 10px; }

        .pc-header-logo {
          display: flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 0.95rem;
          color: var(--text-1, #fff);
        }

        /* Breadcrumb steps */
        .pc-breadcrumb {
          display: flex; align-items: center; gap: 6px;
        }
        .pc-step-bubble {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700;
          color: var(--text-3, #666);
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .pc-bubble-active {
          background: var(--pc-blue);
          border-color: var(--pc-blue);
          color: #fff;
          box-shadow: 0 0 12px rgba(59,130,246,0.4);
        }
        .pc-bubble-done {
          background: var(--pc-green);
          border-color: var(--pc-green);
          color: #fff;
        }
        .pc-step-label {
          font-size: 0.72rem; color: var(--text-3, #666);
          transition: color 0.2s;
        }
        .pc-label-active { color: var(--text-1, #fff); font-weight: 600; }
        .pc-step-line {
          width: 20px; height: 1px;
          background: var(--border, #2a2a2a);
          flex-shrink: 0;
        }
        .pc-line-done { background: var(--pc-green); }

        .pc-mode-toggle {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 12px;
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 8px;
          color: var(--text-2, #a0a0a0);
          font-size: 0.78rem; cursor: pointer;
          transition: all 0.2s;
        }
        .pc-mode-toggle:hover { background: var(--bg-4, #222); color: var(--text-1, #fff); }

        .pc-secure-chip {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 20px;
          font-size: 0.72rem; color: var(--pc-green);
        }

        .pc-close-btn {
          width: 32px; height: 32px;
          background: transparent; border: none;
          border-radius: 8px;
          color: var(--text-2, #a0a0a0);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .pc-close-btn:hover { background: var(--bg-3, #1a1a1a); color: var(--text-1, #fff); }

        /* ── Body ── */
        .pc-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px 28px;
        }
        .pc-body::-webkit-scrollbar { width: 4px; }
        .pc-body::-webkit-scrollbar-thumb { background: var(--border, #2a2a2a); border-radius: 2px; }

        /* ── Step layout ── */
        .pc-step-content { display: flex; flex-direction: column; gap: 20px; }

        .pc-step-header { margin-bottom: 4px; }
        .pc-step-title {
          font-size: 1.25rem; font-weight: 700;
          color: var(--text-1, #fff);
          margin-bottom: 4px;
        }
        .pc-step-subtitle { font-size: 0.85rem; color: var(--text-2, #a0a0a0); }

        /* ── Billing toggle ── */
        .pc-billing-toggle {
          display: flex; align-items: center; gap: 4px;
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 10px;
          padding: 4px;
          width: fit-content;
        }
        .pc-toggle-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px;
          background: transparent; border: none;
          border-radius: 7px;
          color: var(--text-2, #a0a0a0);
          font-size: 0.85rem; cursor: pointer;
          transition: all 0.2s;
        }
        .pc-toggle-active {
          background: var(--bg-4, #222);
          color: var(--text-1, #fff);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .pc-savings-chip {
          font-size: 0.65rem; font-weight: 700;
          padding: 2px 7px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 20px;
          color: var(--pc-green);
        }

        /* ── Plan cards ── */
        .pc-plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 580px) {
          .pc-plans-grid { grid-template-columns: 1fr; }
        }

        .pc-plan-card {
          position: relative;
          background: var(--bg-2, #111);
          border: 1.5px solid var(--border, #2a2a2a);
          border-radius: 14px;
          padding: 18px 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex; flex-direction: column; gap: 14px;
        }
        .pc-plan-card:hover { border-color: var(--text-3, #666); background: var(--bg-3, #1a1a1a); }
        .pc-plan-selected {
          border-color: var(--pc-blue) !important;
          background: rgba(59,130,246,0.06) !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12), 0 8px 24px rgba(0,0,0,0.3);
        }
        .pc-plan-current { border-color: var(--pc-green) !important; }

        .pc-plan-badge {
          position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
          font-size: 0.65rem; font-weight: 700;
          padding: 3px 10px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 20px; color: #fff;
          white-space: nowrap;
        }
        .pc-current-badge {
          position: absolute; top: -10px; right: 12px;
          font-size: 0.65rem; font-weight: 700;
          padding: 3px 10px;
          background: rgba(16,185,129,0.2);
          border: 1px solid var(--pc-green);
          border-radius: 20px; color: var(--pc-green);
          white-space: nowrap;
        }

        .pc-plan-icon-row { display: flex; align-items: center; gap: 10px; }
        .pc-plan-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-2, #a0a0a0);
          flex-shrink: 0;
        }
        .pc-plan-selected .pc-plan-icon { background: rgba(59,130,246,0.1); border-color: var(--pc-blue); color: var(--pc-blue); }
        .pc-plan-name { font-size: 1rem; font-weight: 700; color: var(--text-1, #fff); }
        .pc-trial-label {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.7rem; color: var(--pc-green);
          margin-top: 2px;
        }
        .pc-plan-check {
          margin-left: auto;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: var(--pc-blue);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }

        .pc-plan-price { display: flex; flex-direction: column; gap: 3px; }
        .pc-price-main { font-size: 1.4rem; font-weight: 800; color: var(--text-1, #fff); }
        .pc-price-period { font-size: 0.75rem; font-weight: 400; color: var(--text-3, #666); }
        .pc-price-annual { font-size: 0.72rem; color: var(--pc-green); }

        .pc-features-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 6px;
        }
        .pc-feature-item {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 0.78rem; color: var(--text-2, #a0a0a0);
          line-height: 1.4;
        }
        .pc-feature-check { color: var(--pc-green); flex-shrink: 0; margin-top: 1px; }
        .pc-feature-missing { color: var(--text-3, #666); }
        .pc-feature-x { color: var(--text-3, #666); flex-shrink: 0; margin-top: 1px; }

        /* ── Payment methods ── */
        .pc-method-grid { display: flex; flex-direction: column; gap: 8px; }

        .pc-method-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: var(--bg-2, #111);
          border: 1.5px solid var(--border, #2a2a2a);
          border-radius: 12px;
          color: var(--text-1, #fff);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .pc-method-card:hover { border-color: var(--text-3, #666); background: var(--bg-3, #1a1a1a); }
        .pc-method-selected { border-color: var(--pc-blue) !important; background: rgba(59,130,246,0.07) !important; }
        .pc-method-disabled { opacity: 0.4; cursor: not-allowed; }

        .pc-method-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          background: var(--bg-3, #1a1a1a);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-2, #a0a0a0);
        }
        .pc-method-selected .pc-method-icon { background: rgba(59,130,246,0.1); color: var(--pc-blue); }

        .pc-method-info { flex: 1; }
        .pc-method-name { display: block; font-weight: 600; font-size: 0.9rem; }
        .pc-method-desc { display: block; font-size: 0.75rem; color: var(--text-3, #666); margin-top: 2px; }

        .pc-method-check {
          color: var(--pc-blue); flex-shrink: 0;
        }

        /* Card brands */
        .pc-card-brands {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap;
          padding: 12px 14px;
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 10px;
        }
        .pc-brands-label { font-size: 0.75rem; color: var(--text-3, #666); white-space: nowrap; }
        .pc-brand-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .pc-brand-tag {
          font-size: 0.65rem; font-weight: 700;
          padding: 3px 8px;
          border-radius: 5px;
          letter-spacing: 0.3px;
        }

        /* Crypto options */
        .pc-crypto-grid { display: flex; flex-direction: column; gap: 10px; }
        .pc-section-label { font-size: 0.78rem; color: var(--text-3, #666); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .pc-crypto-options { display: flex; flex-wrap: wrap; gap: 8px; }
        .pc-crypto-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 12px 16px;
          background: var(--bg-2, #111);
          border: 1.5px solid var(--border, #2a2a2a);
          border-radius: 10px;
          color: var(--text-1, #fff);
          cursor: pointer; transition: all 0.2s; min-width: 80px;
        }
        .pc-crypto-btn:hover { border-color: var(--text-3, #666); }
        .pc-crypto-selected { border-color: var(--pc-blue) !important; background: rgba(59,130,246,0.07) !important; }
        .pc-crypto-symbol { font-size: 1.4rem; font-weight: 800; }
        .pc-crypto-name { font-size: 0.7rem; color: var(--text-2, #a0a0a0); }
        .pc-crypto-id { font-size: 0.65rem; color: var(--text-3, #666); font-weight: 700; }

        .pc-security-note {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px;
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.15);
          border-radius: 8px;
          font-size: 0.75rem; color: var(--pc-green);
        }

        /* ── Form fields ── */
        .pc-field { display: flex; flex-direction: column; gap: 6px; }
        .pc-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pc-field-row-3 { grid-template-columns: 2fr 1fr 1fr; }
        @media (max-width: 480px) {
          .pc-field-row, .pc-field-row-3 { grid-template-columns: 1fr; }
        }

        .pc-label {
          font-size: 0.78rem; font-weight: 600;
          color: var(--text-2, #a0a0a0);
        }
        .pc-optional { font-weight: 400; color: var(--text-3, #666); }

        .pc-input {
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text-1, #fff);
          font-size: 0.9rem;
          font-family: inherit;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }
        .pc-input:focus { outline: none; border-color: var(--pc-blue); }
        .pc-input::placeholder { color: var(--text-3, #666); }
        .pc-input-valid { border-color: var(--pc-green) !important; }
        .pc-input-error { border-color: var(--pc-red) !important; }

        .pc-select { appearance: none; cursor: pointer; }

        .pc-input-icon-wrap { position: relative; }
        .pc-input-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          color: var(--text-3, #666); pointer-events: none;
        }
        .pc-input-with-icon { padding-left: 34px; }

        /* Address dropdown */
        .pc-address-wrap { position: relative; }
        .pc-address-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 8px;
          max-height: 200px; overflow-y: auto;
          z-index: 100;
          list-style: none; padding: 4px; margin: 0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .pc-address-option {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px;
          font-size: 0.85rem; color: var(--text-2, #a0a0a0);
          cursor: pointer; border-radius: 6px;
          transition: background 0.15s;
        }
        .pc-address-option:hover { background: var(--bg-3, #1a1a1a); color: var(--text-1, #fff); }

        /* Card section */
        .pc-card-section { display: flex; flex-direction: column; gap: 14px; }
        .pc-section-divider {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.78rem; font-weight: 600;
          color: var(--text-3, #666);
          text-transform: uppercase; letter-spacing: 0.5px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border, #2a2a2a);
        }

        .pc-pci-notice {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 14px;
          background: rgba(59,130,246,0.07);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 8px;
          font-size: 0.75rem; color: #93c5fd;
        }
        .pc-pci-notice svg { flex-shrink: 0; margin-top: 1px; }

        /* Stripe element */
        .pc-stripe-wrapper {
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 8px;
          padding: 12px;
          min-height: 44px;
          position: relative;
          transition: border-color 0.2s;
        }
        .pc-stripe-wrapper:focus-within { border-color: var(--pc-blue); }
        .pc-stripe-element { min-height: 22px; }
        .pc-stripe-loading {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem; color: var(--text-3, #666);
          position: absolute; inset: 0;
          padding: 12px;
        }

        .pc-card-brand-detected {
          display: flex; align-items: center; gap: 6px;
          margin-top: 4px;
        }
        .pc-brand-detected-label { font-size: 0.72rem; color: var(--text-3, #666); }

        /* Luhn demo */
        .pc-luhn-demo {
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 10px;
          overflow: hidden;
        }
        .pc-luhn-summary {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 14px;
          font-size: 0.78rem; color: var(--text-3, #666);
          cursor: pointer; list-style: none;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pc-luhn-summary::-webkit-details-marker { display: none; }
        .pc-luhn-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border, #2a2a2a); }
        .pc-luhn-note { font-size: 0.75rem; color: var(--text-3, #666); line-height: 1.5; }
        .pc-card-number-input { letter-spacing: 0.1em; font-family: 'JetBrains Mono', monospace; }

        .pc-luhn-status {
          display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;
        }
        .pc-luhn-valid {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.78rem; color: var(--pc-green);
        }
        .pc-luhn-invalid {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.78rem; color: var(--pc-red);
        }

        .pc-field-error {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.75rem; color: var(--pc-red);
          margin-top: 2px;
        }

        /* Coupon / gift card rows */
        .pc-coupon-row { display: flex; gap: 8px; }
        .pc-coupon-row .pc-input { flex: 1; }
        .pc-apply-btn {
          padding: 9px 16px;
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 8px;
          color: var(--text-1, #fff);
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
          transition: all 0.2s; flex-shrink: 0;
        }
        .pc-apply-btn:hover { background: var(--bg-4, #222); border-color: var(--text-3, #666); }
        .pc-apply-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .pc-success-msg {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.75rem; color: var(--pc-green);
          margin-top: 2px;
        }

        /* Crypto info */
        .pc-crypto-info { font-size: 0.82rem; color: var(--text-2, #a0a0a0); line-height: 1.5; }

        /* ── Summary card ── */
        .pc-summary-card {
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 14px;
          padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .pc-summary-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .pc-summary-label { font-size: 0.82rem; color: var(--text-3, #666); }
        .pc-summary-value { font-size: 0.88rem; color: var(--text-1, #fff); text-align: right; }
        .pc-plan-name-summary { font-weight: 700; }
        .pc-trial-row { }
        .pc-trial-value { color: var(--pc-green); font-weight: 600; }
        .pc-method-summary { color: var(--text-2, #a0a0a0); }
        .pc-discount-row .pc-summary-label { color: var(--pc-green); display: flex; align-items: center; gap: 5px; }
        .pc-discount-value { color: var(--pc-green); font-weight: 600; }
        .pc-summary-divider { border: none; border-top: 1px solid var(--border, #2a2a2a); margin: 0; }
        .pc-total-row { }
        .pc-total-label { font-size: 0.9rem; font-weight: 700; color: var(--text-1, #fff); }
        .pc-total-value { font-size: 1.2rem; font-weight: 800; color: var(--text-1, #fff); }
        .pc-saving-row { }
        .pc-saving-note {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.75rem; color: var(--pc-green);
        }

        /* Crypto invoice */
        .pc-crypto-invoice { display: flex; flex-direction: column; gap: 14px; }
        .pc-generate-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none; border-radius: 10px;
          color: #fff; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .pc-generate-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .pc-crypto-generating {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; color: var(--text-2, #a0a0a0);
        }

        .pc-invoice-panel {
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 12px;
          padding: 18px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .pc-invoice-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.82rem; color: var(--text-2, #a0a0a0);
          font-weight: 600;
        }
        .pc-qr-code {
          width: 140px; height: 140px;
          border-radius: 8px;
          object-fit: contain;
          background: #fff;
          align-self: center;
        }
        .pc-invoice-amount, .pc-invoice-address { display: flex; flex-direction: column; gap: 4px; }
        .pc-invoice-label { font-size: 0.72rem; color: var(--text-3, #666); text-transform: uppercase; letter-spacing: 0.5px; }
        .pc-invoice-value-row {
          display: flex; align-items: center; gap: 8px;
        }
        .pc-invoice-amount-val { font-size: 1.1rem; font-weight: 700; color: var(--text-1, #fff); }
        .pc-invoice-addr-val {
          font-size: 0.75rem; color: var(--text-2, #a0a0a0);
          font-family: 'JetBrains Mono', monospace;
          word-break: break-all;
        }
        .pc-copy-btn {
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 6px;
          color: var(--text-2, #a0a0a0);
          cursor: pointer;
          padding: 5px 7px;
          display: flex; align-items: center;
          flex-shrink: 0; transition: all 0.2s;
        }
        .pc-copy-btn:hover { background: var(--bg-4, #222); color: var(--text-1, #fff); }
        .pc-invoice-expiry {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.73rem; color: var(--pc-amber);
        }

        /* Terms */
        .pc-terms-check {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.78rem; color: var(--text-2, #a0a0a0);
          cursor: pointer; line-height: 1.5;
        }
        .pc-terms-check input[type="checkbox"] {
          flex-shrink: 0;
          width: 16px; height: 16px;
          accent-color: var(--pc-blue);
          margin-top: 1px; cursor: pointer;
        }
        .pc-link { color: var(--pc-blue); text-decoration: none; }
        .pc-link:hover { text-decoration: underline; }

        /* Payment error / success */
        .pc-payment-error {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          color: #fca5a5;
        }
        .pc-payment-error svg { flex-shrink: 0; margin-top: 2px; }
        .pc-payment-error strong { display: block; margin-bottom: 4px; font-size: 0.9rem; }
        .pc-payment-error p { font-size: 0.82rem; margin: 0; }

        .pc-payment-success {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          color: var(--pc-green);
        }
        .pc-payment-success svg { flex-shrink: 0; margin-top: 2px; }
        .pc-payment-success strong { display: block; margin-bottom: 4px; font-size: 0.9rem; }
        .pc-payment-success p { font-size: 0.82rem; margin: 0; }

        /* Pay button */
        .pc-pay-btn {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border: none; border-radius: 12px;
          color: #fff; font-size: 1rem; font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(59,130,246,0.35);
          transition: all 0.3s;
        }
        .pc-pay-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(59,130,246,0.5); }
        .pc-pay-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .pc-pay-loading { cursor: wait; }

        .pc-security-row {
          display: flex; align-items: center; gap: 6px;
          justify-content: center;
          font-size: 0.72rem; color: var(--text-3, #666);
        }

        /* ── Management panel ── */
        .pc-manage-panel { display: flex; flex-direction: column; gap: 24px; }

        .pc-manage-header {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
        }
        .pc-manage-title { font-size: 1.15rem; font-weight: 700; color: var(--text-1, #fff); }
        .pc-current-plan-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 20px;
          font-size: 0.8rem; color: var(--text-2, #a0a0a0);
        }
        .pc-current-plan-badge strong { color: var(--text-1, #fff); }

        .pc-manage-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .pc-manage-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 16px;
          background: var(--bg-2, #111);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 9px;
          color: var(--text-1, #fff);
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .pc-manage-btn:hover { background: var(--bg-3, #1a1a1a); }
        .pc-manage-upgrade { border-color: var(--pc-blue); color: var(--pc-blue); }
        .pc-manage-upgrade:hover { background: rgba(59,130,246,0.1); }
        .pc-manage-cancel { border-color: var(--pc-red); color: var(--pc-red); }
        .pc-manage-cancel:hover { background: rgba(239,68,68,0.1); }
        .pc-manage-cancel-confirm {
          background: rgba(239,68,68,0.1);
          border-color: var(--pc-red);
          color: var(--pc-red);
        }

        /* Cancel flow */
        .pc-cancel-flow { display: flex; flex-direction: column; gap: 16px; }
        .pc-cancel-warning {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.25);
          border-radius: 10px;
          color: #fcd34d;
        }
        .pc-cancel-warning svg { flex-shrink: 0; margin-top: 2px; }
        .pc-cancel-warning strong { display: block; margin-bottom: 4px; font-size: 0.9rem; }
        .pc-cancel-warning p { font-size: 0.82rem; margin: 0; }
        .pc-cancel-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        .pc-cancel-confirmed {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 10px;
          color: var(--pc-green);
        }
        .pc-cancel-confirmed svg { flex-shrink: 0; margin-top: 2px; }
        .pc-cancel-confirmed strong { display: block; margin-bottom: 4px; }
        .pc-cancel-confirmed p { font-size: 0.82rem; margin: 0; }

        /* Payment history */
        .pc-history-section { display: flex; flex-direction: column; gap: 12px; }
        .pc-history-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.92rem; font-weight: 700;
          color: var(--text-1, #fff);
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border, #2a2a2a);
        }
        .pc-history-loading, .pc-history-empty {
          font-size: 0.82rem; color: var(--text-3, #666);
          display: flex; align-items: center; gap: 8px;
        }

        .pc-history-table { display: flex; flex-direction: column; gap: 0; }
        .pc-history-thead {
          display: grid;
          grid-template-columns: 110px 1fr 80px 80px 40px;
          gap: 8px;
          padding: 8px 12px;
          font-size: 0.68rem; font-weight: 600;
          color: var(--text-3, #666);
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border, #2a2a2a);
        }
        .pc-history-row {
          display: grid;
          grid-template-columns: 110px 1fr 80px 80px 40px;
          gap: 8px;
          padding: 11px 12px;
          font-size: 0.82rem;
          color: var(--text-2, #a0a0a0);
          border-bottom: 1px solid var(--border, #2a2a2a);
          align-items: center;
          transition: background 0.15s;
        }
        .pc-history-row:hover { background: var(--bg-2, #111); }
        .pc-history-date { color: var(--text-3, #666); }
        .pc-history-desc { color: var(--text-2, #a0a0a0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pc-history-amount { color: var(--text-1, #fff); font-weight: 600; }

        .pc-status-chip {
          font-size: 0.68rem; font-weight: 700; padding: 3px 8px;
          border-radius: 20px; text-transform: capitalize; display: inline-block;
        }
        .pc-status-paid, .pc-status-succeeded {
          background: rgba(16,185,129,0.15); color: var(--pc-green);
        }
        .pc-status-pending, .pc-status-processing {
          background: rgba(245,158,11,0.15); color: var(--pc-amber);
        }
        .pc-status-failed, .pc-status-refunded {
          background: rgba(239,68,68,0.15); color: var(--pc-red);
        }

        .pc-dl-btn {
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 6px;
          color: var(--text-2, #a0a0a0);
          cursor: pointer;
          padding: 5px 7px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .pc-dl-btn:hover { background: var(--bg-4, #222); color: var(--text-1, #fff); }
        .pc-dl-btn:disabled { opacity: 0.5; cursor: wait; }

        /* ── Footer ── */
        .pc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px;
          background: var(--bg-2, #111);
          border-top: 1px solid var(--border, #2a2a2a);
          flex-shrink: 0; gap: 12px;
        }
        .pc-footer-summary {
          flex: 1; text-align: center;
        }
        .pc-footer-price { font-size: 0.82rem; color: var(--text-3, #666); }

        .pc-nav-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 18px;
          border-radius: 9px;
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          min-width: 100px; justify-content: center;
        }
        .pc-nav-back {
          background: var(--bg-3, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          color: var(--text-2, #a0a0a0);
        }
        .pc-nav-back:hover { background: var(--bg-4, #222); color: var(--text-1, #fff); }
        .pc-nav-back:disabled { opacity: 0.5; cursor: not-allowed; }

        .pc-nav-next {
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: none;
          color: #fff;
          box-shadow: 0 3px 12px rgba(59,130,246,0.3);
        }
        .pc-nav-next:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.45); }
        .pc-nav-next:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        /* Spinner */
        .pc-spin { animation: pc-spin 0.8s linear infinite; }
        @keyframes pc-spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .pc-body { padding: 16px; }
          .pc-breadcrumb { display: none; }
          .pc-history-thead, .pc-history-row {
            grid-template-columns: 90px 1fr 60px 60px 36px;
          }
          .pc-footer { padding: 12px 16px; }
        }
      `}</style>
    </div>
  );
}
