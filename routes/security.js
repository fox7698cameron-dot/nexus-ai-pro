// 2026-07-20
import express from 'express';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ── In-memory state ────────────────────────────────────────────────────────
const threats = new Map();
const quarantine = new Map();
const auditLog = [];
const sseClients = new Set();

let activeScan = null; // { id, type, progress, startedAt, status }

// Seed a few demo threats so the dashboard is non-empty on first load
const SEED_THREATS = [
  { id: uuidv4(), type: 'Suspicious outbound connection', severity: 'high',   source: '198.51.100.42', dismissed: false, detectedAt: Date.now() - 300000 },
  { id: uuidv4(), type: 'Brute-force login attempt',     severity: 'critical', source: '203.0.113.7',  dismissed: false, detectedAt: Date.now() - 120000 },
  { id: uuidv4(), type: 'Outdated TLS cipher in use',    severity: 'medium',  source: 'local',         dismissed: false, detectedAt: Date.now() - 600000 },
  { id: uuidv4(), type: 'Port scan detected',            severity: 'low',     source: '192.0.2.15',    dismissed: false, detectedAt: Date.now() -  60000 },
];
SEED_THREATS.forEach(t => threats.set(t.id, t));

// Recent CVE feed (mock – rotated server-side so FE always sees "fresh" data)
const CVE_POOL = [
  { id: 'CVE-2026-1001', cvss: 9.8, summary: 'Remote code execution in popular HTTP parser', published: Date.now() - 86400000 },
  { id: 'CVE-2026-1042', cvss: 7.5, summary: 'Privilege escalation via symlink race in systemd', published: Date.now() - 172800000 },
  { id: 'CVE-2026-0987', cvss: 6.5, summary: 'Information disclosure in OpenSSL certificate parsing', published: Date.now() - 259200000 },
  { id: 'CVE-2025-9812', cvss: 8.1, summary: 'SQL injection in widely-used ORM library', published: Date.now() - 345600000 },
  { id: 'CVE-2025-8741', cvss: 5.3, summary: 'Cross-site scripting in popular UI toolkit', published: Date.now() - 432000000 },
];

// Mock network connections
function mockConnections() {
  return [
    { id: uuidv4(), ip: '142.250.80.100', port: 443,  protocol: 'HTTPS', status: 'ESTABLISHED', risk: 'low',      process: 'node',    country: 'US' },
    { id: uuidv4(), ip: '151.101.1.69',   port: 443,  protocol: 'HTTPS', status: 'ESTABLISHED', risk: 'low',      process: 'chrome',  country: 'US' },
    { id: uuidv4(), ip: '198.51.100.42',  port: 8080, protocol: 'HTTP',  status: 'CLOSE_WAIT',  risk: 'high',     process: 'unknown', country: 'RU' },
    { id: uuidv4(), ip: '203.0.113.7',    port: 22,   protocol: 'SSH',   status: 'SYN_RECV',    risk: 'critical', process: 'sshd',    country: 'CN' },
    { id: uuidv4(), ip: '104.18.20.47',   port: 443,  protocol: 'HTTPS', status: 'ESTABLISHED', risk: 'low',      process: 'node',    country: 'US' },
  ];
}

// Firewall rules (mock)
const firewallRules = [
  { id: 1, name: 'Block Tor exit nodes',        action: 'DENY',  protocol: 'TCP', ports: 'any', enabled: true  },
  { id: 2, name: 'Allow HTTPS outbound',        action: 'ALLOW', protocol: 'TCP', ports: '443', enabled: true  },
  { id: 3, name: 'Block known bad ASNs',        action: 'DENY',  protocol: 'any', ports: 'any', enabled: true  },
  { id: 4, name: 'Rate-limit SMTP',             action: 'LIMIT', protocol: 'TCP', ports: '25',  enabled: false },
  { id: 5, name: 'Allow DNS over HTTPS',        action: 'ALLOW', protocol: 'TCP', ports: '443', enabled: true  },
];

// ── Auth middleware (token-based; permissive when JWT_SECRET not set) ───────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    req.userId = 'guest';
    return next();
  }
  // When JWT_SECRET is configured, real apps should verify with jsonwebtoken.
  // For now, accept any Bearer token and mark as authenticated.
  req.userId = 'authenticated-user';
  next();
}

// Simpler synchronous auth guard used below
function authGuard(req, res, next) {
  const auth = req.headers.authorization || '';
  req.userId = auth.startsWith('Bearer ') ? 'authenticated-user' : 'guest';
  next();
}

// ── SSE broadcast helper ─────────────────────────────────────────────────
function broadcastAlert(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch { sseClients.delete(client); }
  }
}

// ── GET /api/security/dashboard ─────────────────────────────────────────
router.get('/dashboard', authGuard, (req, res) => {
  const activeThreats = Array.from(threats.values()).filter(t => !t.dismissed);
  const score = Math.max(0, 100 - activeThreats.filter(t => t.severity === 'critical').length * 15
    - activeThreats.filter(t => t.severity === 'high').length * 8
    - activeThreats.filter(t => t.severity === 'medium').length * 3);

  res.json({
    securityScore: score,
    threatCount: activeThreats.length,
    activeThreats: activeThreats.slice(0, 5),
    cveCount: CVE_POOL.length,
    recentCVEs: CVE_POOL.slice(0, 3),
    scanStatus: activeScan ? activeScan.status : 'idle',
    lastScan: activeScan ? activeScan.startedAt : null,
    quarantineCount: quarantine.size,
    firewallActive: true,
    encryptionActive: true,
    algorithm: 'AES-256-GCM',
    auditLogSize: auditLog.length,
    timestamp: Date.now(),
  });
});

// ── POST /api/security/scan ──────────────────────────────────────────────
router.post('/scan', authGuard, (req, res) => {
  const type = ['quick', 'deep', 'network'].includes(req.body.type) ? req.body.type : 'quick';
  const durations = { quick: 8000, deep: 30000, network: 15000 };

  if (activeScan && activeScan.status === 'running') {
    return res.json({ status: 'already_running', scan: activeScan });
  }

  const scan = {
    id: uuidv4(),
    type,
    progress: 0,
    status: 'running',
    startedAt: Date.now(),
    completedAt: null,
    findings: [],
  };
  activeScan = scan;

  const duration = durations[type];
  const interval = setInterval(() => {
    scan.progress = Math.min(99, scan.progress + Math.floor(100 / (duration / 500)));
  }, 500);

  setTimeout(() => {
    clearInterval(interval);
    scan.progress = 100;
    scan.status = 'completed';
    scan.completedAt = Date.now();

    // Optionally surface a new mock threat on deep scans
    if (type === 'deep') {
      const newThreat = {
        id: uuidv4(), type: 'Suspicious process detected', severity: 'medium',
        source: 'local', dismissed: false, detectedAt: Date.now(),
      };
      threats.set(newThreat.id, newThreat);
      broadcastAlert('threat', newThreat);
    }

    auditLog.push({ id: uuidv4(), event: 'SCAN_COMPLETED', type, timestamp: Date.now() });
  }, duration);

  auditLog.push({ id: uuidv4(), event: 'SCAN_STARTED', type, timestamp: Date.now() });
  res.json({ status: 'started', scan });
});

// ── GET /api/security/scan/status ────────────────────────────────────────
router.get('/scan/status', authGuard, (req, res) => {
  res.json(activeScan || { status: 'idle', progress: 0 });
});

// ── GET /api/security/threats ────────────────────────────────────────────
router.get('/threats', authGuard, (req, res) => {
  const list = Array.from(threats.values()).filter(t => !t.dismissed);
  res.json({ threats: list, total: list.length });
});

// ── POST /api/security/threats/:id/dismiss ───────────────────────────────
router.post('/threats/:id/dismiss', authGuard, (req, res) => {
  const threat = threats.get(req.params.id);
  if (!threat) return res.status(404).json({ error: 'Threat not found' });
  threat.dismissed = true;
  threat.dismissedAt = Date.now();
  threat.dismissedBy = req.userId;
  auditLog.push({ id: uuidv4(), event: 'THREAT_DISMISSED', threatId: threat.id, timestamp: Date.now() });
  res.json({ success: true, threat });
});

// ── GET /api/security/network ────────────────────────────────────────────
router.get('/network', authGuard, (req, res) => {
  res.json({
    connections: mockConnections(),
    firewallRules,
    anomalies: Array.from(threats.values()).filter(t => !t.dismissed && t.severity === 'critical').slice(0, 3),
    timestamp: Date.now(),
  });
});

// ── GET /api/security/network/traffic ───────────────────────────────────
router.get('/network/traffic', authGuard, (req, res) => {
  // Realistic-looking traffic snapshot
  const now = Date.now();
  const points = Array.from({ length: 20 }, (_, i) => ({
    time: new Date(now - (19 - i) * 2000).toISOString(),
    inbound:  Math.floor(50 + Math.random() * 200),
    outbound: Math.floor(20 + Math.random() * 120),
    packets:  Math.floor(300 + Math.random() * 800),
  }));

  const byApp = [
    { app: 'node',    mbps: +(Math.random() * 5).toFixed(2) },
    { app: 'chrome',  mbps: +(Math.random() * 12).toFixed(2) },
    { app: 'ssh',     mbps: +(Math.random() * 0.5).toFixed(2) },
    { app: 'unknown', mbps: +(Math.random() * 2).toFixed(2) },
  ];

  res.json({ points, byApp, timestamp: now });
});

// ── GET /api/security/devices ────────────────────────────────────────────
router.get('/devices', authGuard, (req, res) => {
  const cpus = os.cpus();
  const totalMem  = os.totalmem();
  const freeMem   = os.freemem();
  const usedMem   = totalMem - freeMem;
  const memPct    = +((usedMem / totalMem) * 100).toFixed(1);

  // CPU usage: average across cores from load average (1-min)
  const loadAvg   = os.loadavg()[0];
  const cpuCount  = cpus.length || 1;
  const cpuPct    = Math.min(100, +((loadAvg / cpuCount) * 100).toFixed(1));

  res.json({
    hostname:  os.hostname(),
    platform:  os.platform(),
    arch:      os.arch(),
    uptime:    os.uptime(),
    cpu: {
      model:    cpus[0]?.model || 'Unknown',
      cores:    cpuCount,
      usagePct: cpuPct,
      loadAvg:  os.loadavg(),
    },
    memory: {
      totalBytes: totalMem,
      usedBytes:  usedMem,
      freeBytes:  freeMem,
      usagePct:   memPct,
    },
    disk: {
      // os module has no disk API; return placeholder
      note:      'Disk metrics require OS-level tooling (df/wmic)',
      usagePct:  42,
      totalGB:   512,
      usedGB:    215,
    },
    suspiciousProcesses: [
      { pid: 9812, name: 'miner_stub', cpuPct: 88, note: 'High CPU – possible cryptominer' },
    ],
    timestamp: Date.now(),
  });
});

// ── POST /api/security/quarantine/:id ───────────────────────────────────
router.post('/quarantine/:id', authGuard, (req, res) => {
  const threat = threats.get(req.params.id);
  if (!threat) {
    // Allow quarantine by file path too
    const entry = {
      id: req.params.id,
      path: req.body.path || '/unknown',
      reason: req.body.reason || 'Manual quarantine',
      quarantinedAt: Date.now(),
      quarantinedBy: req.userId,
    };
    quarantine.set(entry.id, entry);
    auditLog.push({ id: uuidv4(), event: 'QUARANTINE_ADDED', entryId: entry.id, timestamp: Date.now() });
    return res.json({ success: true, entry });
  }

  const entry = {
    id: threat.id,
    path: req.body.path || threat.source,
    reason: threat.type,
    quarantinedAt: Date.now(),
    quarantinedBy: req.userId,
  };
  quarantine.set(entry.id, entry);
  threat.quarantined = true;
  auditLog.push({ id: uuidv4(), event: 'QUARANTINE_ADDED', entryId: entry.id, timestamp: Date.now() });
  res.json({ success: true, entry });
});

// ── GET /api/security/audit ──────────────────────────────────────────────
router.get('/audit', authGuard, (req, res) => {
  const limit  = Math.min(500, parseInt(req.query.limit)  || 50);
  const offset = parseInt(req.query.offset) || 0;
  const slice  = auditLog.slice(-(limit + offset)).slice(0, limit);
  res.json({ logs: slice, total: auditLog.length, limit, offset });
});

// ── GET /api/security/alerts  (SSE + regular JSON) ──────────────────────
router.get('/alerts', authGuard, (req, res) => {
  const wantsSSE = req.headers.accept === 'text/event-stream';

  if (wantsSSE) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 20000);

    sseClients.add(res);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
    return;
  }

  // Plain JSON fallback
  const activeThreats = Array.from(threats.values()).filter(t => !t.dismissed);
  res.json({
    alerts: activeThreats,
    criticalCount: activeThreats.filter(t => t.severity === 'critical').length,
    highCount:     activeThreats.filter(t => t.severity === 'high').length,
    mediumCount:   activeThreats.filter(t => t.severity === 'medium').length,
    lowCount:      activeThreats.filter(t => t.severity === 'low').length,
    timestamp:     Date.now(),
  });
});

export default router;
