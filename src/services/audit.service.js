// src/services/audit.service.js
// Minimal audit logging — key security events only, no PII in metadata
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import crypto from 'crypto';

// In-memory ring buffer (max 1000 entries) — flush to DB in production via worker
const MAX_BUFFER = 1000;
const _buffer = [];

export function logAuditEvent({ userId = null, event, ip = null, userAgent = null, result = 'success', metadata = {} }) {
  const entry = {
    id: crypto.randomUUID(),
    userId,
    event,
    ip,
    userAgent: userAgent ? userAgent.slice(0, 256) : null,
    result,
    metadata,
    createdAt: new Date().toISOString(),
  };
  if (_buffer.length >= MAX_BUFFER) _buffer.shift();
  _buffer.push(entry);
  return entry;
}

export function getRecentAuditEvents(limit = 50, eventFilter = null) {
  const events = eventFilter
    ? _buffer.filter(e => e.event === eventFilter)
    : _buffer;
  return events.slice(-limit).reverse();
}

export function getAuditEventCount() {
  return _buffer.length;
}
