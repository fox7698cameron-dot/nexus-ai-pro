// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import crypto from 'crypto';
import { readFileSync, statSync } from 'fs';
import { createConnection } from 'net';
import { resolve as dnsResolve } from 'dns/promises';
import authenticate from './middleware.js';
import db from './database.js';

const router = Router();
let _io = null;

export function init(io) {
  _io = io;
}

function emit(event, payload) {
  if (_io) _io.emit(event, payload);
}

const KEY_32 = crypto.randomBytes(32);

function aesEncrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_32, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    tag: tag.toString('hex'),
    algorithm: 'AES-256-GCM',
    timestamp: Date.now()
  };
}

function probePort(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ port, open: false });
    }, timeoutMs);
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ port, open: true });
    });
    socket.on('error', () => {
      clearTimeout(timer);
      resolve({ port, open: false });
    });
  });
}

async function measureLatency(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return { reachable: true, latencyMs: Date.now() - start, status: res.status };
  } catch {
    return { reachable: false, latencyMs: null };
  }
}

router.use(authenticate);

router.get('/dashboard', async (req, res) => {
  try {
    let threats = [];
    let auditEntries = [];
    try {
      const keys = await db.keys('threats:*');
      const raw = keys.length ? await db.mget(...keys) : [];
      threats = raw.filter(Boolean).map(v => JSON.parse(v)).slice(-100);
    } catch { /* redis unavailable */ }

    try {
      const raw = await db.lrange('audit:log', -100, -1);
      auditEntries = raw.map(v => JSON.parse(v));
    } catch { /* redis unavailable */ }

    const criticalCount = threats.filter(t => t.severity === 'critical').length;
    const highCount = threats.filter(t => t.severity === 'high').length;
    const score = Math.max(0, 100 - criticalCount * 10 - highCount * 5);

    res.json({
      score,
      encryptionStatus: 'AES-256-GCM',
      encryptionActive: true,
      lastScan: null,
      threatCount: threats.length,
      vulnerabilities: [],
      networkStatus: 'unknown',
      threats: threats.slice(-10),
      auditEntries: auditEntries.slice(-10),
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan/vulnerabilities', async (req, res) => {
  const result = { timestamp: Date.now(), vulnerabilities: [], error: null };
  try {
    const lockRaw = readFileSync(process.cwd() + '/package-lock.json', 'utf8');
    const lock = JSON.parse(lockRaw);
    const packages = lock.packages || {};
    const names = Object.keys(packages)
      .filter(k => k.startsWith('node_modules/'))
      .slice(0, 20)
      .map(k => k.replace('node_modules/', ''));

    const advisory = await fetch(
      `https://api.github.com/advisories?affects=${encodeURIComponent(names.join(','))}&per_page=30`,
      { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(8000) }
    );

    if (advisory.ok) {
      const advisories = await advisory.json();
      result.vulnerabilities = Array.isArray(advisories)
        ? advisories.map(a => ({
            cveId: a.cve_id || a.ghsa_id,
            severity: a.severity || 'unknown',
            summary: a.summary,
            fixAvailable: !!(a.vulnerabilities?.[0]?.patched_versions)
          }))
        : [];
    }

    emit('security:scan:result', { type: 'vulnerabilities', ...result });
    res.json(result);
  } catch (err) {
    result.error = err.message;
    res.status(500).json(result);
  }
});

router.post('/scan/network', async (req, res) => {
  const result = { timestamp: Date.now(), checks: [] };

  const domains = ['api.anthropic.com', 'api.openai.com', 'generativelanguage.googleapis.com'];
  for (const domain of domains) {
    try {
      const addresses = await dnsResolve(domain);
      result.checks.push({ check: `DNS:${domain}`, pass: addresses.length > 0, detail: addresses[0] });
    } catch (err) {
      result.checks.push({ check: `DNS:${domain}`, pass: false, detail: err.message });
    }
  }

  const appDomain = process.env.APP_DOMAIN;
  if (appDomain) {
    try {
      const tlsRes = await fetch(`https://${appDomain}`, {
        method: 'HEAD', signal: AbortSignal.timeout(5000)
      });
      result.checks.push({ check: 'TLS', pass: true, detail: `${appDomain} reachable` });
    } catch (err) {
      result.checks.push({ check: 'TLS', pass: false, detail: err.message });
    }
  }

  const ports = [80, 443, 3001];
  const portResults = await Promise.all(ports.map(p => probePort('127.0.0.1', p)));
  for (const pr of portResults) {
    result.checks.push({ check: `port:${pr.port}`, pass: pr.open, detail: pr.open ? 'open' : 'closed' });
  }

  emit('security:scan:result', { type: 'network', ...result });
  res.json(result);
});

router.post('/scan/device', async (req, res) => {
  const required = ['ENCRYPTION_SECRET', 'JWT_SECRET', 'DATABASE_URL'];
  const envChecks = required.map(k => ({ key: k, present: !!process.env[k] }));

  let diskOk = false;
  try {
    statSync('/tmp');
    diskOk = true;
  } catch { /* unavailable */ }

  const result = {
    timestamp: Date.now(),
    platform: process.platform,
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    cpuCount: (await import('os')).default.cpus().length,
    uptimeSeconds: process.uptime(),
    diskCheck: { path: '/tmp', accessible: diskOk },
    envValidation: envChecks
  };

  emit('security:scan:result', { type: 'device', ...result });
  res.json(result);
});

router.get('/threats', async (req, res) => {
  try {
    const keys = await db.keys('threats:*');
    if (!keys.length) return res.json({ threats: [], total: 0 });
    const raw = await db.mget(...keys);
    const threats = raw.filter(Boolean).map(v => JSON.parse(v)).slice(-100);
    res.json({ threats, total: threats.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const raw = await db.lrange('audit:log', -100, -1);
    const entries = raw.map(v => JSON.parse(v));
    res.json({ entries, total: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/encrypt', (req, res) => {
  try {
    const payload = typeof req.body.payload === 'string'
      ? req.body.payload
      : JSON.stringify(req.body.payload);
    if (!payload) return res.status(400).json({ error: 'payload required' });
    res.json(aesEncrypt(payload));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/network/status', async (req, res) => {
  const targets = [
    { name: 'Anthropic', url: 'https://api.anthropic.com' },
    { name: 'OpenAI', url: 'https://api.openai.com' },
    { name: 'Google', url: 'https://generativelanguage.googleapis.com' }
  ];
  const results = await Promise.all(targets.map(async t => ({ name: t.name, ...(await measureLatency(t.url)) })));
  res.json({ results, timestamp: Date.now() });
});

export default router;
