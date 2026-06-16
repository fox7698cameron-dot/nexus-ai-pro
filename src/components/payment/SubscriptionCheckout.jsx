// File: SubscriptionCheckout.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState } from 'react';
import { CreditCard, Bitcoin, Gift, Check, AlertCircle, Lock, ChevronDown, X } from 'lucide-react';

const PLAN_DETAILS = {
  free: { name: 'Free Plan', price: 0, description: 'Basic access' },
  pro: { name: 'Pro Plan', price: 19, description: 'Full platform access' },
  enterprise: { name: 'Enterprise Plan', price: 99, description: 'Teams & advanced compliance' },
};

const CRYPTO_ADDRESSES = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf5r',
  ETH: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  USDT: 'TN3W4H6rK2ce4vX9YnFQHwKx8Vj5JQ4wsh',
};

function PaymentMethodButton({ id, active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
        active
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function CryptoModal({ onClose, plan, billing }) {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(CRYPTO_ADDRESSES[selectedCoin]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-orange-500" />
            Pay with Crypto
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Send payment to the address below. Your subscription will be activated after 2 network confirmations.
        </p>

        <div className="flex gap-2 mb-4">
          {Object.keys(CRYPTO_ADDRESSES).map((coin) => (
            <button
              key={coin}
              onClick={() => setSelectedCoin(coin)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedCoin === coin
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {coin}
            </button>
          ))}
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
          <p className="text-xs text-gray-400 mb-1">{selectedCoin} Address</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all flex-1">
              {CRYPTO_ADDRESSES[selectedCoin]}
            </code>
            <button onClick={copy} className="text-indigo-500 hover:text-indigo-600 flex-shrink-0 text-xs font-medium">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
            Amount: ${PLAN_DETAILS[plan]?.price || 0} USD equivalent
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Current rate will be calculated at time of payment</p>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition">
          Close
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionCheckout({ plan = 'pro', billing = 'monthly', onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [giftCode, setGiftCode] = useState('');
  const [giftApplied, setGiftApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [billing_addr, setBillingAddr] = useState({
    line1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.pro;
  const price = billing === 'annual' ? Math.round(planInfo.price * 0.8) : planInfo.price;
  const annualTotal = billing === 'annual' ? price * 12 : null;

  const formatCardNumber = (v) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const applyGiftCard = async () => {
    if (!giftCode.trim()) return;
    try {
      const res = await fetch('/api/subscriptions/gift-card/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid gift card');
      setGiftApplied(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'crypto') {
      setShowCryptoModal(true);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billing,
          paymentMethod,
          giftCode: giftApplied ? giftCode : undefined,
          billingAddress: billing_addr,
          // Card details would be tokenized via Stripe.js in production
          cardToken: '[stripe-token-placeholder]',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment failed');
      setSuccess(true);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Welcome to {planInfo.name}. Your subscription is now active.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      {showCryptoModal && (
        <CryptoModal plan={plan} billing={billing} onClose={() => setShowCryptoModal(false)} />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Checkout</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">256-bit SSL encrypted payment</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sticky top-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{planInfo.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">${price}/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Billing</span>
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{billing}</span>
                </div>
                {annualTotal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Annual total</span>
                    <span className="text-gray-700 dark:text-gray-300">${annualTotal}</span>
                  </div>
                )}
                {giftApplied && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Gift card applied</span>
                    <span>- discount</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                  <span>Total due today</span>
                  <span>${price}</span>
                </div>
              </div>

              {/* Card logos */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-600 text-white">VISA</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white">MC</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-800 text-white">AMEX</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-500 text-white">DISC</span>
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Payment method selector */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  <PaymentMethodButton id="card" active={paymentMethod === 'card'} icon={CreditCard} label="Card" onClick={setPaymentMethod} />
                  <PaymentMethodButton id="apple_pay" active={paymentMethod === 'apple_pay'} icon={() => <span className="text-sm">🍎</span>} label="Apple Pay" onClick={setPaymentMethod} />
                  <PaymentMethodButton id="google_pay" active={paymentMethod === 'google_pay'} icon={() => <span className="text-sm">G</span>} label="Google Pay" onClick={setPaymentMethod} />
                  <PaymentMethodButton id="crypto" active={paymentMethod === 'crypto'} icon={Bitcoin} label="Crypto" onClick={setPaymentMethod} />
                  <PaymentMethodButton id="gift_card" active={paymentMethod === 'gift_card'} icon={Gift} label="Gift Card" onClick={setPaymentMethod} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Card fields */}
                {paymentMethod === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Jane Doe"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                      {/* Stripe Card Element placeholder */}
                      <div className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-xs">Stripe Card Element (iframe) — requires Stripe.js loaded</span>
                      </div>
                      <input
                        type="text"
                        value={card.number}
                        onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                        placeholder="4242 4242 4242 4242 (fallback)"
                        maxLength={19}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry</label>
                        <input
                          type="text"
                          value={card.expiry}
                          onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVC</label>
                        <input
                          type="text"
                          value={card.cvc}
                          onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Apple / Google Pay */}
                {(paymentMethod === 'apple_pay' || paymentMethod === 'google_pay') && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {paymentMethod === 'apple_pay' ? '🍎 Apple Pay' : '🔵 Google Pay'} button will appear here once Stripe Payment Request Button is initialized.
                    </p>
                  </div>
                )}

                {/* Gift card */}
                {paymentMethod === 'gift_card' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gift Card Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={giftCode}
                        onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX-XXXX"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={applyGiftCard}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          giftApplied
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {giftApplied ? <><Check className="w-4 h-4 inline mr-1" />Applied</> : 'Apply'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Crypto */}
                {paymentMethod === 'crypto' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      Click "Pay Now" to see crypto payment addresses (BTC, ETH, USDT).
                    </p>
                  </div>
                )}

                {/* Billing address */}
                {(paymentMethod === 'card' || paymentMethod === 'gift_card') && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Billing Address</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={billing_addr.line1}
                        onChange={(e) => setBillingAddr((b) => ({ ...b, line1: e.target.value }))}
                        placeholder="Street address"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={billing_addr.city}
                          onChange={(e) => setBillingAddr((b) => ({ ...b, city: e.target.value }))}
                          placeholder="City"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={billing_addr.zip}
                          onChange={(e) => setBillingAddr((b) => ({ ...b, zip: e.target.value }))}
                          placeholder="ZIP / Postal Code"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={billing_addr.country}
                          onChange={(e) => setBillingAddr((b) => ({ ...b, country: e.target.value }))}
                          className="appearance-none w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="JP">Japan</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {isLoading ? 'Processing…' : `Pay $${price}${paymentMethod === 'crypto' ? ' (view crypto address)' : ''}`}
                </button>

                <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secured by Stripe · 256-bit SSL · Cancel anytime
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
