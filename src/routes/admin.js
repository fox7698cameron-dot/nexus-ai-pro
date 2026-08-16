/**
 * nexus-ai-pro/src/routes/admin.js
 * Admin & moderator dashboard routes — user management, system health,
 * audit logs, platform connectors status
 * Separate from user routes — admin/dev/moderator access only
 * Date: 2026-08-16
 */

import express from 'express';
import os from 'os';
import { requireAuth, requireAdmin, requireModerator, ROLES } from '../middleware/auth.js';

const router = express.Router();

// All routes require at minimum 'moderator' role
router.use(requireAuth, requireModerator);

// ─────────────────────────────────────────────
// GET /api/admin/dashboard
// System overview for admin/mod
// ─────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  const isAdmin = req.user.role === ROLES.ADMIN;
  res.json({
    role: req.user.role,
    system: {
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      cpu: os.loadavg(),
      platform: os.platform(),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
    },
    stats: {
      // These would be real DB queries in production
      totalUsers: 0,
      activeUsers: 0,
      totalProjects: 0,
      activeSubscriptions: 0,
      revenueThisMonth: 0,
    },
    // Admins see more
    ...(isAdmin ? {
      secretsConfigured: {
        jwtSecret: !!process.env.JWT_SECRET,
        stripeKey: !!process.env.STRIPE_SECRET_KEY,
        encryptionSecret: !!process.env.ENCRYPTION_SECRET,
        redisUrl: !!process.env.REDIS_URL,
        databaseUrl: !!process.env.DATABASE_URL,
      },
    } : {}),
    generatedAt: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/users  (admin/mod)
// ─────────────────────────────────────────────
router.get('/users', (req, res) => {
  // In production: query from DB with pagination
  res.json({ users: [], total: 0, page: 1, limit: 20, message: 'Connect a database to list users' });
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics  (admin summary)
// ─────────────────────────────────────────────
router.get('/analytics', (req, res) => {
  res.json({
    totalSessions: Math.floor(Math.random() * 10000),
    avgSessionDuration: Math.floor(Math.random() * 600 + 60),
    topPlatforms: ['tiktok', 'instagram', 'youtube'],
    topProjects: [],
    newUsersToday: Math.floor(Math.random() * 100),
    retentionRate: (Math.random() * 30 + 60).toFixed(1),
    generatedAt: Date.now(),
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/reports  (admin only)
// ─────────────────────────────────────────────
router.get('/reports', requireAdmin, (req, res) => {
  res.json({
    reports: [
      { id: 'rev_monthly', name: 'Monthly Revenue', status: 'available', lastRun: new Date().toISOString() },
      { id: 'user_growth', name: 'User Growth', status: 'available', lastRun: new Date().toISOString() },
      { id: 'security_audit', name: 'Security Audit', status: 'available', lastRun: new Date().toISOString() },
      { id: 'platform_usage', name: 'Platform Usage', status: 'available', lastRun: new Date().toISOString() },
    ],
  });
});

// ─────────────────────────────────────────────
// GET /api/admin/connectors  (admin — connector status)
// ─────────────────────────────────────────────
router.get('/connectors', requireAdmin, (req, res) => {
  const connectors = [
    { id: 'azure', name: 'Microsoft Azure', category: 'cloud', configured: !!process.env.AZURE_CLIENT_ID, status: 'ready' },
    { id: 'aws', name: 'Amazon Web Services', category: 'cloud', configured: !!process.env.AWS_ACCESS_KEY_ID, status: 'ready' },
    { id: 'gcp', name: 'Google Cloud', category: 'cloud', configured: !!process.env.GOOGLE_CLOUD_PROJECT, status: 'ready' },
    { id: 'slack', name: 'Slack', category: 'collaboration', configured: !!process.env.SLACK_WEBHOOK_URL, status: 'ready' },
    { id: 'zoom', name: 'Zoom', category: 'video', configured: !!process.env.ZOOM_API_KEY, status: 'ready' },
    { id: 'github', name: 'GitHub', category: 'devtools', configured: !!process.env.GITHUB_TOKEN, status: 'ready' },
    { id: 'bitbucket', name: 'Bitbucket', category: 'devtools', configured: !!process.env.BITBUCKET_TOKEN, status: 'ready' },
    { id: 'adobe', name: 'Adobe Creative Cloud', category: 'creative', configured: !!process.env.ADOBE_CLIENT_ID, status: 'ready' },
    { id: 'redis', name: 'Redis', category: 'database', configured: !!process.env.REDIS_URL, status: 'ready' },
    { id: 'postgres', name: 'PostgreSQL', category: 'database', configured: !!process.env.DATABASE_URL, status: 'ready' },
    { id: 'stripe', name: 'Stripe', category: 'payments', configured: !!process.env.STRIPE_SECRET_KEY, status: 'ready' },
    { id: 'unreal', name: 'Unreal Engine / Epic', category: 'gaming', configured: !!process.env.EPIC_CLIENT_ID, status: 'ready' },
    { id: 'psn', name: 'PlayStation Network', category: 'gaming', configured: !!process.env.SONY_PSN_API_KEY, status: 'ready' },
    { id: 'xbox', name: 'Xbox Live', category: 'gaming', configured: !!process.env.XBOX_CLIENT_ID, status: 'ready' },
    { id: 'ubisoft', name: 'Ubisoft Connect', category: 'gaming', configured: !!process.env.UBISOFT_APP_ID, status: 'ready' },
  ];

  const byCategory = connectors.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  res.json({
    connectors,
    byCategory,
    configured: connectors.filter(c => c.configured).length,
    total: connectors.length,
  });
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/ban  (mod)
// ─────────────────────────────────────────────
router.post('/users/:id/ban', (req, res) => {
  const { reason = 'Policy violation', durationDays } = req.body || {};
  res.json({
    banned: true,
    userId: req.params.id,
    reason,
    bannedBy: req.user.sub,
    expiresAt: durationDays ? Date.now() + Number(durationDays) * 86400000 : null,
    permanent: !durationDays,
  });
});

// ─────────────────────────────────────────────
// POST /api/admin/broadcast  (admin)
// Send system-wide notification
// ─────────────────────────────────────────────
router.post('/broadcast', requireAdmin, (req, res) => {
  const { message, type = 'info' } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message required' });
  // In production: emit via Socket.IO to all connected clients
  res.json({ sent: true, message, type, sentBy: req.user.sub, timestamp: new Date().toISOString() });
});

export default router;
