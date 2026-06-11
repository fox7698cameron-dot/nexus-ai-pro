// src/auth/password.service.js
// Password hashing, strength validation (13+ chars, special chars required)
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import bcryptjs from 'bcryptjs';
import { PASSWORD_MIN_LENGTH } from '../config/constants.js';

const SALT_ROUNDS = 12;

// Strength requirements
const CHECKS = [
  { regex: /.{13,}/, label: 'At least 13 characters' },
  { regex: /[A-Z]/, label: 'Uppercase letter' },
  { regex: /[a-z]/, label: 'Lowercase letter' },
  { regex: /\d/, label: 'Number' },
  { regex: /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/, label: 'Special character' },
];

export function validatePasswordStrength(password) {
  if (typeof password !== 'string') {
    return { valid: false, score: 0, failed: ['Password must be a string'] };
  }
  const failed = CHECKS.filter(c => !c.regex.test(password)).map(c => c.label);
  const score = CHECKS.length - failed.length;
  return { valid: failed.length === 0, score, maxScore: CHECKS.length, failed };
}

export async function hashPassword(plaintext) {
  const { valid, failed } = validatePasswordStrength(plaintext);
  if (!valid) {
    throw new Error(`Password too weak: ${failed.join(', ')}`);
  }
  return bcryptjs.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext, hash) {
  return bcryptjs.compare(plaintext, hash);
}

// Timing-safe comparison wrapper — bcryptjs.compare is already timing-safe
export async function safeVerifyPassword(plaintext, hash) {
  try {
    return await bcryptjs.compare(String(plaintext), String(hash));
  } catch {
    return false;
  }
}
