/**
 * server/routes/security.js
 * Real-time security scanning, network monitoring & audit log routes
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import { Router }  from 'express';
import os          from 'os';
import crypto      from 'crypto';
import { authenticate, requireAdmin, requireModerator } from '../middleware/auth.js';

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, type: string, severity: 'critical'|'high'|'medium'|'low', title: string, description: string, detectedAt: string, status: 'open'|'patched'|'ignored', cve?: string }} Vulnerability
 */

// ─── In-memory scan state ─────────────────────────────────────────────────────
const scanState = {
  /** @type {Vulnerability[]} */
  vulnerabilities: [],
  lastScan:        null,
  scanInProgress:  false,
  threatsBlocked:  0,
  networkAlerts:   [],
  auditLog:        [],   // minimal, capped
};

const AUDIT_LOG_MAX = 1000;

function addAudit(action, req, meta = {}) {
  const entry = {
    id:        crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    userId:    req.user?.id ?? 'system',
    ip:        req.ip,
    ...meta,
  };
  scanState.auditLog.unshift(entry);
  if (scanState.auditLog.length > AUDIT_LOG_MAX) {
    scanState.auditLog.length = AUDIT_LOG_MAX;
  }
  return entry;
}

// ─── Simulated vulnerability scanner ─────────────────────────────────────────

async function runVulnerabilityScan(io) {
  if (scanState.scanInProgress) {
    throw new Error('Scan already in progress');
  }
  scanState.scanInProgress = true;

  const emit = io
    ? (event, data) => io.emit(`security:${event}`, data)
    : () => {};

  emit('scan_started', { timestamp: new Date().toISOString() });

  // Simulate progressive scan phases
  const phases = [
    { name: 'dependency_audit',  label: 'Scanning dependencies…'      },
    { name: 'config_check',      label: 'Checking configuration…'     },
    { name: 'network_probe',     label: 'Probing network interfaces…' },
    { name: 'crypto_audit',      label: 'Auditing cryptographic keys…'},
    { name: 'permission_check',  label: 'Checking file permissions…'  },
  ];

  const results = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    emit('scan_progress', { phase: phase.name, label: phase.label, pct: Math.round((i / phases.length) * 100) });
    await new Promise(r => setTimeout(r, 300)); // yield loop

    // Real checks
    if (phase.name === 'config_check') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        results.push({
          id:          crypto.randomUUID(),
          type:        'CONFIG',
          severity:    'high',
          title:       'Weak JWT Secret',
          description: 'JWT_SECRET is missing or shorter than 32 characters.',
          detectedAt:  new Date().toISOString(),
          status:      'open',
        });
      }
      if (!process.env.ENCRYPTION_SECRET) {
        results.push({
          id:          crypto.randomUUID(),
          type:        'CONFIG',
          severity:    'medium',
          title:       'Missing Encryption Secret',
          description: 'ENCRYPTION_SECRET not set – falling back to random key (restarting server invalidates encrypted data).',
          detectedAt:  new Date().toISOString(),
          status:      'open',
        });
      }
    }

    if (phase.name === 'crypto_audit') {
      // Check TLS in production
      if (process.env.NODE_ENV === 'production' && !process.env.TLS_CERT_PATH) {
        results.push({
          id:          crypto.randomUUID(),
          type:        'CRYPTO',
          severity:    'high',
          title:       'TLS certificate path not configured',
          description: 'TLS_CERT_PATH is unset in production – ensure HTTPS is terminated correctly.',
          detectedAt:  new Date().toISOString(),
          status:      'open',
        });
      }
    }
  }

  scanState.vulnerabilities = results;
  scanState.lastScan        = new Date().toISOString();
  scanState.scanInProgress  = false;

  emit('scan_complete', {
    timestamp:       scanState.lastScan,
    vulnerabilities: results,
    summary:         buildSummary(),
  });

  return results;
}

// ─── Security score ───────────────────────────────────────────────────────────

function buildSummary() {
  const open = scanState.vulnerabilities.filter(v => v.status === 'open');
  const weights = { critical: 30, high: 15, medium: 7, low: 3 };
  const deduction = open.reduce((acc, v) => acc + (weights[v.severity] ?? 0), 0);
  const score     = Math.max(0, 100 - deduction);

  return {
    score,
    total:    scanState.vulnerabilities.length,
    open:     open.length,
    patched:  scanState.vulnerabilities.filter(v => v.status === 'patched').length,
    bySeverity: {
      critical: open.filter(v => v.severity === 'critical').length,
      high:     open.filter(v => v.severity === 'high').length,
      medium:   open.filter(v => v.severity === 'medium').length,
      low:      open.filter(v => v.severity === 'low').length,
    },
  };
}

// ─── Network snapshot ─────────────────────────────────────────────────────────

function getNetworkSnapshot() {
  const interfaces = os.networkInterfaces();
  const ifaces = Object.entries(interfaces).map(([name, addrs]) => ({
    name,
    addresses: (addrs ?? []).map(a => ({
      address:  a.address,
      family:   a.family,
      internal: a.internal,
    })),
  }));

  return {
    hostname:   os.hostname(),
    interfaces: ifaces,
    uptime:     os.uptime(),
    platform:   os.platform(),
    arch:       os.arch(),
  };
}

// ─── Device health ────────────────────────────────────────────────────────────

function getDeviceHealth() {
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;
  const cpus     = os.cpus();
  const loadAvg  = os.loadavg();

  return {
    cpu: {
      model:   cpus[0]?.model ?? 'unknown',
      cores:   cpus.length,
      loadAvg: { '1m': loadAvg[0], '5m': loadAvg[1], '15m': loadAvg[2] },
    },
    memory: {
      totalMb: Math.round(totalMem / 1_048_576),
      usedMb:  Math.round(usedMem  / 1_048_576),
      freeMb:  Math.round(freeMem  / 1_048_576),
      usedPct: Math.round((usedMem / totalMem) * 100),
    },
    uptime:   Math.floor(os.uptime()),
    platform: os.platform(),
    nodeVersion: process.version,
  };
}

// ─── Route: GET /api/security/status ─────────────────────────────────────────

router.get('/status', authenticate, (req, res) => {
  return res.json({
    summary: buildSummary(),
    lastScan: scanState.lastScan,
    scanInProgress: scanState.scanInProgress,
    threatCount: scanState.threatsBlocked,
    network: getNetworkSnapshot(),
    device:  getDeviceHealth(),
  });
});

// ─── Route: POST /api/security/scan ──────────────────────────────────────────

router.post('/scan', authenticate, requireModerator, async (req, res) => {
  try {
    // Pass io from app-level (attached to req.app.locals)
    const io = req.app.locals.io;
    addAudit('security_scan_started', req);
    const vulns = await runVulnerabilityScan(io);
    addAudit('security_scan_complete', req, { vulnerabilities: vulns.length });
    return res.json({ vulnerabilities: vulns, summary: buildSummary(), lastScan: scanState.lastScan });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── Route: POST /api/security/vulnerabilities/:id/patch ─────────────────────

router.post('/vulnerabilities/:id/patch', authenticate, requireModerator, (req, res) => {
  const vuln = scanState.vulnerabilities.find(v => v.id === req.params.id);
  if (!vuln) return res.status(404).json({ error: 'Vulnerability not found' });

  vuln.status    = 'patched';
  vuln.patchedAt = new Date().toISOString();
  vuln.patchedBy = req.user.id;

  addAudit('vulnerability_patched', req, { vulnerabilityId: vuln.id, title: vuln.title });
  return res.json({ message: 'Marked as patched', vulnerability: vuln, summary: buildSummary() });
});

// ─── Route: GET /api/security/network ────────────────────────────────────────

router.get('/network', authenticate, (req, res) => {
  return res.json({ ...getNetworkSnapshot(), alerts: scanState.networkAlerts });
});

// ─── Route: GET /api/security/device ─────────────────────────────────────────

router.get('/device', authenticate, (req, res) => {
  return res.json(getDeviceHealth());
});

// ─── Route: GET /api/security/audit-log ──────────────────────────────────────

router.get('/audit-log', authenticate, requireAdmin, (req, res) => {
  const { page = '1', limit = '50', action, userId } = req.query;
  const pageN  = Math.max(1, parseInt(page, 10));
  const limitN = Math.min(200, Math.max(1, parseInt(limit, 10)));

  let logs = [...scanState.auditLog];
  if (action) logs = logs.filter(l => l.action === action);
  if (userId) logs = logs.filter(l => l.userId === userId);

  const total = logs.length;
  const slice = logs.slice((pageN - 1) * limitN, pageN * limitN);

  return res.json({ logs: slice, total, page: pageN, limit: limitN, pages: Math.ceil(total / limitN) });
});

// ─── Route: GET /api/security/dashboard ──────────────────────────────────────

router.get('/dashboard', authenticate, (req, res) => {
  return res.json({
    summary:        buildSummary(),
    vulnerabilities: scanState.vulnerabilities,
    lastScan:       scanState.lastScan,
    scanInProgress: scanState.scanInProgress,
    network:        getNetworkSnapshot(),
    device:         getDeviceHealth(),
    networkAlerts:  scanState.networkAlerts,
    auditLogCount:  scanState.auditLog.length,
  });
});

export default router;
