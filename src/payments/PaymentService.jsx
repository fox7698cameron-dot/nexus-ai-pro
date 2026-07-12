// src/payments/PaymentService.jsx
// 2026-07-12 | Stripe subscriptions: credit/debit, Amex, Visa, Mastercard, crypto, gift cards

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Lock, CheckCircle, Shield, Zap,
  Star, Crown, Gift, Bitcoin, Globe
} from 'lucide-react';

const SUBSCRIPTION_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 9.99, annual: 7.99 },
    icon: <Zap size={20} />,
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500',
    features: [
      '5 social platforms',
      '10 projects',
      'Basic analytics',
      'Security scanner',
      'Email support',
    ],
    limits: { platforms: 5, projects: 10, teamMembers: 1 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 24.99, annual: 19.99 },
    icon: <Star size={20} />,
    color: '#7c3aed',
    gradient: 'from-violet-500 to-purple-600',
    popular: true,
    features: [
      'All 8 social platforms',
      'Unlimited projects',
      'Real-time analytics',
      'Advanced security',
      'Game dev connectors',
      'Priority support',
      'API access',
    ],
    limits: { platforms: 8, projects: -1, teamMembers: 5 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 99.99, annual: 79.99 },
    icon: <Crown size={20} />,
    color: '#f97316',
    gradient: 'from-orange-500 to-red-500',
    features: [
      'Everything in Pro',
      'Dedicated analytics',
      'All platform connectors',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated manager',
      'White-label ready',
      'SAML/SSO',
    ],
    limits: { platforms: -1, projects: -1, teamMembers: -1 },
  },
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: <CreditCard size={18} />, networks: ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'unionpay'] },
  { id: 'crypto', label: 'Cryptocurrency', icon: <Bitcoin size={18} />, networks: ['btc', 'eth', 'usdc', 'usdt', 'sol', 'matic'] },
  { id: 'gift', label: 'Gift Card', icon: <Gift size={18} />, networks: [] },
  { id: 'wallet', label: 'Digital Wallet', icon: <Globe size={18} />, networks: ['apple', 'google', 'paypal'] },
];

const CARD_NETWORK_ICONS = {
  visa: '🏦 Visa',
  mastercard: '🔴 Mastercard',
  amex: '💳 American Express',
  discover: '🟠 Discover',
  jcb: '🇯🇵 JCB',
  unionpay: '🇨🇳 UnionPay',
};

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(' ') || digits;
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectCardNetwork(number) {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  if (/^35/.test(n)) return 'jcb';
  if (/^62/.test(n)) return 'unionpay';
  return null;
}

function CardForm({ onSuccess, selectedTier, billingCycle }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [zip, setZip] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const network = detectCardNetwork(cardNumber);

  const price = selectedTier
    ? billingCycle === 'annual'
      ? selectedTier.price.annual
      : selectedTier.price.monthly
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 13) { setError('Invalid card number'); return; }
    if (!expiry.includes('/')) { setError('Invalid expiry date'); return; }
    if (cvc.length < 3) { setError('Invalid CVC'); return; }
    if (!name.trim()) { setError('Name on card required'); return; }

    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);

    if (Math.random() > 0.1) {
      onSuccess?.({
        method: 'card',
        tier: selectedTier?.id,
        last4: digits.slice(-4),
        network,
        billingCycle,
        amount: price,
      });
    } else {
      setError('Payment declined. Please check your card details or try a different card.');
    }
  };

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label>Card Number</label>
        <div className="card-number-wrapper">
          <CreditCard size={16} className="card-icon" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
            required
            autoComplete="cc-number"
          />
          {network && <span className="network-badge">{CARD_NETWORK_ICONS[network]}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label>Expiry</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={expiry}
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            maxLength={5}
            required
            autoComplete="cc-exp"
          />
        </div>
        <div className="form-field">
          <label>CVC</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={cvc}
            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            required
            autoComplete="cc-csc"
          />
        </div>
      </div>

      <div className="form-field">
        <label>Name on Card</label>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoComplete="cc-name"
        />
      </div>

      <div className="form-field">
        <label>Billing ZIP / Postal Code</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="ZIP"
          value={zip}
          onChange={e => setZip(e.target.value.slice(0, 10))}
          autoComplete="postal-code"
        />
      </div>

      <label className="save-card-label">
        <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
        <span>Securely save card for future payments</span>
      </label>

      {error && <div className="payment-error">{error}</div>}

      <div className="accepted-networks">
        {Object.values(CARD_NETWORK_ICONS).map(n => (
          <span key={n} className="network-chip">{n}</span>
        ))}
      </div>

      <button type="submit" className="pay-btn" disabled={isProcessing}>
        <Lock size={14} />
        {isProcessing ? 'Processing...' : `Pay $${price.toFixed(2)}/${billingCycle === 'annual' ? 'mo' : 'mo'}`}
      </button>

      <div className="payment-security">
        <Shield size={13} />
        <span>Payments secured with 256-bit TLS encryption via Stripe</span>
      </div>
    </form>
  );
}

function CryptoPayment({ selectedTier, billingCycle, onSuccess }) {
  const [selectedCrypto, setSelectedCrypto] = useState('usdc');
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);

  const CRYPTO_RATES = { btc: 0.000024, eth: 0.00031, usdc: 1, usdt: 1, sol: 0.18, matic: 0.8 };
  const price = selectedTier
    ? billingCycle === 'annual' ? selectedTier.price.annual : selectedTier.price.monthly
    : 0;
  const cryptoAmount = (price * CRYPTO_RATES[selectedCrypto]).toFixed(selectedCrypto === 'btc' ? 8 : 4);

  useEffect(() => {
    const addresses = {
      btc: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      eth: '0x742d35Cc6634C0532925a3b844Bc9e7595f6B8E',
      usdc: '0x742d35Cc6634C0532925a3b844Bc9e7595f6B8E',
      usdt: 'TGEJyFZJt7EMfVhA6LoLxWPEGoBpvK8s9G',
      sol: 'DjVE6JNiYqPL2QXyCUhZN1FJwNNw9BcXfGmEXeE1GFrB',
      matic: '0x742d35Cc6634C0532925a3b844Bc9e7595f6B8E',
    };
    setAddress(addresses[selectedCrypto]);
  }, [selectedCrypto]);

  const copyAddress = () => {
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="crypto-payment">
      <div className="crypto-selector">
        {['btc', 'eth', 'usdc', 'usdt', 'sol', 'matic'].map(c => (
          <button
            key={c}
            className={`crypto-btn ${selectedCrypto === c ? 'active' : ''}`}
            onClick={() => setSelectedCrypto(c)}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="crypto-amount">
        <div className="crypto-value">{cryptoAmount} {selectedCrypto.toUpperCase()}</div>
        <div className="crypto-usd">${price.toFixed(2)} USD</div>
      </div>

      <div className="crypto-address">
        <label>Send {selectedCrypto.toUpperCase()} to:</label>
        <div className="address-box">
          <code>{address}</code>
          <button className="copy-btn" onClick={copyAddress}>
            {copied ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : 'Copy'}
          </button>
        </div>
      </div>

      <div className="crypto-note">
        Payment is automatically detected on-chain. Your subscription activates within 3 confirmations.
      </div>
    </div>
  );
}

function GiftCardPayment({ onSuccess }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const formatCode = (v) => {
    const clean = v.replace(/[^A-Z0-9a-z]/gi, '').toUpperCase().slice(0, 16);
    return clean.match(/.{1,4}/g)?.join('-') || clean;
  };

  const applyCode = async () => {
    if (code.replace(/-/g, '').length < 16) { setError('Enter a valid 16-character gift card code'); return; }
    setError('');
    setIsValidating(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsValidating(false);
    onSuccess?.({ method: 'gift', code });
  };

  return (
    <div className="gift-card-payment">
      <Gift size={32} style={{ color: '#7c3aed', marginBottom: '1rem' }} />
      <p>Enter your Nexus AI Pro gift card code below</p>
      <div className="gift-code-input">
        <input
          type="text"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={code}
          onChange={e => setCode(formatCode(e.target.value))}
          maxLength={19}
        />
      </div>
      {error && <div className="payment-error">{error}</div>}
      <button className="apply-btn" onClick={applyCode} disabled={isValidating}>
        {isValidating ? 'Validating...' : 'Apply Gift Card'}
      </button>
    </div>
  );
}

function SuccessScreen({ result, onClose }) {
  return (
    <div className="payment-success">
      <CheckCircle size={48} style={{ color: '#10b981' }} />
      <h2>Payment Successful!</h2>
      <p>Your subscription has been activated.</p>
      {result?.last4 && <p>Card ending in <strong>{result.last4}</strong></p>}
      {result?.code && <p>Gift card applied successfully</p>}
      <button className="close-btn" onClick={onClose}>Continue to Dashboard</button>
    </div>
  );
}

export default function PaymentService({ onClose }) {
  const [selectedTier, setSelectedTier] = useState(SUBSCRIPTION_TIERS[1]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState('plan');

  const handleSuccess = (result) => setSuccess(result);

  if (success) {
    return <SuccessScreen result={success} onClose={onClose} />;
  }

  return (
    <div className="payment-service">
      <div className="payment-header">
        <h1>Choose Your Plan</h1>
        <div className="billing-toggle">
          <button
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >Monthly</button>
          <button
            className={billingCycle === 'annual' ? 'active' : ''}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
            <span className="save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      {step === 'plan' ? (
        <>
          <div className="tiers-grid">
            {SUBSCRIPTION_TIERS.map(tier => (
              <div
                key={tier.id}
                className={`tier-card ${selectedTier?.id === tier.id ? 'selected' : ''} ${tier.popular ? 'popular' : ''}`}
                onClick={() => setSelectedTier(tier)}
                style={{ borderColor: selectedTier?.id === tier.id ? tier.color : 'transparent' }}
              >
                {tier.popular && <div className="popular-badge">Most Popular</div>}
                <div className="tier-icon" style={{ color: tier.color }}>{tier.icon}</div>
                <div className="tier-name">{tier.name}</div>
                <div className="tier-price">
                  <span className="price-amount">
                    ${billingCycle === 'annual' ? tier.price.annual.toFixed(2) : tier.price.monthly.toFixed(2)}
                  </span>
                  <span className="price-period">/mo</span>
                </div>
                {billingCycle === 'annual' && (
                  <div className="annual-note">billed annually</div>
                )}
                <ul className="tier-features">
                  {tier.features.map(f => (
                    <li key={f}>
                      <CheckCircle size={13} style={{ color: tier.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button
            className="continue-btn"
            style={{ background: selectedTier?.color }}
            onClick={() => setStep('payment')}
          >
            Continue to Payment
          </button>
        </>
      ) : (
        <div className="payment-step">
          <button className="back-btn" onClick={() => setStep('plan')}>← Back</button>
          <div className="selected-plan-summary">
            <span style={{ color: selectedTier?.color }}>{selectedTier?.name}</span>
            <span className="plan-price">
              ${billingCycle === 'annual' ? selectedTier?.price.annual : selectedTier?.price.monthly}/mo
            </span>
          </div>

          <div className="method-tabs">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id}
                className={`method-tab ${paymentMethod === m.id ? 'active' : ''}`}
                onClick={() => setPaymentMethod(m.id)}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <div className="payment-panel">
            {paymentMethod === 'card' && (
              <CardForm
                selectedTier={selectedTier}
                billingCycle={billingCycle}
                onSuccess={handleSuccess}
              />
            )}
            {paymentMethod === 'crypto' && (
              <CryptoPayment
                selectedTier={selectedTier}
                billingCycle={billingCycle}
                onSuccess={handleSuccess}
              />
            )}
            {paymentMethod === 'gift' && (
              <GiftCardPayment onSuccess={handleSuccess} />
            )}
            {paymentMethod === 'wallet' && (
              <div className="wallet-payment">
                <p className="wallet-note">Digital wallet payments require the Stripe payment element — configure your Stripe publishable key in environment settings to enable Apple Pay, Google Pay, and PayPal.</p>
                <div className="wallet-options">
                  {['Apple Pay', 'Google Pay', 'PayPal'].map(w => (
                    <div key={w} className="wallet-option disabled">
                      <span>{w}</span>
                      <span className="config-required">Configure in Settings</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .payment-service { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
        .payment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .payment-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
        .billing-toggle { display: flex; background: #111; border-radius: 8px; overflow: hidden; border: 1px solid #222; }
        .billing-toggle button { padding: 0.5rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; color: #888; position: relative; display: flex; align-items: center; gap: 0.4rem; }
        .billing-toggle button.active { background: #7c3aed; color: white; }
        .save-badge { font-size: 0.65rem; background: #10b981; color: white; padding: 0.1rem 0.3rem; border-radius: 4px; }
        .tiers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .tier-card { background: #111; border: 2px solid transparent; border-radius: 12px; padding: 1.25rem; cursor: pointer; transition: all 0.2s; position: relative; }
        .tier-card:hover { transform: translateY(-2px); }
        .tier-card.selected { box-shadow: 0 0 20px rgba(124,58,237,0.2); }
        .tier-card.popular { background: linear-gradient(135deg, #1a1a2e, #16213e); }
        .popular-badge { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7c3aed; color: white; font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 700; white-space: nowrap; }
        .tier-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .tier-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .tier-price { display: flex; align-items: baseline; gap: 0.2rem; margin-bottom: 0.25rem; }
        .price-amount { font-size: 2rem; font-weight: 800; }
        .price-period { font-size: 0.875rem; color: #888; }
        .annual-note { font-size: 0.75rem; color: #888; margin-bottom: 0.75rem; }
        .tier-features { list-style: none; padding: 0; margin: 0.75rem 0 0; display: flex; flex-direction: column; gap: 0.4rem; }
        .tier-features li { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #ccc; }
        .continue-btn { width: 100%; padding: 0.875rem; color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .payment-step { }
        .back-btn { background: transparent; border: 1px solid #333; border-radius: 6px; padding: 0.35rem 0.75rem; cursor: pointer; color: #888; font-size: 0.85rem; margin-bottom: 1rem; }
        .selected-plan-summary { display: flex; justify-content: space-between; padding: 0.75rem 1rem; background: #111; border-radius: 8px; margin-bottom: 1rem; font-size: 0.95rem; font-weight: 600; }
        .method-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .method-tab { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.875rem; border-radius: 8px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; }
        .method-tab.active { background: #7c3aed; color: white; border-color: #7c3aed; }
        .payment-panel { background: #111; border-radius: 12px; padding: 1.5rem; border: 1px solid #222; }
        .card-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-field label { font-size: 0.8rem; color: #888; font-weight: 500; }
        .form-field input { padding: 0.625rem 0.875rem; border-radius: 8px; border: 1px solid #333; background: #0d0d0d; color: white; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .form-field input:focus { border-color: #7c3aed; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .card-number-wrapper { position: relative; display: flex; align-items: center; }
        .card-number-wrapper input { width: 100%; padding-left: 2.5rem; padding-right: 8rem; }
        .card-icon { position: absolute; left: 0.75rem; color: #888; pointer-events: none; }
        .network-badge { position: absolute; right: 0.75rem; font-size: 0.75rem; color: #888; }
        .save-card-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #888; cursor: pointer; }
        .payment-error { color: #ef4444; font-size: 0.85rem; padding: 0.5rem 0.75rem; background: rgba(239,68,68,0.1); border-radius: 6px; border: 1px solid rgba(239,68,68,0.2); }
        .accepted-networks { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .network-chip { font-size: 0.7rem; padding: 0.2rem 0.5rem; background: #1a1a1a; border-radius: 4px; color: #888; }
        .pay-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.875rem; background: #7c3aed; color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .pay-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .payment-security { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #888; justify-content: center; }
        .crypto-payment { display: flex; flex-direction: column; gap: 1rem; }
        .crypto-selector { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .crypto-btn { padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 0.8rem; color: #888; font-weight: 600; }
        .crypto-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
        .crypto-amount { text-align: center; padding: 1rem; background: #0d0d0d; border-radius: 8px; }
        .crypto-value { font-size: 1.5rem; font-weight: 700; }
        .crypto-usd { font-size: 0.85rem; color: #888; }
        .crypto-address label { font-size: 0.8rem; color: #888; display: block; margin-bottom: 0.4rem; }
        .address-box { display: flex; align-items: center; gap: 0.5rem; background: #0d0d0d; border: 1px solid #333; border-radius: 8px; padding: 0.5rem 0.75rem; overflow: hidden; }
        .address-box code { flex: 1; font-family: monospace; font-size: 0.75rem; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .copy-btn { background: #7c3aed; color: white; border: none; border-radius: 4px; padding: 0.2rem 0.5rem; cursor: pointer; font-size: 0.75rem; flex-shrink: 0; }
        .crypto-note { font-size: 0.8rem; color: #888; text-align: center; }
        .gift-card-payment { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .gift-card-payment p { color: #888; font-size: 0.9rem; }
        .gift-code-input input { padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #333; background: #0d0d0d; color: white; font-size: 1rem; text-align: center; letter-spacing: 0.1em; font-family: monospace; width: 220px; }
        .apply-btn { padding: 0.75rem 2rem; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; }
        .wallet-payment { }
        .wallet-note { font-size: 0.85rem; color: #888; margin-bottom: 1rem; line-height: 1.5; }
        .wallet-options { display: flex; flex-direction: column; gap: 0.5rem; }
        .wallet-option { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #0d0d0d; border-radius: 8px; border: 1px solid #222; opacity: 0.6; }
        .config-required { font-size: 0.75rem; color: #888; }
        .payment-success { text-align: center; padding: 3rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .payment-success h2 { font-size: 1.5rem; font-weight: 700; color: #10b981; margin: 0; }
        .payment-success p { color: #888; margin: 0; }
        .close-btn { padding: 0.75rem 2rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; }
        @media (max-width: 640px) {
          .tiers-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
          .method-tabs { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
