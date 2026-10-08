// analytics-service.js | 2026-10-08

/**
 * Social media analytics service.
 * Returns simulated data when API keys are not configured.
 */

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

const API_KEYS = {
  tiktok: process.env.TIKTOK_API_KEY,
  instagram: process.env.INSTAGRAM_API_KEY,
  facebook: process.env.FACEBOOK_API_KEY,
  twitch: process.env.TWITCH_CLIENT_ID,
  discord: process.env.DISCORD_BOT_TOKEN,
  lemon8: process.env.LEMON8_API_KEY,
  reddit: process.env.REDDIT_API_KEY,
  redgifs: process.env.REDGIFS_API_KEY,
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mockMetrics(platform, timeRange) {
  return {
    platform,
    timeRange,
    views: rand(1000, 100000),
    likes: rand(100, 10000),
    reach: rand(500, 50000),
    retention: rand(60, 99),
    followers: rand(100, 5000),
    engagement: (Math.random() * 8 + 1).toFixed(2),
    updatedAt: new Date().toISOString(),
  };
}

function mockRealTime(platform) {
  return {
    platform,
    liveViewers: rand(10, 1000),
    currentEngagement: (Math.random() * 10 + 1).toFixed(2),
    activeUsers: rand(50, 500),
    timestamp: new Date().toISOString(),
  };
}

function mockRetention(platform) {
  const buckets = ['0-10s', '10-30s', '30-60s', '1-3m', '3m+'];
  return {
    platform,
    buckets: buckets.map(label => ({ label, pct: rand(10, 90) })),
    avgWatchTime: rand(15, 180),
    completionRate: rand(20, 85),
    updatedAt: new Date().toISOString(),
  };
}

function mockReach(platform) {
  return {
    platform,
    organic: rand(500, 30000),
    paid: rand(100, 20000),
    viral: rand(50, 10000),
    impressions: rand(1000, 80000),
    uniqueAccounts: rand(300, 40000),
    updatedAt: new Date().toISOString(),
  };
}

function mockEngagement(platform) {
  return {
    platform,
    likes: rand(100, 10000),
    comments: rand(10, 1000),
    shares: rand(5, 500),
    saves: rand(20, 2000),
    clicks: rand(50, 5000),
    rate: (Math.random() * 8 + 1).toFixed(2),
    updatedAt: new Date().toISOString(),
  };
}

class AnalyticsService {
  constructor() {
    this.platforms = PLATFORMS;
  }

  /**
   * Returns whether a platform has a configured API key.
   * @param {string} platform
   * @returns {boolean}
   */
  isConfigured(platform) {
    return Boolean(API_KEYS[platform]);
  }

  /**
   * Fetch metrics for a platform and time range.
   * Falls back to simulated data when API key is absent.
   * @param {string} platform - One of PLATFORMS or 'all'
   * @param {string} timeRange - '24h' | '7d' | '30d' | '90d'
   * @returns {Promise<Object>}
   */
  async getMetrics(platform = 'all', timeRange = '7d') {
    if (platform === 'all') {
      const results = {};
      for (const p of this.platforms) {
        results[p] = await this._fetchMetrics(p, timeRange);
      }
      return results;
    }
    return { [platform]: await this._fetchMetrics(platform, timeRange) };
  }

  async _fetchMetrics(platform, timeRange) {
    if (!this.isConfigured(platform)) return mockMetrics(platform, timeRange);
    // TODO: implement real API calls per platform when keys are present
    return mockMetrics(platform, timeRange);
  }

  /**
   * Get real-time stats for a platform.
   * @param {string} platform
   * @returns {Promise<Object>}
   */
  async getRealTimeStats(platform) {
    if (!this.isConfigured(platform)) return mockRealTime(platform);
    return mockRealTime(platform);
  }

  /**
   * Get audience retention data for a platform.
   * @param {string} platform
   * @returns {Promise<Object>}
   */
  async getRetentionData(platform) {
    if (!this.isConfigured(platform)) return mockRetention(platform);
    return mockRetention(platform);
  }

  /**
   * Get reach/impression data for a platform.
   * @param {string} platform
   * @returns {Promise<Object>}
   */
  async getReachData(platform) {
    if (!this.isConfigured(platform)) return mockReach(platform);
    return mockReach(platform);
  }

  /**
   * Get engagement breakdown for a platform.
   * @param {string} platform
   * @returns {Promise<Object>}
   */
  async getEngagementData(platform) {
    if (!this.isConfigured(platform)) return mockEngagement(platform);
    return mockEngagement(platform);
  }
}

export default new AnalyticsService();
export { AnalyticsService, PLATFORMS };
