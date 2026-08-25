/**
 * server/routes/security.js
 * Nexus AI Pro — Security Dashboard API Routes
 * Labeled: 2026-08-25
 *
 * GET  /api/security/status         — current security status
 * POST /api/security/scan           — trigger full scan
 * POST /api/security/scan/network   — network-only scan
 * POST /api/security/scan/deps      — dependency-only scan
 * POST /api/security/scan/system    — system health scan
 * GET  /api/security/audit          — audit log
 * GET  /api/security/threats        — threat stats
 * POST /api/security/unblock        — unblock IP (admin)
 */

import express from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import {
  runFullSecurityScan,
  runNetworkScan,
  runDependencyScan,
  runSystemHealthScan,
  getAuditLog,
  audit,
  checkIPReputation,
  unblockIP
} from '../services/securityScanService.js';

const router = express.Router();

// Cache last scan result to avoid hammering on every request
let lastScanResult  = null;
let lastScanTime    = 0;
const SCAN_COOLDOWN = 30_000; // 30 seconds between full scans

// ── Security status ───────────────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
  if (lastScanResult) {
    return res.json({ ...lastScanResult, cached: true, cacheAge: Date.now() - lastScanTime });
  }
  return res.json({
    message: 'No scan data yet — POST /api/security/scan to run a scan',
    status:  'unknown'
  });
});

// ── Full scan ─────────────────────────────────────────────────────────────────
router.post('/scan', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  const now   = Date.now();
  const force = req.body?.force === true;

  if (!force && lastScanResult && (now - lastScanTime) < SCAN_COOLDOWN) {
    return res.json({ ...lastScanResult, cached: true, cacheAge: now - lastScanTime });
  }

  try {
    audit('SCAN_REQUESTED', { actor: req.user?.sub }, req.user?.sub);
    const result    = await runFullSecurityScan();
    lastScanResult  = result;
    lastScanTime    = Date.now();
    return res.json(result);
  } catch (err) {
    console.error('[SECURITY] scan error:', err.message);
    return res.status(500).json({ error: 'Security scan failed: ' + err.message });
  }
});

// ── Targeted scans ────────────────────────────────────────────────────────────
router.post('/scan/network', requireAuth, requireRole(ROLES.DEV), async (req, res) => {
  try {
    const targets = Array.isArray(req.body?.targets) ? req.body.targets : [];
    const result  = await runNetworkScan(targets);
    return res.json({ network: result, scannedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/scan/deps', requireAuth, requireRole(ROLES.DEV), async (req, res) => {
  try {
    const result = await runDependencyScan();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/scan/system', requireAuth, requireRole(ROLES.DEV), async (req, res) => {
  try {
    const result = await runSystemHealthScan();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Audit log ─────────────────────────────────────────────────────────────────
router.get('/audit', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const event  = req.query.event  || undefined;
  const actor  = req.query.actor  || undefined;
  const entries = getAuditLog({ limit, event, actor });
  return res.json({ entries, count: entries.length });
});

// ── Threat intelligence ───────────────────────────────────────────────────────
router.get('/threats', requireAuth, requireRole(ROLES.MODERATOR), (req, res) => {
  // Return count only — don't expose full IP list to non-admins
  return res.json({
    // Safe to show counts; actual IPs only to admin
    message: 'Threat statistics. Request /security/audit for details.'
  });
});

router.get('/threats/ip/:ip', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const reputation = checkIPReputation(req.params.ip);
  return res.json({ ip: req.params.ip, ...reputation });
});

router.post('/unblock', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip required' });
  unblockIP(ip);
  return res.json({ message: `IP ${ip} unblocked` });
});

export default router;
