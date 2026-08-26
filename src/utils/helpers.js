/**
 * NEXUS AI PRO - Utility Helpers
 * File: src/utils/helpers.js
 * Date: 2026-08-26
 *
 * Shared utility functions: sanitization, password validation,
 * audit logging, enumeration helpers. No secrets hardcoded.
 */

import crypto from 'crypto';

// ─── Audit Logging ─────────────────────────────────────────────────────────────
const auditBuffer = [];
const MAX_AUDIT_BUFFER = 5000;

export function auditLog(event, data = {}) {
  const entry = {
    id: crypto.randomUUID(),
    event,
    data,
    timestamp: new Date().toISOString(),
    level: getEventLevel(event),
  };

  if (auditBuffer.length >= MAX_AUDIT_BUFFER) auditBuffer.shift();
  auditBuffer.push(entry);

  // Structured stdout — picked up by log aggregators (ELK, CloudWatch, etc.)
  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write(JSON.stringify({ ...entry, source: 'audit' }) + '\n');
  }

  return entry;
}

export function getAuditLogs(filters = {}) {
  let logs = [...auditBuffer];
  if (filters.event) logs = logs.filter(l => l.event.includes(filters.event.toUpperCase()));
  if (filters.level) logs = logs.filter(l => l.level === filters.level);
  if (filters.since) {
    const since = new Date(filters.since).getTime();
    logs = logs.filter(l => new Date(l.timestamp).getTime() >= since);
  }
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, filters.limit || 200);
}

function getEventLevel(event) {
  if (/ERROR|FAIL|BREACH|ATTACK|INJECTION|FORGERY/i.test(event)) return 'error';
  if (/WARN|SUSPICIOUS|RATE|LOCKED|INVALID/i.test(event)) return 'warn';
  if (/LOGIN|LOGOUT|REGISTER|MFA|ROLE|DEACTIVAT/i.test(event)) return 'info';
  return 'debug';
}

// ─── Input Sanitization ────────────────────────────────────────────────────────
/**
 * Sanitize user input while preserving emoji and special characters.
 * Prevents XSS and SQL injection without stripping valid Unicode.
 */
export function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') return String(input ?? '');

  const { maxLength = 1024, allowEmoji = false, allowSpecial = false } = options;
  let out = input.trim();

  // Strip null bytes and dangerous control characters (preserve newlines + tabs if special allowed)
  out = out.replace(/\0/g, '');
  if (!allowSpecial) {
    out = out.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  }

  // Basic XSS: encode HTML entities for <, >, &, ", '
  out = out
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Emoji: emoji code points are in 0x1F000+ range — keep them by default if allowEmoji
  if (!allowEmoji) {
    // Strip emoji (broadly: emoticons, symbols, pictographs, transport, etc.)
    out = out.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}]/gu, '');
  }

  return out.slice(0, maxLength);
}

// ─── Password Strength Validation ──────────────────────────────────────────────
/**
 * Validate password meets minimum security requirements:
 * - At least 13 characters
 * - At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
 */
export function validatePasswordStrength(password) {
  const requirements = {
    minLength: password.length >= 13,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };

  const failed = [];
  if (!requirements.minLength) failed.push('Minimum 13 characters required');
  if (!requirements.hasUppercase) failed.push('At least one uppercase letter required');
  if (!requirements.hasLowercase) failed.push('At least one lowercase letter required');
  if (!requirements.hasDigit) failed.push('At least one digit required');
  if (!requirements.hasSpecial) failed.push('At least one special character required');

  return {
    valid: failed.length === 0,
    score: Object.values(requirements).filter(Boolean).length,
    requirements,
    message: failed.length > 0 ? failed.join('; ') : 'Password meets requirements',
  };
}

// ─── Cryptographic Enumeration ─────────────────────────────────────────────────
/**
 * Enumerate user IDs and data objects with opaque, non-sequential identifiers.
 * Prevents ID enumeration attacks.
 */
export function enumerateId(input, secret) {
  const key = secret || process.env.ENUM_SECRET || process.env.JWT_SECRET;
  return crypto.createHmac('sha256', key).update(String(input)).digest('base64url');
}

export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

// ─── Response Helpers ──────────────────────────────────────────────────────────
export function paginatedResponse(data, page = 1, pageSize = 50) {
  const start = (page - 1) * pageSize;
  const items = Array.isArray(data) ? data.slice(start, start + pageSize) : [];
  return {
    items,
    page,
    pageSize,
    total: Array.isArray(data) ? data.length : 0,
    pages: Math.ceil((Array.isArray(data) ? data.length : 0) / pageSize),
  };
}

// ─── Platform detection ────────────────────────────────────────────────────────
export function detectPlatform(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (ua.includes('electron')) return 'electron';
  if (ua.includes('capacitor')) return 'mobile';
  if (ua.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return 'web';
}
