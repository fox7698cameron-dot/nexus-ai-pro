/**
 * Nexus AI Pro — Social Analytics Service
 * Real-time aggregation for TikTok, Instagram, Facebook, Twitch, Discord,
 * Lemon8, Reddit, RedGifs. Views, likes, reach, retention, follower growth.
 * date: 2026-06-08
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

// ── Platform enumeration ──────────────────────────────────────────────────────

export const SocialPlatform = Object.freeze({
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  DISCORD: 'discord',
  LEMON8: 'lemon8',
  REDDIT: 'reddit',
  REDGIFS: 'redgifs',
});

// ── In-memory store (replace with TimeSeries DB / Redis in production) ────────

const platformConnections = new Map();   // userId → { platform → { token, accountId, ... } }
const metricsCache = new Map();          // `${userId}:${platform}` → { ...metrics, fetchedAt }
const realTimeListeners = new Map();     // socketId → { userId, platforms[] }

const CACHE_TTL = 5 * 60 * 1000;        // 5 minutes

// ── Metrics schema per platform ───────────────────────────────────────────────

function emptyMetrics(platform) {
  const base = {
    platform,
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    reach: 0,
    impressions: 0,
    engagementRate: 0,        // (likes + comments + shares) / reach * 100
    avgWatchTime: 0,          // seconds
    retentionRate: 0,         // percentage who watch > 50%
    topPosts: [],
    audienceDemographics: { ageGroups: {}, topCountries: [] },
    growthRate7d: 0,
    updatedAt: null,
  };
  const extra = {
    [SocialPlatform.TIKTOK]: { videoViews: 0, profileViews: 0, duets: 0, stitches: 0 },
    [SocialPlatform.INSTAGRAM]: { reels: 0, stories: 0, igtv: 0, saves: 0, websiteClicks: 0 },
    [SocialPlatform.FACEBOOK]: { pageViews: 0, pageFollowers: 0, eventResponses: 0, checkins: 0 },
    [SocialPlatform.TWITCH]: { concurrentViewers: 0, peakViewers: 0, subscriptions: 0, bitsReceived: 0, streamHours: 0 },
    [SocialPlatform.DISCORD]: { serverMembers: 0, activeMembers: 0, messagesSent: 0, boosts: 0 },
    [SocialPlatform.LEMON8]: { saves: 0, postViews: 0, profileVisits: 0 },
    [SocialPlatform.REDDIT]: { postKarma: 0, commentKarma: 0, subredditMembers: 0, awardReceived: 0 },
    [SocialPlatform.REDGIFS]: { gifViews: 0, gifLikes: 0, gifShares: 0, totalGifs: 0 },
  };
  return { ...base, ...(extra[platform] || {}) };
}

// ── Analytics Service ─────────────────────────────────────────────────────────

export class SocialAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // ── Connection management ──

  connectPlatform(userId, platform, credentials) {
    if (!Object.values(SocialPlatform).includes(platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    if (!platformConnections.has(userId)) platformConnections.set(userId, new Map());
    platformConnections.get(userId).set(platform, {
      ...credentials,
      connectedAt: Date.now(),
      lastSynced: null,
    });
    this.emit('platform:connected', { userId, platform });
    return { ok: true, platform };
  }

  disconnectPlatform(userId, platform) {
    const user = platformConnections.get(userId);
    if (user) {
      user.delete(platform);
      metricsCache.delete(`${userId}:${platform}`);
    }
    this.emit('platform:disconnected', { userId, platform });
    return { ok: true };
  }

  getConnectedPlatforms(userId) {
    const user = platformConnections.get(userId);
    if (!user) return [];
    return Array.from(user.entries()).map(([platform, conn]) => ({
      platform,
      connectedAt: conn.connectedAt,
      lastSynced: conn.lastSynced,
    }));
  }

  // ── Metrics fetching ──

  async getMetrics(userId, platform) {
    const cacheKey = `${userId}:${platform}`;
    const cached = metricsCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;

    const conn = platformConnections.get(userId)?.get(platform);
    if (!conn) throw new Error(`Platform ${platform} not connected`);

    // In production: call each platform's API using conn.accessToken / conn.accountId
    // Here we generate deterministic demo data keyed to the userId+platform so data
    // stays consistent across calls for the same account.
    const seed = crypto.createHash('sha256').update(`${userId}:${platform}`).digest();
    const rand = (min, max) => {
      const r = seed.readUInt32BE(0) / 0xffffffff;
      return Math.floor(r * (max - min + 1)) + min;
    };

    const metrics = {
      ...emptyMetrics(platform),
      followers: rand(1000, 500000),
      totalViews: rand(5000, 10000000),
      totalLikes: rand(2000, 500000),
      totalComments: rand(100, 50000),
      totalShares: rand(50, 20000),
      reach: rand(1000, 200000),
      impressions: rand(2000, 400000),
      avgWatchTime: rand(15, 180),
      retentionRate: rand(20, 75),
      growthRate7d: (rand(-5, 25) / 10),
      updatedAt: Date.now(),
      fetchedAt: Date.now(),
    };

    metrics.engagementRate = metrics.reach > 0
      ? (((metrics.totalLikes + metrics.totalComments + metrics.totalShares) / metrics.reach) * 100).toFixed(2)
      : 0;

    metrics.topPosts = Array.from({ length: 5 }, (_, i) => ({
      id: `post_${i + 1}`,
      title: `Top content ${i + 1}`,
      views: rand(1000, 100000),
      likes: rand(100, 10000),
      postedAt: Date.now() - rand(1, 30) * 86400000,
    }));

    metrics.audienceDemographics = {
      ageGroups: { '13-17': rand(5, 15), '18-24': rand(20, 35), '25-34': rand(20, 30), '35-44': rand(10, 20), '45+': rand(5, 15) },
      topCountries: ['US', 'GB', 'CA', 'AU', 'DE'].map(c => ({ country: c, pct: rand(5, 30) })),
    };

    metricsCache.set(cacheKey, metrics);
    if (conn) conn.lastSynced = Date.now();
    return metrics;
  }

  async getAllMetrics(userId) {
    const platforms = this.getConnectedPlatforms(userId).map(p => p.platform);
    const results = await Promise.allSettled(platforms.map(p => this.getMetrics(userId, p)));
    const out = {};
    results.forEach((r, i) => {
      out[platforms[i]] = r.status === 'fulfilled' ? r.value : { error: r.reason?.message };
    });
    return out;
  }

  // ── Aggregated overview ──

  async getOverview(userId) {
    const allMetrics = await this.getAllMetrics(userId);
    let totalFollowers = 0, totalViews = 0, totalLikes = 0, totalReach = 0;
    const platformSummary = [];

    for (const [platform, m] of Object.entries(allMetrics)) {
      if (m.error) continue;
      totalFollowers += m.followers || 0;
      totalViews += m.totalViews || 0;
      totalLikes += m.totalLikes || 0;
      totalReach += m.reach || 0;
      platformSummary.push({ platform, followers: m.followers, engagementRate: m.engagementRate, growthRate7d: m.growthRate7d });
    }

    return {
      totalFollowers,
      totalViews,
      totalLikes,
      totalReach,
      platformSummary,
      bestPerforming: platformSummary.sort((a, b) => b.engagementRate - a.engagementRate)[0]?.platform || null,
      updatedAt: Date.now(),
    };
  }

  // ── Real-time subscription management ──

  subscribeRealtime(socketId, userId, platforms) {
    realTimeListeners.set(socketId, { userId, platforms, subscribedAt: Date.now() });
  }

  unsubscribeRealtime(socketId) {
    realTimeListeners.delete(socketId);
  }

  // Push live updates every 30 seconds to subscribed sockets via the emitter
  startRealtimePush(io) {
    setInterval(() => {
      for (const [socketId, sub] of realTimeListeners.entries()) {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) { realTimeListeners.delete(socketId); continue; }
        for (const platform of sub.platforms) {
          this.getMetrics(sub.userId, platform)
            .then(m => socket.emit('analytics:update', { platform, metrics: m }))
            .catch(() => {});
        }
      }
    }, 30000);
  }

  // ── Historical time-series (stub — connect to TimeSeries DB) ──

  getTimeSeries(userId, platform, metric, days = 30) {
    const seed = crypto.createHash('sha256').update(`${userId}:${platform}:${metric}`).digest();
    const rand = (i) => (seed.readUInt32BE(i % 28) / 0xffffffff) * 1000;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 86400000).toISOString().slice(0, 10),
      value: Math.round(rand(i) * (1 + i / days)),
    }));
  }
}

export const socialAnalytics = new SocialAnalyticsService();
export default socialAnalytics;
