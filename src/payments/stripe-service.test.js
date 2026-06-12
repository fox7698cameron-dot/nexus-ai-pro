// src/payments/stripe-service.test.js
// 2026-06-12 | Nexus AI Pro — Stripe Service Tests

import { describe, it, expect } from 'vitest';
import { createGiftCard, redeemGiftCard, PLANS } from './stripe-service.js';

describe('Gift cards', () => {
  it('creates a valid gift code', () => {
    const code = createGiftCard('pro', 30);
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(10);
  });

  it('redeems a valid gift card', () => {
    const code = createGiftCard('enterprise', 60);
    const r = redeemGiftCard(code);
    expect(r.success).toBe(true);
    expect(r.planId).toBe('enterprise');
  });

  it('rejects an already-used code', () => {
    const code = createGiftCard('pro', 30);
    redeemGiftCard(code);
    const r = redeemGiftCard(code);
    expect(r.error).toMatch(/already/i);
  });

  it('rejects a non-existent code', () => {
    const r = redeemGiftCard('FAKE-CODE-XXXX');
    expect(r.error).toMatch(/not found/i);
  });

  it('handles case-insensitive codes', () => {
    const code = createGiftCard('pro', 30);
    const r = redeemGiftCard(code.toLowerCase());
    expect(r.success).toBe(true);
  });
});

describe('PLANS', () => {
  it('has free, pro, enterprise', () => {
    expect(PLANS.free.amount).toBe(0);
    expect(PLANS.pro.amount).toBe(999);
    expect(PLANS.enterprise.amount).toBe(1499);
  });
});

describe('StripeService.createCryptoPaymentRequest', () => {
  it('returns a crypto request object', async () => {
    const { StripeService } = await import('./stripe-service.js');
    const r = StripeService.createCryptoPaymentRequest({ planId: 'pro', userId: 'u1', currency: 'BTC' });
    expect(r.currency).toBe('BTC');
    expect(r.amountUSD).toBe(9.99);
    expect(r.expiresAt).toBeGreaterThan(Date.now());
  });
});
