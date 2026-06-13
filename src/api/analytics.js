// ================================================
// NEXUS AI PRO - Social Analytics API
// Updated: 2026-06-13
// ------------------------------------------------
// Platforms: TikTok, Instagram, Facebook, Twitch,
//            Discord, Lemon8, Reddit, RedGifs,
//            YouTube, Twitter/X
// Metrics: views, likes, reach, retention, followers,
//          engagement rate, shares, comments, streams
// Real-time: via Socket.IO broadcast
// ================================================

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

// Supported platforms and their metric schemas
const PLATFORM_METRICS = {
  tiktok: ['views','likes','shares','comments','followers','following',
           'reach','impressions','retention_rate','avg_watch_time',
           'profile_views','video_completions'],
  instagram: ['views','likes','comments','saves','shares','followers',
              'reach','impressions','story_views','reel_plays','profile_visits',
              'website_clicks','engagement_rate'],
  facebook: ['reach','impressions','page_likes','page_follows','post_reach',
             'post_impressions','reactions','comments','shares','video_views',
             'link_clicks','engagement_rate'],
  twitch: ['current_viewers','peak_viewers','avg_viewers','followers',
           'subscribers','streams_count','hours_streamed','hours_watched',
           'unique_viewers','chat_messages','clips_created'],
  discord: ['members','online_members','messages','active_users',
            'new_members','left_members','bans','server_boosts','channels'],
  lemon8: ['views','likes','comments','followers','following','reach',
           'saves','shares','profile_views'],
  reddit: ['post_karma','comment_karma','total_karma','subscribers',
           'active_users','posts','comments','upvotes','awards_received'],
  redgifs: ['views','likes','comments','followers','shares',
            'reach','trending_score'],
  youtube: ['views','subscribers','watch_time','likes','comments',
            'shares','impressions','click_through_rate','avg_view_duration'],
  twitter: ['impressions','engagements','likes','retweets','replies',
            'followers','mentions','link_clicks','profile_visits'],
};

// In-memory data store (replace with DB/Redis in production)
const accountStore  = new Map(); // userId -> [account]
const metricsStore  = new Map(); // accountId -> [metric]
const alertStore    = new Map(); // accountId -> [alert]

// Real-time broadcast reference (set by server.js)
let ioRef = null;
export function setIO(io) { ioRef = io; }

function broadcastMetric(userId, metric) {
  if (ioRef) ioRef.to(`user:${userId}`).emit('analytics:metric', metric);
}

// ── Utility ───────────────────────────────────────
function getAccountsForUser(userId) {
  return accountStore.get(userId) || [];
}

function getMetricsForAccount(accountId, { limit = 100, platform, metricType, since } = {}) {
  const all = metricsStore.get(accountId) || [];
  return all
    .filter(m => {
      if (platform && m.platform !== platform) return false;
      if (metricType && m.metricType !== metricType) return false;
      if (since && m.recordedAt < since) return false;
      return true;
    })
    .slice(-limit);
}

function storeMetric(accountId, metric) {
  const arr = metricsStore.get(accountId) || [];
  arr.push(metric);
  // Keep last 10,000 entries per account
  if (arr.length > 10000) arr.splice(0, arr.length - 10000);
  metricsStore.set(accountId, arr);
}

function aggregateMetrics(metrics, groupBy = 'day') {
  const groups = {};
  for (const m of metrics) {
    const d = new Date(m.recordedAt);
    let key;
    if (groupBy === 'hour') key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    else if (groupBy === 'week') {
      const wk = Math.floor(d.getDate() / 7);
      key = `${d.getFullYear()}-W${wk}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if (!groups[key]) groups[key] = { period: key, metrics: {}, count: 0 };
    groups[key].metrics[m.metricType] = (groups[key].metrics[m.metricType] || 0) + m.value;
    groups[key].count++;
  }
  return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
}

// ── Demo data generator ───────────────────────────
function generateDemoMetrics(platform) {
  const now = Date.now();
  const metrics = {};
  const platformMetrics = PLATFORM_METRICS[platform] || [];

  for (const metricType of platformMetrics) {
    const base = metricType.includes('rate') ? Math.random() * 10
               : metricType.includes('followers') || metricType.includes('subscribers') ? Math.floor(Math.random() * 50000)
               : Math.floor(Math.random() * 1000000);
    metrics[metricType] = {
      current: base,
      previous: Math.floor(base * (0.85 + Math.random() * 0.3)),
      change: 0,
      changePercent: 0,
    };
    metrics[metricType].change = metrics[metricType].current - metrics[metricType].previous;
    metrics[metricType].changePercent = metrics[metricType].previous
      ? ((metrics[metricType].change / metrics[metricType].previous) * 100).toFixed(2)
      : 0;
  }

  // Retention curve (hourly retention % over 24h)
  const retentionCurve = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    retention: Math.max(5, 100 - h * 4 + (Math.random() - 0.5) * 5),
  }));

  return { platform, metrics, retentionCurve, generatedAt: now };
}

// ── Routes ────────────────────────────────────────

// GET /api/analytics/platforms  — list supported platforms
router.get('/platforms', (req, res) => {
  const platforms = Object.entries(PLATFORM_METRICS).map(([id, metrics]) => ({ id, metrics }));
  res.json({ platforms });
});

// GET /api/analytics/accounts  — list connected accounts
router.get('/accounts', (req, res) => {
  const accounts = getAccountsForUser(req.user.sub);
  res.json({ accounts });
});

// POST /api/analytics/accounts  — connect a social account
router.post('/accounts', (req, res) => {
  const { platform, accountId, handle } = req.body;

  if (!platform || !PLATFORM_METRICS[platform]) {
    return res.status(400).json({ error: 'Unsupported platform', supported: Object.keys(PLATFORM_METRICS) });
  }
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  const accounts = getAccountsForUser(req.user.sub);
  const existing = accounts.find(a => a.platform === platform && a.accountId === accountId);
  if (existing) return res.status(409).json({ error: 'Account already connected' });

  const account = {
    id: uuidv4(),
    userId: req.user.sub,
    platform,
    accountId,
    handle: handle || accountId,
    connected: true,
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  accountStore.set(req.user.sub, accounts);

  res.status(201).json({ account });
});

// DELETE /api/analytics/accounts/:id
router.delete('/accounts/:id', (req, res) => {
  let accounts = getAccountsForUser(req.user.sub);
  const before = accounts.length;
  accounts = accounts.filter(a => a.id !== req.params.id);
  accountStore.set(req.user.sub, accounts);
  res.json({ removed: before - accounts.length });
});

// GET /api/analytics/dashboard  — aggregate overview across all platforms
router.get('/dashboard', (req, res) => {
  const accounts = getAccountsForUser(req.user.sub);

  const overview = accounts.map(account => {
    const demo = generateDemoMetrics(account.platform);
    return {
      accountId: account.id,
      platform: account.platform,
      handle: account.handle,
      ...demo,
    };
  });

  // Cross-platform totals
  const totals = {
    totalViews: 0,
    totalFollowers: 0,
    totalLikes: 0,
    totalReach: 0,
    platformCount: accounts.length,
  };

  for (const o of overview) {
    totals.totalViews     += o.metrics?.views?.current || 0;
    totals.totalFollowers += (o.metrics?.followers || o.metrics?.subscribers || o.metrics?.members)?.current || 0;
    totals.totalLikes     += o.metrics?.likes?.current || 0;
    totals.totalReach     += o.metrics?.reach?.current || 0;
  }

  res.json({ overview, totals, generatedAt: Date.now() });
});

// GET /api/analytics/platform/:platform  — metrics for a specific platform
router.get('/platform/:platform', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORM_METRICS[platform]) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const accounts = getAccountsForUser(req.user.sub).filter(a => a.platform === platform);
  if (!accounts.length) return res.status(404).json({ error: 'No accounts connected for this platform' });

  const data = accounts.map(account => ({
    account,
    ...generateDemoMetrics(platform),
    metrics: getMetricsForAccount(account.id),
  }));

  res.json({ platform, data });
});

// POST /api/analytics/metrics  — ingest a metric event
router.post('/metrics', (req, res) => {
  const { accountId, metricType, value, dimensions } = req.body;

  const accounts = getAccountsForUser(req.user.sub);
  const account = accounts.find(a => a.id === accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const allowed = PLATFORM_METRICS[account.platform] || [];
  if (metricType && !allowed.includes(metricType)) {
    return res.status(400).json({ error: `Metric '${metricType}' not valid for ${account.platform}` });
  }

  const metric = {
    id: uuidv4(),
    accountId,
    platform: account.platform,
    metricType,
    value: Number(value) || 0,
    dimensions: dimensions || {},
    recordedAt: Date.now(),
  };

  storeMetric(accountId, metric);
  broadcastMetric(req.user.sub, metric);

  res.status(201).json({ metric });
});

// GET /api/analytics/metrics/:accountId  — get metrics for account
router.get('/metrics/:accountId', (req, res) => {
  const { limit = 100, metricType, since, groupBy } = req.query;
  const accounts = getAccountsForUser(req.user.sub);
  if (!accounts.find(a => a.id === req.params.accountId)) {
    return res.status(404).json({ error: 'Account not found' });
  }

  let metrics = getMetricsForAccount(req.params.accountId, {
    limit: parseInt(limit),
    metricType,
    since: since ? parseInt(since) : undefined,
  });

  const result = groupBy ? aggregateMetrics(metrics, groupBy) : metrics;
  res.json({ metrics: result, total: result.length });
});

// GET /api/analytics/retention/:platform  — content retention analytics
router.get('/retention/:platform', (req, res) => {
  const { platform } = req.params;
  const retentionData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    viewersPercent: Math.max(5, 100 - Math.pow(h, 1.3) * 3 + (Math.random() - 0.5) * 5),
    avgWatchSeconds: Math.max(5, (300 - h * 12) + (Math.random() - 0.5) * 20),
  }));

  res.json({ platform, retentionCurve: retentionData, reportedAt: Date.now() });
});

// GET /api/analytics/reach  — reach analysis across platforms
router.get('/reach', (req, res) => {
  const accounts = getAccountsForUser(req.user.sub);
  const reachData = accounts.map(account => {
    const demo = generateDemoMetrics(account.platform);
    return {
      platform: account.platform,
      handle: account.handle,
      totalReach: demo.metrics?.reach?.current || demo.metrics?.impressions?.current || 0,
      uniqueAccounts: Math.floor((demo.metrics?.reach?.current || 0) * 0.7),
      paidReach: Math.floor((demo.metrics?.reach?.current || 0) * 0.1),
      organicReach: Math.floor((demo.metrics?.reach?.current || 0) * 0.9),
    };
  });

  res.json({ reachData, totalCombinedReach: reachData.reduce((s, r) => s + r.totalReach, 0) });
});

// GET /api/analytics/trending  — trending content across platforms
router.get('/trending', (req, res) => {
  const accounts = getAccountsForUser(req.user.sub);
  const trending = accounts.flatMap(account =>
    Array.from({ length: 3 }, (_, i) => ({
      platform: account.platform,
      handle: account.handle,
      contentId: crypto.randomBytes(8).toString('hex'),
      type: ['video','post','reel','story'][i % 4],
      views: Math.floor(Math.random() * 500000),
      likes: Math.floor(Math.random() * 50000),
      engagementRate: (Math.random() * 15).toFixed(2),
      publishedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    }))
  ).sort((a, b) => b.views - a.views);

  res.json({ trending: trending.slice(0, 20) });
});

// GET /api/analytics/alerts  — metric alerts
router.get('/alerts', (req, res) => {
  const accounts = getAccountsForUser(req.user.sub);
  const alerts = accounts.flatMap(account => alertStore.get(account.id) || []);
  res.json({ alerts, count: alerts.length });
});

// POST /api/analytics/alerts  — create a metric alert threshold
router.post('/alerts', (req, res) => {
  const { accountId, metricType, threshold, comparison } = req.body;
  const accounts = getAccountsForUser(req.user.sub);
  if (!accounts.find(a => a.id === accountId)) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const alert = {
    id: uuidv4(),
    accountId,
    metricType,
    threshold: Number(threshold),
    comparison: comparison || 'gt',
    createdAt: new Date().toISOString(),
  };

  const arr = alertStore.get(accountId) || [];
  arr.push(alert);
  alertStore.set(accountId, arr);

  res.status(201).json({ alert });
});

export default router;
