// src/routes/security-routes.js
// Date: 2026-07-08
// Enhanced security dashboard API routes with real-time scanning

import express from 'express';
import { createAuthMiddleware, requireRole, requirePermission } from '../middleware/auth-middleware.js';
import { ROLES } from '../services/auth-service.js';
import { SCAN_TYPES } from '../services/security-scan-service.js';

export function createSecurityRouter(securityScanService, legacySecurity, authService) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(authService);

  // GET /api/security/dashboard
  router.get('/dashboard', authenticate, requirePermission('view_security'), (req, res) => {
    const data = securityScanService.getDashboardData();
    res.json(data);
  });

  // POST /api/security/scan
  router.post('/scan', authenticate, requirePermission('view_security'), async (req, res) => {
    try {
      const { type = 'full' } = req.body;
      const validTypes = ['full', ...Object.values(SCAN_TYPES)];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid scan type. Valid: ${validTypes.join(', ')}` });
      }
      const result = await securityScanService.runScan(type);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/security/scan/:scanId
  router.get('/scan/:scanId', authenticate, requirePermission('view_security'), (req, res) => {
    const scan = securityScanService.activeScans.get(req.params.scanId);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json(scan);
  });

  // GET /api/security/threats
  router.get('/threats', authenticate, requirePermission('view_security'), (req, res) => {
    const threats = Array.from(securityScanService.suspiciousPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    res.json({ threats, blockedIPs: securityScanService.blockedIPs.size });
  });

  // POST /api/security/block-ip
  router.post('/block-ip', authenticate, requireRole(ROLES.ADMIN, ROLES.DEV), (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'ip required' });
    securityScanService.blockIP(ip);
    res.json({ success: true, ip });
  });

  // DELETE /api/security/block-ip/:ip
  router.delete('/block-ip/:ip', authenticate, requireRole(ROLES.ADMIN, ROLES.DEV), (req, res) => {
    securityScanService.unblockIP(req.params.ip);
    res.json({ success: true });
  });

  // GET /api/security/blocked-ips
  router.get('/blocked-ips', authenticate, requireRole(ROLES.ADMIN, ROLES.DEV), (req, res) => {
    res.json({ blockedIPs: securityScanService.getBlockedIPs() });
  });

  // GET /api/security/status (legacy endpoint kept for compatibility)
  router.get('/status', (req, res) => {
    res.json({
      ...legacySecurity.getSecurityStatus(),
      scanService: securityScanService.getDashboardData()
    });
  });

  // POST /api/security/rotate-keys (admin only)
  router.post('/rotate-keys', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
    legacySecurity.rotateKeys();
    res.json({ success: true, rotatedAt: Date.now() });
  });

  // GET /api/security/audit
  router.get('/audit', authenticate, requirePermission('view_security'), (req, res) => {
    const { limit = 100 } = req.query;
    const logs = legacySecurity.auditLog.slice(-Math.min(parseInt(limit, 10) || 100, 1000));
    res.json({ logs, total: legacySecurity.auditLog.length });
  });

  // GET /api/security/encryption-health
  router.get('/encryption-health', authenticate, requirePermission('view_security'), (req, res) => {
    res.json({
      algorithm: 'AES-256-GCM',
      keyRotationInterval: '24h',
      lastKeyRotation: legacySecurity.lastKeyRotation || Date.now(),
      nextKeyRotation: (legacySecurity.lastKeyRotation || Date.now()) + 86400000,
      status: 'healthy',
      keyStrength: 256,
      ivLength: 12,
      authTagLength: 128
    });
  });

  return router;
}
