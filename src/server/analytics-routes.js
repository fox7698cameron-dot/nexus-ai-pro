// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { authenticate } from './middleware.js';
import { db } from './database.js';

const router = Router();
router.use(authenticate);

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// ─── Encryption helpers ────────────────────────────────────────────────────

function getEncKey() {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!raw) throw new Error('CONNECTOR_ENCRYPTION_KEY not set');
  // Accept 32-byte hex (64 chars) or raw 32-char string
  return raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw.padEnd(32).slice(0, 32));
}

function encryptToken(plaintext) {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({ iv: iv.toString('hex'), enc: enc.toString('hex'), tag: tag.toString('hex') });
}

function decryptToken(stored) {
  const { iv, enc, tag } = JSON.parse(stored);
  const key = getEncKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(enc, 'hex')), decipher.final()]).toString('utf8');
}

// ─── Redis token store ─────────────────────────────────────────────────────

async function storeToken(userId, platform, token) {
  const encrypted = encryptToken(token);
  await db.redis.set(`analytics:${userId}:${platform}:token`, encrypted, 'EX', 60 * 60 * 24 * 30);
}

async function getToken(userId, platform) {
  const stored = await db.redis.get(`analytics:${userId}:${platform}:token`);
  if (!stored) return null;
  return decryptToken(stored);
}

// ─── Empty data shape ──────────────────────────────────────────────────────

function emptyPlatformData(platform) {
  return {
    connected: false,
    platform,
    views: 0,
    likes: 0,
    shares: 0,
    followers: 0,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: [],
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
  };
}

// ─── Platform API fetchers ─────────────────────────────────────────────────

async function fetchTikTok(token) {
  const base = 'https://business-api.tiktok.com/open_api/v1.3';
  const headers = { 'Access-Token': token, 'Content-Type': 'application/json' };

  const statsRes = await fetch(`${base}/report/integrated/get/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      report_type: 'BASIC',
      dimensions: ['stat_time_day'],
      metrics: ['impression_cnt', 'likes', 'shares', 'comment_cnt'],
      start_date: thirtyDaysAgo(),
      end_date: today(),
    }),
  });
  const stats = await statsRes.json();

  const rows = stats?.data?.list ?? [];
  return {
    connected: true,
    platform: 'tiktok',
    views: sumField(rows, 'impression_cnt'),
    likes: sumField(rows, 'likes'),
    shares: sumField(rows, 'shares'),
    followers: 0,
    engagementRate: calcEngagement(rows, 'impression_cnt', ['likes', 'shares', 'comment_cnt']),
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: rows.slice(0, 10),
    growthSeries: rows.map(r => ({ date: r.dimensions?.stat_time_day, value: r.metrics?.impression_cnt ?? 0 })),
    reachByRegion: [],
    reachByDevice: {},
  };
}

async function fetchInstagram(token) {
  const base = 'https://graph.facebook.com/v19.0';
  const fields = 'followers_count,media_count,profile_views';
  const igRes = await fetch(`${base}/me?fields=id,${fields}&access_token=${token}`);
  const ig = await igRes.json();

  const insightRes = await fetch(
    `${base}/${ig.id}/insights?metric=impressions,reach,follower_count&period=day&access_token=${token}`
  );
  const insight = await insightRes.json();
  const data = insight?.data ?? [];

  return {
    connected: true,
    platform: 'instagram',
    views: findMetric(data, 'impressions'),
    likes: 0,
    shares: 0,
    followers: ig.followers_count ?? 0,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: [],
    growthSeries: (findMetricSeries(data, 'follower_count') ?? []).map(p => ({ date: p.end_time, value: p.value })),
    reachByRegion: [],
    reachByDevice: {},
  };
}

async function fetchFacebook(token) {
  const base = 'https://graph.facebook.com/v19.0';
  const pageRes = await fetch(`${base}/me?fields=id,name,fan_count&access_token=${token}`);
  const page = await pageRes.json();

  const insightRes = await fetch(
    `${base}/${page.id}/insights?metric=page_impressions,page_post_engagements&period=day&access_token=${token}`
  );
  const insight = await insightRes.json();
  const data = insight?.data ?? [];

  return {
    connected: true,
    platform: 'facebook',
    views: findMetric(data, 'page_impressions'),
    likes: findMetric(data, 'page_post_engagements'),
    shares: 0,
    followers: page.fan_count ?? 0,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: [],
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
  };
}

async function fetchTwitch(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
  };

  const userRes = await fetch('https://api.twitch.tv/helix/users', { headers });
  const userData = await userRes.json();
  const userId = userData?.data?.[0]?.id;

  const [channelRes, analyticsRes] = await Promise.all([
    fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`, { headers }),
    fetch(`https://api.twitch.tv/helix/analytics/streams?broadcaster_id=${userId}`, { headers }),
  ]);

  const channel = (await channelRes.json())?.data?.[0] ?? {};
  const analytics = (await analyticsRes.json())?.data ?? [];

  return {
    connected: true,
    platform: 'twitch',
    views: channel.view_count ?? 0,
    likes: 0,
    shares: 0,
    followers: 0,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: analytics.slice(0, 10),
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
  };
}

async function fetchDiscord(token) {
  const headers = { Authorization: `Bot ${token}` };

  const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const guilds = await guildsRes.json();

  const totalMembers = Array.isArray(guilds) ? guilds.reduce((s, g) => s + (g.approximate_member_count ?? 0), 0) : 0;

  return {
    connected: true,
    platform: 'discord',
    views: 0,
    likes: 0,
    shares: 0,
    followers: totalMembers,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: [],
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
  };
}

// Lemon8 has no public API yet
async function fetchLemon8(_token) {
  return {
    connected: true,
    platform: 'lemon8',
    views: 0,
    likes: 0,
    shares: 0,
    followers: 0,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: [],
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
    note: 'Lemon8 API not yet publicly available',
  };
}

async function fetchReddit(token) {
  const headers = {
    Authorization: `bearer ${token}`,
    'User-Agent': 'NexusAIPro/2.0',
  };

  const meRes = await fetch('https://oauth.reddit.com/api/v1/me', { headers });
  const me = await meRes.json();

  const subredditsRes = await fetch('https://oauth.reddit.com/subreddits/mine/moderator?limit=10', { headers });
  const subreddits = await subredditsRes.json();
  const subs = subreddits?.data?.children ?? [];
  const totalMembers = subs.reduce((s, c) => s + (c.data?.subscribers ?? 0), 0);

  return {
    connected: true,
    platform: 'reddit',
    views: me.total_karma ?? 0,
    likes: me.link_karma ?? 0,
    shares: 0,
    followers: totalMembers,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: subs.slice(0, 10).map(c => c.data),
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
  };
}

async function fetchRedGifs(token) {
  const headers = { Authorization: `Bearer ${token}` };

  const profileRes = await fetch('https://api.redgifs.com/v2/me', { headers });
  const profile = await profileRes.json();

  const gifsRes = await fetch('https://api.redgifs.com/v2/me/gifs?count=10', { headers });
  const gifs = await gifsRes.json();
  const items = gifs?.items ?? [];
  const totalViews = items.reduce((s, g) => s + (g.views ?? 0), 0);
  const totalLikes = items.reduce((s, g) => s + (g.likes ?? 0), 0);

  return {
    connected: true,
    platform: 'redgifs',
    views: totalViews,
    likes: totalLikes,
    shares: 0,
    followers: profile?.followers ?? 0,
    engagementRate: 0,
    retentionPct: 0,
    trendingHashtags: [],
    recentPosts: items,
    growthSeries: [],
    reachByRegion: [],
    reachByDevice: {},
  };
}

const FETCHERS = {
  tiktok: fetchTikTok,
  instagram: fetchInstagram,
  facebook: fetchFacebook,
  twitch: fetchTwitch,
  discord: fetchDiscord,
  lemon8: fetchLemon8,
  reddit: fetchReddit,
  redgifs: fetchRedGifs,
};

// ─── Utility helpers ───────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function sumField(rows, field) {
  return rows.reduce((s, r) => s + (r.metrics?.[field] ?? r[field] ?? 0), 0);
}

function calcEngagement(rows, baseField, engFields) {
  const base = sumField(rows, baseField);
  if (!base) return 0;
  const eng = engFields.reduce((s, f) => s + sumField(rows, f), 0);
  return Math.round((eng / base) * 10000) / 100;
}

function findMetric(data, name) {
  const entry = data.find(d => d.name === name);
  const vals = entry?.values ?? [];
  return vals.reduce((s, v) => s + (v.value ?? 0), 0);
}

function findMetricSeries(data, name) {
  return data.find(d => d.name === name)?.values ?? [];
}

async function platformData(userId, platform) {
  const token = await getToken(userId, platform);
  if (!token) return emptyPlatformData(platform);
  const fetcher = FETCHERS[platform];
  return fetcher(token);
}

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /analytics/overview
router.get('/overview', async (req, res) => {
  const userId = req.user.id;
  const results = await Promise.allSettled(PLATFORMS.map(p => platformData(userId, p)));

  const aggregated = results.reduce(
    (acc, r) => {
      if (r.status !== 'fulfilled') return acc;
      const d = r.value;
      acc.totalViews += d.views;
      acc.totalLikes += d.likes;
      acc.totalFollowers += d.followers;
      acc.totalShares += d.shares;
      acc.connectedPlatforms += d.connected ? 1 : 0;
      return acc;
    },
    { totalViews: 0, totalLikes: 0, totalFollowers: 0, totalShares: 0, connectedPlatforms: 0 }
  );

  const totalEngagements = aggregated.totalLikes + aggregated.totalShares;
  aggregated.totalEngagementRate = aggregated.totalViews
    ? Math.round((totalEngagements / aggregated.totalViews) * 10000) / 100
    : 0;

  res.json({ ok: true, data: aggregated, updatedAt: Date.now() });
});

// GET /analytics/platform/:platform
router.get('/platform/:platform', async (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });

  const data = await platformData(req.user.id, platform);
  res.json({ ok: true, data, updatedAt: Date.now() });
});

// POST /analytics/connect/:platform  — store encrypted OAuth token
router.post('/connect/:platform', async (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });

  const { token } = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });

  await storeToken(req.user.id, platform, token);
  res.json({ ok: true, platform, connected: true });
});

// GET /analytics/realtime  — SSE stream, pushes updates every 30s
router.get('/realtime', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = req.user.id;

  const send = async () => {
    const results = await Promise.allSettled(PLATFORMS.map(p => platformData(userId, p)));
    const platforms = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...emptyPlatformData(PLATFORMS[i]), error: true }
    );
    res.write(`data: ${JSON.stringify({ platforms, updatedAt: Date.now() })}\n\n`);
  };

  send();
  const interval = setInterval(send, 30_000);

  req.on('close', () => clearInterval(interval));
});

// GET /analytics/retention
router.get('/retention', async (req, res) => {
  const userId = req.user.id;

  // Retention is platform-specific; aggregate across connected platforms
  const results = await Promise.allSettled(PLATFORMS.map(p => platformData(userId, p)));
  const points = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Weighted average retention curve using retentionPct from each platform
  const connected = results.filter(r => r.status === 'fulfilled' && r.value.connected).map(r => r.value);
  const curve = points.map(pct => ({
    pct,
    retained: connected.length
      ? connected.reduce((s, d) => s + Math.max(0, (d.retentionPct ?? 0) - pct * 0.4), 0) / connected.length
      : 0,
  }));

  res.json({ ok: true, data: { curve, platforms: connected.map(d => ({ platform: d.platform, retentionPct: d.retentionPct })) } });
});

// GET /analytics/reach
router.get('/reach', async (req, res) => {
  const userId = req.user.id;
  const results = await Promise.allSettled(PLATFORMS.map(p => platformData(userId, p)));
  const platforms = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : emptyPlatformData(PLATFORMS[i])
  );

  const byPlatform = platforms.map(d => ({ platform: d.platform, reach: d.views, connected: d.connected }));
  const byRegion = platforms.flatMap(d => d.reachByRegion);
  const byDevice = platforms.reduce((acc, d) => {
    for (const [k, v] of Object.entries(d.reachByDevice)) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});

  res.json({ ok: true, data: { byPlatform, byRegion, byDevice } });
});

// GET /analytics/engagement
router.get('/engagement', async (req, res) => {
  const userId = req.user.id;
  const results = await Promise.allSettled(PLATFORMS.map(p => platformData(userId, p)));
  const platforms = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : emptyPlatformData(PLATFORMS[i])
  );

  const data = platforms.map(d => ({
    platform: d.platform,
    connected: d.connected,
    likes: d.likes,
    shares: d.shares,
    followers: d.followers,
    engagementRate: d.engagementRate,
  }));

  res.json({ ok: true, data });
});

// GET /analytics/growth
router.get('/growth', async (req, res) => {
  const userId = req.user.id;
  const results = await Promise.allSettled(PLATFORMS.map(p => platformData(userId, p)));
  const platforms = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : emptyPlatformData(PLATFORMS[i])
  );

  const data = platforms.map(d => ({
    platform: d.platform,
    connected: d.connected,
    currentFollowers: d.followers,
    series: d.growthSeries,
  }));

  res.json({ ok: true, data });
});

export default router;
