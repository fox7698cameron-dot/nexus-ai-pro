// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, auditLog } from './middleware.js';
import { db } from './database.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

// ── System stats ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const stats = {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024)
      },
      cpus: (await import('os')).default.cpus().length,
      timestamp: new Date().toISOString()
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ── User management ──────────────────────────────────────────
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['admin', 'developer', 'moderator', 'user', '']).optional(),
  tier: z.enum(['free', 'pro', 'enterprise', '']).optional()
});

router.get('/users', async (req, res) => {
  try {
    const { page, limit, search, role, tier } = paginationSchema.parse(req.query);
    const keys = await db.keys('user:*');
    const rawUsers = await Promise.all(keys.map(k => db.get(k)));

    let users = rawUsers
      .filter(Boolean)
      .map(u => {
        try { return JSON.parse(u); } catch { return null; }
      })
      .filter(Boolean)
      .map(u => ({
        id: u.id,
        email: u.email ? u.email.replace(/(.{2}).*(@.*)/, '$1***$2') : '',
        username: u.username,
        role: u.role,
        tier: u.tier,
        status: u.status || 'active',
        createdAt: u.createdAt,
        lastLogin: u.lastLogin
      }));

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (role) users = users.filter(u => u.role === role);
    if (tier) users = users.filter(u => u.tier === tier);

    const total = users.length;
    const slice = users.slice((page - 1) * limit, page * limit);
    res.json({ users: slice, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const userUpdateSchema = z.object({
  role: z.enum(['admin', 'developer', 'moderator', 'user']).optional(),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended']).optional()
});

router.put('/users/:id', auditLog('ADMIN_USER_UPDATE'), async (req, res) => {
  try {
    const updates = userUpdateSchema.parse(req.body);
    const key = `user:${req.params.id}`;
    const raw = await db.get(key);
    if (!raw) return res.status(404).json({ error: 'User not found' });

    const user = JSON.parse(raw);
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    await db.set(key, JSON.stringify(updated));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', auditLog('ADMIN_USER_DELETE'), async (req, res) => {
  try {
    await db.del(`user:${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Feature flags ─────────────────────────────────────────────
const flagSchema = z.object({
  key: z.string().min(1).max(64),
  enabled: z.boolean()
});

router.get('/flags', async (_req, res) => {
  const raw = await db.get('feature:flags') || '{}';
  res.json(JSON.parse(raw));
});

router.put('/flags', auditLog('ADMIN_FLAG_UPDATE'), async (req, res) => {
  try {
    const { key, enabled } = flagSchema.parse(req.body);
    const raw = await db.get('feature:flags') || '{}';
    const flags = JSON.parse(raw);
    flags[key] = enabled;
    await db.set('feature:flags', JSON.stringify(flags));
    res.json({ success: true, flags });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Revenue / subscriptions ───────────────────────────────────
router.get('/revenue', async (_req, res) => {
  try {
    const keys = await db.keys('user:*');
    const rawUsers = await Promise.all(keys.map(k => db.get(k)));
    const users = rawUsers.filter(Boolean).map(u => { try { return JSON.parse(u); } catch { return null; } }).filter(Boolean);

    const tiers = { free: 0, pro: 0, enterprise: 0 };
    for (const u of users) tiers[u.tier || 'free']++;

    const mrr = tiers.pro * 9.99 + tiers.enterprise * 14.99;
    res.json({ mrr: mrr.toFixed(2), tiers, totalUsers: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Broadcast message ─────────────────────────────────────────
const broadcastSchema = z.object({ message: z.string().min(1).max(500) });

router.post('/broadcast', auditLog('ADMIN_BROADCAST'), async (req, res) => {
  try {
    const { message } = broadcastSchema.parse(req.body);
    // io is attached to app via app.set('io', io) in server.js
    const io = req.app.get('io');
    if (io) io.emit('admin:broadcast', { message, timestamp: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Audit logs ────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const keys = await db.keys('audit:*');
    const sorted = keys.sort().reverse().slice(0, limit);
    const entries = await Promise.all(sorted.map(k => db.get(k)));
    const logs = entries.filter(Boolean).map(e => { try { return JSON.parse(e); } catch { return null; } }).filter(Boolean);
    res.json({ logs, total: keys.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
