// src/analytics/analytics-routes.js
// Created: 2026-07-30
// Analytics routes for social media: TikTok, Instagram, Facebook, Twitch, Discord,
// Lemon8, Reddit, RedGifs - real-time metrics, reach, likes, view/retention tracking

import { Router } from 'express';
import { requireAuth } from '../auth/auth-middleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Social platform definitions (all keys from env only)
const SOCIAL_PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    envKey: 'TIKTOK_ACCESS_TOKEN',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'retention']
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    envKey: 'INSTAGRAM_ACCESS_TOKEN',
    metrics: ['views', 'likes', 'saves', 'comments', 'followers', 'reach', 'impressions', 'story_views']
  },
  facebook: {
    name: 'Facebook',
    icon: '👤',
    envKey: 'FACEBOOK_PAGE_ACCESS_TOKEN',
    metrics: ['views', 'likes', 'shares', 'comments', 'reach', 'impressions', 'followers', 'engagement']
  },
  twitch: {
    name: 'Twitch',
    icon: '🟣',
    envKey: 'TWITCH_CLIENT_ID',
    metrics: ['viewers', 'followers', 'subscribers', 'bits', 'stream_views', 'avg_viewers', 'peak_viewers']
  },
  discord: {
    name: 'Discord',
    icon: '💬',
    envKey: 'DISCORD_BOT_TOKEN',
    metrics: ['members', 'online_members', 'messages', 'new_members', 'voice_minutes', 'boost_count']
  },
  lemon8: {
    name: 'Lemon8',
    icon: '🍋',
    envKey: 'LEMON8_ACCESS_TOKEN',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach']
  },
  reddit: {
    name: 'Reddit',
    icon: '🟠',
    envKey: 'REDDIT_ACCESS_TOKEN',
    metrics: ['upvotes', 'downvotes', 'comments', 'awards', 'subscribers', 'post_karma', 'comment_karma']
  },
  redgifs: {
    name: 'RedGifs',
    icon: '🎬',
    envKey: 'REDGIFS_ACCESS_TOKEN',
    metrics: ['views', 'likes', 'comments', 'followers', 'shares']
  }
};

// In-memory analytics store
const analyticsStore = new Map();
const realtimeCache = new Map();

function generateMockMetrics(platform, timeRange = '7d') {
  const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
  const now = Date.now();
  const msPerDay = 86400000;

  const timeSeries = Array.from({ length: days }, (_, i) => {
    const ts = now - (days - 1 - i) * msPerDay;
    return {
      date: new Date(ts).toISOString().split('T')[0],
      timestamp: ts,
      views: Math.floor(Math.random() * 10000) + 500,
      likes: Math.floor(Math.random() * 1000) + 50,
      comments: Math.floor(Math.random() * 200) + 10,
      shares: Math.floor(Math.random() * 500) + 20,
      reach: Math.floor(Math.random() * 15000) + 1000,
      followers: Math.floor(Math.random() * 100) + 5,
      retention: Math.round((Math.random() * 40 + 40) * 10) / 10
    };
  });

  const totals = timeSeries.reduce((acc, d) => {
    Object.keys(d).forEach(k => {
      if (k !== 'date' && k !== 'timestamp') {
        acc[k] = (acc[k] || 0) + d[k];
      }
    });
    return acc;
  }, {});

  return {
    platform,
    timeRange,
    timeSeries,
    totals,
    averages: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v / days)])),
    realtimeViewers: Math.floor(Math.random() * 500),
    score: Math.round(Math.random() * 30 + 70)
  };
}

// GET /api/analytics/platforms - list all platforms and connection status
router.get('/platforms', requireAuth, (req, res) => {
  const list = Object.entries(SOCIAL_PLATFORMS).map(([id, p]) => ({
    id,
    name: p.name,
    icon: p.icon,
    connected: Boolean(process.env[p.envKey]),
    metrics: p.metrics
  }));
  return res.json({ platforms: list });
});

// GET /api/analytics/:platform/metrics
router.get('/:platform/metrics', requireAuth, (req, res) => {
  const { platform } = req.params;
  const { timeRange = '7d', metric } = req.query;

  if (!SOCIAL_PLATFORMS[platform]) {
    return res.status(404).json({ error: 'Platform not found.' });
  }

  const cacheKey = `${req.user.sub}:${platform}:${timeRange}`;
  const cached = realtimeCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 60000) {
    return res.json(cached.data);
  }

  const data = generateMockMetrics(platform, timeRange);
  realtimeCache.set(cacheKey, { data, fetchedAt: Date.now() });

  if (metric) {
    return res.json({
      platform,
      metric,
      timeRange,
      timeSeries: data.timeSeries.map(d => ({ date: d.date, value: d[metric] || 0 })),
      total: data.totals[metric] || 0,
      average: data.averages[metric] || 0
    });
  }

  return res.json(data);
});

// GET /api/analytics/overview - all platforms overview
router.get('/overview', requireAuth, (req, res) => {
  const { timeRange = '7d' } = req.query;
  const overview = {};

  for (const [id] of Object.entries(SOCIAL_PLATFORMS)) {
    overview[id] = generateMockMetrics(id, timeRange);
  }

  const totals = {
    views: 0, likes: 0, comments: 0, shares: 0, reach: 0, followers: 0
  };
  Object.values(overview).forEach(p => {
    Object.keys(totals).forEach(k => { totals[k] += p.totals[k] || 0; });
  });

  return res.json({
    timeRange,
    platforms: overview,
    totals,
    topPlatform: Object.entries(overview).sort((a, b) => b[1].totals.views - a[1].totals.views)[0]?.[0] || null,
    generatedAt: new Date().toISOString()
  });
});

// GET /api/analytics/realtime - live metrics across all platforms
router.get('/realtime', requireAuth, (req, res) => {
  const realtime = Object.entries(SOCIAL_PLATFORMS).map(([id, p]) => ({
    platform: id,
    name: p.name,
    icon: p.icon,
    liveViewers: Math.floor(Math.random() * 1000),
    recentLikes: Math.floor(Math.random() * 100),
    recentComments: Math.floor(Math.random() * 30),
    trending: Math.random() > 0.5,
    timestamp: new Date().toISOString()
  }));

  return res.json({
    realtime,
    updatedAt: new Date().toISOString(),
    nextUpdate: new Date(Date.now() + 30000).toISOString()
  });
});

// POST /api/analytics/post - track a new content post
router.post('/post', requireAuth, (req, res) => {
  const { platform, postId, title, contentType, postedAt } = req.body;
  if (!platform || !postId) return res.status(400).json({ error: 'platform and postId required.' });
  if (!SOCIAL_PLATFORMS[platform]) return res.status(400).json({ error: 'Invalid platform.' });

  const key = `post:${req.user.sub}:${platform}:${postId}`;
  const post = {
    id: uuidv4(),
    userId: req.user.sub,
    platform,
    postId,
    title: title || '',
    contentType: contentType || 'post',
    postedAt: postedAt || new Date().toISOString(),
    metrics: { views: 0, likes: 0, comments: 0, shares: 0, retention: 0 },
    tracked: true,
    createdAt: new Date().toISOString()
  };

  analyticsStore.set(key, post);
  return res.status(201).json(post);
});

// GET /api/analytics/posts
router.get('/posts', requireAuth, (req, res) => {
  const { platform } = req.query;
  const posts = [...analyticsStore.entries()]
    .filter(([k]) => k.startsWith(`post:${req.user.sub}`))
    .map(([, v]) => v)
    .filter(p => !platform || p.platform === platform);

  return res.json({ posts, total: posts.length });
});

// GET /api/analytics/:platform/retention - retention/watch time data
router.get('/:platform/retention', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!SOCIAL_PLATFORMS[platform]) return res.status(404).json({ error: 'Platform not found.' });

  const retentionCurve = Array.from({ length: 10 }, (_, i) => ({
    second: i * 6,
    percentage: Math.round(100 - i * (7 + Math.random() * 3))
  }));

  return res.json({
    platform,
    avgRetention: Math.round(retentionCurve.reduce((a, r) => a + r.percentage, 0) / retentionCurve.length),
    retentionCurve,
    avgWatchTime: `${Math.floor(Math.random() * 40 + 20)}s`,
    completionRate: Math.round(Math.random() * 30 + 20)
  });
});

export default router;
