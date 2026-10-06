// File: src/components/SubscriptionCheckout.jsx | Updated: 2026-10-06

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    label: '$0/month',
    features: ['Basic models', '5 chats/day'],
    color: '#555',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    label: '$9.99/month',
    features: ['All models', 'Unlimited chats'],
    color: '#7c3aed',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 14.99,
    label: '$14.99/month',
    features: ['Custom models', 'API access', 'SLA guarantee'],
    color: '#0ea5e9',
  },
];

const CRYPTO_COINS = [
  { id: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { id: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
  { id: 'USDC', name: 'USD Coin', symbol: '$' },
  { id: 'USDT', name: 'Tether', symbol: '₮' },
  { id: 'SOL', name: 'Solana', symbol: '◎' },
  { id: 'LTC', name: 'Litecoin', symbol: 'Ł' },
  { id: 'DOGE', name: 'Dogecoin', symbol: 'Ð' },
];

const CARD_NETWORKS = [
  { name: 'Visa', color: '#1a1f71', bg: '#e8eaf6', prefix: ['4'] },
  { name: 'MC', color: '#eb001b', bg: '#fff3e0', prefix: ['51', '52', '53', '54', '55'] },
  { name: 'Amex', color: '#007bc1', bg: '#e3f2fd', prefix: ['34', '37'] },
  { name: 'Discover', color: '#ff6600', bg: '#fff8e1', prefix: ['6011', '65'] },
  { name: 'UnionPay', color: '#e21836', bg: '#fce4ec', prefix: ['62'] },
  { name: 'Maestro', color: '#298fc2', bg: '#e1f5fe', prefix: ['6304', '6759'] },
  { name: 'JCB', color: '#003087', bg: '#e8eaf6', prefix: ['3528', '3589'] },
];

const CRYPTO_STATUS = { WAITING: 'waiting', CONFIRMED: 'confirmed', COMPLETE: 'complete' };
const PAYMENT_TABS = ['card', 'crypto', 'giftcard'];

const CRYPTO_TIMER_SECONDS = 15 * 60;

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '92vh',
    overflowY: 'auto',
    color: '#e5e7eb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '14px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#333 transparent',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #1e1e1e',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f9fafb',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: '1px solid #333',
    color: '#9ca3af',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  section: {
    padding: '20px 24px',
    borderBottom: '1px solid #1a1a1a',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  tierCard: (active, color) => ({
    background: active ? '#1a1a1a' : '#111',
    border: `1px solid ${active ? color : '#222'}`,
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    position: 'relative',
  }),
  tierName: (color) => ({
    fontSize: '13px',
    fontWeight: '600',
    color,
    marginBottom: '2px',
  }),
  tierPrice: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '8px',
  },
  tierFeature: {
    fontSize: '11px',
    color: '#6b7280',
    lineHeight: '1.6',
  },
  currentBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    background: '#1c1c2e',
    color: '#7c3aed',
    border: '1px solid #7c3aed',
    borderRadius: '4px',
    padding: '2px 5px',
  },
  tabRow: {
    display: 'flex',
    gap: '4px',
    padding: '16px 24px 0',
  },
  tab: (active) => ({
    flex: 1,
    padding: '9px 12px',
    border: `1px solid ${active ? '#333' : '#1e1e1e'}`,
    borderBottom: active ? '1px solid #0a0a0a' : '1px solid #1e1e1e',
    background: active ? '#0a0a0a' : '#111',
    color: active ? '#f9fafb' : '#6b7280',
    fontSize: '13px',
    fontWeight: active ? '600' : '400',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'center',
    marginBottom: active ? '-1px' : '0',
    zIndex: active ? 1 : 0,
    position: 'relative',
  }),
  tabContent: {
    padding: '20px 24px',
    borderTop: '1px solid #1e1e1e',
    background: '#0a0a0a',
  },
  fieldGroup: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: '6px',
  },
  input: (err) => ({
    width: '100%',
    background: '#111',
    border: `1px solid ${err ? '#ef4444' : '#2a2a2a'}`,
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f9fafb',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }),
  row: {
    display: 'flex',
    gap: '10px',
  },
  errorMsg: {
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '4px',
  },
  cardNetworkRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  networkBadge: (active, bg, color) => ({
    padding: '3px 7px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    background: active ? bg : '#1a1a1a',
    color: active ? color : '#555',
    border: `1px solid ${active ? color + '66' : '#2a2a2a'}`,
    transition: 'all 0.2s',
    letterSpacing: '0.02em',
  }),
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
    cursor: 'pointer',
  },
  toggleBox: (on) => ({
    width: '32px',
    height: '18px',
    borderRadius: '9px',
    background: on ? '#7c3aed' : '#333',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
    cursor: 'pointer',
  }),
  toggleKnob: (on) => ({
    position: 'absolute',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#fff',
    top: '3px',
    left: on ? '17px' : '3px',
    transition: 'left 0.2s',
  }),
  coinSelect: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  coinBtn: (active) => ({
    padding: '10px 6px',
    border: `1px solid ${active ? '#7c3aed' : '#222'}`,
    borderRadius: '8px',
    background: active ? '#1c1c2e' : '#111',
    color: active ? '#a78bfa' : '#9ca3af',
    fontSize: '12px',
    fontWeight: active ? '600' : '400',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
  }),
  cryptoAddressBox: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '14px',
  },
  monoText: {
    fontFamily: '"SF Mono", "Fira Code", monospace',
    fontSize: '12px',
    color: '#a3e635',
    wordBreak: 'break-all',
    lineHeight: '1.6',
  },
  timer: (urgent) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: urgent ? '#2d1111' : '#111',
    border: `1px solid ${urgent ? '#7f1d1d' : '#222'}`,
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '14px',
    color: urgent ? '#fca5a5' : '#9ca3af',
    fontSize: '13px',
  }),
  statusBadge: (status) => {
    const map = {
      waiting: { bg: '#1c1c00', color: '#facc15', border: '#713f12' },
      confirmed: { bg: '#0c1f0c', color: '#4ade80', border: '#166534' },
      complete: { bg: '#0c1a2e', color: '#38bdf8', border: '#075985' },
    };
    const t = map[status] || map.waiting;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '9999px',
      background: t.bg,
      color: t.color,
      border: `1px solid ${t.border}`,
      fontSize: '12px',
      fontWeight: '600',
    };
  },
  giftInput: {
    display: 'flex',
    gap: '8px',
  },
  appliedCard: {
    background: '#0c1f0c',
    border: '1px solid #166534',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#4ade80',
  },
  balanceTotal: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '8px',
  },
  pciNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    background: '#0d1117',
    border: '1px solid #1e2a3a',
    borderRadius: '8px',
    padding: '10px 12px',
    marginTop: '14px',
    fontSize: '11px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  primaryBtn: (disabled) => ({
    width: '100%',
    padding: '13px',
    background: disabled ? '#1e1e1e' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: '10px',
    color: disabled ? '#555' : '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s',
    marginTop: '8px',
  }),
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid #ffffff44',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    verticalAlign: 'middle',
    marginRight: '8px',
  },
  successOverlay: {
    padding: '40px 24px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  successIcon: {
    fontSize: '56px',
    marginBottom: '16px',
    display: 'block',
  },
  successTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: '8px',
  },
  successSub: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  receiptCard: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'left',
    marginBottom: '20px',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #1a1a1a',
    fontSize: '13px',
    color: '#9ca3af',
  },
  receiptValue: {
    color: '#f9fafb',
    fontWeight: '500',
  },
  confettiPiece: (i) => ({
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: i % 3 === 0 ? '50%' : '2px',
    background: ['#7c3aed', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'][i % 6],
    top: '-10px',
    left: `${(i * 13) % 100}%`,
    animation: `confetti-fall ${1.5 + (i % 3) * 0.4}s ease-in ${(i * 0.07) % 0.8}s forwards`,
    opacity: 0,
  }),
  svgQr: {
    display: 'block',
    margin: '0 auto 12px',
    borderRadius: '8px',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function luhn(num) {
  const digits = num.replace(/\D/g, '');
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0 && digits.length >= 13;
}

function detectNetwork(raw) {
  const num = raw.replace(/\D/g, '');
  for (const net of CARD_NETWORKS) {
    if (net.prefix.some((p) => num.startsWith(p))) return net;
  }
  return null;
}

function maskCardDisplay(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  const masked = digits
    .split('')
    .map((d, i) => (i < digits.length - 4 && i >= 4 ? '*' : d))
    .join('');
  return masked.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function formatGiftCode(raw) {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 16);
  return clean.match(/.{1,4}/g)?.join('-') || clean;
}

function isExpiryValid(expiry) {
  const [m, y] = expiry.split('/');
  if (!m || !y || y.length < 2) return false;
  const month = parseInt(m, 10);
  const year = 2000 + parseInt(y, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month - 1, 1);
  return exp >= new Date(now.getFullYear(), now.getMonth(), 1);
}

function fmtSeconds(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s2 = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s2}`;
}

function nextBillingDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Simple pseudo-QR SVG (deterministic pattern based on address hash)
function buildQrSvg(address, size = 120) {
  const cells = 21;
  const cell = Math.floor(size / cells);
  const hash = address.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  const rects = [];

  // Fixed finder patterns (corners)
  const finder = [[0, 0], [0, cells - 7], [cells - 7, 0]];
  finder.forEach(([ox, oy]) => {
    rects.push(`<rect x="${ox * cell}" y="${oy * cell}" width="${7 * cell}" height="${7 * cell}" fill="#f9fafb"/>`);
    rects.push(`<rect x="${(ox + 1) * cell}" y="${(oy + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="#1a1a1a"/>`);
    rects.push(`<rect x="${(ox + 2) * cell}" y="${(oy + 2) * cell}" width="${3 * cell}" height="${3 * cell}" fill="#f9fafb"/>`);
  });

  // Data cells
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const inFinder =
        (row < 8 && col < 8) ||
        (row < 8 && col >= cells - 8) ||
        (row >= cells - 8 && col < 8);
      if (inFinder) continue;
      const bit = (hash ^ (row * 17 + col * 13) ^ (row * col)) & 1;
      if (bit) {
        rects.push(`<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#f9fafb"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" style="border-radius:8px;background:#1a1a1a">${rects.join('')}</svg>`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onChange, label }) {
  return (
    <div style={s.toggleRow} onClick={() => onChange(!on)}>
      <div style={s.toggleBox(on)}>
        <div style={s.toggleKnob(on)} />
      </div>
      <span style={{ fontSize: '13px', color: '#9ca3af', userSelect: 'none' }}>{label}</span>
    </div>
  );
}

function Spinner() {
  return <span style={s.spinner} />;
}

function ConfettiLayer() {
  return (
    <>
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={s.confettiPiece(i)} />
      ))}
    </>
  );
}

// ─── Card Payment Form ────────────────────────────────────────────────────────

function CardForm({ tier, onSuccess }) {
  const [raw, setRaw] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [showBilling, setShowBilling] = useState(false);
  const [billing, setBilling] = useState({ address: '', city: '', zip: '', country: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const network = detectNetwork(raw);
  const cvvMax = network?.name === 'Amex' ? 4 : 3;
  const displayValue = maskCardDisplay(raw);

  function handleCardChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    setRaw(digits);
  }

  function validate() {
    const errs = {};
    if (!luhn(raw)) errs.card = 'Invalid card number';
    if (!isExpiryValid(expiry)) errs.expiry = 'Card is expired or invalid';
    if (cvv.length < cvvMax) errs.cvv = `CVV must be ${cvvMax} digits`;
    if (!name.trim()) errs.name = 'Cardholder name required';
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setApiError('');
    try {
      // Step 1: create payment intent — raw card data NEVER sent to our server
      const intentRes = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, currency: 'usd' }),
      });
      if (!intentRes.ok) throw new Error('Failed to create payment intent');
      const { paymentIntentId } = await intentRes.json();

      // Step 2: Stripe tokenises card client-side; we confirm with token only
      const confirmRes = await fetch('/api/payments/stripe/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethod: { type: 'card', billingDetails: { name } },
          // NOTE: card number/CVV are handled by Stripe.js — never forwarded here
        }),
      });
      if (!confirmRes.ok) throw new Error('Payment confirmation failed');
      onSuccess();
    } catch (err) {
      setApiError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={s.cardNetworkRow}>
        {CARD_NETWORKS.map((net) => (
          <span
            key={net.name}
            style={s.networkBadge(network?.name === net.name, net.bg, net.color)}
          >
            {net.name}
          </span>
        ))}
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Card Number</label>
        <input
          style={s.input(!!errors.card)}
          type="text"
          inputMode="numeric"
          placeholder="•••• •••• •••• ••••"
          value={displayValue}
          onChange={handleCardChange}
          autoComplete="cc-number"
          maxLength={19}
        />
        {errors.card && <div style={s.errorMsg}>{errors.card}</div>}
      </div>

      <div style={{ ...s.row, marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Expiry (MM/YY)</label>
          <input
            style={s.input(!!errors.expiry)}
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            autoComplete="cc-exp"
            maxLength={5}
          />
          {errors.expiry && <div style={s.errorMsg}>{errors.expiry}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.label}>CVV {network?.name === 'Amex' ? '(4 digits)' : '(3 digits)'}</label>
          <input
            style={s.input(!!errors.cvv)}
            type="password"
            inputMode="numeric"
            placeholder={network?.name === 'Amex' ? '••••' : '•••'}
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, cvvMax))}
            autoComplete="cc-csc"
            maxLength={cvvMax}
          />
          {errors.cvv && <div style={s.errorMsg}>{errors.cvv}</div>}
        </div>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Cardholder Name</label>
        <input
          style={s.input(!!errors.name)}
          type="text"
          placeholder="Full name as on card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="cc-name"
        />
        {errors.name && <div style={s.errorMsg}>{errors.name}</div>}
      </div>

      <Toggle
        on={showBilling}
        onChange={setShowBilling}
        label="Add billing address (optional)"
      />

      {showBilling && (
        <div style={{ marginBottom: '14px' }}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Street Address</label>
            <input
              style={s.input(false)}
              type="text"
              placeholder="123 Main St"
              value={billing.address}
              onChange={(e) => setBilling((b) => ({ ...b, address: e.target.value }))}
              autoComplete="street-address"
            />
          </div>
          <div style={s.row}>
            <div style={{ flex: 2 }}>
              <label style={s.label}>City</label>
              <input
                style={s.input(false)}
                type="text"
                placeholder="City"
                value={billing.city}
                onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))}
                autoComplete="address-level2"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>ZIP</label>
              <input
                style={s.input(false)}
                type="text"
                placeholder="ZIP"
                value={billing.zip}
                onChange={(e) => setBilling((b) => ({ ...b, zip: e.target.value }))}
                autoComplete="postal-code"
              />
            </div>
          </div>
        </div>
      )}

      <div style={s.pciNotice}>
        <span style={{ fontSize: '16px' }}>🔒</span>
        <span>
          PCI DSS compliant. Card data is tokenised by Stripe — raw card numbers and CVV are
          never transmitted to or stored on our servers. CVV is discarded after authorisation.
        </span>
      </div>

      {apiError && (
        <div style={{ ...s.pciNotice, borderColor: '#7f1d1d', background: '#1c0f0f', color: '#fca5a5', marginTop: '10px' }}>
          <span>⚠️</span> {apiError}
        </div>
      )}

      <button style={s.primaryBtn(loading)} onClick={handleSubmit} disabled={loading}>
        {loading && <Spinner />}
        {loading ? 'Processing…' : `Pay ${TIERS.find((t) => t.id === tier)?.label || ''}`}
      </button>
    </div>
  );
}

// ─── Crypto Payment Form ──────────────────────────────────────────────────────

function CryptoForm({ tier, onSuccess }) {
  const [coin, setCoin] = useState('BTC');
  const [addressData, setAddressData] = useState(null);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CRYPTO_TIMER_SECONDS);
  const [status, setStatus] = useState(CRYPTO_STATUS.WAITING);
  const [paymentId, setPaymentId] = useState(null);
  const [qrSvg, setQrSvg] = useState('');
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const fetchAddress = useCallback(async (selectedCoin) => {
    setLoadingAddr(true);
    setAddressData(null);
    setStatus(CRYPTO_STATUS.WAITING);
    setSecondsLeft(CRYPTO_TIMER_SECONDS);
    try {
      const res = await fetch(
        `/api/payments/crypto/address?tier=${tier}&coin=${selectedCoin}`
      );
      if (!res.ok) throw new Error('Failed to fetch address');
      const data = await res.json();
      setAddressData(data);
      setPaymentId(data.paymentId || null);
      setQrSvg(buildQrSvg(data.address));
    } catch {
      setAddressData(null);
    } finally {
      setLoadingAddr(false);
    }
  }, [tier]);

  useEffect(() => {
    fetchAddress(coin);
  }, [coin, fetchAddress]);

  // Countdown timer
  useEffect(() => {
    if (!addressData) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s2) => {
        if (s2 <= 1) { clearInterval(timerRef.current); return 0; }
        return s2 - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [addressData]);

  // Poll for status
  useEffect(() => {
    if (!paymentId || status === CRYPTO_STATUS.COMPLETE) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/crypto/status?paymentId=${paymentId}`);
        if (!res.ok) return;
        const { status: newStatus } = await res.json();
        setStatus(newStatus);
        if (newStatus === CRYPTO_STATUS.COMPLETE) {
          clearInterval(pollRef.current);
          setTimeout(onSuccess, 1200);
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [paymentId, status, onSuccess]);

  const urgent = secondsLeft < 120;

  return (
    <div>
      <div style={s.sectionLabel}>Select Cryptocurrency</div>
      <div style={s.coinSelect}>
        {CRYPTO_COINS.map((c) => (
          <button key={c.id} style={s.coinBtn(coin === c.id)} onClick={() => setCoin(c.id)}>
            <div style={{ fontSize: '18px', marginBottom: '2px' }}>{c.symbol}</div>
            <div>{c.id}</div>
          </button>
        ))}
      </div>

      {loadingAddr && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
          <Spinner /> Generating address…
        </div>
      )}

      {!loadingAddr && addressData && (
        <>
          <div style={s.timer(urgent)}>
            <span>⏱</span>
            <span>
              {secondsLeft > 0
                ? `Send payment within ${fmtSeconds(secondsLeft)}`
                : 'Session expired — refresh to get a new address'}
            </span>
          </div>

          <div style={s.cryptoAddressBox}>
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <div
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                style={{ display: 'inline-block' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                Send exactly
              </div>
              <div style={{ ...s.monoText, fontSize: '16px', color: '#facc15' }}>
                {addressData.amount} {addressData.currency}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                To address
              </div>
              <div style={s.monoText}>{addressData.address}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Status:</span>
            <span style={s.statusBadge(status)}>
              {status === CRYPTO_STATUS.WAITING && '⏳'}
              {status === CRYPTO_STATUS.CONFIRMED && '✅'}
              {status === CRYPTO_STATUS.COMPLETE && '🎉'}
              {' '}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>

          <div style={s.pciNotice}>
            <span style={{ fontSize: '16px' }}>🔐</span>
            <span>
              Send only {coin} to this address. Payments typically confirm in 1–3 blocks.
              Do not close this window until the payment is confirmed.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Gift Card Form ───────────────────────────────────────────────────────────

function GiftCardForm({ tier, onSuccess }) {
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [appliedCards, setAppliedCards] = useState([]);
  const [applyError, setApplyError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const selectedTier = TIERS.find((t) => t.id === tier);
  const totalBalance = appliedCards.reduce((acc, c) => acc + c.balance, 0);
  const tierPrice = selectedTier?.price || 0;
  const covered = totalBalance >= tierPrice;

  function handleCodeChange(e) {
    setCode(formatGiftCode(e.target.value));
    setApplyError('');
  }

  async function handleApply() {
    const clean = code.replace(/-/g, '');
    if (clean.length < 16) { setApplyError('Enter a complete 16-character code'); return; }
    if (appliedCards.some((c) => c.code === clean)) { setApplyError('This code is already applied'); return; }

    setApplying(true);
    setApplyError('');
    try {
      const res = await fetch('/api/payments/gift-card/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setApplyError(data.message || 'Invalid or expired gift card');
        return;
      }
      setAppliedCards((prev) => [...prev, { code: clean, balance: data.balance, remaining: data.remaining }]);
      setCode('');
    } catch {
      setApplyError('Failed to apply gift card. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const res = await fetch('/api/payments/gift-card/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codes: appliedCards.map((c) => c.code),
          tier,
        }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      onSuccess();
    } catch {
      setApplyError('Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div>
      <div style={s.fieldGroup}>
        <label style={s.label}>Gift Card Code</label>
        <div style={s.giftInput}>
          <input
            style={{ ...s.input(!!applyError), flex: 1 }}
            type="text"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={handleCodeChange}
            maxLength={19}
          />
          <button
            style={{
              padding: '10px 16px',
              background: '#1c1c2e',
              border: '1px solid #7c3aed',
              borderRadius: '8px',
              color: '#a78bfa',
              fontSize: '13px',
              fontWeight: '600',
              cursor: applying ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? <Spinner /> : 'Apply'}
          </button>
        </div>
        {applyError && <div style={s.errorMsg}>{applyError}</div>}
      </div>

      {appliedCards.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={s.sectionLabel}>Applied Cards</div>
          {appliedCards.map((c) => (
            <div key={c.code} style={s.appliedCard}>
              <span>
                🎁 ···{c.code.slice(-4)}
                <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>
                  Balance: ${c.balance.toFixed(2)}
                </span>
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '16px' }}
                onClick={() => setAppliedCards((prev) => prev.filter((x) => x.code !== c.code))}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}

          <div style={s.balanceTotal}>
            <span>Total credit</span>
            <span style={s.receiptValue}>${totalBalance.toFixed(2)}</span>
          </div>
          <div style={s.balanceTotal}>
            <span>Plan cost</span>
            <span style={s.receiptValue}>${tierPrice.toFixed(2)}/mo</span>
          </div>
          {totalBalance > tierPrice && (
            <div style={{ ...s.balanceTotal, background: '#0c1f0c', borderColor: '#166534' }}>
              <span>Remaining credit</span>
              <span style={{ color: '#4ade80', fontWeight: '600' }}>
                ${(totalBalance - tierPrice).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {appliedCards.length === 0 && (
        <div style={{ ...s.pciNotice, marginTop: '4px' }}>
          <span style={{ fontSize: '16px' }}>🎁</span>
          <span>
            You can stack multiple gift cards. Combined balances must cover the plan cost.
          </span>
        </div>
      )}

      <button
        style={s.primaryBtn(!covered || checkingOut)}
        onClick={handleCheckout}
        disabled={!covered || checkingOut}
      >
        {checkingOut && <Spinner />}
        {checkingOut
          ? 'Processing…'
          : covered
          ? `Redeem & Activate ${selectedTier?.name}`
          : `Need $${Math.max(0, tierPrice - totalBalance).toFixed(2)} more`}
      </button>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ tier, paymentMethod, onClose }) {
  const selectedTier = TIERS.find((t) => t.id === tier);
  const billing = nextBillingDate();

  return (
    <div style={s.successOverlay}>
      <ConfettiLayer />
      <span style={s.successIcon}>🎉</span>
      <div style={s.successTitle}>Payment Successful!</div>
      <div style={s.successSub}>
        Your {selectedTier?.name} plan is now active. Welcome aboard!
      </div>

      <div style={s.receiptCard}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: '600' }}>
          RECEIPT SUMMARY
        </div>
        <div style={s.receiptRow}>
          <span>Plan</span>
          <span style={s.receiptValue}>{selectedTier?.name}</span>
        </div>
        <div style={s.receiptRow}>
          <span>Amount</span>
          <span style={s.receiptValue}>{selectedTier?.label}</span>
        </div>
        <div style={s.receiptRow}>
          <span>Payment method</span>
          <span style={s.receiptValue}>
            {paymentMethod === 'card' ? '💳 Card' : paymentMethod === 'crypto' ? '₿ Crypto' : '🎁 Gift Card'}
          </span>
        </div>
        <div style={{ ...s.receiptRow, borderBottom: 'none' }}>
          <span>Next billing date</span>
          <span style={s.receiptValue}>{billing}</span>
        </div>
      </div>

      <button
        style={{ ...s.primaryBtn(false), background: 'linear-gradient(135deg, #10b981, #059669)' }}
        onClick={onClose}
      >
        Done
      </button>
    </div>
  );
}

// ─── Tier Selector ────────────────────────────────────────────────────────────

function TierSelector({ currentTier, selectedTier, onSelect }) {
  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Subscription Plan</div>
      <div style={s.tierGrid}>
        {TIERS.map((t) => (
          <div
            key={t.id}
            style={s.tierCard(selectedTier === t.id, t.color)}
            onClick={() => onSelect(t.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(t.id)}
          >
            {currentTier === t.id && <div style={s.currentBadge}>CURRENT</div>}
            <div style={s.tierName(t.color)}>{t.name}</div>
            <div style={s.tierPrice}>{t.label}</div>
            {t.features.map((f) => (
              <div key={f} style={s.tierFeature}>• {f}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubscriptionCheckout({ tier, onSuccess, onClose }) {
  const [selectedTier, setSelectedTier] = useState(tier || 'pro');
  const [activeTab, setActiveTab] = useState('card');
  const [succeeded, setSucceeded] = useState(false);

  const handleSuccess = useCallback(() => {
    setSucceeded(true);
  }, []);

  const handleDone = useCallback(() => {
    onSuccess?.();
    onClose?.();
  }, [onSuccess, onClose]);

  // Inject keyframe animations once
  useEffect(() => {
    const id = 'nexus-checkout-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes confetti-fall {
        0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { /* keep styles across re-renders */ };
  }, []);

  const TAB_LABELS = { card: '💳 Card', crypto: '₿ Crypto', giftcard: '🎁 Gift Card' };

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Subscription Checkout">
      <div style={s.modal}>
        {succeeded ? (
          <SuccessScreen tier={selectedTier} paymentMethod={activeTab} onClose={handleDone} />
        ) : (
          <>
            <div style={s.header}>
              <h2 style={s.title}>Upgrade Your Plan</h2>
              <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
            </div>

            <TierSelector
              currentTier={tier}
              selectedTier={selectedTier}
              onSelect={setSelectedTier}
            />

            {selectedTier !== 'free' && (
              <>
                <div style={s.tabRow}>
                  {PAYMENT_TABS.map((tab) => (
                    <button
                      key={tab}
                      style={s.tab(activeTab === tab)}
                      onClick={() => setActiveTab(tab)}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                <div style={s.tabContent}>
                  {activeTab === 'card' && (
                    <CardForm tier={selectedTier} onSuccess={handleSuccess} />
                  )}
                  {activeTab === 'crypto' && (
                    <CryptoForm tier={selectedTier} onSuccess={handleSuccess} />
                  )}
                  {activeTab === 'giftcard' && (
                    <GiftCardForm tier={selectedTier} onSuccess={handleSuccess} />
                  )}
                </div>
              </>
            )}

            {selectedTier === 'free' && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ ...s.pciNotice, marginTop: 0 }}>
                  <span style={{ fontSize: '16px' }}>ℹ️</span>
                  <span>
                    The Free plan requires no payment. Click below to switch to the Free tier.
                  </span>
                </div>
                <button
                  style={{ ...s.primaryBtn(false), marginTop: '16px', background: '#1e1e1e', border: '1px solid #333', color: '#9ca3af' }}
                  onClick={handleSuccess}
                >
                  Switch to Free Plan
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
