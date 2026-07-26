// routes/admin.js — 2026-07-26
// Admin-only endpoints: system status, user management, audit log, connectors config
import express from 'express';
import { requireAuth, requireRole, users, ROLES } from './auth.js';

const router = express.Router();
const systemStartedAt = new Date().toISOString();

// All admin routes require admin role
router.use(requireAuth, requireRole(ROLES.ADMIN, ROLES.DEV));

// GET /api/admin/system
router.get('/system', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    startedAt: systemStartedAt,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      heapUsed:  Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      rss:       Math.round(mem.rss / 1024 / 1024) + ' MB',
    },
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const { role, active, page = 1, limit = 50 } = req.query;
  let list = [...users.values()].map(({ passwordHash: _ph, ...u }) => u);
  if (role)   list = list.filter(u => u.role   === role);
  if (active) list = list.filter(u => String(u.active) === active);
  const start = (parseInt(page) - 1) * parseInt(limit);
  res.json({ total: list.length, page: parseInt(page), limit: parseInt(limit), users: list.slice(start, start + parseInt(limit)) });
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const editable = ['role', 'active', 'language', 'region'];
  for (const k of editable) if (req.body[k] !== undefined) user[k] = req.body[k];
  const { passwordHash: _ph2, ...safe } = user;
  res.json(safe);
});

// GET /api/admin/metrics — platform-wide stats
router.get('/metrics', (req, res) => {
  const allUsers = [...users.values()];
  const byRole = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  res.json({
    users: { total: allUsers.length, active: allUsers.filter(u => u.active).length, byRole },
    requests: { total: 0 },
    generatedAt: new Date().toISOString(),
  });
});

// GET /api/admin/connectors — configured external connectors
router.get('/connectors', (req, res) => {
  const checks = [
    { name: 'Stripe',    configured: !!process.env.STRIPE_SECRET_KEY },
    { name: 'Anthropic', configured: !!process.env.ANTHROPIC_API_KEY },
    { name: 'OpenAI',    configured: !!process.env.OPENAI_API_KEY },
    { name: 'Google AI', configured: !!process.env.GOOGLE_API_KEY },
    { name: 'DeepSeek',  configured: !!process.env.DEEPSEEK_API_KEY },
    { name: 'xAI/Grok',  configured: !!process.env.XAI_API_KEY },
    { name: 'Mistral',   configured: !!process.env.MISTRAL_API_KEY },
    { name: 'Redis',     configured: !!process.env.REDIS_URL },
    { name: 'Slack',     configured: !!process.env.SLACK_WEBHOOK_URL },
    { name: 'Azure',     configured: !!process.env.AZURE_STORAGE_CONNECTION_STRING },
    { name: 'AWS S3',    configured: !!process.env.AWS_ACCESS_KEY_ID },
    { name: 'GitHub',    configured: !!process.env.GITHUB_TOKEN },
    { name: 'Bitbucket', configured: !!process.env.BITBUCKET_TOKEN },
    { name: 'Zoom',      configured: !!process.env.ZOOM_API_KEY },
    { name: 'Adobe',     configured: !!process.env.ADOBE_CLIENT_ID },
  ];
  res.json({ connectors: checks, configuredCount: checks.filter(c => c.configured).length });
});

export default router;
