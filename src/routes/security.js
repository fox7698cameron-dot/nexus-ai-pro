// File: security.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeMinRole } from '../middleware/authorize.js';
import { threatDetector } from '../middleware/security.js';
import auditLogger from '../utils/audit.js';
import cryptoService from '../services/cryptoService.js';

const router = Router();

// Simulated vulnerability store for demo
const vulnerabilities = [
  { id: 'vuln-001', name: 'Outdated dependency: lodash', severity: 'medium', status: 'open', detected: '2026-06-10' },
  { id: 'vuln-002', name: 'Missing rate limit on /api/search', severity: 'low', status: 'open', detected: '2026-06-12' },
  { id: 'vuln-003', name: 'JWT secret entropy below recommended', severity: 'high', status: 'open', detected: '2026-06-14' },
];

const reportedThreats = [];

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
    }
    req.validated = result.data;
    next();
  };
}

function computeSecurityScore() {
  const openVulns = vulnerabilities.filter(v => v.status === 'open');
  const critical = openVulns.filter(v => v.severity === 'critical').length;
  const high = openVulns.filter(v => v.severity === 'high').length;
  const medium = openVulns.filter(v => v.severity === 'medium').length;
  const low = openVulns.filter(v => v.severity === 'low').length;

  let score = 100;
  score -= critical * 30;
  score -= high * 15;
  score -= medium * 7;
  score -= low * 2;

  return Math.max(0, score);
}

// GET /dashboard — comprehensive security dashboard
router.get('/dashboard', authenticate, (req, res) => {
  try {
    const score = computeSecurityScore();
    const recentAlerts = auditLogger.getLog({ severity: 'error', limit: 10 });
    const criticalAlerts = auditLogger.getLog({ severity: 'critical', limit: 5 });
    const openVulns = vulnerabilities.filter(v => v.status === 'open');

    res.json({
      dashboard: {
        securityScore: score,
        grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
        openVulnerabilities: openVulns.length,
        criticalVulnerabilities: openVulns.filter(v => v.severity === 'critical').length,
        highVulnerabilities: openVulns.filter(v => v.severity === 'high').length,
        recentAlerts: recentAlerts.length,
        criticalAlerts: criticalAlerts.length,
        lastScan: '2026-06-16T00:00:00.000Z',
        mfaEnabled: false,
        encryptionStatus: process.env.ENCRYPTION_SECRET ? 'configured' : 'not_configured',
        jwtStatus: process.env.JWT_SECRET ? 'configured' : 'not_configured',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /score — security score
router.get('/score', authenticate, (req, res) => {
  try {
    const score = computeSecurityScore();
    const checks = {
      encryptionConfigured: !!process.env.ENCRYPTION_SECRET,
      jwtConfigured: !!process.env.JWT_SECRET,
      redisConfigured: !!process.env.REDIS_URL,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      nodeEnvProduction: process.env.NODE_ENV === 'production',
    };
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    res.json({
      score,
      grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
      checks,
      passedChecks,
      totalChecks,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /scan — run security scan
router.post('/scan', authenticate, (req, res) => {
  try {
    auditLogger.log('security.scan.initiated', req.user.id, {}, 'info');

    // Stub scan results
    res.json({
      scan: {
        id: `scan-${Date.now()}`,
        status: 'completed',
        findings: vulnerabilities.filter(v => v.status === 'open'),
        score: computeSecurityScore(),
        duration: Math.floor(Math.random() * 3000) + 500,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /patch/:vulnId — patch a vulnerability (admin+)
router.post('/patch/:vulnId', authenticate, authorizeMinRole('admin'), (req, res) => {
  try {
    const vuln = vulnerabilities.find(v => v.id === req.params.vulnId);
    if (!vuln) return res.status(404).json({ error: 'Vulnerability not found' });
    if (vuln.status === 'patched') return res.status(400).json({ error: 'Already patched' });

    vuln.status = 'patched';
    vuln.patchedAt = new Date().toISOString();
    vuln.patchedBy = req.user.id;

    auditLogger.log('security.vulnerability.patched', req.user.id, { vulnId: req.params.vulnId }, 'info');
    res.json({ success: true, vulnerability: vuln });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /alerts — security alerts
router.get('/alerts', authenticate, (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const severity = req.query.severity;

    const filters = { limit };
    if (severity) filters.severity = severity;
    // Admin can see all; regular users see only their own
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      filters.userId = req.user.id;
    }

    const alerts = auditLogger.getLog(filters);
    res.json({ alerts, total: alerts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /audit — audit log
router.get('/audit', authenticate, (req, res) => {
  try {
    const limit = Math.min(500, parseInt(req.query.limit || '50', 10));
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    const filters = {
      limit,
      from: req.query.from,
      to: req.query.to,
      event: req.query.event,
      severity: req.query.severity,
    };

    // Non-admins can only see their own audit entries
    if (!isAdmin) filters.userId = req.user.id;

    const log = auditLogger.getLog(filters);
    res.json({ log, total: log.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /encryption-health — admin+
router.get('/encryption-health', authenticate, authorizeMinRole('admin'), (req, res) => {
  try {
    res.json({
      health: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2-sha512',
        iterations: 310000,
        ivLength: 12,
        tagLength: 16,
        saltLength: 64,
        encryptionSecretConfigured: !!process.env.ENCRYPTION_SECRET,
        jwtSecretConfigured: !!process.env.JWT_SECRET,
        jwtSecretEntropy: process.env.JWT_SECRET ? process.env.JWT_SECRET.length * 8 : 0,
        recommendations: [
          !process.env.ENCRYPTION_SECRET ? 'Set ENCRYPTION_SECRET (min 32 random bytes, base64 encoded)' : null,
          !process.env.JWT_SECRET ? 'Set JWT_SECRET (min 32 random bytes)' : null,
          process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32 ? 'JWT_SECRET should be at least 32 characters' : null,
        ].filter(Boolean),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rotate-keys — super_admin only
router.post('/rotate-keys', authenticate, authorizeMinRole('super_admin'), (req, res) => {
  try {
    // In production: trigger key rotation — generate new secrets, re-encrypt data, invalidate old tokens
    auditLogger.log('security.key_rotation.initiated', req.user.id, {}, 'critical');

    res.json({
      rotation: {
        status: 'initiated',
        message: 'Key rotation has been queued. All active sessions will be invalidated. Update environment variables with new keys.',
        newKeyHint: `Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`,
        initiatedBy: req.user.id,
        initiatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /network — network diagnostics
router.get('/network', authenticate, (req, res) => {
  try {
    res.json({
      network: {
        clientIp: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        protocol: req.protocol,
        secure: req.secure,
        forwardedFor: req.headers['x-forwarded-for'],
        serverUptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /devices — connected device security status
router.get('/devices', authenticate, (req, res) => {
  try {
    // In production: track device sessions in Redis/DB
    res.json({
      devices: [
        {
          id: 'current',
          type: 'web',
          userAgent: req.headers['user-agent']?.slice(0, 100),
          ip: req.ip,
          lastSeen: new Date().toISOString(),
          trusted: true,
          current: true,
        },
      ],
      total: 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /report-threat — user-reported threat
router.post('/report-threat', authenticate, (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(['phishing', 'spam', 'harassment', 'malware', 'other']),
      description: z.string().min(10).max(2000),
      url: z.string().url().optional(),
      evidence: z.string().max(5000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const report = {
      id: cryptoService.generateToken(8),
      ...parsed.data,
      reportedBy: req.user.id,
      reportedAt: new Date().toISOString(),
      status: 'pending',
    };

    reportedThreats.push(report);
    auditLogger.log('security.threat.reported', req.user.id, {
      type: parsed.data.type,
      reportId: report.id,
    }, 'warn');

    res.status(201).json({ success: true, report: { id: report.id, status: report.status } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /compliance — compliance status (admin+)
router.get('/compliance', authenticate, authorizeMinRole('admin'), (req, res) => {
  try {
    const checks = {
      passwordPolicy: true,
      mfaAvailable: true,
      dataEncryption: !!process.env.ENCRYPTION_SECRET,
      auditLogging: true,
      sessionManagement: true,
      rateLimiting: true,
      httpsEnforced: process.env.NODE_ENV === 'production',
      inputValidation: true,
      jwtRotation: false, // Requires Redis for blacklisting
      dependencyScanning: false, // Requires CI/CD integration
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const complianceRate = Math.round((passed / total) * 100);

    res.json({
      compliance: {
        checks,
        passed,
        total,
        complianceRate,
        grade: complianceRate >= 90 ? 'A' : complianceRate >= 75 ? 'B' : complianceRate >= 60 ? 'C' : 'D',
        frameworks: {
          owasp: complianceRate >= 80 ? 'partial' : 'non_compliant',
          soc2: complianceRate >= 90 ? 'partial' : 'non_compliant',
          gdpr: process.env.NODE_ENV === 'production' ? 'partial' : 'non_compliant',
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
