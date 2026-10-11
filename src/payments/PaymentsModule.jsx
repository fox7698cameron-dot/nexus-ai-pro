/* src/payments/PaymentsModule.jsx
   Created: 2026-10-11
   Payments Module - Stripe, Crypto, Gift Cards
   Supports: All major credit/debit cards, Crypto (BTC/ETH/USDC), Gift Cards
*/

import React, { useState, useCallback, useEffect } from 'react';
import {
  CreditCard,
  Bitcoin,
  Gift,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  X,
  Download,
  Tag,
  Shield,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Copy,
  ArrowRight,
  Star,
  Zap,
  Building2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    icon: Star,
    color: 'text-gray-500 dark:text-gray-400',
    badge: null,
    features: ['5 projects', '1 GB storage', 'Community support', 'Basic analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    icon: Zap,
    color: 'text-blue-500',
    badge: 'Popular',
    features: ['Unlimited projects', '50 GB storage', 'Priority support', 'Advanced analytics', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 14.99,
    icon: Building2,
    color: 'text-purple-500',
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      '500 GB storage',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Team management',
    ],
  },
];

const CARD_BRANDS = [
  { id: 'visa', name: 'Visa', pattern: /^4/, logo: '💳' },
  { id: 'mastercard', name: 'Mastercard', pattern: /^5[1-5]|^2[2-7]/, logo: '💳' },
  { id: 'amex', name: 'Amex', pattern: /^3[47]/, logo: '💳' },
  { id: 'discover', name: 'Discover', pattern: /^6(?:011|5)/, logo: '💳' },
  { id: 'maestro', name: 'Maestro', pattern: /^(?:5018|5020|5038|6304|6759|676[1-3])/, logo: '💳' },
  { id: 'jcb', name: 'JCB', pattern: /^35(?:2[89]|[3-8])/, logo: '💳' },
  { id: 'unionpay', name: 'UnionPay', pattern: /^62/, logo: '💳' },
  { id: 'diners', name: 'Diners Club', pattern: /^3(?:0[0-5]|[68])/, logo: '💳' },
];

const CRYPTO_OPTIONS = [
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf8x',
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  {
    id: 'ltc',
    name: 'Litecoin',
    symbol: 'LTC',
    color: 'text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    address: 'ltc1qd5g6m0h8s87f9klqzf4nkxx0v3c4z3qj6x8r',
  },
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'giftcard', label: 'Gift Card', icon: Gift },
  { id: 'applepay', label: 'Apple Pay', icon: Smartphone },
  { id: 'googlepay', label: 'Google Pay', icon: Smartphone },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const detectCardBrand = (number) => {
  const digits = number.replace(/\s/g, '');
  return CARD_BRANDS.find((b) => b.pattern.test(digits)) || null;
};

const luhnCheck = (number) => {
  const digits = number.replace(/\s/g, '');
  if (!digits || digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const calcPrice = (plan, isAnnual) => {
  if (plan.monthlyPrice === 0) return 0;
  const monthly = plan.monthlyPrice;
  return isAnnual ? +(monthly * 12 * 0.8).toFixed(2) : monthly;
};

const fmtPrice = (price, isAnnual) =>
  price === 0 ? 'Free' : `$${price.toFixed(2)}${isAnnual ? '/yr' : '/mo'}`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InputField({ label, id, error, className = '', children, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      {children || (
        <input
          id={id}
          className={`w-full px-3 py-2.5 rounded-lg border text-sm
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition
            ${error
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
            }`}
          {...props}
        />
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function PlanCard({ plan, selected, isAnnual, onSelect }) {
  const Icon = plan.icon;
  const price = calcPrice(plan, isAnnual);
  const isSelected = selected === plan.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      className={`relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
    >
      {plan.badge && (
        <span className="absolute -top-2.5 left-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500 text-white">
          {plan.badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        <Icon size={18} className={plan.color} />
        <span className="font-semibold text-gray-900 dark:text-white">{plan.name}</span>
        {isSelected && <Check size={14} className="ml-auto text-blue-500" />}
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">
        {fmtPrice(price, isAnnual)}
        {isAnnual && plan.monthlyPrice > 0 && (
          <span className="ml-2 text-xs text-green-500 font-medium">Save 20%</span>
        )}
      </div>
      <ul className="space-y-1">
        {plan.features.map((f) => (
          <li key={f} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <Check size={11} className="text-green-500 flex-shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function QRPlaceholder({ address, symbol }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      {/* QR grid placeholder */}
      <div className="w-36 h-36 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
        <div className="grid grid-cols-8 gap-0.5 opacity-30">
          {Array.from({ length: 64 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-sm ${Math.random() > 0.5 ? 'bg-gray-900 dark:bg-gray-100' : 'bg-transparent'}`}
            />
          ))}
        </div>
        <span className="absolute text-xs font-bold text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-1 rounded">
          {symbol}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Scan QR or copy address</p>
      <div className="flex items-center gap-2 w-full">
        <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1.5 truncate text-gray-700 dark:text-gray-300 font-mono">
          {address}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          title="Copy address"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500" />}
        </button>
      </div>
    </div>
  );
}

function ThreeDSecureModal({ onComplete, onCancel }) {
  const [step, setStep] = useState('verify'); // verify | otp | success
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep('otp'); }, 1500);
  };

  const handleOtp = () => {
    if (otp.length < 4) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep('success'); setTimeout(onComplete, 1000); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-blue-500" />
            <h3 className="font-bold text-gray-900 dark:text-white">3D Secure Verification</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your bank requires additional verification. Click below to authenticate.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
              🔒 You are being redirected to your bank's secure verification page.
            </div>
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
              {loading ? 'Redirecting…' : 'Authenticate with Bank'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the one-time code sent to your registered mobile number.
            </p>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="------"
              className="w-full text-center text-2xl tracking-widest font-mono px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleOtp}
              disabled={loading || otp.length < 4}
              className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
              {loading ? 'Verifying…' : 'Confirm'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle size={48} className="text-green-500" />
            <p className="font-semibold text-gray-900 dark:text-white">Verified!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completing your payment…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PaymentsModule() {
  // Plan state
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [isAnnual, setIsAnnual] = useState(false);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedCrypto, setSelectedCrypto] = useState('btc');

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [cardName, setCardName] = useState('');
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [cardBrand, setCardBrand] = useState(null);

  // Gift card
  const [giftCode, setGiftCode] = useState('');
  const [giftStatus, setGiftStatus] = useState(null); // null | 'valid' | 'invalid' | 'loading'
  const [giftBalance, setGiftBalance] = useState(null);

  // Coupon
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'valid' | 'invalid' | 'loading'
  const [couponDiscount, setCouponDiscount] = useState(0);

  // UI state
  const [showOrderSummary, setShowOrderSummary] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [show3DS, setShow3DS] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Derived
  const plan = PLANS.find((p) => p.id === selectedPlan);
  const basePrice = calcPrice(plan, isAnnual);
  const discountedPrice = +(basePrice * (1 - couponDiscount)).toFixed(2);
  const giftApplied = giftStatus === 'valid' && giftBalance ? Math.min(giftBalance, discountedPrice) : 0;
  const finalPrice = Math.max(0, +(discountedPrice - giftApplied).toFixed(2));

  // Card number change
  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    setCardBrand(detectCardBrand(formatted));
  };

  // Expiry change
  const handleExpiryChange = (e) => {
    setExpiry(formatExpiry(e.target.value));
  };

  // Validate card form
  const validateCard = useCallback(() => {
    const errors = {};
    const rawCard = cardNumber.replace(/\s/g, '');
    if (!rawCard) errors.cardNumber = 'Card number is required';
    else if (rawCard.length < 13 || !luhnCheck(cardNumber)) errors.cardNumber = 'Invalid card number';

    if (!expiry) errors.expiry = 'Expiry date is required';
    else {
      const [mm, yy] = expiry.split('/');
      const now = new Date();
      const expDate = new Date(2000 + parseInt(yy || '0', 10), parseInt(mm || '0', 10) - 1);
      if (!mm || !yy || mm > 12 || expDate < now) errors.expiry = 'Invalid or expired date';
    }

    if (!cvv) errors.cvv = 'CVV is required';
    else if (cvv.length < 3) errors.cvv = 'CVV must be 3–4 digits';

    if (!cardName.trim()) errors.cardName = 'Cardholder name is required';

    if (!billingAddress.line1.trim()) errors.line1 = 'Address is required';
    if (!billingAddress.city.trim()) errors.city = 'City is required';
    if (!billingAddress.zip.trim()) errors.zip = 'ZIP / postal code is required';

    return errors;
  }, [cardNumber, expiry, cvv, cardName, billingAddress]);

  // Redeem gift card
  const redeemGiftCard = async () => {
    if (!giftCode.trim()) return;
    setGiftStatus('loading');
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setGiftStatus('valid');
        setGiftBalance(data.balance);
      } else {
        setGiftStatus('invalid');
        setGiftBalance(null);
      }
    } catch {
      setGiftStatus('invalid');
    }
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponStatus('loading');
    try {
      const res = await fetch('/api/payments/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon.trim(), plan: selectedPlan }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCouponStatus('valid');
        setCouponDiscount(data.discount); // e.g. 0.1 = 10%
      } else {
        setCouponStatus('invalid');
        setCouponDiscount(0);
      }
    } catch {
      setCouponStatus('invalid');
    }
  };

  // Download invoice
  const downloadInvoice = async () => {
    try {
      const res = await fetch('/api/payments/invoice/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, amount: finalPrice }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-invoice-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* handle download error silently */
    }
  };

  // Submit payment
  const handleSubmit = async (e) => {
    e.preventDefault();
    setPaymentError(null);

    if (paymentMethod === 'card') {
      const errors = validateCard();
      if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
      setFormErrors({});
    }

    setSubmitting(true);

    try {
      // Step 1: Create payment intent
      const intentRes = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billing: isAnnual ? 'annual' : 'monthly',
          amount: Math.round(finalPrice * 100), // cents
          paymentMethod,
          coupon: couponStatus === 'valid' ? coupon : null,
          giftCard: giftStatus === 'valid' ? giftCode : null,
        }),
      });

      const intentData = await intentRes.json();
      if (!intentRes.ok) throw new Error(intentData.error || 'Failed to create payment intent');

      // Step 2: If card, confirm the payment
      if (paymentMethod === 'card') {
        const confirmRes = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: intentData.paymentIntentId,
            card: {
              number: cardNumber.replace(/\s/g, ''),
              expMonth: expiry.split('/')[0],
              expYear: expiry.split('/')[1],
              cvv,
              name: cardName,
            },
            billingAddress,
          }),
        });

        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) throw new Error(confirmData.error || 'Payment confirmation failed');

        // Handle 3DS
        if (confirmData.requiresAction && confirmData.actionType === 'three_d_secure') {
          setSubmitting(false);
          setShow3DS(true);
          return;
        }
      }

      setPaymentSuccess(true);
    } catch (err) {
      setPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handle3DSComplete = async () => {
    setShow3DS(false);
    setPaymentSuccess(true);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You're now on the <strong>{plan.name}</strong> plan. Welcome to Nexus AI Pro!
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Plan</span>
              <span className="font-medium text-gray-900 dark:text-white">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Billing</span>
              <span className="font-medium text-gray-900 dark:text-white">{isAnnual ? 'Annual' : 'Monthly'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Amount charged</span>
              <span className="font-bold text-gray-900 dark:text-white">${finalPrice.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadInvoice}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Download size={15} /> Download Invoice / Receipt
          </button>
          <button
            type="button"
            onClick={() => setPaymentSuccess(false)}
            className="text-sm text-blue-500 hover:underline"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      {show3DS && (
        <ThreeDSecureModal onComplete={handle3DSComplete} onCancel={() => { setShow3DS(false); setSubmitting(false); }} />
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Secure checkout powered by Stripe</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Monthly</span>
          <button
            type="button"
            onClick={() => setIsAnnual((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isAnnual ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            aria-label="Toggle annual billing"
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAnnual ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
            Annual <span className="text-green-500 font-semibold text-xs">Save 20%</span>
          </span>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} selected={selectedPlan} isAnnual={isAnnual} onSelect={setSelectedPlan} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment form — takes 2 cols */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Payment method tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Method</h2>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition
                        ${paymentMethod === m.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                    >
                      <Icon size={14} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card form */}
            {paymentMethod === 'card' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={18} className="text-blue-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Card Details</h2>
                  {cardBrand && (
                    <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">
                      {cardBrand.name}
                    </span>
                  )}
                </div>

                {/* Supported cards legend */}
                <div className="flex flex-wrap gap-1 text-xs text-gray-400 dark:text-gray-500">
                  {CARD_BRANDS.map((b) => (
                    <span key={b.id} className={`px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 ${cardBrand?.id === b.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 text-blue-500' : ''}`}>
                      {b.name}
                    </span>
                  ))}
                </div>

                {/* Card number */}
                <InputField label="Card Number" id="cardNumber" error={formErrors.cardNumber}>
                  <input
                    id="cardNumber"
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono tracking-wider ${formErrors.cardNumber ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                </InputField>
                {formErrors.cardNumber && (
                  <p className="text-xs text-red-500 flex items-center gap-1 -mt-3">
                    <AlertCircle size={12} /> {formErrors.cardNumber}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Expiry */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="expiry" className="text-sm font-medium text-gray-700 dark:text-gray-300">Expiry (MM/YY)</label>
                    <input
                      id="expiry"
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={handleExpiryChange}
                      maxLength={5}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono ${formErrors.expiry ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {formErrors.expiry && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.expiry}</p>}
                  </div>

                  {/* CVV */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="cvv" className="text-sm font-medium text-gray-700 dark:text-gray-300">CVV</label>
                    <div className="relative">
                      <input
                        id="cvv"
                        type={showCvv ? 'text' : 'password'}
                        inputMode="numeric"
                        placeholder="•••"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className={`w-full px-3 py-2.5 pr-9 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono ${formErrors.cvv ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCvv((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showCvv ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {formErrors.cvv && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.cvv}</p>}
                  </div>
                </div>

                {/* Cardholder name */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="cardName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Cardholder Name</label>
                  <input
                    id="cardName"
                    type="text"
                    placeholder="Jane Smith"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${formErrors.cardName ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.cardName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.cardName}</p>}
                </div>

                {/* Billing address */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Billing Address</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="line1" className="text-sm font-medium text-gray-700 dark:text-gray-300">Street Address</label>
                      <input
                        id="line1"
                        type="text"
                        placeholder="123 Main Street"
                        value={billingAddress.line1}
                        onChange={(e) => setBillingAddress((a) => ({ ...a, line1: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${formErrors.line1 ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      />
                      {formErrors.line1 && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.line1}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                        <input
                          id="city"
                          type="text"
                          placeholder="New York"
                          value={billingAddress.city}
                          onChange={(e) => setBillingAddress((a) => ({ ...a, city: e.target.value }))}
                          className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${formErrors.city ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                        {formErrors.city && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.city}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300">State / Region</label>
                        <input
                          id="state"
                          type="text"
                          placeholder="NY"
                          value={billingAddress.state}
                          onChange={(e) => setBillingAddress((a) => ({ ...a, state: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="zip" className="text-sm font-medium text-gray-700 dark:text-gray-300">ZIP / Postal Code</label>
                        <input
                          id="zip"
                          type="text"
                          placeholder="10001"
                          value={billingAddress.zip}
                          onChange={(e) => setBillingAddress((a) => ({ ...a, zip: e.target.value }))}
                          className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${formErrors.zip ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                        {formErrors.zip && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.zip}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                        <select
                          id="country"
                          value={billingAddress.country}
                          onChange={(e) => setBillingAddress((a) => ({ ...a, country: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        >
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="CA">Canada</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="JP">Japan</option>
                          <option value="SG">Singapore</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Crypto section */}
            {paymentMethod === 'crypto' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bitcoin size={18} className="text-orange-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Pay with Crypto</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a cryptocurrency and send the exact amount to the wallet address below. Payments are confirmed after network finality.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CRYPTO_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCrypto(c.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition text-sm font-medium
                        ${selectedCrypto === c.id ? `${c.border} ${c.bg} ${c.color}` : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                      <span className="text-lg">{c.symbol === 'BTC' ? '₿' : c.symbol === 'ETH' ? 'Ξ' : c.symbol === 'USDC' ? '$' : 'Ł'}</span>
                      <span>{c.symbol}</span>
                    </button>
                  ))}
                </div>
                {CRYPTO_OPTIONS.filter((c) => c.id === selectedCrypto).map((c) => (
                  <div key={c.id} className={`rounded-xl border ${c.border} ${c.bg}`}>
                    <div className="px-4 pt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Send exactly <span className={`font-bold ${c.color}`}>${finalPrice.toFixed(2)} USD worth of {c.name}</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Exchange rate applied at time of payment confirmation</p>
                    </div>
                    <QRPlaceholder address={c.address} symbol={c.symbol} />
                  </div>
                ))}
              </div>
            )}

            {/* Gift card section */}
            {paymentMethod === 'giftcard' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gift size={18} className="text-pink-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Redeem Gift Card</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter your gift card code below. Codes are 16 characters (e.g. XXXX-XXXX-XXXX-XXXX).</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={giftCode}
                    onChange={(e) => { setGiftCode(e.target.value.toUpperCase()); setGiftStatus(null); }}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={redeemGiftCard}
                    disabled={giftStatus === 'loading' || !giftCode.trim()}
                    className="px-4 py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {giftStatus === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    Redeem
                  </button>
                </div>
                {giftStatus === 'valid' && giftBalance !== null && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <CheckCircle size={15} />
                    Gift card valid! Balance: <strong>${giftBalance.toFixed(2)}</strong>
                    {giftApplied > 0 && <span className="ml-1 text-green-500">(−${giftApplied.toFixed(2)} applied)</span>}
                  </div>
                )}
                {giftStatus === 'invalid' && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    <AlertCircle size={15} /> Invalid or expired gift card code. Please try again.
                  </div>
                )}
                {giftStatus === 'valid' && finalPrice > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Remaining balance after gift card: <strong className="text-gray-900 dark:text-white">${finalPrice.toFixed(2)}</strong>. Pay the rest with a card.
                  </p>
                )}
                {giftStatus === 'valid' && finalPrice === 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold">Your gift card covers the full amount!</p>
                )}
              </div>
            )}

            {/* Apple Pay placeholder */}
            {paymentMethod === 'applepay' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center shadow-lg">
                  <Smartphone size={32} className="text-white" />
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">Apple Pay</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                  Apple Pay is available on Safari on iOS and macOS devices. Click the button below to authenticate with Touch ID or Face ID.
                </p>
                <div className="w-full max-w-xs bg-black rounded-xl py-3.5 flex items-center justify-center gap-2 text-white font-semibold text-sm cursor-pointer hover:bg-gray-900 transition">
                  <span className="text-lg">🍎</span> Pay with Apple Pay
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Lock size={11} /> End-to-end encrypted</p>
              </div>
            )}

            {/* Google Pay placeholder */}
            {paymentMethod === 'googlepay' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold">
                    <span className="text-blue-500">G</span>
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">Google Pay</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                  Use Google Pay for fast, secure checkout on Chrome and Android devices.
                </p>
                <div className="w-full max-w-xs bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl py-3.5 flex items-center justify-center gap-2 text-gray-900 dark:text-white font-semibold text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <span className="text-lg">G</span> Pay with Google Pay
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Lock size={11} /> End-to-end encrypted</p>
              </div>
            )}

            {/* Coupon code */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={16} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Promo / Coupon Code</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={coupon}
                  onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponStatus(null); setCouponDiscount(0); }}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponStatus === 'loading' || !coupon.trim()}
                  className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {couponStatus === 'loading' ? <RefreshCw size={13} className="animate-spin" /> : null}
                  Apply
                </button>
              </div>
              {couponStatus === 'valid' && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle size={12} /> Code applied! {Math.round(couponDiscount * 100)}% off your order.
                </p>
              )}
              {couponStatus === 'invalid' && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> Invalid or expired code.
                </p>
              )}
            </div>

            {/* Error banner */}
            {paymentError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment Failed</p>
                  <p className="mt-0.5">{paymentError}</p>
                </div>
              </div>
            )}

            {/* Submit */}
            {(paymentMethod === 'card' || (paymentMethod === 'giftcard' && giftStatus === 'valid' && finalPrice === 0)) && (
              <button
                type="submit"
                disabled={submitting || (selectedPlan === 'free')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold text-base transition shadow-md disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><RefreshCw size={18} className="animate-spin" /> Processing…</>
                ) : (
                  <><Lock size={16} /> {selectedPlan === 'free' ? 'Current Plan' : `Pay ${finalPrice > 0 ? `$${finalPrice.toFixed(2)}` : 'Free'}`}</>
                )}
              </button>
            )}

            {paymentMethod === 'crypto' && (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base transition shadow-md"
                onClick={() => alert("Crypto payment confirmed! Awaiting blockchain confirmation.")}
              >
                <Bitcoin size={16} /> I've sent the payment
              </button>
            )}

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
              <Lock size={11} /> Secured by Stripe &bull; PCI DSS compliant &bull; 256-bit SSL
            </p>
          </form>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
              <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setShowOrderSummary((v) => !v)}
              >
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Order Summary</span>
                {showOrderSummary ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>

              {showOrderSummary && (
                <div className="px-5 pb-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{plan.name} Plan</span>
                    <span className="font-medium text-gray-900 dark:text-white">{fmtPrice(basePrice, isAnnual)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Billing cycle</span>
                    <span className="font-medium text-gray-900 dark:text-white">{isAnnual ? 'Annual' : 'Monthly'}</span>
                  </div>
                  {isAnnual && plan.monthlyPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">Annual discount (20%)</span>
                      <span className="text-green-600 dark:text-green-400">−${(plan.monthlyPrice * 12 * 0.2).toFixed(2)}</span>
                    </div>
                  )}
                  {couponStatus === 'valid' && couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">Coupon ({Math.round(couponDiscount * 100)}%)</span>
                      <span className="text-green-600 dark:text-green-400">−${(basePrice * couponDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  {giftApplied > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-pink-600 dark:text-pink-400">Gift card</span>
                      <span className="text-pink-600 dark:text-pink-400">−${giftApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">Total due</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">${finalPrice.toFixed(2)}</span>
                  </div>

                  {/* Features recap */}
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Included</p>
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Check size={11} className="text-green-500" /> {f}
                      </div>
                    ))}
                  </div>

                  {/* Invoice download (available after payment) */}
                  <button
                    type="button"
                    onClick={downloadInvoice}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <Download size={12} /> Download Invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
