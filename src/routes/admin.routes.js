// src/routes/admin.routes.js
// Admin-only management endpoints — users, audit log, system config
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { ROLES, PERMISSIONS, AUDIT_EVENTS } from '../config/constants.js';
import { getRecentAuditEvents, getAuditEventCount } from '../services/audit.service.js';
import { securityScanner } from '../services/security-scanner.service.js';
import { generateGiftCardCode, hashGiftCardCode } from '../services/subscription.service.js';
import { getSupportedLanguages } from '../services/translation.service.js';

const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN, ROLES.DEV));

// ─── GET /api/admin/stats ─────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  return res.json({
    auditEventCount: getAuditEventCount(),
    securityScore: securityScanner.getScore(),
    openAlerts: securityScanner.getAlerts(1000).filter(a => !a.isResolved).length,
    lastScanTime: securityScanner.getLastScanTime(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
  });
});

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────
router.get('/audit-log', requireRole(ROLES.ADMIN), (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const event = req.query.event || null;
  return res.json(getRecentAuditEvents(limit, event));
});

// ─── POST /api/admin/gift-cards/generate ─────────────────────────────────
router.post('/gift-cards/generate', requireRole(ROLES.ADMIN), (req, res) => {
  const { plan, durationDays, count = 1 } = req.body;
  if (!plan || !durationDays) return res.status(400).json({ error: 'plan and durationDays required' });
  const cards = Array.from({ length: Math.min(count, 100) }, () => {
    const code = generateGiftCardCode();
    return { code, hash: hashGiftCardCode(code), plan, durationDays };
  });
  return res.json({ cards });
});

// ─── GET /api/admin/languages ─────────────────────────────────────────────
router.get('/languages', (req, res) => {
  return res.json({ languages: getSupportedLanguages() });
});

// ─── POST /api/admin/security/scan ───────────────────────────────────────
router.post('/security/scan', requireRole(ROLES.ADMIN), async (req, res) => {
  const scan = await securityScanner.runScan('full', req.user.sub);
  return res.json(scan);
});

export default router;
