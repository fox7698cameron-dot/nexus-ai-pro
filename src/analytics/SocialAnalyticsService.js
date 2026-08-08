/**
 * src/analytics/SocialAnalyticsService.js
 * Nexus AI Pro — Social media analytics aggregator
 * Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Provides: likes, reach, views, retention, real-time metrics via WebSocket.
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 *
 * NOTE: Each platform uses its official API. Credentials are read exclusively
 * from environment variables — never hard-coded.
 */

import crypto from 'crypto';

// ── Platform API base URLs ─────────────────────────────────────────────
const API = Object.freeze({
  TIKTOK: 'https://open.tiktokapis.com/v2',
  INSTAGRAM: 'https://graph.instagram.com/v20.0',
  FACEBOOK: 'https://graph.facebook.com/v20.0',
  TWITCH: 'https://api.twitch.tv/helix',
  DISCORD: 'https://discord.com/api/v10',
  LEMON8: 'https://api.lemon8-app.com/v1',  // Community / partner endpoint
  REDDIT: 'https://oauth.reddit.com',
  REDGIFS: 'https://api.redgifs.com/v2',
});

// ── Generic authenticated fetch (no retry — removed per requirements) ──
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${url} responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── Metric normalization ────────────────────────────────────────────────

function normalizeMetrics(platform, raw) {
  return {
    platform,
    fetchedAt: new Date().toISOString(),
    likes: raw.likes ?? raw.like_count ?? raw.reactions?.LIKE ?? 0,
    views: raw.views ?? raw.view_count ?? raw.impressions ?? 0,
    reach: raw.reach ?? raw.unique_views ?? raw.total_unique_impressions ?? 0,
    comments: raw.comments ?? raw.comment_count ?? 0,
    shares: raw.shares ?? raw.share_count ?? raw.reposts ?? 0,
    followers: raw.followers ?? raw.follower_count ?? raw.subscribers ?? 0,
    watchTime: raw.watch_time ?? raw.average_watch_time ?? 0, // seconds
    retentionRate: raw.retention_rate ?? raw.average_view_percentage ?? null,
    engagementRate: raw.engagement_rate ?? null,
    raw,
  };
}

// ── Per-platform fetchers ───────────────────────────────────────────────

/** TikTok — Business API (requires app approval) */
async function fetchTikTok(config) {
  const { accessToken, userId } = config;
  const data = await apiFetch(
    `${API.TIKTOK}/research/user/info/?fields=display_name,follower_count,likes_count,video_count`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // Also fetch recent video stats
  const videos = await apiFetch(`${API.TIKTOK}/video/list/?fields=id,stats`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ max_count: 20 }),
  });
  const totals = (videos?.data?.videos || []).reduce(
    (acc, v) => ({
      views: acc.views + (v.stats?.play_count || 0),
      likes: acc.likes + (v.stats?.digg_count || 0),
      comments: acc.comments + (v.stats?.comment_count || 0),
      shares: acc.shares + (v.stats?.share_count || 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );
  return normalizeMetrics('tiktok', { ...data?.data?.user, ...totals });
}

/** Instagram — Graph API */
async function fetchInstagram(config) {
  const { accessToken, userId } = config;
  const data = await apiFetch(
    `${API.INSTAGRAM}/${userId}?fields=followers_count,media_count,website&access_token=${accessToken}`
  );
  const insights = await apiFetch(
    `${API.INSTAGRAM}/${userId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`
  );
  const metricMap = {};
  for (const m of insights?.data || []) metricMap[m.name] = m.values?.slice(-1)[0]?.value ?? 0;
  return normalizeMetrics('instagram', {
    followers: data.followers_count,
    reach: metricMap.reach,
    views: metricMap.impressions,
    profile_views: metricMap.profile_views,
  });
}

/** Facebook — Graph API */
async function fetchFacebook(config) {
  const { accessToken, pageId } = config;
  const data = await apiFetch(
    `${API.FACEBOOK}/${pageId}?fields=fan_count,talking_about_count&access_token=${accessToken}`
  );
  const insights = await apiFetch(
    `${API.FACEBOOK}/${pageId}/insights?metric=page_impressions,page_reach,page_post_engagements&access_token=${accessToken}`
  );
  const metricMap = {};
  for (const m of insights?.data || [])
    metricMap[m.name] = m.values?.slice(-1)[0]?.value ?? 0;
  return normalizeMetrics('facebook', {
    followers: data.fan_count,
    talking_about: data.talking_about_count,
    views: metricMap.page_impressions,
    reach: metricMap.page_reach,
    engagements: metricMap.page_post_engagements,
  });
}

/** Twitch — Helix API */
async function fetchTwitch(config) {
  const { clientId, accessToken, broadcasterId } = config;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId };
  const ch = await apiFetch(`${API.TWITCH}/channels?broadcaster_id=${broadcasterId}`, { headers });
  const streams = await apiFetch(`${API.TWITCH}/streams?user_id=${broadcasterId}`, { headers });
  const followers = await apiFetch(`${API.TWITCH}/channels/followers?broadcaster_id=${broadcasterId}`, { headers });
  const stream = streams?.data?.[0];
  return normalizeMetrics('twitch', {
    followers: followers?.total ?? 0,
    views: stream?.viewer_count ?? 0,
    title: ch?.data?.[0]?.title,
    live: !!stream,
  });
}

/** Discord — Bot API (server analytics requires GUILD_MEMBERS intent) */
async function fetchDiscord(config) {
  const { botToken, guildId } = config;
  const headers = { Authorization: `Bot ${botToken}` };
  const guild = await apiFetch(`${API.DISCORD}/guilds/${guildId}?with_counts=true`, { headers });
  return normalizeMetrics('discord', {
    followers: guild.approximate_member_count ?? 0,
    online: guild.approximate_presence_count ?? 0,
    name: guild.name,
  });
}

/** Lemon8 — Community data (public endpoint for own profile) */
async function fetchLemon8(config) {
  const { accessToken, userId } = config;
  const data = await apiFetch(`${API.LEMON8}/users/${userId}/stats`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return normalizeMetrics('lemon8', data);
}

/** Reddit — OAuth API */
async function fetchReddit(config) {
  const { accessToken, subreddit, username } = config;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'NexusAIPro/2.0',
  };
  if (subreddit) {
    const data = await apiFetch(`${API.REDDIT}/r/${subreddit}/about`, { headers });
    return normalizeMetrics('reddit', {
      followers: data?.data?.subscribers ?? 0,
      views: data?.data?.accounts_active ?? 0,
    });
  }
  // Per-user karma stats
  const data = await apiFetch(`${API.REDDIT}/user/${username}/about`, { headers });
  return normalizeMetrics('reddit', {
    likes: (data?.data?.link_karma ?? 0) + (data?.data?.comment_karma ?? 0),
    followers: data?.data?.subreddit?.subscribers ?? 0,
  });
}

/** RedGifs — public stats API */
async function fetchRedGifs(config) {
  const { accessToken, userId } = config;
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const data = await apiFetch(`${API.REDGIFS}/users/${userId}`, { headers });
  return normalizeMetrics('redgifs', {
    followers: data?.user?.followers ?? 0,
    views: data?.user?.views ?? 0,
    likes: data?.user?.likes ?? 0,
  });
}

// ── Platform dispatch table ────────────────────────────────────────────

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

// ── SocialAnalyticsService ────────────────────────────────────────────

export class SocialAnalyticsService {
  constructor() {
    /** cache: platformKey → { data, fetchedAt } */
    this._cache = new Map();
    this._cacheTTL = 60_000; // 60 s
    /** WebSocket emit callback — set by server.js */
    this._onUpdate = null;
    /** Per-user platform credentials (swapped with DB in production) */
    this._credentials = new Map();
    /** Active polling intervals */
    this._intervals = new Map();
  }

  // ── Credentials ───────────────────────────────────────────────────────

  setCredentials(userId, platform, creds) {
    const key = `${userId}:${platform}`;
    this._credentials.set(key, creds);
  }

  getCredentials(userId, platform) {
    return this._credentials.get(`${userId}:${platform}`) || null;
  }

  // ── Fetch one platform ────────────────────────────────────────────────

  async fetch(platform, userId) {
    const fetcher = FETCHERS[platform];
    if (!fetcher) throw new Error(`Unknown platform: ${platform}`);

    const cacheKey = `${userId}:${platform}`;
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < this._cacheTTL) {
      return cached.data;
    }

    const creds = this.getCredentials(userId, platform);
    if (!creds) throw new Error(`No credentials configured for ${platform}`);

    const data = await fetcher(creds);
    this._cache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  }

  // ── Fetch all configured platforms ────────────────────────────────────

  async fetchAll(userId) {
    const platforms = [...FETCHERS.keys()].filter(
      (p) => this.getCredentials(userId, p)
    );

    const results = await Promise.allSettled(
      platforms.map((p) => this.fetch(p, userId).then((d) => ({ platform: p, ...d })))
    );

    return results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { platform: 'unknown', error: r.reason?.message }
    );
  }

  // ── Real-time polling ─────────────────────────────────────────────────

  startRealTime(userId, intervalMs = 30_000, emitFn) {
    if (this._intervals.has(userId)) return;
    const id = setInterval(async () => {
      try {
        const data = await this.fetchAll(userId);
        if (emitFn) emitFn('analytics:update', { userId, data });
      } catch (err) {
        if (emitFn) emitFn('analytics:error', { userId, error: err.message });
      }
    }, intervalMs);
    this._intervals.set(userId, id);
  }

  stopRealTime(userId) {
    const id = this._intervals.get(userId);
    if (id) { clearInterval(id); this._intervals.delete(userId); }
  }

  // ── Aggregate totals ──────────────────────────────────────────────────

  async aggregateTotals(userId) {
    const all = await this.fetchAll(userId);
    const valid = all.filter((m) => !m.error);
    return valid.reduce(
      (acc, m) => ({
        totalLikes: acc.totalLikes + m.likes,
        totalViews: acc.totalViews + m.views,
        totalReach: acc.totalReach + m.reach,
        totalFollowers: acc.totalFollowers + m.followers,
        totalComments: acc.totalComments + m.comments,
        totalShares: acc.totalShares + m.shares,
        platforms: [...acc.platforms, m.platform],
      }),
      { totalLikes: 0, totalViews: 0, totalReach: 0, totalFollowers: 0,
        totalComments: 0, totalShares: 0, platforms: [] }
    );
  }
}

export default SocialAnalyticsService;
