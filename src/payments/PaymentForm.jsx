// Date: 2026-07-20
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Bitcoin, Gift, AlertCircle, Check, Loader2, ShieldCheck } from 'lucide-react';

// Loads Stripe.js lazily using the publishable key from /api/config/stripe
async function getStripe() {
  if (window._stripeInstance) return window._stripeInstance;
  const { loadStripe } = await import('@stripe/stripe-js');
  const res = await fetch('/api/config/stripe');
  const { publishableKey } = await res.json();
  window._stripeInstance = await loadStripe(publishableKey);
  return window._stripeInstance;
}

const CRYPTO_OPTIONS = [
  { id: 'bitcoin', label: 'Bitcoin (BTC)', symbol: '₿', color: 'text-amber-400' },
  { id: 'ethereum', label: 'Ethereum (ETH)', symbol: 'Ξ', color: 'text-purple-400' },
  { id: 'usdc', label: 'USD Coin (USDC)', symbol: '◎', color: 'text-blue-400' },
];

export default function PaymentForm({ planId, planName, amount, annual, onSuccess, onCancel }) {
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'crypto'
  const [cryptoCoin, setCryptoCoin] = useState('bitcoin');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState(null);
  const [billingInfo, setBillingInfo] = useState({
    name: '', email: '', address: '', city: '', state: '', zip: '', country: 'US',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState('');
  const [stripeLoaded, setStripeLoaded] = useState(false);

  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const mountedRef = useRef(false);

  // Mount Stripe Card Element
  useEffect(() => {
    if (paymentMethod !== 'card' || mountedRef.current) return;
    mountedRef.current = true;

    (async () => {
      try {
        const stripe = await getStripe();
        stripeRef.current = stripe;
        const elements = stripe.elements({
          appearance: {
            theme: 'night',
            variables: { colorPrimary: '#7c3aed', colorBackground: '#1f2937', colorText: '#f3f4f6', borderRadius: '8px' },
          },
        });
        const card = elements.create('card', {
          style: {
            base: {
              color: '#f3f4f6',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: '15px',
              '::placeholder': { color: '#6b7280' },
            },
            invalid: { color: '#f87171' },
          },
        });
        card.mount(cardRef.current);
        card.on('ready', () => setCardReady(true));
        card.on('change', (e) => {
          setCardError(e.error ? e.error.message : '');
        });
        cardElementRef.current = card;
        setStripeLoaded(true);
      } catch (err) {
        setError('Failed to load payment form. Please refresh.');
      }
    })();

    return () => {
      if (cardElementRef.current) {
        cardElementRef.current.unmount();
        cardElementRef.current = null;
        mountedRef.current = false;
      }
    };
  }, [paymentMethod]);

  const handleBillingChange = (field) => (e) => {
    setBillingInfo((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePromoCheck = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await fetch('/api/payments/gift-card/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), check: true }),
      });
      const data = await res.json();
      setPromoStatus(data.success
        ? { ok: true, msg: `Code valid! ${data.discount ? `${data.discount}% off applied` : 'Gift card applied'}` }
        : { ok: false, msg: data.error || 'Invalid code' });
    } catch {
      setPromoStatus({ ok: false, msg: 'Could not validate code' });
    }
  };

  const handleCardPayment = async () => {
    if (!stripeRef.current || !cardElementRef.current) return;
    setLoading(true);
    setError('');

    try {
      // Create payment intent server-side
      const intentRes = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, amount, annual, promoCode: promoCode.trim() || undefined }),
      });
      const intentData = await intentRes.json();
      if (!intentData.clientSecret) throw new Error(intentData.error || 'Failed to create payment intent');

      // Confirm with Stripe (handles 3D Secure / SCA automatically)
      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: {
            card: cardElementRef.current,
            billing_details: {
              name: billingInfo.name,
              email: billingInfo.email,
              address: {
                line1: billingInfo.address,
                city: billingInfo.city,
                state: billingInfo.state,
                postal_code: billingInfo.zip,
                country: billingInfo.country,
              },
            },
          },
        }
      );

      if (stripeError) throw new Error(stripeError.message);
      if (paymentIntent.status === 'succeeded') {
        onSuccess?.({ paymentIntent, planId });
      } else {
        throw new Error('Payment not completed. Status: ' + paymentIntent.status);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, amount, annual, paymentType: 'crypto', cryptoCoin }),
      });
      const data = await res.json();
      if (data.cryptoAddress) {
        onSuccess?.({ cryptoAddress: data.cryptoAddress, cryptoAmount: data.cryptoAmount, cryptoCoin, planId });
      } else {
        throw new Error(data.error || 'Failed to create crypto payment');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentMethod === 'card') handleCardPayment();
    else handleCryptoPayment();
  };

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors';

  return (
    <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-auto">
      <h2 className="text-xl font-bold mb-1">Complete Payment</h2>
      <p className="text-gray-400 text-sm mb-5">
        {planName} plan &mdash; <span className="text-violet-400 font-semibold">${amount}/mo</span>
        {annual && <span className="text-green-400 ml-1">(billed annually)</span>}
      </p>

      {/* Payment method selector */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setPaymentMethod('card')}
          className={`flex items-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            paymentMethod === 'card'
              ? 'border-violet-500 bg-violet-950 text-violet-300'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          <CreditCard size={15} className="mx-auto" />
          <span className="hidden sm:inline">Card / Bank</span>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod('crypto')}
          className={`flex items-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            paymentMethod === 'crypto'
              ? 'border-amber-500 bg-amber-950 text-amber-300'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          <Bitcoin size={15} className="mx-auto" />
          <span className="hidden sm:inline">Crypto</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {paymentMethod === 'card' && (
          <>
            {/* Billing info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={billingInfo.name}
                  onChange={handleBillingChange('name')}
                  placeholder="Jane Doe"
                  required
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  type="email"
                  value={billingInfo.email}
                  onChange={handleBillingChange('email')}
                  placeholder="jane@example.com"
                  required
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Billing Address</label>
                <input
                  type="text"
                  value={billingInfo.address}
                  onChange={handleBillingChange('address')}
                  placeholder="123 Main St"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">City</label>
                <input type="text" value={billingInfo.city} onChange={handleBillingChange('city')} placeholder="San Francisco" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">State</label>
                <input type="text" value={billingInfo.state} onChange={handleBillingChange('state')} placeholder="CA" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ZIP</label>
                <input type="text" value={billingInfo.zip} onChange={handleBillingChange('zip')} placeholder="94102" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Country</label>
                <select value={billingInfo.country} onChange={handleBillingChange('country')} className={inputClass}>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Stripe Card Element */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Card Details</label>
              <div
                ref={cardRef}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 min-h-[42px] focus-within:border-violet-500 transition-colors"
              />
              {!stripeLoaded && (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Loader2 size={12} className="animate-spin" />
                  Loading secure card input...
                </div>
              )}
              {cardError && <p className="text-red-400 text-xs mt-1">{cardError}</p>}
            </div>

            {/* Accepted cards */}
            <div className="flex gap-2 text-xs text-gray-600 flex-wrap">
              {['Visa', 'Mastercard', 'Amex', 'Discover', 'Diners', 'JCB', 'UnionPay'].map((c) => (
                <span key={c} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5">{c}</span>
              ))}
            </div>
          </>
        )}

        {paymentMethod === 'crypto' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Select Cryptocurrency</label>
              <div className="grid grid-cols-3 gap-2">
                {CRYPTO_OPTIONS.map((coin) => (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => setCryptoCoin(coin.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition-all ${
                      cryptoCoin === coin.id
                        ? 'border-amber-500 bg-amber-950'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className={`text-xl ${coin.color}`}>{coin.symbol}</span>
                    <span className="text-xs text-gray-400">{coin.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QR placeholder */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-lg mx-auto mb-3 flex items-center justify-center border-2 border-dashed border-gray-600">
                <div className="text-gray-500 text-xs">QR Code<br />generated on<br />payment creation</div>
              </div>
              <p className="text-gray-400 text-xs">
                A wallet address and exact crypto amount will be generated when you click Pay.
                Payment is valid for 30 minutes.
              </p>
            </div>
          </div>
        )}

        {/* Promo / Gift card */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
            <Gift size={11} />
            Promo / Gift Card Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="NEXUS-XXXX"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handlePromoCheck}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
          {promoStatus && (
            <p className={`text-xs mt-1 ${promoStatus.ok ? 'text-green-400' : 'text-red-400'}`}>
              {promoStatus.msg}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950 border border-red-800 rounded-lg p-3 text-sm text-red-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck size={13} className="text-green-600" />
          Secured by Stripe. 3D Secure / SCA handled automatically. We never store your card details.
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (paymentMethod === 'card' && !stripeLoaded)}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {paymentMethod === 'crypto' ? 'Generate Wallet' : `Pay $${amount}`}
          </button>
        </div>
      </form>
    </div>
  );
}
