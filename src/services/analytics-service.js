// src/services/analytics-service.js
// Date: 2026-07-08
// Social media analytics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs

import { v4 as uuidv4 } from 'uuid';

// Platform definitions with supported metrics
export const PLATFORMS = Object.freeze({
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  DISCORD: 'discord',
  LEMON8: 'lemon8',
  REDDIT: 'reddit',
  REDGIFS: 'redgifs'
});

const PLATFORM_METRICS = {
  tiktok: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'impressions', 'watch_time', 'profile_views'],
  instagram: ['posts', 'stories', 'reels', 'followers', 'reach', 'impressions', 'likes', 'comments', 'saves', 'shares'],
  facebook: ['pages', 'posts', 'reactions', 'reach', 'impressions', 'followers', 'comments', 'shares', 'check_ins'],
  twitch: ['viewers', 'peak_viewers', 'follows', 'subscriptions', 'clip_views', 'hours_watched', 'chat_messages'],
  discord: ['members', 'online_members', 'messages', 'server_boosts', 'channels', 'voice_time'],
  lemon8: ['posts', 'views', 'followers', 'likes', 'comments', 'collections'],
  reddit: ['posts', 'upvotes', 'downvotes', 'karma', 'subscribers', 'comments', 'awards', 'crosspost'],
  redgifs: ['views', 'likes', 'shares', 'followers', 'gifs_uploaded']
};

export class AnalyticsService {
  constructor(dataStore, redisClient) {
    this.store = dataStore;
    this.redis = redisClient;
    this.connectedAccounts = new Map(); // userId -> Map<platform, credentials>
    this.metricCache = new Map();
    this.CACHE_TTL = 300; // 5 minutes
  }

  // Connect a social account (stores encrypted credentials)
  connectAccount(userId, platform, credentials) {
    if (!Object.values(PLATFORMS).includes(platform)) {
      return { success: false, error: `Unknown platform: ${platform}` };
    }

    if (!this.connectedAccounts.has(userId)) {
      this.connectedAccounts.set(userId, new Map());
    }

    const userAccounts = this.connectedAccounts.get(userId);
    userAccounts.set(platform, {
      platform,
      accountId: credentials.accountId,
      username: credentials.username,
      // Never store raw tokens - use encrypted reference
      tokenRef: credentials.tokenRef || uuidv4(),
      connectedAt: Date.now(),
      lastSync: null
    });

    return { success: true, platform, username: credentials.username };
  }

  // Get connected accounts for a user
  getConnectedAccounts(userId) {
    const accounts = this.connectedAccounts.get(userId);
    if (!accounts) return [];
    return Array.from(accounts.values());
  }

  // Generate simulated real-time metrics (production: use actual platform APIs)
  async getMetrics(userId, platform, timeRange = '7d') {
    const cacheKey = `metrics:${userId}:${platform}:${timeRange}`;
    const cached = this.metricCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL * 1000) {
      return cached.data;
    }

    const accounts = this.connectedAccounts.get(userId);
    const account = accounts?.get(platform);

    const metrics = this.generateMetrics(platform, timeRange, account);
    this.metricCache.set(cacheKey, { data: metrics, ts: Date.now() });
    return metrics;
  }

  generateMetrics(platform, timeRange, account) {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const metricNames = PLATFORM_METRICS[platform] || [];
    const now = Date.now();

    const series = Array.from({ length: days }, (_, i) => {
      const ts = now - (days - 1 - i) * 86400000;
      const point = { timestamp: ts, date: new Date(ts).toISOString().slice(0, 10) };
      for (const metric of metricNames) {
        point[metric] = this.simulateMetric(metric, platform, i, days);
      }
      return point;
    });

    const totals = {};
    for (const metric of metricNames) {
      totals[metric] = series.reduce((sum, p) => sum + (p[metric] || 0), 0);
    }

    const latest = series[series.length - 1] || {};
    const prev = series[series.length - 2] || {};
    const changes = {};
    for (const metric of metricNames) {
      const curr = latest[metric] || 0;
      const previous = prev[metric] || 1;
      changes[metric] = ((curr - previous) / previous * 100).toFixed(1);
    }

    return {
      platform,
      account: account ? { username: account.username, accountId: account.accountId } : null,
      timeRange,
      series,
      totals,
      changes,
      lastUpdated: now,
      supportedMetrics: metricNames
    };
  }

  simulateMetric(metric, platform, dayIndex, totalDays) {
    const bases = {
      views: 12000, likes: 800, shares: 150, comments: 90, followers: 5000,
      reach: 18000, impressions: 25000, watch_time: 45000, profile_views: 600,
      posts: 3, stories: 8, reels: 2, saves: 200,
      reactions: 450, check_ins: 20, pages: 1,
      viewers: 380, peak_viewers: 1200, subscriptions: 45, clip_views: 2800,
      hours_watched: 5400, chat_messages: 1800, follows: 120,
      members: 8500, online_members: 420, server_boosts: 12, channels: 25, voice_time: 3200,
      messages: 6800, collections: 45,
      upvotes: 2300, downvotes: 180, karma: 4500, subscribers: 12000,
      awards: 8, crosspost: 35,
      gifs_uploaded: 12
    };

    const base = bases[metric] || 100;
    const trend = 1 + (dayIndex / totalDays) * 0.15; // 15% growth trend
    const noise = 0.8 + Math.random() * 0.4;
    return Math.round(base * trend * noise);
  }

  // Get aggregated metrics across all platforms
  async getDashboardSummary(userId, timeRange = '7d') {
    const accounts = this.connectedAccounts.get(userId);
    if (!accounts || accounts.size === 0) {
      return { connected: [], summary: {}, totalReach: 0, totalEngagement: 0 };
    }

    const platformMetrics = [];
    let totalReach = 0;
    let totalEngagement = 0;

    for (const [platform] of accounts) {
      const metrics = await this.getMetrics(userId, platform, timeRange);
      const reach = metrics.totals.reach || metrics.totals.impressions || metrics.totals.views || 0;
      const engagement = (metrics.totals.likes || 0) + (metrics.totals.comments || 0) + (metrics.totals.shares || 0);
      totalReach += reach;
      totalEngagement += engagement;
      platformMetrics.push({ platform, ...metrics.totals, reach, engagement });
    }

    const engagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : '0.00';

    return {
      connected: Array.from(accounts.values()),
      platforms: platformMetrics,
      totalReach,
      totalEngagement,
      engagementRate: `${engagementRate}%`,
      lastUpdated: Date.now()
    };
  }

  // Real-time metric stream via Socket.IO
  streamMetrics(socket, userId, platforms, interval = 30000) {
    const emit = async () => {
      const summary = await this.getDashboardSummary(userId, '24h');
      socket.emit('analytics:update', summary);
    };

    emit();
    const timer = setInterval(emit, interval);
    socket.on('disconnect', () => clearInterval(timer));
    socket.on('analytics:stop', () => clearInterval(timer));
    return timer;
  }

  // Retention tracking (watch time / session length analysis)
  getRetentionData(userId, platform, contentId) {
    const buckets = [0, 25, 50, 75, 100];
    return {
      contentId,
      platform,
      retentionCurve: buckets.map(pct => ({
        percentage: pct,
        viewers: Math.round(10000 * Math.exp(-pct * 0.03) * (1 + Math.random() * 0.1))
      })),
      avgWatchPct: 42 + Math.round(Math.random() * 20),
      dropOffPoints: [15, 38, 72].map(pct => ({
        percentage: pct,
        dropOff: Math.round(5 + Math.random() * 10)
      }))
    };
  }
}
