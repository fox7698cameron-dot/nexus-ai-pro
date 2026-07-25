// src/routes/payments.test.js — Updated: 2026-07-25
import { describe, it, expect } from 'vitest';

describe('Luhn card validation', () => {
  function luhnCheck(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (isEven) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  it('validates a real Visa test card number', () => {
    expect(luhnCheck('4111111111111111')).toBe(true);
  });

  it('validates a real Mastercard test card number', () => {
    expect(luhnCheck('5500005555555559')).toBe(true);
  });

  it('validates an Amex test card number', () => {
    expect(luhnCheck('371449635398431')).toBe(true);
  });

  it('rejects an invalid card number', () => {
    expect(luhnCheck('1234567890123456')).toBe(false);
  });

  it('handles card numbers with spaces and dashes', () => {
    expect(luhnCheck('4111 1111 1111 1111')).toBe(true);
    expect(luhnCheck('4111-1111-1111-1111')).toBe(true);
  });
});

describe('Card brand detection', () => {
  function detectCardBrand(number) {
    const n = number.replace(/\D/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6(?:011|5)/.test(n)) return 'discover';
    if (/^35(?:2[89]|[3-8])/.test(n)) return 'jcb';
    if (/^62/.test(n)) return 'unionpay';
    if (/^3(?:0[0-5]|[68])/.test(n)) return 'diners';
    if (/^(?:50|6[37])/.test(n)) return 'maestro';
    return 'unknown';
  }

  it('detects Visa', () => expect(detectCardBrand('4111111111111111')).toBe('visa'));
  it('detects Mastercard', () => expect(detectCardBrand('5500005555555559')).toBe('mastercard'));
  it('detects Amex', () => expect(detectCardBrand('371449635398431')).toBe('amex'));
  it('detects Discover', () => expect(detectCardBrand('6011111111111117')).toBe('discover'));
  it('detects UnionPay', () => expect(detectCardBrand('6200000000000005')).toBe('unionpay'));
  it('returns unknown for unknown prefix', () => expect(detectCardBrand('9999999999999999')).toBe('unknown'));
});

describe('Plan validation', () => {
  const PLANS = {
    free: { name: 'Free', monthlyPrice: 0, yearlyPrice: 0 },
    pro: { name: 'Pro', monthlyPrice: 999, yearlyPrice: 9590 },
    enterprise: { name: 'Enterprise', monthlyPrice: 1499, yearlyPrice: 14390 }
  };

  it('free plan has zero price', () => {
    expect(PLANS.free.monthlyPrice).toBe(0);
    expect(PLANS.free.yearlyPrice).toBe(0);
  });

  it('pro annual is cheaper than 12 months of monthly', () => {
    expect(PLANS.pro.yearlyPrice).toBeLessThan(PLANS.pro.monthlyPrice * 12);
  });

  it('enterprise annual is cheaper than 12 months of monthly', () => {
    expect(PLANS.enterprise.yearlyPrice).toBeLessThan(PLANS.enterprise.monthlyPrice * 12);
  });

  it('all plans have name, monthlyPrice, yearlyPrice', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('monthlyPrice');
      expect(plan).toHaveProperty('yearlyPrice');
    }
  });
});

describe('Gift card code normalization', () => {
  it('normalizes to uppercase and trims', () => {
    const normalize = (code) => code?.toUpperCase().trim();
    expect(normalize('nexus-2026-demo')).toBe('NEXUS-2026-DEMO');
    expect(normalize('  NEXUS-TEST-1234  ')).toBe('NEXUS-TEST-1234');
  });
});
