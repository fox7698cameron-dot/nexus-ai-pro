// nexus-ai-pro/src/services/audit.service.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Minimal, labeled, dated audit logging — machine-readable + human-readable

const LOG_RETENTION = 500;  // in-memory cap; DB is primary store
const auditBuffer = [];

/**
 * Write an audit entry. At a minimum supply label and result.
 * @param {object} entry
 * @param {string} entry.label      - Human-readable event label (e.g. "USER_LOGIN")
 * @param {string} [entry.actorId]  - User UUID
 * @param {string} [entry.role]     - Actor role
 * @param {string} [entry.targetType] - Affected resource type
 * @param {string} [entry.targetId]   - Affected resource UUID
 * @param {string} [entry.ip]       - Source IP
 * @param {'ok'|'denied'|'error'} [entry.result]
 * @param {object} [entry.detail]   - Minimal extra context (avoid PII)
 */
export function audit({ label, actorId, role, targetType, targetId, ip, result = 'ok', detail }) {
  const entry = {
    id: crypto.randomUUID(),
    label,
    actorId: actorId ?? null,
    role: role ?? null,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    ip: ip ?? null,
    result,
    detail: detail ?? null,
    ts: new Date().toISOString(),
  };

  auditBuffer.push(entry);
  if (auditBuffer.length > LOG_RETENTION) auditBuffer.shift();

  return entry;
}

export function getRecentAuditEntries(limit = 50) {
  return auditBuffer.slice(-limit).reverse();
}

export function clearAuditBuffer() {
  auditBuffer.length = 0;
}

// Express middleware — logs every request minimally
export function auditMiddleware(req, res, next) {
  res.on('finish', () => {
    if (req.path.startsWith('/api/')) {
      audit({
        label: `HTTP_${req.method}_${res.statusCode}`,
        actorId: req.user?.id,
        role: req.user?.role,
        ip: req.ip,
        result: res.statusCode < 400 ? 'ok' : res.statusCode === 403 ? 'denied' : 'error',
        detail: { path: req.path, ms: Date.now() - req.startTime },
      });
    }
  });
  next();
}
