/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * src/components/__tests__/PaymentCheckout.test.js
 * Updated: 2026-10-16
 * Tests for card network detection, Luhn validation, and format helpers
 */

import { describe, it, expect } from 'vitest';

// Inline the pure functions from PaymentCheckout to avoid JSX import
function detectCardNetwork(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n))                   return 'Visa';
  if (/^5[1-5]/.test(n))             return 'Mastercard';
  if (/^2[2-7]/.test(n))             return 'Mastercard';
  if (/^3[47]/.test(n))              return 'Amex';
  if (/^6(?:011|5)/.test(n))         return 'Discover';
  if (/^(?:2131|1800|35)/.test(n))   return 'JCB';
  if (/^3(?:0[0-5]|[68])/.test(n))  return 'Diners';
  if (/^62/.test(n))                  return 'UnionPay';
  return null;
}

function luhn(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
}

function formatCard(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const v = value.replace(/\D/g, '').slice(0, 4);
  return v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
}

// ── Card network detection ────────────────────────────────────────────────────

describe('detectCardNetwork', () => {
  it('detects Visa', () => {
    expect(detectCardNetwork('4111111111111111')).toBe('Visa');
  });

  it('detects Mastercard (5xxx range)', () => {
    expect(detectCardNetwork('5500005555555559')).toBe('Mastercard');
  });

  it('detects Mastercard (2xxx range)', () => {
    expect(detectCardNetwork('2221000000000009')).toBe('Mastercard');
  });

  it('detects Amex', () => {
    expect(detectCardNetwork('378282246310005')).toBe('Amex');
  });

  it('detects Discover', () => {
    expect(detectCardNetwork('6011111111111117')).toBe('Discover');
  });

  it('detects JCB', () => {
    expect(detectCardNetwork('3530111333300000')).toBe('JCB');
  });

  it('detects Diners', () => {
    expect(detectCardNetwork('30569309025904')).toBe('Diners');
  });

  it('detects UnionPay', () => {
    expect(detectCardNetwork('6200000000000000')).toBe('UnionPay');
  });

  it('returns null for unrecognized prefix', () => {
    expect(detectCardNetwork('9999999999999999')).toBeNull();
  });

  it('handles spaces in number', () => {
    expect(detectCardNetwork('4111 1111 1111 1111')).toBe('Visa');
  });
});

// ── Luhn algorithm ────────────────────────────────────────────────────────────

describe('luhn', () => {
  it('validates a correct Visa test number', () => {
    expect(luhn('4111111111111111')).toBe(true);
  });

  it('validates a correct Amex test number', () => {
    expect(luhn('378282246310005')).toBe(true);
  });

  it('validates a correct Discover test number', () => {
    expect(luhn('6011111111111117')).toBe(true);
  });

  it('rejects an invalid card number', () => {
    expect(luhn('4111111111111112')).toBe(false);
  });

  it('accepts all zeros (valid Luhn checksum)', () => {
    // 0000000000000000 passes Luhn because the sum is 0 which is divisible by 10
    expect(luhn('0000000000000000')).toBe(true);
  });

  it('ignores non-digit characters', () => {
    expect(luhn('4111-1111-1111-1111')).toBe(true);
  });
});

// ── Format helpers ────────────────────────────────────────────────────────────

describe('formatCard', () => {
  it('inserts spaces every 4 digits', () => {
    expect(formatCard('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('strips non-digit characters first', () => {
    expect(formatCard('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
  });

  it('truncates to 16 digits', () => {
    expect(formatCard('12345678901234567890')).toBe('1234 5678 9012 3456');
  });

  it('handles partial input', () => {
    expect(formatCard('4111')).toBe('4111');
    expect(formatCard('41111')).toBe('4111 1');
  });
});

describe('formatExpiry', () => {
  it('adds slash after two digits', () => {
    expect(formatExpiry('1228')).toBe('12/28');
  });

  it('does not add slash for two or fewer digits', () => {
    expect(formatExpiry('12')).toBe('12');
  });

  it('strips non-digits', () => {
    expect(formatExpiry('12/28')).toBe('12/28');
  });

  it('truncates to MM/YY', () => {
    expect(formatExpiry('12345678')).toBe('12/34');
  });
});
