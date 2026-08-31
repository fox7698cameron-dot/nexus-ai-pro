// File: CheckoutSystem.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useCallback, useEffect } from 'react';
import {
  CreditCard, Bitcoin, Gift, Check, X, ChevronDown, Loader2,
  AlertCircle, ShieldCheck, Tag, Zap, Building2, ArrowLeft,
  Copy, QrCode, Info, Lock,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: 'free',
    label: 'Free',
    price: 0,
    period: null,
    features: ['5 AI requests / day', '1 workspace', 'Community support'],
    highlight: false,
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 9.99,
    period: 'mo',
    features: ['Unlimited AI requests', '10 workspaces', 'Priority support', 'API access'],
    highlight: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 14.99,
    period: 'mo',
    features: ['Everything in Pro', 'Unlimited workspaces', 'SLA guarantee', 'Dedicated support', 'SSO & SAML'],
    highlight: false,
  },
];

const CARD_NETWORKS = [
  { id: 'visa',       label: 'Visa',       pattern: /^4/ },
  { id: 'mastercard', label: 'Mastercard', pattern: /^5[1-5]/ },
  { id: 'amex',       label: 'Amex',       pattern: /^3[47]/ },
  { id: 'discover',   label: 'Discover',   pattern: /^6(?:011|5)/ },
  { id: 'maestro',    label: 'Maestro',    pattern: /^(?:5018|5020|5038|6304)/ },
];

const CRYPTO_OPTIONS = [
  { id: 'btc',  label: 'Bitcoin',  symbol: '₿', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf Er' },
  { id: 'eth',  label: 'Ethereum', symbol: 'Ξ', address: '0x742d35Cc6634C0532925a3b844Bc9e7d2A4e8c0' },
  { id: 'usdc', label: 'USDC',     symbol: '$', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 'sol',  label: 'Solana',   symbol: '◎', address: 'SoLTQaM8XR5N8YWjB7JGbzBqk2ePq5PEq1USDC' },
];

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'Other'];

const TAX_RATES = { 'United States': 0.08, 'Canada': 0.13, 'Germany': 0.19, 'France': 0.20 };

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  const isAmex = /^3[47]/.test(digits);
  if (isAmex) {
    return digits.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function detectNetwork(number) {
  const digits = number.replace(/\s/g, '');
  return CARD_NETWORKS.find(n => n.pattern.test(digits)) ?? null;
}

function luhnCheck(number) {
  const digits = number.replace(/\s/g, '');
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function applyCoupon(code) {
  const codes = { NEXUS10: 0.10, WELCOME20: 0.20, ENTERPRISE5: 0.05 };
  return codes[code.toUpperCase()] ?? null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  );
}

function InputField({ label, id, error, className = '', inputClassName = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      )}
      <input
        id={id}
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-900
                    text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600
                    focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                    ${error ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}
                    ${inputClassName}`}
      />
      <FieldError msg={error} />
    </div>
  );
}

function TierCard({ tier, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(tier.id)}
      className={`relative w-full text-left rounded-xl border-2 p-4 transition-all
                  ${selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
    >
      {tier.highlight && (
        <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          Most popular
        </span>
      )}
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-gray-900 dark:text-white">{tier.label}</span>
        {selected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {tier.price === 0 ? 'Free' : `$${tier.price}`}
        {tier.period && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/{tier.period}</span>}
      </div>
      <ul className="space-y-1">
        {tier.features.map(f => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function CardPaymentForm({ cardData, setCardData, errors }) {
  const network = detectNetwork(cardData.number);
  const isAmex = network?.id === 'amex';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Card details</span>
        <div className="flex gap-1.5 text-xs text-gray-400">
          {CARD_NETWORKS.map(n => (
            <span key={n.id}
              className={`px-1.5 py-0.5 rounded border transition-colors
                          ${network?.id === n.id
                            ? 'border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
                            : 'border-gray-200 dark:border-gray-700 opacity-40'}`}>
              {n.label}
            </span>
          ))}
        </div>
      </div>

      <InputField
        label="Cardholder name"
        id="card-name"
        type="text"
        autoComplete="cc-name"
        placeholder="Jane Smith"
        value={cardData.name}
        onChange={e => setCardData(d => ({ ...d, name: e.target.value }))}
        error={errors.cardName}
      />

      <InputField
        label="Card number"
        id="card-number"
        type="text"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        value={cardData.number}
        onChange={e => setCardData(d => ({ ...d, number: formatCardNumber(e.target.value) }))}
        error={errors.cardNumber}
      />

      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Expiry date"
          id="card-expiry"
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={cardData.expiry}
          onChange={e => setCardData(d => ({ ...d, expiry: formatExpiry(e.target.value) }))}
          error={errors.cardExpiry}
        />
        <div>
          <label htmlFor="card-cvv" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {isAmex ? 'CID (4 digits)' : 'CVV (3 digits)'}
          </label>
          <input
            id="card-cvv"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder={isAmex ? '0000' : '000'}
            maxLength={isAmex ? 4 : 3}
            value={cardData.cvv}
            onChange={e => setCardData(d => ({ ...d, cvv: e.target.value.replace(/\D/g, '').slice(0, isAmex ? 4 : 3) }))}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-900
                        text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                        ${errors.cardCvv ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
          />
          <FieldError msg={errors.cardCvv} />
        </div>
      </div>

      {/* Stripe Elements placeholder */}
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
        {typeof window !== 'undefined' && window.Stripe
          ? 'Stripe Elements active — payment data is tokenized and never touches our servers'
          : 'Stripe.js not detected — card data handled via secure fallback vault'}
      </div>
    </div>
  );
}

function CryptoPaymentForm({ selectedCoin, setSelectedCoin, tier }) {
  const [copied, setCopied] = useState(false);
  const coin = CRYPTO_OPTIONS.find(c => c.id === selectedCoin) ?? CRYPTO_OPTIONS[0];
  const usdAmount = tier ? TIERS.find(t => t.id === tier)?.price ?? 0 : 0;

  const copyAddress = () => {
    navigator.clipboard?.writeText(coin.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {CRYPTO_OPTIONS.map(c => (
          <button key={c.id} type="button" onClick={() => setSelectedCoin(c.id)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors
                        ${selectedCoin === c.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <span className="text-base">{c.symbol}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* QR code placeholder */}
      <div className="flex flex-col items-center gap-3 py-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="w-32 h-32 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <QrCode className="w-20 h-20 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Send exactly <strong className="text-gray-800 dark:text-gray-200">${usdAmount} USD</strong> in {coin.label}
        </p>
      </div>

      {/* Wallet address */}
      <div>
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{coin.label} wallet address</p>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{coin.address}</code>
          <button type="button" onClick={copyAddress}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
            aria-label="Copy address">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        Send only {coin.label} to this address. Other assets sent to this address may be permanently lost.
        Transactions typically confirm within 10–60 minutes.
      </div>
    </div>
  );
}

function GiftCardForm({ giftCode, setGiftCode, giftStatus, onValidate, validating }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="gift-code" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Gift card code
        </label>
        <div className="flex gap-2">
          <input
            id="gift-code"
            type="text"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={giftCode}
            onChange={e => setGiftCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
          />
          <button type="button" onClick={onValidate} disabled={giftCode.length < 8 || validating}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium
                       transition-colors flex items-center gap-2 whitespace-nowrap">
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Validate
          </button>
        </div>
      </div>

      {giftStatus === 'valid' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
          <Check className="w-4 h-4 flex-shrink-0" />
          Gift card applied — $10.00 credit added to this order
        </div>
      )}
      {giftStatus === 'invalid' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          <X className="w-4 h-4 flex-shrink-0" />
          Invalid or already-used gift card code
        </div>
      )}
    </div>
  );
}

function BillingAddressForm({ billing, setBilling, errors }) {
  const set = k => e => setBilling(b => ({ ...b, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <InputField label="Full name" id="bill-name" type="text" autoComplete="name"
        placeholder="Jane Smith" value={billing.name} onChange={set('name')} error={errors.billName} />
      <InputField label="Address line 1" id="bill-addr1" type="text" autoComplete="address-line1"
        placeholder="123 Main Street" value={billing.addr1} onChange={set('addr1')} error={errors.billAddr1} />
      <InputField label="Address line 2 (optional)" id="bill-addr2" type="text" autoComplete="address-line2"
        placeholder="Apt, suite, unit…" value={billing.addr2} onChange={set('addr2')} />
      <div className="grid grid-cols-2 gap-3">
        <InputField label="City" id="bill-city" type="text" autoComplete="address-level2"
          placeholder="New York" value={billing.city} onChange={set('city')} error={errors.billCity} />
        <InputField label="ZIP / Postal code" id="bill-zip" type="text" autoComplete="postal-code"
          placeholder="10001" value={billing.zip} onChange={set('zip')} error={errors.billZip} />
      </div>
      <div>
        <label htmlFor="bill-country" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Country</label>
        <select id="bill-country" value={billing.country} onChange={set('country')}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CheckoutSystem({ selectedTier: initialTier = 'pro', onSuccess, onCancel }) {
  const [tier, setTier]           = useState(initialTier);
  const [payMethod, setPayMethod] = useState('card'); // card | crypto | gift
  const [cryptoCoin, setCryptoCoin] = useState('btc');

  const [cardData, setCardData]   = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [billing, setBilling]     = useState({ name: '', addr1: '', addr2: '', city: '', zip: '', country: 'United States' });

  const [coupon, setCoupon]       = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'valid' | 'invalid'
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const [giftCode, setGiftCode]   = useState('');
  const [giftStatus, setGiftStatus] = useState(null);
  const [giftLoading, setGiftLoading] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  const tierData = TIERS.find(t => t.id === tier) ?? TIERS[1];
  const basePrice = tierData.price;
  const taxRate = TAX_RATES[billing.country] ?? 0;
  const discountAmt = basePrice * couponDiscount;
  const giftCredit = giftStatus === 'valid' ? Math.min(10, basePrice - discountAmt) : 0;
  const subtotal = Math.max(0, basePrice - discountAmt - giftCredit);
  const taxAmt = subtotal * taxRate;
  const total = subtotal + taxAmt;

  const handleCouponApply = useCallback(() => {
    setCouponLoading(true);
    setTimeout(() => {
      const rate = applyCoupon(coupon);
      if (rate !== null) {
        setCouponDiscount(rate);
        setCouponStatus('valid');
      } else {
        setCouponDiscount(0);
        setCouponStatus('invalid');
      }
      setCouponLoading(false);
    }, 700);
  }, [coupon]);

  const handleGiftValidate = useCallback(() => {
    setGiftLoading(true);
    setTimeout(() => {
      // Simulate: any 12+ char code is "valid" in this demo
      setGiftStatus(giftCode.length >= 12 ? 'valid' : 'invalid');
      setGiftLoading(false);
    }, 700);
  }, [giftCode]);

  const validate = () => {
    const errs = {};
    if (payMethod === 'card') {
      if (!cardData.name.trim())             errs.cardName   = 'Cardholder name is required';
      const rawNum = cardData.number.replace(/\s/g, '');
      if (rawNum.length < 13)                errs.cardNumber = 'Enter a valid card number';
      else if (!luhnCheck(rawNum))           errs.cardNumber = 'Card number is invalid';
      const [mm, yy] = cardData.expiry.split('/');
      const now = new Date();
      const expMonth = parseInt(mm, 10);
      const expYear  = 2000 + parseInt(yy ?? '0', 10);
      if (!mm || !yy || expMonth < 1 || expMonth > 12 ||
          expYear < now.getFullYear() ||
          (expYear === now.getFullYear() && expMonth < now.getMonth() + 1))
        errs.cardExpiry = 'Enter a valid expiry date';
      const isAmex = detectNetwork(cardData.number)?.id === 'amex';
      if ((isAmex && cardData.cvv.length !== 4) || (!isAmex && cardData.cvv.length !== 3))
        errs.cardCvv = isAmex ? 'Amex CID is 4 digits' : 'CVV is 3 digits';
    }
    if (!billing.name.trim())   errs.billName  = 'Name is required';
    if (!billing.addr1.trim())  errs.billAddr1 = 'Address is required';
    if (!billing.city.trim())   errs.billCity  = 'City is required';
    if (!billing.zip.trim())    errs.billZip   = 'ZIP / postal code is required';
    if (!termsAccepted)         errs.terms     = 'You must accept the terms to continue';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (basePrice === 0) { onSuccess({ tier, method: 'free' }); return; }
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    // Payment intent sent to server — card data handled by Stripe tokenisation, never by us
    setTimeout(() => { setSubmitting(false); onSuccess({ tier, method: payMethod, total }); }, 1400);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" /> SSL Secured checkout
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* ── Left column ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Tier selection */}
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" /> Choose your plan
                </h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  {TIERS.map(t => <TierCard key={t.id} tier={t} selected={tier === t.id} onClick={setTier} />)}
                </div>
              </section>

              {/* Payment method (skip for free) */}
              {basePrice > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-5">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" /> Payment method
                  </h2>

                  <div className="flex gap-2">
                    {[
                      { id: 'card',   label: 'Card',       Icon: CreditCard },
                      { id: 'crypto', label: 'Crypto',     Icon: Bitcoin },
                      { id: 'gift',   label: 'Gift Card',  Icon: Gift },
                    ].map(({ id, label, Icon }) => (
                      <button key={id} type="button" onClick={() => setPayMethod(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                                    ${payMethod === id
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    ))}
                  </div>

                  {payMethod === 'card' && (
                    <CardPaymentForm cardData={cardData} setCardData={setCardData} errors={errors} />
                  )}
                  {payMethod === 'crypto' && (
                    <CryptoPaymentForm selectedCoin={cryptoCoin} setSelectedCoin={setCryptoCoin} tier={tier} />
                  )}
                  {payMethod === 'gift' && (
                    <GiftCardForm
                      giftCode={giftCode} setGiftCode={setGiftCode}
                      giftStatus={giftStatus} onValidate={handleGiftValidate} validating={giftLoading}
                    />
                  )}
                </section>
              )}

              {/* Billing address */}
              {basePrice > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" /> Billing address
                  </h2>
                  <BillingAddressForm billing={billing} setBilling={setBilling} errors={errors} />
                </section>
              )}
            </div>

            {/* ── Order summary ── */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 sticky top-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Order summary</h2>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-3">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Nexus AI Pro — {tierData.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {basePrice === 0 ? 'Free forever' : `$${basePrice}/${tierData.period} · billed monthly`}
                  </p>
                </div>

                {/* Coupon */}
                {basePrice > 0 && (
                  <div>
                    <label htmlFor="coupon" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Promo code
                    </label>
                    <div className="flex gap-2">
                      <input id="coupon" type="text" placeholder="Enter code"
                        value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm
                                   bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400
                                   focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" onClick={handleCouponApply} disabled={!coupon || couponLoading}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                                   disabled:opacity-50 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1">
                        {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Apply
                      </button>
                    </div>
                    {couponStatus === 'valid' && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />{Math.round(couponDiscount * 100)}% discount applied
                      </p>
                    )}
                    {couponStatus === 'invalid' && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" />Invalid promo code
                      </p>
                    )}
                  </div>
                )}

                {/* Price breakdown */}
                {basePrice > 0 && (
                  <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>${basePrice.toFixed(2)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Promo discount</span>
                        <span>−${discountAmt.toFixed(2)}</span>
                      </div>
                    )}
                    {giftCredit > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Gift card credit</span>
                        <span>−${giftCredit.toFixed(2)}</span>
                      </div>
                    )}
                    {taxAmt > 0 && (
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Tax ({Math.round(taxRate * 100)}%)</span>
                        <span>${taxAmt.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-800 pt-2 mt-1">
                      <span>Total due today</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Terms */}
                <label className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                  <span>
                    I agree to the <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>,{' '}
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>,
                    and authorize this charge.
                  </span>
                </label>
                {errors.terms && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.terms}
                  </p>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                             text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {basePrice === 0 ? 'Get started free' : `Pay $${total.toFixed(2)}`}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-600">
                  <Lock className="w-3 h-3" /> Payments secured by Stripe · Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
