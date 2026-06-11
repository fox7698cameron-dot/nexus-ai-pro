// src/routes/security.routes.js
// Security dashboard endpoints — scans, alerts, real-time via Socket.IO
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/constants.js';
import { securityScanner } from '../services/security-scanner.service.js';

const router = Router();

router.use(requireAuth);

// GET /api/security/dashboard — overview: score, alerts, last scan
router.get('/dashboard', requirePermission(PERMISSIONS.SECURITY_VIEW), (req, res) => {
  return res.json({
    score: securityScanner.getScore(),
    alerts: securityScanner.getAlerts(10),
    lastScanTime: securityScanner.getLastScanTime(),
    alertCount: securityScanner.getAlerts(1000).length,
  });
});

// POST /api/security/scan — trigger a scan
router.post('/scan', requirePermission(PERMISSIONS.SECURITY_SCAN), async (req, res) => {
  const { scanType = 'full' } = req.body;
  const validTypes = ['full', 'network', 'quick'];
  if (!validTypes.includes(scanType)) {
    return res.status(400).json({ error: 'scanType must be full, network, or quick' });
  }
  const scan = await securityScanner.runScan(scanType, req.user.sub);
  return res.json(scan);
});

// GET /api/security/alerts — all unresolved alerts
router.get('/alerts', requirePermission(PERMISSIONS.SECURITY_VIEW), (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  return res.json(securityScanner.getAlerts(limit));
});

// PATCH /api/security/alerts/:alertId/resolve
router.patch('/alerts/:alertId/resolve', requirePermission(PERMISSIONS.SECURITY_MANAGE), (req, res) => {
  const alert = securityScanner.resolveAlert(req.params.alertId);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  return res.json(alert);
});

// GET /api/security/scan/:scanId — get a specific scan result
router.get('/scan/:scanId', requirePermission(PERMISSIONS.SECURITY_VIEW), (req, res) => {
  const scan = securityScanner.getScan(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  return res.json(scan);
});

export default router;
