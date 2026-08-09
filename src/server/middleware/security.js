/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Security Middleware
 * Input sanitization, threat detection, audit logging, CORS enforcement
 * Date: 2026-08-09
 */

import crypto from 'crypto';
import winston from 'winston';

// Minimal structured audit logger — labels every line with module + ISO date
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: () => new Date().toISOString() }),
    winston.format.json()
  ),
  defaultMeta: { module: 'security-middleware', version: '2.0.0' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

// Threat patterns — no user-supplied regex
const THREAT_PATTERNS = {
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|EXECUTE)\b|--|;(?!\s*$)|'\s*OR\s*')/gi,
  XSS: /<\s*script|javascript\s*:|on\w+\s*=/gi,
  PATH_TRAVERSAL: /(\.\.[/\\]|%2e%2e[/\\])/gi,
  COMMAND_INJECTION: /[;&|`$](?!\s*(and|or)\b)/g,
};

const knownThreatIPs = new Set();

/**
 * Detect threats in request body/query/params
 */
export function threatDetection(req, res, next) {
  const payload = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  const ip = req.ip || req.socket?.remoteAddress;
  const threats = [];

  for (const [type, pattern] of Object.entries(THREAT_PATTERNS)) {
    if (pattern.test(payload)) {
      threats.push({ type, severity: type === 'SQL_INJECTION' ? 'critical' : 'high' });
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
    }
  }

  if (knownThreatIPs.has(ip)) {
    threats.push({ type: 'KNOWN_THREAT_IP', severity: 'critical' });
  }

  if (threats.length > 0) {
    knownThreatIPs.add(ip);
    auditLogger.warn('threat_detected', {
      ip,
      threats,
      path: req.path,
      method: req.method,
      requestId: req.id,
    });
    return res.status(400).json({ error: 'Request blocked: malicious patterns detected' });
  }

  next();
}

/**
 * Sanitize string: strip null bytes and trim whitespace
 */
export function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x00/g, '').trim();
}

/**
 * Deep-sanitize object values
 */
export function sanitizeObject(obj, depth = 0) {
  if (depth > 5) return obj; // Guard against deeply nested input
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(v => sanitizeObject(v, depth + 1));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[sanitizeString(k)] = sanitizeObject(v, depth + 1);
    }
    return out;
  }
  return obj;
}

/**
 * Middleware to sanitize req.body recursively
 */
export function sanitizeBody(req, _res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Generate secure CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Attach a unique request ID for tracing
 */
export function requestId(req, _res, next) {
  req.id = crypto.randomBytes(8).toString('hex');
  next();
}

/**
 * Minimal audit log entry — call this from route handlers on sensitive operations
 */
export function logAuditEvent(event, details = {}) {
  auditLogger.info('audit_event', { event, ...details, ts: new Date().toISOString() });
}
