/**
 * src/middleware/security.js
 * Security Middleware: threat detection, input sanitization, CSP, anomaly detection
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

/** Shared real-time threat event bus */
export const threatBus = new EventEmitter();
threatBus.setMaxListeners(100);

/** In-memory anomaly store (replace with Redis in production) */
const anomalyStore = new Map();

/**
 * Sanitize a string to prevent common injection patterns.
 * Not a substitute for parameterized queries — defense in depth.
 */
export function sanitize(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Recursively sanitize all string values in req.body.
 */
export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj) {
  if (typeof obj === 'string') return sanitize(obj);
  if (Array.isArray(obj))     return obj.map(deepSanitize);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deepSanitize(v)])
    );
  }
  return obj;
}

/**
 * Detect SQL injection patterns in query strings.
 */
export function detectSQLInjection(req, res, next) {
  const SQL_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|CAST|CONVERT|DECLARE|xp_)\b|'--)/i;
  const queryStr = JSON.stringify(req.query) + JSON.stringify(req.params);
  if (SQL_PATTERN.test(queryStr)) {
    emitThreat('SQL_INJECTION', req);
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  next();
}

/**
 * Request fingerprinting + brute-force anomaly detection.
 */
export function detectAnomalies(req, _res, next) {
  const ip      = req.ip || req.socket?.remoteAddress || 'unknown';
  const now     = Date.now();
  const window  = 60_000; // 1 minute
  const limit   = 200;    // max requests per minute per IP

  let record = anomalyStore.get(ip) || { count: 0, firstSeen: now, flags: 0 };
  if (now - record.firstSeen > window) {
    record = { count: 0, firstSeen: now, flags: record.flags };
  }
  record.count += 1;

  if (record.count > limit) {
    record.flags += 1;
    emitThreat('RATE_ANOMALY', req, { count: record.count });
    anomalyStore.set(ip, record);
    return;
  }

  anomalyStore.set(ip, record);
  next();
}

/**
 * Emit a security threat event to the bus and (optionally) to Socket.IO.
 */
export function emitThreat(type, req, extra = {}) {
  const event = {
    id:        crypto.randomUUID(),
    type,
    ip:        req?.ip || 'unknown',
    path:      req?.path || '',
    method:    req?.method || '',
    timestamp: new Date().toISOString(),
    severity:  severityFor(type),
    ...extra,
  };
  threatBus.emit('threat', event);
}

function severityFor(type) {
  const map = {
    SQL_INJECTION:        'critical',
    XSS_ATTEMPT:          'high',
    UNAUTHORIZED_ACCESS:  'high',
    RATE_ANOMALY:         'medium',
    SUSPICIOUS_ACTIVITY:  'low',
    API_ABUSE:            'medium',
  };
  return map[type] || 'low';
}

/** Expose anomaly stats for the security dashboard */
export function getAnomalyStats() {
  const all    = [...anomalyStore.values()];
  const now    = Date.now();
  const active = all.filter(r => now - r.firstSeen < 300_000).length;
  const flagged = all.filter(r => r.flags > 0).length;
  return { totalTracked: all.length, activeWindowIPs: active, flaggedIPs: flagged };
}
