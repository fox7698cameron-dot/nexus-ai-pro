// Nexus AI Pro - PaymentCheckout | 2026-10-12
import { useState, useEffect, useRef, useCallback } from 'react';

const PLANS = [
  {
    id: 'basic', name: 'Basic', monthlyPrice: 9, annualPrice: 79,
    features: ['5 projects', '10GB storage', 'Community support', 'Basic analytics'],
    highlight: false,
  },
  {
    id: 'pro', name: 'Pro', monthlyPrice: 29, annualPrice: 249,
    features: ['Unlimited projects', '100GB storage', 'Priority support', 'Advanced analytics', 'API access', 'Team collaboration'],
    highlight: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', monthlyPrice: 99, annualPrice: 899,
    features: ['Everything in Pro', '1TB storage', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'Advanced security'],
    highlight: false,
  },
  {
    id: 'custom', name: 'Custom', monthlyPrice: null, annualPrice: null,
    features: ['Custom limits', 'Custom integrations', 'Dedicated account manager', 'Custom SLA'],
    highlight: false,
  },
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

const CRYPTO_OPTIONS = [
  { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC' },
];

function PlanCard({ plan, selected, annual, onSelect }) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  const annualSaving = plan.monthlyPrice && plan.annualPrice
    ? Math.round(((plan.monthlyPrice * 12 - plan.annualPrice) / (plan.monthlyPrice * 12)) * 100)
    : 0;

  return (
    <button
      onClick={() => onSelect(plan.id)}
      className={`text-left p-4 rounded-xl border-2 transition-all w-full ${
        selected
          ? 'border-blue-500 bg-blue-900/20'
          : plan.highlight
          ? 'border-purple-500/50 bg-purple-900/10'
          : 'border-gray-700 bg-gray-800 hover:border-gray-500'
      }`}
      aria-pressed={selected}
      aria-label={`Select ${plan.name} plan`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{plan.name}</span>
            {plan.highlight && (
              <span className="text-xs bg-purple-600 px-1.5 py-0.5 rounded text-white">Popular</span>
            )}
          </div>
          {price ? (
            <div className="mt-1">
              <span className="text-xl font-bold">${price}</span>
              <span className="text-gray-400 text-sm">/{annual ? 'yr' : 'mo'}</span>
              {annual && annualSaving > 0 && (
                <span className="ml-2 text-xs text-green-400">Save {annualSaving}%</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400 mt-1">Contact us</div>
          )}
        </div>
        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'}`} aria-hidden="true" />
      </div>
      <ul className="space-y-1">
        {plan.features.map(f => (
          <li key={f} className="text-xs text-gray-400 flex items-start gap-1.5">
            <span className="text-green-400 flex-shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function CryptoAddress({ currency }) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currency) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/payments/crypto-address?currency=${currency}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(data => { if (!cancelled) { setAddress(data.address); setError(null); } })
      .catch(err => { if (!cancelled) setError(String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currency]);

  if (loading) return <div className="text-gray-400 text-xs animate-pulse">Loading address...</div>;
  if (error) return <div className="text-red-400 text-xs">{error}</div>;
  if (!address) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">Send {currency.toUpperCase()} to:</div>
      <div className="font-mono text-xs text-green-300 break-all bg-gray-700 rounded p-2 mb-2" aria-label={`${currency.toUpperCase()} wallet address`}>
        {address}
      </div>
      {address.qrDataUrl && (
        <img src={address.qrDataUrl} alt={`QR code for ${currency} address`} className="w-28 h-28 mx-auto rounded" />
      )}
      <p className="text-xs text-yellow-400 mt-2">Send exactly the invoice amount to this address. Transactions are irreversible.</p>
    </div>
  );
}

export default function PaymentCheckout({ onComplete }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [annual, setAnnual] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cryptoCurrency, setCryptoCurrency] = useState('eth');
  const [giftCode, setGiftCode] = useState('');
  const [giftResult, setGiftResult] = useState(null);
  const [redeemingGift, setRedeemingGift] = useState(false);
  const [tax, setTax] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);

  const stripeElementsRef = useRef(null);
  const cardElementRef = useRef(null);

  const [billing, setBilling] = useState({ name: '', country: 'US', address: '', city: '', zip: '' });
  const setBillingField = (k, v) => setBilling(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    const stripe = window.Stripe;
    if (!stripe || typeof stripe !== 'function') {
      setStripeReady(false);
      return;
    }
    const instance = stripe(undefined);
    const elements = instance.elements();
    const card = elements.create('card', {
      style: {
        base: { color: '#fff', backgroundColor: 'transparent', fontSize: '14px', '::placeholder': { color: '#9ca3af' } },
        invalid: { color: '#f87171' },
      },
    });
    if (cardElementRef.current && paymentMethod === 'card') {
      card.mount(cardElementRef.current);
    }
    stripeElementsRef.current = { instance, elements, card };
    setStripeReady(true);
    return () => card.unmount?.();
  }, [paymentMethod]);

  const handleGiftRedeem = async () => {
    if (!giftCode.trim()) return;
    setRedeemingGift(true);
    setGiftResult(null);
    try {
      const res = await fetch('/api/payments/redeem-gift-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const data = await res.json();
      setGiftResult(data);
    } catch (err) {
      setGiftResult({ success: false, message: err.message });
    } finally {
      setRedeemingGift(false);
    }
  };

  const fetchTax = useCallback(async () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan?.monthlyPrice || !billing.country) return;
    const amount = annual ? plan.annualPrice : plan.monthlyPrice;
    try {
      const res = await fetch(`/api/payments/tax?amount=${amount}&country=${billing.country}`);
      if (res.ok) {
        const data = await res.json();
        setTax(data);
      }
    } catch {
      // Tax calc is non-critical; silent fail
    }
  }, [selectedPlan, annual, billing.country]);

  useEffect(() => {
    fetchTax();
  }, [fetchTax]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (paymentMethod === 'card') {
        if (!stripeReady || !stripeElementsRef.current) {
          throw new Error('Payment processor not ready');
        }
        const { instance, card } = stripeElementsRef.current;
        const { error: stripeErr, paymentMethod: pm } = await instance.createPaymentMethod({
          type: 'card',
          card,
          billing_details: { name: billing.name, address: { country: billing.country } },
        });
        if (stripeErr) throw new Error(stripeErr.message);

        const res = await fetch('/api/payments/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            plan: selectedPlan,
            annual,
            paymentMethodId: pm.id,
            billing,
            giftCode: giftResult?.success ? giftCode : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Payment failed');
        onComplete?.(data);
      } else if (paymentMethod === 'crypto') {
        const res = await fetch('/api/payments/crypto-initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ plan: selectedPlan, annual, currency: cryptoCurrency }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Failed to initiate crypto payment');
        onComplete?.(data);
      } else if (selectedPlan === 'custom') {
        window.open('mailto:sales@nexusai.pro?subject=Enterprise Plan Inquiry', '_blank');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS.find(p => p.id === selectedPlan);
  const basePrice = plan ? (annual ? plan.annualPrice : plan.monthlyPrice) : null;
  const giftDiscount = giftResult?.success ? (giftResult.discountAmount ?? 0) : 0;
  const taxAmount = tax?.amount ?? 0;
  const total = basePrice ? Math.max(0, basePrice - giftDiscount + taxAmount) : null;

  return (
    <main className="p-4 md:p-6 text-white min-h-screen bg-gray-900 max-w-4xl mx-auto" aria-label="Subscription Checkout">
      <h1 className="text-2xl font-bold mb-2">Choose Your Plan</h1>
      <p className="text-gray-400 text-sm mb-6">Cancel anytime · 14-day free trial · No hidden fees</p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">{error}</div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <span className={`text-sm ${!annual ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
        <button
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual(a => !a)}
          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${annual ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${annual ? 'translate-x-5' : ''}`} />
        </button>
        <span className={`text-sm ${annual ? 'text-white' : 'text-gray-400'}`}>Annual <span className="text-green-400 text-xs">(save up to 25%)</span></span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {PLANS.map(p => (
          <PlanCard key={p.id} plan={p} selected={selectedPlan === p.id} annual={annual} onSelect={setSelectedPlan} />
        ))}
      </div>

      {selectedPlan !== 'custom' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <section aria-label="Payment method">
            <h2 className="font-semibold mb-3">Payment Method</h2>
            <div className="flex gap-2 mb-3">
              {[
                { id: 'card', label: 'Card' },
                { id: 'crypto', label: 'Crypto' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${paymentMethod === m.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  aria-pressed={paymentMethod === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'card' && (
              <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-400">Accepts Visa, Mastercard, American Express, Discover, Debit</p>
                {!stripeReady && (
                  <div className="text-yellow-400 text-sm p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    Payment processor loading... Ensure Stripe is initialized.
                  </div>
                )}
                <div
                  ref={cardElementRef}
                  className="bg-gray-700 rounded-lg p-3 min-h-[42px]"
                  aria-label="Card number input"
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span>🔒</span>
                  PCI-compliant · Card details never touch our servers · Powered by Stripe
                </p>
              </div>
            )}

            {paymentMethod === 'crypto' && (
              <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  {CRYPTO_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCryptoCurrency(c.id)}
                      className={`flex-1 py-2 rounded-lg text-xs transition-colors ${cryptoCurrency === c.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                      aria-pressed={cryptoCurrency === c.id}
                    >
                      {c.symbol}
                    </button>
                  ))}
                </div>
                <CryptoAddress currency={cryptoCurrency} />
              </div>
            )}
          </section>

          <section aria-label="Billing address">
            <h2 className="font-semibold mb-3">Billing Address</h2>
            <div className="bg-gray-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-1" htmlFor="billing-name">Full Name</label>
                <input
                  id="billing-name"
                  required
                  value={billing.name}
                  onChange={e => setBillingField('name', e.target.value)}
                  autoComplete="name"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-1" htmlFor="billing-country">Country</label>
                <select
                  id="billing-country"
                  value={billing.country}
                  onChange={e => setBillingField('country', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-1" htmlFor="billing-address">Address</label>
                <input
                  id="billing-address"
                  value={billing.address}
                  onChange={e => setBillingField('address', e.target.value)}
                  autoComplete="street-address"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1" htmlFor="billing-city">City</label>
                <input
                  id="billing-city"
                  value={billing.city}
                  onChange={e => setBillingField('city', e.target.value)}
                  autoComplete="address-level2"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1" htmlFor="billing-zip">Postal Code</label>
                <input
                  id="billing-zip"
                  value={billing.zip}
                  onChange={e => setBillingField('zip', e.target.value)}
                  autoComplete="postal-code"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section aria-label="Gift card">
            <h2 className="font-semibold mb-3">Gift Card</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={giftCode}
                onChange={e => setGiftCode(e.target.value)}
                placeholder="Enter gift card code"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                aria-label="Gift card code"
              />
              <button
                type="button"
                onClick={handleGiftRedeem}
                disabled={redeemingGift || !giftCode.trim()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {redeemingGift ? '...' : 'Apply'}
              </button>
            </div>
            {giftResult && (
              <p className={`text-xs mt-1 ${giftResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {giftResult.success
                  ? `Applied! Discount: -$${giftResult.discountAmount}`
                  : giftResult.message ?? 'Invalid code'}
              </p>
            )}
          </section>

          <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">{plan.name} ({annual ? 'Annual' : 'Monthly'})</span>
              <span>${basePrice ?? '—'}</span>
            </div>
            {giftDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Gift card discount</span>
                <span>-${giftDiscount}</span>
              </div>
            )}
            {tax && (
              <div className="flex justify-between text-gray-400">
                <span>Tax ({tax.rate}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-gray-700 pt-2">
              <span>Total</span>
              <span>${total?.toFixed(2) ?? '—'}</span>
            </div>
            <p className="text-xs text-gray-500">Cancel anytime · 14-day free trial included</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            aria-label={`Subscribe to ${plan.name} plan`}
          >
            {loading ? 'Processing...' : `Subscribe — $${total?.toFixed(2) ?? '—'}`}
          </button>
        </form>
      )}

      {selectedPlan === 'custom' && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Contact our sales team for a custom quote.</p>
          <a
            href="mailto:sales@nexusai.pro?subject=Custom Plan Inquiry"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors"
          >
            Contact Sales
          </a>
        </div>
      )}
    </main>
  );
}
