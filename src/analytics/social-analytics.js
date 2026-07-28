// Created: 2026-07-28

const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    metrics: ['views', 'likes', 'shares', 'comments', 'followers', 'reach', 'watchTime', 'completionRate'],
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    metrics: ['impressions', 'reach', 'likes', 'comments', 'saves', 'shares', 'followers', 'storyViews', 'reelViews'],
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    metrics: ['pageViews', 'reach', 'likes', 'comments', 'shares', 'followers', 'videoViews', 'postEngagement'],
  },
  twitch: {
    name: 'Twitch',
    icon: '🎮',
    color: '#9147FF',
    metrics: ['viewers', 'followers', 'subscribers', 'chatMessages', 'clipViews', 'streamHours', 'peakViewers'],
  },
  discord: {
    name: 'Discord',
    icon: '💬',
    color: '#5865F2',
    metrics: ['members', 'onlineMembers', 'messages', 'newJoins', 'serverBoosts', 'activeChannels'],
  },
  lemon8: {
    name: 'Lemon8',
    icon: '🍋',
    color: '#FFD700',
    metrics: ['views', 'likes', 'comments', 'saves', 'followers', 'reach'],
  },
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    color: '#FF4500',
    metrics: ['postKarma', 'commentKarma', 'postViews', 'upvotes', 'subredditSubscribers', 'awards'],
  },
  redgifs: {
    name: 'RedGifs',
    icon: '🎞️',
    color: '#CC0000',
    metrics: ['views', 'likes', 'shares', 'followers', 'totalGifs'],
  },
};

// Realistic value ranges per metric across platforms
const METRIC_RANGES = {
  views:               [1000,    5000000],
  likes:               [100,     500000],
  shares:              [10,      100000],
  comments:            [5,       50000],
  followers:           [500,     10000000],
  reach:               [800,     8000000],
  watchTime:           [10,      600],
  completionRate:      [0.1,     0.95],
  impressions:         [2000,    10000000],
  saves:               [50,      200000],
  storyViews:          [300,     2000000],
  reelViews:           [500,     5000000],
  pageViews:           [1000,    3000000],
  videoViews:          [500,     4000000],
  postEngagement:      [50,      500000],
  viewers:             [10,      150000],
  subscribers:         [50,      50000],
  chatMessages:        [100,     500000],
  clipViews:           [200,     2000000],
  streamHours:         [1,       5000],
  peakViewers:         [50,      200000],
  members:             [100,     1000000],
  onlineMembers:       [10,      100000],
  messages:            [500,     5000000],
  newJoins:            [5,       10000],
  serverBoosts:        [0,       500],
  activeChannels:      [1,       100],
  postKarma:           [100,     5000000],
  commentKarma:        [50,      1000000],
  postViews:           [100,     10000000],
  upvotes:             [10,      500000],
  subredditSubscribers:[50,      30000000],
  awards:              [0,       1000],
  totalGifs:           [1,       5000],
};

function randomInRange(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

function randomFloat(min, max, decimals = 2) {
  const val = min + Math.random() * (max - min);
  return parseFloat(val.toFixed(decimals));
}

function generateBaseline(platform) {
  const def = PLATFORMS[platform];
  const baseline = {};
  for (const metric of def.metrics) {
    const [min, max] = METRIC_RANGES[metric] ?? [0, 1000];
    baseline[metric] = metric === 'completionRate'
      ? randomFloat(min, max)
      : randomInRange(min, max);
  }
  return baseline;
}

function applyNoise(value, factor = 0.05) {
  const delta = value * factor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(value + delta));
}

export default class SocialAnalyticsService {
  constructor() {
    this._store = new Map();
    for (const platform of Object.keys(PLATFORMS)) {
      this._store.set(platform, {
        lastUpdate: Date.now(),
        baseline: generateBaseline(platform),
      });
    }
  }

  getSnapshot(platform) {
    if (!PLATFORMS[platform]) throw new Error(`Unknown platform: ${platform}`);
    const { baseline } = this._store.get(platform);
    const snapshot = { platform, timestamp: new Date().toISOString(), metrics: {} };
    for (const [metric, value] of Object.entries(baseline)) {
      snapshot.metrics[metric] = metric === 'completionRate'
        ? randomFloat(Math.max(0, value - 0.05), Math.min(1, value + 0.05))
        : applyNoise(value);
    }
    return snapshot;
  }

  getTimeSeries(platform, metric, periods = 24) {
    if (!PLATFORMS[platform]) throw new Error(`Unknown platform: ${platform}`);
    const def = PLATFORMS[platform];
    if (!def.metrics.includes(metric)) throw new Error(`Metric '${metric}' not available for ${platform}`);

    const { baseline } = this._store.get(platform);
    const base = baseline[metric] ?? 0;
    const now = Date.now();
    const hourMs = 3600000;
    const series = [];

    for (let i = periods - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * hourMs).toISOString();
      const drift = 1 + (periods - i) * 0.002;
      const value = metric === 'completionRate'
        ? randomFloat(Math.max(0, base - 0.1), Math.min(1, base + 0.1))
        : Math.max(0, Math.round(applyNoise(base * drift, 0.08)));
      series.push({ timestamp, value });
    }

    return series;
  }

  getAggregatedStats() {
    let totalReach = 0;
    let totalEngagement = 0;
    let topPlatform = null;
    let topScore = -1;

    const platformScores = {};

    for (const [platform, { baseline }] of this._store.entries()) {
      const def = PLATFORMS[platform];
      const reach = baseline.reach ?? baseline.impressions ?? baseline.viewers ?? baseline.members ?? 0;
      const engagement = (baseline.likes ?? 0) + (baseline.comments ?? 0) + (baseline.shares ?? 0)
        + (baseline.saves ?? 0) + (baseline.upvotes ?? 0) + (baseline.chatMessages ?? 0)
        + (baseline.messages ?? 0);

      totalReach += reach;
      totalEngagement += engagement;

      const score = reach + engagement * 2;
      platformScores[platform] = score;
      if (score > topScore) {
        topScore = score;
        topPlatform = platform;
      }
    }

    const growthRate = randomFloat(0.5, 8.5);

    return {
      totalReach,
      totalEngagement,
      topPlatform: topPlatform ? { id: topPlatform, ...PLATFORMS[topPlatform] } : null,
      growthRate,
      platformScores,
      timestamp: new Date().toISOString(),
    };
  }

  getRetentionData(platform) {
    if (!PLATFORMS[platform]) throw new Error(`Unknown platform: ${platform}`);

    const avgWatchTime = randomInRange(15, 480);
    const completionRate = randomFloat(0.1, 0.95);

    const dropOffPoints = [];
    const segments = 10;
    let remaining = 100;
    for (let i = 0; i < segments; i++) {
      const pct = (i + 1) * 10;
      const drop = i < segments - 1 ? randomInRange(0, Math.floor(remaining * 0.3)) : remaining;
      remaining -= drop;
      dropOffPoints.push({ percentagePoint: pct, viewersRemaining: Math.max(0, 100 - drop * (i + 1)) });
    }

    return {
      platform,
      averageWatchTime: avgWatchTime,
      completionRate,
      dropOffPoints,
      timestamp: new Date().toISOString(),
    };
  }

  getLikeAndReachSummary() {
    const summary = {};
    for (const [platform, { baseline }] of this._store.entries()) {
      const likes = baseline.likes ?? baseline.upvotes ?? 0;
      const reach = baseline.reach ?? baseline.impressions ?? baseline.viewers ?? baseline.members ?? 0;
      const engagementRate = reach > 0 ? randomFloat(0.01, 0.15) : 0;
      summary[platform] = { likes: applyNoise(likes), reach: applyNoise(reach), engagementRate };
    }
    return summary;
  }

  getRealTimeUpdate() {
    const updates = {};
    const now = Date.now();
    for (const [platform, entry] of this._store.entries()) {
      const def = PLATFORMS[platform];
      const delta = {};
      for (const metric of def.metrics) {
        const base = entry.baseline[metric] ?? 0;
        // Small incremental deltas simulate a real-time feed
        delta[metric] = metric === 'completionRate'
          ? randomFloat(-0.02, 0.02)
          : Math.round(base * randomFloat(-0.01, 0.01));
      }
      updates[platform] = { delta, timestamp: new Date(now).toISOString() };
      entry.lastUpdate = now;
    }
    return updates;
  }
}
