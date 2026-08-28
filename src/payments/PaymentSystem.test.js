/**
 * src/payments/PaymentSystem.test.js
 * Unit tests for PaymentSystem
 * Date: 2026-08-28
 */
import { describe, it, expect } from 'vitest';
import {
  PLANS,
  SUPPORTED_CARDS,
  CRYPTO_CURRENCIES,
  generateGiftCard,
  redeemGiftCard,
  checkGiftCard,
  createCryptoPayment,
  getCryptoPayment,
  confirmCryptoPayment,
  createOrder,
  updateOrderStatus,
  getOrdersByUser,
} from './PaymentSystem.js';

describe('Plans', () => {
  it('defines 3 tiers', () => {
    expect(Object.keys(PLANS)).toEqual(['free', 'pro', 'enterprise']);
  });
  it('free plan has price 0', () => {
    expect(PLANS.free.priceMonthly).toBe(0);
  });
  it('pro plan has monthly price', () => {
    expect(PLANS.pro.priceMonthly).toBeGreaterThan(0);
  });
});

describe('Supported cards', () => {
  it('includes Visa and Mastercard', () => {
    expect(SUPPORTED_CARDS).toContain('visa');
    expect(SUPPORTED_CARDS).toContain('mastercard');
    expect(SUPPORTED_CARDS).toContain('amex');
  });
});

describe('Crypto currencies', () => {
  it('includes BTC and ETH', () => {
    const symbols = CRYPTO_CURRENCIES.map(c => c.symbol);
    expect(symbols).toContain('BTC');
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('USDT');
    expect(symbols).toContain('USDC');
  });
});

describe('Gift cards', () => {
  it('generates a gift card with correct format', () => {
    const card = generateGiftCard({ amount: 1000, currency: 'usd', createdBy: 'admin' });
    expect(card.code).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/);
    expect(card.balance).toBe(1000);
    expect(card.status).toBe('active');
  });

  it('checkGiftCard returns balance info', () => {
    const card = generateGiftCard({ amount: 500, currency: 'usd', createdBy: 'admin' });
    const info = checkGiftCard(card.code);
    expect(info).not.toBeNull();
    expect(info.balance).toBe(500);
    expect(info.status).toBe('active');
  });

  it('returns null for unknown code', () => {
    expect(checkGiftCard('XXXX-XXXX-XXXX-XXXX')).toBeNull();
  });

  it('redeems gift card successfully', () => {
    const card   = generateGiftCard({ amount: 2000, currency: 'usd', createdBy: 'admin' });
    const result = redeemGiftCard(card.code, 'user-1');
    expect(result.success).toBe(true);
    expect(result.amount).toBe(2000);
  });

  it('rejects double redemption', () => {
    const card = generateGiftCard({ amount: 1000, currency: 'usd', createdBy: 'admin' });
    redeemGiftCard(card.code, 'user-a');
    const result = redeemGiftCard(card.code, 'user-b');
    expect(result.success).toBe(false);
  });
});

describe('Crypto payments', () => {
  it('creates a crypto payment', () => {
    const p = createCryptoPayment({ userId: 'u1', planId: 'pro', amount: 9.99, currency: 'BTC', usdAmount: 9.99 });
    expect(p.id).toBeTruthy();
    expect(p.status).toBe('pending');
    expect(p.address).toBeTruthy();
  });

  it('retrieves a crypto payment', () => {
    const p    = createCryptoPayment({ userId: 'u2', planId: 'pro', amount: 9.99, currency: 'ETH', usdAmount: 9.99 });
    const got  = getCryptoPayment(p.id);
    expect(got).not.toBeNull();
    expect(got.id).toBe(p.id);
  });

  it('confirms a crypto payment', () => {
    const p   = createCryptoPayment({ userId: 'u3', planId: 'pro', amount: 9.99, currency: 'USDT', usdAmount: 9.99 });
    const confirmed = confirmCryptoPayment(p.id, '0xabc123');
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.txHash).toBe('0xabc123');
  });
});

describe('Orders', () => {
  it('creates and updates an order', () => {
    const o = createOrder({ userId: 'u1', planId: 'pro', method: 'stripe', amount: 999, currency: 'usd' });
    expect(o.status).toBe('pending');
    const updated = updateOrderStatus(o.id, 'paid');
    expect(updated.status).toBe('paid');
  });

  it('gets orders by user', () => {
    const uid = 'test-user-order';
    createOrder({ userId: uid, planId: 'pro', method: 'crypto', amount: 999, currency: 'usd' });
    createOrder({ userId: uid, planId: 'enterprise', method: 'gift_card', amount: 1499, currency: 'usd' });
    const orders = getOrdersByUser(uid);
    expect(orders.length).toBeGreaterThanOrEqual(2);
  });
});
