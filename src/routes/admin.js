// Nexus AI Pro - Admin Routes | 2026-10-12
import { Router } from 'express';
import os from 'os';
import process from 'process';

const router = Router();

// Middleware: admin-only guard (production: verify JWT role=admin)
function requireAdmin(req, res, next) {
  const role = req.userRole || req.headers['x-user-role'];
  if (role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

router.use(requireAdmin);

// GET /api/admin/system - system metrics
router.get('/system', (req, res) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: process.uptime(),
    load: os.loadavg(),
    memory: {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
      usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    cpus: {
      count: cpus.length,
      model: cpus[0]?.model,
      speed: cpus[0]?.speed,
    },
    env: process.env.NODE_ENV,
    pid: process.pid,
    generatedAt: new Date().toISOString(),
  });
});

// In-memory state (production: database)
const featureFlags = new Map([
  ['analytics', true],
  ['gamedev', true],
  ['payments', true],
  ['biometrics', true],
  ['cryptoPayments', false],
  ['betaFeatures', false],
]);

const rateLimitConfig = { windowMs: 15 * 60 * 1000, max: 100 };

// GET /api/admin/feature-flags
router.get('/feature-flags', (req, res) => {
  const flags = {};
  for (const [key, value] of featureFlags) flags[key] = value;
  res.json(flags);
});

// PUT /api/admin/feature-flags/:flag
router.put('/feature-flags/:flag', (req, res) => {
  const { flag } = req.params;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
  featureFlags.set(flag, enabled);
  res.json({ flag, enabled });
});

// GET /api/admin/rate-limits
router.get('/rate-limits', (req, res) => {
  res.json(rateLimitConfig);
});

// PUT /api/admin/rate-limits
router.put('/rate-limits', (req, res) => {
  const { windowMs, max } = req.body;
  if (windowMs) rateLimitConfig.windowMs = Number(windowMs);
  if (max) rateLimitConfig.max = Number(max);
  res.json(rateLimitConfig);
});

// GET /api/admin/sessions - active sessions summary
router.get('/sessions', (req, res) => {
  // In production: query session store (Redis)
  res.json({ activeSessions: 0, note: 'Connect session store for live data' });
});

// GET /api/admin/health
router.get('/health', (req, res) => {
  const checks = {
    server: 'ok',
    database: process.env.DATABASE_URL ? 'configured' : 'not-configured',
    redis: process.env.REDIS_URL ? 'configured' : 'not-configured',
    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured',
    anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not-configured',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured',
  };
  const allOk = Object.values(checks).every(v => v !== 'error');
  res.status(allOk ? 200 : 207).json({ status: allOk ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() });
});

export { router as adminRouter };
