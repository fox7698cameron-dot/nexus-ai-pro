/**
 * Payment Service — Stripe, crypto, gift card support
 * All sensitive keys loaded from env vars — never hardcoded
 * @date 2026-08-03
 */

export const PAYMENT_METHODS = {
  card:    { label: 'Credit / Debit Card',  icon: '💳', providers: ['Visa', 'Mastercard', 'Amex', 'Discover'] },
  crypto:  { label: 'Cryptocurrency',        icon: '₿',  providers: ['Bitcoin', 'Ethereum', 'USDC', 'Solana'] },
  giftcard:{ label: 'Gift Card',             icon: '🎁',  providers: ['Nexus Gift Card'] }
};

export async function fetchPlans() {
  const res = await fetch('/api/payments/plans');
  if (!res.ok) throw new Error('Failed to fetch plans');
  return (await res.json()).plans;
}

export async function initiateCheckout({ planId, paymentMethod, token }) {
  const res = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ planId, paymentMethod })
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error || 'Checkout failed');
  }
  return res.json();
}

export function formatPrice(cents, currency = 'USD') {
  if (cents === null || cents === undefined) return 'Custom';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
