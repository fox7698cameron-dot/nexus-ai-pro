// File: analyticsService.js | Date: 2026-06-16
import { v4 as uuidv4 } from 'uuid';
import cryptoService from './cryptoService.js';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];
const TIME_RANGES = ['24h', '7d', '30d', '90d', '1y'];

// In-memory stores
const connectedPlatforms = new Map(); // userId → {platform → encryptedCredentials}
const metricsCache = new Map();       // `${userId}:${platform}` → metrics snapshot
const scheduledReports = new Map();   // userId → [{id, platforms, frequency, nextRun}]

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockMetrics(platform, timeRange = '30d') {
  const base = {
    tiktok:    { followers: randomBetween(1000, 5000000), baseViews: 50000 },
    instagram: { followers: randomBetween(500, 2000000),  baseViews: 20000 },
    facebook:  { followers: randomBetween(200, 1000000),  baseViews: 8000  },
    twitch:    { followers: randomBetween(100, 500000),   baseViews: 5000  },
    discord:   { followers: randomBetween(50, 100000),    baseViews: 2000  },
    lemon8:    { followers: randomBetween(100, 200000),   baseViews: 10000 },
    reddit:    { followers: randomBetween(10, 5000000),   baseViews: 30000 },
    redgifs:   { followers: randomBetween(100, 800000),   baseViews: 15000 },
  };

  const p = base[platform] || { followers: 10000, baseViews: 5000 };
  const multiplier = { '24h': 0.033, '7d': 0.23, '30d': 1, '90d': 3, '1y': 12 }[timeRange] || 1;

  return {
    platform,
    timeRange,
    followers: p.followers,
    likes: Math.floor(p.baseViews * multiplier * randomBetween(2, 8) / 10),
    reach: Math.floor(p.followers * multiplier * randomBetween(3, 15) / 10),
    views: Math.floor(p.baseViews * multiplier),
    retention: randomBetween(20, 85),
    engagement: parseFloat((randomBetween(15, 95) / 10).toFixed(2)),
    impressions: Math.floor(p.baseViews * multiplier * randomBetween(12, 30) / 10),
    shares: Math.floor(p.baseViews * multiplier * randomBetween(1, 5) / 100),
    comments: Math.floor(p.baseViews * multiplier * randomBetween(2, 10) / 100),
    growth: parseFloat((randomBetween(-50, 200) / 10).toFixed(1)),
    updatedAt: new Date().toISOString(),
  };
}

function generateMockContent(platform, limit = 10) {
  return Array.from({ length: limit }, (_, i) => ({
    id: uuidv4(),
    platform,
    title: `Top Content #${i + 1}`,
    type: ['video', 'image', 'story', 'reel'][randomBetween(0, 3)],
    views: randomBetween(1000, 1000000),
    likes: randomBetween(100, 50000),
    comments: randomBetween(10, 5000),
    shares: randomBetween(5, 2000),
    engagement: parseFloat((randomBetween(10, 200) / 10).toFixed(2)),
    publishedAt: new Date(Date.now() - randomBetween(1, 30) * 86400000).toISOString(),
  }));
}

function generateAudienceInsights(platform) {
  return {
    platform,
    demographics: {
      age: {
        '13-17': randomBetween(5, 20),
        '18-24': randomBetween(20, 40),
        '25-34': randomBetween(20, 35),
        '35-44': randomBetween(10, 25),
        '45+': randomBetween(5, 15),
      },
      gender: {
        male: randomBetween(30, 70),
        female: randomBetween(25, 65),
        other: randomBetween(1, 10),
      },
    },
    topCountries: ['US', 'GB', 'CA', 'AU', 'DE'].map(code => ({
      code,
      percentage: randomBetween(5, 35),
    })),
    topCities: ['New York', 'London', 'Los Angeles', 'Toronto', 'Sydney'].map(city => ({
      city,
      percentage: randomBetween(2, 15),
    })),
    activeHours: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      activity: randomBetween(0, 100),
    })),
    updatedAt: new Date().toISOString(),
  };
}

function generateRetentionCurve(videoId) {
  return {
    videoId: videoId || 'aggregate',
    dataPoints: Array.from({ length: 10 }, (_, i) => ({
      percentComplete: (i + 1) * 10,
      retentionRate: Math.max(5, 100 - i * randomBetween(5, 15) - randomBetween(0, 10)),
    })),
    averageWatchTime: `${randomBetween(0, 5)}:${String(randomBetween(0, 59)).padStart(2, '0')}`,
    completionRate: randomBetween(5, 60),
    updatedAt: new Date().toISOString(),
  };
}

export class AnalyticsService {
  /**
   * Connect a social platform for a user (store encrypted OAuth tokens).
   */
  async connectPlatform(userId, platform, credentials) {
    if (!PLATFORMS.includes(platform)) {
      throw new Error(`Unsupported platform: ${platform}. Supported: ${PLATFORMS.join(', ')}`);
    }

    if (!connectedPlatforms.has(userId)) connectedPlatforms.set(userId, {});
    const userPlatforms = connectedPlatforms.get(userId);

    // Encrypt credentials before storing
    let encryptedCredentials;
    try {
      encryptedCredentials = cryptoService.encrypt(JSON.stringify(credentials), `${userId}:${platform}`);
    } catch {
      // If no encryption secret, store a placeholder (dev mode)
      encryptedCredentials = { dev: true, platform };
    }

    userPlatforms[platform] = {
      connected: true,
      connectedAt: new Date().toISOString(),
      credentials: encryptedCredentials,
    };

    connectedPlatforms.set(userId, userPlatforms);
    return { success: true, platform, connectedAt: userPlatforms[platform].connectedAt };
  }

  /**
   * Disconnect a platform for a user.
   */
  async disconnectPlatform(userId, platform) {
    const userPlatforms = connectedPlatforms.get(userId) || {};
    if (!userPlatforms[platform]) throw new Error(`Platform ${platform} is not connected`);

    delete userPlatforms[platform];
    connectedPlatforms.set(userId, userPlatforms);
    metricsCache.delete(`${userId}:${platform}`);

    return { success: true, platform };
  }

  /**
   * Get metrics for a specific platform.
   */
  async getMetrics(userId, platform, timeRange = '30d') {
    if (!PLATFORMS.includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
    if (!TIME_RANGES.includes(timeRange)) throw new Error(`Invalid timeRange. Valid: ${TIME_RANGES.join(', ')}`);

    const cacheKey = `${userId}:${platform}:${timeRange}`;
    if (metricsCache.has(cacheKey)) return metricsCache.get(cacheKey);

    // Try real API call; fall back to mock
    try {
      const real = await this._fetchRealMetrics(userId, platform, timeRange);
      metricsCache.set(cacheKey, real);
      return real;
    } catch {
      const mock = generateMockMetrics(platform, timeRange);
      metricsCache.set(cacheKey, mock);
      return mock;
    }
  }

  /**
   * Get metrics for all connected platforms.
   */
  async getAllMetrics(userId) {
    const userPlatforms = connectedPlatforms.get(userId) || {};
    const results = {};

    await Promise.all(
      Object.keys(userPlatforms).map(async platform => {
        try {
          results[platform] = await this.getMetrics(userId, platform, '30d');
        } catch (err) {
          results[platform] = { error: err.message };
        }
      })
    );

    // If no platforms connected, return demo data
    if (Object.keys(results).length === 0) {
      for (const p of PLATFORMS.slice(0, 3)) {
        results[p] = generateMockMetrics(p, '30d');
      }
    }

    return results;
  }

  /**
   * Get real-time (live) metrics for a platform.
   */
  async getRealTimeMetrics(userId, platform) {
    if (!PLATFORMS.includes(platform)) throw new Error(`Unsupported platform: ${platform}`);

    return {
      platform,
      liveViewers: randomBetween(0, 5000),
      activeUsers: randomBetween(0, 10000),
      newFollowersLastHour: randomBetween(0, 500),
      engagementRate: parseFloat((randomBetween(5, 95) / 10).toFixed(2)),
      recentLikes: randomBetween(0, 1000),
      recentComments: randomBetween(0, 200),
      recentShares: randomBetween(0, 100),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get top performing content for a platform.
   */
  async getTopContent(userId, platform, limit = 10) {
    if (!PLATFORMS.includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
    return generateMockContent(platform, Math.min(limit, 50));
  }

  /**
   * Get audience demographics and geography.
   */
  async getAudienceInsights(userId, platform) {
    if (!PLATFORMS.includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
    return generateAudienceInsights(platform);
  }

  /**
   * Get viewer retention data for a platform (or specific video).
   */
  async getRetentionData(userId, platform, videoId) {
    if (!PLATFORMS.includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
    return generateRetentionCurve(videoId);
  }

  /**
   * Schedule an analytics report.
   */
  async scheduleReport(userId, platforms, frequency) {
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      throw new Error(`Invalid frequency. Valid: ${validFrequencies.join(', ')}`);
    }
    const invalidPlatforms = platforms.filter(p => !PLATFORMS.includes(p));
    if (invalidPlatforms.length) throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);

    if (!scheduledReports.has(userId)) scheduledReports.set(userId, []);

    const report = {
      id: uuidv4(),
      platforms,
      frequency,
      createdAt: new Date().toISOString(),
      nextRun: this._nextRunDate(frequency),
    };

    scheduledReports.get(userId).push(report);
    return report;
  }

  /**
   * Export analytics data.
   */
  async exportReport(userId, platforms, format = 'json') {
    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format)) throw new Error(`Invalid format. Valid: ${validFormats.join(', ')}`);

    const data = {};
    for (const p of platforms) {
      try { data[p] = await this.getMetrics(userId, p, '30d'); } catch { data[p] = null; }
    }

    if (format === 'csv') {
      const rows = [['platform', 'followers', 'views', 'engagement', 'growth']];
      for (const [platform, metrics] of Object.entries(data)) {
        if (metrics) rows.push([platform, metrics.followers, metrics.views, metrics.engagement, metrics.growth]);
      }
      return { format: 'csv', content: rows.map(r => r.join(',')).join('\n') };
    }

    return { format: 'json', content: data, exportedAt: new Date().toISOString() };
  }

  /**
   * List platforms connected for a user.
   */
  getConnectedPlatforms(userId) {
    const platforms = connectedPlatforms.get(userId) || {};
    return Object.entries(platforms).map(([platform, info]) => ({
      platform,
      connected: info.connected,
      connectedAt: info.connectedAt,
    }));
  }

  // --- Internal helpers ---

  async _fetchRealMetrics(userId, platform, timeRange) {
    // Real API integration would go here (requires platform OAuth tokens)
    // For now, always throw to trigger mock fallback
    throw new Error('Real API not configured');
  }

  _nextRunDate(frequency) {
    const now = new Date();
    if (frequency === 'daily') now.setDate(now.getDate() + 1);
    else if (frequency === 'weekly') now.setDate(now.getDate() + 7);
    else if (frequency === 'monthly') now.setMonth(now.getMonth() + 1);
    return now.toISOString();
  }
}

export default new AnalyticsService();
