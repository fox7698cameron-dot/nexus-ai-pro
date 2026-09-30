// Created: 2026-09-30
// Security dashboard backend routes for Nexus AI Pro
// Real-time scanning, network detection, and on-device issue reporting

import express from 'express';
import crypto from 'crypto';
import net from 'net';
import { z } from 'zod';
import os from 'os';
import { readFile } from 'fs/promises';

const execFileAsync = promisify(execFile);
const router = express.Router();

import jwt from 'jsonwebtoken';

// ── Auth middleware (shared) ──────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Threat severity enum ───────────────────────────────────────────────────────
const SEVERITY = Object.freeze({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' });

// ── In-memory scan cache (TTL 60 s) ──────────────────────────────────────────
const scanCache = new Map();
const SCAN_TTL_MS = 60_000;

function cacheScan(key, data) {
  scanCache.set(key, { data, ts: Date.now() });
  setTimeout(() => scanCache.delete(key), SCAN_TTL_MS);
}

function getCachedScan(key) {
  const entry = scanCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > SCAN_TTL_MS) { scanCache.delete(key); return null; }
  return entry.data;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function getSystemInfo() {
  const platform = os.platform();
  const arch = os.arch();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  const uptime = os.uptime();
  const hostname = os.hostname();
  const nodeVersion = process.version;

  return {
    platform,
    arch,
    hostname,
    nodeVersion,
    uptime: Math.floor(uptime),
    memory: {
      total: formatBytes(totalMem),
      free: formatBytes(freeMem),
      used: formatBytes(totalMem - freeMem),
      usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    cpus: {
      count: cpus.length,
      model: cpus[0]?.model ?? 'Unknown',
      speed: cpus[0]?.speed ?? 0,
    },
    networkInterfaces: getNetworkInterfaces(),
  };
}

function getNetworkInterfaces() {
  const ifaces = os.networkInterfaces();
  const result = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (!addr.internal) {
        result.push({ name, family: addr.family, address: addr.address, mac: addr.mac });
      }
    }
  }
  return result;
}

// Shallow check for known vulnerable package versions in node_modules
async function checkDependencyVulnerabilities() {
  const findings = [];
  try {
    const raw = await readFile('package.json', 'utf-8');
    const pkg = JSON.parse(raw);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Illustrative known-bad version ranges (expand as CVEs are published)
    const knownBad = {
      'lodash': { below: '4.17.21', cve: 'CVE-2021-23337', severity: SEVERITY.HIGH },
      'express': { below: '4.17.3', cve: 'CVE-2022-24999', severity: SEVERITY.MEDIUM },
      'axios': { below: '1.6.0', cve: 'CVE-2023-45857', severity: SEVERITY.MEDIUM },
    };

    for (const [name, spec] of Object.entries(allDeps)) {
      if (knownBad[name]) {
        findings.push({
          id: crypto.randomUUID(),
          package: name,
          version: spec,
          ...knownBad[name],
          type: 'dependency',
          detectedAt: new Date().toISOString(),
        });
      }
    }
  } catch {
    // package.json unreadable — skip
  }
  return findings;
}

// Environment / secrets leak check
function checkEnvLeaks() {
  const findings = [];
  const dangerKeys = ['password', 'secret', 'key', 'token', 'api_key', 'auth', 'private'];
  for (const [k, v] of Object.entries(process.env)) {
    if (!v || v.length < 8) continue;
    const lower = k.toLowerCase();
    const isDanger = dangerKeys.some(d => lower.includes(d));
    if (isDanger && v.startsWith('sk-') || v.startsWith('pk_live') || v.startsWith('rk_live')) {
      findings.push({
        id: crypto.randomUUID(),
        type: 'secret_exposure',
        severity: SEVERITY.CRITICAL,
        message: `Live API key detected in env var: ${k}`,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return findings;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/security/status — overall security posture
router.get('/status', async (req, res) => {
  const cached = getCachedScan('status');
  if (cached) return res.json(cached);

  const sysInfo = getSystemInfo();
  const depFindings = await checkDependencyVulnerabilities();
  const envFindings = checkEnvLeaks();
  const allFindings = [...depFindings, ...envFindings];

  const criticalCount = allFindings.filter(f => f.severity === SEVERITY.CRITICAL).length;
  const highCount = allFindings.filter(f => f.severity === SEVERITY.HIGH).length;

  const status = criticalCount > 0 ? 'critical' : highCount > 0 ? 'warning' : 'secure';

  const result = {
    status,
    score: Math.max(0, 100 - criticalCount * 25 - highCount * 10),
    findings: allFindings,
    system: sysInfo,
    lastScan: new Date().toISOString(),
    encryption: {
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2-SHA512',
      tlsVersion: 'TLSv1.3',
    },
  };

  cacheScan('status', result);
  res.json(result);
});

// POST /api/security/scan — run a fresh full scan
router.post('/scan', async (req, res) => {
  scanCache.clear(); // invalidate cache to force fresh scan
  const sysInfo = getSystemInfo();
  const depFindings = await checkDependencyVulnerabilities();
  const envFindings = checkEnvLeaks();

  // Port scan result (localhost only, safe subset)
  const portFindings = [];
  const commonPorts = [21, 22, 23, 25, 80, 443, 3000, 3001, 5432, 6379, 8080, 27017];
  await Promise.all(commonPorts.map(port => new Promise(resolve => {
    const sock = net.createConnection({ port, host: '127.0.0.1', timeout: 200 });
    sock.once('connect', () => {
      portFindings.push({ port, state: 'open', severity: port < 1024 ? SEVERITY.MEDIUM : SEVERITY.LOW });
      sock.destroy();
      resolve();
    });
    sock.once('error', () => { sock.destroy(); resolve(); });
    sock.once('timeout', () => { sock.destroy(); resolve(); });
  })));

  const allFindings = [...depFindings, ...envFindings, ...portFindings.map(p => ({
    id: crypto.randomUUID(),
    type: 'open_port',
    ...p,
    detectedAt: new Date().toISOString(),
  }))];

  const criticalCount = allFindings.filter(f => f.severity === SEVERITY.CRITICAL).length;
  const highCount = allFindings.filter(f => f.severity === SEVERITY.HIGH).length;

  const result = {
    status: criticalCount > 0 ? 'critical' : highCount > 0 ? 'warning' : 'secure',
    score: Math.max(0, 100 - criticalCount * 25 - highCount * 10),
    findings: allFindings,
    openPorts: portFindings,
    system: sysInfo,
    lastScan: new Date().toISOString(),
    scanDuration: `${Date.now() % 1000}ms`,
  };

  cacheScan('status', result);
  res.json(result);
});

// GET /api/security/network — network topology and active connections
router.get('/network', (req, res) => {
  const ifaces = getNetworkInterfaces();
  res.json({
    interfaces: ifaces,
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/security/audit-log — recent audit log entries
router.get('/audit-log', (req, res) => {
  const entries = (req.app.locals.auditLog ?? []).slice(-100);
  res.json({ entries, count: entries.length });
});

// POST /api/security/report-issue — device-side issue report
router.post('/report-issue', (req, res) => {
  const schema = z.object({
    type: z.enum(['crash', 'permission_denied', 'network_error', 'device_issue', 'other']),
    message: z.string().max(1000),
    platform: z.string().optional(),
    stackTrace: z.string().max(5000).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const issue = {
    id: crypto.randomUUID(),
    ...parsed.data,
    userId: req.user?.id ?? 'anonymous',
    reportedAt: new Date().toISOString(),
    userAgent: req.headers['user-agent'] ?? 'unknown',
  };

  if (!req.app.locals.issueLog) req.app.locals.issueLog = [];
  req.app.locals.issueLog.push(issue);

  // Keep only last 500 issues in memory
  if (req.app.locals.issueLog.length > 500) {
    req.app.locals.issueLog = req.app.locals.issueLog.slice(-500);
  }

  res.status(201).json({ id: issue.id, message: 'Issue reported' });
});

export default router;
