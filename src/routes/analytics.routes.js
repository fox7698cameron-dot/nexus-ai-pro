// src/routes/analytics.routes.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10
// Social media analytics + content performance endpoints

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ── In-memory store (replace with DB when available) ─────────────────────────
const analyticsStore = new Map();
const reachHistory   = new Map(); // platform → [{ts, value}]

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

function emptyPlatform(id) {
  return {
    id,
    name:        id.charAt(0).toUpperCase() + id.slice(1),
    likes:       0,
    reach:       0,
    views:       0,
    retention:   0,
    followers:   0,
    engagement:  0,
    topContent:  [],
    lastUpdated: null
  };
}

// Seed empty store
for (const p of PLATFORMS) analyticsStore.set(p, emptyPlatform(p));

// ── Validators ────────────────────────────────────────────────────────────────
const PlatformSchema = z.object({
  id:          z.enum(PLATFORMS),
  likes:       z.number().min(0).optional(),
  reach:       z.number().min(0).optional(),
  views:       z.number().min(0).optional(),
  retention:   z.number().min(0).max(100).optional(),
  followers:   z.number().optional(),
  engagement:  z.number().min(0).max(100).optional(),
  topContent:  z.array(z.object({ url: z.string(), title: z.string(), views: z.number().min(0) })).max(10).optional()
});

const DateRangeSchema = z.object({
  range:     z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
  startDate: z.string().optional(),
  endDate:   z.string().optional()
});

// ── GET /api/analytics/overview ───────────────────────────────────────────────
router.get('/overview', (req, res) => {
  const parsed = DateRangeSchema.safeParse(req.query);
  const range  = parsed.success ? parsed.data.range : '30d';

  const platforms = Array.from(analyticsStore.values());
  const totals = platforms.reduce((acc, p) => {
    acc.totalLikes      += p.likes;
    acc.totalReach      += p.reach;
    acc.totalViews      += p.views;
    acc.totalFollowers  += p.followers;
    return acc;
  }, { totalLikes: 0, totalReach: 0, totalViews: 0, totalFollowers: 0 });

  const avgRetention  = platforms.reduce((s, p) => s + p.retention, 0) / platforms.length;
  const avgEngagement = platforms.reduce((s, p) => s + p.engagement, 0) / platforms.length;

  res.json({
    platforms,
    totals: { ...totals, avgRetention: Math.round(avgRetention * 10) / 10, avgEngagement: Math.round(avgEngagement * 10) / 10 },
    range,
    ts: Date.now()
  });
});

// ── GET /api/analytics/platform/:id ──────────────────────────────────────────
router.get('/platform/:id', (req, res) => {
  const id = req.params.id.toLowerCase();
  if (!PLATFORMS.includes(id)) return res.status(400).json({ error: 'Unknown platform' });
  const data    = analyticsStore.get(id);
  const history = reachHistory.get(id) || [];
  res.json({ ...data, reachHistory: history.slice(-90) });
});

// ── PUT /api/analytics/platform/:id ──────────────────────────────────────────
router.put('/platform/:id', (req, res) => {
  const id = req.params.id.toLowerCase();
  if (!PLATFORMS.includes(id)) return res.status(400).json({ error: 'Unknown platform' });

  const parsed = PlatformSchema.safeParse({ id, ...req.body });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const existing = analyticsStore.get(id);
  const updated  = { ...existing, ...parsed.data, lastUpdated: Date.now() };
  analyticsStore.set(id, updated);

  // Append to reach history for trend charts
  if (parsed.data.reach !== undefined) {
    const hist = reachHistory.get(id) || [];
    hist.push({ ts: Date.now(), value: parsed.data.reach });
    if (hist.length > 365) hist.splice(0, hist.length - 365);
    reachHistory.set(id, hist);
  }

  res.json(updated);
});

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', (_req, res) => {
  const platforms = Array.from(analyticsStore.values());
  const top = platforms.slice().sort((a, b) => b.engagement - a.engagement)[0];
  res.json({
    activePlatforms: platforms.filter(p => p.lastUpdated).length,
    topPlatform:     top?.id || null,
    ts:              Date.now()
  });
});

// ── GET /api/analytics/platforms ─────────────────────────────────────────────
router.get('/platforms', (_req, res) => res.json({ platforms: PLATFORMS }));

export default router;
