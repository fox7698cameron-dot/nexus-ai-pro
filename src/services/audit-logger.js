// ================================================
// File:        src/services/audit-logger.js
// Purpose:     Minimal, privacy-preserving audit logger.  Records only what
//              is needed for accountability — actor id, action, resource,
//              outcome, timestamp.  Never records PII, request bodies, or
//              secrets.  Backed by an in-memory ring buffer + optional
//              write-through to a JSONL file on disk when AUDIT_LOG_PATH
//              is set.
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// ================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_ENTRIES = 5000;
const REDACT_PATTERNS = [/bearer\s+[a-z0-9._-]+/gi, /sk-[a-z0-9]{16,}/gi];

export class AuditLogger {
  constructor({ filePath = process.env.AUDIT_LOG_PATH || null } = {}) {
    this.filePath = filePath;
    this.buffer = [];
    if (filePath) {
      try { fs.mkdirSync(path.dirname(filePath), { recursive: true }); } catch { /* noop */ }
    }
  }

  record({ actor = 'anonymous', action, resource, outcome = 'ok', extra = null } = {}) {
    if (!action) throw new Error('audit action required');
    const entry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: hashActor(actor),
      action,
      resource: resource || null,
      outcome,
      extra: extra ? redact(extra) : null
    };
    this.buffer.push(entry);
    while (this.buffer.length > MAX_ENTRIES) this.buffer.shift();
    if (this.filePath) {
      try { fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n'); } catch { /* noop */ }
    }
    return entry;
  }

  tail(limit = 100) {
    return this.buffer.slice(-limit);
  }
}

function hashActor(actor) {
  const raw = typeof actor === 'string' ? actor : JSON.stringify(actor);
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 20);
}

function redact(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    let out = value;
    for (const p of REDACT_PATTERNS) out = out.replace(p, '[REDACTED]');
    return out;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const clone = {};
    for (const [k, v] of Object.entries(value)) {
      if (['password', 'secret', 'token', 'apiKey', 'api_key', 'authorization'].includes(k.toLowerCase())) {
        clone[k] = '[REDACTED]';
      } else {
        clone[k] = redact(v);
      }
    }
    return clone;
  }
  return value;
}
